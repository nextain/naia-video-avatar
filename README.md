# naia-video-avatar (nva)

**naia video clip avatar** — 비디오 클립 기반 토킹헤드 아바타의 **도구 중립 교환 포맷(nva)** + 제작 도구(에디터) + 데모.

> 캐릭터를 무엇으로 만들었든(실사 촬영 / VRM·메타휴먼 / AI 영상생성) 최종 산출은 "비디오 클립 + 메타"로 통일된다.
> 포맷의 핵심은 비디오 파일이 아니라 **클립의 위치·조합·순서 = 상태머신**이다(게임 애니메이션 state machine 계보).
> 글로벌에 비디오 토킹헤드 개방 교환 표준이 없어(VRM=3D, Live2D=2D 독점, D-ID/HeyGen=클라우드 독점) naia가 정의하는 **과도기 오픈 표준**.

## 📍 문서 색인 — "어디에 뭐가 있나"

| 무엇 | 위치 |
|------|------|
| **의도 · 제작 가이드** (펄스나인용) | [`docs/nva-format-guide.md`](docs/nva-format-guide.md) |
| **포맷 필드 스펙** (상태별 idle/body/head/bbox) | [`src/main/nva-schema.json`](src/main/nva-schema.json) |
| **요구·UC·설계·테스트** (V모델) | [`docs/progress/01~05`](docs/progress/) |
| **cascade 연결**(데모↔naia-omni) | [`docs/cascade-integration.md`](docs/cascade-integration.md) |
| **헌장 / 구조 규칙** | [`AGENTS.md`](AGENTS.md), [`docs/project-structure.md`](docs/project-structure.md) |
| **에디터 사용 안내** | 에디터 화면 우상단 **❔ 의도·사용법·구조** 버튼 |

## 구조

```
src/main/
  nva-schema.json          포맷 JSON Schema (v0.3)
  nva-core.js              검증 + 이행 + 상태별 리소스 런타임 (브라우저·node 양용, 정본 로직)
  editor.html              ★ Windows 제작 도구 — 상태별 리소스 편집 + 원격 Cascade 시험 + .nva export
  demo.html                ★ 데모(시연) — nva 시나리오 → cascade 실시간 렌더
  nva-cascade-adapter.js   cascade(/avatar) 연결 어댑터 (데모용)
examples/
  build-sample.sh          ffmpeg 더미 박스 캐릭터 생성
  demo.nva/                공개 안전 샘플 번들 (neutral/seated 두 상태)
docs/                      포맷 가이드 + cascade 연결 + V모델(progress/01~05)
src/test/                 단위·계약·Playwright 테스트
```

> **에디터(제작 도구) ↔ 데모(시연)는 분리**. 에디터는 범용 nva 제작용(강남구 무관), 데모는 만든 nva를 cascade로 실행.

## 포맷 요약 (NVA 0.3)

- 최상위 `character_states`의 각 상태가 idle, talking-body, talking-head source/descriptor, `face_bbox`를 함께 소유한다.
- 상태와 각 리소스에 revision이 있어 한 상태를 바꿔도 다른 상태가 보존된다.
- 말하기 완료·취소·오류·barge-in 뒤에는 같은 상태의 idle로 복귀한다.
- talking-head 내부 표현과 전이·보간·코덱·합성 위치는 3090 실험 전에는 강제하지 않는다.
- 0.1/0.2 번들은 0.3으로 명시적으로 이행하고 미래 버전은 거부한다.

## 사용

```bash
# 로컬 서버 (file:// 는 fetch 제한 → http 권장)
pnpm install
python3 -m http.server 8099
```
- **제작(에디터)**: `http://localhost:8099/src/main/editor.html`
  → 기존 .nva/데모 열기 → 상태별 idle/body/head/bbox와 Windows 프로파일 편집
  → 원격 Cascade health/upload/상태별 말하기 시험 → **.nva export/reopen**
- **시연(데모)**: `http://localhost:8099/src/main/demo.html?nva=../../examples/demo.nva&cascade=<cascade-url>`
  → 시나리오 버튼 → nva 시나리오를 cascade가 실시간 렌더 (cascade 없으면 자막만)

라이브: `https://kiosk-v3.xrcloud.app`(강남구 데모) · `.../src/main/editor.html`(제작 도구)

## 검증

```bash
pnpm test                                # 단위 + 계약 + 정적 검증
pnpm test:browser                        # Playwright 에디터 검증
node scripts/check-traceability.mjs --enforce --strict-orphans
```
에디터/데모 렌더는 headless(playwright) 캡쳐로 검증.

## 알파 메모

ffmpeg 8.1 libvpx 알파가 이 환경에서 미동작(yuv420p 드롭) → 더미 샘플은 **크로마키**(`chroma_key`)로 우회.
실배포는 trt(Ditto)가 VP9 yuva420p 알파 생성 — 포맷/도구는 알파·크로마 **둘 다 수용**.

## 권리 / 라이선스

- 포맷 명세 + 코어/에디터/데모 = **naia(nextain) 자산**. 명세=CC-BY-4.0 / 구현=Apache-2.0. (향후 오픈소스 배포)
- nva 번들에 담기는 캐릭터(클립·음색) = 각 제작자 자산(manifest `meta.owner`). IP 경계 = `.agents/progress/talkingkiosk-pulse9-ip-meeting-2026-06-21.md`(alpha-adk).
