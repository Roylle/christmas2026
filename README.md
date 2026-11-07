# Christmas 2026 · OrcheStars

Live: https://roylle.github.io/christmas2026/

Paper-cut Christmas concert experience, with Vietnamese and English editions. Based on goldenduck1102/ttc2026v6 release `9c7613df281bd1b0bf7a2b2038b2bc06a4e537e5` and the corresponding editable source in the local TTC2026 v6 project. Original event details, prices and booking destinations are preserved.

## Development and publishing

- `source/src/`: editable scene, artwork, music, content and styles.
- `source/index.html`, `source/language.js`, `source/language.css`: page shell and language selection.
- `public/assets/`: original media. Do not edit generated root assets directly.
- `scripts/en.tsv`: translation dictionary. `scripts/build.py` generates the ignored English source edition before Vite builds both languages, sharing vendor dependencies.
- `npm ci`, then `npm run dev` for development.
- `npm run build` produces `dist/`. Preview this build before publishing.
- `npm run publish:files` copies the validated build into the root served by GitHub Pages. Commit source and published files together, then push main. Old hashed bundles are retained for cached-page compatibility.
- `scripts/original.html` and the original root `language.js`/`language.css` remain as release provenance and for old cached HTML; current HTML loads hashed build assets.

## Experience

Portrait layouts center primary content and use an item carousel for photos, albums, ticket categories and FAQs. A completed touch swipe changes chapter. Labeled previous/next controls complement the musical navigation. Small screens reserve space for these controls. Desktop retains the continuous paper world.

Season changes combine a paper-star message, a 2.2-second light reveal and a child/adult crossfade. Audio starts only after a user gesture; changing season fades into the new tune. Audio pauses when hidden. Reduced-motion mode uses immediate scene states and static messages.

Only the logo and brand image gate the opening scene. Two background workers progressively hydrate the remaining textures, prioritizing selected gallery items. Text cards preserve contrast in night mode; unwrapped canvas text fits its available width. Rendering skips hidden-document work and caps mobile pixel ratio at 1.5.

## Languages

Explicit VI/EN selection and `?lang=vi|en` take priority and are remembered in localStorage when available. Initial visits use https://api.country.is/: VN selects Vietnamese, all other countries select English. Lookup failure or a 2.5-second timeout falls back to English. Automatic selection is cached per tab; the page stores no IP. VPN/proxy locations can affect country detection. The current chapter is retained when switching language.

## Validation

Use `?qa=1` on the preview for the read-only diagnostics plus chapter/season seeking helpers at `window.__ttc`. Tests include production-build browser rendering, mobile touch input, VI/EN navigation, carousel wrapping, dialogs, audio controls, reduced motion and missing WebGL/storage/geo lookup. See `docs/upgrade-validation.md` for measured results and limits. No award submission is made by publishing this project.
