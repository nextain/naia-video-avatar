# 01. ?붽뎄?ы빆 Registry (REQ) ??V紐⑤뜽 01

<!--
?ㅽ궎留? ?????뚯씪 registry (??ぉ??蹂꾨룄 臾몄꽌 ??. ?곹깭 = Draft?묨pproved?묲n-progress?묭one.
異붿쟻: 紐⑤뱺 REQ???? UC(02)濡??ロ엳嫄곕굹, NFR?대㈃ ?? TEST-S(03)濡?吏곴껐?쒕떎 (orphan 0).
而щ읆 = | ID | ?곸뿭 | ?붽뎄?ы빆 | ?곹깭 | UC | SPEC | TEST |
scripts/check-traceability.mjs 媛 ???쒕? ?뚯떛?쒕떎.
鍮??곹깭(???덈궡 二쇱꽍留? = SDLC 寃뚯씠??bootstrap(寃쎄퀬쨌?덉슜). ?ㅼ젣 REQ瑜?梨꾩슦硫?寃뚯씠??enforce.
-->

| ID | ?곸뿭 | ?붽뎄?ы빆 | ?곹깭 | UC | SPEC | TEST |
|----|------|----------|------|----|----|------|
| REQ-001 | format | nva(鍮꾨뵒???대┰ ?꾨컮?) ?щ㎎??JSON manifest ?ㅽ궎留덈줈 ?뺤쓽 | Done | UC-001 | SPEC-001 | TEST-S-001 |
| REQ-002 | state-machine | talking/animation state + transition + ?ъ쫰 ?곗냽??entry/exit_pose) | Done | UC-002, UC-003 | SPEC-002 | TEST-S-002 |
| REQ-003 | compositing | 諛곌꼍+罹먮┃???ㅻ뱶?좏궧 ?덉씠???⑹꽦, ?숈떆 ?뚰뙆 ?붿퐫????2 | Done | UC-002 | SPEC-003 | TEST-S-003 |
| REQ-004 | viewer | nva 踰덈뱾 ?ъ깮(?곹깭 ?꾪솚 ??transition ?먮룞 ?쎌엯) | Done | UC-002 | SPEC-003 | TEST-S-002 |
| REQ-005 | editor | manifest ?몄쭛 + ?쇱씠釉?誘몃━蹂닿린 | Done | UC-001 | SPEC-004 | TEST-S-004 |
| REQ-006 | export | ?⑥씪 `.nva`(zip) ?뚯씪濡??⑦궎吏??대낫?닿린 | Done | UC-004 | SPEC-004 | TEST-S-004 |
| REQ-007 | validation | ?ㅽ궎留?initial+?ъ쫰?뺥빀+face_bbox+?곌껐???좏슚??寃利?| Done | UC-001 | SPEC-002 | TEST-S-001 |
| NFR-001 | deploy | GPU ?놁씠 ?뺤쟻 ??釉뚮씪?곗?)?먯꽌 ?숈옉 | Done | ??| ??| TEST-S-005 |
| NFR-002 | packaging | 酉곗뼱쨌?먮뵒?곕뒗 ?먭린?꾧껐 ?⑥씪 HTML | Done | ??| ??| TEST-S-005 |
| NFR-003 | alpha | 罹먮┃???덉씠?대뒗 ?뚰뙆(VP9) / ?щ줈留덊궎 ?????섏슜 | Done | ??| ??| TEST-S-003 |
| NFR-004 | deps | nva-core ?고????섏〈 0 (?쒖닔 JS) | Done | ??| ??| TEST-F-001 |
| REQ-008 | scenario | ?곗텧 ?쒕굹由ъ삤(?곹깭/?대깽??????쒗?? ?먮룞 ?ъ깮 + 寃利?| Done | UC-003 | SPEC-005 | TEST-S-002 |

## 2026-07-12 State-based speech engine delta

- REQ-STATE-001: NVA manifest MUST support `state_engine.states.{state}` as the canonical state speech contract.
- REQ-STATE-002: Each state MUST bind `idle`, `talking_body`, `face_bbox`, and `talking_heads.{viseme}`. `vrm_slots.speech`, `prebaked_speech`, top-level `viseme_clips`, and sentence `say-*.webm` are rejected as portable NVA speech contracts.
- REQ-STATE-003: The editor MUST expose state addition separately from gesture addition. State addition edits idle/body/head-by-viseme assets; gesture addition edits one single video clip.
- REQ-STATE-004: The expression gallery MUST show cropped face/state previews, not full-body thumbnails, when `state_engine` exists.
- REQ-STATE-005: TTS preview MUST exercise the engine path: state idle -> talking_body + talking_head viseme overlay -> state idle.
## 2026-07-12 V-model rebuild contract

This section supersedes earlier sentence-slot wording. `vrm_slots.speech`, `prebaked_speech`, sentence `say-*.webm`, and top-level `viseme_clips` are not portable NVA speech contracts.

| ID | Area | Requirement | Status | UC | Feature | Test |
|----|------|-------------|--------|----|---------|------|
| REQ-VM-001 | state-set | Primary generation states are exactly `neutral`, `happy`, `sad`, `angry`, `surprised`, `thinking` for first-pass generation. | Held | UC-VM-001 | FE-VM-001 | UCT-VM-001, FT-VM-001 |
| REQ-VM-002 | state-assets | Every generated primary state groups `idle`, `talking_body`, `face_preview`, `face_bbox`, and a talking-head video set. The six standalone `sil/a/i/u/e/o` keys are prototype-only until the 3090 transition benchmark selects the final contract. | Held | UC-VM-001, UC-VM-003 | FE-VM-001, FE-VM-002 | UCT-VM-001, UCT-VM-003, FT-VM-001, FT-VM-002 |
| REQ-VM-003 | visual-quality | Generated face preview and talking-head assets must preserve identity, keep the full head inside frame, keep eyes open, and face forward. Cropped/closed-eye/side-looking assets fail. | Held | UC-VM-002 | FE-VM-003 | UCT-VM-002, FT-VM-003 |
| REQ-VM-004 | original-assets | Original Naia/character idle and gesture animations must remain available. Gestures are single clips and must not be converted into emotion states. | Held | UC-VM-004 | FE-VM-004 | UCT-VM-004, FT-VM-004 |
| REQ-VM-005 | prosody-routing | VoxCPM2 prosody tags are routing hints only. Tags map to suitable primary talking states; they are not new state names. | Held | UC-VM-005 | FE-VM-005 | UCT-VM-005, FT-VM-005 |
| REQ-VM-006 | editor-validation | The editor must show state face previews, state asset completeness, gesture preservation, and TTS state-engine preview clearly enough for review. | Held | UC-VM-002, UC-VM-003, UC-VM-004 | FE-VM-006 | UCT-VM-002, UCT-VM-003, UCT-VM-004, FT-VM-006 |
| REQ-VM-007 | no-placeholder-pass | Placeholder assets must not be reported as generated-quality assets. Temporary data must be visibly marked as missing or placeholder and must fail quality gates. | Held | UC-VM-002, UC-VM-003 | FE-VM-003, FE-VM-006 | UCT-VM-002, UCT-VM-003, FT-VM-003, FT-VM-006 |
| REQ-VM-008 | quality-evidence | Playwright validation must capture visible evidence for editor load, state gallery, TTS overlay, and asset-quality gates. Structural tests alone are insufficient. | Held | UC-VM-006 | FE-VM-007 | UCT-VM-006, FT-VM-007 |

### 2026-07-12 adversarial review remediation

The first planning review found one traceability omission: `REQ-VM-002` mapped to `FE-VM-002`, but its Test column did not explicitly include `FT-VM-002`.

Contract correction:

| Requirement | Required feature test |
|---|---|
| REQ-VM-002 | FT-VM-002 must verify that every first-pass state exposes idle, talking-body, face preview, face bbox, the selected talking-head transition assets, and sync metadata without accepting sentence-level baked response clips as the state speech-engine path. |

The historical prototype evidence is retained, but `REQ-VM-*` remains Held until the talking-head transition contract is selected and its linked tests are revised.



## 2026-07-12 State resource preview requirements

| ID | Area | Requirement | Status | UC | Feature | Test |
|----|------|-------------|--------|----|---------|------|
| REQ-RES-001 | state-preview | Selecting a state must switch the main preview to `state_engine.states.{state}.idle` full-body video. | Held | UC-RES-001 | FE-RES-001 | UCT-RES-001, FT-RES-001 |
| REQ-RES-002 | resource-inspector | The editor must list `face_preview`, `idle`, `talking_body`, and the talking-head video set for the selected state. The prototype currently exposes `sil/a/i/u/e/o`; the final transition keys remain undecided. | Held | UC-RES-002 | FE-RES-002 | UCT-RES-002, FT-RES-002 |
| REQ-RES-003 | individual-preview | Each listed resource must have a title-adjacent preview action that opens only that resource. | Held | UC-RES-003 | FE-RES-003 | UCT-RES-003, FT-RES-003 |
| REQ-RES-004 | preview-isolation | Individual resource preview must not mutate TTS engine state, speech timeline, or active utterance playback. | Held | UC-RES-004 | FE-RES-004 | UCT-RES-004, FT-RES-004 |
| REQ-RES-005 | tts-overlay | TTS preview must expose body clip, head clip or transition, current mouth-shape state, and ready states so reviewers can confirm video overlay movement. | Held | UC-RES-005 | FE-RES-005 | UCT-RES-005, FT-RES-005 |

## 2026-07-12 TTS input text requirements

| ID | Area | Requirement | Status | UC | Feature | Test |
|----|------|-------------|--------|----|---------|------|
| REQ-TEXT-001 | editor-default | The editor default TTS input must be a natural Korean utterance, not the ASCII viseme smoke pattern. | Done | UC-TEXT-001 | FE-TEXT-001 | UCT-TEXT-001, FT-TEXT-001 |
| REQ-TEXT-002 | smoke-sample | `aiueo` may appear only as an explicit viseme smoke/debug sample, not as the production/default Korean TTS sample. | Done | UC-TEXT-002 | FE-TEXT-002 | UCT-TEXT-002, FT-TEXT-002 |
| REQ-TEXT-003 | spoken-text | TTS playback must strip VoxCPM2-style prosody tags from spoken text while still using tags for state routing. | Done | UC-TEXT-003 | FE-TEXT-003 | UCT-TEXT-003, FT-TEXT-003 |
| REQ-TEXT-004 | normalization-boundary | Cascade/Ditto production text must be treated as spoken-form text after upstream text normalization, including number/symbol expansion before render. | Done | UC-TEXT-004 | FE-TEXT-004 | UCT-TEXT-004, FT-TEXT-004 |
