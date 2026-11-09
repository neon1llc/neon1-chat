// app/src/limits.mjs - Per-visitor and daily caps, counted in DynamoDB.
//
// Counters are keyed by a salted hash of the visitor's address and the time window, so the
// table never holds an IP address, and every item expires on its own.

import { createHash } from "node:crypto";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

let defaultClient;

// One retry at most, with short socket timeouts: the handler's deadline covers the whole request,
// and a counter that can't be written means the request is refused, never let through
const CLIENT = { maxAttempts: 2, requestHandler: { connectionTimeout: 1000, requestTimeout: 3000 } };

// A short, one-way key per visitor and time window: "16" is the minute, "13" the hour
export function visitorKey(ip, now = new Date(), salt = process.env.HASH_SALT ?? "", width = 13) {
  const hash = createHash("sha256").update(`${salt}|${ip}|${now.toISOString().slice(0, 10)}`).digest("hex").slice(0, 16);
  return `ip#${hash}#${now.toISOString().slice(0, width)}`;
}

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

// A burst limit per minute keeps one visitor from flooding, a generous hourly ceiling stops
// scripts, and the site-wide daily cap bounds spend. The three writes are separate, not one
// transaction: a later refusal still spends the earlier counts, which errs on the strict side
export async function allow(ip, { table, perMinute, perHour, perDay, client, signal, now = new Date() }) {
  client ??= defaultClient ??= new DynamoDBClient(CLIENT);
  const epoch = Math.floor(now.getTime() / 1000);

  if (!(await bump(client, table, visitorKey(ip, now, undefined, 16), perMinute, epoch + 300, signal))) return "burst";
  if (!(await bump(client, table, visitorKey(ip, now), perHour, epoch + 2 * 3600, signal))) return "visitor";
  if (!(await bump(client, table, `day#${now.toISOString().slice(0, 10)}`, perDay, epoch + 3 * 86400, signal))) return "daily";
  return null;
}
