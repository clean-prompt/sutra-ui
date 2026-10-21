# Sutra brand (chosen: the crescent mark, ink on paper)

Sutra (sūtra) is the thread on which beads are strung. The mark (chosen 2026-10-21 in the design review, option L10 "Crescent", replacing the Bead of 2026-10-20) is a crescent bead on an upright thread: the bead is a disc with an oval bite that breaks through its top, so it has two sharp horns, and the thread comes down through the opening, runs behind the base and on below. It is drawn in one ink on paper, no gradients, shadows or tiles required.

- **Inks:** ink `#1c1915`, paper `#f7f5f0`. Everything else is a dye for the app beads (see below).
- **Mark:** `marks/mark.svg` follows the text colour (`currentColor`), `mark-ink.svg` and `mark-paper.svg` are the same drawing in the two inks (paper on dark). Keep it at 16 px or larger; at 16 px it reads as a small trident. `favicon.svg` is the bold drawing (smaller, heavier thread) paper on ink. The geometry lives in `crescent.mjs` (three filled shapes, the same path strings as `SutraMark`); it reads as a trident, and close to the letter Ψ when small: before launch, run an image search for trident and Ψ marks (Maserati's trident in particular).
- **Wordmark:** lowercase `sutra`, drawn as round-capped monoline strokes (no font needed). Lockups: `lockups/lockup.svg` (`currentColor`), `lockup-ink.svg`, `lockup-paper.svg`.
- **App icons (1024 grid):** they keep the Bead system: a tile with a thread across it, a bead on the thread and one pictogram in the bead, so a row of icons reads as beads on one string. Three tones, **mono is the default**:
  - `app-icons/mono/` ink on paper (plus `sutra.svg`, the suite icon: the bold crescent mark on a paper tile),
  - `app-icons/reversed/` paper on ink,
  - `app-icons/dyed/` paper tile and ink thread, the bead in the app's textile dye (notes turmeric, tasks henna green, calendar pomegranate, mail indigo, files saffron, journal lac, finance kohl, habits madder).
  The files carry rounded corners for preview; export full-bleed squares for iOS and Android, which apply their own mask.
- **Don't:** recolour the mark outside the two inks or a dye, add gradients, glows or shadows, stretch it, or put the paper tile on a background close to paper without its hairline edge.

## In the library

`@cleanprompt/sutra-ui` draws the same geometry: `SutraMark` (the crescent; `variant`: `glyph` default, `tile`, `reversed`, `solid`, `outline`, `badge`), `SutraWordmark` (the drawn word, or your text as children), `SutraLogo`, and `SutraAppIcon` (`tone`: `mono` default, `reversed`, `dyed`; `shape`: `rounded`, `squircle`, `circle`). `sutraAppMeta[app].dye` holds the dyes. See `packages/ui/src/assets/brand.tsx` and the playground page Foundations > Assets.

## Rebuild

```sh
node design/brand/build.mjs
```

This regenerates the SVGs here: the mark, lockups, favicon and suite icon from `crescent.mjs`, the app icons from the drawing code in `../brand-options/build.mjs` (Node only, no dependencies). The earlier directions stay in `../brand-options/` and the October 2026 review in `../review/` for reference.
