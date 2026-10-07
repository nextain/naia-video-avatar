# 01. Requirements Registry (REQ) — V-Model 01

English | [한국어](./INDEX.ko.md)

<!--
Schema: Single-file registry (no separate document per item ❌). Status = Draft→Approved→In-progress→Done.
Traceability: Every REQ closes into ≥1 UC (02), or if NFR, connects directly to ≥1 TEST-S (03) (0 orphans).
Columns = | ID | Area | Requirement | Status | UC | SPEC | TEST |
scripts/check-traceability.mjs parses this table.
Empty state (this notice comment only) = SDLC gate bootstrap (warn/permit). Populating actual REQs enforces gates.
-->

| ID | Area | Requirement | Status | UC | SPEC | TEST |
|----|------|----------|------|----|----|------|
| REQ-001 | format | Define nva (video clip avatar) format as a JSON manifest schema | Done | UC-001 | SPEC-001 | TEST-S-001 |
| REQ-002 | state-machine | talking/animation states + transitions + pose continuity (entry/exit_pose) | Done | UC-002, UC-003 | SPEC-002 | TEST-S-002 |
| REQ-003 | compositing | Background + character + head-talking layer compositing, concurrent alpha decodes ≤ 2 | Done | UC-002 | SPEC-003 | TEST-S-003 |
| REQ-004 | viewer | nva bundle playback (automatic transition insertion during state changes) | Done | UC-002 | SPEC-003 | TEST-S-002 |
| REQ-005 | editor | Manifest editing + live preview | Done | UC-001 | SPEC-004 | TEST-S-004 |
| REQ-006 | export | Packaging/exporting into a single `.nva` (zip) file | Done | UC-004 | SPEC-004 | TEST-S-004 |
| REQ-007 | validation | Validation of schema + initial state + pose consistency + face_bbox + connectivity | Done | UC-001 | SPEC-002 | TEST-S-001 |
| NFR-001 | deploy | Runs on static web (browser) without GPU | Done | — | — | TEST-S-005 |
| NFR-002 | packaging | Viewer and editor are self-contained single HTML files | Done | — | — | TEST-S-005 |
| NFR-003 | alpha | Character layer accepts both alpha (VP9) and chroma keying | Done | — | — | TEST-S-003 |
| NFR-004 | deps | Zero runtime dependencies for nva-core (pure JS) | Done | — | — | TEST-F-001 |
| REQ-008 | scenario | Automated playback and validation of directing scenarios (state/event/dialogue sequences) | Done | UC-003 | SPEC-005 | TEST-S-002 |
| REQ-009 | editor | Provide explicit preview control next to animation clip inputs to instantly play current media in the center player | Done | UC-005 | SPEC-007 | TEST-S-006 |
| REQ-010 | compositing | Use center-top `[104,0,512,512]` of standard 720×1280 video as Ditto speech region, separating exact 512×512 pixel region from actual face guides | Done | UC-006 | SPEC-008 | TEST-S-007 |
| REQ-011 | editor | Sample chroma key clear color from center source video frames via eyedropper and save immediately to manifest `chroma_key` | Done | UC-007 | SPEC-009 | TEST-S-008 |
| REQ-012 | cascade | The `:8099` editor sends current nva and ref URLs to specified cascade URL (local canonical `:8910`) and plays speech with audio without re-interpreting absolute ref URLs as zip-relative files | Done | UC-008 | SPEC-010 | TEST-S-009 |
| REQ-013 | editor | Edit manifest canvas width and height with true aspect-ratio preview, generating talking `head_image` as a 512×512 PNG matching manifest `ditto_region` | Done | UC-009 | SPEC-011 | TEST-S-010 |
