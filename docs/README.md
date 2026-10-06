# Documentation Index (docs)

English | [한국어](./README.ko.md)

The entry point (hub) for this directory. All curated documents must be reachable from here
(preventing document isolation, as enforced by `scripts/check-doc-graph.mjs`). Root `AGENTS.md`
(=CLAUDE/GEMINI/OPENCODE/CODEX) is the project entry point, and this file serves as the internal index for `docs/`.

## Standards & Structure

- [Project Structure Specification](./project-structure.md) — F12/F13 root whitelist, directory conventions
- [Threat Model](./threat-model.md) — Security boundaries, secret isolation (T3), untracked paths
- [LLM Role Division](./llm-roles.md) — Division between light (small) models ↔ large models, single CLI adapter, detection tiers
- [Acceptance Criteria](./acceptance-criteria.md) — Contract specification + verification replacing gates (eliminating gatekeepers). Completion evidence grades (strong/weak/none)

## Work Progress (progress/)

`docs/progress/` is an **append-only work ledger** — date-based progress and review notes.
As a chronicle, cross-linking is not mandatory (exempt from orphan checks via `check-doc-graph --exempt progress`).

## Periodic Verification

Drifts in structure, documentation, and mirrors are detected by deterministic scripts. After migration completion,
run background periodic verification via `scripts/verify-watch.sh start` (or `cron`) — detection and reporting are automated, while corrections require a human/large model gate.
For details: "Detection Tiers" in [LLM Role Division](./llm-roles.md).
