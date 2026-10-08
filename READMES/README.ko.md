# NVA Avatar Player

[English](../README.md) | 한국어

NVA는 GPU 없이 브라우저에서 재생하는 ZIP 기반 비디오 아바타 포맷입니다. NVA
v0.3 파일에는 완성된 idle·action·발화 영상과 작은 JSON manifest가 들어 있습니다.
발화 영상에는 음성이 이미 포함되어 있으므로 Player는 묶여 있는 미디어를 디코딩해
재생하기만 합니다.

이 저장소에 들어 있는 것은 다음과 같습니다.

- 공개 NVA v0.3 completed-media 스키마와 검증기
- 외부 의존성이 없는 ZIP 로더
- 읽기 전용 웹 Player
- 결정론적 로컬 패키징·검증 도구

아바타 생성, 텍스트 음성 변환(TTS), 실시간 립싱크, 모델 추론, Editor는 의도적으로
포함하지 않습니다.

## Player 실행

저장소를 정적 웹 서버로 제공합니다.

```bash
python3 -m http.server 8099 --bind 127.0.0.1
```

`http://127.0.0.1:8099/src/main/viewer.html`을 열고 `.nva` 파일을 선택한 뒤 포함된
발화 영상이나 action을 재생합니다. 투명 캐릭터가 서비스 화면에서 어떻게 보이는지
확인하도록 배경 색상이나 로컬 이미지를 고를 수 있습니다. 파일을 읽은 뒤에는 계정,
키, 서버 애플리케이션, GPU, 네트워크 API가 필요하지 않습니다.

## NVA v0.3 구조

```text
avatar.nva
├── manifest.json
├── clips/
│   ├── idle.webm
│   └── wave.webm
└── speech/
    ├── greeting-ko.mp4
    └── greeting-en.mp4
```

`.nva` 확장자는 일반 ZIP 아카이브입니다. `manifest.json`은 `nva_version: "0.3"`과
`profile: "completed-media"`를 사용합니다. 모든 `speech_clips` 항목은 음성이 내장된
완성 MP4 또는 WebM과 BCP 47 언어 태그를 가리킵니다. 자세한 내용은
[포맷 가이드](../docs/nva-format-guide.ko.md)를 참고하세요.

## 최종 NVA 만들기

패키징 도구는 기존 v0.2 NVA 디렉터리 또는 ZIP과 하나 이상의 완성 발화 영상을 받아
결정론적인 v0.3 배포 파일로 변환합니다.

```bash
python3 scripts/build-final-nva.py \
  --base /path/to/legacy-avatar.nva \
  --speech 'hello-ko|ko-KR|Korean greeting|/path/to/hello-ko.mp4' \
  --speech 'hello-en|en-US|English greeting|/path/to/hello-en.mp4' \
  --output /path/to/avatar-final.nva
```

각 발화 입력은 NVA 캔버스 크기와 같아야 하며 영상과 내장 음성을 모두 포함해야 합니다.
패키징 도구는 최종 공개 manifest가 참조하는 미디어만 남깁니다.

비공개 샘플은 원본 경로를 기록하지 않고 localhost에서 사용할 수 있게 준비할 수 있습니다.

```bash
python3 scripts/prepare-local-samples.py \
  --sample 'First avatar=/path/to/first-final.nva' \
  --sample 'Second avatar=/path/to/second-final.nva'
```

그런 다음 다음 주소를 엽니다.

```text
http://127.0.0.1:8099/src/main/viewer.html?catalog=../../examples/.local/catalog.json
```

`examples/.local/`은 Git에서 제외됩니다.

## 검증

```bash
node --test src/test/*.test.mjs
python3 src/test/local-sample-prep.test.py
python3 src/test/final-nva.test.py
node scripts/check-traceability.mjs
./scripts/enforce-root-structure.sh
```

브라우저 통합 테스트는 `src/test/standalone-player.e2e.py`와
`src/test/local-samples.e2e.py`에 있습니다.

## naia-adk·naia-pj-adk 와의 관계

- **naia-adk** (https://github.com/nextain/naia-adk): 공개 개인 ADK 바탕. 작업공간 구조와 도구 중립 에이전트 계약을 정합니다.
- **naia-pj-adk** (https://github.com/nextain/naia-pj-adk): 여러 도구와 작업공간을 쓰는 팀이 하나의 프로젝트 규칙으로 일하도록 돕는 공개 팀 프로젝트 ADK입니다. 프로젝트 어댑터, 검증 가능한 작업 절차, 표준 산출물 정본(PC→SP→UC→RQ→PL→FE, UT→IT→E2E→QC)을 가집니다.
- **naia-video-avatar**: 제품 저장소입니다. 포크나 템플릿 복제가 아니라 naia-pj-adk의 표준 절차와 산출물 규칙을 채택합니다. 산출물 위치는 [docs/planning/README.ko.md](../docs/planning/README.ko.md)의 대응표를 따르며, naia-pj-adk의 프로젝트 어댑터 `projects/naia-video-avatar/`가 이 저장소를 가리킵니다.

```text
naia-adk (개인 ADK 바탕 · 도구 중립 계약)
  └── naia-pj-adk (팀 프로젝트 ADK · 표준 절차/산출물 정본)
        └── naia-video-avatar (제품 저장소 · 표준 산출물/영수증 채택)
```

### 개발 절차 (Development process)

이 저장소는 naia-pj-adk의 표준 문서 우선 파이프라인을 따릅니다. 기획은 위에서 아래로(PC → SP → UC → RQ → PL → FE), 구현은 아래에서 위로(UT → 통합 시험(IT) 관문 → 화면 구현 및 연결 → E2E → 독립 QC) 진행합니다. 상세 내용은 [기획 산출물 및 표준 대응표](../docs/planning/README.ko.md)를 참고하세요.

## 호환성

JavaScript 로더는 기존 NVA v0.2 파일의 읽기 호환을 유지합니다. 새로 배포하는 파일은
더 작은 v0.3 completed-media 계약을 사용해야 합니다.

## 라이선스

Apache License 2.0. NVA 파일 안의 미디어는 각자 명시한 라이선스를 따릅니다.
