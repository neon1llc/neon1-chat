// scripts/package.mjs - Stage the function's release folder that Terraform zips and ships.
// Usage: node scripts/package.mjs     (deploy.yml runs it before terraform plan)
//
// The function ships with the exact AWS SDK versions package-lock.json pins and the tests ran
// against, rather than whatever SDK the Lambda runtime happens to carry. The folder holds only
// app/src, the corpus files its manifest lists, production dependencies, and release.json: the
// source commit, the corpus digest, and the lockfile digest, which the health check reports.

import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { readCorpus } from "../app/src/corpus.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = new URL("../infra/.build/app/", import.meta.url);

const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const run = (cmd, args, cwd = ROOT) => execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();

// The commit being shipped: CI's own, else the checkout's, marked when it has local changes
function commit() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  const head = run("git", ["rev-parse", "HEAD"]);
  return run("git", ["status", "--porcelain", "--", "app", "package.json", "package-lock.json"]) ? `${head}-dirty` : head;
}

// ---- Stage source, corpus, and production dependencies ----

await rm(OUT, { recursive: true, force: true });
await mkdir(new URL("corpus/", OUT), { recursive: true });
await cp(new URL("../app/src/", import.meta.url), new URL("src/", OUT), { recursive: true });

// Only the corpus the manifest lists, so a stray or retired file can't ship
const corpus = readCorpus();
await cp(new URL("../app/corpus/manifest.json", import.meta.url), new URL("corpus/manifest.json", OUT));
for (const f of corpus.files) await writeFile(new URL(`corpus/${f.name}`, OUT), f.text);

// npm ci from the same lockfile the tests used, production packages only, no install scripts
const lock = await readFile(new URL("../package-lock.json", import.meta.url));
for (const name of ["package.json", "package-lock.json"]) await cp(new URL(`../${name}`, import.meta.url), new URL(name, OUT));
run("npm", ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], fileURLToPath(OUT));

// ---- Check what's about to ship ----

// The shipped SDK clients are the versions the lockfile pins (and the tests installed)
const pinned = JSON.parse(lock.toString()).packages;
const shipped = {};
for (const name of ["@aws-sdk/client-bedrock-runtime", "@aws-sdk/client-dynamodb"]) {
  const { version } = JSON.parse(await readFile(new URL(`node_modules/${name}/package.json`, OUT), "utf8"));
  if (version !== pinned[`node_modules/${name}`]?.version) throw new Error(`${name} ${version} differs from the lockfile`);
  shipped[name] = version;
}

// No tests or environment files; source maps are dropped, since nothing reads them in Lambda
const staged = fileURLToPath(OUT);
for (const path of await readdir(staged, { recursive: true })) {
  if (path.endsWith(".map")) await rm(join(staged, path));
  else if (/(^|\/)\.env|^src\/.*\.test\.|^test\//.test(path)) throw new Error(`${path} must not ship`);
}

// ---- Release identity ----

const release = { commit: commit(), corpus: corpus.digest, lock: `sha256:${sha256(lock)}`, sdk: shipped };
await writeFile(new URL("release.json", OUT), `${JSON.stringify(release, null, 2)}\n`);
console.log(JSON.stringify(release));
