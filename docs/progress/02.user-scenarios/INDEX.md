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
