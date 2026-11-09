// app/test/contract.test.mjs - The conversation contract the chat window relies on: role order,
// per-turn and total bounds at their edges (Unicode included), distinct refusal codes, and how
// a long reply is shortened.

import { test } from "node:test";
import assert from "node:assert/strict";
import { CODES, LIMITS, check, clip } from "../src/contract.mjs";

process.env.EDGE_CHECK = "off";
const { handler, validate } = await import("../src/handler.mjs");

// A conversation of alternating turns with the given lengths, the last one the visitor's
const convo = (...lengths) => ({
  messages: lengths.map((n, i) => ({ role: i % 2 ? "assistant" : "user", content: (i % 2 ? "a" : "u").repeat(n) })),
});

// ---- Per-turn and total bounds, exactly at and one past each edge ----

test("each turn may hold 1,200 characters, not 1,201, for both roles", () => {
  assert.ok(check(convo(1200)).messages);
  assert.equal(check(convo(1201)).code, CODES.question);
  assert.ok(check(convo(10, 1200, 10)).messages);
  assert.equal(check(convo(10, 1201, 10)).code, CODES.conversation);
});

test("the whole conversation may hold 6,000 characters, not 6,001", () => {
  assert.ok(check(convo(1200, 1200, 1200, 1200, 1200)).messages);
  assert.equal(check(convo(1200, 1200, 1200, 1200, 1201)).code, CODES.question);
  assert.equal(check(convo(1200, 1200, 1200, 1200, 1199, 1, 1)).code, CODES.conversation);
  assert.ok(check(convo(1200, 1200, 1200, 1200, 1198, 1, 1)).messages);
});

test("at most 11 turns, always an odd number ending with the visitor", () => {
  assert.ok(check(convo(...Array(11).fill(5))).messages);
  assert.equal(check(convo(...Array(13).fill(5))).code, CODES.conversation);
  assert.equal(check(convo(5, 5)).code, CODES.invalid);
  assert.equal(check({ messages: [{ role: "assistant", content: "hi" }] }).code, CODES.invalid);
  assert.equal(check({ messages: [{ role: "user", content: "a" }, { role: "user", content: "b" }, { role: "user", content: "c" }] }).code, CODES.invalid);
  assert.equal(check({ messages: [{ role: "user", content: "   " }] }).code, CODES.invalid);
});

test("characters are string length, so an emoji counts two, the same as a textarea's maxlength", () => {
  const emoji = "\u{1F600}";
  assert.ok(check({ messages: [{ role: "user", content: emoji.repeat(600) }] }).messages);
  assert.equal(check({ messages: [{ role: "user", content: emoji.repeat(600) + "x" }] }).code, CODES.question);
  // Accented letters written as one code point count one each
  assert.ok(check({ messages: [{ role: "user", content: "é".repeat(1200) }] }).messages);
});

test("bounds apply after trimming, as the window counts them", () => {
  const padded = { messages: [{ role: "user", content: `  ${"x".repeat(1200)}\n` }] };
  assert.deepEqual(check(padded).messages, [{ role: "user", content: "x".repeat(1200) }]);
});

// ---- The API words each refusal so the window can tell them apart ----

test("a long question and a long history get different codes and words", async () => {
  const ask = (body) => handler({ rawPath: "/chat/api/chat", requestContext: { http: { method: "POST" } }, headers: {}, body: JSON.stringify(body) });
  const long = await ask(convo(1201));
  assert.equal(long.statusCode, 400);
  assert.equal(JSON.parse(long.body).code, "question_too_long");
  assert.match(JSON.parse(long.body).error, /question under 1,200 characters/);

  const history = await ask(convo(10, 1300, 10));
  assert.equal(JSON.parse(history.body).code, "conversation_too_long");
  assert.doesNotMatch(JSON.parse(history.body).error, /under 1,200/);
  assert.equal(history.headers["cache-control"], "no-store");
});

// ---- The reviewers' malformed-input sweep, kept as a regression ----

test("no malformed or out-of-bounds body throws or is accepted", () => {
  const bodies = [null, undefined, true, 0, "x", [], {}, { messages: [] }, { messages: {} }, { messages: [null] }, { messages: [{ role: "system", content: "x" }] }];
  for (let n = 0; n < 1300; n += 7) bodies.push({ messages: [{ role: "user", content: n % 2 ? "x".repeat(n) : n }] });
  for (let n = 0; n < 30; n++) bodies.push({ messages: Array.from({ length: n }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "x" })) });
  for (const body of bodies) {
    const turns = validate(body);
    if (!turns) continue;
    assert.ok(turns.length <= LIMITS.turns && turns.length % 2 === 1);
    assert.ok(turns.reduce((n, t) => n + t.content.length, 0) <= LIMITS.total);
    turns.forEach((t, i) => {
      assert.equal(t.role, i % 2 ? "assistant" : "user");
      assert.ok(t.content.trim() && t.content.length <= LIMITS.chars);
    });
  }
});

// ---- Long replies: shortened at a clean place, never inside a link ----

test("a reply over the limit is cut at a sentence end and fits the history", () => {
  const text = `${"This sentence is fine. ".repeat(60)}`.trim();
  const out = clip(text, 1200);
  assert.ok(out.length <= 1200);
  assert.ok(out.endsWith("fine."));
  assert.ok(check({ messages: [{ role: "user", content: "q" }, { role: "assistant", content: out }, { role: "user", content: "next" }] }).messages);
});

test("a cut never lands inside a Markdown link or URL", () => {
  const link = "[book a free call](https://calendly.com/1isgladtobeofservice/neon1-consultation)";
  const text = `${"word ".repeat(225)}${link} and more words after it to push past the limit`;
  const out = clip(text, 1200);
  assert.ok(out.length <= 1200);
  assert.ok(!out.includes("[book") || out.includes(link));
  assert.ok(out.endsWith("…"));
});

test("text with no spaces is still cut to the limit without splitting an emoji", () => {
  assert.equal(clip("A".repeat(1300), 1200).length, 1200);
  const out = clip("\u{1F600}".repeat(700), 1200);
  assert.ok(out.length <= 1200);
  assert.ok(!/[\uD800-\uDBFF]…$/.test(out));
});

test("text within the limit is returned unchanged", () => {
  assert.equal(clip("Short.", 1200), "Short.");
  assert.equal(clip("x".repeat(1200), 1200), "x".repeat(1200));
});
