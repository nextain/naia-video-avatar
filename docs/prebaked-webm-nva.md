# VRM-Style Slot NVA

This mode treats NVA as a VRM-style avatar contract backed only by generated webm clips.
The editor and runtime call stable slots, not external AI services:

- `expression`: neutral, happy, thinking, surprised, sad, angry, relaxed, empathy, guiding.
- `viseme`: sil, a, i, u, e, o, eu, eo, aiueo.
- `motion`: idle, talking, wave, nod, point, etc.
- `speech`: stable utterance ids for pre-rendered lines.

The generation pipeline may use any tool to create those clips. The NVA editor does not call that pipeline. It only loads, validates, previews, and exports the finished webm bundle.

## Manifest Contract

The existing v0.2 fields remain valid:

- `animations.*.clip`
- `animations.*.loop`
- `animations.*.can_talk`
- `animations.*.face_bbox`

Slot mode adds one canonical extension:

- `vrm_slots.profile.generation_mode = "prebaked_webm_only"`
- `vrm_slots.profile.default_locale`: default BCP-47 locale, e.g. `ko-KR`.
- `vrm_slots.profile.available_locales`: locales that already have bundled webm clips.
- `vrm_slots.profile.target_locale_sets.naia_shell_14`: Naia Shell UI locales targeted by the generation service.
- `vrm_slots.profile.tts_capabilities.voxcpm.supported_language_count = 30`: backend capacity hint for batch generation.
- `vrm_slots.expressions`: expression presets mapped to preview images and backing animations.
- `vrm_slots.visemes`: mouth-shape presets mapped to webm clips, including the aiueo test clip.
- `vrm_slots.motions`: body motion presets mapped to webm clips.
- `vrm_slots.speech`: language-neutral utterance ids mapped to intent, expression, default clip, and `by_locale`.

Naia Shell 14 target locales:

```text
ko-KR, en-US, ja-JP, zh-CN, fr-FR, de-DE, ru-RU, es-ES, ar-SA, hi-IN, bn-BD, pt-BR, id-ID, vi-VN
```

Speech slots use this shape:

```json
{
  "greeting": {
    "intent": "greeting",
    "expression": "neutral",
    "viseme": "aiueo",
    "clip": "clips/ko-KR/say-greeting.webm",
    "text": "안녕하세요. 오사랑입니다.",
    "by_locale": {
      "ko-KR": {
        "text": "안녕하세요. 오사랑입니다.",
        "clip": "clips/ko-KR/say-greeting.webm",
        "viseme": "aiueo"
      },
      "en-US": {
        "text": "Hello. I am Osarang.",
        "clip": "clips/en-US/say-greeting.webm",
        "viseme": "aiueo"
      }
    }
  }
}
```

Compatibility fields may also be present:

- `expression_states`
- `viseme_clips`
- `prebaked_speech`
- `animations.*.prebaked`
- `animations.*.utterance_id`
- `animations.*.expression_image`

## Local Build

```bash
node scripts/build-prebaked-nva.mjs --force
```

Default input:

```text
examples/osarang.nva.zip
```

Naia sample:

```bash
node scripts/build-prebaked-nva.mjs --force --source examples/naia.nva --out examples/naia-prebaked.nva --character naia
```

Default output:

```text
examples/osarang-prebaked.nva/
```

Preview:

```text
http://localhost:8785/src/main/prebaked-player.html?nva=../../examples/osarang-prebaked.nva
```

Editor:

```text
http://localhost:8785/src/main/editor.html
```

## Generation Service Shape

An avatar generation service can expose this as a job:

Input:

- character source image or short body video
- utterance list
- expression slot list
- viseme list, including aiueo
- motion slot list
- optional TTS audio for production generation

Pipeline:

- normalize the body clip
- generate expression preview images
- generate viseme clips for a/i/u/e/o and aiueo
- generate final speech webm clips for each utterance
- remux Ditto webm outputs so browser duration/seek metadata is present
- run A/V sync verification on the rendered webm, not on a muxed placeholder
- apply the measured post-render offset before registering the clip in the NVA
- write the NVA manifest
- zip the `.nva` directory

Output:

- `.nva` zip
- preview URL
- manifest metadata for marketplace/catalog use

Runtime:

- `naia-shell`, `naia-omni-windows-manager`, or a web app loads the bundle.
- Known intents select `vrm_slots.speech[id].clip`.
- Open text is handled outside the editor by mapping to an existing speech slot, queueing a generation job, or using browser TTS only for authoring tests.

## LLM Contract

The LLM should not select raw files. It should output slot keys:

```json
{
  "expression": "empathy",
  "motion": "talking",
  "speech": "empathy_help"
}
```

For a sound-only authoring check, the editor can play browser TTS from the test panel. That TTS result is not stored in the NVA and does not replace generated speech webm.

## Ditto Sync Gate

The sync check must use this order:

```text
free/local TTS wav -> Ditto render -> remux/finalize webm -> A/V sync report -> NVA speech slot
```

Do not validate lip sync by muxing a wav into an existing webm. That only proves container playback.

Current Osarang sample result:

```bash
node scripts/align-ditto-webm.mjs \
  examples/ditto-sync-sample/video/osarang-ko-sync-pattern-ditto-remux.webm \
  examples/ditto-sync-sample/video/osarang-ko-sync-pattern-aligned.webm \
  240
```

The default check uses Osarang's mouth ROI and writes a sibling `*.av-sync.json` report. The current sample lands at about `+40ms` after a `240ms` video delay, with mouth motion and positive audio/motion correlation passing.
