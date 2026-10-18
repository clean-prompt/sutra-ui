import * as React from "react";
import {
  RiBox3Line,
  RiCloudLine,
  RiComputerLine,
  RiRefreshLine,
  RiRocket2Line,
  RiSettings3Line,
  RiTerminalBoxLine,
} from "@remixicon/react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { errorMessage, useMountedRef } from "../hooks/use-async-action";
import { Button } from "./button";
import { Spinner } from "./spinner";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type BackendKind = "local" | "docker" | "ssh" | "modal" | "daytona" | "custom";

export interface BackendProbeResult {
  latencyMs?: number;
  /** Extra detail, e.g. "Docker 27.1 · 4 CPUs". */
  detail?: string;
}

export interface BackendOption {
  id: string;
  name: string;
  kind?: BackendKind;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** `false` shows "Not configured" and skips the probe. Default true. */
  configured?: boolean;
  /** Health check; resolve when healthy, reject with an Error whose message is the reason. */
  probe?: () => Promise<BackendProbeResult | void>;
}

export type BackendHealth =
  | { state: "checking" }
  | { state: "healthy"; latencyMs?: number; detail?: string }
  | { state: "unreachable"; reason: string }
  | { state: "not-configured" }
  | { state: "unknown" };

const kindIcon: Record<BackendKind, React.ComponentType<{ className?: string }>> = {
  local: RiComputerLine,
  docker: RiBox3Line,
  ssh: RiTerminalBoxLine,
  modal: RiCloudLine,
  daytona: RiRocket2Line,
  custom: RiSettings3Line,
};

/* ------------------------------------------------------------------ */
/* BackendHealthPill                                                   */
/* ------------------------------------------------------------------ */

export interface BackendHealthPillProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  health: BackendHealth;
}

/** Health probe status: checking spinner, healthy + latency, unreachable + reason, or not configured. */
export const BackendHealthPill = React.forwardRef<HTMLSpanElement, BackendHealthPillProps>(({ health, className, ...props }, ref) => {
  const base = "inline-flex h-6 max-w-full items-center gap-1.5 rounded-control px-2 text-2xs font-medium";
  let tone = "bg-muted text-muted-foreground";
  let body: React.ReactNode = "Not checked";
  if (health.state === "checking") {
    body = (
      <>
        <Spinner size="xs" label="" aria-hidden className="text-current" />
        Checking…
      </>
    );
  } else if (health.state === "healthy") {
    tone = "bg-success-soft text-success-soft-foreground";
    body = (
      <>
        <span aria-hidden className="size-1.5 rounded-full bg-success" />
        Healthy{health.latencyMs != null && <span className="font-mono tabular-nums">· {Math.round(health.latencyMs)} ms</span>}
      </>
    );
  } else if (health.state === "unreachable") {
    tone = "bg-destructive-soft text-destructive-soft-foreground";
    body = (
      <>
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-destructive" />
        <span className="truncate">Unreachable: {health.reason}</span>
      </>
    );
  } else if (health.state === "not-configured") {
    body = "Not configured";
  }
  return (
    <span ref={ref} role="status" data-health={health.state} data-slot="backend-health" className={cn(base, tone, className)} {...props}>
      {body}
    </span>
  );
});
BackendHealthPill.displayName = "BackendHealthPill";

/* ------------------------------------------------------------------ */
/* BackendPicker                                                       */
/* ------------------------------------------------------------------ */

export interface BackendPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "dir"> {
  backends: BackendOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  onConfigure?: (id: string) => void;
  /** Run every probe on mount. Default true. */
  autoProbe?: boolean;
  label?: string;
}

/** Execution backend radio cards with live health probes, re-check and configure actions. */
export const BackendPicker = React.forwardRef<HTMLDivElement, BackendPickerProps>(
  (
    { backends, value: valueProp, defaultValue, onValueChange, onConfigure, autoProbe = true, label = "Execution backend", className, ...props },
    ref
  ) => {
    const id = React.useId();
    const [value, setValue] = useControllableState({ value: valueProp, defaultValue: defaultValue ?? backends[0]?.id ?? "", onChange: onValueChange });
    const [health, setHealth] = React.useState<Record<string, BackendHealth>>({});
    const runs = React.useRef<Record<string, number>>({});
    const mounted = useMountedRef();
    const backendsRef = React.useRef(backends);
    backendsRef.current = backends;

    const check = React.useCallback(async (backendId: string) => {
      const b = backendsRef.current.find((x) => x.id === backendId);
      if (!b) return;
      if (b.configured === false) {
        setHealth((h) => ({ ...h, [backendId]: { state: "not-configured" } }));
        return;
      }
      if (!b.probe) {
        setHealth((h) => ({ ...h, [backendId]: { state: "unknown" } }));
        return;
      }
      const run = (runs.current[backendId] ?? 0) + 1;
      runs.current[backendId] = run;
      setHealth((h) => ({ ...h, [backendId]: { state: "checking" } }));
      const started = typeof performance !== "undefined" ? performance.now() : Date.now();
      let next: BackendHealth;
      try {
        const r = (await b.probe()) ?? {};
        const elapsed = (typeof performance !== "undefined" ? performance.now() : Date.now()) - started;
        next = { state: "healthy", latencyMs: r.latencyMs ?? elapsed, detail: r.detail };
      } catch (e) {
        next = { state: "unreachable", reason: errorMessage(e, "No response") };
      }
      if (mounted.current && runs.current[backendId] === run) setHealth((h) => ({ ...h, [backendId]: next }));
    }, []);

    const checkAll = React.useCallback(() => {
      for (const b of backendsRef.current) void check(b.id);
    }, [check]);

    React.useEffect(() => {
      if (autoProbe) checkAll();
      else {
        setHealth(Object.fromEntries(backendsRef.current.filter((b) => b.configured === false).map((b) => [b.id, { state: "not-configured" } as BackendHealth])));
      }
    }, [autoProbe, checkAll]);

    const anyChecking = Object.values(health).some((h) => h.state === "checking");

    return (
      <div ref={ref} data-slot="backend-picker" className={cn("grid w-full gap-3", className)} {...props}>
        <div className="flex items-center justify-between gap-2">
          <span id={`${id}-label`} className="text-sm font-medium text-foreground">
            {label}
          </span>
          <Button variant="ghost" size="sm" leadingIcon={<RiRefreshLine />} onClick={checkAll} disabled={anyChecking}>
            Re-check all
          </Button>
        </div>
        <RadioGroupPrimitive.Root aria-labelledby={`${id}-label`} value={value} onValueChange={setValue} className="grid gap-2 sm:grid-cols-2">
          {backends.map((b) => {
            const Icon = kindIcon[b.kind ?? "custom"];
            const h: BackendHealth = health[b.id] ?? (b.configured === false ? { state: "not-configured" } : { state: "unknown" });
            const itemId = `${id}-${b.id}`;
            return (
              <div
                key={b.id}
                data-slot="backend-card"
                data-backend={b.id}
                className={cn(
                  "relative flex flex-col gap-3 rounded-box border border-border bg-card p-3.5 shadow-xs transition-colors",
                  "has-[button[role=radio][data-state=checked]]:border-primary has-[button[role=radio][data-state=checked]]:ring-1 has-[button[role=radio][data-state=checked]]:ring-primary",
                  "has-[button[role=radio]:focus-visible]:ring-[3px] has-[button[role=radio]:focus-visible]:ring-ring/35"
                )}
              >
                <div className="flex items-start gap-3">
                  <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-xs [&_svg]:size-[18px]">
                    {b.icon ?? <Icon />}
                  </span>
                  <label htmlFor={itemId} className="min-w-0 flex-1 cursor-pointer after:absolute after:inset-0 after:content-['']">
                    <span className="block text-sm font-medium text-foreground">{b.name}</span>
                    {b.description && <span className="block text-xs leading-snug text-muted-foreground">{b.description}</span>}
                  </label>
                  <RadioGroupPrimitive.Item
                    id={itemId}
                    value={b.id}
                    className={cn(
                      "relative z-10 mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-input bg-background shadow-xs",
                      "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
                      focusRing,
                      "focus-visible:ring-0"
                    )}
                  >
                    <RadioGroupPrimitive.Indicator className="size-1.5 rounded-full bg-primary-foreground" />
                  </RadioGroupPrimitive.Item>
                </div>
                <div className="relative z-10 flex items-center justify-between gap-2">
                  <BackendHealthPill health={h} title={h.state === "healthy" ? h.detail : h.state === "unreachable" ? h.reason : undefined} />
                  <div className="flex shrink-0 items-center gap-1">
                    {b.probe && b.configured !== false && (
                      <Button variant="ghost" size="icon-xs" aria-label={`Re-check ${b.name}`} disabled={h.state === "checking"} onClick={() => void check(b.id)}>
                        <RiRefreshLine />
                      </Button>
                    )}
                    {onConfigure && (
                      <Button variant={b.configured === false ? "secondary" : "ghost"} size="xs" onClick={() => onConfigure(b.id)} aria-label={`Configure ${b.name}`}>
                        {b.configured === false ? "Set up" : "Configure"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </RadioGroupPrimitive.Root>
      </div>
    );
  }
);
BackendPicker.displayName = "BackendPicker";
