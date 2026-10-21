/** `window.matchMedia` stubs for tests. setup.ts installs a stub that matches nothing; call `resetMedia()` in `afterEach` when a test file changes it. */
const base = window.matchMedia;

/** Makes the queries for which `matches` returns true match; the others answer as the default stub does. */
export function mockMedia(matches: (query: string) => boolean) {
  window.matchMedia = ((query: string) => ({ ...base(query), matches: matches(query) })) as typeof window.matchMedia;
}

/** The system asks for reduced motion (or stops asking). */
export const reduceMotion = (on: boolean) => mockMedia((query) => on && query.includes("reduce"));

/** Puts the default stub back. */
export function resetMedia() {
  window.matchMedia = base;
}
