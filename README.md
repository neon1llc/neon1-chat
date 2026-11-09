# neon1-chat

Neo, the assistant on [neon1.tech](https://neon1.tech) and in 1NEON. It answers visitors' questions from neon1's public pages only, and points everything else to a free call or an email.

- `app/` is the function: `src/handler.mjs` (HTTP API), `src/chat.mjs` (prompt and model call), `src/limits.mjs` (spend caps), and `corpus/`, the public text it answers from.
- `infra/` is the Terraform: a Lambda behind an HTTP API, a DynamoDB table of short-lived counters, a Bedrock budget alert, and two SSM parameters the neon1.tech distribution reads.
- The chat window itself is in [neon1-site](https://github.com/neon1llc/neon1-site) under `shared/`, so the site and 1NEON load the same file.

## How it stays grounded and cheap

The whole corpus (about 10,000 tokens) goes in the system prompt, so there's no search index to run. gpt-oss-120b on Amazon Bedrock writes the reply, for about a fifth of a cent a question. Message text is never logged or stored by this app.

Three different controls bound cost, and they are not the same thing:

- **Request limits** count questions: 6 a minute and 60 an hour per visitor, and 500 a day for the whole site, in DynamoDB before any model call. If the counters can't be written, the question is refused, never let through.
- **Concurrency** caps how many copies of the function run at once (5), and the HTTP API throttles the whole route to 5 requests a second.
- **The Bedrock budget** is an email at 80% (forecast) and 100% (actual) of $5 a month. It is an alert, not a spending cap, and it covers Bedrock only, not CloudFront, the API, or DynamoDB.

## The conversation contract

The chat window and this API share one contract, written in `app/src/contract.mjs` and mirrored in neon1-site `shared/chat.js`: turns alternate visitor and assistant, start and end with the visitor, and number at most 11; each turn is at most 1,200 characters after trimming, whoever wrote it; all turns together are at most 6,000; and a reply is at most 1,200 characters, cut at a sentence or word and never inside a link, so it always fits back into the history. Characters are JavaScript string length, which is what a browser's `maxlength` counts. The window drops its oldest question and answer together until a conversation fits, so the newest question always goes up. A refusal says which rule failed (`question_too_long` or `conversation_too_long`), so the window can tell a visitor to shorten a question only when that's the problem. Change both repositories together, and deploy this one first.

Browsers call `https://neon1.tech/chat/api/chat`, so it's same-origin for the site and 1NEON, and their CSPs stay `connect-src 'self'`. CloudFront adds a secret header that the function checks, so the API can't be called around the caps.

## Working on it

```bash
npm ci
npm test                                   # handler, caps, contract, corpus, and release checks, with AWS faked out
npm run corpus                             # refresh app/corpus from neon1.tech and public READMEs
AWS_PROFILE=neon1 AWS_REGION=us-east-1 npm run eval  # the fixed test set against the live model (about a cent)
```

The corpus is the live neon1.tech page, 1NEON's privacy policy, terms, and cookie notice, 1NEON's in-portal help while it's on main, and the public repositories' READMEs. That list lives in one place, `SOURCES` in `scripts/build-corpus.mjs`, with a size bound and required content for each source and a bound on the total. A build is all or nothing: if a required source fails, comes back empty, or breaks a bound, the committed corpus stays as it was. A source that's gone (an optional page that now 404s, or one taken off the list) leaves the corpus. `app/corpus/manifest.json` records each source's URL, the commit or site version read, when it was fetched, and its digest, plus one digest for the whole corpus; the function reads only the files the manifest lists.

`refresh.yml` rebuilds the corpus every Monday and opens a pull request for any change, new and deleted files included. CI runs on it, and merging it deploys. Run `npm run eval` after changing the prompt or the model.

## Operating it

**Failures.** Every failure returns JSON that is never cached, with a `code` and a `retry-after`: 503 when the counters can't be written or the settings are invalid (the model is not called), 504 when the 15-second request deadline passes, 503 when Bedrock throttles, and 502 for any other model error. The function's own timeout is 20 seconds, and each AWS client retries at most once. Logs hold only an event name, an error's class name, and its HTTP status.

**Alarms.** Four CloudWatch alarms email the budget address through an SNS topic: failed answers (5 in 15 minutes), crashes or timeouts (3 in 15 minutes), throttles (5 in 15 minutes), and slow answers (the slowest 5% over 12 seconds for 15 minutes). A quiet period with no questions never alarms. Confirm the subscription email once after the first apply, or alerts won't arrive.

**Pausing.** To switch the assistant off without touching the site, apply with `-var concurrency=0`. The function then runs no copies, every question gets a short error in the window, and the site, 1NEON, and their contact links work as usual. The throttle alarm fires while paused; that's expected. Apply without the variable to restore it. Every other number is checked at plan time: a cap of zero, a fraction, or an implausibly large value fails the plan, and the function refuses non-positive or fractional request limits at run time too.

## Deploys

Pushing to `main` runs `deploy.yml`: the tests, then `scripts/package.mjs`, which stages the release folder Terraform zips (`app/src`, the corpus files its manifest lists, and the production dependencies installed with `npm ci --omit=dev` from the same lockfile the tests used). The function therefore runs the exact AWS SDK versions in `package-lock.json`, not the copy built into the Lambda runtime. `release.json` in that folder names the source commit and lockfile digest, and the health check at `/chat/api/health` reports them with the digest of the corpus it actually loaded. After applying, `scripts/verify-release.mjs` checks those against the commit just deployed and fails the job if an older build is still serving. Changes to `package.json`, `package-lock.json`, or those two scripts deploy too, since they change what ships.

The workflow uses the role in the repository variable `AWS_TERRAFORM_ROLE_ARN` (defined in neon1-aws-infrastructure `github/chat.tf`). To apply by hand:

```bash
export AWS_PROFILE=neon1
node scripts/package.mjs
terraform -chdir=infra init
terraform -chdir=infra plan -out=tfplan
terraform -chdir=infra apply tfplan
```

The `/chat/api/*` route on neon1.tech belongs to the neon1-aws-infrastructure site stack. It reads `/neon1-chat/prod/api_domain` and `/neon1-chat/prod/origin_secret`, so apply this stack first.
