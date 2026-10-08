# Screen Plan (SP) — Player

English | [한국어](./SP.ko.md)

> **Standard Identifier**: `SP-01`  
> **Target Screen**: Read-Only Web Player (`src/main/viewer.html`)  
> **Upstream**: [Product Concept (PC)](./PC.md)  
> **Downstream**: [User Scenarios (UC)](../progress/02.user-scenarios/INDEX.md), [Feature Specifications (FE)](../progress/04.features/INDEX.md)

---

## 1. Screen Overview

`SP-01 Player` is the standalone web interface that loads packaged NVA avatar files, displays transparent video on an interactive background stage, and triggers packaged speech videos, talking loops, and action clips.

---

## 2. DOM Structure and Layout Wireframe

### 2.1 Desktop Layout (>820px)
Two-column grid layout (`minmax(0, 1fr) 320px` with 24px gap).

```text
+-----------------------------------------------------------------------------------------------+
| HEADER: [NVA Player]                                                             [NVA v0.3]   |
+---------------------------------------------------------------+-------------------------------+
| STAGE CARD (.stage-card)                                      | CONTROL PANEL (aside.panel)   |
|                                                               |                               |
|   #stage (.stage)                                             | NVA Avatar Player             |
|   +-------------------------------------------------------+   | Open a finished avatar...     |
|   |                                                       |   |                               |
|   |                                                       |   | NVA file                      |
|   |                                                       |   | [ Choose File ]               |
|   |                                                       |   |                               |
|   |                   video#animation                     |   | Packaged samples              |
|   |                     (.media)                          |   | [ Select sample...          v]|
|   |                                                       |   | [ Open selected sample        ] |
|   |                                                       |   |                               |
|   |                                                       |   | --- Preview background -------|
|   |                                                       |   | [Color] [ Choose Image ]      |
|   |                                                       |   | [ Clear background image      ] |
|   |                                                       |   |                               |
|   |                                                       |   | --- Pre-rendered speech ------|
|   |                                                       |   | [ Select speech clip...     v]|
|   |                                                       |   | [ Play packaged speech        ] |
|   |                                                       |   | [ Play talking loop           ] |
|   |                                                       |   |                               |
|   |                                                       |   | --- NVA action ---------------|
|   |                                                       |   | [ Select action...          v]|
|   |                                                       |   | [ Play action                 ] |
|   |                                                       |   |                               |
|   |                                                       |   | [ Stop and return to idle     ] |
|   |                                                       |   |                               |
|   +-------------------------------------------------------+   | #status (.status)             |
|                                                               | Ready · avatar · ...          |
+---------------------------------------------------------------+-------------------------------+
```

### 2.2 Mobile Layout (<=820px)
Single-column stacked layout where the control panel moves above the stage card (`grid-row: 1`).

```text
+---------------------------------------------------------------+
| HEADER: [NVA Player]                             [NVA v0.3]   |
+---------------------------------------------------------------+
| CONTROL PANEL (aside.panel)                                   |
|   NVA Avatar Player                                           |
|   [ Choose File ]                                             |
|   [ Select sample... v ] [ Open selected sample ]             |
|   [Color] [ Image ] [ Clear ]                                 |
|   [ Speech clip v ] [ Play speech ] [ Play talking loop ]     |
|   [ Action v ] [ Play action ]                                |
|   [ Stop and return to idle ]                                 |
|   #status: Ready · ...                                        |
+---------------------------------------------------------------+
| STAGE CARD (.stage-card)                                      |
|   #stage (min-height: 460px)                                  |
|   +-------------------------------------------------------+   |
|   |                   video#animation                     |   |
|   +-------------------------------------------------------+   |
+---------------------------------------------------------------+
```

---

## 3. Controls and State Transitions

| Control Element | DOM Selector | Trigger / Operation | State Changes & Behavior |
|---|---|---|---|
| **File Picker** | `input#nvaFile[type=file]` | User selects local `.nva` / `.zip` file | 1. `LoadCoordinator.begin()` starts a new load generation, aborting prior pending loads.<br>2. Disables playback controls; sets `#status` to `"Loading <filename>…"`.<br>3. `loadNvaBundle()` verifies ZIP and schema.<br>4. Sets video aspect ratio to canvas width/height.<br>5. Starts idle playback (`video.muted=true`, `video.loop=true`, `state="idle"`).<br>6. Populates speech and action dropdowns; enables buttons.<br>7. `#status` displays `"Ready · <Name> · N speech videos · N actions"`. |
| **Sample Menu** | `select#sample`<br>`button#loadSample` | Select catalog entry and click "Open selected sample" | Fetches bundle from sample catalog via `fetchNvaSample()`. Follows the same loading and transition lifecycle as file picker. |
| **Background Color** | `input#backgroundColor[type=color]` | Color input change (`input` event) | Updates `#stage` background color in real time via `stageBackground.setColor()`. |
| **Background Image** | `input#backgroundImage[type=file]` | User selects image file | Creates a local Blob URL, revokes previous URL, and sets `#stage` background image (`cover no-repeat center`). |
| **Clear Background** | `button#clearBackground` | Click button | Removes background image, resets input, and restores the active solid background color. |
| **Speech Playback** | `select#speechClip`<br>`button#playSpeech` | Select clip and click "Play packaged speech" | Sets `video.muted=false`, `video.loop=false`, and `state="speech"`. Updates `#status` to `"Playing packaged speech: <label>"`. When playback ends (`ended` event), returns to idle automatically with `"Playback complete; idle restored."`. |
| **Talking Loop** | `button#playTalking` | Click "Play talking loop" | Enabled when a v0.2 bundle has a talking loop: a looping, non-transition animation with `can_talk` (the scenario start animation first, otherwise the first in manifest order). Sets `video.muted=true`, `video.loop=true`, and `state="talking"`. `#status` shows `"Playing talking loop."`. |
| **Action Playback** | `select#action`<br>`button#playAction` | Select action and click "Play action" | Sets `video.muted=true`, `video.loop=false`, and `state="action"`. When the clip ends, restores idle automatically. |
| **Prop Action Playback** | `select#action`<br>`button#playAction` | Select prop action and click "Play action" | Presented as a single item in the action dropdown. Executes composite sequence: enter (1x, if present) → main loop (2x) → exit (1x, if present). Intermediate steps suppress completion status messages; final step restores idle automatically. |
| **Stop** | `button#stop` | Click "Stop and return to idle" | Stops current action, talking loop, or speech video. Immediately resumes muted idle loop (`state="idle"`). Sets `#status` to `"Stopped; idle restored."`. |

---

## 4. Error Display and Recovery

Errors are displayed directly in the `#status` box with alert styling (text color `#ff8d8d`):
- **Invalid bundle or manifest error**: Shows `"Blocked: <reason>"`. All playback controls (speech and action selectors, the three play buttons, and Stop) are disabled, and the previously loaded avatar is cleared from the stage.
- **Speech video decode/playback failure**: Automatically invokes `restoreIdle()` and sets `#status` to `"Speech video failed: <reason>"`.
- **Talking loop failure**: Restores idle and sets `#status` to `"Talking failed: <reason>"`.
- **Action failure**: Restores idle and sets `#status` to `"Action failed: <reason>"`.
- **Sample catalog failure**: Shows `"Sample catalog blocked: <reason>. You can still open a local file."`. The file picker remains fully functional.

---

## 5. Supported User Scenarios (UC)

This screen plan realizes the following user scenarios:
- `UC-001`: Inspect completed-media manifest and bundle safety.
- `UC-002`: Open an NVA file and display default idle loop.
- `UC-013`: Play and stop pre-rendered speech videos with audio.
- `UC-014`: Play actions and restore idle automatically.
- `UC-015`: Load samples from catalog without absolute paths.
- `UC-017`: Standalone browser preview without GPU or external APIs.
- `UC-019`: Interactive background color and image composition.
- `UC-020`: Studio 0.2 backward compatibility (talking loop and actions).
- `UC-021`: Play Studio v0.2 prop sequences as a composite action.

---

## 6. Next Stages (Roadmap)

- **Multiple Idle Videos (#17)**: Expand the single idle loop display into a sequential or weighted idle playlist with smooth looping transitions.
