# Process status

> SoT mirror of `.agents/context/process-status.json`.

## Current work

- Issue: `nva-state-engine-validation`
- Title: NVA state-based speech-engine validation prototype
- Status: held
- Started: 2026-06-21
- Last updated: 2026-07-13

Current canonical direction: state-based NVA resources. Final talking-head continuity is held for RTX 3090 cascade validation.

Each generated primary state binds:

- idle video
- talking-body video
- cropped face preview
- face bbox
- a talking-head video set whose final transition keys are not yet fixed

The `sil/a/i/u/e/o` six-clip implementation remains a verified prototype, not the final continuity contract. Directional transitions may require up to n² clips; interpolation or another strategy remains possible. Resume after the RTX 3090 cascade benchmark selects the contract. Gestures remain separate single clips.

Editor validation covers state gallery, asset completeness, prosody routing, TTS talking-body plus head overlay, Naia original idle/gesture preservation, and Playwright visual evidence.

## SDLC gates

| Gate | Status | Deliverable |
|------|:------:|-------------|
| P01 user_scenarios | done | `docs/progress/02.user-scenarios/INDEX.md` (`UC-001..UC-004`, `UC-VM-001..UC-VM-006`, `UC-RES-001..UC-RES-005`) |
| P02 test_scenarios | done | `docs/progress/03.uc-tests/INDEX.md` (`TEST-S-001..TEST-S-005`, `UCT-VM-001..UCT-VM-006`, `UCT-RES-001..UCT-RES-005`) |
| P03 requirements | done | `docs/progress/01.requirements/INDEX.md` (`REQ-001..REQ-008`, `REQ-VM-001..REQ-VM-008`, `REQ-RES-001..REQ-RES-005`) |
| P04 integration_test | held | The held prototype Playwright suite passes 14/14 and builder evidence is recorded. Current `nva-core` validation still fails the v0.1 migration case because the migrated manifest has no `state_engine`. Transition-contract tests must be revised after the RTX 3090 benchmark. |
| P05 requirements_complete | held | Historical six-clip prototype evidence is retained; final completion waits for the RTX 3090 talking-head transition benchmark. |

## Session checklist

Start:

- Read `.agents/context/process-status.json`.
- Confirm `current_work`.
- Update `last_updated` when making process changes.
- Confirm SDLC gates before coding.

End:

- Mark completed gates done with deliverables.
- Mirror updates to this file.
- Include process status files with the change set.
