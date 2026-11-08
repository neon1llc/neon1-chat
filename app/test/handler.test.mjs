// app/test/handler.test.mjs - Request checks, caps, and replies, with AWS faked out.

import { test } from "node:test";

// Unit tests call the handler directly, as CloudFront would after its own check
process.env.EDGE_CHECK = "off";
import assert from "node:assert/strict";
import { handler, validate, viewerIp } from "../src/handler.mjs";
import { systemPrompt, loadCorpus } from "../src/chat.mjs";
import { visitorKey } from "../src/limits.mjs";

// A fake AWS client: counts calls and answers like the real API would
function fake(answer) {
  const calls = [];
  return { calls, send: async (cmd) => (calls.push(cmd.input), answer(cmd.input, calls.length)) };
}

const bedrock = () =>
  fake(() => ({ output: { message: { content: [{ text: "neon1 can help with that." }] } }, usage: { inputTokens: 9 }, stopReason: "end_turn" }));

// An HTTP API event shaped like CloudFront's forwarded request
const event = (body, extra = {}) => ({
  rawPath: "/chat/api/chat",
  requestContext: { http: { method: "POST", sourceIp: "203.0.113.9" } },
  headers: { "cloudfront-viewer-address": "198.51.100.7:51234" },
  body: JSON.stringify(body),
  ...extra,
});

test("health answers without touching AWS", async () => {
  const res = await handler({ rawPath: "/chat/api/health", requestContext: { http: { method: "GET" } }, headers: {} });
  assert.equal(res.statusCode, 200);
});

test("a valid question gets a reply and two counter writes", async () => {
  const dynamo = fake(() => ({}));
  const model = bedrock();
  const res = await handler(event({ messages: [{ role: "user", content: "What do you do?" }] }), { dynamo, bedrock: model });
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).reply, "neon1 can help with that.");
  assert.equal(dynamo.calls.length, 2);
  assert.equal(model.calls[0].messages[0].content[0].text, "What do you do?");
});

test("the visitor cap stops the request before the model is called", async () => {
  const dynamo = fake(() => {
    throw Object.assign(new Error("cap"), { name: "ConditionalCheckFailedException" });
  });
  const model = bedrock();
  const res = await handler(event({ messages: [{ role: "user", content: "hi" }] }), { dynamo, bedrock: model });
  assert.equal(res.statusCode, 429);
  assert.equal(model.calls.length, 0);
});

test("malformed or oversized conversations are rejected", () => {
  assert.equal(validate({ messages: [] }), null);
  assert.equal(validate({ messages: [{ role: "assistant", content: "hi" }] }), null);
  assert.equal(validate({ messages: [{ role: "user", content: "x".repeat(1201) }] }), null);
  assert.equal(validate({ messages: [{ role: "user", content: "a" }, { role: "assistant", content: "b" }] }), null);
  assert.deepEqual(validate({ messages: [{ role: "user", content: " hi " }] }), [{ role: "user", content: "hi" }]);
});

test("without a configured secret, the edge check fails closed", async () => {
  delete process.env.EDGE_CHECK;
  try {
    const res = await handler(event({ messages: [{ role: "user", content: "hi" }] }));
    assert.equal(res.statusCode, 403);
  } finally {
    process.env.EDGE_CHECK = "off";
  }
});

test("requests without the edge secret are refused when one is set", async () => {
  process.env.ORIGIN_SECRET = "s3cret-value";
  try {
    const res = await handler(event({ messages: [{ role: "user", content: "hi" }] }));
    assert.equal(res.statusCode, 403);
  } finally {
    delete process.env.ORIGIN_SECRET;
  }
});

test("viewer address drops the port, IPv4 and IPv6 alike", () => {
  assert.equal(viewerIp({ headers: { "cloudfront-viewer-address": "198.51.100.7:443" } }), "198.51.100.7");
  assert.equal(viewerIp({ headers: { "cloudfront-viewer-address": "2001:db8::1:443" } }), "2001:db8::1");
});

test("counter keys hold no address and roll over each hour", () => {
  const key = visitorKey("198.51.100.7", new Date("2026-11-08T15:30:00Z"), "salt");
  assert.match(key, /^ip#[0-9a-f]{16}#2026-11-08T15$/);
  assert.ok(!key.includes("198"));
});

test("the prompt carries the public sources and the grounding rules", () => {
  const prompt = systemPrompt(loadCorpus());
  assert.match(prompt, /Answer only from the SOURCES/);
  assert.match(prompt, /1 is glad to be of service/);
});

test("invented links become the home page; real ones and Markdown labels survive", async () => {
  const { cleanLinks, allowedLinks } = await import("../src/chat.mjs");
  const allowed = allowedLinks("book a call (https://calendly.com/x/neon1) or 1NEON (https://neon1.tech/1NEON/)");
  assert.equal(cleanLinks("See [contact](https://neon1.tech/contact).", allowed), "See contact (https://neon1.tech).");
  assert.equal(cleanLinks("Book at https://calendly.com/x/neon1.", allowed), "Book at https://calendly.com/x/neon1.");
  assert.equal(cleanLinks("Visit [neon1.tech/1NEON](https://neon1.tech/1NEON).", allowed), "Visit https://neon1.tech/1NEON.");
});
