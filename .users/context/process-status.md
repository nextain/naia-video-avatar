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

**이슈**: studio-v02-alignment ([nextain/naia-video-avatar#25](https://github.com/nextain/naia-video-avatar/issues/25))
**제목**: 오픈소스 Player·형식 문서를 Studio v0.2 배포 파일에 맞춤
**상태**: active
**시작**: 2026-10-08
**이슈 문서**: [issue-25-studio-v02-alignment.md](../../docs/progress/99.dev-comm/issue-25-studio-v02-alignment.md)

> Studio 가 내보내는 v0.2 번들(소품 동작 enter → 본 동작 2회 → exit → idle 순서, 200 MiB 아카이브·400 MiB 해제 한도,
> 겹칠 수 있는 동작 라벨)을 오픈소스 Player 가 열고 재생하도록 맞춘다. 직전 작업 #22 는 PR #24 로 병합됐다.
> 2026-07 이전 기록은 git 이력을 참조한다.

---

## SDLC 게이트

| 게이트 | 상태 | 산출물(deliverable) |
|--------|:----:|---------------------|
| P01 기획 | done | PC·SP, docs/progress/02.user-scenarios/INDEX.md (UC-001~021) |
| P02 요구사항 | done | docs/progress/01.requirements/INDEX.md (REQ-001~029, NFR-001~015) |
| P03 설계 | done | PL, docs/progress/04.features/INDEX.md (SPEC-001~025) |
| P04 검증 | partial | RECEIPT-IT-25-20261008-01, RECEIPT-E2E-25-20261008-01 (영수증 독립 리뷰어 확인 대기) |
| P05 QC·종료 | pending | docs/receipts/QC-03.md (독립 QC 대기) |

마지막 업데이트: 2026-10-08

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
