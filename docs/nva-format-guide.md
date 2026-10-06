# nva Authoring Guide — Creating Diverse Avatar Videos

English | [한국어](./nva-format-guide.ko.md)

> Target audience: Clip creators.
> Key takeaway: **The box demo serves as a "specification of positions, flows, and timings"**. Replacing those positions with **high-quality clips (live-action / deep-real)** yields identical behavior.

## 1. What is nva

**naia video clip avatar** — A **tool-neutral exchange format** for video clip-based talking head avatars.
Regardless of how the character is created (live action footage / VRM·MetaHuman render / AI video generation), the final deliverable is unified as "video clips + metadata (manifest)". **The core of the format is not just the video files, but the clip placement, combination, and order = state machine.**

## 2. Immediate Preview (Demo)

Sample bundle `examples/demo.nva` — **4 scenarios are automatically directed** with the box character (facility guide, directions, welcome, goodbye). While visual quality is 0 (box placeholder), **the flow, timing, transitions, and subtitles serve directly as specification**. Editor: `…/src/main/editor.html`.

## 3. Structure (`.nva` Bundle)

```
character.nva/
  manifest.json      ← Brain: states + transitions + scenarios + layers/meta
  clips/             ← Video clips (replace these with high-quality clips)
  heads/             ← Transparent 512×512 head/shoulder reference images for talking
```

- **state**: `talking` (stable talking pose, face region = face_bbox) / `animation` (motion)
- **transition**: Inter-pose movement clips (stand ↔ sit). `entry_pose` → `exit_pose`
- **scenario**: Directing sequence (states/events + spoken lines + timing) — auto-played

## 4. Clip Authoring = Upgrading Clip Quality

Simply place **high-quality clips of identical specifications** into the box positions. The manifest remains unchanged.

| Clip | Production Requirements (Seamless) |
|---|---|
| `stand_idle` | Standing idle loop — identical first and last frame pose (slight breathing) |
| `sit_idle` | Sitting idle loop |
| `sit_down` / `stand_up` | Transition — **starts at standing pose, ends at sitting pose** (must align precisely to prevent jitter) |
| `wave` / `nod` / `dance` | Motion — **starts and ends in standing pose** (naturally inserted into idle) |
| (Face region) | Lip-sync at `face_bbox` position during speaking — renderable in real time via Ditto/cascade |

> Core rule: **Each clip must begin and end in the corresponding pose** so that concatenating them produces no seam jumps (game animation seamlessness).

### Ditto Reference Image for Adult-Proportioned Characters

- Ditto input canvas is **always fixed at 512×512**. Do not stretch the NVA full-body canvas or alter subject scale.
- In `head_image`, do not crop tightly to the head alone; include the **entire head, neck, and both shoulder lines**. For custom PNGs, margins are recommended to avoid edge clipping.
- Do not include the waist or hands. Cropping the top 512px directly from a full-body adult frame captures down to the waist, which is prohibited.
- `speak_body` must be a static loop with pixel-locked full-body positioning. `idle` allows natural breathing and minor weight shifts as a separate clip.
- `face_bbox` maintains the actual head position within the full-body canvas. Do not confuse this with coordinates within the 512×512 `head_image`.
- For alpha backgrounds, verify per-frame that non-character pixels are strictly 0. Semi-transparent chroma artifacts cause background shimmering during playback.

The editor's **Generate from Video** function captures the manifest's `ditto_region` at exact 1:1 scale without resizing into a 512×512 PNG. If the video aspect ratio differs, specify the actual dimensions in manifest `canvas.width` and `canvas.height`.

## 5. Diverse Videos = Combining Scenarios & Clips

- **New directing**: Add steps (state + line + duration) to `manifest.scenarios` → infinite scenarios
- **New motions**: Add clips + animation states (e.g. clapping, pointing)
- **Background replacement**: Swap background layer only (character isolated via alpha/chroma) → same character in different scenes
- **Character replacement**: Swap the entire bundle (maintaining identical manifest structure)

→ Once clips are produced, **diverse videos are automatically generated via scenarios, backgrounds, and combinations**.

## 6. Current Demo Limitations (Resolved Post-Production)

- Box character = placeholder. High quality is achieved by replacing with live-action / deep-real clips.
- Alpha: Demo uses chroma keying (workaround for ffmpeg alpha limitations in this environment). The production pipeline generates VP9 alpha via cascade/Ditto — the format accepts both alpha and chroma.
- Speaking: Demo uses mock mouth overlay. Real-time lip-sync is enabled when connected to cascade (`?cascade=/avatar`).

## 7. Rights

Format specification + viewer/editor = naia (nextain) assets (transitional open standard). Bundles contain character clips only, while TTS reference audio is an independent runtime setting outside NVA. Character asset owner is specified in `meta.owner`.
