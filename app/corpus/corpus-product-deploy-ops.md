# DeployOps (https://neon1.tech/)

Deploy pipelines with checks, approvals, and rollback: a local developer preview, not production-supported.

*Public · v0.14.0 · local developer preview, not production-supported*

**Deploy pipelines with checks, approvals, and rollback.** The code is on [GitHub](https://github.com/neon1llc/deploy-ops) under the Apache-2.0 license. It runs end to end on your own machine today. Some cloud paths have been run live and others haven't, as listed below.

- **Who it's for:** small technical teams that deploy by hand today, or whose pipelines grew piece by piece.
- **What it does:** builds, deploys, releases only the app when only the app changed, promotes between stages, runs an HTTP check, and rolls back.

## What's been run

- **On your machine:** build, deploy, app-only release, promotion, and an HTTP check run end to end, in the demo and in CI. Rollback has local tests. Docker Compose and a kind Kubernetes cluster were also checked. Windows isn't qualified.
- **AWS:** run live for CloudFormation create, update, and deletion of a private S3 bucket it owns, and for delivery to an existing ECS Fargate service, including an app-only image update. Not yet run live: a public HTTP check, publishing an image, a CDK stack, or a Terraform or OpenTofu apply.
- **Azure:** run live for Bicep and ARM provisioning and a Container Apps image update, with revision health and logs. There's no ingress HTTP check yet, and DeployOps can't delete ARM resources itself.
- **Google Cloud:** Cloud Run has passed only command fixtures and offline validation. Nothing has been deployed live.

## Try the demo

The demo runs on a clean machine with Python 3, with no cloud account needed. CI runs it on every push. From a clone of the repository:

```sh
python3 -m venv .venv && source .venv/bin/activate && python -m pip install -r requirements-dev.txt -e .
deploy-ops demo ../deploy-ops-demo
```

## Current limits

It's a preview for developers, not supported for production. Commands and settings may change before a stable release.

## Next step

If you need deploy pipelines for production now, that work is part of [cloud and AI engineering](../services/index.md), done as a project with the tools you already use. [Get in touch](../company/contact.md) to talk it through.
