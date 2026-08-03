# 02. 사용자 시나리오 Registry (UC) — V모델 02

| ID | 영역 | 누가 → 무엇을 → 왜 | 유도 REQ | 상태 | TEST-S |
|----|------|--------------------|----------|------|--------|
| UC-001 | distribution | 배포자가 공개 규격에 맞는 NVA를 제공해 어떤 호환 Player에서도 구조 검증을 받을 수 있다 | REQ-001, REQ-007 | Done | TEST-S-001 |
| UC-002 | playback | 사용자가 `.nva`를 열어 기본 idle 영상을 바로 확인한다 | REQ-004, REQ-007 | Done | TEST-S-002 |
| UC-012 | aligned | 사용자가 오디오와 일치하는 SpeechPlan을 넣어 완성된 NVA 발화 자산을 오디오 시간축으로 재생한다 | REQ-016, NFR-005 | In-progress | TEST-S-013 |
| UC-013 | standalone | 사용자가 정적 Player에 `.nva`를 열고 텍스트와 브라우저 음성을 선택해 계정·서버·GPU 없이 approximate 발화를 시험한다 | REQ-018, REQ-019, NFR-005, NFR-009 | Done (#14) | TEST-S-016 |
| UC-014 | action | 사용자가 NVA에 등록된 action을 선택해 재생하고 완료 뒤 idle로 돌아간다 | REQ-020 | Done (#14) | TEST-S-017 |
| UC-015 | local-samples | 개발자나 검토자가 localhost Player의 샘플 목록에서 Naia·Jina·Minho·Alpha를 차례로 열어 실제 보유 NVA의 idle/action과 메타정보를 확인한다 | REQ-021, NFR-010 | Done (#14) | TEST-S-018 |
