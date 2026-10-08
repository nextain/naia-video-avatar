# NVA v0.3 completed-media format

English | [한국어](./nva-format-guide.ko.md)

An NVA file is a ZIP archive that a browser can play without GPU inference.
Version 0.3 is a delivery format: all speech and animation media is already
finished before packaging.

## Required manifest fields

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

## Playback rules

- At least one animation must be an idle loop (`loop: true`).
- A speech clip is a complete MP4 or WebM with embedded audio.
- The Player plays idle and action media muted, and speech media with audio.
- When an action or speech video ends or fails, the Player returns to idle.
- `language` uses a BCP 47 tag such as `ko-KR`, `en-US`, or `ja-JP`.
- All paths are relative ZIP paths. Absolute paths, URLs, backslashes, and `..`
  segments are rejected.

## Limits

- archive: 200 MiB maximum;
- expanded content: 400 MiB maximum;
- file count: 512 maximum;
- manifest: 1 MiB maximum;
- speech text metadata: 10,000 characters maximum.

## Public boundary

The format describes only finished media and playback metadata. It does not
define how avatars, speech videos, audio, timing, or lip movement are produced.
Applications needing live generation use a separate private runtime rather than
extending this public Player contract.

## Studio v0.2 profile

The Player supports reading and playback of Studio v0.2 distribution files.
Newly authored public packages should use v0.3 completed-media.

### Manifest fields and Player behavior

| Field | Description | Player behavior |
|---|---|---|
| `nva_version` | Format version string (`"0.2"`). | Used for playback (activates v0.2 compatibility profile). |
| `canvas` | Dimensions and frame rate `{ width, height, fps }`. | Used for playback (canvas dimensions set aspect ratio; `fps` is informational). |
| `background` | Background styling `{ type, color, src }`. | Used for playback (configures transparent or solid preview). |
| `expressions` | State-to-animation mapping `{ neutral, listening, speaking }`. | Producer metadata (ignored by Player). |
| `thumbnail` | Relative image path within the ZIP archive. | Display only (preview image). |
| `meta` | Metadata `{ name, tagline, persona, voice, ... }`. | Display only (`name` displayed in UI status; other fields are producer metadata ignored by Player). |
| `speech_set` | Producer speech definitions. | Producer data (not read by Player / ignored). |
| `speech_clips.*.locale` | Legacy BCP 47 language code. | Read-only alias of `language`. |

### Animation fields and prop sequence rules

- **Common animation fields**:
  - `clip`: relative path to WebM/MP4 clip (Used for playback).
  - `loop`: boolean loop flag (Used for playback).
  - `can_talk`: indicates talking capability (Used for playback: distinguishes idle from talking loop).
  - `label`: UI action label (Display only: duplicate labels in v0.2 produce warnings and display as `label (key)`).
  - `loop_crossfade_frames`: crossfade frame count already blended into the clip (Informational: frames are already baked into the clip; the Player does not perform additional crossfading).
  - `sha256`, `frames`, `duration_s`: media metrics (Producer data: not read by Player / ignored).
  - `face_bbox`: `[x, y, w, h]` normalized face bounding box on talking clip (Producer data: not read by Player / ignored).
  - `idle`, `talking`: base looping animations (`idle` is always first; `talking` is played via `playTalking`).

- **Prop action sequence rules**:
  - Main action `X`: `loop: true`, `can_talk: false`, `prop_sequence: { enter: "X__enter", exit: "X__exit" }`.
  - Auxiliary clips `X__enter` / `X__exit`: `loop: false`, `role: "prop_enter"|"prop_exit"`, `parent: "X"`.
  - Sequence playback: `enter` (if present) 1x → `X` 2x (`loop: false` for both) → `exit` (if present) 1x → automatic idle restoration.
  - If a producer provides `prop_sequence` without `enter` or `exit` clips, playback executes `X` 2x (`loop: false`) and returns to idle.
  - Auxiliary clips and the raw prop action are excluded from standard action lists; the prop action appears as a single item in the action selector.
  - Any reference in `prop_sequence` to a missing animation key emits a warning during validation rather than a fatal error.
  - Producer metadata outside the fields above is producer data; the Player does not read it.
