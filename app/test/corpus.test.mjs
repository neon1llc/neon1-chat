// app/test/corpus.test.mjs - The corpus builder and loader, with every fetch faked: bounds that
// hold without a heading, failed or empty sources that leave the last corpus intact, retired
// files that disappear, readable entities and tables, provenance, and change detection that
// sees new and deleted files as well as edits. No network, AWS, or live site is touched.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { SOURCES, build, publish, cut, pageText, decode } from "../../scripts/build-corpus.mjs";
import { loadCorpus, readCorpus, corpusDigest } from "../src/corpus.mjs";

const SHA = "a".repeat(40);
const SITE_HTML = `<html><head><meta name="version" content="9.9.9"></head><body>
<h1>neon1</h1><p>I&#x27;m glad to be of service &amp; I work on 1NEON.</p>
<table><tr><th>Measure</th><th>Before</th><th>After</th></tr><tr><td>Median lookup</td><td>~4.8 min</td><td>13.6 s</td></tr></table>
<p>${"Synthetic public text about neon1 services. ".repeat(150)}</p></body></html>`;
const POLICY = `# Synthetic policy\n\nneon1 LLC keeps this synthetic text public. ${"Synthetic clause. ".repeat(30)}`;

// A fake public internet: `over` replaces the answer for any URL containing its key
function internet(over = {}) {
  const seen = [];
  const fetch = async (input) => {
    const url = String(input);
    seen.push(url);
    for (const [key, answer] of Object.entries(over)) if (url.includes(key)) return answer();
    if (url.startsWith("https://api.github.com/repos/neon1llc/")) return new Response(SHA);
    if (url === "https://neon1.tech/") return new Response(SITE_HTML);
    if (url.startsWith(`https://raw.githubusercontent.com/neon1llc/`) && url.includes(`/${SHA}/`)) {
      return new Response(url.endsWith("README.md") ? `# Synthetic README\n\n${"Readme words. ".repeat(40)}` : POLICY);
    }
    throw new Error(`unexpected request blocked: ${url}`);
  };
  return { fetch, seen };
}
const quiet = () => {};

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
  const { fetch } = internet({ "README.md": () => new Response("A".repeat(6200)) });
  const { files } = await build({ fetch, log: quiet });
  for (const f of files.filter((f) => f.name.startsWith("repo-"))) {
    const body = f.text.split("\n\n").slice(1).join("\n\n").trim();
    assert.ok(body.length <= 5000, `${f.name}: ${body.length}`);
  }
});

test("one source over its own bound, or all over the total, fails the build", async () => {
  const big = `<html><body><p>neon1 1NEON ${"x ".repeat(25000)}</p></body></html>`;
  await assert.rejects(build({ fetch: internet({ "https://neon1.tech/": () => new Response(big) }).fetch, log: quiet }), /site\.md: \d+ characters, over its bound/);
  // Each policy within its own 20,000, but together past the 80,000 total
  const long = () => new Response(`neon1 ${"p".repeat(19500)}`);
  await assert.rejects(build({ fetch: internet({ "apps/web/src/": long }).fetch, log: quiet }), /over the total bound of 80000/);
});

// ---- Failed, empty, and retired sources ----

test("an empty homepage fails the build and the last corpus stays", async () => {
  const { out, old } = await previous();
  const empty = internet({ "https://neon1.tech/": () => new Response("<html><head></head><body></body></html>") });
  await assert.rejects(build({ fetch: empty.fetch, log: quiet }), /site\.md: \d+ characters, expected at least/);
  assert.equal(readCorpus(out).digest, old.manifest.digest);
});

test("a required source's HTTP error or an unresolvable commit fails the build", async () => {
  await assert.rejects(build({ fetch: internet({ "privacy-policy.md": () => new Response("gone", { status: 404 }) }).fetch, log: quiet }), /HTTP 404/);
  await assert.rejects(build({ fetch: internet({ "api.github.com": () => new Response("rate limited", { status: 403 }) }).fetch, log: quiet }), /can't resolve main/);
});

test("an optional page that now 404s, and a source no longer listed, leave the corpus", async () => {
  const { root, out } = await previous();
  // Stray files: a retired source, and the FAQ that is about to disappear upstream
  await writeFile(join(root, "corpus", "repo-retired.md"), "RETIRED_SOURCE_SYNTHETIC_MARKER");
  assert.ok(!loadCorpus(out).includes("RETIRED_SOURCE_SYNTHETIC_MARKER"), "an unlisted file is never loaded");

  const gone = internet({ "help/faqs.md": () => new Response("not found", { status: 404 }) });
  const next = await build({ fetch: gone.fetch, log: quiet });
  assert.equal(await publish(next, out), true);
  const names = await readdir(join(root, "corpus"));
  assert.ok(!names.includes("portal-faqs.md"));
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

// ---- Readability ----

test("entities decode, tables keep their rows and columns, and unknown entities fail", async () => {
  assert.equal(decode("I&#x27;m &amp; I&#39;ve &rsquo; &hellip;"), "I'm & I've ' ...");
  const text = pageText(SITE_HTML);
  assert.match(text, /I'm glad to be of service & I work on 1NEON/);
  assert.match(text, /^\| Measure \| Before \| After \|$/m);
  assert.match(text, /^\| Median lookup \| ~4\.8 min \| 13\.6 s \|$/m);
  const odd = SITE_HTML.replace("glad", "glad &zwsp;");
  await assert.rejects(build({ fetch: internet({ "https://neon1.tech/": () => new Response(odd) }).fetch, log: quiet }), /unsupported entity &zwsp;/);
});

// ---- Provenance ----

test("the manifest records each source's URL, revision, fetch time, and digest", async () => {
  const net = internet();
  const { manifest, files } = await build({ fetch: net.fetch, log: quiet, now: new Date("2026-11-09T12:00:00Z") });
  assert.equal(manifest.digest, corpusDigest(files));
  const site = manifest.sources.find((s) => s.file === "site.md");
  assert.equal(site.revision, "site 9.9.9");
  const readme = manifest.sources.find((s) => s.file === "repo-neon1-site.md");
  assert.equal(readme.revision, SHA);
  assert.equal(readme.source, `https://raw.githubusercontent.com/neon1llc/neon1-site/${SHA}/README.md`);
  assert.ok(manifest.sources.every((s) => s.fetched === "2026-11-09T12:00:00.000Z" && /^[0-9a-f]{64}$/.test(s.sha256)));
  // Every request went to a listed public source
  assert.ok(net.seen.every((u) => /^https:\/\/(neon1\.tech\/|api\.github\.com\/repos\/neon1llc\/|raw\.githubusercontent\.com\/neon1llc\/)/.test(u)));
});

test("the committed corpus matches its manifest, with nothing unlisted beside it", () => {
  const { manifest, digest, files } = readCorpus();
  assert.equal(digest, manifest.digest, "regenerate app/corpus/manifest.json after editing the corpus");
  const listed = new Set(files.map((f) => f.name));
  const onDisk = readdirSync(new URL("../corpus/", import.meta.url)).filter((n) => n !== "manifest.json");
  assert.deepEqual(onDisk.filter((n) => !listed.has(n)), []);
  assert.deepEqual([...listed].sort(), SOURCES.filter((s) => listed.has(s.file)).map((s) => s.file).sort());
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
