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
| TEST-F-007 | SPEC-007 | 클립 미리보기 제어·다국어 라벨·선택 애니메이션 재생 결선 계약 + 실제 브라우저 클릭 | src/test/editor-clip-preview.test.mjs + Playwright 실측 | Done |
| TEST-F-008 | SPEC-008 | 신규 표준값은 720×1280 + `[104,0,512,512]`이며 Ditto 영역은 정수 좌표·정확히 512×512·캔버스 내부이고 얼굴 bbox와 별도 보존됨을 검증 | src/test/nva-core.test.mjs + Playwright 실측 | Done |
| TEST-F-009 | SPEC-009 | 스포이드 버튼·다국어 안내·원본 video drawImage/getImageData·좌표 변환·`chroma_key` 저장 결선과 실제 배경 픽셀 클릭을 검증 | src/test/editor-chroma-eyedropper.test.mjs + Playwright 실측 | Done |
| TEST-F-010 | SPEC-010 | 절대 cascade ref URL은 manifest에 남고 zip 파일 목록에서는 제외됨을 계약 검사하고, 8099→8910 연결·ref 선택·발화 재생 및 브라우저 4xx 0건을 Playwright로 검증 | src/test/editor-ref-url.test.mjs + Playwright E2E(2026-07-15) | Done |
| TEST-F-011 | SPEC-011 | 캔버스 입력·비율 기반 플레이어 크기·`ditto_region`의 정확한 512×512 헤드 생성 결선을 계약 검사하고, 720×1280 및 비표준 비율 NVA를 Playwright로 로드해 실제 canvas 크기와 표시 비율을 확인 | src/test/editor-responsive-canvas.test.mjs + Playwright | Done |
| TEST-F-012 | SPEC-012 | 일회성 업로드·불투명 ID 작업의 제출·진행·완료·취소·오류·재시도, generator/input/settings/inventory/validation/quality-report 필수 필드와 자산/보고서 해시를 검증한다. 공개 surface allowlist 밖 Ditto 실행·모델·생성 품질 분석 코드와 base64·임의 URL·경로 이탈·비밀 값 유출을 공개 계약/패키지와 로컬 가짜 서버에서 거부한다 | src/test generation-contract + private generation service tests | In-progress (계약/API 통과, 실제 Ditto 미결) |
| TEST-F-013 | SPEC-013 | GPU·CUDA·Ditto가 없는 환경에서 생성 결과 가져오기→영상 교체→canvas/ditto_region/레이어 z-order·좌표 배치→메타 수정→미리보기→검증→export→재로드 round-trip과 오류 복구를 실제 Studio UI로 검증 | src/test/editor-speech-generation.test.mjs + Playwright Studio 왕복 | In-progress (생성/가져오기/내보내기 통과) |
| TEST-F-014 | SPEC-014 | 고정 SpeechPlan으로 스케줄·prefetch·경계 전이와 상태 복귀를 검증하고, Jina A/B/C의 전체 머리(W), 중립 머리+차분 알파 발화층(F), 가변 하안면(L)을 각각 몸 영상 위에 재생한다. 같은 오디오의 전체 문장 Ditto 영상과 선등록된 눈가림 전체 프레임 비교로 자연스러움 중앙값, clip/rater crossed cluster bootstrap 구간, 반복 차단 결함을 입뿐 아니라 머리·눈·밝기·얼굴 내부 경계·헤드-어깨 접합에서 검증한다. 제품 PASS는 B-F/C-F만 허용하고 Naia는 후속 H2로 분리한다 | src/test/speech-*.test.mjs + Jina Playwright + full-frame blind comparison evidence | In-progress (런타임/Jina 합성 통과, H1 자연스러움 미결) |
| TEST-F-015 | SPEC-015 | 120개 다국어 fixture의 단조 시각·오디오 해시/범위·고정 phone-map 13단위 어휘·confidence/provenance를 검증하고 잘못된/누락된 SpeechPlan을 품질 보장 경로에서 거부하며 `approximate` 배지를 검증한다 | src/test/speech-plan.test.mjs + cascade adapter | In-progress (계약 통과, 120개 정렬 fixture 미결) |
| TEST-F-016 | SPEC-014 | 묶음 자산의 단위 인덱스·바이트 범위·keyframe·해시를 검증하고 100 MiB 이하에서 다음 두 단위를 미리 읽어 `<250ms` 첫 프레임과 `RTF<=0.5`를 측정한다 | src/test bundle-index + Chromium VP9/Range + 성능 측정 | In-progress (무결성/Range 통과, p95 성능 미결) |
