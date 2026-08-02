# Issue 13 한국어 5문장 전환 실험 — 테스트·통합 리뷰

- 날짜: 2026-08-03
- 이슈: `nextain/naia-video-avatar#13`
- 단계: test, integration
- 헌장: `.agents/work/issue13-charter.yaml`
- 헌장 SHA-256: `a16478184e9f344eb8db3308fe92b3bb2df65ceebf764c76aa03336cba6f7154`

## 검토 범위

- 사용자 문서: `docs/progress/99.dev-comm/issue-13-quality-preview.ko.md`
- 상태 SoT와 사용자 미러
- 한국어 5문장 `manifest.json`, `verification-summary.json`
- 문장별 `quality-report.json` 5개
- 정상 속도와 4배 느린 통합 비교 영상

생성 얼굴·오디오·영상과 원시 보고서는 `.agents/work/` 아래의 무시된 로컬 검증 자산이다.
공개 Git에는 사용자 문서, 상태 기록, 이 리뷰 기록만 포함한다.

## 결정론 검사

- 5개 원시 보고서의 문장, 창 수, A/B/C 추가 변화, 발화 영역 SSIM을 사용자 표와 대조
- 5종 평균과 A 2회/B 3회 컷 경계 우세 집계를 재계산
- 통합 영상 SHA-256과 `ffprobe` 메타데이터를 `verification-summary.json`에 결박
- 두 통합 영상을 끝까지 디코딩: 오류 0
- 사용자 문서의 문장별 정상/느린 영상과 JSON 링크 존재 확인
- 로컬 생성 자산이 Git 무시 대상이며 추적 목록에 포함되지 않음을 확인
- 공개 저장소 테스트: `node --test src/test/*.test.mjs` — 74/74
- V모델 추적: `node scripts/check-traceability.mjs` — dead-link 0, orphan 0

## Review-pass 1차 수렴

두 독립 리뷰어가 헌장을 직접 읽고 동일한 SHA-256을 확인했다.

| 리뷰어 | 헌장 결박 | 결과 | 발견 |
|---|---|---|---|
| Codex CLI 읽기 전용 세션 | 일치 | CLEAN | 없음 |
| 독립 계획·검증 리뷰어 | 일치 | CLEAN | 없음 |

Gemini CLI는 개인용 Code Assist 클라이언트 지원 종료로 인증에 실패했고, Claude CLI는
제한된 8회 읽기 안에 결과를 내지 못해 유효 리뷰어에서 제외했다. 두 실패 결과는 판정에
사용하지 않았다.

## 증거 판정

1차 기록을 추가한 뒤 같은 헌장 해시와 현재 전체 diff로 2차 수렴 검토를 수행했다.
두 리뷰어 모두 다시 `CLEAN`, 발견 없음으로 판정했다. 따라서 integration 단계의
연속 2회 clean 조건을 충족했다.

- 표 수치와 집계가 원시 JSON에 일치한다.
- B는 5문장 모두 발화 영역 SSIM이 가장 높지만 그 차이는 작다.
- 컷 경계 추가 변화는 A와 B가 엇갈리므로 A/B를 사람 평가 후보로 유지한다.
- C의 현 광학 흐름은 두 자동 지표를 동시에 이긴 문장이 없다.
- 자동 지표는 지각 자연스러움의 증거가 아니며, 한국어 5문장은 다국어 타당성 판정이 아니다.
- 따라서 P04와 P05는 계속 `pending`이다.

## 최종 판정

한국어 5문장 반복 실험의 산출물 무결성, 문서 수치, 공개·비공개 경계는 검증됐다.
제품 타당성은 A/B 사람 눈가림 평가와 네 언어 미지 문장 시험 전까지 `INCONCLUSIVE`다.
