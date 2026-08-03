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

**이슈**: [#13](https://github.com/nextain/naia-video-avatar/issues/13)
**제목**: 다국어 사전 생성 발화 엔진 — 공개 NVA Studio/Player + 비공개 Naia Ditto 생성 서비스
**상태**: active
**시작**: 2026-08-01

> v0.1→v0.2 전환(animations/scenario 그래프, cascade 정합). editor = 알파 webm 렌더 +
> scenario SVG 노드그래프(드래그·연결·양방향) + cascade 연결 패널(실시간 발화 뷰잉, 상단 플레이어
> 통합, 미리보기 배경색). cascade `enable_alpha=1` 로 발화도 투명(정적 matte).
> 자세히 = alpha-adk `.agents/progress/nva-osarang-rebuild-2026-06-23.md`

2026-08-03 갱신: 공개 제품은 NVA 규격·검증기·GPU 없는 Player와 생성 자산을 편집·패키징하는
NVA Studio다. Ditto 생성·품질 분석은 비공개 Naia 서버가 소유한다. 인간형 Jina의 원본 NVA에
임의 512 몸 크롭은 품질 증거에서 제외한다. A/B/C 정상 속도 사람 시청에서 A/B의 이중상·끊김과
달리 C 광학 흐름 연결이 안정적으로 보여 C를 구현 기본값으로 채택했다. 같은 19.52초 한국어
문장과 50개 창으로 민호·나이아·알파를 반복했을 때 경계 추가 변화 평균은 각각
0.0331·0.1938·0.0685였다. 민호는 기준 증거로 채택했다. 알파는 공식 원본 픽셀에서 어깨와 팔을
제외한 머리 마스크를 사용했으며 첫 발화 사람 승인 대기다. 비인간형 나이아는 높은 전환 오차로
승인을 보류한다. 구현 기본값과 캐릭터 승인을 분리한다. Ditto의 15프레임 눈 깜빡임은 문장 전역
시간축으로 동기화돼 있다. `sil/a/i/u/e/o` 공통 조음 전이/문맥 자산의 네 언어 미지 발화
일반화 판정은 남아 있다.

---

## SDLC 게이트

| 게이트 | 상태 | 산출물(deliverable) |
|--------|:----:|---------------------|
| P01 사용자시나리오 | done | docs/progress/02.user-scenarios/INDEX.md (UC-010~012) |
| P02 테스트시나리오 | done | docs/progress/03.uc-tests/INDEX.md (TEST-S-011~013) |
| P03 요구사항 | done | docs/progress/01.requirements/INDEX.md (REQ-014~017, NFR-005~008) |
| P04 통합테스트 | pending | TEST-F-012~016 + Jina 4개 언어 타당성·Studio/Player/Naia 서버/cascade 통합 증거; 통과 뒤 Naia H2 |
| P05 완료 | pending | 타당성 통과와 요구사항 Done, 또는 근거 있는 비실현 판정 |

마지막 업데이트: 2026-08-03

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
