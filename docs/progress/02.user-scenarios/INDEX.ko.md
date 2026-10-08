# 02. 사용자 시나리오 Registry (UC) — V모델 02

[English](./INDEX.md) | 한국어

<!--
스키마: 이 한 파일 registry. 상태 = Draft→Approved→In-progress→Done.
추적: 모든 UC는 ≥1 REQ(01)에서 유도되고(역추적), ≥1 TEST-S(03)로 닫힌다 (orphan 0).
컬럼 = | ID | 영역 | 누가 → 무엇을 → 왜 | 유도 REQ | 상태 | TEST-S |
NFR(비기능)은 UC로 안 내려가고 REQ→TEST-S 직결한다.
-->

| ID | 영역 | 누가 → 무엇을 → 왜 | 유도 REQ | 상태 | TEST-S |
|----|------|--------------------|----------|------|--------|
| UC-001 | distribution | 배포자가 공개 규격에 맞는 NVA를 제공해 어떤 호환 Player에서도 구조 검증을 받을 수 있다 | REQ-001, REQ-007 | Done | TEST-S-001 |
| UC-002 | playback | 사용자가 `.nva`를 열어 기본 idle 영상을 바로 확인한다 | REQ-004, REQ-007 | Done | TEST-S-002 |
| UC-013 | standalone | 사용자가 정적 Player에 완성 `.nva`를 열고 패키지에 포함된 발화 영상을 계정·서버·GPU 없이 재생한다 | REQ-018, REQ-019, NFR-005, NFR-009 | Done (#14) | TEST-S-016 |
| UC-014 | action | 사용자가 NVA에 등록된 action을 선택해 재생하고 완료 뒤 idle로 돌아간다 | REQ-020 | Done (#14) | TEST-S-017 |
| UC-015 | local-samples | 개발자나 검토자가 localhost Player의 샘플 목록의 NVA 샘플을 차례로 열어 실제 미디어의 idle·발화·action을 확인한다 | REQ-021, NFR-010 | Done (#14) | TEST-S-018 |
| UC-016 | final-package | 배포자가 기존 아바타와 완성 발화 영상을 넣어 공개 소비 필드와 참조 미디어만 포함한 최종 `.nva`를 반복 가능하게 만든다 | REQ-022 | Done (#14) | TEST-S-019 |
| UC-017 | playback | 방문자가 계정·서버·GPU 없이 완성된 `.nva` 파일을 열어 대기·내장 발화·동작을 한 화면에서 확인한다 | REQ-023, REQ-024, REQ-025 | Approved (#16) | TEST-S-020, TEST-S-021 |
| UC-018 | integration | 개발자가 공개 NVA v0.3 규격으로 만든 completed-media 패키지를 검증하고 웹 서비스에 재생기로 연결한다 | REQ-023, REQ-026 | Approved (#16) | TEST-S-020, TEST-S-022 |
| UC-019 | evaluation | 방문자가 캐릭터의 투명 배경을 색상·이미지 위에서 바꿔 보며 실제 서비스 배치 적합성을 판단한다 | REQ-027 | Approved (#16) | TEST-S-021 |
| UC-020 | playback | 방문자가 Studio 0.2 아바타를 열어 대기 영상, 액션, 말하기 루프를 재생하고 정지하면 대기로 돌아온다 | REQ-028 | Approved (#22) | TEST-S-024 |
