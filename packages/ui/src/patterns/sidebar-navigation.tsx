import * as React from "react";
import { Collapsible as CollapsiblePrimitive, Slot, Tooltip as TooltipPrimitive, VisuallyHidden } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { RiArrowRightSLine, RiExpandUpDownLine, RiLayoutLeftLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { breakpoints } from "../lib/tokens";
import { useControllableState } from "../hooks/use-controllable-state";
import { useMediaQuery } from "../hooks/use-media-query";
import { Avatar } from "../primitives/avatar";
import { Button, type ButtonProps } from "../primitives/button";
import { Tooltip, TooltipContent, TooltipProvider, useHasTooltipProvider } from "../primitives/tooltip";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "../primitives/dialog";
import { isEditableTarget, matchesShortcut } from "../lib/shortcuts";
import { useHasShortcutProvider } from "../hooks/use-shortcut-manager";
import { useLatestRef } from "../hooks/use-iso-layout-effect";
import { useShortcut } from "./shortcuts";

/** Below the `md` breakpoint the sidebar becomes a sheet. */
const MOBILE_QUERY = `(max-width: ${breakpoints.md - 1}px)`;

export interface SidebarContextValue {
  state: "expanded" | "collapsed";
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  isMobile: boolean;
  /** The layout fills its container instead of the viewport. */
  contained: boolean;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  /** Collapses on desktop, opens/closes the sheet on mobile. */
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

/** Access sidebar state. Must be used inside `SidebarProvider`. */
export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within <SidebarProvider>.");
  return ctx;
}

export interface SidebarProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Key used with ⌘/Ctrl to toggle. Default "b". Pass `null` to disable. */
  shortcut?: string | null;
  /** CSS width of the expanded sidebar. Default "16rem". */
  width?: string;
  /** CSS width in icon mode. Default "3rem". */
  iconWidth?: string;
  /**
   * Fill the parent element instead of the viewport (for previews, panels and nested layouts).
   * The parent needs a definite height.
   */
  contained?: boolean;
}

/** Holds collapsed / mobile state, registers ⌘B, and lays out sidebar + inset. */
export const SidebarProvider = React.forwardRef<HTMLDivElement, SidebarProviderProps>(
  (
    {
      collapsed: collapsedProp,
      defaultCollapsed = false,
      onCollapsedChange,
      shortcut = "b",
      width = "16rem",
      iconWidth = "3rem",
      contained = false,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useMediaQuery(MOBILE_QUERY);
    const [openMobile, setOpenMobile] = React.useState(false);
    const [collapsed, setCollapsed] = useControllableState({
      value: collapsedProp,
      defaultValue: defaultCollapsed,
      onChange: onCollapsedChange,
    });

    const toggleSidebar = React.useCallback(() => {
      if (isMobile) setOpenMobile((o) => !o);
      else setCollapsed(!collapsed);
    }, [isMobile, collapsed, setCollapsed]);

    const toggleRef = useLatestRef(toggleSidebar);

    const hasShortcutProvider = useHasShortcutProvider();
    useShortcut(hasShortcutProvider && shortcut ? `mod+${shortcut.toLowerCase()}` : null, () => toggleRef.current(), {
      id: "sutra:sidebar-toggle",
      label: "Toggle sidebar",
      group: "General",
      allowInInputs: true,
    });

    React.useEffect(() => {
      if (!shortcut || hasShortcutProvider) return;
      const onKeyDown = (event: KeyboardEvent) => {
        // ⌘ on macOS, Ctrl elsewhere; never inside text fields (Ctrl+B is a text-editing key on macOS).
        if (event.defaultPrevented || isEditableTarget(event.target)) return;
        if (matchesShortcut(event, `mod+${shortcut.toLowerCase()}`)) {
          event.preventDefault();
          toggleRef.current();
        }
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, [shortcut, hasShortcutProvider]);

    const ctx = React.useMemo<SidebarContextValue>(
      () => ({
        state: collapsed ? "collapsed" : "expanded",
        collapsed,
        setCollapsed,
        isMobile,
        contained,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [collapsed, setCollapsed, isMobile, contained, openMobile, toggleSidebar]
    );

    const hasTooltipProvider = useHasTooltipProvider();
    const layout = (
      <div
        ref={ref}
        data-sidebar-state={ctx.state}
        data-contained={contained || undefined}
        style={{ "--sidebar-width": width, "--sidebar-width-icon": iconWidth, ...style } as React.CSSProperties}
        className={cn(
          "group/sidebar-wrapper flex w-full has-data-[variant=inset]:bg-subtle",
          contained ? "relative h-full min-h-0 overflow-hidden" : "min-h-svh",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );

    return (
      <SidebarContext.Provider value={ctx}>
        {hasTooltipProvider ? layout : <TooltipProvider>{layout}</TooltipProvider>}
      </SidebarContext.Provider>
    );
  }
);
SidebarProvider.displayName = "SidebarProvider";

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  variant?: "default" | "inset" | "floating";
  /** icon: shrink to an icon rail · offcanvas: slide fully away · none: never collapse. */
  collapsible?: "icon" | "offcanvas" | "none";
  side?: "left" | "right";
  /** Accessible title for the mobile sheet. */
  mobileTitle?: string;
}

/** App sidebar. Collapses to icons on desktop and becomes a sheet on mobile. */
export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  (
    {
      variant = "default",
      collapsible = "icon",
      side = "left",
      mobileTitle = "Navigation",
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { isMobile, openMobile, setOpenMobile, collapsed, contained } = useSidebar();

    if (isMobile && collapsible !== "none") {
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent
            side={side}
            showClose={false}
            data-sidebar="sidebar"
            data-mobile="true"
            className="group/sidebar w-(--sidebar-width) max-w-[85vw] gap-0 bg-subtle p-0"
          >
            <VisuallyHidden.Root>
              <SheetTitle>{mobileTitle}</SheetTitle>
              <SheetDescription>Main navigation</SheetDescription>
            </VisuallyHidden.Root>
            <div className="flex h-full w-full flex-col">{children}</div>
          </SheetContent>
        </Sheet>
      );
    }

    const isCollapsed = collapsed && collapsible !== "none";
    return (
      <aside
        ref={ref}
        data-sidebar="sidebar"
        data-state={isCollapsed ? "collapsed" : "expanded"}
        data-collapsible={isCollapsed ? collapsible : undefined}
        data-variant={variant}
        data-side={side}
        className={cn(
          "group/sidebar peer hidden shrink-0 overflow-hidden text-foreground md:flex",
          contained ? "h-full self-stretch" : "sticky top-0 h-svh",
          "transition-[width] duration-200 ease-out-quart motion-reduce:transition-none",
          "w-(--sidebar-width) data-[collapsible=icon]:w-(--sidebar-width-icon) data-[collapsible=offcanvas]:w-0",
          variant !== "default" &&
            "data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+1rem)] data-[collapsible=offcanvas]:w-0",
          side === "right" && "order-last",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "flex h-full w-full min-w-0 flex-col overflow-hidden",
            "group-data-[collapsible=offcanvas]/sidebar:w-(--sidebar-width) group-data-[collapsible=offcanvas]/sidebar:min-w-(--sidebar-width)",
            variant === "default" && cn("bg-subtle", side === "left" ? "border-r border-border" : "border-l border-border"),
            variant === "floating" && "m-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] rounded-box border border-border bg-background shadow-sm",
            variant === "inset" && "bg-transparent"
          )}
        >
          {children}
        </div>
      </aside>
    );
  }
);
Sidebar.displayName = "Sidebar";

/** Top area (brand, workspace switcher). */
export const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-sidebar="header" className={cn("flex shrink-0 flex-col gap-2 p-2", className)} {...props} />
  )
);
SidebarHeader.displayName = "SidebarHeader";

/** Scrollable middle area. */
export const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden scrollbar-thin",
        "group-data-[collapsible=icon]/sidebar:overflow-hidden",
        className
      )}
      {...props}
    />
  )
);
SidebarContent.displayName = "SidebarContent";

/** Bottom area (user card, settings). */
export const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-sidebar="footer" className={cn("mt-auto flex shrink-0 flex-col gap-2 p-2", className)} {...props} />
  )
);
SidebarFooter.displayName = "SidebarFooter";

/** Section of related menu items. */
export const SidebarGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-sidebar="group" className={cn("relative flex w-full min-w-0 flex-col p-2", className)} {...props} />
  )
);
SidebarGroup.displayName = "SidebarGroup";

/** Group heading; fades out in icon mode. */
export const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ className, asChild, ...props }, ref) => {
  const Comp: React.ElementType = asChild ? Slot.Root : "div";
  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "flex h-8 shrink-0 items-center rounded-sm px-2 text-xs font-medium text-muted-foreground",
        "transition-[margin,opacity] duration-200 ease-out-quart",
        "group-data-[collapsible=icon]/sidebar:-mt-8 group-data-[collapsible=icon]/sidebar:opacity-0",
        "[&>svg]:size-4 [&>svg]:shrink-0",
        className
      )}
      {...props}
    />
  );
});
SidebarGroupLabel.displayName = "SidebarGroupLabel";

/** List of menu items. */
export const SidebarMenu = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} data-sidebar="menu" className={cn("flex w-full min-w-0 flex-col gap-0.5", className)} {...props} />
  )
);
SidebarMenu.displayName = "SidebarMenu";

/** Wrapper for a menu button (and its sub menu). */
export const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => (
    <li ref={ref} data-sidebar="menu-item" className={cn("group/menu-item relative", className)} {...props} />
  )
);
SidebarMenuItem.displayName = "SidebarMenuItem";

export const sidebarMenuButtonVariants = cva(
  [
    "peer/menu-button relative flex w-full items-center gap-2.5 overflow-hidden rounded-control px-2 text-left text-sm text-foreground/80 outline-none",
    "transition-[width,height,padding,background-color,color] duration-150",
    "hover:bg-accent hover:text-foreground active:bg-accent",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "data-[active=true]:bg-background data-[active=true]:font-medium data-[active=true]:text-foreground data-[active=true]:shadow-xs data-[active=true]:ring-1 data-[active=true]:ring-border",
    "data-[state=open]:hover:bg-accent",
    "group-data-[collapsible=icon]/sidebar:size-8! group-data-[collapsible=icon]/sidebar:p-2!",
    "group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:[&>*:not(:first-child)]:sr-only",
    "[&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground data-[active=true]:[&>svg]:text-primary",
    focusRing,
  ],
  {
    variants: {
      size: {
        sm: "h-7 text-xs",
        md: "h-8",
        lg: "h-12 group-data-[collapsible=icon]/sidebar:p-0!",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface SidebarMenuButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof sidebarMenuButtonVariants> {
  asChild?: boolean;
  /** Marks the current page (sets `aria-current="page"`). */
  active?: boolean;
  /** @deprecated Use `active`. */
  isActive?: boolean;
  icon?: React.ReactNode;
  /** Count or status shown on the right; hidden in icon mode. */
  badge?: React.ReactNode;
  /** Tooltip in icon mode. Defaults to `children` when it is a string. */
  tooltip?: React.ReactNode;
}

/** Menu row: icon, label, badge; shows a tooltip when the sidebar is collapsed to icons. */
export const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ asChild, active: activeProp, isActive: isActiveProp, icon, badge, tooltip, size, className, children, ...props }, ref) => {
    const isActive = activeProp ?? isActiveProp;
    const { collapsed, isMobile } = useSidebar();
    const Comp: React.ElementType = asChild ? Slot.Root : "button";
    const badgeNode =
      badge != null && badge !== false ? (
        <span
          data-sidebar="menu-badge"
          className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 text-2xs font-semibold tabular-nums text-muted-foreground group-data-[collapsible=icon]/sidebar:hidden in-data-[active=true]:bg-primary-soft in-data-[active=true]:text-primary-soft-foreground"
        >
          {badge}
        </span>
      ) : null;

    const button = (
      <Comp
        ref={ref}
        type={asChild ? undefined : "button"}
        data-sidebar="menu-button"
        data-active={isActive || undefined}
        aria-current={isActive ? "page" : undefined}
        className={cn(sidebarMenuButtonVariants({ size }), className)}
        {...props}
      >
        {icon}
        {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : <span className="min-w-0 flex-1 truncate">{children}</span>}
        {badgeNode}
      </Comp>
    );

    const tip = tooltip ?? (typeof children === "string" ? children : null);
    if (!tip) return button;
    return (
      <Tooltip delayDuration={0}>
        <TooltipPrimitive.Trigger asChild>{button}</TooltipPrimitive.Trigger>
        <TooltipContent side="right" align="center" hidden={!collapsed || isMobile}>
          {tip}
        </TooltipContent>
      </Tooltip>
    );
  }
);
SidebarMenuButton.displayName = "SidebarMenuButton";

export interface SidebarMenuSubProps
  extends Omit<React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root>, "children"> {
  /** Custom trigger element (wrapped with Collapsible.Trigger asChild). */
  trigger?: React.ReactElement;
  /** Or let the sub menu render its own trigger button. */
  label?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  /** Marks the current page (sets `aria-current="page"`). */
  active?: boolean;
  /** @deprecated Use `active`. */
  isActive?: boolean;
  children?: React.ReactNode;
}

/** Collapsible nested menu under a menu item. Hidden in icon mode. */
export const SidebarMenuSub = React.forwardRef<HTMLDivElement, SidebarMenuSubProps>(
  ({ trigger, label, icon, badge, active, isActive, className, children, ...props }, ref) => (
    <CollapsiblePrimitive.Root ref={ref} className={cn("group/menu-sub", className)} {...props}>
      <CollapsiblePrimitive.Trigger asChild>
        {trigger ?? (
          <SidebarMenuButton icon={icon} active={active ?? isActive} tooltip={typeof label === "string" ? label : undefined}>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {badge != null && (
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 text-2xs font-semibold tabular-nums text-muted-foreground">
                  {badge}
                </span>
              )}
              <RiArrowRightSLine
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out-quart group-data-[state=open]/menu-sub:rotate-90"
              />
            </span>
          </SidebarMenuButton>
        )}
      </CollapsiblePrimitive.Trigger>
      <CollapsiblePrimitive.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down group-data-[collapsible=icon]/sidebar:hidden">
        <ul
          data-sidebar="menu-sub"
          className="ml-4 mt-0.5 flex min-w-0 flex-col gap-0.5 border-l border-border py-0.5 pl-2.5"
        >
          {children}
        </ul>
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  )
);
SidebarMenuSub.displayName = "SidebarMenuSub";

export interface SidebarMenuSubButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean;
  /** Marks the current page (sets `aria-current="page"`). */
  active?: boolean;
  /** @deprecated Use `active`. */
  isActive?: boolean;
  icon?: React.ReactNode;
  size?: "sm" | "md";
}

/** Nested link row inside `SidebarMenuSub`. Wrapped in its own list item. */
export const SidebarMenuSubButton = React.forwardRef<HTMLAnchorElement, SidebarMenuSubButtonProps>(
  ({ asChild, active: activeProp, isActive: isActiveProp, icon, size = "md", className, children, ...props }, ref) => {
    const isActive = activeProp ?? isActiveProp;
    const Comp: React.ElementType = asChild ? Slot.Root : "a";
    return (
      <li className="relative">
        {isActive && <span aria-hidden className="absolute -left-[11px] inset-y-1.5 w-px rounded-full bg-primary" />}
        <Comp
          ref={ref}
          data-sidebar="menu-sub-button"
          data-active={isActive || undefined}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "flex min-w-0 items-center gap-2 overflow-hidden rounded-control px-2 text-muted-foreground transition-colors",
            "hover:bg-accent hover:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50",
            "data-[active=true]:font-medium data-[active=true]:text-foreground",
            "[&>svg]:size-4 [&>svg]:shrink-0 [&>span:last-child]:truncate",
            size === "sm" ? "h-7 text-xs" : "h-8 text-sm",
            focusRing,
            className
          )}
          {...props}
        >
          {icon}
          {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : <span>{children}</span>}
        </Comp>
      </li>
    );
  }
);
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";

/** Button that toggles the sidebar (⌘B). */
export const SidebarTrigger = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ onClick, variant = "ghost", size = "icon-sm", children, ...props }, ref) => {
    const { toggleSidebar, state } = useSidebar();
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        data-sidebar="trigger"
        aria-label="Toggle sidebar"
        aria-expanded={state === "expanded"}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) toggleSidebar();
        }}
        {...props}
      >
        {children ?? <RiLayoutLeftLine aria-hidden />}
      </Button>
    );
  }
);
SidebarTrigger.displayName = "SidebarTrigger";

export interface SidebarInsetProps extends React.HTMLAttributes<HTMLElement> {
  /** Element to render. Default `"main"`; use `"div"` when the page already has a `<main>`. */
  as?: React.ElementType;
  /** Merge props onto the single child element instead of rendering a wrapper. */
  asChild?: boolean;
}

/** Main content area next to the sidebar. Raised card when the sidebar is `inset`. */
export const SidebarInset = React.forwardRef<HTMLElement, SidebarInsetProps>(
  ({ as = "main", asChild, className, ...props }, ref) => {
    const ctx = React.useContext(SidebarContext);
    const contained = ctx?.contained ?? false;
    const Comp: React.ElementType = asChild ? Slot.Root : as;
    return (
      <Comp
        ref={ref}
        data-sidebar="inset"
        className={cn(
          "relative flex min-w-0 flex-1 flex-col bg-background",
          contained ? "h-full min-h-0 overflow-auto" : "min-h-svh",
          "md:peer-data-[variant=inset]:my-2 md:peer-data-[variant=inset]:mr-2",
          contained
            ? "md:peer-data-[variant=inset]:h-[calc(100%-1rem)]"
            : "md:peer-data-[variant=inset]:min-h-[calc(100svh-1rem)]",
          "md:peer-data-[variant=inset]:rounded-box md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:border-border md:peer-data-[variant=inset]:shadow-sm",
          "md:peer-data-[variant=inset]:peer-data-[collapsible=offcanvas]:ml-2",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarInset.displayName = "SidebarInset";

/** Divider line inside the sidebar. */
export const SidebarSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="separator"
      data-sidebar="separator"
      className={cn("mx-2 h-px shrink-0 bg-border", className)}
      {...props}
    />
  )
);
SidebarSeparator.displayName = "SidebarSeparator";

export interface SidebarUserCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  name: string;
  email?: string;
  /** Image URL; falls back to initials. */
  avatarSrc?: string;
  /** Background of the initials circle. Defaults to a color derived from the name. */
  avatarColor?: string;
  /** Hide the trailing chevron. */
  hideChevron?: boolean;
}

/** Account row with an `Avatar` (solid seed colour), name, email and chevron. Use as a dropdown trigger. */
export const SidebarUserCard = React.forwardRef<HTMLButtonElement, SidebarUserCardProps>(
  ({ name, email, avatarSrc, avatarColor, hideChevron, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      data-sidebar="user-card"
      className={cn(
        "flex h-12 w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-control p-2 text-left text-sm outline-none transition-[background-color,padding] duration-150",
        "hover:bg-accent data-[state=open]:bg-accent",
        "group-data-[collapsible=icon]/sidebar:size-8! group-data-[collapsible=icon]/sidebar:p-0!",
        focusRing,
        className
      )}
      {...props}
    >
      <Avatar
        aria-hidden
        size="sm"
        src={avatarSrc}
        alt=""
        name={name}
        color={avatarColor}
        variant="solid"
        initialsOptions={{ fallback: "?" }}
        fallbackClassName="font-semibold"
      />
      <span className="grid min-w-0 flex-1 leading-tight">
        <span className="truncate font-medium text-foreground">{name}</span>
        {email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
      </span>
      {!hideChevron && <RiExpandUpDownLine aria-hidden className="ml-auto size-4 shrink-0 text-muted-foreground" />}
    </button>
  )
);
SidebarUserCard.displayName = "SidebarUserCard";
