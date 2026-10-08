# Technical Plan and Architecture (PL)

English | [한국어](./PL.ko.md)

> **Standard Identifier**: `PL`  
> **Upstream**: [Requirements (RQ)](../progress/01.requirements/INDEX.md), [User Scenarios (UC)](../progress/02.user-scenarios/INDEX.md)  
> **Downstream**: [Feature Specifications (FE)](../progress/04.features/INDEX.md), [Unit & Feature Tests (UT)](../progress/05.features-tests/INDEX.md)

---

## 1. Architectural Principles

1. **Dependency-Free Browser Runtime**: Pure ES modules without external bundles, polyfills, or package managers at browser runtime.
2. **Deterministic Module Pipeline**: Single-responsibility ES modules with explicit interfaces.
3. **Fail-Closed Security**: Reject malformed archives, oversized payloads, directory traversals, or non-relative paths before extraction.
4. **Resilient Playback Lifecycle**: Any playback error or stop action safely recovers to a muted idle state.

---

## 2. Module Decomposition and Structure

The runtime architecture consists of seven modular components under `src/main/`:

```text
 viewer.html (UI & Orchestration)
   │
   ├── LoadCoordinator (Request concurrency & cancellation)
   │
   ├── SampleCatalog (Same-origin catalog loading)
   │
   ├── StageBackground (Stage color & image preview)
   │
   ├── NvaBundleLoader (Safe client-side ZIP parsing)
   │     └── NvaCore (Schema validation & legacy derivation)
   │
   └── NvaAnimationPlayer (HTMLVideoElement state machine)
```

| Module | File | Core Responsibilities |
|---|---|---|
| **nva-core** | `src/main/nva-core.js`<br>`src/main/nva-schema.json` | Validates manifest schema against `nva-schema.json`. Provides `validateCompletedMedia()`, `validateManifest()`, and backward-compatible derivation for Studio 0.2 `idleKey` and `talkKey`. |
| **nva-bundle-loader** | `src/main/nva-bundle-loader.js` | Parses ZIP archives without third-party libraries (supports Store and Deflate). Enforces path safety (no `..` or absolute paths), archive limits (100 MiB total, 512 files), and creates Object URLs for media files. |
| **nva-animation-player** | `src/main/nva-animation-player.js` | Manages `HTMLVideoElement` playback states (`idle`, `speech`, `talking`, `action`). Handles unmuted speech decoding, muted action/idle looping, stop generations, and automatic fallback to idle on completion or error. |
| **load-coordinator** | `src/main/load-coordinator.js` | Provides latest-request-wins semantics for asynchronous avatar loads. Generates monotonically increasing load tokens and `AbortSignal`s to cancel obsolete loads. |
| **sample-catalog** | `src/main/sample-catalog.js` | Validates catalog JSON structure, restricts fetches to the same origin, resolves relative URLs safely, and enforces response size limits. |
| **stage-background** | `src/main/stage-background.js` | Manages stage background color styling and user-provided image previews using revoked-on-change Blob URLs. |
| **viewer** | `src/main/viewer.html` | Assembles the DOM interface, binds UI controls to player methods, handles viewport responsiveness, and presents human-readable status and error feedback. |

---

## 3. Supported Format Versions

### 3.1 NVA Version 0.3 (Canonical Distribution)
- **Profile**: `completed-media`.
- **Speech Clips**: Every entry under `speech_clips` references a finished MP4 or WebM video with embedded audio (`audio: "embedded"`) and a BCP 47 `language` tag.
- **Surface**: Excludes all generative, model-training, or real-time lip-sync parameters.

### 3.2 NVA Version 0.2 (Read Compatibility — NFR-011)
- **Read Compatibility**: Enables opening legacy Studio 0.2 archives.
- **Talking Loop**: Identifies animations with `loop: true` and `can_talk: true` to support the `#playTalking` loop when speech clips are absent.
- **Tolerant Parsing**: Unknown Studio authoring extension keys are safely ignored and excluded from canonical output.
- **Locale Mapping**: Legacy `locale` field is accepted as an alias for `language`.

---

## 4. Multi-Tier Testing System

Verification spans three independent testing tiers:

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Node.js Unit & Contract Tests (src/test/*.test.mjs)      │
│    - Schema validation, bundle loader, animation player     │
│    - Load coordinator, catalog, security contracts          │
├─────────────────────────────────────────────────────────────┤
│ 2. Python Tooling & Packaging Tests (src/test/*.test.py)    │
│    - Deterministic v0.3 packager (scripts/build-final-nva)   │
│    - Local sample preparation (scripts/prepare-local-samples)│
├─────────────────────────────────────────────────────────────┤
│ 3. Playwright Browser E2E Tests (src/test/*.e2e.py)         │
│    - Real Chromium headless browser against localhost       │
│    - Multi-viewport layout (Phone 390px, Desktop 1440px)    │
│    - Idle loop, speech playback, talking loop, and stop     │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Next Stages (Roadmap)

1. **Multiple Idle Videos (#17)**:
   - Extend `animations` manifest contract to support multiple idle clips.
   - Implement playlist rotation (sequential or weighted random) with seamless looping transitions.
2. **Studio Extension Fields**:
   - Assess standardization and public exposure of Studio metadata fields once authoring workflows stabilize.
