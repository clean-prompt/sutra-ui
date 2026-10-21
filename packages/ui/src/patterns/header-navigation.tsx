import * as React from "react";
import {
  Collapsible as CollapsiblePrimitive,
  Dialog as DialogPrimitive,
  NavigationMenu as NavigationMenuPrimitive,
  Slot,
} from "radix-ui";
import { RiArrowDownSLine, RiCloseLine, RiMenuLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { breakpoints } from "../lib/tokens";
import { useControllableState } from "../hooks/use-controllable-state";
import { useDirection } from "../hooks/use-direction";
import { useMediaQuery } from "../hooks/use-media-query";
import { Button } from "../primitives/button";
import { containerVariants } from "../primitives/layout";

export interface HeaderNavProps extends React.HTMLAttributes<HTMLElement> {
  /** Stick to the top of the viewport. Default true. */
  sticky?: boolean;
  /** "scroll": show the bottom border once the page scrolls. "always" / "never". */
  border?: "scroll" | "always" | "never";
  /** Inner container width. Default "lg". */
  containerSize?: "sm" | "md" | "lg" | "xl" | "full";
  /** Classes for the inner container that holds the brand, links and actions. */
  innerClassName?: string;
}

/** App / marketing header: glass bar that gains a border when the page scrolls. */
export const HeaderNav = React.forwardRef<HTMLElement, HeaderNavProps>(
  ({ sticky = true, border = "scroll", containerSize = "lg", className, innerClassName, children, ...props }, ref) => {
    const [scrolled, setScrolled] = React.useState(false);
    React.useEffect(() => {
      if (border !== "scroll" || !sticky || typeof window === "undefined") {
        setScrolled(false);
        return;
      }
      const onScroll = () => setScrolled(window.scrollY > 4);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }, [border, sticky]);
    const showBorder = border === "always" || (border === "scroll" && sticky && scrolled);
    return (
      <header
        ref={ref}
        data-slot="header-nav"
        data-scrolled={scrolled || undefined}
        className={cn(
          // z-40: sticky chrome sits above page content but below floating content/overlays (z-50).
          "z-40 w-full border-b transition-[border-color,box-shadow,background-color] duration-200",
          sticky && "sticky top-0 glass",
          !sticky && "bg-background",
          showBorder ? "border-border shadow-sm" : "border-transparent",
          className
        )}
        {...props}
      >
        <div className={cn(containerVariants({ size: containerSize }), "flex h-16 items-center gap-6", innerClassName)}>
          {children}
        </div>
      </header>
    );
  }
);
HeaderNav.displayName = "HeaderNav";

export interface HeaderNavBrandProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Render as the child element (e.g. a router `Link`) while keeping the brand styles. */
  asChild?: boolean;
}

/** Logo / product name link. */
export const HeaderNavBrand = React.forwardRef<HTMLAnchorElement, HeaderNavBrandProps>(
  ({ asChild, className, ...props }, ref) => {
    const Comp: React.ElementType = asChild ? Slot.Root : "a";
    return (
      <Comp
        ref={ref}
        data-slot="header-nav-brand"
        className={cn(
          "inline-flex shrink-0 items-center gap-2 rounded-sm text-base font-semibold tracking-tight text-foreground [&_svg]:size-6",
          focusRing,
          className
        )}
        {...props}
      />
    );
  }
);
HeaderNavBrand.displayName = "HeaderNavBrand";

export interface HeaderNavMenuProps extends React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root> {
  /** Classes for the `ul` that holds the menu items (the root keeps `className`). */
  listClassName?: string;
}

/** Desktop navigation menu (Radix NavigationMenu) with an animated mega-menu viewport. */
export const HeaderNavMenu = React.forwardRef<React.ElementRef<typeof NavigationMenuPrimitive.Root>, HeaderNavMenuProps>(({ className, listClassName, children, delayDuration = 120, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    data-slot="header-nav-menu"
    dir={useDirection()}
    delayDuration={delayDuration}
    className={cn("relative z-10 hidden max-w-max flex-1 items-center md:flex", className)}
    {...props}
  >
    <NavigationMenuPrimitive.List className={cn("flex flex-1 list-none items-center gap-0.5", listClassName)}>
      {children}
    </NavigationMenuPrimitive.List>
    <div className="absolute start-0 top-full isolate z-50 flex justify-center perspective-[2000px]">
      <NavigationMenuPrimitive.Viewport
        className={cn(
          "relative mt-2 h-(--radix-navigation-menu-viewport-height) w-(--radix-navigation-menu-viewport-width) origin-[top_center] overflow-hidden",
          "rounded-box border border-border bg-popover text-popover-foreground shadow-lg",
          "transition-[width,height] duration-300 ease-out-quart",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        )}
      />
    </div>
  </NavigationMenuPrimitive.Root>
));
HeaderNavMenu.displayName = "HeaderNavMenu";

/** Top-level menu entry. */
export const HeaderNavItem = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Item ref={ref} data-slot="header-nav-item" className={cn("relative", className)} {...props} />
));
HeaderNavItem.displayName = "HeaderNavItem";

const topLevelClass = cn(
  "group/nav inline-flex h-9 select-none items-center justify-center gap-1 rounded-control px-3 text-sm font-medium text-muted-foreground transition-colors duration-150",
  "hover:bg-accent hover:text-foreground data-[state=open]:text-foreground data-[active]:text-foreground",
  "disabled:pointer-events-none disabled:opacity-50",
  focusRing
);

/** Item that opens a mega-menu panel. */
export const HeaderNavTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger ref={ref} data-slot="header-nav-trigger" className={cn(topLevelClass, className)} {...props}>
    {children}
    <RiArrowDownSLine
      aria-hidden
      className="chevron-turn relative top-px size-4 opacity-70 group-data-[state=open]/nav:rotate-180"
    />
  </NavigationMenuPrimitive.Trigger>
));
HeaderNavTrigger.displayName = "HeaderNavTrigger";

/** Mega-menu panel; slides between triggers inside the shared viewport. */
export const HeaderNavContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    data-slot="header-nav-content"
    className={cn(
      "start-0 top-0 w-full p-2 md:absolute md:w-auto",
      "data-[motion^=from-]:animate-in data-[motion^=from-]:fade-in-0 data-[motion^=to-]:animate-out data-[motion^=to-]:fade-out-0",
      "data-[motion=from-end]:slide-in-from-end-12 data-[motion=from-start]:slide-in-from-start-12",
      "data-[motion=to-end]:slide-out-to-end-12 data-[motion=to-start]:slide-out-to-start-12",
      className
    )}
    {...props}
  />
));
HeaderNavContent.displayName = "HeaderNavContent";

export interface HeaderNavLinkProps extends React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Link> {
  /** Render as a plain top-level nav link (default) or a compact row inside a panel. */
  variant?: "top" | "panel";
}

/** Simple navigation link (top level or inside a panel). Use `asChild` for router links. */
export const HeaderNavLink = React.forwardRef<React.ElementRef<typeof NavigationMenuPrimitive.Link>, HeaderNavLinkProps>(
  ({ className, variant = "top", ...props }, ref) => (
    <NavigationMenuPrimitive.Link
      ref={ref}
      data-slot="header-nav-link"
      className={cn(
        variant === "top"
          ? topLevelClass
          : cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground",
              focusRing
            ),
        className
      )}
      {...props}
    />
  )
);
HeaderNavLink.displayName = "HeaderNavLink";

export interface HeaderNavFeatureLinkProps
  extends Omit<React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Link>, "title"> {
  /** Icon tile shown beside the title. */
  icon?: React.ReactNode;
  /** Link title. */
  title: React.ReactNode;
  /** One-line description under the title. */
  description?: React.ReactNode;
  /** Small tag after the title, e.g. "New". */
  badge?: React.ReactNode;
}

/** Rich panel link with icon tile, title and description. */
export const HeaderNavFeatureLink = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Link>,
  HeaderNavFeatureLinkProps
>(({ className, icon, title, description, badge, asChild, children, ...props }, ref) => {
  const body = (
    <>
      {icon && (
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-xs transition-colors group-hover/feature:border-primary/30 group-hover/feature:text-primary [&_svg]:size-[18px]">
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-sm font-medium leading-tight text-foreground">
          {title}
          {badge && (
            <span className="rounded-full bg-primary-soft px-1.5 py-px text-2xs font-semibold text-primary-soft-foreground">
              {badge}
            </span>
          )}
        </span>
        {description && <span className="line-clamp-2 text-sm leading-snug text-muted-foreground">{description}</span>}
      </span>
    </>
  );
  const linkClass = cn(
    "group/feature flex select-none items-start gap-3 rounded-md p-3 outline-none transition-colors duration-150 hover:bg-accent focus-visible:bg-accent",
    focusRing,
    className
  );
  if (asChild && React.isValidElement<{ children?: React.ReactNode }>(children)) {
    return (
      <NavigationMenuPrimitive.Link ref={ref} data-slot="header-nav-feature-link" asChild className={linkClass} {...props}>
        {React.cloneElement(children, undefined, body)}
      </NavigationMenuPrimitive.Link>
    );
  }
  return (
    <NavigationMenuPrimitive.Link ref={ref} data-slot="header-nav-feature-link" className={linkClass} {...props}>
      {body}
    </NavigationMenuPrimitive.Link>
  );
});
HeaderNavFeatureLink.displayName = "HeaderNavFeatureLink";

/** Right-aligned actions (sign in, CTA, theme toggle). */
export const HeaderNavActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="header-nav-actions" className={cn("ms-auto flex shrink-0 items-center gap-2", className)} {...props} />
  )
);
HeaderNavActions.displayName = "HeaderNavActions";

export interface HeaderNavMobileItem {
  label: React.ReactNode;
  href?: string;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  children?: HeaderNavMobileItem[];
}

export interface HeaderNavMobileProps {
  /** Links of the mobile menu; each has a label, an `href` and optional children for a sub-list. */
  items: HeaderNavMobileItem[];
  /** Controlled open state of the sheet. Use with `onOpenChange`. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Called when the sheet opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Shown at the top of the sheet. */
  brand?: React.ReactNode;
  /** Extra content at the bottom (CTA buttons). */
  children?: React.ReactNode;
  /** Router link renderer. Spread the given props onto your Link. */
  renderLink?: (props: {
    href: string;
    className: string;
    children: React.ReactNode;
    onClick: () => void;
  }) => React.ReactElement;
  /** Classes for the sheet content. */
  className?: string;
  /** Accessible label for the hamburger. */
  label?: string;
}

/** Hamburger button (mobile only) opening a slide-down sheet with nested sections. The ref points at the hamburger button. */
export const HeaderNavMobile = React.forwardRef<HTMLButtonElement, HeaderNavMobileProps>(function HeaderNavMobile(
  { items, open: openProp, defaultOpen = false, onOpenChange, brand, children, renderLink, className, label = "Open menu" },
  ref
) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const close = () => setOpen(false);
  // The sheet is md:hidden: left open past the breakpoint, its modal scroll lock would freeze an invisible page.
  const desktop = useMediaQuery(`(min-width: ${breakpoints.md}px)`);
  React.useEffect(() => {
    if (desktop && open) setOpen(false);
  }, [desktop, open, setOpen]);

  const renderEntry = (item: HeaderNavMobileItem, key: React.Key, nested = false): React.ReactNode => {
    const rowClass = cn(
      "flex w-full items-center gap-3 rounded-md text-start text-foreground transition-colors hover:bg-accent [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
      nested ? "px-3 py-2 text-sm" : "px-3 py-2.5 text-base font-medium",
      focusRing
    );
    const content = (
      <>
        {item.icon}
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{item.label}</span>
          {item.description && (
            <span className="truncate text-sm font-normal text-muted-foreground">{item.description}</span>
          )}
        </span>
      </>
    );
    if (item.children?.length) {
      return (
        <CollapsiblePrimitive.Root key={key} className="group/mobile-section">
          <CollapsiblePrimitive.Trigger className={cn(rowClass, "justify-between")}>
            <span className="flex min-w-0 items-center gap-3">{content}</span>
            <RiArrowDownSLine
              aria-hidden
              className="chevron-turn group-data-[state=open]/mobile-section:rotate-180"
            />
          </CollapsiblePrimitive.Trigger>
          <CollapsiblePrimitive.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <div className="ms-4 flex flex-col gap-0.5 border-s border-border py-1 ps-2">
              {item.children.map((child, i) => renderEntry(child, i, true))}
            </div>
          </CollapsiblePrimitive.Content>
        </CollapsiblePrimitive.Root>
      );
    }
    if (!item.href) {
      return (
        <div key={key} className={cn(rowClass, "hover:bg-transparent")}>
          {content}
        </div>
      );
    }
    if (renderLink) {
      return <React.Fragment key={key}>{renderLink({ href: item.href, className: rowClass, children: content, onClick: close })}</React.Fragment>;
    }
    return (
      <a key={key} href={item.href} className={rowClass} onClick={close}>
        {content}
      </a>
    );
  };

  return (
    <DialogPrimitive.Root open={open && !desktop} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button ref={ref} variant="ghost" size="icon" aria-label={label} className={cn("md:hidden", className)}>
          <RiMenuLine aria-hidden />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 md:hidden" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 top-0 z-50 flex max-h-dvh flex-col overflow-hidden rounded-b-2xl border-b border-border bg-background shadow-2xl outline-none md:hidden",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-top data-[state=open]:duration-300",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top data-[state=closed]:duration-200 ease-out-quart"
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between gap-4 px-4">
            <DialogPrimitive.Title className="min-w-0">{brand ?? <span className="text-base font-semibold">Menu</span>}</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close menu">
                <RiCloseLine aria-hidden />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">Site navigation</DialogPrimitive.Description>
          <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2 scrollbar-thin">
            {items.map((item, i) => renderEntry(item, i))}
          </nav>
          {children && (
            <div className="flex shrink-0 flex-col gap-2 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] [&>*]:w-full">
              {children}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
});
HeaderNavMobile.displayName = "HeaderNavMobile";
