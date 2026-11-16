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

test("keeps a reply that would otherwise be empty, and skips non-Latin text", () => {
  const only = "neon1 has set up similar systems for restaurants.";
  assert.equal(neon1Voice(only), only);
  const zh = "我们不修理硬件。";
  assert.equal(neon1Voice(zh), zh);
});

// The second pass, with a fake model client
import { voicePass } from "../src/chat.mjs";
const fake = (reply) => ({ send: async () => ({ output: { message: { content: [{ text: reply }] } } }) });

test("voicePass uses a rewrite that keeps links and prices", async () => {
  const before = "I help with workflows, from $1,000 to $3,000. [Book the call](https://example.com/x).";
  const after = "neon1 helps with workflows, from $1,000 to $3,000. [Book the call](https://example.com/x).";
  assert.equal(await voicePass(before, { client: fake(after) }), after);
});

test("voicePass keeps the first reply when the rewrite drifts or fails", async () => {
  const before = "I help with workflows, from $1,000 to $3,000.";
  assert.equal(await voicePass(before, { client: fake("neon1 helps with workflows, from $500.") }), before);
  assert.equal(await voicePass(before, { client: { send: async () => { throw new Error("x"); } } }), before);
  assert.equal(await voicePass("neon1 helps.", { client: fake("changed") }), "neon1 helps.");
});

test("voicePass makes no call when the only first person is Neo's own", async () => {
  let calls = 0;
  const counting = { send: async () => { calls++; return { output: { message: { content: [{ text: "x" }] } } }; } };
  assert.equal(await voicePass("I can't see the calendar. Tell me which software you use.", { client: counting }), "I can't see the calendar. Tell me which software you use.");
  assert.equal(calls, 0);
});
