# naia-video-avatar (nva)

English | [한국어](READMES/README.ko.md)

**naia video clip avatar** — A tool-neutral exchange format (nva) for video clip-based talking head avatars, plus authoring tools (editor) and demo.

> Regardless of how the character is created (live action footage / VRM·MetaHuman render / AI video generation), the final deliverable is unified as "video clips + metadata".
> The core of the format is not just the video files, but the **clip placement, combination, and order = state machine** (inheriting game animation state machine concepts).
> As there is currently no global open exchange standard for video talking heads (VRM is 3D, Live2D is 2D proprietary, D-ID/HeyGen are cloud proprietary), naia defines this **transitional open standard**.

## 📍 Document Index — "What is Where"

| What | Location |
|------|------|
| **Intent & Authoring Guide** | [`docs/nva-format-guide.md`](docs/nva-format-guide.md) |
| **Format Field Spec** (states/transitions/scenarios/layers) | [`src/main/nva-schema.json`](src/main/nva-schema.json) |
| **Requirements, UCs, Specs & Tests** (V-model) | [`docs/progress/01~05`](docs/progress/) |
| **Charter & Structural Rules** | [`AGENTS.md`](AGENTS.md), [`docs/project-structure.md`](docs/project-structure.md) |
| **Editor Guide** | Upper-right **❔ Intent · Usage · Structure** button in the editor |

## Structure

```
src/main/
  nva-schema.json          Format JSON Schema (v0.1)
  nva-core.js              Validation + state machine + pose graph + scenarios (browser/node isomorphic, canonical logic)
  editor.html              ★ Authoring tool — resource/structure editing + preview player + .nva export (general-purpose)
  nva-cascade-adapter.js   cascade (/avatar) adapter (for demo)
examples/
  build-sample.sh          ffmpeg dummy box character generator
  demo.nva/                Sample bundle (manifest.json + clips/ ×7 + scenarios ×4)
docs/                      Format guide + V-model (progress/01~05)
src/test/nva-core.test.mjs Unit tests (19 asserts)
```

> **Editor (authoring tool) ↔ Demo (showcase) are separated**. The editor is for general-purpose nva authoring (character-agnostic), while the demo runs the created nva via cascade.

## Format Summary (nva manifest)

- **state**: `talking` (stable talking pose, `face_bbox` = head talking region) / `animation` (motion). Clip + pose metadata.
- **transition**: Inter-pose movement clips. `entry_pose` (from) → `exit_pose` (to).
- **scenario**: Directing sequence — states/events + spoken lines (`say`) + timing (`dwell_ms`). Auto-played by viewer/demo.
- **Pose continuity**: A → B possible ⟺ `A.exit_pose == B.entry_pose` (otherwise transition is automatically inserted).
- **Layers**: Background (`background`) + Character (alpha / `chroma_key`) + Head talking. Concurrent alpha decodes ≤ 2.

## Usage

```bash
# Local server (file:// has fetch limitations -> http recommended)
python3 -m http.server 8099
```
- **Authoring (Editor)**: `http://localhost:8099/src/main/editor.html`
  → Load demo / Open .nva → +Talking / +Motion / +Transition / +Scenario → Upload clips / edit meta → Preview → **Export .nva**
  → Built-in guide via the upper-right **❔ Intent · Usage · Structure** button

## Verification

```bash
node src/test/nva-core.test.mjs          # Unit tests (19 asserts)
node scripts/check-traceability.mjs      # V-model traceability (0 orphans)
```
Editor and demo rendering are verified via headless (Playwright) capture.

## Alpha Channel Notes

ffmpeg 8.1 libvpx alpha is inactive in this environment (drops to yuv420p) → the dummy sample works around this using **chroma keying** (`chroma_key`).
Production deployments generate VP9 yuva420p alpha via trt (Ditto) — the format and tools **support both alpha and chroma keying**.

## Rights & License

- Format specification + core/editor/demo = **naia (nextain) assets**. Spec = CC-BY-4.0 / Implementation = Apache-2.0. (Scheduled for future open-source release)
- Character clips included in an nva bundle = author's assets (manifest `meta.owner`). The TTS reference voice is an independent runtime setting outside NVA.
