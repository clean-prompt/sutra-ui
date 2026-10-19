import * as React from "react";
import { RiAlertFill, RiEarthLine, RiMap2Line, RiShieldUserLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { pluralize } from "../../lib/format";
import { toneClasses } from "../../lib/tone";
import type { TimeInput } from "../../lib/time";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useNow } from "../../hooks/use-now";
import { useElementWidth } from "../../hooks/use-resize-observer";
import { EmptyState } from "../../primitives/empty-state";
import { SegmentedControl } from "../../primitives/segmented-control";
import type { GeoMarker } from "../geo/geo-marker-layer";
import { Globe } from "../geo/globe";
import { WorldMap, type GeoArc } from "../geo/world-map";
import {
  OUTCOME,
  SignInEventDetail,
  SignInFlagListSkeleton,
  SignInFlagRow,
  SignInNoAlerts,
  SignInSummaryRow,
  outcomeOf,
  signInClient,
  signInPlace,
  signInWhen,
} from "./sign-in-map-internal";
import { analyzeSignIns, type AnalyzeSignInsOptions, type SignInEvent, type SignInFlag } from "./sign-in-map-model";

/** Flat map or 3D globe. */
export type SignInMapView = "map" | "globe";

export interface SignInMapProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "children">, AnalyzeSignInsOptions {
  /** Sign-in attempts in any order. Events without a valid point or time are left out. */
  events?: readonly SignInEvent[] | null;
  /** Data is on its way: skeletons with no events yet, otherwise the events stay on screen (a refresh). */
  loading?: boolean;
  /** Heading. Default "Sign-in activity". */
  title?: React.ReactNode;
  /** The period the events cover, next to the title ("Last 7 days"). */
  windowLabel?: React.ReactNode;

  view?: SignInMapView;
  /** Default `map`. */
  defaultView?: SignInMapView;
  onViewChange?: (view: SignInMapView) => void;
  /** Show the map / globe switch. Default true. */
  viewToggle?: boolean;

  /** Selected event id: highlighted on the map, in the flagged list and shown in the detail panel. */
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelectedIdChange?: (id: string | null, event: SignInEvent | undefined) => void;

  /** Shows a "Review" action on flagged events and the selected event's details. */
  onReview?: (event: SignInEvent, flags: SignInFlag[]) => void;
  /** Shows "Revoke" on successful sign-ins other than the current one. May return a promise (the button spins until it settles). */
  onRevoke?: (event: SignInEvent) => void | Promise<void>;
  /** Default "Review". */
  reviewLabel?: string;
  /** Default "Revoke". */
  revokeLabel?: string;

  /** Replaces the default "No sign-ins" view. */
  emptyState?: React.ReactNode;
  /** Reference time for relative times (tests, stories). Default: the clock, updated every 30 s. */
  now?: TimeInput;
  /** Locale for country names, dates and numbers. */
  locale?: string;
}

const EMPTY: readonly SignInEvent[] = [];
const GLOBE_ASPECT = 0.62;

const FlaggedIcon = () => (
  <span className={cn("flex size-full items-center justify-center rounded-full text-white [&_svg]:size-2.5", toneClasses.solid.warning)}>
    <RiAlertFill />
  </span>
);

/**
 * Where sign-ins come from: outcome-toned markers (clustered) on a flat map or globe, impossible-travel arcs,
 * new-country flags, a summary row and a list of flagged sign-ins with review and revoke actions.
 */
export const SignInMap = React.forwardRef<HTMLDivElement, SignInMapProps>(
  (
    {
      events: eventsProp,
      loading,
      title = "Sign-in activity",
      windowLabel,
      view: viewProp,
      defaultView = "map",
      onViewChange,
      viewToggle = true,
      selectedId: selectedProp,
      defaultSelectedId = null,
      onSelectedIdChange,
      onReview,
      onRevoke,
      reviewLabel,
      revokeLabel,
      emptyState,
      now: nowProp,
      locale,
      maxKmh,
      minDistanceKm,
      knownCountries,
      className,
      ...props
    },
    ref,
  ) => {
    const events = eventsProp ?? EMPTY;
    const now = useNow({ interval: 30_000, fixed: nowProp });
    const headingId = React.useId();
    const flaggedId = React.useId();
    const mapBoxRef = React.useRef<HTMLDivElement>(null);
    const mapWidth = Math.round(useElementWidth(mapBoxRef));

    const knownKey = knownCountries?.join(",");
    const analysis = React.useMemo(
      () => analyzeSignIns(events, { maxKmh, minDistanceKm, knownCountries }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [events, maxKmh, minDistanceKm, knownKey],
    );
    const byId = React.useMemo(() => new Map(analysis.events.map((e) => [e.id, e])), [analysis]);

    const [view, setView] = useControllableState<SignInMapView>({
      value: viewProp,
      defaultValue: defaultView,
      onChange: onViewChange,
    });
    const [selection, setSelection] = useControllableState<string | null>({
      value: selectedProp,
      defaultValue: defaultSelectedId,
    });
    const selected = selection ? byId.get(selection) : undefined;
    const select = (id: string | null) => {
      setSelection(id);
      onSelectedIdChange?.(id, id ? byId.get(id) : undefined);
    };

    const markers = React.useMemo<GeoMarker[]>(
      () =>
        analysis.events.map((e) => {
          const outcome = outcomeOf(e);
          const flagged = analysis.flags.has(e.id);
          const place = signInPlace(e, locale);
          return {
            id: e.id,
            point: e.point,
            label: `${place}: ${outcome.label.toLowerCase()} sign-in${flagged ? ", flagged" : ""}${e.current ? ", this session" : ""}`,
            description: [signInWhen(e, now), signInClient(e)].filter(Boolean).join(" · "),
            tone: outcome.tone,
            size: flagged ? 16 : undefined,
            badge: flagged ? (
              <span className="block size-3.5 rounded-full border border-background">
                <FlaggedIcon />
              </span>
            ) : undefined,
            pulse: e.current,
          };
        }),
      [analysis, locale, now],
    );

    const arcs = React.useMemo<GeoArc[]>(
      () =>
        analysis.travels.map((t) => {
          const active = !!selection && (t.to.id === selection || t.from.id === selection);
          return {
            id: t.id,
            from: t.from.point,
            to: t.to.point,
            tone: "warning",
            animated: true,
            width: active ? 2.75 : 1.5,
            label: `Impossible travel: ${signInPlace(t.from, locale)} to ${signInPlace(t.to, locale)}`,
          };
        }),
      [analysis, selection, locale],
    );

    const onClusterSelect = (members: GeoMarker[]) => {
      const ids = new Set(members.map((m) => m.id));
      const pick = analysis.flagged.find((e) => ids.has(e.id)) ?? analysis.events.find((e) => ids.has(e.id));
      if (pick) select(pick.id);
    };

    const hasData = analysis.events.length > 0;
    const skeleton = !!loading && !hasData;
    const empty = !loading && !hasData;
    const { summary } = analysis;
    const mapLabel = `Sign-in map: ${summary.total} ${pluralize(summary.total, "sign-in")} from ${summary.countries} ${pluralize(summary.countries, "country", "countries")}, ${summary.alerts} ${pluralize(summary.alerts, "alert")}`;

    const actions = { onReview, onRevoke, reviewLabel, revokeLabel };
    const mapProps = {
      // The list next to the map is the accessible view of the same data (with fly-to), so skip the hidden tables.
      dataTable: false,
      markers: skeleton ? EMPTY_MARKERS : markers,
      arcs: skeleton ? EMPTY_ARCS : arcs,
      cluster: true,
      selectedMarkerId: selected ? selected.id : null,
      onMarkerSelect: (id: string | null) => select(id),
      onClusterSelect,
      loading,
      label: mapLabel,
      locale,
    };
    const globeHeight = mapWidth > 0 ? clamp(Math.round(mapWidth * GLOBE_ASPECT), 260, 520) : undefined;

    return (
      <div
        ref={ref}
        data-slot="sign-in-map"
        role="group"
        aria-labelledby={headingId}
        aria-busy={loading || undefined}
        className={cn("flex min-w-0 flex-col gap-4 rounded-box border border-border bg-card p-4 shadow-xs sm:p-5", className)}
        {...props}
      >
        {loading ? <span className="sr-only">Loading…</span> : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
            <h3 id={headingId} className="text-base font-semibold text-foreground">
              {title}
            </h3>
            {windowLabel != null ? <span className="shrink-0 text-sm text-muted-foreground">{windowLabel}</span> : null}
          </div>
          {viewToggle && !empty ? (
            <SegmentedControl
              size="sm"
              aria-label="Map view"
              value={view}
              onValueChange={(v) => setView(v as SignInMapView)}
              options={[
                {
                  value: "map",
                  label: "Map",
                  icon: <RiMap2Line aria-hidden />,
                },
                {
                  value: "globe",
                  label: "Globe",
                  icon: <RiEarthLine aria-hidden />,
                },
              ]}
            />
          ) : null}
        </div>

        {empty ? (
          (emptyState ?? (
            <EmptyState
              data-slot="sign-in-map-empty"
              size="sm"
              variant="dashed"
              icon={<RiShieldUserLine aria-hidden />}
              title="No sign-ins"
              description="Sign-in attempts and where they came from appear here."
            />
          ))
        ) : (
          <>
            <SignInSummaryRow summary={skeleton ? undefined : summary} loading={skeleton} />
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="flex min-w-0 flex-col gap-2">
                <div ref={mapBoxRef} data-slot="sign-in-map-canvas" aria-hidden={skeleton || undefined} className="min-w-0">
                  {view === "globe" ? (
                    <Globe {...mapProps} controls={!skeleton} height={globeHeight} className="w-full" />
                  ) : (
                    <WorldMap {...mapProps} className="w-full" />
                  )}
                </div>
                {skeleton ? null : <SignInLegend flagged={analysis.flagged.length > 0} travels={analysis.travels.length > 0} />}
                {selected ? (
                  <SignInEventDetail
                    className="mt-2"
                    event={selected}
                    flags={analysis.flags.get(selected.id) ?? []}
                    onClose={() => select(null)}
                    now={now}
                    locale={locale}
                    wide={mapWidth >= 520}
                    {...actions}
                  />
                ) : null}
              </div>
              <div
                role="group"
                aria-labelledby={flaggedId}
                data-slot="sign-in-map-flagged"
                className="flex min-w-0 flex-col overflow-hidden rounded-box border border-border lg:self-start"
              >
                <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                  <h4 id={flaggedId} className="text-sm font-semibold text-foreground">
                    Flagged sign-ins
                  </h4>
                  {skeleton ? null : <span className="text-sm text-muted-foreground tabular-nums">{analysis.flagged.length}</span>}
                </div>
                {skeleton ? (
                  <SignInFlagListSkeleton />
                ) : analysis.flagged.length ? (
                  <ul className="scrollbar-thin divide-y divide-border lg:max-h-[28rem] lg:overflow-y-auto">
                    {analysis.flagged.map((e) => (
                      <SignInFlagRow
                        key={e.id}
                        event={e}
                        flags={analysis.flags.get(e.id)!}
                        selected={e.id === selected?.id}
                        onSelect={(ev) => select(ev.id === selected?.id ? null : ev.id)}
                        now={now}
                        locale={locale}
                        {...actions}
                      />
                    ))}
                  </ul>
                ) : (
                  <SignInNoAlerts />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  },
);
SignInMap.displayName = "SignInMap";

const EMPTY_MARKERS: GeoMarker[] = [];
const EMPTY_ARCS: GeoArc[] = [];

function SignInLegend({ flagged, travels }: { flagged: boolean; travels: boolean }) {
  return (
    <ul data-slot="sign-in-map-legend" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {(Object.keys(OUTCOME) as (keyof typeof OUTCOME)[]).map((k) => (
        <li key={k} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn("size-2 rounded-full", toneClasses.dot[OUTCOME[k].tone])} />
          {OUTCOME[k].label}
        </li>
      ))}
      {flagged ? (
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden className="relative size-3">
            <FlaggedIcon />
          </span>
          Flagged
        </li>
      ) : null}
      {travels ? (
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-0 w-4 border-t-2 border-dashed border-warning" />
          Impossible travel
        </li>
      ) : null}
    </ul>
  );
}
