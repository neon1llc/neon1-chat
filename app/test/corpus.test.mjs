// app/test/corpus.test.mjs - The corpus builder and loader, with every fetch faked: bounds that
// hold without a heading, failed or empty sources that leave the last corpus intact, retired
// files that disappear, documents checked against their digests, provenance, the order the prompt
// reads them in, and change detection that sees new and deleted files as well as edits. No
// network, AWS, or live site is touched.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { SOURCES, build, publish, cut } from "../../scripts/build-corpus.mjs";
import { loadCorpus, readCorpus, corpusDigest } from "../src/corpus.mjs";

const SHA = "a".repeat(40);
const TAG = "v9.9.9";
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

// A synthetic neon1-corpus chat bundle: each document carries its own digest, as the real export does
const DOCS = [
  ["company-about.md", `# About\n\nSynthetic public text about neon1. ${"About words. ".repeat(20)}`],
  ["case-synthetic.md", `# A synthetic case\n\nNeeds, Execute, Observe, and Normalize. ${"Case words. ".repeat(20)}`, ],
  ["policy-privacy.md", `# Privacy policy\n\nneon1 LLC runs 1NEON and keeps this synthetic text public. ${"Synthetic clause. ".repeat(20)}`, "https://neon1.tech/1NEON/privacy"],
];
const bundle = (docs = DOCS, tamper = (d) => d) =>
  JSON.stringify({ files: docs.map(([file, text, published], order) => tamper({ file, order, sha256: sha256(text), text, ...(published ? { published } : {}) })) });

// A fake public internet: `over` replaces the answer for any URL containing its key
function internet(over = {}) {
  const seen = [];
  const fetch = async (input) => {
    const url = String(input);
    seen.push(url);
    for (const [key, answer] of Object.entries(over)) if (url.includes(key)) return answer();
    if (url === "https://api.github.com/repos/neon1llc/neon1-corpus/releases/latest") return new Response(JSON.stringify({ tag_name: TAG }));
    if (url.startsWith("https://api.github.com/repos/neon1llc/") && url.endsWith("/commits/main")) return new Response(SHA);
    if (url === `https://github.com/neon1llc/neon1-corpus/releases/download/${TAG}/chat.bundle.json`) return new Response(bundle());
    if (url.startsWith(`https://raw.githubusercontent.com/neon1llc/`) && url.endsWith(`/${SHA}/README.md`)) {
      return new Response(`# Synthetic README\n\n${"Readme words. ".repeat(40)}`);
    }
    throw new Error(`unexpected request blocked: ${url}`);
  };
  return { fetch, seen };
}
const quiet = () => {};
const answer = (body, status = 200) => () => new Response(body, { status });

// A corpus folder holding a previous good build, plus stray files from the past
async function previous() {
  const root = await mkdtemp(join(tmpdir(), "corpus-test-"));
  const out = pathToFileURL(join(root, "corpus") + "/");
  const old = await build({ fetch: internet().fetch, log: quiet });
  await publish(old, out);
  return { root, out, old };
}

// ---- Bounds ----

test("a README with no section break is still cut to its bound", () => {
  const out = cut("A".repeat(6200), 5000);
  assert.ok(out.length <= 5000);
  assert.equal(out.length, 5000);
});

test("an early heading alone doesn't cut a README down to a stub", () => {
  const text = `# T\n\n## First\n\n${"word ".repeat(1300)}`;
  const out = cut(text, 5000);
  assert.ok(out.length <= 5000 && out.length > 2500, String(out.length));
});

test("a README with headings is cut at the last section break before the bound", () => {
  const text = `# T\n\n${"a ".repeat(1500)}\n## Later\n\n${"b ".repeat(2000)}`;
  const out = cut(text, 5000);
  assert.ok(out.length <= 5000);
  assert.ok(!out.includes("## Later"));
});

test("generated README bodies never exceed their bound, through the whole build", async () => {
  const { fetch } = internet({ "README.md": answer("A".repeat(6200)) });
  const { files } = await build({ fetch, log: quiet });
  for (const f of files.filter((f) => f.name.startsWith("repo-"))) {
    const body = f.text.split("\n\n").slice(1).join("\n\n").trim();
    assert.ok(body.length <= 5000, `${f.name}: ${body.length}`);
  }
});

test("one document over its own bound, or all over the total, fails the build", async () => {
  const huge = [["company-about.md", `# About\n\nneon1 1NEON Needs, Execute, Observe ${"x".repeat(20500)}`]];
  await assert.rejects(build({ fetch: internet({ "chat.bundle.json": answer(bundle(huge)) }).fetch, log: quiet }), /company-about\.md: \d+ characters, over its bound of 20000/);
  // Each document within its own 20,000, but together past the 80,000 total
  const many = [1, 2, 3, 4].map((n) => [`page-${n}.md`, `# Page ${n}\n\nneon1 1NEON Needs, Execute, Observe ${"p".repeat(19500)}`]);
  await assert.rejects(build({ fetch: internet({ "chat.bundle.json": answer(bundle(many)) }).fetch, log: quiet }), /over the total bound of 80000/);
});

// ---- Failed, empty, and retired sources ----

test("a bundle with no documents, or without the expected content, fails the build and the last corpus stays", async () => {
  const { out, old } = await previous();
  await assert.rejects(build({ fetch: internet({ "chat.bundle.json": answer(bundle([])) }).fetch, log: quiet }), /lists no documents/);
  const plain = [["company-about.md", `# About\n\n${"Words with no names in them. ".repeat(10)}`]];
  await assert.rejects(build({ fetch: internet({ "chat.bundle.json": answer(bundle(plain)) }).fetch, log: quiet }), /missing expected content/);
  assert.equal(readCorpus(out).digest, old.manifest.digest);
});

test("a required source's HTTP error, a missing release, or an unresolvable commit fails the build", async () => {
  await assert.rejects(build({ fetch: internet({ "chat.bundle.json": answer("gone", 404) }).fetch, log: quiet }), /HTTP 404/);
  await assert.rejects(build({ fetch: internet({ "releases/latest": answer("not found", 404) }).fetch, log: quiet }), /can't resolve the latest release/);
  await assert.rejects(build({ fetch: internet({ "README.md": answer("gone", 404) }).fetch, log: quiet }), /HTTP 404/);
  await assert.rejects(build({ fetch: internet({ "commits/main": answer("rate limited", 403) }).fetch, log: quiet }), /can't resolve main/);
});

test("a document whose text doesn't match its digest, or that isn't a Markdown file, fails the build", async () => {
  const forged = bundle(DOCS, (d) => (d.file === "policy-privacy.md" ? { ...d, text: d.text + " Changed after export." } : d));
  await assert.rejects(build({ fetch: internet({ "chat.bundle.json": answer(forged) }).fetch, log: quiet }), /doesn't match its digest/);
  const odd = bundle(DOCS, (d) => (d.file === "company-about.md" ? { ...d, file: "../about.md" } : d));
  await assert.rejects(build({ fetch: internet({ "chat.bundle.json": answer(odd) }).fetch, log: quiet }), /not a corpus document/);
});

test("a document dropped from the corpus, and a source no longer listed, leave the corpus", async () => {
  const { root, out } = await previous();
  await writeFile(join(root, "corpus", "repo-retired.md"), "RETIRED_SOURCE_SYNTHETIC_MARKER");
  assert.ok(!loadCorpus(out).includes("RETIRED_SOURCE_SYNTHETIC_MARKER"), "an unlisted file is never loaded");

  const fewer = internet({ "chat.bundle.json": answer(bundle(DOCS.slice(0, 2).map(([f, t]) => [f, `${t} 1NEON`]))) });
  const next = await build({ fetch: fewer.fetch, log: quiet });
  assert.equal(await publish(next, out), true);
  const names = await readdir(join(root, "corpus"));
  assert.ok(!names.includes("corpus-policy-privacy.md"));
  assert.ok(!names.includes("repo-retired.md"));
  assert.ok(!(await readdir(root)).some((n) => n.startsWith(".corpus")), "no staging folders left");
});

test("a rebuild with identical text writes nothing", async () => {
  const { root, out } = await previous();
  const before = await readFile(join(root, "corpus", "manifest.json"), "utf8");
  const again = await build({ fetch: internet().fetch, log: quiet, now: new Date("2030-01-01T00:00:00Z") });
  assert.equal(await publish(again, out), false);
  assert.equal(await readFile(join(root, "corpus", "manifest.json"), "utf8"), before);
});

// ---- What the prompt reads ----

test("each document's title names its live page, or the site when it has none", async () => {
  const { files } = await build({ fetch: internet().fetch, log: quiet });
  const text = (name) => files.find((f) => f.name === name).text;
  assert.match(text("corpus-policy-privacy.md"), /^# Privacy policy \(https:\/\/neon1\.tech\/1NEON\/privacy\)\n/);
  assert.match(text("corpus-company-about.md"), /^# About \(https:\/\/neon1\.tech\/\)\n/);
});

test("the corpus documents lead in the bundle's order, then the READMEs", async () => {
  const { out } = await previous();
  const prompt = loadCorpus(out);
  const at = (s) => prompt.indexOf(s);
  assert.ok(at("# About") < at("# A synthetic case") && at("# A synthetic case") < at("# Privacy policy"));
  assert.ok(at("# Privacy policy") < at("# The neon1.tech website"));
});

// ---- Provenance ----

test("the manifest records each source's URL, revision, fetch time, and digest", async () => {
  const net = internet();
  const { manifest, files } = await build({ fetch: net.fetch, log: quiet, now: new Date("2026-11-09T12:00:00Z") });
  assert.equal(manifest.digest, corpusDigest(files));
  const policy = manifest.sources.find((s) => s.file === "corpus-policy-privacy.md");
  assert.equal(policy.revision, `neon1-corpus ${TAG}`);
  assert.equal(policy.url, "https://neon1.tech/1NEON/privacy");
  assert.equal(policy.source, `https://github.com/neon1llc/neon1-corpus/releases/download/${TAG}/chat.bundle.json#policy-privacy.md`);
  const readme = manifest.sources.find((s) => s.file === "repo-neon1-site.md");
  assert.equal(readme.revision, SHA);
  assert.equal(readme.source, `https://raw.githubusercontent.com/neon1llc/neon1-site/${SHA}/README.md`);
  assert.ok(manifest.sources.every((s) => s.fetched === "2026-11-09T12:00:00.000Z" && /^[0-9a-f]{64}$/.test(s.sha256)));
  // Every request went to a listed public source
  assert.ok(net.seen.every((u) => /^https:\/\/(api\.github\.com\/repos\/neon1llc\/|raw\.githubusercontent\.com\/neon1llc\/|github\.com\/neon1llc\/neon1-corpus\/releases\/download\/)/.test(u)));
});

test("the committed corpus matches its manifest, with nothing unlisted beside it", () => {
  const { manifest, digest, files } = readCorpus();
  assert.equal(digest, manifest.digest, "regenerate app/corpus/manifest.json after editing the corpus");
  const listed = new Set(files.map((f) => f.name));
  const onDisk = readdirSync(new URL("../corpus/", import.meta.url)).filter((n) => n !== "manifest.json");
  assert.deepEqual(onDisk.filter((n) => !listed.has(n)), []);
  const known = (name) => SOURCES.some((s) => (s.kind === "corpus" ? name.startsWith(s.file) : name === s.file));
  assert.deepEqual([...listed].filter((n) => !known(n)), []);
});

// ---- Change detection in refresh.yml ----

test("the refresh workflow sees an untracked-only addition and a deletion", async () => {
  const workflow = readFileSync(new URL("../../.github/workflows/refresh.yml", import.meta.url), "utf8");
  const command = "git status --porcelain -- app/corpus";
  assert.ok(workflow.includes(command), "refresh.yml checks for changes with git status");

  const dir = await mkdtemp(join(tmpdir(), "refresh-test-"));
  const git = (...args) => spawnSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "user.name=Synthetic", "-c", "user.email=synthetic@example.invalid", ...args], { cwd: dir, encoding: "utf8" });
  git("init", "-q");
  await mkdir(join(dir, "app/corpus"), { recursive: true });
  await writeFile(join(dir, "app/corpus/existing.md"), "existing");
  git("add", ".");
  git("commit", "-qm", "synthetic fixture");
  const changed = () => spawnSync("sh", ["-c", command], { cwd: dir, encoding: "utf8" }).stdout.trim() !== "";

  assert.equal(changed(), false);
  await writeFile(join(dir, "app/corpus/new-faq.md"), "new synthetic document");
  assert.equal(changed(), true, "untracked-only addition");
  git("add", ".");
  git("commit", "-qm", "add");
  git("rm", "-q", "--cached", "app/corpus/existing.md");
  spawnSync("rm", [join(dir, "app/corpus/existing.md")]);
  git("reset", "-q");
  assert.equal(changed(), true, "deletion");
});
