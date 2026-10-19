/* Private pieces of SignInMap: formatting, the summary row, flagged-event rows and the selected-event detail. */
import * as React from "react";
import { RiFlightTakeoffLine, RiMapPin2Line, RiShieldCheckLine } from "@remixicon/react";
import { CountryFlag } from "../../assets/country-flags";
import { deviceIcon, deviceLabels } from "../../assets/device-icons";
import { cn, focusRing } from "../../lib/cn";
import { formatDuration } from "../../lib/duration";
import { formatDateTime, formatRelative, MINUTE_MS, type FormatRelativeOptions } from "../../lib/time";
import { toneClasses, type Tone } from "../../lib/tone";
import { useAsyncAction } from "../../hooks/use-async-action";
import { Button } from "../../primitives/button";
import { CloseButton } from "../../primitives/close-button";
import { KeyValueList, type KeyValueItem } from "../../primitives/key-value";
import { Skeleton } from "../../primitives/progress";
import { StatusBadge } from "../../primitives/status-badge";
import { countryName, formatGeoPoint } from "../geo/geo-model";
import { signInCountry, type SignInEvent, type SignInFlag, type SignInOutcome, type SignInSummary } from "./sign-in-map-model";

/* ------------------------------------------------------------------------------------------------
 * Formatting
 * ----------------------------------------------------------------------------------------------*/

export const OUTCOME: Record<SignInOutcome, { tone: Tone; label: string }> = {
  success: { tone: "success", label: "Success" },
  failed: { tone: "warning", label: "Failed" },
  blocked: { tone: "destructive", label: "Blocked" },
};

export const outcomeOf = (e: SignInEvent) => OUTCOME[e.outcome] ?? { tone: "neutral" as Tone, label: String(e.outcome) };

/** "Seoul, South Korea", the city or country alone, else the coordinates. */
export function signInPlace(e: SignInEvent, locale?: string): string {
  const code = signInCountry(e);
  const country = code ? countryName(code, locale) : undefined;
  return [e.city, country].filter(Boolean).join(", ") || formatGeoPoint(e.point);
}

/** "Chrome on macOS", or whichever half is known. */
export const signInClient = (e: SignInEvent) => [e.browser, e.os].filter(Boolean).join(" on ");

/** Device row value: the device icon (when the kind is known) and "Chrome on Windows". */
function signInDevice(e: SignInEvent): React.ReactNode {
  const client = signInClient(e);
  if (!client && !e.device) return undefined;
  const Icon = deviceIcon(e.device);
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{client || deviceLabels[e.device!] || e.device}</span>
    </span>
  );
}

const RELATIVE: FormatRelativeOptions = {
  style: "long",
  round: "floor",
  justNowMs: MINUTE_MS,
  maxRelativeDays: 29,
  invalid: "Unknown",
};
export const signInWhen = (e: SignInEvent, now: number) => formatRelative(e.time, { ...RELATIVE, now });

const km = (n: number, locale?: string) => `${new Intl.NumberFormat(locale ?? "en", { maximumFractionDigits: 0 }).format(n)} km`;

/** Headline and detail for a flag: "Impossible travel from Seoul" / "8,912 km in 2h 5m (4,277 km/h)". */
export function describeFlag(flag: SignInFlag, event: SignInEvent, locale?: string): { title: string; detail?: string } {
  if (flag.kind === "impossible-travel" && flag.travel) {
    const t = flag.travel;
    const from = t.from.city || signInPlace(t.from, locale);
    const elapsed =
      t.elapsedMs > 0
        ? formatDuration(t.elapsedMs, {
            minUnit: "m",
            keepZeros: false,
            zero: "under a minute",
          })
        : "no time";
    const speed = Number.isFinite(t.speedKmh) ? ` (${km(t.speedKmh, locale).replace(" km", " km/h")})` : "";
    return {
      title: `Impossible travel from ${from}`,
      detail: `${km(t.distanceKm, locale)} in ${elapsed}${speed}`,
    };
  }
  const code = signInCountry(event);
  return {
    title: `First sign-in from ${code ? countryName(code, locale) : "a new country"}`,
  };
}

const flagIcon = (flags: readonly SignInFlag[]) =>
  flags.some((f) => f.kind === "impossible-travel") ? <RiFlightTakeoffLine /> : <RiMapPin2Line />;

/* ------------------------------------------------------------------------------------------------
 * Summary row
 * ----------------------------------------------------------------------------------------------*/

export function SignInSummaryRow({ summary, loading }: { summary?: SignInSummary; loading?: boolean }) {
  const tiles: { key: keyof SignInSummary; label: string; tone?: Tone }[] = [
    { key: "total", label: "Sign-ins" },
    { key: "failed", label: "Failed", tone: "warning" },
    { key: "blocked", label: "Blocked", tone: "destructive" },
    { key: "countries", label: "Countries" },
    { key: "alerts", label: "Alerts", tone: "warning" },
  ];
  return (
    <dl
      data-slot="sign-in-map-summary"
      className="grid grid-cols-3 gap-px overflow-hidden rounded-box border border-border bg-border @lg:grid-cols-5"
    >
      {tiles.map((t, i) => {
        const value = summary?.[t.key] ?? 0;
        return (
          <div
            key={t.key}
            data-slot="sign-in-map-stat"
            data-key={t.key}
            className={cn("flex min-w-0 flex-col gap-1 bg-card px-3 py-2.5", i === 4 && "@max-lg:col-span-2")}
          >
            <dt className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              {t.tone ? <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", toneClasses.dot[t.tone])} /> : null}
              {t.label}
            </dt>
            <dd
              className={cn(
                "text-lg font-semibold tabular-nums text-foreground",
                t.tone && value > 0 && t.key === "alerts" && toneClasses.text.warning,
              )}
            >
              {loading && !summary ? <Skeleton shape="text" className="my-1 h-5 w-10" /> : value.toLocaleString()}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Actions
 * ----------------------------------------------------------------------------------------------*/

export interface SignInActionHandlers {
  onReview?: (event: SignInEvent, flags: SignInFlag[]) => void;
  onRevoke?: (event: SignInEvent) => void | Promise<void>;
  reviewLabel?: string;
  revokeLabel?: string;
}

/** Revoking applies to successful sign-ins other than the one you're using. */
export const canRevoke = (e: SignInEvent) => e.outcome === "success" && !e.current;

export function SignInActions({
  event,
  flags,
  place,
  onReview,
  onRevoke,
  reviewLabel = "Review",
  revokeLabel = "Revoke",
  className,
}: SignInActionHandlers & {
  event: SignInEvent;
  flags: SignInFlag[];
  place: string;
  className?: string;
}) {
  const { run, busy } = useAsyncAction((e: SignInEvent) => onRevoke?.(e));
  const revocable = !!onRevoke && canRevoke(event);
  if (!onReview && !revocable) return null;
  return (
    <div data-slot="sign-in-map-actions" className={cn("flex flex-wrap items-center gap-2", className)}>
      {onReview ? (
        <Button size="xs" variant="secondary" onClick={() => onReview(event, flags)} aria-label={`${reviewLabel} sign-in from ${place}`}>
          {reviewLabel}
        </Button>
      ) : null}
      {revocable ? (
        <Button
          size="xs"
          variant="destructive-soft"
          loading={busy}
          onClick={() => void run(event)}
          aria-label={`${revokeLabel} session from ${place}`}
        >
          {revokeLabel}
        </Button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Flagged list
 * ----------------------------------------------------------------------------------------------*/

export interface SignInFlagRowProps extends SignInActionHandlers {
  event: SignInEvent;
  flags: SignInFlag[];
  selected: boolean;
  onSelect: (event: SignInEvent) => void;
  now: number;
  locale?: string;
}

export function SignInFlagRow({ event, flags, selected, onSelect, now, locale, ...actions }: SignInFlagRowProps) {
  const code = signInCountry(event);
  const place = signInPlace(event, locale);
  const first = describeFlag(flags[0]!, event, locale);
  const client = signInClient(event);
  return (
    <li
      data-slot="sign-in-map-flag-row"
      data-id={event.id}
      data-selected={selected || undefined}
      className={cn(
        "flex flex-col gap-2 px-3 py-3 transition-colors",
        selected ? "bg-primary-soft/40 shadow-[inset_3px_0_0_var(--primary)]" : "hover:bg-accent/60",
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(event)}
        className={cn("-m-1 flex min-w-0 items-start gap-3 rounded-md p-1 text-left", focusRing)}
      >
        <span
          aria-hidden
          className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4", toneClasses.soft.warning)}
        >
          {flagIcon(flags)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            {code ? <CountryFlag code={code} size="xs" label="" /> : null}
            <span className="truncate text-sm font-medium text-foreground">{place}</span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">{signInWhen(event, now)}</span>
          </span>
          <span className={cn("text-xs font-medium", toneClasses.text.warning)}>
            {first.title}
            {flags.length > 1 ? ` · ${describeFlag(flags[1]!, event, locale).title}` : ""}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {[first.detail, client, event.account].filter(Boolean).join(" · ")}
          </span>
        </span>
      </button>
      <SignInActions event={event} flags={flags} place={place} className="pl-11" {...actions} />
    </li>
  );
}

export function SignInFlagListSkeleton() {
  return (
    <ul aria-hidden className="divide-y divide-border">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-start gap-3 px-3 py-3">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <span className="flex flex-1 flex-col gap-2 pt-1">
            <Skeleton shape="text" className="w-2/3" />
            <Skeleton shape="text" className="w-1/2" />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SignInNoAlerts() {
  return (
    <div data-slot="sign-in-map-no-alerts" className="flex items-center gap-3 px-3 py-4 text-sm text-muted-foreground">
      <span
        aria-hidden
        className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4", toneClasses.soft.success)}
      >
        <RiShieldCheckLine />
      </span>
      No suspicious sign-ins
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Selected event
 * ----------------------------------------------------------------------------------------------*/

export interface SignInEventDetailProps extends SignInActionHandlers {
  event: SignInEvent;
  flags: SignInFlag[];
  onClose: () => void;
  now: number;
  locale?: string;
  /** Lay the facts out in columns. */
  wide?: boolean;
  className?: string;
}

export function SignInEventDetail({ event, flags, onClose, now, locale, wide, className, ...actions }: SignInEventDetailProps) {
  const headingId = React.useId();
  const place = signInPlace(event, locale);
  const code = signInCountry(event);
  const outcome = outcomeOf(event);
  const items: KeyValueItem[] = [
    {
      label: "Time",
      value: `${formatDateTime(event.time, { locale })} · ${signInWhen(event, now)}`,
    },
    { label: "Method", value: event.method },
    { label: "Device", value: signInDevice(event) },
    { label: "IP address", value: event.ip, mono: true, copyable: !!event.ip },
    { label: "Account", value: event.account },
    { label: "Coordinates", value: formatGeoPoint(event.point) },
  ].filter((item) => item.value != null && item.value !== "");
  return (
    <div
      role="group"
      aria-labelledby={headingId}
      data-slot="sign-in-map-detail"
      data-id={event.id}
      className={cn("flex flex-col gap-3 rounded-box border border-border bg-card p-4 shadow-xs", className)}
    >
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h4 id={headingId} className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
            {code ? <CountryFlag code={code} size="sm" label="" /> : null}
            <span className="truncate">{place}</span>
          </h4>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge size="sm" tone={outcome.tone} label={outcome.label} />
            {event.current ? <StatusBadge size="sm" tone="info" variant="outline" label="This session" icon={null} /> : null}
          </div>
        </div>
        <CloseButton size="sm" aria-label="Close sign-in details" onClick={onClose} />
      </div>
      {flags.length ? (
        <ul className="flex flex-col gap-1.5">
          {flags.map((f) => {
            const d = describeFlag(f, event, locale);
            return (
              <li
                key={f.kind}
                className={cn(
                  "flex items-start gap-2 rounded-md px-2.5 py-2 text-xs [&_svg]:mt-px [&_svg]:size-3.5 [&_svg]:shrink-0",
                  toneClasses.soft.warning,
                )}
              >
                {flagIcon([f])}
                <span>
                  <span className="font-medium">{d.title}</span>
                  {d.detail ? <span className="block opacity-90">{d.detail}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {wide ? (
        <KeyValueList layout="grid" columns={3} items={items} className="text-xs" />
      ) : (
        <KeyValueList items={items} className="text-xs" />
      )}
      <SignInActions event={event} flags={flags} place={place} {...actions} />
    </div>
  );
}
