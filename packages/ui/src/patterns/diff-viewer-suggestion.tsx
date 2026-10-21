/** SuggestionDiff: AI proposal review with Accept / Discard and per-change accept / reject. */
import * as React from "react";
import { diffChars, diffWordsWithSpace } from "diff";
import { RiCheckLine, RiCloseLine, RiSparkling2Line } from "@remixicon/react";
import { cn, focusRing, hitArea } from "../lib/cn";
import { pluralize } from "../lib/format";
import { Button } from "../primitives/button";
type HunkDecision = "accepted" | "rejected";

type SuggestionToken =
  | { kind: "text"; text: string }
  | { kind: "hunk"; index: number; removed: string; added: string };

function toTokens(original: string, suggestion: string, granularity: "word" | "char"): SuggestionToken[] {
  const changes = granularity === "char" ? diffChars(original, suggestion) : diffWordsWithSpace(original, suggestion);
  const tokens: SuggestionToken[] = [];
  let index = 0;
  for (let i = 0; i < changes.length; i++) {
    const c = changes[i]!;
    if (!c.added && !c.removed) {
      tokens.push({ kind: "text", text: c.value });
      continue;
    }
    let removed = "";
    let added = "";
    while (i < changes.length && (changes[i]!.added || changes[i]!.removed)) {
      if (changes[i]!.added) added += changes[i]!.value;
      else removed += changes[i]!.value;
      i++;
    }
    i--;
    tokens.push({ kind: "hunk", index: index++, removed, added });
  }
  return tokens;
}

export interface SuggestionDiffProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Original text. */
  original: string;
  /** Suggested replacement text. */
  suggestion: string;
  /** Called with the resulting text (pending changes count as accepted). */
  onAccept?: (newText: string) => void;
  /** Called when the user discards the whole suggestion. */
  onDiscard?: () => void;
  /** Header title. Default "Suggested edit". */
  title?: React.ReactNode;
  /** e.g. the model name. */
  meta?: React.ReactNode;
  /**
   * How changes are split: by word or by character.
   * @default "word"
   */
  granularity?: "word" | "char";
  /** Per-change accept / reject buttons. Default true. */
  perHunk?: boolean;
  /**
   * Text of the accept button.
   * @default "Accept"
   */
  acceptLabel?: string;
  /**
   * Text of the discard button.
   * @default "Discard"
   */
  discardLabel?: string;
}

/** AI proposal review: word diff of a suggestion with Accept / Discard and per-change accept / reject. */
export const SuggestionDiff = React.forwardRef<HTMLDivElement, SuggestionDiffProps>(
  (
    {
      original,
      suggestion,
      onAccept,
      onDiscard,
      title = "Suggested edit",
      meta,
      granularity = "word",
      perHunk = true,
      acceptLabel = "Accept",
      discardLabel = "Discard",
      className,
      ...props
    },
    ref
  ) => {
    const tokens = React.useMemo(() => toTokens(original, suggestion, granularity), [original, suggestion, granularity]);
    const hunkCount = tokens.filter((t) => t.kind === "hunk").length;
    const [decisions, setDecisions] = React.useState<Record<number, HunkDecision>>({});
    React.useEffect(() => setDecisions({}), [tokens]);

    const decided = Object.keys(decisions).length;
    const accepted = Object.values(decisions).filter((d) => d === "accepted").length;
    const rejected = decided - accepted;
    const result = tokens
      .map((t) => (t.kind === "text" ? t.text : decisions[t.index] === "rejected" ? t.removed : t.added))
      .join("");
    const decide = (i: number, d: HunkDecision | null) =>
      setDecisions((prev) => {
        const next = { ...prev };
        if (d) next[i] = d;
        else delete next[i];
        return next;
      });

    return (
      <div
        ref={ref}
        role="group"
        aria-label={typeof title === "string" ? title : "Suggested edit"}
        data-slot="suggestion-diff"
        dir="ltr"
        className={cn("flex flex-col overflow-hidden rounded-box border border-border bg-card shadow-xs", className)}
        {...props}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm">
          <RiSparkling2Line aria-hidden className="size-4 text-primary" />
          <span className="font-medium text-foreground">{title}</span>
          {meta != null && <span className="text-xs text-muted-foreground">{meta}</span>}
          <span className="ms-auto text-xs text-muted-foreground" aria-live="polite">
            {hunkCount === 0
              ? "No changes"
              : `${hunkCount} ${pluralize(hunkCount, "change")}${accepted ? ` · ${accepted} accepted` : ""}${rejected ? ` · ${rejected} rejected` : ""}`}
          </span>
        </div>
        <div className="whitespace-pre-wrap break-words px-4 py-3 text-sm leading-7 text-foreground">
          {tokens.map((t, i) => {
            if (t.kind === "text") return <span key={i}>{t.text}</span>;
            const d = decisions[t.index];
            if (d)
              return (
                <span
                  key={i}
                  data-hunk={t.index}
                  data-hunk-state={d}
                  className={cn(
                    "rounded-xs",
                    d === "accepted" ? "bg-success-soft/60 decoration-success" : "text-muted-foreground"
                  )}
                >
                  {d === "accepted" ? t.added : t.removed}
                  {perHunk && (
                    <button
                      type="button"
                      onClick={() => decide(t.index, null)}
                      aria-label={`Undo change ${t.index + 1}`}
                      className={cn(
                        "ms-0.5 inline-flex h-4 items-center rounded-xs px-1 align-[1px] font-sans text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
                        focusRing
                      )}
                    >
                      Undo
                    </button>
                  )}
                </span>
              );
            return (
              <span key={i} data-hunk={t.index} data-hunk-state="pending" className="group/hunk">
                {t.removed && (
                  <del className="rounded-xs bg-destructive-soft text-destructive-soft-foreground line-through decoration-destructive/70">
                    {t.removed}
                  </del>
                )}
                {t.added && (
                  <ins className="rounded-xs bg-success-soft text-success-soft-foreground no-underline">{t.added}</ins>
                )}
                {perHunk && (
                  <span className="ms-0.5 inline-flex translate-y-[-1px] items-center gap-px rounded-xs border border-border bg-background align-middle shadow-xs">
                    <button
                      type="button"
                      onClick={() => decide(t.index, "accepted")}
                      aria-label={`Accept change ${t.index + 1}`}
                      className={cn(hitArea, "inline-flex size-5 items-center justify-center rounded-xs text-success hover:bg-success-soft", focusRing)}
                    >
                      <RiCheckLine aria-hidden className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(t.index, "rejected")}
                      aria-label={`Reject change ${t.index + 1}`}
                      className={cn(hitArea, "inline-flex size-5 items-center justify-center rounded-xs text-destructive hover:bg-destructive-soft", focusRing)}
                    >
                      <RiCloseLine aria-hidden className="size-3.5" />
                    </button>
                  </span>
                )}
              </span>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border bg-subtle/60 px-3 py-2">
          {decided > 0 && (
            <Button size="sm" variant="ghost" className="me-auto" onClick={() => setDecisions({})}>
              Reset
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={onDiscard}>
            {discardLabel}
          </Button>
          <Button size="sm" variant="primary" disabled={result === original} onClick={() => onAccept?.(result)}>
            {hunkCount === 0 ? "No changes" : acceptLabel}
          </Button>
        </div>
      </div>
    );
  }
);
SuggestionDiff.displayName = "SuggestionDiff";
