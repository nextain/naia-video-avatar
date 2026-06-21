# naia-video-avatar (nva)

**naia video clip avatar** — 비디오 클립 기반 토킹헤드 아바타의 **도구 중립 교환 포맷(nva)** + 웹 뷰어 + 웹 에디터.

> 캐릭터를 무엇으로 만들었든(실사 촬영 / VRM·메타휴먼 렌더 / AI 영상생성) 최종 산출은
> "비디오 클립 + 메타"로 통일된다. 포맷의 핵심은 비디오 파일이 아니라
> **클립의 위치·조합·순서 = 상태머신**이다(게임 애니메이션 state machine 계보).

글로벌에 비디오 토킹헤드용 개방 교환 표준이 없어(VRM=3D, Live2D=2D 독점 런타임,
D-ID/HeyGen=클라우드 독점) naia가 정의하는 **과도기 오픈 표준**.

## 범위

① nva 포맷 정의 · ② 웹 뷰어 · ③ 웹 에디터(파일 익스포터).
(cascade 통합·GPU 서빙은 범위 밖 = `naia-omni-cascade` 소관.)

## 구조

```
src/main/
  nva-schema.json   포맷 JSON Schema (v0.1)
  nva-core.js       검증 + 상태머신 + 포즈 그래프 (브라우저·node 양용)
  viewer.html       뷰어 — 크로마/알파 레이어 합성 + 상태 전환 + 헤드토킹
  editor.html       에디터 — manifest 편집 + 라이브 미리보기 + 유효성 + .nva export
examples/
  build-sample.sh   ffmpeg 더미 박스 캐릭터 생성
  demo.nva/         샘플 번들 (manifest.json + clips/ ×7)
docs/               포맷 명세 + V모델 설계 문서
```

## 포맷 요약 (nva manifest)

- **state**: `talking`(말하기 가능 안정 포즈, `face_bbox`로 헤드토킹 위치) | `animation`(동작).
- **transition**: 포즈 간 이동 클립. `entry_pose`(from) → `exit_pose`(to).
- **포즈 연속성**: A→B 가능 ⟺ `A.exit_pose == B.entry_pose`, 아니면 transition 자동 삽입.
- **레이어**: 배경 + 캐릭터(알파/크로마) + 헤드토킹. 동시 알파 디코딩 ≤ 2.

상세: `src/main/nva-schema.json`, `docs/`.

## 사용

```bash
# 1) 샘플 클립 생성
bash examples/build-sample.sh

# 2) 로컬 서버 후 브라우저로 열기 (file:// 는 fetch 제한 → http 권장)
python3 -m http.server 8099
#  뷰어:   http://localhost:8099/src/main/viewer.html?nva=../../examples/demo.nva
#  에디터: http://localhost:8099/src/main/editor.html
```

## 검증

```bash
# 코어 로직(검증 + 경로 탐색) — node
node -e "import('./src/main/nva-core.js').then(c=>{const m=require('./examples/demo.nva/manifest.json');console.log(c.summarize(c.validateManifest(m)))})"
```
뷰어/에디터 렌더는 headless 캡쳐로 검증(상태 전환·크로마 합성·헤드토킹·.nva export 확인됨).

## 알파 메모

ffmpeg 8.1 libvpx 알파가 이 환경에서 미동작(yuv420p로 드롭) → 더미 샘플은 **크로마키**로 우회
(뷰어 canvas가 크로마 제거 후 합성). 실배포는 trt(Ditto)가 VP9 yuva420p 알파를 생성 —
포맷·뷰어는 알파/크로마 **둘 다 수용**.

## 권리 / 라이선스

- 포맷 명세 + 코어/뷰어/에디터 = **naia(nextain) 자산**. 명세=CC-BY-4.0 / 구현=Apache-2.0.
- nva 번들에 담기는 캐릭터(클립·음색) = 각 제작자 자산(manifest `meta.owner`).
