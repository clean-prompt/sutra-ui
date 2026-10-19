import * as React from "react";
import { CommandGroup, CommandItem, CommandPaletteFromRegistry } from "@sutra/ui";
import { NavBadge } from "./nav-badge";
import { RECENT_PREFIX, SEP, paletteEntries, paletteFilter, type PaletteEntry } from "./nav-search";

/* ---------------------------------------------------------------------------------------------- */
/* Recent entries (localStorage, never trusted)                                                      */
/* ---------------------------------------------------------------------------------------------- */

const RECENT_KEY = "sutra-playground:recent";
const RECENT_MAX = 6;

function readRecent(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((h): h is string => typeof h === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function writeRecent(hrefs: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(hrefs.slice(0, RECENT_MAX)));
  } catch {
    /* storage blocked or full: recents are a convenience */
  }
}

/* ---------------------------------------------------------------------------------------------- */
/* The palette                                                                                      */
/* ---------------------------------------------------------------------------------------------- */

/** ⌘K: pages and demos from nav.ts (fuzzy, with the recent ones first) above the registered shortcut commands. */
export function NavPalette() {
  const entries = React.useMemo(paletteEntries, []);
  const [open, setOpen] = React.useState(false);
  const [recent, setRecent] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (open) setRecent(readRecent());
  }, [open]);

  const go = (entry: PaletteEntry) => {
    setOpen(false);
    writeRecent([entry.href, ...readRecent().filter((h) => h !== entry.href)]);
    // Let the palette close and give focus back before the page changes.
    setTimeout(() => {
      window.location.hash = entry.href;
    }, 0);
  };

  const valueOf = (e: PaletteEntry) => [e.label, e.trail, e.keywords.join(" ")].join(SEP);
  const row = (e: PaletteEntry, prefix = "") => (
    <CommandItem
      key={`${prefix}${e.kind}:${e.href}`}
      value={`${prefix}${valueOf(e)}${SEP}${e.href}`}
      description={e.trail}
      shortcut={e.status ? <NavBadge status={e.status} since={e.since} /> : undefined}
      onSelect={() => go(e)}
    >
      {e.label}
    </CommandItem>
  );
  const byHref = React.useMemo(() => new Map(entries.map((e) => [e.href, e])), [entries]);
  const recentEntries = recent.map((h) => byHref.get(h)).filter((e): e is PaletteEntry => !!e);

  return (
    <CommandPaletteFromRegistry
      open={open}
      onOpenChange={setOpen}
      placeholder="Search pages and components, or run a command…"
      emptyState="Nothing matches"
      commandProps={{ filter: paletteFilter }}
    >
      {recentEntries.length > 0 && <CommandGroup heading="Recent">{recentEntries.map((e) => row(e, RECENT_PREFIX))}</CommandGroup>}
      <CommandGroup heading="Pages">{entries.filter((e) => e.kind !== "item").map((e) => row(e))}</CommandGroup>
      <CommandGroup heading="Components and demos">{entries.filter((e) => e.kind === "item").map((e) => row(e))}</CommandGroup>
    </CommandPaletteFromRegistry>
  );
}
