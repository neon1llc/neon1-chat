# Terraform for neon1.tech on AWS: the repository README, written for developers (https://github.com/neon1llc/neon1-aws-infrastructure)

# neon1-aws-infrastructure

Terraform for neon1 LLC's AWS account.

- `site/` hosts neon1.tech: private S3 origin, CloudFront, the certificate and the apex and `www` records. See [site/README.md](site/README.md).
- `github/` lets GitHub Actions reach AWS without stored keys. See [github/README.md](github/README.md).

The Route 53 zone for neon1.tech is referenced, not owned, so records outside a stack (such as mail) are left alone. Credentials come from the environment (`AWS_PROFILE=neon1` locally, OIDC in CI). No profile is set in providers or backends.

## Checks and deploys

Each folder with a `versions.tf` is a stack: `site/` hosts neon1.tech and `github/` lets GitHub Actions reach AWS. State for each is in `s3://neon1-tfstate/<stack>/terraform.tfstate`.

```bash
make check                 # fmt, validate, tflint, trivy, gitleaks
export AWS_PROFILE=neon1
make plan STACK=site       # saves site/tfplan
make apply STACK=site      # applies exactly that plan
```

`make check` uses tflint, trivy and gitleaks when they're installed and their pinned Docker images when they aren't. Locally, lint is skipped if neither tflint nor Docker is available. Accepted trivy findings and the reasons for them are in `.trivyignore`.

Pushing to `main` runs the checks, then plans and applies `site` with the role from the repository variable `AWS_TERRAFORM_ROLE_ARN`. CI only plans `github`, because that role can't change IAM. Apply `github` by hand, as described in [github/README.md](github/README.md). A new stack needs a line in the workflow matrix and access in that role's policy.
