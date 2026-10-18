import * as React from "react";
import { RiErrorWarningLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { useIsoLayoutEffect } from "../hooks/use-iso-layout-effect";

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export interface SlotContribution {
  /** Unique id; registering the same id again replaces the earlier entry. */
  id: string;
  /** Slot name, e.g. "sidebar.footer". */
  slot: string;
  /** Lower renders first. Default 0; ties keep registration order. */
  order?: number;
  /** Who contributed it (shown in the error note). */
  source?: string;
  /** Node or component to render. */
  render: React.ReactNode | React.ComponentType;
}

export interface SlotRegistry {
  /** Add or replace a contribution. Returns an unregister function. */
  register: (contribution: SlotContribution) => () => void;
  unregister: (id: string) => void;
  /** Contributions for a slot, sorted by order then registration sequence. */
  get: (slot: string) => SlotContribution[];
  subscribe: (listener: () => void) => () => void;
  /** Changes whenever the registry does (for useSyncExternalStore). */
  version: () => number;
  /** Changes only when the given slot's contributions do. Optional for custom registries. */
  slotVersion?: (slot: string) => number;
}

const sameContribution = (a: SlotContribution, b: SlotContribution) =>
  a.slot === b.slot && a.order === b.order && a.source === b.source && a.render === b.render;

/** Create a standalone slot registry (pass it to `SlotProvider registry`). Lets extensions register outside React. */
export function createSlotRegistry(initial: SlotContribution[] = []): SlotRegistry {
  const entries = new Map<string, { c: SlotContribution; seq: number }>();
  const listeners = new Set<() => void>();
  let seq = 0;
  let ver = 0;
  const slotVers = new Map<string, number>();
  const cache = new Map<string, SlotContribution[]>();
  const emit = (...slots: string[]) => {
    ver += 1;
    for (const slot of slots) {
      slotVers.set(slot, (slotVers.get(slot) ?? 0) + 1);
      cache.delete(slot);
    }
    listeners.forEach((l) => l());
  };
  const unregister = (id: string) => {
    const prev = entries.get(id);
    if (prev && entries.delete(id)) emit(prev.c.slot);
  };
  const register = (c: SlotContribution) => {
    const prev = entries.get(c.id);
    if (prev && sameContribution(prev.c, c)) {
      // Equivalent re-registration: adopt the new object without notifying anyone.
      prev.c = c;
    } else {
      entries.set(c.id, { c, seq: prev?.seq ?? seq++ });
      if (prev && prev.c.slot !== c.slot) emit(prev.c.slot, c.slot);
      else emit(c.slot);
    }
    return () => {
      if (entries.get(c.id)?.c === c) unregister(c.id);
    };
  };
  for (const c of initial) entries.set(c.id, { c, seq: seq++ });
  return {
    register,
    unregister,
    get: (slot) => {
      let list = cache.get(slot);
      if (!list) {
        list = Array.from(entries.values())
          .filter((e) => e.c.slot === slot)
          .sort((a, b) => (a.c.order ?? 0) - (b.c.order ?? 0) || a.seq - b.seq)
          .map((e) => e.c);
        cache.set(slot, list);
      }
      return list;
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    version: () => ver,
    slotVersion: (slot) => slotVers.get(slot) ?? 0,
  };
}

const SlotRegistryContext = React.createContext<SlotRegistry | null>(null);

export interface SlotProviderProps {
  /** Use an existing registry (e.g. one plugins register into at startup). */
  registry?: SlotRegistry;
  /** Initial contributions when no `registry` is given. */
  contributions?: SlotContribution[];
  children?: React.ReactNode;
}

/** Provides a slot registry to `SlotOutlet` and `SlotFill` below it. */
export function SlotProvider({ registry, contributions, children }: SlotProviderProps) {
  const [own] = React.useState(() => registry ?? createSlotRegistry(contributions));
  return <SlotRegistryContext.Provider value={registry ?? own}>{children}</SlotRegistryContext.Provider>;
}

/** Access the nearest slot registry (`register`, `unregister`, `get`). Throws outside a `SlotProvider`. */
export function useSlotRegistry(): SlotRegistry {
  const ctx = React.useContext(SlotRegistryContext);
  if (!ctx) throw new Error("useSlotRegistry must be used inside a <SlotProvider>.");
  return ctx;
}

/** Contributions for one slot, re-rendering when the registry changes. */
export function useSlotContributions(slot: string): SlotContribution[] {
  const registry = useSlotRegistry();
  const snapshot = React.useCallback(
    () => (registry.slotVersion ? registry.slotVersion(slot) : registry.version()),
    [registry, slot]
  );
  React.useSyncExternalStore(registry.subscribe, snapshot, snapshot);
  return registry.get(slot);
}

/* ------------------------------------------------------------------ */
/* Error boundary                                                      */
/* ------------------------------------------------------------------ */

interface BoundaryProps {
  contribution: SlotContribution;
  onError?: (error: Error, contribution: SlotContribution) => void;
  children: React.ReactNode;
}

class SlotErrorBoundary extends React.Component<BoundaryProps, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    this.props.onError?.(error, this.props.contribution);
  }
  componentDidUpdate(prev: BoundaryProps) {
    if (prev.contribution !== this.props.contribution && this.state.error) this.setState({ error: null });
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const c = this.props.contribution;
    return (
      <div role="note" data-slot-error={c.id} className="rounded-md border border-dashed border-destructive/40 bg-destructive-soft/40 px-2.5 py-1.5 text-xs text-destructive-soft-foreground">
        <details>
          <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium">
            <RiErrorWarningLine aria-hidden className="size-3.5 shrink-0" />
            Extension failed to render
            {c.source && <span className="font-normal opacity-80">({c.source})</span>}
          </summary>
          <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-2xs opacity-90">
            {c.id}: {error.message || String(error)}
          </pre>
        </details>
      </div>
    );
  }
}

/* ------------------------------------------------------------------ */
/* SlotOutlet / SlotFill                                               */
/* ------------------------------------------------------------------ */

export interface SlotOutletProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Slot name, e.g. "sidebar.footer". */
  name: string;
  /** Rendered when nothing is registered. */
  fallback?: React.ReactNode;
  /** Called when a contribution throws while rendering. */
  onContributionError?: (error: Error, contribution: SlotContribution) => void;
  /** Render contributions without the wrapper div. */
  unwrapped?: boolean;
}

function renderContribution(r: SlotContribution["render"]) {
  if (typeof r === "function") {
    const C = r as React.ComponentType;
    return <C />;
  }
  return r;
}

/** Renders every contribution registered for `name`, in order, each isolated by an error boundary. */
export const SlotOutlet = React.forwardRef<HTMLDivElement, SlotOutletProps>(
  ({ name, fallback = null, onContributionError, unwrapped, className, ...props }, ref) => {
    const items = useSlotContributions(name);
    if (!items.length) return <>{fallback}</>;
    const content = items.map((c) => (
      <SlotErrorBoundary key={c.id} contribution={c} onError={onContributionError}>
        {renderContribution(c.render)}
      </SlotErrorBoundary>
    ));
    if (unwrapped) return <>{content}</>;
    return (
      <div ref={ref} data-slot-outlet={name} className={cn("contents", className)} {...props}>
        {content}
      </div>
    );
  }
);
SlotOutlet.displayName = "SlotOutlet";

export interface SlotFillProps {
  /** Target slot name. */
  slot: string;
  /** Stable id; defaults to a generated one. */
  id?: string;
  order?: number;
  source?: string;
  children?: React.ReactNode;
}

interface FillStore {
  get: () => React.ReactNode;
  set: (next: React.ReactNode) => void;
  subscribe: (listener: () => void) => () => void;
}

function createFillStore(initial: React.ReactNode): FillStore {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

/**
 * Declaratively contribute `children` to a slot while mounted. Renders nothing in place.
 * Registers once per slot/id/order/source; later `children` updates re-render only the filled content.
 */
export function SlotFill({ slot, id, order, source, children }: SlotFillProps) {
  const registry = useSlotRegistry();
  const generated = React.useId();
  const fillId = id ?? `fill-${generated}`;
  const [store] = React.useState(() => createFillStore(children));
  const [Content] = React.useState(() => {
    function SlotFillContent() {
      const node = React.useSyncExternalStore(store.subscribe, store.get, store.get);
      return <>{node}</>;
    }
    return SlotFillContent;
  });
  useIsoLayoutEffect(() => {
    store.set(children);
  }, [store, children]);
  React.useEffect(() => {
    registry.register({ id: fillId, slot, order, source, render: Content });
  }, [registry, fillId, slot, order, source, Content]);
  React.useEffect(() => () => registry.unregister(fillId), [registry, fillId]);
  return null;
}
