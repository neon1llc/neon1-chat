# neon1-chat

Neo, the assistant on [neon1.tech](https://neon1.tech) and in 1NEON. It answers questions about neon1 from neon1's public pages and general technology questions as general information. When it can't answer, it offers Pradeep by email or a free call.

- `app/` is the function: `src/handler.mjs` (HTTP API), `src/chat.mjs` (prompt and model call), `src/limits.mjs` (caps and cooldowns), and `corpus/` (the public text Neo answers from, plus its directives). `app/eval/` is the prospect question set and its runner. It never ships.
- `infra/` is the Terraform: a Lambda behind an HTTP API, a DynamoDB table of short-lived counters, a Bedrock budget alert, and two SSM parameters the neon1.tech distribution reads.
- The chat window is in [neon1-site](https://github.com/neon1llc/neon1-site) under `shared/`. The site and 1NEON load the same file.

## How it stays grounded and cheap

The whole corpus (about 157,000 characters, some 39,000 tokens) goes in the system prompt, so there's no search index to run. Qwen3 Next 80B on Amazon Bedrock writes the reply for about 0.6 cent a question at most (November prices of $0.14 per million input tokens and $1.20 per million output tokens, with no prompt caching). An earlier version of the eval picked it over gpt-oss-120b, Nova 2 Lite, Nemotron Super, DeepSeek V3.2, Kimi K2.5, and Mistral Large 3. It passed every case across repeated runs at about the price of gpt-oss-120b, which once repeated a planted price.

To change models, update `chat_model_id` in the function's permissions boundary in neon1-aws-infrastructure (applied by hand), then `model` here. Replies sample at temperature 0.3: wording varies a little, and facts drift less than at 0.7. The prompt keeps them grounded. This app never logs or stores message text.

## Neo's character

Neo's voice and standing directives live in [neon1-corpus](https://github.com/neon1llc/neon1-corpus) as `corpus/neo/chat.md`, a document of type `directive`. The corpus builder writes it as `directive-neo-chat.md`. The prompt puts it with the rules, never among the sources Neo answers from. The rules in `app/src/chat.mjs` come first and win where the two differ. Both are public, so a request to see them gets a link.

**Scope.** `SCOPE` in `app/src/chat.mjs` sets how far Neo goes beyond neon1's pages.

- `general-help` (the default) answers general technology questions, such as how tools connect, security and compliance concepts, and cloud costs.
- `neon1-only` keeps Neo to neon1's pages and sends other questions to Pradeep.

Either way, facts about neon1 come only from the corpus. The only dollar figures Neo may give are on the pricing page. Neo never commits neon1 to work, timelines, or outcomes.

## How it handles abuse

This follows the OWASP Top 10 for LLM applications. Every message is data, the prompt holds no secrets, the model has no tools, and every input and output is bounded. Limits escalate per visitor, the whole site is capped, and failures refuse the question.

- **Output checks.** Links stay only when the corpus has them. Sentences with a dollar figure the pricing page doesn't publish are dropped. Replies are cut to the contract's length, and Markdown beyond links and lists is dropped.
- **Cooldowns.** Limits count questions in DynamoDB before any model call: 6 a minute and 15 an hour per visitor, and 60 a day for the whole site. Each strike in a day earns a longer cooldown: 2 minutes, 10, an hour, then a day. A quiet day clears the strikes. Messages during a cooldown get no answer, and three tries is another strike. The daily cap is nobody's strike, and its refusal says to try again tomorrow and links the call booking. Other refusals say roughly how long to wait, never how many messages it took. They offer Pradeep by email and the free call, so a visitor on a network someone else tripped is never stuck.
- **Repeats and misuse.** The same question three times in ten minutes is a strike. Messages under 15 characters, such as "thanks", never count. The model marks a reply to any message that tries to change its rules or role, asks it to pretend, or insults someone. General and off-topic questions aren't marked. The marker is removed before the visitor sees the reply, and every third marked message in an hour is a strike from the next message.
- **Who counts as one visitor.** A salted hash of the IPv4 address, or of the IPv6 /64, since one home or phone gets a whole /64. The table never holds an address. A question's fingerprint lives ten minutes, and every item expires on its own. Strikes are logged by reason and level only.
- **Concurrency.** At most 5 copies of the function run at once, and the HTTP API throttles the route to 5 requests a second.
- **Budget.** The Bedrock budget emails at 80% (forecast) and 100% (actual) of $5 a month. It's an alert, not a cap, and covers Bedrock only, not CloudFront, the API, or DynamoDB. Separately, the account stack emails when Bedrock passes $1 in a day and denies the admin user and the evaluation role at $10 a month, inside a $15 account budget. This function isn't denied, so its own caps are what limit it: at 60 questions a day and about 0.6 cent each, the worst case is about $11 a month.
- **Not yet.** A web application firewall with bot challenges waits until there's client traffic to protect. The site uses no CAPTCHA. If the counters can't be written, every question is refused.

## The conversation contract

The chat window and this API share one contract, written in `app/src/contract.mjs` and mirrored in neon1-site `shared/chat.js`:

- Turns alternate visitor and assistant, start and end with the visitor, and number at most 11.
- Each turn is at most 1,200 characters after trimming, whoever wrote it. All turns together are at most 6,000.
- A reply is at most 1,200 characters, cut at a sentence or word and never inside a link, so it always fits back into the history.
- Characters are JavaScript string length, which is what a browser's `maxlength` counts.

The window drops its oldest question and answer together until a conversation fits, so the newest question always goes up. A refusal says which rule failed (`question_too_long` or `conversation_too_long`), so the window tells a visitor to shorten a question only when that's the problem. Change both repositories together, and deploy this one first.

Browsers call `https://neon1.tech/chat/api/chat`, which is same-origin for the site and 1NEON, so their CSPs stay `connect-src 'self'`. CloudFront adds a secret header that the function checks, so the API can't be called around the caps.

## Working on it

```bash
npm ci
npm test                                   # handler, caps and cooldowns, contract, corpus, and release checks, with AWS faked out
npm run corpus                             # refresh app/corpus from the latest neon1-corpus release and public READMEs
npm run eval:offline                       # the prospect question set, assembled into the prompt (no model call)
npm run eval -- live https://neon1.tech/chat/api/chat --out results.json  # ask a deployed Neo, one question every 20 seconds
AWS_PROFILE=neon1 AWS_REGION=us-east-1 npm run eval -- bedrock  # this checkout's prompt against the model (a few cents)
AWS_PROFILE=neon1 AWS_REGION=us-east-1 npm run eval -- judge results.json  # grade saved replies for meaning (under a dollar)
npm run eval -- gate results.json            # the release check: a judged run against the newest judged baseline
```

Each run gets two grades. The keyword grade checks each reply against patterns in `questions.json`. The rubric grade (`app/eval/judge.mjs`) asks Claude Sonnet 4.6 on Bedrock, a different model family from Neo's, whether the reply meets a few plain criteria: it answers the question, gets the expected points across in any wording, claims nothing about neon1 the pages don't support, frames general information as general, offers a person when it should, and doesn't dead-end. The judge quotes the words each verdict rests on. Rule checks that need no judgment (published prices, real links, no promises, length) apply to both grades.

The corpus is every document in the latest release of [neon1-corpus](https://github.com/neon1llc/neon1-corpus), where neon1's public words are written once (site copy, services, case studies, products, 1NEON help, and the privacy policy, terms, and cookie notice), plus the public repositories' READMEs. `SOURCES` in `scripts/build-corpus.mjs` is the one list, with a size bound and required content for each source and a bound on the total.

The corpus comes as one file, `chat.bundle.json` on the release, and each document in it must match its own digest. A build is all or nothing: if a required source fails, comes back empty, or breaks a bound, the committed corpus stays as it was. A document dropped from neon1-corpus, or a source taken off the list, leaves the corpus.

`app/corpus/manifest.json` records each file's URL, the corpus release or commit read, when it was fetched, and its digest, plus one digest for the whole corpus. The function reads only the files the manifest lists.

`refresh.yml` rebuilds the corpus every Monday from the latest corpus release and opens a pull request for any change. CI runs on it, and merging it deploys. Run `npm run eval` after changing the prompt or the model.

## Operating it

**Failures.** Every failure returns uncached JSON with a `code`, a `retry-after`, and words that offer Pradeep by email and the free call:

- 503 when the counters can't be written or the settings are invalid (the model isn't called), or when Bedrock throttles.
- 504 when the 15-second request deadline passes.
- 502 for any other model error.

The function's own timeout is 20 seconds, and each AWS client retries at most once. Logs hold only an event name, an error's class name, and its HTTP status. Counting a flagged reply toward a cooldown is best effort. If it runs past the deadline, the answer is still returned and a `misuse_timeout` event is logged. Each question makes one model call. First person about neon1's work ("I can help", "we", "puedo ayudarte", 我们) is rewritten as "neon1" or "Pradeep" by fixed rules in `app/src/chat.mjs`, not by a second model call. The chat log line records `attempts: 1` with the answer's token usage.

**Alarms.** Four CloudWatch alarms email the budget address through an SNS topic: failed answers (5 in 15 minutes), crashes or timeouts (3 in 15 minutes), throttles (5 in 15 minutes), and slow answers (the slowest 5% over 12 seconds for 15 minutes). A quiet period never alarms. Confirm the subscription email once after the first apply, or alerts won't arrive.

**Pausing.** To switch the assistant off without touching the site, apply with `-var concurrency=0`. Every question then gets a short error in the window, and the site, 1NEON, and their contact links work as usual. The throttle alarm fires while paused, which is expected. Apply without the variable to restore it. Plan time rejects a cap of zero, a fraction, or an implausibly large value, and the function refuses non-positive or fractional request limits at run time.

**Testing answers.** `app/eval/questions.json` holds about 50 synthetic prospect questions (plain-words asks, prices, integrations, security, AWS, out-of-scope requests, hostile messages, and other languages). Each has checkable rules: what a reply must mention, what it must not contain, and whether it must offer a person. Every reply is also checked for unpublished prices, promises, unlisted links, and length.

- `--set skeptical` runs `app/eval/skeptical.json`, skeptical-buyer questions (alternatives, evidence, capacity, certification, engineers who already have help). It is reported apart from the release bar, which is the 53-question set.
- `npm run eval -- live <url>` grades a deployed endpoint. Against neon1.tech it waits at least 20 seconds between questions and stops at the first 429, so it never works around the limits.
- `npm run eval -- bedrock` asks the model directly with this checkout's prompt. `--directives <file>` tries a draft of Neo's directives from neon1-corpus.

Baselines are saved beside the set, such as `app/eval/baseline-2026-11-14.json`.

## Deploys

Pushing to `main` runs `deploy.yml` in two stages.

1. **Gates.** None touch AWS. They run the full-history secret scan, the tests, the Terraform format, validate, and mocked-provider checks, and `scripts/package.mjs`. That script stages the release folder Terraform zips: `app/src`, the corpus files its manifest lists, and the production dependencies from `npm ci --omit=dev` on the tested lockfile. The folder is uploaded as the run's artifact.
2. **Release.** When every gate passes, the `release` job downloads the artifact and checks that its `release.json` names this commit and lockfile digest. Then it plans and applies.

The function runs the exact AWS SDK versions in `package-lock.json`, and the code applied is the code that was tested. `/chat/api/health` reports the commit, the lockfile digest, and the digest of the corpus it loaded. After applying, `scripts/verify-release.mjs` checks those against the deployed commit and fails the job if an older build is still serving. Changes to `package.json`, `package-lock.json`, or those two scripts deploy too.

The `release` job sits alone in the `release-prod` concurrency group with cancel-in-progress off, so a running release finishes and a second one waits. A release that waited while main moved on stops before touching AWS, so a queued older commit never rolls production back. The job runs only when `AWS_TERRAFORM_ROLE_ARN` is set. Without it the gates still run and nothing is applied.

The workflow uses the role in the repository variable `AWS_TERRAFORM_ROLE_ARN` (defined in neon1-aws-infrastructure `github/chat.tf`). To apply by hand:

```bash
export AWS_PROFILE=neon1
node scripts/package.mjs
terraform -chdir=infra init
terraform -chdir=infra plan -out=tfplan
terraform -chdir=infra apply tfplan
```

The `/chat/api/*` route on neon1.tech belongs to the neon1-aws-infrastructure site stack. It reads `/neon1-chat/prod/api_domain` and `/neon1-chat/prod/origin_secret`, so apply this stack first.

Changes move through neon1's four [release levels](https://github.com/neon1llc/neon1-corpus/blob/main/corpus/standards/versioning.md#release-levels): Implemented, Verified, Released, and Qualified. A passing `scripts/verify-release.mjs` and the release tag mark Released. Before a release that changes the prompt, the model, or the corpus, a `bedrock` run of this checkout, judged, must pass `npm run eval -- gate`: the rubric grade is the gate and the keyword grade the floor, so neither may pass fewer questions than the newest judged baseline. Questions that passed before and fail now are listed for review either way. Qualified also needs `npm run eval -- live` against neon1.tech after the release, judged, with every miss reviewed; that run becomes the next baseline.

## Rotating the origin secret

CloudFront adds `x-origin-verify` to every request, read from `/neon1-chat/prod/origin_secret` when the site stack applies. To change it without refusing a visitor:

1. Read the current value from SSM into `TF_VAR_origin_secret_previous` (don't print it), and apply this stack with `-replace=random_password.origin_secret`. The function now accepts both values, and SSM holds the new one.
2. Apply the site stack in neon1-aws-infrastructure, so CloudFront sends the new value.
3. Apply this stack again without `TF_VAR_origin_secret_previous`, so only the new value passes.

## License

neon1-chat is source-available. You can read, run and change it, and every release becomes fully open two years after it's published.

| What | License | File |
|---|---|---|
| Code: the chat app, infrastructure, scripts | Functional Source License 1.1, ALv2 Future License. Use it for anything except a competing product or service. Each release becomes Apache-2.0 after two years. | `LICENSE-CODE` |
| Written text: README, system prompt wording | CC BY-ND 4.0. Share word for word with credit, no altered versions. | `LICENSE` |
| The corpus in `app/corpus` | A copy of neon1-corpus's documents, under neon1-corpus's content license | |
| Third-party packages | Their own licenses | |
| The neon1, 1NEON, N1 Supply and Ready, Secure, Go names, logos and brand marks | Not licensed for reuse | `TRADEMARK.md` |

Required credit on every copy: "© neon1 LLC (neon1.tech)". Keep the `NOTICE` file with every copy.
