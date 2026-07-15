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
