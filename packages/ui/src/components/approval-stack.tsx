import * as React from "react";
import { RiArrowLeftSLine, RiArrowRightSLine, RiCheckDoubleLine, RiCloseLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { clamp } from "../lib/math";
import { Button } from "./button";
import { useControllableState } from "../hooks/use-controllable-state";

export interface ApprovalStackRenderState {
  index: number;
  total: number;
}

export interface ApprovalStackProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "children" | "defaultValue"> {
  items: readonly T[];
  /** Stable key for an item. Default: its index. */
  getKey?: (item: T, index: number) => React.Key;
  /** Renders the interactive top card (e.g. a PermissionPrompt). */
  renderItem: (item: T, state: ApprovalStackRenderState) => React.ReactNode;
  /** Index of the top card (controlled). */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Shows "Approve all" when set. */
  onApproveAll?: () => void;
  /** Shows "Deny all" when set. */
  onDenyAll?: () => void;
  /** How many cards peek out behind the top one. Default 2. */
  depth?: number;
  /** Region label. Default "Pending approvals". */
  label?: string;
  /** Shown when `items` is empty. Renders nothing by default. */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  empty?: React.ReactNode;
}

function ApprovalStackInner<T>(
  {
    items,
    getKey,
    renderItem,
    index: indexProp,
    defaultIndex = 0,
    onIndexChange,
    onApproveAll,
    onDenyAll,
    depth = 2,
    label = "Pending approvals",
    emptyState,
    empty,
    className,
    onKeyDown,
    ...props
  }: ApprovalStackProps<T>,
  ref: React.ForwardedRef<HTMLElement>
) {
  const [rawIndex, setIndex] = useControllableState<number>({ value: indexProp, defaultValue: defaultIndex, onChange: onIndexChange });
  const total = items.length;
  if (total === 0) return <>{emptyState ?? empty ?? null}</>;
  const index = clamp(rawIndex, 0, total - 1);
  const item = items[index];
  const behind = Math.min(depth, total - 1);
  const more = total - 1;
  const go = (next: number) => {
    if (next >= 0 && next < total) setIndex(next);
  };

  return (
    <section
      ref={ref}
      aria-label={label}
      aria-roledescription="approval stack"
      tabIndex={-1}
      data-count={total}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        const t = e.target as HTMLElement;
        const typing = t.closest("input, textarea, select, [contenteditable=true], [role=radiogroup], [role=listbox], [role=menu]");
        if (typing && !e.altKey) return;
        if (e.key === "ArrowLeft" || (e.key === "[" && !typing)) {
          e.preventDefault();
          go(index - 1);
        } else if (e.key === "ArrowRight" || (e.key === "]" && !typing)) {
          e.preventDefault();
          go(index + 1);
        }
      }}
      className={cn("flex flex-col gap-2 outline-none", className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground" aria-live="polite" aria-atomic="true">
          Approval {index + 1} of {total}
        </span>
        {more > 0 && (
          <span data-slot="approval-stack-more" className="rounded-full bg-warning-soft px-2 py-px text-2xs font-semibold tabular-nums text-warning-soft-foreground">
            +{more} more
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          {onDenyAll && total > 1 && (
            <Button size="xs" variant="ghost" leadingIcon={<RiCloseLine aria-hidden />} onClick={onDenyAll}>
              Deny all
            </Button>
          )}
          {onApproveAll && total > 1 && (
            <Button size="xs" variant="soft" leadingIcon={<RiCheckDoubleLine aria-hidden />} onClick={onApproveAll}>
              Approve all
            </Button>
          )}
          {total > 1 && (
            <span role="group" aria-label="Navigate approvals" className="flex items-center">
              <button
                type="button"
                aria-label="Previous approval"
                title="Previous (←)"
                disabled={index <= 0}
                onClick={() => go(index - 1)}
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-control text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4",
                  focusRing
                )}
              >
                <RiArrowLeftSLine aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Next approval"
                title="Next (→)"
                disabled={index >= total - 1}
                onClick={() => go(index + 1)}
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-control text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4",
                  focusRing
                )}
              >
                <RiArrowRightSLine aria-hidden />
              </button>
            </span>
          )}
        </span>
      </div>
      <div className="relative isolate" style={{ paddingBottom: behind * 8 }}>
        {Array.from({ length: behind }, (_, i) => {
          const level = behind - i;
          return (
            <div
              key={`shell-${level}`}
              aria-hidden
              data-slot="approval-stack-shell"
              className="absolute inset-x-0 top-0 rounded-box border border-border bg-card shadow-sm transition-transform duration-200 motion-reduce:transition-none"
              style={{
                bottom: 0,
                zIndex: -level,
                transform: `translateY(${level * 8}px) scaleX(${1 - level * 0.04})`,
                opacity: 1 - level * 0.25,
              }}
            />
          );
        })}
        <div
          key={getKey ? getKey(item, index) : index}
          data-slot="approval-stack-top"
          className="relative animate-in fade-in-0 slide-in-from-bottom-1 duration-200 motion-reduce:animate-none"
        >
          {renderItem(item, { index, total })}
        </div>
      </div>
    </section>
  );
}

/** A stacked queue of pending approvals: the top card is interactive, the rest peek out behind with a "+n more" count. */
export const ApprovalStack = React.forwardRef(ApprovalStackInner) as (<T>(
  props: ApprovalStackProps<T> & { ref?: React.Ref<HTMLElement> }
) => React.ReactElement | null) & { displayName?: string };
ApprovalStack.displayName = "ApprovalStack";
