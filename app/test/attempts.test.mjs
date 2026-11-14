// app/test/attempts.test.mjs - One question is one model generation, with nothing added after the cached prompt.

import { test } from "node:test";
import assert from "node:assert/strict";
import { reply } from "../src/chat.mjs";

// A fake model that counts calls and answers with the given text and usage
const model = (text) => {
  const m = { calls: [], send: async (cmd) => (m.calls.push(cmd.input), { output: { message: { content: [{ text }] } }, usage: { inputTokens: 100, outputTokens: 8 }, stopReason: "end_turn" }) };
  return m;
};

const ask = (client, content) => reply([{ role: "user", content }], { corpus: "neon1 automates repetitive work.", directives: "Neo is calm.", client });

test("a normal answer is one attempt and one Converse call", async () => {
  const m = model("neon1 automates repetitive work for small businesses.");
  const out = await ask(m, "What does neon1 do?");
  assert.equal(out.attempts, 1);
  assert.equal(m.calls.length, 1);
  assert.deepEqual(out.usage, { inputTokens: 100, outputTokens: 8 });
});

test("the system prompt is the same for every question, so the cache always holds", async () => {
  const m = model("neon1 can help with that.");
  await ask(m, "We retype the same numbers by hand all week, can neon1 help?");
  await ask(m, "What is SOC 2?");
  assert.deepEqual(m.calls[0].system, m.calls[1].system);
  assert.ok(m.calls[0].system.every((b) => !/^FIT:/.test(b.text ?? "")), "no per-question note after the prompt");
});
