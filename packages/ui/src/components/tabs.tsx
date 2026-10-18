import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn, focusRing, type Size } from "../lib/cn";
import { useActiveIndicator } from "../hooks/use-active-indicator";

export type TabsVariant = "pill" | "underline" | "solid" | "ghost";

interface TabsContextValue {
  variant: TabsVariant;
  size: Size;
  orientation: "horizontal" | "vertical";
}

const TabsContext = React.createContext<TabsContextValue>({ variant: "pill", size: "md", orientation: "horizontal" });

export interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  variant?: TabsVariant;
  size?: Size;
}

/** Tabs root. `variant` and `size` flow to every list and trigger inside. */
export const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, TabsProps>(
  ({ variant = "pill", size = "md", orientation = "horizontal", className, ...props }, ref) => {
    const ctx = React.useMemo(() => ({ variant, size, orientation }), [variant, size, orientation]);
    return (
      <TabsContext.Provider value={ctx}>
        <TabsPrimitive.Root
          ref={ref}
          orientation={orientation}
          className={cn("flex gap-4", orientation === "vertical" ? "flex-row" : "flex-col", className)}
          {...props}
        />
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = "Tabs";

const listBase: Record<TabsVariant, string> = {
  pill: "rounded-control bg-muted p-1",
  underline: "border-border",
  solid: "rounded-control border border-border bg-background p-1 shadow-xs",
  ghost: "gap-1",
};

const triggerSize: Record<TabsVariant, Record<Size, string>> = {
  pill: { sm: "h-6 px-2.5 text-xs", md: "h-7 px-3 text-sm", lg: "h-8 px-3.5 text-sm" },
  solid: { sm: "h-6 px-2.5 text-xs", md: "h-7 px-3 text-sm", lg: "h-8 px-3.5 text-sm" },
  ghost: { sm: "h-8 px-2.5 text-xs", md: "h-9 px-3 text-sm", lg: "h-10 px-3.5 text-sm" },
  underline: { sm: "h-9 px-1 text-xs", md: "h-10 px-1 text-sm", lg: "h-11 px-1.5 text-sm" },
};

/* While the sliding indicator is measured (`data-indicator=ready`), triggers drop their own active fill. */
const triggerVariant: Record<TabsVariant, string> = {
  pill: cn(
    "rounded-[calc(var(--radius-control)-2px)] text-muted-foreground hover:text-foreground data-[state=active]:text-foreground",
    "data-[state=active]:bg-background data-[state=active]:shadow-sm",
    "group-data-[indicator=ready]/tabs-list:data-[state=active]:bg-transparent group-data-[indicator=ready]/tabs-list:data-[state=active]:shadow-none"
  ),
  solid: cn(
    "rounded-[calc(var(--radius-control)-2px)] text-muted-foreground hover:text-foreground data-[state=active]:text-primary-foreground data-[state=active]:hover:text-primary-foreground",
    "data-[state=active]:bg-primary",
    "group-data-[indicator=ready]/tabs-list:data-[state=active]:bg-transparent"
  ),
  ghost: cn(
    "rounded-control text-muted-foreground hover:bg-accent hover:text-foreground",
    "data-[state=active]:bg-accent data-[state=active]:text-foreground"
  ),
  underline: cn(
    "text-muted-foreground hover:text-foreground data-[state=active]:text-foreground",
    "after:absolute after:bg-transparent data-[state=active]:after:bg-foreground group-data-[indicator=ready]/tabs-list:data-[state=active]:after:bg-transparent",
    "data-[orientation=horizontal]:after:inset-x-0 data-[orientation=horizontal]:after:bottom-0 data-[orientation=horizontal]:after:h-0.5",
    "data-[orientation=vertical]:after:inset-y-0 data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:w-0.5"
  ),
};

const indicatorClass: Record<Exclude<TabsVariant, "ghost">, string> = {
  pill: "rounded-[calc(var(--radius-control)-2px)] bg-background shadow-sm ring-1 ring-black/[0.03]",
  solid: "rounded-[calc(var(--radius-control)-2px)] bg-primary shadow-xs shadow-inner-highlight",
  underline: "rounded-full bg-foreground",
};

export interface TabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  /** Stretch triggers to fill the width. */
  fullWidth?: boolean;
}

/** Container for triggers; renders the sliding active indicator. */
export const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, TabsListProps>(
  ({ className, fullWidth, children, ...props }, forwardedRef) => {
    const { variant, orientation } = React.useContext(TabsContext);
    const listRef = React.useRef<HTMLDivElement | null>(null);
    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        listRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef]
    );
    const hasIndicator = variant !== "ghost";
    const { rect, animate } = useActiveIndicator(listRef, '[role="tab"][data-state="active"]', [], {
      enabled: hasIndicator,
      itemSelector: '[role="tab"]',
      watchAttributes: ["data-state"],
    });
    const vertical = orientation === "vertical";

    let indicatorStyle: React.CSSProperties | undefined;
    if (rect) {
      if (variant === "underline") {
        indicatorStyle = vertical
          ? { top: rect.top, height: rect.height, left: 0, width: 2 }
          : { left: rect.left, width: rect.width, bottom: 0, height: 2 };
      } else {
        indicatorStyle = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      }
    }

    return (
      <TabsPrimitive.List
        ref={setRefs}
        data-indicator={rect ? "ready" : undefined}
        className={cn(
          "group/tabs-list relative isolate inline-flex shrink-0 items-center",
          vertical ? "flex-col items-stretch" : "max-w-full overflow-x-auto scrollbar-none",
          variant === "underline" && (vertical ? "gap-1 border-l" : "gap-5 border-b"),
          listBase[variant],
          fullWidth && "flex w-full [&>[role=tab]]:flex-1",
          className
        )}
        {...props}
      >
        {hasIndicator && rect && (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute -z-10",
              indicatorClass[variant as Exclude<TabsVariant, "ghost">],
              animate && "transition-[left,top,width,height] duration-300 ease-out-quart motion-reduce:transition-none"
            )}
            style={indicatorStyle}
          />
        )}
        {children}
      </TabsPrimitive.List>
    );
  }
);
TabsList.displayName = "TabsList";

export interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  icon?: React.ReactNode;
  /** Count badge after the label. */
  badge?: React.ReactNode;
}

/** A tab button with optional icon and count badge. */
export const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, TabsTriggerProps>(
  ({ className, icon, badge, children, ...props }, ref) => {
    const { variant, size, orientation } = React.useContext(TabsContext);
    return (
      <TabsPrimitive.Trigger
        ref={ref}
        className={cn(
          "group/tab relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-[color,background-color,box-shadow] duration-150",
          "disabled:pointer-events-none disabled:opacity-50",
          "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          orientation === "vertical" && "justify-start",
          triggerSize[variant][size],
          triggerVariant[variant],
          orientation === "vertical" && variant === "underline" && "h-9 px-3",
          focusRing,
          className
        )}
        {...props}
      >
        {icon}
        {children}
        {badge != null && badge !== false && (
          <span
            className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-2xs font-semibold tabular-nums transition-colors",
              variant === "solid"
                ? "bg-muted text-muted-foreground group-data-[state=active]/tab:bg-white/20 group-data-[state=active]/tab:text-primary-foreground"
                : "bg-muted text-muted-foreground group-data-[state=active]/tab:bg-primary-soft group-data-[state=active]/tab:text-primary-soft-foreground",
              variant === "pill" && "bg-background group-data-[state=active]/tab:bg-primary-soft"
            )}
          >
            {badge}
          </span>
        )}
      </TabsPrimitive.Trigger>
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

/** Panel shown for the active tab. */
export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "min-w-0 flex-1 rounded-box outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
      "data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-200",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";
