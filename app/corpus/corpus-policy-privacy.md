# Privacy and data policy (https://neon1.tech/1NEON/privacy)

What neon1 collects on neon1.tech, in Neo, in the 1NEON portal, and in client work, where it goes, how long it's kept, and what you can do about it.

*Last updated November 15, 2026.* This edition brings everything about your data into one policy. It adds what was missing: the contact form, online payments through Stripe, scanning of uploaded files, what a signature records, how long server logs are kept, the private test environment, downloading your data, and what I do with information on your own systems during a project. It changes no retention period and adds no new use of your information.

neon1 LLC ("neon1", "I", "me") runs the website neon1.tech, Neo (the assistant on the website), and the 1NEON client portal at neon1.tech/1NEON, and does technology work for clients. This policy covers all of them. The [cookie and browser storage notice](https://neon1.tech/1NEON/cookies) is part of it and lists every cookie and saved item in detail. How the systems themselves are built is described in [How neon1 is built](https://neon1.tech/knowledge/company/architecture/).

## The short version

- The website has no analytics, ads, or trackers, and sets no cookies.
- I collect only what's needed to answer you, run your projects, and get paid, and I never sell, rent, or advertise with it.
- Your projects and files are never deleted on a schedule. They're deleted when your organization asks.
- Tests and development never use your information. They run on made-up data.
- Payment card and bank details go to Stripe, not to me.
- You can download your organization's data at any time, and ask me to correct or delete it.

## What I collect, and why

### The website

There are no accounts, analytics, or tracking on neon1.tech. Like any website, the servers that deliver it (Amazon CloudFront) handle your IP address and browser details to send you the pages, and Amazon may keep them briefly for security and operations. I don't turn on access logs for the website. Your browser saves the rain display settings you pick, on your device only.

### The contact form and email

When you send the contact form, your name, email address, organization, and message are emailed to my inbox (hello@neon1.tech) through Amazon's email service, with your address set as the one I reply to. The form doesn't save your message anywhere else. To stop floods of messages, it counts how many arrive from each sender using a one-way code made from the IP address, not the address itself. The counter holds only that code and a count, and is deleted a day after its first count.

Emails you send me, through the form or directly, are kept in my business email (Google Workspace) as correspondence, for as long as they're useful for our work together or the law requires. You can ask me to delete them.

### Booking a call

If you book a call through Calendly, Calendly collects your name, email address, and anything you add, and sends them to me. Calendly handles the booking under [its own privacy policy](https://calendly.com/legal/privacy-notice). The booking also appears in my calendar.

### Neo, the assistant on the website

Neo answers from neon1's public pages, using a model (Qwen3 Next 80B) that Amazon runs in its Bedrock service in AWS's US East (N. Virginia) region.

- Neo's service doesn't store the text of your questions or its answers. Its logs hold only details such as timing, length, and errors, and are deleted after 14 days.
- Bedrock's own logging of questions and answers is turned off in my AWS account.
- To notice the same question sent over and over, Neo keeps a one-way fingerprint of it for ten minutes. Its question limits count visitors by a one-way code, not by IP address.
- Amazon says Bedrock doesn't use prompts or answers to train models, and that depending on the model and account settings it may keep them for abuse detection. [Amazon's Bedrock documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html) has the details.

Please don't type anything sensitive into Neo.

### The 1NEON portal

The portal is available only to people invited by me or by an administrator of their organization. It holds:

- **Account details:** your email address, and optionally your name, job title, phone number, and profile photo.
- **Sign-in data:** your sign-in methods (an emailed code or a passkey, with an authenticator app as an optional second step; there's no password) and security events, such as sign-in times, the IP address and browser used, and when a sign-in method was added or removed. Passkeys and email codes are handled by Amazon Cognito.
- **Authenticator app key:** if you set up an authenticator app, the portal creates the app's secret key and keeps it, encrypted, so it can check your 6-digit codes. Only the portal's server reads it, you see it once during setup, and it's deleted when you remove the app. An unfinished setup is discarded after 10 minutes.
- **Project content:** what you and your colleagues add, such as requirements, decisions, tasks, metrics, comments, and files. Every uploaded file is scanned for malware (Amazon GuardDuty) before anyone can download it, and a file that fails the scan is blocked.
- **Signatures:** when you sign the service agreement, approve an option, or accept a handover, the portal records your name, email address, the time, your IP address and browser, and a fingerprint of exactly what you signed, so either of us can later show what was agreed.
- **Invoices and payments:** invoices name your organization and the person they're billed to. When you pay online, you enter your card or bank details on Stripe's own payment page. I never see or store them. Stripe receives the amount, the invoice number, a short description naming your organization and project, and your email address, and tells the portal whether the payment succeeded. Payments by check or transfer are recorded by hand.
- **Activity records:** who changed what and when, kept as an audit trail so both sides have a reliable history of the work.

**Emails and texts.** The portal emails you what you need (invitations, sign-in codes, security notices, and invoices) and notices about the kinds of changes you choose, each of which you can turn off in your profile. If you add a mobile number and agree to texts, 1NEON first texts a 6-digit code to confirm the number is yours (only a one-way code of it is stored, and it expires in 10 minutes). After that, it texts you about the kinds of changes you choose. Each text says only that something new is waiting, with a link to sign in; it doesn't name your organization, project, or files. Changing your number turns texts off until the new number is confirmed. Message frequency varies with your projects, up to 10 notices a day. Message and data rates may apply. Reply STOP to any text to opt out, or HELP for help, and you can turn texts off in your profile at any time. A STOP reply is recorded on your profile, and turning texts back on needs a new code. Your number and your agreement are used only to send these notices. I never sell or share mobile numbers or text consent with third parties or affiliates for their marketing.

**Neo inside the portal.** A signed-in version of Neo can help inside 1NEON, but it's turned off today. If I turn it on, I'll update this policy first. When it's on and you ask it a question, it sends your question and what it reads in 1NEON as you, such as the projects, items, options, file names, and comments you can already see, to an Anthropic model that Amazon runs in Bedrock in the United States, so it can answer. It sends nothing about organizations you can't see, nothing when you aren't asking, and it can't change anything until you approve it.

Please don't put passwords, keys, or other secrets in the portal.

### Work on your own systems

Much of my work happens in your accounts and systems rather than in 1NEON. There:

- I use named accounts with the least access the job needs, and I remove my access at handover and check that it's gone.
- I look at your information only as far as the work needs, and I don't copy it to my own systems unless the work requires it and you agree. Anything I do copy is deleted when the project ends, unless you ask me to keep it.
- Your confidential information doesn't go into an AI service unless you've approved that service in writing, as [How I use AI](https://neon1.tech/knowledge/policies/ai-use/) explains.
- Real client information never appears in a demo, a public post, or a code issue.

### Regulated data

The portal and my standard services aren't designed for health records, payment card data, or similar regulated personal data. I won't take on work involving such data until the right agreement is signed first, such as a [business associate agreement](https://neon1.tech/knowledge/templates/business-associate-agreement/) for health information.

## How I use it

- To answer you, and to communicate about the work we're doing together.
- To provide the portal: signing you in, showing your organization's projects, sending the emails and texts above, and issuing and collecting invoices.
- To keep everything secure: detecting misuse, investigating problems, and keeping an audit trail.
- To meet legal, tax, and accounting obligations.

I don't use your information for marketing or advertising, I don't use it to train AI models, and I don't use automated decision-making that affects you.

## Tests and development use made-up data

I try every change on a private test copy of the website and portal (dev.neon1.tech) before it reaches you. Only I can reach it, through its own sign-in, separate from the real portal's. It holds generated, fictional data only, and I never copy real client information, accounts, or files into it. Mail it sends goes only to neon1's own addresses and says it came from the test copy. The same rule applies when I work on my own computer.

The public [interactive demo](https://neon1.tech/1NEON/demo) and [guided walkthrough](https://neon1.tech/1NEON/live) also use fictional data and run entirely in your browser.

## Who else handles it

I use a small number of service providers, all based in the United States, each only for the purpose listed.

| Provider | What it does for neon1 | What it receives |
|---|---|---|
| Amazon Web Services | Hosts the website, the portal, and Neo; stores portal data and files; scans uploads; handles sign-in; sends emails and texts; runs Neo's models (Amazon Bedrock) | Everything in the portal, website requests, contact form messages on their way to me, and questions sent to Neo |
| Stripe | Takes online payments | Your payment details, which you enter on Stripe's page, plus the amount, invoice number, a short description, and your email address |
| Google (Google Workspace) | My business email and calendar | Emails you send me, contact form messages, and bookings |
| Calendly | Booking calls from the website | What you enter when you book |

I disclose information only to these providers, when the law requires it, or to protect the rights and safety of people using neon1's services. If I add a provider that receives your information, I'll update this list first.

## Where it's stored and how it's protected

Portal data and files are stored on AWS in its US East (N. Virginia) region, encrypted in transit and at rest. Each organization's data is kept separate from every other organization's, and the server checks every request against the person's access. My own administrative access uses multi-factor sign-in, and keys and passwords are kept in a secure store, never in code. No security is perfect, so I keep backups and an audit trail, and I test that one organization can't reach another's data.

## How long I keep it

Your projects and files are never deleted on a schedule. The table lists everything else.

| Information | How long it's kept |
|---|---|
| Projects, items, comments, and uploaded files | Until your organization asks me to delete them, including after our work ends, so either of us can refer back to them |
| Projects moved to the trash | Hidden from everyone but kept, and erased if your organization asks |
| Files you delete | Removed right away; earlier copies of deleted or replaced files are erased after 90 days |
| Database backups | 35 days, then they roll off |
| Signatures, issued invoices, and payments | Write-protected for seven years from the day they're made, because tax and contract law expect those records kept. Only an administrator with a special permission can shorten that |
| Audit records of sign-ins and changes | Up to 3 years, then deleted |
| Records that an email or text was delivered, or failed | 30 days |
| Portal server logs (request time, route, IP address, status, and errors, never what you sent) | 90 days |
| Neo's logs (timing, length, and errors, never the text) | 14 days |
| Contact form counters | A day after their first count |
| Neo's question fingerprints | Ten minutes |
| Emails and contact form messages | As correspondence, while useful for our work or required by law, or until you ask me to delete them |
| Information copied from your systems for a project | Deleted when the project ends, unless you ask me to keep it |

## Getting a copy of your data

An administrator of your organization can download all of its data at any time from Settings, with **Download everything**: a zip of every project, item, file, member, decision, invoice, and payment, with a list of what's inside. You can also ask me for a copy of your own information, or your organization's, in a common format.

## Deleting your data

Your organization can ask me to delete its data, or you can ask me to delete your account, at any time. I'll delete it from the portal, and backups and earlier file copies age out within 35 and 90 days. Signatures, issued invoices, and payments stay write-protected until their seven years end, and so does anything else the law requires me to keep. I'll tell you in writing what was deleted, what remains, and when each remaining record expires.

## If something goes wrong

If I learn that someone got to your information who shouldn't have, I'll tell you promptly, say what happened and what I'm doing about it, and give any notice the law requires. How I handle security reports is in the [security disclosure policy](https://neon1.tech/knowledge/policies/security/).

## Your choices and rights

You can view and update your profile at any time in the portal. You can also ask me to:

- give you a copy of your information, or your organization's data;
- correct or delete your information; or
- stop sending you non-essential emails or texts.

Your organization's administrator controls who can access its workspace. If a request concerns your organization's project content, I may need to involve that administrator. I'll respond within 30 days. Depending on where you live, you may have more rights under laws such as the GDPR or state privacy laws, and you can complain to your local data protection authority.

## Cookies and browser storage

The website sets no cookies. The portal uses only the cookies it needs to sign you in and keep you signed in, so it shows no consent banner. A few settings are saved in your browser, on your device only. The [cookie and browser storage notice](https://neon1.tech/1NEON/cookies) lists each one and how long it lasts. If I ever add optional cookies or storage, such as analytics, I'll ask for your consent first.

## Children

neon1's services are for adults and businesses. I don't knowingly collect information from children under 13.

## Changes

When I change this policy, I update the date and say what changed at the top. If a change matters, such as a new use of your information or a new provider, I'll tell portal users by email before it takes effect.

## Contact

neon1 LLC, 418 Broadway, Ste R, Albany, NY 12207 · [privacy@neon1.tech](mailto:privacy@neon1.tech)
