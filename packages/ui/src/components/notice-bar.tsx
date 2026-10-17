import * as React from "react";
import {
  RiAlertLine,
  RiArrowLeftSLine,
  RiArrowRightLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiInformationLine,
  RiSparkling2Line,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";

export type NoticeTone = "info" | "warn" | "error" | "promo";

export interface NoticeAction {
  label: React.ReactNode;
  href?: string;
  onClick?: () => void;
  target?: string;
  rel?: string;
}

export interface NoticeItem {
  id: string;
  message: React.ReactNode;
  tone?: NoticeTone;
  /** Custom icon; `false` hides it. */
  icon?: React.ReactNode | false;
  action?: NoticeAction;
  /** Default true. */
  dismissible?: boolean;
  /** Higher first. Default 0. */
  priority?: number;
}

const toneClass: Record<NoticeTone, string> = {
  info: "bg-info-soft text-info-soft-foreground border-info/25",
  warn: "bg-warning-soft text-warning-soft-foreground border-warning/30",
  error: "bg-destructive-soft text-destructive-soft-foreground border-destructive/25",
  promo: "bg-primary text-primary-foreground border-transparent",
};

const toneIcon: Record<NoticeTone, React.ComponentType<{ className?: string }>> = {
  info: RiInformationLine,
  warn: RiAlertLine,
  error: RiErrorWarningLine,
  promo: RiSparkling2Line,
};

/* ------------------------------------------------------------------ */
/* useNoticeQueue                                                      */
/* ------------------------------------------------------------------ */

/** Dedupe by id (last wins, keeping the first position) and sort by priority (desc, stable). */
export function sortNotices(notices: NoticeItem[], dismissed?: ReadonlySet<string>): NoticeItem[] {
  const byId = new Map<string, { notice: NoticeItem; order: number }>();
  notices.forEach((n, i) => {
    const prev = byId.get(n.id);
    byId.set(n.id, { notice: n, order: prev ? prev.order : i });
  });
  return [...byId.values()]
    .filter(({ notice }) => !dismissed?.has(notice.id))
    .sort((a, b) => (b.notice.priority ?? 0) - (a.notice.priority ?? 0) || a.order - b.order)
    .map(({ notice }) => notice);
}

export interface UseNoticeQueueOptions {
  /** Ids dismissed in an earlier session. */
  initialDismissed?: Iterable<string>;
  /** Persist a dismissal. */
  onDismiss?: (id: string, dismissed: string[]) => void;
}

export interface NoticeQueue {
  /** Visible notices: deduped, priority-sorted, minus dismissed. */
  notices: NoticeItem[];
  dismissed: ReadonlySet<string>;
  push: (notice: NoticeItem) => void;
  remove: (id: string) => void;
  dismiss: (id: string) => void;
  clearDismissed: () => void;
}

/** Queue state for `RotatingNoticeBar`: dedupe by id, priority sort and a dismissed set. */
export function useNoticeQueue(source: NoticeItem[] = [], { initialDismissed, onDismiss }: UseNoticeQueueOptions = {}): NoticeQueue {
  const [pushed, setPushed] = React.useState<NoticeItem[]>([]);
  const [dismissed, setDismissed] = React.useState<Set<string>>(() => new Set(initialDismissed ?? []));
  const onDismissRef = React.useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const notices = React.useMemo(() => sortNotices([...source, ...pushed], dismissed), [source, pushed, dismissed]);

  const push = React.useCallback((notice: NoticeItem) => {
    setPushed((list) => [...list.filter((n) => n.id !== notice.id), notice]);
    setDismissed((set) => {
      if (!set.has(notice.id)) return set;
      const next = new Set(set);
      next.delete(notice.id);
      return next;
    });
  }, []);
  const remove = React.useCallback((id: string) => setPushed((list) => list.filter((n) => n.id !== id)), []);
  const dismissedRef = React.useRef(dismissed);
  dismissedRef.current = dismissed;
  const dismiss = React.useCallback((id: string) => {
    if (dismissedRef.current.has(id)) return;
    const next = new Set(dismissedRef.current).add(id);
    dismissedRef.current = next;
    setDismissed(next);
    onDismissRef.current?.(id, [...next]);
  }, []);
  const clearDismissed = React.useCallback(() => setDismissed(new Set()), []);

  return { notices, dismissed, push, remove, dismiss, clearDismissed };
}

/* ------------------------------------------------------------------ */
/* RotatingNoticeBar                                                   */
/* ------------------------------------------------------------------ */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );
  React.useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

export interface RotatingNoticeBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  notices: NoticeItem[];
  /** Seconds per notice. Default 6. */
  interval?: number;
  /** Default true. Always off under prefers-reduced-motion. */
  autoRotate?: boolean;
  /** Persist a dismissal (the bar hides it locally either way). */
  onDismiss?: (id: string) => void;
  onIndexChange?: (index: number, notice: NoticeItem) => void;
  /** Stick to the top. Default false. */
  sticky?: boolean;
  label?: string;
}

/** Global notice strip that rotates through notices with a dot pager, pausing on hover or focus. */
export const RotatingNoticeBar = React.forwardRef<HTMLDivElement, RotatingNoticeBarProps>(
  (
    {
      notices: noticesProp,
      interval = 6,
      autoRotate = true,
      onDismiss,
      onIndexChange,
      sticky,
      label = "Notices",
      className,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [hidden, setHidden] = React.useState<Set<string>>(() => new Set());
    const notices = React.useMemo(() => sortNotices(noticesProp, hidden), [noticesProp, hidden]);
    const [index, setIndex] = React.useState(0);
    const [hovered, setHovered] = React.useState(false);
    const [focused, setFocused] = React.useState(false);
    const reduced = usePrefersReducedMotion();
    const count = notices.length;
    const safeIndex = count ? Math.min(index, count - 1) : 0;
    const current = notices[safeIndex];
    const paused = hovered || focused;
    const rotating = autoRotate && !reduced && count > 1 && !paused;

    const onIndexChangeRef = React.useRef(onIndexChange);
    onIndexChangeRef.current = onIndexChange;

    const go = React.useCallback(
      (next: number) => {
        if (!count) return;
        const i = ((next % count) + count) % count;
        setIndex(i);
        onIndexChangeRef.current?.(i, notices[i]!);
      },
      [count, notices]
    );

    React.useEffect(() => {
      if (!rotating) return;
      const t = window.setTimeout(() => go(safeIndex + 1), Math.max(1, interval) * 1000);
      return () => window.clearTimeout(t);
    }, [rotating, safeIndex, interval, go]);

    if (!current) return null;
    const tone = current.tone ?? "info";
    const Icon = toneIcon[tone];
    const promo = tone === "promo";
    const ctrl = cn(
      "inline-flex size-6 shrink-0 items-center justify-center rounded-sm transition-colors hover:bg-current/10 [&_svg]:size-4",
      focusRing,
      "focus-visible:ring-current/40"
    );

    const dismiss = () => {
      setHidden((s) => new Set(s).add(current.id));
      onDismiss?.(current.id);
    };

    return (
      <div
        ref={ref}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        data-tone={tone}
        data-paused={paused || undefined}
        className={cn(
          "z-40 flex w-full items-center gap-2 border-b px-3 py-1.5 text-sm transition-colors",
          toneClass[tone],
          sticky && "sticky top-0",
          className
        )}
        onMouseEnter={(e) => {
          setHovered(true);
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          setHovered(false);
          onMouseLeave?.(e);
        }}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      >
        {count > 1 && (
          <button type="button" className={ctrl} aria-label="Previous notice" onClick={() => go(safeIndex - 1)}>
            <RiArrowLeftSLine aria-hidden />
          </button>
        )}
        <div
          key={current.id}
          role="group"
          aria-roledescription="slide"
          aria-label={`${safeIndex + 1} of ${count}`}
          aria-live={rotating ? "off" : "polite"}
          data-notice={current.id}
          className="flex min-w-0 flex-1 items-center justify-center gap-2 motion-safe:animate-in motion-safe:fade-in-0"
        >
          {current.icon !== false && (
            <span aria-hidden className="flex shrink-0 [&_svg]:size-4">
              {current.icon ?? <Icon />}
            </span>
          )}
          <span className="min-w-0 truncate font-medium">{current.message}</span>
          {current.action &&
            (current.action.href ? (
              <a
                href={current.action.href}
                target={current.action.target}
                rel={current.action.rel}
                onClick={current.action.onClick}
                className={cn("inline-flex shrink-0 items-center gap-1 rounded-xs font-semibold underline-offset-4 hover:underline", focusRing)}
              >
                {current.action.label}
                <RiArrowRightLine aria-hidden className="size-3.5" />
              </a>
            ) : (
              <button
                type="button"
                onClick={current.action.onClick}
                className={cn("inline-flex shrink-0 items-center gap-1 rounded-xs font-semibold underline-offset-4 hover:underline", focusRing)}
              >
                {current.action.label}
                <RiArrowRightLine aria-hidden className="size-3.5" />
              </button>
            ))}
        </div>
        {count > 1 && (
          <>
            <div className="hidden items-center gap-1 sm:flex" role="group" aria-label="Choose notice">
              {notices.map((n, i) => (
                <button
                  key={n.id}
                  type="button"
                  aria-label={`Show notice ${i + 1} of ${count}`}
                  aria-current={i === safeIndex ? "true" : undefined}
                  onClick={() => go(i)}
                  className={cn("flex size-4 items-center justify-center rounded-full", focusRing)}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "block h-1.5 rounded-full bg-current transition-all",
                      i === safeIndex ? "w-3 opacity-90" : "w-1.5 opacity-35"
                    )}
                  />
                </button>
              ))}
            </div>
            <button type="button" className={ctrl} aria-label="Next notice" onClick={() => go(safeIndex + 1)}>
              <RiArrowRightSLine aria-hidden />
            </button>
          </>
        )}
        {current.dismissible !== false && (
          <button
            type="button"
            className={cn(ctrl, promo ? "text-primary-foreground/80" : "opacity-80")}
            aria-label="Dismiss notice"
            onClick={dismiss}
          >
            <RiCloseLine aria-hidden />
          </button>
        )}
      </div>
    );
  }
);
RotatingNoticeBar.displayName = "RotatingNoticeBar";
