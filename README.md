# neon1-chat

The assistant on [neon1.tech](https://neon1.tech) and in 1NEON. It answers visitors' questions from neon1's public pages only, and points everything else to a free call or an email.

- `app/` is the function: `src/handler.mjs` (HTTP API), `src/chat.mjs` (prompt and model call), `src/limits.mjs` (spend caps), and `corpus/`, the public text it answers from.
- `infra/` is the Terraform: a Lambda behind an HTTP API, a DynamoDB table of short-lived counters, a Bedrock budget alert, and two SSM parameters the neon1.tech distribution reads.
- The chat window itself is in [neon1-site](https://github.com/neon1llc/neon1-site) under `shared/`, so the site and 1NEON load the same file.

## How it stays grounded and cheap

The whole corpus (about 10,000 tokens) goes in a cached system prompt, so there's no search index to run. gpt-oss-120b on Amazon Bedrock writes the reply, for about a fifth of a cent a question. Each visitor gets 6 questions a minute and 60 an hour and the site gets 500 a day. The function runs at most 5 at once, and an email goes out if Bedrock spend nears $5 in a month. Message text is never logged or stored.

Browsers call `https://neon1.tech/chat/api/chat`, so it's same-origin for the site and 1NEON, and their CSPs stay `connect-src 'self'`. CloudFront adds a secret header that the function checks, so the API can't be called around the caps.

## Working on it

```bash
npm ci
npm test                                   # handler, caps, and prompt, with AWS faked out
npm run corpus                             # refresh app/corpus from neon1.tech and public READMEs
AWS_PROFILE=neon1 AWS_REGION=us-east-1 npm run eval  # the fixed test set against the live model (about a cent)
```

The corpus is the live neon1.tech page, 1NEON's privacy policy, terms, and cookie notice, 1NEON's in-portal help once it's on main, and the public repositories' READMEs. `refresh.yml` rebuilds it every Monday and deploys any change, so the assistant keeps up with the site on its own. Run `npm run eval` after changing the prompt or the model.

## Deploys

Pushing to `main` runs `deploy.yml`, which plans and applies `infra/`. That also packages and ships `app/`. It uses the role in the repository variable `AWS_TERRAFORM_ROLE_ARN` (defined in neon1-aws-infrastructure `github/chat.tf`). To apply by hand:

```bash
export AWS_PROFILE=neon1
terraform -chdir=infra init
terraform -chdir=infra plan -out=tfplan
terraform -chdir=infra apply tfplan
```

The `/chat/api/*` route on neon1.tech belongs to the neon1-aws-infrastructure site stack. It reads `/neon1-chat/prod/api_domain` and `/neon1-chat/prod/origin_secret`, so apply this stack first.
