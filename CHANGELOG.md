# Changelog

neon1-chat releases use `v0.MINOR.PATCH` until the first complete release, v1.0.0 (see neon1's [versioning standard](https://neon1.tech/knowledge/standards/versioning/)). Each release is tagged on the commit that shipped it, once it's live. Corpus refreshes that change no code ship under the current release.

## v0.1.0 - 2026-11-10

The first tagged release. Neo had been live at neon1.tech/chat, deployed from main without version numbers; this entry records what that release holds.

### Added
- Neo, the site's assistant, answering from neon1's public pages as built from neon1-corpus releases, with Qwen3 Next 80B on Amazon Bedrock.
- Neo's character: plain answers first, and at most one fitting line from the films, never on policy, privacy, security, money, booking, or contact answers.
- Abuse handling: misuse strikes, repeat and decline strikes, and escalating cooldowns per address (IPv6 per /64).
- A health check that reports the commit, corpus, and lockfile, which each release verifies through neon1.tech.
- A daily corpus refresh that opens a pull request when neon1-corpus has a new release.

### Fixed
- One model generation per question, and the flagged-reply counter stays within the request deadline.
