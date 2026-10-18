import * as React from "react";
import { RiKeyboardBoxLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { Kbd } from "./typography";
import { SearchInput } from "./input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ShortcutPlatform = "mac" | "other";

/** Called when a shortcut fires. `event` is undefined when run from a palette. */
export type ShortcutHandler = (event?: KeyboardEvent) => void;

export interface ShortcutOptions {
  /** Stable id; defaults to `<scope>:<keys>`. Registrations with the same id are listed once. */
  id?: string;
  /** Human label. Unlabelled shortcuts work but are not listed in the registry. */
  label?: string;
  /** Group heading in cheat sheets and palettes. Default "General". */
  group?: string;
  description?: string;
  /** "global" (default) or a named scope pushed with `useShortcutScope` / `<ShortcutScope>`. */
  scope?: string;
  /** Extra runtime guard checked when the key is pressed. */
  when?: () => boolean;
  /** Fire even when focus is in an input, textarea, select or contenteditable. */
  allowInInputs?: boolean;
  /** Hide from the registry listing. */
  hidden?: boolean;
  /** Call `preventDefault()` when handled. Default true. */
  preventDefault?: boolean;
  /** Temporarily disable without unregistering. Default true. */
  enabled?: boolean;
}

export interface ShortcutDefinition extends ShortcutOptions {
  /** "mod+k", "shift+?", "g t" (sequence), or an array of alternatives. */
  keys: string | string[];
  handler: ShortcutHandler;
}

interface ParsedCombo {
  key: string;
  mod: boolean;
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

type ParsedSequence = ParsedCombo[];

interface EventCombo {
  key: string;
  codeKey: string;
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

const keyAliases: Record<string, string> = {
  esc: "escape",
  return: "enter",
  up: "arrowup",
  down: "arrowdown",
  left: "arrowleft",
  right: "arrowright",
  del: "delete",
  ins: "insert",
  spacebar: "space",
  " ": "space",
  plus: "+",
  pgup: "pageup",
  pgdn: "pagedown",
  question: "?",
  slash: "/",
  comma: ",",
  period: ".",
};

const modifierAliases: Record<string, "mod" | "meta" | "ctrl" | "alt" | "shift"> = {
  mod: "mod",
  cmd: "meta",
  command: "meta",
  meta: "meta",
  super: "meta",
  win: "meta",
  ctrl: "ctrl",
  control: "ctrl",
  alt: "alt",
  opt: "alt",
  option: "alt",
  shift: "shift",
};

const modifierKeys = new Set(["shift", "control", "alt", "meta", "os", "altgraph", "capslock", "fn", "hyper", "super"]);

function normalizeKeyName(key: string) {
  const k = key.toLowerCase();
  return keyAliases[k] ?? k;
}

function parseCombo(token: string): ParsedCombo {
  let parts: string[];
  if (token === "+") parts = ["+"];
  else if (token.endsWith("++")) parts = [...token.slice(0, -2).split("+"), "+"];
  else parts = token.split("+");
  const combo: ParsedCombo = { key: "", mod: false, meta: false, ctrl: false, alt: false, shift: false };
  parts.forEach((raw, i) => {
    const part = raw.trim();
    const lower = part.toLowerCase();
    const modifier = i < parts.length - 1 ? modifierAliases[lower] : undefined;
    if (modifier) combo[modifier] = true;
    else combo.key = normalizeKeyName(part);
  });
  return combo;
}

/** Parse a keys string ("mod+k", "g t") into a sequence of combos. */
function parseSequence(keys: string): ParsedSequence {
  return keys.trim().split(/\s+/).filter(Boolean).map(parseCombo);
}

function toKeyList(keys: string | string[]): string[] {
  return (Array.isArray(keys) ? keys : [keys]).filter((k) => k.trim().length > 0);
}

const codeKeyMap: Record<string, string> = {
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

function codeToKey(code: string | undefined) {
  if (!code) return "";
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^Digit\d$/.test(code)) return code.slice(5);
  return codeKeyMap[code] ?? "";
}

function eventCombo(event: KeyboardEvent): EventCombo {
  return {
    key: normalizeKeyName(event.key ?? ""),
    codeKey: codeToKey(event.code),
    meta: event.metaKey,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
  };
}

function isSymbolKey(key: string) {
  return key.length === 1 && !/[a-z0-9]/i.test(key);
}

function matchCombo(combo: ParsedCombo, ev: EventCombo, platform: ShortcutPlatform) {
  const meta = combo.meta || (combo.mod && platform === "mac");
  const ctrl = combo.ctrl || (combo.mod && platform !== "mac");
  if (ev.meta !== meta || ev.ctrl !== ctrl || ev.alt !== combo.alt) return false;
  const keyMatches = ev.key === combo.key || (ev.alt && ev.codeKey === combo.key);
  if (!keyMatches) return false;
  // Symbols like "?" are typed with shift on most layouts: only enforce shift when it is spelled out.
  if (isSymbolKey(combo.key)) return combo.shift ? ev.shift : true;
  return ev.shift === combo.shift;
}

/** True when the event target is a text field or contenteditable region. */
export function isEditableTarget(target: EventTarget | null) {
  if (!target || typeof (target as Element).closest !== "function") return false;
  const el = target as HTMLElement;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = ((el as HTMLInputElement).type || "text").toLowerCase();
    return !["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image"].includes(type);
  }
  return el.closest('[contenteditable]:not([contenteditable="false"])') != null;
}

/**
 * True when a single keyboard event matches `keys` ("mod+k", "/", "shift+?", or an array of alternatives),
 * using the same rules as `useShortcut` (`mod` is ⌘ on macOS and Ctrl elsewhere). Sequences ("g t") never match.
 */
export function matchesShortcut(
  event: KeyboardEvent | React.KeyboardEvent,
  keys: string | string[],
  platform: ShortcutPlatform = detectShortcutPlatform()
): boolean {
  const ev = eventCombo("nativeEvent" in event ? event.nativeEvent : event);
  return toKeyList(keys).some((k) => {
    const seq = parseSequence(k);
    return seq.length === 1 && matchCombo(seq[0]!, ev, platform);
  });
}

/** Detects macOS / iOS. Returns "other" on the server. */
export function detectShortcutPlatform(): ShortcutPlatform {
  if (typeof navigator === "undefined") return "other";
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent || "";
  return /mac|iphone|ipad|ipod/i.test(platform) ? "mac" : "other";
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export interface FormatShortcutOptions {
  /** Defaults to the detected platform. */
  platform?: ShortcutPlatform;
}

const macGlyphs: Record<string, string> = {
  meta: "⌘",
  ctrl: "⌃",
  alt: "⌥",
  shift: "⇧",
  enter: "↵",
  escape: "⎋",
  backspace: "⌫",
  delete: "⌦",
  tab: "⇥",
};

const otherLabels: Record<string, string> = {
  meta: "Win",
  ctrl: "Ctrl",
  alt: "Alt",
  shift: "Shift",
  enter: "↵",
  escape: "Esc",
  backspace: "Backspace",
  delete: "Del",
  tab: "Tab",
};

const sharedLabels: Record<string, string> = {
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  space: "Space",
  pageup: "PgUp",
  pagedown: "PgDn",
  home: "Home",
  end: "End",
  insert: "Ins",
};

const spokenNames: Record<string, string> = {
  meta: "Command",
  ctrl: "Control",
  alt: "Option",
  shift: "Shift",
  enter: "Enter",
  escape: "Escape",
  backspace: "Backspace",
  delete: "Delete",
  tab: "Tab",
  arrowup: "Up arrow",
  arrowdown: "Down arrow",
  arrowleft: "Left arrow",
  arrowright: "Right arrow",
  space: "Space",
  "?": "Question mark",
  "/": "Slash",
  ",": "Comma",
  ".": "Period",
  "+": "Plus",
};

function comboParts(combo: ParsedCombo, platform: ShortcutPlatform) {
  const mac = platform === "mac";
  const meta = combo.meta || (combo.mod && mac);
  const ctrl = combo.ctrl || (combo.mod && !mac);
  const mods = [ctrl && "ctrl", combo.alt && "alt", combo.shift && "shift", meta && "meta"].filter(Boolean) as string[];
  return [...mods, combo.key];
}

function keyLabel(name: string, platform: ShortcutPlatform) {
  const table = platform === "mac" ? macGlyphs : otherLabels;
  if (table[name]) return table[name];
  if (sharedLabels[name]) return sharedLabels[name];
  if (/^f\d{1,2}$/.test(name)) return name.toUpperCase();
  return name.length === 1 ? name.toUpperCase() : name.charAt(0).toUpperCase() + name.slice(1);
}

function spokenLabel(name: string, platform: ShortcutPlatform) {
  if (name === "alt" && platform !== "mac") return "Alt";
  if (name === "meta" && platform !== "mac") return "Windows";
  return spokenNames[name] ?? keyLabel(name, platform);
}

/** Key labels per sequence step: `"mod+shift+k"` → `[["⌘", "⇧", "K"]]` on mac. */
export function getShortcutKeyLabels(keys: string, options: FormatShortcutOptions = {}): string[][] {
  const platform = options.platform ?? detectShortcutPlatform();
  return parseSequence(keys).map((combo) => comboParts(combo, platform).map((p) => keyLabel(p, platform)));
}

/** Platform-aware display string: "⌘⇧K" on mac, "Ctrl+Shift+K" elsewhere; sequences read "G then T". */
export function formatShortcut(keys: string | string[], options: FormatShortcutOptions = {}): string {
  const platform = options.platform ?? detectShortcutPlatform();
  return toKeyList(keys)
    .map((k) =>
      getShortcutKeyLabels(k, { platform })
        .map((step) => step.join(platform === "mac" ? "" : "+"))
        .join(" then ")
    )
    .join(" / ");
}

function spokenShortcut(keys: string, platform: ShortcutPlatform) {
  return parseSequence(keys)
    .map((combo) => comboParts(combo, platform).map((p) => spokenLabel(p, platform)).join(" "))
    .join(" then ");
}

/** True when a string is a keys spec ("mod+k", "g t") rather than pre-rendered glyphs ("⌘K"). */
export function isShortcutKeys(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && /^[\x20-\x7e]+$/.test(value);
}

/* ------------------------------------------------------------------ */
/* Manager                                                             */
/* ------------------------------------------------------------------ */

interface ShortcutEntryInternal {
  uid: number;
  seq: number;
  keys: string[];
  parsed: ParsedSequence[];
  ref: { current: ShortcutDefinition };
}

interface ScopeFrame {
  uid: number;
  name: string;
  exclusive: boolean;
}

export interface ShortcutManagerOptions {
  platform?: ShortcutPlatform;
  /** Max delay between the keys of a sequence. Default 1000ms. */
  sequenceTimeout?: number;
}

/** Framework-agnostic shortcut engine used by `ShortcutProvider` (and by `useShortcut` without one). */
export class ShortcutManager {
  platform: ShortcutPlatform;
  sequenceTimeout: number;
  private entries = new Map<number, ShortcutEntryInternal>();
  private scopes: ScopeFrame[] = [];
  private listeners = new Set<() => void>();
  private snapshot: ShortcutEntryInternal[] | null = null;
  private buffer: { combo: EventCombo; time: number }[] = [];
  private counter = 0;

  constructor(options: ShortcutManagerOptions = {}) {
    this.platform = options.platform ?? detectShortcutPlatform();
    this.sequenceTimeout = options.sequenceTimeout ?? 1000;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => {
    if (!this.snapshot) this.snapshot = [...this.entries.values()].sort((a, b) => a.seq - b.seq);
    return this.snapshot;
  };

  private emit() {
    this.snapshot = null;
    this.listeners.forEach((l) => l());
  }

  /** Register a shortcut. `ref.current` is read on every key press so handlers can change freely. */
  register(ref: { current: ShortcutDefinition }) {
    const uid = ++this.counter;
    const keys = toKeyList(ref.current.keys);
    this.entries.set(uid, { uid, seq: uid, keys, parsed: keys.map(parseSequence), ref });
    this.emit();
    return () => {
      this.entries.delete(uid);
      this.emit();
    };
  }

  /** Push a scope on the stack. Exclusive scopes block everything beneath them (including global). */
  pushScope(name: string, exclusive = false) {
    const uid = ++this.counter;
    this.scopes.push({ uid, name, exclusive });
    this.emit();
    return () => {
      this.scopes = this.scopes.filter((s) => s.uid !== uid);
      this.emit();
    };
  }

  /** Active scopes, highest priority first. */
  activeScopes(): string[] {
    const out: string[] = [];
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const frame = this.scopes[i];
      if (!out.includes(frame.name)) out.push(frame.name);
      if (frame.exclusive) return out;
    }
    if (!out.includes("global")) out.push("global");
    return out;
  }

  isScopeActive(scope: string | undefined) {
    return this.activeScopes().includes(scope ?? "global");
  }

  /** Run a registered shortcut's handler by id or uid. */
  run(id: string | number) {
    const entry = [...this.entries.values()]
      .reverse()
      .find((e) => e.uid === id || entryId(e) === id);
    if (!entry) return false;
    entry.ref.current.handler(undefined);
    return true;
  }

  handleKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing) return;
    const key = (event.key ?? "").toLowerCase();
    if (!key || modifierKeys.has(key)) return;

    const combo = eventCombo(event);
    const now = Date.now();
    const inInput = isEditableTarget(event.target);
    const last = this.buffer[this.buffer.length - 1];
    if (inInput || (last && now - last.time > this.sequenceTimeout)) this.buffer = [];
    this.buffer.push({ combo, time: now });
    if (this.buffer.length > 6) this.buffer.shift();

    const scopes = this.activeScopes();
    let best: { entry: ShortcutEntryInternal; rank: number; len: number } | null = null;
    for (const entry of this.entries.values()) {
      const def = entry.ref.current;
      if (def.enabled === false) continue;
      const rank = scopes.indexOf(def.scope ?? "global");
      if (rank < 0) continue;
      if (inInput && !def.allowInInputs) continue;
      for (const seq of entry.parsed) {
        if (!seq.length || seq.length > this.buffer.length) continue;
        const tail = this.buffer.slice(this.buffer.length - seq.length);
        if (!seq.every((c, i) => matchCombo(c, tail[i].combo, this.platform))) continue;
        if (def.when && !def.when()) continue;
        const better =
          !best ||
          rank < best.rank ||
          (rank === best.rank && (seq.length > best.len || (seq.length === best.len && entry.seq > best.entry.seq)));
        if (better) best = { entry, rank, len: seq.length };
      }
    }
    if (!best) return;
    const def = best.entry.ref.current;
    if (def.preventDefault !== false) event.preventDefault();
    if (best.len > 1) this.buffer = [];
    def.handler(event);
  };
}

function entryId(entry: ShortcutEntryInternal) {
  const def = entry.ref.current;
  return def.id ?? `${def.scope ?? "global"}:${entry.keys.join("|")}`;
}

/* ------------------------------------------------------------------ */
/* Provider & hooks                                                    */
/* ------------------------------------------------------------------ */

const ShortcutContext = React.createContext<ShortcutManager | null>(null);
const ShortcutScopeNameContext = React.createContext<string | undefined>(undefined);

export interface ShortcutProviderProps extends ShortcutManagerOptions {
  children?: React.ReactNode;
  /** Element the keydown listener attaches to. Default `document`. */
  target?: Document | HTMLElement | null;
}

/** Central keyboard shortcut registry. Mount once near the app root. */
export function ShortcutProvider({ children, platform, sequenceTimeout, target }: ShortcutProviderProps) {
  const [manager] = React.useState(() => new ShortcutManager({ platform, sequenceTimeout }));
  manager.platform = platform ?? manager.platform;
  manager.sequenceTimeout = sequenceTimeout ?? manager.sequenceTimeout;
  React.useEffect(() => {
    const el = target ?? (typeof document !== "undefined" ? document : null);
    if (!el) return;
    const listener = manager.handleKeyDown as EventListener;
    el.addEventListener("keydown", listener);
    return () => el.removeEventListener("keydown", listener);
  }, [manager, target]);
  return <ShortcutContext.Provider value={manager}>{children}</ShortcutContext.Provider>;
}
ShortcutProvider.displayName = "ShortcutProvider";

/** The nearest `ShortcutManager`, or null outside a `ShortcutProvider`. */
export function useShortcutManager() {
  return React.useContext(ShortcutContext);
}

/** True when rendered inside a `ShortcutProvider`. */
export function useHasShortcutProvider() {
  return React.useContext(ShortcutContext) != null;
}

/** Platform used for `mod` and glyphs (from the provider, else detected). */
export function useShortcutPlatform(): ShortcutPlatform {
  const manager = React.useContext(ShortcutContext);
  const [detected] = React.useState(detectShortcutPlatform);
  return manager?.platform ?? detected;
}

function signature(def: ShortcutDefinition, scope: string | undefined) {
  return JSON.stringify([
    toKeyList(def.keys),
    def.id,
    def.label,
    def.group,
    def.description,
    scope,
    def.hidden,
    def.enabled,
  ]);
}

/** Register several shortcuts at once. Works standalone (local listener) without a provider. */
export function useShortcuts(definitions: ShortcutDefinition[]) {
  const provider = React.useContext(ShortcutContext);
  const scopeName = React.useContext(ShortcutScopeNameContext);
  const [local] = React.useState(() => (provider ? null : new ShortcutManager()));
  const manager = provider ?? local;

  const refs = React.useRef<{ current: ShortcutDefinition }[]>([]);
  const withScope = definitions.map((d) => (d.scope || !scopeName ? d : { ...d, scope: scopeName }));
  withScope.forEach((def, i) => {
    if (!refs.current[i]) refs.current[i] = { current: def };
    else refs.current[i].current = def;
  });
  refs.current.length = withScope.length;
  const sig = withScope.map((d) => signature(d, d.scope)).join("\n");

  React.useEffect(() => {
    if (!manager) return;
    const offs = refs.current.map((ref) => manager.register(ref));
    return () => offs.forEach((off) => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manager, sig]);

  React.useEffect(() => {
    if (provider || !local || typeof document === "undefined") return;
    document.addEventListener("keydown", local.handleKeyDown);
    return () => document.removeEventListener("keydown", local.handleKeyDown);
  }, [provider, local]);
}

export interface UseShortcutOptions extends ShortcutOptions {}

/** Bind `keys` to `handler`. Pass `null` keys (or `enabled: false`) to disable. */
export function useShortcut(keys: string | string[] | null | undefined, handler: ShortcutHandler, options: UseShortcutOptions = {}) {
  useShortcuts(keys && toKeyList(keys).length ? [{ ...options, keys, handler }] : []);
}

export interface UseShortcutScopeOptions {
  enabled?: boolean;
  /** Block every lower scope, including global (modal behaviour). */
  exclusive?: boolean;
}

/** Push a named scope while mounted so its shortcuts shadow lower scopes. */
export function useShortcutScope(name: string, { enabled = true, exclusive = false }: UseShortcutScopeOptions = {}) {
  const manager = React.useContext(ShortcutContext);
  React.useEffect(() => {
    if (!manager || !enabled) return;
    return manager.pushScope(name, exclusive);
  }, [manager, name, enabled, exclusive]);
}

export interface ShortcutScopeProps extends UseShortcutScopeOptions {
  name: string;
  children?: React.ReactNode;
}

/** Activates a scope while mounted; `useShortcut` calls inside default to this scope. */
export function ShortcutScope({ name, children, ...options }: ShortcutScopeProps) {
  useShortcutScope(name, options);
  return <ShortcutScopeNameContext.Provider value={name}>{children}</ShortcutScopeNameContext.Provider>;
}
ShortcutScope.displayName = "ShortcutScope";

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export interface ShortcutRegistryItem {
  id: string;
  /** Primary keys string. */
  keys: string;
  /** All alternative keys strings. */
  allKeys: string[];
  label: string;
  group: string;
  description?: string;
  scope: string;
  /** True when the shortcut's scope is currently active. */
  active: boolean;
  run: () => void;
}

export interface ShortcutRegistryGroup {
  group: string;
  shortcuts: ShortcutRegistryItem[];
}

export interface ShortcutRegistry {
  shortcuts: ShortcutRegistryItem[];
  groups: ShortcutRegistryGroup[];
  run: (id: string) => boolean;
  /** False outside a `ShortcutProvider` (the registry is then always empty). */
  available: boolean;
}

export interface UseShortcutRegistryOptions {
  /** Include shortcuts whose scope is not active. Default false. */
  includeInactive?: boolean;
}

const emptyStore = {
  subscribe: () => () => {},
  getSnapshot: () => emptyEntries,
};
const emptyEntries: ShortcutEntryInternal[] = [];

/** All labelled, non-hidden shortcuts in the registry, grouped. Deduplicated by id (latest wins). */
export function useShortcutRegistry({ includeInactive = false }: UseShortcutRegistryOptions = {}): ShortcutRegistry {
  const manager = React.useContext(ShortcutContext);
  const store = manager ?? emptyStore;
  const entries = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  return React.useMemo(() => {
    const byId = new Map<string, ShortcutRegistryItem>();
    for (const entry of entries) {
      const def = entry.ref.current;
      if (def.hidden || def.enabled === false || !def.label || !entry.keys.length) continue;
      const scope = def.scope ?? "global";
      const active = manager ? manager.isScopeActive(scope) : false;
      if (!active && !includeInactive) continue;
      const id = entryId(entry);
      byId.delete(id);
      byId.set(id, {
        id,
        keys: entry.keys[0],
        allKeys: entry.keys,
        label: def.label,
        group: def.group ?? "General",
        description: def.description,
        scope,
        active,
        run: () => entry.ref.current.handler(undefined),
      });
    }
    const shortcuts = [...byId.values()];
    const groupMap = new Map<string, ShortcutRegistryItem[]>();
    for (const s of shortcuts) {
      if (!groupMap.has(s.group)) groupMap.set(s.group, []);
      groupMap.get(s.group)!.push(s);
    }
    return {
      shortcuts,
      groups: [...groupMap.entries()].map(([group, list]) => ({ group, shortcuts: list })),
      run: (id: string) => manager?.run(id) ?? false,
      available: manager != null,
    };
  }, [entries, manager, includeInactive]);
}

/* ------------------------------------------------------------------ */
/* ShortcutKeys                                                        */
/* ------------------------------------------------------------------ */

export interface ShortcutKeysProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Keys spec: "mod+k", "shift+?", "g t". */
  keys: string;
  platform?: ShortcutPlatform;
  /** Classes for each Kbd chip. */
  kbdClassName?: string;
  size?: "sm" | "md";
}

/** Renders a keys spec as platform-aware Kbd chips, with "then" between sequence steps. */
export const ShortcutKeys = React.forwardRef<HTMLSpanElement, ShortcutKeysProps>(
  ({ keys, platform: platformProp, kbdClassName, size = "sm", className, ...props }, ref) => {
    const contextPlatform = useShortcutPlatform();
    const platform = platformProp ?? contextPlatform;
    const steps = getShortcutKeyLabels(keys, { platform });
    return (
      <span ref={ref} data-shortcut={keys} className={cn("inline-flex shrink-0 items-center gap-1", className)} {...props}>
        <span aria-hidden className="inline-flex items-center gap-1">
          {steps.map((step, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-[11px] opacity-70">then</span>}
              <span className="inline-flex items-center gap-0.5">
                {step.map((label, j) => (
                  <Kbd key={j} className={cn(size === "md" && "h-6 min-w-6 text-xs", kbdClassName)}>
                    {label}
                  </Kbd>
                ))}
              </span>
            </React.Fragment>
          ))}
        </span>
        <span className="sr-only">{spokenShortcut(keys, platform)}</span>
      </span>
    );
  }
);
ShortcutKeys.displayName = "ShortcutKeys";

/* ------------------------------------------------------------------ */
/* ShortcutsDialog                                                     */
/* ------------------------------------------------------------------ */

export interface ShortcutsDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Shortcut that toggles the sheet. Default "shift+?"; `null` disables. */
  keys?: string | null;
  title?: React.ReactNode;
  description?: string;
  /** Extra static groups appended to the registry listing. */
  extraGroups?: ShortcutRegistryGroup[];
  className?: string;
}

/** Cheat sheet auto-populated from the shortcut registry, with search. Opens with shift+? by default. */
export function ShortcutsDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  keys = "shift+?",
  title = "Keyboard shortcuts",
  description = "Every shortcut available on this screen.",
  extraGroups,
  className,
}: ShortcutsDialogProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });

  useShortcut(keys, () => setOpen((o) => !o), {
    id: "sutra:shortcuts-dialog",
    label: "Keyboard shortcuts",
    group: "General",
  });

  const registry = useShortcutRegistry();
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const groups = [...registry.groups, ...(extraGroups ?? [])]
    .map((g) => ({
      ...g,
      shortcuts: g.shortcuts.filter(
        (s) =>
          !q ||
          s.label.toLowerCase().includes(q) ||
          s.group.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.allKeys.some((k) => k.toLowerCase().includes(q))
      ),
    }))
    .filter((g) => g.shortcuts.length > 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DialogContent size="lg" className={className}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RiKeyboardBoxLine aria-hidden className="size-5 text-muted-foreground" />
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">{description}</DialogDescription>
        </DialogHeader>
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          placeholder="Search shortcuts…"
          aria-label="Search shortcuts"
        />
        <DialogBody className="max-h-[60dvh]">
          {groups.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {q ? `No shortcuts match “${query}”` : "No shortcuts registered"}
            </p>
          ) : (
            <div className="grid gap-x-8 gap-y-6 pb-1 sm:grid-cols-2">
              {groups.map((group) => (
                <section key={group.group} aria-label={group.group}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.group}</h3>
                  <ul className="flex flex-col divide-y divide-border">
                    {group.shortcuts.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                        <span className="min-w-0">
                          <span className="block text-foreground">{s.label}</span>
                          {s.description && <span className="block text-xs text-muted-foreground">{s.description}</span>}
                        </span>
                        <ShortcutKeys keys={s.keys} size="md" />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
ShortcutsDialog.displayName = "ShortcutsDialog";
