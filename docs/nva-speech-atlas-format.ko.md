# NVA 발화 조각 묶음 포맷 (`speech_motion` v1)

[English](./nva-speech-atlas-format.md) | 한국어

이 문서는 NVA 발화 조각 묶음(`manifest.speech_motion`)의 읽기 측 파일 형식, 바이트 배치, 색인(index) 필드, 크기·개수 한도, 재생 합성 규칙을 정의합니다. 기본 NVA 아카이브 구조와 완성 미디어 프로필은 [NVA 포맷 가이드](./nva-format-guide.ko.md)를 참고하세요.

## 공개 범위

이 문서는 Player가 읽고 검증·재생하는 컨테이너 구조, 매니페스트·색인 필드, 무결성 검사, 결정론적 합성 규칙만 기술합니다. 발화 조각, 기준 머리 이미지(`neutral_head`), 바탕 영상을 어떻게 제작·생성하는지는 정의하지 않습니다.

---

## 1. 버전

| 대상 | 필드 / 위치 | 값 | 비고 |
|---|---|---|---|
| NVA 아카이브 매니페스트 | `manifest.nva_version` | `"0.2"` 또는 `"0.3"` | `READABLE_NVA_VERSIONS = ["0.2", "0.3"]` (`vendor/nva-core.js`). Studio v0.2 번들은 `"0.2"`를 사용합니다. |
| 발화 모션 확장 | `manifest.speech_motion.version` | `"1"` | 필수 문자열 리터럴입니다. |
| 발화 단위 목록 버전 | `manifest.speech_motion.inventory_version` | `"1.0.0"` | 고정 13개 발화 단위 체계를 나타냅니다. |
| 합성 표현 방식 | `manifest.speech_motion.representation` | `"whole-head-layer"` 또는 `"factorized-difference-layer"` | 현재 Studio 배포 번들은 `"whole-head-layer"`를 사용합니다. |
| 아틀라스 색인 | `speech/atlas-index.json` → `version` | `"1"` | 필수 문자열 리터럴입니다. |
| 생성 영수증(provenance) | `speech/generation-result.json` → `version` | `"1"` | 필수 문자열 리터럴입니다. |
| 품질 보고서 | `speech/quality-report.json` → `version` | `"1"` | 필수 문자열 리터럴입니다. |
| 런타임 타이밍 계획 | `SpeechPlan.version` | `"1"` | 필수 문자열 리터럴(`aligned` 또는 `browser-timed`)입니다. |

---

## 2. 매니페스트의 발화(`speech`) 관련 필드

발화 조각 묶음을 포함하는 NVA 번들은 `manifest.json`의 최상위에 `canvas`, `animations`와 함께 `speech_motion` 객체를 둡니다.

```json
{
  "nva_version": "0.2",
  "canvas": {
    "width": 720,
    "height": 1280,
    "fps": 24
  },
  "background": {
    "type": "transparent"
  },
  "animations": {
    "idle": {
      "clip": "clips/idle.webm",
      "loop": true,
      "can_talk": false,
      "face_bbox": [0.2, 0.13, 0.6, 0.29],
      "label": "대기"
    },
    "talking": {
      "clip": "clips/talking-ko.webm",
      "loop": true,
      "can_talk": true,
      "face_bbox": [0.2, 0.13, 0.6, 0.29],
      "label": "말하기"
    }
  },
  "speech_motion": {
    "version": "1",
    "representation": "whole-head-layer",
    "region": [104, 96, 512, 512],
    "inventory_version": "1.0.0",
    "inventory": [
      "sil",
      "closed",
      "labiodental",
      "dental",
      "alveolar",
      "postalveolar",
      "palatal",
      "velar",
      "glottal",
      "vowel-open",
      "vowel-mid",
      "vowel-spread",
      "vowel-round"
    ],
    "neutral_head": "speech/neutral-head.png",
    "atlas": "speech/atlas.bin",
    "atlas_index": "speech/atlas-index.json",
    "validation_report": "speech/validation-report.json",
    "quality_report": "speech/quality-report.json",
    "provenance": "speech/generation-result.json"
  }
}
```

### `manifest.speech_motion` 필드 명세

| 필드 | 형(Type) | 뜻 | 예시 한 줄 |
|---|---|---|---|
| `version` | `string` | `speech_motion` 확장의 형식 버전(`"1"` 고정). | `"version": "1"` |
| `representation` | `string` | 머리 영역 합성 방식(`"whole-head-layer"` 또는 `"factorized-difference-layer"`). | `"representation": "whole-head-layer"` |
| `region` | `[number, number, number, number]` | 캔버스 위 머리 합성 영역의 픽셀 좌표 `[x, y, width, height]` (`"whole-head-layer"`일 때 필수). | `"region": [104, 96, 512, 512]` |
| `inventory_version` | `string` | 발화 단위 목록의 버전(`"1.0.0"` 고정). | `"inventory_version": "1.0.0"` |
| `inventory` | `string[]` | 고정 13개 발화 단위 배열(순서까지 정확히 일치해야 함). | `"inventory": ["sil", "closed", ..., "vowel-round"]` |
| `neutral_head` | `string` | 입을 다문 기준 머리 PNG 이미지의 번들 내부 상대 경로. | `"neutral_head": "speech/neutral-head.png"` |
| `atlas` | `string` | 발화 조각 WebM들을 이어 붙인 바이너리 파일의 상대 경로. | `"atlas": "speech/atlas.bin"` |
| `atlas_index` | `string` | `atlas.bin` 바이트 구간 색인 JSON 파일의 상대 경로. | `"atlas_index": "speech/atlas-index.json"` |
| `validation_report` | `string` | 조각별 검증 보고서 JSON 파일의 상대 경로. | `"validation_report": "speech/validation-report.json"` |
| `quality_report` | `string` | 연속성·품질 보고서 JSON 파일의 상대 경로. | `"quality_report": "speech/quality-report.json"` |
| `provenance` | `string` | 번들 생성 영수증 JSON 파일의 상대 경로(`"speech/generation-result.json"`). | `"provenance": "speech/generation-result.json"` |

### 발화 재생과 연동되는 매니페스트 필드

- `canvas`: `{ width, height, fps }` — 합성 캔버스 해상도(표준 세로형 `720×1280`, `fps: 24` 또는 `25`).
- `animations.idle`: `{ clip, loop: true, can_talk: false }` — 말하지 않을 때 반복 재생하는 기본 대기 클립.
- `animations.talking`: `{ clip, loop: true, can_talk: true, face_bbox }` — `SpeechPlayer`가 말할 때 머리 영역 아래에 깔리는 바탕 몸 반복 클립(`whole-head-layer` 모드에서 `face_bbox`는 생산자 메타데이터이며 Player는 `speech_motion.region`을 사용).
- `speech_clips`: 고정 문구와 일치할 때 자체 음성이 내장된 완성 영상을 그대로 재생하는 선택적 클립 목록(`{ clip, audio: "embedded", language | locale, label, text?, duration_ms? }`).

`speech_motion`의 모든 파일 경로는 번들 내부 상대 경로여야 하며, 앞 슬래시(`/`), URL 스킴, 역슬래시(`\`), `.` 또는 `..` 세그먼트는 거부됩니다. 또한 `manifest.speech_motion`의 모든 필드는 `speech/generation-result.json` 영수증으로부터 도출한 값과 정확히 일치해야 합니다(`speech-bundle.js`의 `verifySpeechMotionBundle`).

---

## 3. 캔버스 `720×1280`과 머리 영역 좌표 `[104, 96, 512, 512]`

- **캔버스 크기**: 표준 번들은 가로 `720`, 세로 `1280` 픽셀(`canvas.width = 720`, `canvas.height = 1280`) 세로형 캔버스를 사용합니다.
- **머리 영역(`speech_motion.region`)**: 왼쪽 위 원점 `(0, 0)` 기준의 픽셀 좌표 정수 4개 `[x, y, width, height]`로 표기합니다.
  - `width`와 `height`는 양의 짝수 정수여야 하며(`w > 0`, `h > 0`, `w % 2 === 0`, `h % 2 === 0`), 모든 표준 번들에서 `512×512`입니다.
  - 영역은 캔버스 경계 안에 완전히 들어와야 합니다(`x >= 0`, `y >= 0`, `x + width <= canvas.width`, `y + height <= canvas.height`).
- **`720×1280` 캔버스에서의 표준 배치**:
  - 가로 중앙 정렬: `x = (720 - 512) / 2 = 104` (가로 `104..616` 구간 차지).
  - `[104, 96, 512, 512]` (`naia` 번들): 가로 `x = 104`, 세로 `y = 96` (`96..608` 구간)에 놓이는 `512×512` 머리 영역.
  - `[104, 0, 512, 512]` (`jina`, `jina-anime` 번들): 가로 `x = 104`, 세로 상단 `y = 0` (`0..512` 구간)에 놓이는 `512×512` 머리 영역.
- 참고: `representation`이 `"whole-head-layer"`일 때 `SpeechPlayer`는 `speech_motion.region`만 사용하며, `speech_motion`이나 `animations.talking` 안의 부가 영역 메타데이터는 읽지 않습니다.

---

## 4. `neutral_head` (`speech/neutral-head.png`)

- **경로 및 검증**: `manifest.speech_motion.neutral_head` (`"speech/neutral-head.png"`)가 가리키며, `speech/generation-result.json`의 `assets[]` 내 `"neutral_head"` 항목에 기록된 바이트 크기 및 SHA-256 해시와 일치해야 합니다.
- **형식 및 해상도**: `speech_motion.region`의 가로·세로 크기와 같은 `512×512` RGBA PNG(`image/png`) 정지 이미지입니다.
- **내용**: `talking` 바탕 클립의 머리 위치에 맞춘 입을 다문 중립 머리 이미지입니다.
- **재생 시 역할**: 번들을 처음 로드할 때 `createImageBitmap`으로 한 번 디코딩해 두고(`speech-player.js`), 발화 중 매 프레임마다 `bodyVideo` 위에 `speech_motion.region` 위치로 가장 먼저 불투명(`globalAlpha = 1`, `source-over`)하게 그린 뒤 그 위로 활성 `atlas.bin` 발화 조각 레이어를 얹습니다.

---

## 5. `speech/atlas.bin` 바이트 배치

`speech/atlas.bin`은 독립된 WebM 비디오 조각(`video/webm`)들을 빈틈없이 그대로 이어 붙인 비압축 단일 바이너리 파일입니다.

```text
speech/atlas.bin
┌──────────────────────────────────────────┬────────────────────────────────────────────────┬─────┐
│ 조각 0: "alveolar>alveolar"              │ 조각 1: "alveolar>alveolar>alveolar"           │ ... │
│ offset: 0                                │ offset: length_0                               │     │
│ length: length_0                         │ length: length_1                               │     │
│ EBML (1A 45 DF A3) ... VP9 무손실 WebM   │ EBML (1A 45 DF A3) ... VP9 무손실 WebM         │     │
└──────────────────────────────────────────┴────────────────────────────────────────────────┴─────┘
0                                          length_0                        length_0 + length_1   atlasBytes
```

- **독립 WebM 바이트 조각**: 각 `[offset, offset + length)` 구간은 4바이트 EBML 매직 헤더(`1A 45 DF A3`)로 시작하는 완결된 단일 WebM 파일입니다. 파일 전체를 감싸는 별도 헤더·푸터나 조각 사이 패딩 바이트가 없습니다.
- **조각 인코딩 규격**:
  - 컨테이너: WebM (`video/webm`)
  - 비디오 코덱: 알파 채널을 포함한 VP9 무손실(`codec: "vp09.00.10.08"`, `lossless: true`, `yuva420p`, `has_alpha: true`)
  - 해상도: `512×512` 픽셀
  - 프레임 수 및 프레임레이트: `25` fps(`fps: 25`, 프레임 간격 `40 ms`) 기준 정확히 `5` 프레임(`frames: 5`, 5프레임 모두 키프레임, 조각 길이 `200 ms`)
- **배치 순서 및 연속 오프셋 규칙**:
  - 모든 조각은 키 문자열의 ASCII 사전순(`"alveolar>alveolar"`가 `offset: 0`으로 맨 앞, `"vowel-spread>vowel-spread>alveolar"`가 맨 뒤)으로 배치됩니다.
  - `offset` 기준으로 정렬했을 때 모든 바이트 구간 `[offset, offset + length)`는 빈틈(gap)이나 겹침(overlap) 없이 `0`부터 `atlasBlob.size`까지 정확히 덮어야 합니다(`speech-atlas-index.js`의 `validateSpeechAtlasIndex`):
    - 첫 조각의 시작 위치는 반드시 `offset = 0`이어야 합니다.
    - $i$번째 조각의 `offset`은 직전 조각의 `offset + length`와 같아야 합니다.
    - 마지막 조각의 `offset + length`는 `speech/atlas.bin` 전체 바이트 크기(`atlasBytes`)와 같아야 합니다.
- **바이트 구간 읽기(`speech-atlas-source.js`의 `SpeechAtlasSource`)**:
  - 로컬 또는 메모리에 로드된 `Blob`에서는 `blob.slice(offset, offset + length, "video/webm")`으로 즉시 잘라냅니다.
  - URL 원본에서는 HTTP `Range: bytes=${offset}-${offset + length - 1}` 헤더로 부분 요청을 보내며, `206 Partial Content` 응답과 `Content-Range`가 일치하면 해당 조각만 받고 `200 OK`이면 전체 Blob을 한 번 받아 메모리에 캐시한 뒤 잘라 씁니다.

---

## 6. `speech/atlas-index.json` 필드 명세

`speech/atlas-index.json`은 각 발화 조각 키를 `speech/atlas.bin` 내부의 바이트 구간과 인코딩 속성에 대응시키는 목차 파일입니다.

### 최상위 필드

| 필드 | 형(Type) | 뜻 | 예시 한 줄 |
|---|---|---|---|
| `version` | `string` | 아틀라스 색인 파일의 버전 문자열(`"1"` 고정). | `"version": "1"` |
| `entries` | `Record<string, AtlasEntry>` | 발화 조각 키(`A>B` 또는 `A>B>C`)를 조각 메타데이터 객체에 대응시키는 비어 있지 않은 사전. | `"entries": { "alveolar>alveolar": { "offset": 0, ... } }` |

### 조각 항목 필드 (`entries[key]`)

| 필드 | 형(Type) | 뜻 | 예시 한 줄 |
|---|---|---|---|
| `offset` | `integer` | `speech/atlas.bin` 안에서 해당 WebM 조각이 시작하는 0 기준 바이트 위치(포함, `>= 0`). | `"offset": 0` |
| `length` | `integer` | 해당 WebM 조각의 바이트 길이(`> 0`); 끝 위치(제외)는 `offset + length`. | `"length": 619286` |
| `sha256` | `string` | `atlas.bin[offset : offset + length]` 바이트 조각의 64자리 소문자 16진수 SHA-256 해시. | `"sha256": "6b4f30bcf0ab8ce428192e327f32d15bf8539d42c79df10e30d66962c61f1447"` |
| `frames` | `integer` | 조각 클립의 총 프레임 수(`5` 고정). | `"frames": 5` |
| `fps` | `integer` | 조각 클립의 초당 프레임 수(`25` 고정). | `"fps": 25` |
| `codec` | `string` | WebM 비디오 코덱 식별자 문자열(`"vp09.00.10.08"` 고정). | `"codec": "vp09.00.10.08"` |
| `lossless` | `boolean` | VP9 무손실 인코딩 여부(`true` 고정). | `"lossless": true` |

---

## 7. 키 233개의 구성(전이 169 + 3단위 맥락/기준 64)과 키 이름 규칙

### 고정 13개 발화 단위(`inventory_version: "1.0.0"`)

모든 키는 순서가 고정된 13개 조음 단위(`speech-plan.js`의 `SPEECH_UNITS`)로만 구성됩니다.

1. `sil` (무음·휴지)
2. `closed` (양순 폐쇄)
3. `labiodental` (순치음)
4. `dental` (치음)
5. `alveolar` (치조음)
6. `postalveolar` (후치조음)
7. `palatal` (경구개음)
8. `velar` (연구개음)
9. `glottal` (성문음)
10. `vowel-open` (개모음)
11. `vowel-mid` (중모음)
12. `vowel-spread` (평순 모음)
13. `vowel-round` (원순 모음)

### 키 이름 규칙

- 각 키는 위 13개 단위 이름을 공백 없이 `>` 기호로 이어 붙인 2단위 또는 3단위 문자열입니다.
  - **2단위 방향성 전이 키(`pairKeys`)**: `<이전_단위>><현재_단위>` (예: `"sil>vowel-open"`, `"alveolar>alveolar"`).
  - **3단위 맥락 키(`contextKeys`)**: `<이전_단위>><현재_단위>><다음_단위>` (예: `"alveolar>vowel-open>alveolar"`).
- `>`로 나눈 조각 수가 2개 또는 3개가 아니거나, 13개 고정 목록 밖의 이름이 들어 있으면 `validateSpeechAtlasIndex`에서 거부됩니다.
- 모든 3단위 키 `A>B>C`는 대응하는 2단위 폴백 키 `A>B`가 반드시 `entries` 안에 함께 존재해야 합니다.

### 키 233개의 구성 (`169 + 64 = 233`)

표준 번들(`jina`, `jina-anime`, `naia`)의 `speech/atlas-index.json`은 총 **233개** 키를 담고 있습니다.

1. **방향성 2단위 전이 키 169개 (`previous>current`)**:
   - 13개 발화 단위의 순서쌍 전체($13 \times 13 = 169$개: 동일 단위 유지 `u>u` 13개 + 서로 다른 단위 간 전이 `u>v` 156개).
2. **3단위 맥락(기준) 키 64개 (`previous>current>next`)**:
   - 요약 문서에서 '기준 64'로도 부르며, 실제 코드(`speech-atlas-index.js`, `speech-runtime.js`)와 번들 색인에서는 `previous>current` 전이 뒤에 `next` 단위가 이어질 때 선택되는 3단위 맥락 키(`three-unit contexts`, `contextKeys`) 64개입니다.
   - 64개 전체 목록:
     `alveolar>alveolar>alveolar`, `alveolar>alveolar>vowel-mid`, `alveolar>alveolar>vowel-open`, `alveolar>alveolar>vowel-round`, `alveolar>alveolar>vowel-spread`, `alveolar>glottal>vowel-open`, `alveolar>glottal>vowel-round`, `alveolar>vowel-mid>alveolar`, `alveolar>vowel-mid>closed`, `alveolar>vowel-mid>postalveolar`, `alveolar>vowel-mid>velar`, `alveolar>vowel-open>alveolar`, `alveolar>vowel-open>velar`, `alveolar>vowel-open>vowel-spread`, `alveolar>vowel-round>alveolar`, `alveolar>vowel-round>postalveolar`, `alveolar>vowel-round>vowel-round`, `alveolar>vowel-round>vowel-spread`, `alveolar>vowel-spread>alveolar`, `alveolar>vowel-spread>closed`, `alveolar>vowel-spread>postalveolar`, `alveolar>vowel-spread>velar`, `alveolar>vowel-spread>vowel-mid`, `alveolar>vowel-spread>vowel-spread`, `closed>vowel-mid>alveolar`, `closed>vowel-open>alveolar`, `glottal>vowel-open>alveolar`, `postalveolar>glottal>vowel-spread`, `postalveolar>vowel-open>closed`, `postalveolar>vowel-open>vowel-spread`, `postalveolar>vowel-spread>alveolar`, `velar>alveolar>vowel-spread`, `velar>vowel-mid>alveolar`, `vowel-mid>alveolar>alveolar`, `vowel-mid>alveolar>vowel-mid`, `vowel-mid>alveolar>vowel-open`, `vowel-mid>alveolar>vowel-round`, `vowel-mid>alveolar>vowel-spread`, `vowel-mid>postalveolar>vowel-open`, `vowel-mid>postalveolar>vowel-spread`, `vowel-mid>velar>alveolar`, `vowel-open>alveolar>alveolar`, `vowel-open>alveolar>vowel-mid`, `vowel-open>alveolar>vowel-spread`, `vowel-open>closed>vowel-mid`, `vowel-open>postalveolar>vowel-open`, `vowel-open>vowel-spread>alveolar`, `vowel-round>alveolar>alveolar`, `vowel-round>alveolar>velar`, `vowel-round>alveolar>vowel-mid`, `vowel-round>alveolar>vowel-round`, `vowel-round>alveolar>vowel-spread`, `vowel-round>postalveolar>vowel-open`, `vowel-round>vowel-mid>alveolar`, `vowel-round>vowel-round>alveolar`, `vowel-round>vowel-spread>vowel-spread`, `vowel-spread>alveolar>alveolar`, `vowel-spread>alveolar>vowel-mid`, `vowel-spread>alveolar>vowel-open`, `vowel-spread>alveolar>vowel-round`, `vowel-spread>alveolar>vowel-spread`, `vowel-spread>postalveolar>vowel-open`, `vowel-spread>vowel-mid>alveolar`, `vowel-spread>vowel-spread>alveolar`.

---

## 8. 한도 (크기 및 개수)

| 항목 | 상한 | 검사 위치 및 설명 |
|---|---|---|
| **발화 조각 5개 파일 바이트 합** (`neutral_head` + `atlas` + `atlas_index` + `validation_report` + `quality_report`) | **160 MiB** (`167,772,160` 바이트) | `MAX_SPEECH_ASSETS_BYTES` (`studio_nva_bundle_limits.py`), `SPEECH_ASSET_MAX_BYTES` (`generation-contract.js`). 영수증(`provenance`, `speech/generation-result.json`)과 부속 파일은 합산에서 제외합니다. |
| **압축된 `.nva` 아카이브 크기** | **200 MiB** (`209,715,200` 바이트) | `MAX_ARCHIVE_BYTES` (`nva-bundle-loader.js`), 게이트웨이 `MAX_NVA_BYTES`. |
| **압축 해제 후 전체 크기** | **400 MiB** (`419,430,400` 바이트) / **256 MiB** (`268,435,456` 바이트, `zip-budget.js`) | `MAX_EXPANDED_BYTES` (`nva-bundle-loader.js`) / `DEFAULT_MAX_BYTES` (`zip-budget.js`). |
| **아카이브 최대 파일 수** | **512개** | `MAX_FILES` (`nva-bundle-loader.js`, `zip-budget.js`). |
| **`manifest.json` 최대 크기** | **1 MiB** (`1,048,576` 바이트) | `MAX_MANIFEST_BYTES` (`nva-bundle-loader.js`, `zip-budget.js`). |
| **`speech_clips.*.text` 최대 길이** | **10,000자** | `validateManifest` (`nva-core.js`). |
| **2단위 전이 키(`A>B`) 최대 개수** | **169개** | `validateSpeechAtlasIndex` (`speech-atlas-index.js`). |
| **3단위 맥락 키(`A>B>C`) 최대 개수** | **64개** | `validateSpeechAtlasIndex` (`speech-atlas-index.js`). |
| **`atlas-index.json` 전체 키 개수** | **1 ~ 233개** (표준 번들은 `233개`) | `validateSpeechAtlasIndex` (`speech-atlas-index.js`). |
| **동시 활성 디코딩 `<video>` 요소 수** | 최대 **3개** (`maxActiveEntries = Math.min(3, maxEntries)`) | `SpeechVideoCache` (`speech-player.js`, `speech-browser-runtime.js`). 화면에 그리는 중인 키는 해제에서 보호됩니다. |

---

## 9. 재생 규칙

### 9.1 말하지 않을 때 (Idle 대기 상태)

- `PrebakedAvatarRenderer.start()`가 호출되면 기본 대기 애니메이션(`loop: true`, `can_talk: false`, 비전환 `entry_pose === exit_pose`, 유효한 경우 `scenario`의 `start` 노드가 가리키는 클립 우선 또는 `idleOverride`)을 찾아 음소거 반복(`loop = true`, `muted = true`)으로 재생합니다.
- `speechStage.speaking`이 `false`인 동안 `PrebakedAvatarRenderer.startDrawLoop()`는 매 프레임 숨은 디코딩 `<video>`를 화면 표시용 `<canvas>`에 그립니다(`containRect` 비율 유지, 필요 시 상하 분리 알파·크로마키·알파 보정 및 절차적 호흡/흔들림 모션 적용).

### 9.2 말할 때 (`talking` 바탕 클립 위에 발화 조각을 얹는 순서)

#### `talking` 바탕 클립에 대한 생산자 조건 (Producer requirement)

발화 조각 묶음 형식은 몸 바탕 영상과 입·머리 발화 레이어를 분리하도록 설계되어 있습니다.
- **Producer requirement (생산자 요구 조건)**: `animations.talking` 클립(`loop: true`, `can_talk: true`)은 입이 스스로 말하지 않고 다물어진(고정된) 상태의 몸 바탕 반복 영상이어야 하며, 머리 위치가 `speech_motion.region` 및 `neutral_head`와 정합되어야 합니다. 발화 시 입 모양 움직임은 오직 `speech_motion.region`에 얹히는 `neutral_head`와 `atlas.bin` 조각들로만 표현됩니다. Player는 `talking` 영상을 변형하지 않고 캔버스 전체에 그대로 그린 뒤 `speech_motion.region` 위치에 `neutral_head`와 발화 조각을 덮어 그립니다.

#### 소리 시각에 따른 스케줄 구성 및 조각 선택 (`speech-plan.js`, `speech-runtime.js`)

1. **허용 계획 모드**: `CanonicalSpeechStage`는 `quality_mode`가 `"aligned"`(실제 재생 중인 오디오의 재생 위치 시계 `clock()`으로 구동) 또는 `"browser-timed"`(발화 시작 이후 경과 시각으로 구동하며 `boundary` 이벤트마다 `updateExternalPlan`으로 갱신)인 `SpeechPlan`만 재생합니다.
2. **짧은 이벤트 병합(`normalizeShortSpeechEvents`)**: `0`부터 `audio.duration_us`까지 빈틈없이 이어지는 `plan.events` 중 길이가 `40,000 µs`(`40 ms`) 미만인 구간은, 전체에서 가장 짧은 이벤트(길이가 같으면 앞선 것)를 골라 양옆 중 더 긴 이웃(길이가 같으면 오른쪽/다음 이웃)에 합치는 과정을 모든 이벤트가 `>= 40,000 µs`가 될 때까지 반복합니다.
3. **조각 키 선택(`buildSpeechSchedule`)**: 정규화된 이벤트 배열의 각 인덱스 $i \ge 1$ (`previous = events[i - 1]`, `current = events[i]`, `next = events[i + 1]`)에 대해:
   - `next`가 존재하고 3단위 키 `${previous.unit}>${current.unit}>${next.unit}`가 `atlasIndex.entries`에 있으면 그 3단위 키를 선택합니다.
   - 그렇지 않으면 2단위 전이 키 `${previous.unit}>${current.unit}`를 선택합니다.
4. **프레임 시각 배치 및 배속(`speechPlaybackRate`)**:
   - 각 전이의 기준 시각은 `boundary_us = current.start_us`입니다.
   - `current` 이벤트 길이 `span = current.end_us - current.start_us`가 `80,000 µs`(`80 ms`)보다 짧으면 `playback_rate = Math.min(2, 80_000 / span)`으로 최대 2배까지 배속을 높이고, `80,000 µs` 이상이면 `playback_rate = 1`을 유지합니다.
   - 5개 프레임의 목표 시각 `frame_times_us`는 `[-80_000, -40_000, 0, 40_000, 80_000]` µs 오프셋을 `playback_rate`로 나눈 `boundary_us + Math.round(offset / playback_rate)`입니다.
   - 재생 시작 전 준비 단계(`#loadMotion`)에서 스케줄의 첫 고유 조각 최대 **2개**(`prefetchSpeechRanges`)를 미리 읽어 디코딩합니다.
5. **현재 소리 시각의 레이어 및 교차 블렌딩 계산(`resolveSpeechLayers`)**:
   - 오디오 시계가 가리키는 마이크로초 시각 `timeUs`(`0..schedule.duration_us`로 클램프)에 대해:
   - `transitions`가 비어 있거나 첫 전이의 첫 프레임 시각 전(`timeUs < transitions[0].frame_times_us[0]`)이면 빈 배열(`[]`)을 반환합니다.
   - 인접한 두 전이 `left = transitions[i]`와 `right = transitions[i + 1]` 사이에서는 중간 시각 `midpoint = Math.round((left.boundary_us + right.boundary_us) / 2)`를 중심으로 `[midpoint - 40_000, midpoint + 40_000]` µs(총 `80 ms`, 25 fps 기준 2프레임 구간) 동안 raised-cosine 가중치로 교차 블렌딩합니다.
     $$\text{progress} = \frac{\text{timeUs} - (\text{midpoint} - 40000)}{80000}, \quad \text{rightOpacity} = \frac{1 - \cos(\pi \cdot \text{progress})}{2}, \quad \text{leftOpacity} = 1 - \text{rightOpacity}$$
   - `midpoint - 40,000 µs` 이전에는 `left` 단독(`opacity = 1`), 마지막 전이 구간에서는 마지막 전이 단독(`opacity = 1`)을 반환합니다.
   - 각 활성 레이어의 프레임 번호 $f \in \{0, 1, 2, 3, 4\}$는 `clamp(0, 4, Math.round((timeUs - frame_times_us[0]) / (40_000 / playback_rate)))`로 구하며, 해당 조각 `<video>`의 `currentTime`과 `targetTime = f / 25`초의 차이가 `0.005`초를 넘으면 `video.currentTime = targetTime`으로 이동합니다.

#### 프레임별 캔버스 합성 순서 (`SpeechPlayer.#draw`, `PrebakedAvatarRenderer.startDrawLoop`)

`SpeechPlayer.state === "speaking"`인 동안 매 애니메이션 프레임마다 다음 순서로 그립니다.

1. **오프스크린 발화 캔버스 초기화**: `context.clearRect(0, 0, canvas.width, canvas.height)` (`720×1280`).
2. **바탕 `talking` 클립(`bodyVideo`) 그리기**: `context.drawImage(bodyVideo, 0, 0, canvas.width, canvas.height)`로 캔버스 전체에 반복 재생 중인 몸 영상을 그립니다.
3. **고정 영역(`region`)에 `neutral_head` 그리기**: `globalCompositeOperation = "source-over"`, `globalAlpha = 1` 상태로 `neutral_head`(`512×512`)를 `speech_motion.region`(`[x, y, width, height]`)에 그립니다.
4. **고정 영역(`region`)에 활성 발화 조각 레이어 얹기**:
   - `"whole-head-layer"` 모드(`drawBlendedWholeHeadSpeechFrame`):
     - 준비된 레이어가 1개 이상이면 첫 레이어 `readyLayers[0].image`를 `globalAlpha = 1`로 `region`에 그립니다.
     - 교차 블렌딩 중인 두 번째 레이어 `readyLayers[1]`이 있고 `opacity > 0`이면 `readyLayers[1].image`를 `globalAlpha = readyLayers[1].opacity`로 그 위 `region`에 겹쳐 그립니다.
   - `"factorized-difference-layer"` 모드(`drawBlendedFactorizedSpeechFrame`):
     - `readyLayers`의 각 레이어를 순서대로 `globalAlpha = layer.opacity`로 `region`에 그립니다.
5. **다음 조각 미리 읽기**: 현재 활성 레이어가 1개(`index = current`)이면 다음 전이 `Math.min(current + 1, schedule.transitions.length - 1)`을 백그라운드에서 미리 로드합니다.
6. **화면 표시용 캔버스에 최종 출력**: `speechStage.speaking`이 `true`인 동안 `PrebakedAvatarRenderer`는 `speechStage.canvas`를 원본 소스로 삼아 화면 `<canvas>`에 그립니다.

### 9.3 조각이 없거나 깨졌을 때의 폴백(돌아가는) 동작

Player는 조각이 없거나 손상되었을 때 임의의 입 모양을 꾸며내지 않고 다음과 같이 동작합니다.

1. **3단위 맥락 키(`A>B>C`)가 `atlas-index.json`에 없을 때**:
   - `buildSpeechSchedule`이 자동으로 2단위 전이 키 `A>B`로 폴백하여 스케줄을 만듭니다(`speech-runtime.js`).
2. **필수 2단위 키(`A>B`)가 없거나, `SpeechPlan`·번들 무결성 검증이 실패했을 때**:
   - `prepare()` 단계에서 `verifySpeechMotionBundle`은 `speech/generation-result.json` 영수증, `manifest.speech_motion`의 모든 필드, 5개 발화 자산 파일의 바이트 크기·SHA-256, `speech/atlas-index.json` 구조, `speech/atlas.bin` 내 모든 조각의 SHA-256을 대조합니다.
   - 어느 하나라도 누락·불일치하거나 `A>B` 키가 없으면 `CanonicalSpeechStage.prepare()`가 경고를 기록하고 `player.stop("error")`를 호출한 뒤 `null`을 반환합니다(`start()`는 `false` 반환). 이때 `speechStage.speaking`은 `false`로 유지되므로 화면에는 기존 `idle` 대기 클립이 계속 재생됩니다.
3. **`SpeechPlan` 없이 말하기 시각 상태만 켜졌을 때(`setSpeakingVisual(true)`)**:
   - `speechStage`가 존재하지만 아직 발화 자산이 로드되지 않았고(`speechStage.assetsLoaded === false`), `!speechStage.speaking`이며 `manifest.animations.talking?.clip`이 있으면, `playIdle()`이 일시적으로 `animations.talking.clip`(음소거 반복)을 `fallbackClip`으로 재생합니다(`prebaked-renderer.ts`).
   - 그 밖의 경우(발화 자산이 이미 로드된 상태에서 계획이 없거나 `speech_motion`이 없는 경우)에는 가짜 입 움직임 없이 `idle` 클립을 그대로 유지합니다.
4. **재생 중 특정 프레임에서 조각 `<video>`가 아직 디코딩 중일 때(캐시 미스)**:
   - 첫 전이 시각 이전(`timeUs < transitions[0].frame_times_us[0]`)이거나 해당 조각이 `SpeechVideoCache`에서 아직 로딩 중(`speechVideoCache.get(key) === null`)이면, `SpeechPlayer.#draw`는 비동기로 `#ensureTransition(layer.index)`를 요청하고 이번 프레임에서는 그 레이어를 건너뜁니다. 준비된 조각 레이어가 하나도 없으면 `bodyVideo` 위에 `neutral_head`가 얹힌 화면이 그려지며, 교차 블렌딩 중인 두 레이어 중 하나만 준비되었으면 준비된 레이어만 그려집니다.
5. **재생 중 바이트 조각 읽기 실패 또는 WebM 디코딩 오류가 발생했을 때**:
   - `SpeechAtlasSource.read`가 실패하거나 조각 `<video>`에서 `"error"` 이벤트(`"speech unit decode failed"`)가 발생하면, `SpeechPlayer`는 즉시 `this.stop("error")`를 호출합니다(`speech-player.js`).
   - 이에 따라 `SpeechPlayer.state`가 `"speaking"`에서 벗어나고 `CanonicalSpeechStage.speaking`이 `false`가 되며, `PrebakedAvatarRenderer.startDrawLoop()`는 즉시 화면 `<canvas>`의 그리기 원본을 `idle` `<video>` 클립으로 되돌립니다.
6. **발화 종료 또는 중단(`setSpeakingVisual(false)` / `interrupt()`)**:
   - `speechStage.stop()`이 호출되어 내부 `bodyVideo`를 일시 정지하고, `PrebakedAvatarRenderer`는 `playIdle()`을 호출해 `idle` 반복 재생으로 돌아갑니다.
