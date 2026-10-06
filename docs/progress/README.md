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
Verification is performed by `scripts/check-traceability.mjs` (advisory by default, blocking when run with `--enforce`).
SDLC gates (P01/P03) treat these `INDEX.md` files as deliverables — an empty seed state is treated as bootstrap mode (emitting a warning but permitted), whereas once actual entries are populated, gate checks are enforced.
Markdown documentation extends only up to SPEC (feature intent) — sub-feature implementations at the unit or function level reside in code (`src/main`), and unit tests reside in `src/test`.

## 2. Developer Communication & Work Ledger (`99.dev-comm`)

Contains date-based progress, review, design, and issue notes (`<topic>-YYYY-MM-DD.md`, `issue-{N}-{slug}.md`). As an **append-only chronicle**, cross-linking is not required, and these files are exempt from document isolation checks (`check-doc-graph docs README.md --exempt progress`).
