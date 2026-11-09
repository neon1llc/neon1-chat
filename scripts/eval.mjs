// scripts/eval.mjs - Run the synthetic test set (scripts/eval-cases.mjs) against the live model.
// Usage: AWS_PROFILE=... AWS_REGION=us-east-1 [MODEL_ID=...] node scripts/eval.mjs
//
// Run it after changing the prompt, the corpus, or the model. It calls Bedrock with the same
// prompt and limits the Lambda uses, one call per case (a few cents a run), and exits non-zero
// if any check fails. Read the printed answers too: a pattern match is a floor, not proof that
// every claim is backed by the sources.

import { CASES } from "./eval-cases.mjs";

const { reply, loadCorpus, loadDirectives, allowedLinks } = await import("../app/src/chat.mjs");
const { LIMITS, check } = await import("../app/src/contract.mjs");

const corpus = loadCorpus();
const directives = loadDirectives();
const allowed = allowedLinks(`${directives}\n${corpus}`);
const LINKS = /\]\(([^)\s]+)\)/g;

// The same words written differently still count: narrow and no-break spaces as spaces, "p.m." as "pm",
// and hyphenated ranges ("two-to-four") as spaced ones. Only the must and not patterns see this form
const plain = (text) =>
  text
    .replace(/[\u00a0\u202f\u2009]/g, " ")
    .replace(/\b([ap])\.m\./gi, "$1m")
    .replace(/(\w)-to-(\w)/g, "$1 to $2");
let failed = 0;

for (const c of CASES) {
  const { messages } = check({ messages: c.turns });
  const { text, flagged } = await reply(messages, { corpus, directives });

  // Checks every answer gets: within the reply bound, and every link one the sources contain
  const links = [...text.matchAll(LINKS)].map((m) => m[1].replace(/\/$/, ""));
  const said = plain(text);
  const misses = [
    ...(c.must ?? []).filter((re) => !re.test(said)).map((re) => `missing ${re}`),
    ...(c.not ?? []).filter((re) => re.test(said)).map((re) => `contains ${re}`),
    ...links.filter((url) => !allowed.has(url)).map((url) => `unlisted link ${url}`),
    ...(text.length > LIMITS.reply ? [`${text.length} characters, over ${LIMITS.reply}`] : []),
    ...(c.flagged !== undefined && c.flagged !== flagged ? [`flagged ${flagged}, expected ${c.flagged}`] : []),
    ...(/\[\[|flag\]/i.test(text) ? ["the misuse marker leaked"] : []),
  ];
  if (misses.length) failed++;
  console.log(`${misses.length ? "FAIL" : "ok  "} [${c.group}] ${c.id}: ${c.turns.at(-1).content}\n     ${text.replace(/\n/g, " ")}${misses.length ? `\n     ${misses.join("; ")}` : ""}`);
}

// Never the same twice: the same greeting, asked three times, gets at least two different replies
const greet = [];
for (let i = 0; i < 3; i++) greet.push((await reply([{ role: "user", content: "Hello, who are you?" }], { corpus, directives })).text);
const varied = new Set(greet).size >= 2;
if (!varied) failed++;
console.log(`${varied ? "ok  " : "FAIL"} [persona] variety: ${new Set(greet).size} different replies to the same greeting\n     ${greet.join("\n     ")}`);

console.log(`\n${CASES.length + 1 - failed}/${CASES.length + 1} passed`);
process.exit(failed ? 1 : 0);
