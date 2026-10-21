#!/usr/bin/env node
/**
 * The chosen Sutra brand, ink on paper: final SVG files for the mark, lockup, favicon and app icons.
 *   node build.mjs
 * The mark is the crescent bead on an upright thread (review option L10, chosen 2026-10-21), drawn by ./crescent.mjs, the same
 * path strings as packages/ui/src/assets/brand-internal.ts. The app icons keep the Bead system of option 01 (a tile with a thread
 * across it and a bead holding the pictogram) from ../brand-options/build.mjs. App icons use the 1024 grid; marks and
 * lockups the 64 box.
 */
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { apps, appName, picto, tile, lockup, file64, file1024, dye, APP_DYE, INK, PAPER } from "../brand-options/build.mjs";
import { FINE, BOLD } from "./crescent.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NS = 'xmlns="http://www.w3.org/2000/svg"';
const RX = 14.3;
const hairline = (rx = RX) => `<rect x="0.5" y="0.5" width="63" height="63" rx="${rx - 0.5}" fill="none" stroke="${INK}" stroke-opacity="0.14"/>`;

/** The mark's three filled shapes (crescent, thread above, thread below) in one colour. */
const shapes = (G, color) => `<g fill="${color}"><path d="${G.bead}"/><path d="${G.above}"/><path d="${G.below}"/></g>`;
const markIn = (color) => shapes(FINE, color);

/** One app icon: tile, thread across it, a bead on the thread, one pictogram in the bead. */
function icon(app, tone) {
  const reversed = tone === "reversed";
  const thread = reversed ? PAPER : INK;
  const beadFill = tone === "dyed" ? dye(APP_DYE[app]) : thread;
  const glyph = reversed ? INK : PAPER;
  return (
    tile(reversed ? INK : PAPER) +
    (reversed ? "" : hairline()) +
    `<rect y="30.7" width="64" height="2.6" fill="${thread}"/>` +
    `<circle cx="32" cy="32" r="21" fill="${beadFill}"/>` +
    picto(app, { size: 26, w: 2.6, color: glyph })
  );
}

/** The suite icon: the bold mark in ink on a paper tile with its hairline edge. */
const suiteIcon = () => tile(PAPER) + hairline() + shapes(BOLD, INK);

function lockupFile(mark, color) {
  const L = lockup(mark, color, { xh: 22, w: 4.8, gap: 12 });
  return `<svg ${NS} viewBox="${L.vb}" width="${+(L.w * 4).toFixed(2)}" height="256" role="img" aria-label="sutra">\n<title>sutra</title>\n${L.inner}\n</svg>\n`;
}

for (const d of ["app-icons", "marks", "lockups"]) rmSync(join(HERE, d), { recursive: true, force: true });
for (const d of ["marks", "lockups", "app-icons/mono", "app-icons/reversed", "app-icons/dyed"]) mkdirSync(join(HERE, d), { recursive: true });
const w = (f, s) => writeFileSync(join(HERE, f), s);

w("marks/mark.svg", file64(markIn("currentColor"), "Sutra mark"));
w("marks/mark-ink.svg", file64(markIn(INK), "Sutra mark, ink"));
w("marks/mark-paper.svg", file64(markIn(PAPER), "Sutra mark, paper (for dark backgrounds)"));
w("favicon.svg", file64(tile(INK) + shapes(BOLD, PAPER), "Sutra").replace('width="256" height="256"', 'width="32" height="32"'));
w("lockups/lockup.svg", lockupFile(markIn("currentColor"), "currentColor"));
w("lockups/lockup-ink.svg", lockupFile(markIn(INK), INK));
w("lockups/lockup-paper.svg", lockupFile(markIn(PAPER), PAPER));
w("app-icons/mono/sutra.svg", file1024(suiteIcon(), "Sutra"));
for (const tone of ["mono", "reversed", "dyed"]) for (const a of apps) w(`app-icons/${tone}/${a}.svg`, file1024(icon(a, tone), `Sutra ${appName[a]}`));
console.log("wrote the Sutra brand files (crescent mark, Bead app icons) to", HERE);
