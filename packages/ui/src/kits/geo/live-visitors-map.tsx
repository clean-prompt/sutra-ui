import * as React from "react";
import { RiGlobalLine, RiMap2Line, RiUserLocationLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { formatCompact, pluralize } from "../../lib/format";
import type { TimeInput } from "../../lib/time";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useMergedRefs } from "../../hooks/use-merged-refs";
import { useNow } from "../../hooks/use-now";
import { EmptyState } from "../../primitives/empty-state";
import { Skeleton } from "../../primitives/progress";
import { SegmentedControl } from "../../primitives/segmented-control";
import { StatusDot } from "../../primitives/status-badge";
import { normalizeCountryCode, type GeoPointInput } from "./geo-model";
import { Globe } from "./globe";
import { WorldMap } from "./world-map";
import {
  LiveVisitorCardView,
  LiveVisitorList,
  LiveVisitorListSkeleton,
  LiveVisitorSourceIcon,
  liveVisitorMarker,
  liveVisitorSourceCounts,
} from "./live-visitors-map-internal";
import { EMPTY } from "./world-map-internal";

/* ------------------------------------------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------------------------------------*/

/** Where a visitor came from (a search engine, a social network, a campaign). */
export interface LiveVisitorSource {
  /** Stable key for grouping; defaults to `label`. */
  id?: string;
  label: string;
  icon?: React.ReactNode;
  /** Colour token or any CSS colour for the icon. */
  color?: string;
}

/** A source with its number of visitors, for the header. */
export interface LiveVisitorSourceCount extends LiveVisitorSource {
  count: number;
}

export type LiveVisitorDevice = "desktop" | "laptop" | "phone" | "tablet" | "tv";

/** One person on the site right now. */
export interface LiveVisitor {
  id: string;
  point: GeoPointInput;
  city: string;
  /** ISO 3166-1 alpha-2 code. */
  country: string;
  /** A source object, or just its label. */
  source?: LiveVisitorSource | string;
  /** Path or title of the page they are on. */
  page?: string;
  device?: LiveVisitorDevice;
  os?: string;
  browser?: string;
  /** Last activity (Date, epoch ms or ISO string). */
  lastSeen: TimeInput;
  /** Page load time in ms. */
  loadTime?: number;
  /** Signed-in name, if known. */
  name?: string;
  /** Avatar image URL. */
  avatar?: string;
}

export type LiveVisitorsMapView = "globe" | "flat";

export interface LiveVisitorsMapProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** Visitors currently on the site, each with a location, source and last-seen time. */
  visitors: readonly LiveVisitor[];
  /** Header source counts. Defaults to counts grouped from `visitors`. */
  sources?: readonly LiveVisitorSourceCount[];
  /** How many sources the header lists before "+N". Default 4. */
  maxSources?: number;
  /** Live count in the header when it differs from `visitors.length` (e.g. only a sample is plotted). */
  total?: number;
  /** Time window text in the header, e.g. "Last 30 minutes". */
  windowLabel?: React.ReactNode;

  /** Controlled id of the selected visitor; `null` selects none. */
  selectedId?: string | null;
  /** Initially selected visitor id when `selectedId` is not controlled. */
  defaultSelectedId?: string | null;
  /** Called when a marker or list row is selected, or the card is closed (`null`). */
  onSelectedIdChange?: (id: string | null, visitor: LiveVisitor | undefined) => void;

  /** Controlled view: `globe` or `flat`. */
  view?: LiveVisitorsMapView;
  /** Default `globe`. */
  defaultView?: LiveVisitorsMapView;
  /** Called with the view when the user flips the globe and flat switch. */
  onViewChange?: (view: LiveVisitorsMapView) => void;

  /** Actions in the visitor card, e.g. a "View history" button. */
  renderVisitorActions?: (visitor: LiveVisitor) => React.ReactNode;
  /** Spin the globe while nothing is selected (see `Globe`'s `autoRotate`). Default true. */
  autoRotate?: boolean | number;
  /** Reference time for "now / 1m" labels. Default: the clock, refreshed every 15 s. */
  now?: TimeInput;
  /** Visitors seen within this many ms get a pulsing marker and read "now". Default 60 000. */
  liveWithinMs?: number;
  /** Accessible name of the screen. Default "Live visitors". */
  label?: string;
  /** Locale for country names and numbers. */
  locale?: string;
  /** Data is on its way: skeletons with no visitors yet, otherwise the screen is marked busy. */
  loading?: boolean;
  /** Shown in the list when there are no visitors. */
  emptyState?: React.ReactNode;
  /** Classes for the map column. */
  mapClassName?: string;
}

/* ------------------------------------------------------------------------------------------------
 * LiveVisitorsMap
 * ----------------------------------------------------------------------------------------------*/

/**
 * Live analytics screen: a header with live, country and source counts, a globe or flat map of avatar markers with
 * source badges and clusters, a visitor list whose rows select and fly to the marker, and a card for the selected visitor.
 */
export const LiveVisitorsMap = React.forwardRef<HTMLElement, LiveVisitorsMapProps>(
  (
    {
      visitors = EMPTY,
      sources: sourcesProp,
      maxSources = 4,
      total,
      windowLabel,
      selectedId: selectedIdProp,
      defaultSelectedId = null,
      onSelectedIdChange,
      view: viewProp,
      defaultView = "globe",
      onViewChange,
      renderVisitorActions,
      autoRotate = true,
      now: nowProp,
      liveWithinMs = 60_000,
      label = "Live visitors",
      locale,
      loading,
      emptyState,
      mapClassName,
      className,
      ...props
    },
    ref
  ) => {
    const rootRef = React.useRef<HTMLElement | null>(null);
    const setRef = useMergedRefs(ref, rootRef);
    const listTitleId = React.useId();
    const now = useNow({ interval: 15_000, fixed: nowProp });
    const [view, setView] = useControllableState<LiveVisitorsMapView>({ value: viewProp, defaultValue: defaultView, onChange: onViewChange });
    const [selection, setSelection] = useControllableState<string | null>({ value: selectedIdProp, defaultValue: defaultSelectedId });
    const selected = selection ? visitors.find((v) => v.id === selection) : undefined;

    const select = (id: string | null) => {
      setSelection(id);
      onSelectedIdChange?.(id, id ? visitors.find((v) => v.id === id) : undefined);
    };

    const skeleton = !!loading && visitors.length === 0;
    const markers = React.useMemo(() => visitors.map((v) => liveVisitorMarker(v, now, liveWithinMs)), [visitors, now, liveWithinMs]);
    const sources = React.useMemo(() => sourcesProp ?? liveVisitorSourceCounts(visitors), [sourcesProp, visitors]);
    const shownSources = sources.slice(0, Math.max(0, maxSources));
    const hiddenSources = sources.slice(shownSources.length);
    const countries = React.useMemo(() => new Set(visitors.map((v) => normalizeCountryCode(v.country) ?? v.country)).size, [visitors]);
    const liveCount = Number.isFinite(total) ? total! : visitors.length;
    const numberFormat = (n: number) => (n >= 10_000 ? formatCompact(n) : n.toLocaleString(locale));

    const closeCard = () => {
      const id = selection;
      select(null);
      const row = id ? rootRef.current?.querySelector<HTMLElement>(`[data-visitor-id="${CSS.escape(id)}"]`) : null;
      (row ?? rootRef.current)?.focus();
    };

    const mapLabel = `${label}: ${visitors.length} ${pluralize(visitors.length, "visitor")} on the ${view === "globe" ? "globe" : "map"}`;
    const mapProps = {
      // The list next to the map is the accessible view of the same data (with fly-to), so skip the hidden tables.
      dataTable: false,
      markers,
      cluster: true,
      selectedMarkerId: selection,
      onMarkerSelect: (id: string | null) => select(id),
      loading,
      locale,
      label: mapLabel,
    } as const;

    return (
      <section
        ref={setRef}
        aria-label={label}
        aria-busy={loading || undefined}
        tabIndex={-1}
        data-slot="live-visitors-map"
        className={cn("flex min-w-0 flex-col overflow-hidden rounded-box border border-border bg-card text-card-foreground shadow-xs outline-none", className)}
        {...props}
      >
        <header data-slot="live-visitors-header" className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-border px-4 py-3">
          <div className="flex items-baseline gap-2">
            <StatusDot tone="success" pulse={!skeleton} label="" className="self-center" />
            {skeleton ? (
              <Skeleton className="h-7 w-12 self-center rounded-sm" />
            ) : (
              <span data-slot="live-visitors-count" className="text-2xl font-semibold tabular-nums">
                {numberFormat(liveCount)}
              </span>
            )}
            <span className="text-sm text-muted-foreground">live</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {skeleton ? (
              <Skeleton className="h-4 w-20 rounded-sm" />
            ) : (
              <span>
                <span className="font-medium tabular-nums text-foreground">{numberFormat(countries)}</span> {pluralize(countries, "country", "countries")}
              </span>
            )}
            {windowLabel ? <span data-slot="live-visitors-window">{windowLabel}</span> : null}
          </div>
          {!skeleton && shownSources.length ? (
            <ul aria-label="Top sources" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {shownSources.map((s) => (
                <li key={s.id ?? s.label} className="inline-flex items-center gap-1">
                  <LiveVisitorSourceIcon source={s} />
                  {s.label}
                  <span className="font-medium tabular-nums text-foreground">{numberFormat(s.count)}</span>
                </li>
              ))}
              {hiddenSources.length ? (
                <li title={hiddenSources.map((s) => `${s.label} ${s.count}`).join(", ")}>
                  +{hiddenSources.length}
                  <span className="sr-only"> more {pluralize(hiddenSources.length, "source")}</span>
                </li>
              ) : null}
            </ul>
          ) : null}
          <SegmentedControl
            size="sm"
            aria-label="Map view"
            className="ms-auto"
            value={view}
            onValueChange={(v) => setView(v as LiveVisitorsMapView)}
            options={[
              { value: "globe", label: "Globe", icon: <RiGlobalLine aria-hidden /> },
              { value: "flat", label: "Map", icon: <RiMap2Line aria-hidden /> },
            ]}
          />
        </header>

        <div className="grid grid-cols-1 min-w-0 lg:min-h-96 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div data-slot="live-visitors-map-area" className={cn("relative flex min-w-0 flex-col justify-center p-3 sm:p-4", mapClassName)}>
            {view === "globe" ? (
              <Globe {...mapProps} className="mx-auto w-full max-w-[560px]" autoRotate={autoRotate} controls />
            ) : (
              <WorldMap {...mapProps} className="w-full" />
            )}
            {selected ? (
              <LiveVisitorCardView
                visitor={selected}
                now={now}
                liveWithinMs={liveWithinMs}
                locale={locale}
                actions={renderVisitorActions?.(selected)}
                onClose={closeCard}
                className={cn(
                  "mt-3 w-full",
                  // The globe leaves its corners free; the flat map has no room to spare, so the card goes under it.
                  view === "globe" ? "sm:absolute sm:top-4 sm:start-4 sm:mt-0 sm:w-72" : "sm:max-w-sm"
                )}
              />
            ) : null}
          </div>

          <div data-slot="live-visitors-list" className="flex min-h-0 min-w-0 flex-col border-t border-border lg:border-t-0 lg:border-s lg:[contain:size]">
            <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
              <span id={listTitleId} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Visitors
              </span>
            </div>
            {skeleton ? (
              <LiveVisitorListSkeleton />
            ) : visitors.length === 0 ? (
              (emptyState ?? (
                <EmptyState size="sm" icon={<RiUserLocationLine />} title="No visitors right now" description="People show up here as they arrive" />
              ))
            ) : (
              <LiveVisitorList
                visitors={visitors}
                aria-labelledby={listTitleId}
                selectedId={selection}
                onSelect={(id) => select(selection === id ? null : id)}
                now={now}
                liveWithinMs={liveWithinMs}
                locale={locale}
                className="max-h-96 flex-1 lg:max-h-none"
              />
            )}
          </div>
        </div>
      </section>
    );
  }
);
LiveVisitorsMap.displayName = "LiveVisitorsMap";
