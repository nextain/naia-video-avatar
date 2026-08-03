# 01. 요구사항 Registry (REQ) — V모델 01

| ID | 영역 | 요구사항 | 상태 | UC | SPEC | TEST |
|----|------|----------|------|----|----|------|
| REQ-001 | format | NVA v0.3 완성 미디어 포맷을 JSON manifest와 ZIP 번들 소비 계약으로 정의한다 | Done | UC-001 | SPEC-001 | TEST-S-001 |
| REQ-004 | player | Player가 단일 `.nva` 파일을 읽고 기본 idle 영상을 표시한다 | Done | UC-002 | SPEC-003 | TEST-S-002 |
| REQ-007 | validation | Player는 manifest, 번들 상대경로, 필수 자산, 크기와 해시가 잘못된 NVA를 재생 전에 거부한다 | Done | UC-001, UC-002 | SPEC-001, SPEC-002 | TEST-S-001, TEST-S-002 |
| NFR-001 | deploy | Player는 GPU 없이 정적 웹 서버와 지원 브라우저에서 동작한다 | Done | — | SPEC-003 | TEST-S-005 |
| NFR-002 | packaging | Player는 빌드 단계 없이 직접 제공할 수 있는 정적 HTML 진입점을 가진다 | Done | — | SPEC-003 | TEST-S-005 |
| NFR-004 | dependencies | NVA manifest 검증 코어는 런타임 외부 의존성이 없다 | Done | — | SPEC-002 | TEST-F-001 |
| NFR-005 | gpu-free | 재생 경로는 생성 모델, CUDA 또는 생성용 VRAM을 요구하지 않는다 | Done (#14) | — | SPEC-003, SPEC-016, SPEC-017 | TEST-S-005, TEST-S-016 |
| REQ-018 | oss-scope | 공개 제품은 NVA 소비 규격·스키마·검증기·읽기 전용 Player로 제한하며 Editor·Studio와 생성 서버 구현을 포함하지 않는다 | Done (#14) | UC-013 | SPEC-018 | TEST-S-016 |
| REQ-019 | completed-speech | Player는 `.nva`에 포함된 음성 내장 완성 발화 영상을 나열·재생·중단하고 완료·중단·오류 뒤 idle로 복귀한다 | Done (#14) | UC-013 | SPEC-016 | TEST-S-016 |
| REQ-020 | actions | Player는 NVA의 idle과 action을 나열·재생하고 action·발화 완료, 중단 또는 오류 뒤 idle로 복귀한다 | Done (#14) | UC-014 | SPEC-017 | TEST-S-017 |
| NFR-009 | frontend-only | Player는 완성 NVA 재생에 외부 API·계정·키를 요구하지 않으며 실시간 음성·립싱크·생성 기능을 포함하지 않는다 | Done (#14) | — | SPEC-016, SPEC-018 | TEST-S-016 |
| REQ-022 | final-package | 결정론적 패키징 도구는 기존 NVA와 음성 내장 완성 발화 영상을 받아 생성용 필드·미참조 자산을 제외한 v0.3 `.nva`를 만든다 | Done (#14) | UC-016 | SPEC-021 | TEST-S-019 |
| REQ-021 | local-catalog | 로컬 정적 서버에서 같은 출처의 JSON 카탈로그를 읽어 준비된 NVA 샘플을 선택·로드할 수 있고, 수동 파일 선택 경로도 그대로 유지한다 | Done (#14) | UC-015 | SPEC-019, SPEC-020 | TEST-S-018 |
| NFR-010 | local-privacy | 로컬 샘플 준비 결과는 Git에서 제외되며 카탈로그에는 원본 절대경로·얼굴·음성·생성 정보가 아니라 표시 이름과 같은 출처의 상대 NVA URL만 기록한다 | Done (#14) | — | SPEC-019, SPEC-020 | TEST-S-018 |
