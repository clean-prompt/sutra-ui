import * as React from "react";
import { RiCloseLine, RiErrorWarningLine, RiQuestionAnswerLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { Spinner } from "../../primitives/spinner";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useDrag } from "../../hooks/use-drag";
import { clamp } from "../../lib/math";
import { normalizeTaskStatus, type TaskStatusInput } from "../../lib/status";
import { PromptInput, PromptInputSubmit, PromptInputTextarea } from "../ai/prompt-input";
import { iconAction } from "./agent-composer-internal";

/* ------------------------------------------------------------------ */
/* SideThread                                                          */
/* ------------------------------------------------------------------ */

export interface SideThreadExchange {
  id: string;
  question: React.ReactNode;
  answer?: React.ReactNode;
  /**
   * `pending`/`running`: waiting for the answer · `failed`: see `error` · `succeeded` (default): shows `answer`.
   * Legacy `done` / `error` still work.
   */
  status?: TaskStatusInput;
  error?: React.ReactNode;
}

export interface SideThreadProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Question and answer pairs, oldest first; an exchange without an answer is pending. */
  exchanges: SideThreadExchange[];
  /** Called with the question text from the side composer. */
  onAsk?: (text: string) => void;
  /** Called when the user closes the thread; the close button is hidden when unset. */
  onClose?: () => void;
  /** Header title. Default "Side question". */
  title?: React.ReactNode;
  /** Placeholder of the side composer. Default "Ask a quick side question…". */
  placeholder?: string;
  /** Shown when there are no exchanges yet. */
  emptyState?: React.ReactNode;
  /** Disables asking while an answer is pending. Default: any exchange is pending. */
  loading?: boolean;
  /** Disables asking while an answer is pending. @deprecated Use `loading`. */
  busy?: boolean;
  /** Controlled height of the thread in px. */
  height?: number;
  /** Initial height in px when `height` is not controlled. */
  defaultHeight?: number;
  /** Called with the height in px (rounded and clamped) when the user resizes the thread. */
  onHeightChange?: (height: number) => void;
  /** Smallest height in px the user can resize to. Default 140. */
  minHeight?: number;
  /** Largest height in px the user can resize to. Default 640. */
  maxHeight?: number;
  /** Show the top resize handle (pointer drag, ↑/↓, PageUp/PageDown, Home/End). Default true. */
  resizable?: boolean;
  /** Keyboard resize step in px. Default 16. */
  step?: number;
}

/** Docked mini-chat for quick side questions that don't interrupt the main conversation. Resizable from its top edge. */
export const SideThread = React.forwardRef<HTMLElement, SideThreadProps>(
  (
    {
      exchanges,
      onAsk,
      onClose,
      title = "Side question",
      placeholder = "Ask a quick side question…",
      emptyState = "Ask a quick side question without interrupting the main conversation.",
      loading: loadingProp,
      busy: busyProp,
      height: heightProp,
      defaultHeight = 280,
      onHeightChange,
      minHeight = 140,
      maxHeight = 640,
      resizable = true,
      step = 16,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const [height, setHeightRaw] = useControllableState<number>({
      value: heightProp,
      defaultValue: defaultHeight,
      onChange: onHeightChange,
    });
    const setHeight = (h: number) => setHeightRaw(Math.round(clamp(h, minHeight, maxHeight)));
    // The top handle resizes from the height at the press; it is a bare handle (nothing clickable inside), so the pointer is captured
    // on the press and the drag starts on the first move.
    const startHeight = React.useRef(height);
    const resize = useDrag({
      axis: "both",
      threshold: 0,
      captureOnPress: true,
      enabled: resizable,
      onDown: (e) => {
        e.preventDefault();
        startHeight.current = height;
      },
      onMove: (info) => setHeight(startHeight.current - info.dy),
    });
    const logRef = React.useRef<HTMLDivElement>(null);
    const titleId = React.useId();
    const exchangeState = (x: SideThreadExchange) => {
      const st = normalizeTaskStatus(x.status, "succeeded");
      return st === "pending" || st === "running" ? "pending" : st === "failed" ? "error" : "done";
    };
    const busy = loadingProp ?? busyProp ?? exchanges.some((x) => exchangeState(x) === "pending");

    React.useEffect(() => {
      const el = logRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, [exchanges]);

    return (
      <section
        ref={ref}
        aria-labelledby={titleId}
        data-slot="side-thread"
        style={{ height: resizable ? height : undefined, ...style }}
        className={cn("relative flex min-h-0 flex-col overflow-hidden rounded-box border border-border bg-card shadow-sm", className)}
        {...props}
      >
        {resizable && (
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize side question"
            aria-valuenow={height}
            aria-valuemin={minHeight}
            aria-valuemax={maxHeight}
            tabIndex={0}
            onKeyDown={(e) => {
              const big = step * 4;
              const next =
                e.key === "ArrowUp" ? height + step
                : e.key === "ArrowDown" ? height - step
                : e.key === "PageUp" ? height + big
                : e.key === "PageDown" ? height - big
                : e.key === "Home" ? maxHeight
                : e.key === "End" ? minHeight
                : null;
              if (next == null) return;
              e.preventDefault();
              setHeight(next);
            }}
            ref={resize.ref}
            {...resize.handlers}
            className={cn(
              "group/handle absolute inset-x-0 top-0 z-10 flex h-2.5 cursor-row-resize touch-none items-start justify-center pt-1 outline-none",
              "focus-visible:bg-ring/10"
            )}
          >
            <span className="h-1 w-8 rounded-full bg-border transition-colors group-hover/handle:bg-border-strong group-focus-visible/handle:bg-ring" />
          </div>
        )}
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 pb-2 pt-3">
          <RiQuestionAnswerLine aria-hidden className="size-4 text-muted-foreground" />
          <h3 id={titleId} className="flex-1 truncate text-sm font-medium text-foreground">
            {title}
          </h3>
          {onClose && (
            <button type="button" aria-label="Close side question" onClick={onClose} className={iconAction}>
              <RiCloseLine aria-hidden />
            </button>
          )}
        </header>
        <div
          ref={logRef}
          role="log"
          aria-label="Side question exchanges"
          tabIndex={0}
          className={cn("scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-2.5 text-sm outline-none", focusRing)}
        >
          {exchanges.length === 0 ? (
            <p className="m-auto max-w-64 text-center text-xs text-muted-foreground">{emptyState}</p>
          ) : (
            exchanges.map((x) => (
              <div key={x.id} data-exchange-id={x.id} className="flex flex-col gap-1.5">
                <div className="max-w-[85%] self-end whitespace-pre-wrap rounded-box bg-secondary px-2.5 py-1.5 text-secondary-foreground">
                  {x.question}
                </div>
                <div className="max-w-full self-start leading-6 text-foreground">
                  {exchangeState(x) === "pending" ? (
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Spinner size="xs" aria-hidden role="presentation" />
                      Answering…
                    </span>
                  ) : exchangeState(x) === "error" ? (
                    <span className="inline-flex items-center gap-1.5 text-destructive">
                      <RiErrorWarningLine aria-hidden className="size-4" />
                      {x.error ?? "Couldn't get an answer."}
                    </span>
                  ) : (
                    x.answer
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {onAsk && (
          <div className="shrink-0 border-t border-border p-2">
            <PromptInput
              onSubmit={(text) => onAsk(text.trim())}
              loading={busy}
              className="flex-row items-end rounded-control shadow-none"
            >
              <PromptInputTextarea
                aria-label="Side question"
                placeholder={placeholder}
                maxRows={4}
                className="px-3 py-1.5 text-sm leading-5"
              />
              <PromptInputSubmit submitLabel="Ask" className="m-1 size-7 shrink-0" />
            </PromptInput>
          </div>
        )}
      </section>
    );
  }
);
SideThread.displayName = "SideThread";

