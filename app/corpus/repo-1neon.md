# 1NEON, the client portal (https://github.com/neon1llc/1NEON)

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

## Deploy

Pushing to `main` deploys. GitHub Actions applies `infra/envs/prod` and ships the functions and the app with AWS roles assumed through OIDC, so the repo holds no AWS keys.
