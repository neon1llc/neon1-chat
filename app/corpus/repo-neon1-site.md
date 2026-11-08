# The neon1.tech website (https://github.com/neon1llc/neon1-site)

# neon1-site

The neon1.tech website. It's a static page in `src/app/public/`, served from a private S3 bucket through CloudFront. The hosting itself lives in [neon1-aws-infrastructure](https://github.com/neon1llc/neon1-aws-infrastructure) under `site/`.

`src/app/public/shared/` holds the design that [1NEON](https://github.com/neon1llc/1NEON) loads from this site at runtime: fonts, brand colors, the rain, and its controls. Changes there show up in both, so check the 1NEON sign-in screen too.

## Check and preview

You need Python 3 and Node.js. Gitleaks is used if it's installed, otherwise the secret scan runs it in Docker.

```bash
make check   # HTML validation, JS syntax, anchors and asset paths, size budget, secret scan
make serve   # http://localhost:8000
```

Run `make help` to list every target.

## Content Security Policy

CloudFront serves the page with a strict policy: scripts, styles, fonts, and connections only from neon1.tech, and images from neon1.tech or `data:` URLs. Keep scripts and styles in their own files, since inline `<script>`, `<style>`, `style=""` attributes, and `on…` handlers are blocked. Setting styles from JavaScript (`el.style.x = …`) is fine. A new outside origin needs a change to the policy in neon1-aws-infrastructure first.

`robots.txt`, `sitemap.xml`, and `.well-known/security.txt` are published with the page. Update the security contact's `Expires` date before it passes.

## The white rabbit

Now and then a white rabbit drops into the rain on the landing. Catching it stops the rain, and scrolling down pulls back out of an old TV into a sunlit room that ends on "go touch grass". Scrolling up plays it back. The controller is `js/white-rabbit.js`. The 3D scene in `js/white-rabbit-scene.js` and the three.js bundle in `js/vendor/` load only after a catch. Reduced motion, or a browser without WebGL, gets a still card instead.

Two query flags help with testing, and in production they only add rabbits:

- `?rabbit=now` keeps a rabbit on the landing and writes its position to `#whiteRabbit` as `data-spot`.
- `?rabbit=p0.5` catches a rabbit and jumps to that point in the scene, from `p0` to `p1`.

`make three` rebuilds the bundle from `scripts/three/entry.js` with pinned three.js and esbuild versions.

The scene's models and images are in `media/white-rabbit/`, with their credits in `media/white-rabbit/CREDITS.txt`. The car model is based on "2019 Chevrolet Camaro" by IsaacOldton (CC BY 4.0), modified: unbranded, recolored, and optimized. The trees and photographed textures come from Poly Haven (CC0).

## Deploy

Pushing to `main` runs the checks and then deploys from GitHub Actions. The workflow assumes an AWS role through OIDC, so the repo holds no AWS keys. The role ARN is the repository variable `AWS_DEPLOY_ROLE_ARN`.

To deploy by hand:

```bash
export AWS_PROFILE=neon1
make deploy invalidate verify
```

`make deploy` compares file hashes with the bucket and syncs only when something differs. Fonts and media are cached for a year and everything else revalidates on each visit, so give a changed font or image a new file name. `make invalidate` clears CloudFront only after a deploy that changed files. Add `FORCE=1` to clear it anyway. `make verify` checks that neon1.tech and www.neon1.tech return the version in the local `index.html`.

`BUCKET`, `DISTRIBUTION` and `VERIFY_URLS` can be overridden on the command line.
