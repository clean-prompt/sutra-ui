import * as React from "react";
import { cn } from "../lib/cn";
import { useIsoLayoutEffect } from "../hooks/use-iso-layout-effect";
import { useResizeObserver } from "../hooks/use-resize-observer";
import { assignRef } from "../lib/refs";

/* ------------------------------------------------------------------ */
/* FadeText                                                            */
/* ------------------------------------------------------------------ */

export interface FadeTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Clamp to this many lines (fades the last line). Default 1. */
  lines?: number;
  /** Width (single line) or height (multi-line) of the fade, CSS length. Default "2.5rem". */
  fade?: string;
  /** Native tooltip with the full text when truncated (string children only). Default true. */
  showTitle?: boolean;
}

/** Truncates text with a soft gradient fade instead of an ellipsis; the fade only appears when the text overflows. */
export const FadeText = React.forwardRef<HTMLSpanElement, FadeTextProps>(
  ({ lines = 1, fade = "2.5rem", showTitle = true, className, style, children, title, ...props }, forwardedRef) => {
    const ref = React.useRef<HTMLSpanElement | null>(null);
    const [overflowing, setOverflowing] = React.useState(false);
    const multi = lines > 1;
    const check = React.useCallback(() => {
      const el = ref.current;
      if (!el) return;
      setOverflowing(multi ? el.scrollHeight > el.clientHeight + 1 : el.scrollWidth > el.clientWidth + 1);
    }, [multi]);
    useIsoLayoutEffect(() => check(), [check, children]);
    useResizeObserver(ref, () => check());

    const mask = overflowing
      ? multi
        ? `linear-gradient(to bottom, #000 calc(100% - ${fade}), transparent)`
        : `linear-gradient(to right, #000 calc(100% - ${fade}), transparent)`
      : undefined;
    return (
      <span
        ref={(node) => {
          ref.current = node;
          assignRef(forwardedRef, node);
        }}
        data-overflowing={overflowing ? "" : undefined}
        title={title ?? (showTitle && overflowing && typeof children === "string" ? children : undefined)}
        className={cn("block min-w-0 overflow-hidden", multi ? "whitespace-normal" : "whitespace-nowrap", className)}
        style={{
          maskImage: mask,
          WebkitMaskImage: mask,
          maxHeight: multi ? `calc(${lines} * 1lh)` : undefined,
          ...style,
        }}
        {...props}
      >
        {children}
      </span>
    );
  }
);
FadeText.displayName = "FadeText";
