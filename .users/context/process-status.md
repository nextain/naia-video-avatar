# Process status

> `.agents/context/process-status.json`의 사용자용 미러.

## 현재 작업

- Issue: `nva-v03-state-resource-editor` (`nextain/naia-video-avatar#7`)
- 제목: NVA 0.3 상태 리소스 계약과 Windows 에디터
- 상태: done
- 시작/갱신: 2026-07-14

NVA 0.3이 현재 portable 정본이다. 각 캐릭터 상태는 revision이 있는 idle,
talking-body, 확장 가능한 버전형 talking-head source/descriptor, 객체형 face bbox를
소유한다. Windows에서 `profile_ref`를 설정하고 원격 Cascade 주소는 에디터 로컬
설정으로만 보관한다.

0.1/0.2 manifest는 명시적으로 0.3으로 이행한다. `sil/a/i/u/e/o` 구현은 역사적
실험 증거일 뿐이다. 전이 키, 보간, 코덱, 합성 위치는 portable 계약을 막지 않으며
RTX 3090 실험 증거로 결정한다.

## SDLC 게이트

| 게이트 | 상태 | 산출물 |
|---|:---:|---|
| P01 사용자 시나리오 | done | `docs/progress/02.user-scenarios/INDEX.md` (`UC-AV-002/003/005/007`) |
| P02 테스트 시나리오 | done | `docs/progress/03.uc-tests/INDEX.md` (`UCT-AV-002/003/005/007`) |
| P03 요구사항 | done | `docs/progress/01.requirements/INDEX.md` (`REQ-ARCH-001..005`, `REQ-EXP-002`, `REQ-NVA-001..002`) |
| P04 통합 테스트 | done | core, JSON Schema, Playwright 원격 호출, export/reopen, migration, 경로·버전·격리·자산 완전성 |
| P05 요구 충족 | done | 개발·테스트 리뷰 각각 연속 2회 clean. 증거: `.agents/reviews/nva-v03-review-pass-2026-07-14.md`. Cascade 상태 map과 3090 증거는 소비자 단계. |

## 세션 체크리스트

시작 시 이 파일의 SoT와 게이트를 확인한다. 종료 시 상태와 증거를 갱신하고 JSON/MD를
함께 커밋한다.
