// Runs the whole layout audit the way it is run before a release: builds the library and the playground, serves the build,
// audits every page in the stock style (360, 768, 1280 px), the paper style (360, 1280), dark mode (360) and right-to-left (360, 1280), prints the counts
// per kind, and compares with an earlier run as a ratchet: any new non-tap finding fails the command.
//
// Setup once:   pnpm install && pnpm --filter playground exec playwright install chromium
// Run:          pnpm audit:all                       (from the repo root or from apps/playground)
//               pnpm audit:all --tag release         (names the run: audit/release-stock.json, -paper.json, -dark.json, -rtl.json)
//               pnpm audit:all --baseline w5         (compare with audit/w5-stock.json, -paper.json, -dark.json, -rtl.json)
//               pnpm audit:all --no-build            (the playground is already built)
//               pnpm audit:all --port 5195 --route components/forms   (serve on another port, audit one route)
// Output:       audit/<tag>-<pass>.json and audit/<tag>-<pass>/ (screenshots of flagged demos); inspect with
//               pnpm audit:report audit/<tag>-stock.json [routeSubstring] [--all]
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLAYGROUND = path.resolve(HERE, "..");
const ROOT = path.resolve(PLAYGROUND, "../..");

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);
const tag = opt("tag", `run-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`);
const baseline = opt("baseline", "");
const port = Number(opt("port", "5195"));
const route = opt("route", "");

const run = (cmd, cmdArgs, options = {}) => {
  const r = spawnSync(cmd, cmdArgs, { stdio: "inherit", cwd: ROOT, ...options });
  if (r.status !== 0) throw new Error(`${cmd} ${cmdArgs.join(" ")} failed (${r.status})`);
};

const passes = [
  { name: "stock", style: "stock", dark: "0", widths: "360,768,1280" },
  { name: "paper", style: "paper", dark: "0", widths: "360,1280" },
  { name: "dark", style: "stock", dark: "1", widths: "360" },
  // Right-to-left: the same pages with <html dir="rtl"> (layout-audit reads AUDIT_DIR).
  { name: "rtl", style: "stock", dark: "0", widths: "360,1280", dir: "rtl" },
];

// A finding's identity: where it is and what it says, without times of day (some demos print the clock).
const keyOf = (i) =>
  [i.route, i.width, i.kind, i.demo, (i.text || i.sel || "").replace(/\d{1,2}:\d{2}\s?[AP]M/gi, "T")].join("|");

const countsOf = (issues) => {
  const by = {};
  for (const i of issues) by[i.kind] = (by[i.kind] ?? 0) + 1;
  return by;
};

async function waitForServer(url, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`preview did not start on ${url}`);
}

if (!flag("no-build")) {
  run("pnpm", ["--filter", "@sutra/ui", "build"]);
  run("pnpm", ["--filter", "playground", "build"]);
}

const base = `http://localhost:${port}/`;
const preview = spawn("pnpm", ["--filter", "playground", "exec", "vite", "preview", "--port", String(port), "--strictPort"], {
  cwd: ROOT,
  stdio: "ignore",
});
const stop = () => preview.kill();
process.on("exit", stop);
process.on("SIGINT", () => process.exit(130));

let failed = false;
try {
  await waitForServer(base);
  for (const p of passes) {
    const t = `${tag}-${p.name}`;
    run("node", ["scripts/layout-audit.mjs", t, p.style, p.dark, p.widths, ...(route ? [route] : [])], {
      cwd: PLAYGROUND,
      env: { ...process.env, AUDIT_BASE: base, AUDIT_DIR: p.dir ?? "ltr" },
    });
  }
  console.log("\n== Summary ==");
  for (const p of passes) {
    const file = path.join(PLAYGROUND, "audit", `${tag}-${p.name}.json`);
    const issues = JSON.parse(fs.readFileSync(file, "utf8")).issues;
    console.log(`${p.name.padEnd(6)} ${issues.length} findings`, JSON.stringify(countsOf(issues)));
    if (!baseline) continue;
    const baseFile = path.join(PLAYGROUND, "audit", `${baseline}-${p.name}.json`);
    if (!fs.existsSync(baseFile)) {
      console.log(`  (no baseline ${path.relative(PLAYGROUND, baseFile)})`);
      continue;
    }
    const known = new Set(JSON.parse(fs.readFileSync(baseFile, "utf8")).issues.map(keyOf));
    const fresh = issues.filter((i) => i.kind !== "tap-target-small" && !known.has(keyOf(i)));
    if (fresh.length === 0) console.log("  no new findings against", baseline);
    for (const i of fresh.slice(0, 40)) {
      failed = true;
      console.log(`  NEW ${i.kind} ${i.route}#${i.demo} @${i.width}: ${(i.text || i.sel || "").slice(0, 70)}`);
    }
    if (fresh.length > 40) console.log(`  ... and ${fresh.length - 40} more`);
  }
} finally {
  stop();
}
process.exit(failed ? 1 : 0);
