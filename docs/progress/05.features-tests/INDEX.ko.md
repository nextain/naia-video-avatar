# 05. 기능 테스트 Registry (TEST-F) — V모델 05

[English](./INDEX.md) | 한국어

<!--
스키마: 이 한 파일 registry. SPEC(04)을 검증하는 통합 테스트 계획.
추적: 모든 SPEC는 ≥1 TEST-F로 닫힌다. TEST-F는 ≥1 SPEC을 가리킨다(역추적, orphan 0).
컬럼 = | ID | 검증 SPEC | 테스트 요약 | test_ref | 상태 |
-->

| ID | 검증 SPEC | 테스트 요약 | test_ref | 상태 |
|----|-----------|-------------|----------|------|
| TEST-F-001 | SPEC-001, SPEC-002 | 정상/비정상 manifest와 ZIP 경로·크기·압축·필수 자산을 검증한다 | src/test/nva-core.test.mjs + src/test/nva-bundle-loader.test.mjs | Done |
| TEST-F-003 | SPEC-003 | 실제 Chromium에서 NVA 로드 뒤 idle 영상 표시와 canvas 비율을 확인한다 | src/test/standalone-player.e2e.py | Done |
| TEST-F-017 | SPEC-016 | 완성 발화 영상의 음성 활성 재생과 종료·오류·중단 뒤 muted idle 복구를 검증한다 | src/test/nva-animation-player.test.mjs + src/test/standalone-player.e2e.py | Done (#14) |
| TEST-F-018 | SPEC-017 | idle/action 파생과 action 종료·오류 뒤 idle 복구를 검증한다 | src/test/nva-animation-player.test.mjs + src/test/standalone-player.e2e.py | Done (#14) |
| TEST-F-019 | SPEC-018 | 공개 파일 목록과 README에 Player만 있고 Editor·생성 실행 파일이 없음을 검사한다 | src/test/public-player-surface.test.mjs | Done (#14) |
| TEST-F-020 | SPEC-019 | 카탈로그 스키마·같은 출처 제한·경로 해석·최신 로드 우선과 UI를 통한 샘플 로드를 검증한다 | src/test/sample-catalog.test.mjs + src/test/load-coordinator.test.mjs + src/test/local-samples.e2e.py | Done (#14) |
| TEST-F-021 | SPEC-020 | 입력 디렉터리/파일 검증, 결정론적 ZIP, 절대경로 비노출, ignored 출력과 카탈로그 항목을 검증한다 | src/test/local-sample-prep.test.py | Done (#14) |
| TEST-F-022 | SPEC-021 | 결정론적 출력, v0.3 계약, 생성용 필드·미참조 자산 제거, 내장 음성 필수 조건을 검증한다 | src/test/final-nva.test.py | Done (#14) |
| TEST-F-023 | SPEC-022 | v0.3 계약·번들 안전성·v0.2 `locale` 읽기 호환과 공개 제작 필드 차단을 검증한다 | src/test/nva-core.test.mjs + src/test/nva-bundle-loader.test.mjs | Done (#16) |
| TEST-F-024 | SPEC-023 | 실제 Chromium에서 대기·발화·동작·배경 변경·idle 복귀와 외부 요청 0건을 검증한다 | src/test/standalone-player.e2e.py + src/test/local-samples.e2e.py + src/test/public-service-surface.test.mjs | Done (#16) |
| TEST-F-025 | SPEC-024 | playTalking() 상태 및 오류 복구, load() talking·idles 필드, 확장 키 허용, demo.nva idle 파생, #playTalking 버튼, 밀려난 재생 AbortError 무시 및 디코드 오류 전달을 검증한다 | src/test/nva-animation-player.test.mjs + src/test/nva-core.test.mjs + src/test/public-player-surface.test.mjs | Approved (#22) |
| TEST-F-026 | SPEC-025 | Studio v0.2 소품 동작 순서(enter → 본 동작 2회 → exit → 대기), 중단/새 액션 시 취소, 진행 실패 복구, derive 제외, propActions() 매핑, 미존재 키 경고, 중복 라벨 구분, 로더·도구의 200 MiB / 400 MiB 상한 검증 | src/test/nva-core.test.mjs + src/test/nva-animation-player.test.mjs + src/test/nva-bundle-loader.test.mjs + src/test/final-nva.test.py + src/test/local-sample-prep.test.py | Approved (#25) |
