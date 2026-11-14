// app/eval/run.mjs - Run the prospect question set (questions.json) and grade Neo's replies.
//
// Usage:
//   node app/eval/run.mjs offline                      check prompt assembly only; no network, no cost
//   node app/eval/run.mjs live <url> [options]         ask a deployed endpoint, e.g. https://neon1.tech/chat/api/chat
//   node app/eval/run.mjs bedrock [options]            call Bedrock directly with this checkout's prompt (AWS credentials)
//   node app/eval/run.mjs regrade <results.json>       grade saved replies again with the current rules; no network
//
// Options: --gap <seconds> between questions (live; at least 20 against neon1.tech), --out <file>
// for the results (JSON), --only <id,id> to ask some questions, --limit <n> to stop after n, and
// --directives <file> to assemble the prompt with a draft of Neo's directives (offline and bedrock).
//
// A live run is read-only, one request at a time, and stops at the first 429: the endpoint's rate
// limits and daily budget are respected, never worked around. Results are written after every
// question, so a stopped run still records how far it got.

import { readFileSync, writeFileSync } from "node:fs";
import { grade, kind, loadQuestions } from "./grade.mjs";
import { LIMITS, check } from "../src/contract.mjs";
import { allowedLinks, buildRequest, loadCorpus, loadDirectives, publishedPrices, reply as askModel } from "../src/chat.mjs";

const args = process.argv.slice(2);
const mode = args[0];
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};

if (!["offline", "live", "bedrock", "regrade"].includes(mode)) {
  console.error("Usage: node app/eval/run.mjs offline | live <url> [--gap 20] [--out file] | bedrock [--out file] | regrade <results.json>");
  process.exit(2);
}

// The question set, narrowed if asked
let questions = loadQuestions();
const only = option("--only", "");
if (only) questions = questions.filter((q) => only.split(",").includes(q.id));
const limit = Number(option("--limit", 0));
if (limit > 0) questions = questions.slice(0, limit);

// What the grader checks against: the sources' links and the pricing page's figures
const corpus = loadCorpus();
// --directives tries a draft of Neo's directives (neon1-corpus dist/chat/neo-chat.md) before its release
const draft = option("--directives", null);
const directives = draft ? readFileSync(draft, "utf8").trim() : loadDirectives();
const ctx = { allowed: allowedLinks(`${directives}\n${corpus}`), prices: publishedPrices(corpus), maxChars: LIMITS.reply };

if (mode === "offline") process.exit(offline());
if (mode === "regrade") process.exit(regrade(args[1]));
process.exit(await asking());

// ---- Offline: is every question assembled into the request Neo would send? ----

function offline() {
  let failed = 0;
  for (const q of questions) {
    const problems = [];
    const checked = check({ messages: q.turns });
    if (!checked.messages) problems.push(`the API would refuse it (${checked.code})`);
    else {
      const req = buildRequest(checked.messages, { corpus, directives });
      const system = req.system.map((b) => b.text ?? "").join("\n");
      // The visitor's words go up unchanged, as the last user turn, and never into the rules
      const last = req.messages.at(-1);
      if (last.role !== "user" || last.content[0].text !== checked.messages.at(-1).content) problems.push("the question isn't the last user turn");
      if (system.includes(checked.messages.at(-1).content)) problems.push("the question leaked into the system prompt");
      // The human route and the scope switch are always in the rules
      if (!system.includes("hello@neon1.tech") || !system.includes("calendly.com/1isgladtobeofservice/neon1-consultation")) problems.push("the human route is missing from the prompt");
      if (!/SCOPE: (general-help|neon1-only)/.test(system)) problems.push("the scope switch isn't named in the prompt");
      if (req.system.some((b) => /^FIT:/.test(b.text ?? ""))) problems.push("a film-line note is still assembled");
      // The facts the expected answer depends on are in the sources the prompt carries
      for (const passage of q.support ?? []) if (!system.includes(passage)) problems.push(`"${passage}" isn't in the prompt's sources`);
    }
    // The rules themselves can't be broken by a good reply: a written reply that only offers a human
    // isn't graded here, but every pattern must at least compile, which loadQuestions already did
    if (problems.length) failed++;
    console.log(`${problems.length ? "FAIL" : "ok  "} [${q.group}] ${q.id}${problems.length ? `\n     ${problems.join("; ")}` : ""}`);
  }
  const sample = buildRequest([{ role: "user", content: "hi" }], { corpus, directives });
  const chars = sample.system.reduce((n, b) => n + (b.text?.length ?? 0), 0);
  console.log(`\n${questions.length - failed}/${questions.length} assembled correctly; system prompt ${chars.toLocaleString("en-US")} characters, scope ${scopeName()}`);
  return failed ? 1 : 0;
}

function scopeName() {
  return buildRequest([{ role: "user", content: "hi" }], { corpus, directives }).system[0].text.match(/SCOPE: ([\w-]+)/)?.[1] ?? "unknown";
}

// ---- Live and Bedrock: ask, grade, and save ----

async function asking() {
  const url = mode === "live" ? args[1] : null;
  if (mode === "live" && !/^https?:\/\//.test(url ?? "")) {
    console.error("live needs the endpoint URL, e.g. https://neon1.tech/chat/api/chat");
    return 2;
  }
  // Gentle with production: at least 20 seconds between questions on neon1.tech
  const production = url && new URL(url).hostname.endsWith("neon1.tech");
  const gap = Number(option("--gap", mode === "live" ? 20 : 0));
  if (production && gap < 20) {
    console.error("Against neon1.tech, --gap must be at least 20 seconds.");
    return 2;
  }
  const out = option("--out", null);
  const started = new Date().toISOString();
  const run = { mode, endpoint: url, started, finished: null, gapSeconds: gap, served: url ? await health(url) : "this checkout", stopped: null };
  const results = [];
  const save = () => out && writeFileSync(out, `${JSON.stringify({ run, summary: summarize(results, questions.length), results }, null, 2)}\n`);

  for (const [i, q] of questions.entries()) {
    if (i > 0 && gap) await new Promise((r) => setTimeout(r, gap * 1000));
    const asked = { id: q.id, group: q.group, question: q.turns.at(-1).content, turns: q.turns.length };
    const t0 = Date.now();
    let status, text, retry;
    try {
      ({ status, text, retry } = mode === "live" ? await post(url, q.turns) : await direct(q.turns));
    } catch (err) {
      ({ status, text } = { status: "network", text: "" });
      asked.error = err?.name ?? "Error";
    }
    const result = { ...asked, status, ms: Date.now() - t0, reply: text };

    // A 429 ends the run: record where it stopped and what the visitor would have seen
    if (status === 429) {
      run.stopped = { at: q.id, index: i, status, retryAfter: retry, message: text };
      results.push({ ...result, misses: ["rate limited"], pass: false, graded: false });
      console.log(`STOP [${q.group}] ${q.id}: 429, retry after ${retry}s. "${text}"`);
      break;
    }
    // An error is graded as what the visitor reads; it must at least offer a person
    const misses = status === 200 ? grade(text, q, ctx) : [`HTTP ${status}`, ...(text && !/hello@neon1\.tech/.test(text) ? ["error without a human route"] : [])];
    results.push({ ...result, misses, pass: !misses.length, graded: status === 200 });
    console.log(`${misses.length ? "FAIL" : "ok  "} [${q.group}] ${q.id}: ${asked.question}\n     ${(text ?? "").replace(/\n+/g, " ")}${misses.length ? `\n     ${misses.join("; ")}` : ""}`);
    save();
  }
  run.finished = new Date().toISOString();
  save();
  const s = summarize(results, questions.length);
  console.log(`\n${s.passed}/${s.asked} passed (${s.notAsked} not asked)${run.stopped ? `; stopped at ${run.stopped.at} by a 429` : ""}`);
  for (const [k, n] of Object.entries(s.byKind)) console.log(`  ${n} × ${k}`);
  return s.failed || run.stopped ? 1 : 0;
}

// ---- Regrade: the same replies, the current rules ----

// Rules get sharper after a run shows where they misread a reply. Regrading rewrites the file's
// grades and summary in place and notes when, keeping every reply and the run's record as they were
function regrade(file) {
  const saved = JSON.parse(readFileSync(file, "utf8"));
  const byId = Object.fromEntries(loadQuestions().map((q) => [q.id, q]));
  for (const r of saved.results) {
    if (!r.graded) continue;
    const before = r.pass;
    r.misses = grade(r.reply, byId[r.id], ctx);
    r.pass = !r.misses.length;
    if (before !== r.pass) console.log(`${r.pass ? "now passes" : "now fails "} ${r.id}${r.misses.length ? `: ${r.misses.join("; ")}` : ""}`);
  }
  saved.run.regraded = new Date().toISOString();
  saved.summary = summarize(saved.results, saved.summary.total);
  writeFileSync(file, `${JSON.stringify(saved, null, 2)}\n`);
  console.log(`${saved.summary.passed}/${saved.summary.asked} pass under the current rules`);
  return 0;
}

// One question to the endpoint, as the chat window sends it
async function post(url, messages) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "neon1-chat eval" },
    body: JSON.stringify({ messages }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, text: data.reply ?? data.error ?? "", retry: Number(res.headers.get("retry-after")) || null };
}

// One question to Bedrock through this checkout's reply(), as the Lambda would ask it
async function direct(turns) {
  const { messages } = check({ messages: turns });
  const { text } = await askModel(messages, { corpus, directives });
  return { status: 200, text };
}

// Which release is answering, from the endpoint's health check, so results name what they tested
async function health(url) {
  try {
    const res = await fetch(url.replace(/\/chat\/?$/, "/health"), { signal: AbortSignal.timeout(10000) });
    return await res.json();
  } catch {
    return null;
  }
}

function summarize(results, total) {
  const graded = results.filter((r) => r.graded);
  const byKind = {};
  const byGroup = {};
  for (const r of results) {
    byGroup[r.group] ??= { asked: 0, passed: 0 };
    byGroup[r.group].asked++;
    if (r.pass) byGroup[r.group].passed++;
    for (const k of new Set(r.misses.map(kind))) byKind[k] = (byKind[k] ?? 0) + 1;
  }
  const passed = results.filter((r) => r.pass).length;
  return {
    total,
    asked: results.length,
    graded: graded.length,
    passed,
    failed: results.length - passed,
    notAsked: total - results.length,
    passRate: results.length ? Number((passed / results.length).toFixed(3)) : null,
    byKind: Object.fromEntries(Object.entries(byKind).sort((a, b) => b[1] - a[1])),
    byGroup,
  };
}
