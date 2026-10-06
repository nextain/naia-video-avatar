# 04. Feature Specifications Registry (SPEC) — V-Model 04

English | [한국어](./INDEX.ko.md)

<!--
Schema: Single-file registry. Decomposes UCs (02) into implementable feature units (SPECs).
Traceability: Every SPEC points to ≥1 UC (back-trace) and closes into ≥1 TEST-F (05) (0 orphans).
Columns = | ID | Derived UC | Feature Summary | Area | Status | TEST-F |
-->

| ID | Derived UC | Feature Summary | Area | Status | TEST-F |
|----|---------|-----------|------|------|--------|
| SPEC-001 | UC-001 | nva manifest JSON Schema (states/transitions/poses/layers/meta) | src/main/nva-schema.json | Done | TEST-F-001 |
| SPEC-002 | UC-001, UC-003 | nva-core: validateManifest + findTransitionPath + reachableStates + NvaStateMachine | src/main/nva-core.js | Done | TEST-F-001, TEST-F-002 |
| SPEC-003 | UC-002 | viewer: chroma/alpha layer compositing + state transition playback + head-talking overlay | src/main/viewer.html | Done | TEST-F-003 |
| SPEC-004 | UC-004 | editor: manifest editing + preview + validation + `.nva` (JSZip) export | src/main/editor.html | Done | TEST-F-004 |
| SPEC-005 | UC-003 | scenario runner (playScenario) + listScenarios automated scenario playback | src/main (viewer+core) | Done | TEST-F-005 |
| SPEC-007 | UC-005 | editor: preview button next to clip path input plays selected animation in center player | src/main/editor.html | Done | TEST-F-007 |
| SPEC-008 | UC-006 | nva-core/editor: new 720×1280 standard with `ditto_region=[104,0,512,512]` default, pixel contract validation & guide display, independent `face_bbox` editing | src/main/nva-core.js + src/main/editor.html | Done | TEST-F-008 |
| SPEC-009 | UC-007 | editor: in eyedropper mode, converts center canvas coordinates to source video frame pixels to read RGB, applying to `chroma_key` and color input | src/main/editor.html | Done | TEST-F-009 |
| SPEC-010 | UC-008 | editor: `/health` → `/ref/voices` → `/upload_nva` → `/stream_text` connection pipeline and external reference retention for absolute ref URLs (bundles include relative/local refs only) | src/main/editor.html | Done | TEST-F-010 |
| SPEC-011 | UC-009 | editor: edit manifest canvas width/height, responsive preview based on true aspect ratio, generate 512×512 `head_image` precisely captured from video's `ditto_region` | src/main/editor.html + src/main/nva-core.js | Done | TEST-F-011 |
