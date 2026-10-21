import * as React from "react";
import { RiCloseLine, RiDraggable } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { formatClock } from "../../lib/duration";
import { useDrag, type UseDragOptions } from "../../hooks/use-drag";
import { mediaButtonVariants } from "./media-controls-base";
import { NowPlayingBars } from "./media-controls-indicators";
import type { PlayerTrack } from "./audio-player-model";
import { TrackArtwork, trackByline } from "./audio-player-internal";

/**
 * The drag handle of one queue row (private). One `useDrag` per row: a bare handle, so the pointer is captured on the press and the drag
 * starts on the first move; the row decides the drop position from the pointer's y, so the list is not moved while dragging.
 */
function QueueHandle({
  label,
  hintId,
  onStart,
  onMove,
  onEnd,
  onKeyDown,
}: Pick<UseDragOptions, "onStart" | "onMove" | "onEnd"> & {
  label: string;
  hintId: string;
  onKeyDown: React.KeyboardEventHandler<HTMLButtonElement>;
}) {
  const drag = useDrag({ axis: "both", threshold: 0, captureOnPress: true, onDown: (e) => e.preventDefault(), onStart, onMove, onEnd });
  return (
    <button
      ref={drag.ref}
      {...drag.handlers}
      type="button"
      data-slot="queue-handle"
      aria-label={label}
      aria-describedby={hintId}
      onKeyDown={onKeyDown}
      className={cn(
        "grid h-10 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-sm text-muted-foreground/70 hover:text-foreground active:cursor-grabbing",
        focusRing
      )}
    >
      <RiDraggable aria-hidden className="size-4" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* QueueList                                                           */
/* ------------------------------------------------------------------ */

export interface QueueListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** Tracks in the queue, in play order. */
  items: PlayerTrack[];
  /** Id of the track that is current; its row is highlighted. */
  currentId?: string | null;
  /** Whether the current track is playing; animates the now-playing bars on its row. */
  playing?: boolean;
  /** Tap a row to jump to it. */
  onSelect?: (item: PlayerTrack, index: number) => void;
  /** Called with the track and its index when the user removes a row; the remove action is hidden when unset. */
  onRemove?: (item: PlayerTrack, index: number) => void;
  /** Enables drag handles and Alt+↑/↓. Indices are positions in `items`. */
  onReorder?: (from: number, to: number) => void;
  /** Accessible list name. Default "Queue". */
  label?: string;
  /** Shown when the queue is empty. Default "Nothing queued". */
  emptyState?: React.ReactNode;
  /** Content shown when there is nothing to list. @deprecated Use `emptyState`. */
  emptyMessage?: React.ReactNode;
}

/** Reorderable queue: current row marked with NowPlayingBars, tap to jump, remove, drag or Alt+↑/↓ to reorder. */
export const QueueList = React.forwardRef<HTMLDivElement, QueueListProps>(
  (
    { items, currentId, playing = false, onSelect, onRemove, onReorder, label = "Queue", emptyState, emptyMessage, className, ...props },
    ref
  ) => {
    const listRef = React.useRef<HTMLUListElement | null>(null);
    const [announcement, setAnnouncement] = React.useState("");
    const [drag, setDrag] = React.useState<{ from: number; over: number; id: string } | null>(null);
    const pendingFocus = React.useRef<{ id: string; slot: string } | null>(null);
    const hintId = React.useId();

    const announceMove = (item: PlayerTrack, to: number) =>
      setAnnouncement(`Moved ${item.title} to position ${to + 1} of ${items.length}`);

    React.useLayoutEffect(() => {
      const p = pendingFocus.current;
      if (!p || !listRef.current) return;
      pendingFocus.current = null;
      const row = Array.from(listRef.current.querySelectorAll<HTMLElement>("[data-queue-id]")).find((el) => el.dataset.queueId === p.id);
      row?.querySelector<HTMLElement>(`[data-slot="${p.slot}"]`)?.focus();
    }, [items]);

    const indicator = (key: string) => (
      <li key={key} aria-hidden data-slot="queue-drop-indicator" className="pointer-events-none -my-px h-0.5 rounded-full bg-primary" />
    );
    let otherIndex = -1;

    const overIndexAt = (clientY: number, draggedId: string) => {
      const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-queue-id]") ?? []);
      let count = 0;
      for (const row of rows) {
        if (row.dataset.queueId === draggedId) continue;
        const r = row.getBoundingClientRect();
        if (clientY > r.top + r.height / 2) count++;
      }
      return Math.min(items.length - 1, count);
    };

    if (!items.length) {
      return (
        <div ref={ref} className={cn("py-6 text-center text-sm text-muted-foreground", className)} {...props}>
          {emptyState ?? emptyMessage ?? "Nothing queued"}
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("relative", className)} {...props}>
        {onReorder && (
          <span id={hintId} className="sr-only">
            Press Alt plus Arrow Up or Arrow Down to move this track.
          </span>
        )}
        <ul ref={listRef} aria-label={label} className="flex flex-col gap-0.5">
          {items.map((item, index) => {
            const current = item.id === currentId;
            const dragging = drag?.id === item.id;
            if (!dragging) otherIndex++;
            const showIndicator = !!drag && !dragging && drag.from !== drag.over && otherIndex === drag.over;
            return (
              <React.Fragment key={item.id}>
                {showIndicator && indicator(`drop-${item.id}`)}
                <li
                  data-queue-id={item.id}
                  data-current={current ? "" : undefined}
                  data-dragging={dragging ? "" : undefined}
                  onKeyDown={(e) => {
                    if (!onReorder || !e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
                    e.preventDefault();
                    const to = e.key === "ArrowUp" ? index - 1 : index + 1;
                    if (to < 0 || to >= items.length) return;
                    const slot = (e.target as HTMLElement).closest<HTMLElement>("[data-slot]")?.dataset.slot ?? "queue-select";
                    pendingFocus.current = { id: item.id, slot };
                    onReorder(index, to);
                    announceMove(item, to);
                  }}
                  className={cn(
                    "group/queue relative flex items-center gap-1 rounded-control pe-1 transition-colors",
                    current ? "bg-primary-soft/60" : "hover:bg-accent",
                    dragging && "z-10 bg-background opacity-70 shadow-lg ring-1 ring-border"
                  )}
                >
                  {onReorder && (
                    <QueueHandle
                      label={`Reorder ${item.title}`}
                      hintId={hintId}
                      onStart={() => setDrag({ from: index, over: index, id: item.id })}
                      onMove={(info) => {
                        const over = overIndexAt(info.startY + info.dy, item.id);
                        setDrag((d) => (d && d.over !== over ? { ...d, over } : d));
                      }}
                      onEnd={(info, cancelled) => {
                        setDrag(null);
                        if (cancelled) return;
                        const over = overIndexAt(info.startY + info.dy, item.id);
                        if (index !== over) {
                          onReorder(index, over);
                          announceMove(item, over);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.altKey) return;
                        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                          e.preventDefault();
                          const to = e.key === "ArrowUp" ? index - 1 : index + 1;
                          if (to < 0 || to >= items.length) return;
                          pendingFocus.current = { id: item.id, slot: "queue-handle" };
                          onReorder(index, to);
                          announceMove(item, to);
                        }
                      }}
                    />
                  )}
                  <button
                    type="button"
                    data-slot="queue-select"
                    aria-current={current ? "true" : undefined}
                    disabled={item.unavailable}
                    onClick={() => onSelect?.(item, index)}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-3 rounded-control py-1.5 text-start disabled:opacity-50",
                      !onReorder && "ps-2",
                      focusRing
                    )}
                  >
                    <span className="relative shrink-0">
                      <TrackArtwork src={item.artwork} className="size-10" />
                      {current && (
                        <span className="absolute inset-0 grid place-items-center rounded-md bg-black/45 text-white">
                          <NowPlayingBars playing={playing} className="text-white" />
                        </span>
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={cn("truncate text-sm font-medium", current ? "text-primary" : "text-foreground")}>{item.title}</span>
                      <span className="truncate text-xs text-muted-foreground">{trackByline(item)}</span>
                    </span>
                    {item.duration !== undefined && (
                      <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{formatClock(item.duration)}</span>
                    )}
                  </button>
                  {onRemove && (
                    <button
                      type="button"
                      data-slot="queue-remove"
                      aria-label={`Remove ${item.title} from queue`}
                      onClick={() => onRemove(item, index)}
                      className={cn(
                        mediaButtonVariants({ size: "sm" }),
                        "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/queue:opacity-100 focus-visible:opacity-100"
                      )}
                    >
                      <RiCloseLine aria-hidden />
                    </button>
                  )}
                </li>
              </React.Fragment>
            );
          })}
          {drag && drag.from !== drag.over && drag.over >= items.length - 1 && indicator("drop-end")}
        </ul>
        <div aria-live="polite" aria-atomic="true" className="sr-only" data-slot="queue-announcer">
          {announcement}
        </div>
      </div>
    );
  }
);
QueueList.displayName = "QueueList";
