// Offline handler checks for throttling, deadlines, incomplete model output, and private-text logging.


import { test } from "node:test";
import assert from "node:assert/strict";


process.env.EDGE_CHECK = "off";
const { handler, DEADLINE_MS } = await import("../src/handler.mjs");

const QUESTION = "Synthetic private detail 9073";
const PARTIAL = "Synthetic unfinished answer 6284";
const event = () => ({
  rawPath: "/chat/api/chat",
  requestContext: { http: { method: "POST", sourceIp: "203.0.113.3" } },
  headers: { "cloudfront-viewer-address": "198.51.100.4:1234" },
  body: JSON.stringify({ messages: [{ role: "user", content: QUESTION }] }),
});
const limits = { send: async () => ({}) };

async function logged(run) {
  const lines = [];
  const restore = [console.log, console.error];
  console.log = console.error = (line) => lines.push(String(line));
  try {
    return { result: await run(), lines };
  } finally {
    [console.log, console.error] = restore;
  }
}

function expectSafe(result, status, code) {
  assert.equal(result.statusCode, status);
  assert.equal(result.headers["cache-control"], "no-store");
  assert.match(result.headers["content-type"], /application\/json/);
  assert.equal(JSON.parse(result.body).code, code);
  return JSON.parse(result.body);
}


test("a provider throttle returns a retryable 503 without leaking either message into logs", async () => {
  const model = { calls: 0, send: async () => {
    model.calls++;
    throw Object.assign(new Error(`throttled after ${QUESTION}`), { name: "ThrottlingException", $metadata: { httpStatusCode: 429 } });
  } };
  const { result, lines } = await logged(() => handler(event(), { dynamo: limits, bedrock: model }));
  const body = expectSafe(result, 503, "busy");
  assert.equal(result.headers["retry-after"], "60");
  assert.match(body.error, /Pradeep can help directly/);
  assert.equal(model.calls, 1);
  assert.equal(lines.length, 1);
  assert.deepEqual(JSON.parse(lines[0]), { event: "chat_error", name: "ThrottlingException", status: 429 });
  assert.ok(lines.every((line) => !line.includes("9073") && !line.includes("throttled after")));
});


test("a hanging model is aborted at the request deadline and logs no visitor text", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  let signal;
  const model = { calls: 0, send: (_cmd, options) => {
    model.calls++;
    signal = options.abortSignal;
    return new Promise(() => signal.addEventListener("abort", () => {}, { once: true }));
  } };
  const pending = logged(() => handler(event(), { dynamo: limits, bedrock: model }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(model.calls, 1);
  t.mock.timers.tick(DEADLINE_MS);
  const { result, lines } = await pending;
  expectSafe(result, 504, "timeout");
  assert.equal(result.headers["retry-after"], "10");
  assert.equal(signal.aborted, true);
  const logs = lines.map((line) => JSON.parse(line));
  assert.ok(logs.some((log) => log.event === "chat_error" && log.name === "Timeout"));
  assert.ok(lines.every((line) => !line.includes("9073")));
});


test("a max-token partial answer ends at a complete sentence or marked whole word, and stays out of logs", async () => {
  const model = { send: async () => ({
    output: { message: { content: [{ text: `${PARTIAL} without a complete ending` }] } },
    stopReason: "max_tokens",
    usage: { inputTokens: 12, outputTokens: 8 },
  }) };
  const { result, lines } = await logged(() => handler(event(), { dynamo: limits, bedrock: model }));
  assert.equal(result.statusCode, 200);
  const reply = JSON.parse(result.body).reply;
  assert.match(reply, /a complete…$/);
  assert.ok(!reply.includes("ending"));
  assert.equal(lines.length, 1);
  const log = JSON.parse(lines[0]);
  assert.deepEqual({ ...log, ms: undefined }, { event: "chat", turns: 1, ms: undefined, stop: "max_tokens", flagged: false, attempts: 1, usage: { inputTokens: 12, outputTokens: 8 } });
  assert.equal(typeof log.ms, "number");
  assert.ok(lines.every((line) => !line.includes("9073") && !line.includes("6284")));
});


test("a provider failure after partial content fails closed without logging the partial text", async () => {
  const model = { send: async () => {
    const err = Object.assign(new Error(`${PARTIAL} then connection reset`), { name: "StreamError", $metadata: { httpStatusCode: 502 } });
    throw err;
  } };
  const { result, lines } = await logged(() => handler(event(), { dynamo: limits, bedrock: model }));
  expectSafe(result, 502, "unavailable");
  assert.equal(lines.length, 1);
  assert.deepEqual(JSON.parse(lines[0]), { event: "chat_error", name: "StreamError", status: 502 });
  assert.ok(lines.every((line) => !line.includes("9073") && !line.includes("6284") && !line.includes("connection reset")));
});
