# AWS CLIP (https://neon1.tech/)

AWS CLI Plus: account guards and approval checks around the AWS CLI, for people who juggle several AWS profiles.

*Public · v0.2.1*

**AWS CLI Plus.** Account guards and approval checks around the AWS CLI, which still handles sign-in, credentials, requests, and output.

- **Available now:** the [code](https://github.com/neon1llc/aws-clip) is public under the MIT license. Install with `go install` or a macOS or Linux binary from the releases page. It's early software (v0.x), so commands and settings may change before v1.0.
- **Who it helps:** people with several AWS profiles who want to see which account they're in and confirm before anything risky runs.

## What it does

- **Shows where you are.** It reports the profile, Region, and the account and role AWS says you're signed in as, and it never prints credential values.
- **Asks before risky commands.** Before a command runs, it shows the target profile and Region, the service and operation, and how its policy rules classify it. Previews list option names and leave argument values out, because they can hold sensitive data. Anything that isn't a known read, or that returns credentials or secrets, needs your confirmation.
- **Guards production accounts.** Bind a profile to the account it must resolve to. If it resolves to a different one, the command is refused, and a confirmation can't override that.

For example, `aws-clip --profile production exec -- ec2 terminate-instances ...` shows the target and `ec2:terminate-instances`, then waits for a yes. If the profile is bound to one account and resolves to another, it stops.

## Current limits

- **AWS output isn't filtered.** What the AWS CLI prints, on screen or in logs, can contain sensitive service data. Protect it as you would plain AWS CLI output.
- **Account checks depend on how it's used.** Reviewed workflows always check your identity with AWS before the first step. A single command checks the account only when the profile is bound to an account, a policy lists allowed accounts, or you pass `--approve-account`. Otherwise it runs without that check.
- **Classification goes by operation name**, not by what an argument value would do. IAM, service control policies, and your own change process still decide what's allowed.

## Next step

Install steps and every safety limit are in the [README](https://github.com/neon1llc/aws-clip/blob/v0.2.1/README.md).
