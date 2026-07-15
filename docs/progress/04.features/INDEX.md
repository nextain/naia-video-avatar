# 04. 기능 설계 Registry (SPEC) — V모델 04

<!--
스키마: 이 한 파일 registry. UC(02)를 구현 가능한 기능 단위(SPEC)로 분해.
추적: 모든 SPEC는 ≥1 UC를 가리키고(역추적), ≥1 TEST-F(05)로 닫힌다 (orphan 0).
컬럼 = | ID | 유도 UC | 기능 요약 | area | 상태 | TEST-F |
-->

| ID | 유도 UC | 기능 요약 | area | 상태 | TEST-F |
|----|---------|-----------|------|------|--------|
| SPEC-001 | UC-001 | nva manifest JSON Schema (states/transitions/poses/layers/meta) | src/main/nva-schema.json | Done | TEST-F-001 |
| SPEC-002 | UC-001, UC-003 | nva-core: validateManifest + findTransitionPath + reachableStates + NvaStateMachine | src/main/nva-core.js | Done | TEST-F-001, TEST-F-002 |
| SPEC-003 | UC-002 | viewer: 크로마/알파 레이어 합성 + 상태 전환 재생 + 헤드토킹 오버레이 | src/main/viewer.html | Done | TEST-F-003 |
| SPEC-004 | UC-004 | editor: manifest 편집 + 미리보기 + 유효성 + `.nva`(JSZip) export | src/main/editor.html | Done | TEST-F-004 |
| SPEC-005 | UC-003 | scenario runner(playScenario)+listScenarios 자동 연출 재생 | src/main(viewer+core) | Done | TEST-F-005 |
| SPEC-006 | UC-003 | demo.html: nva 시나리오 → cascade(오사랑) 실시간 렌더 시연 (kiosk-v3) | src/main/demo.html | Done | TEST-F-006 |
| SPEC-007 | UC-005 | editor: 클립 경로 입력 옆 미리보기 버튼이 선택 애니메이션을 중앙 플레이어에서 재생 | src/main/editor.html | Done | TEST-F-007 |
| SPEC-008 | UC-006 | nva-core/editor: 720×1280 신규 표준과 `ditto_region=[104,0,512,512]` 기본값, 픽셀 계약 검증·가이드 표시, `face_bbox` 독립 편집 | src/main/nva-core.js + src/main/editor.html | Done | TEST-F-008 |
| SPEC-009 | UC-007 | editor: 스포이드 모드에서 중앙 캔버스 좌표를 원본 video 프레임 픽셀로 변환해 RGB를 읽고 `chroma_key`와 색상 입력기에 반영 | src/main/editor.html | Done | TEST-F-009 |
| SPEC-010 | UC-008 | editor: `/health`→`/ref/voices`→`/upload_nva`→`/stream_text` 연결 흐름과 절대 ref URL의 외부 참조 유지(번들에는 상대/로컬 ref만 포함) | src/main/editor.html | Done | TEST-F-010 |
| SPEC-011 | UC-009 | editor: manifest canvas 폭·높이 편집, 실제 종횡비 기반 반응형 미리보기, 영상의 `ditto_region`을 정확히 캡처한 512×512 `head_image` 생성 | src/main/editor.html + src/main/nva-core.js | Done | TEST-F-011 |
