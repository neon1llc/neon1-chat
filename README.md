# neon1-chat

Neo, the assistant on [neon1.tech](https://neon1.tech) and in 1NEON. It answers visitors' questions about neon1 from neon1's public pages, answers general technology questions as general information, and offers Pradeep by email or a free call whenever it can't answer.

- `app/` is the function: `src/handler.mjs` (HTTP API), `src/chat.mjs` (prompt and model call), `src/limits.mjs` (caps and cooldowns), and `corpus/`, the public text it answers from and Neo's directives. `app/eval/` is the prospect question set and its runner; it never ships.
- `infra/` is the Terraform: a Lambda behind an HTTP API, a DynamoDB table of short-lived counters, a Bedrock budget alert, and two SSM parameters the neon1.tech distribution reads.
- The chat window itself is in [neon1-site](https://github.com/neon1llc/neon1-site) under `shared/`, so the site and 1NEON load the same file.

## How it stays grounded and cheap

The whole corpus (about 12,000 tokens) goes in the system prompt, so there's no search index to run. Qwen3 Next 80B on Amazon Bedrock writes the reply, for under a fifth of a cent a question. It was chosen with an earlier version of the eval over gpt-oss-120b, Nova 2 Lite, Nemotron Super, DeepSeek V3.2, Kimi K2.5, and Mistral Large 3: across repeated runs it passed every case at about the price of gpt-oss-120b, which once repeated a planted price. Changing models takes two steps: the function's permissions boundary in neon1-aws-infrastructure (`chat_model_id`, applied by hand), then `model` here. Replies sample at temperature 0.7, so the same question gets freshly worded answers; the prompt, not a temperature of zero, keeps them grounded. Message text is never logged or stored by this app.

## Neo's character

Neo's voice and standing directives live in [neon1-corpus](https://github.com/neon1llc/neon1-corpus) as `corpus/neo/chat.md`, a document of type `directive`. The corpus builder writes it as `directive-neo-chat.md`, and the prompt puts it with the rules, never among the sources Neo answers from. The rules in `app/src/chat.mjs` come first and win where the two differ. Both are public on purpose: there's nothing secret in Neo's instructions, so a request to see them is answered with a link.

**Scope.** `SCOPE` in `app/src/chat.mjs` is the one switch for how far Neo goes beyond neon1's pages. `general-help`, the default, answers general technology questions (how tools connect, security and compliance concepts, cloud costs) as general information. `neon1-only` keeps Neo to neon1's pages and sends other questions to Pradeep. Either way, facts about neon1 come only from the corpus, the only dollar figures Neo may give are the ones on the pricing page (any other figure is removed from the reply before the visitor sees it), and Neo never commits neon1 to work, timelines, or outcomes.

## How it handles abuse

The approach follows the OWASP Top 10 for LLM applications (prompt injection and unbounded consumption): treat every message as data, keep nothing secret in the prompt, give the model no tools, bound every input and output, limit and escalate per visitor, cap the whole site, and fail closed.

- **Grounding and output checks.** Facts about neon1 come only from the corpus. Links are kept only when the corpus contains them, sentences with a dollar figure the pricing page doesn't publish are dropped, replies are cut to the contract's length, and Markdown beyond links and lists is dropped.
- **Escalating cooldowns.** Request limits count questions: 6 a minute and 60 an hour per visitor, and 500 a day for the whole site, in DynamoDB before any model call. A visitor who trips a limit gets a cooldown that grows with each strike in a day: 2 minutes, then 10, then an hour, then a day. Strikes are forgiven after a quiet day. Messages during a cooldown aren't answered, and three tries during one is another strike. The site's daily cap is nobody's strike. Refusals say roughly how long to wait, never how many messages it took, and, like every failure, offer Pradeep by email and the free call, so a visitor on a network someone else tripped is never stuck.
- **Repeats and misuse.** The same question three times in ten minutes is a strike (messages under 15 characters, such as "thanks", are never counted). The model marks any reply to a message that tries to change its rules or role, asks it to pretend, or insults someone (general and off-topic questions are not marked); the marker is removed before the visitor sees the reply, and every third marked message in an hour is a strike that starts from the next message.
- **Who counts as one visitor.** A salted hash of the IPv4 address, or of the IPv6 /64, since one home or phone gets a whole /64. The table never holds an address, a question's fingerprint lives ten minutes, and every item expires on its own. Strikes are logged by reason and level only.
- **Concurrency** caps how many copies of the function run at once (5), and the HTTP API throttles the whole route to 5 requests a second.
- **The Bedrock budget** is an email at 80% (forecast) and 100% (actual) of $5 a month. It is an alert, not a spending cap, and it covers Bedrock only, not CloudFront, the API, or DynamoDB.
- **Not yet.** A web application firewall with bot challenges is held until there's client traffic to protect, and the site uses no CAPTCHA. If the counters can't be written, every question is refused, never let through.

## The conversation contract

The chat window and this API share one contract, written in `app/src/contract.mjs` and mirrored in neon1-site `shared/chat.js`: turns alternate visitor and assistant, start and end with the visitor, and number at most 11; each turn is at most 1,200 characters after trimming, whoever wrote it; all turns together are at most 6,000; and a reply is at most 1,200 characters, cut at a sentence or word and never inside a link, so it always fits back into the history. Characters are JavaScript string length, which is what a browser's `maxlength` counts. The window drops its oldest question and answer together until a conversation fits, so the newest question always goes up. A refusal says which rule failed (`question_too_long` or `conversation_too_long`), so the window can tell a visitor to shorten a question only when that's the problem. Change both repositories together, and deploy this one first.

Browsers call `https://neon1.tech/chat/api/chat`, so it's same-origin for the site and 1NEON, and their CSPs stay `connect-src 'self'`. CloudFront adds a secret header that the function checks, so the API can't be called around the caps.

## Working on it

```bash
npm ci
npm test                                   # handler, caps and cooldowns, contract, corpus, and release checks, with AWS faked out
npm run corpus                             # refresh app/corpus from the latest neon1-corpus release and public READMEs
npm run eval:offline                       # the prospect question set, assembled into the prompt (no model call)
npm run eval -- live https://neon1.tech/chat/api/chat --out results.json  # ask a deployed Neo, one question every 20 seconds
AWS_PROFILE=neon1 AWS_REGION=us-east-1 npm run eval -- bedrock  # this checkout's prompt against the model (a few cents)
```

The corpus is every document in the latest release of [neon1-corpus](https://github.com/neon1llc/neon1-corpus), where neon1's public words are written once (the site's copy, services, case studies, products, 1NEON help, and the privacy policy, terms, and cookie notice), plus the public repositories' READMEs. That list lives in one place, `SOURCES` in `scripts/build-corpus.mjs`, with a size bound and required content for each source and a bound on the total. The corpus comes as one file, `chat.bundle.json` on the release, and each document in it must match its own digest. A build is all or nothing: if a required source fails, comes back empty, or breaks a bound, the committed corpus stays as it was. A document dropped from neon1-corpus, or a source taken off the list, leaves the corpus. `app/corpus/manifest.json` records each file's URL, the corpus release or commit read, when it was fetched, and its digest, plus one digest for the whole corpus; the function reads only the files the manifest lists, corpus documents first in the corpus's own order.

`refresh.yml` rebuilds the corpus every Monday from the latest corpus release and opens a pull request for any change, new and deleted files included. CI runs on it, and merging it deploys. Run `npm run eval` after changing the prompt or the model.

## Operating it

**Failures.** Every failure returns JSON that is never cached, with a `code`, a `retry-after`, and words that offer Pradeep by email and the free call: 503 when the counters can't be written or the settings are invalid (the model is not called), 504 when the 15-second request deadline passes, 503 when Bedrock throttles, and 502 for any other model error. The function's own timeout is 20 seconds, and each AWS client retries at most once. Logs hold only an event name, an error's class name, and its HTTP status. Counting a flagged reply toward a cooldown is best effort: it runs under the rest of the same deadline, and if it times out the finished answer is still returned and a `misuse_timeout` event is logged. Each question makes one model call, and the chat log line records `attempts: 1` with its token usage.

**Alarms.** Four CloudWatch alarms email the budget address through an SNS topic: failed answers (5 in 15 minutes), crashes or timeouts (3 in 15 minutes), throttles (5 in 15 minutes), and slow answers (the slowest 5% over 12 seconds for 15 minutes). A quiet period with no questions never alarms. Confirm the subscription email once after the first apply, or alerts won't arrive.

**Pausing.** To switch the assistant off without touching the site, apply with `-var concurrency=0`. The function then runs no copies, every question gets a short error in the window, and the site, 1NEON, and their contact links work as usual. The throttle alarm fires while paused; that's expected. Apply without the variable to restore it. Every other number is checked at plan time: a cap of zero, a fraction, or an implausibly large value fails the plan, and the function refuses non-positive or fractional request limits at run time too.

**Testing answers.** `app/eval/questions.json` holds about 50 synthetic prospect questions (plain-words asks, prices, integrations, security, AWS, out-of-scope requests, hostile messages, and other languages), each with checkable rules: what a reply must mention, what it must not contain, and whether it must offer a person. Every reply is also checked for unpublished prices, promises, unlisted links, and length. `npm run eval -- live <url>` asks a deployed endpoint and grades the replies; it waits at least 20 seconds between questions against neon1.tech and stops at the first 429, so it never works around the limits. `npm run eval -- bedrock` asks the model directly with this checkout's prompt, and `--directives <file>` tries a draft of Neo's directives from neon1-corpus. `npm run eval:offline` and `npm test` check, with no model call, that every question assembles into the request Neo would send and that the facts each question expects are in the corpus. Baselines are saved beside the set, such as `app/eval/baseline-2026-11-14.json`.

## Deploys

Pushing to `main` runs `deploy.yml` in two stages. First the gates, none of which touch AWS: the full-history secret scan, then in one job the tests, the Terraform format, validate, and mocked-provider checks, and `scripts/package.mjs`, which stages the release folder Terraform zips (`app/src`, the corpus files its manifest lists, and the production dependencies installed with `npm ci --omit=dev` from the same lockfile the tests used). That folder is uploaded as the run's artifact. Only when every gate passes does the single `release` job start; it downloads that artifact, checks that its `release.json` names this commit and this lockfile digest, then plans and applies. The function therefore runs the exact AWS SDK versions in `package-lock.json`, not the copy built into the Lambda runtime, and the code applied is the code that was tested. `release.json` names the source commit and lockfile digest, and the health check at `/chat/api/health` reports them with the digest of the corpus it actually loaded. After applying, `scripts/verify-release.mjs` checks those against the commit just deployed and fails the job if an older build is still serving. Changes to `package.json`, `package-lock.json`, or those two scripts deploy too, since they change what ships.

The `release` job sits alone in the `release-prod` concurrency group, with cancel-in-progress off: a running release always finishes, and a second one waits, so two releases cannot interleave. A release that waited while main moved on stops before touching AWS, so a queued older commit never rolls production back. The job runs only when `AWS_TERRAFORM_ROLE_ARN` is set; without it the gates still run and nothing is applied.

The workflow uses the role in the repository variable `AWS_TERRAFORM_ROLE_ARN` (defined in neon1-aws-infrastructure `github/chat.tf`). To apply by hand:

```bash
export AWS_PROFILE=neon1
node scripts/package.mjs
terraform -chdir=infra init
terraform -chdir=infra plan -out=tfplan
terraform -chdir=infra apply tfplan
```

The `/chat/api/*` route on neon1.tech belongs to the neon1-aws-infrastructure site stack. It reads `/neon1-chat/prod/api_domain` and `/neon1-chat/prod/origin_secret`, so apply this stack first.


## Rotating the origin secret

CloudFront adds `x-origin-verify` to every request, read from `/neon1-chat/prod/origin_secret` when the site stack applies. To change it without refusing any visitor:

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
