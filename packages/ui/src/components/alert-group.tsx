import * as React from "react";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import {
  RiAlertLine,
  RiArrowDownSLine,
  RiCloseLine,
  RiErrorWarningFill,
  RiInformationLine,
  RiShieldFlashLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { formatRelative, safeISO, toMs } from "../lib/time";
import { toneClasses, type Tone } from "../lib/tone";

export type AlertSeverity = "critical" | "warning" | "info";

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  message: React.ReactNode;
  /** e.g. thermal, memory, storage, security. */
  category?: string;
  /** Node / service the alert came from. */
  source?: string;
  time?: Date | number | string;
  /** Raised on a node that was recently repaired. */
  postRepair?: boolean;
  detail?: React.ReactNode;
  icon?: React.ReactNode;
}

const severityRank: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

const timeOf = (t: Date | number | string | undefined) => toMs(t) ?? 0;

/** Sort alerts: critical → warning → info, newest first within a severity. */
export function sortAlerts<T extends Pick<AlertItem, "severity" | "time">>(alerts: T[]): T[] {
  return [...alerts].sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || timeOf(b.time) - timeOf(a.time));
}

/** "2 critical · 3 warnings · 1 info". */
export function summarizeAlerts(alerts: Pick<AlertItem, "severity">[]): string {
  const c = alerts.filter((a) => a.severity === "critical").length;
  const w = alerts.filter((a) => a.severity === "warning").length;
  const i = alerts.filter((a) => a.severity === "info").length;
  const parts: string[] = [];
  if (c) parts.push(`${c} critical`);
  if (w) parts.push(`${w} ${w === 1 ? "warning" : "warnings"}`);
  if (i) parts.push(`${i} info`);
  return parts.join(" · ") || "No alerts";
}

const severityIcon: Record<AlertSeverity, React.ReactNode> = {
  critical: <RiErrorWarningFill aria-hidden />,
  warning: <RiAlertLine aria-hidden />,
  info: <RiInformationLine aria-hidden />,
};

/** Semantic tone for each (domain-specific) severity. */
const alertSeverityTone: Record<AlertSeverity, Tone> = { critical: "destructive", warning: "warning", info: "info" };

const severityText: Record<AlertSeverity, string> = {
  critical: toneClasses.text[alertSeverityTone.critical],
  warning: toneClasses.text[alertSeverityTone.warning],
  // Darker than toneClasses.text.info for small text on the card surface.
  info: "text-info-soft-foreground",
};

export interface AlertGroupProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  alerts: AlertItem[];
  /** Controlled dismissed ids (persist them via `onDismissedChange`). */
  dismissedIds?: string[];
  defaultDismissedIds?: string[];
  onDismissedChange?: (ids: string[]) => void;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Icons per category. */
  categoryIcons?: Record<string, React.ReactNode>;
  dismissible?: boolean;
  /** Render nothing when no alert is visible. Default true. */
  hideWhenEmpty?: boolean;
  formatTime?: (time: Date) => string;
  now?: number;
  /** Accessible region label. Default "Alerts". */
  label?: string;
}

/** Collapsible grouped alert banner: severity summary, sorted list, per-item and bulk dismiss. */
export const AlertGroup = React.forwardRef<HTMLElement, AlertGroupProps>(
  (
    {
      className,
      alerts,
      dismissedIds: dismissedProp,
      defaultDismissedIds,
      onDismissedChange,
      expanded: expandedProp,
      defaultExpanded = true,
      onExpandedChange,
      categoryIcons,
      dismissible = true,
      hideWhenEmpty = true,
      formatTime,
      now: nowProp,
      label = "Alerts",
      ...props
    },
    ref
  ) => {
    const [dismissedState, setDismissedState] = React.useState<string[]>(defaultDismissedIds ?? []);
    const dismissed = dismissedProp ?? dismissedState;
    const setDismissed = (ids: string[]) => {
      if (dismissedProp === undefined) setDismissedState(ids);
      onDismissedChange?.(ids);
    };
    const [expandedState, setExpandedState] = React.useState(defaultExpanded);
    const expanded = expandedProp ?? expandedState;
    const setExpanded = (v: boolean) => {
      if (expandedProp === undefined) setExpandedState(v);
      onExpandedChange?.(v);
    };

    const dismissedSet = new Set(dismissed);
    const visible = sortAlerts(alerts.filter((a) => !dismissedSet.has(a.id)));
    const critical = visible.filter((a) => a.severity === "critical").length;
    const warnings = visible.filter((a) => a.severity === "warning").length;
    const tone: AlertSeverity = critical ? "critical" : warnings ? "warning" : "info";
    const listId = React.useId();
    const now = nowProp ?? Date.now();

    if (!visible.length && hideWhenEmpty) return null;

    return (
      <CollapsiblePrimitive.Root open={expanded} onOpenChange={setExpanded} asChild>
        <section
          ref={ref}
          aria-label={label}
          data-tone={tone}
          className={cn(
            "overflow-hidden rounded-box border",
            tone === "critical"
              ? "border-destructive/40 bg-destructive-soft/60"
              : tone === "warning"
                ? "border-warning/40 bg-warning-soft/60"
                : "border-border bg-card",
            className
          )}
          {...props}
        >
          <div className="flex items-center gap-2 pr-2">
            <CollapsiblePrimitive.Trigger
              aria-controls={listId}
              className={cn("flex min-w-0 flex-1 items-center gap-2.5 px-4 py-3 text-left", focusRing, "focus-visible:ring-inset")}
            >
              <span className={cn("relative flex size-5 shrink-0 items-center justify-center [&_svg]:size-4", severityText[tone])}>
                {critical ? <span aria-hidden className="absolute inset-0 rounded-full bg-destructive/30 motion-safe:animate-ping" /> : null}
                {tone === "info" ? <RiInformationLine aria-hidden /> : <RiShieldFlashLine aria-hidden className="relative" />}
              </span>
              <span className={cn("truncate text-sm font-semibold", severityText[tone])} data-alert-summary="">
                {summarizeAlerts(visible)}
              </span>
              <RiArrowDownSLine
                aria-hidden
                className={cn("ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-200", expanded && "rotate-180")}
              />
              <span className="sr-only">{expanded ? "Collapse alerts" : "Expand alerts"}</span>
            </CollapsiblePrimitive.Trigger>
            {dismissible && visible.length > 1 ? (
              <button
                type="button"
                onClick={() => setDismissed([...new Set([...dismissed, ...visible.map((a) => a.id)])])}
                className={cn(
                  "shrink-0 rounded-control px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                  focusRing
                )}
              >
                Dismiss all
              </button>
            ) : null}
          </div>
          <CollapsiblePrimitive.Content
            id={listId}
            className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
          >
            <ul className="divide-y divide-border border-t border-border bg-card/60">
              {visible.map((a) => {
                const ms = toMs(a.time) ?? null;
                return (
                  <li key={a.id} data-severity={a.severity} className="group/alert flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50">
                    <span className={cn("mt-0.5 shrink-0 [&_svg]:size-4", severityText[a.severity])}>
                      {a.icon ?? (a.category && categoryIcons?.[a.category]) ?? severityIcon[a.severity]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-foreground">
                        <span className="sr-only">{a.severity}: </span>
                        {a.message}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-2xs">
                        {a.category ? (
                          <span
                            className={cn(
                              "rounded-xs px-1.5 py-0.5 font-medium",
                              a.category === "security" ? toneClasses.soft.destructive : toneClasses.soft.neutral
                            )}
                          >
                            {a.category}
                          </span>
                        ) : null}
                        {a.source ? <span className="rounded-xs border border-border px-1.5 py-0.5 font-mono text-muted-foreground">{a.source}</span> : null}
                        {a.postRepair ? (
                          <span className={cn("rounded-xs px-1.5 py-0.5 font-semibold uppercase tracking-wide", toneClasses.soft.warning)}>
                            Post-repair
                          </span>
                        ) : null}
                        {ms != null ? (
                          <time dateTime={safeISO(ms)} className="text-muted-foreground">
                            {formatTime ? formatTime(new Date(ms)) : formatRelative(ms, { now })}
                          </time>
                        ) : null}
                        {a.detail ? <span className="truncate text-muted-foreground">{a.detail}</span> : null}
                      </div>
                    </div>
                    {dismissible ? (
                      <button
                        type="button"
                        onClick={() => setDismissed([...dismissed, a.id])}
                        aria-label={`Dismiss alert${typeof a.message === "string" ? `: ${a.message}` : ""}`}
                        className={cn(
                          "inline-flex size-6 shrink-0 items-center justify-center rounded-control text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                          focusRing
                        )}
                      >
                        <RiCloseLine aria-hidden className="size-3.5" />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </CollapsiblePrimitive.Content>
        </section>
      </CollapsiblePrimitive.Root>
    );
  }
);
AlertGroup.displayName = "AlertGroup";
