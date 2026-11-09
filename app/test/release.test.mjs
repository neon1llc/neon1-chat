// app/test/release.test.mjs - Release identity: the health check names the commit and corpus,
// and the deploy check passes only for the build it expects. Fetches are faked.

import { test } from "node:test";
import assert from "node:assert/strict";
import { compare, verify } from "../../scripts/verify-release.mjs";
import { readCorpus } from "../src/corpus.mjs";

process.env.EDGE_CHECK = "off";
const { handler } = await import("../src/handler.mjs");

const want = { commit: "c".repeat(40), corpus: "sha256:" + "d".repeat(64), lock: "sha256:" + "e".repeat(64) };
const answer = (body, status = 200) => async () => new Response(JSON.stringify(body), { status });

test("health reports the corpus being served and makes no AWS call", async () => {
  const res = await handler({ rawPath: "/chat/api/health", requestContext: { http: { method: "GET" } }, headers: {} }, { dynamo: { send: () => assert.fail("no AWS") } });
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.corpus, readCorpus().digest);
  assert.equal(typeof body.commit, "string");
  assert.equal(res.headers["cache-control"], "no-store");
});

test("the deploy check passes for the intended build", async () => {
  assert.deepEqual(await verify("https://health.invalid/", want, { fetch: answer({ ok: true, ...want }), wait: async () => {} }), []);
});

test("the deploy check fails for a stale commit or corpus, after its retries", async () => {
  let calls = 0;
  const stale = async () => (calls++, new Response(JSON.stringify({ ok: true, ...want, commit: "0".repeat(40) })));
  const problems = await verify("https://health.invalid/", want, { fetch: stale, attempts: 3, wait: async () => {} });
  assert.equal(calls, 3);
  assert.match(problems[0], /^commit: serving 0{40}, expected c{40}$/);
  assert.deepEqual(compare(want, { ok: true, ...want, corpus: "sha256:old" }), [`corpus: serving sha256:old, expected ${want.corpus}`]);
  assert.deepEqual(compare(want, { ok: true }).length, 3, "an old build without identity fields fails");
});

test("the deploy check fails on an error status or an unreachable endpoint", async () => {
  assert.match((await verify("https://health.invalid/", want, { fetch: answer({}, 503), attempts: 1 }))[0], /HTTP 503/);
  const down = async () => { throw Object.assign(new Error("synthetic"), { name: "TypeError" }); };
  assert.match((await verify("https://health.invalid/", want, { fetch: down, attempts: 1 }))[0], /unreachable/);
});

test("a check that recovers within its retries passes", async () => {
  let calls = 0;
  const later = async () => new Response(JSON.stringify(++calls < 3 ? { ok: true, ...want, commit: "old" } : { ok: true, ...want }));
  assert.deepEqual(await verify("https://health.invalid/", want, { fetch: later, wait: async () => {} }), []);
});
