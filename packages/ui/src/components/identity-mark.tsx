import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { chartColors } from "../lib/tokens";

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

/** FNV-1a 32-bit hash of a string. Stable across engines; for identity, not security. */
export function identityHash(seed: string): number {
  let h = 2166136261;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The lit tick positions (0 = twelve o'clock, clockwise) for a seed, ascending.
 * Always exactly `lit` of `of` (default 5 of 12) so a row of marks carries the same ink.
 */
export function identitySegments(seed: string, lit = 5, of = 12): number[] {
  let h = identityHash(seed);
  const pool = Array.from({ length: of }, (_, i) => i);
  const out: number[] = [];
  for (let i = 0; i < lit && pool.length > 0; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    out.push(pool.splice(h % pool.length, 1)[0]!);
  }
  return out.sort((a, b) => a - b);
}

/** Deterministic categorical color (from `chartColors`) for a seed. */
export function identityColor(seed: string): string {
  return chartColors[identityHash(`${seed}#color`) % chartColors.length]!;
}

/** First letter or digit of the handle part of a seed (`user:alice` → `A`). */
export function identityInitial(seed: string): string {
  const s = String(seed);
  const handle = s.includes(":") ? s.slice(s.indexOf(":") + 1) : s;
  const m = handle.match(/[\p{L}\p{N}]/u);
  return m ? m[0].toUpperCase() : "";
}

/* ------------------------------------------------------------------ */
/* IdentityMark                                                        */
/* ------------------------------------------------------------------ */

export type IdentityMarkKind = "person" | "machine" | "app";
export type IdentityMarkState = "live" | "busy" | "offline";
export type IdentityMarkSize = "xs" | "sm" | "md" | "lg" | "xl";

const markPx: Record<IdentityMarkSize, number> = { xs: 20, sm: 28, md: 36, lg: 48, xl: 64 };

const stateRing: Record<IdentityMarkState, string> = {
  live: "border-success",
  busy: "border-warning",
  offline: "border-muted-foreground/50 border-dashed",
};

const stateLabel: Record<IdentityMarkState, string> = { live: "live", busy: "busy", offline: "offline" };

export interface IdentityMarkProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  /** Identity string (person, machine or app id). The same seed always draws the same mark. */
  seed: string;
  /** Shape of the core: a circle with an initial (person), a square core (machine) or a squircle (app). */
  kind?: IdentityMarkKind;
  size?: IdentityMarkSize | number;
  /** Adds an outer ring: pulsing green for live, amber for busy, dashed grey for offline. */
  state?: IdentityMarkState | null;
  /** `hash` picks a color from the seed, `current` uses currentColor, or pass any CSS color. */
  color?: "hash" | "current" | (string & {});
  /** Overrides the initial shown for people. Pass `false` for a bare ring. */
  letter?: string | false;
  /** Accessible name. Defaults to the seed. */
  label?: string;
  /** Hide from assistive tech (when the name is already next to it). */
  decorative?: boolean;
}

/** Procedural identity glyph: a dial of twelve ticks, five lit by a hash of the seed. */
export const IdentityMark = React.forwardRef<HTMLSpanElement, IdentityMarkProps>(
  (
    {
      seed,
      kind = "person",
      size = "md",
      state,
      color = "hash",
      letter,
      label,
      decorative,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const px = typeof size === "number" ? size : markPx[size];
    const showTicks = px >= 24;
    const lit = React.useMemo(() => new Set(identitySegments(seed)), [seed]);
    const tint = color === "hash" ? identityColor(seed) : color === "current" ? "currentColor" : color;
    const initial = letter === false ? "" : (letter ?? identityInitial(seed));
    const name = `${label ?? seed}${state ? `, ${stateLabel[state]}` : ""}`;

    return (
      <span
        ref={ref}
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : name}
        aria-hidden={decorative || undefined}
        data-kind={kind}
        data-state={state ?? undefined}
        className={cn("relative inline-flex shrink-0 select-none items-center justify-center", className)}
        style={{ width: px, height: px, color: tint, ...style }}
        {...props}
      >
        {state ? (
          <>
            {state === "live" ? (
              <span
                aria-hidden
                data-slot="pulse"
                className="pointer-events-none absolute -inset-[3px] rounded-full border-2 border-success/60 motion-safe:animate-ping motion-reduce:hidden"
                style={{ animationDuration: "2s" }}
              />
            ) : null}
            <span
              aria-hidden
              data-slot="state-ring"
              className={cn("pointer-events-none absolute -inset-[3px] rounded-full border-2", stateRing[state])}
            />
          </>
        ) : null}
        <svg viewBox="0 0 48 48" width={px} height={px} aria-hidden focusable="false" className="overflow-visible">
          {showTicks
            ? Array.from({ length: 12 }, (_, i) => (
                <line
                  key={i}
                  x1="24"
                  y1="2"
                  x2="24"
                  y2="7.5"
                  stroke="currentColor"
                  strokeWidth={px >= 40 ? 2.4 : 3}
                  strokeLinecap="round"
                  strokeOpacity={lit.has(i) ? 1 : 0.18}
                  data-lit={lit.has(i) || undefined}
                  transform={`rotate(${i * 30} 24 24)`}
                />
              ))
            : null}
          {kind === "person" ? (
            <circle cx="24" cy="24" r={showTicks ? 13.5 : 20} fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="2" />
          ) : kind === "machine" ? (
            <>
              <rect x={showTicks ? 11 : 5} y={showTicks ? 11 : 5} width={showTicks ? 26 : 38} height={showTicks ? 26 : 38} rx={showTicks ? 7 : 10} fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="2" />
              <rect x="19" y="19" width="10" height="10" rx="2.5" fill="currentColor" />
            </>
          ) : (
            <>
              <rect x={showTicks ? 11 : 5} y={showTicks ? 11 : 5} width={showTicks ? 26 : 38} height={showTicks ? 26 : 38} rx={showTicks ? 9.5 : 13} fill="currentColor" />
              <path d="M18.5 27.5c2.2-4.6 8.8-2.4 11-7" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            </>
          )}
          {kind === "person" && initial ? (
            <text
              x="24"
              y="24"
              dy="0.35em"
              textAnchor="middle"
              fill="currentColor"
              fontSize={showTicks ? 14 : 20}
              fontWeight={600}
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {initial}
            </text>
          ) : null}
        </svg>
      </span>
    );
  }
);
IdentityMark.displayName = "IdentityMark";

/* ------------------------------------------------------------------ */
/* TextButton                                                          */
/* ------------------------------------------------------------------ */

export type TextButtonTone = "default" | "muted" | "danger";

const textButtonTone: Record<TextButtonTone, string> = {
  default: "text-foreground decoration-foreground/40",
  muted: "text-muted-foreground decoration-muted-foreground/50 hover:text-foreground",
  danger: "text-destructive decoration-destructive/50",
};

export interface TextButtonProps extends React.HTMLAttributes<HTMLElement> {
  /** Renders an `<a>` when set; otherwise a `<button type="button">`. */
  href?: string;
  target?: string;
  rel?: string;
  download?: string | boolean;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  tone?: TextButtonTone;
}

/** An action that reads as part of a sentence: inline text, underlined on hover. A link with `href`, a button otherwise. */
export const TextButton = React.forwardRef<HTMLElement, TextButtonProps>(
  ({ href, tone = "default", className, type, disabled, target, rel, download, ...props }, ref) => {
    const classes = cn(
      "inline cursor-pointer rounded-xs bg-transparent p-0 font-medium underline-offset-4 decoration-1",
      "hover:underline focus-visible:underline transition-colors",
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline",
      textButtonTone[tone],
      focusRing,
      className
    );
    if (href !== undefined) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          target={target}
          rel={rel ?? (target === "_blank" ? "noopener noreferrer" : undefined)}
          download={download}
          className={classes}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        />
      );
    }
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type ?? "button"}
        disabled={disabled}
        className={classes}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      />
    );
  }
);
TextButton.displayName = "TextButton";
