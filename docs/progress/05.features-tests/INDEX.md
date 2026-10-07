# 05. Feature Tests Registry (TEST-F) — V-Model 05

English | [한국어](./INDEX.ko.md)

<!--
Schema: Single-file registry. Integrated test plan verifying SPECs (04).
Traceability: Every SPEC closes into ≥1 TEST-F. TEST-F points to ≥1 SPEC (back-trace, 0 orphans).
Columns = | ID | Target SPEC | Test Summary | test_ref | Status |
-->

| ID | Verified SPEC | Test summary | test_ref | Status |
|----|---------------|--------------|----------|--------|
| TEST-F-001 | SPEC-001, SPEC-002 | Validates valid and invalid manifests, and ZIP paths, sizes, compression, and required assets | src/test/nva-core.test.mjs + src/test/nva-bundle-loader.test.mjs | Done |
| TEST-F-003 | SPEC-003 | In real Chromium, checks idle video display and canvas ratio after an NVA loads | src/test/standalone-player.e2e.py | Done |
| TEST-F-017 | SPEC-016 | Validates audible playback of finished speech videos and muted idle recovery after end, error, or stop | src/test/nva-animation-player.test.mjs + src/test/standalone-player.e2e.py | Done (#14) |
| TEST-F-018 | SPEC-017 | Validates idle/action derivation and idle recovery after an action ends or fails | src/test/nva-animation-player.test.mjs + src/test/standalone-player.e2e.py | Done (#14) |
| TEST-F-019 | SPEC-018 | Checks that the public file list and README contain only the Player and no Editor or generation executables | src/test/public-player-surface.test.mjs | Done (#14) |
| TEST-F-020 | SPEC-019 | Validates the catalog schema, the same-origin restriction, path resolution, latest-load-wins, and loading the samples through the UI | src/test/sample-catalog.test.mjs + src/test/load-coordinator.test.mjs + src/test/local-samples.e2e.py | Done (#14) |
| TEST-F-021 | SPEC-020 | Validates input directory/file checks, deterministic ZIP, no absolute-path exposure, ignored output, and catalog entries | src/test/local-sample-prep.test.py | Done (#14) |
| TEST-F-022 | SPEC-021 | Validates deterministic output, the v0.3 contract, removal of generation fields and unreferenced assets, and the embedded-audio requirement | src/test/final-nva.test.py | Done (#14) |
| TEST-F-023 | SPEC-022 | Validates the v0.3 contract, bundle safety, v0.2 `locale` read compatibility, and blocking of public authoring fields | src/test/nva-core.test.mjs + src/test/nva-bundle-loader.test.mjs | Done (#16) |
| TEST-F-024 | SPEC-023 | In real Chromium, validates idle, speech, action, background change, idle recovery, and zero external requests | src/test/standalone-player.e2e.py + src/test/local-samples.e2e.py + src/test/public-service-surface.test.mjs | Done (#16) |
