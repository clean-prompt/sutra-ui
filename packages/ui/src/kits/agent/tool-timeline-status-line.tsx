import * as React from "react";
import { RiBrainLine, RiQuestionLine, RiShieldKeyholeLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { formatDuration } from "../../lib/duration";
import { formatTokens } from "../../lib/format";
import { toMs, type TimeInput } from "../../lib/time";
import { usePrefersReducedMotion } from "../../hooks/use-media-query";
import { useNow } from "../../hooks/use-now";
import { Spinner } from "../../primitives/spinner";
import { TextShimmer } from "../../primitives/text-shimmer";

/* ------------------------------------------------------------------ */
/* AgentStatusLine                                                     */
/* ------------------------------------------------------------------ */

export type AgentStatusState = "idle" | "thinking" | "running" | "permission" | "question";

export interface AgentStatusLineProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * What the agent is doing: `idle`, `thinking`, `running`, `permission` or `question`; sets the icon, tone and
   * default label.
   */
  state: AgentStatusState;
  /** Tool name for the "running" state. */
  tool?: string;
  /**
   * Overrides the default label. With `verbs`, the visible text rotates and this label is what
   * screen readers get instead (default "Thinking…").
   */
  label?: React.ReactNode;
  /** Words rotated as the visible label while `state` is "thinking" ("Pondering…", "Brewing…"). */
  verbs?: string[];
  /** Rotation order for `verbs`. Default "random" (never repeats the current verb). */
  verbOrder?: "random" | "sequential";
  /** Ms between verbs. Default 3000. Rotation pauses with reduced motion. */
  verbInterval?: number;
  /** When the current state began (Date, epoch ms or ISO string). Defaults to when `state` / `tool` last changed. */
  startedAt?: TimeInput;
  /** Controlled elapsed seconds (disables the internal clock). */
  elapsed?: number;
  /** Show the elapsed time. Default true. */
  showElapsed?: boolean;
  /** Tokens used so far, shown as "1.2k tokens". */
  tokens?: number;
  /** Tokens used so far, shown as "1.2k tokens". @deprecated Use `tokens`. */
  tokenCount?: number;
  /** Text before the token count, e.g. "↓" for streamed output tokens. */
  tokensPrefix?: string;
  /** Right-side hint, e.g. <Kbd>Esc</Kbd> to interrupt. */
  hint?: React.ReactNode;
  /** Replaces the per-state icon. */
  icon?: React.ReactNode;
  /**
   * `bar` (default): full-width row, stats after the label and the hint pushed right.
   * `inline`: compact inline loader with "(3s · 1.2k tokens · hint)" after the label.
   */
  layout?: "bar" | "inline";
}

const defaultStatusLabel = (state: AgentStatusState, tool?: string) =>
  state === "thinking"
    ? "Thinking…"
    : state === "running"
      ? `Running ${tool ?? "tool"}…`
      : state === "permission"
        ? "Waiting for permission…"
        : state === "question"
          ? "Waiting for your answer…"
          : "";

const stateIcons: Record<Exclude<AgentStatusState, "idle">, React.ReactNode> = {
  thinking: <RiBrainLine aria-hidden className="text-primary" />,
  running: <Spinner role="presentation" size="sm" className="text-primary" />,
  permission: <RiShieldKeyholeLine aria-hidden className="text-warning" />,
  question: <RiQuestionLine aria-hidden className="text-info" />,
};

/** Rotating verb index; pauses with reduced motion or fewer than two verbs. */
function useVerbIndex(count: number, active: boolean, order: "random" | "sequential", interval: number) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => {
    if (!active || reduced || count < 2) return;
    const id = setInterval(() => {
      setIndex((i) => {
        if (order === "sequential") return (i + 1) % count;
        let n = Math.floor(Math.random() * (count - 1));
        if (n >= i % count) n += 1;
        return n;
      });
    }, interval);
    return () => clearInterval(id);
  }, [active, reduced, count, order, interval]);
  return count ? index % count : 0;
}

/**
 * Live agent activity above the composer: what the agent is doing (thinking, running a tool, waiting for
 * permission or an answer) with elapsed time and token count. Renders nothing when idle.
 *
 * For infrastructure phases (cold start, queue, retry/rate-limit countdown, offline) use `StatusStrip`,
 * which sits in the same slot. Live region: `role="status"` (polite); the ticking clock, token count and
 * rotating verbs are hidden from screen readers so only state changes are announced.
 */
export const AgentStatusLine = React.forwardRef<HTMLDivElement, AgentStatusLineProps>(
  (
    {
      state,
      tool,
      label,
      verbs,
      verbOrder = "random",
      verbInterval = 3000,
      startedAt,
      elapsed: elapsedProp,
      showElapsed = true,
      tokens: tokensProp,
      tokenCount,
      tokensPrefix,
      hint,
      icon,
      layout = "bar",
      className,
      ...props
    },
    ref
  ) => {
    const active = state !== "idle";
    const tokens = tokensProp ?? tokenCount;
    const startMs = toMs(startedAt);
    // Restart the internal clock whenever the state (or tool) changes; derived during render so it never flashes stale.
    const key = `${state}\u0000${tool ?? ""}`;
    const [since, setSince] = React.useState(() => ({ key, at: Date.now() }));
    if (since.key !== key) setSince({ key, at: Date.now() });
    const now = useNow({ active: active && showElapsed && elapsedProp == null });

    const rotating = state === "thinking" && !!verbs && verbs.length > 0;
    const verbIndex = useVerbIndex(rotating ? verbs!.length : 0, rotating, verbOrder, verbInterval);

    if (!active) return null;
    const origin = startMs ?? since.at;
    const seconds = elapsedProp ?? Math.max(0, Math.floor((now - origin) / 1000));
    const text = label ?? defaultStatusLabel(state, tool);
    const waiting = state === "permission" || state === "question";
    const verb = rotating ? (verbs![verbIndex] ?? "") : "";
    const stats = [
      showElapsed ? formatDuration(seconds * 1000, { pad: true, round: "floor", invalid: "0s" }) : null,
      tokens != null ? `${tokensPrefix ? `${tokensPrefix} ` : ""}${formatTokens(tokens, { label: true, wholeAbove: 100 })}` : null,
    ].filter(Boolean);
    const statsText = stats.join(" · ");
    const inline = layout === "inline";

    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        data-slot="agent-status-line"
        data-state={state}
        data-layout={layout}
        className={cn(
          "min-w-0 items-center gap-2 text-sm",
          inline ? "inline-flex" : "flex flex-wrap gap-y-0.5 px-1 py-1 text-muted-foreground",
          className
        )}
        {...props}
      >
        <span aria-hidden className="inline-flex shrink-0 text-primary [&_svg]:size-4">
          {icon ?? stateIcons[state]}
        </span>
        {rotating ? (
          <>
            <span className="sr-only">{text}</span>
            <TextShimmer aria-hidden data-slot="spinner-verb" className="max-w-full truncate font-medium">
              {verb.endsWith("…") ? verb : `${verb}…`}
            </TextShimmer>
          </>
        ) : waiting ? (
          <span className="max-w-full truncate font-medium text-foreground">{text}</span>
        ) : (
          <TextShimmer className="max-w-full truncate font-medium">{text}</TextShimmer>
        )}
        {inline ? (
          (stats.length > 0 || hint != null) && (
            <span data-slot="agent-status-meta" className="shrink-0 text-xs tabular-nums text-muted-foreground">
              <span aria-hidden>
                ({statsText}
                {hint != null && stats.length > 0 ? " · " : ""}
              </span>
              {hint}
              <span aria-hidden>)</span>
            </span>
          )
        ) : (
          <>
            {stats.length > 0 && (
              <span aria-hidden data-slot="agent-status-meta" className="shrink-0 text-xs tabular-nums">
                {statsText}
              </span>
            )}
            {hint != null && <span className="ms-auto shrink-0 text-xs">{hint}</span>}
          </>
        )}
      </div>
    );
  }
);
AgentStatusLine.displayName = "AgentStatusLine";
