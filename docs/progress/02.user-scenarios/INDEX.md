# 02. User Scenarios Registry (UC) — V-Model 02

English | [한국어](./INDEX.ko.md)

<!--
Schema: Single-file registry. Status = Draft→Approved→In-progress→Done.
Traceability: Every UC is derived from ≥1 REQ (01) (back-trace) and closed by ≥1 TEST-S (03) (0 orphans).
Columns = | ID | Area | Who → What → Why | Derived REQ | Status | TEST-S |
NFRs (non-functional) do not cascade to UCs; they connect REQ→TEST-S directly.
-->

| ID | Area | Who → What → Why | Derived REQ | Status | TEST-S |
|----|------|--------------------|----------|------|--------|
| UC-001 | authoring | Character creator bundles clips into an nva bundle and validates it to produce a distributable avatar | REQ-001, REQ-005, REQ-007 | Done | TEST-S-001, TEST-S-004 |
| UC-002 | playback | Operator plays the avatar via viewer and demonstrates state transitions (standing/sitting/dancing/talking) | REQ-002, REQ-003, REQ-004 | Done | TEST-S-002, TEST-S-003 |
| UC-003 | directing | Creator/operator specifies directing scenarios (state/event/dialogue sequences) or target states → automatic directing transitions via pose pathfinding (Authoring guide: flow and timing demonstration) | REQ-002, REQ-008 | Done | TEST-S-002 |
| UC-004 | sharing | Creator exports edited avatar as a single `.nva` file to share or distribute | REQ-006 | Done | TEST-S-004 |
| UC-005 | authoring | Creator plays current media immediately next to selected animation clip inputs to verify quality before and after replacement | REQ-009 | Done | TEST-S-006 |
| UC-006 | authoring | Creator independently designates center-top 512×512 Ditto input region and actual face position within standard 720×1280 video to guarantee unresized compositing | REQ-010 | Done | TEST-S-007 |
| UC-007 | authoring | Creator clicks eyedropper on source video frame to designate keying color without guessing chroma key colors or manually entering color values | REQ-011 | Done | TEST-S-008 |
| UC-008 | integration | Creator connects from `http://localhost:8099/src/main/editor.html` to `http://localhost:8910` cascade, selects default ref voice, and verifies numeric sentences as video with audio | REQ-012 | Done | TEST-S-009 |
| UC-009 | authoring | Creator edits canvas for NVAs with different aspect ratios without distortion, generating matching 512×512 head sources from the selected fixed 512×512 Ditto region | REQ-013 | Done | TEST-S-010 |
