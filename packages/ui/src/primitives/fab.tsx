import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { RiAddLine } from "@remixicon/react";
import { cn, focusRing, type Size } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { useMergedRefs } from "../hooks/use-merged-refs";

export type FabPosition = "bottom-right" | "bottom-left" | "bottom-center" | "top-right" | "top-left" | "top-center";

export interface FabAction {
  label: string;
  icon: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  href?: string;
  disabled?: boolean;
}

const fabLayout: Record<FabPosition, string> = {
  "bottom-right": "flex-col items-end",
  "bottom-left": "flex-col items-start",
  "bottom-center": "flex-col items-center",
  "top-right": "flex-col-reverse items-end",
  "top-left": "flex-col-reverse items-start",
  "top-center": "flex-col-reverse items-center",
};

const fabOffsets: Record<FabPosition, string> = {
  "bottom-right": "bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6",
  "bottom-left": "bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-6",
  "bottom-center": "bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2",
  "top-right": "top-6 right-6",
  "top-left": "top-6 left-6",
  "top-center": "top-6 left-1/2 -translate-x-1/2",
};

const fabStrategy = { fixed: "fixed", absolute: "absolute", static: "relative" } as const;

function fabContainerClass(position: FabPosition, strategy: keyof typeof fabStrategy) {
  return cn(
    "z-50 flex gap-3",
    fabStrategy[strategy],
    fabLayout[position],
    strategy !== "static" && fabOffsets[position]
  );
}

export const fabVariants = cva(
  [
    "group/fab relative inline-flex shrink-0 select-none items-center justify-center gap-2 font-medium",
    "shadow-lg shadow-inner-highlight transition-[background-color,box-shadow,transform,translate,scale,rotate,width] duration-200 ease-out-quart",
    "hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-95",
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    focusRing,
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "border border-border bg-background text-foreground hover:bg-muted",
        inverse: "bg-inverse text-inverse-foreground hover:bg-inverse/90",
      },
      size: {
        sm: "h-12 min-w-12 text-sm [&_svg]:size-5",
        md: "h-14 min-w-14 text-sm [&_svg]:size-6",
        lg: "h-16 min-w-16 text-base [&_svg]:size-7",
      },
      shape: { circle: "rounded-full", rounded: "rounded-2xl" },
      extended: { true: "", false: "" },
    },
    compoundVariants: [
      { extended: true, size: "sm", className: "px-4 [&_svg]:size-[18px]" },
      { extended: true, size: "md", className: "px-5 [&_svg]:size-5" },
      { extended: true, size: "lg", className: "px-6 [&_svg]:size-6" },
      { extended: false, size: "sm", className: "w-12" },
      { extended: false, size: "md", className: "w-14" },
      { extended: false, size: "lg", className: "w-16" },
    ],
    defaultVariants: { variant: "primary", size: "md", shape: "circle", extended: false },
  }
);

const actionInset: Record<Size, string> = { sm: "px-1", md: "px-2", lg: "px-3" };

export interface FloatingActionButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    Omit<VariantProps<typeof fabVariants>, "extended"> {
  /** Accessible name; also the visible text when `extended`. */
  label: string;
  icon?: React.ReactNode;
  /** Show the label next to the icon. */
  extended?: boolean;
  position?: FabPosition;
  /** `fixed` to the viewport (default), `absolute` within a relative parent, or `static` inline. */
  strategy?: "fixed" | "absolute" | "static";
  /** Speed-dial actions that fan out on click. */
  actions?: FabAction[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  containerClassName?: string;
}

/** Floating primary action, optionally expanding into a speed-dial menu. */
export const FloatingActionButton = React.forwardRef<HTMLButtonElement, FloatingActionButtonProps>(
  (
    {
      className,
      containerClassName,
      label,
      icon,
      extended = false,
      position = "bottom-right",
      strategy = "fixed",
      variant,
      size,
      shape,
      actions,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      onClick,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const hasDial = !!actions && actions.length > 0;
    const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
    const containerRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);
    const menuId = React.useId();
    const isOpen = hasDial && open;
    const isTop = position.startsWith("top");
    const labelSide = position.endsWith("left") ? "right" : "left";
    const resolvedSize: Size = size ?? "md";

    const setRefs = useMergedRefs(triggerRef, ref);

    const menuRef = React.useRef<HTMLUListElement>(null);
    const focusFirstOnOpen = React.useRef(false);
    const menuItems = () =>
      Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"]):not(:disabled)') ?? []);

    // Opening from the keyboard moves focus to the item nearest the trigger once the dial is interactive.
    React.useEffect(() => {
      if (!isOpen || !focusFirstOnOpen.current) return;
      focusFirstOnOpen.current = false;
      menuItems()[0]?.focus();
    }, [isOpen]);

    /** DOM order runs away from the trigger, so "away" is ArrowUp for bottom positions and ArrowDown for top ones. */
    const onMenuKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
      const items = menuItems();
      if (items.length === 0) return;
      const current = items.indexOf(document.activeElement as HTMLElement);
      const away = isTop ? "ArrowDown" : "ArrowUp";
      const toward = isTop ? "ArrowUp" : "ArrowDown";
      let next: number;
      if (e.key === away) next = current < 0 ? 0 : (current + 1) % items.length;
      else if (e.key === toward) next = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = items.length - 1;
      else return;
      e.preventDefault();
      items[next]?.focus();
    };

    React.useEffect(() => {
      if (!isOpen) return;
      const onDocKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        }
      };
      const onPointer = (e: PointerEvent) => {
        if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener("keydown", onDocKey);
      document.addEventListener("pointerdown", onPointer);
      return () => {
        document.removeEventListener("keydown", onDocKey);
        document.removeEventListener("pointerdown", onPointer);
      };
    }, [isOpen, setOpen]);

    const iconNode = icon ?? <RiAddLine aria-hidden />;

    const trigger = (
      <button
        ref={setRefs}
        type="button"
        aria-label={extended ? undefined : label}
        aria-haspopup={hasDial ? "menu" : undefined}
        aria-expanded={hasDial ? isOpen : undefined}
        aria-controls={hasDial ? menuId : undefined}
        data-state={hasDial ? (isOpen ? "open" : "closed") : undefined}
        className={cn(fabVariants({ variant, size, shape, extended }), className)}
        onClick={(e) => {
          onClick?.(e);
          if (hasDial && !e.defaultPrevented) setOpen(!open);
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (!hasDial || e.defaultPrevented || e.key !== (isTop ? "ArrowDown" : "ArrowUp")) return;
          e.preventDefault();
          if (isOpen) menuItems()[0]?.focus();
          else {
            focusFirstOnOpen.current = true;
            setOpen(true);
          }
        }}
        {...props}
      >
        <span
          aria-hidden
          className={cn(
            "inline-flex transition-transform duration-300 ease-spring",
            hasDial && !icon && "group-data-[state=open]/fab:rotate-45"
          )}
        >
          {iconNode}
        </span>
        {extended && <span className="pr-0.5">{label}</span>}
      </button>
    );

    const dial = hasDial ? (
      <ul
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label={label}
        aria-orientation="vertical"
        inert={!isOpen}
        onKeyDown={onMenuKeyDown}
        className={cn(
          "flex gap-3",
          isTop ? "flex-col" : "flex-col-reverse",
          labelSide === "left" ? "items-end" : "items-start",
          position.endsWith("center") && "items-center",
          !extended && actionInset[resolvedSize],
          !isOpen && "pointer-events-none"
        )}
      >
        {actions!.map((action, i) => {
          const itemClass = cn(
            "group/fab-action flex items-center gap-3 rounded-full outline-none",
            labelSide === "right" && "flex-row-reverse",
            action.disabled && "pointer-events-none opacity-50"
          );
          const content = (
            <>
              <span
                className={cn(
                  "whitespace-nowrap rounded-control border border-border bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-md",
                  "transition-colors group-hover/fab-action:bg-accent",
                  position.endsWith("center") && "sr-only"
                )}
              >
                {action.label}
              </span>
              <span
                aria-hidden
                className={cn(
                  "inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md",
                  "transition-[background-color,box-shadow,transform,translate,scale,rotate] duration-150 group-hover/fab-action:bg-muted group-hover/fab-action:scale-105",
                  "group-focus-visible/fab-action:ring-[3px] group-focus-visible/fab-action:ring-ring/35 [&_svg]:size-[18px]"
                )}
              >
                {action.icon}
              </span>
            </>
          );
          const handle = (e: React.MouseEvent<HTMLElement>) => {
            if (action.disabled) {
              e.preventDefault();
              return;
            }
            action.onClick?.(e);
            setOpen(false);
          };
          return (
            <li
              key={`${action.label}-${i}`}
              role="none"
              className={cn(
                "transition-[opacity,transform,translate,scale,rotate] duration-200 ease-out-quart",
                isOpen ? "translate-y-0 scale-100 opacity-100" : cn("scale-90 opacity-0", isTop ? "-translate-y-2" : "translate-y-2")
              )}
              style={{ transitionDelay: `${(isOpen ? i : actions!.length - 1 - i) * 30}ms` }}
            >
              {action.href ? (
                <a
                  role="menuitem"
                  href={action.disabled ? undefined : action.href}
                  aria-disabled={action.disabled || undefined}
                  tabIndex={action.disabled ? -1 : undefined}
                  className={itemClass}
                  onClick={handle}
                >
                  {content}
                </a>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  disabled={action.disabled}
                  className={itemClass}
                  onClick={handle}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    ) : null;

    return (
      <div
        ref={containerRef}
        data-slot="fab"
        className={cn(fabContainerClass(position, strategy), containerClassName)}
      >
        {dial}
        {trigger}
      </div>
    );
  }
);
FloatingActionButton.displayName = "FloatingActionButton";
