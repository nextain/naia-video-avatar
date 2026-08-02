# NVA 원본 머리 발화 품질 비교 — 사용자가 볼 문서

최종 갱신: 2026-08-03
관련 이슈: [nextain/naia-video-avatar#13](https://github.com/nextain/naia-video-avatar/issues/13)

## 먼저 바로잡는 내용

이전 실험은 Jina 몸 영상에서 `[104,0,512,512]`를 새로 잘라 Ditto에 넣었다. 이 이미지는 원본 `Jina.nva`의 말하기용 머리 이미지가 아니며 어깨·팔·허리까지 포함했다. 따라서 그 영상에서 보인 어깨 움직임과 “512 전체 영역이 적합하다”는 결론은 제품 검증 증거로 사용할 수 없다.

이번 재실험은 원본 NVA ZIP 안의 다음 자산만 사용했다.

- 머리 원본: `clips/speak_head.png`, RGBA 158×243
- 몸 영상: `clips/speak_body.webm`, 720×1280
- 실제 런타임 배치: `[280,70,158,242]` — YUV420 짝수 픽셀 보정 포함
- 머리 SHA-256: `5b79b408093cbd122493ef79fbb16d41d6b617e025deade06728caa2c6f46329`
- 몸 SHA-256: `9e8365063dbc18868e16ed9e63fdb498afcb037dc55159f58429a094a9fcefe3`

비공개 검사기도 이제 NVA 내부 머리·몸의 바이트와 배치 좌표를 먼저 대조한다. 원본 RGBA를 초록 배경에 합성한 로컬 이미지와 Ditto 컨테이너가 실제로 읽는 파일의 SHA-256도 일치해야 한다. 임의 512 크롭이나 다른 몸 영상을 주면 Ditto 실행 전에 실패한다.

## 바로 볼 영상

같은 한국어 문장과 같은 몸 영상을 사용했다.

> 안녕하세요. 나이아 비디오 아바타의 실제 조합 발화 품질을 확인합니다.

1. [W — 원본 NVA 머리로 문장 전체를 한 번에 생성](../../../.agents/work/issue13-quality/korean-original-nva-head-comparison/01-W-original-nva-head-korean.mp4)
2. [R — 원본 NVA 머리로 독립 생성한 창을 240ms로 조합](../../../.agents/work/issue13-quality/korean-original-nva-head-comparison/02-R-original-nva-head-240ms.mp4)
3. [W와 R 나란히 비교](../../../.agents/work/issue13-quality/korean-original-nva-head-comparison/03-W-vs-R-original-nva-head.mp4)
4. [W·80ms·160ms·240ms 네 화면 비교](../../../.agents/work/issue13-quality/korean-original-nva-head-comparison/04-W-vs-80-vs-160-vs-240.mp4)

W는 품질 기준선이다. R은 1.2초 오디오 창 13개를 Ditto로 각각 생성하고, 창 사이를 완만하게 섞은 컷 연속성 실험이다. R은 아직 재사용 가능한 13개 발음 자산이 아니다.

## 측정 결과

| 전환 길이 | R 전환 최대 변화 | 같은 시점 W | R의 추가 최대 변화 | 발화 영역 SSIM |
|---:|---:|---:|---:|---:|
| 80ms | 0.24061 | 0.10620 | +0.13441 | 0.72208 |
| 160ms | 0.17983 | 0.10750 | +0.07233 | 0.72362 |
| 240ms | **0.12817** | 0.10583 | **+0.02234** | **0.72637** |

240ms가 세 후보 중 컷의 추가 순간 변화가 가장 작았다. 240ms에서 머리 배치 밖 몸 영역의 디코딩 후 구조 유사도(SSIM)는 0.99929이고, 무손실 합성 코드의 단위 테스트에서는 배치 밖 픽셀이 정확히 보존된다. 남은 작은 수치 차이는 W와 R을 각각 H.264로 압축한 영향도 포함한다.

접촉 시트에서도 어깨·팔·몸은 W와 R에서 같은 몸 프레임을 유지했다. 움직이는 입력은 원본 NVA의 작은 머리 이미지뿐이며, 잘못된 512 크롭처럼 어깨가 Ditto 입력에 들어가지 않는다.

원시 보고서:

- [80ms](../../../.agents/work/issue13-quality/korean-original-nva-head-comparison/quality-report-80ms.json)
- [160ms](../../../.agents/work/issue13-quality/korean-original-nva-head-comparison/quality-report-160ms.json)
- [240ms](../../../.agents/work/issue13-quality/korean-original-nva-head-comparison/quality-report-240ms.json)

## 중간 프레임 기술 3종 비교

같은 13개 Ditto 생성 창과 240ms 전환 구간에 후처리만 다르게 적용했다. 따라서 입력과 생성 편차가 아닌 전환 기술 차이를 비교한다.

- A `linear`: 현재 240ms 코사인 혼합
- B `neutral_bridge`: 전환 양끝은 그대로 유지하고, 정중앙에서만 최대 35%를 원본 중립 머리 쪽으로 보정
- C `flow_tween`: 양방향 광학 흐름으로 A/B 프레임을 휘어 중간 프레임 생성

바로 볼 자료:

1. [전신 4화면 정상 속도](../../../.agents/work/issue13-quality/korean-transition-methods-v30-final/transition-methods-comparison.mp4)
2. [머리 확대 4화면 정상 속도](../../../.agents/work/issue13-quality/korean-transition-methods-v30-final/transition-methods-head-closeup.mp4)
3. [머리 확대 4화면 4배 느리게](../../../.agents/work/issue13-quality/korean-transition-methods-v30-final/transition-methods-head-closeup-slow4x.mp4)
4. [원시 품질 보고서](../../../.agents/work/issue13-quality/korean-transition-methods-v30-final/quality-report.json)

| 기술 | 전환 최대 변화 | W 대비 추가 변화 | 발화 영역 SSIM | 자동 순위 |
|---|---:|---:|---:|---:|
| A 현재 혼합 | 0.12958 | +0.02097 | 0.72581 | 2 |
| B 중립 브리지 | **0.12595** | **+0.01734** | **0.73390** | **1** |
| C 광학 흐름 중간 프레임 | 0.17337 | +0.06476 | 0.72466 | 3 |

독립적으로 한 번 더 실행한 v29에서도 전환 연속성과 발화 영역 유사도 둘 다 `B → A → C` 순서가 동일했다. B는 현재 가장 유력한 후보다. C의 단순 광학 흐름은 입·코·머리카락의 서로 다른 변형을 잘못 매칭하며 오히려 최대 변화를 키웠으므로 현 구현은 탐색 후보에서 제외한다.

다만 B의 수치 우위가 사람이 보기에도 자연스러운지, 또는 말 중간에 입이 잠시 중립으로 닫히는 느낌을 주는지는 영상으로 판단해야 한다. 먼저 정상 속도와 음성으로 보고, 그다음 4배 느린 영상으로 컷 경계를 확인한다. 느린 영상만으로 자연스러움을 판정하지 않는다.

## 한국어 문장 5종 반복 비교

한 문장에만 맞춘 결과인지 확인하기 위해 VoxCPM2로 서로 다른 발화 특성의 문장 5개를 만들고,
각 문장을 동일한 Jina 원본 머리와 동일한 W/A/B/C 조건으로 다시 생성했다.

1. 짧은 문장: “오늘도 반갑습니다. 편안하게 이야기해 볼까요?”
2. 모음 전환: “아이와 여우가 우아하게 오솔길을 걸어요.”
3. 입술 닫힘 자음: “봄바람이 불면 보랏빛 꽃잎이 부드럽게 피어납니다.”
4. 연속 발화: “작은 기차가 굽은 철길을 지나 푸른 바다 가까이 달려갑니다.”
5. 쉼표 발화: “잠시 멈추고, 숨을 고른 뒤, 천천히 다시 말씀드리겠습니다.”

먼저 이어보기:

1. [다섯 문장 머리 확대 W/A/B/C — 정상 속도와 음성](../../../.agents/work/issue13-quality/korean-multi-transition-v1/all-sentences-head-closeup.mp4)
2. [다섯 문장 머리 확대 W/A/B/C — 4배 느리게](../../../.agents/work/issue13-quality/korean-multi-transition-v1/all-sentences-head-closeup-slow4x.mp4)

문장별로 보기:

| 유형 | 정상 속도 | 4배 느리게 | 원시 보고서 |
|---|---|---|---|
| 짧은 문장 | [영상](../../../.agents/work/issue13-quality/korean-multi-transition-v1/01-short/transition-methods-head-closeup.mp4) | [영상](../../../.agents/work/issue13-quality/korean-multi-transition-v1/01-short/transition-methods-head-closeup-slow4x.mp4) | [JSON](../../../.agents/work/issue13-quality/korean-multi-transition-v1/01-short/quality-report.json) |
| 모음 전환 | [영상](../../../.agents/work/issue13-quality/korean-multi-transition-v1/02-vowels/transition-methods-head-closeup.mp4) | [영상](../../../.agents/work/issue13-quality/korean-multi-transition-v1/02-vowels/transition-methods-head-closeup-slow4x.mp4) | [JSON](../../../.agents/work/issue13-quality/korean-multi-transition-v1/02-vowels/quality-report.json) |
| 입술 닫힘 자음 | [영상](../../../.agents/work/issue13-quality/korean-multi-transition-v1/03-bilabial/transition-methods-head-closeup.mp4) | [영상](../../../.agents/work/issue13-quality/korean-multi-transition-v1/03-bilabial/transition-methods-head-closeup-slow4x.mp4) | [JSON](../../../.agents/work/issue13-quality/korean-multi-transition-v1/03-bilabial/quality-report.json) |
| 연속 발화 | [영상](../../../.agents/work/issue13-quality/korean-multi-transition-v1/04-continuous/transition-methods-head-closeup.mp4) | [영상](../../../.agents/work/issue13-quality/korean-multi-transition-v1/04-continuous/transition-methods-head-closeup-slow4x.mp4) | [JSON](../../../.agents/work/issue13-quality/korean-multi-transition-v1/04-continuous/quality-report.json) |
| 쉼표 발화 | [영상](../../../.agents/work/issue13-quality/korean-multi-transition-v1/05-pauses/transition-methods-head-closeup.mp4) | [영상](../../../.agents/work/issue13-quality/korean-multi-transition-v1/05-pauses/transition-methods-head-closeup-slow4x.mp4) | [JSON](../../../.agents/work/issue13-quality/korean-multi-transition-v1/05-pauses/quality-report.json) |

`추가 변화`는 각 조합 영상의 컷 경계 변화량에서 같은 시점의 W 변화량을 뺀 평균이다.
낮을수록 컷이 덜 튀지만, 음수는 W보다 경계 동작이 작다는 뜻일 뿐 자연스러움의 보증은 아니다.

| 문장 | 창 수 | A 추가 변화 | B 추가 변화 | C 추가 변화 | A 발화 SSIM | B 발화 SSIM | C 발화 SSIM |
|---|---:|---:|---:|---:|---:|---:|---:|
| 짧은 문장 | 9 | 0.019996 | **0.017690** | 0.022509 | 0.795788 | **0.795847** | 0.795276 |
| 모음 전환 | 9 | **0.002486** | 0.009776 | 0.003671 | 0.827802 | **0.830233** | 0.827820 |
| 입술 닫힘 자음 | 10 | **-0.008732** | -0.006180 | -0.007087 | 0.832578 | **0.834920** | 0.833276 |
| 연속 발화 | 13 | 0.001202 | **0.001176** | 0.002737 | 0.769923 | **0.773719** | 0.772924 |
| 쉼표 발화 | 14 | -0.004863 | **-0.006347** | -0.003369 | 0.779879 | **0.780290** | 0.778010 |
| 5종 평균 | — | **0.002018** | 0.003223 | 0.003692 | 0.801194 | **0.803002** | 0.801461 |

B는 다섯 문장 모두 발화 영역 SSIM이 가장 높았지만 차이는 작다. 컷 경계 추가 변화는
A가 2개, B가 3개 문장에서 가장 낮았고, 5종 평균은 A가 가장 낮았다. 따라서 B를 확정하지
않고 A와 B를 사람 눈가림 평가의 두 후보로 유지한다. C의 현 광학 흐름 구현은 어느 문장에서도
두 지표를 동시에 이기지 못했으므로 제외 판단이 유지된다.

## 지금 내릴 수 있는 결론

- 원본 NVA의 머리 전체를 몸 위에 합성하는 경로는 어깨를 Ditto로 다시 생성하지 않는다.
- 이 표본에서는 240ms 교차 전환이 80ms·160ms보다 안정적이다.
- 하관만 잘라 붙이는 방식은 코·볼·턱·목의 연동을 끊으므로 현재 후보에서 제외한다.
- 다만 R의 입과 머리 움직임 궤적은 W와 완전히 같지 않다. 자동 수치만으로 “자연스럽다”고 판정하지 않는다.
- 이번 영상은 컷 연결 방식만 확인한다. 재사용 발음 묶음, 네 언어 미지 문장, 12명 눈가림 평가는 아직 남아 있으므로 공식 H1 판정은 `INCONCLUSIVE`다.

## 다음 실험

원본 `head_image` 표현을 그대로 유지하면서 시작·끝 동작을 고정한 재사용 발음 단위를 생성한다. 같은 오디오의 전체 문장 W와 조합 결과를 한국어·영어·일본어·중국어에서 비교한다. 인간형 Jina가 기준을 통과한 뒤에만 고양이형 Naia를 별도 H2로 시험한다.

## 로컬에서 열기

```bash
xdg-open projects/naia-video-avatar/.agents/work/issue13-quality/korean-original-nva-head-comparison/03-W-vs-R-original-nva-head.mp4
xdg-open projects/naia-video-avatar/.agents/work/issue13-quality/korean-original-nva-head-comparison/04-W-vs-80-vs-160-vs-240.mp4
xdg-open projects/naia-video-avatar/.agents/work/issue13-quality/korean-transition-methods-v30-final/transition-methods-head-closeup.mp4
xdg-open projects/naia-video-avatar/.agents/work/issue13-quality/korean-transition-methods-v30-final/transition-methods-head-closeup-slow4x.mp4
xdg-open projects/naia-video-avatar/.agents/work/issue13-quality/korean-multi-transition-v1/all-sentences-head-closeup.mp4
xdg-open projects/naia-video-avatar/.agents/work/issue13-quality/korean-multi-transition-v1/all-sentences-head-closeup-slow4x.mp4
```
