# 01. 요구사항 Registry (REQ) — V모델 01

<!--
스키마: 이 한 파일 registry (항목당 별도 문서 ❌). 상태 = Draft→Approved→In-progress→Done.
추적: 모든 REQ는 ≥1 UC(02)로 닫히거나, NFR이면 ≥1 TEST-S(03)로 직결한다 (orphan 0).
컬럼 = | ID | 영역 | 요구사항 | 상태 | UC | SPEC | TEST |
scripts/check-traceability.mjs 가 이 표를 파싱한다.
빈 상태(이 안내 주석만) = SDLC 게이트 bootstrap(경고·허용). 실제 REQ를 채우면 게이트 enforce.
-->

| ID | 영역 | 요구사항 | 상태 | UC | SPEC | TEST |
|----|------|----------|------|----|----|------|
| REQ-001 | format | nva(비디오 클립 아바타) 포맷을 JSON manifest 스키마로 정의 | Done | UC-001 | SPEC-001 | TEST-S-001 |
| REQ-002 | state-machine | talking/animation state + transition + 포즈 연속성(entry/exit_pose) | Done | UC-002, UC-003 | SPEC-002 | TEST-S-002 |
| REQ-003 | compositing | 배경+캐릭터+헤드토킹 레이어 합성, 동시 알파 디코딩 ≤ 2 | Done | UC-002 | SPEC-003 | TEST-S-003 |
| REQ-004 | viewer | nva 번들 재생(상태 전환 시 transition 자동 삽입) | Done | UC-002 | SPEC-003 | TEST-S-002 |
| REQ-005 | editor | manifest 편집 + 라이브 미리보기 | Done | UC-001 | SPEC-004 | TEST-S-004 |
| REQ-006 | export | 단일 `.nva`(zip) 파일로 패키징/내보내기 | Done | UC-004 | SPEC-004 | TEST-S-004 |
| REQ-007 | validation | 스키마+initial+포즈정합+face_bbox+연결성 유효성 검증 | Done | UC-001 | SPEC-002 | TEST-S-001 |
| NFR-001 | deploy | GPU 없이 정적 웹(브라우저)에서 동작 | Done | — | — | TEST-S-005 |
| NFR-002 | packaging | 뷰어·에디터는 자기완결 단일 HTML | Done | — | — | TEST-S-005 |
| NFR-003 | alpha | 캐릭터 레이어는 알파(VP9) / 크로마키 둘 다 수용 | Done | — | — | TEST-S-003 |
| NFR-004 | deps | nva-core 런타임 의존 0 (순수 JS) | Done | — | — | TEST-F-001 |
| REQ-008 | scenario | 연출 시나리오(상태/이벤트/대사 시퀀스) 자동 재생 + 검증 | Done | UC-003 | SPEC-005 | TEST-S-002 |
| REQ-009 | editor | 애니메이션 클립 입력 옆에 현재 미디어를 중앙 플레이어에서 즉시 재생하는 명시적 미리보기 제어를 제공 | Done | UC-005 | SPEC-007 | TEST-S-006 |
| REQ-010 | compositing | 표준 720×1280 영상의 중앙 상단 `[104,0,512,512]`를 Ditto 발화 영역으로 사용하고, 정확한 512×512 픽셀 영역과 실제 얼굴 가이드를 분리 | Done | UC-006 | SPEC-008 | TEST-S-007 |
| REQ-011 | editor | 크로마키 지움 색을 중앙 원본 영상 프레임에서 스포이드로 채취하고 manifest `chroma_key`에 즉시 저장 | Done | UC-007 | SPEC-009 | TEST-S-008 |
| REQ-012 | cascade | `:8099` 에디터가 명시한 cascade URL(로컬 정본 `:8910`)에 현재 nva와 ref URL을 전송하고, 절대 ref URL을 zip 상대 파일로 재해석하지 않은 채 음성 포함 발화를 재생 | Done | UC-008 | SPEC-010 | TEST-S-009 |
| REQ-013 | editor | manifest의 캔버스 폭·높이를 편집하고 실제 비율로 미리보며, 말하기용 `head_image`를 manifest의 `ditto_region`과 동일한 512×512 PNG로 생성 | Done | UC-009 | SPEC-011 | TEST-S-010 |
| REQ-014 | generation-api | 공개 OSS 배포면은 NVA 규격·검증기·Player·Studio·공급자 비종속 생성 계약과 클라이언트 어댑터로 제한한다. Studio는 HTTPS 일회성 업로드로 얼굴 이미지를 보내고 작업에는 불투명 `source_asset_id`와 생성 설정만 전달한다. API로 진행률·취소·오류·완료 자산 목록·콘텐츠 해시·품질 보고서를 받으며, 원본/base64/임의 URL/자격증명은 작업 상태·로그·NVA에 남기지 않는다. Ditto 실행·모델·생성 품질 분석·운영 비밀은 비공개 Naia 서버에만 둔다 | In-progress | UC-010 | SPEC-012 | TEST-S-011 |
| REQ-015 | studio | NVA Studio는 생성된 영상 자산의 추가·교체·배치, 메타정보 편집, 미리보기, 검증, `.nva` 패키징을 제공하되 로컬 Ditto 실행을 요구하지 않는다 | In-progress | UC-011 | SPEC-013 | TEST-S-012 |
| REQ-016 | playback | NVA Player는 `text + audio + SpeechPlan`을 받아 Ditto 없이 사전 생성 자산으로 다국어 미지 발화를 합성한다. SpeechPlan은 공통 조음 단위와 오디오 기준 시작/끝 시각을 담고 cascade 또는 교체 가능한 정렬 공급자가 생성한다. `text + audio`만 있는 근사 미리보기는 품질 보장 경로로 표시하지 않는다 | In-progress | UC-012 | SPEC-014, SPEC-015 | TEST-S-013, TEST-S-014 |
| REQ-017 | provenance | 생성 자산에는 생성기 종류·버전·입력/설정 해시·언어 비종속 입모양 목록·검증 결과·품질 보고서 콘텐츠 해시를 기록하고, 검증기는 보고서/자산 해시 불일치를 거부한다. 얼굴/음성 원본과 서버 비밀 값은 번들에 넣지 않는다 | In-progress | UC-010 | SPEC-012 | TEST-S-011 |
| NFR-005 | gpu-free | Player와 Studio의 재생·편집·패키징은 Ditto·CUDA·VRAM 없이 지원 브라우저에서 동작한다 | In-progress | — | SPEC-013, SPEC-014 | TEST-S-012, TEST-S-013 |
| NFR-006 | multilingual | Player 코어는 특정 언어의 철자·성조·5모음에 고정되지 않고 공통 조음 분류만 소비한다. 최소 한국어·영어·일본어·중국어의 G2P/강제 정렬은 교체 가능한 서버 어댑터이며, 성조는 오디오 운율에 남고 입모양 단위와 분리한다 | In-progress | UC-012 | SPEC-014, SPEC-015 | TEST-S-013, TEST-S-014 |
| NFR-007 | realtime-quality | 검증된 동기화 분석기로 각 언어 미지 발화의 오디오-입술 절대 오프셋 이벤트 p95와 문장 cluster bootstrap 95% 신뢰구간 상한이 모두 80ms 이하이고, 전체 문장 Ditto와의 눈가림 전체 프레임 비교에서 자연스러움 중앙값·clip/rater crossed cluster bootstrap 구간·차단 결함 기준을 후보별/언어별로 통과해야 한다. 완전한 SpeechPlan을 받은 뒤 cold/warm 첫 재생 프레임 p95 250ms 이하, Chromium CPU 재생 RTF p95 0.5 이하, 완료·취소·오류·끼어들기 후 원래 상태 복귀 100%도 만족한다 | In-progress | UC-012 | SPEC-014 | TEST-S-013 |
| NFR-008 | bundle-efficiency | 공통 조음 단위는 13개로 고정하고 후보 B는 방향성 전이 최대 169개, 후보 C는 B+빈도 상위 문맥 단위 최대 64개로 제한한다. 제품 후보는 중립 머리와 인덱스된 투명 발화층 묶음을 사용하고, 한 상태의 전체 발화 자산은 두 자산과 manifest/index를 합쳐 100 MiB 이하로 배포한다 | In-progress | UC-012 | SPEC-014 | TEST-S-015 |
