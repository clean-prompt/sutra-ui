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

/** Texts of the editor (English by default); pass any of them to translate it. */
export interface KeybindEditorLabels {
  /** Name of the search field. Default "Search shortcuts". */
  search?: string;
  /** The reset-all button. Default "Reset all". */
  resetAll?: string;
  /** Text when there are no shortcuts. Default "No shortcuts registered". */
  noShortcuts?: string;
  /** Text when the search matches nothing. */
  noMatch?: (query: string) => string;
  /** Group of an item that has none. Default "General". */
  general?: string;
  /** Name of the recorder while it listens. */
  recording?: (label: string) => string;
  /** Text inside the recorder. Default "Press keys…". */
  pressKeys?: string;
  /** Text of an unbound shortcut. Default "Not set". */
  notSet?: string;
  /** Name of a row's edit button. */
  edit?: (label: string) => string;
  /** Name of a row's reset button. */
  reset?: (label: string) => string;
  /** Conflict message; gets the new keys and the name of the shortcut that has them. */
  conflict?: (keys: React.ReactNode, name: React.ReactNode) => React.ReactNode;
  /** The replace button of a conflict. Default "Replace". */
  replace?: string;
  /** The cancel button of a conflict. Default "Cancel". */
  cancel?: string;
}

const defaultLabels: Required<KeybindEditorLabels> = {
  search: "Search shortcuts",
  resetAll: "Reset all",
  noShortcuts: "No shortcuts registered",
  noMatch: (query) => `No shortcuts match “${query}”`,
  general: "General",
  recording: (label) => `Recording shortcut for ${label}. Press keys, Escape to cancel, Backspace to clear`,
  pressKeys: "Press keys…",
  notSet: "Not set",
  edit: (label) => `Edit shortcut for ${label}`,
  reset: (label) => `Reset ${label} to default`,
  conflict: (keys, name) => (
    <>
      {keys} is already used by <strong className="font-semibold">{name}</strong>.
    </>
  ),
  replace: "Replace",
  cancel: "Cancel",
};

export interface KeybindEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** Shortcut list. Falls back to `useShortcutRegistry()` inside a `ShortcutProvider`. */
  shortcuts?: KeybindItem[];
  /** Controlled overrides: id → keys ("" = cleared). */
  value?: Record<string, string>;
  /** Initial overrides when uncontrolled: an object of id to keys. */
  defaultValue?: Record<string, string>;
  /** Called with the full overrides object after a binding changes or is reset. */
  onValueChange?: (overrides: Record<string, string>) => void;
  /** Fired for every binding change (including the cleared side of a replace and resets). @deprecated Use `onValueChange` (the overrides object) when the whole value is enough. */
  onChange?: (id: string, keys: string) => void;
  /** Called after the user resets every binding to its default. */
  onResetAll?: () => void;
  /** Platform whose key glyphs are shown. Defaults to the detected platform. */
  platform?: ShortcutPlatform;
  /**
   * Placeholder of the search field.
   * @default "Search shortcuts…"
   */
  searchPlaceholder?: string;
  /** Texts and accessible names (English by default); pass them to translate the editor. */
  labels?: KeybindEditorLabels;
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
      labels,
      className,
      ...props
    },
    ref
  ) => {
    const text = { ...defaultLabels, ...labels };
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
      const g = item.group ?? text.general;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(item);
    }
    const anyChanged = items.some((item) => keysOf(item) !== defaultOf(item));

    return (
      <div ref={ref} data-slot="keybind-editor" className={cn("flex flex-col gap-4", className)} {...props}>
        <div className="flex items-center gap-2">
          <SearchInput
            aria-label={text.search}
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
            {text.resetAll}
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-box border border-dashed border-border py-10 text-sm text-muted-foreground">
            <RiKeyboardLine aria-hidden className="size-5" />
            {text.noShortcuts}
          </div>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{text.noMatch(query)}</p>
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
                    <li key={item.id} data-slot="keybind-editor-row" data-keybind={item.id} className="flex flex-col gap-2 px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">{item.label}</div>
                          {item.description && <div className="truncate text-xs text-muted-foreground">{item.description}</div>}
                        </div>
                        {isRecording ? (
                          <button
                            type="button"
                            autoFocus
                            aria-label={text.recording(item.label)}
                            data-recording=""
                            onKeyDown={(e) => handleRecordKey(item, e)}
                            onBlur={() => setRecording((r) => (r === item.id ? null : r))}
                            className={cn(
                              "h-7 min-w-28 rounded-control border border-dashed border-primary bg-primary-soft px-2.5 text-xs font-medium text-primary-soft-foreground motion-safe:animate-pulse",
                              focusRing
                            )}
                          >
                            {text.pressKeys}
                          </button>
                        ) : keys ? (
                          <ShortcutKeys keys={keys} platform={platform} size="md" />
                        ) : (
                          <span className="text-xs italic text-muted-foreground">{text.notSet}</span>
                        )}
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={text.edit(item.label)}
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
                            aria-label={text.reset(item.label)}
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
                            {text.conflict(
                              <ShortcutKeys keys={pending.keys} platform={platform} className="me-1 align-middle" />,
                              conflictItem?.label ?? pending.conflictId
                            )}
                          </span>
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => {
                              apply({ [pending.id]: pending.keys, [pending.conflictId]: "" });
                              setPending(null);
                            }}
                          >
                            {text.replace}
                          </Button>
                          <Button size="xs" variant="ghost" onClick={() => setPending(null)}>
                            {text.cancel}
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
