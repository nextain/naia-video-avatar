# 05. 기능 테스트 Registry (TEST-F) — V모델 05

| ID | 검증 SPEC | 테스트 요약 | test_ref | 상태 |
|----|-----------|-------------|----------|------|
| TEST-F-001 | SPEC-001, SPEC-002 | 정상/비정상 manifest와 ZIP 경로·크기·압축·필수 자산을 검증한다 | src/test/nva-core.test.mjs + src/test/nva-bundle-loader.test.mjs | Done |
| TEST-F-003 | SPEC-003 | 실제 Chromium에서 NVA 로드 뒤 idle 영상 표시와 canvas 비율을 확인한다 | src/test/standalone-player.e2e.py | Done |
| TEST-F-017 | SPEC-016 | 완성 발화 영상의 음성 활성 재생과 종료·오류·중단 뒤 muted idle 복구를 검증한다 | src/test/nva-animation-player.test.mjs + src/test/standalone-player.e2e.py | Done (#14) |
| TEST-F-018 | SPEC-017 | idle/action 파생과 action 종료·오류 뒤 idle 복구를 검증한다 | src/test/nva-animation-player.test.mjs + src/test/standalone-player.e2e.py | Done (#14) |
| TEST-F-019 | SPEC-018 | 공개 파일 목록과 README에 Player만 있고 Editor·생성 실행 파일이 없음을 검사한다 | src/test/public-player-surface.test.mjs | Done (#14) |
| TEST-F-020 | SPEC-019 | 카탈로그 스키마·같은 출처 제한·경로 해석·최신 로드 우선과 실제 4개 샘플 UI 로드를 검증한다 | src/test/sample-catalog.test.mjs + src/test/load-coordinator.test.mjs + src/test/local-samples.e2e.py | Done (#14) |
| TEST-F-021 | SPEC-020 | 입력 디렉터리/파일 검증, 결정론적 ZIP, 절대경로 비노출, ignored 출력과 4개 카탈로그 항목을 검증한다 | src/test/local-sample-prep.test.py | Done (#14) |
| TEST-F-022 | SPEC-021 | 결정론적 출력, v0.3 계약, 생성용 필드·미참조 자산 제거, 내장 음성 필수 조건을 검증한다 | src/test/final-nva.test.py | Done (#14) |
| TEST-F-023 | SPEC-022 | v0.3 계약·번들 안전성·v0.2 `locale` 읽기 호환과 공개 제작 필드 차단을 검증한다 | src/test/nva-core.test.mjs + src/test/nva-bundle-loader.test.mjs | Done (#16) |
| TEST-F-024 | SPEC-023 | 실제 Chromium에서 대기·발화·동작·배경 변경·idle 복귀와 외부 요청 0건을 검증한다 | src/test/standalone-player.e2e.py + src/test/local-samples.e2e.py + src/test/public-service-surface.test.mjs | Done (#16) |
