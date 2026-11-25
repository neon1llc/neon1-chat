#!/usr/bin/env bash

# .github/release-control.sh - Promote dev to production, or put an earlier release back, within main's branch rules.
# Usage: ACTION=rollback EXPECTED_MAIN=<sha> TARGET=vX.Y.Z .github/release-control.sh
#
# A promotion fast-forwards main to the exact dev commit that was previewed. A rollback adds one commit on main holding
# the earlier release's files. Pipeline files, and any KEEP_PATHS, stay as they are. Either way the commit must pass
# CHECKS_WORKFLOW before main moves, and the run ends only when the production deploy does.

set -euo pipefail

: "${ACTION:?}" "${EXPECTED_MAIN:?}" "${TARGET:?}" "${CHECKS_WORKFLOW:?}" "${REQUIRED_CHECKS:?}" "${DEPLOY_WORKFLOW:?}"
KEEP_PATHS="${KEEP_PATHS:-}"
POLL="${POLL:-10}"

fail() { echo "::error::$*"; exit 1; }
summary() { echo "$*" | tee -a "${GITHUB_STEP_SUMMARY:-/dev/null}"; }

[[ "$EXPECTED_MAIN" =~ ^[0-9a-f]{40}$ ]] || fail "expected_main must be a full commit id"

git fetch -q origin --tags
main=$(git rev-parse origin/main)
[ "$main" = "$EXPECTED_MAIN" ] || fail "main moved to ${main:0:7} after the preview (${EXPECTED_MAIN:0:7}). Preview again."

# True once every required check has passed on the commit
checked() {
  local passed name
  passed=$(gh api "repos/{owner}/{repo}/commits/$1/check-runs?per_page=100" --jq '.check_runs[] | select(.conclusion == "success") | .name')
  for name in $REQUIRED_CHECKS; do grep -qxF "$name" <<<"$passed" || return 1; done
}

# Starts a workflow on a branch and waits for that run, which must end well
run_and_wait() {
  local workflow=$1 branch=$2 sha=$3 since id=""
  since=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  gh workflow run "$workflow" --ref "$branch"
  for _ in $(seq 1 30); do
    id=$(gh run list --workflow "$workflow" --branch "$branch" --event workflow_dispatch --limit 10 --json databaseId,headSha,createdAt \
      --jq "[.[] | select(.headSha == \"$sha\" and .createdAt >= \"$since\")][0].databaseId // empty")
    [ -n "$id" ] && break
    sleep "$POLL"
  done
  [ -n "$id" ] || fail "$workflow did not start on $branch"
  summary "$workflow on $branch: run $id"
  gh run watch "$id" --exit-status --interval 10 >/dev/null || fail "$workflow failed on $branch (run $id)."
}

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

case "$ACTION" in
  promote)
    [[ "$TARGET" =~ ^[0-9a-f]{40}$ ]] || fail "a promotion names the previewed dev commit"
    [ "$(git rev-parse origin/dev)" = "$TARGET" ] || fail "dev moved after the preview. Preview again."
    git merge-base --is-ancestor "$main" "$TARGET" || fail "dev lacks commits that are on main. Merge main into dev and test it first."
    [ "$main" != "$TARGET" ] || fail "nothing to promote"
    checked "$TARGET" || run_and_wait "$CHECKS_WORKFLOW" dev "$TARGET"
    checked "$TARGET" || fail "the required checks have not passed on ${TARGET:0:7}. main has not moved."
    release=$TARGET
    ;;
  rollback)
    [[ "$TARGET" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "a rollback names a release tag"
    git rev-parse -q --verify "refs/tags/$TARGET^{commit}" >/dev/null || fail "no release $TARGET"
    git merge-base --is-ancestor "refs/tags/$TARGET" "$main" || fail "$TARGET is not part of main's history"
    git checkout -q --detach "$main"
    # The earlier release's files, with today's pipeline and kept paths
    git read-tree --reset -u "refs/tags/$TARGET^{commit}"
    for path in .github $KEEP_PATHS; do
      git rm -rqf --ignore-unmatch "$path" >/dev/null
      if git cat-file -e "$main:$path" 2>/dev/null; then git checkout -q "$main" -- "$path"; fi
    done
    if git diff --cached --quiet "$main"; then fail "$TARGET already matches what main holds"; fi
    git commit -qm "revert: restore the $TARGET release"
    release=$(git rev-parse HEAD)
    branch="release/rollback-$TARGET-${release:0:7}"
    git push -q origin "$release:refs/heads/$branch"
    run_and_wait "$CHECKS_WORKFLOW" "$branch" "$release"
    checked "$release" || fail "the required checks have not passed on the rollback commit. main has not moved."
    ;;
  *) fail "unknown action $ACTION" ;;
esac

# A plain push: it fails if main moved meanwhile, and main's rules still apply
git push -q origin "$release:refs/heads/main" || fail "main refused the push; it may have moved. Preview again."
summary "main is now ${release:0:7}"

if [ "$ACTION" = rollback ]; then
  # dev records the rollback commit without taking its files, so the newer work stays on dev and a later promotion brings it back
  if git ls-remote --exit-code --heads origin dev >/dev/null; then
    git checkout -q -B dev origin/dev
    git merge -q -s ours -m "Record the $TARGET rollback; dev keeps its work" "$release"
    git push -q origin dev
  fi
  git push -q origin --delete "$branch" || true
fi

run_and_wait "$DEPLOY_WORKFLOW" main "$release"
summary "production deployed from ${release:0:7}"
