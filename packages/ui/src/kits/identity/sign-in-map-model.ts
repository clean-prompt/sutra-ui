/* Pure helpers behind SignInMap: impossible-travel detection, new-location flags and the summary counts. */
import { toMs, type TimeInput } from "../../lib/time";
import { geoDistanceKm, normalizeCountryCode, toGeoPoint, type GeoPointInput } from "../geo/geo-model";
import type { SessionDeviceType } from "./device-sessions";

/* ------------------------------------------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------------------------------------*/

/** How a sign-in attempt ended. `blocked` means a policy stopped it (risk rules, geo-blocking, rate limits). */
export type SignInOutcome = "success" | "failed" | "blocked";

/** One sign-in attempt with where it came from. */
export interface SignInEvent {
  id: string;
  point: GeoPointInput;
  city?: string;
  /** ISO 3166-1 alpha-2 code, any case. */
  country?: string;
  time: TimeInput;
  outcome: SignInOutcome;
  /** "Password", "Passkey", "Google SSO", … */
  method?: string;
  device?: SessionDeviceType;
  browser?: string;
  os?: string;
  ip?: string;
  /** The sign-in behind the session you are using right now. */
  current?: boolean;
  /** User or account the sign-in belongs to. Impossible travel and new locations are judged per account. */
  account?: string;
}

/** Two consecutive successful sign-ins of one account too far apart for the time between them. */
export interface ImpossibleTravel {
  /** `"<from id>-><to id>"`. */
  id: string;
  account?: string;
  from: SignInEvent;
  to: SignInEvent;
  distanceKm: number;
  /** Time between the two sign-ins in ms (0 when they share a timestamp). */
  elapsedMs: number;
  /** Implied speed; `Infinity` when the sign-ins share a timestamp. */
  speedKmh: number;
}

export interface DetectImpossibleTravelOptions {
  /** Fastest plausible travel in km/h; faster pairs are flagged. Default 900 (a passenger jet). */
  maxKmh?: number;
  /**
   * Pairs closer than this are never flagged, since IP geolocation is only city-accurate (a phone on mobile data can
   * appear a region away). Default 100.
   */
  minDistanceKm?: number;
}

/** Why an event is in the flagged list. */
export type SignInFlagKind = "impossible-travel" | "new-location";

export interface SignInFlag {
  kind: SignInFlagKind;
  /** The travel that lands on this event (for `impossible-travel`). */
  travel?: ImpossibleTravel;
}

export interface SignInSummary {
  total: number;
  success: number;
  failed: number;
  blocked: number;
  /** Distinct countries across all attempts. */
  countries: number;
  /** Events with at least one flag. */
  alerts: number;
}

export interface AnalyzeSignInsOptions extends DetectImpossibleTravelOptions {
  /**
   * Countries each account already signs in from (alpha-2). A first successful sign-in from any other country is a
   * new location. Omitted: the country of each account's earliest successful sign-in is its baseline.
   */
  knownCountries?: readonly string[];
}

export interface SignInAnalysis {
  /** Valid events (finite point and time), newest first. */
  events: SignInEvent[];
  travels: ImpossibleTravel[];
  /** Flags by event id; only flagged events have an entry. */
  flags: Map<string, SignInFlag[]>;
  /** Flagged events, newest first. */
  flagged: SignInEvent[];
  summary: SignInSummary;
}

/* ------------------------------------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------------------------------*/

interface Timed {
  event: SignInEvent;
  ms: number;
  index: number;
}

/** Valid events with their epoch ms, oldest first (input order breaks ties). */
function chronological(events: readonly SignInEvent[]): Timed[] {
  const out: Timed[] = [];
  events.forEach((event, index) => {
    if (!event || !toGeoPoint(event.point)) return;
    const ms = toMs(event.time);
    if (ms !== undefined && Number.isFinite(ms)) out.push({ event, ms, index });
  });
  return out.sort((a, b) => a.ms - b.ms || a.index - b.index);
}

const accountKey = (e: SignInEvent) => (e.account == null ? "" : String(e.account));

function byAccount(items: readonly Timed[]): Map<string, Timed[]> {
  const groups = new Map<string, Timed[]>();
  for (const item of items) {
    const key = accountKey(item.event);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

/** The event's alpha-2 country code, or `undefined` when it has none or an unknown one. */
export const signInCountry = (event: Pick<SignInEvent, "country">): string | undefined => normalizeCountryCode(event.country);

/* ------------------------------------------------------------------------------------------------
 * Detection
 * ----------------------------------------------------------------------------------------------*/

/**
 * Impossible travel: consecutive successful sign-ins of the same account (events without `account` count as one
 * account) whose distance over elapsed time beats `maxKmh`. Input may be unsorted; events with an invalid point or
 * time are skipped; pairs closer than `minDistanceKm` (and so two sign-ins from the same place) are never flagged.
 * Results are ordered by the later sign-in, oldest first.
 */
export function detectImpossibleTravel(events: readonly SignInEvent[], options: DetectImpossibleTravelOptions = {}): ImpossibleTravel[] {
  const maxKmh = Number.isFinite(options.maxKmh) && options.maxKmh! > 0 ? options.maxKmh! : 900;
  const minKm = Number.isFinite(options.minDistanceKm) && options.minDistanceKm! >= 0 ? options.minDistanceKm! : 100;
  const successes = chronological(events).filter((t) => t.event.outcome === "success");
  const out: { travel: ImpossibleTravel; ms: number; index: number }[] = [];
  for (const list of byAccount(successes).values()) {
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1]!;
      const b = list[i]!;
      const distanceKm = geoDistanceKm(a.event.point, b.event.point);
      if (!Number.isFinite(distanceKm) || distanceKm < minKm || distanceKm === 0) continue;
      const elapsedMs = b.ms - a.ms;
      const speedKmh = elapsedMs > 0 ? distanceKm / (elapsedMs / 3_600_000) : Infinity;
      if (speedKmh <= maxKmh) continue;
      out.push({
        travel: {
          id: `${a.event.id}->${b.event.id}`,
          account: b.event.account,
          from: a.event,
          to: b.event,
          distanceKm,
          elapsedMs,
          speedKmh,
        },
        ms: b.ms,
        index: b.index,
      });
    }
  }
  return out.sort((x, y) => x.ms - y.ms || x.index - y.index).map((x) => x.travel);
}

/**
 * Ids of each account's first successful sign-in from a country it hasn't signed in from before. The baseline is
 * `knownCountries` when given, else the country of the account's earliest successful sign-in. Events without a known
 * country are ignored.
 */
export function detectNewLocations(events: readonly SignInEvent[], options: { knownCountries?: readonly string[] } = {}): Set<string> {
  const known = options.knownCountries?.map(normalizeCountryCode).filter((c): c is string => !!c);
  const ids = new Set<string>();
  const successes = chronological(events).filter((t) => t.event.outcome === "success" && signInCountry(t.event));
  for (const list of byAccount(successes).values()) {
    const seen = new Set<string>(known ?? [signInCountry(list[0]!.event)!]);
    for (const { event } of list) {
      const code = signInCountry(event)!;
      if (seen.has(code)) continue;
      seen.add(code);
      ids.add(event.id);
    }
  }
  return ids;
}

/** Everything SignInMap shows: valid events newest first, impossible travel, flags per event and the summary counts. */
export function analyzeSignIns(events: readonly SignInEvent[], options: AnalyzeSignInsOptions = {}): SignInAnalysis {
  const sorted = chronological(events).reverse();
  const valid = sorted.map((t) => t.event);
  const travels = detectImpossibleTravel(events, options);
  const newLocations = detectNewLocations(events, options);

  const flags = new Map<string, SignInFlag[]>();
  const add = (id: string, flag: SignInFlag) => {
    const list = flags.get(id);
    if (list) list.push(flag);
    else flags.set(id, [flag]);
  };
  for (const travel of travels) add(travel.to.id, { kind: "impossible-travel", travel });
  for (const id of newLocations) add(id, { kind: "new-location" });

  const countries = new Set<string>();
  let success = 0;
  let failed = 0;
  let blocked = 0;
  for (const e of valid) {
    const code = signInCountry(e);
    if (code) countries.add(code);
    if (e.outcome === "success") success++;
    else if (e.outcome === "failed") failed++;
    else if (e.outcome === "blocked") blocked++;
  }
  const flagged = valid.filter((e) => flags.has(e.id));
  return {
    events: valid,
    travels,
    flags,
    flagged,
    summary: {
      total: valid.length,
      success,
      failed,
      blocked,
      countries: countries.size,
      alerts: flagged.length,
    },
  };
}
