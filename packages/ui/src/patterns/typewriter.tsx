import * as React from "react";
import { cn } from "../lib/cn";
import { useTypewriter, type UseTypewriterOptions } from "../hooks/use-typewriter";

export interface TypewriterProps extends UseTypewriterOptions, Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** One line, or several typed in turn. */
  text: string | readonly string[];
  /**
   * The caret. "typing" (default): a solid caret while the text is being typed, gone when it is done, so nothing blinks
   * at rest. "always": a blinking caret that stays (it stops under reduced motion). "none".
   */
  cursor?: "typing" | "always" | "none";
  /** Keep the space of the longest line from the start, so the text below does not jump while this one grows. */
  reserve?: boolean;
  /** The element to render. Default `span`. */
  as?: "span" | "p" | "div" | "h1" | "h2" | "h3" | "h4";
}

/**
 * Text that types itself (see `useTypewriter` for the timing options). Accessible: the current line is real text in a
 * visually hidden span and the typed part and the caret are `aria-hidden`, so a screen reader reads the whole line
 * once, never letter by letter, and the hidden text is there before the first character. Under
 * `prefers-reduced-motion` it prints the finished text straight away.
 */
export const Typewriter = React.forwardRef<HTMLElement, TypewriterProps>(
  ({ text, cursor = "typing", reserve = false, as = "span", speed, deleteSpeed, delay, hold, loop, onDone, className, ...props }, ref) => {
    const state = useTypewriter(text, { speed, deleteSpeed, delay, hold, loop, onDone });
    const Root = as as React.ElementType;
    const showCaret = cursor === "always" || (cursor === "typing" && !state.done);
    const longest = typeof text === "string" ? text : text.reduce((a, b) => (b.length > a.length ? b : a), "");
    return (
      <Root ref={ref} data-slot="typewriter" data-state={state.done ? "done" : "typing"} className={cn(reserve && "inline-grid", className)} {...props}>
        <span className="sr-only">{state.line}</span>
        <span aria-hidden="true" className={cn(reserve && "col-start-1 row-start-1")}>
          {state.text}
          {showCaret ? (
            <span
              data-slot="typewriter-caret"
              className={cn("ms-px inline-block h-[1.1em] w-[0.12em] translate-y-[0.18em] bg-current", cursor === "always" && state.done && "animate-caret-blink")}
            />
          ) : null}
        </span>
        {reserve ? (
          <span aria-hidden="true" className="invisible col-start-1 row-start-1 select-none">
            {longest}
          </span>
        ) : null}
      </Root>
    );
  }
);
Typewriter.displayName = "Typewriter";
