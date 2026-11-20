// app/test/voice.test.mjs - neon1's voice in replies: neon1 or Pradeep for the work, no invented clients.
import { test } from "node:test";
import assert from "node:assert/strict";
import { neon1Voice } from "../src/chat.mjs";

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
import { ensureHuman, guardClaims } from "../src/chat.mjs";

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
    "HIPAA usually applies to providers who bill insurance or send health information electronically. Whether it applies to your office depends on your situation, and a lawyer or compliance advisor can confirm it. It covers claims.",
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
  assert.match(ensureHuman("neon1 can set that up.", "Can you connect Square to QuickBooks?"), /book the free 15-minute call/);
});

test("drops outcome percentages and borrowed client claims, and rewrites more first person", () => {
  assert.equal(neon1Voice("Turn off idle servers. neon1 has helped small businesses review AWS, often reducing bills by 30% to 60%. Email us."), "Turn off idle servers. Email us.");
  assert.equal(neon1Voice("I can help connect it, just like neon1 has done for other small businesses. What do you use?"), "neon1 can help connect it. What do you use?");
  assert.equal(neon1Voice("I work with Microsoft 365. I take on two clients at a time."), "neon1 works with Microsoft 365. neon1 takes on two clients at a time.");
});

test("guardClaims names a fitting case study once", () => {
  const out = guardClaims("Cloud storage helps.\n\nEmail hello@neon1.tech.", "Should we move our file server to the cloud?");
  assert.match(out, /Two offices off local servers[^]*hello@neon1\.tech/);
  const has = "The two offices case study fits.";
  assert.equal(guardClaims(has, "Should we move our file server to the cloud?"), has);
  assert.match(guardClaims("Use a connector.", "Can orders from Instagram messages go into a sheet?"), /fictional bakery/);
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
});

test("guardClaims skips a case pointer that would push the contact line past the limit", () => {
  const long = `${"Orders land in one list. ".repeat(40)}\n\nEmail hello@neon1.tech.`;
  assert.equal(guardClaims(long, "Can orders from Instagram go into a sheet?"), long);
});

test("guardClaims drops the longest middle paragraph so a case pointer fits ahead of the contact line", () => {
  const body = ["Usually, yes.", "Details that run on. ".repeat(30), "Which tools do you use?", "Email hello@neon1.tech."].join("\n\n");
  const out = guardClaims(body, "Can orders from Instagram go into a sheet?");
  assert.match(out, /fictional bakery/);
  assert.ok(out.endsWith("Email hello@neon1.tech."));
  assert.ok(out.length <= 1200);
});
