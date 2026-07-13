# 02. ?ъ슜???쒕굹由ъ삤 Registry (UC) ??V紐⑤뜽 02

<!--
?ㅽ궎留? ?????뚯씪 registry. ?곹깭 = Draft?묨pproved?묲n-progress?묭one.
異붿쟻: 紐⑤뱺 UC???? REQ(01)?먯꽌 ?좊룄?섍퀬(??텛??, ?? TEST-S(03)濡??ロ엺??(orphan 0).
而щ읆 = | ID | ?곸뿭 | ?꾧? ??臾댁뾿??????| ?좊룄 REQ | ?곹깭 | TEST-S |
NFR(鍮꾧린??? UC濡????대젮媛怨?REQ?뭈EST-S 吏곴껐?쒕떎.
-->

| ID | ?곸뿭 | ?꾧? ??臾댁뾿??????| ?좊룄 REQ | ?곹깭 | TEST-S |
|----|------|--------------------|----------|------|--------|
| UC-001 | authoring | 罹먮┃???쒖옉?먭? ?대┰??nva 踰덈뱾濡?臾띔퀬 ?좏슚?깆쓣 ?뺤씤??諛고룷 媛?ν븳 ?꾨컮?瑜?留뚮뱺??| REQ-001, REQ-005, REQ-007 | Done | TEST-S-001, TEST-S-004 |
| UC-002 | playback | ?댁쁺?먭? 酉곗뼱濡??꾨컮?瑜??ъ깮?섍퀬 ?곹깭(?쒓린/?됯린/異?留먰븯湲?瑜??꾪솚??蹂댁뿬以??| REQ-002, REQ-003, REQ-004 | Done | TEST-S-002, TEST-S-003 |
| UC-003 | directing | ?곗텧 ?쒕굹由ъ삤(?곹깭/?대깽??????쒗?? ?먮뒗 紐⑺몴 ?곹깭 吏?????ъ쫰 寃쎈줈 ?먯깋?쇰줈 ?꾪솚 ?먮룞 ?곗텧 (?쒖옉 媛?대뱶: ?먮쫫쨌??대컢 ?쒖뿰) | REQ-002, REQ-008 | Done | TEST-S-002 |
| UC-004 | sharing | ?쒖옉?먭? ?몄쭛???꾨컮?瑜??⑥씪 `.nva` ?뚯씪濡??대낫??怨듭쑀/諛고룷?쒕떎 | REQ-006 | Done | TEST-S-004 |

## 2026-07-12 State engine editor UC

- UC-STATE-001: As an NVA producer, I can add a state and bind idle full-body video, talking body video, cropped face preview, and talking-head clips per viseme.
- UC-STATE-002: As a reviewer, I can click a face-state gallery tile and see that state idle in the preview.
- UC-STATE-003: As a reviewer, I can play TTS and verify that the preview uses state-specific talking body plus cropped talking head overlay instead of a complete pre-rendered sentence clip.
- UC-STATE-004: As a producer, I can add a gesture as a single video clip without confusing it with state idle/talking assets.
## 2026-07-12 V-model rebuild UC

| ID | Actor | Scenario | Requirements | Status | UC Test |
|----|-------|----------|--------------|--------|---------|
| UC-VM-001 | Producer | Build a first-pass NVA state set with exactly `neutral`, `happy`, `sad`, `angry`, `surprised`, and `thinking`. | REQ-VM-001, REQ-VM-002 | Held | UCT-VM-001 |
| UC-VM-002 | Reviewer | Review face previews and reject assets where the head is cut off, eyes are closed, gaze is not forward, or identity is changed. | REQ-VM-003, REQ-VM-007 | Held | UCT-VM-002 |
| UC-VM-003 | Reviewer | Play TTS preview and verify the selected state uses `talking_body` plus the selected talking-head transition contract, then returns to the state idle. | REQ-VM-002, REQ-VM-006, REQ-VM-007 | Held | UCT-VM-003 |
| UC-VM-004 | Producer | Confirm original Naia/character idle and gesture clips remain visible as gestures or source animations and are not lost during state generation. | REQ-VM-004, REQ-VM-006 | Held | UCT-VM-004 |
| UC-VM-005 | Runtime integrator | Receive VoxCPM2 prosody tags such as `[laughing]`, `[sigh]`, `[gasp]`, `[hesitation]`, `[shout]` and route them to suitable primary talking states. | REQ-VM-005 | Held | UCT-VM-005 |
| UC-VM-006 | QA reviewer | Use Playwright evidence to confirm editor behavior and visible asset quality, not only schema success. | REQ-VM-008 | Held | UCT-VM-006 |


## 2026-07-12 State resource preview UC

| ID | Actor | Scenario | Requirements | Status | UC Test |
|----|-------|----------|--------------|--------|---------|
| UC-RES-001 | Reviewer | Click a state and see that state's full-body idle video in the main preview. | REQ-RES-001 | Held | UCT-RES-001 |
| UC-RES-002 | Reviewer | Inspect every required resource under the selected state, including the provisional talking-head set. | REQ-RES-002 | Held | UCT-RES-002 |
| UC-RES-003 | Reviewer | Click a preview button beside each resource title to preview only that resource. | REQ-RES-003 | Held | UCT-RES-003 |
| UC-RES-004 | Reviewer | Distinguish individual resource preview from full TTS engine preview. | REQ-RES-004 | Held | UCT-RES-004 |
| UC-RES-005 | Reviewer | Play TTS and verify talking body plus the selected talking-head transition overlay, not a flickering still image. | REQ-RES-005 | Held | UCT-RES-005 |

## 2026-07-12 TTS input text UC

| ID | Actor | Scenario | Requirements | Status | UC Test |
|----|-------|----------|--------------|--------|---------|
| UC-TEXT-001 | Reviewer | Open the editor and see a Korean natural utterance in the TTS field by default. | REQ-TEXT-001 | Done | UCT-TEXT-001 |
| UC-TEXT-002 | Reviewer | Use `aiueo` only when intentionally selecting a viseme smoke/debug sample. | REQ-TEXT-002 | Done | UCT-TEXT-002 |
| UC-TEXT-003 | Runtime integrator | Use `[sigh]` or similar prosody tags for routing while TTS receives only spoken text. | REQ-TEXT-003 | Done | UCT-TEXT-003 |
| UC-TEXT-004 | Pipeline integrator | Send cascade/Ditto normalized spoken-form text rather than raw numeric/symbolic text. | REQ-TEXT-004 | Done | UCT-TEXT-004 |
