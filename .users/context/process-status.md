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
**제목**: nva 포맷 v0.2 + 웹 뷰어/에디터(노드그래프·cascade 연결) + 실시간 발화(알파)
**상태**: active
**시작**: 2026-06-21

> v0.1→v0.2 전환(animations/scenario 그래프, cascade 정합). editor = 알파 webm 렌더 +
> scenario SVG 노드그래프(드래그·연결·양방향) + cascade 연결 패널(실시간 발화 뷰잉, 상단 플레이어
> 통합, 미리보기 배경색). cascade `enable_alpha=1` 로 발화도 투명(정적 matte).
> 자세히 = alpha-adk `.agents/progress/nva-osarang-rebuild-2026-06-23.md`

2026-07-15 갱신: 720×1280 캔버스와 무리사이즈 512×512 Ditto 입력 영역, 얼굴 가이드
분리, 클립 미리보기, 원본 영상 크로마키 스포이드를 구현·검증했다. 개인 Alpha 번들은
공개 저장소 밖의 비공개 `naia-settings`에서 관리하며, Cascade 연결·배포는 별도 트랙이다.

---

## SDLC 게이트

| 게이트 | 상태 | 산출물(deliverable) |
|--------|:----:|---------------------|
| P01 사용자시나리오 | done | docs/progress/02.user-scenarios/INDEX.md (UC-001~007) |
| P02 테스트시나리오 | done | docs/progress/03.uc-tests/INDEX.md (TEST-S-001~008) |
| P03 요구사항 | done | docs/progress/01.requirements/INDEX.md (REQ-001~011, NFR-001~004) |
| P04 통합테스트 | done | node 계약 테스트 + Playwright 편집기 실측 + export unzip (TEST-F-001~009) |
| P05 완료 | partial | 포맷·뷰어·에디터·export = Done / cascade·kiosk-v3 = 잔여(GPU·VM 외부) |

마지막 업데이트: 2026-07-15

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
