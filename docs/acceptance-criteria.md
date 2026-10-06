# Acceptance Criteria — Contract Specification + Verification Replace Gates

English | [한국어](./acceptance-criteria.ko.md)

> **In brief**: When gates inspect only *surface tokens* (keywords, exit codes), placeholders slip through.
> When gates inspect *machine-verifiable acceptance criteria* and *adversarial verification verdicts*, human gatekeepers become unnecessary.

This document defines a methodology to structurally prevent **"declared completion ≠ actual completion"** in autonomous workflows.
It was derived from the 2026-05-30 alpha-n-naia-144 experiment, where a drift allowed placeholder glyphs to pass as "17/17 tests passing".

## 1. Motivation (Observed Drift)

A project delivered a Korean font as "implementation complete, 17/17 tests passing". However:
- 95/95 ASCII glyphs were entirely `0x00` (blank)
- `JAMO_BRIGHTNESS` violated the contract ("actual on-pixel count measurement") — declared values simply repeated `0,1,…,15`, showing zero correlation with actual popcount `32~64`
- Lookup API `font_get_glyph` was unimplemented

**Why it passed**: Tests only inspected *function return values*, and completion gates only looked for *"passed" strings*.
**What caught it**: Providing raw data to two independent AIs (codex, gemini) immediately produced `VERDICT=FAIL` with accurate rationale from both. Furthermore, a single line of machine verification (`brightness[i] == popcount(glyph[i])`) caught it deterministically.

→ Conclusion: **The means of verification already existed (adversarial review, machine verification); the gate simply never executed them.**

## 2. Two Verification Layers (Both Wired to Gates)

| Layer | What | Cost | Catches | Where |
|---|---|---|---|---|
| **Machine-verifiable acceptance criteria** | Contract-declared *command + expected outcome* (e.g. `brightness==popcount`, printable non-blank) | Cheap, deterministic | Everything decidable by machine | Written by project, executed by gate |
| **Adversarial multi-AI verification** | `review-pass` skill — independent review → vote (CONFIRMED) → arbitration | Expensive | Domain truth beyond machines | **adk skill**, invoked at phase gates |

**Principle**: Verify machine-verifiable criteria mechanically (inexpensive and reliable); delegate only the remainder to adversarial review (costlier, but captures domain truth). Humans handle only *irreversible or high blast-radius* decisions (risk-based gating).

### 2.1 Adversarial Verification Is Invoked Independently (Anti-anchoring)

**Do not expose preceding verdicts to reviewers.** Use parallel, isolated invocations (`review-pass` §9 known_issues + independent rounds). Anchors such as inline "verified" comments or assertions like "passed by lead" can bias *subjective judgment*.

> **Observed Fact (2026-05-30)**: When presented with objective off-by-one bugs, capable models (codex, gemini) independently caught the bug and explicitly rejected strong anchors ("approved as CLEAN by lead" along with inline "verification complete" comments) in **2 out of 2 cases** — demonstrating that verification at this level is robust. However, because *subjective* findings (such as whether a placeholder is acceptable) remain unverified, **do not rely on model robustness alone; enforce structurally independent invocations.** Ad-hoc cross-verifications must adhere to this same independent invocation principle as `review-pass`.

## 3. Contracts Declare Machine-Verifiable Acceptance Criteria (Advisory Standard)

Requirement and contract documents (`docs/contracts/*`, `docs/0N-*/`, requirements) **must not stop at abstract intent.** Explicitly specify the verification method for each item:

```markdown
### Jamo Brightness Mapping
- Intent: Measure and sort the actual on-pixel count for each jamo.
- **Acceptance Criteria (Machine verification)**: `JAMO_BRIGHTNESS[i] == popcount(FONT_GLYPHS[jamo_start+i])` for all i
- **Verification Command**: `python3 tools/verify_glyphs.py` → exit 0
```

Specifying only abstract intent such as "actual measurement" without concrete acceptance criteria and verification commands results in **a contract where gates are rendered ineffective**.
→ In `review-pass`, the `traceability_setup` lens during the `planning` stage **flags** whether each criterion is independently verifiable and whether verification commands are explicitly defined (advisory — non-blocking, keeping research agile).

> ⚠️ Calibration (Abstraction ↔ Specification ↔ Over-control): This standard is an **advisory** guideline. Forcing tests on every single line causes over-control and premature control (stifling research). Apply it to "core acceptance criteria decidable by machine", delegating intrinsically subjective aspects (narrative, aesthetics) to adversarial reviews and humans.

## 4. Completion Evidence Must Cite Re-executable Verification (Not Keywords)

Evidence for completion declarations ("done / complete / passed") **must point to re-executable verification**:

| Evidence Grade | Example | Gate |
|---|---|---|
| **Strong** | `review-pass: CLEAN (.agents/reviews/r-...json)`, `acceptance: python3 tools/verify_glyphs.py → 0` | Pass |
| **Weak** | `Verified:`, `tests pass`, `coverage` (keywords only) | Pass with **advisory warning** — recommends citing strong evidence |
| **None** | No evidence | Block |

> **⚠️ Advisory warnings presuppose flagship-tier models (Observed 2026-05-30)**: Advisory (non-blocking) warnings only work if the *acting agent heeds them*. While flagship models (claude, codex) were observed to follow advisories (electing to run verification before committing), **weaker models ignore them** (as seen in a prior OpenCode failure where the model acknowledged the warning yet left its behavior unchanged). Therefore, **advisory-level gates are valid only when main is a flagship model** — if a weaker agent is acting, the gate must be promoted to `enforced` (blocking). (Risk-based gating ⊥ agent tier.)

When only weak evidence is present, `completion-evidence-guard` **warns** the agent to "cite re-executable verification (such as a review-pass report or acceptance check)" (local = primary friction, CI = enforced). Keywords can easily be forged, whereas report paths and verification commands can be falsified or disproven by re-executing them.

> **Strong evidence is recognized only when the cited artifact actually exists** (adversarial verification lesson, 2026-05-30). The text `review-pass: CLEAN` alone is insufficient — the gate **verifies the file existence** of cited report paths (`*.json/md`, `.agents/reviews/...`). If cited without an existing file, it is demoted to weak evidence on suspicion of forgery. To forge it, an agent must *actually generate* the report (= run the verification).
>
> **Known residual risk (by design, handled by CI)**: Checking only file *existence* still leaves room for reuse forgery by *substituting existing unrelated files or past reports* (noted during codex adversarial review). The local hook stops here — blocking such attempts requires **relevance checks** (verifying whether report contents include the current changeset hash, session ID, or timestamp), which is handled in CI (`self-trust-gates.yml`). *Refraining from further tightening at the local level avoids over-control* — the risk-to-cost balance is better suited for CI.

## 5. Eliminating Gatekeepers (The Purpose of this Methodology)

The *only* reason human gatekeepers are required is because automated gates often inspect only surface-level tokens. When gates actually execute (3) machine-verifiable acceptance criteria + (4) strong completion evidence + (2) adversarial verification, placeholders are **automatically** caught. Consequently, humans need only step in *where verification cannot reach* (irreversible decisions, overarching domain direction).
This embodies "verification instead of gatekeepers" — **verification audits the gate.**

## 6. Level Map

- **Adversarial verification capability** is provided by the `review-pass` skill at the **ADK level** (already implemented and verified). Do not duplicate this implementation.
- **Contract specification, completion evidence grading, and gate wiring** belong to the **template level** (this document + `self_trust_config.completion`).
- **Individual projects** write their own `tools/verify_*` acceptance criteria scripts at the project level.
