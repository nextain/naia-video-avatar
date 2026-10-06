# 03. Scenario Tests Registry (TEST-S) — V-Model 03

English | [한국어](./INDEX.ko.md)

<!--
Schema: Single-file registry. System/acceptance tests verifying UCs (02) and NFRs (01).
Traceability: Every UC closes into ≥1 TEST-S. TEST-S points to ≥1 UC or NFR-REQ (back-trace, 0 orphans).
Columns = | ID | Target (UC/REQ) | Scenario Summary | Type | test_ref | Status |
-->

| ID | Target (UC/REQ) | Scenario Summary | Type | test_ref | Status |
|----|------------------|---------------|------|----------|------|
| TEST-S-001 | UC-001 | Load nva bundle → validateManifest VALID (0 warnings) | Integration (node) | examples/demo.nva + nva-core | Done |
| TEST-S-002 | UC-002, UC-003 | stand_talk→sit_talk automatically inserts sit_down transition and plays seated pose | Capture (headless) | /var/tmp/nva_dance.png, nva_sit_speak.png | Done |
| TEST-S-003 | UC-002 | Head-talking mouth overlay at face_bbox + chroma compositing during speaking | Capture (headless) | /var/tmp/nva_sit_speak.png | Done |
| TEST-S-004 | UC-004 | Editor export → `.nva` (zip) = manifest.json + clips/ ×7 | Capture + unzip | /var/tmp/exported.nva | Done |
| TEST-S-005 | NFR-001, NFR-002 | Render viewer/editor in browser + static http server without GPU | Capture (playwright) | /tmp/cap.mjs, cap2.mjs | Done |
| TEST-S-006 | UC-005 | Select `speak` in editor → trigger preview next to clip → center player plays selected clip | Browser + contract (node) | src/test/editor-clip-preview.test.mjs + Playwright test | Done |
| TEST-S-007 | UC-006 | Display and verify `[104,0,512,512]` region in 720×1280 standard video, maintaining actual face guides separately | Unit + browser | src/test/nva-core.test.mjs + Playwright test | Done |
| TEST-S-008 | UC-007 | Activate eyedropper in editor → click background pixel of center source video → RGB applied to `chroma_key` and color input, applied immediately to preview | Browser + contract (node) | src/test/editor-chroma-eyedropper.test.mjs + Playwright test (`#267d35`) | Done |
| TEST-S-009 | UC-008 | Load 8099 editor → connect to default URL 8910 → check ref list / default URL → trigger `안녕하세요, 반가워요.` speech → player receives MP4 with audio, 0 invalid `.../http://...` ref requests | Browser + contract (node) | src/test/editor-ref-url.test.mjs + Playwright E2E (2026-07-15) | Done |
| TEST-S-010 | UC-009 | Load manifests with aspect ratios different from 720×1280, verifying canvas aspect ratio/coordinates are preserved, and head PNG generated from video frame is 512×512 matching manifest `ditto_region` | Browser + contract (node) | src/test/editor-responsive-canvas.test.mjs + Playwright (`tmp/nva-editor-responsive-canvas.png`) | Done |
