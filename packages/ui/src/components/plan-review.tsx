import * as React from "react";
import {
  RiArrowDownSLine,
  RiChatQuoteLine,
  RiCheckLine,
  RiCloseLine,
  RiMap2Line,
  RiQuestionAnswerLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { pluralize } from "../lib/format";
import { useControllableState } from "../hooks/use-controllable-state";
import { Button } from "./button";
import { CommentComposer } from "./comments";
import { Markdown } from "./markdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export interface PlanComment {
  id: string;
  /** Selected plan text the comment refers to. */
  quote: string;
  body: string;
}

export interface PlanNextModeOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
}

export const defaultPlanNextModes: PlanNextModeOption[] = [
  { value: "acceptEdits", label: "Auto-accept edits", description: "Apply file edits without asking" },
  { value: "manual", label: "Review each edit", description: "Ask before every edit" },
];

export type PlanReviewOutcome =
  | { type: "approved"; mode?: string }
  | { type: "feedback"; comments: PlanComment[]; message?: string };

export interface PlanApproval {
  mode?: string;
  comments: PlanComment[];
}

/** Truncate a quote to `max` characters with an ellipsis. */
export function truncatePlanQuote(text: string, max = 80) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export interface PlanReviewCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Plan body (Markdown). */
  plan: string;
  title?: React.ReactNode;
  comments?: PlanComment[];
  defaultComments?: PlanComment[];
  onCommentsChange?: (comments: PlanComment[]) => void;
  /** Mode options offered after approval. `[]` hides the picker. */
  nextModes?: PlanNextModeOption[];
  nextMode?: string;
  defaultNextMode?: string;
  onNextModeChange?: (mode: string) => void;
  onApprove?: (approval: PlanApproval) => void;
  /** "Keep planning": sends the comments (and optional message) back as feedback. */
  onFeedback?: (comments: PlanComment[], message: string) => void;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Recorded outcome: renders read-only. */
  outcome?: PlanReviewOutcome | null;
  readOnly?: boolean;
  /** Max quote length shown in the composer and list. Default 80. */
  quoteLength?: number;
  /** Max height (px) of the collapsed plan. Default 240. */
  collapsedHeight?: number;
}

let planCommentSeq = 0;

/** Agent plan in a card: select text to comment, then approve (choosing the next mode) or keep planning. */
export const PlanReviewCard = React.forwardRef<HTMLDivElement, PlanReviewCardProps>(
  (
    {
      plan,
      title = "Plan",
      comments: commentsProp,
      defaultComments = [],
      onCommentsChange,
      nextModes = defaultPlanNextModes,
      nextMode: nextModeProp,
      defaultNextMode,
      onNextModeChange,
      onApprove,
      onFeedback,
      expanded: expandedProp,
      defaultExpanded = true,
      onExpandedChange,
      outcome: outcomeProp,
      readOnly: readOnlyProp = false,
      quoteLength = 80,
      collapsedHeight = 240,
      className,
      ...props
    },
    ref
  ) => {
    const uid = React.useId();
    const titleId = `${uid}-title`;
    const contentRef = React.useRef<HTMLDivElement>(null);
    const cardRef = React.useRef<HTMLDivElement>(null);
    React.useImperativeHandle(ref, () => cardRef.current as HTMLDivElement);

    const [comments, setComments] = useControllableState({ value: commentsProp, defaultValue: defaultComments, onChange: onCommentsChange });
    const [nextMode, setNextMode] = useControllableState({
      value: nextModeProp,
      defaultValue: defaultNextMode ?? nextModes[0]?.value ?? "",
      onChange: onNextModeChange,
    });
    const [expanded, setExpanded] = useControllableState({ value: expandedProp, defaultValue: defaultExpanded, onChange: onExpandedChange });
    const [localOutcome, setLocalOutcome] = React.useState<PlanReviewOutcome | null>(null);
    const outcome = outcomeProp ?? localOutcome;
    const readOnly = readOnlyProp || outcome != null;

    const [selection, setSelection] = React.useState<{ text: string; top: number; left: number } | null>(null);
    const [draftQuote, setDraftQuote] = React.useState<string | null>(null);
    const [message, setMessage] = React.useState("");

    const readSelection = () => {
      if (readOnly || typeof window === "undefined") return;
      const sel = window.getSelection?.();
      const text = sel?.toString().trim() ?? "";
      const content = contentRef.current;
      if (!sel || sel.isCollapsed || !text || !content || !sel.anchorNode || !content.contains(sel.anchorNode)) {
        setSelection(null);
        return;
      }
      let top = 0;
      let left = 0;
      const card = cardRef.current;
      if (sel.rangeCount && card) {
        const rect = sel.getRangeAt(0).getBoundingClientRect?.();
        const base = card.getBoundingClientRect();
        if (rect) {
          top = rect.top - base.top - 36;
          left = rect.left - base.left + rect.width / 2;
        }
      }
      setSelection({ text, top: Math.max(0, top), left: Math.max(0, left) });
    };

    const startComment = () => {
      if (!selection) return;
      setDraftQuote(selection.text);
      setSelection(null);
      window.getSelection?.()?.removeAllRanges?.();
    };

    const addComment = (body: string) => {
      if (draftQuote == null) return;
      setComments([...comments, { id: `plan-comment-${++planCommentSeq}`, quote: draftQuote, body }]);
      setDraftQuote(null);
    };

    const approve = () => {
      const mode = nextModes.length ? nextMode : undefined;
      setLocalOutcome({ type: "approved", mode });
      onApprove?.({ mode, comments });
    };

    const keepPlanning = () => {
      const msg = message.trim();
      setLocalOutcome({ type: "feedback", comments, message: msg || undefined });
      onFeedback?.(comments, msg);
    };

    const currentMode = nextModes.find((m) => m.value === nextMode);
    const outcomeMode = outcome?.type === "approved" ? nextModes.find((m) => m.value === outcome.mode) : undefined;

    return (
      <div
        ref={cardRef}
        role="group"
        aria-labelledby={titleId}
        data-slot="plan-review"
        data-outcome={outcome?.type}
        data-expanded={expanded ? "" : undefined}
        className={cn("relative w-full overflow-hidden rounded-box border border-border bg-card text-card-foreground shadow-xs", className)}
        {...props}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-2.5">
          <span aria-hidden className="flex size-6 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground [&_svg]:size-3.5">
            <RiMap2Line />
          </span>
          <p id={titleId} className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {title}
          </p>
          {comments.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <RiChatQuoteLine aria-hidden className="size-3.5" />
              {comments.length}
            </span>
          )}
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse plan" : "Expand plan"}
            onClick={() => setExpanded(!expanded)}
          >
            <RiArrowDownSLine className={cn("transition-transform", !expanded && "-rotate-90")} />
          </Button>
        </div>

        <div className="relative">
          <div
            ref={contentRef}
            data-slot="plan-content"
            onMouseUp={readSelection}
            onKeyUp={readSelection}
            style={expanded ? undefined : { maxHeight: collapsedHeight }}
            className={cn("px-4 py-3 text-sm", !expanded && "overflow-hidden")}
          >
            <Markdown>{plan}</Markdown>
          </div>
          {!expanded && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-16 items-end justify-center bg-gradient-to-t from-card to-transparent pb-2">
              <Button type="button" size="xs" variant="secondary" className="pointer-events-auto" onClick={() => setExpanded(true)}>
                Show full plan
              </Button>
            </div>
          )}
        </div>

        {selection && !readOnly && (
          <Button
            type="button"
            size="xs"
            variant="inverse"
            data-slot="plan-comment-trigger"
            leadingIcon={<RiChatQuoteLine />}
            onMouseDown={(e) => e.preventDefault()}
            onClick={startComment}
            style={{ top: selection.top, left: selection.left }}
            className="absolute z-10 -translate-x-1/2 shadow-lg"
          >
            Comment
          </Button>
        )}

        {draftQuote != null && !readOnly && (
          <div className="border-t border-border bg-subtle px-4 py-3">
            <CommentComposer
              autoFocus
              quote={truncatePlanQuote(draftQuote, quoteLength)}
              label="Comment on plan"
              placeholder="Add a comment for the agent…"
              onSubmit={addComment}
              onCancel={() => setDraftQuote(null)}
            />
          </div>
        )}

        {comments.length > 0 && (
          <section aria-labelledby={`${uid}-comments`} className="border-t border-border px-4 py-3" data-slot="plan-comments">
            <p id={`${uid}-comments`} className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Comments ({comments.length})
            </p>
            <ul className="flex flex-col gap-2">
              {comments.map((c) => (
                <li key={c.id} className="group flex items-start gap-2 rounded-md border border-border bg-background px-3 py-2" data-slot="plan-comment">
                  <div className="min-w-0 flex-1 space-y-1">
                    <blockquote className="truncate border-l-2 border-warning pl-2 text-xs italic text-muted-foreground">
                      {truncatePlanQuote(c.quote, quoteLength)}
                    </blockquote>
                    <p className="whitespace-pre-wrap text-sm text-foreground">{c.body}</p>
                  </div>
                  {!readOnly && (
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Remove comment: ${truncatePlanQuote(c.body, 40)}`}
                      onClick={() => setComments(comments.filter((x) => x.id !== c.id))}
                    >
                      <RiCloseLine />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {outcome ? (
          <div
            role="status"
            className={cn(
              "flex items-center gap-1.5 border-t border-border bg-subtle px-4 py-2.5 text-sm font-medium [&_svg]:size-4",
              outcome.type === "approved" ? "text-success" : "text-info"
            )}
          >
            {outcome.type === "approved" ? <RiCheckLine aria-hidden /> : <RiQuestionAnswerLine aria-hidden />}
            {outcome.type === "approved" ? (
              <span>
                Plan approved
                {outcomeMode ? <span className="font-normal text-muted-foreground"> · {outcomeMode.label}</span> : null}
              </span>
            ) : (
              <span>
                Kept planning
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · sent {outcome.comments.length} {pluralize(outcome.comments.length, "comment")}
                  {outcome.message ? " and a note" : ""}
                </span>
              </span>
            )}
          </div>
        ) : (
          !readOnly && (
            <div className="flex flex-col gap-2 border-t border-border bg-subtle px-4 py-3">
              <textarea
                rows={1}
                aria-label="Feedback for the agent"
                placeholder={comments.length ? "Add a note with your comments (optional)…" : "Tell the agent what to change…"}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={cn(
                  "w-full resize-none rounded-[min(var(--radius-control),var(--radius-box))] border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground",
                  focusRing
                )}
              />
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="mr-auto text-xs text-muted-foreground">Select text in the plan to comment on it.</span>
                <Button type="button" size="sm" variant="secondary" onClick={keepPlanning}>
                  Keep planning
                </Button>
                <div className="inline-flex items-center">
                  <Button type="button" size="sm" variant="primary" onClick={approve} className={cn(nextModes.length > 0 && "rounded-r-none")}>
                    Approve plan
                  </Button>
                  {nextModes.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`After approval: ${typeof currentMode?.label === "string" ? currentMode.label : nextMode}`}
                        data-slot="plan-next-mode"
                        data-value={nextMode}
                        className={cn(
                          "inline-flex h-8 items-center gap-1 rounded-r-control border-l border-primary-foreground/20 bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary-hover",
                          focusRing
                        )}
                      >
                        <span className="hidden sm:inline">{currentMode?.label}</span>
                        <RiArrowDownSLine aria-hidden className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel>After approval</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={nextMode} onValueChange={setNextMode}>
                          {nextModes.map((m) => (
                            <DropdownMenuRadioItem key={m.value} value={m.value}>
                              <span className="flex flex-col">
                                <span>{m.label}</span>
                                {m.description != null && <span className="text-xs text-muted-foreground">{m.description}</span>}
                              </span>
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    );
  }
);
PlanReviewCard.displayName = "PlanReviewCard";
