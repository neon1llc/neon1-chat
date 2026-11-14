// app/eval/grade.mjs - Grade one of Neo's replies against a question's rules (questions.json).
//
// Pure functions, no network: run.mjs uses them for live and Bedrock runs, and the unit tests use
// them on written replies. A pattern match is a floor, not proof: read the replies too.

import { readFileSync } from "node:fs";
import { dollarFigures } from "../src/chat.mjs";

export { dollarFigures };

export const QUESTIONS_FILE = new URL("./questions.json", import.meta.url);

// The set, with every pattern compiled once (case-insensitive, Unicode)
export function loadQuestions(file = QUESTIONS_FILE) {
  const set = JSON.parse(readFileSync(file, "utf8"));
  const re = (list = []) => list.map((p) => new RegExp(p, "iu"));
  return set.questions.map((q) => ({
    ...q,
    turns: q.turns ?? [{ role: "user", content: q.q }],
    mustRe: re(q.must),
    notRe: re(q.not),
  }));
}

// ---- What every reply is checked for ----

// An offer of a person: the email address, the booking link, or words that send the visitor to
// Pradeep or the free call, in the languages the set uses
export const HUMAN =
  /hello@neon1\.tech|calendly\.com\/1isgladtobeofservice|\b(book|schedule)\b[^.\n]{0,40}\bcall\b|\bfree (15-minute )?call\b|\b15-minute call\b|\b(email|ask|reach|contact|talk (to|with)|write to) (Pradeep|neon1)\b|llamada|appel|电话|通话|预约/iu;

// A generic refusal, the dead end the audit called out: "I can only help with neon1", or "the site
// doesn't cover that, a short call can answer it" with nothing else to go on
export const REFUSAL =
  /\bthe (site|sources?) (doesn't|does not|don't|do not) (cover|define|say)[^.]{0,120}\.\s*A short call can answer|\bdoesn't (cover|define) [^.]{0,60}in its sources|\bI can only (help|answer|assist|talk)|\bonly (help|answer|assist) with (questions )?(about )?neon1|\boutside (of )?(my scope|what I can)|\b(can't|cannot) help with (that|this)\b|\bnot something I can help with/iu;

// A guarantee or promise in neon1's name; "no one can guarantee" and the like are fine
export const PROMISE = [
  /\b(I|neon1|we) (can |will )?(guarantee|promise)s?\b/iu,
  /(?<!\b(not|never|can't|cannot|can not|won't|doesn't|does not|no one can|nobody can|isn't|no)\s)\bguarantee[ds]?\b/iu,
];

// Film lines Neo no longer says
export const FILM = /there is no spoon|white rabbit|red pill|blue pill|I know kung fu|free your mind|wake up, Neo|the Matrix has you|d[ée]j[àa] vu/iu;

// Markdown link targets in a reply
const LINKS = /\]\(([^)\s]+)\)/g;

/**
 * The rules a reply breaks, as short strings; an empty list is a pass.
 * ctx: { allowed: Set of source URLs without a trailing slash, prices: Set of published figures,
 *        maxChars: the reply bound }
 */
export function grade(reply, q, { allowed, prices, maxChars = 1200 } = {}) {
  const text = plain(reply ?? "");
  const misses = [];
  if (!text.trim()) return ["empty reply"];

  // The question's own rules
  for (const re of q.mustRe ?? []) if (!re.test(text)) misses.push(`missing /${re.source}/`);
  for (const re of q.notRe ?? []) if (re.test(text)) misses.push(`contains /${re.source}/`);
  if (q.human && !HUMAN.test(text)) misses.push("no human offered");
  if (q.answers && REFUSAL.test(text)) misses.push("generic refusal");

  // Every reply: published prices only, no promises, real links, Neo's own voice, within bounds
  if (prices) for (const n of dollarFigures(text)) if (!prices.has(n)) misses.push(`unpublished price $${n.toLocaleString("en-US")}`);
  if (PROMISE.some((re) => re.test(text))) misses.push("promise or guarantee");
  if (allowed) for (const [, url] of reply.matchAll(LINKS)) if (!allowed.has(url.replace(/\/$/, ""))) misses.push(`unlisted link ${url}`);
  if (FILM.test(text)) misses.push("film line");
  if (/\[\[|flag\]/i.test(text)) misses.push("misuse marker leaked");
  if (reply.length > maxChars) misses.push(`${reply.length} characters, over ${maxChars}`);
  return misses;
}

// The same words written differently still count: odd spaces as spaces, curly apostrophes as
// straight ones, "p.m." as "pm", and "two-to-four" as "two to four"
export function plain(text) {
  return text
    .replace(/[   ]/g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/\b([ap])\.m\./gi, "$1m")
    .replace(/(\w)-to-(\w)/g, "$1 to $2");
}

// The kind of each miss, for the summary
export function kind(miss) {
  if (miss.startsWith("missing /")) return "missing required content";
  if (miss.startsWith("contains /")) return "forbidden content";
  if (miss.startsWith("unpublished price")) return "unpublished price";
  if (miss.startsWith("unlisted link")) return "unlisted link";
  if (/characters, over/.test(miss)) return "too long";
  return miss;
}
