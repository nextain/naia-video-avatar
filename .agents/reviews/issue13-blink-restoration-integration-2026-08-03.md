# Issue 13 — Ditto blink restoration integration review

- Date: 2026-08-03
- Charter: `a16478184e9f344eb8db3308fe92b3bb2df65ceebf764c76aa03336cba6f7154`
- Scope: Ditto service blink scheduling, generation probe propagation, Korean visual evidence
- Phase result: implementation/integration clean; P04 multilingual expansion and P05 acceptance remain pending

## Root cause

Ditto's `motion_stitch._set_eye_blink_idx` contains the original 15-frame eye
animation. With `delta_eye_open_n=0`, it chooses random 60–100-frame open
intervals and applies start/end guards. The 2.88–4.96-second probes could
therefore contain no complete blink. Independently generated transition windows
also received unrelated random eye phases.

## Implemented contract

- The Ditto HTTP service accepts an optional bounded phrase-global blink period,
  phase, and window offset.
- Requests without these headers preserve Ditto's existing random behavior.
- Whole-phrase and transition-window renders map to the same phrase-global frame.
- The process-wide SDK is protected by its render lock and restores the default
  blink index array in `finally`, including error and disconnect paths.
- The existing checkpoint's eye animation is reused; no synthetic eyelid
  post-process was added.

## Verification evidence

- Blink schedule unit tests: 4 passed.
- Korean probe unit tests: 16 passed.
- Public runtime tests: 74 passed.
- Python compile checks: passed for every changed Python module.
- Five Korean phrases × W/A/B/C: 20/20 videos had exactly one detected blink,
  zero landmark detection misses, and peak timing spread of 0–1 frame.
- Blink maximum score was at least 0.696 with the event threshold set to 0.35.
- Normal and 4× slow comparison videos fully decoded with FFmpeg.
- A scheduled request followed by an equal-duration default request completed
  successfully after the service restart; custom SDK state is restored before
  the render lock is released.

Evidence: `../work/issue13-quality/korean-blink-transition-v1/blink-verification-summary.json`

## Adversarial review convergence

The first review found one documentation overstatement: the implementation aims
to leave an end guard but does not mathematically guarantee 60–100 open frames
after the final blink. The wording was corrected to describe start/end random
guard behavior. The SDK singleton lifecycle was then hardened with explicit
`finally` restoration.

- Corrected review round 1: CLEAN
- Independent Codex review: CLEAN
- Final convergence round 2: CLEAN

No accepted finding remains open in this implementation slice.
