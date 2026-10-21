import * as React from "react";
import { RiMoreLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { Button } from "../../primitives/button";
import { useElementWidth } from "../../hooks/use-resize-observer";
import { useMergedRefs } from "../../hooks/use-merged-refs";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";

/* ------------------------------------------------------------------ */
/* ComposerToolbar                                                     */
/* ------------------------------------------------------------------ */

export interface ComposerToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Add-context control (always visible). */
  addContext?: React.ReactNode;
  /** Mode switcher slot (collapses). */
  mode?: React.ReactNode;
  /** Effort slot (collapses). */
  effort?: React.ReactNode;
  /** Extra left-hand tools (collapse). */
  tools?: React.ReactNode;
  /** Right-hand meta such as a context meter (collapses). */
  meta?: React.ReactNode;
  /** Model pill (always visible). */
  model?: React.ReactNode;
  /** Voice button (always visible). */
  voice?: React.ReactNode;
  /** Send / stop button (always visible). */
  submit?: React.ReactNode;
  /** Move collapsible slots into an overflow popover: "auto" measures the toolbar width. Default "auto". */
  collapse?: boolean | "auto";
  /** Width in px below which "auto" collapses. Default 440. */
  collapseBelow?: number;
  /** Accessible name of the overflow button. Default "More options". */
  overflowLabel?: string;
}

/**
 * Composer footer layout: add context, mode and effort on the left; model, voice and send on the right; narrow widths collapse extras into an overflow popover.
 * This is the slot-based, agent-specific layout; `PromptInputToolbar` (prompt-input) is the plain flex row for a basic `PromptInput`.
 * Use `ComposerToolbar` when you need the named slots or overflow collapse, `PromptInputToolbar` otherwise.
 */
export const ComposerToolbar = React.forwardRef<HTMLDivElement, ComposerToolbarProps>(
  (
    {
      addContext,
      mode,
      effort,
      tools,
      meta,
      model,
      voice,
      submit,
      collapse = "auto",
      collapseBelow = 440,
      overflowLabel = "More options",
      className,
      children,
      ...props
    },
    ref
  ) => {
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const width = useElementWidth(rootRef);
    const narrow = width > 0 && width < collapseBelow;
    const setRefs = useMergedRefs(rootRef, ref);

    const collapsed = collapse === "auto" ? narrow : collapse;
    const collapsible = [mode, effort, tools, meta].filter((n) => n != null && n !== false);
    const overflow = collapsed && collapsible.length > 0;

    return (
      <div
        ref={setRefs}
        data-slot="composer-toolbar"
        data-collapsed={overflow ? "" : undefined}
        className={cn("flex min-w-0 items-center justify-between gap-2 px-2.5 pb-2.5", className)}
        {...props}
      >
        <div className={cn("flex items-center gap-1", overflow ? "shrink-0" : "min-w-0")}>
          {addContext}
          {!overflow && (
            <>
              {mode}
              {effort}
              {tools}
            </>
          )}
          {overflow && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={overflowLabel}
                  title={overflowLabel}
                  className="text-muted-foreground hover:text-foreground data-[state=open]:bg-accent"
                >
                  <RiMoreLine aria-hidden />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                size="auto"
                padded={false}
                aria-label={overflowLabel}
                className="flex min-w-48 flex-col items-stretch gap-1 p-1.5 [&>*]:justify-start"
              >
                {collapsible.map((node, i) => (
                  <React.Fragment key={i}>{node}</React.Fragment>
                ))}
              </PopoverContent>
            </Popover>
          )}
          {children}
        </div>
        <div className="flex min-w-0 shrink items-center gap-1">
          {!overflow && meta}
          {model}
          {voice}
          {submit}
        </div>
      </div>
    );
  }
);
ComposerToolbar.displayName = "ComposerToolbar";

