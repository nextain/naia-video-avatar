# Product Concept (PC) — naia-video-avatar

English | [한국어](./PC.ko.md)

> **Standard Identifier**: `PC`  
> **Upstream**: None (Root concept)  
> **Downstream**: [Screen Plan (SP)](./SP.md), [User Scenarios (UC)](../progress/02.user-scenarios/INDEX.md)

---

## 1. Product Definition and Target Audience

### 1.1 What is NVA?
**NVA (naia video clip avatar)** is an open, ZIP-based video avatar packaging format and a dependency-free browser Player. It enables transparent, responsive talking-head avatars to run entirely client-side using standard HTML5 video decoding without requiring GPU servers, cloud inference APIs, or heavyweight machine learning runtimes.

### 1.2 Who is it for?
- **Web service developers and frontend engineers**: Teams that need interactive, transparent avatar presence embedded into SaaS dashboards, kiosks, mobile web apps, or digital signage without maintaining GPU inference infrastructure.
- **Content creators and pipeline operators**: Teams producing pre-rendered talking avatars with deterministic packaging tools for delivery over static CDNs.
- **Privacy-sensitive and edge environments**: Offline or air-gapped deployments where network access, external API tokens, or server-side video streaming are prohibited.

---

## 2. System Composition

The repository consists of three core components:

1. **NVA Format Specification (v0.3 completed-media)**:
   - A standardized ZIP archive layout containing a declarative `manifest.json`, video clips (`clips/`), and pre-rendered speech videos with embedded audio (`speech/`).
   - Defined in [NVA Format Guide](../nva-format-guide.md).
2. **Read-Only Web Player**:
   - A lightweight, dependency-free viewer (`src/main/viewer.html`) implemented with pure ES modules (`src/main/*.js`).
   - Orchestrates video decoding, muted idle loops, audioless actions, and unmuted speech playback with automatic state recovery to idle.
3. **Public Examples & Verification Tools**:
   - Tracked public examples (`examples/demo.nva`, `examples/naia.nva`) for contract tests and browser validation.
   - Deterministic packaging CLI (`scripts/build-final-nva.py`) and local preparation utilities (`scripts/prepare-local-samples.py`).

---

## 3. Ownership Boundaries

Clear separation between the authoring tier (Studio) and consumption tier (Player):

```text
┌─────────────────────────────────┐       ┌──────────────────────────────────┐
│     Naia Studio (Producer)      │       │   naia-video-avatar (Consumer)   │
│  - Face synthesis & rendering   │       │  - Schema & bundle validation    │
│  - Text-to-speech (TTS) & audio │ ──►   │  - Dependency-free ZIP loader    │
│  - Real-time lip sync models    │ .nva  │  - Read-only browser Player      │
│  - Authoring editor UI          │       │  - Deterministic packaging tools │
└─────────────────────────────────┘       └──────────────────────────────────┘
```

- **In-Scope (This Repository)**:
  - Validating manifest schema, ZIP bundle paths, and media safety.
  - Safe, client-side ZIP parsing and Blob URL lifecycle management.
  - Browser playback coordination: idle, actions, talking loops, speech clips, and stop handling.
  - Static responsive UI for avatar preview and background composition.
- **Out-of-Scope (External Systems)**:
  - Avatar image generation, face reenactment, or video rendering.
  - Text-to-speech synthesis (TTS) and audio waveform generation.
  - Real-time lip sync or neural network inference.
  - Studio authoring editor, node graphs, and private workspace governance.

---

## 4. Invariants

1. **Version 0.3 completed-media is Canonical**:
   All speech clips in v0.3 packages must contain pre-rendered video and embedded audio. The Player decodes packaged media; it does not synthesize voice or drive live animation parameters.
2. **Studio v0.2 Distribution File Reading & Playback Support (NFR-011)**:
   Studio v0.2 distribution files are supported for reading and playback; new public schemas and examples use v0.3.
3. **Zero External Executable Code**:
   An NVA bundle is declarative media and metadata only. The loader rejects bundles whose ZIP file table contains absolute paths, URL schemes, backslashes, or `.`/`..` segments, and enforces size limits (200 MiB archive, 400 MiB expanded assets, 1 MiB manifest, 512 files). The player never executes bundle content; files the manifest does not reference are never played.
4. **Zero Runtime Network Dependencies**:
   Once assets are loaded, the Player executes without network requests, CDN scripts, telemetry, or external fonts.
5. **Security and Verification Integrity**:
   Security boundaries follow the [Threat Model](../threat-model.md) and machine-verifiable verification criteria defined in [Acceptance Criteria](../acceptance-criteria.md).
