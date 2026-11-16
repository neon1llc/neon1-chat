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

