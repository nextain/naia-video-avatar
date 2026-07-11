# 프로세스 현황

> **SoT**: `.agents/context/process-status.json`
> 세션 시작/종료 시 SoT JSON과 이 파일을 동기화.

---

## 참조 링크

| 항목 | 위치 |
|------|------|
| 구조 명세 | [docs/project-structure.md](../../docs/project-structure.md) |
| 규칙 SoT | [.agents/context/agents-rules.json](../context/agents-rules.json) |
| 교훈 | [docs/lessons.md](../../docs/lessons.md) |
| 이슈 문서 | [docs/progress/99.dev-comm/](../../docs/progress/99.dev-comm/) |

---

## 현재 작업

**이슈**: nva-poc
**제목**: nva 포맷 v0.2 + VRM식 webm 슬롯 에디터/플레이어
**상태**: active
**시작**: 2026-06-21

> v0.2 기반으로 VRM식 expression/viseme/motion/speech 슬롯을 webm 클립으로 재생하는 방향으로 전환.
> 에디터는 외부 AI/Ditto/cascade 연결 없이 생성된 webm만 미리보기·검증·내보내기하며,
> 무료 브라우저 TTS는 발화 문장 테스트용으로만 사용한다. 오사랑/Naia 샘플은 aiueo 포함 viseme webm +
> 감정 expression 이미지 + ko-KR/en-US 사전 생성 speech webm으로 구성. manifest는 naia-shell 14개
> target locale과 VoxCPM 30개 언어 생성 가능 메타를 포함한다.
> Ditto sync gate는 free/local TTS wav → Ditto render → remux/finalize webm → A/V sync report
> 순서로 검증한다. 오사랑 샘플은 240ms video delay 보정 후 `best_lag_ms=+40ms`,
> Playwright 재생 `readyState=4`로 확인했다.

---

## SDLC 게이트

| 게이트 | 상태 | 산출물(deliverable) |
|--------|:----:|---------------------|
| P01 사용자시나리오 | done | docs/progress/02.user-scenarios/INDEX.md (UC-001~004) |
| P02 테스트시나리오 | done | docs/progress/03.uc-tests/INDEX.md (TEST-S-001~005) |
| P03 요구사항 | done | docs/progress/01.requirements/INDEX.md (REQ-001~007, NFR-001~004) |
| P04 통합테스트 | done | headless 캡쳐 + node 검증 + export unzip (TEST-F-001~004) |
| P05 완료 | partial | 포맷·뷰어·에디터·export = Done / cascade·kiosk-v3 = 잔여(GPU·VM 외부) |

마지막 업데이트: 2026-07-11

---

## 세션 체크리스트

**시작 시**:
- [ ] `process-status.json` 읽기
- [ ] `current_work` 확인
- [ ] `last_updated` 갱신
- [ ] P01~P03 게이트 완료 확인 후 코딩 시작

**종료/커밋 전**:
- [ ] 완료된 게이트 status → done, deliverable 기재
- [ ] `last_updated` 갱신
- [ ] 이 파일 동기화
- [ ] `process-status.json` 커밋에 포함
