// Layout audit over every playground page: a child spilling out of its parent, content clipped by an overflow-hidden
// ancestor, controls whose label wraps, overlapping in-flow controls, page-level horizontal scroll and (phone widths) tap
// targets under 24px. It is a lead list for review, not a verdict: intentional patterns (negative-margin hover bleeds, SVG
// labels, absolutely positioned overlays, scrollers) are filtered, but scrolled-out rows and decorative clipping still show.
//
// Setup once:   pnpm install && pnpm --filter playground exec playwright install chromium   (playwright is a dev dependency)
// Serve:        pnpm --filter playground build && pnpm --filter playground exec vite preview --port 5195
// Whole release audit (build, serve, three passes, ratchet against an earlier run): pnpm audit:all (scripts/audit-all.mjs)
// Run:          node scripts/layout-audit.mjs <tag> <stock|paper> <dark 0|1> <widths, e.g. 360,768,1280> [routeSubstring]
//               (AUDIT_BASE=http://localhost:<port>/ to audit another server, e.g. vite dev)
// Output:       audit/<tag>.json and audit/<tag>/ (screenshots of flagged demos); summarise with
//               node scripts/audit-report.mjs audit/<tag>.json [routeSubstring] [--all]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const [tag, style = "stock", darkArg = "0", widthsArg = "360,768,1280", filter = ""] = process.argv.slice(2);
const dark = darkArg === "1";
const widths = widthsArg.split(",").map(Number);
const BASE = process.env.AUDIT_BASE ?? "http://localhost:5195/";
const OUT = path.resolve("audit");
fs.mkdirSync(path.join(OUT, tag), { recursive: true });

// Runs inside the page. Returns { issues: [...] } for everything under <main>.
const auditInPage = () => {
  const main = document.querySelector("main") ?? document.body;
  const W = window.innerWidth;
  const issues = [];
  const cs = (el) => getComputedStyle(el);
  const short = (el) => {
    const slot = el.getAttribute("data-slot");
    const cls = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 3).join(".");
    return `${el.tagName.toLowerCase()}${slot ? `[${slot}]` : ""}${cls ? "." + cls : ""}`;
  };
  const demoOf = (el) => el.closest("section[id]")?.id ?? "(page)";
  const textOf = (el) => (el.innerText || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 50);
  const skipTree = (el) => !!el.closest('[inert], [data-sutra-marquee], .sr-only, [class*="marquee"], [aria-hidden="true"][class*="animate"], [data-slot="animated-number"] [aria-hidden="true"]');
  const scrolls = (s) => ["auto", "scroll"].includes(s.overflowX);
  const clips = (s) => ["hidden", "clip"].includes(s.overflowX);
  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== main.parentElement; p = p.parentElement) if (scrolls(cs(p))) return true;
    return false;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const s = cs(el);
    return s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
  };
  const inflow = (s) => ["static", "relative", "sticky"].includes(s.position);
  const add = (kind, el, extra = {}) => {
    const r = el.getBoundingClientRect();
    issues.push({ kind, demo: demoOf(el), sel: short(el), text: textOf(el), box: [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)], ...extra });
  };

  // A. page-level horizontal overflow
  const doc = document.documentElement;
  if (doc.scrollWidth > W + 1) {
    const wide = [];
    for (const el of main.querySelectorAll("*")) {
      if (skipTree(el) || !visible(el)) continue;
      const s = cs(el);
      if (!inflow(s) || inScroller(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > W + 1) wide.push([r.right, el]);
    }
    wide.sort((a, b) => b[0] - a[0]);
    issues.push({ kind: "page-overflow-x", demo: "(page)", sel: "html", text: "", box: [0, 0, doc.scrollWidth, 0], extra: `scrollWidth ${doc.scrollWidth} > ${W}` });
    for (const [right, el] of wide.slice(0, 4)) add("page-overflow-source", el, { right: Math.round(right) });
  }

  const all = [...main.querySelectorAll("*")].filter((el) => !skipTree(el));
  const interactiveSel = 'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="radio"], [role="checkbox"], [role="switch"], [role="option"], [role="menuitem"], [role="slider"]';

  for (const el of all) {
    if (!visible(el)) continue;
    const s = cs(el);
    const r = el.getBoundingClientRect();
    const p = el.parentElement;

    // B. child spills out of its parent's box (parent does not scroll or clip)
    const negMargin = parseFloat(s.marginLeft) < 0 || parseFloat(s.marginRight) < 0;
    const inSvg = el.closest("svg") !== null;
    if (p && p !== main && inflow(s) && !inScroller(el) && !negMargin && !inSvg) {
      const ps = cs(p);
      if (!scrolls(ps) && !clips(ps) && ps.display !== "contents" && ps.display !== "inline") {
        const pr = p.getBoundingClientRect();
        if (pr.width > 0 && (r.right > pr.right + 3 || r.left < pr.left - 3) && s.transform === "none") {
          const text = (el.textContent || "").trim().length > 0 || el.matches(interactiveSel) || el.tagName === "SVG" || el.tagName === "IMG" || el.tagName === "svg";
          if (text) add("spills-out-of-parent", el, { parent: short(p), over: Math.round(Math.max(r.right - pr.right, pr.left - r.left)) });
        }
      }
    }

    // C. content clipped horizontally by this element (overflow hidden/clip) without an ellipsis or line clamp
    if (clips(s) && s.textOverflow !== "ellipsis" && !(s.webkitLineClamp && s.webkitLineClamp !== "none") && el.scrollWidth > el.clientWidth + 3 && el.getAttribute("role") !== "progressbar" && el.clientWidth > 0) {
      const tx = (el.innerText || "").trim();
      if (tx.length > 0) add("content-clipped-x", el, { scroll: el.scrollWidth, client: el.clientWidth });
    }

    // K. content clipped vertically in a fixed-height control or box
    if (["hidden", "clip"].includes(s.overflowY) && el.scrollHeight > el.clientHeight + 3 && el.clientHeight > 12 && !(s.webkitLineClamp && s.webkitLineClamp !== "none") && el.getAttribute("data-state") !== "closed" && !el.hasAttribute("hidden") && el.getAttribute("role") !== "progressbar") {
      const tx = (el.innerText || "").trim();
      if (tx.length > 0 && !el.matches('[class*="h-0"], [data-radix-collapsible-content]')) add("content-clipped-y", el, { scroll: el.scrollHeight, client: el.clientHeight });
    }

    // D. a control whose label wraps onto several lines
    if (el.matches('button, [role="tab"], [role="radio"], [data-slot="badge"], [data-slot="chip"], [data-slot="kunji-button"]') && r.height <= 64) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const tops = [];
      for (const rc of range.getClientRects()) if (rc.width > 1 && !tops.some((t) => Math.abs(t - rc.top) < rc.height * 0.6)) tops.push(rc.top);
      if (tops.length > 1 && !(s.webkitLineClamp && s.webkitLineClamp !== "none")) {
        // icon + label in a flex row are different boxes at the same top; only text rects matter, so count text lines
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let lines = 0;
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent.trim()) continue;
          const rr = document.createRange();
          rr.selectNodeContents(n);
          const t = [];
          for (const rc of rr.getClientRects()) if (rc.width > 1 && !t.some((x) => Math.abs(x - rc.top) < rc.height * 0.6)) t.push(rc.top);
          lines = Math.max(lines, t.length);
        }
        if (lines > 1) add("control-wraps", el, { lines });
      }
    }

    // F. small tap targets (phone widths only). The hit area is the element or an absolutely positioned ::before/::after
    // (the `hitArea` class), whichever is larger; links inside running text are exempt (WCAG 2.5.8 inline exception), and so
    // is anything inside a preview that is scaled down to fit (ViewportFrame, the blocks gallery): it is not tapped at that size.
    const scaledDown = () => {
      for (let a = el.parentElement; a && a !== main; a = a.parentElement) {
        const m = /^matrix\(([-\d.e]+),/.exec(cs(a).transform);
        if (m && Number(m[1]) < 0.99 && Number(m[1]) > 0) return true;
      }
      return false;
    };
    if (W <= 480 && el.matches(interactiveSel) && !scaledDown() && !(el.tagName === "A" && (s.display === "inline" || el.closest("p") || [...(el.parentElement?.childNodes ?? [])].some((n) => n.nodeType === 3 && n.textContent.trim()))) && !(el.tagName === "INPUT" && /checkbox|radio/.test(el.type) && r.width <= 1)) {
      let w = r.width;
      let h = r.height;
      for (const pseudo of ["::before", "::after"]) {
        const p = getComputedStyle(el, pseudo);
        if (p.content !== "none" && p.content !== "normal" && p.position === "absolute" && p.pointerEvents !== "none") {
          w = Math.max(w, parseFloat(p.width) || 0);
          h = Math.max(h, parseFloat(p.height) || 0);
        }
      }
      if (w < 24 || h < 24) add("tap-target-small", el, { size: `${Math.round(w)}x${Math.round(h)}` });
    }
  }

  // E. overlapping interactive elements (not nested). A row scrolled out of its scroller or clip box does not count:
  // rects are cut to the clipping ancestors first (a wheel picker's rows extend far beyond its window).
  const shownRect = (el) => {
    let { left, top, right, bottom } = el.getBoundingClientRect();
    for (let p = el.parentElement; p && p !== main; p = p.parentElement) {
      const s = cs(p);
      if (s.overflowX === "visible" && s.overflowY === "visible") continue;
      const pr = p.getBoundingClientRect();
      if (s.overflowX !== "visible") (left = Math.max(left, pr.left)), (right = Math.min(right, pr.right));
      if (s.overflowY !== "visible") (top = Math.max(top, pr.top)), (bottom = Math.min(bottom, pr.bottom));
    }
    return { left, top, right, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  };
  const ctrls = all.filter((el) => el.matches(interactiveSel) && visible(el) && cs(el).pointerEvents !== "none" && inflow(cs(el))).slice(0, 500);
  for (let i = 0; i < ctrls.length; i++) {
    const a = ctrls[i];
    const ra = shownRect(a);
    if (ra.width <= 0 || ra.height <= 0) continue;
    for (let j = i + 1; j < ctrls.length; j++) {
      const b = ctrls[j];
      if (a.contains(b) || b.contains(a)) continue;
      const rb = shownRect(b);
      const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ix <= 2 || iy <= 2) continue;
      const area = ix * iy;
      const small = Math.min(ra.width * ra.height, rb.width * rb.height);
      if (area / small > 0.3) add("controls-overlap", a, { with: short(b), withText: textOf(b), overlapPct: Math.round((area / small) * 100) });
    }
  }
  return issues;
};

const browser = await chromium.launch();
const first = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await first.goto(BASE, { waitUntil: "networkidle" });
let routes = [...new Set(await first.$$eval("a[href^='#/']", (as) => as.map((a) => a.getAttribute("href").slice(2).split("/").slice(0, 2).join("/"))))];
await first.close();
if (filter) routes = routes.filter((r) => r.includes(filter));

const result = { tag, style, dark, widths, routes: routes.length, issues: [] };
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));
  for (const route of routes) {
    await page.goto(`${BASE}#/${route}`, { waitUntil: "networkidle" });
    await page.evaluate(([st, d]) => { if (st === "paper") document.documentElement.dataset.style = "paper"; else delete document.documentElement.dataset.style; document.documentElement.classList.toggle("dark", d); }, [style, dark]);
    await page.waitForTimeout(500);
    // scroll through to trigger lazy content
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 900) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(60); }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(250);
    let found = [];
    try { found = await page.evaluate(auditInPage); } catch (e) { errs.push("audit failed: " + String(e).slice(0, 100)); }
    for (const i of found) result.issues.push({ route, width: w, ...i });
    const demos = [...new Set(found.filter((i) => i.kind !== "tap-target-small" && i.demo !== "(page)").map((i) => i.demo))].slice(0, 6);
    for (const d of demos) {
      try {
        const loc = page.locator(`section[id="${d}"]`).first();
        await loc.scrollIntoViewIfNeeded({ timeout: 2000 });
        await loc.screenshot({ path: path.join(OUT, tag, `${route.replace(/\//g, "_")}--${d}--${w}.png`), timeout: 4000 });
      } catch { /* demo may be gone or huge */ }
    }
  }
  if (errs.length) result.issues.push({ route: "(run)", width: w, kind: "page-errors", demo: "", sel: "", text: errs.join(" | ").slice(0, 300), box: [] });
  await ctx.close();
}
fs.writeFileSync(path.join(OUT, `${tag}.json`), JSON.stringify(result, null, 1));
const byKind = {};
for (const i of result.issues) byKind[i.kind] = (byKind[i.kind] ?? 0) + 1;
console.log(tag, "routes", routes.length, "issues", result.issues.length, JSON.stringify(byKind));
await browser.close();
