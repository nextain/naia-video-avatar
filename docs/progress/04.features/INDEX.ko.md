# 04. 기능 설계 Registry (SPEC) — V모델 04

[English](./INDEX.md) | 한국어

<!--
스키마: 이 한 파일 registry. UC(02)를 구현 가능한 기능 단위(SPEC)로 분해.
추적: 모든 SPEC는 ≥1 UC를 가리키고(역추적), ≥1 TEST-F(05)로 닫힌다 (orphan 0).
컬럼 = | ID | 유도 UC | 기능 요약 | area | 상태 | TEST-F |
-->

| ID | 유도 UC | 기능 요약 | area | 상태 | TEST-F |
|----|---------|-----------|------|------|--------|
| SPEC-001 | UC-001 | NVA v0.3 완성 미디어 manifest JSON Schema와 v0.2 읽기 호환 | src/main/nva-schema.json + src/main/nva-core.js | Done | TEST-F-001 |
| SPEC-002 | UC-001, UC-002 | manifest·경로·자산 존재·번들 크기 검증 | src/main/nva-core.js + src/main/nva-bundle-loader.js | Done | TEST-F-001 |
| SPEC-003 | UC-002 | 읽기 전용 Player의 NVA 로드와 기본 idle 표시 | src/main/viewer.html + src/main/nva-animation-player.js | Done | TEST-F-003 |
| SPEC-016 | UC-013 | 음성 내장 완성 발화 영상의 목록·재생·중단과 idle 복구 | src/main/nva-animation-player.js + src/main/viewer.html | Done (#14) | TEST-F-017 |
| SPEC-017 | UC-014 | idle/action 파생과 완료·중단·오류 뒤 idle 복구 | src/main/nva-animation-player.js + src/main/viewer.html | Done (#14) | TEST-F-018 |
| SPEC-018 | UC-013 | Player 중심 README와 공개 surface guard | README.md + src/test/public-player-surface.test.mjs | Done (#14) | TEST-F-019 |
| SPEC-019 | UC-015 | 동일 출처 JSON 카탈로그 로더, 샘플 선택 UI, 원격/수동 로드의 단일 수명주기와 최신 요청 우선 처리 | src/main/sample-catalog.js + src/main/viewer.html | Done (#14) | TEST-F-020 |
| SPEC-020 | UC-015 | 디렉터리형 NVA를 ZIP으로 묶고 기존 `.nva`를 복사해 ignored 카탈로그를 만드는 로컬 준비 도구 | scripts/prepare-local-samples.py | Done (#14) | TEST-F-021 |
| SPEC-021 | UC-016 | 기존 v0.2 입력과 완성 발화 영상을 공개 v0.3 소비 패키지로 정리하는 결정론적 패키징 도구 | scripts/build-final-nva.py | Done (#14) | TEST-F-022 |
| SPEC-022 | UC-017, UC-018 | v0.3 completed-media 검증과 v0.2 `locale` 읽기 호환을 포함한 안전한 NVA 번들 로드 | src/main/nva-schema.json + src/main/nva-core.js + src/main/nva-bundle-loader.js | Done (#16) | TEST-F-023 |
| SPEC-023 | UC-017, UC-019 | 파일·공개 샘플 열기, 대기·발화·동작 재생, 배경 미리보기만 제공하는 단순 서비스 Player | src/main/viewer.html + src/main/nva-animation-player.js + src/main/stage-background.js | Done (#16) | TEST-F-024 |
| SPEC-024 | UC-020 | `playTalking()`, 로드 결과 `talking`·`idles`, `#playTalking` 버튼, demo manifest idle 항목, 차단 로드 후 컨트롤 비활성화·무대 정리(B1), 밀려난 재생 요청 무시(N1) | src/main/nva-animation-player.js + src/main/viewer.html + examples/demo.nva | Approved (#22) | TEST-F-025 |
