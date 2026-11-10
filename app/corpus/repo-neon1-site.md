# The neon1.tech website: the repository README, written for developers (https://github.com/neon1llc/neon1-site)

# neon1-site

The neon1.tech website. It's a static page in `src/app/public/`, served from a private S3 bucket through CloudFront. The hosting itself lives in [neon1-aws-infrastructure](https://github.com/neon1llc/neon1-aws-infrastructure) under `site/`.

`src/app/public/shared/` holds the design that [1NEON](https://github.com/neon1llc/neon1-1NEON) loads from this site at runtime: fonts, brand colors, the rain and its controls, and the chat window (`chat.js` and `chat.css`). Changes there show up in both, so check the 1NEON sign-in screen too.

## Check and preview

You need Python 3 and Node.js. Gitleaks is used if it's installed, otherwise the secret scan runs it in Docker.

```bash
make check      # HTML validation, JS syntax, anchors and asset paths, the white rabbit's lifetime, corpus blocks, release versions, asset manifest, baked models, size budget, secret scan
make corpus     # rewrite the case studies and questions from the pinned neon1-corpus tag
make serve      # http://localhost:8000
make behavior   # the page driven in headless Chromium; needs Node's playwright package and its browser
make perf       # the white rabbit's draw calls, triangles, and resources against their budget; same needs
```

Run `make help` to list every target.

A release is named in four places: the version meta in `index.html` and `tour.html`, the footer's link text, and the top `## vX.Y.Z` entry in `CHANGELOG.md`. `make release` (part of `make check`) fails if they disagree. The white rabbit's media loader reads the meta, so it has no copy of its own.

The asset check follows each page into its stylesheets and scripts, so a missing texture or module fails it. A path a script builds at run time, like `` `/media/white-rabbit/tex/${name}.webp` ``, must be listed in `scripts/assets.json` with where its names come from, and every name it expands to must be a file. Add a new one there when you write one.

## Words from neon1-corpus

The case studies and the questions are written in [neon1-corpus](https://github.com/neon1llc/neon1-corpus), the one place neon1's public words live, and copied into `index.html` between `<!-- corpus:NAME -->` comments. Edit them there, not here. To bring a corpus change in, tag a corpus release, set `CORPUS_TAG` in the `Makefile`, and run `make corpus`. `make check` fails if the blocks differ from the pinned tag. To try unreleased corpus edits, run `make corpus CORPUS_DIR=../neon1-corpus`.

The generated blocks are committed, so the deploy stays a plain copy of `src/app/public/` and nothing is fetched while someone reads the page. Checks need network access once, to fetch the tag into `.corpus/`.

## Content Security Policy

CloudFront serves the page with a strict policy: scripts, styles, fonts, and connections only from neon1.tech, and images from neon1.tech or `data:` URLs. Keep scripts and styles in their own files, since inline `<script>`, `<style>`, `style=""` attributes, and `on…` handlers are blocked. Setting styles from JavaScript (`el.style.x = …`) is fine. A new outside origin needs a change to the policy in neon1-aws-infrastructure first.

`robots.txt`, `sitemap.xml`, and `.well-known/security.txt` are published with the page, and so are the square icons at fixed URLs: `/favicon.ico`, `/favicon-48.png`, and `/apple-touch-icon.png`. The structured data names `/media/neon1-logo-512.png` as the logo and keeps the wide link-preview card for `og:image`. `make icons` redraws all four from the bar's mark. Update the security contact's `Expires` date before it passes.
