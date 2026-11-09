# Answers in seconds, with sources (https://neon1.tech/)

Staff spent minutes hunting through Microsoft 365, or interrupted a senior colleague.

*accounting firm · cloud & AI*

**~5 min → 14 s** lookup · recall 72% → 94%

| | In short |
|---|---|
| **Needs** | Staff spent minutes hunting through Microsoft 365, or interrupted a senior colleague. |
| **Execute** | An assistant on AWS Bedrock that answers only from approved documents each person may see. |
| **Observe** | Timed real lookups before and after, and scored 80 test questions for accuracy. |
| **Normalize** | Next, an MCP server over the same search, so agents get answers with the same permissions. |

## Needs

The firm's knowledge was spread across Microsoft 365: policies, procedure manuals, Word files, PDFs, and client documents. Staff could usually find an answer, but a routine lookup took 2 to 10 minutes, and often meant asking a senior colleague who knew where things lived. Drafts, old versions, and client-restricted files sat right next to the right answer, so a simple chatbot would have been risky.

The ask was simple: let staff ask normal questions, return the approved answer with its document, and never make the AI more authoritative than the source.

## Execute

This was my first project with an AWS partner, [Xenoss](https://xenoss.io), who helped with design and now with maintenance. I handled ingestion, embeddings, retrieval, and answer quality.

- Only documents in approved Microsoft 365 libraries are synced into versioned, encrypted S3, keeping their source, version, and access details.
- Bedrock Knowledge Bases with Titan embeddings and OpenSearch Serverless run hybrid search, so exact accounting terms and form numbers match as well as differently worded questions.
- Each question is checked against what that person is allowed to see before anything is retrieved. Answers come only from the retrieved passages, with citations, or the assistant says it doesn't know.
- Built with Terraform and deployed through GitHub Actions, with CloudWatch tracking ingestion, retrieval, and answer time separately.

## Observe

| Measure                                  | Before       | After  |
|------------------------------------------|--------------|--------|
| Median lookup, answer and source checked | ~4.8 min     | 13.6 s |
| Slowest 5% of lookups                    | up to 10 min | ~24 s  |
| Right passage found (recall at 8)        | 72%          | 94%    |
| Answers fully supported by their source  | 78%          | 92%    |
| Interruptions of senior staff per week   | ~18          | ~7     |

Measured on 80 representative questions, including ones the assistant should refuse, and judged by two reviewers. A fast answer from the wrong document counted as a failure.

## Normalize

Microsoft 365 stays the source of truth, and the search index can be rebuilt from it at any time. The firm owns which documents are approved and who can see them. Next is an MCP server in front of the same retrieval, so assistants and agents can use the firm's knowledge with the same per-person permissions, followed by narrow, reviewable agent actions where they save real time.
