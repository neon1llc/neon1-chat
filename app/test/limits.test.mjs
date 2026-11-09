// app/test/limits.test.mjs - Escalating cooldowns, repeats, misuse strikes, and IPv6 grouping,
// against an in-memory table that behaves like DynamoDB for the few expressions limits.mjs uses.

import { test } from "node:test";
import assert from "node:assert/strict";
import { allow, misuse, network, repeatKey, LADDER, FORGIVE, PUSHES } from "../src/limits.mjs";

// ---- An in-memory table for GetItem and the two UpdateItem shapes ----

function table() {
  const items = new Map();
  const send = async (cmd) => {
    const i = cmd.input;
    const pk = i.Key.pk.S;
    const item = items.get(pk) ?? {};
    if (cmd.constructor.name === "GetItemCommand") return items.has(pk) ? { Item: structuredClone(item) } : {};
    const v = i.ExpressionAttributeValues;
    if (i.UpdateExpression.startsWith("ADD n")) {
      const n = Number(item.n?.N ?? 0);
      if (i.ConditionExpression && n >= Number(v[":max"].N)) throw Object.assign(new Error("cap"), { name: "ConditionalCheckFailedException" });
      items.set(pk, { ...item, n: { N: String(n + 1) }, ttl: item.ttl ?? v[":ttl"] });
      return { Attributes: { n: { N: String(n + 1) } } };
    }
    items.set(pk, { ...item, level: v[":level"], until: v[":until"], last: v[":now"], ttl: v[":ttl"], why: v[":why"] });
    return {};
  };
  return { items, send };
}

const IP = "198.51.100.20";
const caps = { table: "t", perMinute: 6, perHour: 60, perDay: 500 };
const at = (iso) => new Date(iso);
const ask = (client, now, question = "What does a first project look like?", ip = IP) => allow(ip, { ...caps, client, now, question });

// Questions that differ, so the repeat check stays out of the burst tests
const q = (i) => `Tell me about service number ${i} please`;

test("a burst earns 2 minutes, then 10, then an hour, then a day", async () => {
  const db = table();
  let now = at("2026-11-09T10:00:00Z");
  const expected = LADDER;
  for (const [round, wait] of expected.entries()) {
    // Fill this minute's allowance, then one more trips the cap
    for (let i = 0; i < caps.perMinute; i++) assert.equal(await ask(db, now, q(`${round}-${i}`)), null, `round ${round} question ${i}`);
    const out = await ask(db, now, q(`${round}-x`));
    assert.deepEqual([out.blocked, out.reason, out.level, out.retry], ["cooldown", "burst", round + 1, wait]);
    // Waiting it out (a few seconds past the end) clears the way, in a fresh minute
    now = new Date(now.getTime() + (wait + 61) * 1000);
  }
});

test("a message during a cooldown isn't answered, and pushing on through it is another strike", async () => {
  const db = table();
  const now = at("2026-11-09T10:00:00Z");
  for (let i = 0; i < caps.perMinute; i++) await ask(db, now, q(i));
  assert.equal((await ask(db, now, q("x"))).retry, LADDER[0]);

  const later = new Date(now.getTime() + 30 * 1000);
  for (let i = 1; i < PUSHES; i++) {
    const out = await ask(db, later, q(`push-${i}`));
    assert.deepEqual([out.blocked, out.waiting, out.reason, out.retry], ["cooldown", true, "burst", LADDER[0] - 30]);
  }
  const pushed = await ask(db, later, q("push-last"));
  assert.deepEqual([pushed.reason, pushed.level, pushed.retry], ["pushing", 2, LADDER[1]]);
});

test("strikes are forgiven after a quiet day", async () => {
  const db = table();
  let now = at("2026-11-09T10:00:00Z");
  for (let i = 0; i < caps.perMinute; i++) await ask(db, now, q(i));
  assert.equal((await ask(db, now, q("x"))).level, 1);

  now = new Date(now.getTime() + (FORGIVE + 60) * 1000);
  for (let i = 0; i < caps.perMinute; i++) await ask(db, now, q(`next-${i}`));
  assert.equal((await ask(db, now, q("next-x"))).level, 1);
});

test("the same question three times in ten minutes is a strike; short replies like thanks never are", async () => {
  const db = table();
  const now = at("2026-11-09T10:00:00Z");
  const same = "How much does a website cost with neon1?";
  assert.equal(await ask(db, now, same), null);
  assert.equal(await ask(db, now, `  how much does a WEBSITE cost with neon1  `), null);
  const out = await ask(db, now, same);
  assert.deepEqual([out.blocked, out.reason], ["cooldown", "repeat"]);

  const other = table();
  for (let i = 0; i < 5; i++) assert.equal(await ask(other, new Date(now.getTime() + i * 61000), "thanks"), null);
  assert.equal(repeatKey(IP, "ok thanks"), null);
});

test("the site's daily cap is not anyone's strike", async () => {
  const db = table();
  const now = at("2026-11-09T23:00:00Z");
  const out = await allow(IP, { ...caps, perDay: 1, client: db, now, question: "first" }).then(() => allow("203.0.113.5", { ...caps, perDay: 1, client: db, now, question: "second" }));
  assert.deepEqual([out.blocked, out.retry], ["daily", 3600]);
  assert.ok(![...db.items.keys()].some((k) => k.startsWith("pen#") && db.items.get(k).until));
});

test("every third flagged message in an hour starts a cooldown from the next message", async () => {
  const db = table();
  const now = at("2026-11-09T10:00:00Z");
  assert.equal(await misuse(IP, { table: "t", client: db, now }), null);
  assert.equal(await misuse(IP, { table: "t", client: db, now }), null);
  assert.deepEqual(await misuse(IP, { table: "t", client: db, now }), { level: 1, retry: LADDER[0] });
  const next = await ask(db, now, q("after"));
  assert.deepEqual([next.blocked, next.reason, next.waiting], ["cooldown", "misuse", true]);
});

test("one IPv6 /64 is one visitor, and IPv4 addresses stay whole", async () => {
  assert.equal(network("2001:db8:aa:bb:1:2:3:4"), "2001:db8:aa:bb::/64");
  assert.equal(network("2001:0db8:00aa:00bb::9"), "2001:db8:aa:bb::/64");
  assert.equal(network("2001:db8::1"), "2001:db8:0:0::/64");
  assert.equal(network("198.51.100.7"), "198.51.100.7");

  // Rotating addresses inside one /64 doesn't reset the burst count
  const db = table();
  const now = at("2026-11-09T10:00:00Z");
  for (let i = 0; i < caps.perMinute; i++) assert.equal(await ask(db, now, q(i), `2001:db8:aa:bb::${i + 1}`), null);
  assert.equal((await ask(db, now, q("x"), "2001:db8:aa:bb::99")).blocked, "cooldown");
  assert.ok(![...db.items.keys()].some((k) => k.includes("2001") || k.includes("198.51")));
});
