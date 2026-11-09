# Two offices off local servers (https://neon1.tech/)

The app, database, and files lived on two local servers both offices relied on.

*automotive business · migration*

**2 servers · 2 offices** · no app rewrite

| | In short |
|---|---|
| **Needs** | The app, database, and files lived on two local servers both offices relied on. |
| **Execute** | Moved them to AWS with their technical lead, linked over a VPN. |
| **Observe** | Re-ran the real daily tasks from each office and reconciled every record. |
| **Normalize** | Change more only when reliability, capacity, or cost data says so. |

## Needs

An automotive business ran its application, database, and files on two local servers, and both of its locations had to keep working through any move. Their technical lead already patched and supported those servers, so he knew the environment best.

## Execute

He led the inventory and dependency discovery. I owned the AWS design, sizing, and migration plan.

- An isolated VPC built with Terraform, EC2 for the application, RDS for the database, and S3 for files that suit object storage.
- Site-to-Site VPN connects both offices, with separate access paths for the app, the database, and management.
- Sized from measured CPU, memory, database activity, and storage growth, not by copying the old hardware.
- Data was seeded ahead of time, and the final cutover kept a fallback ready until both offices signed off.

## Observe

| Check                              | Result                           |
|------------------------------------|----------------------------------|
| Daily business tasks, both offices | Passed from each location        |
| Records and files after migration  | Reconciled against the originals |
| Backup and restore                 | Tested with the technical lead   |
| Application changes needed         | None                             |

## Normalize

The technical lead runs the environment, with the architecture, access, backup, restore, and monitoring steps written down. Containers or a bigger platform come later, only if a measured reliability, capacity, or cost problem makes the case.
