// app/test/eval.test.mjs - The prospect question set stays usable offline, and the grader grades
// written replies the way it should. No model is called.

import { test } from "node:test";
import assert from "node:assert/strict";
import { HUMAN, REFUSAL, grade, loadQuestions } from "../eval/grade.mjs";
import { check } from "../src/contract.mjs";
import { allowedLinks, loadCorpus, loadDirectives, publishedPrices } from "../src/chat.mjs";
import { withHuman } from "../src/handler.mjs";

const questions = loadQuestions();
const corpus = loadCorpus();
const ctx = { allowed: allowedLinks(`${loadDirectives()}\n${corpus}`), prices: publishedPrices(corpus) };
const byId = Object.fromEntries(questions.map((q) => [q.id, q]));

test("the set has 40 to 55 questions with unique ids, each one a conversation the API accepts", () => {
  assert.ok(questions.length >= 40 && questions.length <= 55, String(questions.length));
  assert.equal(new Set(questions.map((q) => q.id)).size, questions.length);
  for (const q of questions) assert.ok(check({ messages: q.turns }).messages, q.id);
  for (const q of questions) assert.ok(q.expect, `${q.id} says what a good reply does`);
});

test("the set covers what prospects ask", () => {
  const groups = new Set(questions.map((q) => q.group));
  for (const g of ["plain-words", "ambiguous", "price", "integrations", "security", "aws", "out-of-scope", "hostile", "non-english", "multi-turn"]) assert.ok(groups.has(g), g);
  const asked = questions.map((q) => q.turns.at(-1).content).join("\n");
  for (const word of ["QuickBooks", "Square", "Shopify", "Google Workspace", "Instagram", "SOC 2", "AWS", "HIPAA"]) assert.ok(asked.includes(word), word);
});

test("each expected fact is grounded in the approved sources", () => {
  for (const q of questions) for (const passage of q.support ?? []) assert.ok(corpus.includes(passage), `${q.id}: "${passage}" is not in the corpus`);
});

test("a good written reply passes and a bad one fails for the right reasons", () => {
  const good = "Most small fixes run $150 to $750, and workflow projects $1,000 to $3,000. The exact figure comes in a proposal.";
  assert.deepEqual(grade(good, byId["how-much"], ctx), []);
  const bad = "neon1 charges $95 an hour, and I guarantee it'll be done fast.";
  const misses = grade(bad, byId["how-much"], ctx);
  assert.ok(misses.includes("unpublished price $95"));
  assert.ok(misses.includes("promise or guarantee"));
  assert.ok(misses.some((m) => m.startsWith("missing")));
  assert.deepEqual(grade("No one can guarantee that, and nobody can promise zero risk.", byId["never-hacked"], ctx), []);
});

test("the human and refusal rules read replies the way a visitor would", () => {
  assert.match("You can email hello@neon1.tech.", HUMAN);
  assert.match("Book a free 15-minute call to talk it through.", HUMAN);
  assert.doesNotMatch("neon1 connects tools that don't talk to each other.", HUMAN);
  assert.match("I can only help with neon1. For example, ask about the process.", REFUSAL);
  assert.doesNotMatch("I can help with that.", REFUSAL);
  // The words every limit and failure carries count as offering a person
  assert.match(withHuman("Neo is busy."), HUMAN);
  const unsure = grade("That depends on which accounting software you use. Generally payroll tools sync through an app. Pradeep can say more: email hello@neon1.tech.", byId["accounting-gusto"], ctx);
  assert.deepEqual(unsure, []);
  assert.ok(grade("I can only help with neon1.", byId["accounting-gusto"], ctx).includes("generic refusal"));
});

test("links outside the sources fail", () => {
  assert.ok(grade("See [this](https://example.com/x).", { mustRe: [], notRe: [] }, ctx).includes("unlisted link https://example.com/x"));
  assert.deepEqual(grade("See [pricing](https://neon1.tech/knowledge/company/pricing/).", { mustRe: [], notRe: [] }, { ...ctx, allowed: new Set(["https://neon1.tech/knowledge/company/pricing"]) }), []);
});
