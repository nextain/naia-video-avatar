# nva Authoring Guide — Creating Diverse Avatar Videos

English | [한국어](./nva-format-guide.ko.md)

> Target audience: Clip creators.
> Key takeaway: **The box demo serves as a "specification of positions, flows, and timings"**. Simply replacing those slots with **high-quality clips (live-action / deep-real)** yields identical behavior.

## 1. What is nva

**naia video clip avatar** — A **tool-neutral exchange format** for video clip-based talking head avatars.
Regardless of how the character is created (live-action footage, VRM / MetaHuman renders, or AI video generation), the final deliverable always consists of video clips and metadata (manifest). **The core of the format lies not in the video files alone, but in representing clip placement, combination, and sequencing as a state machine.**

## 2. Immediate Preview (Demo)

In sample bundle `examples/demo.nva`, **4 scenarios are automatically directed** using the box character (facility guide, directions, welcome, goodbye). Visual quality is 0 (a box placeholder), but **the flow, timing, transitions, and subtitles serve directly as the baseline specification**. The editor is available at `…/src/main/editor.html`.

## 3. Structure (`.nva` Bundle)

```
character.nva/
  manifest.json      ← Brain: states + transitions + scenarios + layers/meta
  clips/             ← Video clips (replace these with high-quality clips)
  heads/             ← Transparent 512×512 head/shoulder reference images for talking
```

- **state**: `talking` (stable talking pose with face region defined by `face_bbox`) or `animation` (motion)
- **transition**: Movement clips between poses (e.g., stand ↔ sit), transitioning from `entry_pose` to `exit_pose`
- **scenario**: Directing sequences (states/events + spoken lines + timing) played automatically

## 4. Clip Authoring: Upgrading Clip Quality

Simply place **high-quality clips adhering to the same specifications** into the box positions; the manifest remains unchanged.

| Clip | Production Requirements (Seamless) |
|---|---|
| `stand_idle` | Standing idle loop — identical first and last frame pose (slight breathing) |
| `sit_idle` | Sitting idle loop |
| `sit_down` / `stand_up` | Transition — **starts at standing pose, ends at sitting pose** (must align precisely to prevent jitter) |
| `wave` / `nod` / `dance` | Motion — **starts and ends in standing pose** (naturally inserted into idle) |
| (Face region) | Lip-sync at `face_bbox` position during speaking — renderable in real time via Ditto/cascade |

> Core rule: **Each clip must begin and end in the corresponding pose** so that concatenating them produces no seam jumps (game animation seamlessness).

### Ditto Reference Images for Adult Characters

- Ditto input canvas is **always fixed at 512×512**. Do not stretch the NVA full-body canvas or alter subject scale.
- In `head_image`, do not crop tightly to the head alone; include the **entire head, neck, and both shoulder lines**. For custom PNGs, margins are recommended to avoid edge clipping.
- Do not include the waist or hands. Cropping the top 512px directly from a full-body adult frame captures down to the waist, which is prohibited.
- `speak_body` must be a static loop with pixel-locked full-body positioning. `idle` allows natural breathing and minor weight shifts as a separate clip.
- `face_bbox` maintains the actual head position within the full-body canvas. Do not confuse this with coordinates within the 512×512 `head_image`.
- For alpha backgrounds, verify per-frame that non-character pixels are strictly 0. Semi-transparent chroma artifacts cause background shimmering during playback.

The editor's **Generate from Video** function captures the manifest's `ditto_region` at exact 1:1 scale without resizing into a 512×512 PNG. If the video aspect ratio differs, specify the actual dimensions in manifest `canvas.width` and `canvas.height`.

## 5. Generating Diverse Videos: Combining Scenarios and Clips

- **New directing**: Add steps (state + line + duration) to `manifest.scenarios` → infinite scenario variations
- **New motions**: Add clips and animation states (e.g. clapping, pointing)
- **Background replacement**: Swap the background layer only (character is isolated via alpha or chroma) → the same character appears across different scenes
- **Character replacement**: Swap the entire bundle while maintaining the identical manifest structure

→ Once clips are produced, **diverse videos can be generated automatically through scenarios, backgrounds, and clip combinations**.

## 6. Current Demo Limitations (Resolved in Production)

- **Box character placeholders**: The box character serves only as a placeholder. Visual fidelity is achieved once clips are replaced with live-action or deep-real footage.
- **Alpha channel handling**: The demo relies on chroma keying as a workaround for ffmpeg alpha limitations in this environment. In production pipelines, VP9 alpha is generated via cascade/Ditto — the format natively accepts both alpha and chroma.
- **Speech rendering**: The demo uses a mock mouth overlay. Real-time lip-sync is enabled when connected to cascade (`?cascade=/avatar`).

## 7. Rights

The format specification, viewer, and editor are **naia (nextain) assets** (a transitional open standard). Bundles contain character clips only, while the TTS reference audio is configured independently at runtime outside NVA. The owner of character assets is declared in `meta.owner`.
