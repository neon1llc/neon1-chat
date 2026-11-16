# The neon1.tech website: the repository README, written for developers (https://github.com/neon1llc/neon1-site)

# neon1-site

The neon1.tech website: a static page in `src/app/public/`, served from a private S3 bucket through CloudFront. The hosting lives in [neon1-aws-infrastructure](https://github.com/neon1llc/neon1-aws-infrastructure) under `site/`.

`src/app/public/shared/` holds the design that [1NEON](https://github.com/neon1llc/neon1-1NEON) loads from this site: fonts, brand colors, the rain and its controls, and the chat window (`chat.js` and `chat.css`). Changes show up in both, so check the 1NEON sign-in screen too.

## Check and preview

You need Python 3 and Node.js. The secret scan uses Gitleaks if installed, otherwise Docker.

```bash
make content && make check   # HTML validation, JS syntax, anchors and asset paths, the white rabbit's lifetime, corpus blocks, release versions, asset manifest, baked models, size budget, secret scan
make content    # write the case studies, questions, Knowledge Center, and blog from the newest neon1-corpus release
make serve      # http://localhost:8000
make behavior   # the page driven in headless Chromium; needs Node's playwright package and its browser
make perf       # the white rabbit's draw calls, triangles, and resources against their budget; same needs
```

Run `make help` to list every target.

A release version appears in the version meta of `index.html` and `tour.html`, the footer's link text, and the top `## vX.Y.Z` entry in `CHANGELOG.md`. `make release` (part of `make check`) fails if they disagree.

The asset check follows each page into its stylesheets and scripts, so a missing texture or module fails it. List a path a script builds at run time, like `` `/media/white-rabbit/tex/${name}.webp` ``, in `scripts/assets.json` with where its names come from. Every name it expands to must be a file.

## Words from neon1-corpus

The case studies and the questions are written in [neon1-corpus](https://github.com/neon1llc/neon1-corpus), where neon1's public words live, and copied into `index.html` between `<!-- corpus:NAME -->` comments. Edit them there, not here. The Knowledge Center (`/knowledge/`) and the blog (`/blog/`, with an RSS feed at `/blog/feed.xml`) come from the same corpus, one folder of `index.html` pages per document or post, using the page shell in `scripts/page-shell.mjs`. Shelves and posts come from the corpus manifest, so new ones need no change here. Each post ends with share links to each service's share page, plus Copy link and the device share sheet from `js/blog-share.js`, with no outside scripts.

Every build reads the newest corpus release (the highest `vX.Y.Z` tag; `make corpus-tag` prints it). `make content` writes the blocks in `index.html`, `/knowledge/`, `/blog/`, the sitemap's blocks, and `/llms.txt`. The `/knowledge/` and `/blog/` folders are built, never committed, and the committed `index.html` blocks are only the last sync.

- Pin a release with `CORPUS_TAG=vX.Y.Z`.
- Try unreleased corpus edits with `CORPUS_DIR=../neon1-corpus`.
- Checks need network access once, to fetch the release into `.corpus/`.

### Publishing a corpus release

A corpus release reaches neon1.tech without a site change. The deploy workflow's watch runs every 15 minutes, or on demand from the Actions tab. It compares the newest corpus release with `/knowledge/corpus.json` on the live site. When they differ, it runs the same checks, browser tests, PDF printing, and release switch as a site deploy, built from `main` and that corpus release. The site's version and tags don't move, and `/knowledge/corpus.json` names the corpus release that's live.

Everything is static HTML written at build time, so search engines, link previews, and readers without JavaScript get whole pages. Nothing on a page fetches corpus content at run time. `make static` (part of `make check`) fails if a page script references the corpus or GitHub.

## Light and dark

Everything below the landing's rain comes in awake (light) or matrix (dark). `js/theme.js` runs in each page's head before the stylesheets, sets `html[data-site-theme]` from the visitor's pick (localStorage `neon1.theme`), else awake, and wires the switch in the bar (the `frame:theme` block). Pages color the light surface with the tokens at the top of `css/frame.css` (`--page`, `--surface`, `--ink-rgb`, `--brand-rgb`, and the rest); the matrix block there redefines them, so a new rule that uses the tokens works in both themes. A fixed color on the light surface shows up wrong in matrix. The rain, the hero, and the white rabbit keep their own colors. 1NEON has its own theme setting (`data-theme`), which the site's attribute never touches.
