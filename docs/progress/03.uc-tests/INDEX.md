# 03. Scenario Tests Registry (TEST-S) — V-Model 03

English | [한국어](./INDEX.ko.md)

<!--
Schema: Single-file registry. System/acceptance tests verifying UCs (02) and NFRs (01).
Traceability: Every UC closes into ≥1 TEST-S. TEST-S points to ≥1 UC or NFR-REQ (back-trace, 0 orphans).
Columns = | ID | Target (UC/REQ) | Scenario Summary | Type | test_ref | Status |
-->

| ID | Target (UC/REQ) | Scenario summary | Type | test_ref | Status |
|----|-----------------|------------------|------|----------|--------|
| TEST-S-001 | UC-001, REQ-001, REQ-007 | A valid NVA passes validation, while bundles with path escape, missing assets, oversize content, or tampering are rejected | Node integration | src/test/nva-core.test.mjs + src/test/nva-bundle-loader.test.mjs | Done |
| TEST-S-002 | UC-002, REQ-004, REQ-007 | After an NVA loads, the default idle clip is decoded and shown in the Player | Chromium | src/test/standalone-player.e2e.py | Done |
| TEST-S-005 | NFR-001, NFR-002, NFR-005 | The Player loads with only a static HTTP server and Chromium and shows animation without external services | Chromium | src/test/standalone-player.e2e.py | Done |
| TEST-S-016 | UC-013, REQ-018, REQ-019, NFR-005, NFR-009 | In the static Player, finished speech with embedded audio plays and stops, idle is restored, there are zero external requests, and no real-time or generation executables exist | Node+Chromium | src/test/nva-animation-player.test.mjs + src/test/public-player-surface.test.mjs + src/test/standalone-player.e2e.py | Done (#14) |
| TEST-S-017 | UC-014, REQ-020 | idle/action derivation and the return to idle after an action completes, is stopped, or fails | Node+Chromium | src/test/nva-animation-player.test.mjs + src/test/standalone-player.e2e.py | Done (#14) |
| TEST-S-018 | UC-015, REQ-021, NFR-010 | Open the prepared NVA samples in order from the ignored localhost catalog, play each speech video with audio, then confirm the return to idle and zero errors | Python+Node+Chromium | src/test/local-sample-prep.test.py + src/test/sample-catalog.test.mjs + src/test/local-samples.e2e.py | Done (#14) |
| TEST-S-019 | UC-016, REQ-022 | The same input yields a byte-identical NVA, generation fields and unreferenced assets are excluded, and speech videos without audio are rejected | Python | src/test/final-nva.test.py | Done (#14) |
| TEST-S-020 | UC-017, UC-018, REQ-023..REQ-026 | Opening a v0.3 completed-media NVA validates the manifest and bundle paths and builds the idle, embedded speech, and action lists | Integration (node) | src/test/nva-bundle-loader.test.mjs, src/test/nva-animation-player.test.mjs | Done (#16) |
| TEST-S-021 | UC-017, UC-019, REQ-024, REQ-025, REQ-027 | Open an NVA in the browser, go idle → speech/action → back to idle, and change the background color and image | Browser (Playwright) | src/test/standalone-player.e2e.py | Done (#16) |
| TEST-S-022 | UC-018, REQ-023, REQ-026, NFR-011, NFR-012 | The public schema validates v0.3 as canonical and stays read-compatible with existing v0.2 `locale` manifests | Contract (node) | src/test/nva-core.test.mjs | Done (#16) |
| TEST-S-023 | NFR-013, NFR-014 | Public executable code, examples, and UI contain no create, editor, TTS, real-time generation, or Cascade entry points and no external runtime dependencies | Static contract (node) | src/test/public-service-surface.test.mjs, src/test/security.test.mjs | Done (#16) |
| TEST-S-024 | UC-020 | In the browser, verify Studio 0.2 idle, actions, talking loop playback, safe return to idle when stopped, blocked-after-good controls disabling, and superseded play request silence | Browser (Playwright) | src/test/standalone-player.e2e.py | Approved (#22) |
| TEST-S-025 | UC-021, REQ-029, NFR-015 | In the browser, verify Studio v0.2 prop action sequence (enter → main 2x → exit → idle), absence of intermediate completion message, prop auxiliary clip exclusion from actions, label disambiguation, and 200 MiB archive / 400 MiB expanded limit compliance | Browser (Playwright) | src/test/standalone-player.e2e.py | Approved (#25) |
