// Usage: node audit-report.mjs <audit json> [routeSubstring] [--all]  : compact per-demo summary (tap targets summarised).
import fs from "node:fs";
const [file, filter = "", flag] = process.argv.slice(2);
const j = JSON.parse(fs.readFileSync(file, "utf8"));
const rows = j.issues.filter((i) => i.route.includes(filter) && (flag === "--all" || i.kind !== "tap-target-small"));
const by = {};
for (const i of rows) {
  const k = `${i.route}#${i.demo}`;
  const d = (by[k] ??= {});
  const sig = `${i.kind}|${i.sel}|${i.parent ?? i.with ?? ""}`;
  const e = (d[sig] ??= { ...i, widths: new Set(), n: 0 });
  e.widths.add(i.width); e.n++;
}
for (const [k, d] of Object.entries(by)) {
  console.log(`\n## ${k}`);
  for (const e of Object.values(d)) {
    const extra = [e.over && `over ${e.over}px`, e.lines && `${e.lines} lines`, e.scroll && `scroll ${e.scroll}>${e.client}`, e.size, e.overlapPct && `${e.overlapPct}% overlap with ${e.with} "${e.withText}"`].filter(Boolean).join(", ");
    console.log(`- [${e.kind}] ${e.sel.slice(0, 70)}${e.parent ? " in " + e.parent.slice(0, 40) : ""} "${(e.text || "").slice(0, 30)}" @${[...e.widths].join("/")} x${e.n} ${extra}`);
  }
}
