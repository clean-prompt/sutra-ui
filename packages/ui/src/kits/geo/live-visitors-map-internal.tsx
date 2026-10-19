import * as React from "react";
import {
  RiCloseLine,
} from "@remixicon/react";
import { CountryFlag } from "../../assets/country-flags";
import { deviceIcon } from "../../assets/device-icons";
import { cn, focusRing } from "../../lib/cn";
import { formatDuration } from "../../lib/duration";
import { capitalize } from "../../lib/text";
import { formatRelative, toMs } from "../../lib/time";
import { resolveColorToken } from "../../lib/tone";
import { Avatar } from "../../primitives/avatar";
import { Button } from "../../primitives/button";
import { Skeleton } from "../../primitives/progress";
import { countryName, formatGeoPoint, normalizeCountryCode } from "./geo-model";
import type { GeoMarker } from "./geo-marker-layer";
import type { LiveVisitor, LiveVisitorSource, LiveVisitorSourceCount } from "./live-visitors-map";

/* ------------------------------------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------------------------------*/


/** The visitor's source as an object (a bare string becomes its label). */
export function liveVisitorSource(visitor: LiveVisitor): LiveVisitorSource | undefined {
  const { source } = visitor;
  if (!source) return undefined;
  return typeof source === "string" ? { label: source } : source;
}

/** Visitors per source, most first (ties keep first-seen order). */
export function liveVisitorSourceCounts(visitors: readonly LiveVisitor[]): LiveVisitorSourceCount[] {
  const byKey = new Map<string, LiveVisitorSourceCount>();
  for (const v of visitors) {
    const s = liveVisitorSource(v);
    if (!s) continue;
    const key = s.id ?? s.label;
    const entry = byKey.get(key);
    if (entry) entry.count++;
    else byKey.set(key, { ...s, count: 1 });
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count);
}

const placeName = (v: LiveVisitor, locale?: string) => {
  const code = normalizeCountryCode(v.country);
  return code ? countryName(code, locale) : v.country;
};

const isLive = (v: LiveVisitor, now: number, within: number) => {
  const t = toMs(v.lastSeen);
  return t !== undefined && now - t < within;
};

const relative = (v: LiveVisitor, now: number, within: number, style: "narrow" | "short") =>
  formatRelative(v.lastSeen, { now, style, justNowMs: within });

const deviceText = (v: LiveVisitor) => [v.device ? capitalize(v.device) : undefined, v.os, v.browser].filter(Boolean).join(" · ");

/** Marker for a visitor: avatar, source badge, and a pulse while they are active. */
export function liveVisitorMarker(v: LiveVisitor, now: number, liveWithinMs: number): GeoMarker {
  const source = liveVisitorSource(v);
  return {
    id: v.id,
    point: v.point,
    label: `${v.name ?? "Visitor"} in ${v.city}${source ? `, from ${source.label}` : ""}`,
    description: [source?.label, v.page].filter(Boolean).join(" · ") || undefined,
    tone: "success",
    pulse: isLive(v, now, liveWithinMs),
    render: <Avatar size="sm" name={v.name} src={v.avatar} ring />,
    badge: source?.icon ? (
      <span
        data-slot="live-visitor-badge"
        className="flex size-4 items-center justify-center rounded-full bg-background shadow-xs ring-1 ring-border [&_svg]:size-2.5"
        style={source.color ? { color: resolveColorToken(source.color) } : undefined}
      >
        {source.icon}
      </span>
    ) : undefined,
  };
}

/** A source's icon in its colour (decorative). */
export function LiveVisitorSourceIcon({ source, className }: { source: LiveVisitorSource; className?: string }) {
  if (!source.icon) return null;
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 [&_svg]:size-3.5", className)}
      style={source.color ? { color: resolveColorToken(source.color) } : undefined}
    >
      {source.icon}
    </span>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Visitor list
 * ----------------------------------------------------------------------------------------------*/

interface LiveVisitorListProps extends Omit<React.HTMLAttributes<HTMLUListElement>, "onSelect"> {
  visitors: readonly LiveVisitor[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  now: number;
  liveWithinMs: number;
  locale?: string;
}

/** Visitors as a listbox: arrows move, Enter or Space selects (again to clear), one tab stop. */
export function LiveVisitorList({ visitors, selectedId, onSelect, now, liveWithinMs, locale, className, ...props }: LiveVisitorListProps) {
  const listRef = React.useRef<HTMLUListElement>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const tabStop = [activeId, selectedId].find((id) => id && visitors.some((v) => v.id === id)) ?? visitors[0]?.id;

  const move = (from: number, to: number) => {
    const next = visitors[Math.max(0, Math.min(visitors.length - 1, to))];
    if (!next || to === from) return;
    setActiveId(next.id);
    listRef.current?.querySelector<HTMLElement>(`[data-visitor-id="${CSS.escape(next.id)}"]`)?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent, index: number, id: string) => {
    const keys: Record<string, number> = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: visitors.length - 1 };
    if (e.key in keys) {
      e.preventDefault();
      move(index, keys[e.key]!);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(id);
    }
  };

  return (
    <ul ref={listRef} role="listbox" className={cn("min-h-0 space-y-0.5 overflow-y-auto px-2 pb-2 scrollbar-thin", className)} {...props}>
      {visitors.map((v, i) => {
        const source = liveVisitorSource(v);
        const selected = v.id === selectedId;
        const DeviceIcon = deviceIcon(v.device);
        const country = placeName(v, locale);
        const time = relative(v, now, liveWithinMs, "narrow");
        const spoken = [v.name, `${v.city}, ${country}`, source && `from ${source.label}`, v.page && `viewing ${v.page}`, v.device, relative(v, now, liveWithinMs, "short")];
        return (
          <li
            key={v.id}
            role="option"
            aria-selected={selected}
            data-visitor-id={v.id}
            data-slot="live-visitor-row"
            tabIndex={v.id === tabStop ? 0 : -1}
            onClick={() => onSelect(v.id)}
            onFocus={() => setActiveId(v.id)}
            onKeyDown={(e) => onKeyDown(e, i, v.id)}
            className={cn(
              "grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
              selected && "bg-accent",
              focusRing
            )}
          >
            {/* One spoken sentence; the compact visible layout is hidden from assistive tech. */}
            <span className="sr-only">{spoken.filter(Boolean).join(", ")}</span>
            <span aria-hidden className="flex min-w-0 items-center gap-2">
              <CountryFlag code={v.country} size="xs" label="" className="shrink-0" />
              <span className="truncate font-medium">{v.city}</span>
              {v.name ? <span className="truncate text-xs text-muted-foreground">{v.name}</span> : null}
            </span>
            <span aria-hidden className={cn("text-end text-xs tabular-nums", isLive(v, now, liveWithinMs) ? "text-success" : "text-muted-foreground")}>
              {time}
            </span>
            <span aria-hidden className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              {source ? (
                <span className="inline-flex shrink-0 items-center gap-1">
                  <LiveVisitorSourceIcon source={source} />
                  {source.label}
                </span>
              ) : null}
              {source && v.page ? <span>·</span> : null}
              {v.page ? <span className="truncate font-mono">{v.page}</span> : null}
            </span>
            <span aria-hidden className="flex justify-end text-muted-foreground" title={deviceText(v) || undefined}>
              <DeviceIcon className="size-3.5" />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Rows in the list's real layout while the first visitors load. */
export function LiveVisitorListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-hidden data-slot="live-visitors-list-skeleton" className="space-y-0.5 px-2 pb-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 px-2 py-2">
          <span className="flex items-center gap-2">
            <Skeleton className="h-3 w-4 rounded-xs" />
            <Skeleton className="h-3.5 rounded-xs" width={`${40 + ((i * 17) % 35)}%`} />
          </span>
          <Skeleton className="h-3 w-6 rounded-xs" />
          <Skeleton className="h-3 rounded-xs" width={`${55 + ((i * 11) % 30)}%`} />
          <Skeleton className="size-3.5 rounded-xs" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Visitor card
 * ----------------------------------------------------------------------------------------------*/

interface LiveVisitorCardViewProps {
  visitor: LiveVisitor;
  now: number;
  liveWithinMs: number;
  locale?: string;
  actions?: React.ReactNode;
  onClose: () => void;
  className?: string;
}

/** Details for the selected visitor, closable. */
export function LiveVisitorCardView({ visitor: v, now, liveWithinMs, locale, actions, onClose, className }: LiveVisitorCardViewProps) {
  const source = liveVisitorSource(v);
  const DeviceIcon = deviceIcon(v.device);
  const device = deviceText(v);
  const country = placeName(v, locale);
  const title = v.name ?? `Visitor in ${v.city}`;
  const rows: [string, React.ReactNode][] = [];
  if (source)
    rows.push([
      "Source",
      <span className="inline-flex items-center gap-1.5">
        <LiveVisitorSourceIcon source={source} />
        {source.label}
      </span>,
    ]);
  if (device)
    rows.push([
      "Device",
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <DeviceIcon aria-hidden className="size-3.5 shrink-0" />
        <span className="truncate">{device}</span>
      </span>,
    ]);
  if (v.page) rows.push(["Page", <span className="block truncate font-mono">{v.page}</span>]);
  if (Number.isFinite(v.loadTime)) rows.push(["Load time", <span className="tabular-nums">{formatDuration(v.loadTime!, { decimals: 1 })}</span>]);
  rows.push(["Last seen", relative(v, now, liveWithinMs, "short")]);
  rows.push(["Location", <span className="tabular-nums">{formatGeoPoint(v.point)}</span>]);

  return (
    <section
      aria-label={`Visitor details: ${title}`}
      data-slot="live-visitor-card"
      className={cn("space-y-3 rounded-box border border-border bg-popover p-3 text-sm text-popover-foreground shadow-lg", className)}
    >
      <div className="flex items-start gap-2.5">
        {v.name || v.avatar ? <Avatar size="md" name={v.name} src={v.avatar} /> : null}
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{title}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CountryFlag code={v.country} size="xs" label="" className="shrink-0" />
            <span className="truncate">
              {v.city}, {country}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon-xs" aria-label="Close visitor details" onClick={onClose}>
          <RiCloseLine />
        </Button>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
        {rows.map(([term, value]) => (
          <React.Fragment key={term}>
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="min-w-0">{value}</dd>
          </React.Fragment>
        ))}
      </dl>
      {actions ? <div className="flex flex-wrap gap-2 border-t border-border pt-3">{actions}</div> : null}
    </section>
  );
}
