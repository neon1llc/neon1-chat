# Terraform for neon1.tech on AWS: the repository README, written for developers (https://github.com/neon1llc/neon1-aws-infrastructure)

# neon1-aws-infrastructure

Terraform for neon1's AWS account.

Each folder with a `versions.tf` is a stack. State for each is in `s3://neon1-tfstate/<stack>/terraform.tfstate`.

- `site/` hosts neon1.tech: private S3 origin, CloudFront, the certificate, and the apex and `www` records. See [site/README.md](site/README.md).
- `dns/` holds the zone-wide records no app stack owns: a dated SOA serial, CAA (Amazon only), and the apex mail records for Google Workspace (MX, SPF, DKIM, DMARC, TLS reporting, and BIMI). See [dns/README.md](dns/README.md).
- `catchall/` shows the not-found page on every other `neon1.tech` name through a wildcard record and its own small distribution. It's applied by hand.
- `github/` lets GitHub Actions reach AWS without stored keys. See [github/README.md](github/README.md).
- `account/` holds account-wide guardrails: the CloudTrail audit trail and its locked bucket, the recurring-spend budget, a separate budget that reports one-time fees such as domain renewals, and the cost anomaly email. Applied by hand (`make plan STACK=account`, then `make apply STACK=account`), never by CI.

The Route 53 zone for neon1.tech is referenced, not owned. Each stack manages only its own records and leaves the rest alone. Credentials come from the environment (`AWS_PROFILE=neon1` locally, OIDC in CI). No profile is set in providers or backends.

## Checks and deploys

```bash
make check                 # fmt, validate, tflint, trivy, gitleaks
export AWS_PROFILE=neon1
make plan STACK=site       # saves site/tfplan
make apply STACK=site      # applies exactly that plan
```

`make plan` and `make apply` first check that the credentials belong to the expected account, read from `EXPECTED_ACCOUNT` or the untracked `.expected-account` file (12 digits). The providers also refuse any other account through `allowed_account_ids`. CI takes the account from its role ARN.

`make check` uses tflint, trivy, and gitleaks when installed, and their pinned Docker images when not. Without tflint or Docker, lint is skipped locally. Accepted trivy findings and their reasons are in `.trivyignore`.

Pushing to `main` runs the checks, then plans and applies `site` and `dns` with the role from the repository variable `AWS_TERRAFORM_ROLE_ARN`. CI only plans `github`, because that role can't change IAM. Apply `github` by hand, as [github/README.md](github/README.md) describes. A new stack needs a line in the workflow matrix and access in that role's policy.

Changes move through neon1's four [release levels](https://github.com/neon1llc/neon1-corpus/blob/main/corpus/standards/versioning.md#release-levels): Implemented, Verified, Released, and Qualified. Every stack's plan or apply passing and the tag mark Released. I read any plan that replaces or destroys a resource before applying it. Qualified needs a tested recovery, such as restoring neon1.tech from this repository.

## How the four repositories fit together

| Repository | Owns | Reads from others | Deploys |
|---|---|---|---|
| neon1-aws-infrastructure | The neon1.tech distribution, certificate, and apex and `www` records (`site/`); the SOA, CAA, and apex mail records (`dns/`); every GitHub role and boundary (`github/`) | `/1neon/prod/*` and `/neon1-chat/prod/*` in SSM | `site` and `dns` on push to main; `github` by hand |
| neon1-site | The marketing site's files | Nothing | Bucket sync and invalidation on push to main |
| neon1-1NEON | The portal's buckets, table, functions, user pool, HTTP API, and alarms | Nothing | Terraform and app deploys on push to main |
| neon1-chat | The assistant's table, function, HTTP API, alarms, and corpus | Nothing | Terraform (which ships the code) on push to main |

The SSM parameters are the shared contract. 1NEON publishes `app_bucket_domain` and `api_domain`, and the assistant publishes `api_domain` and `origin_secret`. The `site` stack reads them on each apply, so a first bootstrap goes in this order: the `github` stack by hand, then 1NEON's and the assistant's Terraform, then `site`.

Manual steps:

- Confirming each alarm email subscription once from the inbox.
- Rotating the origin secret, described in neon1-chat's README.

Everything here is production-specific: one account, `us-east-1`, and the names above. A staging account would need its own state bucket, `EXPECTED_ACCOUNT`, and variable values.

To roll back, revert the commit on main and let CI apply it, or apply `github` by hand. State is versioned in `neon1-tfstate`, so a bad state write can be restored from an earlier object version.
