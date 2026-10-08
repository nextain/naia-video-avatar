# NVA Avatar Player

English | [한국어](READMES/README.ko.md)

NVA is a ZIP-based video avatar format for GPU-free browser playback. An NVA
v0.3 file contains completed idle, action, and speech videos plus a small JSON
manifest. Speech videos already contain their audio, so the Player only decodes
and plays packaged media.

This repository contains:

- the public NVA v0.3 completed-media schema and validator;
- a dependency-free ZIP loader;
- a read-only web Player;
- deterministic local packaging and validation tools.

It intentionally does not contain avatar generation, text-to-speech, real-time
lip sync, model inference, or an Editor.

## Try the Player

Serve the repository with any static web server:

```bash
python3 -m http.server 8099 --bind 127.0.0.1
```

Open `http://127.0.0.1:8099/src/main/viewer.html`, choose an `.nva` file, then
play one of its packaged speech videos or actions. A background color or a
local image can be chosen to preview the transparent character in a service
layout. No account, key, server-side
application, GPU, or network API is required after the file has loaded.

## NVA v0.3 layout

```text
avatar.nva
├── manifest.json
├── clips/
│   ├── idle.webm
│   └── wave.webm
└── speech/
    ├── greeting-ko.mp4
    └── greeting-en.mp4
```

The `.nva` extension is a regular ZIP archive. `manifest.json` uses
`nva_version: "0.3"` and `profile: "completed-media"`. Every `speech_clips`
entry references a finished MP4 or WebM with embedded audio and a BCP 47
language tag. See [the format guide](docs/nva-format-guide.md).

## Build a final NVA

The packager converts an existing v0.2 NVA directory or ZIP plus one or more
finished speech videos into a deterministic v0.3 delivery file:

```bash
python3 scripts/build-final-nva.py \
  --base /path/to/legacy-avatar.nva \
  --speech 'hello-ko|ko-KR|Korean greeting|/path/to/hello-ko.mp4' \
  --speech 'hello-en|en-US|English greeting|/path/to/hello-en.mp4' \
  --output /path/to/avatar-final.nva
```

Each speech input must match the NVA canvas and contain both video and embedded
audio. The packager retains only media referenced by the final public manifest.

Private samples can be made available to localhost without recording their
source paths:

```bash
python3 scripts/prepare-local-samples.py \
  --sample 'First avatar=/path/to/first-final.nva' \
  --sample 'Second avatar=/path/to/second-final.nva'
```

Then open:

```text
http://127.0.0.1:8099/src/main/viewer.html?catalog=../../examples/.local/catalog.json
```

`examples/.local/` is ignored by Git.

## Validate

```bash
node --test src/test/*.test.mjs
python3 src/test/local-sample-prep.test.py
python3 src/test/final-nva.test.py
node scripts/check-traceability.mjs
./scripts/enforce-root-structure.sh
```

Browser integration tests are in `src/test/standalone-player.e2e.py` and
`src/test/local-samples.e2e.py`.

## How this repository relates to naia-adk and naia-pj-adk

- **naia-adk** (https://github.com/nextain/naia-adk): The open personal ADK base that defines workspace structure and tool-neutral agent contracts.
- **naia-pj-adk** (https://github.com/nextain/naia-pj-adk): An open team project ADK that enables teams using multiple tools and workspaces to collaborate under unified project rules. It provides project adapters, verifiable workflows, and canonical standard artifacts (PC → SP → UC → RQ → PL → FE, UT → IT → E2E → QC).
- **naia-video-avatar**: A product repository. Rather than being a fork or template clone, it adopts the standard workflow and artifact rules of naia-pj-adk. Artifact locations follow the mapping table in [docs/planning/README.md](docs/planning/README.md), and naia-pj-adk's project adapter `projects/naia-video-avatar/` references this repository.

```text
naia-adk (Personal ADK base · tool-neutral contracts)
  └── naia-pj-adk (Team project ADK · standard workflow & canonical artifacts)
        └── naia-video-avatar (Product repo · adopts standard artifacts & receipts)
```

### Development process

This repository implements the document-first feature pipeline defined by naia-pj-adk. Planning proceeds top-down (PC → SP → UC → RQ → PL → FE), while implementation and verification proceed bottom-up (UT → IT gate → UI connection → E2E → independent QC). For artifact definitions and pipeline details, see [the planning guide and artifact mapping](docs/planning/README.md).

## Compatibility

The JavaScript loader keeps read compatibility with existing NVA v0.2 files.
New distributable files should use the smaller v0.3 completed-media contract.

## License

Apache License 2.0. Media inside an NVA file keeps its own declared license.
