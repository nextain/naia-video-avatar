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
| TEST-S-010 | UC-009 | 720×1280과 다른 비율의 manifest를 각각 로드해 캔버스 비율·좌표가 유지되고, 영상 프레임에서 생성한 헤드 PNG가 manifest의 `ditto_region`과 동일한 512×512인지 확인 | 브라우저+계약(node) | src/test/editor-responsive-canvas.test.mjs + Playwright (`tmp/nva-editor-responsive-canvas.png`) | Done |
| TEST-S-011 | UC-010 | Studio가 일회성 업로드→불투명 자산 ID 작업을 제출·조회·취소하고, 자산/보고서 해시가 결박된 결과만 가져온다. 결과에는 generator kind/version, input/settings hash, 13단위 inventory, validation result와 필수 품질 지표가 모두 있어야 한다. 상태·로그·NVA의 base64·원본 경로·임의 URL·토큰·모델 경로를 탐지하고 변조/경로 이탈/해시 불일치를 거부한다. 공개 배포 목록은 규격·검증기·Player·Studio·계약/클라이언트만 허용하고 Ditto 실행·모델·품질 분석 모듈 포함을 실패시킨다. 가짜 clock으로 완료·취소 보존기한 뒤 원본 조회 불가와 `source_deleted_at`을 검증한다 | 계약+통합 | 생성 작업 계약 + 공개 surface allowlist + 가짜 서버 + Naia 어댑터 smoke + cleanse scan | Planned |
| TEST-S-012 | UC-011, NFR-005 | GPU·CUDA·Ditto가 보이지 않는 브라우저/프로세스에서 생성된 발화 영상 자산을 추가·교체하고 메타정보를 수정한 뒤 미리보기·export→재로드한다. 자산 해시·경로·메타정보가 보존되고 잘못된 번들은 거부된다 | 브라우저+계약 | Studio round-trip Node 테스트 + GPU-disabled Playwright | Planned |
| TEST-S-013 | UC-012, NFR-005, NFR-007 | 인간형 Jina에서 GPU가 보이지 않는 Chromium으로 전체 머리(W), 중립 머리+차분 알파 발화층(F), 가변 하안면(L)을 모두 재생한다. 같은 전체 문장 Ditto 영상과 눈가림 전체 프레임 비교하고, 교정된 분석기로 음소 오프셋·입/비입 영역 경계·머리 자세·시선·깜빡임·밝기·얼굴 내부/헤드-어깨 접합, 첫 프레임, CPU RTF와 상태 복귀를 판정한다. 제품 PASS는 F만 가능하며 통과 뒤 Naia는 별도 H2로 시험한다 | 타당성+브라우저 통합 | docs/research/issue-13-feasibility-protocol.md + Playwright + 고정 분석기 + 눈가림 영상 비교 | Planned |
| TEST-S-014 | UC-012, REQ-016, NFR-006 | 고정 MFA v3.3.9 commit과 문서에 기록된 언어별 v3 acoustic/dictionary SHA-256으로 FLEURS ko/en/ja/cmn의 고정 10개 정렬 교정+20개 최종, 총 120개 미지 문장을 같은 SpeechPlan 스키마로 정규화하고 단조 시각·오디오 범위·고정 phone-map 어휘를 검증한다. 행을 동적으로 추가하지 않고 H1에는 별도 MMS 결과를 섞지 않는다. Player에 언어 분기가 없고 SpeechPlan 없는 입력은 명시적 `approximate` 배지의 비보장 미리보기로만 처리됨을 확인한다 | 계약+통합 | SpeechPlan fixture 120개 + cascade/alignment adapter + runtime tests | Planned |
| TEST-S-015 | UC-012, NFR-008 | 13단위/169전이/상위 문맥 64개 상한, 한 상태 100 MiB, 묶음 자산 인덱스 무결성·keyframe 범위·Chromium 사전 읽기/전환 비용을 검증한다 | 계약+성능 | bundle index validator + ffprobe + Playwright timing | Planned |
