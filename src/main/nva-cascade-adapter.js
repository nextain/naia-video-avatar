// nva ↔ output_cascade 연결 어댑터 (브라우저, ESM)
//
// nva talking state의 speaking을 output_cascade compat façade로 실시간 렌더한다.
// cascade가 강남구 캐릭터(nva 번들)를 로드해 TTS+Ditto로 말하는 얼굴을 fMP4로 스트리밍하고,
// 이 어댑터가 MSE로 첫 청크부터 재생한다. cascade 미연결이면 viewer는 mock 입으로 폴백.
//
// 책임 경계:
//   - 이 어댑터(naia-video-avatar) = 브라우저측 speaking 백엔드 호출 + MSE 재생.
//   - output_cascade(naia-omni-cascade) = TTS(VoxCPM2)+Ditto 렌더, nva 번들 → CharacterBundle 소비. (GPU)
//   - kiosk-v3(TalkingKiosk) = /avatar 프록시 → cascade. (VM nginx)
//
// cascade façade 계약 (server.py):
//   POST /stream_text {text}            → fragmented MP4 (h264+aac) chunked
//   POST /stream      (wav octet-stream) → fMP4 chunked (다국어 외부 TTS)
//   GET  /idle, /listening               → 루프 mp4
//   GET  /health                         → { ok, tts, avatar }

const FMP4 = 'video/mp4; codecs="avc1.42E01F, mp4a.40.2"';

export class NvaCascadeRenderer {
  /** @param {string} cascadeUrl 예: "/avatar" 또는 "http://localhost:8910" @param {HTMLVideoElement} videoEl */
  constructor(cascadeUrl, videoEl) {
    this.url = cascadeUrl.replace(/\/$/, "");
    this.video = videoEl;
    this.gen = 0;
    this.teardown = null;
  }

  async health() {
    try {
      const h = await (await fetch(`${this.url}/health`)).json();
      return !!h.ok;
    } catch {
      return false;
    }
  }

  /** 우리 텍스트를 cascade가 발화 (서버 TTS, 한국어 self-voice). */
  async speakText(text) {
    return this._stream(() =>
      fetch(`${this.url}/stream_text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }));
  }

  /** 외부 TTS WAV 주입 (다국어). @param {Uint8Array} wav */
  async speakAudio(wav) {
    return this._stream(() =>
      fetch(`${this.url}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: wav,
      }));
  }

  /** barge-in: 진행 중 발화 무효화. */
  interrupt() {
    this.gen++;
    this.teardown?.();
    this.teardown = null;
  }

  async _stream(doFetch) {
    const my = ++this.gen;
    this.teardown?.();
    const ms = new MediaSource();
    const url = URL.createObjectURL(ms);
    this.video.src = url;
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return; cleaned = true;
      try { if (ms.readyState === "open") ms.endOfStream(); } catch {}
      try { URL.revokeObjectURL(url); } catch {}
    };
    this.teardown = cleanup;
    try {
      await new Promise((res, rej) => {
        ms.addEventListener("sourceopen", res, { once: true });
        ms.addEventListener("sourceclose", () => rej(new Error("sourceclose")), { once: true });
      });
      if (my !== this.gen) return;
      const sb = ms.addSourceBuffer(FMP4);
      const queue = [];
      const pump = () => {
        if (sb.updating || !queue.length || my !== this.gen) return;
        try { sb.appendBuffer(queue.shift()); } catch {}
      };
      sb.addEventListener("updateend", pump);
      const res = await doFetch();
      if (!res.ok || !res.body) throw new Error(`cascade ${res.status}`);
      const reader = res.body.getReader();
      this.video.play().catch(() => {});
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (my !== this.gen) { reader.cancel(); return; }
        queue.push(value); pump();
      }
      // flush 후 종료
      const finish = () => { if (!sb.updating && !queue.length && ms.readyState === "open") { try { ms.endOfStream(); } catch {} } };
      sb.addEventListener("updateend", finish); finish();
    } catch (e) {
      console.warn("[nva-cascade] speak 실패(이 발화 드롭):", e.message);
    } finally {
      if (this.teardown === cleanup) this.teardown = null;
    }
  }
}

// cascade 연결 가능 여부 프로브 (viewer가 mock↔cascade 선택용).
export async function probeCascade(cascadeUrl) {
  try {
    const h = await (await fetch(`${cascadeUrl.replace(/\/$/, "")}/health`)).json();
    return { ok: !!h.ok, tts: !!h.tts, avatar: !!h.avatar };
  } catch {
    return { ok: false, tts: false, avatar: false };
  }
}
