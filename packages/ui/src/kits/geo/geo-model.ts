/* Pure geo helpers behind WorldMap (and the globe): bundled outlines, country codes, projections, arcs, clustering and the choropleth scale. */
import {
  geoDistance,
  geoEqualEarth,
  geoEquirectangular,
  geoGraticule,
  geoGraticule10,
  geoInterpolate,
  geoMercator,
  geoNaturalEarth1,
  geoOrthographic,
  geoPath,
  type GeoPermissibleObjects,
  type GeoProjection,
  type GeoStream,
} from "d3-geo";
import { feature, mesh } from "topojson-client";
import { countries as flagCountries } from "../../assets/country-flags";
import { rampColor, resolveColorToken } from "../../lib/tone";
import { worldTopology110m, type WorldCountryProperties } from "./world-data";

/* ------------------------------------------------------------------------------------------------
 * Bundled outlines
 * ----------------------------------------------------------------------------------------------*/

/** A country outline from the bundled topology. `id` is its ISO alpha-2 code when it has one. */
export type WorldCountryFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, WorldCountryProperties>;

/** All country outlines. */
export type WorldCountryCollection = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, WorldCountryProperties>;

let countriesCache: WorldCountryCollection | undefined;
let landCache: GeoJSON.FeatureCollection | undefined;
let bordersCache: GeoJSON.MultiLineString | undefined;

/** Country outlines (Natural Earth 1:110m, 177 countries) as a GeoJSON FeatureCollection. Memoised. */
export function worldCountries(): WorldCountryCollection {
  countriesCache ??= feature(worldTopology110m, worldTopology110m.objects.countries) as WorldCountryCollection;
  return countriesCache;
}

/** The land mass (all countries merged) as a GeoJSON FeatureCollection. Memoised. */
export function worldLand(): GeoJSON.FeatureCollection {
  landCache ??= feature(worldTopology110m, worldTopology110m.objects.land) as GeoJSON.FeatureCollection;
  return landCache;
}

/** Internal borders shared by two countries, as one MultiLineString, so each border is drawn once. Memoised. */
export function worldBorders(): GeoJSON.MultiLineString {
  bordersCache ??= mesh(worldTopology110m, worldTopology110m.objects.countries, (a, b) => a !== b);
  return bordersCache;
}

/** Whether a country feature is Antarctica (dropped when a map hides it). */
export function isAntarctica(country: WorldCountryFeature): boolean {
  return country.id === "AQ";
}

/* ------------------------------------------------------------------------------------------------
 * Country codes and names
 * ----------------------------------------------------------------------------------------------*/

/** Every ISO 3166-1 alpha-2 code (plus the user-assigned XK for Kosovo), concatenated. */
const ISO_ALPHA2 =
  "ADAEAFAGAIALAMAOAQARASATAUAWAXAZBABBBDBEBFBGBHBIBJBLBMBNBOBQBRBSBTBVBWBYBZCACCCDCFCGCHCICKCLCMCNCOCRCUCVCWCXCYCZDEDJDKDMDODZ" +
  "ECEEEGEHERESETFIFJFKFMFOFRGAGBGDGEGFGGGHGIGLGMGNGPGQGRGSGTGUGWGYHKHMHNHRHTHUIDIEILIMINIOIQIRISITJEJMJOJPKEKGKHKIKMKNKPKRKWKY" +
  "KZLALBLCLILKLRLSLTLULVLYMAMCMDMEMFMGMHMKMLMMMNMOMPMQMRMSMTMUMVMWMXMYMZNANCNENFNGNINLNONPNRNUNZOMPAPEPFPGPHPKPLPMPNPRPSPTPWPY" +
  "QARERORSRURWSASBSCSDSESGSHSISJSKSLSMSNSOSRSSSTSVSXSYSZTCTDTFTGTHTJTKTLTMTNTOTRTTTVTWTZUAUGUMUSUYUZVAVCVEVGVIVNVUWFWSXKYEYTZAZMZW";

let codeSet: Set<string> | undefined;
const knownCodes = () => (codeSet ??= new Set(ISO_ALPHA2.match(/../g)));

/** Common non-ISO spellings of alpha-2 codes. */
const CODE_ALIASES: Record<string, string> = { UK: "GB", EL: "GR" };

/**
 * An ISO 3166-1 alpha-2 code in any case as its upper-case form (`"uk"` → `"GB"`, `" de "` → `"DE"`).
 * Returns `undefined` for anything that is not a known code.
 */
export function normalizeCountryCode(code: string | null | undefined): string | undefined {
  if (typeof code !== "string") return undefined;
  const upper = code.trim().toUpperCase();
  const resolved = Object.hasOwn(CODE_ALIASES, upper) ? CODE_ALIASES[upper]! : upper;
  return knownCodes().has(resolved) ? resolved : undefined;
}

/** Full names for the topology's abbreviated ones ("Dem. Rep. Congo" → "DR Congo"). */
const NAME_FIXES: Record<string, string> = {
  BA: "Bosnia and Herzegovina",
  CD: "DR Congo",
  CF: "Central African Republic",
  CG: "Republic of the Congo",
  DO: "Dominican Republic",
  EH: "Western Sahara",
  FK: "Falkland Islands",
  GQ: "Equatorial Guinea",
  MK: "North Macedonia",
  SB: "Solomon Islands",
  SS: "South Sudan",
  SZ: "Eswatini",
  TF: "French Southern Territories",
};

let namesCache: Map<string, string> | undefined;
function englishNames() {
  if (namesCache) return namesCache;
  namesCache = new Map();
  for (const f of worldCountries().features) if (typeof f.id === "string") namesCache.set(f.id, f.properties.name);
  for (const [code, name] of Object.entries(NAME_FIXES)) namesCache.set(code, name);
  for (const c of flagCountries) namesCache.set(c.code, c.name);
  return namesCache;
}

const displayNames = new Map<string, Intl.DisplayNames | null>();
function regionName(code: string, locale: string | undefined): string | undefined {
  const key = locale ?? "en";
  if (!displayNames.has(key)) {
    let dn: Intl.DisplayNames | null = null;
    try {
      dn = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(key, { type: "region" }) : null;
    } catch {
      dn = null;
    }
    displayNames.set(key, dn);
  }
  try {
    const name = displayNames.get(key)?.of(code);
    return name && name !== code ? name : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Display name for a country code. English (the default) uses the flag list's names, then the map's outline names,
 * then `Intl.DisplayNames`; another `locale` asks `Intl.DisplayNames` first. Unknown codes come back as given.
 */
export function countryName(code: string, locale?: string): string {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return code;
  const english = !locale || /^en\b/i.test(locale);
  if (!english) {
    const local = regionName(normalized, locale);
    if (local) return local;
  }
  return englishNames().get(normalized) ?? regionName(normalized, locale) ?? normalized;
}

/* ------------------------------------------------------------------------------------------------
 * Points
 * ----------------------------------------------------------------------------------------------*/

/** A location in degrees. */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/** A location as `{ lat, lng }` or a GeoJSON-style `[lng, lat]` tuple. */
export type GeoPointInput = GeoPoint | readonly [lng: number, lat: number];

/** Normalise a point to `{ lat, lng }`; `undefined` when it is missing or not finite. */
export function toGeoPoint(point: GeoPointInput | null | undefined): GeoPoint | undefined {
  if (!point) return undefined;
  const [lng, lat] = Array.isArray(point) ? point : [(point as GeoPoint).lng, (point as GeoPoint).lat];
  return Number.isFinite(lng) && Number.isFinite(lat) ? { lat: Math.max(-90, Math.min(90, lat)), lng } : undefined;
}

/** A point as `[lng, lat]`, the order d3-geo and GeoJSON use. */
export const toLngLat = (p: GeoPoint): [number, number] => [p.lng, p.lat];

/** Readable coordinates: `"37.57° N, 126.98° E"`. Returns `"—"` for an invalid point. */
export function formatGeoPoint(point: GeoPointInput | null | undefined, digits = 2): string {
  const p = toGeoPoint(point);
  if (!p) return "—";
  const lng = wrapLongitude(p.lng);
  const part = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(digits)}° ${v < 0 ? neg : pos}`;
  return `${part(p.lat, "N", "S")}, ${part(lng, "E", "W")}`;
}

/** Great-circle distance between two points in kilometres (mean Earth radius). */
export function geoDistanceKm(a: GeoPointInput, b: GeoPointInput): number {
  const pa = toGeoPoint(a);
  const pb = toGeoPoint(b);
  return pa && pb ? geoDistance(toLngLat(pa), toLngLat(pb)) * 6371.0088 : NaN;
}

/* ------------------------------------------------------------------------------------------------
 * Projections
 * ----------------------------------------------------------------------------------------------*/

/**
 * World projections. The flat ones: Equal Earth keeps areas true, which suits choropleths. `orthographic` is a globe
 * seen from space: only the hemisphere facing the viewer is drawn, and `project` returns `null` for the far side.
 */
export type GeoProjectionKind = "equalEarth" | "naturalEarth" | "mercator" | "equirectangular" | "orthographic";

export interface GeoProjectionOptions {
  /** Width of the drawing in px. */
  width: number;
  /** Height in px. Omitted: derived from the projection's aspect at this width. */
  height?: number;
  /** Space kept free around the map, in px. Default 0. */
  padding?: number;
  /** Fit to the land without Antarctica (and clip what falls outside the box). Default false. */
  hideAntarctica?: boolean;
  /**
   * Rotation `[λ, φ, γ]` in degrees applied before fitting (e.g. `[-150, 0]` centres the Pacific). On a globe it picks
   * the side that faces the viewer: `rotationToCenter(point)` puts a point in the middle.
   */
  rotate?: GeoRotationInput;
  /** Scale multiplier applied after fitting (1 = fitted). The view stays centred and what grows past the box is clipped. */
  zoom?: number;
}

/** A fitted projection with screen helpers. Build one with `createProjection`. */
export interface GeoMapProjection {
  kind: GeoProjectionKind;
  width: number;
  height: number;
  /** Screen position of a point, or `null` when the projection can't show it (clipped, or on a globe's far side). */
  project(point: GeoPointInput): [number, number] | null;
  /** Geographic point under a screen position, or `null` outside the projection. */
  invert(x: number, y: number): GeoPoint | null;
  /** SVG path data for any GeoJSON object (antimeridian crossings are split). Empty string when nothing is visible. */
  path(object: GeoPermissibleObjects): string;
  /** The underlying d3-geo projection, for advanced drawing. */
  d3: GeoProjection;
}

const MERCATOR_MAX_LAT = 85;

const FACTORIES: Record<GeoProjectionKind, () => GeoProjection> = {
  equalEarth: geoEqualEarth,
  naturalEarth: geoNaturalEarth1,
  mercator: geoMercator,
  equirectangular: geoEquirectangular,
  orthographic: geoOrthographic,
};

let landWithoutAntarctica: GeoJSON.FeatureCollection | undefined;
function fitTarget(kind: GeoProjectionKind, hideAntarctica: boolean): GeoPermissibleObjects {
  if (kind === "orthographic") return { type: "Sphere" };
  if (hideAntarctica) {
    landWithoutAntarctica ??= { type: "FeatureCollection", features: worldCountries().features.filter((f) => !isAntarctica(f)) };
    return landWithoutAntarctica;
  }
  if (kind === "mercator") {
    return geoGraticule()
      .extentMajor([
        [-180, -MERCATOR_MAX_LAT],
        [180, MERCATOR_MAX_LAT],
      ])
      .outline();
  }
  return { type: "Sphere" };
}

/**
 * A d3-geo projection fitted inside `width × height` (minus `padding`): to the whole sphere, or to the land
 * without Antarctica when `hideAntarctica` is set (ignored by `orthographic`, which always fits the globe).
 * Mercator is cut at ±85°. Everything outside the box is clipped, so `project` returns `null` for points that
 * would fall off the map (or sit on a globe's far side).
 *
 * The returned helpers read the d3 projection live, so code that animates a globe may change `d3.rotate()` and
 * `d3.scale()` between frames instead of building a new projection.
 */
export function createProjection(kind: GeoProjectionKind = "equalEarth", options: GeoProjectionOptions): GeoMapProjection {
  const { padding = 0, hideAntarctica = false } = options;
  const rotate = options.rotate ? normalizeRotationInput(options.rotate) : undefined;
  const zoom = Number.isFinite(options.zoom) && options.zoom! > 0 ? options.zoom! : 1;
  const width = Math.max(1, Number.isFinite(options.width) ? options.width : 1);
  const factory = Object.hasOwn(FACTORIES, kind) ? FACTORIES[kind] : FACTORIES.equalEarth;
  const projection = factory();
  if (rotate) projection.rotate(rotate);
  const target = fitTarget(kind, hideAntarctica);
  const inner = Math.max(1, width - padding * 2);

  let height = options.height;
  if (height === undefined || !Number.isFinite(height) || height <= 0) {
    projection.fitWidth(inner, target);
    const [[, y0], [, y1]] = geoPath(projection).bounds(target);
    height = Math.ceil(y1 - y0) + padding * 2;
    projection.fitExtent(
      [
        [padding, padding],
        [padding + inner, height - padding],
      ],
      target
    );
  } else {
    projection.fitExtent(
      [
        [padding, padding],
        [Math.max(padding + 1, width - padding), Math.max(padding + 1, height - padding)],
      ],
      target
    );
  }
  if (zoom !== 1) projection.scale(projection.scale() * zoom);
  projection.clipExtent([
    [0, 0],
    [width, height],
  ]);

  const pathGen = geoPath(projection);
  let hit: [number, number] | null = null;
  const sink: GeoStream = {
    point(x, y) {
      hit = [x, y];
    },
    lineStart() {},
    lineEnd() {},
    polygonStart() {},
    polygonEnd() {},
    sphere() {},
  };

  return {
    kind: Object.hasOwn(FACTORIES, kind) ? kind : "equalEarth",
    width,
    height,
    project(point) {
      const p = toGeoPoint(point);
      if (!p) return null;
      hit = null;
      // d3 caches the stream until the projection changes, so this stays cheap and follows rotate/scale updates.
      projection.stream(sink).point(p.lng, p.lat);
      const out = hit as [number, number] | null;
      return out && Number.isFinite(out[0]) && Number.isFinite(out[1]) ? out : null;
    },
    invert(x, y) {
      const out = projection.invert?.([x, y]);
      return out && Number.isFinite(out[0]) && Number.isFinite(out[1]) ? { lng: out[0], lat: out[1] } : null;
    },
    path: (object) => pathGen(object) ?? "",
    d3: projection,
  };
}

/* ------------------------------------------------------------------------------------------------
 * Globe rotation
 * ----------------------------------------------------------------------------------------------*/

/** A d3 rotation `[λ, φ, γ]` in degrees: yaw (spin about the poles), pitch (tilt) and roll. */
export type GeoRotation = [lambda: number, phi: number, gamma: number];

/** A rotation as `[λ, φ]` or `[λ, φ, γ]`. */
export type GeoRotationInput = readonly [number, number] | readonly [number, number, number];

/** A longitude (or any angle) wrapped into `[-180, 180)`. */
export function wrapLongitude(degrees: number): number {
  return Number.isFinite(degrees) ? ((((degrees + 180) % 360) + 360) % 360) - 180 : 0;
}

function normalizeRotationInput(rotation: GeoRotationInput): GeoRotation {
  const [l, p, g = 0] = rotation;
  return [Number.isFinite(l) ? l : 0, Number.isFinite(p) ? p : 0, Number.isFinite(g) ? g : 0];
}

/**
 * A rotation with finite parts, λ and γ wrapped into `[-180, 180)` and φ clamped to `±maxPitch` (default 90), so a
 * globe never turns upside down. Missing or invalid parts become 0.
 */
export function normalizeGeoRotation(rotation: GeoRotationInput | null | undefined, maxPitch = 90): GeoRotation {
  if (!rotation) return [0, 0, 0];
  const [l, p, g] = normalizeRotationInput(rotation);
  const limit = Math.max(0, Math.min(90, Number.isFinite(maxPitch) ? maxPitch : 90));
  return [wrapLongitude(l), Math.max(-limit, Math.min(limit, p)), wrapLongitude(g)];
}

/** The rotation that puts `point` in the middle of an orthographic globe (`[-lng, -lat, γ]`); `undefined` for an invalid point. */
export function rotationToCenter(point: GeoPointInput | null | undefined, gamma = 0): GeoRotation | undefined {
  const p = toGeoPoint(point);
  return p ? [wrapLongitude(-p.lng), 0 - p.lat, Number.isFinite(gamma) ? gamma : 0] : undefined;
}

/** The point in the middle of an orthographic globe under `rotation` (the inverse of `rotationToCenter`). */
export function rotationCenter(rotation: GeoRotationInput): GeoPoint {
  const [l, p] = normalizeRotationInput(rotation);
  return { lng: wrapLongitude(-l), lat: Math.max(-90, Math.min(90, 0 - p)) };
}

/**
 * Interpolates between two rotations for a fly-to, taking the short way round for λ and γ (from 170° to -170° turns
 * 20°, not 340°). The result starts exactly at `from` (λ may leave `[-180, 180)` on the way; d3 doesn't mind).
 */
export function interpolateRotation(from: GeoRotationInput, to: GeoRotationInput): (t: number) => GeoRotation {
  const a = normalizeRotationInput(from);
  const b = normalizeRotationInput(to);
  const dl = wrapLongitude(b[0] - a[0]);
  const dp = b[1] - a[1];
  const dg = wrapLongitude(b[2] - a[2]);
  return (t) => {
    const k = Number.isFinite(t) ? t : 1;
    return [a[0] + dl * k, a[1] + dp * k, a[2] + dg * k];
  };
}

/** Angle between two points seen from the Earth's centre, in degrees (0–180); `NaN` for an invalid point. */
export function geoAngularDistance(a: GeoPointInput, b: GeoPointInput): number {
  const pa = toGeoPoint(a);
  const pb = toGeoPoint(b);
  return pa && pb ? (geoDistance(toLngLat(pa), toLngLat(pb)) * 180) / Math.PI : NaN;
}

/** Standard 10° graticule lines. */
export function worldGraticule(): GeoJSON.MultiLineString {
  return geoGraticule10();
}

/* ------------------------------------------------------------------------------------------------
 * Arcs
 * ----------------------------------------------------------------------------------------------*/

/**
 * The great circle between two points as a GeoJSON LineString (via `geoInterpolate`). Draw it with
 * `projection.path`, which splits it where it crosses the antimeridian. `steps` defaults to one per ~2°, 2–96.
 */
export function greatCircleArc(from: GeoPointInput, to: GeoPointInput, steps?: number): GeoJSON.LineString {
  const a = toGeoPoint(from);
  const b = toGeoPoint(to);
  if (!a || !b) return { type: "LineString", coordinates: [] };
  const interpolate = geoInterpolate(toLngLat(a), toLngLat(b));
  const degrees = (geoDistance(toLngLat(a), toLngLat(b)) * 180) / Math.PI;
  const n = Math.max(2, Math.min(96, Math.round(steps ?? degrees / 2)));
  const coordinates: [number, number][] = [];
  for (let i = 0; i <= n; i++) coordinates.push(interpolate(i / n));
  return { type: "LineString", coordinates };
}

/* ------------------------------------------------------------------------------------------------
 * Clustering
 * ----------------------------------------------------------------------------------------------*/

export interface GeoCluster<T> {
  /** Stable id: `cluster:` plus the id (or index) of the member that seeded it. */
  id: string;
  members: T[];
  /** Mean screen position of the members. */
  x: number;
  y: number;
  count: number;
}

/**
 * Greedy screen-space clustering. Items are taken in input order; each one not yet claimed seeds a cluster and
 * claims every later item within `radiusPx` of it. Deterministic for the same input. Items the projection can't
 * show (`project` returns `null`) are skipped. Single items come back as clusters of one.
 */
export function clusterPoints<T>(
  items: readonly T[],
  project: (item: T) => readonly [number, number] | null | undefined,
  radiusPx: number,
  idOf: (item: T, index: number) => string = (item, index) => {
    const id = (item as { id?: unknown })?.id;
    return typeof id === "string" || typeof id === "number" ? String(id) : String(index);
  }
): GeoCluster<T>[] {
  const r2 = Math.max(0, radiusPx) ** 2;
  const placed: { item: T; index: number; x: number; y: number }[] = [];
  items.forEach((item, index) => {
    const xy = project(item);
    if (xy && Number.isFinite(xy[0]) && Number.isFinite(xy[1])) placed.push({ item, index, x: xy[0], y: xy[1] });
  });
  const claimed = new Uint8Array(placed.length);
  const out: GeoCluster<T>[] = [];
  for (let i = 0; i < placed.length; i++) {
    if (claimed[i]) continue;
    const seed = placed[i]!;
    claimed[i] = 1;
    const members = [seed];
    for (let j = i + 1; j < placed.length; j++) {
      if (claimed[j]) continue;
      const p = placed[j]!;
      if ((p.x - seed.x) ** 2 + (p.y - seed.y) ** 2 <= r2) {
        claimed[j] = 1;
        members.push(p);
      }
    }
    out.push({
      id: `cluster:${idOf(seed.item, seed.index)}`,
      members: members.map((m) => m.item),
      x: members.reduce((s, m) => s + m.x, 0) / members.length,
      y: members.reduce((s, m) => s + m.y, 0) / members.length,
      count: members.length,
    });
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------
 * Choropleth scale
 * ----------------------------------------------------------------------------------------------*/

/** `quantize`: equal-width value ranges. `quantile`: about the same number of countries per bucket. */
export type GeoScaleKind = "quantize" | "quantile";

export interface GeoColorScaleOptions {
  scale?: GeoScaleKind;
  /** Number of buckets. Default 5. */
  steps?: number;
  /** Colour token (`primary`, `success`, …) or any CSS colour. Default `primary`. */
  color?: string;
  /** Fill the buckets mix toward (and countries without data use). Default `var(--muted)`. */
  emptyColor?: string;
  /** Value range for `quantize`. Defaults to the data's min and max. */
  domain?: [number, number];
}

export interface GeoColorScale {
  kind: GeoScaleKind;
  min: number;
  max: number;
  /** Lower bounds of buckets 1…n-1 (bucket 0 starts at `min`). A value equal to a threshold falls in the upper bucket. */
  thresholds: number[];
  /** One colour per bucket, lightest first. */
  colors: string[];
  /** Bucket index for a value, or -1 for a missing value. */
  bucket(value: number | null | undefined): number;
  /** Bucket colour for a value, or `undefined` for a missing value. */
  color(value: number | null | undefined): string | undefined;
}

function quantileOf(sorted: readonly number[], p: number) {
  if (sorted.length === 0) return NaN;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (i - lo);
}

/** A stepped colour scale for choropleth values (non-finite values are ignored). */
export function geoColorScale(values: readonly number[], options: GeoColorScaleOptions = {}): GeoColorScale {
  const kind: GeoScaleKind = options.scale === "quantile" ? "quantile" : "quantize";
  const steps = Math.max(1, Math.min(12, Math.round(Number.isFinite(options.steps) ? options.steps! : 5)));
  const base = resolveColorToken(options.color ?? "primary");
  const empty = options.emptyColor ?? "var(--muted)";
  const finite = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const dataMin = finite[0] ?? 0;
  const dataMax = finite[finite.length - 1] ?? 0;
  const [min, max] =
    kind === "quantize" && options.domain && options.domain.every(Number.isFinite)
      ? [Math.min(...options.domain), Math.max(...options.domain)]
      : [dataMin, dataMax];

  const thresholds: number[] = [];
  for (let i = 1; i < steps; i++) {
    thresholds.push(kind === "quantile" ? quantileOf(finite, i / steps) : min + ((max - min) * i) / steps);
  }
  const colors = Array.from({ length: steps }, (_, i) => rampColor(base, i, steps, empty));

  const bucket = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) return -1;
    if (max <= min && kind === "quantize") return steps - 1;
    let b = 0;
    while (b < thresholds.length && value >= thresholds[b]!) b++;
    return b;
  };
  return {
    kind,
    min,
    max,
    thresholds,
    colors,
    bucket,
    color: (value) => {
      const b = bucket(value);
      return b < 0 ? undefined : colors[b];
    },
  };
}
