// app/test/gate.test.mjs - The eval's release check: rubric as the gate, keywords as the floor.
import { test } from "node:test";
import assert from "node:assert/strict";
import { gate, latestBaseline } from "../eval/gate.mjs";

// A run of n questions where the listed ids fail each grade
function run(ids, { keywordFails = [], rubricFails = [], judged = true } = {}) {
  const results = ids.map((id) => ({
    id, status: 200, reply: `Reply for ${id}`, graded: true, pass: !keywordFails.includes(id),
    ...(judged ? { rubric: { pass: !rubricFails.includes(id), misses: rubricFails.includes(id) ? ["rubric: facts"] : [] } } : {}),
  }));
  const passed = results.filter((r) => r.pass).length;
  return {
    summary: { total: ids.length, asked: ids.length, passed },
    ...(judged ? { rubricSummary: { passed: results.filter((r) => r.rubric.pass).length } } : {}),
    results,
  };
}
const ids = ["a", "b", "c", "d"];

test("passes when neither grade drops, and lists a swapped question", () => {
  const r = gate(run(ids, { rubricFails: ["b"] }), run(ids, { rubricFails: ["a"] }));
  assert.equal(r.pass, true);
  assert.deepEqual(r.regressions.map((x) => x.id), ["b"]);
});

test("fails when the rubric or the keyword floor drops", () => {
  assert.equal(gate(run(ids, { rubricFails: ["a", "b"] }), run(ids, { rubricFails: ["a"] })).pass, false);
  const r = gate(run(ids, { keywordFails: ["c"] }), run(ids));
  assert.equal(r.pass, false);
  assert.match(r.problems.join(), /keywords 3 is below the baseline's 4/);
});

test("fails an unjudged or partial run, and an unjudged baseline", () => {
  assert.match(gate(run(ids, { judged: false }), run(ids)).problems.join(), /4 replies not judged/);
  const partial = run(ids);
  partial.summary.asked = 3;
  assert.match(gate(partial, run(ids)).problems.join(), /asked 3 of 4/);
  assert.match(gate(run(ids), run(ids, { judged: false })).problems.join(), /baseline has no rubric grade/);
});

test("fails when a result has an HTTP or model error status", () => {
  for (const status of [502, 503, "network"]) {
    const candidate = run(ids);
    candidate.results[0].status = status;
    const result = gate(candidate, run(ids));
    assert.equal(result.pass, false, `accepted status ${status}`);
    assert.match(result.problems.join(), /failed status/);
  }
});

test("fails when candidate question IDs differ from the baseline", () => {
  const result = gate(run(["a", "b", "c", "other"]), run(ids));
  assert.equal(result.pass, false);
  assert.match(result.problems.join(), /question IDs do not match/);
});

test("fails when a successful result has an empty reply", () => {
  const candidate = run(ids);
  candidate.results[0].reply = "  ";
  const result = gate(candidate, run(ids));
  assert.equal(result.pass, false);
  assert.match(result.problems.join(), /empty replies/);
});

test("finds the newest judged baseline", () => {
  assert.match(latestBaseline() ?? "", /baseline-\d{4}-\d{2}-\d{2}\.json$/);
});
