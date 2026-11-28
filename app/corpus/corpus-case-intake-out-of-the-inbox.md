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
| **After handover** | The partner maintains it. |

## The problem

A dermatology practice with two locations ran intake through one shared inbox. Staff downloaded, tracked, and re-uploaded each document, and anything missing started another round of emails.

## The work

I mapped the process with staff, then built a Terraform-managed serverless portal on AWS. I was the lead engineer, subcontracted to the firm that held the contract.

- Patients upload once, and each intake has one status.
- Staff see one queue of what's complete and what's missing.
- The practice's health record system stays the clinical record, and the portal doesn't depend on its vendor's interface.

## The results

| Measure | Before | After |
|---|---|---|
| Median time to a complete intake | ~2.6 days | ~3.4 hours |
| Staff time per intake | ~24 min | ~8 min |
| Intakes needing a missing-document follow-up | ~34% | ~10% |

Four weeks before and after, with the same definitions. Where there was no digital record, mostly before launch, figures come from the old records and a short staff survey.

## After handover

The partner maintains the portal. Next is a direct interface to the record system, once its vendor enables one.
