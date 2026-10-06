# 05. Feature Tests Registry (TEST-F) — V-Model 05

English | [한국어](./INDEX.ko.md)

<!--
Schema: Single-file registry. Integrated test plan verifying SPECs (04).
Traceability: Every SPEC closes into ≥1 TEST-F. TEST-F points to ≥1 SPEC (back-trace, 0 orphans).
Columns = | ID | Target SPEC | Test Summary | test_ref | Status |
-->

| ID | Target SPEC | Test Summary | test_ref | Status |
|----|-----------|-------------|----------|------|
| TEST-F-001 | SPEC-001, SPEC-002 | demo.nva manifest → validateManifest VALID, invalid manifest → INVALID | node nva-core (manual verification) | Done |
| TEST-F-002 | SPEC-002 | findTransitionPath/reachableStates: verify stand→sit_down→sit path, sit→stand_up | node nva-core (manual verification) | Done |
| TEST-F-003 | SPEC-003 | viewer headless capture: chroma-keyed character + state transition + head-talking | /tmp/cap.mjs (playwright) | Done |
| TEST-F-004 | SPEC-004 | editor export → unzip = manifest.json + clips ×7 (9 entries) | /tmp/cap2.mjs (playwright) | Done |
| TEST-F-005 | SPEC-002, SPEC-005 | nva-core unit tests (validation, pose, state machine, scenarios) 18 asserts ALL PASS | src/test/nva-core.test.mjs | Done |
| TEST-F-007 | SPEC-007 | Clip preview control, multilingual labels, selected animation playback wiring contract + actual browser clicks | src/test/editor-clip-preview.test.mjs + Playwright test | Done |
| TEST-F-008 | SPEC-008 | Verify new standard values are 720×1280 + `[104,0,512,512]`, Ditto region has integer coordinates, exact 512×512 within canvas, preserved separately from face bbox | src/test/nva-core.test.mjs + Playwright test | Done |
| TEST-F-009 | SPEC-009 | Eyedropper button, multilingual guidance, source video drawImage/getImageData, coordinate conversion, `chroma_key` save wiring and actual background pixel click verification | src/test/editor-chroma-eyedropper.test.mjs + Playwright test | Done |
| TEST-F-010 | SPEC-010 | Contract verify that absolute cascade ref URLs remain in manifest and are excluded from zip file list, and verify 8099→8910 connection, ref selection, speech playback, and 0 browser 4xx errors via Playwright | src/test/editor-ref-url.test.mjs + Playwright E2E (2026-07-15) | Done |
| TEST-F-011 | SPEC-011 | Contract verify canvas input, aspect-ratio-based player sizing, exact 512×512 head generation wiring from `ditto_region`, and load 720×1280 and non-standard aspect ratio NVAs via Playwright to verify actual canvas size and display ratio | src/test/editor-responsive-canvas.test.mjs + Playwright | Done |
