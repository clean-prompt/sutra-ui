import * as React from "react";
import { accentClasses, accentStyle, type Accent } from "../../lib/accent";
import { cn } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { toMs, type TimeInput } from "../../lib/time";
import { toneClasses } from "../../lib/tone";
import { describeUsagePace, formatResetsIn, usagePace, type UsagePace, type UsagePaceDescription } from "../../lib/usage-pace";
import { RingMeter } from "../../patterns/gauge";
import { Meter } from "../../primitives/meter";
import { Monogram } from "../../primitives/monogram";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

/**
 * One provider quota window. `id`, `label`, `percent`, `resetsAt` and `resetLabel` match `UsageLimitWindow`, so a
 * window from `UsageLimitBars` plus a `provider` can be passed as is.
 */
export interface UsageQuota {
  id: string;
  /** "Claude", "Codex", "GitHub Copilot". */
  provider: string;
  /** Provider mark, shown before the name (decorative). Falls back to a monogram in `QuotaBars`. */
  icon?: React.ReactNode;
  /** The window: "This week", "5-hour session", "Premium requests". Same field as `UsageLimitWindow.label`. */
  label: string;
  /** Usage so far in units of `limit`. Wins over `percent`. */
  used?: number;
  /** Percent of the limit used, 0–100 (the `UsageLimitWindow` field); read when `used` is not set. */
  percent?: number;
  /** Size of the quota. Default 100 (so `used` is a percentage). */
  limit?: number;
  /** Window start; enables the pace line ("On pace · 10% to spare"). */
  startsAt?: TimeInput;
  resetsAt?: TimeInput;
  /** Overrides the computed reset caption shown when there is no pace. */
  resetLabel?: React.ReactNode;
  /** Categorical colour of the ring or bar. Defaults to a per-provider colour (see `usageQuotaAccent`). */
  accent?: Accent;
  /** Set false to show the reset time instead of the pace. Default true. */
  pace?: boolean;
}

/** What a quota ring or bar shows: the share used, or the share left (as in "72% left"). */
export type UsageQuotaMode = "used" | "left";

const PROVIDER_ACCENTS: [RegExp, Accent][] = [
  [/claude|anthropic/i, "#d97757"],
  [/codex|openai|chatgpt/i, "emerald"],
  [/copilot|github/i, "violet"],
  [/cursor/i, "var(--foreground)"],
  [/gemini|google/i, "blue"],
];

/** Default accent for a provider name (Claude orange, Codex emerald, Copilot violet, Cursor foreground); `undefined` → primary. */
export function usageQuotaAccent(provider: string | null | undefined): Accent | undefined {
  if (!provider) return undefined;
  return PROVIDER_ACCENTS.find(([re]) => re.test(provider))?.[1];
}

/** Percent of the limit used, 0–100 (0 for missing or invalid numbers). */
export function usageQuotaPercent(quota: Pick<UsageQuota, "used" | "percent" | "limit">): number {
  const limit = quota.used !== undefined ? (quota.limit ?? 100) : 100;
  const used = quota.used ?? quota.percent ?? 0;
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return 0;
  return clamp((used / limit) * 100, 0, 100);
}

export interface UsageQuotaStatus extends UsagePaceDescription {
  /** Where the text came from: the pace, the limit being reached, the reset time, or nothing to say. */
  source: "pace" | "limit" | "reset" | "none";
  pace?: UsagePace;
}

/**
 * The status line for a quota: the pace when it can be computed ("On pace · 10% to spare", "Runs out in 4d at this
 * rate"), otherwise "Limit reached" or the reset time ("Resets in 3h 12m"). `text` is empty when there is nothing to say.
 */
export function describeUsageQuota(
  quota: Pick<UsageQuota, "used" | "percent" | "limit" | "startsAt" | "resetsAt" | "pace">,
  options: { now?: number; tolerance?: number } = {}
): UsageQuotaStatus {
  const now = options.now ?? Date.now();
  const pace =
    quota.pace === false
      ? undefined
      : usagePace({
          used: quota.used ?? quota.percent ?? 0,
          limit: quota.used !== undefined ? quota.limit : 100,
          startsAt: quota.startsAt,
          resetsAt: quota.resetsAt,
          now,
          tolerance: options.tolerance,
        });
  const resetMs = toMs(quota.resetsAt);
  const reset =
    resetMs === undefined ? undefined : resetMs <= now ? "Resets now" : `Resets in ${formatResetsIn(resetMs, { now })}`;
  if (pace) {
    const d = describeUsagePace(pace, { now });
    return { ...d, text: pace.limitReached && reset ? `${d.text} · ${reset}` : d.text, source: "pace", pace };
  }
  if (usageQuotaPercent(quota) >= 100) {
    return { text: reset ? `Limit reached · ${reset}` : "Limit reached", tone: "destructive", source: "limit" };
  }
  return reset ? { text: reset, tone: "neutral", source: "reset" } : { text: "", tone: "neutral", source: "none" };
}

/* ------------------------------------------------------------------ */
/* QuotaRing                                                           */
/* ------------------------------------------------------------------ */

const ringSizes = {
  sm: { box: 44, stroke: 5, text: "text-xs" },
  md: { box: 56, stroke: 6, text: "text-sm" },
  lg: { box: 72, stroke: 7, text: "text-base" },
} as const;

export interface QuotaRingProps extends Omit<UsageQuota, "id">, Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
  /** What the ring and the number show. Default "left". */
  mode?: UsageQuotaMode;
  /** Reference time for the pace and reset text. Default `Date.now()` at render. */
  now?: number;
  /** "On pace" band in percentage points. Default 5. */
  tolerance?: number;
  /** Ring diameter: sm 44, md 56 (default), lg 72. */
  size?: "sm" | "md" | "lg";
}

/**
 * Provider quota ring: a RingMeter with the percentage inside, the provider icon and name, the window label and a pace or
 * reset line coloured by tone ("On pace · 10% to spare", "Runs out in 4d at this rate", "Resets in 3h 12m").
 */
export const QuotaRing = React.forwardRef<HTMLDivElement, QuotaRingProps>(
  (
    {
      provider,
      icon,
      label,
      used,
      percent,
      limit,
      startsAt,
      resetsAt,
      resetLabel,
      accent,
      pace,
      mode = "left",
      now: nowProp,
      tolerance,
      size = "md",
      className,
      style,
      ...props
    },
    ref
  ) => {
    const now = nowProp ?? Date.now();
    const usedPct = usageQuotaPercent({ used, percent, limit });
    const shown = Math.round(mode === "left" ? 100 - usedPct : usedPct);
    const status = describeUsageQuota({ used, percent, limit, startsAt, resetsAt, pace }, { now, tolerance });
    const statusText: React.ReactNode =
      (status.source === "reset" || status.source === "none") && resetLabel != null ? resetLabel : status.text;
    const s = ringSizes[size];
    const ringAccent = accent ?? usageQuotaAccent(provider);
    return (
      <div
        ref={ref}
        data-slot="quota-ring"
        data-mode={mode}
        data-pace={status.pace?.status}
        style={accentStyle(ringAccent, style)}
        className={cn("flex min-w-0 items-center gap-3", className)}
        {...props}
      >
        <span className="relative inline-flex shrink-0">
          <RingMeter
            value={shown}
            size={s.box}
            thickness={s.stroke}
            showValueAbove={Infinity}
            thresholds={false}
            label={`${provider}, ${label}`}
            aria-valuetext={`${shown}% ${mode}`}
            accent={ringAccent}
          />
          <span
            aria-hidden
            data-slot="quota-ring-value"
            className={cn("absolute inset-0 flex items-center justify-center font-mono font-semibold tabular-nums tracking-tight", s.text, accentClasses.text)}
          >
            {shown}%
          </span>
        </span>
        <div className="min-w-0 text-sm leading-snug">
          <div className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
            {icon ? (
              <span aria-hidden className="inline-flex shrink-0 items-center [&_img]:size-4 [&_svg]:size-4">
                {icon}
              </span>
            ) : null}
            <span className="truncate">{provider}</span>
          </div>
          <div className="truncate text-muted-foreground">{label}</div>
          {statusText ? (
            <div data-slot="quota-ring-status" data-tone={status.tone} className={cn("text-pretty", toneClasses.text[status.tone])}>
              {statusText}
            </div>
          ) : null}
        </div>
      </div>
    );
  }
);
QuotaRing.displayName = "QuotaRing";

/* ------------------------------------------------------------------ */
/* QuotaStrip                                                          */
/* ------------------------------------------------------------------ */

export interface QuotaStripProps extends React.HTMLAttributes<HTMLDivElement> {
  quotas: UsageQuota[];
  mode?: UsageQuotaMode;
  now?: number;
  tolerance?: number;
  size?: QuotaRingProps["size"];
  /** `card` (default): a padded card surface · `plain`: no surface. */
  variant?: "card" | "plain";
  /** Shown when `quotas` is empty. Default "No quotas". */
  emptyState?: React.ReactNode;
}

/** Row of provider quota rings: one column on phones, two on small screens, four on wide ones. */
export const QuotaStrip = React.forwardRef<HTMLDivElement, QuotaStripProps>(
  ({ quotas, mode, now: nowProp, tolerance, size, variant = "card", emptyState = "No quotas", className, ...props }, ref) => {
    const now = nowProp ?? Date.now();
    return (
      <div
        ref={ref}
        data-slot="quota-strip"
        className={cn(variant === "card" && "rounded-box border border-border bg-card p-4 text-card-foreground shadow-xs", className)}
        {...props}
      >
        {quotas.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyState}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {quotas.map(({ id, ...q }) => (
              <li key={id} data-quota={id} className="min-w-0">
                <QuotaRing {...q} mode={mode} now={now} tolerance={tolerance} size={size} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);
QuotaStrip.displayName = "QuotaStrip";

/* ------------------------------------------------------------------ */
/* QuotaBars                                                           */
/* ------------------------------------------------------------------ */

export interface QuotaBarsProps extends React.HTMLAttributes<HTMLUListElement> {
  quotas: UsageQuota[];
  /** What each bar shows. Default "left". */
  mode?: UsageQuotaMode;
}

/**
 * Compact row of provider icons with thin accent bars, as in a dashboard's Agents tile. Each bar is a meter named after
 * the provider with value text such as "72% left".
 *
 * The Agents tile is a `StatCard` with this row as its body:
 * ```tsx
 * <StatCard label="Agents" icon={<RiRobot2Line />} accent="violet" href="/agents"
 *   caption="Claude · Max 20x · This week" value="72%" unit="left"
 *   stats={[{ label: "Resets", value: formatResetsIn(claude.resetsAt) }, { label: "Sessions", value: 2 },
 *           { label: "Tokens today", value: formatTokens(1_780_000) }]}>
 *   <QuotaBars quotas={quotas} />
 * </StatCard>
 * ```
 */
export const QuotaBars = React.forwardRef<HTMLUListElement, QuotaBarsProps>(({ quotas, mode = "left", className, ...props }, ref) => (
  <ul ref={ref} data-slot="quota-bars" className={cn("flex items-center gap-3", className)} {...props}>
    {quotas.map((q) => {
      const usedPct = usageQuotaPercent(q);
      const shown = Math.round(mode === "left" ? 100 - usedPct : usedPct);
      const barAccent = q.accent ?? usageQuotaAccent(q.provider);
      return (
        <li
          key={q.id}
          data-quota={q.id}
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          {q.icon ? (
            <span aria-hidden className="inline-flex shrink-0 items-center text-muted-foreground [&_img]:size-4 [&_svg]:size-4">
              {q.icon}
            </span>
          ) : (
            <Monogram name={q.provider} size="xs" variant="soft" />
          )}
          <Meter
            label={q.provider}
            value={shown}
            showValue={false}
            thresholds={false}
            accent={barAccent}
            size="sm"
            ariaValueText={`${shown}% ${mode}`}
            className="min-w-0 flex-1 [&>div:first-child]:sr-only"
            barClassName="h-1"
          />
        </li>
      );
    })}
  </ul>
));
QuotaBars.displayName = "QuotaBars";
