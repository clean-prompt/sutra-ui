/** Fictional data used by the marketing block demos and the playground (`marketingDemoData`). */
import {
  RiBrainLine,
  RiCodeSSlashLine,
  RiFlashlightLine,
  RiGlobalLine,
  RiLockLine,
  RiPlugLine,
  RiRobot2Line,
  RiTeamLine,
} from "@remixicon/react";
import { slugify } from "../lib/text";
import { hueOf } from "./marketing-blocks-internal";
import type { MarketplaceAuthor, MarketplaceExtension, MarketplaceTier } from "./marketing-blocks-model";
import type { Testimonial } from "./marketing-blocks-browse";
import type { FeatureGridItem, InstallSnippetTab } from "./marketing-blocks-features";
import type { ComparisonFootnote, ComparisonProduct, ComparisonRow } from "./marketing-blocks-comparison";

/* ------------------------------------------------------------------ */
/* Demo data (fictional)                                               */
/* ------------------------------------------------------------------ */

const demoAuthors: MarketplaceAuthor[] = [
  { name: "Sutra Labs", handle: "sutra", bio: "The team behind Sutra" },
  { name: "Maya Patel", handle: "mayap", bio: "Automation tinkerer" },
  { name: "Theo Laurent", handle: "theol", bio: "Search and retrieval" },
  { name: "Ines Okafor", handle: "ines", bio: "Security engineer" },
  { name: "Kenji Mori", handle: "kmori", bio: "Dev tooling" },
  { name: "Northwind Co.", handle: "northwind", bio: "Business integrations" },
];

const rawExtensions: [string, string, number, string, MarketplaceTier, number, string[]][] = [
  ["Calendar Sync", "Two-way sync between Sutra tasks and your calendars with conflict detection.", 0, "Productivity", "official", 4820, ["calendar.read", "calendar.write", "tasks.read", "notify"]],
  ["Inbox Zero", "Triage mail with agent-written summaries, snooze rules and one-key replies.", 0, "Productivity", "official", 3910, ["mail.read", "mail.send", "summarize"]],
  ["Focus Timer", "Pomodoro sessions that pause notifications and log deep work.", 1, "Productivity", "community", 860, ["notify", "timer"]],
  ["Meeting Notes", "Turns call transcripts into decisions, owners and follow-up tasks.", 1, "Productivity", "verified", 2140, ["audio.transcribe", "tasks.write", "summarize", "share"]],
  ["Git Companion", "Explain diffs, draft commit messages and review pull requests in chat.", 4, "Developer tools", "verified", 5630, ["repo.read", "shell", "diff", "review", "comment"]],
  ["Log Lens", "Tail and query logs with natural language; pin anomalies to a board.", 4, "Developer tools", "community", 1270, ["logs.read", "query"]],
  ["API Playground", "Send requests, save collections and let the agent write test cases.", 4, "Developer tools", "community", 940, ["http", "tests.write", "secrets.read"]],
  ["Schema Doctor", "Lint JSON schemas and database migrations before they ship.", 0, "Developer tools", "official", 2310, ["fs.read", "lint", "sql"]],
  ["Deep Search", "Hybrid keyword and vector search across notes, files and mail.", 2, "Data & search", "verified", 6120, ["index", "embed", "search", "files.read"]],
  ["Web Clipper", "Save pages as clean markdown with highlights and source links.", 2, "Data & search", "community", 1780, ["clip", "files.write"]],
  ["Sheets Bridge", "Read and write spreadsheets; the agent builds pivot summaries for you.", 5, "Data & search", "verified", 2450, ["sheets.read", "sheets.write", "chart"]],
  ["Paper Trail", "Cite sources automatically when the agent answers from your library.", 2, "Data & search", "community", 690, ["cite", "search"]],
  ["Team Chat Relay", "Bridge Sutra agents into team channels with per-channel permissions.", 0, "Communication", "official", 3340, ["chat.read", "chat.send", "mentions"]],
  ["Daily Digest", "A morning brief of tasks, events and unread threads, delivered your way.", 1, "Communication", "community", 1120, ["summarize", "notify", "calendar.read", "mail.read"]],
  ["Voice Notes", "Record voice memos that become searchable notes with action items.", 1, "Communication", "verified", 1530, ["audio.transcribe", "notes.write"]],
  ["Status Pages", "Post incident updates to your status page from a single command.", 5, "Communication", "community", 410, ["http", "notify"]],
  ["Workflow Builder", "Chain triggers, agents and actions on a visual canvas.", 0, "Automation", "official", 7210, ["triggers", "agents", "http", "schedule", "webhooks"]],
  ["Cron Jobs", "Schedule recurring agent runs with retries and run history.", 4, "Automation", "verified", 2980, ["schedule", "agents"]],
  ["Form Router", "Route form submissions to the right inbox, sheet or task list.", 5, "Automation", "community", 520, ["webhooks", "sheets.write", "tasks.write"]],
  ["Invoice Bot", "Extract line items from receipts and draft invoices for approval.", 5, "Automation", "community", 760, ["ocr", "files.read", "finance.write"]],
  ["Secret Scanner", "Blocks tokens and keys from leaving your workspace in agent output.", 3, "Security", "official", 4470, ["scan", "redact", "middleware"]],
  ["Permission Audit", "Weekly report of which extensions used which permissions.", 3, "Security", "verified", 1640, ["audit", "notify"]],
  ["Vault Connector", "Fetch secrets just-in-time from your vault instead of env files.", 3, "Security", "verified", 2090, ["secrets.read", "env"]],
  ["Sandbox Runner", "Run untrusted tools in an isolated, network-restricted sandbox.", 3, "Security", "community", 1380, ["sandbox", "shell", "fs.read"]],
];

const iso = (dayOffset: number) => new Date(Date.UTC(2026, 0, 5) + dayOffset * 86_400_000).toISOString().slice(0, 10);

const demoExtensions: MarketplaceExtension[] = rawExtensions.map(([name, description, a, category, tier, stars, capabilities], i) => {
  const author = demoAuthors[a]!;
  const id = slugify(name);
  return {
    id,
    name,
    author,
    description,
    category,
    tier,
    stars,
    capabilities,
    version: `${1 + (i % 3)}.${(i * 7) % 10}.${i % 4}`,
    addedAt: iso((i * 11) % 180),
    updatedAt: iso(180 + ((i * 17) % 100)),
    platforms: i % 3 === 0 ? ["macOS", "Linux", "Windows"] : i % 3 === 1 ? ["macOS", "Linux"] : ["Web"],
    sha: (hueOf(id) * 2654435761).toString(16).replace("-", "").padEnd(12, "a").slice(0, 12),
    license: i % 4 === 0 ? "Apache-2.0" : "MIT",
    installCommand: `sutra plugins install ${author.handle}/${id}`,
    provides: {
      tools: capabilities.filter((c) => !["middleware", "env"].includes(c)).map((c) => c.replace(".", "_")),
      hooks: i % 2 === 0 ? ["on_message", "before_tool_call"] : ["on_schedule"],
      middleware: capabilities.includes("middleware") ? ["redact_output"] : [],
    },
    requiresEnv: capabilities.some((c) => c.startsWith("secrets") || c === "http") ? [`${id.toUpperCase().replace(/-/g, "_")}_TOKEN`] : [],
    screenshots: ["Overview", "Settings", "Run history", "Activity", "Permissions", "Logs", "Extra"].slice(0, 3 + (i % 5)).map((c, j) => ({ id: `s${j}`, caption: `${name}: ${c}` })),
    readme: `## ${name}\n\n${description}\n\n### Install\n\n\`\`\`sh\nsutra plugins install ${author.handle}/${id}\n\`\`\`\n\n### Configuration\n\n| Setting | Default | Description |\n| --- | --- | --- |\n| \`enabled\` | \`true\` | Turn the extension on or off |\n| \`scope\` | \`workspace\` | Where it applies |\n\n- Works offline where possible\n- Respects workspace permissions\n`,
  };
});

const demoTestimonials: Testimonial[] = [
  { id: "t1", source: "x", name: "Priya Raman", handle: "@priyabuilds", categories: ["Agents", "Speed"], href: "#testimonial-t1", quote: "Replaced four tabs and two scripts with one Sutra workflow. My mornings are quiet now." },
  { id: "t2", source: "reddit", name: "u/quietcompiler", handle: "r/selfhosted", categories: ["Privacy"], href: "#testimonial-t2", quote: "Runs entirely on my box, makes zero calls home by default, and the plugin permissions are actually readable." },
  { id: "t3", source: "discord", name: "Leo M.", handle: "Sutra community", categories: ["Plugins"], quote: "Wrote my first plugin in an afternoon. The hooks API is small enough to keep in your head." },
  { id: "t4", source: "blog", name: "Ama Owusu", handle: "amaowusu.dev", categories: ["Agents", "Plugins"], href: "#testimonial-t4", quote: "The subagent tree finally made delegation debuggable. I can see which child stalled and steer it without restarting the whole run." },
  { id: "t5", source: "hn", name: "jkessler", categories: ["Privacy", "Speed"], quote: "Snappy, local-first and the UI doesn't fight you. Rare combination." },
  { id: "t6", source: "github", name: "Dana Whitfield", handle: "@dwhit", categories: ["Plugins"], href: "#testimonial-t6", quote: "Clean extension manifest, sensible review process, fast merges. Contributing felt good." },
  { id: "t7", source: "youtube", name: "Build With Sam", handle: "@buildwithsam", categories: ["Speed"], quote: "Set up calendar sync, inbox triage and a daily digest in under ten minutes, on camera." },
  { id: "t8", source: "x", name: "Rafael Ortiz", handle: "@rafa_o", categories: ["Agents"], quote: "Auto reload on credits means my overnight agents never stall at 3am anymore." },
];

const demoFeatures: FeatureGridItem[] = [
  { icon: <RiRobot2Line aria-hidden />, title: "Agents that finish", description: "Plans, tools and retries built in, so long tasks complete without babysitting." },
  { icon: <RiLockLine aria-hidden />, title: "Private by default", description: "Runs on your machine. Nothing leaves unless you connect it." },
  { icon: <RiPlugLine aria-hidden />, title: "678 extensions", description: "Calendar, mail, git, search and more, installed in one command." },
  { icon: <RiFlashlightLine aria-hidden />, title: "Fast everywhere", description: "Native apps for macOS, Windows and Linux, plus a lightweight web client." },
  { icon: <RiTeamLine aria-hidden />, title: "Built for teams", description: "Shared workspaces, roles, audit logs and SSO on Team and Enterprise." },
  { icon: <RiCodeSSlashLine aria-hidden />, title: "Hackable", description: "A small hooks API and typed manifests make writing plugins a weekend project." },
  { icon: <RiBrainLine aria-hidden />, title: "Bring any model", description: "Route between hosted and local models per task, with spend limits." },
  { icon: <RiGlobalLine aria-hidden />, title: "Works offline", description: "Notes, tasks and search keep working on a plane." },
];

const demoInstallTabs: InstallSnippetTab[] = [
  { id: "curl", label: "curl", command: "curl -fsSL sutra.dev/install.sh | sh", note: "macOS and Linux. Installs to ~/.sutra and adds it to your PATH." },
  { id: "brew", label: "Homebrew", command: ["brew tap sutra/tap", "brew install sutra"] },
  { id: "npm", label: "npm", command: "npm install -g @sutra/cli", note: "Requires Node 20 or later." },
  { id: "pip", label: "pip", command: "pip install sutra-cli" },
];

const demoComparison: { products: ComparisonProduct[]; rows: ComparisonRow[]; footnotes: ComparisonFootnote[] } = {
  products: [
    { id: "sutra", name: "Sutra", highlight: true },
    { id: "atlas", name: "Atlas AI" },
    { id: "relay", name: "Relay Desk" },
  ],
  rows: [
    { feature: "Runs locally", values: { sutra: "yes", atlas: "no", relay: "partial" }, footnote: "local" },
    { feature: "Plugin marketplace", values: { sutra: "yes", atlas: "yes", relay: "no" } },
    { feature: "Bring your own model", values: { sutra: "yes", atlas: "partial", relay: "no" } },
    { feature: "Subagents", description: "Delegate work to child agents", values: { sutra: "yes", atlas: "no", relay: "no" } },
    { feature: "Audit log", values: { sutra: "yes", atlas: "yes", relay: "partial" }, footnote: "audit" },
    { feature: "Starting price", values: { sutra: "Free", atlas: "$25/mo", relay: "$12/seat" } },
  ],
  footnotes: [
    { id: "local", text: "Relay Desk offers an on-prem appliance on its enterprise plan only." },
    { id: "audit", text: "Audit log on Sutra Team and Enterprise; Relay Desk keeps 7 days." },
  ],
};

/** Fictional data used by the marketing block demos and the playground. */
export const marketingDemoData = {
  authors: demoAuthors,
  extensions: demoExtensions,
  testimonials: demoTestimonials,
  features: demoFeatures,
  installTabs: demoInstallTabs,
  comparison: demoComparison,
};
