# Acceptance Criteria — Contract Specification + Verification Replace Gates

English | [한국어](./acceptance-criteria.ko.md)

> **One-liner**: When gates inspect *surface tokens* (keywords, returncode), placeholders slip through.
> When gates inspect *machine-verifiable acceptance criteria* + *adversarial verification verdicts*, human gatekeepers become unnecessary.

This document defines a methodology to structurally prevent **"declared completion ≠ actual completion"** in autonomous workflows.
Derived from the 2026-05-30 alpha-n-naia-144 experiment (a drift where placeholder glyphs passed as "17/17 tests passing").

## 1. Motivation (Observed Drift)

A project delivered a Korean font as "implementation complete, 17/17 tests passing". However:
- 95/95 ASCII glyphs were entirely `0x00` (blank)
- `JAMO_BRIGHTNESS` violated the contract ("actual on-pixel count measurement") — repeated declared values `0,1,…,15` vs actual popcount `32~64` uncorrelated
- Lookup API `font_get_glyph` was unimplemented

**Why it passed**: Tests only inspected *function return values*, and completion gates only looked for *"passed" strings*.
**What caught it**: Providing raw data to two independent AIs (codex, gemini) immediately produced `VERDICT=FAIL` with accurate rationale from both. Furthermore, a single line of machine verification: `brightness[i] == popcount(glyph[i])` caught it deterministically.

→ Conclusion: **The means of verification already existed (adversarial review, machine verification); the gate simply never executed them.**

## 2. Two Verification Layers (Both Wired to Gates)

| Layer | What | Cost | Catches | Where |
|---|---|---|---|---|
| **Machine-verifiable acceptance criteria** | Contract-declared *command + expected outcome* (e.g. `brightness==popcount`, printable non-blank) | Cheap, deterministic | Everything decidable by machine | Written by project, executed by gate |
| **Adversarial multi-AI verification** | `review-pass` skill — independent review → vote (CONFIRMED) → arbitration | Expensive | Domain truth beyond machines | **adk skill**, invoked at phase gates |

**Principle**: Verify what is machine-verifiable mechanically (cheap and certain); leave only the remainder to adversarial review (costly but domain-specific). Humans handle only *irreversible / blast-radius* decisions (risk-based gating).

### 2.1 Adversarial Verification Is Invoked Independently (Anti-anchoring)

**Do not show preceding verdicts to reviewers.** Use parallel, isolated invocation (`review-pass` §9 known_issues + independent rounds). Anchors like inline "verified" comments or "passed by lead" can pollute *subjective judgment*.

> **Observed Fact (2026-05-30)**: For objective off-by-one bugs, capable models (codex, gemini) independently caught the bug and explicitly rejected strong anchors ("approved as CLEAN by lead" + inline "verification complete" comments) in **2 out of 2 cases** — verification at this level is robust. However, because *subjective* findings (whether a placeholder is acceptable, etc.) remain unverified, **do not rely on model robustness; enforce structurally independent invocations.** Ad-hoc cross-verification follows the same independent invocation principle as review-pass.

## 3. Contracts Declare Machine-Verifiable Acceptance Criteria (Advisory Standard)

Requirement and contract documents (`docs/contracts/*`, `docs/0N-*/`, requirements) **must not stop at abstract intent.** Explicitly specify the verification method for each item:

```markdown
### Jamo Brightness Mapping
- Intent: Measure and sort the actual on-pixel count for each jamo.
- **Acceptance Criteria (Machine verification)**: `JAMO_BRIGHTNESS[i] == popcount(FONT_GLYPHS[jamo_start+i])` for all i
- **Verification Command**: `python3 tools/verify_glyphs.py` → exit 0
```

Having only the abstract intent "actual measurement" without acceptance criteria and verification commands = **a contract where gates are rendered ineffective**.
→ The `traceability_setup` lens in the `planning` stage of `review-pass` **flags** whether each criterion is independently verifiable and whether verification commands are specified (advisory — not a block, keeping research agile).

> ⚠️ Calibration (Abstraction ↔ Specification ↔ Over-control): This standard is an **advisory** guideline. Forcing tests on every single line causes over-control and premature control (stifling research). Apply it to "core acceptance criteria decidable by machine", delegating intrinsically subjective aspects (narrative, aesthetics) to adversarial reviews and humans.

## 4. Completion Evidence = Citing Re-executable Verification (Not Keywords)

Evidence for completion declarations ("done / complete / passed") **must point to re-executable verification**:

| Evidence Grade | Example | Gate |
|---|---|---|
| **Strong** | `review-pass: CLEAN (.agents/reviews/r-...json)`, `acceptance: python3 tools/verify_glyphs.py → 0` | Pass |
| **Weak** | `Verified:`, `tests pass`, `coverage` (keywords only) | Pass with **advisory warning** — recommends citing strong evidence |
| **None** | 0 evidence | Block |

> **⚠️ Advisory requires flagship tier (Observed 2026-05-30)**: Advisory (non-blocking) warnings only work if the *acting agent heeds them*. While flagship models (claude, codex) were observed to follow advisories (electing to run verification before committing), **weaker models ignore them** (prior failure OC = acknowledged but unchanged behavior). Therefore, **advisory-level gates are valid only when main=flagship** — if a weaker agent is acting, the gate must be promoted to `enforced` (blocking). (Risk-based gating ⊥ agent tier.)

When only weak evidence is present, `completion-evidence-guard` **warns** to "cite re-executable verification (review-pass report / acceptance check)" (local = primary friction, CI = enforced). Keywords can be forged, but report paths and verification commands can be disproved by re-execution.

> **Strong evidence = Recognized only when the cited artifact actually exists** (adversarial verification lesson, 2026-05-30). `review-pass: CLEAN` text alone is insufficient — the gate **verifies the file existence** of cited report paths (`*.json/md`, `.agents/reviews/...`). If cited without existing files, it is demoted to weak evidence on suspicion of forgery. To forge it, one must *actually generate* the report (= run the verification).
>
> **Known residual (by design, CI responsibility)**: Looking only at file *existence* leaves room for reuse forgery by *substituting existing unrelated files or past reports* (codex adversarial review finding). The local hook stops here — blocking requires **relevance checks** (whether report contents include the current changeset hash/session ID/timestamp), handled in CI (`self-trust-gates.yml`). *Not tightening locally further avoids over-control* — CI offers the proper risk-to-cost balance.

## 5. Eliminating Gatekeepers (The Purpose of this Methodology)

The *only* reason human gatekeepers are needed is because automated gates are superficial (surface tokens). When gates actually execute (3) machine-verifiable criteria + (4) strong completion evidence + (2) adversarial verification, placeholders are **automatically** caught. Thus humans remain only *where verification cannot reach* (irreversible decisions, domain direction).
This is "verification instead of gatekeepers" — **verification audits the gate.**

## 6. Level Map

- **Adversarial verification capability** = `review-pass` skill, **adk level** (already implemented and proven). Do not duplicate implementation.
- **Contract specification + completion evidence grading + gate wiring** = **template level** (this document + `self_trust_config.completion`).
- The project writes its own `tools/verify_*` acceptance criteria scripts (project level).
