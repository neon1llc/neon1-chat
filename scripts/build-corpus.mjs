// scripts/build-corpus.mjs - Rebuild app/corpus from neon1's public sources only.
// Usage: node scripts/build-corpus.mjs     (GITHUB_TOKEN, if set, is used for GitHub API lookups)
//
// Every source is already public: the latest release of neon1-corpus, where neon1's public words
// are written once (the site's copy, services, case studies, policies, and 1NEON help), and the
// READMEs of public repositories, listed once in SOURCES below. The corpus holds only that public
// text; visitors' own messages are a separate, untrusted input the prompt treats as questions.
//
// The build is all or nothing. Every source is fetched and checked first (HTTP status, required
// content, size bounds, each corpus document's digest); only then is the new corpus written beside
// the old one and swapped in, with a manifest recording each source's URL, revision, fetch time, and
// digest. A failed required source leaves the last complete corpus untouched. Files for sources
// that are gone (a document dropped from the corpus, or a source removed from the list) disappear
// with the swap.

import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { corpusDigest, readCorpus } from "../app/src/corpus.mjs";

const OUT = new URL("../app/corpus/", import.meta.url);
const OWNER = "neon1llc";
const AGENT = { "user-agent": "neon1-chat corpus builder" };

// ---- The source manifest: the only places the corpus may come from ----
//
// kind: "corpus" is every document in neon1-corpus's chat bundle, from its latest release, one file
// each; "readme" is Markdown cut to `max` at a clean break. min and max are characters of body text
// (per document for the corpus); must lists text a good fetch always contains (all documents together
// for the corpus).
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

export const SOURCES = [
  // neon1-corpus is the main source; everything the assistant says should trace back to it
  { file: "corpus-", kind: "corpus", repo: "neon1-corpus", asset: "chat.bundle.json", url: `https://github.com/${OWNER}/neon1-corpus`, required: true, min: 100, max: 20000, must: [/neon1/, /1NEON/, /Needs, Execute, Observe/] },
  // Repository READMEs describe the open source work in the owner's own words
  README("neon1-site", "The neon1.tech website"),
  README("neon1-1NEON", "1NEON, the client portal"),
  README("neon1-aws-infrastructure", "Terraform for neon1.tech on AWS"),
  README("aws-clip", "AWS CLIP (AWS CLI Plus)"),
];

// A corpus document links to its live page when it has one, and to the site otherwise
const HOME = "https://neon1.tech/";

// All sources together, so the prompt (and its cost per question) stays bounded
export const TOTAL_MAX = 80000;

// ---- Cutting long READMEs ----

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
  const api = (path, accept) => get(`https://api.github.com/repos/${OWNER}/${path}`, { accept, ...(token ? { authorization: `Bearer ${token}` } : {}) });

  // Each repository's main is pinned to one commit first, so every file from it is consistent
  // and the manifest says exactly which revision was read
  const commits = new Map();
  const commit = async (repo) => {
    if (!commits.has(repo)) {
      const res = await api(`${repo}/commits/main`, "application/vnd.github.sha");
      const sha = res.text.trim();
      if (!res.ok || !/^[0-9a-f]{40}$/.test(sha)) throw new Error(`${repo}: can't resolve main (HTTP ${res.status})`);
      commits.set(repo, sha);
    }
    return commits.get(repo);
  };

  const files = [];
  const sources = [];
  const fetched = now.toISOString();
  const add = (file, url, from, revision, text) => {
    files.push({ name: file, text });
    sources.push({ file, url, source: from, revision, fetched, sha256: sha256(text), chars: text.length });
    log(`${file}: ${text.length} chars`);
  };

  for (const src of SOURCES) {
    if (src.kind === "corpus") {
      await corpus(src);
      continue;
    }
    const revision = await commit(src.repo);
    const from = `https://raw.githubusercontent.com/${OWNER}/${src.repo}/${revision}/${src.path}`;
    const res = await get(from);
    if (!res.ok) {
      if (src.required) throw new Error(`${src.file}: HTTP ${res.status} from ${from}`);
      log(`${src.file}: HTTP ${res.status}, optional, left out`);
      continue;
    }
    const body = cut(res.text.trim(), src.max);
    if (body.length < src.min) throw new Error(`${src.file}: ${body.length} characters, expected at least ${src.min}`);
    const missing = src.must.find((re) => !re.test(body));
    if (missing) throw new Error(`${src.file}: missing expected content ${missing}`);
    add(src.file, src.url, from, revision, `# ${src.heading} (${src.url})\n\n${body}\n`);
  }

  // The latest neon1-corpus release, one file per document in the bundle's order. Each document's
  // text must match the digest the bundle gives it, and the set as a whole must hold the must list
  async function corpus(src) {
    const release = await api(`${src.repo}/releases/latest`, "application/vnd.github+json");
    const tag = release.ok ? JSON.parse(release.text).tag_name : "";
    if (!/^v\d+\.\d+\.\d+$/.test(tag ?? "")) throw new Error(`${src.repo}: can't resolve the latest release (HTTP ${release.status})`);
    const from = `https://github.com/${OWNER}/${src.repo}/releases/download/${tag}/${src.asset}`;
    const res = await get(from);
    if (!res.ok) throw new Error(`${src.repo}: HTTP ${res.status} from ${from}`);
    const bundle = JSON.parse(res.text);
    if (!Array.isArray(bundle.files) || !bundle.files.length) throw new Error(`${src.repo} ${tag}: the bundle lists no documents`);

    for (const doc of bundle.files) {
      const label = `${src.repo} ${tag} ${doc.file}`;
      if (!/^[a-z0-9-]+\.md$/.test(doc.file ?? "") || typeof doc.text !== "string") throw new Error(`${label}: not a corpus document`);
      if (sha256(doc.text) !== doc.sha256) throw new Error(`${label}: text doesn't match its digest`);
      const body = doc.text.trim();
      if (body.length < src.min) throw new Error(`${label}: ${body.length} characters, expected at least ${src.min}`);
      if (body.length > src.max) throw new Error(`${label}: ${body.length} characters, over its bound of ${src.max}`);
      // The document's own title line names its live page, so the assistant can link to it
      const url = doc.published ?? HOME;
      const text = `${body.replace(/^# (.+)/, `# $1 (${url})`)}\n`;
      add(`${src.file}${doc.file}`, url, `${from}#${doc.file}`, `${src.repo} ${tag}`, text);
    }
    const all = bundle.files.map((d) => d.text).join("\n");
    const missing = src.must.find((re) => !re.test(all));
    if (missing) throw new Error(`${src.repo} ${tag}: missing expected content ${missing}`);
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
