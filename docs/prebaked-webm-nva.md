# Prebaked WebM NVA State Engine

> **Held (2026-07-13):** The state is the top-level resource unit: idle video, talking-body video, face preview/bbox, and a talking-head video set. The documented `sil/a/i/u/e/o` six-clip set is a working prototype, not a final seamless-speech contract. Directional n² transitions, interpolation, or another strategy will be selected after RTX 3090 cascade benchmarking.

This document supersedes the earlier VRM-style sentence-slot draft for the current validation prototype.

The canonical portable speech contract is `manifest.state_engine`. The runtime does not cache TTS audio and does not use sentence-level baked response clips as the speech engine.

## State contract

A generated primary state is one of:

- `neutral`
- `happy`
- `sad`
- `angry`
- `surprised`
- `thinking`

Each generated state must bind:

- `idle`: full-body idle video for that emotional state
- `talking_body`: full-body talking base video for that emotional state, with the face region reserved for head overlay
- `face_preview`: cropped face/expression preview image
- `face_bbox`: normalized face rectangle `[x, y, w, h]`
- `talking_heads`: cropped talking-head video set; the preserved prototype uses `sil/a/i/u/e/o`, while the final transition keys are held for the RTX 3090 benchmark
- `sync.default_hold_ms` and `sync.heads.{viseme}` metadata

Gestures are not states. A gesture is a single motion clip kept under `manifest.animations.gesture-*` and `manifest.vrm_slots.motions.gesture-*` when present.

## Runtime preview

Editor TTS preview exercises the engine path:

```text
state idle -> state talking_body + talking_head viseme overlay -> state idle
```

The browser TTS voice is only an audio driver for validation. The NVA stores video pronunciation units, not TTS audio.

TTS review text should be natural spoken text for the target language. `aiueo` is only a viseme smoke/debug pattern, not the default Korean review utterance.

Cascade/Ditto production input is expected to be normalized before render. Raw numbers, symbols, and abbreviations should be expanded upstream into spoken-form text, for example by converting numeric strings into the intended Korean reading before sending text to TTS/Ditto.

## Prosody routing

VoxCPM2-style prosody tags are routing hints only. Tags such as `[laughing]`, `[sigh]`, `[pause]`, `[gasp]`, `[shout]`, and `[whisper]` map to available primary states. They do not create new state names.

## Rejected portable contracts

The following legacy models are rejected by the current validator and tests:

- sentence-level speech/video maps
- legacy viseme maps outside `state_engine`
- cached TTS audio paths
- top-level sentence or viseme cache fields

## Build input

`build-prebaked-nva.mjs` requires real assets:

```bash
node scripts/build-prebaked-nva.mjs \
  --source examples/naia.nva \
  --out examples/naia-prebaked.nva \
  --character naia \
  --expression-dir examples/naia-prebaked.nva/expressions \
  --state-asset-dir examples/naia-prebaked.nva/clips \
  --force
```

The builder must not synthesize text/color placeholder expression or speech assets.

## Validation gates

Current release gate:

- `npx playwright test --config src/test/playwright.config.js`
- `python src/test/playwright/phase_state_engine_playwright.py`
- `node scripts/check-traceability.mjs --enforce --strict-orphans`

Playwright artifacts are written under `.agents/work/test-results/nva-state-engine/` for visual review.
