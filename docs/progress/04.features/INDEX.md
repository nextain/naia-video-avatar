# 04. 湲곕뒫 ?ㅺ퀎 Registry (SPEC) ??V紐⑤뜽 04

<!--
?ㅽ궎留? ?????뚯씪 registry. UC(02)瑜?援ы쁽 媛?ν븳 湲곕뒫 ?⑥쐞(SPEC)濡?遺꾪빐.
異붿쟻: 紐⑤뱺 SPEC???? UC瑜?媛由ы궎怨???텛??, ?? TEST-F(05)濡??ロ엺??(orphan 0).
而щ읆 = | ID | ?좊룄 UC | 湲곕뒫 ?붿빟 | area | ?곹깭 | TEST-F |
-->

| ID | ?좊룄 UC | 湲곕뒫 ?붿빟 | area | ?곹깭 | TEST-F |
|----|---------|-----------|------|------|--------|
| SPEC-001 | UC-001 | nva manifest JSON Schema (states/transitions/poses/layers/meta) | src/main/nva-schema.json | Done | TEST-F-001 |
| SPEC-002 | UC-001, UC-003 | nva-core: validateManifest + findTransitionPath + reachableStates + NvaStateMachine | src/main/nva-core.js | Done | TEST-F-001, TEST-F-002 |
| SPEC-003 | UC-002 | viewer: ?щ줈留??뚰뙆 ?덉씠???⑹꽦 + ?곹깭 ?꾪솚 ?ъ깮 + ?ㅻ뱶?좏궧 ?ㅻ쾭?덉씠 | src/main/viewer.html | Done | TEST-F-003 |
| SPEC-004 | UC-004 | editor: manifest ?몄쭛 + 誘몃━蹂닿린 + ?좏슚??+ `.nva`(JSZip) export | src/main/editor.html | Done | TEST-F-004 |
| SPEC-005 | UC-003 | scenario runner(playScenario)+listScenarios ?먮룞 ?곗텧 ?ъ깮 | src/main(viewer+core) | Done | TEST-F-005 |
| SPEC-006 | UC-003 | demo.html: nva ?쒕굹由ъ삤 ??cascade(?ㅼ궗?? ?ㅼ떆媛??뚮뜑 ?쒖뿰 (kiosk-v3) | src/main/demo.html | Done | TEST-F-006 |
## 2026-07-12 V-model features

| ID | UC | Feature | Area | Status | Feature Test |
|----|----|---------|------|--------|--------------|
| FE-VM-001 | UC-VM-001 | Primary state-set contract: `neutral/happy/sad/angry/surprised/thinking` only for first-pass generated states. | schema, validator, builder, manifests | Held | FT-VM-001 |
| FE-VM-002 | UC-VM-001, UC-VM-003 | State asset completeness: each primary state has idle, talking body, face preview, face bbox, a talking-head set, and sync metadata. Head transition keys remain provisional. | `state_engine`, schema, validator | Held | FT-VM-002 |
| FE-VM-003 | UC-VM-002 | Generated face/head quality gate: full head, eyes open, forward gaze, identity preserved, no text/color placeholder. | asset generation, review artifact, editor QA | Held | FT-VM-003 |
| FE-VM-004 | UC-VM-004 | Original idle/gesture preservation: source idle and gestures remain visible/playable and are not overwritten by generated states. | editor, manifests, runtime tests | Held | FT-VM-004 |
| FE-VM-005 | UC-VM-005 | VoxCPM2 prosody routing map from tags to primary talking states. | manifest, runtime adapter | Held | FT-VM-005 |
| FE-VM-006 | UC-VM-002, UC-VM-003, UC-VM-004 | Editor review UI for cropped state gallery, asset completeness, gesture section, and explicit missing-state blocking. | `src/main/editor.html` | Held | FT-VM-006 |
| FE-VM-007 | UC-VM-006 | Playwright visual evidence harness for load/gallery/state/TTS overlay quality review. | tests, artifacts | Held | FT-VM-007 |


## 2026-07-12 State resource preview features

| ID | UC | Feature | Area | Status | Feature Test |
|----|----|---------|------|--------|--------------|
| FE-RES-001 | UC-RES-001 | State tile click drives main preview to the selected state's full-body idle clip. | `src/main/editor.html` | Held | FT-RES-001 |
| FE-RES-002 | UC-RES-002 | Selected-state resource inspector lists required state assets, the provisional talking-head set, and missing states. | `src/main/editor.html` | Held | FT-RES-002 |
| FE-RES-003 | UC-RES-003 | Resource title-adjacent preview buttons handle image and video resources. | `src/main/editor.html` | Held | FT-RES-003 |
| FE-RES-004 | UC-RES-004 | Resource preview is isolated from TTS engine preview. | `src/main/editor.html` | Held | FT-RES-004 |
| FE-RES-005 | UC-RES-005 | TTS debug exposes body clip, selected head transition, mouth-shape state, body/head ready states, and TTS error state. | `src/main/editor.html` | Held | FT-RES-005 |

## 2026-07-12 TTS input text features

| ID | UC | Feature | Area | Status | Feature Test |
|----|----|---------|------|--------|--------------|
| FE-TEXT-001 | UC-TEXT-001 | Default TTS text is a natural Korean state-engine verification sentence. | `src/main/editor.html` | Done | FT-TEXT-001 |
| FE-TEXT-002 | UC-TEXT-002 | A separate viseme smoke sample action fills `aiueo`. | `src/main/editor.html` | Done | FT-TEXT-002 |
| FE-TEXT-003 | UC-TEXT-003 | TTS debug exposes clean spoken text after prosody tag stripping. | `src/main/editor.html`, `src/main/nva-core.js` | Done | FT-TEXT-003 |
| FE-TEXT-004 | UC-TEXT-004 | Editor hint/doc states cascade/Ditto text should be pre-normalized into spoken form. | `src/main/editor.html`, `docs/prebaked-webm-nva.md` | Done | FT-TEXT-004 |
