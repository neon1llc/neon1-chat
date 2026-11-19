# Patient intake portal (https://neon1.tech/)

Patient intake ran through a shared inbox and a slow EHR, with staff chasing documents by email.

*dermatology practice · workflows*

neon1 subcontracted engagement, 2026

**2.6 days → 3.4 hours** · 24 → 8 min staff time

| | In short |
|---|---|
| **The problem** | Intake ran through a shared inbox, with staff chasing documents by email. |
| **The work** | An AWS portal where patients upload once and staff see what's complete. |
| **The results** | Compared four weeks before and after. |
| **After handover** | Maintained with Xenoss, and an EHR interface when the vendor allows it. |

## The problem

A new practice and its sister location ran intake through a shared Microsoft 365 inbox. Patients sent forms, insurance cards, referrals, and phone photos. Staff downloaded, renamed, and tracked them in Outlook flags and a spreadsheet, then uploaded each into a slow EHR. Anything missing started another round of emails.

## The work

I mapped the process with staff, separating patient waiting time from staff handling time, then built a Terraform-managed serverless portal. [Xenoss](https://xenoss.io) held the contract, brought me in as a subcontractor, and helped on design and maintenance.

- CloudFront, WAF, and a private S3 site serve the portal. API Gateway, Cognito, and Python Lambda run the workflow.
- Each intake has one state in DynamoDB. Documents upload to an encrypted S3 vault, locked until a malware scan passes.
- Staff see one queue of what's complete and missing, and link each intake to the patient's EHR record by ID and MRN. The EHR vendor's interface wasn't available, so the portal was built not to depend on it.
- Emails never include patient details, and access, encryption, and audit logging were set up front.

## The results

| Measure                                      | Before             | After      |
|----------------------------------------------|--------------------|------------|
| Median time to a complete intake             | ~2.6 business days | ~3.4 hours |
| Staff time per intake                        | ~24 min            | ~8 min     |
| Finding and opening a document               | ~2 min 18 s        | ~12 s      |
| Intakes needing a missing-document follow-up | ~34%               | ~10%       |

Four weeks before and after, same definitions. At about 250 intakes a month, that's roughly 67 staff hours saved. Time to a complete intake was timed from record timestamps, before and after launch: from the patient's most recent call, email, or other contact with the practice to when their appointment was scheduled. The portal records when each intake starts and when it's complete, as metrics only, with no patient details. The practice keeps them for its own dashboards and emails, and can turn them off. Before launch, staff time per intake was worked out by hand from the old records, from first call or email to the appointment being set, and checked against a short staff survey.

## After handover

The EHR stays the clinical record. Xenoss and I maintain the portal, watch the measures, and tune it as both locations grow. Next is a direct EHR interface, once the vendor enables one and the volume justifies it.
