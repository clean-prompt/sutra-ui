import * as React from "react";
import { RiCalendarLine, RiChat3Line, RiCheckboxMultipleLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { formatShortDate, toValidDate } from "../lib/time";
import { normalizeTaskStatus, type TaskStatus } from "../lib/status";
import { Badge, type BadgeColor } from "./badge";
import { Avatar } from "./avatar";
import { AgentAvatar, randomAvatarSpec } from "./agent-avatar";
import { isKanbanOverdue, type KanbanAssignee, type KanbanCardData, type KanbanLabel, type KanbanPriority, type KanbanRunStatusInput } from "./kanban-model";
import { priorityLabel } from "./kanban-internal";

/* ------------------------------------------------------------------ */
/* Small parts                                                         */
/* ------------------------------------------------------------------ */

export interface KanbanPriorityIconProps extends React.SVGAttributes<SVGSVGElement> {
  priority: KanbanPriority;
}

/** Linear-style priority glyph (bars, or an alert square for urgent). */
export const KanbanPriorityIcon = React.forwardRef<SVGSVGElement, KanbanPriorityIconProps>(
  ({ priority, className, ...props }, ref) => {
    const level = { urgent: 4, high: 3, medium: 2, low: 1, none: 0 }[priority];
    return (
      <svg
        ref={ref}
        viewBox="0 0 16 16"
        role="img"
        aria-label={`Priority: ${priorityLabel[priority]}`}
        className={cn("size-4 shrink-0", priority === "urgent" ? "text-destructive" : "text-muted-foreground", className)}
        {...props}
      >
        {priority === "urgent" ? (
          <>
            <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="currentColor" />
            <rect x="7.1" y="4" width="1.8" height="5.2" rx="0.9" fill="var(--background)" />
            <circle cx="8" cy="11.3" r="1" fill="var(--background)" />
          </>
        ) : priority === "none" ? (
          [3, 7, 11].map((x) => <rect key={x} x={x} y="7.2" width="2.4" height="1.6" rx="0.8" fill="currentColor" opacity={0.6} />)
        ) : (
          [0, 1, 2].map((i) => (
            <rect
              key={i}
              x={2.5 + i * 4}
              y={12 - (i + 1) * 3}
              width="3"
              height={(i + 1) * 3 + 1}
              rx="0.8"
              fill="currentColor"
              opacity={i < level ? 1 : 0.25}
            />
          ))
        )}
      </svg>
    );
  }
);
KanbanPriorityIcon.displayName = "KanbanPriorityIcon";

export interface KanbanAssigneeAvatarProps {
  assignee: KanbanAssignee;
  /** Pixel size. Default 20. */
  size?: number;
  className?: string;
}

/** Human `Avatar` or procedural `AgentAvatar` for agent assignees. The ref points at the rendered `<span>` or `<svg>`. */
export const KanbanAssigneeAvatar = React.forwardRef<HTMLSpanElement | SVGSVGElement, KanbanAssigneeAvatarProps>(
  ({ assignee, size = 20, className }, ref) => {
    if (assignee.kind === "agent") {
      return (
        <AgentAvatar
          ref={ref as React.Ref<SVGSVGElement>}
          spec={assignee.avatar ?? randomAvatarSpec(assignee.id)}
          size={size}
          label={`${assignee.name} (agent)`}
          className={cn("shrink-0", className)}
        />
      );
    }
    return (
      <Avatar
        ref={ref as React.Ref<HTMLSpanElement>}
        name={assignee.name}
        src={assignee.avatarSrc}
        size={size <= 20 ? "xs" : size <= 32 ? "sm" : "md"}
        className={cn("shrink-0", className)}
      />
    );
  }
);
KanbanAssigneeAvatar.displayName = "KanbanAssigneeAvatar";

const runBadge: Record<TaskStatus, { label: string; color: BadgeColor }> = {
  pending: { label: "Queued", color: "neutral" },
  running: { label: "Agent running", color: "info" },
  succeeded: { label: "Run succeeded", color: "success" },
  failed: { label: "Run failed", color: "destructive" },
  canceled: { label: "Run canceled", color: "gray" },
};

export interface KanbanRunBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children" | "color"> {
  /** Run status; canonical `TaskStatus` names or legacy spellings (`queued`, `cancelled`). */
  status: KanbanRunStatusInput;
}

/** Badge for the status of an agent run (running shimmers, failed is red). */
export const KanbanRunBadge = React.forwardRef<HTMLSpanElement, KanbanRunBadgeProps>(({ status, className, ...props }, ref) => {
  const s = normalizeTaskStatus(status);
  const b = runBadge[s];
  return (
    <Badge ref={ref} size="sm" color={b.color} className={className} data-run-status={status} {...props}>
      {s === "running" ? (
        <span className="inline-flex items-center gap-1">
          <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" />
          <span className="text-shimmer motion-reduce:animate-none">{b.label}</span>
        </span>
      ) : (
        b.label
      )}
    </Badge>
  );
});
KanbanRunBadge.displayName = "KanbanRunBadge";

/* ------------------------------------------------------------------ */
/* KanbanCard                                                          */
/* ------------------------------------------------------------------ */

export interface KanbanCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClick"> {
  card: KanbanCardData;
  assignee?: KanbanAssignee;
  labels?: KanbanLabel[];
  /** The card's column counts as done. */
  done?: boolean;
  /** Reference time for the overdue check. */
  now?: Date | number;
  locale?: string;
  onOpen?: () => void;
  /** Actions rendered top-right (e.g. a menu). */
  actions?: React.ReactNode;
  /** Props for the full-card activator button (drag listeners, aria). */
  activatorProps?: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>;
  activatorRef?: React.Ref<HTMLButtonElement>;
  /** Rendered as a drop placeholder. */
  placeholder?: boolean;
  /** Rendered in the drag overlay. */
  overlay?: boolean;
}

/** Task card: labels, title, priority, assignee (human or agent), due date, subtasks, comments, run status. */
export const KanbanCard = React.forwardRef<HTMLDivElement, KanbanCardProps>(
  (
    {
      card,
      assignee,
      labels = [],
      done,
      now,
      locale,
      onOpen,
      actions,
      activatorProps,
      activatorRef,
      placeholder,
      overlay,
      className,
      ...props
    },
    ref
  ) => {
    const metaId = React.useId();
    const overdue = isKanbanOverdue(card, now ?? Date.now(), done);
    const due = toValidDate(card.dueDate);
    const dueText = due ? formatShortDate(due, { locale, year: "never" }) : "";
    const cardLabels = (card.labels ?? []).map((id) => labels.find((l) => l.id === id) ?? { id, name: id });
    const { "aria-describedby": dndDescribedBy, role: _role, ...restActivator } = activatorProps ?? {};
    return (
      <div
        ref={ref}
        data-kanban-card={card.id}
        data-overdue={overdue || undefined}
        className={cn(
          "group/card relative rounded-box border border-border bg-card p-3 text-left shadow-xs transition-[box-shadow,border-color,opacity]",
          "hover:border-border-strong hover:shadow-sm",
          placeholder && "opacity-40",
          overlay && "rotate-1 cursor-grabbing shadow-xl ring-2 ring-primary/30",
          card.runStatus && normalizeTaskStatus(card.runStatus) === "failed" && "border-destructive/40",
          className
        )}
        {...props}
      >
        <button
          type="button"
          ref={activatorRef}
          data-kanban-activator={card.id}
          aria-label={card.title}
          aria-describedby={cn(metaId, typeof dndDescribedBy === "string" && dndDescribedBy) || undefined}
          {...(restActivator as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          onClick={(e) => {
            (restActivator.onClick as React.MouseEventHandler<HTMLButtonElement> | undefined)?.(e);
            if (!e.defaultPrevented) onOpen?.();
          }}
          onKeyUp={(e) => {
            if (e.key === " ") e.preventDefault();
          }}
          className={cn(
            "absolute inset-0 rounded-box",
            overlay ? "cursor-grabbing" : onOpen ? "cursor-pointer active:cursor-grabbing" : "cursor-grab",
            focusRing
          )}
        />
        <div id={metaId} aria-hidden className="pointer-events-none relative flex flex-col gap-2">
          {cardLabels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="sr-only">Labels:</span>
              {cardLabels.map((l) => (
                <Badge key={l.id} size="sm" color={l.color ?? "neutral"}>
                  {l.name}
                </Badge>
              ))}
            </div>
          )}
          <p className={cn("line-clamp-3 text-sm font-medium text-foreground", actions && "pr-6")}>{card.title}</p>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-muted-foreground">
            {card.priority && card.priority !== "none" && (
              <span className="inline-flex items-center">
                <KanbanPriorityIcon priority={card.priority} aria-hidden />
                <span className="sr-only">Priority {priorityLabel[card.priority]}.</span>
              </span>
            )}
            {due && (
              <span
                data-testid="kanban-due"
                className={cn("inline-flex items-center gap-1", overdue && "font-medium text-destructive")}
              >
                <RiCalendarLine aria-hidden className="size-3.5" />
                {overdue && <span className="sr-only">Overdue, due</span>}
                {!overdue && <span className="sr-only">Due</span>}
                {dueText}
              </span>
            )}
            {card.subtasks && card.subtasks.total > 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 tabular-nums",
                  card.subtasks.done >= card.subtasks.total && "text-success"
                )}
              >
                <RiCheckboxMultipleLine aria-hidden className="size-3.5" />
                <span className="sr-only">Subtasks</span>
                {card.subtasks.done}/{card.subtasks.total}
              </span>
            )}
            {!!card.commentCount && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <RiChat3Line aria-hidden className="size-3.5" />
                {card.commentCount}
                <span className="sr-only">comments</span>
              </span>
            )}
            {card.runStatus && <KanbanRunBadge status={card.runStatus} />}
            {assignee && (
              <span className="ml-auto inline-flex items-center gap-1">
                <span className="sr-only">Assigned to {assignee.name}</span>
                <KanbanAssigneeAvatar assignee={assignee} size={20} />
              </span>
            )}
          </div>
        </div>
        {actions && <div className="absolute right-1.5 top-1.5">{actions}</div>}
      </div>
    );
  }
);
KanbanCard.displayName = "KanbanCard";
