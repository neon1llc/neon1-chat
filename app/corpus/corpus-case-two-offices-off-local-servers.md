# Two offices off local servers (https://neon1.tech/)

The app, database, and files lived on two local servers both offices used.

*automotive business · migration*

**2 servers · 2 offices** · no app rewrite

| | In short |
|---|---|
| **The problem** | The app, database, and files lived on two local servers both offices used. |
| **The work** | Moved them to AWS with their technical lead, linked over a VPN. |
| **The results** | Re-ran daily tasks from each office and reconciled every record. |
| **After handover** | Change more only when the data says so. |

## The problem

An automotive business ran its application, database, and files on two local servers, and both locations had to keep working through the move. Their technical lead supported those servers and knew them best.

## The work

He led the inventory and dependency discovery. I owned the AWS design, sizing, and migration plan.

- An isolated VPC built with Terraform, EC2 for the application, RDS for the database, and S3 for files that suit object storage.
- Site-to-Site VPN connects both offices, with separate access paths for the app, the database, and management.
- Sized from measured CPU, memory, database, and storage use, not the old hardware.
- Data was seeded ahead, and the cutover kept a fallback until both offices signed off.

## The results

| Check                              | Result                           |
|------------------------------------|----------------------------------|
| Daily business tasks, both offices | Passed from each location        |
| Records and files after migration  | Reconciled against the originals |
| Backup and restore                 | Tested with the technical lead   |
| Application changes needed         | None                             |

## After handover

The technical lead runs it, with architecture, access, backup, restore, and monitoring written down. Containers or a bigger platform come only if measured reliability, capacity, or cost makes the case.
