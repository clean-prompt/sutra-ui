import * as React from "react";
import { NavigationMenu as NavigationMenuPrimitive } from "radix-ui";
import {
  RiArrowRightLine,
  RiArrowRightUpLine,
  RiBookOpenLine,
  RiCalendarEventLine,
  RiCheckboxCircleLine,
  RiCodeSSlashLine,
  RiFileTextLine,
  RiGithubFill,
  RiHome5Line,
  RiMoonLine,
  RiSearchLine,
  RiSettings3Line,
  RiStickyNoteLine,
  RiSunLine,
  RiArrowDownSLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { Button } from "../components/button";
import { Badge } from "../components/badge";
import { Kbd } from "../components/typography";
import { Separator } from "../components/separator";
import {
  HeaderNav,
  HeaderNavActions,
  HeaderNavBrand,
  HeaderNavContent,
  HeaderNavItem,
  HeaderNavLink,
  HeaderNavMenu,
  HeaderNavMobile,
  HeaderNavTrigger,
  type HeaderNavMobileItem,
} from "../components/header-navigation";
import { Breadcrumbs, type BreadcrumbCrumb } from "../components/breadcrumbs";
import { SidebarTrigger } from "../components/sidebar-navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  useCommandMenuShortcut,
} from "../components/command-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../components/dropdown-menu";
import { SimpleTooltip } from "../components/tooltip";
import { MeshGradient } from "../components/mesh-gradient";
import { SutraAppIcon, SutraLogo, sutraAppMeta, sutraApps, type SutraApp } from "../assets/brand";
import { NotificationsMenu, UserAccountMenu, type NotificationItem, type UserAccountMenuUser } from "./dropdown-menu-blocks";
import { BlockLink, sutraAppDescriptions, type BlockLinkRenderer } from "./block-utils";
import { demoUser } from "./demo-data";

export interface HeaderLink {
  label: React.ReactNode;
  href: string;
}

/** Search field look-alike that opens a command palette. */
function SearchTrigger({
  onClick,
  placeholder = "Search…",
  className,
}: {
  onClick: () => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label="Search (⌘K)"
        aria-keyshortcuts="Meta+K Control+K"
        className={cn(
          "hidden h-9 w-full max-w-72 items-center gap-2 rounded-control border border-input bg-background pl-3 pr-1.5 text-sm text-muted-foreground shadow-xs transition-colors hover:border-border-strong hover:text-foreground sm:flex",
          focusRing,
          className
        )}
      >
        <RiSearchLine aria-hidden className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">{placeholder}</span>
        <span className="flex items-center gap-0.5" aria-hidden>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
      <Button variant="ghost" size="icon" aria-label="Search" onClick={onClick} className="sm:hidden">
        <RiSearchLine aria-hidden />
      </Button>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* MarketingHeader                                                     */
/* ------------------------------------------------------------------ */

export interface MarketingHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** Apps listed in the Products mega-menu. */
  apps?: SutraApp[];
  /** Plain links after "Products". */
  links?: HeaderLink[];
  logo?: React.ReactNode;
  homeHref?: string;
  loginHref?: string;
  signupHref?: string;
  loginLabel?: React.ReactNode;
  signupLabel?: React.ReactNode;
  renderLink?: BlockLinkRenderer;
  /** href for each app in the mega-menu. */
  getAppHref?: (app: SutraApp) => string;
  sticky?: boolean;
  border?: "scroll" | "always" | "never";
}

const defaultMarketingLinks: HeaderLink[] = [
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#docs" },
  { label: "Changelog", href: "#changelog" },
];

/** Marketing site header: logo, Products mega-menu of the 8 Sutra apps, links, auth actions and a mobile sheet. */
export const MarketingHeader = React.forwardRef<HTMLElement, MarketingHeaderProps>(
  (
    {
      apps = [...sutraApps],
      links = defaultMarketingLinks,
      logo,
      homeHref = "/",
      loginHref = "#login",
      signupHref = "#signup",
      loginLabel = "Sign in",
      signupLabel = "Get started",
      renderLink,
      getAppHref = (app) => `#${app}`,
      sticky = true,
      border = "scroll",
      ...props
    },
    ref
  ) => {
    const mobileItems: HeaderNavMobileItem[] = [
      {
        label: "Products",
        children: apps.map((app) => ({
          label: sutraAppMeta[app].name,
          href: getAppHref(app),
          icon: <SutraAppIcon app={app} size={18} />,
        })),
      },
      ...links.map((l) => ({ label: l.label, href: l.href })),
    ];
    const brand = logo ?? <SutraLogo size="sm" />;
    const linkAs = (href: string, child: React.ReactElement) =>
      renderLink ? (
        <NavigationMenuPrimitive.Link asChild>{renderLink({ href, children: child })}</NavigationMenuPrimitive.Link>
      ) : null;

    return (
      <HeaderNav ref={ref} sticky={sticky} border={border} {...props}>
        <HeaderNavBrand asChild>
          <BlockLink href={homeHref} renderLink={renderLink}>
            {brand}
          </BlockLink>
        </HeaderNavBrand>
        <HeaderNavMenu>
          <HeaderNavItem>
            <HeaderNavTrigger>Products</HeaderNavTrigger>
            <HeaderNavContent>
              <div className="grid w-[min(calc(100vw-2rem),780px)] gap-2 md:grid-cols-[1fr_232px]">
                <ul className="grid grid-cols-2 gap-0.5">
                  {apps.map((app) => {
                    const body = (
                      <>
                        <SutraAppIcon app={app} size={36} shape="squircle" className="shadow-xs transition-transform duration-200 group-hover/app:scale-105" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium leading-tight text-foreground">
                            Sutra {sutraAppMeta[app].name}
                          </span>
                          <span className="mt-1 line-clamp-2 block text-xs leading-snug text-muted-foreground">
                            {sutraAppDescriptions[app]}
                          </span>
                        </span>
                      </>
                    );
                    const cls = cn(
                      "group/app flex select-none items-start gap-3 rounded-md p-2.5 transition-colors duration-150 hover:bg-accent focus-visible:bg-accent",
                      focusRing
                    );
                    return (
                      <li key={app}>
                        {renderLink ? (
                          linkAs(getAppHref(app), <span className={cls}>{body}</span>)
                        ) : (
                          <NavigationMenuPrimitive.Link href={getAppHref(app)} className={cls}>
                            {body}
                          </NavigationMenuPrimitive.Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <MeshGradient
                  intensity={0.75}
                  blur={40}
                  className="hidden flex-col justify-end gap-2 rounded-md border border-border bg-brand-950 p-4 text-white md:flex"
                >
                  <div className="mb-auto flex -space-x-1.5">
                    {apps.slice(0, 4).map((app) => (
                      <SutraAppIcon key={app} app={app} size={28} className="rounded-[8px] ring-2 ring-brand-950" />
                    ))}
                  </div>
                  <p className="text-sm font-semibold">The Sutra Suite</p>
                  <p className="text-xs leading-snug text-white/75">All {apps.length} apps, one thread, one subscription.</p>
                  <NavigationMenuPrimitive.Link
                    href={signupHref}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-white hover:underline"
                  >
                    Try it free <RiArrowRightLine aria-hidden className="size-3.5" />
                  </NavigationMenuPrimitive.Link>
                </MeshGradient>
              </div>
            </HeaderNavContent>
          </HeaderNavItem>
          {links.map((l) => (
            <HeaderNavItem key={l.href}>
              {renderLink ? (
                <HeaderNavLink asChild>{renderLink({ href: l.href, children: l.label })}</HeaderNavLink>
              ) : (
                <HeaderNavLink href={l.href}>{l.label}</HeaderNavLink>
              )}
            </HeaderNavItem>
          ))}
        </HeaderNavMenu>
        <HeaderNavActions>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <BlockLink href={loginHref} renderLink={renderLink}>
              {loginLabel}
            </BlockLink>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <BlockLink href={signupHref} renderLink={renderLink}>
              {signupLabel}
            </BlockLink>
          </Button>
          <HeaderNavMobile items={mobileItems} brand={brand} renderLink={renderLink}>
            <Button asChild variant="secondary" size="lg">
              <BlockLink href={loginHref} renderLink={renderLink}>
                {loginLabel}
              </BlockLink>
            </Button>
            <Button asChild size="lg">
              <BlockLink href={signupHref} renderLink={renderLink}>
                {signupLabel}
              </BlockLink>
            </Button>
          </HeaderNavMobile>
        </HeaderNavActions>
      </HeaderNav>
    );
  }
);
MarketingHeader.displayName = "MarketingHeader";

/* ------------------------------------------------------------------ */
/* AppHeader                                                           */
/* ------------------------------------------------------------------ */

export interface AppHeaderCommand {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  shortcut?: string[];
}

export interface AppHeaderCommandGroup {
  heading: React.ReactNode;
  items: AppHeaderCommand[];
}

export interface AppHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  breadcrumbs?: BreadcrumbCrumb[];
  /** Render the sidebar toggle. Requires a `SidebarProvider` ancestor (e.g. `AppShell`). */
  showSidebarTrigger?: boolean;
  user?: UserAccountMenuUser;
  notifications?: NotificationItem[];
  commandGroups?: AppHeaderCommandGroup[];
  onCommand?: (value: string) => void;
  onSignOut?: () => void;
  onAccountSelect?: (key: string) => void;
  /** Extra actions before the notifications bell. */
  actions?: React.ReactNode;
  searchPlaceholder?: string;
  renderLink?: BlockLinkRenderer;
}

const defaultCrumbs: BreadcrumbCrumb[] = [
  { label: "Northwind Studio", href: "#" },
  { label: "Projects", href: "#projects" },
  { label: "Q4 Launch Plan" },
];

const defaultCommandGroups: AppHeaderCommandGroup[] = [
  {
    heading: "Quick actions",
    items: [
      { value: "new-note", label: "New note", icon: <RiStickyNoteLine aria-hidden />, shortcut: ["⌥", "N"] },
      { value: "new-task", label: "New task", icon: <RiCheckboxCircleLine aria-hidden />, shortcut: ["⌥", "T"] },
      { value: "new-event", label: "New event", icon: <RiCalendarEventLine aria-hidden />, shortcut: ["⌥", "E"] },
    ],
  },
  {
    heading: "Apps",
    items: sutraApps.map((app) => ({
      value: `open-${app}`,
      label: `Open ${sutraAppMeta[app].name}`,
      icon: <SutraAppIcon app={app} size={16} />,
    })),
  },
  {
    heading: "Navigation",
    items: [
      { value: "home", label: "Go to Home", icon: <RiHome5Line aria-hidden />, shortcut: ["G", "H"] },
      { value: "settings", label: "Settings", icon: <RiSettings3Line aria-hidden />, shortcut: ["⌘", ","] },
    ],
  },
];

/** App top bar: sidebar trigger, breadcrumbs, ⌘K search palette, notifications and account menu. */
export const AppHeader = React.forwardRef<HTMLElement, AppHeaderProps>(
  (
    {
      breadcrumbs = defaultCrumbs,
      showSidebarTrigger = true,
      user = { ...demoUser, plan: "Pro" },
      notifications,
      commandGroups = defaultCommandGroups,
      onCommand,
      onSignOut,
      onAccountSelect,
      actions,
      searchPlaceholder = "Search or jump to…",
      renderLink,
      className,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    useCommandMenuShortcut(setOpen);
    return (
      <header
        ref={ref}
        className={cn(
          "@container sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md sm:px-4",
          className
        )}
        {...props}
      >
        {showSidebarTrigger && (
          <>
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-1 h-4 min-h-4 self-center" />
          </>
        )}
        <Breadcrumbs
          items={breadcrumbs}
          maxItems={3}
          renderLink={renderLink}
          className="min-w-0 flex-1 [&_ol]:flex-nowrap [&_li]:min-w-0 [&_li]:truncate max-sm:[&_li:not(:last-child)]:hidden @max-3xl:[&_li:not(:last-child)]:hidden"
        />
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <SearchTrigger onClick={() => setOpen(true)} placeholder={searchPlaceholder} className="w-60 lg:w-72" />
          {actions}
          <NotificationsMenu defaultNotifications={notifications} />
          <UserAccountMenu user={user} onSignOut={onSignOut} onSelect={onAccountSelect} />
        </div>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="Type a command or search…" />
          <CommandList>
            <CommandEmpty>No results found</CommandEmpty>
            {commandGroups.map((group, gi) => (
              <React.Fragment key={gi}>
                {gi > 0 && <CommandSeparator />}
                <CommandGroup heading={group.heading}>
                  {group.items.map((item) => (
                    <CommandItem
                      key={item.value}
                      value={item.value + " " + (typeof item.label === "string" ? item.label : "")}
                      icon={item.icon}
                      shortcut={item.shortcut}
                      onSelect={() => {
                        setOpen(false);
                        onCommand?.(item.value);
                      }}
                    >
                      {item.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </CommandDialog>
      </header>
    );
  }
);
AppHeader.displayName = "AppHeader";

/* ------------------------------------------------------------------ */
/* CenteredHeader                                                      */
/* ------------------------------------------------------------------ */

export interface CenteredHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  leftLinks?: HeaderLink[];
  rightLinks?: HeaderLink[];
  logo?: React.ReactNode;
  homeHref?: string;
  /** Call to action on the far right. Pass `null` to hide. */
  cta?: React.ReactNode;
  renderLink?: BlockLinkRenderer;
  sticky?: boolean;
  border?: "scroll" | "always" | "never";
}

const navLinkClass = cn(
  "inline-flex h-9 items-center rounded-control px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
  focusRing
);

/** Logo in the center, navigation split into left and right groups. */
export const CenteredHeader = React.forwardRef<HTMLElement, CenteredHeaderProps>(
  (
    {
      leftLinks = [
        { label: "Product", href: "#product" },
        { label: "Apps", href: "#apps" },
        { label: "Pricing", href: "#pricing" },
      ],
      rightLinks = [
        { label: "Stories", href: "#stories" },
        { label: "Blog", href: "#blog" },
      ],
      logo,
      homeHref = "/",
      cta,
      renderLink,
      sticky = true,
      border = "always",
      ...props
    },
    ref
  ) => {
    const brand = logo ?? <SutraLogo size="sm" />;
    const renderLinks = (items: HeaderLink[]) =>
      items.map((l) => (
        <BlockLink key={l.href} href={l.href} renderLink={renderLink} className={navLinkClass}>
          {l.label}
        </BlockLink>
      ));
    return (
      <HeaderNav ref={ref} sticky={sticky} border={border} innerClassName="grid grid-cols-[1fr_auto_1fr] gap-4" {...props}>
        <nav aria-label="Primary" className="hidden items-center gap-0.5 md:flex">
          {renderLinks(leftLinks)}
        </nav>
        <div className="md:hidden" />
        <BlockLink
          href={homeHref}
          renderLink={renderLink}
          className={cn("inline-flex justify-self-center rounded-sm", focusRing)}
        >
          {brand}
        </BlockLink>
        <div className="flex items-center justify-end gap-0.5">
          <nav aria-label="Secondary" className="hidden items-center gap-0.5 md:flex">
            {renderLinks(rightLinks)}
          </nav>
          {cta !== null && (
            <div className="ml-2 hidden sm:block">
              {cta ?? (
                <Button size="sm" variant="inverse" trailingIcon={<RiArrowRightLine aria-hidden />}>
                  Start free
                </Button>
              )}
            </div>
          )}
          <HeaderNavMobile
            items={[...leftLinks, ...rightLinks].map((l) => ({ label: l.label, href: l.href }))}
            brand={brand}
            renderLink={renderLink}
          >
            {cta ?? <Button size="lg">Start free</Button>}
          </HeaderNavMobile>
        </div>
      </HeaderNav>
    );
  }
);
CenteredHeader.displayName = "CenteredHeader";

/* ------------------------------------------------------------------ */
/* DocsHeader                                                          */
/* ------------------------------------------------------------------ */

export interface DocsSearchItem {
  value: string;
  label: string;
  section?: string;
  href?: string;
}

export interface DocsHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  versions?: string[];
  version?: string;
  defaultVersion?: string;
  onVersionChange?: (version: string) => void;
  links?: HeaderLink[];
  githubHref?: string;
  /** Current color mode. When uncontrolled the header toggles the `dark` class on <html>. */
  theme?: "light" | "dark";
  onThemeChange?: (theme: "light" | "dark") => void;
  searchItems?: DocsSearchItem[];
  onSearchSelect?: (item: DocsSearchItem) => void;
  logo?: React.ReactNode;
  homeHref?: string;
  renderLink?: BlockLinkRenderer;
  sticky?: boolean;
}

const defaultDocsSearch: DocsSearchItem[] = [
  { value: "installation", label: "Installation", section: "Getting started" },
  { value: "theming", label: "Theming", section: "Getting started" },
  { value: "button", label: "Button", section: "Components" },
  { value: "dialog", label: "Dialog", section: "Components" },
  { value: "sidebar", label: "Sidebar", section: "Components" },
  { value: "blocks", label: "Auth blocks", section: "Blocks" },
];

/** Documentation header: logo, version switcher, links, ⌘K search, GitHub and theme toggle. */
export const DocsHeader = React.forwardRef<HTMLElement, DocsHeaderProps>(
  (
    {
      versions = ["v2.4.0", "v2.3.1", "v1.9.0"],
      version,
      defaultVersion,
      onVersionChange,
      links = [
        { label: "Guides", href: "#guides" },
        { label: "Components", href: "#components" },
        { label: "Blocks", href: "#blocks" },
        { label: "API", href: "#api" },
      ],
      githubHref = "https://github.com",
      theme: themeProp,
      onThemeChange,
      searchItems = defaultDocsSearch,
      onSearchSelect,
      logo,
      homeHref = "/",
      renderLink,
      sticky = true,
      className,
      ...props
    },
    ref
  ) => {
    const [ver, setVer] = React.useState(defaultVersion ?? versions[0] ?? "");
    const currentVersion = version ?? ver;
    const [themeState, setThemeState] = React.useState<"light" | "dark">("light");
    const theme = themeProp ?? themeState;
    const [open, setOpen] = React.useState(false);
    useCommandMenuShortcut(setOpen);

    React.useEffect(() => {
      if (themeProp !== undefined || typeof document === "undefined") return;
      setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
    }, [themeProp]);

    const toggleTheme = () => {
      const next = theme === "dark" ? "light" : "dark";
      if (themeProp === undefined) {
        setThemeState(next);
        document.documentElement.classList.toggle("dark", next === "dark");
      }
      onThemeChange?.(next);
    };

    const sections = Array.from(new Set(searchItems.map((i) => i.section ?? "Pages")));
    const brand = logo ?? <SutraLogo size="sm" product="docs" />;

    return (
      <HeaderNav ref={ref} sticky={sticky} border="always" containerSize="full" className={className} innerClassName="gap-3 md:gap-4" {...props}>
        <BlockLink href={homeHref} renderLink={renderLink} className={cn("inline-flex shrink-0 rounded-sm", focusRing)}>
          {brand}
        </BlockLink>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Version ${currentVersion}`}
              className={cn("hidden rounded-control sm:inline-flex", focusRing)}
            >
              <Badge variant="outline" color="neutral" trailingIcon={<RiArrowDownSLine aria-hidden />} className="cursor-pointer font-mono hover:bg-accent">
                {currentVersion}
              </Badge>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-40">
            <DropdownMenuLabel>Version</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={currentVersion}
              onValueChange={(v) => {
                setVer(v);
                onVersionChange?.(v);
              }}
            >
              {versions.map((v, i) => (
                <DropdownMenuRadioItem key={v} value={v}>
                  <span className="font-mono">{v}</span>
                  {i === 0 ? <span className="ml-2 text-xs text-muted-foreground">latest</span> : null}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <nav aria-label="Docs" className="hidden items-center gap-0.5 lg:flex">
          {links.map((l) => (
            <BlockLink key={l.href} href={l.href} renderLink={renderLink} className={navLinkClass}>
              {l.label}
            </BlockLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <SearchTrigger onClick={() => setOpen(true)} placeholder="Search docs…" className="w-56 lg:w-64" />
          <SimpleTooltip content="GitHub">
            <Button asChild variant="ghost" size="icon">
              <a href={githubHref} target="_blank" rel="noreferrer noopener" aria-label="GitHub repository">
                <RiGithubFill aria-hidden />
              </a>
            </Button>
          </SimpleTooltip>
          <SimpleTooltip content={theme === "dark" ? "Light mode" : "Dark mode"}>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <RiSunLine aria-hidden /> : <RiMoonLine aria-hidden />}
            </Button>
          </SimpleTooltip>
          <HeaderNavMobile items={links.map((l) => ({ label: l.label, href: l.href }))} brand={brand} renderLink={renderLink} />
        </div>
        <CommandDialog open={open} onOpenChange={setOpen} title="Search documentation">
          <CommandInput placeholder="Search documentation…" />
          <CommandList>
            <CommandEmpty>No results found</CommandEmpty>
            {sections.map((section) => (
              <CommandGroup key={section} heading={section}>
                {searchItems
                  .filter((i) => (i.section ?? "Pages") === section)
                  .map((item) => (
                    <CommandItem
                      key={item.value}
                      value={`${item.value} ${item.label}`}
                      icon={section === "Components" ? <RiCodeSSlashLine aria-hidden /> : section === "Blocks" ? <RiBookOpenLine aria-hidden /> : <RiFileTextLine aria-hidden />}
                      onSelect={() => {
                        setOpen(false);
                        onSearchSelect?.(item);
                        if (item.href && !onSearchSelect && typeof window !== "undefined") window.location.assign(item.href);
                      }}
                    >
                      {item.label}
                      {item.href ? <RiArrowRightUpLine aria-hidden className="ml-auto size-3.5 opacity-50" /> : null}
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </CommandDialog>
      </HeaderNav>
    );
  }
);
DocsHeader.displayName = "DocsHeader";
