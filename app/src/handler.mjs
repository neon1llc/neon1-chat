// app/src/handler.mjs - The HTTP API: a health check and one chat endpoint.
//
// The browser reaches this through neon1.tech/chat/api/*, so it is same-origin for the
// site and 1NEON and needs no CORS. Message text is never logged.

import { timingSafeEqual } from "node:crypto";
import { loadCorpus, reply } from "./chat.mjs";
import { allow } from "./limits.mjs";

// Input bounds keep each request small and cheap
export const LIMITS = { turns: 12, chars: 1200, total: 6000 };

const corpus = loadCorpus();

const config = () => ({
  table: process.env.TABLE_NAME,
  perMinute: Number(process.env.PER_MINUTE ?? 6),
  perHour: Number(process.env.PER_HOUR ?? 60),
  perDay: Number(process.env.PER_DAY ?? 500),
});

// JSON responses that are never cached
const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  body: JSON.stringify(body),
});

// Requests must come through CloudFront, which adds a secret header the public can't see.
// Without a configured secret everything is refused, unless local testing turns the check off
function fromEdge(headers) {
  const want = process.env.ORIGIN_SECRET;
  if (!want) return process.env.EDGE_CHECK === "off";
  const got = Buffer.from(headers["x-origin-verify"] ?? "");
  const exp = Buffer.from(want);
  return got.length === exp.length && timingSafeEqual(got, exp);
}

// CloudFront reports the viewer as "address:port"; the port is dropped
export function viewerIp(event) {
  const raw = event.headers?.["cloudfront-viewer-address"];
  if (raw) return raw.slice(0, raw.lastIndexOf(":"));
  return event.requestContext?.http?.sourceIp ?? "unknown";
}

// Turns alternate, start and end with the visitor, and stay inside the bounds
export function validate(body) {
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > LIMITS.turns) return null;

  let total = 0;
  for (const [i, m] of messages.entries()) {
    const role = i % 2 === 0 ? "user" : "assistant";
    if (m?.role !== role || typeof m.content !== "string") return null;
    const content = m.content.trim();
    if (!content || content.length > LIMITS.chars) return null;
    total += content.length;
  }
  if (total > LIMITS.total || messages.length % 2 === 0) return null;

  return messages.map((m) => ({ role: m.role, content: m.content.trim() }));
}

export async function handler(event, deps = {}) {
  const method = event.requestContext?.http?.method;
  const path = event.rawPath ?? "";

  if (!fromEdge(event.headers ?? {})) return json(403, { error: "forbidden" });

  if (method === "GET" && path.endsWith("/health")) return json(200, { ok: true });
  if (method !== "POST" || !path.endsWith("/chat")) return json(404, { error: "not found" });

  // Parse and check the conversation before spending anything on it
  let body;
  try {
    body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body ?? "", "base64").toString() : (event.body ?? ""));
  } catch {
    return json(400, { error: "That message couldn't be read." });
  }
  const messages = validate(body);
  if (!messages) return json(400, { error: `Please keep messages under ${LIMITS.chars} characters.` });

  // Caps before the model call, so a flood costs DynamoDB writes, not tokens
  const blocked = await allow(viewerIp(event), { ...config(), client: deps.dynamo });
  if (blocked === "burst") return json(429, { error: "You're sending messages quickly. Please wait a minute or two, then try again." });
  if (blocked === "visitor") return json(429, { error: "You've asked a lot this hour. Please try again a little later, or reach neon1 directly below." });
  if (blocked === "daily") return json(429, { error: "The assistant is resting for today. Please email hello@neon1.tech." });

  // One model call; only sizes and timing go to the logs
  const started = Date.now();
  try {
    const out = await reply(messages, { corpus, client: deps.bedrock });
    console.log(JSON.stringify({ event: "chat", turns: messages.length, ms: Date.now() - started, stop: out.stopReason, usage: out.usage }));
    if (!out.text) throw new Error("empty reply");
    return json(200, { reply: out.text });
  } catch (err) {
    // The error's name and status only: a provider message could echo part of the question
    console.error(JSON.stringify({ event: "chat_error", name: err.name, status: err.$metadata?.httpStatusCode }));
    return json(502, { error: "The assistant couldn't answer just now. Please try again, or email hello@neon1.tech." });
  }
}
