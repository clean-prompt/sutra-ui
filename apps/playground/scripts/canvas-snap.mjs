// Pixel-diff safety net for sweeping style changes (the RTL codemod): one element screenshot per Demo canvas
// (`[data-slot="demo-canvas"]`) on every playground route, and a pixel diff between two such runs.
// Element screenshots are immune to panels added around the demos, unlike whole-page pictures.
//
//   snap:  AUDIT_BASE=http://localhost:5291/ node scripts/canvas-snap.mjs snap <outDir> [--style stock|paper] [--width 1280]
//                [--dark] [--dir ltr|rtl] [--route <substring>]
//   diff:  node scripts/canvas-snap.mjs diff <dirA> <dirB> [--out <diffDir>] [--ignore <diffDir of an A-vs-B noise run>]
//
// Reduced motion is on and animations are given time to settle. Demos that draw clocks or random data differ between
// two identical runs: take the baseline twice (A, B), `diff A B` lists them, then ignore those when diffing against a
// later run.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const [mode, ...rest] = process.argv.slice(2);
const flag = (name, def) => {
  const i = rest.indexOf(`--${name}`);
  return i < 0 ? def : rest[i + 1] && !rest[i + 1].startsWith("--") ? rest[i + 1] : true;
};
const positional = rest.slice(0, rest.findIndex((a) => a.startsWith("--")) < 0 ? rest.length : rest.findIndex((a) => a.startsWith("--")));

async function snap() {
  const out = path.resolve(positional[0]);
  const style = flag("style", "stock");
  const width = Number(flag("width", 1280));
  const dark = rest.includes("--dark");
  const dir = flag("dir", "ltr");
  const filter = flag("route", "");
  const BASE = process.env.AUDIT_BASE ?? "http://localhost:5195/";
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const first = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await first.goto(BASE, { waitUntil: "networkidle" });
  let routes = [...new Set(await first.$$eval("a[href^='#/']", (as) => as.map((a) => a.getAttribute("href").slice(2).split("/").slice(0, 2).join("/"))))];
  await first.close();
  if (filter && filter !== true) routes = routes.filter((r) => r.includes(filter));
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  // dir is set at document start (before React renders), like an app that ships <html dir="rtl">, not flipped after load
  await ctx.addInitScript((d) => {
    const set = () => { if (document.documentElement) document.documentElement.dir = d; };
    set();
    new MutationObserver(set).observe(document, { childList: true });
  }, dir);
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));
  let shots = 0;
  for (const route of routes) {
    try {
      await page.goto(`${BASE}#/${route}`, { waitUntil: "networkidle" });
      await page.evaluate(([st, d, dr]) => {
        const el = document.documentElement;
        if (st === "paper") el.dataset.style = "paper"; else delete el.dataset.style;
        el.classList.toggle("dark", d);
        el.dir = dr;
      }, [style, dark, dir]);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < h; y += 800) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(50); }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(500);
      const ids = await page.$$eval('[data-slot="demo-canvas"]', (els) => els.map((el, i) => el.closest("section[id]")?.id ?? `n${i}`));
      const seen = new Map();
      const canvases = page.locator('[data-slot="demo-canvas"]');
      for (let i = 0; i < ids.length; i++) {
        const n = seen.get(ids[i]) ?? 0;
        seen.set(ids[i], n + 1);
        const name = `${route.replace(/\//g, "_")}--${ids[i]}${n ? `-${n}` : ""}.png`;
        try {
          const loc = canvases.nth(i);
          await loc.evaluate((el) => el.scrollIntoView({ block: "center" }));
          // wait until the canvas stops moving (late layout shifts above it would crop the shot)
          let prev = "";
          for (let t = 0; t < 12; t++) {
            await page.waitForTimeout(100);
            const now = await loc.evaluate((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y + scrollY, r.width, r.height].map(Math.round).join(","); });
            if (now === prev) break;
            prev = now;
          }
          await loc.screenshot({ path: path.join(out, name), timeout: 5000, animations: "disabled", caret: "hide" });
          shots++;
        } catch { /* canvas gone or huge */ }
      }
    } catch (e) { errs.push(`${route}: ${String(e).slice(0, 80)}`); }
  }
  console.log(`snap ${path.basename(out)}: routes ${routes.length}, shots ${shots}, errors ${errs.length}`);
  for (const e of errs.slice(0, 5)) console.log("  ", e);
  await browser.close();
}

async function diff() {
  const [a, b] = positional.map((p) => path.resolve(p));
  const diffDir = flag("out", "") === "" || flag("out", "") === true ? null : path.resolve(flag("out"));
  if (diffDir) fs.mkdirSync(diffDir, { recursive: true });
  const ig = flag("ignore", "");
  const noisy = new Set(ig && ig !== true ? JSON.parse(fs.readFileSync(path.join(path.resolve(ig), "_report.json"), "utf8")).differ.map((d) => d.n) : []);
  const names = [...new Set([...fs.readdirSync(a), ...fs.readdirSync(b)])].filter((n) => n.endsWith(".png") && !noisy.has(n)).sort();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent("<canvas id=c1></canvas><canvas id=c2></canvas>");
  const same = [], differ = [], missing = [];
  for (const n of names) {
    const pa = path.join(a, n), pb = path.join(b, n);
    if (!fs.existsSync(pa) || !fs.existsSync(pb)) { missing.push(n + (fs.existsSync(pa) ? " (only A)" : " (only B)")); continue; }
    const r = await page.evaluate(async ([da, db]) => {
      const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
      const [ia, ib] = await Promise.all([load(da), load(db)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { size: [ia.width, ia.height, ib.width, ib.height] };
      const get = (img, id) => { const c = document.getElementById(id); c.width = img.width; c.height = img.height; const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0); return x.getImageData(0, 0, img.width, img.height); };
      const A = get(ia, "c1"), B = get(ib, "c2");
      let count = 0;
      const D = new ImageData(A.width, A.height);
      for (let i = 0; i < A.data.length; i += 4) {
        const d = Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]) + Math.abs(A.data[i + 3] - B.data[i + 3]);
        if (d > 0) { count++; D.data.set([255, 0, 0, 255], i); } else D.data.set([A.data[i], A.data[i + 1], A.data[i + 2], 40], i);
      }
      let png = null;
      if (count) { const c = document.createElement("canvas"); c.width = A.width; c.height = A.height; c.getContext("2d").putImageData(D, 0, 0); png = c.toDataURL("image/png").split(",")[1]; }
      return { count, total: A.width * A.height, png };
    }, [`data:image/png;base64,${fs.readFileSync(pa).toString("base64")}`, `data:image/png;base64,${fs.readFileSync(pb).toString("base64")}`]);
    if (r.size) differ.push({ n, why: `size ${r.size[0]}x${r.size[1]} vs ${r.size[2]}x${r.size[3]}` });
    else if (r.count) { differ.push({ n, why: `${r.count} px (${((r.count / r.total) * 100).toFixed(2)}%)` }); if (diffDir) fs.writeFileSync(path.join(diffDir, n), Buffer.from(r.png, "base64")); }
    else same.push(n);
  }
  console.log(`identical ${same.length}, differing ${differ.length}, unmatched ${missing.length}${noisy.size ? `, ignored as noisy ${noisy.size}` : ""}`);
  for (const d of differ) console.log(`  DIFF ${d.n}: ${d.why}`);
  for (const m of missing.slice(0, 20)) console.log(`  MISSING ${m}`);
  if (diffDir) fs.writeFileSync(path.join(diffDir, "_report.json"), JSON.stringify({ same: same.length, differ, missing }, null, 1));
  await browser.close();
}

if (mode === "snap") await snap();
else if (mode === "diff") await diff();
else console.log("usage: canvas-snap.mjs snap <outDir> [--style stock|paper] [--width N] [--dark] [--dir rtl] [--route s] | diff <A> <B> [--out dir]");
