# 04. 기능 설계 Registry (SPEC) — V모델 04

| ID | 유도 UC | 기능 요약 | area | 상태 | TEST-F |
|----|---------|-----------|------|------|--------|
| SPEC-001 | UC-001 | NVA v0.2 manifest JSON Schema와 선택적 발화 자산 참조 계약 | src/main/nva-schema.json | Done | TEST-F-001 |
| SPEC-002 | UC-001, UC-002 | manifest·경로·자산 존재·번들 크기 검증 | src/main/nva-core.js + src/main/nva-bundle-loader.js | Done | TEST-F-001 |
| SPEC-003 | UC-002 | 읽기 전용 Player의 NVA 로드와 기본 idle 표시 | src/main/viewer.html + src/main/nva-animation-player.js | Done | TEST-F-003 |
| SPEC-014 | UC-012 | 완성된 발화 아틀라스와 몸·머리 영상을 오디오 또는 외부 시계로 합성 재생 | src/main/speech-player.js | In-progress | TEST-F-014 |
| SPEC-015 | UC-012 | SpeechPlan의 오디오 동일성·단조 시간축·품질 모드를 검증하는 소비 계약 | src/main/speech-plan.js | In-progress | TEST-F-015 |
| SPEC-016 | UC-013 | 브라우저 음성 열거·발화·취소와 approximate 외부 시계 어댑터 | src/main/browser-tts.js + src/main/viewer.html | Done (#14) | TEST-F-017 |
| SPEC-017 | UC-014 | idle/action 파생과 완료·중단·오류 뒤 idle 복구 | src/main/nva-animation-player.js + src/main/viewer.html | Done (#14) | TEST-F-018 |
| SPEC-018 | UC-013 | Player 중심 README와 공개 surface guard | README.md + src/test/public-player-surface.test.mjs | Done (#14) | TEST-F-019 |
| SPEC-019 | UC-015 | 동일 출처 JSON 카탈로그 로더, 샘플 선택 UI, 원격/수동 로드의 단일 수명주기와 최신 요청 우선 처리 | src/main/sample-catalog.js + src/main/viewer.html | Done (#14) | TEST-F-020 |
| SPEC-020 | UC-015 | 디렉터리형 NVA를 ZIP으로 묶고 기존 `.nva`를 복사해 ignored 카탈로그를 만드는 로컬 준비 도구 | scripts/prepare-local-samples.py | Done (#14) | TEST-F-021 |
