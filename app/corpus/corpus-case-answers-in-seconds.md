# Answers in seconds, with sources (https://neon1.tech/)

Staff spent minutes searching Microsoft 365, or asked a senior colleague.

*accounting firm · cloud & AI*

**~5 min → 14 s** lookup · recall 72% → 94%

| | In short |
|---|---|
| **The problem** | Staff spent minutes searching Microsoft 365, or asked a senior colleague. |
| **The work** | An AWS Bedrock assistant that answers from approved documents each person may see. |
| **The results** | Timed real lookups before and after, and scored 80 test questions. |
| **After handover** | Next, an MCP server so agents search with the same permissions. |

## The problem

The firm's knowledge was spread across Microsoft 365: policies, manuals, Word files, PDFs, and client documents. A routine lookup took 2 to 10 minutes, often by asking a senior colleague. Drafts, old versions, and restricted files sat next to the right answer, so a simple chatbot would have been risky.

The ask: let staff ask normal questions, return the approved answer with its document, and never make the AI more authoritative than the source.

## The work

This was my first project with an AWS partner, [Xenoss](https://xenoss.io), who helped with design and maintenance. I handled ingestion, embeddings, retrieval, and answer quality.

- Only approved Microsoft 365 libraries sync into versioned, encrypted S3, with source, version, and access details.
- Bedrock Knowledge Bases, Titan embeddings, and OpenSearch Serverless run hybrid search, so exact form numbers match as well as reworded questions.
- Each question is checked against what that person may see before retrieval, and the assistant answers from the passages, with citations, or says it doesn't know. How well it kept to that is measured below.
- Terraform and GitHub Actions deploy it, and CloudWatch tracks ingestion, retrieval, and answer time.

## The results

| Measure                                  | Before       | After  |
|------------------------------------------|--------------|--------|
| Median lookup, answer and source checked | ~4.8 min     | 13.6 s |
| Slowest 5% of lookups                    | up to 10 min | ~24 s  |
| Right passage found (recall at 8)        | 72%          | 94%    |
| Answers fully supported by their source  | 78%          | 92%    |
| Interruptions of senior staff per week   | ~18          | ~7     |

Measured on 80 representative questions, including ones it should refuse, judged by two reviewers. A fast answer from the wrong document counted as a failure.

These results describe that test set, not a guarantee: 8% of answers weren't fully supported, so each answer carries citations to check.

In the client's words:

> "The work helped quicken the direction that we were moving on for some time, working toward a completely centralized single cloud for our org, assets and products used. And using AI safely and intentionally. The knowledge base project was a push forward for us on both fronts. Thanks Pradeep!"
>
> Boris M., Boris M Tax

## After handover

Microsoft 365 stays the source of truth, and the index can be rebuilt from it anytime. The firm decides which documents are approved and who sees them. Next is an MCP server over the same retrieval, so agents use the firm's knowledge with the same permissions, then narrow, reviewable agent actions where they save real time.
