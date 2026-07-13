# 05. 湲곕뒫 ?뚯뒪??Registry (TEST-F) ??V紐⑤뜽 05

<!--
?ㅽ궎留? ?????뚯씪 registry. SPEC(04)??寃利앺븯???듯빀 ?뚯뒪??怨꾪쉷.
異붿쟻: 紐⑤뱺 SPEC???? TEST-F濡??ロ엺?? TEST-F???? SPEC??媛由ы궓????텛?? orphan 0).
而щ읆 = | ID | 寃利?SPEC | ?뚯뒪???붿빟 | test_ref | ?곹깭 |
-->

| ID | 寃利?SPEC | ?뚯뒪???붿빟 | test_ref | ?곹깭 |
|----|-----------|-------------|----------|------|
| TEST-F-001 | SPEC-001, SPEC-002 | demo.nva manifest ??validateManifest VALID, ?섎せ??manifest ??INVALID | node nva-core (?섎룞 寃利? | Done |
| TEST-F-002 | SPEC-002 | findTransitionPath/reachableStates: stand?뭩it_down?뭩it 寃쎈줈, sit?뭩tand_up 寃利?| node nva-core (?섎룞 寃利? | Done |
| TEST-F-003 | SPEC-003 | viewer headless 罹≪퀜: ?щ줈留??쒓굅 罹먮┃??+ ?곹깭?꾪솚 + ?ㅻ뱶?좏궧 | /tmp/cap.mjs (playwright) | Done |
| TEST-F-004 | SPEC-004 | editor export ??unzip = manifest.json + clips 횞7 (9 entries) | /tmp/cap2.mjs (playwright) | Done |
| TEST-F-005 | SPEC-002, SPEC-005 | nva-core ?⑥쐞(寃利씲룻룷利댟룹긽?쒕㉧?졖룹떆?섎━?? 18 assert ALL PASS | src/test/nva-core.test.mjs | Done |
| TEST-F-006 | SPEC-006 | kiosk-v3 媛뺣궓援??곕え ?ㅻ뱶由ъ뒪 罹≪퀜 (?ㅼ궗??諛쒗솕 + ?먮쭑) | playwright headless | Done |
## 2026-07-12 V-model feature tests

| ID | Feature | Feature test | test_ref | Status |
|----|---------|--------------|----------|--------|
| FT-VM-001 | FE-VM-001 | Schema/validator/builder/manifests reject non-primary generated states and generated bundles contain exactly six primary states. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |
| FT-VM-002 | FE-VM-002 | Negative tests fail when any primary state lacks idle, talking body, face preview, face bbox, the selected talking-head transition set, or sync metadata. The six-clip test remains historical. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |
| FT-VM-003 | FE-VM-003 | Visual-quality gate rejects placeholder/text/color swatch previews through hash-bound reviewed asset artifacts and checklist evidence. | `examples/*-prebaked.nva/asset-quality.review.json`, Playwright tests | Held |
| FT-VM-004 | FE-VM-004 | Naia original `idle`, `water_drop`, and `heart` gesture clips remain listed and playable after state-engine addition. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |
| FT-VM-005 | FE-VM-005 | Prosody tag routing maps representative VoxCPM2 tags to primary states and rejects routes to missing states. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |
| FT-VM-006 | FE-VM-006 | Editor UI verifies cropped gallery, state asset rows, missing-head blocking, and separate gesture playback. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |
| FT-VM-007 | FE-VM-007 | Playwright stores screenshot artifacts for editor gallery, selected state idle, TTS talking-body, talking-head overlay, and gestures. | `.agents/work/test-results/nva-state-engine/*.png` | Held |

### 2026-07-12 adversarial review remediation

The first planning review found feature-test coverage was too weak to block placeholder or structural-only passes. These feature-test contracts are now required:

| Feature test | Required assertion |
|---|---|
| FT-VM-002 | For each first-pass state, manifest validation must require state idle, talking-body, face preview, face bbox, the selected talking-head transition references, and sync metadata; sentence-level baked response clips are not accepted as the speech-engine path. |
| FT-VM-003 | Visual asset metadata or generated review artifact must fail if the state face is color-border-only, head-cropped, eyes-closed, not front-facing, or indistinguishable from neutral. |
| FT-VM-004 | Existing Naia idle and gesture entries must remain addressable after rebuilding generated state assets. |
| FT-VM-005 | Prosody map validation must reject routes to missing states and must map VoxCPM2 tags only as routing hints to primary states. |
| FT-VM-007 | Playwright test must produce visible artifacts for editor gallery, selected state idle, TTS-triggered talking-body, and the selected talking-head transition overlay. |

`Partial` is not acceptable for completion. Missing and Partial entries remain blockers until the corresponding executable test or captured review artifact exists.


## 2026-07-12 State resource preview feature tests

| ID | Feature | Feature test | test_ref | Status |
|----|---------|--------------|----------|--------|
| FT-RES-001 | FE-RES-001 | Runtime test clicks `sad/happy/...` and verifies selected idle clip is loaded in the main preview. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |
| FT-RES-002 | FE-RES-002 | Runtime test verifies the selected-state resource rows match the transition contract chosen after the 3090 benchmark. The historical nine-row assertion covers only the six-head prototype. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |
| FT-RES-003 | FE-RES-003 | Runtime test clicks resource preview buttons and verifies `window.__nvaDebug.resourcePreview`. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |
| FT-RES-004 | FE-RES-004 | Runtime test verifies resource preview does not start or replace TTS engine speech. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |
| FT-RES-005 | FE-RES-005 | Runtime test verifies TTS body/head readiness and the current head transition/mouth-shape debug state. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |

## 2026-07-12 TTS input text feature tests

| ID | Feature | Feature test | test_ref | Status |
|----|---------|--------------|----------|--------|
| FT-TEXT-001 | FE-TEXT-001 | Runtime test verifies default TTS value contains Hangul and is not `aiueo`. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Done |
| FT-TEXT-002 | FE-TEXT-002 | Runtime test clicks viseme smoke sample and verifies `aiueo` is explicitly selected. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Done |
| FT-TEXT-003 | FE-TEXT-003 | Runtime test plays tagged text and verifies debug clean text excludes `[tag]`. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Done |
| FT-TEXT-004 | FE-TEXT-004 | Runtime/doc test verifies number/symbol normalization is described as upstream spoken-form text. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `docs/prebaked-webm-nva.md` | Done |
