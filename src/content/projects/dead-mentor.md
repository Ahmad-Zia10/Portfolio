---
code: "MNT"
client: "Personal Project"
name: "Dead Mentor"
year: "2025"
tags: ["RAG", "PERSONAS", "LANGGRAPH", "MONGODB"]
repo: "https://github.com/Ahmad-Zia10"
summary: "Conversations with historical thinkers where every opinion is traceable to a source text — no invented philosophy."
stack:
  - "Python / LangGraph"
  - "LangChain loaders"
  - "Per-persona vector stores"
  - "MongoDB checkpointing"
metrics:
  - label: "Hallucinated views"
    value: "Eliminated"
  - label: "Memory"
    value: "Cross-session"
order: 3
---

The obvious failure mode for a "talk to a dead philosopher" app is that the
model cheerfully invents opinions the person never held. Dead Mentor is
designed so it can't.

## Grounding

Each persona is a multi-persona conversational agent with RAG over that
thinker's actual source texts. Every response is citation-backed, which
removes the invented-opinion problem at the root rather than patching it in
the prompt.

## Persona isolation and memory

I implemented per-persona vector stores using LangChain loaders, so one
thinker's corpus never bleeds into another's. LangGraph stateful agents manage
conversational memory and persona switching across sessions, persisted through
MongoDB checkpointing — you can leave and come back to the same thread.
