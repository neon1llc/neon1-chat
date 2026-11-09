// scripts/build-corpus.mjs - Rebuild app/corpus from neon1's public sources only.
// Usage: node scripts/build-corpus.mjs     (GITHUB_TOKEN, if set, is used for commit lookups)
//
// Every source is already public: the live neon1.tech page and files in public repositories,
// listed once in SOURCES below. The corpus holds only that public text; visitors' own messages
// are a separate, untrusted input the prompt treats as questions.
//
// The build is all or nothing. Every source is fetched and checked first (HTTP status, required
// content, size bounds, leftover markup); only then is the new corpus written beside the old one
// and swapped in, with a manifest recording each source's URL, revision, fetch time, and digest.
// A failed required source leaves the last complete corpus untouched. Files for sources that are
// gone (an optional page that now 404s, or a source removed from the list) disappear with the swap.

import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { corpusDigest, readCorpus } from "../app/src/corpus.mjs";

const OUT = new URL("../app/corpus/", import.meta.url);
const SITE = "https://neon1.tech/";
const OWNER = "neon1llc";
const AGENT = { "user-agent": "neon1-chat corpus builder" };

// ---- The source manifest: the only places the corpus may come from ----
//
// kind: "page" is HTML turned into text; "readme" is Markdown cut to `max` at a clean break;
// "markdown" is Markdown kept whole, and a build fails rather than cut a policy short.
// min and max are characters of body text; must lists text a good fetch always contains.
const README = (repo, title) => ({
  file: `repo-${repo.toLowerCase()}.md`,
  kind: "readme",
  repo,
  path: "README.md",
  heading: `${title}: the repository README, written for developers`,
  url: `https://github.com/${OWNER}/${repo}`,
  required: true,
  min: 200,
  max: 5000,
  must: [/\w/],
});
const PORTAL = (name, path, heading, url, required) => ({
  file: `portal-${name}`,
  kind: "markdown",
  repo: "neon1-1NEON",
  path: `apps/web/src/${path}`,
  heading,
  url,
  required,
  min: 300,
  max: 20000,
  must: [/neon1|1NEON/],
});

export const SOURCES = [
  // The site is the main source; everything the assistant says should trace back to it
  { file: "site.md", kind: "page", heading: "neon1.tech", url: SITE, required: true, min: 5000, max: 40000, must: [/neon1/, /1NEON/] },
  // Repository READMEs describe the open source work in the owner's own words
  README("neon1-site", "The neon1.tech website"),
  README("neon1-1NEON", "1NEON, the client portal"),
  README("neon1-aws-infrastructure", "Terraform for neon1.tech on AWS"),
  README("aws-clip", "AWS CLIP (AWS CLI Plus)"),
  // 1NEON's public pages: the legal documents (live at neon1.tech/1NEON/...) and the in-portal
  // help, which is optional: if it leaves main, its old copy leaves the corpus too
  PORTAL("privacy-policy.md", "legal/privacy-policy.md", "1NEON and neon1.tech privacy policy", "https://neon1.tech/1NEON/privacy", true),
  PORTAL("terms-of-use.md", "legal/terms-of-use.md", "1NEON and neon1.tech terms of use", "https://neon1.tech/1NEON/terms", true),
  PORTAL("cookie-notice.md", "legal/cookie-notice.md", "Cookie and browser storage notice", "https://neon1.tech/1NEON/cookies", true),
  PORTAL("faqs.md", "help/faqs.md", "1NEON help: frequently asked questions", "https://neon1.tech/1NEON/", false),
];

// All sources together, so the prompt (and its cost per question) stays bounded
export const TOTAL_MAX = 80000;

// ---- Turning HTML into readable text ----

// Named entities the site uses or plausibly could; numeric ones are decoded generally. Anything
// else fails the build, so an unreadable "&foo;" never reaches the corpus unnoticed
const ENTITIES = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"',
  mdash: "-", ndash: "-", hellip: "...", middot: "·", bull: "•", copy: "©", reg: "®", trade: "™", times: "×",
  rarr: "→", larr: "←", nearr: "↗", deg: "°", eacute: "é",
};
export function decode(text) {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (whole, name) => {
    if (name[0] === "#") {
      const code = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

// Headings kept as Markdown, links as "text (url)", table rows as "| a | b |" lines, and scripts,
// styles, and SVG art dropped; case-study templates stay, since they are public
export function pageText(html, base = SITE) {
  const body = html.replace(/<head[\s\S]*?<\/head>/i, "").replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, "");

  return decode(
    body
      .replace(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => `\n\n${"#".repeat(Number(level))} ${inner}\n\n`)
      .replace(/<a [^>]*href="([^"#][^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => `${inner} (${new URL(href, base).href})`)
      .replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (_, row) => {
        const cells = [...row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => c[1].replace(/\s+/g, " ").trim());
        return `\n| ${cells.join(" | ")} |\n`;
      })
      .replace(/<\/?table[^>]*>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<\/(p|div|section|ul|ol|header|footer|details|summary|dt|dd)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line, i, all) => line || all[i - 1])
    .join("\n")
    .trim();
}

/**
 * Cut long Markdown to at most `max` characters. The last section break ("\n## ") is the best
 * place; failing that (no heading, or only one so early that most of the text would go), the
 * last paragraph break; failing that, the last line or space. The result never exceeds `max`.
 */
export function cut(text, max) {
  if (text.length <= max) return text;
  const head = text.slice(0, max + 1);
  for (const mark of ["\n## ", "\n\n", "\n", " "]) {
    const at = head.lastIndexOf(mark);
    if (at >= max / 2) return text.slice(0, at).trimEnd();
  }
  return text.slice(0, max).trimEnd();
}

// ---- Fetching, with provenance ----

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

/**
 * Fetch every source and build the new corpus in memory, or throw if any required source fails.
 * Returns { files, manifest }. `fetch` and `now` are injectable so tests never touch the network.
 */
export async function build({ fetch = globalThis.fetch, now = new Date(), log = console.log, token = process.env.GITHUB_TOKEN } = {}) {
  // Each request is bounded; a hung source fails the build instead of hanging the job
  const get = async (url, headers = {}) => {
    const res = await fetch(url, { headers: { ...AGENT, ...headers }, signal: AbortSignal.timeout(20000) });
    return { ok: res.ok, status: res.status, text: res.ok ? await res.text() : "" };
  };

  // Each repository's main is pinned to one commit first, so every file from it is consistent
  // and the manifest says exactly which revision was read
  const commits = new Map();
  const commit = async (repo) => {
    if (!commits.has(repo)) {
      const auth = token ? { authorization: `Bearer ${token}` } : {};
      const res = await get(`https://api.github.com/repos/${OWNER}/${repo}/commits/main`, { accept: "application/vnd.github.sha", ...auth });
      const sha = res.text.trim();
      if (!res.ok || !/^[0-9a-f]{40}$/.test(sha)) throw new Error(`${repo}: can't resolve main (HTTP ${res.status})`);
      commits.set(repo, sha);
    }
    return commits.get(repo);
  };

  const files = [];
  const sources = [];
  const fetched = now.toISOString();
  for (const src of SOURCES) {
    const revision = src.repo ? await commit(src.repo) : null;
    const from = src.repo ? `https://raw.githubusercontent.com/${OWNER}/${src.repo}/${revision}/${src.path}` : src.url;
    const res = await get(from);

    if (!res.ok) {
      if (src.required) throw new Error(`${src.file}: HTTP ${res.status} from ${from}`);
      log(`${src.file}: HTTP ${res.status}, optional, left out`);
      continue;
    }

    // The body text, checked before it can replace anything
    let body;
    let version = revision;
    if (src.kind === "page") {
      version = `site ${res.text.match(/<meta name="version" content="([^"]+)"/)?.[1] ?? "unversioned"}`;
      body = pageText(res.text);
      const entity = body.match(/&[a-z]+;/i);
      if (entity) throw new Error(`${src.file}: unsupported entity ${entity[0]}; add it to ENTITIES`);
      if (/<\/?(script|style|svg|div|span|section)\b/i.test(body)) throw new Error(`${src.file}: markup left in the text`);
    } else {
      body = res.text.trim();
    }
    if (src.kind === "readme") body = cut(body, src.max);
    if (body.length < src.min) throw new Error(`${src.file}: ${body.length} characters, expected at least ${src.min}`);
    if (body.length > src.max) throw new Error(`${src.file}: ${body.length} characters, over its bound of ${src.max}`);
    const missing = src.must.find((re) => !re.test(body));
    if (missing) throw new Error(`${src.file}: missing expected content ${missing}`);

    const text = `# ${src.heading} (${src.url})\n\n${body}\n`;
    files.push({ name: src.file, text });
    sources.push({ file: src.file, url: src.url, source: from, revision: version, fetched, sha256: sha256(text), chars: text.length });
    log(`${src.file}: ${text.length} chars`);
  }

  const chars = files.reduce((n, f) => n + f.text.length, 0);
  if (chars > TOTAL_MAX) throw new Error(`corpus: ${chars} characters, over the total bound of ${TOTAL_MAX}`);
  return { files, manifest: { digest: corpusDigest(files), chars, sources } };
}

/**
 * Swap a complete corpus into place: write it to a fresh sibling folder, then rename the old
 * folder away and the new one in. Unchanged text (same digest and files) writes nothing, so a
 * routine refresh with nothing new leaves the tree clean. Returns whether anything changed.
 */
export async function publish({ files, manifest }, out = OUT) {
  try {
    const current = readCorpus(out);
    const same = current.digest === manifest.digest && current.files.length === files.length;
    if (same) return false;
  } catch {
    // No readable corpus yet: publish
  }

  const dir = new URL("..", out);
  const name = out.pathname.split("/").filter(Boolean).pop();
  const next = new URL(`.${name}-next/`, dir);
  const old = new URL(`.${name}-old/`, dir);
  await rm(next, { recursive: true, force: true });
  await rm(old, { recursive: true, force: true });
  await mkdir(next, { recursive: true });
  for (const f of files) await writeFile(new URL(f.name, next), f.text);
  await writeFile(new URL("manifest.json", next), `${JSON.stringify(manifest, null, 2)}\n`);

  // The only moment the corpus folder changes: two renames, with the old one restored on failure
  let moved = false;
  try {
    await rename(out, old);
    moved = true;
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  try {
    await rename(next, out);
  } catch (err) {
    if (moved) await rename(old, out);
    throw err;
  }
  await rm(old, { recursive: true, force: true });
  return true;
}

// Run as a script: build, then publish only a complete, valid corpus
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const built = await build();
  const changed = await publish(built);
  console.log(changed ? `corpus updated: ${built.manifest.digest}` : `corpus unchanged: ${built.manifest.digest}`);
}
