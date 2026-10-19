import * as React from "react";
import { RiCheckboxCircleLine, RiServerLine, RiTimerFlashLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { pluralize } from "../../lib/format";
import { toneClasses } from "../../lib/tone";
import { CountryFlag } from "../../assets/country-flags";
import { CloseButton } from "../../primitives/close-button";
import { InlineAlert } from "../../primitives/inline-alert";
import { Meter, meterLevel, meterLevelTone, type MeterThresholds } from "../../primitives/meter";
import { MetricReadout, MetricReadoutGroup, type ReadoutThresholds } from "../../primitives/metric-readout";
import { Skeleton } from "../../primitives/progress";
import { StatusBadge, StatusDot } from "../../primitives/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../primitives/table";
import {
  REGION_STATUSES,
  normalizeRegionStatus,
  regionStatusLabel,
  regionStatusSeverity,
  regionStatusTone,
  type RegionLink,
  type RegionSort,
  type RegionSortKey,
  type RegionStatusCounts,
  type StatusRegion,
} from "./region-status-map-model";

export const DEFAULT_LATENCY_THRESHOLDS: ReadoutThresholds = { warning: 150, danger: 300 };

const finite = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);
const LATENCY_STATUS = { warning: "slow", danger: "very slow" };

/** Marker / list label: "Frankfurt (eu-central-1), degraded". */
export function regionLabel(r: StatusRegion): string {
  return `${r.name}${r.code ? ` (${r.code})` : ""}, ${regionStatusLabel[normalizeRegionStatus(r.status)].toLowerCase()}`;
}

/** Second marker tooltip line: "42 ms · 63% load · 12 nodes". */
export function regionSummaryLine(r: StatusRegion, locale?: string): string | undefined {
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const parts = [
    finite(r.latencyMs) ? `${nf.format(r.latencyMs)} ms` : null,
    finite(r.load) ? `${nf.format(r.load)}% load` : null,
    finite(r.nodes) ? `${nf.format(r.nodes)} ${pluralize(r.nodes, "node")}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}

/* ------------------------------------------------------------------------------------------------
 * Legend
 * ----------------------------------------------------------------------------------------------*/

export function RegionStatusLegend({ counts, skeleton }: { counts: RegionStatusCounts; skeleton: boolean }) {
  return (
    <ul aria-label="Regions by status" data-slot="region-status-legend" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
      {REGION_STATUSES.map((s) => (
        <li key={s} data-status={s} className="flex items-center gap-1.5">
          <StatusDot tone={regionStatusTone[s]} label="" />
          <span className="text-muted-foreground">{regionStatusLabel[s]}</span>
          {skeleton ? (
            <Skeleton shape="text" className="h-3.5 w-4" />
          ) : (
            <span className="font-semibold tabular-nums text-foreground">{counts[s]}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Table
 * ----------------------------------------------------------------------------------------------*/

const COLUMNS: { key: RegionSortKey; header: string; align?: "right"; className?: string }[] = [
  { key: "name", header: "Region" },
  { key: "status", header: "Status", className: "hidden @md:table-cell" },
  { key: "latency", header: "Latency", align: "right" },
  { key: "load", header: "Load", align: "right" },
  { key: "nodes", header: "Nodes", align: "right", className: "hidden @lg:table-cell" },
];

function LoadCell({ load, thresholds }: { load: number | null | undefined; thresholds: MeterThresholds | false | undefined }) {
  if (!finite(load)) return <span className="text-muted-foreground">—</span>;
  const pct = Math.min(100, Math.max(0, load));
  const tone = meterLevelTone(meterLevel(pct, thresholds ?? undefined));
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span aria-hidden className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-muted @lg:block">
        <span className={cn("block h-full rounded-full", toneClasses.dot[tone ?? "primary"])} style={{ width: `${pct}%` }} />
      </span>
      <span className={cn("font-mono text-xs font-semibold tabular-nums", tone ? toneClasses.text[tone] : "text-foreground")}>{`${Math.round(load)}%`}</span>
    </span>
  );
}

export interface RegionTableProps {
  regions: readonly StatusRegion[];
  sort: RegionSort | null;
  onSort: (key: RegionSortKey) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  skeleton: boolean;
  loadingRows: number;
  latencyThresholds: ReadoutThresholds | false;
  loadThresholds: MeterThresholds | false | undefined;
  locale?: string;
}

export function RegionTable({
  regions,
  sort,
  onSort,
  selectedId,
  onSelect,
  skeleton,
  loadingRows,
  latencyThresholds,
  loadThresholds,
  locale,
}: RegionTableProps) {
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  return (
    <Table density="compact" data-slot="region-status-table" aria-label="Regions">
      <TableHeader>
        <TableRow>
          {COLUMNS.map((c) => (
            <TableHead
              key={c.key}
              align={c.align}
              className={c.className}
              sortDirection={skeleton ? undefined : sort?.key === c.key ? sort.direction : false}
              onSort={skeleton ? undefined : () => onSort(c.key)}
            >
              {c.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {skeleton
          ? Array.from({ length: loadingRows }, (_, i) => (
              <TableRow key={`skeleton-${i}`} className="hover:bg-transparent">
                {COLUMNS.map((c, j) => (
                  <TableCell key={c.key} align={c.align} className={c.className}>
                    <Skeleton shape="text" className={cn("inline-block h-3.5 align-middle", j === 0 ? (i % 2 ? "w-28" : "w-36") : "w-12")} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          : regions.map((r) => {
              const status = normalizeRegionStatus(r.status);
              const selected = r.id === selectedId;
              return (
                <TableRow
                  key={r.id}
                  data-id={r.id}
                  data-state={selected ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={(e) => {
                    // The name button handles its own clicks (and keyboard activation).
                    if ((e.target as HTMLElement).closest("button")) return;
                    onSelect(r.id);
                  }}
                >
                  <TableCell className="max-w-28 @sm:max-w-[12rem] @lg:max-w-none">
                    <button
                      type="button"
                      aria-pressed={selected}
                      data-slot="region-status-row-button"
                      onClick={() => onSelect(r.id)}
                      className={cn("-mx-1 flex min-w-0 max-w-full items-center gap-2 rounded-xs px-1 py-0.5 text-left", focusRing)}
                    >
                      {r.country ? <CountryFlag code={r.country} size="sm" label="" className="shrink-0" /> : null}
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate font-medium text-foreground" data-slot="region-status-row-name">{r.name}</span>
                          {/* In a narrow container the status column is hidden; the dot (and its label) stands in for it. */}
                          <StatusDot tone={regionStatusTone[status]} size="sm" label={regionStatusLabel[status]} className="@md:hidden" />
                        </span>
                        {r.code ? <span className="block truncate font-mono text-2xs text-muted-foreground">{r.code}</span> : null}
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="hidden @md:table-cell">
                    <StatusBadge tone={regionStatusTone[status]} size="sm" label={regionStatusLabel[status]} pulse={status === "down"} />
                  </TableCell>
                  <TableCell align="right">
                    <MetricReadout
                      value={finite(r.latencyMs) ? r.latencyMs : null}
                      unit="ms"
                      size="xs"
                      thresholds={latencyThresholds}
                      statusLabels={LATENCY_STATUS}
                      locale={locale}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <LoadCell load={r.load} thresholds={loadThresholds} />
                  </TableCell>
                  <TableCell align="right" className="hidden font-mono text-xs tabular-nums @lg:table-cell">
                    {finite(r.nodes) ? nf.format(r.nodes) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              );
            })}
      </TableBody>
    </Table>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Side panel: region detail, or an overview when nothing is selected
 * ----------------------------------------------------------------------------------------------*/

export interface RegionDetailProps {
  region: StatusRegion;
  regions: readonly StatusRegion[];
  links: readonly RegionLink[];
  onClose: () => void;
  onSelect: (id: string) => void;
  latencyThresholds: ReadoutThresholds | false;
  loadThresholds: MeterThresholds | false | undefined;
  actions?: React.ReactNode;
  locale?: string;
}

export function RegionDetail({ region: r, regions, links, onClose, onSelect, latencyThresholds, loadThresholds, actions, locale }: RegionDetailProps) {
  const status = normalizeRegionStatus(r.status);
  const headingId = React.useId();
  const peers = links
    .filter((l) => l.from === r.id || l.to === r.id)
    .map((l) => ({ link: l, peer: regions.find((p) => p.id === (l.from === r.id ? l.to : l.from)) }))
    .filter((x): x is { link: RegionLink; peer: StatusRegion } => !!x.peer);
  return (
    <div role="group" aria-labelledby={headingId} data-slot="region-status-detail" data-id={r.id} className="flex min-w-0 flex-col gap-3">
      <div className="flex items-start gap-2">
        {r.country ? <CountryFlag code={r.country} size="md" className="mt-0.5 shrink-0" /> : null}
        <div className="min-w-0 flex-1">
          <h3 id={headingId} tabIndex={-1} className="truncate text-sm font-semibold text-foreground outline-none">
            {r.name}
          </h3>
          {r.code ? <div className="truncate font-mono text-xs text-muted-foreground">{r.code}</div> : null}
        </div>
        <CloseButton size="sm" aria-label="Close region details" onClick={onClose} className="-mt-1 -mr-1 shrink-0" />
      </div>
      <div>
        <StatusBadge tone={regionStatusTone[status]} label={regionStatusLabel[status]} pulse={status === "down"} />
      </div>
      {r.incident ? (
        <InlineAlert role="note" tone={status === "healthy" ? "info" : regionStatusTone[status]} className="text-xs">
          {r.incident}
        </InlineAlert>
      ) : null}
      <Meter label="Load" value={finite(r.load) ? Math.min(100, Math.max(0, r.load)) : null} size="sm" thresholds={loadThresholds} />
      <MetricReadoutGroup label="Region readings" className="text-muted-foreground">
        <MetricReadout
          icon={<RiTimerFlashLine />}
          label="Latency"
          value={finite(r.latencyMs) ? r.latencyMs : null}
          unit="ms"
          thresholds={latencyThresholds}
          statusLabels={LATENCY_STATUS}
          locale={locale}
        />
        <MetricReadout icon={<RiServerLine />} label="Nodes" value={finite(r.nodes) ? r.nodes : null} locale={locale} />
      </MetricReadoutGroup>
      {peers.length ? (
        <div className="space-y-1.5">
          <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Links</div>
          <ul className="space-y-0.5">
            {peers.map(({ link, peer }) => {
              const ls = link.status ? normalizeRegionStatus(link.status) : undefined;
              const shown = ls ?? (regionStatusSeverity[normalizeRegionStatus(peer.status)] > regionStatusSeverity[status] ? normalizeRegionStatus(peer.status) : status);
              return (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(peer.id)}
                    className={cn("-mx-1.5 flex w-[calc(100%+0.75rem)] items-center gap-2 rounded-xs px-1.5 py-1 text-left text-xs hover:bg-accent", focusRing)}
                  >
                    <StatusDot tone={regionStatusTone[shown]} size="sm" label="" />
                    <span className="min-w-0 flex-1 truncate text-foreground">{peer.name}</span>
                    {link.kind ? <span className="shrink-0 text-muted-foreground">{link.kind}</span> : null}
                    <span className="sr-only">{`, ${regionStatusLabel[shown].toLowerCase()}`}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {actions ? <div className="flex flex-wrap gap-2 border-t border-border pt-3">{actions}</div> : null}
    </div>
  );
}

export interface RegionOverviewProps {
  regions: readonly StatusRegion[];
  onSelect: (id: string) => void;
  latencyThresholds: ReadoutThresholds | false;
  locale?: string;
}

/** Totals and the regions that need attention (worst first). */
export function RegionOverview({ regions, onSelect, latencyThresholds, locale }: RegionOverviewProps) {
  const headingId = React.useId();
  const latencies = regions.map((r) => r.latencyMs).filter(finite);
  const avgLatency = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;
  const nodes = regions.map((r) => r.nodes).filter(finite);
  const attention = regions
    .filter((r) => normalizeRegionStatus(r.status) !== "healthy" || r.incident)
    .sort((a, b) => regionStatusSeverity[normalizeRegionStatus(b.status)] - regionStatusSeverity[normalizeRegionStatus(a.status)]);
  return (
    <div role="group" aria-labelledby={headingId} data-slot="region-status-overview" className="flex min-w-0 flex-col gap-3">
      <h3 id={headingId} tabIndex={-1} className="text-sm font-semibold text-foreground outline-none">
        Overview
      </h3>
      <MetricReadoutGroup label="Totals">
        <MetricReadout label="Regions" value={regions.length} locale={locale} />
        <MetricReadout
          label="Avg latency"
          value={avgLatency}
          unit="ms"
          thresholds={latencyThresholds}
          statusLabels={LATENCY_STATUS}
          locale={locale}
        />
        {nodes.length ? <MetricReadout label="Nodes" value={nodes.reduce((a, b) => a + b, 0)} locale={locale} /> : null}
      </MetricReadoutGroup>
      <div className="space-y-1.5">
        <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Needs attention</div>
        {attention.length ? (
          <ul className="space-y-0.5">
            {attention.map((r) => {
              const status = normalizeRegionStatus(r.status);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(r.id)}
                    className={cn("-mx-1.5 flex w-[calc(100%+0.75rem)] items-start gap-2 rounded-xs px-1.5 py-1 text-left hover:bg-accent", focusRing)}
                  >
                    <StatusDot tone={regionStatusTone[status]} size="sm" label="" className="mt-1.5" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {r.name}
                        <span className="sr-only">{`, ${regionStatusLabel[status].toLowerCase()}`}</span>
                      </span>
                      {r.incident ? <span className="line-clamp-2 block text-xs text-muted-foreground">{r.incident}</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <RiCheckboxCircleLine aria-hidden className={cn("size-4", toneClasses.text.success)} />
            All regions healthy
          </p>
        )}
      </div>
    </div>
  );
}

export function RegionPanelSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <Skeleton shape="text" className="h-4 w-24" />
      <Skeleton shape="text" className="h-3.5 w-40" />
      <Skeleton shape="text" className="mt-2 h-3 w-28" />
      <Skeleton shape="text" lines={3} />
    </div>
  );
}
