# 03. 시나리오 테스트 Registry (TEST-S) — V모델 03

| ID | 검증대상(UC/REQ) | 시나리오 요약 | 형태 | test_ref | 상태 |
|----|------------------|---------------|------|----------|------|
| TEST-S-001 | UC-001, REQ-001, REQ-007 | 정상 NVA는 검증되고 경로 이탈·누락·크기 초과·변조 번들은 거부된다 | Node 통합 | src/test/nva-core.test.mjs + src/test/nva-bundle-loader.test.mjs | Done |
| TEST-S-002 | UC-002, REQ-004, REQ-007 | NVA 로드 뒤 기본 idle 클립이 디코딩되고 Player에 표시된다 | Chromium | src/test/standalone-player.e2e.py | Done |
| TEST-S-005 | NFR-001, NFR-002, NFR-005 | 정적 HTTP 서버와 Chromium만으로 Player가 로드되고 외부 서비스 없이 애니메이션을 표시한다 | Chromium | src/test/standalone-player.e2e.py | Done |
| TEST-S-013 | UC-012, REQ-016 | 올바른 audio+SpeechPlan은 aligned 모드로 재생되고 불일치 입력은 거부되며 오류 뒤 idle로 복귀한다 | Node+Chromium | src/test/speech-plan.test.mjs + src/test/speech-player.test.mjs + src/test/standalone-player.e2e.py | In-progress |
| TEST-S-016 | UC-013, REQ-018, REQ-019, NFR-005, NFR-009 | 정적 Player에서 mock 브라우저 TTS로 발화·중단하고 approximate 표시, 외부 요청 0건, Editor·생성 실행 파일 부재를 확인한다 | Node+Chromium | src/test/browser-tts.test.mjs + src/test/public-player-surface.test.mjs + src/test/standalone-player.e2e.py | Done (#14) |
| TEST-S-017 | UC-014, REQ-020 | idle/action 파생과 action 완료·중단·오류 뒤 idle 복귀를 확인한다 | Node+Chromium | src/test/nva-animation-player.test.mjs + src/test/standalone-player.e2e.py | Done (#14) |
| TEST-S-018 | UC-015, REQ-021, NFR-010 | 로컬 준비 도구가 3개 디렉터리형 NVA와 Alpha 파일을 ignored 경로에 패키징하고, localhost 카탈로그에서 4개를 순서대로 로드해 이름·idle/action·오류 0건을 확인한다. 카탈로그 경로 이탈과 다른 출처 URL은 거부한다 | Python+Node+Chromium | src/test/local-sample-prep.test.py + src/test/sample-catalog.test.mjs + src/test/local-samples.e2e.py | Done (#14) |
