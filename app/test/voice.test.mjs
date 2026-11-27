// app/test/voice.test.mjs - neon1's voice in replies: neon1 or Pradeep for the work, no invented clients.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureHuman, guardClaims, neon1Voice, publishedPercents } from "../src/chat.mjs";

test("rewrites first person about neon1's work", () => {
  assert.equal(neon1Voice("Yes, I can help. I’ve set up workflows like this."), "Yes, neon1 can help. neon1 has set up workflows like this.");
  assert.equal(neon1Voice("I help small businesses connect tools. I'll suggest the simplest fix."), "neon1 helps small businesses connect tools. Pradeep will suggest the simplest fix.");
  assert.equal(neon1Voice("Your team can run it without me."), "Your team can run it without Pradeep.");
  assert.equal(neon1Voice("I don\u2019t repair hardware. I can work on-site in Brooklyn."), "neon1 doesn't repair hardware. Pradeep can work on-site in Brooklyn.");
});

test("leaves Neo speaking for itself alone", () => {
  const t = "I can't see the calendar. Tell me which software you use and I can say how it usually connects.";
  assert.equal(neon1Voice(t), t);
});

test("drops sentences claiming work for a kind of client", () => {
  assert.equal(
    neon1Voice("A workflow project usually takes 2 to 4 weeks. neon1 has set up similar workflows for small businesses, including bakeries. Email hello@neon1.tech."),
    "A workflow project usually takes 2 to 4 weeks. Email hello@neon1.tech.",
  );
  assert.equal(neon1Voice("I've helped clients automate intake from Google Forms. It's general."), "It's general.");
  const caseStudy = "neon1 moved two offices off local servers to AWS, as one case study describes.";
  assert.equal(neon1Voice(caseStudy), caseStudy);
});

test("keeps a reply that would otherwise be empty", () => {
  const only = "neon1 has set up similar systems for restaurants.";
  assert.equal(neon1Voice(only), only);
});

test("rewrites the first person the model still uses: I'd, us, my, Spanish, French, and Chinese", () => {
  assert.equal(neon1Voice("I’d start by checking which rooms drop signal."), "Pradeep would start by checking which rooms drop signal.");
  assert.equal(neon1Voice("so you can run it without us."), "so you can run it without Pradeep.");
  assert.equal(neon1Voice("That's within my scope, and the proposal comes after we talk."), "That's within neon1's scope, and the proposal comes after you talk with Pradeep.");
  assert.equal(neon1Voice("Sí, puedo ayudarte con eso."), "Sí, neon1 puede ayudarte con eso.");
  assert.equal(neon1Voice("Oui, je peux vous aider."), "Oui, neon1 peut vous aider.");
  assert.equal(neon1Voice("我们不修理硬件。我可以帮您连接收银系统。"), "neon1 不修理硬件。neon1 可以帮您连接收银系统。");
});

test("leaves Neo's own first person alone in other languages", () => {
  const zh = "如果您告诉我是哪个收银系统，我可以说明它通常如何与其他工具连接。";
  assert.equal(neon1Voice(zh), zh);
  const es = "No puedo ver el calendario.";
  assert.equal(neon1Voice(es), es);
});


// Claims the prompt rules haven't held, guarded in code

test("guardClaims drops an unstated neon1 practice and keeps the general answer", () => {
  const t = "MFA adds a second step. Your staff should use it.\n\nneon1 has set up MFA as a standard for all client systems it works with, because it's simple. Start with email.";
  assert.equal(guardClaims(t, "What is MFA?"), "MFA adds a second step. Your staff should use it.\n\nStart with email.");
  assert.equal(guardClaims("neon1 requires MFA for all systems it accesses. It helps.", ""), "It helps.");
  const sourced = "Every option in a neon1 proposal includes multi-factor sign-in.";
  assert.equal(guardClaims(sourced, ""), sourced);
});

test("guardClaims turns a decided law into a pointer to a professional", () => {
  const t = "Generally, if you bill insurance electronically, you are likely a covered entity under HIPAA and must comply with its rules. It covers claims.";
  assert.equal(
    guardClaims(t, "Do I need HIPAA?"),
    "HIPAA usually applies to healthcare providers who bill insurance or send health information electronically, but whether it applies to your office depends on your situation, and a lawyer or compliance advisor can confirm it. It covers claims.",
  );
  assert.match(guardClaims("You must comply with PCI rules.", "Do I need PCI?"), /^Whether it applies to you depends/);
});

test("guardClaims says neon1 has no emergency response on an incident, before the contact line", () => {
  const t = "- Disconnect the device.\n\nEmail hello@neon1.tech or book the free call.";
  const out = guardClaims(t, "Someone clicked a link in a phishing email.");
  assert.match(out, /no emergency response[^]*hello@neon1\.tech/);
  const said = "neon1 has no emergency response. Disconnect the device.";
  assert.equal(guardClaims(said, "We got hacked"), said);
});

test("ensureHuman offers Pradeep when a visitor asks for help and the reply offers work, in their language", () => {
  const es = ensureHuman("Sí, neon1 puede ayudarte. Suele costar entre $1,000 y $3,000.", "¿Pueden ayudarme? Tengo una tienda.");
  assert.match(es, /Pradeep puede ayudarte directamente: escribe a \[hello@neon1\.tech\]/);
  assert.equal(ensureHuman("neon1 can help with that.", "What do you do?"), "neon1 can help with that.");
  assert.match(ensureHuman("neon1 can set that up.", "Can you connect Square to QuickBooks?"), /book the free 30-minute call/);
});

test("drops outcome percentages and borrowed client claims, and rewrites more first person", () => {
  assert.equal(neon1Voice("Turn off idle servers. neon1 has helped small businesses review AWS, often reducing bills by 30% to 60%. Email us."), "Turn off idle servers. Email us.");
  assert.equal(neon1Voice("I can help connect it, just like neon1 has done for other small businesses. What do you use?"), "neon1 can help connect it. What do you use?");
  assert.equal(neon1Voice("I work with Microsoft 365. I take on two clients at a time."), "neon1 works with Microsoft 365. neon1 takes on two clients at a time.");
});

test("guardClaims names a fitting case study once", () => {
  const out = guardClaims("Cloud storage helps.\n\nEmail hello@neon1.tech.", "Should we move our file server to the cloud?");
  assert.match(out, /Two-site server migration \(a neon1 engagement, 2025\)[^]*hello@neon1\.tech/);
  const has = "The two-site migration case study fits.";
  assert.equal(guardClaims(has, "Should we move our file server to the cloud?"), has);
  // The Instagram pointer to the bakery proposal is gone with the proposal
  assert.equal(guardClaims("Use a connector.", "Can orders from Instagram messages go into a sheet?"), "Use a connector.");
  assert.equal(guardClaims("Use a connector.", "Can Square sync with QuickBooks?"), "Use a connector.");
});

test("guardClaims drops an invented Chinese case claim", () => {
  const t = "neon1 可以帮您设置收银系统。\n\n例如，我们曾为一家小餐厅把订单汇总到一张清单。\n\n请告诉我您的系统。";
  assert.equal(guardClaims(t, "你们能帮忙吗？"), "neon1 可以帮您设置收银系统。\n\n请告诉我您的系统。");
});

test("ensureHuman offers Pradeep on a cost question answered with a range", () => {
  assert.match(ensureHuman("An AWS migration usually costs $3,000 or more. The figure comes in a proposal after a free call.", "What does an AWS migration usually cost?"), /hello@neon1\.tech/);
  assert.equal(ensureHuman("It depends on the data.", "What does an AWS migration usually cost?"), "It depends on the data.");
});

test("guardClaims drops past work that names no published case study", () => {
  const t = "Yes, neon1 can work with Google Workspace. neon1 has set up workflows that connect Gmail to Sheets for clients. What do you use?";
  assert.equal(guardClaims(t, "Can you work with Google Workspace?"), "Yes, neon1 can work with Google Workspace. What do you use?");
  const titled = "neon1 has moved two offices off local servers, as Two offices off local servers describes.";
  assert.equal(guardClaims(titled, "x"), titled);
  // The current case study titles count as published work too
  for (const t of [
    "neon1 has built a permission-aware document assistant as a subcontractor.",
    "neon1 has migrated a two-site business to AWS, as the Two-site server migration case study describes.",
    "neon1 has built a patient intake portal as a subcontractor.",
    "neon1 has set up operations integration and monitoring for a small local business.",
  ]) assert.equal(guardClaims(t, "x"), t, t);
  // A bare "one case study" claim naming no title is still dropped
  assert.equal(guardClaims("Yes. In one case study, neon1 has set up Gmail workflows for clients.", "x"), "Yes.");
});

test("guardClaims skips a case pointer that would push the contact line past the limit", () => {
  const long = `${"Orders land in one list. ".repeat(40)}\n\nEmail hello@neon1.tech.`;
  assert.equal(guardClaims(long, "Should we move our file server to the cloud?"), long);
});

test("guardClaims drops the longest middle paragraph so a case pointer fits ahead of the contact line", () => {
  const body = ["Usually, yes.", "Details that run on. ".repeat(30), "Which tools do you use?", "Email hello@neon1.tech."].join("\n\n");
  const out = guardClaims(body, "Should we move our file server to the cloud?");
  assert.match(out, /Two-site server migration/);
  assert.ok(out.endsWith("Email hello@neon1.tech."));
  assert.ok(out.length <= 1200);
});

test("a percentage stays when a source publishes it, and goes when it's invented", () => {
  const sources = "Recall rose from 72% to 94% on an 80-question test set. About 5 percent of staff time.";
  const known = publishedPercents(sources);
  assert.deepEqual([...known].sort((a, b) => a - b), [5, 72, 94]);
  const measured = "neon1's document assistant took recall from 72% to 94%, as its case study measured.";
  assert.equal(neon1Voice(measured, known), measured);
  // An invented figure goes, with or without sources; one that no source publishes is never kept
  assert.equal(neon1Voice("Turn off idle servers. neon1 has cut cloud bills by 40% for others. Email hello@neon1.tech.", known), "Turn off idle servers. Email hello@neon1.tech.");
  assert.equal(neon1Voice("Turn off idle servers. neon1 often saves 30% to 60%. Email us."), "Turn off idle servers. Email us.");
  // A published figure beside an invented one still drops the sentence
  assert.equal(neon1Voice("neon1 improved recall from 72% to 99%. Email us.", known), "Email us.");
});

test("a sentence claiming neon1 is certified, audited, or a vendor partner is dropped", () => {
  assert.equal(guardClaims("neon1 is SOC 2 certified. Email hello@neon1.tech.", "Is neon1 certified?"), "Email hello@neon1.tech.");
  assert.equal(guardClaims("neon1 holds an ISO 27001 certification. See the policies.", "x"), "See the policies.");
  assert.equal(guardClaims("neon1 is an AWS Advanced Partner. Ask Pradeep.", "x"), "Ask Pradeep.");
  assert.equal(guardClaims("neon1 is HIPAA compliant. Ask Pradeep.", "x"), "Ask Pradeep.");
  // Saying the pages don't state it, or what a certification is, stays
  for (const t of ["The pages don't state whether neon1 is SOC 2 certified.", "A SOC 2 report comes from an independent CPA firm, which neon1 doesn't issue.", "neon1 prepares companies for a SOC 2 review."]) {
    // The certification question also gets the pointer to what the pages publish about 1NEON's security
    assert.ok(guardClaims(t, "Is neon1 SOC 2 certified?").startsWith(t), t);
  }
  assert.equal(guardClaims("neon1 prepares companies for a SOC 2 review.", "Does neon1 do SOC 2 readiness?"), "neon1 prepares companies for a SOC 2 review.");
});

test("a sentence committing neon1 to a date or time frame is dropped", () => {
  assert.equal(guardClaims("neon1 can start next week. The proposal sets the schedule.", "Can you start soon?"), "The proposal sets the schedule.");
  assert.equal(guardClaims("Pradeep will have it done by Friday. Email hello@neon1.tech.", "x"), "Email hello@neon1.tech.");
  assert.equal(guardClaims("neon1 can finish this within 3 weeks. Book the call.", "x"), "Book the call.");
  for (const t of ["A focused project usually runs one to four weeks, and the proposal sets the schedule.", "neon1 can start with a free call."]) {
    assert.equal(guardClaims(t, "x"), t, t);
  }
});

test("rewrites 'we', 'our', and more first-person verbs for neon1's work", () => {
  assert.equal(neon1Voice("We don’t build websites. We do the work ourselves."), "neon1 doesn't build websites. neon1 does the work itself.");
  assert.equal(neon1Voice("We’ve helped an office. We focus on tools, and our services are four."), "neon1 has helped an office. neon1 focuses on tools, and neon1's services are four.");
  assert.equal(neon1Voice("I do this work myself, and I provide a written guide."), "Pradeep does this work himself, and neon1 provides a written guide.");
  assert.equal(neon1Voice("I don’t replace your MSP. I’m not a replacement."), "neon1 doesn't replace your MSP. neon1 isn't a replacement.");
  assert.equal(neon1Voice("We can review the design."), "neon1 can review the design.");
  // Neo's own "I" stays
  const own = "I can't see the calendar, so I can only say what's published. I don't know which plan you're on.";
  assert.equal(neon1Voice(own), own);
});

test("a certification absence, or a story about a client, is not stated", () => {
  const noted = guardClaims("neon1 offers readiness work. For your file, you may note that neon1 does not hold these certifications.", "Is neon1 SOC 2 certified?");
  assert.ok(noted.startsWith("neon1 offers readiness work. The pages don't state any certification."));
  assert.match(noted, /\[security disclosure\]\(https:\/\/neon1\.tech\/knowledge\/policies\/security\/\)/);
  assert.equal(guardClaims("neon1 doesn't issue SOC 2 reports; an independent CPA firm does.", "x"), "neon1 doesn't issue SOC 2 reports; an independent CPA firm does.");
  assert.equal(guardClaims("Readiness helps. For example, one client had 12 systems with no sync. Their audit passed on the first try. Ask Pradeep.", "x"), "Readiness helps. Ask Pradeep.");
});

test("a Spanish 'can you help' turn gets the route, however the reply names neon1", () => {
  const out = ensureHuman("Neon1 puede integrar su sistema de ventas con la contabilidad.", "¿Pueden ayudarme con las facturas?");
  assert.match(out, /Pradeep puede ayudarte directamente/);
  assert.equal(ensureHuman("Las facturas suelen depender del sistema.", "¿Pueden ayudarme con las facturas?"), "Las facturas suelen depender del sistema.");
});

test("guardClaims drops several long middle paragraphs so a case pointer fits ahead of the contact line", () => {
  const body = ["Usually, yes.", "First detail runs on. ".repeat(18), "Second detail runs on. ".repeat(17), "Which tools do you use?", "Email hello@neon1.tech."].join("\n\n");
  const out = guardClaims(body, "Should we move our file server to the cloud?");
  assert.match(out, /Two-site server migration/);
  assert.ok(out.startsWith("Usually, yes.") && out.endsWith("Email hello@neon1.tech."));
  assert.ok(out.length <= 1200, String(out.length));
});

test("a reply that decides HIPAA applies to the visitor becomes a pointer to a professional", () => {
  const q = "Do I need to be HIPAA compliant if I run a small physical therapy office?";
  const out = guardClaims("Generally, yes, if you bill insurance electronically, HIPAA applies to you as a covered entity under U.S. law. The law doesn't exempt small businesses. You must safeguard PHI. A lawyer can confirm.", q);
  assert.match(out, /^HIPAA usually applies to healthcare providers/);
  assert.doesNotMatch(out, /applies to you\b|doesn't exempt|You must/);
  assert.match(out, /A lawyer can confirm\.$/);
  // General information about the law stays
  const general = "HIPAA usually applies to providers who bill insurance electronically. A BAA is needed before neon1 touches health records.";
  assert.equal(guardClaims(general, q), general);
});

test("a flat 'neon1 doesn't set up laptops' becomes 'the pages don't list it'", () => {
  const out = guardClaims("neon1 doesn't set up laptops or handle hardware installation. A local IT provider does that.", "Give me a fixed price right now for setting up 5 new laptops.");
  assert.match(out, /^The pages don't list laptop or hardware setup, so a call settles whether it fits\. A local IT provider does that\.\n\nA fixed price or estimate comes in a proposal after the free call\. The \[pricing page\]/);
  // The proposal line is not repeated when the reply already says it
  const said = "A proposal sets the price.";
  assert.equal(guardClaims(said, "Can I get a quote?"), said);
  // Network work that touches devices stays
  const net = "neon1 doesn't replace your devices, but the networks service covers how devices connect.";
  assert.equal(guardClaims(net, "x"), net);
});

test("a certification question gets the human route when the reply has none", () => {
  const out = ensureHuman("The pages list one certification: AWS Certified Cloud Practitioner (2025).", "Do you have AWS certifications?");
  assert.match(out, /Pradeep can help directly/);
  assert.equal(ensureHuman("It is a fruit.", "Is a tomato a fruit?"), "It is a fruit.");
});

test("a reply that names the free call gets the booking route, and a mid-sentence offer is third person", () => {
  const out = ensureHuman("I can't guarantee that. The exact timeline comes in a proposal after a free 30-minute call.", "Will you guarantee the project finishes on time?");
  assert.match(out, /Pradeep can help directly/);
  assert.equal(ensureHuman("Usually a day.", "How long does a sync take?"), "Usually a day.");
  assert.equal(neon1Voice("If you need one now, I can help design and build it."), "If you need one now, neon1 can help design and build it.");
});

test("a price sentence is dropped unless the visitor raised cost, a rate, or how long a job takes", async () => {
  const { unaskedPrices } = await import("../src/chat.mjs");
  const reply = "neon1 can connect those. A small fix usually costs $150 to $750. Book the call.";
  assert.equal(unaskedPrices(reply, "I own a bakery. Can you help with orders?"), "neon1 can connect those. Book the call.");
  for (const q of ["How much would that cost?", "What's your hourly rate?", "Do you need money up front?", "What's the smallest job you'd take on?", "How long does a project take?"]) assert.equal(unaskedPrices(reply, q), reply, q);
  assert.equal(unaskedPrices("No figures here.", "Can you help?"), "No figures here.");
  // Only figures: nothing to drop to, so the reply stays
  assert.equal(unaskedPrices("$150 to $750.", "Can you help?"), "$150 to $750.");
});

test("a reply that offers neon1's work gets the route whatever the question, and 'neon1 uses X in engagements' is dropped", () => {
  const out = ensureHuman("neon1 offers workflow automation, from a simple assessment to a full implementation.", "Does my accounting software integrate with Gusto?");
  assert.match(out, /Pradeep can help directly/);
  assert.equal(ensureHuman("Gusto connects to many tools.", "Does my accounting software integrate with Gusto?"), "Gusto connects to many tools.");
  assert.equal(guardClaims("IaC is code for infrastructure. For example, neon1 uses Terraform in cloud engagements. Ask Pradeep.", "What is infrastructure as code?"), "IaC is code for infrastructure. Ask Pradeep.");
});

test("a reply cut at the limit with its contact line still ends with the route", async () => {
  const { reply, BOOKING, EMAIL } = await import("../src/chat.mjs");
  const long = `${"neon1 can help with orders. ".repeat(50)}\n\nEmail ${EMAIL} or book ${BOOKING}.`;
  const client = { send: async () => ({ output: { message: { content: [{ text: long }] } }, stopReason: "end_turn", usage: {} }) };
  const out = await reply([{ role: "user", content: "Can you help with my orders?" }], { corpus: `${EMAIL} ${BOOKING}`, client });
  assert.ok(out.text.length <= 1200);
  assert.ok(out.text.includes(EMAIL) && out.text.includes(BOOKING));
  assert.deepEqual(neon1Voice("Sí. Hemos ayudado a otros negocios en Queens. Escríbenos."), "Sí. Escríbenos.");
});
