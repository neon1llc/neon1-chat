// app/src/release.mjs - Which build is serving, for the health check.
//
// scripts/package.mjs writes release.json beside src/ when it stages a release: the source
// commit and the lockfile digest. The corpus digest is computed here from the files actually
// loaded, so a deploy check compares what is served, not what the build meant to ship. None of
// this is secret: the repository and its corpus are public.

import { readFileSync } from "node:fs";

export function release(corpusDigest) {
  try {
    const built = JSON.parse(readFileSync(new URL("../release.json", import.meta.url), "utf8"));
    return { commit: String(built.commit), corpus: corpusDigest, lock: String(built.lock) };
  } catch {
    // Run from a checkout (tests, local use): there is no packaged release to name
    return { commit: "unpackaged", corpus: corpusDigest };
  }
}
