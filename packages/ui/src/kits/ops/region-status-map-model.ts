import type * as React from "react";
import type { Tone } from "../../lib/tone";
import { toGeoPoint, type GeoPointInput } from "../geo/geo-model";
import type { GeoArc } from "../geo/world-map";

/* ------------------------------------------------------------------------------------------------
 * Status vocabulary
 * ----------------------------------------------------------------------------------------------*/

export const REGION_STATUSES = ["healthy", "degraded", "down", "maintenance"] as const;

/** Health of an infrastructure region. */
export type RegionStatus = (typeof REGION_STATUSES)[number];

/** Other spellings status feeds use, accepted and mapped by `normalizeRegionStatus`. */
export type RegionStatusAlias =
  | "operational"
  | "ok"
  | "up"
  | "online"
  | "warning"
  | "partial"
  | "degraded_performance"
  | "outage"
  | "major_outage"
  | "offline"
  | "error"
  | "under_maintenance";

/** What `status` accepts: the canonical names plus the aliases. */
export type RegionStatusInput = RegionStatus | RegionStatusAlias;

const ALIASES: Record<RegionStatusAlias, RegionStatus> = {
  operational: "healthy",
  ok: "healthy",
  up: "healthy",
  online: "healthy",
  warning: "degraded",
  partial: "degraded",
  degraded_performance: "degraded",
  outage: "down",
  major_outage: "down",
  offline: "down",
  error: "down",
  under_maintenance: "maintenance",
};

/** Map any accepted status spelling to a `RegionStatus` (unknown or missing → `fallback`). */
export function normalizeRegionStatus(status: RegionStatusInput | string | null | undefined, fallback: RegionStatus = "healthy"): RegionStatus {
  if (!status) return fallback;
  const s = status.toLowerCase();
  if ((REGION_STATUSES as readonly string[]).includes(s)) return s as RegionStatus;
  return Object.hasOwn(ALIASES, s) ? ALIASES[s as RegionStatusAlias] : fallback;
}

/** Canonical tone per region status. */
export const regionStatusTone: Record<RegionStatus, Tone> = {
  healthy: "success",
  degraded: "warning",
  down: "destructive",
  maintenance: "info",
};

/** Default display label per region status. */
export const regionStatusLabel: Record<RegionStatus, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  down: "Down",
  maintenance: "Maintenance",
};

/** How bad a status is (higher is worse): healthy 0, maintenance 1, degraded 2, down 3. */
export const regionStatusSeverity: Record<RegionStatus, number> = {
  healthy: 0,
  maintenance: 1,
  degraded: 2,
  down: 3,
};

/* ------------------------------------------------------------------------------------------------
 * Data
 * ----------------------------------------------------------------------------------------------*/

/** One infrastructure region on a `RegionStatusMap`. */
export interface StatusRegion {
  id: string;
  /** Display name ("Frankfurt"). */
  name: string;
  /** Provider code ("eu-central-1"). */
  code?: string;
  point: GeoPointInput;
  status: RegionStatusInput;
  /** ISO 3166-1 alpha-2 code for a flag beside the name. */
  country?: string;
  /** Round-trip latency in ms; `null` = no sample. */
  latencyMs?: number | null;
  /** Load in percent (0–100); `null` = no sample. */
  load?: number | null;
  /** Number of nodes serving the region. */
  nodes?: number | null;
  /** Short note about an ongoing incident or maintenance window. */
  incident?: React.ReactNode;
}

/** A replication or traffic link between two regions, drawn as an arc. */
export interface RegionLink {
  id: string;
  /** Region id the link starts at. */
  from: string;
  /** Region id the link ends at. */
  to: string;
  /** What flows over it ("replication", "traffic"); used in the accessible name. */
  kind?: string;
  /** Health of the link itself. Defaults to the worse of its two regions. */
  status?: RegionStatusInput;
  /** Accessible name; defaults to "Frankfurt to Virginia (replication)". */
  label?: string;
  /** Flowing dashes. Default: on unless the link is down. */
  animated?: boolean;
}

export type RegionStatusCounts = Record<RegionStatus, number>;

/** How many regions are in each status. */
export function countRegionStatuses(regions: readonly Pick<StatusRegion, "status">[]): RegionStatusCounts {
  const counts: RegionStatusCounts = { healthy: 0, degraded: 0, down: 0, maintenance: 0 };
  for (const r of regions) counts[normalizeRegionStatus(r.status)]++;
  return counts;
}

/** The most severe of the given statuses (`healthy` for none). */
export function worstRegionStatus(statuses: readonly (RegionStatusInput | null | undefined)[]): RegionStatus {
  let worst: RegionStatus = "healthy";
  for (const s of statuses) {
    const n = normalizeRegionStatus(s);
    if (regionStatusSeverity[n] > regionStatusSeverity[worst]) worst = n;
  }
  return worst;
}

/* ------------------------------------------------------------------------------------------------
 * Sorting
 * ----------------------------------------------------------------------------------------------*/

export type RegionSortKey = "name" | "status" | "latency" | "load" | "nodes";

export interface RegionSort {
  key: RegionSortKey;
  direction: "asc" | "desc";
}

const finite = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);

function sortValue(r: StatusRegion, key: RegionSortKey): number | string | null {
  switch (key) {
    case "name":
      return r.name;
    case "status":
      return regionStatusSeverity[normalizeRegionStatus(r.status)];
    case "latency":
      return finite(r.latencyMs) ? r.latencyMs : null;
    case "load":
      return finite(r.load) ? r.load : null;
    case "nodes":
      return finite(r.nodes) ? r.nodes : null;
  }
}

/**
 * Regions in sort order. Regions without a value for the key go last in either direction; ties keep the worse
 * status first, then the name. `status` sorts by severity, so `desc` lists down regions first.
 */
export function sortRegions<T extends StatusRegion>(regions: readonly T[], sort: RegionSort | null | undefined): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  const bySeverity = (a: T, b: T) => regionStatusSeverity[normalizeRegionStatus(b.status)] - regionStatusSeverity[normalizeRegionStatus(a.status)];
  if (!sort) return [...regions];
  const dir = sort.direction === "desc" ? -1 : 1;
  return [...regions].sort((a, b) => {
    const va = sortValue(a, sort.key);
    const vb = sortValue(b, sort.key);
    if (va !== vb) {
      if (va === null) return 1;
      if (vb === null) return -1;
      const c = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" });
      if (c !== 0) return c * dir;
    }
    return bySeverity(a, b) || byName(a, b);
  });
}

/* ------------------------------------------------------------------------------------------------
 * Map helpers
 * ----------------------------------------------------------------------------------------------*/

/** Marker diameter in px for a load percentage: 10 px idle up to 22 px at full load (12 px with no sample). */
export function regionMarkerSize(load: number | null | undefined): number {
  if (!finite(load)) return 12;
  const t = Math.min(100, Math.max(0, load)) / 100;
  return Math.round(10 + 12 * Math.sqrt(t));
}

export interface RegionLinkArcOptions {
  /** Links touching this region are drawn thicker. */
  selectedId?: string | null;
}

/** The arcs for `links`: endpoints resolved by region id (links to unknown regions are skipped), toned by health. */
export function regionLinkArcs(links: readonly RegionLink[], regions: readonly StatusRegion[], options: RegionLinkArcOptions = {}): GeoArc[] {
  const byId = new Map(regions.map((r) => [r.id, r]));
  const out: GeoArc[] = [];
  for (const link of links) {
    const a = byId.get(link.from);
    const b = byId.get(link.to);
    if (!a || !b || !toGeoPoint(a.point) || !toGeoPoint(b.point)) continue;
    const status = link.status ? normalizeRegionStatus(link.status) : worstRegionStatus([a.status, b.status]);
    const touches = options.selectedId != null && (link.from === options.selectedId || link.to === options.selectedId);
    out.push({
      id: link.id,
      from: a.point,
      to: b.point,
      tone: regionStatusTone[status],
      label: link.label ?? `${a.name} to ${b.name}${link.kind ? ` (${link.kind})` : ""}, ${regionStatusLabel[status].toLowerCase()}`,
      width: touches ? 2.5 : 1.5,
      animated: link.animated ?? status !== "down",
    });
  }
  return out;
}
