import * as React from "react";
import { Slot } from "radix-ui";
import { RiArrowDownSLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { Collapse } from "./collapse";

export type CollapsibleVariant = "default" | "surface" | "ghost";

interface CollapsibleContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled: boolean;
  contentId: string;
  variant: CollapsibleVariant;
  keepMounted: boolean;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

function useCollapsibleContext(part: string) {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx) throw new Error(`${part} must be used inside <Collapsible>`);
  return ctx;
}

export interface CollapsibleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** default: bare · surface: bordered card · ghost: soft hover and open background. */
  variant?: CollapsibleVariant;
  /** Keep the content in the tree while closed (the default removes it once the close animation ends). */
  keepMounted?: boolean;
}

/** Show/hide section with an animated height: `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`. */
export const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ open: openProp, defaultOpen = false, onOpenChange, disabled = false, variant = "default", keepMounted = false, className, ...props }, ref) => {
    const [open, setOpen] = useControllableState<boolean>({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
    const contentId = React.useId();
    const ctx = React.useMemo(
      () => ({ open, setOpen, disabled, contentId, variant, keepMounted }),
      [open, setOpen, disabled, contentId, variant, keepMounted]
    );
    return (
      <CollapsibleContext.Provider value={ctx}>
        <div
          ref={ref}
          data-slot="collapsible"
          data-state={open ? "open" : "closed"}
          data-disabled={disabled ? "" : undefined}
          className={cn(
            "w-full min-w-0",
            variant === "surface" && "rounded-box border border-border bg-card shadow-xs",
            variant === "ghost" && "rounded-md transition-colors data-[state=open]:bg-subtle",
            className
          )}
          {...props}
        />
      </CollapsibleContext.Provider>
    );
  }
);
Collapsible.displayName = "Collapsible";

export interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Render the child (your own button) and only add the ARIA wiring and click handling. */
  asChild?: boolean;
  /** Turning chevron after the label, or `false` for none (ignored with `asChild`). */
  icon?: "chevron" | false;
}

/** Button that toggles its `Collapsible`; sets `aria-expanded` and `aria-controls`. */
export const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ asChild, icon = "chevron", className, children, onClick, disabled, ...props }, ref) => {
    const ctx = useCollapsibleContext("CollapsibleTrigger");
    const isDisabled = disabled || ctx.disabled;
    const common = {
      "data-slot": "collapsible-trigger",
      "data-state": ctx.open ? "open" : "closed",
      "data-disabled": isDisabled ? "" : undefined,
      "aria-expanded": ctx.open,
      "aria-controls": ctx.contentId,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        if (!e.defaultPrevented && !isDisabled) ctx.setOpen(!ctx.open);
      },
    };
    if (asChild) {
      return (
        <Slot.Root ref={ref} className={className} {...common} {...props}>
          {children}
        </Slot.Root>
      );
    }
    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        className={cn(
          "group flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-md py-2 text-left text-sm font-medium text-foreground transition-colors",
          "hover:text-foreground/80 disabled:cursor-not-allowed disabled:opacity-50",
          ctx.variant === "surface" && "rounded-box px-4 py-3 hover:bg-subtle",
          ctx.variant === "ghost" && "px-3 hover:bg-accent data-[state=open]:hover:bg-transparent",
          focusRing,
          className
        )}
        {...common}
        {...props}
      >
        <span className="min-w-0 flex-1">{children}</span>
        {icon === "chevron" ? (
          <RiArrowDownSLine
            aria-hidden
            className="size-[18px] shrink-0 text-muted-foreground chevron-turn group-hover:text-foreground group-data-[state=open]:rotate-180"
          />
        ) : null}
      </button>
    );
  }
);
CollapsibleTrigger.displayName = "CollapsibleTrigger";

export interface CollapsibleContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Override the root's `keepMounted` for this panel. */
  keepMounted?: boolean;
}

/** Animated panel of a `Collapsible`. Padding goes on the inner box so the closed height is 0. */
export const CollapsibleContent = React.forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ keepMounted, className, children, ...props }, ref) => {
    const ctx = useCollapsibleContext("CollapsibleContent");
    const keep = keepMounted ?? ctx.keepMounted;
    return (
      <Collapse ref={ref} id={ctx.contentId} open={ctx.open} unmountOnExit={!keep} data-slot="collapsible-content" {...props}>
        <div
          className={cn(
            "text-sm text-muted-foreground",
            ctx.variant === "surface" && "px-4 pb-4",
            ctx.variant === "ghost" && "px-3 pb-3",
            className
          )}
        >
          {children}
        </div>
      </Collapse>
    );
  }
);
CollapsibleContent.displayName = "CollapsibleContent";
