# The neon1.tech website: the repository README, written for developers (https://github.com/neon1llc/neon1-site)

# neon1-site

The neon1.tech website. It's a static page in `src/app/public/`, served from a private S3 bucket through CloudFront. The hosting itself lives in [neon1-aws-infrastructure](https://github.com/neon1llc/neon1-aws-infrastructure) under `site/`.

`src/app/public/shared/` holds the design that [1NEON](https://github.com/neon1llc/neon1-1NEON) loads from this site at runtime: fonts, brand colors, the rain and its controls, and the chat window (`chat.js` and `chat.css`). Changes there show up in both, so check the 1NEON sign-in screen too.

## Check and preview

You need Python 3 and Node.js. Gitleaks is used if it's installed, otherwise the secret scan runs it in Docker.

```bash
make content && make check   # HTML validation, JS syntax, anchors and asset paths, the white rabbit's lifetime, corpus blocks, release versions, asset manifest, baked models, size budget, secret scan
make content    # write the case studies, questions, Knowledge Center, and blog from the newest neon1-corpus release
make serve      # http://localhost:8000
make behavior   # the page driven in headless Chromium; needs Node's playwright package and its browser
make perf       # the white rabbit's draw calls, triangles, and resources against their budget; same needs
```

Run `make help` to list every target.

A release is named in four places: the version meta in `index.html` and `tour.html`, the footer's link text, and the top `## vX.Y.Z` entry in `CHANGELOG.md`. `make release` (part of `make check`) fails if they disagree. The white rabbit's media loader reads the meta, so it has no copy of its own.

The asset check follows each page into its stylesheets and scripts, so a missing texture or module fails it. A path a script builds at run time, like `` `/media/white-rabbit/tex/${name}.webp` ``, must be listed in `scripts/assets.json` with where its names come from, and every name it expands to must be a file. Add a new one there when you write one.

## Words from neon1-corpus

The case studies and the questions are written in [neon1-corpus](https://github.com/neon1llc/neon1-corpus), the one place neon1's public words live, and copied into `index.html` between `<!-- corpus:NAME -->` comments. Edit them there, not here. The Knowledge Center (`/knowledge/`) and the blog (`/blog/`, with an RSS feed at `/blog/feed.xml`) are generated from the same corpus, one folder of `index.html` pages per document or post, sharing the page shell in `scripts/page-shell.mjs`. Shelves and posts come from the corpus manifest, so a new document or post, or a whole new shelf, needs no change here. Each post ends with share links: plain links to each service's share page, plus Copy link and the device share sheet from `js/blog-share.js`, with no outside scripts.

Every build reads the newest corpus release (the highest `vX.Y.Z` tag; `make corpus-tag` prints it). `make content` writes all of it: the blocks in `index.html`, `/knowledge/`, `/blog/`, the sitemap's blocks, and `/llms.txt`. The `/knowledge/` and `/blog/` folders are built, never committed; the committed `index.html` blocks are only the last sync. Run `make content` after a fresh checkout and before `make check`. To pin a release, pass `CORPUS_TAG=vX.Y.Z`; to try unreleased corpus edits, pass `CORPUS_DIR=../neon1-corpus`. Checks need network access once, to fetch the release into `.corpus/`.

### Publishing a corpus release

A corpus release reaches neon1.tech without a site change. The deploy workflow's watch runs every 15 minutes (and on demand from the Actions tab): it compares the newest corpus release with `/knowledge/corpus.json` on the live site, and when they differ it runs the same checks, browser tests, PDF printing, and release switch as a site deploy, built from `main` and that corpus release. The site's version and tags don't move, since the site's own code didn't change; `/knowledge/corpus.json` names the corpus release that's live. `make rollback` switches back like any other release.

Everything stays static HTML written at build time, so search engines, link previews, and readers without JavaScript get whole pages, and the CSP needs no new origin. Nothing on a page fetches corpus content at run time; `make static` (part of `make check`) fails if a page script references the corpus or GitHub.
