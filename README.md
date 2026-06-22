# naia-video-avatar (nva)

**naia video clip avatar** — 비디오 클립 기반 토킹헤드 아바타의 **도구 중립 교환 포맷(nva)** + 제작 도구(에디터) + 데모.

> 캐릭터를 무엇으로 만들었든(실사 촬영 / VRM·메타휴먼 / AI 영상생성) 최종 산출은 "비디오 클립 + 메타"로 통일된다.
> 포맷의 핵심은 비디오 파일이 아니라 **클립의 위치·조합·순서 = 상태머신**이다(게임 애니메이션 state machine 계보).
> 글로벌에 비디오 토킹헤드 개방 교환 표준이 없어(VRM=3D, Live2D=2D 독점, D-ID/HeyGen=클라우드 독점) naia가 정의하는 **과도기 오픈 표준**.

## 📍 문서 색인 — "어디에 뭐가 있나"

| 무엇 | 위치 |
|------|------|
| **의도 · 제작 가이드** (펄스나인용) | [`docs/nva-format-guide.md`](docs/nva-format-guide.md) |
| **포맷 필드 스펙** (states/transitions/scenarios/레이어) | [`src/main/nva-schema.json`](src/main/nva-schema.json) |
| **요구·UC·설계·테스트** (V모델) | [`docs/progress/01~05`](docs/progress/) |
| **cascade 연결**(데모↔naia-omni) | [`docs/cascade-integration.md`](docs/cascade-integration.md) |
| **헌장 / 구조 규칙** | [`AGENTS.md`](AGENTS.md), [`docs/project-structure.md`](docs/project-structure.md) |
| **에디터 사용 안내** | 에디터 화면 우상단 **❔ 의도·사용법·구조** 버튼 |

## 구조

```
src/main/
  nva-schema.json          포맷 JSON Schema (v0.1)
  nva-core.js              검증 + 상태머신 + 포즈 그래프 + 시나리오 (브라우저·node 양용, 정본 로직)
  editor.html              ★ 제작 도구 — 리소스/구조 편집 + 미리보기 플레이 + .nva export (범용)
  demo.html                ★ 데모(시연) — nva 시나리오 → cascade 실시간 렌더
  nva-cascade-adapter.js   cascade(/avatar) 연결 어댑터 (데모용)
examples/
  build-sample.sh          ffmpeg 더미 박스 캐릭터 생성
  demo.nva/                샘플 번들 (manifest.json + clips/ ×7 + 시나리오 4)
docs/                      포맷 가이드 + cascade 연결 + V모델(progress/01~05)
src/test/nva-core.test.mjs 단위 테스트 (19 assert)
```

> **에디터(제작 도구) ↔ 데모(시연)는 분리**. 에디터는 범용 nva 제작용(강남구 무관), 데모는 만든 nva를 cascade로 실행.

## 포맷 요약 (nva manifest)

- **state**: `talking`(말하기 안정 포즈, `face_bbox`=헤드토킹 위치) / `animation`(동작). 클립 + 포즈 메타.
- **transition**: 포즈 간 이동 클립. `entry_pose`(from) → `exit_pose`(to).
- **scenario**: 연출 — 상태/이벤트 + 대사(`say`) + 타이밍(`dwell_ms`) 시퀀스. 뷰어/데모가 자동 재생.
- **포즈 연속성**: A→B 가능 ⟺ `A.exit_pose == B.entry_pose` (아니면 transition 자동 삽입).
- **레이어**: 배경(`background`) + 캐릭터(알파/`chroma_key`) + 헤드토킹. 동시 알파 디코딩 ≤ 2.

## 사용

```bash
# 로컬 서버 (file:// 는 fetch 제한 → http 권장)
python3 -m http.server 8099
```
- **제작(에디터)**: `http://localhost:8099/src/main/editor.html`
  → 데모 로드 / .nva 열기 → +말하기·+동작·+전환·+시나리오 → 클립 업로드·메타 편집 → 미리보기 → **.nva export**
  → 화면 우상단 **❔ 의도·사용법·구조** 버튼에 안내 내장
- **시연(데모)**: `http://localhost:8099/src/main/demo.html?nva=../../examples/demo.nva&cascade=<cascade-url>`
  → 시나리오 버튼 → nva 시나리오를 cascade가 실시간 렌더 (cascade 없으면 자막만)

라이브: `https://kiosk-v3.xrcloud.app`(강남구 데모) · `.../src/main/editor.html`(제작 도구)

## 검증

```bash
node src/test/nva-core.test.mjs          # 단위 19 assert
node scripts/check-traceability.mjs      # V모델 추적성 (orphan 0)
```
에디터/데모 렌더는 headless(playwright) 캡쳐로 검증.

## 알파 메모

ffmpeg 8.1 libvpx 알파가 이 환경에서 미동작(yuv420p 드롭) → 더미 샘플은 **크로마키**(`chroma_key`)로 우회.
실배포는 trt(Ditto)가 VP9 yuva420p 알파 생성 — 포맷/도구는 알파·크로마 **둘 다 수용**.

## 권리 / 라이선스

- 포맷 명세 + 코어/에디터/데모 = **naia(nextain) 자산**. 명세=CC-BY-4.0 / 구현=Apache-2.0. (향후 오픈소스 배포)
- nva 번들에 담기는 캐릭터(클립·음색) = 각 제작자 자산(manifest `meta.owner`). IP 경계 = `.agents/progress/talkingkiosk-pulse9-ip-meeting-2026-06-21.md`(alpha-adk).
