import * as React from "react";
import { RiArrowLeftLine, RiArrowRightLine, RiCheckLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { useMountedRef } from "../hooks/use-async-action";
import { useControllableState } from "../hooks/use-controllable-state";
import { useElementSize } from "../hooks/use-resize-observer";
import { prefersReducedMotion } from "../hooks/use-media-query";
import { Button } from "../primitives/button";
import { Progress } from "../primitives/progress";
import { Steps, type StepsProps } from "../primitives/step-indicator";

export interface StepWizardStep {
  /** Stable id: the `value` of the wizard while this step shows. */
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** What the step shows. */
  content: React.ReactNode;
}

export interface StepWizardLabels {
  back?: string;
  next?: string;
  finish?: string;
  /** "Step 2 of 4", used by the progress bar and as the name of the step panel. */
  step?: (n: number, count: number) => string;
}

export interface StepWizardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** Steps in order; each has an `id`, a `title` and the content to show. */
  steps: readonly StepWizardStep[];
  /** Id of the step in view. */
  value?: string;
  /** Initially shown step id when uncontrolled. */
  defaultValue?: string;
  /** Called with the new step id, its index and the direction when the user moves between steps. */
  onValueChange?: (id: string, meta: { index: number; direction: "forward" | "back" }) => void;
  /**
   * Checked before leaving a step forward (Next, Finish, or a jump ahead); return false (or a promise of false) to stay.
   * While a promise is pending the buttons wait. Going back is never checked.
   */
  canAdvance?: (step: StepWizardStep, index: number) => boolean | Promise<boolean>;
  /** Called when `canAdvance` keeps the user on a step: show the error there. */
  onBlocked?: (step: StepWizardStep, index: number) => void;
  /** The Finish button was pressed on the last step (after `canAdvance`). It may return a promise; the button shows loading until it settles. */
  onComplete?: () => void | Promise<void>;
  /** `canAdvance` or `onComplete` threw or rejected: the wizard stays on the step. */
  onError?: (error: unknown) => void;
  /** `"auto"` shows `Steps` from a container width of 28rem up and a progress bar below; or force one. Default "auto". */
  indicator?: "auto" | "steps" | "bar" | "none";
  /** Passed to `Steps` (variant, size, connector). */
  stepsProps?: Partial<Omit<StepsProps, "steps" | "current" | "onStepClick">>;
  /** Keep every step mounted (hidden) so typed values survive going back. Default false: only the current step is rendered. */
  keepMounted?: boolean;
  /** Replace the Back / Next row, or pass false to hide it. */
  footer?: React.ReactNode | false;
  /** Overrides for the button and progress texts (`back`, `next`, `finish`, `step`). */
  labels?: StepWizardLabels;
}

const defaults = {
  back: "Back",
  next: "Next",
  finish: "Finish",
  step: (n: number, count: number) => `Step ${n} of ${count}`,
};

/**
 * A multi-step flow in one place: the steps slide in the direction you are going, the area grows or shrinks to the
 * height of the current step, and a progress bar or `Steps` shows where you are. `canAdvance` validates before moving
 * forward (it may be async), Back is free, focus moves to the new step's panel so a screen reader announces it, and
 * Enter in a text field presses Next. Controlled with `value` or uncontrolled. Under reduced motion the steps swap
 * with no slide and the height jumps.
 */
export const StepWizard = React.forwardRef<HTMLDivElement, StepWizardProps>(
  (
    { steps, value, defaultValue, onValueChange, canAdvance, onBlocked, onComplete, onError, indicator = "auto", stepsProps, keepMounted = false, footer, labels, className, ...props },
    ref
  ) => {
    const text = { ...defaults, ...labels };
    const count = steps.length;
    const [id, setId] = useControllableState<string>({ value, defaultValue: defaultValue ?? steps[0]?.id ?? "" });
    const index = Math.max(0, steps.findIndex((s) => s.id === id));
    const step = steps[index];
    const last = index === count - 1;

    // Direction and a restart key for the entrance, derived while rendering so both land in the same commit.
    const [seen, setSeen] = React.useState({ index, dir: 1 as 1 | -1, key: 0 });
    let { dir, key } = seen;
    if (seen.index !== index) {
      dir = index > seen.index ? 1 : -1;
      key = seen.key + 1;
      setSeen({ index, dir, key });
    }

    const inner = React.useRef<HTMLDivElement | null>(null);
    const { height } = useElementSize(inner);
    const panel = React.useRef<HTMLDivElement | null>(null);
    const shown = React.useRef<number | null>(null);
    React.useEffect(() => {
      if (shown.current !== null && shown.current !== index) panel.current?.focus({ preventScroll: true });
      shown.current = index;
    }, [index]);

    // Validation runs synchronously when `canAdvance` does, so a plain step change never flashes a busy state.
    const [busy, setBusy] = React.useState(false);
    const alive = useMountedRef();
    const run = React.useRef(0);
    const validate = (from: number, to: number): boolean | Promise<boolean> => {
      for (let i = from; i < to; i++) {
        const ok = canAdvance ? canAdvance(steps[i]!, i) : true;
        if (typeof ok === "boolean") {
          if (ok) continue;
          onBlocked?.(steps[i]!, i);
          return false;
        }
        return ok.then((res) => {
          if (!res) {
            onBlocked?.(steps[i]!, i);
            return false;
          }
          return validate(i + 1, to);
        });
      }
      return true;
    };
    const whenOk = (ok: boolean | Promise<boolean>, action: () => void | Promise<void>) => {
      const id = ++run.current;
      const out = typeof ok === "boolean" ? (ok ? action() : undefined) : ok.then((res) => (res && alive.current && id === run.current ? action() : undefined));
      if (!out || typeof out.then !== "function") return;
      setBusy(true);
      out.then(undefined, (error: unknown) => onError?.(error)).then(() => alive.current && id === run.current && setBusy(false));
    };
    const goto = (to: number) => {
      const target = steps[to];
      if (!target || to === index || busy) return;
      whenOk(to < index ? true : validate(index, to), () => {
        setId(target.id);
        onValueChange?.(target.id, { index: to, direction: to > index ? "forward" : "back" });
      });
    };
    const finish = () => !busy && whenOk(validate(index, index + 1), () => onComplete?.());

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (event.key !== "Enter" || event.defaultPrevented || event.nativeEvent.isComposing || target.tagName !== "INPUT") return;
      if (!target.closest("[data-slot=step-wizard-panel]") || (target as HTMLInputElement).type === "button") return;
      event.preventDefault();
      if (last) finish();
      else goto(index + 1);
    };

    const slide = key > 0 && !prefersReducedMotion();
    const entrance = slide && cn("animate-in fade-in-0 duration-(--sutra-duration-slow) ease-(--sutra-ease)", dir > 0 ? "slide-in-from-end-6" : "slide-in-from-start-6");
    const label = text.step(index + 1, count);
    const bar = (
      <div className={cn("space-y-1.5", indicator === "auto" && "@md:hidden")} data-slot="step-wizard-progress">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="shrink-0 font-medium">{label}</span>
          <span className="min-w-0 truncate text-muted-foreground">{step?.title}</span>
        </div>
        <Progress value={count > 1 ? (index / (count - 1)) * 100 : 100} size="sm" aria-label={label} />
      </div>
    );
    const indicatorSteps = (
      <div className={cn(indicator === "auto" && "hidden @md:block")} data-slot="step-wizard-steps">
        <Steps
          {...stepsProps}
          steps={steps.map((s) => ({ id: s.id, title: s.title, description: s.description }))}
          current={index}
          onStepClick={goto}
          aria-label="Progress"
        />
      </div>
    );

    return (
      <div ref={ref} data-slot="step-wizard" data-direction={key > 0 ? (dir > 0 ? "forward" : "back") : undefined} aria-busy={busy || undefined} className={cn("@container flex min-w-0 flex-col gap-5", className)} onKeyDown={onKeyDown} {...props}>
        {indicator === "none" ? null : indicator === "bar" ? bar : indicator === "steps" ? indicatorSteps : (
          <>
            {indicatorSteps}
            {bar}
          </>
        )}
        <div
          data-slot="step-wizard-viewport"
          className="-m-1 overflow-hidden p-1 transition-[height] duration-(--sutra-duration-slow) ease-(--sutra-ease)"
          style={height ? { height: height + 8 } : undefined}
        >
          <div ref={inner} className="flow-root">
            {(keepMounted ? steps : step ? [step] : []).map((s) => {
              const current = s.id === step?.id;
              return (
                <div
                  key={s.id}
                  ref={current ? panel : undefined}
                  role="group"
                  aria-label={current ? label : text.step(steps.indexOf(s) + 1, count)}
                  tabIndex={current ? -1 : undefined}
                  hidden={!current}
                  inert={current ? undefined : true}
                  data-slot="step-wizard-panel"
                  data-state={current ? "current" : "hidden"}
                  className={cn("min-w-0 rounded-box outline-none", current && entrance)}
                >
                  {s.content}
                </div>
              );
            })}
          </div>
        </div>
        {footer === false ? null : (
          footer ?? (
            <div data-slot="step-wizard-footer" className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="ghost" leadingIcon={<RiArrowLeftLine className="rtl:-scale-x-100" />} disabled={index === 0 || busy} onClick={() => goto(index - 1)}>
                {text.back}
              </Button>
              <Button
                loading={busy}
                trailingIcon={last ? <RiCheckLine /> : <RiArrowRightLine className="rtl:-scale-x-100" />}
                onClick={() => (last ? finish() : goto(index + 1))}
              >
                {last ? text.finish : text.next}
              </Button>
            </div>
          )
        )}
      </div>
    );
  }
);
StepWizard.displayName = "StepWizard";
