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

- archive and expanded content: 100 MiB maximum;
- file count: 512 maximum;
- manifest: 1 MiB maximum;
- speech text metadata: 10,000 characters maximum.

## Public boundary

The format describes only finished media and playback metadata. It does not
define how avatars, speech videos, audio, timing, or lip movement are produced.
Applications needing live generation use a separate private runtime rather than
extending this public Player contract.

## v0.2 compatibility

The Player can still open existing v0.2 files for viewing. Authors should use
v0.3 for new distributable NVA files because it omits generation-oriented and
real-time fields. The v0.2 speech clip `locale` field is read as a read-only
alias of `language`.
