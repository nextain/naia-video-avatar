# 05. 기능 테스트 Registry (TEST-F) — V모델 05

<!--
스키마: 이 한 파일 registry. SPEC(04)을 검증하는 통합 테스트 계획.
추적: 모든 SPEC는 ≥1 TEST-F로 닫힌다. TEST-F는 ≥1 SPEC을 가리킨다(역추적, orphan 0).
컬럼 = | ID | 검증 SPEC | 테스트 요약 | test_ref | 상태 |
-->

| ID | 검증 SPEC | 테스트 요약 | test_ref | 상태 |
|----|-----------|-------------|----------|------|
| TEST-F-001 | SPEC-001, SPEC-002 | demo.nva manifest → validateManifest VALID, 잘못된 manifest → INVALID | node nva-core (수동 검증) | Done |
| TEST-F-002 | SPEC-002 | findTransitionPath/reachableStates: stand→sit_down→sit 경로, sit→stand_up 검증 | node nva-core (수동 검증) | Done |
| TEST-F-003 | SPEC-003 | viewer headless 캡쳐: 크로마 제거 캐릭터 + 상태전환 + 헤드토킹 | /tmp/cap.mjs (playwright) | Done |
| TEST-F-004 | SPEC-004 | editor export → unzip = manifest.json + clips ×7 (9 entries) | /tmp/cap2.mjs (playwright) | Done |
| TEST-F-005 | SPEC-002, SPEC-005 | nva-core 단위(검증·포즈·상태머신·시나리오) 18 assert ALL PASS | src/test/nva-core.test.mjs | Done |
| TEST-F-006 | SPEC-006 | kiosk-v3 강남구 데모 헤드리스 캡쳐 (오사랑 발화 + 자막) | playwright headless | Done |
