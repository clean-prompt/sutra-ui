import * as React from "react";
import { cn } from "../lib/cn";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { useSafeId } from "../hooks/use-safe-id";
import { prefersReducedMotion } from "../hooks/use-media-query";
import { inkArt, inkEmojiNames, normalizeEmoji, solidInkArt } from "./emoji-ink-internal";
import { renderSolid } from "./emoji-ink-solid-internal";
import { accessibleName } from "./svg-a11y-internal";

/** The emoji that have a hand-drawn ink version (`InkEmoji`), the eight reaction presets first. */
export const inkEmojiSet: readonly string[] = Object.keys(inkEmojiNames);

export { inkEmojiNames };

/** How the ink is laid down: filled with cut-out features (the default), filled plus a tint for the secondary parts, or the monoline outline. */
export type InkEmojiVariant = "solid" | "tint" | "outline";
/** When the drawing moves: never, once on hover or focus of the nearest interactive parent, or on a loop. */
export type InkEmojiAnimate = false | "hover" | "loop";

const has = (map: object, emoji: string) => Object.prototype.hasOwnProperty.call(map, normalizeEmoji(emoji));

/** True when `emoji` has hand-drawn ink art in `variant` (any variant when unset); a trailing variation selector does not matter. */
export function hasInkEmoji(emoji: string, variant?: InkEmojiVariant): boolean {
  if (variant === "solid" || variant === "tint") return has(solidInkArt, emoji);
  return has(inkArt, emoji);
}

/** Interactive ancestors whose hover or focus plays an `animate="hover"` drawing. */
const INTERACTIVE = 'button, a[href], summary, label, [role="button"], [role="option"], [role="menuitem"], [role="tab"], [tabindex]';

/** Plays the drawing's motion once from the start (a reflow between removing and setting the attribute restarts the keyframes). */
export function playInkEmoji(svg: SVGSVGElement | null): void {
  if (!svg || svg.getAttribute("data-play") === "loop" || prefersReducedMotion()) return;
  svg.removeAttribute("data-play");
  void svg.getBoundingClientRect();
  svg.setAttribute("data-play", "once");
}

const nameOf = (emoji: string) => inkEmojiNames[emoji] ?? inkEmojiNames[`${normalizeEmoji(emoji)}️`] ?? inkEmojiNames[normalizeEmoji(emoji)];

/* ------------------------------------------------------------------ */
/* Filter for glyphs without art                                       */
/* ------------------------------------------------------------------ */

const FILTER_ID = "sutra-emoji-ink";
const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(name: string, attrs: Record<string, string>, ...children: Element[]): Element {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  for (const child of children) node.appendChild(child);
  return node;
}

/**
 * Defines the SVG filter that turns a colour glyph into one ink (darkness becomes ink opacity, light colours let the
 * paper through) once per document. CSS references it as `url(#sutra-emoji-ink)`; Safari only resolves a filter that
 * lives in the same document, so it cannot be a data URI in the stylesheet.
 */
function ensureInkFilter() {
  if (typeof document === "undefined" || !document.body || document.getElementById(FILTER_ID)) return;
  const filter = svgEl(
    "filter",
    { id: FILTER_ID, "color-interpolation-filters": "sRGB", x: "-5%", y: "-5%", width: "110%", height: "110%" },
    svgEl("feColorMatrix", {
      type: "matrix",
      values: "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.2126 -0.7152 -0.0722 0 1",
      result: "dark",
    }),
    svgEl("feComponentTransfer", { in: "dark", result: "ink" }, svgEl("feFuncA", { type: "linear", slope: "2.6", intercept: "-0.3" })),
    svgEl("feComposite", { in: "ink", in2: "SourceGraphic", operator: "in" })
  );
  const root = svgEl("svg", { "aria-hidden": "true", focusable: "false", width: "0", height: "0", "data-slot": "emoji-ink-filter" }, svgEl("defs", {}, filter));
  document.body.appendChild(root);
}

/* ------------------------------------------------------------------ */
/* InkEmoji                                                            */
/* ------------------------------------------------------------------ */

export interface InkEmojiProps extends Omit<React.SVGAttributes<SVGSVGElement>, "title" | "children"> {
  /** The emoji character to draw, e.g. "👍". A trailing variation selector does not matter. */
  emoji: string;
  /**
   * Edge length: a number is pixels, a string is any CSS length. The drawing scales with it and is still readable at 16.
   * @default "1em"
   */
  size?: number | string;
  /** Names the drawing for assistive technology (`true` uses its built-in name, or the glyph itself when it has none); without it the svg is decorative and `aria-hidden`. */
  title?: string | boolean;
  /** Draws the colour glyph as ink (the filtered glyph the paper style uses) for an emoji that has no drawing, instead of rendering nothing. */
  fallback?: boolean;
  /**
   * How the ink is laid down: `solid` fills the shapes and cuts the features out as holes, `tint` adds a light tint of the ink for
   * the secondary parts (tears, blush, cuffs, the core of a flame), `outline` is the monoline drawing.
   * @default "solid"
   */
  variant?: InkEmojiVariant;
  /**
   * Moves the named parts of a solid or tint drawing (eyes blink, the heart beats, hands clap): `hover` plays once when the nearest
   * interactive parent (a button, link or option) is hovered or focused, `loop` repeats. Reduced motion shows the still drawing.
   * @default false
   */
  animate?: InkEmojiAnimate;
  /** Plays the motion once whenever it changes to a truthy value (also on mount), e.g. a counter bumped when a reaction is added. */
  playKey?: number | string;
}

/** An original hand-drawn monoline version of an emoji of the built-in set, drawn in `currentColor`; renders nothing for an emoji without art unless `fallback` is set. */
export const InkEmoji = React.forwardRef<SVGSVGElement, InkEmojiProps>(
  ({ emoji, size = "1em", title, fallback = false, variant = "solid", animate = false, playKey, className, style, ...props }, ref) => {
    const key = normalizeEmoji(emoji);
    const geo = variant === "outline" ? undefined : solidInkArt[key];
    const art = has(inkArt, emoji) ? inkArt[key] : undefined;
    const id = useSafeId("sutra-emoji");
    const own = React.useRef<SVGSVGElement>(null);
    const refs = useMergedRefs(ref, own);
    const moving = Boolean(geo) && animate !== false;
    React.useEffect(() => {
      if (!art && fallback) ensureInkFilter();
    }, [art, fallback]);
    /* hover: the nearest interactive parent (or the parent element) plays the drawing once on pointer enter and focus */
    React.useEffect(() => {
      const svg = own.current;
      if (!moving || animate !== "hover" || !svg) return;
      const host = (svg.parentElement?.closest(INTERACTIVE) as HTMLElement | null) ?? svg.parentElement;
      if (!host) return;
      const play = () => playInkEmoji(svg);
      host.addEventListener("pointerenter", play);
      host.addEventListener("focusin", play);
      return () => {
        host.removeEventListener("pointerenter", play);
        host.removeEventListener("focusin", play);
      };
    }, [moving, animate]);
    /* playKey: once per truthy value (a remount with a new value plays too) */
    React.useEffect(() => {
      if (geo && playKey) playInkEmoji(own.current);
    }, [geo, playKey]);
    if (!art) {
      if (!fallback) return null;
      /* no drawing, so no built-in name: `title` true names it by the glyph, which assistive technology reads as the emoji's name */
      const glyphName = accessibleName(title, nameOf(emoji) ?? emoji);
      return (
        <span
          data-slot="emoji"
          data-ink="true"
          className={cn("inline-block leading-none", className)}
          style={{ fontSize: typeof size === "number" ? `${size}px` : size }}
          aria-hidden={glyphName ? undefined : true}
          aria-label={glyphName}
          role={glyphName ? "img" : undefined}
        >
          <span data-part="glyph">{emoji}</span>
        </span>
      );
    }
    const label = accessibleName(title, nameOf(emoji));
    const length = typeof size === "number" ? `${size}px` : size;
    if (geo) {
      return (
        <svg
          ref={refs}
          data-slot="ink-emoji"
          data-emoji={emoji}
          data-variant={variant}
          data-animate={moving ? animate : undefined}
          data-play={moving && animate === "loop" ? "loop" : undefined}
          viewBox="0 0 24 24"
          fill="none"
          role={label ? "img" : undefined}
          aria-hidden={label ? undefined : true}
          focusable="false"
          className={cn("inline-block shrink-0", className)}
          style={{ width: length, height: length, ...style }}
          {...props}
        >
          {label ? <title>{label}</title> : null}
          {renderSolid(geo, id, variant === "tint")}
        </svg>
      );
    }
    return (
      <svg
        ref={refs}
        data-slot="ink-emoji"
        data-emoji={emoji}
        data-variant="outline"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        role={label ? "img" : undefined}
        aria-hidden={label ? undefined : true}
        focusable="false"
        className={cn("inline-block shrink-0", className)}
        style={{ width: length, height: length, ...style }}
        {...props}
      >
        {label ? <title>{label}</title> : null}
        {art}
      </svg>
    );
  }
);
InkEmoji.displayName = "InkEmoji";

/* ------------------------------------------------------------------ */
/* EmojiGlyph                                                          */
/* ------------------------------------------------------------------ */

export interface EmojiGlyphProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The emoji character. It stays in the DOM as text, so copy and paste and search still work. */
  emoji: string;
  /**
   * `true` draws it as ink in every style, `false` keeps the colour glyph in the paper style; unset follows the style (ink in the paper style, colour otherwise).
   * An emoji with hand-drawn art (`hasInkEmoji`) shows the drawing, any other is filtered to one ink.
   */
  ink?: boolean;
  /**
   * Which ink drawing shows when the ink does: `solid` (filled, features cut out), `tint` (solid plus a tint for secondary parts) or `outline`.
   * @default "solid"
   */
  inkVariant?: InkEmojiVariant;
  /**
   * Plays the drawing's motion once when the nearest interactive parent (the chip, the picker cell) is hovered or focused.
   * Reduced motion keeps it still; `outline` never moves.
   * @default true
   */
  inkMotion?: boolean;
  /** Plays the drawing's motion once whenever it changes to a truthy value (also on mount), e.g. when a reaction is added. */
  inkPlayKey?: number | string;
}

/** An emoji as text that reads as ink on paper in the paper style: the hand-drawn art when there is one, otherwise the glyph filtered to one ink. */
export const EmojiGlyph = React.forwardRef<HTMLSpanElement, EmojiGlyphProps>(
  ({ emoji, ink, inkVariant = "solid", inkMotion = true, inkPlayKey, className, ...props }, ref) => {
  const art = hasInkEmoji(emoji);
  React.useEffect(() => {
    if (ink !== false) ensureInkFilter();
  }, [ink]);
  return (
    <span
      ref={ref}
      data-slot="emoji"
      data-ink={ink === undefined ? undefined : String(ink)}
      data-art={art ? "true" : undefined}
      className={cn("inline-block leading-none", className)}
      {...props}
    >
      <span data-part="glyph">{emoji}</span>
      {art ? <InkEmoji emoji={emoji} size="1em" data-part="ink" variant={inkVariant} animate={inkMotion ? "hover" : false} playKey={inkPlayKey} /> : null}
    </span>
  );
  }
);
EmojiGlyph.displayName = "EmojiGlyph";
