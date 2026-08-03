# 이슈 14: NVA 규격과 독립형 브라우저 Player로 공개 범위 축소

GitHub: https://github.com/nextain/naia-video-avatar/issues/14

## 목표

오픈소스의 첫 사용 경험을 `.nva` 하나를 브라우저에 열고 기본 무료 TTS로 말하게 하는
정적 웹 Player로 고정한다. NVA는 발화 가능한 조각 자산, 조각 선택·전환 메타정보,
idle·action 애니메이션 영상을 함께 담는다.

## 공개 경계

- 공개: NVA 파일 구조, 스키마·검증기, 읽기 전용 Player, 브라우저 TTS 어댑터
- 별도 서비스: 텍스트에서 스트리밍 오디오와 정렬 시간축을 만드는 오디오 Cascade
- 비공개: Editor/Studio, 얼굴·발화 자산 생성, Ditto, 품질 분석, 운영 자격증명

기존 Editor와 영상 생성 Cascade 코드는 Git 이력으로 복구할 수 있지만 현재 공개 실행
표면과 README에서는 제거한다. 저장소 URL은 이슈·링크 보존을 위해 유지하고 제품 이름만
`NVA Avatar Player`로 바꾼다.

## 품질 모드

브라우저 `speechSynthesis`는 일반적으로 PCM과 음소별 시간축을 Player에 제공하지 않는다.
따라서 독립형 기본 모드는 두 개의 공통 조음 전이를 반복하는 발화 활동 미리보기이며 반드시
`approximate`로 표시한다. 오디오 Cascade가 오디오와 완전한 SpeechPlan을 제공하는 경로만
정밀 립싱크 품질을 주장할 수 있다.

## 완료선

1. 정적 HTTP 서버와 Chromium만으로 `.nva`를 로드한다.
2. 사용자가 텍스트·브라우저 음성을 선택해 발화·중단한다.
3. 발화 동안 사전 생성 조각을 재생하고 완료·중단·오류 뒤 idle로 복귀한다.
4. 등록된 action을 재생하고 완료 뒤 idle로 복귀한다.
5. 기본 독립 실행에서 외부 API 요청이 없다.
6. Editor·Studio·Ditto·영상 생성 Cascade가 공개 실행 표면에 없다.
7. 기존 NVA 검증과 오디오+SpeechPlan 정밀 재생 계약은 회귀하지 않는다.
8. 로컬 준비 명령 한 번으로 Naia·Jina·Minho·Alpha가 ignored 샘플 카탈로그에 나타나고 localhost Player에서 차례로 열린다.

## 비목표

- NVA 자산 편집·패키징 UI
- 브라우저 TTS 경로의 음소 정밀도 보장
- Player 안에서 얼굴 또는 발화 조각 생성
- 오디오 Cascade 서버 구현
- 로컬 샘플·원본 자산의 Git 추적 또는 공개 배포

## 로컬 샘플 확장 계획

1. `scripts/prepare-local-samples.py`가 정렬된 경로·고정 ZIP 시각·고정 권한·Deflate level 9로 디렉터리형 NVA를 결정론적으로 묶고, 검증된 기존 `.nva`는 바이트 그대로 복사한다.
2. 전체 입력의 경로·manifest 참조·심링크·파일 수·확장 크기를 staging에서 먼저 검증한다. 성공한 번들과 카탈로그만 원자적으로 교체하며 실패 시 기존 정상 카탈로그를 유지한다.
3. 출력은 Git에서 제외되는 `examples/.local/`로 고정한다. 새 번들은 `sample-NN-{content-hash}.nva`로 먼저 원자 게시하고 카탈로그를 마지막에 교체한다. `catalog.json`에는 표시 이름과 이 상대 URL만 쓰며 원본 파일명·절대경로·생성 메타는 기록하지 않는다.
4. Player는 최대 64 KiB·32항목의 기본 공개 카탈로그 또는 쿼리로 지정한 같은 출처 HTTP(S) 카탈로그를 읽는다. 리다이렉트·자격정보·fragment·다른 출처와 100 MiB 초과 NVA 응답을 거부한다.
5. 파일 선택과 URL 샘플 로드는 같은 로드 함수, 요청 취소와 증가 세대 번호를 사용해 늦게 끝난 이전 요청이 최신 아바타를 덮지 못하게 한다.
6. 잘못된 카탈로그·다른 출처 URL·누락 자산은 해당 샘플만 차단하고 수동 파일 열기는 계속 제공한다.

| 단계 | 실패 형태 | 복구 | 사용자 표시 |
|------|-----------|------|:----------:|
| 준비 | 입력 NVA가 없거나 manifest 자산이 누락 | 해당 입력을 실패시키고 출력 카탈로그를 성공으로 쓰지 않음 | 예 |
| 카탈로그 | JSON 오류·다른 출처 URL | 샘플 목록을 비활성화하고 수동 파일 선택 유지 | 예 |
| 로드 | fetch·ZIP·manifest·미디어 디코드 실패 | 기존 실행을 중단하고 오류 표시, 다음 샘플 선택 허용 | 예 |

## 기존 검증 증거

- `node --test src/test/*.test.mjs`: 68/68 통과
- `src/test/standalone-player.e2e.py`: 정적 서버+Chromium에서 NVA 로드, 한국어 텍스트 발화,
  중단, action 재생, 각 경로의 idle 복귀 통과
- 같은 Chromium 실행에서 외부 요청 0건, 콘솔 오류 0건, 페이지 오류 0건
- 적대 리뷰에서 발견한 정밀 오디오·아틀라스 비동기 오류의 idle 미복귀를 수정하고 오류
  콜백 단위 테스트를 추가했다.
- `src/test/public-player-surface.test.mjs`: Player/포맷 파일 존재와 Editor·생성 실행 파일 부재 통과

통합 테스트의 합성 발화층은 배선 검증 전용이며 자연스러움 표본이 아니다. 자연스러움 판정은
이슈 13의 실제 Ditto 생성 자산과 눈가림 비교 절차에 남겨 둔다.
