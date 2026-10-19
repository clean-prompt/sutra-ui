import * as React from "react";
import { cn } from "../lib/cn";
import { usePrefersReducedMotion } from "../hooks/use-media-query";
import { useLatestRef } from "../hooks/use-iso-layout-effect";

/* ------------------------------------------------------------------ */
/* DecodeText                                                          */
/* ------------------------------------------------------------------ */

export interface DecodeTextProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Final text. Also the accessible name. */
  text: string;
  /** When to play: on mount, on hover/focus, or only when `play` changes. Default "mount". */
  trigger?: "mount" | "hover" | "manual";
  /** Bump to replay when `trigger="manual"`. */
  play?: number | boolean;
  /** Total duration, ms. Default 900. */
  duration?: number;
  /** Frame interval, ms. Default 40. */
  interval?: number;
  /** Characters used for the scramble. */
  charset?: string;
  onComplete?: () => void;
}

const DEFAULT_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&*+=?<>/";

/** Scramble-then-decode text reveal. Exposed as `role="img"` labelled with the final text, so screen readers never hear the scramble; reduced motion shows it instantly. */
export const DecodeText = React.forwardRef<HTMLSpanElement, DecodeTextProps>(
  (
    {
      text,
      trigger = "mount",
      play,
      duration = 900,
      interval = 40,
      charset = DEFAULT_CHARSET,
      onComplete,
      className,
      onMouseEnter,
      onFocus,
      ...props
    },
    ref
  ) => {
    const reduced = usePrefersReducedMotion();
    const [display, setDisplay] = React.useState(() => (trigger === "mount" && !reduced ? scramble(text, 0, charset) : text));
    const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const doneRef = useLatestRef(onComplete);

    const stop = () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };

    const start = React.useCallback(() => {
      stop();
      if (reduced || duration <= 0) {
        setDisplay(text);
        doneRef.current?.();
        return;
      }
      const began = Date.now();
      setDisplay(scramble(text, 0, charset));
      timer.current = setInterval(() => {
        const progress = Math.min(1, (Date.now() - began) / duration);
        if (progress >= 1) {
          stop();
          setDisplay(text);
          doneRef.current?.();
        } else setDisplay(scramble(text, progress, charset));
      }, interval);
    }, [text, reduced, duration, interval, charset]);

    React.useEffect(() => {
      if (trigger === "mount") start();
      else setDisplay(text);
      return stop;
    }, [trigger, start, text]);

    React.useEffect(() => {
      if (trigger === "manual" && play) start();
      return stop;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [play]);

    return (
      <span
        ref={ref}
        role="img"
        aria-label={text}
        data-decoding={display !== text ? "" : undefined}
        onMouseEnter={(e) => {
          onMouseEnter?.(e);
          if (trigger === "hover" && !timer.current) start();
        }}
        onFocus={(e) => {
          onFocus?.(e);
          if (trigger === "hover" && !timer.current) start();
        }}
        className={cn("inline-block whitespace-pre-wrap tabular-nums", className)}
        {...props}
      >
        <span aria-hidden>{display}</span>
      </span>
    );
  }
);
DecodeText.displayName = "DecodeText";

function scramble(text: string, progress: number, charset: string) {
  const revealed = Math.floor(text.length * progress);
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (i < revealed || /\s/.test(ch)) out += ch;
    else out += charset[Math.floor(Math.random() * charset.length)] ?? ch;
  }
  return out;
}
