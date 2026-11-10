// app/test/attempts.test.mjs - One question is one model generation, even when a film line is picked.

import { test } from "node:test";
import assert from "node:assert/strict";
import { reply } from "../src/chat.mjs";

// A fake model that counts calls and answers with the given text and usage
const model = (text) => {
  const m = { calls: [], send: async (cmd) => (m.calls.push(cmd.input), { output: { message: { content: [{ text }] } }, usage: { inputTokens: 100, outputTokens: 8 }, stopReason: "end_turn" }) };
  return m;
};

const DIRECTIVES = `- **"Never send a human to do a machine's job."** — Smith. Means: automate it. Say: "Let the machine do it". Cues: retype, by hand.`;
const ask = (client, content) => reply([{ role: "user", content }], { corpus: "neon1 automates repetitive work.", directives: DIRECTIVES, client });

test("a normal answer is one attempt and one Converse call", async () => {
  const m = model("neon1 automates repetitive work for small businesses.");
  const out = await ask(m, "What does neon1 do?");
  assert.equal(out.attempts, 1);
  assert.equal(m.calls.length, 1);
  assert.deepEqual(out.usage, { inputTokens: 100, outputTokens: 8 });
});

test("a film-line question with a short reply is not generated again", async () => {
  // The model answers with little more than the line; the reply is fitted, never regenerated
  const m = model("Never send a human to do a machine's job.");
  const out = await ask(m, "We retype the same numbers by hand all week, can neon1 help?");
  assert.equal(m.calls.length, 1, "no hidden extra generation");
  assert.equal(out.attempts, 1);
  assert.match(m.calls[0].system.at(-1).text, /^FIT:/, "the single call carries the film note");
  assert.match(m.calls[0].system.at(-1).text, /never just the line/);
});
