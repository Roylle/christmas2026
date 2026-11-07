# Christmas 2026 · OrcheStars

Published at https://roylle.github.io/christmas2026/.

Based on the exact deployed goldenduck1102/ttc2026v6 release at commit 9c7613df281bd1b0bf7a2b2038b2bc06a4e537e5. Original artwork, ticket destinations and event details are retained.

## Languages

- `index.html`: Vietnamese; `en.html`: English, including canvas text and dialogs.
- VI / EN links save an explicit choice in localStorage. `?lang=vi` and `?lang=en` override a previous choice.
- First visit: https://api.country.is/ resolves the visitor IP country. VN selects Vietnamese; other countries select English. Only the resulting language is cached per tab session; no IP is stored by this page.
- Lookup failure or timeout (2.5 seconds) falls back to English. VPN/proxy locations can affect the country result. An explicit English URL is shareable directly.
- Storage restrictions do not prevent switching through the explicit language links.

## Maintain

The upstream repository contains compiled static assets. The original Vietnamese bundle is preserved unchanged. `scripts/original.html` and `scripts/en.tsv` are the inputs for reproducible English asset generation: `python3 scripts/build.py`. Language bootstrapping and responsive controls are in `language.js` and `language.css`. No npm build is required.

Preview: `python3 -m http.server 8766`.
