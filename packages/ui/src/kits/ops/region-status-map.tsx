import * as React from "react";
import { RiCloseLine, RiAlertFill, RiGlobalLine, RiMap2Line, RiToolsFill } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useMergedRefs } from "../../hooks/use-merged-refs";
import { useElementWidth } from "../../hooks/use-resize-observer";
import { Card } from "../../primitives/layout";
import { EmptyState } from "../../primitives/empty-state";
import type { MeterThresholds } from "../../primitives/meter";
import type { ReadoutThresholds } from "../../primitives/metric-readout";
import { SegmentedControl } from "../../primitives/segmented-control";
import type { GeoMarker } from "../geo/geo-marker-layer";
import { Globe } from "../geo/globe";
import { WorldMap } from "../geo/world-map";
import {
  countRegionStatuses,
  normalizeRegionStatus,
  regionLinkArcs,
  regionMarkerSize,
  regionStatusTone,
  sortRegions,
  type RegionLink,
  type RegionSort,
  type RegionSortKey,
  type RegionStatus,
  type StatusRegion,
} from "./region-status-map-model";
import {
  DEFAULT_LATENCY_THRESHOLDS,
  RegionDetail,
  RegionOverview,
  RegionPanelSkeleton,
  RegionStatusLegend,
  RegionTable,
  regionLabel,
  regionSummaryLine,
} from "./region-status-map-internal";

/** How the regions are drawn: a flat `map` or a `globe`. */
export type RegionStatusMapView = "map" | "globe";

export interface RegionStatusMapProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
  regions: readonly StatusRegion[];
  /** Replication or traffic links between regions, drawn as arcs toned by health. */
  links?: readonly RegionLink[];

  /** Selected region id (shows its detail and highlights its marker and row). */
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelectedIdChange?: (id: string | null, region: StatusRegion | undefined) => void;

  /** Flat map (default) or globe. */
  view?: RegionStatusMapView;
  defaultView?: RegionStatusMapView;
  onViewChange?: (view: RegionStatusMapView) => void;
  /** Show the map / globe toggle. Default true. */
  viewToggle?: boolean;
  /** Spin the globe view slowly (see `Globe`'s `autoRotate`). */
  autoRotate?: boolean | number;
  /** Merge nearby markers into count bubbles. Default false. */
  cluster?: boolean;

  /** Table sort. Default: status, worst first. `null` keeps the order of `regions`. */
  sort?: RegionSort | null;
  defaultSort?: RegionSort | null;
  onSortChange?: (sort: RegionSort | null) => void;

  /** Latency (ms) at which readings turn warning / destructive. Default `{ warning: 150, danger: 300 }`. */
  latencyThresholds?: ReadoutThresholds | false;
  /** Load percent at which meters turn warning / destructive. Default `{ warn: 75, danger: 90 }`. */
  loadThresholds?: MeterThresholds | false;

  /** Actions in the selected region's detail panel (e.g. "Open dashboard", "Drain"). */
  renderRegionActions?: (region: StatusRegion) => React.ReactNode;

  /** Data is on its way: skeletons with no regions yet; otherwise the current regions stay and the root is busy. */
  loading?: boolean;
  /** Skeleton rows in the table while loading. Default 5. */
  loadingRows?: number;
  /** Shown instead of the map and table when there are no regions. */
  emptyState?: React.ReactNode;
  /** Accessible name of the map. Defaults to a summary ("Region map: 12 regions, 1 down, 2 degraded"). */
  label?: string;
  /** Locale for numbers. */
  locale?: string;
}

const DEFAULT_SORT: RegionSort = { key: "status", direction: "desc" };
const EMPTY: readonly never[] = [];

const statusIcon: Partial<Record<RegionStatus, React.ReactNode>> = {
  degraded: <RiAlertFill />,
  down: <RiCloseLine />,
  maintenance: <RiToolsFill />,
};

function mapSummary(regions: readonly StatusRegion[]): string {
  const c = countRegionStatuses(regions);
  const parts = [`${regions.length} ${regions.length === 1 ? "region" : "regions"}`];
  if (c.down) parts.push(`${c.down} down`);
  if (c.degraded) parts.push(`${c.degraded} degraded`);
  if (c.maintenance) parts.push(`${c.maintenance} in maintenance`);
  return `Region map: ${parts.join(", ")}`;
}

/**
 * Infrastructure regions on a world map or globe: markers toned by status and sized by load, replication/traffic
 * links as arcs, a status legend with counts, a sortable region table whose rows select the marker, and a detail
 * panel (status, incident, load meter, latency and node readings, links, actions) for the selected region.
 */
export const RegionStatusMap = React.forwardRef<HTMLDivElement, RegionStatusMapProps>(
  (
    {
      regions,
      links = EMPTY,
      selectedId: selectedProp,
      defaultSelectedId = null,
      onSelectedIdChange,
      view: viewProp,
      defaultView = "map",
      onViewChange,
      viewToggle = true,
      autoRotate,
      cluster = false,
      sort: sortProp,
      defaultSort = DEFAULT_SORT,
      onSortChange,
      latencyThresholds = DEFAULT_LATENCY_THRESHOLDS,
      loadThresholds,
      renderRegionActions,
      loading,
      loadingRows = 5,
      emptyState,
      label,
      locale,
      className,
      ...props
    },
    ref
  ) => {
    const [selectedId, setSelectedId] = useControllableState<string | null>({ value: selectedProp, defaultValue: defaultSelectedId });
    const [view, setView] = useControllableState<RegionStatusMapView>({ value: viewProp, defaultValue: defaultView, onChange: onViewChange });
    const [sort, setSort] = useControllableState<RegionSort | null>({ value: sortProp, defaultValue: defaultSort, onChange: onSortChange });

    const rootRef = React.useRef<HTMLDivElement>(null);
    const mergedRef = useMergedRefs(ref, rootRef);
    // Panel buttons unmount when the panel switches between overview and detail; focus then moves to its heading.
    const focusPanel = React.useRef(false);
    const mapBoxRef = React.useRef<HTMLDivElement>(null);
    const mapWidth = Math.round(useElementWidth(mapBoxRef));
    const globeHeight = clamp(Math.round((mapWidth || 640) * 0.6), 260, 440);

    const skeleton = !!loading && regions.length === 0;
    const empty = !loading && regions.length === 0;
    const selected = selectedId ? regions.find((r) => r.id === selectedId) : undefined;

    const select = (id: string | null) => {
      setSelectedId(id);
      onSelectedIdChange?.(id, id ? regions.find((r) => r.id === id) : undefined);
    };
    const toggle = (id: string) => select(id === selectedId ? null : id);
    const selectFromPanel = (id: string | null) => {
      focusPanel.current = true;
      select(id);
    };
    React.useEffect(() => {
      if (!focusPanel.current) return;
      focusPanel.current = false;
      rootRef.current?.querySelector<HTMLElement>('[data-slot="region-status-panel"] h3')?.focus();
    });

    const counts = React.useMemo(() => countRegionStatuses(regions), [regions]);
    const rows = React.useMemo(() => sortRegions(regions, sort), [regions, sort]);
    const markers = React.useMemo<GeoMarker[]>(
      () =>
        regions.map((r) => {
          const status = normalizeRegionStatus(r.status);
          const icon = statusIcon[status];
          const size = regionMarkerSize(r.load);
          return {
            id: r.id,
            point: r.point,
            label: regionLabel(r),
            description: regionSummaryLine(r, locale),
            tone: regionStatusTone[status],
            size: icon ? Math.max(16, size) : size,
            icon,
            pulse: status === "down",
          };
        }),
      [regions, locale]
    );
    const arcs = React.useMemo(() => regionLinkArcs(links, regions, { selectedId }), [links, regions, selectedId]);

    const onSort = (key: RegionSortKey) => {
      const first = key === "name" ? "asc" : "desc";
      if (!sort || sort.key !== key) setSort({ key, direction: first });
      else if (sort.direction === first) setSort({ key, direction: first === "asc" ? "desc" : "asc" });
      else setSort(null);
    };

    const mapLabel = label ?? mapSummary(regions);
    const mapData = {
      // The list next to the map is the accessible view of the same data (with fly-to), so skip the hidden tables.
      dataTable: false,
      label: mapLabel,
      markers: skeleton ? EMPTY : markers,
      arcs: skeleton ? EMPTY : arcs,
      selectedMarkerId: selected ? selected.id : null,
      onMarkerSelect: (id: string | null) => select(id),
      cluster,
      loading: skeleton,
      locale,
    };

    return (
      <div
        ref={mergedRef}
        role="group"
        aria-label={props["aria-label"] ?? "Region status"}
        aria-busy={loading || undefined}
        data-slot="region-status-map"
        data-view={view}
        className={cn("@container flex min-w-0 flex-col gap-4", className)}
        {...props}
      >
        {skeleton ? <span className="sr-only">Loading regions…</span> : null}

        {empty ? null : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <RegionStatusLegend counts={counts} skeleton={skeleton} />
            {viewToggle ? (
              <SegmentedControl
                size="sm"
                aria-label="Map view"
                value={view}
                onValueChange={(v) => setView(v as RegionStatusMapView)}
                options={[
                  { value: "map", label: "Map", icon: <RiMap2Line /> },
                  { value: "globe", label: "Globe", icon: <RiGlobalLine /> },
                ]}
              />
            ) : null}
          </div>
        )}

        {empty ? (
          <Card data-slot="region-status-empty">
            {emptyState ?? (
              <EmptyState icon={<RiGlobalLine />} title="No regions" description="Regions show up here once they report their status." />
            )}
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 min-w-0 gap-4 @3xl:grid-cols-[minmax(0,1fr)_18rem]">
              <Card className="flex min-w-0 flex-col justify-center p-2 @md:p-3">
                {/* While loading, the map's own placeholder is decorative; the root carries the loading text. */}
                <div ref={mapBoxRef} aria-hidden={skeleton || undefined} data-slot="region-status-map-canvas">
                  {view === "globe" ? (
                    <Globe {...mapData} height={globeHeight} autoRotate={autoRotate} controls={!skeleton} />
                  ) : (
                    <WorldMap {...mapData} />
                  )}
                </div>
              </Card>
              <Card className="min-w-0 p-4" data-slot="region-status-panel">
                {skeleton ? (
                  <RegionPanelSkeleton />
                ) : selected ? (
                  <RegionDetail
                    region={selected}
                    regions={regions}
                    links={links}
                    onClose={() => selectFromPanel(null)}
                    onSelect={selectFromPanel}
                    latencyThresholds={latencyThresholds}
                    loadThresholds={loadThresholds}
                    actions={renderRegionActions?.(selected)}
                    locale={locale}
                  />
                ) : (
                  <RegionOverview regions={regions} onSelect={selectFromPanel} latencyThresholds={latencyThresholds} locale={locale} />
                )}
              </Card>
            </div>
            <RegionTable
              regions={rows}
              sort={sort}
              onSort={onSort}
              selectedId={selected ? selected.id : null}
              onSelect={toggle}
              skeleton={skeleton}
              loadingRows={loadingRows}
              latencyThresholds={latencyThresholds}
              loadThresholds={loadThresholds}
              locale={locale}
            />
          </>
        )}
      </div>
    );
  }
);
RegionStatusMap.displayName = "RegionStatusMap";
