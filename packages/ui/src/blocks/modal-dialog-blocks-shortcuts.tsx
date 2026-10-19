/** KeyboardShortcutsDialog: static shortcut groups shown through ShortcutsDialog. */
import * as React from "react";
import { ShortcutsDialog, useShortcutRegistry, type ShortcutRegistryGroup } from "../patterns/shortcuts";
import { type BlockDialogBaseProps, useDialogOpen } from "./modal-dialog-blocks-internal";

/* ------------------------------------------------------------------ */
/* KeyboardShortcutsDialog                                             */
/* ------------------------------------------------------------------ */

export interface ShortcutEntry {
  label: string;
  /** Keys pressed together, e.g. ["⌘", "K"]. Use "then" to show a sequence. */
  keys: string[];
}

export interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutEntry[];
}

export interface KeyboardShortcutsDialogProps extends BlockDialogBaseProps {
  /**
   * Static groups. When omitted inside a `ShortcutProvider`, the dialog lists the live shortcut
   * registry instead (falling back to a default Sutra reference when the registry is empty).
   */
  groups?: ShortcutGroup[];
  /**
   * Dialog heading.
   * @default "Keyboard shortcuts"
   */
  title?: React.ReactNode;
}

const defaultShortcutGroups: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { label: "Command menu", keys: ["⌘", "K"] },
      { label: "Toggle sidebar", keys: ["⌘", "B"] },
      { label: "Keyboard shortcuts", keys: ["?"] },
      { label: "Settings", keys: ["⌘", ","] },
    ],
  },
  {
    title: "Create",
    shortcuts: [
      { label: "New note", keys: ["⌥", "N"] },
      { label: "New task", keys: ["⌥", "T"] },
      { label: "New event", keys: ["⌥", "E"] },
      { label: "Journal entry", keys: ["⌥", "J"] },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { label: "Go to Home", keys: ["G", "then", "H"] },
      { label: "Go to Inbox", keys: ["G", "then", "I"] },
      { label: "Go to Today", keys: ["G", "then", "T"] },
      { label: "Search", keys: ["/"] },
    ],
  },
  {
    title: "Editor",
    shortcuts: [
      { label: "Bold", keys: ["⌘", "B"] },
      { label: "Italic", keys: ["⌘", "I"] },
      { label: "Insert link", keys: ["⌘", "⇧", "K"] },
      { label: "Checklist", keys: ["⌘", "⇧", "9"] },
    ],
  },
];

const glyphKeyNames: Record<string, string> = { "⌘": "meta", "⌥": "alt", "⇧": "shift", "⌃": "ctrl" };
const keyNames: Record<string, string> = { ...glyphKeyNames, "+": "plus", " ": "space" };

/** `["⌘", "⇧", "K"]` → `"meta+shift+k"`; "then" separates sequence steps (`["G", "then", "H"]` → `"g h"`). */
function toShortcutSpec(keys: string[]): string {
  const steps: string[][] = [[]];
  for (const raw of keys) {
    const key = raw.trim();
    const name = keyNames[raw] ?? keyNames[key] ?? key.toLowerCase().replace(/\s+/g, "");
    if (key.toLowerCase() === "then") steps.push([]);
    else if (name) steps[steps.length - 1].push(name);
  }
  return steps
    .filter((step) => step.length > 0)
    .map((step) => step.join("+"))
    .join(" ");
}

/** Static groups as registry groups for `ShortcutsDialog`. */
function toRegistryGroups(groups: ShortcutGroup[]): ShortcutRegistryGroup[] {
  return groups.map((g, gi) => ({
    group: g.title,
    shortcuts: g.shortcuts.map((s, i) => {
      const keys = toShortcutSpec(s.keys);
      return { id: `${gi}:${i}:${s.label}`, keys, allKeys: [keys], label: s.label, group: g.title, scope: "static", active: true, run: () => {} };
    }),
  }));
}

/**
 * Searchable reference of keyboard shortcuts, grouped, rendered with Kbd keys. A preset over `ShortcutsDialog`:
 * it lists the live shortcut registry, or the static `groups` (keys written with mac glyphs keep rendering as glyphs).
 */
export function KeyboardShortcutsDialog({
  groups: groupsProp,
  title = "Keyboard shortcuts",
  trigger,
  className,
  ...openProps
}: KeyboardShortcutsDialogProps) {
  const [open, setOpen] = useDialogOpen(openProps);
  const registry = useShortcutRegistry();
  const useRegistry = !groupsProp && registry.shortcuts.length > 0;
  const staticGroups = groupsProp ?? defaultShortcutGroups;
  const extraGroups = React.useMemo(() => toRegistryGroups(staticGroups), [staticGroups]);
  const glyphs = staticGroups.some((g) => g.shortcuts.some((s) => s.keys.some((k) => k.trim() in glyphKeyNames)));

  return (
    <ShortcutsDialog
      open={open}
      onOpenChange={setOpen}
      keys={null}
      trigger={trigger}
      title={title}
      description="All keyboard shortcuts available in Sutra."
      includeRegistry={useRegistry}
      extraGroups={useRegistry ? undefined : extraGroups}
      platform={!useRegistry && glyphs ? "mac" : undefined}
      className={className}
    />
  );
}
KeyboardShortcutsDialog.displayName = "KeyboardShortcutsDialog";
