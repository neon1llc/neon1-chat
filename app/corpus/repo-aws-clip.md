# AWS CLIP (AWS CLI Plus): the repository README, written for developers (https://github.com/neon1llc/aws-clip)

# AWS CLI Plus

AWS CLI Plus (`aws-clip`) makes multi-profile AWS CLI work safer and easier to
understand. It discovers the profiles already known to AWS CLI v2, follows each
profile's authentication path, verifies the active account and principal, and
puts account-bound guards in front of risky commands.

It does not replace AWS CLI. AWS CLI v2 remains responsible for configuration,
credentials, IAM Identity Center, local login, service coverage, retries,
requests, and output formatting. Use `aws` directly for ordinary one-off work.
Use `aws-clip` when profile isolation, identity visibility, production account
checks, or explicit approval materially reduces operational risk.

## Install

Requirements:

- AWS CLI v2 on `PATH`, or its executable path configured explicitly
- Go 1.22 or newer when building from source

```sh
make build
./bin/aws-clip doctor
```

Or install into the active Go binary directory:

```sh
go install ./cmd/aws-clip
aws-clip doctor
```

## Start with a profile

List the profiles AWS CLI has already merged from its normal configuration:

```sh
aws-clip profiles
aws-clip profiles --format json
```

The text view shows Region, authentication path, configured SSO account and
role when available, selection, and protection status. It never prints access
key IDs, credential-process commands, SSO start URLs, login-session names, or
credential values. The JSON response has `schema_version: 1` and an ordered
`profiles` array; an unavailable Region is `null`.

`aws-clip` does not create profiles. Use AWS CLI's own configuration commands,
then select a profile explicitly:

```sh
aws configure sso --profile development
aws-clip --profile development login
aws-clip --profile development context
```

Profile selection can also come from `AWS_CLIP_PROFILE` or the user
configuration file. Lifecycle and guarded execution commands do not fall back
to AWS CLI's default profile.

## Login and logout

`login` first asks STS whether the selected profile already resolves valid
credentials. A valid session is reused. Otherwise it follows safe AWS profile
metadata, including `source_profile` chains:

- IAM Identity Center profiles run `aws sso login` for the owning profile
- AWS local login profiles run `aws login` for the owning profile
- role profiles use the login path of their source profile
- configured profiles with no declared provider can bootstrap AWS local login
  after an identity probe fails and the installed AWS CLI supports it
- static keys, credential processes, web identity, instance/container roles,
  and the default provider chain remain the owning provider's responsibility

After authentication, `aws-clip` verifies STS identity again and reports the
account and principal. It never exports or stores session credentials.

```sh
aws-clip --profile production login
```

Local-login logout is scoped to its login profile:

```sh
aws-clip --profile development logout
```

AWS CLI's SSO logout clears every cached SSO session, not only the selected
profile. `aws-clip` makes that wider effect explicit:

```sh
aws-clip --profile development logout --approve all-sso-sessions
```

Profiles backed by external or static providers have no AWS CLI login/logout
action; the diagnostic names the provider that must be refreshed.

## Verify the active context

`context` calls `aws sts get-caller-identity` through the selected AWS CLI
profile and reports only non-secret operational context:

```sh
aws-clip --profile production --region us-east-1 context
aws-clip --profile production context --format json
```

The result includes profile, observed account ID, principal ARN, user ID,
derived role or user name, effective Region, configured credential source,
source profile, and account-guard state. JSON output is a stable
`schema_version: 1` contract. The observed STS account, rather than the profile
name, is the value used for safety decisions.

Region precedence is wrapper flag, `AWS_CLIP_REGION`, user configuration,
`AWS_REGION`, `AWS_DEFAULT_REGION`, then the selected AWS profile. Unset retry
and timeout settings continue to defer to AWS CLI.
