# 03. ?쒕굹由ъ삤 ?뚯뒪??Registry (TEST-S) ??V紐⑤뜽 03

<!--
?ㅽ궎留? ?????뚯씪 registry. UC(02)? NFR(01)??寃利앺븯???쒖뒪???몄닔 ?뚯뒪??
異붿쟻: 紐⑤뱺 UC???? TEST-S濡??ロ엺?? TEST-S???? UC ?먮뒗 NFR-REQ瑜?媛由ы궓????텛?? orphan 0).
而щ읆 = | ID | 寃利앸???UC/REQ) | ?쒕굹由ъ삤 ?붿빟 | ?뺥깭 | test_ref | ?곹깭 |
-->

| ID | 寃利앸???UC/REQ) | ?쒕굹由ъ삤 ?붿빟 | ?뺥깭 | test_ref | ?곹깭 |
|----|------------------|---------------|------|----------|------|
| TEST-S-001 | UC-001 | nva 踰덈뱾 濡쒕뱶 ??validateManifest VALID(寃쎄퀬 0) | ?듯빀(node) | examples/demo.nva + nva-core | Done |
| TEST-S-002 | UC-002, UC-003 | stand_talk?뭩it_talk ??sit_down transition ?먮룞 ?쎌엯 ???됱? ?먯꽭 ?ъ깮 | 罹≪퀜(headless) | /var/tmp/nva_dance.png, nva_sit_speak.png | Done |
| TEST-S-003 | UC-002 | speaking ??face_bbox???ㅻ뱶?좏궧 ???ㅻ쾭?덉씠 + ?щ줈留??⑹꽦 | 罹≪퀜(headless) | /var/tmp/nva_sit_speak.png | Done |
| TEST-S-004 | UC-004 | ?먮뵒??export ??`.nva`(zip) = manifest.json + clips/ 횞7 | 罹≪퀜+unzip | /var/tmp/exported.nva | Done |
| TEST-S-005 | NFR-001, NFR-002 | GPU ?놁씠 ?뺤쟻 http ?쒕쾭 + 釉뚮씪?곗?濡?酉곗뼱/?먮뵒???뚮뜑 | 罹≪퀜(playwright) | /tmp/cap.mjs, cap2.mjs | Done |

## 2026-07-12 State engine acceptance tests

- TEST-STATE-001: `examples/osarang-prebaked.nva`, `examples/naia-prebaked.nva`, and `examples/demo.nva` load in `editor.html` without blank-screen failure.
- TEST-STATE-002: Osarang and Naia expose `state_engine` with at least one state, state list rows, and cropped face gallery tiles.
- TEST-STATE-003: TTS playback sets `window.__nvaDebug.engineSpeech` while playing, proving the state-engine preview path is used.
- TEST-STATE-004: Validation for sample manifests has no hard `state_engine` contract errors.
## 2026-07-12 V-model UC tests

| ID | Verifies | Scenario test | Evidence / test_ref | Status |
|----|----------|---------------|---------------------|--------|
| UCT-VM-001 | UC-VM-001 | Load all `.nva` manifests, validate assets/sync, and assert generated bundles contain exactly the six primary states. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |
| UCT-VM-002 | UC-VM-002 | Verify cropped state gallery plus asset-quality review artifact for full head, eyes open, front gaze, identity, no text/color placeholder, and hash-bound distinct previews. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py`, `examples/*-prebaked.nva/asset-quality.review.json` | Held |
| UCT-VM-003 | UC-VM-003 | Play TTS preview and assert talking-body plus the selected talking-head transition overlay is used, no sentence clip is requested, TTS starts without error, and idle returns after stop/end. The old six-clip assertion is historical evidence only. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |
| UCT-VM-004 | UC-VM-004 | Load Naia and assert original idle, `water_drop`, and `heart` gestures remain listed and playable separately from generated emotion states. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |
| UCT-VM-005 | UC-VM-005 | Feed representative VoxCPM2 prosody tags and verify routing to primary states without treating tag names as states. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |
| UCT-VM-006 | UC-VM-006 | Produce Playwright screenshots for editor load, cropped gallery, selected state, prosody-routed TTS overlay, and Naia gesture playback. | `.agents/work/test-results/nva-state-engine/*.png` via JS/Python Playwright | Held |

### 2026-07-12 adversarial review remediation

The first planning review found that several acceptance tests were documented as Missing, which means the process could still pass with placeholder assets or structural-only checks. These test contracts are now mandatory before implementation completion:

| UC test | Acceptance evidence required before Done |
|---|---|
| UCT-VM-002 | Playwright screenshot set plus reviewer checklist for each first-pass state: full head visible, eyes open, forward gaze, identity preserved, state expression visibly distinct, and gallery crop not cutting the head. |
| UCT-VM-004 | Manifest or editor evidence that Naia original idle and gesture assets remain present after state generation; no rebuild may replace them with generated placeholder-only assets. |
| UCT-VM-005 | A prosody-routing test using representative VoxCPM2 tags (`[laughing]`, `[sigh]`, `[pause]`, `[gasp]`, `[shout]`, `[whisper]`) must show routing to available primary states without treating tag names as new required states. |
| UCT-VM-006 | Playwright-visible capture must include selected state idle, TTS-triggered talking-body, talking-head/phoneme overlay path, and right-side cropped state gallery evidence. |

Placeholder rejection is part of UCT-VM-002 and UCT-VM-003. A color-glow-only or same-face image/video cannot satisfy these tests.


## 2026-07-12 State resource preview UC tests

| ID | Verifies | Scenario test | Evidence / test_ref | Status |
|----|----------|---------------|---------------------|--------|
| UCT-RES-001 | UC-RES-001 | Click each primary state and assert main preview current clip becomes `clips/{state}/idle.webm`. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |
| UCT-RES-002 | UC-RES-002 | Assert selected state exposes resource rows for face preview, idle, talking body, and the selected talking-head transition contract. The six-head assertion is historical prototype evidence only. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |
| UCT-RES-003 | UC-RES-003 | Click each resource preview button and assert image/video preview points to the selected resource. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |
| UCT-RES-004 | UC-RES-004 | Assert individual resource preview does not start TTS or mutate `engineSpeech`. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |
| UCT-RES-005 | UC-RES-005 | Play TTS and assert body/head video ready states plus changing head transition/mouth-shape debug values. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Held |

## 2026-07-12 TTS input text UC tests

| ID | Verifies | Scenario test | Evidence / test_ref | Status |
|----|----------|---------------|---------------------|--------|
| UCT-TEXT-001 | UC-TEXT-001 | Assert editor default TTS field contains Korean text and is not `aiueo`. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Done |
| UCT-TEXT-002 | UC-TEXT-002 | Assert explicit viseme-smoke sample action fills `aiueo` only when clicked. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Done |
| UCT-TEXT-003 | UC-TEXT-003 | Assert prosody tag routing still maps state and spoken text excludes bracket tags. | `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Done |
| UCT-TEXT-004 | UC-TEXT-004 | Assert docs/UI identify number/symbol expansion as upstream cascade/Ditto normalization, not NVA cache data. | `docs/prebaked-webm-nva.md`, Playwright UI assertion | Done |
