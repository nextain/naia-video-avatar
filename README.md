# NVA Avatar Player

**NVA (Naia Video Avatar)** is an open bundle format and a read-only web Player
for precomputed video avatars. Open one `.nva` file, type text, and let the
browser's built-in free TTS speak while the Player composes precomputed speech
motion. No account, backend, Ditto, CUDA, or AI model is required at playback.

The public project deliberately contains the file format, validators, and
Player only. Avatar authoring, Ditto generation, and quality analysis belong to
a separate generation service and are not part of this repository.

## What is inside an NVA?

An `.nva` file is a ZIP bundle:

```text
avatar.nva
├── manifest.json                 identity, canvas, placement, animations
├── clips/
│   ├── idle.webm                 default loop
│   ├── talking-body.webm         body loop used while speaking
│   └── wave.webm                 optional action video
└── speech/                       optional precomputed speech-motion extension
    ├── neutral-head.png
    ├── atlas.bin                 indexed transition/context clips
    ├── atlas-index.json
    ├── validation-report.json
    ├── quality-report.json
    └── provenance.json
```

The bundle contains video assets and metadata, not a generation model. The
speech atlas uses 13 language-independent articulation units and is generated
once before distribution. See the [NVA format guide](docs/nva-format-guide.md)
for the manifest and packaging contract.

## Run the Player

```bash
python3 -m http.server 8099
```

Open <http://localhost:8099/src/main/viewer.html> and choose an `.nva` file.

The Player also loads the tracked same-origin sample catalog. To inspect private
NVA files that already exist on your machine, prepare an ignored local catalog:

```bash
python3 scripts/prepare-local-samples.py \
  --sample "First avatar=/path/to/first-nva-directory" \
  --sample "Second avatar=/path/to/second.nva"
```

Then open:

<http://localhost:8099/src/main/viewer.html?catalog=../../examples/.local/catalog.json>

The command packages directory-form NVA assets or copies an existing `.nva`.
`examples/.local/` is ignored by Git, and the catalog records no source paths.

The default path is fully frontend-only:

```text
.nva + text → browser speechSynthesis → approximate speech-motion playback
```

Browser TTS does not normally expose PCM or phoneme timestamps, so this mode is
honestly labelled `approximate`. It is the zero-account, zero-server open-source
demo path.

For precise timing, expand **Aligned audio + SpeechPlan** and provide audio with
its matching timeline:

```text
independent audio cascade → audio + SpeechPlan → aligned NVA playback
```

The audio cascade is optional and independent. It produces speech and timing;
it does not know about NVA files, faces, videos, or Ditto.

## Player capabilities

- Native browser loading of stored or deflated `.nva` ZIP files
- Manifest, path, expanded-size, atlas range, and content-hash validation
- Browser-installed TTS voice selection and cancellation
- Explicit approximate versus aligned quality modes
- Idle and registered action playback with automatic idle restoration
- Audio-clock speech composition over the body video
- Static hosting with no application server

## Public source layout

```text
src/main/
  viewer.html                    static Player entry point
  nva-schema.json                NVA manifest schema
  nva-core.js                    validation and animation derivation
  nva-bundle-loader.js           dependency-free ZIP intake
  nva-animation-player.js        idle/action playback
  sample-catalog.js              bounded same-origin sample loading
  load-coordinator.js            latest avatar request wins
  browser-tts.js                 free browser TTS adapter
  speech-plan.js                 aligned/approximate timing contract
  speech-runtime.js              articulation transition scheduler
  speech-player.js               body/head/speech-layer compositor
  speech-atlas-*.js              indexed speech asset access
  speech-browser-runtime.js      browser decoder and canvas composition
  speech-bundle.js               asset and provenance verification
  speech-provenance.js           packaged generation-receipt validation
```

There is intentionally no Editor, Studio, Ditto runner, generation client, or
video-generation cascade in the public runtime.

## Validation

```bash
node --test src/test/*.test.mjs
python3 src/test/local-sample-prep.test.py
TRACE_PROJECT_ROOT="$PWD" node scripts/check-traceability.mjs --enforce --strict-orphans
```

The tracked box-character sample under `examples/demo.nva/` demonstrates the
animation structure. Browser speech requires an NVA containing the optional
`speech_motion` assets shown above.

## License

- Runtime and validators: Apache License 2.0
- Format documentation: CC BY 4.0
- Character media inside an NVA remains under the license declared by that
  bundle's `meta.owner` and `meta.license` fields.
