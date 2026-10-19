import * as React from "react";
import { cn } from "../lib/cn";
import { useIsoLayoutEffect } from "../hooks/use-iso-layout-effect";
import { useMergedRefs } from "../hooks/use-merged-refs";

export interface CollapseProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Whether the content is shown. */
  open: boolean;
  /** Remove the children from the tree once the close transition has ended (and mount them again on open). */
  unmountOnExit?: boolean;
  /** Fade the content in and out while the height changes (default true). */
  fade?: boolean;
  /** Class names for the clipping wrapper around the children (put padding on a child inside, not here, or the closed state keeps it). */
  contentClassName?: string;
  children?: React.ReactNode;
}

/** Last-resort unmount delay when no `transitionend` arrives (a hidden tab, an ancestor with `display: none`). */
const EXIT_FALLBACK_MS = 600;

/**
 * Height-auto open and close for a section, filter row or wizard step. The track goes from `0fr` to `1fr`, so the real
 * content height animates with no measuring and no JS animation; closed content is `inert` (not focusable, out of the
 * accessibility tree). Reduced motion ends the transition at once. It is controlled only: drive `open` yourself or use
 * `Collapsible`.
 */
export const Collapse = React.forwardRef<HTMLDivElement, CollapseProps>(
  ({ open, unmountOnExit = false, fade = true, className, contentClassName, children, onTransitionEnd, ...props }, ref) => {
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const [rendered, setRendered] = React.useState(open || !unmountOnExit);
    const [shown, setShown] = React.useState(open);

    const setRefs = useMergedRefs<HTMLDivElement>(rootRef, ref);

    useIsoLayoutEffect(() => {
      if (open) {
        if (!unmountOnExit || rendered) {
          // Commit the closed state first when the children were just mounted, so the height has something to animate from.
          void rootRef.current?.offsetHeight;
          setShown(true);
        } else {
          setRendered(true);
        }
      } else {
        setShown(false);
      }
    }, [open, rendered, unmountOnExit]);

    // Once closed, drop the children when the transition ends (or after a fallback delay).
    React.useEffect(() => {
      if (open || !unmountOnExit || !rendered) return;
      const id = setTimeout(() => setRendered(false), EXIT_FALLBACK_MS);
      return () => clearTimeout(id);
    }, [open, unmountOnExit, rendered]);
    React.useEffect(() => {
      if (!unmountOnExit && !rendered) setRendered(true);
    }, [unmountOnExit, rendered]);

    const state = open && shown ? "open" : "closed";
    return (
      <div
        ref={setRefs}
        data-slot="collapse"
        data-state={state}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-(--sutra-duration) ease-(--sutra-ease)",
          state === "open" ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          fade && (state === "open" ? "opacity-100" : "opacity-0"),
          className
        )}
        onTransitionEnd={(e) => {
          onTransitionEnd?.(e);
          if (e.target === e.currentTarget && e.propertyName === "grid-template-rows" && !open && unmountOnExit) {
            setRendered(false);
          }
        }}
        {...props}
      >
        <div
          data-slot="collapse-content"
          inert={state === "closed" ? true : undefined}
          className={cn("min-h-0 min-w-0 overflow-hidden", contentClassName)}
        >
          {rendered ? children : null}
        </div>
      </div>
    );
  }
);
Collapse.displayName = "Collapse";
