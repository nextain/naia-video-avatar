# 04. Feature Specifications Registry (SPEC) — V-Model 04

English | [한국어](./INDEX.ko.md)

<!--
Schema: Single-file registry. Decomposes UCs (02) into implementable feature units (SPECs).
Traceability: Every SPEC points to ≥1 UC (back-trace) and closes into ≥1 TEST-F (05) (0 orphans).
Columns = | ID | Derived UC | Feature Summary | Area | Status | TEST-F |
-->

| ID | Derived UC | Feature summary | area | Status | TEST-F |
|----|------------|-----------------|------|--------|--------|
| SPEC-001 | UC-001 | NVA v0.3 completed-media manifest JSON Schema with v0.2 read compatibility | src/main/nva-schema.json + src/main/nva-core.js | Done | TEST-F-001 |
| SPEC-002 | UC-001, UC-002 | Validation of the manifest, paths, asset existence, and bundle size | src/main/nva-core.js + src/main/nva-bundle-loader.js | Done | TEST-F-001 |
| SPEC-003 | UC-002 | NVA loading and default idle display in the read-only Player | src/main/viewer.html + src/main/nva-animation-player.js | Done | TEST-F-003 |
| SPEC-016 | UC-013 | Listing, playing, and stopping finished speech videos with embedded audio, and restoring idle | src/main/nva-animation-player.js + src/main/viewer.html | Done (#14) | TEST-F-017 |
| SPEC-017 | UC-014 | idle/action derivation and idle recovery after completion, stop, or error | src/main/nva-animation-player.js + src/main/viewer.html | Done (#14) | TEST-F-018 |
| SPEC-018 | UC-013 | Player-centred README and the public surface guard | README.md + src/test/public-player-surface.test.mjs | Done (#14) | TEST-F-019 |
| SPEC-019 | UC-015 | Same-origin JSON catalog loader, sample selection UI, and a single lifecycle for remote and manual loads with latest-request-wins handling | src/main/sample-catalog.js + src/main/viewer.html | Done (#14) | TEST-F-020 |
| SPEC-020 | UC-015 | Local preparation tool that packs directory-form NVA assets into ZIP, copies existing `.nva` files, and builds an ignored catalog | scripts/prepare-local-samples.py | Done (#14) | TEST-F-021 |
| SPEC-021 | UC-016 | Deterministic packaging tool that turns existing v0.2 input and finished speech videos into a public v0.3 consumption package | scripts/build-final-nva.py | Done (#14) | TEST-F-022 |
| SPEC-022 | UC-017, UC-018 | Safe NVA bundle loading, including v0.3 completed-media validation and v0.2 `locale` read compatibility | src/main/nva-schema.json + src/main/nva-core.js + src/main/nva-bundle-loader.js | Done (#16) | TEST-F-023 |
| SPEC-023 | UC-017, UC-019 | A simple service Player that only opens files and public samples, plays idle, speech, and actions, and previews backgrounds | src/main/viewer.html + src/main/nva-animation-player.js + src/main/stage-background.js | Done (#16) | TEST-F-024 |
| SPEC-024 | UC-020 | `playTalking()`, load result `talking` and `idles`, `#playTalking` button, and demo manifest idle entries | src/main/nva-animation-player.js + src/main/viewer.html + examples/demo.nva | Approved (#22) | TEST-F-025 |
