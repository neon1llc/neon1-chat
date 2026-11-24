# 1NEON, the client portal: the repository README, written for developers (https://github.com/neon1llc/neon1-1NEON)

# 1NEON

The neon1 client portal at [neon1.tech/1NEON](https://neon1.tech/1NEON/). Each project runs through Needs, Execute, Observe, and Normalize, with proposals, decisions, files, and results in one place.

- `apps/web`: the React app
- `apps/api`: the API, one Lambda behind API Gateway
- `packages/domain`: the model and permission rules both share
- `infra`: Terraform for everything behind the edge (see [infra/README.md](infra/README.md))

Fonts, colors, and the rain load from [neon1-site](https://github.com/neon1llc/neon1-site).

## Run it locally

Node 22.

```bash
npm install
npm run dev     # app on http://localhost:5173/1NEON/, API in memory with demo data
npm run check   # types, tests, and build
```

Locally there's no sign-in. Pick a demo account instead.

## Design

1NEON inherits its type and spacing scales from neon1.tech and adds only portal-level steps. See [docs/DESIGN.md](docs/DESIGN.md).

## Dev

[dev.neon1.tech/1NEON](https://dev.neon1.tech/1NEON/) is a private copy behind dev.neon1.tech's sign-in. It runs `infra/envs/dev` with its own API, table, documents bucket, and sign-in pool on auth-dev.neon1.tech. Dev SMS stays off until its dedicated sender is approved and the sandbox destination is verified. Once on, a SecureString allowlist limits delivery to test numbers. Dev runs no malware scan and keeps locked records one day.

- **Deploys:** pushing the `dev` branch ships the functions and app in about a minute. `dev-sync` runs inside every production deploy, beside the release job: it merges main into `dev` and rebuilds the dev backend, so a dev failure shows red on the deploy run. Dev is never tagged. Changelog entries wait under `## Unreleased`, and each work branch goes to main on its own. To release, rename the entry to `## vX.Y.Z - date` and run `npm run bump -- X.Y.Z` so `package.json` matches in the same commit. The walkthroughs run in three shards, and a commit whose web app, packages, scripts, lockfile, config and workflows match a passing dev or main run (and the live site is the same version) skips them; anything else plays them all.
- **Data:** dev holds made-up data only. `AWS_PROFILE=neon1 npx tsx apps/api/src/dev-sample.ts --yes` empties dev's table and documents, then fills them with the fictional organizations, people (`.example` addresses), projects, invoices, and payments local development uses, plus one text file. Sign in again afterwards.
- **Payments:** dev takes Stripe test-mode keys only (`/1neon/dev/stripe/secret-key` and `/1neon/dev/stripe/webhook-secret` in SSM, a test-mode webhook to `https://dev.neon1.tech/1NEON/api/billing/stripe`). Cards, bank transfers, and webhooks work end to end with Stripe's test numbers. A live key on dev turns online payment off.
- **neon1 only:** dev (`APP_ENV=dev`, see `apps/api/src/dev-guard.ts`) admits only operators and neon1.tech addresses, mails only them, and creates no other accounts, so a test can't reach a real person. The dev pool holds neon1 admins only.
- **Signing in:** use the email code. A production passkey may appear, but the dev pool doesn't know it. Add a dev passkey from your profile.

## Deploy

Pushing to `main` deploys. GitHub Actions applies `infra/envs/prod` and ships the functions and app through AWS roles assumed with OIDC, so the repo holds no AWS keys.

Changes move through neon1's [release levels](https://github.com/neon1llc/neon1-corpus/blob/main/corpus/standards/versioning.md#release-levels): Implemented, Verified, Released, and Qualified. The deploy's verify step and the release tag mark Released. Changes to money, signed terms, sign-in, or exports are Verified on dev before they merge to main. Qualified needs real client use and a tested restore.

## License

The code is MIT licensed (see `LICENSE`). The license covers the code only: the neon1 and 1NEON names, logos, and other brand marks are not licensed, so don't use them in a way that suggests your work comes from neon1 LLC. Third-party packages keep their own licenses. `NOTICE` credits the bundled place and mailbox-domain lists.
