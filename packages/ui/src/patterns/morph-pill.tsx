import * as React from "react";
import { cn } from "../lib/cn";
import { useChangeKey } from "../hooks/use-change-key";
import { useControllableState } from "../hooks/use-controllable-state";
import { useElementSize } from "../hooks/use-resize-observer";

export interface MorphPillContext<S extends string> {
  state: S;
  /** Switch to another state (reported through `onStateChange`; in controlled use the parent decides). */
  setState: (state: S) => void;
}

export interface MorphPillProps<S extends string> extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "defaultValue"> {
  /** The content of each state; a function receives the current state and `setState`, for buttons inside the pill. */
  states: Record<S, React.ReactNode | ((context: MorphPillContext<S>) => React.ReactNode)>;
  state?: S;
  defaultState?: S;
  onStateChange?: (state: S) => void;
  /** Which spring token the size change rides. Default "snappy". */
  spring?: "gentle" | "snappy" | "bouncy";
  /** Accessible name; makes the pill a `role="group"`. */
  label?: string;
  /** Text for a polite live region that screen readers hear when the state changes (the pill itself is silent). */
  announcement?: string;
  ref?: React.Ref<HTMLDivElement>;
}

const springClass = {
  gentle: "duration-(--sutra-spring-gentle-duration) ease-(--sutra-spring-gentle)",
  snappy: "duration-(--sutra-spring-snappy-duration) ease-(--sutra-spring-snappy)",
  bouncy: "duration-(--sutra-spring-bouncy-duration) ease-(--sutra-spring-bouncy)",
} as const;

/**
 * One surface that changes size between states (idle, a picker, a running timer, a sync status): its width and height
 * follow the measured content on a spring token, and the new content fades in as the old one goes. Under reduced
 * motion the size and the content swap at once (the shared net). Controlled (`state`) or uncontrolled (`defaultState`);
 * pass a function as a state's content to switch states from inside. It is an inline surface: put it in a container
 * with room (`max-w-full` keeps it inside a narrow one, and its content is clipped, not overflowing).
 */
export function MorphPill<S extends string>({
  states,
  state,
  defaultState,
  onStateChange,
  spring = "snappy",
  label,
  announcement,
  className,
  style,
  ref,
  ...props
}: MorphPillProps<S>) {
  const names = Object.keys(states) as S[];
  const [current, setCurrent] = useControllableState<S>({ value: state, defaultValue: defaultState ?? names[0]!, onChange: onStateChange });
  const content = states[current];
  const swap = useChangeKey(current);
  const inner = React.useRef<HTMLDivElement | null>(null);
  const { width, height } = useElementSize(inner);
  const measured = width > 0 && height > 0;
  return (
    <div
      role={label ? "group" : undefined}
      aria-label={label}
      {...props}
      ref={ref}
      data-slot="morph-pill"
      data-state={current}
      className={cn(
        "relative inline-block max-w-full overflow-hidden rounded-control bg-card text-card-foreground shadow-xs ring-1 ring-border transition-[width,height] align-top",
        springClass[spring],
        className
      )}
      style={{ ...style, ...(measured ? { width, height } : null) }}
    >
      <div ref={inner} data-slot="morph-pill-content" className="w-max">
        <div key={swap} className={cn(swap > 0 && "animate-fade-in")}>
          {typeof content === "function" ? content({ state: current, setState: setCurrent }) : content}
        </div>
      </div>
      {announcement ? (
        <span role="status" className="sr-only">
          {announcement}
        </span>
      ) : null}
    </div>
  );
}
MorphPill.displayName = "MorphPill";
