# Documentation Index (docs)

English | [한국어](./README.ko.md)

This file serves as the entry point (hub) for this directory. All curated documents must be reachable from here
(preventing document isolation, as enforced by `scripts/check-doc-graph.mjs`). While the root `AGENTS.md`
(along with its mirrors: `CLAUDE.md`, `GEMINI.md`, `OPENCODE.md`, `CODEX.md`) is the project-wide entry point, this file serves as the internal index for `docs/`.

## Standards & Structure

- [Project Structure Specification](./project-structure.md) — F12/F13 root allowlist and directory conventions
- [Threat Model](./threat-model.md) — Security boundaries, secret isolation (T3), and untracked paths
- [LLM Role Division](./llm-roles.md) — Division of responsibilities between small (light) models and large models, single CLI adapter patterns, and detection tiers
- [Acceptance Criteria](./acceptance-criteria.md) — How contract specifications and verification replace traditional gates (eliminating gatekeepers), with completion evidence grades (strong/weak/none)

## Work Progress (progress/)

`docs/progress/` is an **append-only work ledger** recording date-based progress and review notes.
Because it functions as a chronicle, cross-linking is not mandatory (exempt from orphan checks via `check-doc-graph --exempt progress`).

## Periodic Verification

Drifts in structure, documentation, and mirrors are detected by deterministic scripts. After migration is complete,
periodic verification runs in the background via `scripts/verify-watch.sh start` (or `cron`) — detection and reporting are fully automated, while corrections are gated by human review or large models.
For details, see "Detection Tiers" in [LLM Role Division](./llm-roles.md).
