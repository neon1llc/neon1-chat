# Intake, out of the shared inbox (https://neon1.tech/)

Intake ran through one inbox, with staff chasing and retyping documents.

*dermatology practice · workflows*

**2.6 days → 3.4 hours** · 24 → 8 min staff time

| | In short |
|---|---|
| **The problem** | Intake ran through one inbox, with staff chasing and retyping documents. |
| **The work** | An AWS portal where patients upload once and staff see what's complete. |
| **The results** | Compared four weeks before and after. |
| **After handover** | Maintained with Xenoss, tuned as the practice grows. |

## The problem

A new practice and its sister location ran intake through a shared Microsoft 365 inbox. Patients sent forms, insurance cards, referrals, and phone photos. Staff downloaded, renamed, and tracked them in Outlook flags and a spreadsheet, then uploaded each into a slow EHR. Anything missing started another round of emails.

## The work

I mapped the process with staff, separating patient waiting time from staff handling time, then built a Terraform-managed serverless portal, with [Xenoss](https://xenoss.io) helping on design and maintenance.

- CloudFront, WAF, and a private S3 site serve the portal. API Gateway, Cognito, and Python Lambda run the workflow.
- Each intake has one state in DynamoDB. Documents upload to an encrypted S3 vault, locked until a malware scan passes.
- Staff see one queue of what's complete and missing. Completed documents file into the EHR by patient ID and MRN.
- Emails never include patient details, and access, encryption, and audit logging were set up front.

## The results

| Measure                                      | Before             | After      |
|----------------------------------------------|--------------------|------------|
| Median time to a complete intake             | ~2.6 business days | ~3.4 hours |
| Staff time per intake                        | ~24 min            | ~8 min     |
| Finding and opening a document               | ~2 min 18 s        | ~12 s      |
| Intakes needing a missing-document follow-up | ~34%               | ~10%       |

Four weeks before and after, same definitions. At about 250 intakes a month, that's roughly 67 staff hours saved.

## After handover

The EHR stays the clinical record. Xenoss and I maintain the portal, watch the measures, and tune it as both locations grow.
