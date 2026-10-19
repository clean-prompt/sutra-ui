# Sutra brand (chosen: option 01 "Bead", ink on paper)

Sutra (sūtra) is the thread on which beads are strung. The mark is a ring bead strung on a thread: the thread passes over the left rim and under the right rim. It is drawn in one ink on paper, no gradients, shadows or tiles required.

- **Inks:** ink `#1c1915`, paper `#f7f5f0`. Everything else is a dye for the app beads (see below).
- **Mark:** `marks/mark.svg` follows the text colour (`currentColor`), `mark-ink.svg` and `mark-paper.svg` are the same drawing in the two inks (paper on dark). Keep it at 16 px or larger; at 16 px the crossing is lost and it reads as a ring on a line, which is expected. `favicon.svg` is the bold drawing (heavier thread) paper-on-ink.
- **Wordmark:** lowercase `sutra`, drawn as round-capped monoline strokes (no font needed). Lockups: `lockups/lockup.svg` (`currentColor`), `lockup-ink.svg`, `lockup-paper.svg`.
- **App icons (1024 grid):** a tile with a thread across it, a bead on the thread and one pictogram in the bead, so a row of icons reads as beads on one string. Three tones, **mono is the default**:
  - `app-icons/mono/` ink on paper (plus `sutra.svg` for the suite icon),
  - `app-icons/reversed/` paper on ink,
  - `app-icons/dyed/` paper tile and ink thread, the bead in the app's textile dye (notes turmeric, tasks henna green, calendar pomegranate, mail indigo, files saffron, journal lac, finance kohl, habits madder).
  The files carry rounded corners for preview; export full-bleed squares for iOS and Android, which apply their own mask.
- **Don't:** recolour the mark outside the two inks or a dye, add gradients, glows or shadows, stretch it, or put the paper tile on a background close to paper without its hairline edge.

## In the library

`@sutra/ui` draws the same geometry: `SutraMark` (`variant`: `glyph` default, `tile`, `reversed`, `solid`, `outline`, `badge`), `SutraWordmark` (the drawn word, or your text as children), `SutraLogo`, and `SutraAppIcon` (`tone`: `mono` default, `reversed`, `dyed`; `shape`: `rounded`, `squircle`, `circle`). `sutraAppMeta[app].dye` holds the dyes. See `packages/ui/src/assets/brand.tsx` and the playground page Foundations > Assets.

## Rebuild

```sh
node design/brand/build.mjs
```

This regenerates the SVGs here from the drawing code in `../brand-options/build.mjs` (Node only, no dependencies). The six rejected directions stay in `../brand-options/` for reference.
