# neon1.tech (https://neon1.tech/)

skip to content

neon1
(https://neon1.tech/)

- services

- process

- case studies

- projects

- about

- book a call (https://calendly.com/1isgladtobeofservice/neon1-consultation)

-
1NEON (https://neon1.tech/1NEON/)

menu

- services

- process

- case studies

- projects

- about

- questions

- contact

- 1NEON (https://neon1.tech/1NEON/)

# neon1

1 is glad to be of service.

## services

01 · for small to medium businesses

Business workflows and technology. Email, spreadsheets, POS, booking, and accounting connected, with the repetitive steps automated, so nobody retypes orders at the end of the day.

02 · for technical teams

Cloud and AI engineering. Infrastructure as code, deploy pipelines you can trust, AI assistants grounded in your own documents, and backups proven by test restores.

03 · for offices, homes, and physical spaces

Networks, devices, and spaces. Wi-Fi in every room, cameras that record when they should, devices set up properly, and smart gear on its own network.

04 · for organizations, teams, families, and individuals

Security awareness and readiness. Plain-language sessions on phishing, fraud, passwords, and data brokers, plus SOC 2 readiness for companies heading into an audit.

A free 15-minute call finds the main pain points and your options. Every option comes with an estimate before any work starts, and if a quick fix will do, I'll just tell you. Accounts and bills stay in your name.

## process

### Listen

Show me how the work gets done today. One real example is enough.

### Propose

A few options, from the quickest fix to the fuller build, each with an estimate, the effort, and what it gets you.

### Decide

You pick. Sometimes that means a new system. Often it's a setting, a cleanup, or leaving it alone.

### Build

Small changes, tested, and shown to you as they land.

### Hand over

I show you how it works and write it down, so you can run it without me. Then I check it's doing what we agreed, and keep improving it if you want ongoing care.

## case studies

From cloud systems to a grandparent's email, every one runs the same way: Needs, Execute, Observe, Normalize.

accounting firm · cloud & AI

### Answers in seconds, with sources

N
Staff spent minutes hunting through Microsoft 365, or interrupted a senior colleague.
E
An assistant on AWS Bedrock that answers only from approved documents each person may see.
O
Timed real lookups before and after, and scored 80 test questions for accuracy.
N
Next, an MCP server over the same search, so agents get answers with the same permissions.

~5 min → 14 s lookup · recall 72% → 94%

#### Needs

The firm's knowledge was spread across Microsoft 365: policies, procedure manuals, Word files, PDFs, and client documents. Staff could usually find an answer, but a routine lookup took 2 to 10 minutes, and often meant asking a senior colleague who knew where things lived. Drafts, old versions, and client-restricted files sat right next to the right answer, so a simple chatbot would have been risky.
The ask was simple: let staff ask normal questions, return the approved answer with its document, and never make the AI more authoritative than the source.

#### Execute

This was my first project with an AWS partner, Xenoss (https://xenoss.io/), who helped with design and now with maintenance. I handled ingestion, embeddings, retrieval, and answer quality.

- Only documents in approved Microsoft 365 libraries are synced into versioned, encrypted S3, keeping their source, version, and access details.
- Bedrock Knowledge Bases with Titan embeddings and OpenSearch Serverless run hybrid search, so exact accounting terms and form numbers match as well as differently worded questions.
- Each question is checked against what that person is allowed to see before anything is retrieved. Answers come only from the retrieved passages, with citations, or the assistant says it doesn't know.
- Built with Terraform and deployed through GitHub Actions, with CloudWatch tracking ingestion, retrieval, and answer time separately.

#### Observe

MeasureBeforeAfterMedian lookup, answer and source checked~4.8 min13.6 sSlowest 5% of lookupsup to 10 min~24 sRight passage found (recall at 8)72%94%Answers fully supported by their source78%92%Interruptions of senior staff per week~18~7Measured on 80 representative questions, including ones the assistant should refuse, and judged by two reviewers. A fast answer from the wrong document counted as a failure.

#### Normalize

Microsoft 365 stays the source of truth, and the search index can be rebuilt from it at any time. The firm owns which documents are approved and who can see them. Next is an MCP server in front of the same retrieval, so assistants and agents can use the firm's knowledge with the same per-person permissions, followed by narrow, reviewable agent actions where they save real time.

dermatology practice · workflows

### Intake, out of the shared inbox

N
Intake ran through one inbox, with staff chasing documents and retyping them.
E
A small AWS portal where patients upload once and staff see what&#x27;s complete.
O
Compared four weeks before and after, on the same appointment types.
N
Ongoing maintenance with Xenoss, and tuning as the practice grows.

2.6 days → 3.4 hours · 24 → 8 min staff time

#### Needs

A newly opened practice handled intake through a shared Microsoft 365 inbox, and its sister location did the same. Patients replied with forms, insurance cards, referrals, and phone photos. Staff downloaded attachments, renamed them, tracked status in Outlook flags and a spreadsheet, then uploaded each one into a slow EHR. If something was missing, another round of emails began.

#### Execute

I mapped the process with the staff using a questionnaire and conversations, separating the time patients spent waiting from the time staff spent handling documents. Then I built a Terraform-managed serverless portal, with Xenoss (https://xenoss.io/) helping on design and maintenance.

- CloudFront, WAF, and a private S3 site serve the portal. API Gateway, Cognito, and Python Lambda run the workflow.
- Every intake has one clear state in DynamoDB. Documents upload straight to an encrypted S3 vault and stay locked until a malware scan passes.
- Staff see one queue of what's complete and what's missing. Completed documents are filed into the EHR under the patient's ID and MRN, so they land in the right chart.
- Email notifications never include patient details, and access, encryption, and audit logging were decided up front.

#### Observe

MeasureBeforeAfterMedian time to a complete intake~2.6 business days~3.4 hoursStaff time per intake~24 min~8 minFinding and opening a document~2 min 18 s~12 sIntakes needing a missing-document follow-up~34%~10%Four weeks before and four weeks after, with the same definitions. At about 250 intakes a month, the time saved is roughly 67 staff hours a month.

#### Normalize

The EHR stays the clinical record. Xenoss and I maintain the portal, watch the intake measures, and tune the workflow as the practice and its sister location grow.

automotive business · migration

### Two offices off local servers

N
The app, database, and files lived on two local servers both offices relied on.
E
Moved them to AWS with their technical lead, linked over a VPN.
O
Re-ran the real daily tasks from each office and reconciled every record.
N
Change more only when reliability, capacity, or cost data says so.

2 servers · 2 offices · no app rewrite

#### Needs

An automotive business ran its application, database, and files on two local servers, and both of its locations had to keep working through any move. Their technical lead already patched and supported those servers, so he knew the environment best.

#### Execute

He led the inventory and dependency discovery. I owned the AWS design, sizing, and migration plan.

- An isolated VPC built with Terraform, EC2 for the application, RDS for the database, and S3 for files that suit object storage.
- Site-to-Site VPN connects both offices, with separate access paths for the app, the database, and management.
- Sized from measured CPU, memory, database activity, and storage growth, not by copying the old hardware.
- Data was seeded ahead of time, and the final cutover kept a fallback ready until both offices signed off.

#### Observe

CheckResultDaily business tasks, both officesPassed from each locationRecords and files after migrationReconciled against the originalsBackup and restoreTested with the technical leadApplication changes neededNone

#### Normalize

The technical lead runs the environment, with the architecture, access, backup, restore, and monitoring steps written down. Containers or a bigger platform come later, only if a measured reliability, capacity, or cost problem makes the case.

schools, families, & teams · security

### Security for non-security people

N
People knew they were exposed online, but not where to start.
E
Plain-language sessions on networks, cameras, devices, fraud, and data brokers.
O
Live checkups during sessions, and the questions people brought back later.
N
Stay current with neon1-ready and other sources as threats change.

30+ people per seminar · every level

#### Needs

Teachers, parents, engineers, and executives all had the same worry: they knew their accounts, homes, and businesses were exposed, but security advice was either too technical or too vague to act on.

#### Execute

I've run sessions at every level, from small groups of parents to cross-team seminars in Manhattan for 30 or more people. Topics include:

- Securing home and business networks, cameras, and connected devices.
- Fraud, phishing, data brokers, and what's sold on the dark web.
- Software and account hygiene, including password managers and two-factor sign-in.
- The security of physical spaces, not just screens.
Each session is built around what that audience actually uses, with time to work through real settings together.

#### Observe

The most useful measure has been what people do afterward: turning on two-factor sign-in during the session, changing default camera and router passwords, and coming back with specific questions about their own setups.

#### Normalize

The landscape keeps moving, so the material does too. neon1-ready, neon1's security readiness guide, tracks what's worth doing for each kind of space, alongside other trusted sources. Companies heading into an audit get SOC 2 and other readiness work.

family & friends · home tech

### From cameras to Grandma&#x27;s email

N
A house with no cameras, and passwords reused everywhere.
E
A camera system at my parents&#x27; house, and a password manager for the family.
O
Checked that recordings, alerts, and logins all work without me there.
N
Advice, tech support, and on-demand troubleshooting when something acts up.

small jobs welcome · patience included

#### Needs

Not every job is a cloud migration. My parents' house had no camera coverage, and like most families, we reused a handful of passwords across everything.

#### Execute

- Planned camera placement around the entrances and blind spots, then installed and configured the system, including recording and alerts.
- Moved the family onto a password manager, one person at a time, and turned on two-factor sign-in for the accounts that matter most.

#### Observe

The test was simple: could everyone use it without calling me? Recordings and alerts work, and everyone can sign in and find their passwords on their own.

#### Normalize

Ongoing advice, tech support, and on-demand troubleshooting when something acts up, with the same patience for every small job, whether it's Wi-Fi that doesn't reach a room, a new laptop, or helping a grandparent open their email.

grade school · community

### Where neon1 started

N
A grade school wanted real STEM tools on a small budget.
E
Budgeted and set up a new STEM edtech system, free of charge.
O
Watched how teachers and students used it, and adjusted.
N
Free security sessions for teachers and parents, which became neon1.

free for the school · where it began

#### Needs

I'd wanted to put my experience to work in my own community for a long time. A local grade school needed a STEM edtech setup that would actually get used, on a budget that couldn't afford mistakes.

#### Execute

I budgeted the new system, compared the realistic options, and set it up for the classrooms, all as volunteer work. Along the way, I invited teachers and parents to free sessions on staying safe online.

#### Observe

Seeing teachers use it in class, and parents leave those sessions knowing a little more and worrying a little less, showed me the same help was worth offering more widely.

#### Normalize

That's how neon1 began. Community and nonprofit work is still part of it, so if your school or organization needs a hand, reach out.

←→

## projects

### AWS CLIP

public · pre-release

AWS CLI Plus. A wrapper around the AWS CLI that checks which account you're in, explains what a command will do before it runs, and hides secrets in its output.

(https://github.com/neon1llc/aws-clip)

### DeployOps

private · pre-release · v0.42.0

Cloud automation, bundled. Pipelines for infrastructure and applications on AWS, Azure, Google Cloud, or several at once. It sets up CI/CD for one repo or many, works with the IaC you already use, and adds checks, approvals, rollback, monitoring, and alerts where your team will see them.

### neon1 Ready

private · pre-release

Security readiness for every space. Plain-language guidance for a phone, a home network, a classroom, a small office, or a company heading into SOC 2: five things worth doing first, then what's next.

## about

Hey, Pradeep (https://www.linkedin.com/in/pradeep-tathineni/) here. Technology and automation have held my interest for close to 15 years, at home and at work. neon1 is how I put that to work for the people and places around me, with one goal: leave people better off with their tech than they were before.

That comes down to a few habits. Listen before building anything. Leave you knowing your options, even if that's all you need from me. Keep it as simple as the problem allows. Make sure you own your accounts, your data, and the docs to run it. Be clear about what things cost and why. Plan for things to break, and check that the work actually does what it should.

The name nods to Neo from The Matrix, who brought peace between man and machine, and the slogan to Robin Williams' Andrew from Bicentennial Man, a machine who spends two centuries being of service while searching for his humanity.

Neo means new. Neon is unmissable. 1 is glad to be of service.

## questions

Do you come on site?
Yes. I also work remotely, or on your own network through a secure connection that I set up for the job and that's removed when it's done.

When do you work?
Saturdays and Sundays from 8am to 8pm, and weekday evenings from 6pm (until 9pm Monday to Thursday, 8pm on Friday), Eastern time, typically with 10 to 20 hours a week for project work. The booking calendar shows what's open.

How long does a project take?
Small jobs take a week or two, medium ones two to four weeks, and bigger projects four to six. I take on up to two clients at a time so each one gets proper attention.

How is the cost worked out?
After the first call I send a short proposal with options, usually a quick fix, a solid setup, and a fuller build. Each comes with a cost estimate and says what it covers, how much effort and engineering it takes, and what quality to expect. You pick the one that fits, and if the scope or the work changes along the way, I'll tell you before it changes the cost.

How do you treat our data and accounts?
Before any work starts we sign a short agreement on the scope and on how I'll handle your systems and information: only the access the job needs, kept confidential, and handed back or removed when we're done. It works both ways, so you'll know what I need from you and why. If the work touches personal or health data, the right agreement, such as a Business Associate Agreement, comes first.

Do you run security training?
Yes, for anyone from parents and teachers to engineers and executives. I cover home and business networks, cameras and IoT, accounts and passwords, and the security of physical spaces. I also cover privacy policies and terms, how personal data is handled, security frameworks and administration, and incident prevention, monitoring, and response. And the threats people run into most: phishing, fraud, data brokers, and the dark web.

What don't you do?
I don't repair electronics, though I can debug software and hardware installs and get them working together. I don't handle personal or health data without the right agreements in place, such as a Business Associate Agreement, but I can help you get them. I'm not a lawyer, but I'll work alongside yours on the technical side.

## contact

Tell me what's on your mind, or ask for an opinion on how your operations run today. Send me an email (mailto:hello@neon1.tech), call or text (424) 32-neon1 (tel:+14243263661), or pick a time on my calendar below. Let's get started.

book a call (https://calendly.com/1isgladtobeofservice/neon1-consultation)

neon1

1 is glad to be of service.

### contact

- book a call (https://calendly.com/1isgladtobeofservice/neon1-consultation)

- email (mailto:hello@neon1.tech)

- linkedin (https://www.linkedin.com/in/pradeep-tathineni/)

- (424) 32-neon1 (tel:+14243263661)

### elsewhere

- github (https://github.com/neon1llc)

- neon1 on linkedin (https://www.linkedin.com/company/neon1llc)

© NEON1 LLC, New York

privacy (https://neon1.tech/1NEON/privacy)\
browser storage (https://neon1.tech/1NEON/cookies)\
terms (https://neon1.tech/1NEON/terms)\
No ads or trackers\
v0.23.0 (https://github.com/neon1llc/neon1-site)

grid
text
pause

go touch grass
