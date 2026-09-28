@AGENTS.md

# Delegation

Dispatch a sub-agent for larger or multi-step work (multi-file changes,
parallelizable research, anything that benefits from a fresh, isolated
context). Handle quick, obvious edits directly — a one-line fix or a
single config value doesn't need the overhead of spawning an agent.

- One sub-agent per task, plan first.
- Run independent sub-agents in parallel.
- Read the sub-agent's report, but also check the actual diff/build
  output before calling a task done — a report describes what the agent
  intended to do, not necessarily what it actually did.

## Model routing

Pass `model` on every Agent call:

- Fable 5.1: architecture, hard bugs, review
- Opus 5.5: edits, tests, docs, refactors — also easier tasks that don't
  need Fable
- Haiku 4.5: lookups and summaries
