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
| TEST-S-006 | UC-005 | 에디터에서 `speak` 선택 → 클립 옆 미리보기 실행 → 중앙 플레이어가 선택 클립을 재생 | 브라우저+계약(node) | src/test/editor-clip-preview.test.mjs + Playwright 실측 | Done |
| TEST-S-007 | UC-006 | 720×1280 표준 영상에서 `[104,0,512,512]` 영역을 표시·검증하고 실제 얼굴 가이드를 별도 유지 | 단위+브라우저 | src/test/nva-core.test.mjs + Playwright 실측 | Done |
| TEST-S-008 | UC-007 | 에디터에서 스포이드 활성화 → 중앙 원본 영상의 배경 픽셀 클릭 → 해당 RGB가 `chroma_key`와 색상 입력기에 반영되고 즉시 미리보기에 적용 | 브라우저+계약(node) | src/test/editor-chroma-eyedropper.test.mjs + Playwright 실측 (`#267d35`) | Done |
| TEST-S-009 | UC-008 | 8099 에디터 로드 → 기본 URL 8910 연결 → ref 목록/기본 URL 확인 → `강남구청 1층 3번 창구입니다.` 발화 → 플레이어에 음성 포함 MP4 수신, 잘못된 `.../http://...` ref 요청 0건 | 브라우저+계약(node) | src/test/editor-ref-url.test.mjs + Playwright E2E(2026-07-15) | Done |
