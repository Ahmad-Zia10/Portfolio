---
code: "DOC"
client: "Personal Project"
name: "DocSage"
year: "2025"
tags: ["GRAPH RAG", "LANGGRAPH", "FASTAPI", "EVALS", "MCP"]
repo: "https://github.com/Ahmad-Zia10"
summary: "An agentic documentation assistant over 700+ pages — hybrid retrieval, a knowledge-graph layer for multi-hop questions, and citations it can be held to."
stack:
  - "Python / FastAPI"
  - "LangChain + LangGraph"
  - "Chroma vector store"
  - "BM25 + dense hybrid retrieval"
  - "Cross-encoder reranker"
  - "LangSmith tracing"
metrics:
  - label: "Hit-rate@5"
    value: "~88%"
  - label: "Multi-hop acc."
    value: "~78%"
  - label: "Faithfulness"
    value: "~92%"
  - label: "p50 latency"
    value: "<100ms"
order: 2
---

A documentation assistant is only useful if you can trust the answer. DocSage
is built around that constraint rather than around the demo.

## Retrieval

Answers are grounded in 700+ pages of documentation using hybrid retrieval —
BM25 fused with dense vectors in Chroma, then passed through a cross-encoder
reranker. Measured on a 50-question evaluation set, that lifted hit-rate@5 to
roughly 88%.

## Multi-hop

Plain vector search falls apart on questions that span sections. I added a
Graph RAG knowledge-graph layer for multi-hop queries, reaching about 78%
accuracy on that harder slice.

## The agent loop

A stateful LangGraph agent handles intent routing, context management,
escalation, and MCP tool calls — so the assistant can decide to look something
up, ask for clarification, or hand off.

## Holding it to a standard

Generation is citation-backed at roughly 92% faithfulness, and the whole thing
is instrumented with LangSmith tracing plus an eval harness tracking sub-100ms
p50 latency. The evals are the feature.
