# 03. 시나리오 테스트 Registry (TEST-S) — V모델 03

<!--
스키마: 이 한 파일 registry. UC(02)와 NFR(01)을 검증하는 시스템/인수 테스트.
추적: 모든 UC는 ≥1 TEST-S로 닫힌다. TEST-S는 ≥1 UC 또는 NFR-REQ를 가리킨다(역추적, orphan 0).
컬럼 = | ID | 검증대상(UC/REQ) | 시나리오 요약 | 형태 | test_ref | 상태 |
-->

| ID | 검증대상(UC/REQ) | 시나리오 요약 | 형태 | test_ref | 상태 |
|----|------------------|---------------|------|----------|------|
| TEST-S-001 | UC-001 | nva 번들 로드 → validateManifest VALID(경고 0) | 통합(node) | examples/demo.nva + nva-core | Done |
| TEST-S-002 | UC-002, UC-003 | stand_talk→sit_talk 시 sit_down transition 자동 삽입 후 앉은 자세 재생 | 캡쳐(headless) | /var/tmp/nva_dance.png, nva_sit_speak.png | Done |
| TEST-S-003 | UC-002 | speaking 시 face_bbox에 헤드토킹 입 오버레이 + 크로마 합성 | 캡쳐(headless) | /var/tmp/nva_sit_speak.png | Done |
| TEST-S-004 | UC-004 | 에디터 export → `.nva`(zip) = manifest.json + clips/ ×7 | 캡쳐+unzip | /var/tmp/exported.nva | Done |
| TEST-S-005 | NFR-001, NFR-002 | GPU 없이 정적 http 서버 + 브라우저로 뷰어/에디터 렌더 | 캡쳐(playwright) | /tmp/cap.mjs, cap2.mjs | Done |
