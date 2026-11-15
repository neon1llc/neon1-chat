# AWS CLIP (AWS CLI Plus): the repository README, written for developers (https://github.com/neon1llc/aws-clip)

# AWS CLI Plus

AWS CLI Plus (`aws-clip`) makes multi-profile AWS CLI work safer. It finds the profiles AWS CLI v2 already knows, logs in through each profile's own path, checks the active account and principal, and guards risky commands by account.

It doesn't replace AWS CLI. AWS CLI v2 still handles configuration, credentials, IAM Identity Center, login, service coverage, retries, requests, and output. Use `aws` directly for ordinary one-off work. Use `aws-clip` when profile isolation, identity checks, production account guards, or explicit approval lower your risk.

## Install

You need AWS CLI v2 on `PATH` (or its path set in config) and Go 1.22 or newer to build.

```sh
make build
./bin/aws-clip doctor
```

Or install into your Go binary directory:

```sh
go install ./cmd/aws-clip
aws-clip doctor
```

## Start with a profile

List the profiles AWS CLI has already merged from its configuration:

```sh
aws-clip profiles
aws-clip profiles --format json
```

The text view shows Region, authentication path, SSO account and role when configured, selection, and protection status. It never prints access key IDs, credential-process commands, SSO start URLs, login-session names, or credential values. The JSON response has `schema_version: 1` and an ordered `profiles` array. An unavailable Region is `null`.

`aws-clip` doesn't create profiles. Create one with AWS CLI, then select it explicitly:

```sh
aws configure sso --profile development
aws-clip --profile development login
aws-clip --profile development context
```

You can also select a profile with `AWS_CLIP_PROFILE` or the configuration file. Login and guarded commands never fall back to AWS CLI's default profile.

## Log in and out

`login` asks STS whether the profile already has valid credentials and reuses them. Otherwise it follows the profile's metadata, including `source_profile` chains:

- IAM Identity Center profiles run `aws sso login` for the owning profile.
- AWS local login profiles run `aws login` for the owning profile.
- Role profiles use their source profile's login path.
- Configured profiles with no declared provider can bootstrap AWS local login after an identity probe fails, if your AWS CLI supports it.
- Static keys, credential processes, web identity, instance or container roles, and the default provider chain stay with their own provider.

After login, `aws-clip` checks STS identity again and reports the account and principal. It never exports or stores session credentials.

```sh
aws-clip --profile production login
aws-clip --profile development logout
```

Local-login logout affects only its login profile. AWS CLI's SSO logout clears every cached SSO session, so `aws-clip` asks you to say so:

```sh
aws-clip --profile development logout --approve all-sso-sessions
```

Profiles backed by external or static providers have no login or logout action. The message names the provider to refresh.

## Verify the active context

`context` calls `aws sts get-caller-identity` through the selected profile and reports non-secret context only:

```sh
aws-clip --profile production --region us-east-1 context
aws-clip --profile production context --format json
```

It reports profile, observed account ID, principal ARN, user ID, role or user name, effective Region, credential source, source profile, and account-guard state. JSON output is a stable `schema_version: 1` contract. Safety decisions use the observed STS account, not the profile name.

Region precedence: wrapper flag, `AWS_CLIP_REGION`, user configuration, `AWS_REGION`, `AWS_DEFAULT_REGION`, then the AWS profile. Unset retry and timeout settings defer to AWS CLI.
