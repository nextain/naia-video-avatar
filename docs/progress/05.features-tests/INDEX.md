# 05. 기능 테스트 Registry (TEST-F) — V모델 05

| ID | 검증 SPEC | 테스트 요약 | test_ref | 상태 |
|----|-----------|-------------|----------|------|
| TEST-F-001 | SPEC-001, SPEC-002 | 정상/비정상 manifest와 ZIP 경로·크기·압축·필수 자산을 검증한다 | src/test/nva-core.test.mjs + src/test/nva-bundle-loader.test.mjs | Done |
| TEST-F-003 | SPEC-003 | 실제 Chromium에서 NVA 로드 뒤 idle 영상 표시와 canvas 비율을 확인한다 | src/test/standalone-player.e2e.py | Done |
| TEST-F-014 | SPEC-014 | 발화 자산 스케줄·prefetch·이중 디코딩·합성·오류 복구를 검증한다 | src/test/speech-*.test.mjs + src/test/standalone-player.e2e.py | In-progress |
| TEST-F-015 | SPEC-015 | SpeechPlan의 시간축·오디오 해시·aligned/approximate 경계를 검증한다 | src/test/speech-plan.test.mjs | In-progress |
| TEST-F-017 | SPEC-016 | mock speechSynthesis로 음성 열거, 발화 시작·완료·오류·취소와 approximate 배지를 검증한다 | src/test/browser-tts.test.mjs + src/test/standalone-player.e2e.py | Done (#14) |
| TEST-F-018 | SPEC-017 | idle/action 파생과 action 종료·오류 뒤 idle 복구를 검증한다 | src/test/nva-animation-player.test.mjs + src/test/standalone-player.e2e.py | Done (#14) |
| TEST-F-019 | SPEC-018 | 공개 파일 목록과 README에 Player만 있고 Editor·생성 실행 파일이 없음을 검사한다 | src/test/public-player-surface.test.mjs | Done (#14) |
| TEST-F-020 | SPEC-019 | 카탈로그 스키마·같은 출처 제한·경로 해석·최신 로드 우선과 실제 4개 샘플 UI 로드를 검증한다 | src/test/sample-catalog.test.mjs + src/test/load-coordinator.test.mjs + src/test/local-samples.e2e.py | Done (#14) |
| TEST-F-021 | SPEC-020 | 입력 디렉터리/파일 검증, 결정론적 ZIP, 절대경로 비노출, ignored 출력과 4개 카탈로그 항목을 검증한다 | src/test/local-sample-prep.test.py | Done (#14) |
