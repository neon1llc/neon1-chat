// app/src/corpus.mjs - Read the public corpus the assistant answers from, and fingerprint it.
//
// Only files listed in corpus/manifest.json are read, so a file the corpus builder retired (or
// one left behind by hand) can never reach the prompt. The digest names the exact text served;
// the builder writes the same digest into the manifest, and the health check reports it.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const CORPUS_DIR = new URL("../corpus/", import.meta.url);

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

// The site leads, then 1NEON's pages, then repository READMEs: most to least authoritative
const rank = (name) => (name === "site.md" ? 0 : name.startsWith("portal-") ? 1 : 2);
export const order = (a, b) => rank(a) - rank(b) || a.localeCompare(b);

/**
 * One fingerprint for a set of corpus files: the SHA-256 of each file's name and SHA-256, in
 * name order. Independent of the manifest's own provenance fields, so a refresh that fetches
 * identical text produces an identical digest.
 */
export function corpusDigest(files) {
  const lines = [...files].sort((a, b) => a.name.localeCompare(b.name)).map((f) => `${f.name}\n${sha256(f.text)}\n`);
  return `sha256:${sha256(lines.join(""))}`;
}

// The manifest's files, read as they are stored; a listed file that's missing is an error
export function readCorpus(dir = CORPUS_DIR) {
  const manifest = JSON.parse(readFileSync(new URL("manifest.json", dir), "utf8"));
  const files = manifest.sources.map(({ file }) => {
    if (!/^[a-z0-9-]+\.md$/.test(file)) throw new Error(`corpus manifest: unexpected file name ${file}`);
    return { name: file, text: readFileSync(new URL(file, dir), "utf8") };
  });
  return { manifest, files, digest: corpusDigest(files) };
}

// The text that goes in the prompt: each listed file, trimmed, in authority order
export function loadCorpus(dir = CORPUS_DIR) {
  return readCorpus(dir)
    .files.sort((a, b) => order(a.name, b.name))
    .map((f) => f.text.trim())
    .join("\n\n---\n\n");
}
