import * as React from "react";
import { RiKeyboardBoxLine } from "@remixicon/react";
import { useControllableState } from "../hooks/use-controllable-state";
import {
  ShortcutManager,
  shortcutEntryId,
  toShortcutKeyList,
  type ShortcutDefinition,
  type ShortcutEntryInternal,
  type ShortcutHandler,
  type ShortcutManagerOptions,
  type ShortcutOptions,
  type ShortcutPlatform,
} from "../lib/shortcuts";
import { ShortcutManagerContext, ShortcutPlatformContext, ShortcutScopeNameContext } from "../hooks/use-shortcut-manager";
import { SearchInput } from "../primitives/input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../primitives/dialog";
import { ShortcutKeys } from "../primitives/shortcut-keys";

/* The engine (parsing, matching, formatting, ShortcutManager) lives in lib/shortcuts; ShortcutKeys in ./shortcut-keys. */
export {
  ShortcutManager,
  detectShortcutPlatform,
  formatShortcut,
  getShortcutKeyLabels,
  isEditableTarget,
  isShortcutKeys,
  matchesShortcut,
} from "../lib/shortcuts";
export type {
  FormatShortcutOptions,
  ShortcutDefinition,
  ShortcutHandler,
  ShortcutManagerOptions,
  ShortcutOptions,
  ShortcutPlatform,
} from "../lib/shortcuts";
export { useHasShortcutProvider, useShortcutManager, useShortcutPlatform } from "../hooks/use-shortcut-manager";
export { ShortcutKeys, type ShortcutKeysProps } from "../primitives/shortcut-keys";

/* ------------------------------------------------------------------ */
/* Provider & hooks                                                    */
/* ------------------------------------------------------------------ */

export interface ShortcutProviderProps extends ShortcutManagerOptions {
  /** The app subtree whose shortcuts the manager handles. */
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
  return (
    <ShortcutManagerContext.Provider value={manager}>
      <ShortcutPlatformContext.Provider value={platform}>{children}</ShortcutPlatformContext.Provider>
    </ShortcutManagerContext.Provider>
  );
}
ShortcutProvider.displayName = "ShortcutProvider";

function signature(def: ShortcutDefinition, scope: string | undefined) {
  return JSON.stringify([
    toShortcutKeyList(def.keys),
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
  const provider = React.useContext(ShortcutManagerContext);
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
  useShortcuts(keys && toShortcutKeyList(keys).length ? [{ ...options, keys, handler }] : []);
}

export interface UseShortcutScopeOptions {
  /**
   * Turns the scope's shortcuts on or off without unmounting.
   * @default true
   */
  enabled?: boolean;
  /** Block every lower scope, including global (modal behaviour). */
  exclusive?: boolean;
}

/** Push a named scope while mounted so its shortcuts shadow lower scopes. */
export function useShortcutScope(name: string, { enabled = true, exclusive = false }: UseShortcutScopeOptions = {}) {
  const manager = React.useContext(ShortcutManagerContext);
  React.useEffect(() => {
    if (!manager || !enabled) return;
    return manager.pushScope(name, exclusive);
  }, [manager, name, enabled, exclusive]);
}

export interface ShortcutScopeProps extends UseShortcutScopeOptions {
  /** Scope name; shortcuts registered inside it are listed under this group. */
  name: string;
  /** The subtree the scope applies to. */
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
  const manager = React.useContext(ShortcutManagerContext);
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
      const id = shortcutEntryId(entry);
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
/* ShortcutsDialog                                                     */
/* ------------------------------------------------------------------ */

export interface ShortcutsDialogProps {
  /** Controlled open state of the sheet. Use with `onOpenChange`. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Called when the sheet opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Shortcut that toggles the sheet. Default "shift+?"; `null` disables. */
  keys?: string | null;
  /**
   * Sheet heading.
   * @default "Keyboard shortcuts"
   */
  title?: React.ReactNode;
  /**
   * Text under the heading.
   * @default "Every shortcut available on this screen."
   */
  description?: string;
  /** Extra static groups appended to the registry listing. */
  extraGroups?: ShortcutRegistryGroup[];
  /** List the live shortcut registry. Default true; `false` shows only `extraGroups` (a static cheat sheet). */
  includeRegistry?: boolean;
  /** Element that opens the sheet (rendered with `asChild`); focus returns to it on close. */
  trigger?: React.ReactNode;
  /** Platform for the key glyphs. Defaults to the provider's (or the detected) platform. */
  platform?: ShortcutPlatform;
  /** Classes for the sheet content. */
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
  includeRegistry = true,
  trigger,
  platform,
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
  const groups = [...(includeRegistry ? registry.groups : []), ...(extraGroups ?? [])]
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
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
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
                        <ShortcutKeys keys={s.keys} size="md" platform={platform} />
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
