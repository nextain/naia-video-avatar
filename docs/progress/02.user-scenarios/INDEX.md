# 02. 사용자 시나리오 Registry (UC) — V모델 02

| ID | 영역 | 누가 → 무엇을 → 왜 | 유도 REQ | 상태 | TEST-S |
|----|------|--------------------|----------|------|--------|
| UC-001 | distribution | 배포자가 공개 규격에 맞는 NVA를 제공해 어떤 호환 Player에서도 구조 검증을 받을 수 있다 | REQ-001, REQ-007 | Done | TEST-S-001 |
| UC-002 | playback | 사용자가 `.nva`를 열어 기본 idle 영상을 바로 확인한다 | REQ-004, REQ-007 | Done | TEST-S-002 |
| UC-013 | standalone | 사용자가 정적 Player에 완성 `.nva`를 열고 패키지에 포함된 발화 영상을 계정·서버·GPU 없이 재생한다 | REQ-018, REQ-019, NFR-005, NFR-009 | Done (#14) | TEST-S-016 |
| UC-014 | action | 사용자가 NVA에 등록된 action을 선택해 재생하고 완료 뒤 idle로 돌아간다 | REQ-020 | Done (#14) | TEST-S-017 |
| UC-015 | local-samples | 개발자나 검토자가 localhost Player의 샘플 목록에서 Naia·Jina·Minho·Alpha를 차례로 열어 실제 보유 NVA의 idle·발화·action을 확인한다 | REQ-021, NFR-010 | Done (#14) | TEST-S-018 |
| UC-016 | final-package | 배포자가 기존 아바타와 완성 발화 영상을 넣어 공개 소비 필드와 참조 미디어만 포함한 최종 `.nva`를 반복 가능하게 만든다 | REQ-022 | Done (#14) | TEST-S-019 |
