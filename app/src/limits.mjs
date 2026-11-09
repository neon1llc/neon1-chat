// app/src/limits.mjs - Per-visitor and daily caps, and escalating cooldowns, counted in DynamoDB.
//
// Counters are keyed by a salted hash of the visitor's network (an IPv4 address, or an IPv6 /64,
// since one home or phone gets a whole /64) and the time window, so the table never holds an
// address, and every item expires on its own.
//
// A visitor who trips a cap gets a cooldown, and each strike within a day earns a longer one:
// 2 minutes, then 10, then an hour, then a day. Messages sent while cooling down are not answered,
// and pushing on through one (three tries) counts as another strike. Strikes are forgiven after a
// quiet day. Asking the same question over and over, or repeatedly trying to misuse Neo (as the
// model flags it), earns strikes the same way.

import { createHash } from "node:crypto";
import { isIPv6 } from "node:net";
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

let defaultClient;

// One retry at most, with short socket timeouts: the handler's deadline covers the whole request,
// and a counter that can't be written means the request is refused, never let through
const CLIENT = { maxAttempts: 2, requestHandler: { connectionTimeout: 1000, requestTimeout: 3000 } };

// ---- Policy ----

// Cooldown for the 1st, 2nd, 3rd, and every later strike, in seconds
export const LADDER = [120, 600, 3600, 86400];
// A strike is forgotten when a day passes without another one
export const FORGIVE = 86400;
// Tries during a cooldown before it counts as another strike (the window holds the send button,
// so only a reload or a script gets this far)
export const PUSHES = 3;
// The same question this many times in ten minutes is a strike
export const REPEATS = 3;
// Shorter messages ("thanks", "ok", "yes") are left out of the repeat check, since people say them often
export const REPEAT_MIN = 15;
// Flagged messages (attempts to change Neo's rules, abuse, persistent off-topic) per hour per strike
export const MISUSE = 3;

// ---- Keys ----

// The network a visitor speaks from: an IPv4 address, or the first 64 bits of an IPv6 one
export function network(ip) {
  if (!isIPv6(ip)) return ip;
  const [head, tail = ""] = ip.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const full = ip.includes("::") ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right] : left;
  return `${full.slice(0, 4).map((h) => h.toLowerCase().replace(/^0+(?=.)/, "")).join(":")}::/64`;
}

const hash = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);

// A short, one-way key per visitor and time window: "16" is the minute, "13" the hour
export function visitorKey(ip, now = new Date(), salt = process.env.HASH_SALT ?? "", width = 13) {
  return `ip#${hash(`${salt}|${network(ip)}|${now.toISOString().slice(0, 10)}`)}#${now.toISOString().slice(0, width)}`;
}

// A visitor's strike record; not dated, so a cooldown and its strikes carry across midnight
export const penaltyKey = (ip, salt = process.env.HASH_SALT ?? "") => `pen#${hash(`${salt}|penalty|${network(ip)}`)}`;

// One-way fingerprint of a question, kept for ten minutes only to notice the same text sent again;
// null for short messages, which are never counted
export function repeatKey(ip, question, now = new Date(), salt = process.env.HASH_SALT ?? "") {
  const text = question.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (text.length < REPEAT_MIN) return null;
  return `rep#${hash(`${salt}|${network(ip)}|${text}`)}#${Math.floor(now.getTime() / 600000)}`;
}

const misuseKey = (ip, now, salt = process.env.HASH_SALT ?? "") => `mis#${hash(`${salt}|misuse|${network(ip)}`)}#${now.toISOString().slice(0, 13)}`;

// ---- Store operations ----

// Add one to a counter unless it has reached max; returns false when it has. Any other
// failure is thrown, so the caller refuses the request rather than skipping the cap
async function bump(client, table, pk, max, ttl, signal) {
  try {
    await client.send(
      new UpdateItemCommand({
        TableName: table,
        Key: { pk: { S: pk } },
        UpdateExpression: "ADD n :one SET #ttl = if_not_exists(#ttl, :ttl)",
        ConditionExpression: "attribute_not_exists(n) OR n < :max",
        ExpressionAttributeNames: { "#ttl": "ttl" },
        ExpressionAttributeValues: { ":one": { N: "1" }, ":max": { N: String(max) }, ":ttl": { N: String(ttl) } },
      }),
      { abortSignal: signal },
    );
    return true;
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") return false;
    throw err;
  }
}

// Add one to a counter with no ceiling and return its new value
async function count(client, table, pk, ttl, signal) {
  const res = await client.send(
    new UpdateItemCommand({
      TableName: table,
      Key: { pk: { S: pk } },
      UpdateExpression: "ADD n :one SET #ttl = if_not_exists(#ttl, :ttl)",
      ExpressionAttributeNames: { "#ttl": "ttl" },
      ExpressionAttributeValues: { ":one": { N: "1" }, ":ttl": { N: String(ttl) } },
      ReturnValues: "UPDATED_NEW",
    }),
    { abortSignal: signal },
  );
  return Number(res?.Attributes?.n?.N ?? 1);
}

// The visitor's strike record, or an empty one
async function readPenalty(client, table, pk, signal) {
  const res = await client.send(new GetItemCommand({ TableName: table, Key: { pk: { S: pk } }, ConsistentRead: true }), { abortSignal: signal });
  const n = (k) => Number(res?.Item?.[k]?.N ?? 0);
  return { level: n("level"), until: n("until"), last: n("last"), why: res?.Item?.why?.S ?? "burst" };
}

/**
 * Record a strike and start its cooldown. Strikes within a day of the last one climb the ladder;
 * after a quiet day the ladder starts over. Returns the cooldown: { level, retry } in seconds.
 */
async function strike(client, table, pk, prior, epoch, signal, why) {
  const level = prior.last && epoch - prior.last < FORGIVE ? prior.level + 1 : 1;
  const retry = LADDER[Math.min(level, LADDER.length) - 1];
  await client.send(
    new UpdateItemCommand({
      TableName: table,
      Key: { pk: { S: pk } },
      UpdateExpression: "SET #level = :level, #until = :until, #last = :now, #ttl = :ttl, why = :why",
      ExpressionAttributeNames: { "#level": "level", "#until": "until", "#last": "last", "#ttl": "ttl" },
      ExpressionAttributeValues: {
        ":level": { N: String(level) },
        ":until": { N: String(epoch + retry) },
        ":now": { N: String(epoch) },
        ":why": { S: why },
        ":ttl": { N: String(epoch + retry + FORGIVE) },
      },
    }),
    { abortSignal: signal },
  );
  return { level, retry };
}

// ---- The checks ----

/**
 * Whether this visitor may ask now. Returns null when the question may go to the model, or
 * { blocked, retry, level, reason, waiting } where blocked is "cooldown" (retry seconds left; reason
 * says what earned it, and waiting is true when the strike came earlier rather than with this message)
 * or "daily" (the whole site's cap).
 *
 * The writes are separate, not one transaction: a later refusal still spends the earlier counts,
 * which errs on the strict side.
 */
export async function allow(ip, { table, perMinute, perHour, perDay, question, client, signal, now = new Date() }) {
  client ??= defaultClient ??= new DynamoDBClient(CLIENT);
  const epoch = Math.floor(now.getTime() / 1000);
  const pen = penaltyKey(ip);
  const prior = await readPenalty(client, table, pen, signal);
  const cool = (reason) => async () => ({ blocked: "cooldown", reason, ...(await strike(client, table, pen, prior, epoch, signal, reason)) });

  // Still cooling down: no answer, and pushing on through it is a strike of its own
  if (prior.until > epoch) {
    // Counted per cooldown (keyed by its end), so each new cooldown starts with no tries
    const tries = await count(client, table, `${pen}#push#${prior.until}`, prior.until + 60, signal);
    if (tries >= PUSHES) return cool("pushing")();
    return { blocked: "cooldown", reason: prior.why, waiting: true, level: prior.level, retry: prior.until - epoch };
  }

  // The same words again and again, from the same network, within ten minutes
  const rep = question ? repeatKey(ip, question, now) : null;
  if (rep && !(await bump(client, table, rep, REPEATS - 1, epoch + 900, signal))) return cool("repeat")();

  // A burst limit per minute keeps one visitor from flooding, and a generous hourly ceiling stops scripts
  if (!(await bump(client, table, visitorKey(ip, now, undefined, 16), perMinute, epoch + 300, signal))) return cool("burst")();
  if (!(await bump(client, table, visitorKey(ip, now), perHour, epoch + 2 * 3600, signal))) return cool("hourly")();

  // The site-wide daily cap bounds spend; it's nobody's fault, so it's not a strike
  if (!(await bump(client, table, `day#${now.toISOString().slice(0, 10)}`, perDay, epoch + 3 * 86400, signal))) {
    return { blocked: "daily", retry: 86400 - (epoch % 86400) };
  }
  return null;
}

/**
 * Note a message the model flagged as misuse (trying to change Neo's rules, abuse, or off-topic
 * again and again). Every MISUSE flags in an hour is a strike; the reply already given still stands,
 * and the cooldown applies from the next message. Returns the cooldown it started, if any.
 */
export async function misuse(ip, { table, client, signal, now = new Date() }) {
  client ??= defaultClient ??= new DynamoDBClient(CLIENT);
  const epoch = Math.floor(now.getTime() / 1000);
  const flags = await count(client, table, misuseKey(ip, now), epoch + 2 * 3600, signal);
  if (flags % MISUSE !== 0) return null;
  const pen = penaltyKey(ip);
  return strike(client, table, pen, await readPenalty(client, table, pen, signal), epoch, signal, "misuse");
}
