# AWS CLIP (https://neon1.tech/)

AWS CLI Plus: account guards and approval checks around the AWS CLI, for people who juggle several AWS profiles.

*Public · pre-release*

**AWS CLI Plus.** Account guards and approval checks around the AWS CLI. It doesn't replace the AWS CLI, which still handles sign-in, credentials, requests, and output.

- **Available now:** the code is public and runs from source. It's pre-release, so commands and settings may still change.
- **Who it helps:** people who work across several AWS profiles and want to see which account they're in, and confirm before anything risky runs.

## What it does

- **Shows where you are.** It reports the profile, Region, and the account and role AWS says you're signed in as, and it never prints credential values.
- **Asks before risky commands.** Before a command runs, it shows the target profile and Region, the service and operation, and how its policy rules classify it. It doesn't explain every argument: its own previews and plans list option names and leave argument values out, because they can hold sensitive data. Anything that isn't a known read, or that returns credentials or secrets, needs your confirmation.
- **Guards production accounts.** A profile can be bound to the account it must resolve to. If it resolves to a different account, the command is refused, and a confirmation can't override that.

For example, `aws-clip --profile production exec -- ec2 terminate-instances ...` shows the target and `ec2:terminate-instances`, then waits for a yes. If the production profile is bound to an account and resolves to another one, it stops.

## Current limits

- **AWS output isn't filtered.** What the AWS CLI prints, on screen or in logs, can contain sensitive service data. Protect it as you would plain AWS CLI output.
- **Account checks depend on how it's used.** Reviewed workflows always check your identity with AWS before the first step. A single command checks the account only when the profile is bound to an account, a policy lists allowed accounts, or you pass `--approve-account`. Otherwise it runs without that check.
- **Classification goes by operation name**, not by what an argument value would do. IAM, service control policies, and your own change process still decide what's allowed.

## Next step

Read the [README](https://github.com/neon1llc/aws-clip/blob/c90f092292cd2dd60be89ea906777c667666b4c5/README.md) for install steps and the full list of safety limits, or browse the code at [neon1llc/aws-clip](https://github.com/neon1llc/aws-clip).
