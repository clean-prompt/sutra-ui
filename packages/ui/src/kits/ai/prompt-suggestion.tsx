import * as React from "react";
import { RiArrowRightUpLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { matchRanges } from "../../lib/text";

type PromptSuggestionLayout = "wrap" | "list";

const PromptSuggestionGroupContext = React.createContext<PromptSuggestionLayout>("wrap");

function highlightText(text: string, query: string) {
  const ranges = matchRanges(text, query.trim());
  if (ranges.length === 0) return text;
  const parts: React.ReactNode[] = [];
  let last = 0;
  ranges.forEach(([start, end], i) => {
    if (start > last) parts.push(<React.Fragment key={`t${i}`}>{text.slice(last, start)}</React.Fragment>);
    parts.push(
      <mark key={`m${i}`} className="bg-transparent font-semibold text-foreground">
        {text.slice(start, end)}
      </mark>
    );
    last = end;
  });
  if (last < text.length) parts.push(<React.Fragment key="rest">{text.slice(last)}</React.Fragment>);
  return parts;
}

export interface PromptSuggestionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  /** Autocomplete mode: bolds the matching part of string children and renders as a full-width row. */
  highlight?: string;
}

/** Clickable prompt suggestion: a chip in a wrap row, a row in a list, or an autocomplete match. */
export const PromptSuggestion = React.forwardRef<HTMLButtonElement, PromptSuggestionProps>(
  ({ icon, highlight, className, children, type, ...props }, ref) => {
    const layout = React.useContext(PromptSuggestionGroupContext);
    const autocomplete = highlight !== undefined;
    const content = autocomplete && typeof children === "string" ? highlightText(children, highlight) : children;

    if (autocomplete) {
      return (
        <button
          ref={ref}
          type={type ?? "button"}
          className={cn(
            "flex h-9 w-full items-center gap-2.5 rounded-control px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent [&_svg]:size-4 [&_svg]:shrink-0",
            focusRing,
            className
          )}
          {...props}
        >
          {icon}
          <span className="truncate">{content}</span>
        </button>
      );
    }

    if (layout === "list") {
      return (
        <button
          ref={ref}
          type={type ?? "button"}
          className={cn(
            "group/suggestion flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0",
            focusRing,
            className
          )}
          {...props}
        >
          {icon}
          <span className="min-w-0 flex-1 truncate">{content}</span>
          <RiArrowRightUpLine
            aria-hidden
            className="text-muted-foreground opacity-0 transition-[opacity,transform,translate,scale,rotate] duration-150 group-hover/suggestion:translate-x-0.5 group-hover/suggestion:-translate-y-0.5 group-hover/suggestion:opacity-100 group-focus-visible/suggestion:opacity-100"
          />
        </button>
      );
    }

    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={cn(
          "inline-flex h-9 max-w-full items-center gap-2 rounded-control border border-border bg-background px-3.5 text-sm text-foreground shadow-xs",
          "transition-[background-color,border-color,transform,translate,scale,rotate] duration-150 hover:border-border-strong hover:bg-accent active:scale-[0.98]",
          "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
          focusRing,
          className
        )}
        {...props}
      >
        {icon}
        <span className="truncate">{content}</span>
      </button>
    );
  }
);
PromptSuggestion.displayName = "PromptSuggestion";

export interface PromptSuggestionGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** wrap: centered row of chips · list: stacked rows with arrow icons */
  variant?: PromptSuggestionLayout;
}

/** Container for PromptSuggestion items. */
export const PromptSuggestionGroup = React.forwardRef<HTMLDivElement, PromptSuggestionGroupProps>(
  ({ variant = "wrap", className, ...props }, ref) => (
    <PromptSuggestionGroupContext.Provider value={variant}>
      <div
        ref={ref}
        role="group"
        data-variant={variant}
        className={cn(
          variant === "wrap"
            ? "flex flex-wrap items-center justify-center gap-2"
            : "flex flex-col divide-y divide-border",
          className
        )}
        {...props}
      />
    </PromptSuggestionGroupContext.Provider>
  )
);
PromptSuggestionGroup.displayName = "PromptSuggestionGroup";
