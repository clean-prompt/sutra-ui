import * as React from "react";
import { RiArrowLeftSLine, RiArrowRightSLine, RiSparkling2Line } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { TONES, normalizeTone, type Tone, type ToneInput } from "../lib/tone";
import { usePrefersReducedMotion } from "../hooks/use-media-query";
import { useLatestRef } from "../hooks/use-iso-layout-effect";
import { AlertBanner, type AlertBannerAppearance, type BannerAction } from "../primitives/alert-banner";

/** @deprecated Use `Tone` (notices accept every canonical tone). */
export type NoticeCanonicalTone = Tone;
/**
 * Tone of a notice: any `ToneInput` (`warn` → `warning` and `error` → `destructive` are deprecated spellings),
 * plus the deprecated `promo` (now `primary`, which keeps the solid promotional fill).
 */
export type NoticeTone = ToneInput | "promo";

/** Map any accepted notice tone spelling to its canonical `Tone` (unknown → `info`). */
export function normalizeNoticeTone(tone: NoticeTone | string | null | undefined): Tone {
  if (tone === "promo") return "primary";
  const t = normalizeTone(tone, "info");
  return (TONES as readonly string[]).includes(t) ? t : "info";
}

/** @deprecated Use `BannerAction` from `alert-banner`. */
export type NoticeAction = BannerAction;

export interface NoticeItem {
  id: string;
  message: React.ReactNode;
  tone?: NoticeTone;
  /** Fill style. Default `solid` for `primary` (promotional), `soft` for every other tone. */
  appearance?: AlertBannerAppearance;
  /** Custom icon; `false` hides it. */
  icon?: React.ReactNode | false;
  action?: BannerAction;
  /** Default true. */
  dismissible?: boolean;
  /** Higher first. Default 0. */
  priority?: number;
}

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
  const onDismissRef = useLatestRef(onDismiss);

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


export interface RotatingNoticeBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Notices to rotate through; each has an `id` and `content`, with optional tone and action. */
  notices: NoticeItem[];
  /** Seconds per notice. Default 6. */
  interval?: number;
  /** Default true. Always off under prefers-reduced-motion. */
  autoRotate?: boolean;
  /** Persist a dismissal (the bar hides it locally either way). */
  onDismiss?: (id: string) => void;
  /** Called with the shown index and the notice when the rotation advances or the user pages. */
  onIndexChange?: (index: number, notice: NoticeItem) => void;
  /** Stick to the top. Default false. */
  sticky?: boolean;
  /** Accessible name of the notice region. */
  label?: string;
}

/** Global notice strip that rotates through notices with a dot pager, pausing on hover or focus. Renders an `AlertBanner`. */
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

    const onIndexChangeRef = useLatestRef(onIndexChange);

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
    const tone = normalizeNoticeTone(current.tone);
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
      <AlertBanner
        ref={ref}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        data-tone={current.tone ?? "info"}
        data-paused={paused || undefined}
        tone={tone}
        appearance={current.appearance ?? (tone === "primary" ? "solid" : "soft")}
        sticky={sticky}
        icon={current.icon === undefined && tone === "primary" ? <RiSparkling2Line /> : current.icon}
        message={current.message}
        action={current.action}
        dismissible={current.dismissible !== false}
        open
        onDismiss={dismiss}
        dismissLabel="Dismiss notice"
        className={cn("gap-2 py-1.5 transition-colors", className)}
        contentKey={current.id}
        contentProps={{
          role: "group",
          "aria-roledescription": "slide",
          "aria-label": `${safeIndex + 1} of ${count}`,
          "aria-live": rotating ? "off" : "polite",
          "data-notice": current.id,
          className: "flex-1 flex-nowrap justify-center gap-x-2 motion-safe:animate-in motion-safe:fade-in-0 [&>div]:truncate",
        }}
        leading={
          count > 1 ? (
            <button type="button" className={ctrl} aria-label="Previous notice" onClick={() => go(safeIndex - 1)}>
              <RiArrowLeftSLine className="rtl:-scale-x-100" aria-hidden />
            </button>
          ) : null
        }
        trailing={
          count > 1 ? (
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
                        "block h-1.5 rounded-full bg-current transition-[width,opacity]",
                        i === safeIndex ? "w-3 opacity-90" : "w-1.5 opacity-35"
                      )}
                    />
                  </button>
                ))}
              </div>
              <button type="button" className={ctrl} aria-label="Next notice" onClick={() => go(safeIndex + 1)}>
                <RiArrowRightSLine className="rtl:-scale-x-100" aria-hidden />
              </button>
            </>
          ) : null
        }
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
      />
    );
  }
);
RotatingNoticeBar.displayName = "RotatingNoticeBar";
