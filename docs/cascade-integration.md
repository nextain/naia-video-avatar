# nva ↔ output_cascade ↔ kiosk-v3 연결 설계

> nva(포맷/뷰어/에디터)를 output_cascade에 엮어 kiosk-v3.xrcloud.app에서 강남구 아바타를
> 실시간 구동하기 위한 배선·매핑·배포 설계. **이 repo는 브라우저측 어댑터까지** 책임지고,
> GPU 렌더(cascade)·VM 배포는 외부(naia-omni-cascade / visualxlab).

## 1. 배선도

```
[키오스크 브라우저]  ditto/nva renderer
      │ https://kiosk-v3.xrcloud.app
      ▼
[VM nginx]
      ├─ location /        → web(:13000)          (Next.js + STT WS)
      └─ location /avatar/ → cascade(:8910)        (역터널)
      ▼
[output_cascade :8910]  compat façade
      │   POST /stream_text {text} → fMP4   |  POST /stream (wav) → fMP4
      │   GET  /idle · /listening  → 루프 mp4 |  GET /health
      ├─ TTS  (VoxCPM2 :22600 / tts_server :8901)
      ├─ Ditto trt (:8902)          ← speaking 실시간 렌더(말하는 얼굴)
      └─ nva 번들(강남구 캐릭터)     ← CharacterBundle 로드(idle/event 클립 + source frame)
```

현 kiosk-v2 = renderer가 `/avatar` → trt(:8902) **직결**. kiosk-v3 = `/avatar` → **cascade(:8910)**가
trt를 감싸고 TTS·nva 번들·idle/event를 흡수 → 출력부 단일화. **renderer 코드는 무변경**(façade 동일 계약).

## 2. nva ↔ output_cascade CharacterBundle 매핑

cascade가 nva 번들을 소비하려면 nva manifest → `CharacterBundle`(naia-omni-cascade `schema.py`) 변환:

| nva manifest | CharacterBundle | 비고 |
|---|---|---|
| `states.<talking>.clip` | `idle_clip_path` / `listening_clip_path` | 안정 포즈 루프 |
| `states.<animation>.clip`, `transitions.*.clip` | `event_clips{}` | idle break / 전환 |
| speaking 구동 정지 프레임 | `source_frame_path` | Ditto 입력(필수) |
| `states.<talking>.face_bbox` | (Ditto crop 영역) | 헤드토킹 위치 |
| `meta.voice_ref` | `voice_ref` (VoiceRef) | 음색 클론 |
| `matte` (알파) | `matte_path` | 투명 합성 |
| `canvas` | `RenderConfig` | 해상도/fps |

> 이 로더(`nva → CharacterBundle`)는 **naia-omni-cascade 측 구현 대상**(이 repo 범위 밖).
> nva가 표준 입력 포맷이 되고, cascade가 소비자.

## 3. 브라우저측 어댑터 (이 repo — 작성 완료)

`src/main/nva-cascade-adapter.js` — `NvaCascadeRenderer`:
- speaking 시 cascade façade(`/stream_text`·`/stream`) 호출 → MSE fMP4 재생, barge-in(generation).
- `probeCascade(url)` 로 연결 가능 여부 판단 → 뷰어가 **cascade(실렌더) ↔ mock(입 오버레이)** 선택.
- cascade 미가동(GPU 없음)이면 뷰어는 mock으로 폴백(데모 지속).

## 4. kiosk-v3.conf (nginx — visualxlab VM 적용)

```nginx
server {
    listen 443 ssl;
    server_name kiosk-v3.xrcloud.app;
    # ssl_certificate ... (기존 와일드카드/인증서 재사용)

    location / {
        proxy_pass http://127.0.0.1:13000;   # web (역터널 ← 로컬 :3000)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;   # STT WebSocket
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    location /avatar/ {
        proxy_pass http://127.0.0.1:8910/;   # output_cascade (역터널 ← 로컬 :8910)
        proxy_buffering off;                  # 스트리밍 fMP4 즉시 전달
        proxy_read_timeout 300s;
    }
}
```
> kiosk-v2.conf와 차이 = `/avatar` 프록시 대상만 `:18902`(trt 직결) → `:8910`(cascade). 나머지 동일.

## 5. 배포 절차 (외부 의존 — visualxlab / 루크)

1. **GPU**: cascade 스택 기동 — trt(:8902) + TTS(:22600/:8901) + output_cascade(:8910). `/health` ok 확인.
2. **nva 번들**: 강남구 캐릭터(오사랑) nva → CharacterBundle 등록(`POST :8910/characters`). ⚠️ 라이브 kiosk-v2 GPU와 충돌 금지(별 GPU 또는 시분할).
3. **VM**: `kiosk-v3.conf` 배치 + 역터널 `:8910` + DNS `kiosk-v3.xrcloud.app`.
4. **검증**: 브라우저 → kiosk-v3 → `/avatar/health` ok → speaking 실렌더 확인. (호환 갭: `/idle` Range·loop 재생 실측.)

## 6. 현 상태

| 단계 | 상태 |
|---|---|
| 브라우저 어댑터(`nva-cascade-adapter.js`) | ✅ 작성 (이 repo) |
| kiosk-v3.conf 설계 | ✅ 작성 (§4) |
| nva→CharacterBundle 로더 | ⏳ naia-omni-cascade 구현 대상 |
| GPU 기동 + VM 배포 + 강남구 nva 등록 | ⏳ visualxlab/루크 (물리 인프라) |

→ 코드/설정/매핑은 준비됨. **실배포·GPU 렌더·시연만 외부 인프라 대기.**
