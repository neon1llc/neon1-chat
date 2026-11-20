# Changelog

neon1-chat releases use `v0.MINOR.PATCH` until the first complete release, v1.0.0 (see neon1's [versioning standard](https://github.com/neon1llc/neon1-corpus/blob/main/corpus/standards/versioning.md)). Each release is tagged on the commit that shipped it, once it's live. Corpus refreshes that change no code ship under the current release.


## Unreleased

### Changed
- Shorter README, changelog, and visitor messages.

## v0.3.1 - 2026-11-17

### Changed
- The bakery sample-proposal pointer fits more often: a reply of three or more paragraphs gives up its longest middle paragraph instead of dropping the pointer. A question about working with a tool gets workflow framing, not an invented case study. Replies in other languages keep the "typical" labels, scope limits, and contact line.

## v0.3.0 - 2026-11-16

### Changed
- Corpus refreshed from neon1-corpus v0.48.0: the Engagement shelf, new hours (Monday to Thursday 6pm to 9pm, Friday 6pm to 8pm, weekends 8am to 8pm, Eastern), "a few clients at a time", and the Report a bug section on the contact page.
- Someone describing something broken on neon1.tech, 1NEON, or Neo gets one short apology and a pointer to the Report a bug page, with no troubleshooting. The eval gains a question for it (53 now). Shipping needs a neon1-corpus release with that section, then a judged eval run.

## v0.2.11 - 2026-11-16

### Fixed
- A long reply with a case-study pointer could lose its closing line with Pradeep's email and the free call to the length limit. The pointer is now skipped when it leaves no room for that line.

## v0.2.10 - 2026-11-16

### Changed
- One model call per question again. The voice pass, a second call that rewrote "I" as "neon1", is gone. Measured on November 16, it added about 2.5 seconds, left the rubric grade unchanged, and changed meaning in 2 of 10 rewrites. Fixed rules now rewrite more first person instead: "I'd start", "without us", "my scope", and the common Spanish, French, and Chinese forms.
- Neo describes no neon1 practice the pages don't state. It gives every published price range that could fit a cost question, points to the matching case study or sample proposal, answers credential questions with the published experience and open-source tools, points compliance questions about 1NEON to the security and privacy policies, treats connecting two tools as workflow work, never says neon1 doesn't set up hardware, and names no automation tool other than Zapier or Make.
- Code guards what prompt rules didn't hold. A sentence describing an unstated neon1 practice is dropped. A sentence deciding that a law such as HIPAA applies to the visitor becomes a pointer to a lawyer or compliance advisor. An incident reply says neon1 has no emergency response. A visitor asking whether neon1 can help gets Pradeep's email and the free call, in their language, when the reply offers the work.
- Eval: 20 held-out questions (`--set holdout`) that Neo's rules are never tuned against. The judge asks again when its answer is unreadable. Two keyword patterns no longer fire on a denial ("whether neon1 holds") or a deferral ("confirm if the lease is fair").

### Removed
- Eval: `app/eval/voice.mjs`, with the voice pass. Its November 16 results stay in `app/eval/runs/`.

## v0.2.9 - 2026-11-16

### Changed
- Corpus refreshed from neon1-corpus v0.47.0: softer pricing wording, with ranges given only when a visitor asks about cost, and updated services and FAQ pages.

## v0.2.8 - 2026-11-16

### Changed
- When a reply uses "I" or "we" for neon1's work, a second pass with the same model rewrote it as "neon1" or "Pradeep", used only if it changed no link or price. `VOICE_PASS=0` turned it off. (Removed in v0.2.10.)
- A sentence claiming neon1 did similar work for a kind of client no case study names is dropped.
- Neo offers the free call or email when the visitor's next step is a person, not at the end of every reply.
- Eval: the rubric judge knows some case studies were subcontracted through Xenoss, and where Neo's directives are published.

## v0.2.7 - 2026-11-16

### Changed
- Neo answers a general question before mentioning neon1 and gives prices only when asked about cost or time. It says "neon1" or "Pradeep" instead of "I" for the work, names no third-party tool it's unsure of, never says neon1 lacks a certification the pages don't mention, and leaves whether a law such as HIPAA applies to a lawyer. For a security incident in progress it gives first steps and says neon1 has no emergency response. It names no client and claims no kind of client the case studies don't describe. A HIPAA or patient-data answer is general information, points to a lawyer, and names the BAA.
- Replies sample at temperature 0.3, down from 0.7, so facts drift less between answers.
- Eval: the rubric judge knows neon1's service list, including SOC 2 readiness work.

### Fixed
- The eval grader no longer counts "the pages don't state that neon1 guarantees" or a curly-apostrophe "can’t guarantee" as a promise.

## v0.2.6 - 2026-11-16

### Added
- Eval: a rubric grade next to the keyword grade. `npm run eval -- judge <results.json>` asks Claude Sonnet 4.6 on Bedrock whether each reply meets plain criteria built from the question's expected behavior, and records the words each verdict rests on. Security questions carry their own rubric lines.
- Eval: `npm run eval -- gate <results.json>` is the release check for Neo's answers. A judged run must pass at least as many questions as the newest judged baseline on the rubric grade, with the keyword grade as a floor.
- A production baseline, `app/eval/baseline-2026-11-16.json`, with both grades. The 2026-11-14 baseline now carries a rubric grade too.

### Changed
- Eval: keyword checks and rule checks (prices, links, promises, length) are separate functions, so the rubric grade reuses the rules.

## v0.2.5 - 2026-11-16

### Changed
- Corpus refreshed from neon1-corpus v0.46.2: the service area reads remote across the US, and the free-account and publishing pages match the site.

## v0.2.4 - 2026-11-15

### Fixed
- A long reply to an urgent or security message is shortened before the human line is added, so the line is never cut off.
- The eval grader no longer fails replies that deny a claim, such as "no discount is guaranteed" or "the pages don't state that the portal is SOC 2 certified."

## v0.2.3 - 2026-11-15

### Changed
- Cut wording that repeats a table, list, or linked page.
- Each release's changelog entry is published as its GitHub release.

## v0.2.2 - 2026-11-15

### Changed
- Shorter, plainer README and visitor error messages.

## v0.2.1 - 2026-11-14

### Changed
- Neo never states that neon1 has or lacks a certification, credential, or capability the sources don't state, names the Business Associate Agreement (BAA) requirement for health data, and always offers Pradeep on urgent, security, health-data, and hostile turns. A reply to such a message with no email or booking link gets the standard human line (`ensureHuman`).
- Eval: the patient-records question also requires the insurance the FAQ names.

## v0.2.0 - 2026-11-14

### Added
- A prospect question set (`app/eval/questions.json`, 52 questions) with checkable rules, and a runner that checks prompt assembly offline, grades a deployed endpoint (one question every 20 seconds against neon1.tech, stopping at the first 429), or asks Bedrock with this checkout's prompt. The first production baseline is `app/eval/baseline-2026-11-14.json`.
- `SCOPE` in `app/src/chat.mjs`, one switch for how far Neo goes beyond neon1's pages: `general-help` (the default) or `neon1-only`.

### Changed
- Neo is a business-information assistant that finishes the task first. It answers general technology questions as general information, and when it can't answer, it says what's missing and offers Pradeep by email or the free 15-minute call. The rules on reply length, varied openings, list names, and contact links are gone. Off-topic and general questions no longer count toward a misuse cooldown.
- Every rate-limit, daily-budget, and error message offers Pradeep by email and the free call, and a volume cooldown says that on shared Wi-Fi other people's messages count too.
- A sentence with a dollar figure the pricing page doesn't publish is removed before the visitor sees the reply.

### Removed
- The film-line handling left after Neo's lines were retired (the nod patterns, `dropNods`, the line picker, and related reply filters), which could also cut ordinary short sentences.
- `scripts/eval.mjs` and `scripts/eval-cases.mjs`, replaced by `app/eval/`.

## v0.1.2 - 2026-11-13

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
