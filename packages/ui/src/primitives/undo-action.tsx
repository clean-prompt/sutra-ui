import * as React from "react";
import { RiCheckLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { useIsoLayoutEffect } from "../hooks/use-iso-layout-effect";
import { Button, type ButtonProps } from "./button";

export interface UndoActionProps extends Omit<ButtonProps, "onClick" | "children" | "asChild" | "loading" | "leadingIcon" | "trailingIcon" | "type"> {
  /** Runs once the countdown ends (not before). A returned promise shows a spinner; a rejection brings the button back. */
  onCommit: () => void | Promise<unknown>;
  /** Runs when the user presses "Undo". Setting a controlled `armed` to false from outside cancels silently. */
  onUndo?: () => void;
  /** Runs when the user presses the button and the countdown starts (start a `Toast` here). */
  onArm?: () => void;
  /** Seconds the user has to undo. Default 8. */
  seconds?: number;
  /** Label of the idle button. Default "Delete". */
  label?: React.ReactNode;
  undoLabel?: React.ReactNode;
  committedLabel?: React.ReactNode;
  /** Icon before the idle label. */
  icon?: React.ReactNode;
  /** The countdown is running. Set it from outside (a toast's Undo button sets it to false). */
  armed?: boolean;
  defaultArmed?: boolean;
  onArmedChange?: (armed: boolean) => void;
  /** Hold the countdown while the pointer is over the button. */
  pauseOnHover?: boolean;
  /** Hold the countdown while the button has keyboard focus (focus that came from a click does not count). */
  pauseOnFocus?: boolean;
  /** Variant while the countdown runs. Default "secondary". */
  armedVariant?: ButtonProps["variant"];
  /** Screen reader messages (a polite live region). */
  messages?: { armed?: (seconds: number) => string; undone?: string; committed?: string };
}

const RING = 2 * Math.PI * 8;
const defaultMessages = {
  armed: (seconds: number) => `Undo available for ${seconds} ${seconds === 1 ? "second" : "seconds"}`,
  undone: "Undone",
  committed: "Done",
};

/**
 * A destructive button that turns into a counted "Undo" for N seconds and only then commits (`onCommit`). The deadline is the
 * wall clock, so a throttled tab still commits on time; the ring and the number follow it. The focus stays on the same button, so
 * Enter or Space undoes. Pair it with a `Toast` through `onArm` and a controlled `armed`. The three labels sit in one grid cell,
 * so the width never jumps. A polite live region announces the countdown, the undo and the commit.
 */
export const UndoAction = React.forwardRef<HTMLButtonElement, UndoActionProps>(function UndoAction(
  {
    onCommit,
    onUndo,
    onArm,
    seconds = 8,
    label = "Delete",
    undoLabel = "Undo",
    committedLabel = "Deleted",
    icon,
    armed: armedProp,
    defaultArmed = false,
    onArmedChange,
    pauseOnHover = false,
    pauseOnFocus = false,
    variant = "destructive-soft",
    armedVariant = "secondary",
    messages,
    className,
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    ...props
  },
  ref
) {
  const total = Math.max(1, seconds) * 1000;
  const [armed, setArmed] = useControllableState({ value: armedProp, defaultValue: defaultArmed, onChange: onArmedChange });
  const [committed, setCommitted] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const [focus, setFocus] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [, tick] = React.useReducer((n: number) => n + 1, 0);
  const deadline = React.useRef<number | null>(null);
  const frozen = React.useRef<number | null>(null);
  const wasArmed = React.useRef(false);
  const alive = React.useRef(true);
  const latest = React.useRef({ onCommit, onUndo, setArmed });
  latest.current = { onCommit, onUndo, setArmed };

  const paused = armed && !committed && ((pauseOnHover && hover) || (pauseOnFocus && focus));
  const phase = committed ? "committed" : armed ? "armed" : "idle";

  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // The deadline starts when `armed` turns on (from a press or from outside) and is the wall clock, not a tick count.
  useIsoLayoutEffect(() => {
    if (armed && !wasArmed.current) {
      setCommitted(false);
      deadline.current = Date.now() + total;
      frozen.current = null;
      tick();
    }
    if (!armed) deadline.current = null;
    wasArmed.current = armed;
  }, [armed, total]);

  // Holding the countdown keeps the time that was left; letting go moves the deadline by it.
  useIsoLayoutEffect(() => {
    if (!armed || deadline.current === null) return;
    if (paused && frozen.current === null) frozen.current = Math.max(0, deadline.current - Date.now());
    if (!paused && frozen.current !== null) {
      deadline.current = Date.now() + frozen.current;
      frozen.current = null;
    }
  }, [paused, armed]);

  React.useEffect(() => {
    if (!armed || paused || committed) return;
    const check = () => {
      const d = deadline.current;
      if (d === null) return;
      if (Date.now() < d) return tick();
      deadline.current = null;
      setCommitted(true);
      latest.current.setArmed(false);
      let result: void | Promise<unknown>;
      try {
        result = latest.current.onCommit();
      } catch (error) {
        setCommitted(false);
        throw error;
      }
      if (result && typeof (result as Promise<unknown>).then === "function") {
        setBusy(true);
        (result as Promise<unknown>).then(
          () => alive.current && setBusy(false),
          () => {
            if (!alive.current) return;
            setBusy(false);
            setCommitted(false);
          }
        );
      }
    };
    const id = setInterval(check, 100);
    check();
    return () => clearInterval(id);
  }, [armed, paused, committed]);

  // Announce the transitions (the first render says nothing).
  const lastPhase = React.useRef(phase);
  useIsoLayoutEffect(() => {
    if (lastPhase.current === phase) return;
    const was = lastPhase.current;
    lastPhase.current = phase;
    const m = { ...defaultMessages, ...messages };
    if (phase === "armed") setMessage(m.armed(Math.ceil(total / 1000)));
    else if (phase === "committed") setMessage(m.committed);
    else if (was === "armed") setMessage(m.undone);
  }, [phase, total, messages]);

  const remaining = phase !== "armed" ? total : frozen.current ?? (deadline.current === null ? total : Math.max(0, Math.min(total, deadline.current - Date.now())));
  const secondsLeft = Math.max(1, Math.ceil(remaining / 1000));

  const press = () => {
    if (committed || busy) return;
    if (armed) {
      setArmed(false);
      latest.current.onUndo?.();
      return;
    }
    setArmed(true);
    onArm?.();
  };

  const layer = (active: boolean) =>
    cn("col-start-1 row-start-1 inline-flex items-center justify-center gap-2 transition-opacity duration-150", active ? "opacity-100" : "pointer-events-none opacity-0");

  return (
    <>
      <Button
        ref={ref}
        data-slot="undo-action"
        data-state={phase}
        variant={phase === "armed" ? armedVariant : variant}
        className={cn("tabular-nums", className)}
        loading={busy}
        {...props}
        aria-disabled={phase === "committed" && !busy ? true : props["aria-disabled"]}
        onClick={press}
        onPointerEnter={(event) => {
          onPointerEnter?.(event);
          if (event.pointerType !== "touch") setHover(true);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          setHover(false);
        }}
        onFocus={(event) => {
          onFocus?.(event);
          try {
            setFocus(event.currentTarget.matches(":focus-visible"));
          } catch {
            setFocus(false);
          }
        }}
        onBlur={(event) => {
          onBlur?.(event);
          setFocus(false);
        }}
      >
        <span className="grid">
          <span aria-hidden={phase !== "idle" || undefined} className={layer(phase === "idle")}>
            {icon}
            {label}
          </span>
          <span aria-hidden={phase !== "armed" || undefined} className={layer(phase === "armed")}>
            <span aria-hidden data-slot="undo-action-ring" className="relative size-5 shrink-0">
              <svg viewBox="0 0 20 20" className="size-full -rotate-90" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="10" cy="10" r="8" className="opacity-25" />
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  strokeLinecap="round"
                  strokeDasharray={RING}
                  strokeDashoffset={RING * (1 - remaining / total)}
                  className="transition-[stroke-dashoffset] duration-150 ease-linear"
                />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-[10px] font-semibold leading-none">{secondsLeft}</span>
            </span>
            {undoLabel}
          </span>
          <span aria-hidden={phase !== "committed" || undefined} className={layer(phase === "committed")}>
            <RiCheckLine aria-hidden className="size-4" />
            {committedLabel}
          </span>
        </span>
      </Button>
      <span role="status" className="sr-only">
        {message}
      </span>
    </>
  );
});
UndoAction.displayName = "UndoAction";
