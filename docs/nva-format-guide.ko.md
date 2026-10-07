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

- 아카이브와 압축 해제 후 내용: 최대 100 MiB
- 파일 수: 최대 512개
- manifest: 최대 1 MiB
- 발화 텍스트 메타데이터: 최대 10,000자

## 공개 범위

이 포맷은 완성된 미디어와 재생 메타데이터만 기술합니다. 아바타, 발화 영상, 음성,
타이밍, 입 움직임을 어떻게 만드는지는 정의하지 않습니다. 실시간 생성이 필요한
애플리케이션은 공개 Player 계약을 확장하지 말고 별도의 비공개 런타임을 사용하세요.

## v0.2 호환성

Player는 기존 v0.2 파일을 보기 용도로 계속 열 수 있습니다. 새로 배포하는 NVA 파일은
생성 관련·실시간 필드를 제외한 v0.3을 사용해야 합니다. v0.2의 음성 클립 `locale`
필드는 읽기 전용으로 `language`의 별칭으로 취급합니다.
