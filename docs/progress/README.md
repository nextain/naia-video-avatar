# progress — V-Model Traceability Deliverables + Work Ledger

English | [한국어](./README.ko.md)

This directory serves two roles:

## 1. V-Model Traceability Registry (`01`~`05`)

Each stage uses a **single-file INDEX.md registry** (no separate document per item ❌ — prevents documentation explosion).

| Stage | Directory | Deliverable | ID |
|------|----------|--------|-----|
| 01 | `01.requirements/INDEX.md` | Requirements | REQ-### |
| 02 | `02.user-scenarios/INDEX.md` | User scenarios | UC-### |
| 03 | `03.uc-tests/INDEX.md` | Scenario tests | TEST-S-### |
| 04 | `04.features/INDEX.md` | Feature specs | SPEC-### |
| 05 | `05.features-tests/INDEX.md` | Feature tests | TEST-F-### |

Traceability chain: **REQ → UC → TEST-S**, **UC → SPEC → TEST-F** (0 orphans).
Validator = `scripts/check-traceability.mjs` (default advisory, blocked with `--enforce`).
SDLC gates (P01/P03) treat these INDEX files as deliverables — empty seed state is treated as bootstrap (warning/permitted); filling actual entries enforces gates.
Markdown is used up to SPEC (feature intent) — unit/function levels below belong in code (`src/main`), and unit tests belong in `src/test`.

## 2. Developer Communication & Work Ledger (`99.dev-comm`)

Date-based progress, review, design, and issue notes (`<topic>-YYYY-MM-DD.md`, `issue-{N}-{slug}.md`). As an **append-only chronicle**, cross-linking is not required, and it is exempt from document isolation checks (`check-doc-graph docs README.md --exempt progress`).
