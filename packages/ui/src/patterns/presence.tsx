import * as React from "react";
import { Slot } from "radix-ui";
import { useLatestRef } from "../hooks/use-iso-layout-effect";
import { prefersReducedMotion } from "../hooks/use-media-query";
import type { PresenceState } from "../hooks/use-presence";

export interface PresenceProps {
  /** Whether the child should be on screen. Going to false keeps it mounted until its exit animation has ended. */
  present: boolean;
  /** One element that accepts DOM props (it gets `data-state`, `data-presence`, `inert` and the animation listeners). */
  children: React.ReactElement;
  /** Milliseconds before an exiting child is removed even if no `animationend` or `transitionend` arrived. Default 200, the speed of `animate-fade-out`. */
  exitDuration?: number;
  /** Animate the child in when it is present on the first render too. Default false. */
  initial?: boolean;
  /** Called once the child has been removed. */
  onExited?: () => void;
}

/**
 * Mounts a child when `present` turns true and unmounts it after its exit animation when it turns false. The child
 * carries `data-state="open" | "closed"` and `data-presence="enter" | "idle" | "exit"`, so plain classes do the motion:
 *
 *   <Presence present={open}>
 *     <div className="data-[presence=enter]:animate-pop-in data-[presence=exit]:animate-fade-out">...</div>
 *   </Presence>
 *
 * An exiting child is `inert` and `aria-hidden` (out of the tab order and the accessibility tree at once, still painted)
 * and is removed on its own `animationend` / `transitionend`, or after `exitDuration`. Under `prefers-reduced-motion` it
 * mounts and unmounts at once, with no enter or exit state. For a list use `AnimatedList`; Radix overlays already do this.
 */
export function Presence({ present, children, exitDuration = 200, initial = false, onExited }: PresenceProps) {
  const [phase, setPhase] = React.useState<PresenceState | null>(present ? (initial && !prefersReducedMotion() ? "enter" : "idle") : null);
  // Adjust state while rendering: mount or come back on `present`, start leaving (or leave at once) on `!present`.
  if (present && (phase === null || phase === "exit")) setPhase(prefersReducedMotion() ? "idle" : "enter");
  else if (!present && phase !== null && phase !== "exit") setPhase(prefersReducedMotion() ? null : "exit");

  React.useEffect(() => {
    if (phase !== "exit") return;
    const timer = setTimeout(() => setPhase(null), exitDuration);
    return () => clearTimeout(timer);
  }, [phase, exitDuration]);

  const onExitedRef = useLatestRef(onExited);
  const before = React.useRef(phase);
  React.useEffect(() => {
    if (before.current !== null && phase === null) onExitedRef.current?.();
    before.current = phase;
  }, [phase]);

  if (phase === null) return null;
  const leaving = phase === "exit";
  const end = (e: React.SyntheticEvent) => {
    if (leaving && e.target === e.currentTarget) setPhase(null);
  };
  return (
    <Slot.Root
      data-slot="presence"
      data-state={leaving ? "closed" : "open"}
      data-presence={phase}
      inert={leaving ? true : undefined}
      aria-hidden={leaving ? true : undefined}
      onAnimationEnd={end}
      onTransitionEnd={end}
    >
      {children}
    </Slot.Root>
  );
}
