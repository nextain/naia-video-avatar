# Issue 13 개발 수렴 리뷰

- 단계: development
- 기준 헌장 SHA-256: `a16478184e9f344eb8db3308fe92b3bb2df65ceebf764c76aa03336cba6f7154`
- 범위: 공개 NVA 계약·Studio·Player와 비공개 `naia-omni-cascade#36` 생성 API/프로세스 경계
- 완료와 구분: 이 기록은 구현 결함 수렴 증거다. Jina B-F/C-F 다국어 H1 자연스러움은 아직 `INCONCLUSIVE`다.

## 공개 구현 리뷰

초기 차단점은 세 단위 문맥 미지원, 보고서 bytes 미결박, 서버 원문 오류 누출, pair/context 별도 상한·pair fallback 누락이었다. 모두 수정한 같은 공개 구현에서 독립 좁은 리뷰 2회 연속 새 P0/P1이 없었다.

추가 통합 과정에서 Player 제품 진입점 부재와 브라우저 내장 함수의 잘못된 호출 문맥을 발견해 `viewer.html`, `speech-player.js`, 영수증 전체 결박과 브라우저 전역 함수 호출 문맥 보존을 추가했다. Studio에는 세션 전용 단기 bearer token 전달과 압축 해제 전 100 MiB 원본 ZIP 차단도 추가했다. 최종 Node 회귀 74/74와 Jina Chromium 재생이 통과했다.

## 비공개 구현 리뷰

적대 리뷰에서 다음 차단점을 순서대로 발견·수정했다.

1. 재시작 시 작업/원본 claim이 메모리에만 남음 → 원자 상태 저장, 완료 번들 복구, 중단 작업 실패 닫힘과 원본 소비.
2. 취소 시 리더 종료 뒤 남은 descendant 미종료 → grace 뒤 전체 process group 확인·SIGKILL.
3. API 강제 종료 뒤 독립 generator 고아 가능 → 실제 명령은 lease 기록 전 launch gate에서 대기하고, 재시작 시 같은 nonce가 환경에 있는 프로세스 그룹만 회수.

회귀는 별도 API driver를 실제 `SIGKILL`한 뒤 orphan runner를 새 executor가 종료하는 경로, 동시 live owner 보존, 종료한 sibling과 살아 있는 group의 조회 경합까지 포함해 17/17 통과했다. 최종 연속 무결 리뷰 결과는 이 파일의 다음 절에 추가한다.

### 비공개 CLEAN 1

- 리뷰어: `review-pass` leaf reviewer `Pauli`
- 범위: 상태 영속화·재시작·원본 일회성·subprocess 취소·launch gate·owner PID/start-time·nonce 기반 고아 회수
- 결과: 새 P0/P1 없음, targeted 17/17 통과

### 비공개 CLEAN 2

- 같은 private 코드 바이트와 같은 범위 재검토
- 결과: 새 P0/P1 없음, targeted 17/17 통과

### 공개 CLEAN 1

- 범위: Studio bearer/ZIP preflight, 공개 generation contract/client, SpeechPlan/atlas/runtime, GPU 없는 Viewer/Player, receipt/hash/budget 결박
- 결과: 기존 P1 두 건(인증 전달, 압축 해제 전 원본 크기 검사) 해소 확인, 새 P0/P1 없음
- 독립 targeted 회귀: 20/20 통과

### 공개 CLEAN 2

- 범위 해시: `3e44daa4eda757eb55681b0a13da9b37a3826c5cbf52e575451cf9efebabca14` (`src/main`, `src/test` 대상 파일 SHA-256 목록의 SHA-256)
- 결과: 동일 바이트의 6개 공개 수용 축 재검토, 새 P0/P1 없음
- 정직한 제한: 2차 reviewer의 targeted 명령은 Node 인자 오류로 시작되지 않아 별도 통과 수를 세지 않았다. 동일 바이트의 주 검증 74/74와 1차 독립 targeted 20/20을 증거로 유지한다.

### 외부 대체 reviewer 기록

- `nvidia/nemotron-3-ultra-550b-a55b:free`: OpenRouter 공식 Models API에서 2026-08-01 prompt/completion 0, context 1,000,000, expiration 없음 확인; probe 통과. 실제 리뷰는 파일을 읽은 뒤 결과 파일을 남기지 않고 종료하여 판정에서 제외했다.
- 구성된 `opencode/deepseek-v4-flash-free` 대체 alias: probe 통과, 74/74를 직접 재실행했으나 300초 안에 의무 verdict를 남기지 않아 판정에서 제외했다. 공식 API의 기반 `deepseek/deepseek-v4-flash` 가격은 0이 아니므로 무료 reviewer라고 주장하지 않는다.
- 실패/무응답을 `CLEAN`으로 해석하지 않았으며, 최종 공개 수렴은 프로젝트 독립 reviewer의 연속 두 판정만 사용했다.

## 남은 제품 차단점

- 고정 Ditto B-F/C-F atlas 생성 명령과 VoxCPM2→MFA 정렬 어댑터
- 네 언어 실제 80문장, 전체 문장 Ditto 비교, 자동 분석과 사람 눈가림 평가
- cold/warm p95와 실제 최대 묶음 성능

따라서 P04/P05는 닫지 않는다.
