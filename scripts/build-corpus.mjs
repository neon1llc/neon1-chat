// scripts/build-corpus.mjs - Rebuild app/corpus from neon1's public sources only.
// Usage: node scripts/build-corpus.mjs
//
// Every source is already public: the live neon1.tech page and the READMEs of public
// repositories. Nothing private is read, so the assistant can't repeat anything private.

import { writeFile, mkdir } from "node:fs/promises";

const OUT = new URL("../app/corpus/", import.meta.url);

// The live site, and the public repositories it links in its open source section
const SITE = "https://neon1.tech/";
const REPOS = [
  ["neon1-site", "The neon1.tech website"],
  ["1NEON", "1NEON, the client portal"],
  ["neon1-aws-infrastructure", "Terraform for neon1.tech on AWS"],
  ["aws-clip", "AWS CLIP (AWS CLI Plus)"],
];

// Characters kept per README, so one long README can't crowd out the site
const MAX_README = 5000;

// Decode the few entities the site uses, so the text reads naturally
function decode(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;|&ndash;/g, "-");
}

// Turn the page into plain text with headings kept as Markdown, links as "text (url)",
// and scripts, styles, SVG art, and the hidden easter egg dropped
function pageText(html) {
  const body = html
    .replace(/<head[\s\S]*?<\/head>/i, "")
    .replace(/<(script|style|svg|template|noscript)[\s\S]*?<\/\1>/gi, "");

  return decode(
    body
      .replace(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => `\n\n${"#".repeat(Number(level))} ${inner}\n\n`)
      .replace(/<a [^>]*href="([^"#][^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => `${inner} (${new URL(href, SITE).href})`)
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

// Fetch text, failing loudly so a broken source never ships an empty corpus
async function get(url) {
  const res = await fetch(url, { headers: { "user-agent": "neon1-chat corpus builder" } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

await mkdir(OUT, { recursive: true });

// The site is the main source; everything the assistant says should trace back to it
const site = pageText(await get(SITE));
await writeFile(new URL("site.md", OUT), `# neon1.tech (${SITE})\n\n${site}\n`);
console.log(`site.md: ${site.length} chars`);

// Repository READMEs describe the open source work in the owner's own words
for (const [repo, title] of REPOS) {
  const readme = (await get(`https://raw.githubusercontent.com/neon1llc/${repo}/main/README.md`)).trim();

  // Long READMEs are cut at a section break; the overview is what visitors ask about
  const cut = readme.length > MAX_README ? readme.slice(0, readme.lastIndexOf("\n## ", MAX_README)) : readme;
  const text = `# ${title} (https://github.com/neon1llc/${repo})\n\n${cut.trim()}\n`;
  await writeFile(new URL(`repo-${repo.toLowerCase()}.md`, OUT), text);
  console.log(`repo-${repo.toLowerCase()}.md: ${text.length} chars`);
}
