import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn, focusRing, type Size } from "../lib/cn";
import { useActiveIndicator } from "../hooks/use-active-indicator";
import { ACCENT_VAR, accentClasses, accentStyle, resolveAccent, type Accent } from "../lib/accent";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { useRootDirection } from "../hooks/use-direction";

export type TabsVariant = "pill" | "underline" | "solid" | "ghost";

interface TabsContextValue {
  variant: TabsVariant;
  size: Size;
  orientation: "horizontal" | "vertical";
  /** True when the root sets an accent, so triggers and the indicator read `--sutra-accent`. */
  accented: boolean;
}

const TabsContext = React.createContext<TabsContextValue>({
  variant: "pill",
  size: "md",
  orientation: "horizontal",
  accented: false,
});

export interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  /**
   * Tab list style: `pill` (filled active pill), `underline`, `solid` (segmented) or `ghost`.
   * @default "pill"
   */
  variant?: TabsVariant;
  /**
   * Tab height and text size.
   * @default "md"
   */
  size?: Size;
  /**
   * Categorical colour for the active trigger (pill, underline, text) on every trigger. Inactive triggers stay
   * neutral. `TabsTrigger`'s own `accent` overrides it per trigger.
   */
  accent?: Accent;
}

/** Tabs root. `variant`, `size` and `accent` flow to every list and trigger inside. */
export const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, TabsProps>(
  ({ variant = "pill", size = "md", orientation = "horizontal", accent, className, style, ...props }, ref) => {
    const { ref: rootRef, dir } = useRootDirection(ref);
    const accented = Boolean(accent);
    const ctx = React.useMemo(
      () => ({ variant, size, orientation, accented }),
      [variant, size, orientation, accented]
    );
    return (
      <TabsContext.Provider value={ctx}>
        <TabsPrimitive.Root
          ref={rootRef}
          dir={dir}
          orientation={orientation}
          className={cn("flex gap-4", orientation === "vertical" ? "flex-row" : "flex-col", className)}
          style={accentStyle(accent, style)}
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
    "data-[orientation=vertical]:after:inset-y-0 data-[orientation=vertical]:after:start-0 data-[orientation=vertical]:after:w-0.5"
  ),
};

/* Accent versions of `triggerVariant`: the active trigger takes the accent, inactive ones stay neutral. */
const accentTriggerVariant: Record<TabsVariant, string> = {
  pill: cn(
    "rounded-[calc(var(--radius-control)-2px)] text-muted-foreground hover:text-foreground",
    "data-[state=active]:text-[var(--sutra-accent,var(--primary))] data-[state=active]:hover:text-[var(--sutra-accent,var(--primary))]",
    "data-[state=active]:bg-[color-mix(in_oklab,var(--sutra-accent,var(--primary))_14%,transparent)]"
  ),
  solid: cn(
    "rounded-[calc(var(--radius-control)-2px)] text-muted-foreground hover:text-foreground data-[state=active]:text-primary-foreground data-[state=active]:hover:text-primary-foreground",
    "data-[state=active]:bg-[var(--sutra-accent,var(--primary))]"
  ),
  ghost: cn(
    "rounded-control text-muted-foreground hover:bg-accent hover:text-foreground",
    "data-[state=active]:bg-[color-mix(in_oklab,var(--sutra-accent,var(--primary))_14%,transparent)]",
    "data-[state=active]:text-[var(--sutra-accent,var(--primary))] data-[state=active]:hover:text-[var(--sutra-accent,var(--primary))]"
  ),
  underline: cn(
    "text-muted-foreground hover:text-foreground",
    "data-[state=active]:text-[var(--sutra-accent,var(--primary))] data-[state=active]:hover:text-[var(--sutra-accent,var(--primary))]",
    "after:absolute after:bg-transparent data-[state=active]:after:bg-[var(--sutra-accent,var(--primary))]",
    "data-[orientation=horizontal]:after:inset-x-0 data-[orientation=horizontal]:after:bottom-0 data-[orientation=horizontal]:after:h-0.5",
    "data-[orientation=vertical]:after:inset-y-0 data-[orientation=vertical]:after:start-0 data-[orientation=vertical]:after:w-0.5"
  ),
};

/* Accented triggers paint their own active fill until the sliding indicator is measured, then hand it over
 * (the indicator takes the active trigger's accent, see `TabsList`). */
const accentIndicatorHandoff: Record<TabsVariant, string> = {
  pill: "group-data-[indicator=ready]/tabs-list:data-[state=active]:bg-transparent",
  solid: "group-data-[indicator=ready]/tabs-list:data-[state=active]:bg-transparent",
  ghost: "",
  underline: "group-data-[indicator=ready]/tabs-list:data-[state=active]:after:bg-transparent",
};

const accentIndicatorClass: Record<Exclude<TabsVariant, "ghost">, string> = {
  pill: cn("rounded-[calc(var(--radius-control)-2px)]", accentClasses.soft),
  solid: cn("rounded-[calc(var(--radius-control)-2px)] shadow-xs shadow-inner-highlight", accentClasses.solid),
  underline: cn("rounded-full", accentClasses.solid),
};

const activeSelector = '[role="tab"][data-state="active"]';

/* A trigger's own accent: its inline `--sutra-accent` (set by `accentStyle`), else its `data-accent` colour. */
const ownAccentOf = (el: HTMLElement | null) =>
  el ? el.style.getPropertyValue(ACCENT_VAR).trim() || el.getAttribute("data-accent") || "" : "";

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
    const { variant, orientation, accented } = React.useContext(TabsContext);
    const listRef = React.useRef<HTMLDivElement | null>(null);
    const setRefs = useMergedRefs(listRef, forwardedRef);
    const hasIndicator = variant !== "ghost";
    /* The active trigger's own accent ("" when it has none), read while measuring so the indicator follows it. */
    const [activeAccent, setActiveAccent] = React.useState("");
    const getActive = React.useCallback((container: HTMLDivElement) => {
      const active = container.querySelector<HTMLElement>(activeSelector);
      setActiveAccent(ownAccentOf(active));
      return active;
    }, []);
    const { rect, animate } = useActiveIndicator(listRef, getActive, [], {
      enabled: hasIndicator,
      itemSelector: '[role="tab"]',
      watchAttributes: ["data-state", "data-accent"],
    });
    const vertical = orientation === "vertical";

    let indicatorStyle: React.CSSProperties | undefined;
    const indicatorAccented = accented || activeAccent !== "";
    if (rect) {
      if (variant === "underline") {
        indicatorStyle = vertical
          ? { top: rect.top, height: rect.height, insetInlineStart: 0, width: 2 }
          : { left: rect.left, width: rect.width, bottom: 0, height: 2 };
      } else {
        indicatorStyle = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      }
      if (activeAccent) indicatorStyle = { ...indicatorStyle, [ACCENT_VAR]: activeAccent } as React.CSSProperties;
    }

    return (
      <TabsPrimitive.List
        ref={setRefs}
        data-indicator={rect ? "ready" : undefined}
        className={cn(
          "group/tabs-list relative isolate inline-flex shrink-0 items-center",
          vertical ? "flex-col items-stretch" : "max-w-full overflow-x-auto scrollbar-none",
          variant === "underline" && (vertical ? "gap-1 border-s" : "gap-5 border-b"),
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
              (indicatorAccented ? accentIndicatorClass : indicatorClass)[variant as Exclude<TabsVariant, "ghost">],
              animate &&
                (indicatorAccented
                  ? "transition-[left,top,width,height,background-color,color] duration-300 ease-out-quart motion-reduce:transition-none"
                  : "transition-[left,top,width,height] duration-300 ease-out-quart motion-reduce:transition-none")
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
  /** Icon shown before the tab label. */
  icon?: React.ReactNode;
  /** Count badge after the label. */
  badge?: React.ReactNode;
  /** Categorical colour for this trigger when active; overrides the `Tabs` accent. */
  accent?: Accent;
}

/** A tab button with optional icon and count badge. */
export const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, TabsTriggerProps>(
  ({ className, icon, badge, accent, style, children, ...props }, ref) => {
    const { variant, size, orientation, accented: rootAccented } = React.useContext(TabsContext);
    const ownAccent = Boolean(accent);
    const accented = ownAccent || rootAccented;
    return (
      <TabsPrimitive.Trigger
        ref={ref}
        data-accent={ownAccent ? resolveAccent(accent) : undefined}
        style={accentStyle(accent, style)}
        className={cn(
          "group/tab relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-[color,background-color,box-shadow] duration-150",
          "disabled:pointer-events-none disabled:opacity-50",
          "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          orientation === "vertical" && "justify-start",
          triggerSize[variant][size],
          accented ? accentTriggerVariant[variant] : triggerVariant[variant],
          accented && accentIndicatorHandoff[variant],
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
                : accented
                  ? "bg-muted text-muted-foreground group-data-[state=active]/tab:bg-[color-mix(in_oklab,var(--sutra-accent,var(--primary))_14%,transparent)] group-data-[state=active]/tab:text-[var(--sutra-accent,var(--primary))]"
                  : "bg-muted text-muted-foreground group-data-[state=active]/tab:bg-primary-soft group-data-[state=active]/tab:text-primary-soft-foreground",
              variant === "pill" &&
                (accented
                  ? "bg-background group-data-[state=active]/tab:bg-[color-mix(in_oklab,var(--sutra-accent,var(--primary))_14%,transparent)]"
                  : "bg-background group-data-[state=active]/tab:bg-primary-soft")
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
