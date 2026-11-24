# AI quality and oversight (https://neon1.tech/)

When neon1 uses AI, how it's tested before anyone relies on it, and where a person stays in charge.

I use AI when it makes a defined task better after counting errors, review time, privacy, cost, and upkeep. A smooth demo doesn't show dependability, so I start with AI a person can check and correct, and earn autonomy with evidence. How AI is used in my own work is in [How I work with AI](../policies/ai-use.md).

## Whether AI belongs in the solution

I compare the current process, a simple rule or search, an existing product, and a narrow AI approach. Ordinary software wins when rules are clear and mistakes costly. AI tends to help with drafting, sorting messy text, summarizing shareable documents, and finding the right passage, with a clear sense of when to double-check.

I use the [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) and its [generative AI profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf) as prompts for who's responsible, what the task is, how it's tested, and what risk is left. They don't certify anything.

## One page on intended use

Before choosing a model we write down the user, task, approved data, output, allowed actions, forbidden decisions, reviewer, and fallback, and whether the output is a draft, a search aid, a recommendation, or an action, since each needs different checks.

A document-search assistant can find an invoice or policy passage without being fit for accounting or legal conclusions, and the interface says so. We also set a spending limit, a response time, and acceptable review effort.

## A test set that looks like the real work

We collect permitted examples and write expected answers before tuning: ordinary and vague requests, missing information, outdated documents, conflicting sources, odd formats, and cases to refuse or send to a person. Building examples stay separate from final-check examples.

Twenty or thirty cases find early problems but can't support a broad reliability claim.

## Testing the whole task

Correctness, evidence, access boundaries, refusals, actions, speed, cost, and human effort are checked separately, with the same cases run the old way. For search assistants I compare what was retrieved with what was claimed, since a plausible citation isn't proof. Extraction is checked field by field against rules, and classification per category, since an overall score can hide failure on rare ones that matter.

A model used as judge is checked against a small person-graded set.

## Permissions live outside the model

Access is enforced by the application and search layer, never by a prompt. Retrieved documents, emails, web pages, and tool output are untrusted input, since [prompt injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) is a real risk even with retrieval.

Tools start read-only. Sending, spending, changing permissions, or deleting needs a person to review the actual recipient, content, or change first, because an approve button protects little if you can't see what it approves. Run time, retries, output size, and spend all have limits.

## Releasing in stages

1. **Offline.** Tested on permitted examples, away from live data.
2. **Shadow.** Runs alongside the normal process without changing anything, so we can compare.
3. **Assisted pilot.** Named people use the output on a limited task, with a fallback and a way to report problems.
4. **Controlled use.** Expanded only when you accept the evidence, the remaining risks, and the running cost.

Some services are best left assisted for good.

## When to stop

Release is blocked by a serious unauthorized disclosure or action in testing, unresolved serious errors, no working recovery, or costs and review effort that cancel the benefit. The AI part can always be switched off while the essential task continues by hand or something simpler.

## After launch

We track task success, corrections, review minutes, cost per success, and speed, and look for groups it might be failing. Any change to the model, prompt, documents, or permissions reruns the test set. A provider's benchmark says nothing about your documents.

## What I'll say publicly

Only scoped statements with their conditions: "In a twenty-case test using made-up records, it completed eighteen without correction," if that's what happened. Never "reliable AI for every business."

## Sources

- [AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework), NIST: mapping, measuring, and managing the risks of an AI system.
- [Generative AI profile, NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf), NIST: risks particular to language models, with suggested actions.
- [Top 10 for LLM applications](https://genai.owasp.org/llm-top-10/), OWASP: the common ways AI features are misused, starting with prompt injection.
