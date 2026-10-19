import {
  clusterPoints,
  countryName,
  createProjection,
  formatGeoPoint,
  geoColorScale,
  geoDistanceKm,
  greatCircleArc,
  normalizeCountryCode,
  toGeoPoint,
  worldBorders,
  worldCountries,
  worldLand,
  type GeoProjectionKind,
} from "../src/kits/geo/geo-model";

const KINDS: GeoProjectionKind[] = ["equalEarth", "naturalEarth", "mercator", "equirectangular"];
const moveCount = (d: string) => (d.match(/M/g) ?? []).length;

describe("geo-model: bundled outlines", () => {
  it("decodes countries, land and borders once", () => {
    const countries = worldCountries();
    expect(countries.features).toHaveLength(177);
    expect(worldCountries()).toBe(countries);
    expect(countries.features.find((f) => f.id === "FR")?.properties.name).toBe("France");
    expect(worldLand().features.length).toBeGreaterThan(0);
    const borders = worldBorders();
    expect(borders.type).toBe("MultiLineString");
    expect(worldBorders()).toBe(borders);
  });
});

describe("geo-model: country codes", () => {
  it("normalises alpha-2 codes in any case and rejects unknown ones", () => {
    expect(normalizeCountryCode("uk")).toBe("GB");
    expect(normalizeCountryCode(" de ")).toBe("DE");
    expect(normalizeCountryCode("xk")).toBe("XK");
    expect(normalizeCountryCode("sg")).toBe("SG");
    expect(normalizeCountryCode("ZZ")).toBeUndefined();
    expect(normalizeCountryCode("USA")).toBeUndefined();
    expect(normalizeCountryCode("")).toBeUndefined();
    expect(normalizeCountryCode(undefined)).toBeUndefined();
    expect(normalizeCountryCode(42 as unknown as string)).toBeUndefined();
  });

  it("names countries from the flag list, the outlines, then Intl", () => {
    expect(countryName("us")).toBe("United States");
    expect(countryName("TR")).toBe("Türkiye");
    expect(countryName("CD")).toBe("DR Congo");
    expect(countryName("FR")).toBe("France");
    expect(countryName("MT")).toBe("Malta");
    expect(countryName("ZZ")).toBe("ZZ");
    expect(countryName("DE", "de")).toBe("Deutschland");
  });
});

describe("geo-model: points", () => {
  it("accepts objects and [lng, lat] tuples", () => {
    expect(toGeoPoint({ lat: 37.5, lng: 127 })).toEqual({ lat: 37.5, lng: 127 });
    expect(toGeoPoint([127, 37.5])).toEqual({ lat: 37.5, lng: 127 });
    expect(toGeoPoint([NaN, 1])).toBeUndefined();
    expect(toGeoPoint(null)).toBeUndefined();
    expect(formatGeoPoint({ lat: 37.5665, lng: 126.978 })).toBe("37.57° N, 126.98° E");
    expect(formatGeoPoint([-74.006, 40.7128])).toBe("40.71° N, 74.01° W");
    expect(formatGeoPoint(undefined)).toBe("—");
    expect(Math.round(geoDistanceKm([-0.1276, 51.5072], [2.3522, 48.8566]))).toBeGreaterThan(330);
  });
});

describe("geo-model: projections", () => {
  it.each(KINDS)("%s fits the land inside the box", (kind) => {
    const proj = createProjection(kind, { width: 800, height: 420, padding: 10 });
    expect(proj.width).toBe(800);
    expect(proj.height).toBe(420);
    const [[x0, y0], [x1, y1]] = boundsOf(proj.path(worldLand()));
    expect(x0).toBeGreaterThanOrEqual(-0.5);
    expect(y0).toBeGreaterThanOrEqual(-0.5);
    expect(x1).toBeLessThanOrEqual(800.5);
    expect(y1).toBeLessThanOrEqual(420.5);
    const seoul = proj.project({ lat: 37.57, lng: 126.98 });
    expect(seoul).not.toBeNull();
    const back = proj.invert(seoul![0], seoul![1]);
    expect(back!.lat).toBeCloseTo(37.57, 1);
    expect(back!.lng).toBeCloseTo(126.98, 1);
  });

  it("derives the height from the projection's aspect", () => {
    const equalEarth = createProjection("equalEarth", { width: 1000 });
    expect(equalEarth.height).toBeGreaterThan(450);
    expect(equalEarth.height).toBeLessThan(520);
    const mercator = createProjection("mercator", { width: 1000 });
    expect(mercator.height).toBeGreaterThan(900);
    const hidden = createProjection("equalEarth", { width: 1000, hideAntarctica: true });
    expect(hidden.height).toBeLessThan(equalEarth.height);
  });

  it("hides Antarctica by fitting to the other land and clipping", () => {
    const pole = { lat: -80, lng: 0 };
    expect(createProjection("equalEarth", { width: 800 }).project(pole)).not.toBeNull();
    expect(createProjection("equalEarth", { width: 800, hideAntarctica: true }).project(pole)).toBeNull();
    expect(createProjection("equalEarth", { width: 800, hideAntarctica: true }).project({ lat: -54, lng: -68 })).not.toBeNull();
  });

  it("cuts Mercator at ±85°", () => {
    const proj = createProjection("mercator", { width: 600 });
    expect(proj.project({ lat: 80, lng: 10 })).not.toBeNull();
    expect(proj.project({ lat: 88, lng: 10 })).toBeNull();
    expect(proj.project({ lat: -88, lng: 10 })).toBeNull();
  });

  it("returns null for invalid points and falls back on unknown kinds", () => {
    const proj = createProjection("bogus" as GeoProjectionKind, { width: 400 });
    expect(proj.kind).toBe("equalEarth");
    expect(proj.project([NaN, 0])).toBeNull();
  });
});

describe("geo-model: arcs", () => {
  it("interpolates the great circle between the endpoints", () => {
    const arc = greatCircleArc({ lat: 51.5, lng: -0.13 }, { lat: 40.71, lng: -74 });
    const first = arc.coordinates[0]!;
    const last = arc.coordinates[arc.coordinates.length - 1]!;
    expect(first[0]).toBeCloseTo(-0.13);
    expect(last[1]).toBeCloseTo(40.71);
    // The great circle London → New York bows north of both cities.
    expect(Math.max(...arc.coordinates.map((c) => c[1]))).toBeGreaterThan(51.5);
    expect(greatCircleArc([NaN, 0], [0, 0]).coordinates).toEqual([]);
  });

  it("splits arcs that cross the antimeridian", () => {
    const proj = createProjection("equalEarth", { width: 800 });
    const tokyoToSf = proj.path(greatCircleArc({ lat: 35.68, lng: 139.69 }, { lat: 37.77, lng: -122.42 }));
    const londonToNy = proj.path(greatCircleArc({ lat: 51.5, lng: -0.13 }, { lat: 40.71, lng: -74 }));
    expect(moveCount(tokyoToSf)).toBe(2);
    expect(moveCount(londonToNy)).toBe(1);
  });
});

describe("geo-model: clustering", () => {
  const items = [
    { id: "a", x: 0, y: 0 },
    { id: "b", x: 10, y: 0 },
    { id: "hidden", x: NaN, y: 0 },
    { id: "c", x: 100, y: 100 },
    { id: "d", x: 5, y: 8 },
    { id: "far", x: 0, y: 0, hidden: true },
  ];
  const project = (i: (typeof items)[number]) => ("hidden" in i || Number.isNaN(i.x) ? null : ([i.x, i.y] as const));

  it("groups greedily in input order and skips points the projection can't show", () => {
    const clusters = clusterPoints(items, project, 20);
    expect(clusters.map((c) => [c.id, c.members.map((m) => m.id)])).toEqual([
      ["cluster:a", ["a", "b", "d"]],
      ["cluster:c", ["c"]],
    ]);
    expect(clusters[0]!.count).toBe(3);
    expect(clusters[0]!.x).toBeCloseTo(5);
    expect(clusters[0]!.y).toBeCloseTo(8 / 3);
  });

  it("is deterministic and keeps everything apart at radius 0", () => {
    expect(clusterPoints(items, project, 20)).toEqual(clusterPoints(items, project, 20));
    expect(clusterPoints(items, project, 0)).toHaveLength(4);
  });
});

describe("geo-model: colour scale", () => {
  it("buckets quantize values with inclusive lower bounds", () => {
    const s = geoColorScale([0, 100, 50], { steps: 5 });
    expect(s.thresholds).toEqual([20, 40, 60, 80]);
    expect(s.bucket(0)).toBe(0);
    expect(s.bucket(19.99)).toBe(0);
    expect(s.bucket(20)).toBe(1);
    expect(s.bucket(80)).toBe(4);
    expect(s.bucket(100)).toBe(4);
    expect(s.bucket(undefined)).toBe(-1);
    expect(s.color(null)).toBeUndefined();
    expect(s.colors).toHaveLength(5);
    expect(s.colors[0]).toBe("color-mix(in oklab, var(--primary) 30%, var(--muted))");
    expect(s.colors[4]).toBe("var(--primary)");
  });

  it("uses quantiles, custom colours, domains and empty fills", () => {
    const q = geoColorScale([1, 2, 3, 4, 100], { scale: "quantile", steps: 2, color: "#ff0000", emptyColor: "white" });
    expect(q.thresholds).toEqual([3]);
    expect(q.bucket(2.9)).toBe(0);
    expect(q.bucket(3)).toBe(1);
    expect(q.colors[0]).toBe("color-mix(in oklab, #ff0000 30%, white)");
    const d = geoColorScale([5], { domain: [0, 10], steps: 2, color: "success" });
    expect(d.min).toBe(0);
    expect(d.bucket(5)).toBe(1);
    expect(d.colors[1]).toBe("var(--success)");
    expect(geoColorScale([7, 7]).bucket(7)).toBe(4);
    expect(geoColorScale([1, NaN, 3]).max).toBe(3);
  });
});

/** Bounding box of an SVG path's absolute coordinates. */
function boundsOf(d: string): [[number, number], [number, number]] {
  const nums = (d.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map(Number);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    x0 = Math.min(x0, nums[i]!);
    x1 = Math.max(x1, nums[i]!);
    y0 = Math.min(y0, nums[i + 1]!);
    y1 = Math.max(y1, nums[i + 1]!);
  }
  return [[x0, y0], [x1, y1]];
}
