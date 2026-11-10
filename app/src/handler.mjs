// app/src/handler.mjs - The HTTP API: a health check and one chat endpoint.
//
// The browser reaches this through neon1.tech/chat/api/*, so it is same-origin for the
// site and 1NEON and needs no CORS. Message text is never logged, and neither is a raw
// error message, since a provider's message can echo part of the question.

import { timingSafeEqual } from "node:crypto";
import { loadCorpus, loadDirectives, reply } from "./chat.mjs";
import { CODES, LIMITS, check } from "./contract.mjs";
import { readCorpus } from "./corpus.mjs";
import { allow, misuse } from "./limits.mjs";
import { release } from "./release.mjs";

// The contract's bounds, kept under their old name for callers that read them from here
export { LIMITS };

const corpus = loadCorpus();
const directives = loadDirectives();
const identity = release(readCorpus().digest);

// One deadline for the whole request (caps and model call), safely inside the function's
// 20-second timeout, so a slow dependency ends in a clear answer instead of a gateway error
export const DEADLINE_MS = 15000;

// Caps must be whole numbers of at least 1; a bad value fails closed, before any model call
const whole = (v, fallback) => {
  const n = Number(v ?? fallback);
  return Number.isInteger(n) && n >= 1 ? n : null;
};
const config = () => ({
  table: process.env.TABLE_NAME,
  perMinute: whole(process.env.PER_MINUTE, 6),
  perHour: whole(process.env.PER_HOUR, 60),
  perDay: whole(process.env.PER_DAY, 500),
});

// JSON responses that are never cached; `extra` adds headers such as retry-after
const json = (statusCode, body, extra = {}) => ({
  statusCode,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  body: JSON.stringify(body),
});

// A failure the visitor can recover from: a stable code for the window, plain words for people,
// and how long to wait before trying again
const failure = (statusCode, code, error, retry) =>
  json(statusCode, { error, code }, retry ? { "retry-after": String(retry) } : {});

// Only an error's class name and HTTP status are ever logged
const logError = (event, err) =>
  console.error(JSON.stringify({ event, name: err?.name ?? "Error", status: err?.$metadata?.httpStatusCode }));

// Requests must come through CloudFront, which adds a secret header the public can't see.
// Without a configured secret everything is refused, unless local testing turns the check off.
// During a rotation ORIGIN_SECRET_PREVIOUS is accepted too, so the edge can switch to the new value
// after the function has, with no window of refusals (README, "Rotating the origin secret")
function fromEdge(headers) {
  const want = process.env.ORIGIN_SECRET;
  if (!want) return process.env.EDGE_CHECK === "off";
  const got = Buffer.from(headers["x-origin-verify"] ?? "");
  return [want, process.env.ORIGIN_SECRET_PREVIOUS].some((v) => {
    if (!v) return false;
    const exp = Buffer.from(v);
    return got.length === exp.length && timingSafeEqual(got, exp);
  });
}

// CloudFront reports the viewer as "address:port"; the port is dropped
export function viewerIp(event) {
  const raw = event.headers?.["cloudfront-viewer-address"];
  if (raw) return raw.slice(0, raw.lastIndexOf(":"));
  return event.requestContext?.http?.sourceIp ?? "unknown";
}

// The contract check, as the trimmed turns or null; contract.mjs says why one fails
export function validate(body) {
  return check(body).messages ?? null;
}

// What the window shows for each refusal; it words the history case itself
const REFUSED = {
  [CODES.invalid]: "That message couldn't be read.",
  [CODES.question]: `Please keep your question under ${LIMITS.chars.toLocaleString("en-US")} characters.`,
  [CODES.conversation]: "This conversation has grown longer than Neo can follow. Please start a new one.",
};

// A cooldown in words, with roughly how long it lasts but never how many messages it took
export function cooldownText({ retry, reason }) {
  const wait = retry >= 20 * 3600 ? "until tomorrow" : retry >= 3000 ? `for about ${Math.round(retry / 3600)} hour${retry >= 5400 ? "s" : ""}` : `for about ${Math.max(1, Math.round(retry / 60))} minute${retry >= 90 ? "s" : ""}`;
  if (reason === "repeat") return `That's the same question again. Neo will pause ${wait}; the earlier answer is above.`;
  if (reason === "misuse") return `Neo is stepping back from this conversation ${wait}. You can still reach neon1 directly below.`;
  if (retry >= 3000) return `Too many messages, too fast. Neo will be back ${wait}. You can still reach neon1 directly below.`;
  return `You're sending messages faster than Neo can answer well. Please wait ${wait}, then try again.`;
}

class Timeout extends Error {
  name = "Timeout";
}

/**
 * Run `work(signal)` until the request's deadline. The signal is handed to the AWS clients so
 * the SDK abandons its socket; the race is the backstop if a call ignores the signal.
 */
async function before(deadline, work) {
  const controller = new AbortController();
  let timer;
  const expired = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Timeout());
    }, Math.max(0, deadline - Date.now()));
  });
  try {
    return await Promise.race([work(controller.signal), expired]);
  } finally {
    clearTimeout(timer);
  }
}

export async function handler(event, deps = {}) {
  // Everything below answers with safe JSON; nothing reaches the gateway as a raw failure
  try {
    return await route(event, deps);
  } catch (err) {
    logError("handler_error", err);
    return failure(500, "error", "Neo couldn't answer just now. Please try again in a moment.", 30);
  }
}

async function route(event, deps) {
  const method = event.requestContext?.http?.method;
  const path = event.rawPath ?? "";
  const deadline = Date.now() + (deps.deadlineMs ?? DEADLINE_MS);

  if (!fromEdge(event.headers ?? {})) return json(403, { error: "forbidden" });

  // Which code and corpus are serving, so a deploy can check it shipped what it built. Routing
  // only: it makes no AWS or model call, so it stays green when Bedrock is unavailable
  if (method === "GET" && path.endsWith("/health")) return json(200, { ok: true, ...identity });
  if (method !== "POST" || !path.endsWith("/chat")) return json(404, { error: "not found" });

  // Parse and check the conversation before spending anything on it
  let body;
  try {
    body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body ?? "", "base64").toString() : (event.body ?? ""));
  } catch {
    return failure(400, CODES.invalid, REFUSED[CODES.invalid]);
  }
  const checked = check(body);
  if (!checked.messages) return failure(400, checked.code, REFUSED[checked.code]);
  const { messages } = checked;

  // Caps before the model call, so a flood costs DynamoDB writes, not tokens. If the caps
  // can't be counted (bad settings, a store outage, the deadline), nothing goes to the model
  const settings = config();
  if (!settings.perMinute || !settings.perHour || !settings.perDay) {
    logError("config_error", { name: "InvalidCaps" });
    return failure(503, "unavailable", "Neo is unavailable just now. Please try again later, or email hello@neon1.tech.", 300);
  }
  const ip = viewerIp(event);
  const question = messages.at(-1).content;
  let blocked;
  try {
    blocked = await before(deadline, (signal) => allow(ip, { ...settings, question, client: deps.dynamo, signal }));
  } catch (err) {
    logError("limit_error", err);
    return failure(503, "unavailable", "Neo is busy just now. Please try again in a minute.", 60);
  }
  if (blocked) {
    // Strikes are logged by level and reason only, so alarms and reviews can see abuse without an address
    if (blocked.reason && !blocked.waiting) console.log(JSON.stringify({ event: "strike", reason: blocked.reason, level: blocked.level }));
    if (blocked.blocked === "daily") return failure(429, "daily", "Neo is resting for today. Please email hello@neon1.tech.", blocked.retry);
    return failure(429, "cooldown", cooldownText(blocked), blocked.retry);
  }
  // One model call; only sizes and timing go to the logs
  const started = Date.now();
  try {
    const out = await before(deadline, (signal) => reply(messages, { corpus, directives, client: deps.bedrock, signal }));
    console.log(JSON.stringify({ event: "chat", turns: messages.length, ms: Date.now() - started, stop: out.stopReason, flagged: out.flagged, attempts: out.attempts, usage: out.usage }));
    if (!out.text) throw Object.assign(new Error("empty reply"), { name: "EmptyReply" });
    // A flagged message still gets its calm answer; enough of them start a cooldown from the next one.
    // Counting it is best effort and runs under what is left of the request deadline, with the same
    // abort signal as every other call: a store that hangs here never costs the visitor the reply
    // already paid for. (The caps before the model call stay fail-closed.) A timeout is logged as
    // a name only, never the question or the answer
    if (out.flagged) {
      try {
        const cooled = await before(deadline, (signal) => misuse(ip, { table: settings.table, client: deps.dynamo, signal }));
        if (cooled) console.log(JSON.stringify({ event: "strike", reason: "misuse", level: cooled.level }));
      } catch (err) {
        logError(err instanceof Timeout ? "misuse_timeout" : "limit_error", err);
      }
    }
    return json(200, { reply: out.text });
  } catch (err) {
    logError("chat_error", err);
    if (err instanceof Timeout || err?.name === "AbortError" || err?.name === "TimeoutError") {
      return failure(504, "timeout", "Neo took too long to answer. Please try again in a moment.", 10);
    }
    if (err?.name === "ThrottlingException" || err?.name === "ServiceQuotaExceededException") {
      return failure(503, "busy", "Neo is busy just now. Please try again in a minute.", 60);
    }
    return failure(502, "unavailable", "The assistant couldn't answer just now. Please try again, or email hello@neon1.tech.", 30);
  }
}
