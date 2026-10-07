# Issue 14: NVA completed-media format and standalone browser Player

English | [한국어](./issue-14-standalone-browser-player.ko.md)

GitHub: https://github.com/nextain/naia-video-avatar/issues/14

## Goal

Fix the first open-source experience as opening a single finished `.nva` in a
browser. NVA v0.3 is a ZIP containing idle videos, action videos, finished
speech videos with embedded audio, and playback metadata. The Player plays the
included videos as they are and does not synthesize real-time speech or lip
movement.

## Public scope

- NVA v0.3 completed-media file structure and JSON Schema
- A safe ZIP loader and validator
- A read-only web Player for idle, action, and finished speech videos
- Final NVA packaging and local sample preparation commands

Avatar and speech video generation and real-time media processing are outside
this public repository.

## Completion criteria

1. Build a deterministic v0.3 ZIP from an existing v0.2 NVA and finished speech videos with embedded audio.
2. The final ZIP keeps only public playback fields and actually referenced media.
3. Load the `.nva` with only a static HTTP server and Chromium.
4. Finished speech videos play with audio and return to muted idle after end, stop, or error.
5. Registered actions play and return to idle after end, stop, or error.
6. The default run makes no external API requests.
7. No real-time speech, lip-sync generation, Editor, or generation client exists in the public executable surface.
8. Open every prepared finished NVA from the ignored localhost catalog and play its speech.

## Non-goals

- Text input and browser speech synthesis
- Real-time lip-sync or model inference inside the Player
- A UI for editing NVA assets
- Publishing a generation server implementation or generation quality analysis
- Tracking local samples and the original face or voice assets in Git

## Format decisions

- New distributable files use `nva_version: "0.3"` and `profile: "completed-media"`.
- `speech_clips` reference only finished MP4/WebM files with embedded audio.
- v0.3 animations carry only the clip, loop, label, intent, triggers, and optional pose needed for playback.
- The JavaScript Player keeps v0.2 read compatibility so existing local assets can still be checked.
- Limits apply: bundle up to 100 MiB, 512 files, manifest 1 MiB, plus relative-path checks.

## Local samples

`scripts/prepare-local-samples.py` deterministically prepares validated input
under `examples/.local/`. The catalog records only a display name and a
same-origin relative URL, never the original absolute path. File selection and
catalog loading share one lifecycle, so a late-finishing earlier request cannot
overwrite the latest avatar.

## Verification

- Node: manifest, ZIP, Player state, public file surface, catalog, and load order
- Python: local sample preparation, final NVA determinism, cleanup, and the embedded-audio requirement
- Chromium: finished speech and action playback, return to idle, and zero external requests, console errors, and page errors
- Real assets: locally prepared final NVA samples

Research on the naturalness of real video and the generation method remain in a
separate private development scope.
