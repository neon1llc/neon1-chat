// app/test/neo.test.mjs - What Neo may say: the scope switch, published prices only, and a person
// offered whenever Neo is limited or failing. No model is called.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

process.env.EDGE_CHECK = "off";
const { BOOKING, EMAIL, HUMAN, SCOPE, buildRequest, dollarFigures, loadCorpus, onlyPublishedPrices, publishedPrices, reply, systemPrompt } = await import("../src/chat.mjs");
const { cooldownText, withHuman } = await import("../src/handler.mjs");

const corpus = loadCorpus();

test("the human route is the one on neon1's contact page", () => {
  const contact = readFileSync(new URL("../corpus/corpus-company-contact.md", import.meta.url), "utf8");
  assert.ok(contact.includes(`mailto:${EMAIL}`));
  assert.ok(contact.includes(BOOKING));
  assert.match(contact, /free and 15 minutes/, "the route promises what the page does: a free 15-minute call");
  assert.match(HUMAN, /\[hello@neon1\.tech\]\(mailto:hello@neon1\.tech\)/);
});

test("the scope switch defaults to general help and narrows to neon1 only", () => {
  assert.equal(SCOPE, "general-help");
  const general = systemPrompt(corpus, "", "general-help");
  const narrow = systemPrompt(corpus, "", "neon1-only");
  assert.match(general, /SCOPE: general-help\nGeneral questions are welcome/);
  assert.match(narrow, /SCOPE: neon1-only\nAnswer about neon1 only/);
  assert.doesNotMatch(narrow, /General questions are welcome/);
  // An unknown value fails toward the narrow scope, never the wide one
  assert.match(systemPrompt(corpus, "", "typo"), /Answer about neon1 only/);
  // What never changes with scope: neon1 facts, prices, and commitments come only from the sources
  for (const p of [general, narrow]) {
    assert.match(p, /Dollar figures: use only the ones the SOURCES publish/);
    assert.match(p, /Never commit neon1/);
    assert.match(p, /offer Pradeep/);
  }
});

test("the request carries the visitor's turns unchanged and the same prompt every time", () => {
  const turns = [{ role: "user", content: "Does QuickBooks work with Square?" }];
  const req = buildRequest(turns, { corpus, directives: "D" });
  assert.equal(req.messages.at(-1).content[0].text, turns[0].content);
  assert.deepEqual(req.system, buildRequest([{ role: "user", content: "hi" }], { corpus, directives: "D" }).system);
});

test("the published prices are the pricing page's figures", () => {
  const prices = publishedPrices(corpus);
  for (const n of [150, 750, 1000, 3000]) assert.ok(prices.has(n), String(n));
  assert.ok(!prices.has(95));
  assert.equal(publishedPrices("no pricing page here").size, 0);
  assert.deepEqual(dollarFigures("From $1,000 to $3k, or 750 USD, or 1 500 $."), [1000, 3000, 750, 1500]);
});

test("a sentence with an unpublished price goes; published ranges stay", () => {
  const prices = publishedPrices(corpus);
  assert.equal(onlyPublishedPrices("Small fixes run $150 to $750. My rate is $95 an hour. Book a call.", prices), "Small fixes run $150 to $750. Book a call.");
  assert.equal(onlyPublishedPrices("- Fixes: $150 to $750\n- Hourly: $95", prices), "- Fixes: $150 to $750");
  assert.match(onlyPublishedPrices("It's $95 an hour.", prices), /^I can only give the price ranges neon1 publishes.*hello@neon1\.tech/);
});

test("a reply that invents a price loses it before the visitor sees it", async () => {
  const client = { send: async () => ({ output: { message: { content: [{ text: "S3 storage costs $0.023 per GB. neon1's workflow projects are usually $1,000 to $3,000." }] } }, stopReason: "end_turn" }) };
  const { text } = await reply([{ role: "user", content: "costs?" }], { corpus, client });
  assert.equal(text, "neon1's workflow projects are usually $1,000 to $3,000.");
});

test("every limit and failure message offers a person", () => {
  for (const reason of ["burst", "hourly", "pushing", "repeat", "misuse"]) {
    for (const retry of [120, 600, 3600, 86400]) {
      const text = cooldownText({ retry, reason });
      assert.ok(text.includes(`mailto:${EMAIL}`) && text.includes(BOOKING), `${reason} ${retry}`);
      assert.ok(text.length < 400);
    }
  }
  assert.match(withHuman("Neo is busy."), /^Neo is busy\. Pradeep can help directly: email \[hello@neon1\.tech\]/);
});
