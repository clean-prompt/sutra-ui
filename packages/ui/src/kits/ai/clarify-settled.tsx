import * as React from "react";
import { RiArrowRightSLine, RiCheckboxCircleFill, RiQuestionAnswerLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { Button } from "../../primitives/button";
import { useControllableState } from "../../hooks/use-controllable-state";

/* ------------------------------------------------------------------ */
/* ClarifySettled                                                      */
/* ------------------------------------------------------------------ */

export interface ClarifySettledItem {
  id: string;
  question: React.ReactNode;
  answer: React.ReactNode;
  /** The question was skipped instead of answered. */
  skipped?: boolean;
}

export interface ClarifySettledProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Answered questions to summarise, each with the question and the answer given. */
  items: ClarifySettledItem[];
  /** Summary line. Default "Answered n questions". */
  title?: React.ReactNode;
  /** Controlled expanded state of the answers list. */
  open?: boolean;
  /** Initial expanded state when `open` is not controlled. */
  defaultOpen?: boolean;
  /** Called with the new state when the user expands or collapses the list. */
  onOpenChange?: (open: boolean) => void;
  /** Shows an "Edit" button per answer. */
  onEdit?: (id: string) => void;
}

/** Collapsed summary of an answered clarifying-question card, expandable to the Q → A list. */
export const ClarifySettled = React.forwardRef<HTMLDivElement, ClarifySettledProps>(
  ({ items, title, open: openProp, defaultOpen = false, onOpenChange, onEdit, className, ...props }, ref) => {
    const [open, setOpen] = useControllableState<boolean>({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
    const listId = React.useId();
    const answered = items.filter((i) => !i.skipped).length;
    const summary = title ?? `Answered ${answered} ${answered === 1 ? "question" : "questions"}${items.length > answered ? ` · ${items.length - answered} skipped` : ""}`;
    return (
      <div ref={ref} data-slot="clarify-settled" data-state={open ? "open" : "closed"} className={cn("rounded-box border border-border bg-card text-sm", className)} {...props}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          onClick={() => setOpen(!open)}
          className={cn("flex w-full items-center gap-2 rounded-box px-3 py-2 text-start text-muted-foreground transition-colors hover:text-foreground", focusRing)}
        >
          <RiCheckboxCircleFill aria-hidden className="size-4 shrink-0 text-success" />
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">{summary}</span>
          <RiArrowRightSLine aria-hidden className={cn("size-4 shrink-0 chevron-turn rtl:-scale-x-100", open && "rotate-90 rtl:-rotate-90")} />
        </button>
        {open && (
          <ol id={listId} className="flex flex-col gap-2 border-t border-border px-3 py-2.5">
            {items.map((it) => (
              <li key={it.id} className="flex items-start gap-2">
                <RiQuestionAnswerLine aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-muted-foreground">{it.question}</div>
                  <div className={cn("font-medium text-foreground", it.skipped && "font-normal italic text-muted-foreground")}>
                    {it.skipped ? "Skipped" : it.answer}
                  </div>
                </div>
                {onEdit && (
                  <Button size="xs" variant="ghost" onClick={() => onEdit(it.id)} className="h-6 shrink-0">
                    Edit
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }
);
ClarifySettled.displayName = "ClarifySettled";
