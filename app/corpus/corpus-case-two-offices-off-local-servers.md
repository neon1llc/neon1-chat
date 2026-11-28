# Two-site server migration (https://neon1.tech/)

The app, database, and files lived on two local servers both offices used.

*automotive business · migration*

neon1 engagement, 2025

**2 servers · 2 offices** · no app rewrite

| | In short |
|---|---|
| **The problem** | The app, database, and files lived on two local servers both offices used. |
| **The work** | Moved them to AWS with their technical lead, linked over a VPN. |
| **The results** | Both offices moved without an application rewrite. |
| **After handover** | Their technical lead runs it. |

## The problem

An automotive business ran its application, database, and files on two local servers shared by both offices, and both had to keep working through the move. Their technical lead knew the servers best.

## The work

He led the inventory and dependency discovery. I owned the AWS design, sizing, and migration plan.

- A private AWS network built with Terraform, with the application, database, and files each on a service that suits them.
- A site-to-site VPN connects both offices.
- Sizing came from measured use, not the old hardware.
- Data was moved ahead of the cutover, with a way back until both offices signed off.

## The results

Both offices moved to AWS without an application rewrite.

## After handover

The technical lead runs it, with the architecture and operating steps written down. Bigger changes come only if reliability, capacity, or cost makes the case.
