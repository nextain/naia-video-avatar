# Issue 25 — Align Open-Source Player & Format Docs with Studio v0.2 Files

English | [한국어](./issue-25-studio-v02-alignment.ko.md)

- GitHub: https://github.com/nextain/naia-video-avatar/issues/25

## Scope

Align the open-source Player, validation core, bundle loader, and packaging tooling with Studio v0.2 distribution packages. Support composite prop action sequences, hide auxiliary clips from action menus, disambiguate duplicate action labels, and raise bundle size limits to 200 MiB archive and 400 MiB expanded assets.

## Public contract

- **Canonical Format**: NVA v0.3 `completed-media` remains canonical for new packages and public schemas; Studio v0.2 distribution files are fully supported for consumption reading and playback.
- **Prop Action Playback**: Animations containing `prop_sequence` metadata are listed as single composite actions in the UI and executed in sequence: `enter` (1x, if present) → main loop (2x with `loop: false`) → `exit` (1x, if present) → automatic idle restoration.
- **Auxiliary Clip Filtering**: Clips referenced as `prop_enter`, `prop_exit`, or listed in `prop_sequence` are excluded from the action dropdown menu and idle/talking derivation candidates.
- **Duplicate Label Disambiguation**: When multiple visible actions share the same `label`, they are presented as `${label} (${key})`.
- **Package Limits**: Archive size limit is 200 MiB (`200 * 1024 * 1024` bytes) and expanded asset sum limit is 400 MiB (`400 * 1024 * 1024` bytes).
- **Extension Tolerance**: Authoring metadata (`meta`, `expressions`, `thumbnail`, `speech_set`, `loop_crossfade_frames`, `face_bbox`) is safely accepted without breaking playback.

## Explicit exclusions

- Studio authoring editor, canvas timelines, and clip generation pipelines.
- Live client-side crossfade processing for `loop_crossfade_frames` (pre-baked in clips).
- Producer-side generation and its metadata.
- Promotion of prop sequence authoring parameters into public canonical v0.3 schema.

## Verification

Traceability mapped across REQ-029, NFR-011, NFR-015, UC-021, SPEC-025, TEST-S-025, and TEST-F-026. Verified by the Node unit suite, the Python packaging tool tests, and a browser E2E test that plays a prop sequence in Chromium.
