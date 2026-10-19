import * as React from "react";
import { cn } from "../lib/cn";
import { graphemes } from "../lib/text";
import { usePrefersReducedMotion } from "../hooks/use-media-query";

export interface SplitTextProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** The text. Screen readers get it whole. */
  text: string;
  /** Reveal by character or by word. Default "char". */
  by?: "char" | "word";
  /** The entrance of each piece. Default "fade-up". */
  effect?: "fade-up" | "fade-in" | "pop-in";
  /** Milliseconds between pieces. Default 24 for characters, 70 for words. The whole reveal is capped at about 1.2 s. */
  step?: number;
  /** The element to render. Default `span`. */
  as?: "span" | "p" | "div" | "h1" | "h2" | "h3" | "h4";
  /** Set false to show the text as it is, with no reveal (changing it replays the reveal when true). Default true. */
  animate?: boolean;
}

const EFFECTS = { "fade-up": "animate-fade-up", "fade-in": "animate-fade-in", "pop-in": "animate-pop-in" } as const;
/** The longest a reveal may take, so a paragraph does not type itself out for ten seconds. */
const MAX_TOTAL_MS = 1200;

/**
 * Text that reveals itself character by character or word by word (`animate-fade-up` plus the `stagger` delay on `--i`).
 * Accessible by construction: the real text sits once in a visually hidden span, and the pieces are `aria-hidden`, so a
 * screen reader never hears letters, and copying and find-in-page still see words (a word stays unbroken at line ends).
 * Under `prefers-reduced-motion`, or with `animate={false}`, it renders the plain text.
 */
export const SplitText = React.forwardRef<HTMLElement, SplitTextProps>(
  ({ text, by = "char", effect = "fade-up", step, as = "span", animate = true, className, style, ...props }, ref) => {
    const reduced = usePrefersReducedMotion();
    const Root = as as React.ElementType;
    if (reduced || !animate) {
      return (
        <Root ref={ref} data-slot="split-text" className={className} style={style} {...props}>
          {text}
        </Root>
      );
    }
    const words = text.split(/\s+/).filter(Boolean);
    const count = by === "word" ? words.length : words.reduce((n, w) => n + graphemes(w).length, 0);
    const per = Math.min(step ?? (by === "word" ? 70 : 24), MAX_TOTAL_MS / Math.max(count - 1, 1));
    const cls = cn("inline-block", EFFECTS[effect], "stagger");
    let i = 0;
    return (
      <Root
        ref={ref}
        data-slot="split-text"
        className={className}
        style={{ ...style, "--sutra-stagger": `${per}ms`, "--sutra-stagger-max": count } as React.CSSProperties}
        {...props}
      >
        <span className="sr-only">{text}</span>
        <span aria-hidden="true" key={`${by}:${text}`}>
          {words.map((word, w) => (
            <React.Fragment key={w}>
              {w > 0 ? " " : null}
              {by === "word" ? (
                <span data-slot="split-text-piece" className={cls} style={{ "--i": i++ } as React.CSSProperties}>
                  {word}
                </span>
              ) : (
                <span className="inline-block whitespace-nowrap">
                  {graphemes(word).map((ch, c) => (
                    <span key={c} data-slot="split-text-piece" className={cls} style={{ "--i": i++ } as React.CSSProperties}>
                      {ch}
                    </span>
                  ))}
                </span>
              )}
            </React.Fragment>
          ))}
        </span>
      </Root>
    );
  }
);
SplitText.displayName = "SplitText";
