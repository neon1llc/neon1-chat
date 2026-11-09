// app/src/contract.mjs - The conversation contract the chat window and this API share.
//
// The window (neon1-site shared/chat.js) mirrors these numbers and trims its history to fit
// them before sending, so a long reply or a long conversation never makes the next question
// invalid. Change both sides together, and the API first: it must accept what the window sends.
//
// - messages alternate user, assistant, user, ...; they start and end with the visitor's turn,
//   so a request always holds an odd number of turns, at most `turns`
// - every turn is 1 to `chars` characters after trimming, the visitor's and the assistant's alike
// - all turns together are at most `total` characters
// - a reply is at most `reply` characters, so it always fits back into the history as is
//
// Characters are JavaScript string length (UTF-16 code units), which is also what a browser's
// textarea maxlength counts, so an emoji is two on both sides.

export const LIMITS = { turns: 11, chars: 1200, total: 6000, reply: 1200 };

// Why a conversation was refused; the window words its message from the code
export const CODES = {
  invalid: "invalid", // not a list of alternating, non-empty turns ending with a question
  question: "question_too_long", // the newest question itself is over the limit
  conversation: "conversation_too_long", // the history around it is too long or too many turns
};

/**
 * Check a request body against the contract. Returns { messages } with trimmed text, or
 * { code } saying what was wrong. The newest question is judged first, so a visitor who can
 * fix the problem by shortening their question is told exactly that.
 */
export function check(body) {
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) return { code: CODES.invalid };

  const turns = [];
  for (const [i, m] of messages.entries()) {
    const role = i % 2 === 0 ? "user" : "assistant";
    if (m?.role !== role || typeof m.content !== "string") return { code: CODES.invalid };
    const content = m.content.trim();
    if (!content) return { code: CODES.invalid };
    turns.push({ role, content });
  }
  if (turns.length % 2 === 0) return { code: CODES.invalid };

  if (turns.at(-1).content.length > LIMITS.chars) return { code: CODES.question };
  const total = turns.reduce((n, t) => n + t.content.length, 0);
  if (turns.length > LIMITS.turns || total > LIMITS.total || turns.some((t) => t.content.length > LIMITS.chars)) {
    return { code: CODES.conversation };
  }
  return { messages: turns };
}

// Markdown links and bare URLs: a cut inside one would leave a broken or wrong link
const LINKISH = /\[[^\]]*\]\([^)\s]*\)|(?:https?:\/\/|mailto:|tel:)\S+/g;

/**
 * Shorten text to at most `max` characters at a clean place: the last sentence end, else the
 * last space, never inside a link, with "…" marking the cut. Text that fits is returned as is.
 * The window applies the same rule to a reply too long to keep in its history.
 */
export function clip(text, max = LIMITS.reply) {
  if (text.length <= max) return text;
  const room = max - 1; // the "…" takes one character

  // Places a cut may not fall: inside any link
  const spans = [...text.matchAll(LINKISH)].map((m) => [m.index, m.index + m[0].length]);
  const free = (i) => !spans.some(([a, b]) => i > a && i < b);

  let sentence = -1, space = -1;
  for (let i = room; i > 0; i--) {
    if (!free(i)) continue;
    const before = text[i - 1];
    if (sentence < 0 && /[.!?]/.test(before) && (i === text.length || /\s/.test(text[i]))) sentence = i;
    if (space < 0 && /\s/.test(text[i])) space = i;
    if (sentence >= 0) break;
  }
  // A sentence end in the back half reads best; otherwise the last word boundary will do
  if (sentence >= room / 2) return text.slice(0, sentence).trimEnd();
  let cut = space > 0 ? space : room;
  // A hard cut never splits a surrogate pair (an emoji, say) in two
  if (/[\uD800-\uDBFF]/.test(text[cut - 1] ?? "")) cut--;
  return `${text.slice(0, cut).trimEnd()}…`;
}
