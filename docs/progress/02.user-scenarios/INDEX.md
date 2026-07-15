# 02. 사용자 시나리오 Registry (UC) — V모델 02

<!--
스키마: 이 한 파일 registry. 상태 = Draft→Approved→In-progress→Done.
추적: 모든 UC는 ≥1 REQ(01)에서 유도되고(역추적), ≥1 TEST-S(03)로 닫힌다 (orphan 0).
컬럼 = | ID | 영역 | 누가 → 무엇을 → 왜 | 유도 REQ | 상태 | TEST-S |
NFR(비기능)은 UC로 안 내려가고 REQ→TEST-S 직결한다.
-->

| ID | 영역 | 누가 → 무엇을 → 왜 | 유도 REQ | 상태 | TEST-S |
|----|------|--------------------|----------|------|--------|
| UC-001 | authoring | 캐릭터 제작자가 클립을 nva 번들로 묶고 유효성을 확인해 배포 가능한 아바타를 만든다 | REQ-001, REQ-005, REQ-007 | Done | TEST-S-001, TEST-S-004 |
| UC-002 | playback | 운영자가 뷰어로 아바타를 재생하고 상태(서기/앉기/춤/말하기)를 전환해 보여준다 | REQ-002, REQ-003, REQ-004 | Done | TEST-S-002, TEST-S-003 |
| UC-003 | directing | 연출 시나리오(상태/이벤트/대사 시퀀스) 또는 목표 상태 지정 → 포즈 경로 탐색으로 전환 자동 연출 (제작 가이드: 흐름·타이밍 시연) | REQ-002, REQ-008 | Done | TEST-S-002 |
| UC-004 | sharing | 제작자가 편집한 아바타를 단일 `.nva` 파일로 내보내 공유/배포한다 | REQ-006 | Done | TEST-S-004 |
| UC-005 | authoring | 제작자가 선택한 애니메이션의 클립 입력 옆에서 현재 미디어를 즉시 재생해 교체 전후 품질을 확인한다 | REQ-009 | Done | TEST-S-006 |
| UC-006 | authoring | 제작자가 표준 720×1280 영상의 중앙 상단 512×512 Ditto 입력 영역과 그 안의 실제 얼굴 위치를 독립 지정해 무리사이즈 합성을 보장한다 | REQ-010 | Done | TEST-S-007 |
| UC-007 | authoring | 제작자가 크로마키 색을 추측하거나 색상 입력기에 다시 입력하지 않고 원본 영상 프레임을 스포이드로 클릭해 지울 색을 지정한다 | REQ-011 | Done | TEST-S-008 |
| UC-008 | integration | 제작자가 `http://localhost:8099/src/main/editor.html`에서 `http://localhost:8910` cascade에 연결해 기본 ref 음색을 선택하고 숫자 문장을 음성 포함 영상으로 직접 확인한다 | REQ-012 | Done | TEST-S-009 |
