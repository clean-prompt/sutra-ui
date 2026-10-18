import * as React from "react";
import { RiAlertLine, RiArrowGoBackLine, RiEditLine, RiKeyboardLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { Button } from "../primitives/button";
import { SearchInput } from "../primitives/input";
import {
  ShortcutKeys,
  detectShortcutPlatform,
  formatShortcut,
  useShortcutPlatform,
  useShortcutRegistry,
  type ShortcutPlatform,
} from "./shortcuts";

/* ------------------------------------------------------------------ */
/* recordKeyCombo                                                      */
/* ------------------------------------------------------------------ */

type KeyEventLike = Pick<KeyboardEvent, "key" | "code" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">;

export interface RecordKeyComboOptions {
  /** Defaults to the detected platform. ⌘ (mac) / Ctrl (other) are recorded as `mod`. */
  platform?: ShortcutPlatform;
  /** Record the platform primary modifier as `mod`. Default true. */
  useMod?: boolean;
}

const modifierOnly = new Set(["shift", "control", "alt", "meta", "os", "altgraph", "capslock", "fn", "hyper", "super", "dead"]);

const recordAliases: Record<string, string> = {
  " ": "space",
  spacebar: "space",
  esc: "escape",
  up: "arrowup",
  down: "arrowdown",
  left: "arrowleft",
  right: "arrowright",
  del: "delete",
  return: "enter",
};

const codeKeys: Record<string, string> = {
  Space: "space",
  Slash: "/",
  Backslash: "\\",
  Comma: ",",
  Period: ".",
  Semicolon: ";",
  Quote: "'",
  BracketLeft: "[",
  BracketRight: "]",
  Minus: "-",
  Equal: "=",
  Backquote: "`",
};

function keyFromCode(code: string | undefined) {
  if (!code) return "";
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^Digit\d$/.test(code)) return code.slice(5);
  return codeKeys[code] ?? "";
}

/**
 * Turn a keydown into a keys spec compatible with `formatShortcut` ("mod+shift+k", "alt+arrowup").
 * Returns null while only modifiers are held.
 */
export function recordKeyCombo(event: KeyEventLike, options: RecordKeyComboOptions = {}): string | null {
  const platform = options.platform ?? detectShortcutPlatform();
  const useMod = options.useMod ?? true;
  const rawKey = event.key ?? "";
  const lower = rawKey.toLowerCase();
  if (!rawKey || modifierOnly.has(lower) || lower === "unidentified") return null;
  let key = recordAliases[lower] ?? lower;
  const fromCode = keyFromCode(event.code);
  // Option/Alt and Shift change the produced character (e.g. ⌥K → "˚", ⇧1 → "!"): prefer the physical key.
  const nonAscii = key.length === 1 && !/^[\x20-\x7e]$/.test(key);
  if (fromCode && (event.altKey || nonAscii || (event.shiftKey && /^Key[A-Z]$/.test(event.code ?? "")))) key = fromCode;
  const mac = platform === "mac";
  const parts: string[] = [];
  if (useMod) {
    if (mac ? event.metaKey : event.ctrlKey) parts.push("mod");
    if (mac ? event.ctrlKey : event.metaKey) parts.push(mac ? "ctrl" : "meta");
  } else {
    if (event.ctrlKey) parts.push("ctrl");
    if (event.metaKey) parts.push("meta");
  }
  if (event.altKey) parts.push("alt");
  if (event.shiftKey) parts.push("shift");
  parts.push(key);
  return parts.join("+");
}

/* ------------------------------------------------------------------ */
/* KeybindEditor                                                       */
/* ------------------------------------------------------------------ */

export interface KeybindItem {
  id: string;
  label: string;
  group?: string;
  description?: string;
  /** Current keys spec; "" means unbound. */
  keys: string;
  /** Default keys spec used by reset. Defaults to `keys`. */
  defaultKeys?: string;
}

export interface KeybindEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** Shortcut list. Falls back to `useShortcutRegistry()` inside a `ShortcutProvider`. */
  shortcuts?: KeybindItem[];
  /** Controlled overrides: id → keys ("" = cleared). */
  value?: Record<string, string>;
  defaultValue?: Record<string, string>;
  onValueChange?: (overrides: Record<string, string>) => void;
  /** Fired for every binding change (including the cleared side of a replace and resets). */
  onChange?: (id: string, keys: string) => void;
  onResetAll?: () => void;
  platform?: ShortcutPlatform;
  searchPlaceholder?: string;
}

interface Pending {
  id: string;
  keys: string;
  conflictId: string;
}

/** Searchable, grouped shortcut list with a key recorder, conflict detection and reset. */
export const KeybindEditor = React.forwardRef<HTMLDivElement, KeybindEditorProps>(
  (
    {
      shortcuts: shortcutsProp,
      value: valueProp,
      defaultValue = {},
      onValueChange,
      onChange,
      onResetAll,
      platform: platformProp,
      searchPlaceholder = "Search shortcuts…",
      className,
      ...props
    },
    ref
  ) => {
    const registry = useShortcutRegistry({ includeInactive: true });
    const contextPlatform = useShortcutPlatform();
    const platform = platformProp ?? contextPlatform;
    const items: KeybindItem[] = React.useMemo(
      () =>
        shortcutsProp ??
        registry.shortcuts.map((s) => ({ id: s.id, label: s.label, group: s.group, description: s.description, keys: s.keys })),
      [shortcutsProp, registry.shortcuts]
    );

    const [overrides, commitOverrides] = useControllableState<Record<string, string>>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    });

    const [query, setQuery] = React.useState("");
    const [recording, setRecording] = React.useState<string | null>(null);
    const [pending, setPending] = React.useState<Pending | null>(null);
    const uid = React.useId();
    const editButtons = React.useRef(new Map<string, HTMLButtonElement>());

    const defaultOf = (item: KeybindItem) => item.defaultKeys ?? item.keys;
    const keysOf = (item: KeybindItem) => (item.id in overrides ? overrides[item.id]! : item.keys);
    const norm = (keys: string) => (keys ? formatShortcut(keys, { platform }) : "");

    const apply = (changes: Record<string, string>) => {
      const next = { ...overrides };
      for (const [id, keys] of Object.entries(changes)) {
        const item = items.find((i) => i.id === id);
        if (item && keys === item.keys) delete next[id];
        else next[id] = keys;
      }
      commitOverrides(next);
      for (const [id, keys] of Object.entries(changes)) onChange?.(id, keys);
    };

    // The recorder unmounts when recording ends: hand focus back to the row's edit button instead of <body>.
    const stopRecording = (item: KeybindItem) => {
      editButtons.current.get(item.id)?.focus();
      setRecording(null);
    };

    const handleRecordKey = (item: KeybindItem, e: React.KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const plain = !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
      if (e.key === "Escape" && plain) {
        stopRecording(item);
        return;
      }
      if ((e.key === "Backspace" || e.key === "Delete") && plain) {
        stopRecording(item);
        apply({ [item.id]: "" });
        return;
      }
      if (e.key === "Tab" && plain) {
        stopRecording(item);
        return;
      }
      const combo = recordKeyCombo(e.nativeEvent ?? e, { platform });
      if (!combo) return;
      stopRecording(item);
      const conflict = items.find((other) => other.id !== item.id && keysOf(other) && norm(keysOf(other)) === norm(combo));
      if (conflict) setPending({ id: item.id, keys: combo, conflictId: conflict.id });
      else apply({ [item.id]: combo });
    };

    const q = query.trim().toLowerCase();
    const visible = items.filter((item) => {
      if (!q) return true;
      const k = keysOf(item);
      return [item.label, item.group ?? "", item.description ?? "", k, norm(k)].some((s) => s.toLowerCase().includes(q));
    });
    const groups = new Map<string, KeybindItem[]>();
    for (const item of visible) {
      const g = item.group ?? "General";
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(item);
    }
    const anyChanged = items.some((item) => keysOf(item) !== defaultOf(item));

    return (
      <div ref={ref} className={cn("flex flex-col gap-4", className)} {...props}>
        <div className="flex items-center gap-2">
          <SearchInput
            aria-label="Search shortcuts"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            wrapperClassName="flex-1"
            className="flex-1"
          />
          <Button
            variant="outline"
            size="md"
            leadingIcon={<RiArrowGoBackLine aria-hidden />}
            disabled={!anyChanged}
            onClick={() => {
              const changed = items.filter((item) => keysOf(item) !== defaultOf(item));
              const next: Record<string, string> = {};
              for (const item of items) if (defaultOf(item) !== item.keys) next[item.id] = defaultOf(item);
              commitOverrides(next);
              setPending(null);
              for (const item of changed) onChange?.(item.id, defaultOf(item));
              onResetAll?.();
            }}
          >
            Reset all
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-box border border-dashed border-border py-10 text-sm text-muted-foreground">
            <RiKeyboardLine aria-hidden className="size-5" />
            No shortcuts registered.
          </div>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No shortcuts match “{query}”</p>
        ) : (
          [...groups.entries()].map(([group, list], gi) => (
            <section key={group} aria-labelledby={`${uid}-g${gi}`} className="flex flex-col gap-1.5">
              <h3 id={`${uid}-g${gi}`} className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group}
              </h3>
              <ul className="divide-y divide-border overflow-hidden rounded-box border border-border bg-card">
                {list.map((item) => {
                  const keys = keysOf(item);
                  const isRecording = recording === item.id;
                  const isPending = pending?.id === item.id;
                  const changed = keys !== defaultOf(item);
                  const conflictItem = isPending ? items.find((i) => i.id === pending.conflictId) : undefined;
                  return (
                    <li key={item.id} data-keybind={item.id} className="flex flex-col gap-2 px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">{item.label}</div>
                          {item.description && <div className="truncate text-xs text-muted-foreground">{item.description}</div>}
                        </div>
                        {isRecording ? (
                          <button
                            type="button"
                            autoFocus
                            aria-label={`Recording shortcut for ${item.label}. Press keys, Escape to cancel, Backspace to clear`}
                            data-recording=""
                            onKeyDown={(e) => handleRecordKey(item, e)}
                            onBlur={() => setRecording((r) => (r === item.id ? null : r))}
                            className={cn(
                              "h-7 min-w-28 rounded-control border border-dashed border-primary bg-primary-soft px-2.5 text-xs font-medium text-primary-soft-foreground motion-safe:animate-pulse",
                              focusRing
                            )}
                          >
                            Press keys…
                          </button>
                        ) : keys ? (
                          <ShortcutKeys keys={keys} platform={platform} size="md" />
                        ) : (
                          <span className="text-xs italic text-muted-foreground">Not set</span>
                        )}
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Edit shortcut for ${item.label}`}
                            ref={(el) => {
                              if (el) editButtons.current.set(item.id, el);
                              else editButtons.current.delete(item.id);
                            }}
                            onClick={() => {
                              setPending(null);
                              setRecording(item.id);
                            }}
                          >
                            <RiEditLine aria-hidden />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Reset ${item.label} to default`}
                            disabled={!changed}
                            className={cn(!changed && "invisible")}
                            onClick={() => {
                              setPending(null);
                              apply({ [item.id]: defaultOf(item) });
                            }}
                          >
                            <RiArrowGoBackLine aria-hidden />
                          </Button>
                        </div>
                      </div>
                      {isPending && (
                        <div
                          role="alert"
                          className="flex flex-wrap items-center gap-2 rounded-sm bg-warning-soft px-2.5 py-1.5 text-xs text-warning-soft-foreground"
                        >
                          <RiAlertLine aria-hidden className="size-4 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <ShortcutKeys keys={pending.keys} platform={platform} className="mr-1 align-middle" /> is already used by{" "}
                            <strong className="font-semibold">{conflictItem?.label ?? pending.conflictId}</strong>.
                          </span>
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => {
                              apply({ [pending.id]: pending.keys, [pending.conflictId]: "" });
                              setPending(null);
                            }}
                          >
                            Replace
                          </Button>
                          <Button size="xs" variant="ghost" onClick={() => setPending(null)}>
                            Cancel
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    );
  }
);
KeybindEditor.displayName = "KeybindEditor";
