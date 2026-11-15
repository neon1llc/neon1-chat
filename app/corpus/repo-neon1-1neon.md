# 1NEON, the client portal: the repository README, written for developers (https://github.com/neon1llc/neon1-1NEON)

# 1NEON

The neon1 client portal at [neon1.tech/1NEON](https://neon1.tech/1NEON/). Each project runs through four layers: Needs, Execute, Observe, and Normalize. Proposals, decisions, files, and results stay together from the first call to handover.

- `apps/web`: the React app
- `apps/api`: the API, one Lambda behind API Gateway
- `packages/domain`: the model and permission rules both share
- `infra`: Terraform for everything behind the edge (see [infra/README.md](infra/README.md))

The site's design (fonts, colors, and the rain) loads from [neon1-site](https://github.com/neon1llc/neon1-site).

## Run it locally

Node 22.

```bash
npm install
npm run dev     # app on http://localhost:5173/1NEON/, API in memory with demo data
npm run check   # types, tests, and build
```

Locally there's no sign-in. Pick a demo account from the switcher on the sign-in screen.

## Dev

[dev.neon1.tech/1NEON](https://dev.neon1.tech/1NEON/) is a private copy of the portal, behind dev.neon1.tech's sign-in. It runs `infra/envs/dev`: its own API, table, documents bucket, and sign-in pool on auth-dev.neon1.tech, with no texts, no malware scan, and locked records kept one day.

- **Deploys:** pushing the `dev` branch ships the functions and the app in about a minute. `dev-sync` merges main into `dev` after every push to main. Dev is never tagged; changelog entries wait under `## Unreleased`, and each work branch goes to main on its own.
- **Data:** dev holds made-up data only, never a copy of production's. `AWS_PROFILE=neon1 npx tsx apps/api/src/dev-sample.ts --yes` empties dev's table and documents and fills them with the fictional organizations, people (`.example` addresses), projects, invoices, and payment records local development uses, plus one harmless text file. Sign in to dev again afterwards.
- **Payments:** dev takes Stripe test-mode keys only (`/1neon/dev/stripe/secret-key` and `/1neon/dev/stripe/webhook-secret` in SSM, a test-mode webhook to `https://dev.neon1.tech/1NEON/api/billing/stripe`), so cards, bank transfers, and webhooks work end to end with Stripe's test numbers and no real money. A live key on dev turns online payment off.
- **neon1 only:** so a test can never reach a real person, dev (`APP_ENV=dev`, see `apps/api/src/dev-guard.ts`) admits only operators and neon1.tech addresses, sends mail only to them, and creates no accounts for anyone else. The dev pool holds neon1 admins only.
- **Signing in:** use the email code. A production passkey shows up because passkeys belong to neon1.tech, but the dev pool doesn't know it; add a dev passkey from your profile after signing in.

## Deploy

Pushing to `main` deploys. GitHub Actions applies `infra/envs/prod` and ships the functions and the app with AWS roles assumed through OIDC, so the repo holds no AWS keys.

Changes move through neon1's four [release levels](https://github.com/neon1llc/neon1-corpus/blob/main/corpus/standards/versioning.md#release-levels): Implemented, Verified, Released, and Qualified. The deploy's verify step and the release tag mark Released. Changes to money, signed terms, sign-in, or exports should be Verified on dev before they merge to main, and Qualified needs real client use and a tested restore.

## License

The code is MIT licensed (see `LICENSE`). The license covers the code only: the neon1 and 1NEON names, logos, and other brand marks are not licensed, so please don't use them in a way that suggests your work comes from neon1 LLC. Third-party packages keep their own licenses.
