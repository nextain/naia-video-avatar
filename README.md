# naia-video-avatar (nva)

English | [한국어](READMES/README.ko.md)

**naia video clip avatar** — A tool-neutral exchange format (nva) for video clip-based talking head avatars, plus authoring tools (editor) and demo.

> Regardless of how the character is created (live-action footage, VRM / MetaHuman renders, or AI video generation), the final deliverable is unified as "video clips + metadata".
> The core of the format lies not in the video files alone, but in representing **clip placement, combination, and sequencing as a state machine** (inheriting game animation state machine concepts).
> Because there is currently no global open exchange standard for video talking heads (VRM is 3D, Live2D is proprietary 2D, and D-ID/HeyGen are proprietary cloud services), naia defines this **transitional open standard**.

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

> **The editor (authoring tool) and demo (showcase) are separated**. The editor is designed for general-purpose nva authoring (character-agnostic), while the demo plays the created nva via cascade.

## Format Summary (nva manifest)

- **state**: `talking` (stable talking pose with `face_bbox` defining the head talking region) or `animation` (motion). Comprises video clips and pose metadata.
- **transition**: Movement clips between poses, transitioning from `entry_pose` (from) to `exit_pose` (to).
- **scenario**: Directing sequences combining states/events, spoken lines (`say`), and timing (`dwell_ms`), automatically played by the viewer or demo.
- **Pose continuity**: Transition from A to B is valid ⟺ `A.exit_pose == B.entry_pose` (otherwise a transition clip is automatically inserted).
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

Because ffmpeg 8.1 libvpx alpha does not function in this environment (dropping the alpha channel to yuv420p), the dummy sample works around this by using **chroma keying** (`chroma_key`).
In production deployments, trt (Ditto) generates VP9 yuva420p alpha streams — the format and tools **support both alpha channels and chroma keying**.

## Rights & License

- The format specification, core library, editor, and demo are **naia (nextain) assets**. The specification is licensed under CC-BY-4.0, and the implementation is licensed under Apache-2.0 (scheduled for future open-source release).
- Character clips included in an nva bundle belong to their respective creators (manifest `meta.owner`). The TTS reference voice is configured independently at runtime outside NVA.
