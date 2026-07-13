# NVA TTS-independent pronunciation video cache contract

> **Held prototype (2026-07-13):** This document records the six-clip pronunciation experiment. It does not define the final talking-head continuity contract. State-level idle/talking-body/talking-head grouping remains valid; the internal head transition representation waits for RTX 3090 cascade benchmarking.

Date: 2026-07-12

## Goal

NVA must not depend on a specific TTS provider.

The held prototype caches six standalone mouth-shape videos. Runtime TTS audio is generated or supplied independently, then aligned to the provisional state/head videos. This does not define the final talking-head continuity contract.

## Cached assets

For each state:

```txt
clips/{state}/idle.webm
clips/{state}/talking-body.webm
clips/{state}/head-sil.webm
clips/{state}/head-a.webm
clips/{state}/head-i.webm
clips/{state}/head-u.webm
clips/{state}/head-e.webm
clips/{state}/head-o.webm
```

The cache unit is:

```ts
{
  character_id: string,
  state: string,
  viseme: string,
  face_bbox: [number, number, number, number],
  source_face_hash?: string,
  generator?: "ditto" | string,
  generator_params_hash?: string,
  clip: string,
  sync: {
    fps: number,
    duration_ms: number,
    loopable: boolean,
    hold_min_ms: number,
    hold_max_ms: number,
    mouth_peak_ms: number
  }
}
```

Audio is not part of this cache.

## Runtime input

Any TTS can be used:

- Browser SpeechSynthesis
- Google TTS
- Typecast
- ElevenLabs
- VoxCPM2
- recorded WAV/PCM
- external audio URL

Runtime input shape:

```ts
{
  text: string,
  audio?: AudioBuffer | PCM | URL,
  source?: "phoneme" | "boundary" | "text" | "fallback",
  metadata?: {
    phonemes?: Array<{ t_ms: number, phoneme?: string, viseme?: string }>,
    boundaries?: Array<{ t_ms?: number, elapsedTime?: number, charIndex?: number }>
  }
}
```

## Timeline adapter priority

The engine must derive a `VisemeTimeline` without depending on a provider:

```ts
type VisemeTimeline = Array<{ t_ms: number, viseme: string, source: string }>;
```

Priority:

1. Provider phoneme/viseme timestamps.
2. Provider word/char boundary timestamps plus text-to-viseme mapping.
3. Audio-only onset/energy fallback.
4. Text-duration heuristic fallback.

## Playback contract

For a selected state:

```txt
idle:
  play {state}.idle

speaking:
  play {state}.talking-body as looping body layer
  select {state}.head-{viseme} according to VisemeTimeline
  composite head clip at face_bbox

after speech:
  return to same {state}.idle
```

## Current implementation status

- Implemented in editor/core:
  - `buildTtsVisemeTimeline`
  - `textToViseme`
  - `visemeAtTime`
  - `buildStateSpeechPlan`
  - Browser SpeechSynthesis boundary support with timeline fallback
- Implemented in manifest/schema:
  - state-level `sync.default_hold_ms`
  - viseme head sync metadata
- Not implemented yet:
  - audio-only onset/energy fallback
  - measured Ditto clip sync extraction
  - TalkingKiosk/cascade runtime consumption of `state_engine`
  - production phoneme adapters per TTS provider
