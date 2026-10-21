import * as React from "react";
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCheckLine,
  RiCloseLine,
  RiCornerDownLeftLine,
  RiDeleteBinLine,
  RiPencilLine,
  RiSteering2Line,
  RiTimeLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { Button } from "../../primitives/button";
import { useControllableState } from "../../hooks/use-controllable-state";
import { clamp } from "../../lib/math";
import { SimpleTooltip } from "../../primitives/tooltip";
import { iconAction } from "./agent-composer-internal";

/* ------------------------------------------------------------------ */
/* QueuedMessages                                                      */
/* ------------------------------------------------------------------ */

export interface QueuedMessage {
  id: string;
  text: string;
  /** Number of attachments sent with the message (shown as a hint). */
  attachments?: number;
}

export interface QueuedMessagesProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
  /** Messages waiting to be sent, in send order. */
  items: QueuedMessage[];
  /** Saves an inline edit. Editing is disabled when unset. */
  onEdit?: (id: string, text: string) => void;
  /** Called with the message id when the user removes it from the queue; the button is hidden when unset. */
  onRemove?: (id: string) => void;
  /** Interrupt the agent and send this message now. */
  onSendNow?: (id: string) => void;
  /** Inject this message into the live turn without interrupting it ("Steer"). */
  onSteer?: (id: string) => void;
  /** Tooltip for the Steer action. */
  steerHint?: React.ReactNode;
  /** Enables move up / down (buttons and Alt+↑/↓) and reports the new order. */
  onReorder?: (ids: string[]) => void;
  /** Controlled collapsed state; collapsed shows only the count pill. */
  collapsed?: boolean;
  /** Initial collapsed state when `collapsed` is not controlled. */
  defaultCollapsed?: boolean;
  /** Called with the new state when the user expands or collapses the list. */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Pill label. Default `${n} queued`. */
  formatCount?: (count: number) => string;
}

/** Messages typed while the agent is busy: inline edit, remove, send now (interrupt), reorder, and a collapsible "n queued" pill. */
export const QueuedMessages = React.forwardRef<HTMLElement, QueuedMessagesProps>(
  (
    {
      items,
      onEdit,
      onRemove,
      onSendNow,
      onSteer,
      steerHint = "Steer: add this to the current turn so the agent adjusts course without stopping. Send now interrupts and starts a new turn.",
      onReorder,
      collapsed: collapsedProp,
      defaultCollapsed = false,
      onCollapsedChange,
      formatCount = (n) => `${n} queued`,
      className,
      ...props
    },
    ref
  ) => {
    const [collapsed, setCollapsed] = useControllableState<boolean>({
      value: collapsedProp,
      defaultValue: defaultCollapsed,
      onChange: onCollapsedChange,
    });
    const [editing, setEditing] = React.useState<string | null>(null);
    const [draft, setDraft] = React.useState("");
    const listId = React.useId();

    if (items.length === 0) return null;

    const move = (index: number, delta: number) => {
      const target = index + delta;
      if (!onReorder || target < 0 || target >= items.length) return;
      const ids = items.map((i) => i.id);
      [ids[index], ids[target]] = [ids[target], ids[index]];
      onReorder(ids);
    };
    const save = (id: string) => {
      const text = draft.trim();
      if (text) onEdit?.(id, text);
      else onRemove?.(id);
      setEditing(null);
    };

    return (
      <section
        ref={ref}
        aria-label="Queued messages"
        data-collapsed={collapsed ? "" : undefined}
        className={cn("flex flex-col gap-1.5", className)}
        {...props}
      >
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={collapsed ? undefined : listId}
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "inline-flex h-6 w-fit items-center gap-1 rounded-control border border-border bg-subtle px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
            focusRing
          )}
        >
          <RiTimeLine aria-hidden className="size-3.5" />
          {formatCount(items.length)}
          {collapsed ? <RiArrowUpSLine aria-hidden className="size-3.5" /> : <RiArrowDownSLine aria-hidden className="size-3.5" />}
        </button>
        {!collapsed && (
          <ul id={listId} className="flex flex-col gap-1">
            {items.map((item, index) => {
              const isEditing = editing === item.id;
              return (
                <li
                  key={item.id}
                  data-queued-id={item.id}
                  tabIndex={onReorder ? -1 : undefined}
                  onKeyDown={(e) => {
                    if (!onReorder || !e.altKey || isEditing) return;
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      move(index, -1);
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      move(index, 1);
                    }
                  }}
                  className="group/queued flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1 rounded-box border border-dashed border-border bg-card px-2.5 py-1.5 text-sm shadow-xs outline-none"
                >
                  <span className="mt-0.5 shrink-0 rounded-xs bg-muted px-1.5 py-px text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                    Queued
                  </span>
                  {isEditing ? (
                    <div className="flex min-w-0 flex-1 items-start gap-1">
                      <textarea
                        autoFocus
                        aria-label="Edit queued message"
                        value={draft}
                        rows={clamp(draft.split("\n").length, 1, 4)}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            save(item.id);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            setEditing(null);
                          }
                        }}
                        className={cn(
                          "scrollbar-thin min-w-0 flex-1 resize-none rounded-xs border border-input bg-background px-1.5 py-0.5 text-sm leading-5 outline-none",
                          focusRing
                        )}
                      />
                      <button type="button" aria-label="Save" title="Save (Enter)" onClick={() => save(item.id)} className={iconAction}>
                        <RiCheckLine aria-hidden />
                      </button>
                      <button type="button" aria-label="Cancel" title="Cancel (Esc)" onClick={() => setEditing(null)} className={iconAction}>
                        <RiCloseLine aria-hidden />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 basis-32 truncate leading-5 text-foreground" title={item.text}>
                        {item.text}
                        {item.attachments ? (
                          <span className="ms-1.5 text-xs text-muted-foreground">
                            +{item.attachments} {item.attachments === 1 ? "attachment" : "attachments"}
                          </span>
                        ) : null}
                      </span>
                      <span className="ms-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-0.5">
                        {onReorder && (
                          <>
                            <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)} className={iconAction}>
                              <RiArrowUpSLine aria-hidden />
                            </button>
                            <button
                              type="button"
                              aria-label="Move down"
                              disabled={index === items.length - 1}
                              onClick={() => move(index, 1)}
                              className={iconAction}
                            >
                              <RiArrowDownSLine aria-hidden />
                            </button>
                          </>
                        )}
                        {onEdit && (
                          <button
                            type="button"
                            aria-label="Edit"
                            title="Edit"
                            onClick={() => {
                              setDraft(item.text);
                              setEditing(item.id);
                            }}
                            className={iconAction}
                          >
                            <RiPencilLine aria-hidden />
                          </button>
                        )}
                        {onRemove && (
                          <button type="button" aria-label="Remove" title="Remove" onClick={() => onRemove(item.id)} className={iconAction}>
                            <RiDeleteBinLine aria-hidden />
                          </button>
                        )}
                        {onSteer && (
                          <SimpleTooltip content={<span className="block max-w-60">{steerHint}</span>}>
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              leadingIcon={<RiSteering2Line aria-hidden />}
                              onClick={() => onSteer(item.id)}
                              className="ms-0.5 h-6"
                            >
                              Steer
                            </Button>
                          </SimpleTooltip>
                        )}
                        {onSendNow && (
                          <Button
                            type="button"
                            size="xs"
                            variant="soft"
                            leadingIcon={<RiCornerDownLeftLine aria-hidden />}
                            onClick={() => onSendNow(item.id)}
                            className="ms-0.5 h-6"
                            title="Interrupt the agent and send this now"
                          >
                            Send now
                          </Button>
                        )}
                      </span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  }
);
QueuedMessages.displayName = "QueuedMessages";

