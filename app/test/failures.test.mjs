// app/test/failures.test.mjs - Dependency failures end in safe, uncached JSON: a counter store
// that fails at any of its three writes, the request deadline, and model errors. Quotas are never
// skipped, the model is never called when the caps can't be counted, and no message text or raw
// error message reaches the logs. Timers are faked, so nothing here waits in real time.

import { test, mock } from "node:test";
import assert from "node:assert/strict";

process.env.EDGE_CHECK = "off";
const { handler, DEADLINE_MS } = await import("../src/handler.mjs");

// A secret-looking question, so the log checks below would catch it if it leaked
const QUESTION = "Synthetic private detail 4417, please keep";
const event = () => ({
  rawPath: "/chat/api/chat",
  requestContext: { http: { method: "POST", sourceIp: "203.0.113.3" } },
  headers: { "cloudfront-viewer-address": "198.51.100.4:1234" },
  body: JSON.stringify({ messages: [{ role: "user", content: QUESTION }] }),
});

// Fake clients: a model that counts its calls, and a store whose nth write does `fail`
function model(answer = async () => ({ output: { message: { content: [{ text: "Synthetic answer." }] } }, stopReason: "end_turn" })) {
  const m = { calls: 0, send: async (...args) => (m.calls++, answer(...args)) };
  return m;
}
const store = (failAt, fail) => {
  let n = 0;
  return { send: async () => (++n === failAt ? fail() : {}) };
};

// Capture what the handler logs, to prove no question text or provider message is written
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

const safe = (res, status) => {
  assert.equal(res.statusCode, status);
  assert.equal(res.headers["cache-control"], "no-store");
  assert.match(res.headers["content-type"], /application\/json/);
  const body = JSON.parse(res.body);
  assert.equal(typeof body.code, "string");
  assert.equal(typeof body.error, "string");
  return body;
};

// ---- The counter store ----

for (const failAt of [1, 2, 3]) {
  test(`a store outage at counter write ${failAt} returns 503 and never calls the model`, async () => {
    const m = model();
    const outage = () => {
      throw Object.assign(new Error(`synthetic outage echoing ${QUESTION}`), { name: "ProvisionedThroughputExceededException", $metadata: { httpStatusCode: 400 } });
    };
    const { result, lines } = await logged(() => handler(event(), { dynamo: store(failAt, outage), bedrock: m }));
    const body = safe(result, 503);
    assert.equal(body.code, "unavailable");
    assert.ok(Number(result.headers["retry-after"]) > 0);
    assert.equal(m.calls, 0);
    assert.ok(lines.every((l) => !l.includes("4417") && !l.includes("synthetic outage")));
    assert.match(lines.join("\n"), /"event":"limit_error","name":"ProvisionedThroughputExceededException","status":400/);
  });
}

test("all three caps still answer 429 with their own codes, before the model", async () => {
  const capped = () => {
    throw Object.assign(new Error("cap"), { name: "ConditionalCheckFailedException" });
  };
  for (const [failAt, code] of [[1, "burst"], [2, "visitor"], [3, "daily"]]) {
    const m = model();
    const res = await handler(event(), { dynamo: store(failAt, capped), bedrock: m });
    assert.equal(safe(res, 429).code, code);
    assert.equal(m.calls, 0);
  }
});

test("caps that aren't whole positive numbers fail closed before any write or model call", async () => {
  process.env.PER_MINUTE = "0";
  try {
    const m = model();
    let writes = 0;
    const { result } = await logged(() => handler(event(), { dynamo: { send: async () => (writes++, {}) }, bedrock: m }));
    assert.equal(safe(result, 503).code, "unavailable");
    assert.equal(writes + m.calls, 0);
  } finally {
    delete process.env.PER_MINUTE;
  }
});

// ---- The request deadline ----

test("a store that never answers ends at the deadline with 503 and no model call", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const m = model();
  let aborted = false;
  const hang = { send: (_cmd, opts) => new Promise(() => opts?.abortSignal?.addEventListener("abort", () => (aborted = true))) };
  const pending = logged(() => handler(event(), { dynamo: hang, bedrock: m }));
  t.mock.timers.tick(DEADLINE_MS);
  const { result } = await pending;
  assert.equal(safe(result, 503).code, "unavailable");
  assert.ok(aborted, "the SDK call is told to stop");
  assert.equal(m.calls, 0);
});

test("a model that never answers ends at the deadline with 504", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  let aborted = false;
  const slow = model((_cmd, opts) => new Promise(() => opts?.abortSignal?.addEventListener("abort", () => (aborted = true))));
  const pending = logged(() => handler(event(), { dynamo: store(0), bedrock: slow }));
  // Let the three counter writes settle so the model call has started
  await new Promise((r) => setImmediate(r));
  t.mock.timers.tick(DEADLINE_MS);
  const { result, lines } = await pending;
  assert.equal(safe(result, 504).code, "timeout");
  assert.ok(aborted);
  assert.equal(slow.calls, 1);
  assert.ok(lines.every((l) => !l.includes("4417")));
});

test("the deadline sits safely inside the function's 20-second timeout", () => {
  assert.ok(DEADLINE_MS <= 15000);
});

// ---- Model failures ----

test("model throttling, an empty reply, and malformed output each return safe JSON", async () => {
  const cases = [
    [async () => { throw Object.assign(new Error(`throttled: ${QUESTION}`), { name: "ThrottlingException", $metadata: { httpStatusCode: 429 } }); }, 503, "busy"],
    [async () => ({ output: { message: { content: [{ text: "   " }] } }, stopReason: "end_turn" }), 502, "unavailable"],
    [async () => ({ output: null }), 502, "unavailable"],
    [async () => ({ output: { message: { content: "not a list" } } }), 502, "unavailable"],
    [async () => { throw Object.assign(new Error(`validation: ${QUESTION}`), { name: "ValidationException" }); }, 502, "unavailable"],
  ];
  for (const [answer, status, code] of cases) {
    const { result, lines } = await logged(() => handler(event(), { dynamo: store(0), bedrock: model(answer) }));
    assert.equal(safe(result, status).code, code);
    assert.ok(lines.every((l) => !l.includes("4417") && !l.includes("throttled:") && !l.includes("validation:")), lines.join("\n"));
  }
});

test("a malformed body is refused with safe JSON before any write", async () => {
  let writes = 0;
  const res = await handler({ ...event(), body: "{not json" }, { dynamo: { send: async () => (writes++, {}) } });
  assert.equal(safe(res, 400).code, "invalid");
  assert.equal(writes, 0);
});
