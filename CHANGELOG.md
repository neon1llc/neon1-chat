# Changelog

neon1-chat releases use `v0.MINOR.PATCH` until the first complete release, v1.0.0 (see neon1's [versioning standard](https://github.com/neon1llc/neon1-corpus/blob/main/corpus/standards/versioning.md)). Each release is tagged on the commit that shipped it, once it's live. Corpus refreshes that change no code ship under the current release.

## Unreleased

### Changed
- Neo's voice is its own: with neon1-corpus retiring Neo's film lines, any short film nod the model adds is dropped from every reply, not only answers about money, privacy, or security.

## v0.1.1 - 2026-11-12

### Changed
- The corpus may total 140,000 characters, up from 120,000, so the weekly refresh can take neon1-corpus v0.35.1 (about 126,000) and Neo answers from current pages again.

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

## Before v0.1.0

Neo shipped from main for several days before releases were tagged. These pre-releases mark the points in that history where a meaningful piece landed, on the commits as they are on main. They were tagged on 2026-11-10; the dates below are when each one shipped.

### v0.1.0-alpha.7 - 2026-11-10
- Review fixes: one model generation per question, a bounded flagged-reply counter, and every check before any AWS change.

### v0.1.0-alpha.6 - 2026-11-09
- Lines from the films, at most one per reply and only where the meaning fits, never in place of the answer.

### v0.1.0-alpha.5 - 2026-11-09
- Answers from Qwen3 Next 80B once the permission boundary allowed it.

### v0.1.0-alpha.4 - 2026-11-09
- Neo's character from neon1-corpus, misuse strikes, and escalating cooldowns.

### v0.1.0-alpha.3 - 2026-11-09
- The corpus built from neon1-corpus releases instead of scraping neon1.tech, and the licensing set out.

### v0.1.0-alpha.2 - 2026-11-09
- A hardening pass: one conversation contract, safe answers when caps or the model fail, validated caps and service alarms, a broader test set, and origin secret rotation.

### v0.1.0-alpha.1 - 2026-11-08
- Neo on neon1.tech: steadier answers with labeled links, a per-minute limit, the neon1 permission boundary, and 1NEON's FAQs in the corpus.
