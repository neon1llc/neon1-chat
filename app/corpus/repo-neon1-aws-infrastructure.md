# Terraform for neon1.tech on AWS: the repository README, written for developers (https://github.com/neon1llc/neon1-aws-infrastructure)

# neon1-aws-infrastructure

Terraform for neon1 LLC's AWS account.

- `site/` hosts neon1.tech: private S3 origin, CloudFront, the certificate and the apex and `www` records. See [site/README.md](site/README.md).
- `dns/` holds the zone-wide records no app stack owns: a dated SOA serial, CAA (Amazon only), and the apex mail records for Google Workspace (MX, SPF, DKIM, DMARC, TLS reporting, and BIMI). See [dns/README.md](dns/README.md).
- `github/` lets GitHub Actions reach AWS without stored keys. See [github/README.md](github/README.md).

The Route 53 zone for neon1.tech is referenced, not owned. Each stack manages only its own records, and anything no stack names is left alone. Credentials come from the environment (`AWS_PROFILE=neon1` locally, OIDC in CI). No profile is set in providers or backends.

## Checks and deploys

Each folder with a `versions.tf` is a stack: `site/` hosts neon1.tech, `dns/` holds the shared records, and `github/` lets GitHub Actions reach AWS. State for each is in `s3://neon1-tfstate/<stack>/terraform.tfstate`.

```bash
make check                 # fmt, validate, tflint, trivy, gitleaks
export AWS_PROFILE=neon1
make plan STACK=site       # saves site/tfplan
make apply STACK=site      # applies exactly that plan
```

`make plan` and `make apply` first check that the credentials belong to the expected account, read from `EXPECTED_ACCOUNT` or the untracked `.expected-account` file (12 digits). The providers also refuse any other account through `allowed_account_ids`. CI takes the account from its role ARN.

`make check` uses tflint, trivy and gitleaks when they're installed and their pinned Docker images when they aren't. Locally, lint is skipped if neither tflint nor Docker is available. Accepted trivy findings and the reasons for them are in `.trivyignore`.

Pushing to `main` runs the checks, then plans and applies `site` and `dns` with the role from the repository variable `AWS_TERRAFORM_ROLE_ARN`. CI only plans `github`, because that role can't change IAM. Apply `github` by hand, as described in [github/README.md](github/README.md). A new stack needs a line in the workflow matrix and access in that role's policy.


## How the four repositories fit together

| Repository | Owns | Reads from others | Deploys |
|---|---|---|---|
| neon1-aws-infrastructure | The neon1.tech distribution, certificate, and apex and `www` records (`site/`); the SOA, CAA, and apex mail records (`dns/`); every GitHub role and boundary (`github/`) | `/1neon/prod/*` and `/neon1-chat/prod/*` in SSM | `site` and `dns` on push to main; `github` by hand |
| neon1-site | The marketing site's files | Nothing | Bucket sync and invalidation on push to main |
| neon1-1NEON | The portal's buckets, table, functions, user pool, HTTP API, and alarms | Nothing | Terraform and app deploys on push to main |
| neon1-chat | The assistant's table, function, HTTP API, alarms, and corpus | Nothing | Terraform (which ships the code) on push to main |

The shared contract is the SSM parameters: 1NEON publishes `app_bucket_domain` and `api_domain`, and the assistant publishes `api_domain` and `origin_secret`. The `site` stack reads them on each apply, so a first bootstrap goes in this order: the `github` stack by hand, then 1NEON's and the assistant's Terraform, then `site`.

Manual steps: applying `github` (its role can't change IAM), confirming each alarm email subscription once from the inbox, and the origin secret rotation in neon1-chat's README (three applies, no refusals).

Everything here is production-specific: one account, `us-east-1`, and the names above. A staging account would need its own state bucket, `EXPECTED_ACCOUNT`, and variable values; nothing here assumes it exists.

Rollback: revert the commit on main and let CI apply it (or apply `github` by hand). State is versioned in `neon1-tfstate`, so a bad state write can be restored from an earlier object version.

## Branch rules

All four repos carry the same two rulesets on `main`, set in each repo's GitHub settings (Rules), not in Terraform:

- "main: no force push or deletion" blocks force pushes and deleting `main`, for everyone.
- "main: required checks" requires the repo's CI checks before anything lands on `main`: `ci-secrets`, `ci-app`, and `ci-terraform` in neon1-1NEON and neon1-chat, and `check` in neon1-site and here. Repository admins bypass it, so a solo maintainer can still push directly; Dependabot, the corpus refresh, and any other writer need green checks. Deploys also wait on their checks for the same commit, so a bypassed push that fails a check still doesn't ship.

Emergency: an admin can switch a ruleset to "Disabled" in the repo's settings, make the fix, and switch it back. Renaming a CI job means updating the required check name in the same change.
