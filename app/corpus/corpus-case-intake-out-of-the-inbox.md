# Intake, out of the shared inbox (https://neon1.tech/)

Intake ran through one inbox, with staff chasing documents and retyping them.

*dermatology practice · workflows*

**2.6 days → 3.4 hours** · 24 → 8 min staff time

| | In short |
|---|---|
| **Needs** | Intake ran through one inbox, with staff chasing documents and retyping them. |
| **Execute** | A small AWS portal where patients upload once and staff see what's complete. |
| **Observe** | Compared four weeks before and after, on the same appointment types. |
| **Normalize** | Ongoing maintenance with Xenoss, and tuning as the practice grows. |

## Needs

A newly opened practice handled intake through a shared Microsoft 365 inbox, and its sister location did the same. Patients replied with forms, insurance cards, referrals, and phone photos. Staff downloaded attachments, renamed them, tracked status in Outlook flags and a spreadsheet, then uploaded each one into a slow EHR. If something was missing, another round of emails began.

## Execute

I mapped the process with the staff using a questionnaire and conversations, separating the time patients spent waiting from the time staff spent handling documents. Then I built a Terraform-managed serverless portal, with [Xenoss](https://xenoss.io) helping on design and maintenance.

- CloudFront, WAF, and a private S3 site serve the portal. API Gateway, Cognito, and Python Lambda run the workflow.
- Every intake has one clear state in DynamoDB. Documents upload straight to an encrypted S3 vault and stay locked until a malware scan passes.
- Staff see one queue of what's complete and what's missing. Completed documents are filed into the EHR under the patient's ID and MRN, so they land in the right chart.
- Email notifications never include patient details, and access, encryption, and audit logging were decided up front.

## Observe

| Measure                                      | Before             | After      |
|----------------------------------------------|--------------------|------------|
| Median time to a complete intake             | ~2.6 business days | ~3.4 hours |
| Staff time per intake                        | ~24 min            | ~8 min     |
| Finding and opening a document               | ~2 min 18 s        | ~12 s      |
| Intakes needing a missing-document follow-up | ~34%               | ~10%       |

Four weeks before and four weeks after, with the same definitions. At about 250 intakes a month, the time saved is roughly 67 staff hours a month.

## Normalize

The EHR stays the clinical record. Xenoss and I maintain the portal, watch the intake measures, and tune the workflow as the practice and its sister location grow.
