# NVA speech atlas format (`speech_motion` v1)

English | [한국어](./nva-speech-atlas-format.ko.md)

This document specifies the read-side file format, byte layout, index schema, resource limits, and playback compositing rules for the NVA speech fragment bundle (`manifest.speech_motion`). For the base NVA archive structure and completed-media profile, see the [NVA Format Guide](./nva-format-guide.md).

## Public boundary

This specification defines only the read-side container layout, manifest and index fields, integrity checks, and deterministic playback rules consumed by the Player. It intentionally does not specify how speech fragments, neutral head images, or base animations are authored or produced.

---

## 1. Versions

| Scope | Field / Location | Value | Notes |
|---|---|---|---|
| NVA archive manifest | `manifest.nva_version` | `"0.2"` or `"0.3"` | `READABLE_NVA_VERSIONS = ["0.2", "0.3"]` (`src/main/nva-core.js`). Studio v0.2 bundles use `"0.2"`. |
| Speech motion extension | `manifest.speech_motion.version` | `"1"` | Required string literal. |
| Speech unit inventory | `manifest.speech_motion.inventory_version` | `"1.0.0"` | Identifies the frozen 13-unit inventory. |
| Compositing mode | `manifest.speech_motion.representation` | `"whole-head-layer"` or `"factorized-difference-layer"` | Current Studio bundles use `"whole-head-layer"`. |
| Atlas index | `speech/atlas-index.json` → `version` | `"1"` | Required string literal. |
| Provenance receipt | `speech/generation-result.json` → `version` | `"1"` | Required string literal. |
| Quality report | `speech/quality-report.json` → `version` | `"1"` | Required string literal. |
| Runtime timing plan | `SpeechPlan.version` | `"1"` | Required string literal (`aligned` or `browser-timed`). |

---

## 2. Manifest speech fields

An NVA bundle that carries a speech atlas adds the top-level `speech_motion` object to `manifest.json` alongside `canvas` and `animations`:

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
      "label": "Idle"
    },
    "talking": {
      "clip": "clips/talking-ko.webm",
      "loop": true,
      "can_talk": true,
      "face_bbox": [0.2, 0.13, 0.6, 0.29],
      "label": "Talking"
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

### `manifest.speech_motion` fields

| Field | Type | Meaning | One-line example |
|---|---|---|---|
| `version` | `string` | Schema version of the `speech_motion` extension (must be `"1"`). | `"version": "1"` |
| `representation` | `string` | Compositing representation: `"whole-head-layer"` or `"factorized-difference-layer"`. | `"representation": "whole-head-layer"` |
| `region` | `[number, number, number, number]` | Target `[x, y, width, height]` pixel rectangle on the canvas (required when `representation` is `"whole-head-layer"`). | `"region": [104, 96, 512, 512]` |
| `inventory_version` | `string` | Version of the speech unit inventory (must be `"1.0.0"`). | `"inventory_version": "1.0.0"` |
| `inventory` | `string[]` | Ordered list of the 13 speech units; must match the frozen inventory in exact order. | `"inventory": ["sil", "closed", ..., "vowel-round"]` |
| `neutral_head` | `string` | Bundle-relative path to the neutral closed-mouth head PNG image. | `"neutral_head": "speech/neutral-head.png"` |
| `atlas` | `string` | Bundle-relative path to the concatenated WebM fragment binary. | `"atlas": "speech/atlas.bin"` |
| `atlas_index` | `string` | Bundle-relative path to the JSON byte-range index for `atlas.bin`. | `"atlas_index": "speech/atlas-index.json"` |
| `validation_report` | `string` | Bundle-relative path to the per-slice validation report JSON. | `"validation_report": "speech/validation-report.json"` |
| `quality_report` | `string` | Bundle-relative path to the continuity/quality report JSON. | `"quality_report": "speech/quality-report.json"` |
| `provenance` | `string` | Bundle-relative path to the bundle receipt JSON (`"speech/generation-result.json"`). | `"provenance": "speech/generation-result.json"` |

### Related manifest fields used with speech playback

- `canvas`: `{ width, height, fps }` — sets the compositing canvas dimensions (standard portrait `720×1280`, `fps: 24` or `25`).
- `animations.idle`: `{ clip, loop: true, can_talk: false }` — default silent loop played when not speaking.
- `animations.talking`: `{ clip, loop: true, can_talk: true, face_bbox }` — base body loop played underneath the head region while `SpeechPlayer` is speaking. (`face_bbox` is producer metadata in `whole-head-layer` mode; the player uses `speech_motion.region`.)
- `speech_clips`: optional map of pre-recorded utterance clips (`{ clip, audio: "embedded", language | locale, label, text?, duration_ms? }`) played directly as standalone videos when matching a fixed phrase.

All file paths in `speech_motion` must be bundle-relative paths without leading slashes, URL schemes, backslashes, or `.` / `..` segments. Every field in `manifest.speech_motion` must match the corresponding field and asset path in `speech/generation-result.json` (`verifySpeechMotionBundle` in `speech-bundle.js`).

---

## 3. Canvas `720×1280` and head region coordinates `[104, 96, 512, 512]`

- **Canvas size**: Standard bundles use a vertical `720×1280` canvas (`canvas.width = 720`, `canvas.height = 1280`).
- **Head region (`speech_motion.region`)**: Expressed as four integers `[x, y, width, height]` in canvas pixel coordinates with top-left origin `(0, 0)`:
  - `width` and `height` must be positive even integers (`w > 0`, `h > 0`, `w % 2 === 0`, `h % 2 === 0`). All canonical bundles use `512×512`.
  - The rectangle must lie completely inside the canvas (`x >= 0`, `y >= 0`, `x + width <= canvas.width`, `y + height <= canvas.height`).
- **Standard placements on `720×1280`**:
  - Horizontal centering: `x = (720 - 512) / 2 = 104` (covering `x = 104..616`).
  - `[104, 96, 512, 512]` (used in `naia`): `512×512` head box placed at `x = 104`, `y = 96` (covering `y = 96..608`).
  - `[104, 0, 512, 512]` (used in `jina` and `jina-anime`): `512×512` head box placed at the top edge `x = 104`, `y = 0` (covering `y = 0..512`).
- Note: When `representation === "whole-head-layer"`, `SpeechPlayer` reads `speech_motion.region` and ignores any auxiliary region metadata in `speech_motion` or `animations.talking`.

---

## 4. `neutral_head` (`speech/neutral-head.png`)

- **Path**: Referenced by `manifest.speech_motion.neutral_head` (`"speech/neutral-head.png"`) and bound to the `"neutral_head"` asset entry in `speech/generation-result.json` (verified by byte size and SHA-256).
- **Encoding and dimensions**: `512×512` RGBA PNG (`image/png`) matching the `[width, height]` of `speech_motion.region`.
- **Visual content**: The character's neutral, closed-mouth head crop aligned to the `talking` base clip at `speech_motion.region`.
- **Playback role**: Decoded once into an `ImageBitmap` via `createImageBitmap` during bundle load (`speech-player.js`). On every speech frame, `neutral_head` is drawn first at `speech_motion.region` (`globalAlpha = 1`, `source-over`) on top of `bodyVideo` before any active `atlas.bin` fragment layer is composited.

---

## 5. `speech/atlas.bin` byte layout

`speech/atlas.bin` is a single uncompressed binary file containing concatenated standalone WebM video clips (`video/webm`):

```text
speech/atlas.bin
┌──────────────────────────────────────────┬────────────────────────────────────────────────┬─────┐
│ Slice 0: "alveolar>alveolar"             │ Slice 1: "alveolar>alveolar>alveolar"          │ ... │
│ offset: 0                                │ offset: length_0                               │     │
│ length: length_0                         │ length: length_1                               │     │
│ EBML (1A 45 DF A3) ... VP9 lossless WebM │ EBML (1A 45 DF A3) ... VP9 lossless WebM       │     │
└──────────────────────────────────────────┴────────────────────────────────────────────────┴─────┘
0                                          length_0                        length_0 + length_1   atlasBytes
```

- **Standalone WebM slices**: Each slice `[offset, offset + length)` is a complete, self-contained WebM container beginning with the 4-byte EBML header `1A 45 DF A3`. There is no global file header, footer, or inter-slice padding.
- **Fragment encoding**:
  - Container: WebM (`video/webm`)
  - Video codec: VP9 lossless (`codec: "vp09.00.10.08"`, `lossless: true`) with alpha channel (`yuva420p`, `has_alpha: true`)
  - Resolution: `512×512` pixels
  - Frame count and rate: `5` frames (`frames: 5`, all 5 keyframes) at `25` fps (`fps: 25`, `40 ms` per frame, `200 ms` total duration)
- **Ordering and contiguous offsets**:
  - Slices are stored in ASCII lexicographical order of their key (`"alveolar>alveolar"` first at `offset: 0`, `"vowel-spread>vowel-spread>alveolar"` last).
  - When sorted by `offset`, the byte ranges `[offset, offset + length)` must cover `[0, atlasBlob.size)` contiguously without gaps or overlaps (`validateSpeechAtlasIndex` in `speech-atlas-index.js`):
    - Slice 0 must start at `offset = 0`.
    - Slice $i$ must start at `offset_i = offset_{i-1} + length_{i-1}`.
    - The end of the last slice must equal `atlasBlob.size`.
- **Byte range access (`SpeechAtlasSource` in `speech-atlas-source.js`)**:
  - From an in-memory or local `Blob`, the player extracts a clip via `blob.slice(offset, offset + length, "video/webm")`.
  - From a URL source, the player requests `Range: bytes=${offset}-${offset + length - 1}`. If the server responds with `206 Partial Content` and a matching `Content-Range: bytes start-end/...`, the slice is used directly; if the server responds with `200 OK`, the full blob is cached and sliced locally.

---

## 6. `speech/atlas-index.json` field specification

`speech/atlas-index.json` maps each unit transition key to its exact byte range and encoding parameters in `speech/atlas.bin`.

### Top-level fields

| Field | Type | Meaning | One-line example |
|---|---|---|---|
| `version` | `string` | Format version of the atlas index; must be `"1"`. | `"version": "1"` |
| `entries` | `Record<string, AtlasEntry>` | Non-empty dictionary mapping each transition key (`A>B` or `A>B>C`) to its slice metadata. | `"entries": { "alveolar>alveolar": { "offset": 0, ... } }` |

### Entry fields (`entries[key]`)

| Field | Type | Meaning | One-line example |
|---|---|---|---|
| `offset` | `integer` | Zero-based inclusive start byte offset of the WebM slice in `speech/atlas.bin` (`>= 0`). | `"offset": 0` |
| `length` | `integer` | Byte length of the WebM slice in `speech/atlas.bin` (`> 0`); exclusive end is `offset + length`. | `"length": 619286` |
| `sha256` | `string` | 64-character lowercase hexadecimal SHA-256 hash of `atlas.bin[offset : offset + length]`. | `"sha256": "6b4f30bcf0ab8ce428192e327f32d15bf8539d42c79df10e30d66962c61f1447"` |
| `frames` | `integer` | Number of video frames in the slice; must be `5`. | `"frames": 5` |
| `fps` | `integer` | Frame rate of the slice in frames per second; must be `25`. | `"fps": 25` |
| `codec` | `string` | WebM video codec string; must be `"vp09.00.10.08"`. | `"codec": "vp09.00.10.08"` |
| `lossless` | `boolean` | Flag indicating lossless VP9 encoding; must be `true`. | `"lossless": true` |

---

## 7. Key inventory, naming rules, and 233-key composition (`169 + 64`)

### Frozen 13-unit speech inventory (`inventory_version: "1.0.0"`)

All keys are built from the frozen 13-unit articulatory inventory (`SPEECH_UNITS` in `speech-plan.js`):

1. `sil`
2. `closed`
3. `labiodental`
4. `dental`
5. `alveolar`
6. `postalveolar`
7. `palatal`
8. `velar`
9. `glottal`
10. `vowel-open`
11. `vowel-mid`
12. `vowel-spread`
13. `vowel-round`

### Key naming rules

- Each key consists of 2 or 3 unit names from the 13-unit inventory joined by the `>` delimiter with no spaces:
  - **2-unit directional pair key**: `<previous_unit>><current_unit>` (e.g., `"sil>vowel-open"`, `"alveolar>alveolar"`).
  - **3-unit context key**: `<previous_unit>><current_unit>><next_unit>` (e.g., `"alveolar>vowel-open>alveolar"`).
- Any key with fewer than 2 segments, more than 3 segments, or any segment outside the 13-unit inventory is rejected by `validateSpeechAtlasIndex`.
- Every 3-unit context key `A>B>C` requires its corresponding 2-unit pair fallback `A>B` to exist in `entries`.

### Composition of the 233 keys (`169` pair transitions + `64` three-unit context keys)

A full canonical bundle (`jina`, `jina-anime`, `naia`) contains **233** entries in `speech/atlas-index.json`:

1. **169 directional pair keys (`previous>current`)**:
   - All $13 \times 13 = 169$ ordered pairs of the 13 speech units (including the 13 self-transitions `u>u` and 156 cross-unit transitions `u>v`).
2. **64 three-unit context keys (`previous>current>next`)**:
   - In `speech-atlas-index.js` and `speech-runtime.js`, the additional 64 entries are 3-unit context transitions (64 three-unit context keys, `contextKeys`) that specialize `previous>current` when immediately followed by `next`:
   - `alveolar>alveolar>alveolar`, `alveolar>alveolar>vowel-mid`, `alveolar>alveolar>vowel-open`, `alveolar>alveolar>vowel-round`, `alveolar>alveolar>vowel-spread`, `alveolar>glottal>vowel-open`, `alveolar>glottal>vowel-round`, `alveolar>vowel-mid>alveolar`, `alveolar>vowel-mid>closed`, `alveolar>vowel-mid>postalveolar`, `alveolar>vowel-mid>velar`, `alveolar>vowel-open>alveolar`, `alveolar>vowel-open>velar`, `alveolar>vowel-open>vowel-spread`, `alveolar>vowel-round>alveolar`, `alveolar>vowel-round>postalveolar`, `alveolar>vowel-round>vowel-round`, `alveolar>vowel-round>vowel-spread`, `alveolar>vowel-spread>alveolar`, `alveolar>vowel-spread>closed`, `alveolar>vowel-spread>postalveolar`, `alveolar>vowel-spread>velar`, `alveolar>vowel-spread>vowel-mid`, `alveolar>vowel-spread>vowel-spread`, `closed>vowel-mid>alveolar`, `closed>vowel-open>alveolar`, `glottal>vowel-open>alveolar`, `postalveolar>glottal>vowel-spread`, `postalveolar>vowel-open>closed`, `postalveolar>vowel-open>vowel-spread`, `postalveolar>vowel-spread>alveolar`, `velar>alveolar>vowel-spread`, `velar>vowel-mid>alveolar`, `vowel-mid>alveolar>alveolar`, `vowel-mid>alveolar>vowel-mid`, `vowel-mid>alveolar>vowel-open`, `vowel-mid>alveolar>vowel-round`, `vowel-mid>alveolar>vowel-spread`, `vowel-mid>postalveolar>vowel-open`, `vowel-mid>postalveolar>vowel-spread`, `vowel-mid>velar>alveolar`, `vowel-open>alveolar>alveolar`, `vowel-open>alveolar>vowel-mid`, `vowel-open>alveolar>vowel-spread`, `vowel-open>closed>vowel-mid`, `vowel-open>postalveolar>vowel-open`, `vowel-open>vowel-spread>alveolar`, `vowel-round>alveolar>alveolar`, `vowel-round>alveolar>velar`, `vowel-round>alveolar>vowel-mid`, `vowel-round>alveolar>vowel-round`, `vowel-round>alveolar>vowel-spread`, `vowel-round>postalveolar>vowel-open`, `vowel-round>vowel-mid>alveolar`, `vowel-round>vowel-round>alveolar`, `vowel-round>vowel-spread>vowel-spread`, `vowel-spread>alveolar>alveolar`, `vowel-spread>alveolar>vowel-mid`, `vowel-spread>alveolar>vowel-open`, `vowel-spread>alveolar>vowel-round`, `vowel-spread>alveolar>vowel-spread`, `vowel-spread>postalveolar>vowel-open`, `vowel-spread>vowel-mid>alveolar`, `vowel-spread>vowel-spread>alveolar`.

---

## 8. Size and count limits

| Resource / Parameter | Limit | Enforcement location |
|---|---|---|
| **Speech assets total size** (`neutral_head` + `atlas` + `atlas_index` + `validation_report` + `quality_report`) | **160 MiB** (`167,772,160` bytes) | Producer-side limit. Excludes `provenance` (`speech/generation-result.json`) and auxiliary files. |
| **Compressed `.nva` archive size** | **200 MiB** (`209,715,200` bytes) | `MAX_ARCHIVE_BYTES` (`src/main/nva-bundle-loader.js`). |
| **Expanded bundle size** | **400 MiB** (`419,430,400` bytes) / **256 MiB** (`268,435,456` bytes in JSZip budget) | `MAX_EXPANDED_BYTES` (`nva-bundle-loader.js`) / `DEFAULT_MAX_BYTES` (`zip-budget.js`). |
| **Maximum file count in archive** | **512** files | `MAX_FILES` (`nva-bundle-loader.js`, `zip-budget.js`). |
| **Maximum `manifest.json` size** | **1 MiB** (`1,048,576` bytes) | `MAX_MANIFEST_BYTES` (`nva-bundle-loader.js`, `zip-budget.js`). |
| **Maximum `speech_clips.*.text` length** | **10,000** characters | `validateManifest` (`nva-core.js`). |
| **Directional pair entries (`A>B`)** | At most **169** | `validateSpeechAtlasIndex` (`speech-atlas-index.js`). |
| **Three-unit context entries (`A>B>C`)** | At most **64** | `validateSpeechAtlasIndex` (`speech-atlas-index.js`). |
| **Total `atlas-index.json` entries** | **1 to 233** (`233` in full canonical bundles) | `validateSpeechAtlasIndex` (`speech-atlas-index.js`). |
| **Active decoded speech `<video>` elements** | At most **3** active (`maxActiveEntries = Math.min(3, maxEntries)`) | `SpeechVideoCache` (`speech-player.js`, `speech-browser-runtime.js`). |

---

## 9. Playback rules

This section follows the host renderer in `naia-shell` (`PrebakedAvatarRenderer`). The standalone player in this repository, `NvaAnimationPlayer` (`src/main/nva-animation-player.js`), plays clips only and does not composite speech atlases.

### 9.1 Idle playback (when not speaking)

- On startup (`PrebakedAvatarRenderer.start`), the renderer resolves the default idle animation (`loop: true`, `can_talk: false`, non-transition `entry_pose === exit_pose`, preferring the `scenario` `start` target when valid, or an active `idleOverride`) and plays its video muted in a continuous loop (`loop = true`, `muted = true`).
- While `speechStage.speaking` is `false`, `PrebakedAvatarRenderer.startDrawLoop` draws the hidden decode `<video>` onto the visible `<canvas>` every animation frame (fitted via `containRect`, with optional stacked-alpha, chromakey, or alpha-repair processing and optional procedural breathing/sway motion).

### 9.2 Speaking playback (compositing over the `talking` base clip)

#### Producer requirement for the `talking` base clip

The speech atlas format is designed around a separation between body posture and mouth articulation:
- **Producer requirement**: The `animations.talking` video (`loop: true`, `can_talk: true`) must be a looping base body clip in which the character's mouth remains fixed in a neutral/closed state and the head remains aligned with `speech_motion.region` and `neutral_head`. All visible mouth movement during speech comes from `neutral_head` and the `atlas.bin` fragments composited into `speech_motion.region`. The Player does not modify the `talking` video; it draws `bodyVideo` across the full canvas and composites `neutral_head` and the active `atlas.bin` layers on top at `speech_motion.region`.

#### Timing schedule and fragment selection (`speech-plan.js`, `speech-runtime.js`)

1. **Plan modes**: `CanonicalSpeechStage` accepts only `SpeechPlan` objects with `quality_mode: "aligned"` (driven by the audio playback clock `clock()` of the sound being played) or `quality_mode: "browser-timed"` (driven by elapsed utterance time since `onstart` and revised on `boundary` events via `updateExternalPlan`).
2. **Short-event normalization (`normalizeShortSpeechEvents`)**: Contiguous `plan.events` (`start_us` to `end_us`, covering `0..audio.duration_us`) shorter than `40,000 µs` (`40 ms`) are iteratively merged by finding the globally shortest event (earlier index wins ties) and merging it into its longer neighbor (next/right neighbor wins ties) until all remaining events are `>= 40,000 µs`.
3. **Transition key selection (`buildSpeechSchedule`)**: For each event index $i \ge 1$ (`previous = events[i - 1]`, `current = events[i]`, `next = events[i + 1]`):
   - If `next` exists and `${previous.unit}>${current.unit}>${next.unit}` is present in `atlasIndex.entries`, that 3-unit context key is selected.
   - Otherwise, the 2-unit pair key `${previous.unit}>${current.unit}` is selected.
4. **Frame timestamps and playback rate**:
   - Each transition is anchored at `boundary_us = current.start_us`.
   - If the allocated span `current.end_us - current.start_us` is `< 80,000 µs` (`80 ms`), `playback_rate = Math.min(2, 80_000 / span)`; for spans `>= 80,000 µs`, `playback_rate = 1`.
   - The 5 frames of the clip are scheduled at `boundary_us + Math.round(offset / playback_rate)` for `offset` in `[-80_000, -40_000, 0, 40_000, 80_000]` µs.
   - During preparation (`#loadMotion`), the first **2** unique transition clips in the schedule are prefetched and decoded before playback begins (`prefetchSpeechRanges`).
5. **Layer resolution and crossfading (`resolveSpeechLayers`)**:
   - At audio clock instant `timeUs` (clamped to `[0, schedule.duration_us]`):
   - If `transitions` is empty or `timeUs < transitions[0].frame_times_us[0]`, no transition layer is returned (`[]`).
   - Between adjacent transitions `left = transitions[i]` and `right = transitions[i + 1]`, ownership switches around `midpoint = Math.round((left.boundary_us + right.boundary_us) / 2)` with a crossfade window `[midpoint - 40_000, midpoint + 40_000]` µs (`80 ms` total, spanning two 25 fps frames).
   - Before `midpoint - 40,000 µs`, only `left` is active with `opacity = 1`.
   - Inside `[midpoint - 40,000, midpoint + 40,000] µs`, both `left` and `right` are active with raised-cosine weights:
     $$\text{progress} = \frac{\text{timeUs} - (\text{midpoint} - 40000)}{80000}, \quad \text{rightOpacity} = \frac{1 - \cos(\pi \cdot \text{progress})}{2}, \quad \text{leftOpacity} = 1 - \text{rightOpacity}$$
   - For each active layer, the frame index $f \in \{0, 1, 2, 3, 4\}$ is `clamp(0, 4, Math.round((timeUs - frame_times_us[0]) / (40_000 / playback_rate)))`, and its `<video>` is seeked to `targetTime = f / 25` seconds whenever `|video.currentTime - targetTime| > 0.005` s.

#### Per-frame compositing order (`SpeechPlayer.#draw`, `PrebakedAvatarRenderer.startDrawLoop`)

On every `requestAnimationFrame` tick while `SpeechPlayer.state === "speaking"`:

1. **Clear offscreen speech canvas**: `context.clearRect(0, 0, canvas.width, canvas.height)` (`720×1280`).
2. **Draw `talking` base video (`bodyVideo`)**: `context.drawImage(bodyVideo, 0, 0, canvas.width, canvas.height)` (looping, muted).
3. **Draw `neutral_head` at `region`**: With `globalCompositeOperation = "source-over"` and `globalAlpha = 1`, draw `neutral_head` (`512×512`) into `region = [x, y, width, height]`.
4. **Draw active `atlas.bin` transition layer(s) at `region`**:
   - In `"whole-head-layer"` mode (`drawBlendedWholeHeadSpeechFrame`):
     - If at least one ready layer is present, draw `readyLayers[0].image` into `region` with `globalAlpha = 1`.
     - If a second crossfade layer `readyLayers[1]` is present with `opacity > 0`, draw `readyLayers[1].image` into `region` on top with `globalAlpha = readyLayers[1].opacity`.
   - In `"factorized-difference-layer"` mode (`drawBlendedFactorizedSpeechFrame`):
     - Draw each layer in `readyLayers` into `region` with `globalAlpha = layer.opacity`.
5. **Lookahead prefetch**: When a single layer at schedule index `current` is active, prefetch transition `Math.min(current + 1, schedule.transitions.length - 1)` in the background.
6. **Composite onto display canvas**: While `speechStage.speaking` is `true`, `PrebakedAvatarRenderer` reads `speechStage.canvas` as its frame source and draws it onto the visible `<canvas>`.

### 9.3 Fallback behavior when fragments or assets are missing or broken

The player follows strict fail-closed rules without inventing synthetic mouth movements:

1. **Missing 3-unit context key (`A>B>C`)**:
   - `buildSpeechSchedule` automatically falls back to the 2-unit directional pair key `A>B` (`speech-runtime.js`).
2. **Missing 2-unit pair key (`A>B`), invalid `SpeechPlan`, or bundle verification failure**:
   - During `prepare()`, `verifySpeechMotionBundle` checks that `speech/generation-result.json` is valid, that every `speech_motion` field matches the receipt, that all 5 speech assets match their declared byte lengths and SHA-256 hashes, that `speech/atlas-index.json` passes `validateSpeechAtlasIndex`, and that every slice `[offset, offset + length)` in `speech/atlas.bin` matches its `sha256`.
   - If any check fails or a required `A>B` key is missing, `CanonicalSpeechStage.prepare()` logs a warning, calls `player.stop("error")`, and returns `null` (`start()` resolves to `false`). `speechStage.speaking` remains `false`, and the renderer continues displaying the `idle` clip.
3. **Speaking state without an active `SpeechPlan` (`setSpeakingVisual(true)`)**:
   - If `speechStage` exists, `speechStage.assetsLoaded === false`, `!speechStage.speaking`, and `manifest.animations.talking?.clip` is defined, `playIdle()` selects `animations.talking.clip` (muted loop) as `fallbackClip` while speech assets are not yet loaded (`prebaked-renderer.ts`).
   - Otherwise (when speech assets are already loaded or `speech_motion` is absent, and no `SpeechPlan` is running), the avatar keeps playing the `idle` clip without mouth approximation.
4. **Fragment slice still loading on a draw frame (cache miss)**:
   - Before the first transition's first frame timestamp (`timeUs < transitions[0].frame_times_us[0]`), or if the active transition's `<video>` is still decoding in `SpeechVideoCache` (`speechVideoCache.get(key) === null`), `SpeechPlayer.#draw` queues `#ensureTransition(layer.index)` and skips that layer for the current frame. If `readyLayers` is empty, `bodyVideo` + `neutral_head` (at `region`) is drawn. If one of two crossfade layers is ready, the ready layer is drawn.
5. **Fragment slice read failure or WebM decode error**:
   - If `SpeechAtlasSource.read` fails (out-of-bounds range or HTTP error) or the browser `<video>` element fires an `"error"` event (`"speech unit decode failed"`), `SpeechPlayer` immediately calls `this.stop("error")` (`speech-player.js`).
   - `SpeechPlayer.state` exits `"speaking"`, `CanonicalSpeechStage.speaking` becomes `false`, and `PrebakedAvatarRenderer.startDrawLoop` immediately reverts the visible canvas source to the `idle` `<video>` clip.
6. **End of speech or interruption**:
   - When `setSpeakingVisual(false)` or `interrupt()` is called (or audio playback ends), `speechStage.stop()` cancels the active speech token, pauses the internal `bodyVideo`, and `PrebakedAvatarRenderer` resumes `playIdle()`.
