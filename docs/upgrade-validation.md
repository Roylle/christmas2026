# Paper-cut experience upgrade — 2026-11-07

## Scope

1. Portrait chapter compositions, fitted canvas headings, visible chapter titles, touch chapter navigation and per-item photo/album/ticket/FAQ controls.
2. Paper-star season storytelling, child/adult crossfade, gradual light reveal, and a musical transition after user-enabled audio.
3. Preserve night-mode text contrast, move interfering mobile props aside, load photo textures after the opening, share vendor code between languages, suspend hidden work and limit mobile pixel ratio.

## Local production-build checks

- Build passed with Vite 8.3.6. The shared Three.js/rough.js chunk triggers Vite's 500 kB uncompressed advisory; it is approximately 127 kB gzipped.
- VI and EN: real browser touch events advance Welcome to Two seasons; no JS exceptions observed.
- Controls fit without document overflow at widths 320, 390 and 768; desktop reviewed at 1440 × 900. Screenshots also reviewed at 320 × 640 and 768 × 1024.
- Ticket carousel wraps after four items; seat map and contact dialogs display translated details. Music toggles on/off; rapid season switching and reduced motion finish in the requested state.
- Final regression: simulated VN → VI, US → EN, failed geo → EN; switching works with both WebGL and storage disabled. Keyboard activation keeps focus on the carousel control.
- English/Vietnamese event data and the external ticket booking URL remain unchanged.

## Startup measurement

Same browser, fresh contexts, viewport 390 × 844, DPR 1, local Python HTTP servers, three sequential runs per version. Measured until loader removal; bytes are browser Resource Timing transferSize totals at that moment. This is a local comparison, not a mobile-network/Core Web Vitals score.

| Version | Opening time (ms) | Bytes by opening | Requests by opening |
| --- | --- | --- | --- |
| Previous | 1379 / 1372 / 1362 | 2,510,183 | 31 |
| Upgraded | 871 / 870 / 869 | 1,383,637 | 15 |

Median opening time improved about 37%; transfer by opening decreased about 45%. A portion of the time difference is the intentional shorter loader fade (700 → 500 ms). Deferred images still load afterward; this does not represent a 45% reduction in total page bytes.

## Limits

Browser mobile emulation and touch protocol input are not physical iPhone/Android tests. Real-device GPU frame rate, battery use, Safari audio output, screen-reader behavior and network-throttled field performance have not been certified. No Awwwards score or award outcome is implied.
