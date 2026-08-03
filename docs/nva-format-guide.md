# NVA consumer format guide

NVA (Naia Video Avatar) is a portable bundle of metadata and already-produced
avatar media. This public document specifies what a Player may consume. It does
not specify how faces, speech fragments, or source videos are generated.

## Bundle layout

An `.nva` file is a ZIP archive whose root contains `manifest.json`:

```text
avatar.nva
├── manifest.json
├── clips/
│   ├── idle.webm
│   ├── speaking-body.webm
│   └── optional-action.webm
└── speech/                 optional playback extension
    └── packaged assets referenced by manifest.json
```

Every referenced asset is a relative bundle path. Absolute URLs, drive paths,
backslashes, `.` and `..` segments are invalid. A Player must apply archive,
expanded-size, entry-count and path-safety limits before playback.

## Manifest v0.2

The normative machine-readable contract is
[`src/main/nva-schema.json`](../src/main/nva-schema.json). The main fields are:

- `nva_version`: currently `0.2`.
- `meta`: display name and media ownership/licensing metadata.
- `canvas`: output width, height and optional frame rate.
- `animations`: packaged idle, speaking-body and action clips.
- `scenario`: optional graph that selects an initial idle animation.
- `speech_motion`: optional, already-produced speech playback assets.

Animation kinds are inferred from their public playback properties. A looping
animation that cannot talk is an idle candidate; a looping animation that can
talk is a speaking-body candidate; a non-looping animation is an action. The
Player returns to idle after an action, speech, cancellation or playback error.

## Playback modes

The standalone path uses browser `speechSynthesis`. Browsers usually do not
expose PCM or phoneme timestamps, so the Player labels this mode
`approximate`. An independent audio system may instead provide audio plus a
matching `SpeechPlan`; that path is labelled `aligned` after validation.

Both paths consume completed NVA assets. They do not run an avatar generation
model and do not require a GPU.

## Local sample catalog

Static deployments may publish a same-origin JSON catalog:

```json
{
  "version": "1",
  "samples": [
    { "label": "Example avatar", "url": "example.nva" }
  ]
}
```

The catalog and every sample URL must resolve to the Player's HTTP origin. The
Player rejects credentials, fragments, cross-origin URLs, oversized catalogs
and oversized bundles. Catalog failure does not disable the local file picker.

Private samples can be prepared under the ignored `examples/.local/` directory;
only generated local filenames and display labels appear in its catalog. Source
paths and source media are never part of the public repository.

## Public and private boundary

The schema, validators and read-only Player are public. Authoring tools,
generation procedures, model settings, internal quality thresholds and source
media are outside this repository. Bundle authors retain the rights declared in
`meta.owner` and `meta.license`.
