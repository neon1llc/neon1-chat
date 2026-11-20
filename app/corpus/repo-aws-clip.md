# AWS CLIP (AWS CLI Plus): the repository README, written for developers (https://github.com/neon1llc/aws-clip)

# AWS CLI Plus

AWS CLI Plus (`aws-clip`) sits in front of AWS CLI v2 for multi-profile work. It finds the profiles AWS CLI already knows, logs in through each profile's own path, checks the active account and principal, and confirms risky commands against the account you expect.

AWS CLI v2 still handles configuration, credentials, IAM Identity Center, requests, and output. For ordinary one-off work, use `aws` directly.

**Status:** v0.x, early software. Tests run against a fake AWS CLI and never contact AWS. I've only used it on my own machines.

**Not access control.** It's a confirmation prompt and account check on your machine. Anyone with a shell can run `aws` directly, so real limits belong in IAM policies, permission boundaries, and service control policies.

## Where it fits

| Need | Use |
| --- | --- |
| Short-lived credentials, SSO login, profile config | AWS CLI v2 itself: [`aws configure sso`](https://docs.aws.amazon.com/cli/latest/userguide/sso-configure-profile-token.html) and [`aws login`](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-authentication.html) |
| Fast role switching and several consoles open at once | [Granted](https://github.com/fwdcloudsec/granted) |
| Storing long-lived IAM keys in an OS keystore | An actively maintained [aws-vault fork](https://github.com/ByteNess/aws-vault); the [original](https://github.com/99designs/aws-vault) is abandoned. Better still, move off long-lived keys |
| Limits that can't be bypassed | IAM, permission boundaries, SCPs, and role design |
| A prompt and account check at the moment you run a risky CLI command | **aws-clip** |

aws-clip works beside the others. It uses the login path a profile already declares and stores no credentials. At the moment of a risky command, it checks that the profile resolves to the expected account, prints the target, and asks for confirmation unless the command is clearly read-only. The typical catch is a shell still pointed at production when you meant development.

## Install

You need AWS CLI v2 on `PATH`, or its path set in config.

With Go 1.22 or newer:

```sh
go install github.com/neon1llc/aws-clip/cmd/aws-clip@latest
aws-clip doctor
```

Or download a macOS or Linux binary (arm64 or amd64) from the [latest release](https://github.com/neon1llc/aws-clip/releases/latest), check it against `checksums.txt`, and put it on your `PATH`:

```sh
sha256sum --check --ignore-missing checksums.txt   # on macOS: shasum -a 256 --check --ignore-missing checksums.txt
chmod +x aws-clip_linux_amd64 && mv aws-clip_linux_amd64 ~/.local/bin/aws-clip
aws-clip doctor
```

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

The text view shows Region, authentication path, SSO account and role when configured, selection, and protection status. It never prints access key IDs, credential-process commands, SSO start URLs, login-session names, or credential values. JSON output has `schema_version: 1` and an ordered `profiles` array, with `null` for an unavailable Region.

`aws-clip` doesn't create profiles. Create one with AWS CLI, then select it:

```sh
aws configure sso --profile development
aws-clip --profile development login
aws-clip --profile development context
```

You can also select a profile with `AWS_CLIP_PROFILE` or the configuration file. Login and guarded commands never fall back to the default profile.

## Log in and out

`login` asks STS whether the profile already has valid credentials and reuses them. Otherwise it follows the profile's metadata, including `source_profile` chains:

- IAM Identity Center profiles run `aws sso login` for the owning profile.
- AWS local login profiles run `aws login` for the owning profile.
- Role profiles use their source profile's login path.
- Configured profiles with no declared provider can bootstrap AWS local login after an identity probe fails, if your AWS CLI supports it.
- Static keys, credential processes, web identity, instance or container roles, and the default provider chain stay with their own provider.

Afterward, `aws-clip` checks STS identity again and reports the account and principal.

```sh
aws-clip --profile production login
aws-clip --profile development logout
```

Local-login logout affects only its login profile. SSO logout clears every cached SSO session, so `aws-clip` makes you approve that:

```sh
aws-clip --profile development logout --approve all-sso-sessions
```

Profiles on external or static providers have no login or logout action. The message names the provider to refresh.
