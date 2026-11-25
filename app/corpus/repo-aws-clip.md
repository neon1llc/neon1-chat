# AWS CLIP (AWS CLI Plus): the repository README, written for developers (https://github.com/neon1llc/aws-clip)

# AWS CLIP

AWS CLIP (AWS CLI Plus) sits in front of AWS CLI v2 for multi-profile work. It finds your profiles, logs in through each profile's own path, checks the active account and principal, and confirms risky commands against the account you expect. For one-off work, use `aws` directly.

**Status:** v0.x, early software. Tests run against a fake AWS CLI and never contact AWS. I've only used it on my own machines.

**Not access control.** Anyone with a shell can run `aws` directly. Real limits belong in IAM, permission boundaries, and service control policies.

## Where it fits

| Need | Use |
| --- | --- |
| Short-lived credentials, SSO login, profile config | AWS CLI v2 itself: [`aws configure sso`](https://docs.aws.amazon.com/cli/latest/userguide/sso-configure-profile-token.html) and [`aws login`](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-authentication.html) |
| Fast role switching and several consoles open at once | [Granted](https://github.com/fwdcloudsec/granted) |
| Storing long-lived IAM keys in an OS keystore | An actively maintained [aws-vault fork](https://github.com/ByteNess/aws-vault), since the [original](https://github.com/99designs/aws-vault) is abandoned. Better, move off long-lived keys |
| A prompt and account check at the moment you run a risky CLI command | **AWS CLIP** |

AWS CLIP works beside the others and stores no credentials. It catches a shell still pointed at production when you meant development.

## Install

Needs AWS CLI v2 on `PATH`. With Go 1.26 or newer:

```sh
go install github.com/neon1llc/aws-clip/cmd/aws-clip@latest
aws-clip doctor
```

Or download a macOS or Linux binary (arm64 or amd64) from the [latest release](https://github.com/neon1llc/aws-clip/releases/latest) and check it against `checksums.txt`:

```sh
# Linux amd64
sha256sum --check --ignore-missing checksums.txt
chmod +x aws-clip_linux_amd64
mv aws-clip_linux_amd64 ~/.local/bin/aws-clip
```

```sh
# macOS arm64
shasum -a 256 --check --ignore-missing checksums.txt
chmod +x aws-clip_darwin_arm64
mv aws-clip_darwin_arm64 ~/.local/bin/aws-clip
```

Then confirm that AWS CLI v2 is on `PATH` and run:

```sh
aws-clip doctor
```

Release binaries are provided for Linux and macOS on amd64 and arm64. Windows amd64 is supported through `go install`; prebuilt Windows binaries are not provided. CI tests Go 1.26 and 1.27 on Linux, macOS, and Windows.

Or build from a clone:

```sh
make build
./bin/aws-clip doctor
```

## Start with a profile

```sh
aws-clip profiles
aws-clip profiles --format json
```

Output never includes access key IDs, credential-process commands, SSO start URLs, login-session names, or credential values. JSON has `schema_version: 1`.

Create profiles with AWS CLI, then select one with `--profile`, `AWS_CLIP_PROFILE`, or the configuration file. Login and guarded commands never fall back to the default profile.

```sh
aws configure sso --profile development
aws-clip --profile development login
aws-clip --profile development context
```

## Log in and out

`login` asks STS whether the profile already has valid credentials and reuses them. Otherwise it follows the profile's metadata, including `source_profile` chains:

- IAM Identity Center profiles run `aws sso login`.
- AWS local login profiles run `aws login`.
- Role profiles use their source profile's login path.
- Static keys, credential processes, web identity, instance or container roles, and the default provider chain stay with their own provider. The message names the provider to refresh.

```sh
aws-clip --profile production login
aws-clip --profile development logout
```

SSO logout clears every cached SSO session, so it needs approval:

```sh
aws-clip --profile development logout --approve all-sso-sessions
```

## Verify the active context

`context` calls `aws sts get-caller-identity` through the selected profile and reports non-secret details: profile, account ID, principal ARN, user ID, effective Region, credential source, and account-guard state. Safety decisions use the observed STS account, never the profile name.

```sh
aws-clip --profile production --region us-east-1 context
aws-clip --profile production context --format json
```
