# NVA v0.3 completed-media 포맷

[English](./nva-format-guide.md) | 한국어

NVA 파일은 브라우저가 GPU 추론 없이 재생할 수 있는 ZIP 아카이브입니다. 버전 0.3은
배포용 포맷으로, 모든 발화와 애니메이션 미디어가 패키징 전에 이미 완성되어 있습니다.

## 필수 manifest 필드

```json
{
  "nva_version": "0.3",
  "profile": "completed-media",
  "meta": {
    "name": "Example avatar",
    "delivery": { "kind": "completed-media", "realtime": false }
  },
  "canvas": { "width": 720, "height": 1280, "fps": 25 },
  "background": { "type": "transparent" },
  "animations": {
    "idle": { "clip": "clips/idle.webm", "loop": true, "label": "Idle" },
    "wave": { "clip": "clips/wave.webm", "loop": false, "label": "Wave" }
  },
  "speech_clips": {
    "hello-ko": {
      "clip": "speech/hello-ko.mp4",
      "audio": "embedded",
      "language": "ko-KR",
      "label": "Korean greeting",
      "duration_ms": 4480
    }
  },
  "scenario": {
    "nodes": {
      "start": { "type": "start" },
      "idle": { "type": "scene", "animation": "idle" }
    },
    "edges": [{ "from": "start", "to": "idle" }]
  }
}
```

## 재생 규칙

- 애니메이션 중 하나 이상은 idle 루프(`loop: true`)여야 합니다.
- 발화 클립은 음성이 내장된 완성 MP4 또는 WebM입니다.
- Player는 idle과 action 미디어를 음소거로, 발화 미디어를 음성과 함께 재생합니다.
- action이나 발화 영상이 끝나거나 실패하면 Player는 idle로 돌아갑니다.
- `language`는 `ko-KR`, `en-US`, `ja-JP` 같은 BCP 47 태그를 사용합니다.
- 모든 경로는 ZIP 내부 상대 경로입니다. 절대 경로, URL, 역슬래시, `..` 구간은
  거부됩니다.

## 제한

- 아카이브: 최대 200 MiB
- 압축 해제 후 내용: 최대 400 MiB
- 파일 수: 최대 512개
- manifest: 최대 1 MiB
- 발화 텍스트 메타데이터: 최대 10,000자

## 공개 범위

이 포맷은 완성된 미디어와 재생 메타데이터만 기술합니다. 아바타, 발화 영상, 음성,
타이밍, 입 움직임을 어떻게 만드는지는 정의하지 않습니다. 실시간 생성이 필요한
애플리케이션은 공개 Player 계약을 확장하지 말고 별도의 비공개 런타임을 사용하세요.

## Studio v0.2 프로필

Player는 Studio v0.2 배포 파일의 읽기 및 재생을 지원합니다. 새로 배포하는 NVA
파일은 생성 관련·실시간 필드를 제외한 v0.3 completed-media를 사용해야 합니다.

### 매니페스트 필드 및 Player 동작

| 필드 | 설명 | Player 동작 |
|---|---|---|
| `nva_version` | 포맷 버전 문자열 (`"0.2"`). | 재생에 사용 (v0.2 호환 프로필 활성화). |
| `canvas` | 해상도 및 프레임레이트 `{ width, height, fps }`. | 재생에 사용 (캔버스 가로·세로로 영상 종횡비 설정, `fps`는 정보용). |
| `background` | 배경 설정 `{ type, color, src }`. | 재생에 사용 (투명 또는 단색 배경 미리보기 구성). |
| `expressions` | 상태-애니메이션 대응 `{ neutral, listening, speaking }`. | 생산자 메타데이터 (Player는 무시). |
| `thumbnail` | ZIP 아카이브 내 미리보기 이미지 상대 경로. | 표시에만 사용 (미리보기 썸네일). |
| `meta` | 메타데이터 `{ name, tagline, persona, voice, ... }`. | 표시에만 사용 (`name`은 UI 상태 표시줄에 표시, 기타 항목은 생산자 메타데이터로 무시). |
| `speech_set` | 생산자 발화 세트 정의. | 생산자 데이터 (Player는 읽지 않고 무시). |
| `speech_clips.*.locale` | 기존 BCP 47 언어 태그. | `language`의 읽기 전용 별칭으로 처리. |

### 애니메이션 필드 및 소품 동작 순서 규칙

- **애니메이션 공통 필드**:
  - `clip`: ZIP 내부 WebM/MP4 클립 상대 경로 (재생에 사용).
  - `loop`: 반복 재생 플래그 (재생에 사용).
  - `can_talk`: 말하기 가능 여부 (재생에 사용: base idle 루프와 talking 루프 구분).
  - `label`: 동작 선택 UI 표시 라벨 (표시에만 사용: v0.2에서 중복 라벨은 경고로 처리되며 UI에 `label (key)` 형태로 구분 표시).
  - `loop_crossfade_frames`: 클립 생성 시 기혼합된 크로스페이드 프레임 수 (정보용: 클립에 이미 섞여 들어가 있으므로 Player가 추가 크로스페이드를 수행하지 않음).
  - `sha256`, `frames`, `duration_s`: 미디어 정보 (생산자 데이터: Player는 읽지 않고 무시).
  - `face_bbox`: talking 클립의 정규화 얼굴 영역 `[x, y, w, h]` (생산자 데이터: Player는 읽지 않고 무시).
  - `idle`, `talking`: 기본 반복 애니메이션 (`idle`이 맨 앞이며 기본 대기, `talking`은 `playTalking`으로 재생).

- **소품 동작 순서 규칙**:
  - 본 동작 `X`: `loop: true`, `can_talk: false`, `prop_sequence: { enter: "X__enter", exit: "X__exit" }`.
  - 보조 클립 `X__enter` / `X__exit`: `loop: false`, `role: "prop_enter"|"prop_exit"`, `parent: "X"`.
  - 순서 재생: enter(있을 때) 1회 → 본 동작 `X` 2회(`loop: false`로 두 번) → exit(있을 때) 1회 → idle 자동 복귀.
  - 생산자가 enter/exit 클립 없이 `prop_sequence`를 지정한 경우, `X`를 2회(`loop: false`) 재생한 후 idle로 복귀.
  - 보조 클립 및 소품 본 동작은 일반 동작 목록에서 제외되며, 소품 동작은 동작 선택 메뉴에 단일 항목으로 표시.
  - `prop_sequence`가 존재하지 않는 애니메이션 키를 가리키면 유효성 검사에서 오류 대신 누락된 키마다 경고를 발생.
  - 립싱크 합성 및 신경망 렌더링 등 생성 기법은 저장소 외부의 생산자 데이터이며 Player는 이를 읽지 않음.
