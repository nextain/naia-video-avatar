# 이슈 14: NVA 완성 미디어 포맷과 독립형 브라우저 Player

[English](./issue-14-standalone-browser-player.md) | 한국어

GitHub: https://github.com/nextain/naia-video-avatar/issues/14

## 목표

오픈소스의 첫 사용 경험을 완성된 `.nva` 하나를 브라우저에서 여는 것으로 고정한다.
NVA v0.3은 idle, action, 음성 내장 완성 발화 영상과 재생 메타정보를 담는 ZIP이다.
Player는 포함된 영상을 통째로 재생하며 실시간 음성이나 립싱크를 만들지 않는다.

## 공개 범위

- NVA v0.3 완성 미디어 파일 구조와 JSON Schema
- 안전한 ZIP 로더와 검증기
- idle, action, 완성 발화 영상을 재생하는 읽기 전용 웹 Player
- 최종 NVA 패키징과 로컬 샘플 준비 명령

아바타·발화 영상 생성과 실시간 미디어 처리는 이 공개 저장소의 범위가 아니다.

## 완료 조건

1. 기존 v0.2 NVA와 음성 내장 완성 발화 영상을 결정론적 v0.3 ZIP으로 만든다.
2. 최종 ZIP에는 공개 재생 필드와 실제 참조 미디어만 남는다.
3. 정적 HTTP 서버와 Chromium만으로 `.nva`를 로드한다.
4. 완성 발화 영상은 음성과 함께 재생되고 종료·중단·오류 뒤 muted idle로 복귀한다.
5. 등록된 action을 재생하고 종료·중단·오류 뒤 idle로 복귀한다.
6. 기본 실행에서 외부 API 요청이 없다.
7. 실시간 음성, 립싱크 생성, Editor, 생성 클라이언트가 공개 실행 표면에 없다.
8. ignored localhost 카탈로그의 준비된 완성 NVA를 모두 열고 발화를 재생한다.

## 비목표

- 텍스트 입력과 브라우저 음성 합성
- Player 내부 실시간 립싱크 또는 모델 추론
- NVA 자산 편집 UI
- 생성 서버 구현이나 생성 품질 분석의 공개
- 로컬 샘플과 원본 얼굴·음성 자산의 Git 추적

## 포맷 결정

- 새 배포 파일은 `nva_version: "0.3"`, `profile: "completed-media"`를 사용한다.
- `speech_clips`는 음성을 내장한 완성 MP4/WebM만 참조한다.
- v0.3 애니메이션에는 재생에 필요한 clip, loop, label, intent, triggers와 선택적 pose만 둔다.
- JavaScript Player는 기존 로컬 자산 확인을 위해 v0.2 읽기 호환을 유지한다.
- 번들 최대 100 MiB, 파일 512개, manifest 1 MiB 제한과 상대경로 검사를 적용한다.

## 로컬 샘플

`scripts/prepare-local-samples.py`는 검증된 입력을 `examples/.local/`에 결정론적으로
준비한다. 카탈로그에는 표시 이름과 같은 출처 상대 URL만 기록하고 원본 절대경로는
기록하지 않는다. 파일 선택과 카탈로그 로드는 같은 수명주기를 사용하며 늦게 끝난 이전
요청이 최신 아바타를 덮지 못한다.

## 검증

- Node: manifest, ZIP, Player 상태, 공개 파일 표면, 카탈로그와 로드 순서
- Python: 로컬 샘플 준비, 최종 NVA 결정론·정리·내장 음성 조건
- Chromium: 완성 발화와 action 재생, idle 복귀, 외부 요청·콘솔·페이지 오류 0건
- 실제 자산: 로컬에서 준비한 최종 NVA 샘플

실제 영상의 자연스러움 연구와 생성 방법은 별도 비공개 개발 범위로 유지한다.
