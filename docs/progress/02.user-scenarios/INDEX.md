# 02. User Scenarios Registry (UC) — V-Model 02

English | [한국어](./INDEX.ko.md)

<!--
Schema: Single-file registry. Status = Draft→Approved→In-progress→Done.
Traceability: Every UC is derived from ≥1 REQ (01) (back-trace) and closed by ≥1 TEST-S (03) (0 orphans).
Columns = | ID | Area | Who → What → Why | Derived REQ | Status | TEST-S |
NFRs (non-functional) do not cascade to UCs; they connect REQ→TEST-S directly.
-->

| ID | Area | Who → What → Why | Derived REQ | Status | TEST-S |
|----|------|------------------|-------------|--------|--------|
| UC-001 | distribution | A distributor ships an NVA that follows the public spec so that any compatible Player can validate its structure | REQ-001, REQ-007 | Done | TEST-S-001 |
| UC-002 | playback | A user opens a `.nva` and immediately sees the default idle video | REQ-004, REQ-007 | Done | TEST-S-002 |
| UC-013 | standalone | A user opens a finished `.nva` in the static Player and plays the speech videos bundled in the package without an account, server, or GPU | REQ-018, REQ-019, NFR-005, NFR-009 | Done (#14) | TEST-S-016 |
| UC-014 | action | A user selects and plays an action registered in the NVA, and playback returns to idle afterwards | REQ-020 | Done (#14) | TEST-S-017 |
| UC-015 | local-samples | A developer or reviewer opens, one after another, the NVA samples listed in the localhost Player to check the real idle, speech, and action media | REQ-021, NFR-010 | Done (#14) | TEST-S-018 |
| UC-016 | final-package | A distributor repeatably builds a final `.nva` that contains only public consumption fields and referenced media, from an existing avatar and finished speech videos | REQ-022 | Done (#14) | TEST-S-019 |
| UC-017 | playback | A visitor opens a finished `.nva` file and checks idle, embedded speech, and actions on one screen without an account, server, or GPU | REQ-023, REQ-024, REQ-025 | Approved (#16) | TEST-S-020, TEST-S-021 |
| UC-018 | integration | A developer validates a completed-media package built to the public NVA v0.3 spec and connects the Player to a web service | REQ-023, REQ-026 | Approved (#16) | TEST-S-020, TEST-S-022 |
| UC-019 | evaluation | A visitor changes the transparent background of a character to colors or images to judge how well it fits a real service layout | REQ-027 | Approved (#16) | TEST-S-021 |
| UC-020 | playback | A visitor opens a Studio 0.2 avatar, plays the idle video, actions, and talking loop, returns to idle when stopped, and sees playback controls disabled on blocked load | REQ-028 | Approved (#22) | TEST-S-024 |
