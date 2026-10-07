# Issue 16 — NVA v0.3 public service player

English | [한국어](./issue-16-public-service-player.ko.md)

- GitHub: https://github.com/nextain/naia-video-avatar/issues/16

## Scope

Move the experience of consuming finished examples, as seen in a hosted NVA
studio, into an independent public player. A public user opens a finished
`.nva`, plays idle, embedded-audio speech, and actions, and changes the
background to check how the avatar fits a service layout.

## Public contract

- New canonical form: NVA v0.3 `completed-media`
- Compatibility: existing NVA v0.2 is read-only
- Deployment: static web; no account, key, GPU, or server API
- Included: spec, validator, ZIP loader, player, simple service UI, safe public examples

## Explicit exclusions

- NVA create and authoring pipelines
- Editor, node graph, and authoring timeline
- Browser TTS and real-time speech or video generation
- Cascade and its adapter, documents, and settings
- Private faces, voices, prompts, models, and operations paths

## Verification

Fix the P01-P03 traceability items first, add contract tests as RED, then
implement. Provide a local review URL only after the full Node test suite,
structure and traceability checks, Playwright E2E on a real static server, and
private-feature string and network-request checks pass.
