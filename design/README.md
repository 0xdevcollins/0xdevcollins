# How the profile is built

Every image on the profile is generated. Nothing is hand-edited.

| What | Source | Command |
| --- | --- | --- |
| Copy, links, colors | `profile.config.mjs` | edit, then `npm run render` |
| Cards (`assets/dark`, `assets/light`) | `design/cards.mjs` | `npm run render` (needs Chrome; `brew install webp` for WebP output) |
| `README.md` | `scripts/readme.mjs` | written by `npm run render` |
| Product screenshots (`assets/shots`) | live sites | `npm run shots`, then `npm run render` |
| Stats and recent merges (`assets/stats-*.svg`) | GitHub GraphQL | the workflow, every 6 hours |

Run the stats locally with `GH_TOKEN=$(gh auth token) npm run stats`, or offline with `npm run stats:sample`.

## The system

The profile reads as a set of engineering drawing sheets.

- **Sheets.** Every section has a header strip with a sheet number (`Sheet 03 / 07`), a 24px drafting grid, and registration marks in the corners. Sheet numbers come from the order in `profile.config.mjs`.
- **Type.** Instrument Serif for names and headlines, roman with italic for contrast. Geist for reading text. Geist Mono, uppercase and tracked, for every annotation.
- **Hero.** The name, plus a system diagram that wires each product into Stellar, and a title block along the bottom like the one on a drawing.
- **Products.** One full-width sheet each, with sides alternating. The live site sits on a panel tinted with the product color, with a hard offset shadow and crop marks. The capture month comes from the screenshot file.
- **Stack.** A bill of materials. "Used in" is computed from project tags, so it can't drift from the projects.
- **Activity.** Numbers, a weekly sparkline, and the latest merged pull requests in public repos. The profile page already shows the contribution calendar, so the card does not repeat it.

## Rules

- Each product keeps its own brand color everywhere it appears: diagram, sheet, bill of materials.
- Every image ships in a light and a dark version. GitHub picks one with `prefers-color-scheme`.
- Alt text carries the full content of each image, so the page reads fine without the pictures.
- Stats are self-hosted. No third-party card service that can go down.
- SVG animations hold the finished state as the default, so a renderer without SMIL still shows the chart.
- Numbers and lists on the profile come from data. Nothing is typed in by hand.
- Keep it light. Cards are lossless WebP, and the stats SVG defines each letter shape once.

## Fonts

Instrument Serif, Geist and Geist Mono, all under the SIL Open Font License, from Fontsource.
