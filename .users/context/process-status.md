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
**제목**: nva 포맷 + 웹 뷰어 + 에디터 PoC (박대표 미팅 데모)
**상태**: active
**시작**: 2026-06-21

---

## SDLC 게이트

| 게이트 | 상태 | 산출물(deliverable) |
|--------|:----:|---------------------|
| P01 사용자시나리오 | done | docs/progress/02.user-scenarios/INDEX.md (UC-001~004) |
| P02 테스트시나리오 | done | docs/progress/03.uc-tests/INDEX.md (TEST-S-001~005) |
| P03 요구사항 | done | docs/progress/01.requirements/INDEX.md (REQ-001~007, NFR-001~004) |
| P04 통합테스트 | done | headless 캡쳐 + node 검증 + export unzip (TEST-F-001~004) |
| P05 완료 | partial | 포맷·뷰어·에디터·export = Done / cascade·kiosk-v3 = 잔여(GPU·VM 외부) |

마지막 업데이트: 2026-06-21

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
