# LLM Role Division Standard (Small Models ↔ Large Models)

English | [한국어](./llm-roles.ko.md)

> Defines the standard for which models to use and what tasks to assign or withhold across project scripting, synchronization, and verification.
> Motivation: Delegating judgment and editing to small models causes **context loss** and breaks consistency (a high risk). Roles are clearly separated.

## Role Division (Invariant Principles) — 3 Levels

> **Normalizing naia-agent's original 2-tier design (`naia-settings/llm.json` main/sub) into the harness standard.**
> "Deep thinking, design, substantive verification = upper tier (flagship) / syntactic verification = lower tier (light) / structure = code (no LLM)."

| Level | Responsibility | Model | naia-agent Role |
|------|---------|------|------------------|
| **0. Deterministic (No LLM)** | Structure, schema, machine-verifiable acceptance criteria (F12/F13, doc-graph, mirror hash, `brightness==popcount`) | None (scripts) | — |
| **1. Light (Lower tier)** | **Syntactic verification** + translation (.agents→.users mirror) + generation (drafts) + **flagging issues** (detection & reporting) + auto-sync | haiku / gemini-flash-lite / glm-flash | `sub` (syntactic & auxiliary) |
| **2-a. Flagship — main (Upper tier)** | **Deep thinking, design, judgment, modification** (primary conversational agent) | Opus / GPT-5.x / GLM-5.x | `main` (conversational agent) |
| **2-b. Flagship — reviewer panel (Upper tier)** | **Substantive adversarial verification** (placeholders, subtle bugs, architectural validity) — *independent* from main (anti-anchoring) | **claude · codex · glm-5.1** (multiple independent reviewers) | `sub` reviewer variant, but flagship tier |

**Key takeaways**:
- **Separate syntactic verification (Levels 0 and 1) from substantive verification (Level 2-b).** Mechanically checkable items are handled cheaply by deterministic scripts/light models; items requiring judgment undergo flagship adversarial reviews (→ two layers in `acceptance-criteria.md`).
- **Reviewers must be flagship-tier models, organized as multiple independent reviewers.** Verification carries high risk, requiring capable models. Keep reviewers isolated from the main model to prevent anchoring (`review-pass` §9, `acceptance-criteria.md` §2.1). This is implemented via the **`review-pass` skill (ADK level)**.
- **Light models only flag issues; modifications require flagship models plus cross-checking.** Delegating modifications to small models causes context loss and breaks integrity (a major risk).
- **Cross-review roster (2026-05-30)**: claude, codex, and **glm-5.1** (opencode `openrouter/z-ai/glm-5.1`). gemini-CLI is excluded due to response instability and 5+ minute latency (the verification layer requires strict timeouts and graceful degradation; see `review-pass` §6.3/§7). Paid APIs such as Vertex are optional when higher speed and reliability are required.

### Config SoT — `naia-settings/review.json`

The **canonical config** for reviewer panels and tier policies is `naia-adk/naia-settings/review.json` (a cross-repo SoT and sibling to `llm.json` main/sub/embedded). It defines `tier_policy`, `reviewers[]` (the flagship panel), and `stages`, and is consumed by the `review-pass` skill and naia-agent. This structurally aligns with naia-settings hosting configuration for naia-agent and naia-os — projects point to (or override) this canonical config instead of project-local `review-pass.yaml`. Secret references must use `apiKeyRef` (key name only).

## Execution Environment Assumptions (By Phase)

| Phase | Assumption | sub (Small Model) Invocation |
|------|------|---------------------|
| **Present — Project Level** | **Single CLI** (one of claude / codex / gemini) | Headless mode of that CLI + light model |
| **Future — naia-agent** | **Multi-CLI + Multi-API Keys** | naia-agent routes main/sub (replaces this adapter with router) |

### Single CLI Invocation Patterns (Verified 2026-05-30)

| CLI | Headless | Light Model Specification | Sync Script env |
|-----|----------|------------------|---------------------|
| **claude** | `claude -p` (prompt via stdin) | `--model haiku` | `MIRROR_LLM_CLI=claude MIRROR_SUB_MODEL=haiku` |
| **gemini** | `gemini -p "<prompt>"` | `-m gemini-3.1-flash-lite` (small model — flash-lite, not flash) | `MIRROR_LLM_CLI=gemini` |
| **codex** | `codex exec "<prompt>"` | `-c model=<계정 가능 모델>` (a model available to your account) | `MIRROR_LLM_CLI=codex` (note ChatGPT account model constraints) |

> Default: In a Claude Code environment, use `claude -p --model haiku`. `scripts/mirror-translate.mjs` branches based on the above env.

## Detection Tiers (Obvious Errors Caught Immediately Without LLMs)

Catch errors by scale, starting from the **least expensive**. Deterministic scripts detect large and obvious errors immediately, requiring no models.

| Tier | What It Catches | Means | Cost |
|------|------------|------|------|
| **1. Deterministic Checks** (No LLM) | **Structural defects** (F12/F13 violations, unregistered dirs), stale mirrors (hash mismatch), doc isolation, CI evidence/SDLC violations | `enforce-root-structure.sh`, `mirror-translate --check`, `check-doc-graph.mjs`, `ci-verify-*.mjs`, `src/test/*.test.mjs` | 0 (instant) |
| **2. Small Models** | Subtle issues missed by Tier 1 — **flagging** terminology violations, awkward translations, semantic mismatches | check-terminology + small model | Low |
| **3. Large Models + Cross-check** | **Fixing & deciding** on issues flagged by Tiers 1 & 2 | Main model (with adversarial review) | High (only when needed) |

> Principle: **Errors above a certain magnitude are caught in Tier 1 (deterministic)** — structural defects are detected immediately.
> Models (especially large models) are deployed only to subtle areas that determinism cannot capture. Inexpensive checks run first; expensive judgments are reserved for the end.

## Model Assignment by Task

| Task | Model | Tool |
|------|------|------|
| `.agents`→`.users` mirror translation | Small model | `scripts/mirror-translate.mjs` |
| Doc isolation detection (flagging) | Script (No LLM) / Small model if needed | `scripts/check-doc-graph.mjs` |
| Flagging terminology violations | Small model | `scripts/check-terminology.mjs` |
| Structure & CI verification (flagging) | Script (No LLM) | `ci-verify-*.mjs`, `enforce-root-structure.sh` |
| **Fixing** flagged issues | **Large model + cross-check** | (Human / Main model) |

## Verification
- `src/test/llm-roles.test.mjs` — Verifies that the mirror-translate adapter branches CLI and model choices via environment variables, with no hardcoded model calls.
