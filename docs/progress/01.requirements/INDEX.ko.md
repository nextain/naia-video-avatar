# 01. 요구사항 Registry (REQ) — V모델 01

[English](./INDEX.md) | 한국어

<!--
스키마: 이 한 파일 registry (항목당 별도 문서 ❌). 상태 = Draft→Approved→In-progress→Done.
추적: 모든 REQ는 ≥1 UC(02)로 닫히거나, NFR이면 ≥1 TEST-S(03)로 직결한다 (orphan 0).
컬럼 = | ID | 영역 | 요구사항 | 상태 | UC | SPEC | TEST |
scripts/check-traceability.mjs 가 이 표를 파싱한다.
빈 상태(이 안내 주석만) = SDLC 게이트 bootstrap(경고·허용). 실제 REQ를 채우면 게이트 enforce.
-->

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
| REQ-023 | format | 공개 NVA 정본은 `nva_version: 0.3`, `profile: completed-media`이며 대기·동작·음성이 포함된 완성 영상만 참조한다 | Approved (#16) | UC-017, UC-018 | SPEC-022 | TEST-S-020, TEST-S-022 |
| REQ-024 | player | 단일 서비스형 웹 화면에서 로컬 `.nva` 또는 공개 샘플을 열고 대기·내장 발화·동작을 재생한다 | Approved (#16) | UC-017 | SPEC-023 | TEST-S-020, TEST-S-021 |
| REQ-025 | playback | 일회성 발화·동작의 재생 완료 또는 오류 후 안전하게 대기 영상으로 복귀한다 | Approved (#16) | UC-017 | SPEC-023 | TEST-S-020, TEST-S-021 |
| REQ-026 | validation | ZIP 경로·크기·manifest·미디어 참조를 브라우저에서 검증하고 실행 불가능한 패키지를 재생 전에 차단한다 | Approved (#16) | UC-018 | SPEC-022 | TEST-S-020, TEST-S-022 |
| REQ-027 | presentation | 플레이어가 투명 캐릭터를 색상 및 사용자 선택 이미지 배경 위에서 미리 볼 수 있게 한다 | Approved (#16) | UC-019 | SPEC-023 | TEST-S-021 |
| NFR-011 | compatibility | v0.2는 Studio 배포 파일의 읽기·재생을 지원하고 신규 문서·스키마·예제는 v0.3을 사용한다 | Approved (#16) | — | — | TEST-S-022 |
| NFR-012 | deploy | 정적 파일 서버와 일반 브라우저만으로 동작하며 계정·키·서버 API·GPU가 필요 없다 | Approved (#16) | — | — | TEST-S-021, TEST-S-022 |
| NFR-013 | public-boundary | create, 편집기, TTS, 실시간 생성, Cascade, 제작 프롬프트와 내부 파이프라인을 공개 실행 코드·예제에서 제외한다 | Approved (#16) | — | — | TEST-S-023 |
| NFR-014 | simplicity | 공개 기본 화면은 파일 열기·재생·배경 확인에 필요한 제어만 제공하고 노드 그래프나 제작 타임라인을 제공하지 않는다 | Approved (#16) | — | — | TEST-S-021, TEST-S-023 |
| REQ-028 | compatibility | Player가 v0.2 번들의 말하기 루프(loop·can_talk)를 재생하고, 알 수 없는 확장 키를 무시하며, 데모 예제를 정상 로드하고, 차단 로드 시 컨트롤을 비활성화하며 밀려난 재생 요청을 무시한다 (read compatibility under NFR-011) | Approved (#22) | UC-020 | SPEC-024 | TEST-S-024 |
| REQ-029 | compatibility | Player가 Studio v0.2 소품 동작 순서를 복합 액션(enter 1회 → 본 동작 2회 → exit 1회 → 대기 복귀)으로 재생하고, 액션 메뉴에서 보조 클립을 숨기며, 중복 라벨을 구분 표기한다 | Approved (#25) | UC-021 | SPEC-025 | TEST-S-025 |
| NFR-015 | resource-limits | 로더와 패키징 도구는 Studio v0.2 번들 수용을 위해 아카이브 200 MiB, 해제 자산 400 MiB까지 지원한다 | Approved (#25) | — | SPEC-002, SPEC-025 | TEST-S-025 |
