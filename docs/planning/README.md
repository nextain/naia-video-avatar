# Planning and Artifact Mapping

English | [한국어](./README.ko.md)

This directory defines the planning documents for the naia-video-avatar project and establishes the mapping between standard canonical artifacts defined by [naia-pj-adk](https://github.com/nextain/naia-pj-adk) and this repository's existing documentation and registries.

---

## 1. Standard Artifact Mapping Table

To maintain backward compatibility with historical issues, commits, and verification scripts, existing registries and identifiers are preserved. New documents adopt standard identifiers.

| Standard Artifact | Name / Description | naia-video-avatar Location | Identifier Rule |
|---|---|---|---|
| **PC** | Product Concept (High-level concept) | [docs/planning/PC.md](./PC.md) | `PC` |
| **SP** | Screen Plan (UI wireframe / layout) | [docs/planning/SP.md](./SP.md) | `SP-NN` (e.g., `SP-01`) |
| **UC** | User Scenario (User journey) | [docs/progress/02.user-scenarios/INDEX.md](../progress/02.user-scenarios/INDEX.md) | `UC-NNN` |
| **RQ** | Requirements (Functional / non-functional) | [docs/progress/01.requirements/INDEX.md](../progress/01.requirements/INDEX.md) | `REQ-NNN`, `NFR-NNN` |
| **PL** | Plan / Architecture (Technical roadmap) | [docs/planning/PL.md](./PL.md) | `PL` |
| **FE** | Feature Specification (Feature units) | [docs/progress/04.features/INDEX.md](../progress/04.features/INDEX.md) | `SPEC-NNN` |
| **UT** | Unit & Feature Test (Automated test) | [docs/progress/05.features-tests/INDEX.md](../progress/05.features-tests/INDEX.md) | `TEST-F-NNN` |
| **IT** | Integration Test Receipt (No UI) | [docs/receipts/](../receipts/README.md) | `RECEIPT-IT-{ISSUE}-{YYYYMMDD}-{SEQ}` |
| **E2E** | End-to-End User Journey Test Receipt | [docs/receipts/](../receipts/README.md) (linked to [03.uc-tests](../progress/03.uc-tests/INDEX.md)) | `RECEIPT-E2E-{ISSUE}-{YYYYMMDD}-{SEQ}` / `TEST-S-NNN` |
| **QC** | Quality Control (Adversarial validation) | [docs/receipts/](../receipts/README.md) | `QC-NN` |

---

## 2. Planning and Implementation Order

Development strictly follows the top-down planning and bottom-up implementation principle:

```text
[Top-down Planning]
PC (Product Concept)
  └── SP (Screen Plan)
        └── UC (User Scenario)
              └── RQ (Requirements)
                    └── PL (Technical Plan)
                          └── FE (Feature Specification)

[Pre-issue Scope Lock]
Human approves requirement units and acceptance criteria before creating issues.

[Bottom-up Implementation & Verification]
UT (Unit & Feature Test)
  └── IT (Integration Test Gate without UI)
        └── UI Implementation & Backend Connection (aligned with UC)
              └── E2E (End-to-End User Journey Verification)
                    └── QC (Independent Adversarial Validation on PC & SP)
```

### Key Principles

- **Top-down planning, bottom-up implementation**: Requirements flow from product concept and screen layout downwards; implementation begins with working minimal units and expands upwards.
- **Pre-issue scope lock**: Requirement units and acceptance criteria must be approved by a human before creating issues or starting implementation.
- **No screen expansion before the IT gate passes**: Integration tests verifying actual modules without mock objects must pass before developing and expanding screens.
- **Do not build standalone screens first**: Screens must be implemented and connected to verified modules against user scenarios (UC).
- **Closure condition**: Every implementation unit requires both passing IT and E2E receipts to close. Only units whose screen plan (SP) defines no screen are exempt from E2E (citing the exact SP section).
- **Feedback loop**: Any specification error found during implementation is fixed in the upstream planning document first, then reflected downstream.

---

## 3. Canonical Pipeline References

This workflow aligns with the canonical pipeline specifications from [naia-pj-adk](https://github.com/nextain/naia-pj-adk):

- [OVERVIEW.ko.md](https://github.com/nextain/naia-pj-adk/blob/main/docs/pipeline/OVERVIEW.ko.md) — Document-first full-scope feature pipeline
- [FLOW.ko.md](https://github.com/nextain/naia-pj-adk/blob/main/docs/pipeline/FLOW.ko.md) — Document, issue, queue, and verification workflow
- [TERMINOLOGY.ko.md](https://github.com/nextain/naia-pj-adk/blob/main/docs/pipeline/TERMINOLOGY.ko.md) — Terminology dictionary and communication policy
- [TEST-RECEIPT.ko.md](https://github.com/nextain/naia-pj-adk/blob/main/docs/pipeline/TEST-RECEIPT.ko.md) — Standard test receipt format

---

## 4. Planning Documents in this Directory

- [PC.md](./PC.md) ([한국어](./PC.ko.md)) — Product concept and ownership boundaries
- [SP.md](./SP.md) ([한국어](./SP.ko.md)) — Player screen layout, wireframe, and interaction states
- [PL.md](./PL.md) ([한국어](./PL.ko.md)) — Architecture, module decomposition, and technical plan
