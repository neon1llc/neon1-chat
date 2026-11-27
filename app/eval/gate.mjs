// app/eval/gate.mjs - The release check for Neo's answers: does a judged run hold up against the baseline?
//
// The rubric grade is the gate and the keyword grade is the floor. A run passes when it asked every
// question, every graded reply carries a rubric verdict, and neither grade passes fewer questions
// than the baseline did. Questions that passed in the baseline and fail now are listed either way,
// so a swap (one fixed, another broken) is still seen and reviewed.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// ---- The newest saved baseline that carries a rubric grade ----
export function latestBaseline(dir = here) {
  const names = readdirSync(dir).filter((n) => /^baseline-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort().reverse();
  for (const name of names) {
    const file = join(dir, name);
    if (JSON.parse(readFileSync(file, "utf8")).rubricSummary) return file;
  }
  return null;
}

// ---- Compare a run with a baseline; returns { pass, problems, regressions, scores } ----
export function gate(run, baseline) {
  const problems = [];
  const s = run.summary ?? {};
  const results = Array.isArray(run.results) ? run.results : [];
  const baselineResults = Array.isArray(baseline.results) ? baseline.results : [];
  const ids = results.map((r) => r.id);
  const baselineIds = baselineResults.map((r) => r.id);
  const unique = (values) => new Set(values).size === values.length;
  if (s.asked !== s.total || s.asked !== results.length) problems.push(`asked ${s.asked} of ${s.total} questions; found ${results.length} results`);
  if (!unique(ids) || !unique(baselineIds) || ids.length !== baselineIds.length || ids.some((id) => !baselineIds.includes(id))) {
    problems.push("question IDs do not match baseline");
  }

  const failed = results.filter((r) => r.status !== 200).map((r) => `${r.id} (${r.status ?? "missing status"})`);
  if (failed.length) problems.push(`results have failed status (${failed.slice(0, 3).join(", ")}${failed.length > 3 ? ", ..." : ""})`);
  const empty = results.filter((r) => typeof r.reply !== "string" || !r.reply.trim()).map((r) => r.id);
  if (empty.length) problems.push(`empty replies (${empty.slice(0, 3).join(", ")}${empty.length > 3 ? ", ..." : ""})`);

  const unjudged = results.filter((r) => r.status === 200 && (!r.graded || !r.rubric)).map((r) => r.id);
  if (!run.rubricSummary || unjudged.length) problems.push(unjudged.length ? `${unjudged.length} replies not judged (${unjudged.slice(0, 3).join(", ")}${unjudged.length > 3 ? ", ..." : ""})` : "run has no rubric grade");
  if (!baseline.rubricSummary) problems.push("baseline has no rubric grade");

  const scores = {
    rubric: { now: results.filter((r) => r.rubric?.pass).length, baseline: baselineResults.filter((r) => r.rubric?.pass).length },
    keyword: { now: results.filter((r) => r.pass).length, baseline: baselineResults.filter((r) => r.pass).length },
  };
  if (scores.rubric.now < scores.rubric.baseline) problems.push(`rubric ${scores.rubric.now} is below the baseline's ${scores.rubric.baseline}`);
  if (scores.keyword.now < scores.keyword.baseline) problems.push(`keywords ${scores.keyword.now} is below the baseline's ${scores.keyword.baseline}`);

  // Per-question regressions: passed the baseline's rubric, fail it now
  const before = Object.fromEntries(baselineResults.map((r) => [r.id, r]));
  const regressions = results.filter((r) => before[r.id]?.rubric?.pass && r.rubric && !r.rubric.pass).map((r) => ({ id: r.id, misses: r.rubric.misses }));

  return { pass: !problems.length, problems, regressions, scores };
}
