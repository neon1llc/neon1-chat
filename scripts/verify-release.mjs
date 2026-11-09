// scripts/verify-release.mjs - Check that the live function serves the build just deployed.
// Usage: node scripts/verify-release.mjs https://neon1.tech/chat/api/health
//
// The health check reports the source commit, the corpus digest, and the lockfile digest. This
// compares them with the checkout (GITHUB_SHA in CI) and retries for about a minute while the
// new function version takes over. A stale or mismatched identity fails the deploy job.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { readCorpus } from "../app/src/corpus.mjs";

// What this checkout should be serving
export function expected() {
  const lock = readFileSync(new URL("../package-lock.json", import.meta.url));
  return {
    commit: process.env.GITHUB_SHA ?? execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    corpus: readCorpus().digest,
    lock: `sha256:${createHash("sha256").update(lock).digest("hex")}`,
  };
}

// The fields that differ, as readable lines; empty means the release matches
export function compare(want, health) {
  if (health?.ok !== true) return ["health check is not ok"];
  return Object.keys(want)
    .filter((key) => health[key] !== want[key])
    .map((key) => `${key}: serving ${health[key] ?? "nothing"}, expected ${want[key]}`);
}

// Poll the health check until it matches or the attempts run out
export async function verify(url, want, { fetch = globalThis.fetch, attempts = 7, wait = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  let problems = [];
  for (let i = 0; i < attempts; i++) {
    if (i) await wait(10000);
    try {
      const res = await fetch(url, { headers: { "cache-control": "no-cache" }, signal: AbortSignal.timeout(10000) });
      problems = compare(want, res.ok ? await res.json() : null);
      if (!res.ok) problems = [`health check answered HTTP ${res.status}`];
    } catch (err) {
      problems = [`health check unreachable (${err.name})`];
    }
    if (!problems.length) return [];
  }
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const want = expected();
  const problems = await verify(process.argv[2], want);
  if (problems.length) {
    console.error(`release check failed:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`serving ${want.commit} with corpus ${want.corpus}`);
}
