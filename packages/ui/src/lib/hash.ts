/* Deterministic hashing, seeded randomness and seed → colour. Not for security. */
import { chartColors } from "./tokens";

/** FNV-1a 32-bit hash of a string's UTF-16 code units, as an unsigned integer. */
export function hashString(s: string): number {
  const str = typeof s === "string" ? s : String(s ?? "");
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG: a function returning floats in [0, 1) from a 32-bit integer seed. */
export function mulberry32(seed: number): () => number {
  let a = Number.isFinite(seed) ? seed | 0 : 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic PRNG for any seed (the seed's string form is hashed, so `1` and `"1"` match). */
export function seededRandom(seed: string | number): () => number {
  return mulberry32(hashString(String(seed)));
}

/** Deterministic pick from `items` for a seed (`undefined` for an empty list). */
export function pickForSeed<T>(seed: string | number, items: readonly T[]): T | undefined {
  if (!items || items.length === 0) return undefined;
  return items[hashString(String(seed)) % items.length];
}

/** Deterministic categorical colour for a seed, shared by every component (avatars, presence, charts). */
export function colorForSeed(seed: string | number, palette: readonly string[] = chartColors): string {
  return pickForSeed(seed, palette) ?? chartColors[hashString(String(seed)) % chartColors.length]!;
}
