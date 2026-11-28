# Patient intake portal (https://neon1.tech/)

Patient intake ran through a shared inbox and a slow EHR, with staff chasing documents by email.

*dermatology practice · workflows*

neon1 subcontracted engagement, 2026

**one queue** · complete and missing

| | In short |
|---|---|
| **The problem** | Intake ran through a shared inbox, with staff chasing documents by email. |
| **The work** | An AWS portal where patients upload once and staff see what's complete. |
| **The results** | Staff see what's missing without searching email. |
| **After handover** | Maintained with the partner. |

## The problem

A dermatology practice with two locations ran intake through one shared inbox. Staff downloaded, tracked, and re-uploaded each document, and anything missing started another round of emails.

## The work

I mapped the process with staff, then built a Terraform-managed serverless portal on AWS. I was the lead engineer, subcontracted to the firm that held the contract.

- Patients upload once, and each intake has one status.
- Staff see one queue of what's complete and what's missing.
- The practice's health record system stays the clinical record, and the portal doesn't depend on its vendor's interface.

## The results

Documents arrive in one place, and staff can see what's missing without searching email.

## After handover

The partner and I maintain the portal. Next is a direct interface to the record system, once its vendor enables one.
