/*
 * @sutra/ui/tokens: design tokens, class helpers, the tone/status/accent/direction vocabulary, spring maths and the generic hooks.
 *
 * Only what the docs present to consumers is public here. The rest of src/lib and src/hooks (clamp, pad2, hashString, useLatestRef,
 * useIsoLayoutEffect, useMountedRef, errorMessage, the gesture/flip/morph/deck maths ...) is internal: import it by relative path
 * inside the package. The formatting and date helpers are public from the subpath-only @sutra/ui/format, never from here or the
 * root. To make one public, document it (README, a note, a skill) and list it here.
 * test/api-surface.test.ts guards this list (names in INTERNAL_NAMES must stay out of every entry).
 */

/* Design tokens as JS values */
export * from "../lib/tokens";

/* Class helpers and the shared vocabulary */
export { cn, focusRing, hitArea, hitAreaTouch, invalidRing, type Density, type Size } from "../lib/cn";
export { ACCENT_COLORS, accentClasses, type Accent, type AccentName } from "../lib/accent";
export { COLOR_TOKENS, normalizeTone, resolveColorToken, toneClass, toneClasses, type Tone, type ToneInput } from "../lib/tone";
export { normalizeTaskStatus, type TaskStatus, type TaskStatusInput } from "../lib/status";
export {
  directionOf,
  endArrowKey,
  inlineKeyStep,
  inlineScrollOffset,
  inlineSide,
  inlineSign,
  logicalArrow,
  normalizeDirection,
  physicalScrollX,
  scrollLeftForInlineOffset,
  startArrowKey,
  toLogicalDelta,
  toPhysicalDelta,
  type Direction,
} from "../lib/direction";

/* Small helpers the component notes and the skill point at */
export { isEmail, isHttpUrl, isSafeHref } from "../lib/validate";
export { colorForSeed } from "../lib/hash";
export { initials, type InitialsOptions } from "../lib/text";
export type { TimeInput } from "../lib/time";
export type { DateInput } from "../lib/date";

/* Types that public component and hook signatures name (their helpers stay internal) */
export type { CropRect, CropRotation, CropSize } from "../lib/crop";
export type { BurstShape } from "../lib/burst";
export type { MorphOrigin, MorphRect } from "../lib/morph";
export type { ProcessGroup, ProcessTreeItem } from "../lib/process-groups";
export type { UsagePace, UsagePaceDescription, UsagePaceStatus } from "../lib/usage-pace";

/* Spring maths, and the constants and types the gesture hooks take as option defaults */
export * from "../lib/spring";
export { COMMIT_DISTANCE, COMMIT_VELOCITY, INERTIA_FRICTION, type DragAxis, type DragSample, type Elastic, type SwipeSide } from "../lib/gesture";

/* Hooks (every one is in the generated hook reference) */
export * from "../hooks/use-controllable-state";
export * from "../hooks/use-copy";
export * from "../hooks/use-theme";
export * from "../hooks/use-now";
export * from "../hooks/use-media-query";
export * from "../hooks/use-resize-observer";
export { useAsyncAction, type AsyncAction, type UseAsyncActionOptions } from "../hooks/use-async-action";
export * from "../hooks/use-safe-id";
export * from "../hooks/use-active-indicator";
export * from "../hooks/use-scroll-edges";
export * from "../hooks/use-scrollable";
export * from "../hooks/use-rolling-series";
export * from "../hooks/use-marquee-selection";
export * from "../hooks/use-camera";
export * from "../hooks/use-merged-refs";
export * from "../hooks/use-object-url";
export * from "../hooks/use-debounced-value";
export * from "../hooks/use-previous";
export * from "../hooks/use-disclosure";
export * from "../hooks/use-scroll-sections";
export * from "../hooks/use-presence";
export * from "../hooks/use-added-keys";
export * from "../hooks/use-change-key";
export * from "../hooks/use-return-focus";
export * from "../hooks/use-spring-value";
export * from "../hooks/use-stagger";
export * from "../hooks/use-typewriter";
export * from "../hooks/use-drag";
export * from "../hooks/use-swipe-dismiss";
export * from "../hooks/use-pan";
export * from "../hooks/use-flip";
export * from "../hooks/use-view-transition";
export * from "../hooks/use-scroll-progress";
export * from "../hooks/use-pointer-vars";
export * from "../hooks/use-direction";
export * from "../hooks/use-rect-morph";
