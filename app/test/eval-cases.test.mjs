// app/test/eval-cases.test.mjs - The synthetic test set stays usable offline: every case is a
// valid conversation under the contract, the passages each case relies on are in the approved
// sources, and the set keeps covering every group. No model is called.

import { test } from "node:test";
import assert from "node:assert/strict";
import { CASES, GROUPS } from "../../scripts/eval-cases.mjs";
import { check } from "../src/contract.mjs";
import { loadCorpus } from "../src/corpus.mjs";

test("every case is a conversation the API would accept", () => {
  for (const c of CASES) assert.ok(check({ messages: c.turns }).messages, c.id);
});

test("case ids are unique and every group is covered, multi-turn included", () => {
  assert.equal(new Set(CASES.map((c) => c.id)).size, CASES.length);
  for (const g of GROUPS) assert.ok(CASES.some((c) => c.group === g), g);
  assert.ok(CASES.filter((c) => c.turns.length > 1).length >= 3);
  assert.ok(CASES.every((c) => GROUPS.includes(c.group)));
});

test("each expected fact is grounded in the approved sources", () => {
  const corpus = loadCorpus();
  for (const c of CASES) for (const passage of c.support ?? []) assert.ok(corpus.includes(passage), `${c.id}: "${passage}" is not in the corpus`);
});
