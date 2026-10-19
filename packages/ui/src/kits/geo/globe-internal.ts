/* The globe's animation engine (private): view state, drag/momentum/zoom/fly-to/auto-rotate in one rAF loop, and
 * imperative drawing of registered SVG paths so React never re-renders the country paths per frame. */
import { geoCentroid, geoDistance, type GeoPermissibleObjects } from "d3-geo";
import { clamp } from "../../lib/math";
import {
  interpolateRotation,
  normalizeGeoRotation,
  rotationCenter,
  type GeoMapProjection,
  type GeoRotation,
} from "./geo-model";

export interface GlobeView {
  rotation: GeoRotation;
  zoom: number;
}

/** Why auto-rotation is held back. Any active hold pauses it; releasing the last one resumes it after the idle delay. */
export type GlobeHold = "pointer" | "wheel" | "hover" | "focus" | "selected" | "hidden" | "offscreen";

export interface GlobeEngineConfig {
  minZoom: number;
  maxZoom: number;
  /** Largest tilt in degrees; keeps the poles from flipping past the viewer. */
  maxPitch: number;
  /** Degrees per second; 0 disables auto-rotation. */
  autoRotateSpeed: number;
  /** Ms of quiet after an interaction before auto-rotation resumes. */
  idleDelay: number;
  reducedMotion: boolean;
  /** Called once an interaction or animation comes to rest. */
  onSettle?: (view: GlobeView) => void;
  /** Called with the new playing state when auto-rotation is started or stopped from inside the globe. */
  onPlayingChange?: (playing: boolean) => void;
}

const DEFAULT_CONFIG: GlobeEngineConfig = {
  minZoom: 1,
  maxZoom: 6,
  maxPitch: 85,
  autoRotateSpeed: 0,
  idleDelay: 2500,
  reducedMotion: false,
};

/** Momentum decays with this time constant (ms), like a flick on a touch screen. */
const MOMENTUM_TAU = 325;
/** Below this speed (deg/ms) momentum stops. */
const MOMENTUM_MIN = 0.004;
/** Drag samples older than this (ms) don't count towards the release velocity. */
const VELOCITY_WINDOW = 100;
export const FLY_DURATION = 800;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const raf = (cb: FrameRequestCallback) => (typeof requestAnimationFrame === "function" ? requestAnimationFrame(cb) : (setTimeout(() => cb(now()), 16) as unknown as number));
const caf = (id: number) => (typeof cancelAnimationFrame === "function" ? cancelAnimationFrame(id) : clearTimeout(id));
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/* ------------------------------------------------------------------------------------------------
 * Culling
 * ----------------------------------------------------------------------------------------------*/

interface Cap {
  center: [number, number];
  /** Angular radius in radians. */
  radius: number;
}

const caps = new WeakMap<object, Cap | null>();

function eachCoordinate(geo: GeoJSON.Geometry | GeoJSON.Feature | GeoJSON.FeatureCollection, fn: (c: GeoJSON.Position) => void): void {
  switch (geo.type) {
    case "FeatureCollection":
      geo.features.forEach((f) => eachCoordinate(f, fn));
      return;
    case "Feature":
      if (geo.geometry) eachCoordinate(geo.geometry, fn);
      return;
    case "GeometryCollection":
      geo.geometries.forEach((g) => eachCoordinate(g, fn));
      return;
    case "Point":
      fn(geo.coordinates);
      return;
    case "MultiPoint":
    case "LineString":
      geo.coordinates.forEach(fn);
      return;
    case "MultiLineString":
    case "Polygon":
      geo.coordinates.forEach((ring) => ring.forEach(fn));
      return;
    case "MultiPolygon":
      geo.coordinates.forEach((poly) => poly.forEach((ring) => ring.forEach(fn)));
      return;
  }
}

/** A spherical cap around an object's vertices (null for the sphere or anything spanning more than a hemisphere). */
function boundingCap(geo: GeoPermissibleObjects): Cap | null {
  const key = geo as object;
  if (caps.has(key)) return caps.get(key)!;
  let cap: Cap | null = null;
  if ((geo as { type?: string }).type !== "Sphere") {
    const center = geoCentroid(geo);
    let radius = 0;
    if (Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      eachCoordinate(geo as GeoJSON.Geometry, (c) => {
        radius = Math.max(radius, geoDistance(center, c as [number, number]));
      });
      cap = radius < Math.PI / 2 ? { center, radius } : null;
    }
  }
  caps.set(key, cap);
  return cap;
}

/* ------------------------------------------------------------------------------------------------
 * Engine
 * ----------------------------------------------------------------------------------------------*/

interface Flight {
  from: GlobeView;
  to: GlobeView;
  start: number;
  duration: number;
  rotate: (t: number) => GeoRotation;
}

interface Sample {
  t: number;
  l: number;
  p: number;
}

interface PathEntry {
  geo: GeoPermissibleObjects;
  d: string | null;
}

/**
 * Holds the globe's view outside React. Every change re-applies the projection at once (so React renders see the
 * current view) and schedules one frame that writes the registered paths and circles and notifies subscribers
 * (the marker layer). Momentum, fly-to and auto-rotation share the same loop, which stops when nothing moves.
 */
export class GlobeEngine {
  view: GlobeView;
  config: GlobeEngineConfig = DEFAULT_CONFIG;
  playing = false;
  /** Bumped on every drawn frame; the marker layer subscribes to it. */
  version = 0;

  private proj: GeoMapProjection | null = null;
  private baseScale = 1;
  private paths = new Map<SVGPathElement, PathEntry>();
  private circles = new Map<SVGCircleElement, number>();
  private listeners = new Set<() => void>();
  private holds = new Set<GlobeHold>();
  private frame = 0;
  private inTick = false;
  private dirty = true;
  private lastTick: number | null = null;
  private idleUntil = 0;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private flight: Flight | null = null;
  private momentum: { vl: number; vp: number } | null = null;
  private samples: Sample[] = [];
  private mounted = false;

  constructor(view: GlobeView) {
    this.view = { rotation: normalizeGeoRotation(view.rotation, 90), zoom: view.zoom };
  }

  /* ---- lifecycle ---- */

  mount() {
    this.mounted = true;
    this.lastTick = null;
    this.dirty = true;
    this.schedule();
  }

  unmount() {
    this.mounted = false;
    caf(this.frame);
    this.frame = 0;
    clearTimeout(this.idleTimer);
    this.flight = null;
    this.momentum = null;
  }

  configure(config: Partial<GlobeEngineConfig>) {
    this.config = { ...this.config, ...config };
  }

  setProjection(proj: GeoMapProjection) {
    if (proj === this.proj) return;
    // Fitted at zoom 1; the engine scales it from here.
    this.proj = proj;
    this.baseScale = proj.d3.scale();
    this.apply();
    this.invalidate();
  }

  /* ---- subscriptions (useSyncExternalStore) ---- */

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  getVersion = () => this.version;

  /* ---- drawing ---- */

  /** SVG path data for an object under the current view ("" when it is entirely on the far side). */
  pathOf(geo: GeoPermissibleObjects): string {
    if (!this.proj) return "";
    const cap = boundingCap(geo);
    if (cap) {
      const c = rotationCenter(this.view.rotation);
      if (geoDistance(cap.center, [c.lng, c.lat]) - cap.radius > Math.PI / 2 + 0.02) return "";
    }
    return this.proj.path(geo);
  }

  /** Current radius of the globe in px. */
  radius() {
    return this.baseScale * this.view.zoom;
  }

  /** Ref callback factory: the path's `d` follows the view until the element unmounts. */
  registerPath(el: SVGPathElement | null, geo: GeoPermissibleObjects) {
    if (!el) return undefined;
    this.paths.set(el, { geo, d: el.getAttribute("d") });
    return () => {
      if (this.paths.get(el)?.geo === geo) this.paths.delete(el);
    };
  }

  /** Ref callback factory: the circle's `r` follows the globe radius times `factor`. */
  registerCircle(el: SVGCircleElement | null, factor: number) {
    if (!el) return undefined;
    this.circles.set(el, factor);
    return () => {
      this.circles.delete(el);
    };
  }

  project = (point: Parameters<GeoMapProjection["project"]>[0]) => this.proj?.project(point) ?? null;

  invert(x: number, y: number) {
    return this.proj?.invert(x, y) ?? null;
  }

  private apply() {
    if (!this.proj) return;
    this.proj.d3.rotate(this.view.rotation).scale(this.baseScale * this.view.zoom);
  }

  private draw() {
    if (!this.proj) return;
    for (const [el, entry] of this.paths) {
      const d = this.pathOf(entry.geo);
      if (d !== entry.d) {
        entry.d = d;
        el.setAttribute("d", d);
      }
    }
    const r = this.radius();
    for (const [el, factor] of this.circles) el.setAttribute("r", String(Math.round(r * factor * 10) / 10));
    this.version++;
    for (const cb of this.listeners) cb();
  }

  /* ---- view changes ---- */

  private set(view: Partial<GlobeView>) {
    const rotation = view.rotation ? this.clampRotation(view.rotation) : this.view.rotation;
    const zoom = view.zoom !== undefined ? this.clampZoom(view.zoom) : this.view.zoom;
    const [l, p, g] = this.view.rotation;
    if (rotation[0] === l && rotation[1] === p && rotation[2] === g && zoom === this.view.zoom) return false;
    this.view = { rotation, zoom };
    this.apply();
    this.invalidate();
    return true;
  }

  private clampRotation(r: GeoRotation): GeoRotation {
    const max = this.config.maxPitch;
    return [Number.isFinite(r[0]) ? r[0] : 0, clamp(Number.isFinite(r[1]) ? r[1] : 0, -max, max), Number.isFinite(r[2]) ? r[2] : 0];
  }

  clampZoom(z: number) {
    return clamp(Number.isFinite(z) ? z : 1, this.config.minZoom, this.config.maxZoom);
  }

  /** Jump to a view, cancelling animations. */
  setView(view: Partial<GlobeView>, settle = true) {
    this.stopMotion();
    const changed = this.set(view);
    if (settle && changed) this.settle();
    this.touch();
  }

  rotateBy(dl: number, dp: number) {
    const [l, p, g] = this.view.rotation;
    this.setView({ rotation: [l + dl, p + dp, g] });
  }

  zoomBy(factor: number, settle = true) {
    this.setView({ zoom: this.view.zoom * factor }, settle);
  }

  /** Animate to a view (instant under reduced motion). An interaction interrupts it. */
  flyTo(to: Partial<GlobeView>, duration = FLY_DURATION) {
    const target: GlobeView = {
      rotation: to.rotation ? this.clampRotation(to.rotation) : this.view.rotation,
      zoom: to.zoom !== undefined ? this.clampZoom(to.zoom) : this.view.zoom,
    };
    if (this.config.reducedMotion || duration <= 0 || !this.mounted) {
      this.setView(target);
      return;
    }
    this.momentum = null;
    this.flight = { from: this.view, to: target, start: now(), duration, rotate: interpolateRotation(this.view.rotation, target.rotation) };
    this.touch();
    this.schedule();
  }

  get animating() {
    return !!this.flight || !!this.momentum;
  }

  stopMotion() {
    this.flight = null;
    this.momentum = null;
  }

  /** Report the resting view and wrap λ back into [-180, 180). */
  settle() {
    const [l, p, g] = this.view.rotation;
    if (l < -180 || l >= 180 || g < -180 || g >= 180) {
      this.view = { ...this.view, rotation: normalizeGeoRotation([l, p, g], 90) };
      this.apply();
    }
    this.config.onSettle?.(this.view);
  }

  /* ---- drag ---- */

  beginDrag() {
    const interrupted = this.animating;
    this.stopMotion();
    if (interrupted) this.settle();
    this.samples = [];
    this.hold("pointer");
  }

  /** Rotate by a pointer movement in px: one px moves the point under the pointer by about one px at the centre. */
  dragBy(dx: number, dy: number) {
    const k = 180 / Math.PI / Math.max(1, this.radius());
    const [l, p, g] = this.view.rotation;
    this.set({ rotation: [l + dx * k, p - dy * k, g] });
    const t = now();
    this.samples.push({ t, l: this.view.rotation[0], p: this.view.rotation[1] });
    while (this.samples.length > 2 && t - this.samples[0]!.t > VELOCITY_WINDOW) this.samples.shift();
  }

  endDrag(moved: boolean) {
    this.release("pointer");
    if (!moved) return;
    const s = this.samples;
    const first = s[0];
    const last = s[s.length - 1];
    const dt = first && last ? last.t - first.t : 0;
    const age = last ? now() - last.t : Infinity;
    if (!this.config.reducedMotion && first && last && dt > 0 && age < 60) {
      const vl = (last.l - first.l) / dt;
      const vp = (last.p - first.p) / dt;
      if (Math.hypot(vl, vp) > MOMENTUM_MIN * 2) {
        this.momentum = { vl, vp };
        this.schedule();
        return;
      }
    }
    this.settle();
  }

  /* ---- auto-rotate ---- */

  setPlaying(playing: boolean) {
    if (this.playing === playing) return;
    this.playing = playing;
    if (playing) this.idleUntil = 0;
    else this.settle();
    this.schedule();
  }

  hold(reason: GlobeHold) {
    const wasRotating = this.autoRotating(now());
    this.holds.add(reason);
    if (wasRotating) this.settle();
  }

  release(reason: GlobeHold) {
    if (!this.holds.delete(reason)) return;
    this.touch();
  }

  /** Restart the idle delay (after any interaction). */
  touch() {
    this.idleUntil = now() + this.config.idleDelay;
    this.wakeAfterIdle();
  }

  /** Wake the loop once the idle delay has passed (if auto-rotation is waiting for it). */
  private wakeAfterIdle() {
    clearTimeout(this.idleTimer);
    if (this.playing && this.mounted) {
      this.idleTimer = setTimeout(() => this.schedule(), Math.max(0, this.idleUntil - now()) + 16);
    }
  }

  private autoRotating(t: number) {
    return (
      this.playing && this.config.autoRotateSpeed !== 0 && this.holds.size === 0 && t >= this.idleUntil && !this.flight && !this.momentum
    );
  }

  /* ---- loop ---- */

  /** Redraw on the next frame (after a registration or projection change). */
  invalidate() {
    this.dirty = true;
    this.schedule();
  }

  private schedule() {
    if (this.frame || this.inTick || !this.mounted) return;
    this.frame = raf(this.tick);
  }

  private tick = (t: number) => {
    this.frame = 0;
    if (!this.mounted) return;
    this.inTick = true;
    const dt = this.lastTick === null ? 0 : Math.min(64, Math.max(0, t - this.lastTick));
    this.lastTick = t;
    let active = false;
    if (this.flight) {
      const f = this.flight;
      const k = clamp((now() - f.start) / f.duration, 0, 1);
      const e = easeInOutCubic(k);
      this.set({ rotation: f.rotate(e), zoom: f.from.zoom + (f.to.zoom - f.from.zoom) * e });
      if (k >= 1) {
        this.flight = null;
        this.settle();
        this.touch();
      } else active = true;
    } else if (this.momentum) {
      const m = this.momentum;
      const [l, p, g] = this.view.rotation;
      this.set({ rotation: [l + m.vl * dt, p + m.vp * dt, g] });
      const decay = Math.exp(-dt / MOMENTUM_TAU);
      m.vl *= decay;
      m.vp *= decay;
      if (Math.hypot(m.vl, m.vp) < MOMENTUM_MIN) {
        this.momentum = null;
        this.settle();
        this.touch();
      } else active = true;
    } else if (this.autoRotating(now())) {
      const [l, p, g] = this.view.rotation;
      this.set({ rotation: [l + (this.config.autoRotateSpeed * dt) / 1000, p, g] });
      active = true;
    }
    if (this.dirty) {
      this.dirty = false;
      this.draw();
    }
    this.inTick = false;
    if (active) this.schedule();
    else {
      this.lastTick = null;
      // Woken before the idle delay ran out (timers can fire early): check again later.
      if (this.playing && this.holds.size === 0 && now() < this.idleUntil) this.wakeAfterIdle();
    }
  };
}
