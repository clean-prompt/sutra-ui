import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { formatBadgeCount } from "../lib/format";
import { useChangeKey } from "../hooks/use-change-key";
import { useControllableState } from "../hooks/use-controllable-state";

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

export type BottomTabBarBreakpoint = "sm" | "md" | "lg" | "xl" | "never";

const hideAboveClass: Record<BottomTabBarBreakpoint, string> = {
  sm: "sm:hidden",
  md: "md:hidden",
  lg: "lg:hidden",
  xl: "xl:hidden",
  never: "",
};

/** Props handed to `renderLink` so a router link can render the tab. */
export interface BottomTabBarLinkProps {
  href: string;
  className: string;
  children: React.ReactNode;
  "aria-current"?: "page";
  "aria-disabled"?: boolean;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  "data-state": "active" | "inactive";
}

/** Data shape for the `items` shorthand of `BottomTabBar` / `AdaptiveTabs`. */
export interface BottomTabBarItemData {
  value: string;
  label: React.ReactNode;
  icon: React.ReactNode;
  /** Icon shown while active (e.g. the filled variant). */
  activeIcon?: React.ReactNode;
  /** A number shows a count bubble; `true` shows a dot. */
  badge?: number | boolean;
  /** Renders a link (through `renderLink` when given). */
  href?: string;
  disabled?: boolean;
}

interface BottomTabBarContextValue {
  value: string | undefined;
  setValue: (value: string) => void;
  renderLink?: (props: BottomTabBarLinkProps) => React.ReactNode;
}

const BottomTabBarContext = React.createContext<BottomTabBarContextValue | null>(null);

function badgeLabel(badge: number | boolean | undefined) {
  if (badge === undefined || badge === false || badge === 0) return null;
  if (badge === true) return "new";
  return `${badge} new`;
}

/** The badge pops when its value changes (a new count, a dot appearing), never when the bar first renders. */
function TabBadge({ badge }: { badge: number | boolean | undefined }) {
  const changes = useChangeKey(badge);
  const pop = changes > 0 && "animate-pop";
  if (badge === undefined || badge === false || badge === 0) return null;
  if (badge === true) {
    return (
      <span
        key={changes}
        aria-hidden
        data-slot="badge-dot"
        className={cn("absolute end-2 top-0.5 size-2 rounded-full bg-destructive ring-2 ring-background", pop)}
      />
    );
  }
  return (
    <span
      key={changes}
      aria-hidden
      data-slot="badge-count"
      className={cn(
        "absolute -top-1 start-[calc(50%+4px)] flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none tabular-nums text-destructive-foreground ring-2 ring-background",
        pop
      )}
    >
      {formatBadgeCount(badge)}
    </span>
  );
}

/** The badge of an inline (non-bar) tab; same rule as `TabBadge`. */
function InlineTabBadge({ badge }: { badge: number | boolean | undefined }) {
  const changes = useChangeKey(badge);
  const pop = changes > 0 && "animate-pop";
  if (typeof badge === "number" && badge > 0) {
    return (
      <span key={changes} aria-hidden className={cn("rounded-full bg-primary-soft px-1.5 text-2xs font-semibold tabular-nums text-primary-soft-foreground", pop)}>
        {formatBadgeCount(badge)}
      </span>
    );
  }
  if (badge === true) return <span key={changes} aria-hidden className={cn("size-1.5 rounded-full bg-destructive", pop)} />;
  return null;
}

const itemClass = cn(
  "group/tab relative flex min-h-14 min-w-11 flex-1 select-none flex-col items-center justify-center gap-0.5 px-1 pb-1.5 pt-2",
  "text-muted-foreground transition-colors duration-150 hover:text-foreground active:bg-accent/60",
  "data-[state=active]:text-primary aria-disabled:pointer-events-none aria-disabled:opacity-50 disabled:pointer-events-none disabled:opacity-50",
  "rounded-md [&_svg]:size-[22px] [&_svg]:shrink-0",
  focusRing
);

/* ------------------------------------------------------------------ */
/* BottomTabBar                                                        */
/* ------------------------------------------------------------------ */

export interface BottomTabBarPrimaryAction {
  icon: React.ReactNode;
  /** Accessible name of the action. */
  label: string;
  onClick?: () => void;
}

export interface BottomTabBarProps extends Omit<React.HTMLAttributes<HTMLElement>, "defaultValue"> {
  /** Controlled value of the selected tab. Use with `onValueChange`. */
  value?: string;
  /** Initially selected tab value when uncontrolled. */
  defaultValue?: string;
  /** Called with the value of the tab the user picked. */
  onValueChange?: (value: string) => void;
  /** Data-driven tabs; alternatively pass `BottomTabBarItem` children. */
  items?: BottomTabBarItemData[];
  /** Hide the bar from this breakpoint up (CSS only). Default "md". */
  hideAbove?: BottomTabBarBreakpoint;
  /** `fixed` pins it to the viewport bottom (default); `static` renders it in flow (previews, frames). */
  position?: "fixed" | "sticky" | "static";
  /** Frosted translucent background. Default true. */
  glass?: boolean;
  /** Render tabs with an `href` through your router's link. */
  renderLink?: (props: BottomTabBarLinkProps) => React.ReactNode;
  /** Raised circular button in the middle of the bar (e.g. "New"). */
  primaryAction?: BottomTabBarPrimaryAction;
}

/** Fixed mobile bottom navigation: icon over label, ≥44px targets, badges and safe-area padding. */
export const BottomTabBar = React.forwardRef<HTMLElement, BottomTabBarProps>(
  (
    {
      value: valueProp,
      defaultValue,
      onValueChange,
      items,
      hideAbove = "md",
      position = "fixed",
      glass = true,
      renderLink,
      primaryAction,
      className,
      children,
      "aria-label": ariaLabel = "Primary",
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useControllableState<string | undefined>({
      value: valueProp,
      defaultValue: defaultValue ?? items?.[0]?.value,
      onChange: onValueChange as ((v: string | undefined) => void) | undefined,
    });
    const ctx = React.useMemo<BottomTabBarContextValue>(
      () => ({ value, setValue: (v: string) => setValue(v), renderLink }),
      [value, setValue, renderLink]
    );

    let content: React.ReactNode[] = items
      ? items.map((item) => <BottomTabBarItem key={item.value} {...item} />)
      : React.Children.toArray(children);

    if (primaryAction) {
      const mid = Math.floor(content.length / 2);
      const action = (
        <div key="__primary" className="flex min-w-14 flex-1 items-start justify-center">
          <button
            type="button"
            onClick={primaryAction.onClick}
            aria-label={primaryAction.label}
            data-slot="primary-action"
            className={cn(
              "-mt-5 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background",
              "transition-[transform,translate,scale,rotate,background-color] duration-150 hover:bg-primary-hover active:scale-95 [&_svg]:size-6",
              focusRing
            )}
          >
            {primaryAction.icon}
          </button>
        </div>
      );
      content = [...content.slice(0, mid), action, ...content.slice(mid)];
    }

    return (
      <BottomTabBarContext.Provider value={ctx}>
        <nav
          ref={ref}
          aria-label={ariaLabel}
          data-slot="bottom-tab-bar"
          className={cn(
            "z-40 w-full border-t border-border pb-[env(safe-area-inset-bottom)]",
            position === "fixed" && "fixed inset-x-0 bottom-0",
            position === "sticky" && "sticky bottom-0",
            glass ? "glass bg-background/80" : "bg-background",
            hideAboveClass[hideAbove],
            className
          )}
          {...props}
        >
          <ul className="mx-auto flex max-w-xl items-stretch justify-around px-1" role="list">
            {content.map((node, i) => (
              <li key={React.isValidElement(node) && node.key != null ? node.key : i} className="flex flex-1">
                {node}
              </li>
            ))}
          </ul>
        </nav>
      </BottomTabBarContext.Provider>
    );
  }
);
BottomTabBar.displayName = "BottomTabBar";

export interface BottomTabBarItemProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** Value this tab represents; the bar's `value` selects it. */
  value: string;
  /** Text label shown under the icon. */
  label: React.ReactNode;
  /** Icon shown above the label (inactive state). */
  icon: React.ReactNode;
  /** Icon shown instead of `icon` while the tab is active (e.g. a filled variant). */
  activeIcon?: React.ReactNode;
  /** Count badge on the icon; `true` shows a dot and `0` or `false` hides it. */
  badge?: number | boolean;
  /** Makes the tab a link to this URL. */
  href?: string;
  /** Disables the tab. */
  disabled?: boolean;
  /** Merge tab props into the single child element (e.g. a router `<Link>`). */
  asChild?: boolean;
  /** The single child element to render as the tab when `asChild` is set. */
  children?: React.ReactElement;
}

/** One tab of a `BottomTabBar`; renders a button, a link, or your own element via `asChild`. */
export const BottomTabBarItem = React.forwardRef<HTMLElement, BottomTabBarItemProps>(
  ({ value, label, icon, activeIcon, badge, href, disabled, asChild, className, onClick, children, ...props }, ref) => {
    const ctx = React.useContext(BottomTabBarContext);
    const active = ctx?.value === value;
    const extra = badgeLabel(badge);
    const inner = (
      <>
        <span className="relative flex h-7 w-14 items-center justify-center">
          <span
            aria-hidden
            data-slot="indicator"
            className="absolute inset-0 scale-x-50 rounded-full bg-primary-soft opacity-0 transition-[transform,translate,scale,rotate,opacity] duration-200 ease-out-quart group-data-[state=active]/tab:scale-x-100 group-data-[state=active]/tab:opacity-100"
          />
          <span className="relative flex">{active && activeIcon ? activeIcon : icon}</span>
          <TabBadge badge={badge} />
        </span>
        <span className="max-w-full truncate text-[11px] font-medium leading-tight">{label}</span>
        {extra ? <span className="sr-only">({extra})</span> : null}
      </>
    );

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      onClick?.(event);
      if (disabled) {
        event.preventDefault();
        return;
      }
      if (!event.defaultPrevented) ctx?.setValue(value);
    };

    const shared = {
      className: cn(itemClass, className),
      "aria-current": active ? ("page" as const) : undefined,
      "data-state": active ? ("active" as const) : ("inactive" as const),
      onClick: handleClick,
    };

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<Record<string, unknown>>;
      return React.cloneElement(child, {
        ...props,
        ...shared,
        ref,
        "aria-disabled": disabled || undefined,
        className: cn(shared.className, child.props.className as string | undefined),
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          (child.props.onClick as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)?.(event);
          handleClick(event);
        },
        children: inner,
      });
    }

    if (href) {
      if (ctx?.renderLink) {
        return <>{ctx.renderLink({ ...shared, href, children: inner, "aria-disabled": disabled || undefined })}</>;
      }
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={disabled ? undefined : href}
          aria-disabled={disabled || undefined}
          {...props}
          {...shared}
        >
          {inner}
        </a>
      );
    }

    return (
      <button ref={ref as React.Ref<HTMLButtonElement>} type="button" disabled={disabled} {...props} {...shared}>
        {inner}
      </button>
    );
  }
);
BottomTabBarItem.displayName = "BottomTabBarItem";

/* ------------------------------------------------------------------ */
/* AdaptiveTabs                                                        */
/* ------------------------------------------------------------------ */

const inlineShowClass: Record<"viewport" | "container", Record<"sm" | "md" | "lg", string>> = {
  viewport: { sm: "hidden sm:flex", md: "hidden md:flex", lg: "hidden lg:flex" },
  container: { sm: "hidden @sm:flex", md: "hidden @md:flex", lg: "hidden @lg:flex" },
};

const barHideClass: Record<"viewport" | "container", Record<"sm" | "md" | "lg", string>> = {
  viewport: { sm: "sm:hidden", md: "md:hidden", lg: "lg:hidden" },
  container: { sm: "@sm:hidden", md: "@md:hidden", lg: "@lg:hidden" },
};

export interface AdaptiveTabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  /** Tabs to show, in order; each has a `value`, a `label` and an `icon`. */
  items: BottomTabBarItemData[];
  /** Controlled selected tab value. Use with `onValueChange`. */
  value?: string;
  /** Initially selected tab value when uncontrolled. */
  defaultValue?: string;
  /** Called with the value of the tab the user picked. */
  onValueChange?: (value: string) => void;
  /** Width from which the inline pills replace the bottom bar. Default "md". */
  breakpoint?: "sm" | "md" | "lg";
  /** Measure the viewport (default) or the nearest wrapper (`container`, uses CSS container queries). */
  query?: "viewport" | "container";
  /** Force one presentation instead of switching by width. */
  mode?: "auto" | "inline" | "bottom";
  /** Renders each tab link in place of the default `<a>`, e.g. to use your router's Link. */
  renderLink?: (props: BottomTabBarLinkProps) => React.ReactNode;
  /** Extra props for the bottom bar (position, glass, primaryAction…). */
  bottomBarProps?: Omit<BottomTabBarProps, "items" | "value" | "onValueChange" | "defaultValue" | "renderLink">;
  /** Accessible name for both navigations. */
  label?: string;
}

/** Inline pill tabs on wide screens that become a `BottomTabBar` on phones — same items. */
export const AdaptiveTabs = React.forwardRef<HTMLDivElement, AdaptiveTabsProps>(
  (
    {
      items,
      value: valueProp,
      defaultValue,
      onValueChange,
      breakpoint = "md",
      query = "viewport",
      mode = "auto",
      renderLink,
      bottomBarProps,
      label = "Sections",
      className,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useControllableState<string | undefined>({
      value: valueProp,
      defaultValue: defaultValue ?? items[0]?.value,
      onChange: onValueChange as ((v: string | undefined) => void) | undefined,
    });

    const showInline = mode !== "bottom";
    const showBar = mode !== "inline";

    return (
      <div ref={ref} className={cn("min-w-0 max-w-full", query === "container" && "@container", className)} {...props}>
        {showInline && (
          <nav
            aria-label={label}
            data-slot="adaptive-tabs-inline"
            className={cn(
              "w-fit max-w-full items-center gap-1 overflow-x-auto rounded-control bg-muted p-1 scrollbar-none",
              mode === "auto" ? inlineShowClass[query][breakpoint] : "flex"
            )}
          >
            {items.map((item) => {
              const active = item.value === value;
              const extra = badgeLabel(item.badge);
              const cls = cn(
                "relative inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control px-3 text-sm font-medium text-muted-foreground transition-colors",
                "hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
                focusRing
              );
              const inner = (
                <>
                  {item.icon}
                  {item.label}
                  <InlineTabBadge badge={item.badge} />
                  {extra ? <span className="sr-only">({extra})</span> : null}
                </>
              );
              const shared = {
                className: cls,
                "aria-current": active ? ("page" as const) : undefined,
                "data-state": active ? ("active" as const) : ("inactive" as const),
                onClick: (event: React.MouseEvent<HTMLElement>) => {
                  if (item.disabled) return event.preventDefault();
                  setValue(item.value);
                },
              };
              if (item.href) {
                return (
                  <React.Fragment key={item.value}>
                    {renderLink ? (
                      renderLink({ ...shared, href: item.href, children: inner, "aria-disabled": item.disabled || undefined })
                    ) : (
                      <a href={item.disabled ? undefined : item.href} aria-disabled={item.disabled || undefined} {...shared}>
                        {inner}
                      </a>
                    )}
                  </React.Fragment>
                );
              }
              return (
                <button key={item.value} type="button" disabled={item.disabled} {...shared}>
                  {inner}
                </button>
              );
            })}
          </nav>
        )}
        {showBar && (
          <BottomTabBar
            aria-label={`${label} tab bar`}
            hideAbove="never"
            {...bottomBarProps}
            items={items}
            value={value}
            onValueChange={(v) => setValue(v)}
            renderLink={renderLink}
            className={cn(mode === "auto" && barHideClass[query][breakpoint], bottomBarProps?.className)}
          />
        )}
      </div>
    );
  }
);
AdaptiveTabs.displayName = "AdaptiveTabs";
