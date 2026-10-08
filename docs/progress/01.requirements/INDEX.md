# 01. Requirements Registry (REQ) — V-Model 01

English | [한국어](./INDEX.ko.md)

<!--
Schema: Single-file registry (no separate document per item ❌). Status = Draft→Approved→In-progress→Done.
Traceability: Every REQ closes into ≥1 UC (02), or if NFR, connects directly to ≥1 TEST-S (03) (0 orphans).
Columns = | ID | Area | Requirement | Status | UC | SPEC | TEST |
scripts/check-traceability.mjs parses this table.
Empty state (this notice comment only) = SDLC gate bootstrap (warn/permit). Populating actual REQs enforces gates.
-->

| ID | Area | Requirement | Status | UC | SPEC | TEST |
|----|------|-------------|--------|----|----|------|
| REQ-001 | format | Define the NVA v0.3 completed-media format as a JSON manifest and a ZIP bundle consumption contract | Done | UC-001 | SPEC-001 | TEST-S-001 |
| REQ-004 | player | The Player reads a single `.nva` file and shows the default idle video | Done | UC-002 | SPEC-003 | TEST-S-002 |
| REQ-007 | validation | The Player rejects NVA files with an invalid manifest, bundle-relative path, required asset, size, or hash before playback | Done | UC-001, UC-002 | SPEC-001, SPEC-002 | TEST-S-001, TEST-S-002 |
| NFR-001 | deploy | The Player runs on a static web server and a supported browser without a GPU | Done | — | SPEC-003 | TEST-S-005 |
| NFR-002 | packaging | The Player has a static HTML entry point that can be served directly without a build step | Done | — | SPEC-003 | TEST-S-005 |
| NFR-004 | dependencies | The NVA manifest validation core has no runtime external dependencies | Done | — | SPEC-002 | TEST-F-001 |
| NFR-005 | gpu-free | The playback path requires no generation model, CUDA, or generation VRAM | Done (#14) | — | SPEC-003, SPEC-016, SPEC-017 | TEST-S-005, TEST-S-016 |
| REQ-018 | oss-scope | The public product is limited to the NVA consumption spec, schema, validators, and a read-only Player; it contains no Editor, Studio, or generation-server implementation | Done (#14) | UC-013 | SPEC-018 | TEST-S-016 |
| REQ-019 | completed-speech | The Player lists, plays, and stops finished speech videos with embedded audio contained in the `.nva`, and returns to idle after completion, stop, or error | Done (#14) | UC-013 | SPEC-016 | TEST-S-016 |
| REQ-020 | actions | The Player lists and plays the idle and action media of an NVA, and returns to idle after an action or speech completes, is stopped, or fails | Done (#14) | UC-014 | SPEC-017 | TEST-S-017 |
| NFR-009 | frontend-only | The Player requires no external API, account, or key to play a finished NVA, and contains no real-time speech, lip-sync, or generation features | Done (#14) | — | SPEC-016, SPEC-018 | TEST-S-016 |
| REQ-022 | final-package | The deterministic packaging tool takes an existing NVA and finished speech videos with embedded audio and builds a v0.3 `.nva` that excludes generation fields and unreferenced assets | Done (#14) | UC-016 | SPEC-021 | TEST-S-019 |
| REQ-021 | local-catalog | A local static server can read a same-origin JSON catalog so that prepared NVA samples can be selected and loaded, while the manual file-picker path is preserved | Done (#14) | UC-015 | SPEC-019, SPEC-020 | TEST-S-018 |
| NFR-010 | local-privacy | Prepared local samples are excluded from Git, and the catalog records only a display name and a same-origin relative NVA URL, never original absolute paths, faces, voices, or generation information | Done (#14) | — | SPEC-019, SPEC-020 | TEST-S-018 |
| REQ-023 | format | The public NVA canonical form is `nva_version: 0.3` with `profile: completed-media`, and it references only finished videos containing idle, action, and speech | Approved (#16) | UC-017, UC-018 | SPEC-022 | TEST-S-020, TEST-S-022 |
| REQ-024 | player | A single service-style web page opens a local `.nva` or a public sample and plays idle, embedded speech, and actions | Approved (#16) | UC-017 | SPEC-023 | TEST-S-020, TEST-S-021 |
| REQ-025 | playback | After a one-shot speech or action finishes or fails, playback safely returns to the idle video | Approved (#16) | UC-017 | SPEC-023 | TEST-S-020, TEST-S-021 |
| REQ-026 | validation | ZIP paths, sizes, the manifest, and media references are validated in the browser, and unplayable packages are blocked before playback | Approved (#16) | UC-018 | SPEC-022 | TEST-S-020, TEST-S-022 |
| REQ-027 | presentation | The Player lets users preview a transparent character over a color or a user-selected image background | Approved (#16) | UC-019 | SPEC-023 | TEST-S-021 |
| NFR-011 | compatibility | v0.2 stays read-compatible only; new documents, schemas, and examples use v0.3 | Approved (#16) | — | — | TEST-S-022 |
| NFR-012 | deploy | Runs with only a static file server and an ordinary browser; no account, key, server API, or GPU is needed | Approved (#16) | — | — | TEST-S-021, TEST-S-022 |
| NFR-013 | public-boundary | Create, editor, TTS, real-time generation, Cascade, production prompts, and internal pipelines are excluded from public executable code and examples | Approved (#16) | — | — | TEST-S-023 |
| NFR-014 | simplicity | The default public screen offers only the controls needed to open a file, play, and check the background; it has no node graph or authoring timeline | Approved (#16) | — | — | TEST-S-021, TEST-S-023 |
| REQ-028 | compatibility | The Player plays the talking loop (loop, can_talk) of v0.2 bundles, ignores unknown extension keys, opens the demo example, disables controls on blocked load, and silences superseded play requests (read compatibility under NFR-011) | Approved (#22) | UC-020 | SPEC-024 | TEST-S-024 |
