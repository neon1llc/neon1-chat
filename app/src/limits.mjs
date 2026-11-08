// app/src/limits.mjs - Per-visitor and daily caps, counted in DynamoDB.
//
// Counters are keyed by a salted hash of the visitor's address and the hour, so the
// table never holds an IP address, and every item expires on its own.

import { createHash } from "node:crypto";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

let defaultClient;

// A short, one-way key: the same visitor in the same hour maps to the same counter
export function visitorKey(ip, now = new Date(), salt = process.env.HASH_SALT ?? "") {
  const hour = now.toISOString().slice(0, 13);
  const hash = createHash("sha256").update(`${salt}|${ip}|${hour.slice(0, 10)}`).digest("hex").slice(0, 16);
  return `ip#${hash}#${hour}`;
}

// Add one to a counter unless it has reached max; returns false when it has
async function bump(client, table, pk, max, ttl) {
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
    );
    return true;
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") return false;
    throw err;
  }
}

// The visitor's hourly cap first, then the site-wide daily cap that bounds spend
export async function allow(ip, { table, perHour, perDay, client, now = new Date() }) {
  client ??= defaultClient ??= new DynamoDBClient({});
  const epoch = Math.floor(now.getTime() / 1000);

  if (!(await bump(client, table, visitorKey(ip, now), perHour, epoch + 2 * 3600))) return "visitor";
  if (!(await bump(client, table, `day#${now.toISOString().slice(0, 10)}`, perDay, epoch + 3 * 86400))) return "daily";
  return null;
}
