import * as React from "react";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import {
  RiArrowRightSLine,
  RiBankCardLine,
  RiBellLine,
  RiCalendarCheckLine,
  RiFileTextLine,
  RiHome5Line,
  RiInboxLine,
  RiLockLine,
  RiPaletteLine,
  RiPlugLine,
  RiSearchLine,
  RiShieldUserLine,
  RiStarLine,
  RiTeamLine,
  RiUserLine,
  RiAddLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { Kbd } from "../components/typography";
import { Progress } from "../components/progress";
import { SearchInput } from "../components/input";
import { SimpleSelect } from "../components/select";
import { TreeView, type TreeNode } from "../components/tree-view";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarProvider,
  SidebarUserCard,
  type SidebarProps,
  type SidebarProviderProps,
} from "../components/sidebar-navigation";
import { SutraAppIcon, sutraAppMeta, sutraApps, type SutraApp } from "../assets/brand";
import { UserAccountMenu, WorkspaceSwitcher, type UserAccountMenuUser, type Workspace } from "./dropdown-menu-blocks";
import { AppHeader, type AppHeaderProps } from "./header-navigation-blocks";
import { PageHeaderWithStats } from "./section-header-blocks";
import { demoUser } from "./block-utils";

/* ------------------------------------------------------------------ */
/* AppSidebar                                                          */
/* ------------------------------------------------------------------ */

export interface AppSidebarNavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  badge?: React.ReactNode;
}

export interface AppSidebarFavorite {
  id: string;
  label: string;
  app: SutraApp;
  children?: { id: string; label: string; href?: string }[];
}

export interface AppSidebarProps extends Omit<SidebarProps, "children" | "defaultValue"> {
  /** Currently active item id (nav item, app or favorite). */
  value?: string;
  /** Initially active item id when uncontrolled. Default "home". */
  defaultValue?: string;
  /** Called with the id of the item the user navigates to. */
  onValueChange?: (id: string) => void;
  /** @deprecated Use `value`. */
  active?: string;
  /** @deprecated Use `defaultValue`. */
  defaultActive?: string;
  /** @deprecated Use `onValueChange`. */
  onNavigate?: (id: string) => void;
  primaryItems?: AppSidebarNavItem[];
  apps?: SutraApp[];
  favorites?: AppSidebarFavorite[];
  workspaces?: Workspace[];
  user?: UserAccountMenuUser;
  /** Storage usage in GB. Pass `null` to hide the card. */
  storage?: { used: number; total: number } | null;
  onSearch?: () => void;
  onUpgrade?: () => void;
  onSignOut?: () => void;
}

const defaultPrimary: AppSidebarNavItem[] = [
  { id: "home", label: "Home", icon: <RiHome5Line aria-hidden /> },
  { id: "inbox", label: "Inbox", icon: <RiInboxLine aria-hidden />, badge: 12 },
  { id: "today", label: "Today", icon: <RiCalendarCheckLine aria-hidden /> },
];

const defaultFavorites: AppSidebarFavorite[] = [
  {
    id: "fav-launch",
    label: "Q4 Launch Plan",
    app: "tasks",
    children: [
      { id: "fav-launch-roadmap", label: "Roadmap" },
      { id: "fav-launch-sprint", label: "Sprint 14" },
      { id: "fav-launch-retro", label: "Retro notes" },
    ],
  },
  {
    id: "fav-reading",
    label: "Reading list",
    app: "notes",
    children: [
      { id: "fav-reading-books", label: "Books 2026" },
      { id: "fav-reading-articles", label: "Saved articles" },
    ],
  },
  { id: "fav-budget", label: "Monthly budget", app: "finance" },
];

function NavButton({
  item,
  active,
  onNavigate,
}: {
  item: AppSidebarNavItem;
  active: boolean;
  onNavigate: (id: string) => void;
}) {
  if (item.href) {
    return (
      <SidebarMenuButton asChild isActive={active} icon={item.icon} badge={item.badge} tooltip={item.label}>
        <a href={item.href} onClick={() => onNavigate(item.id)}>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
        </a>
      </SidebarMenuButton>
    );
  }
  return (
    <SidebarMenuButton isActive={active} icon={item.icon} badge={item.badge} onClick={() => onNavigate(item.id)}>
      {item.label}
    </SidebarMenuButton>
  );
}

/** Full Sutra suite sidebar: workspace switcher, search, primary nav, apps, favorites, storage and account. */
export const AppSidebar = React.forwardRef<HTMLElement, AppSidebarProps>(
  (
    {
      value,
      defaultValue,
      onValueChange,
      active,
      defaultActive,
      onNavigate,
      primaryItems = defaultPrimary,
      apps = [...sutraApps],
      favorites = defaultFavorites,
      workspaces,
      user = { ...demoUser, plan: "Pro" },
      storage = { used: 6.8, total: 10 },
      onSearch,
      onUpgrade,
      onSignOut,
      collapsible = "icon",
      ...props
    },
    ref
  ) => {
    const [current, setCurrent] = useControllableState<string>({
      value: value ?? active,
      defaultValue: defaultValue ?? defaultActive ?? "home",
      onChange: (id) => {
        onValueChange?.(id);
        onNavigate?.(id);
      },
    });
    const pct = storage ? Math.round((storage.used / storage.total) * 100) : 0;

    return (
      <Sidebar ref={ref} collapsible={collapsible} mobileTitle="Sutra navigation" {...props}>
        <SidebarHeader>
          <WorkspaceSwitcher workspaces={workspaces} />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton icon={<RiSearchLine aria-hidden />} tooltip="Search (⌘K)" onClick={onSearch} className="text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="flex-1">Search</span>
                  <span className="flex gap-0.5" aria-hidden>
                    <Kbd>⌘</Kbd>
                    <Kbd>K</Kbd>
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="pt-0">
            <SidebarMenu>
              {primaryItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <NavButton item={item} active={current === item.id} onNavigate={setCurrent} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Apps</SidebarGroupLabel>
            <SidebarMenu>
              {apps.map((app) => (
                <SidebarMenuItem key={app}>
                  <SidebarMenuButton
                    isActive={current === app}
                    icon={<SutraAppIcon app={app} size={16} />}
                    onClick={() => setCurrent(app)}
                  >
                    {sutraAppMeta[app].name}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          {favorites.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="justify-between">
                Favorites
                <RiStarLine aria-hidden className="size-3.5" />
              </SidebarGroupLabel>
              <SidebarMenu>
                {favorites.map((fav) => (
                  <SidebarMenuItem key={fav.id}>
                    {fav.children && fav.children.length > 0 ? (
                      <SidebarMenuSub
                        label={fav.label}
                        icon={<SutraAppIcon app={fav.app} size={16} />}
                        isActive={current === fav.id}
                        defaultOpen={fav.children.some((c) => c.id === current) || fav === favorites[0]}
                      >
                        {fav.children.map((child) => (
                          <SidebarMenuSubButton
                            key={child.id}
                            href={child.href ?? "#"}
                            isActive={current === child.id}
                            onClick={(e) => {
                              if (!child.href) e.preventDefault();
                              setCurrent(child.id);
                            }}
                          >
                            {child.label}
                          </SidebarMenuSubButton>
                        ))}
                      </SidebarMenuSub>
                    ) : (
                      <SidebarMenuButton
                        isActive={current === fav.id}
                        icon={<SutraAppIcon app={fav.app} size={16} />}
                        onClick={() => setCurrent(fav.id)}
                      >
                        {fav.label}
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter>
          {storage ? (
            <div className="rounded-box border border-border bg-background p-3 shadow-xs group-data-[collapsible=icon]/sidebar:hidden">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Storage</span>
                <span className="tabular-nums text-muted-foreground">{pct}%</span>
              </div>
              <Progress value={pct} size="sm" color={pct >= 90 ? "destructive" : pct >= 75 ? "warning" : "primary"} aria-label="Storage used" />
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="tabular-nums">
                  {storage.used} GB of {storage.total} GB
                </span>{" "}
                used.{" "}
                <button
                  type="button"
                  onClick={onUpgrade}
                  className={cn("rounded-xs font-medium text-primary hover:underline", focusRing)}
                >
                  Upgrade
                </button>
              </p>
            </div>
          ) : null}
          <UserAccountMenu
            user={user}
            side="top"
            align="start"
            onSignOut={onSignOut}
            trigger={<SidebarUserCard name={user.name} email={user.email} avatarSrc={user.avatarSrc} />}
          />
        </SidebarFooter>
      </Sidebar>
    );
  }
);
AppSidebar.displayName = "AppSidebar";

/* ------------------------------------------------------------------ */
/* SettingsSidebar                                                     */
/* ------------------------------------------------------------------ */

export interface SettingsNavItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface SettingsNavGroup {
  label: string;
  items: SettingsNavItem[];
}

export interface SettingsSidebarProps extends Omit<React.HTMLAttributes<HTMLElement>, "defaultValue"> {
  groups?: SettingsNavGroup[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

const defaultSettingsGroups: SettingsNavGroup[] = [
  {
    label: "Personal",
    items: [
      { value: "account", label: "Account", icon: <RiUserLine aria-hidden /> },
      { value: "preferences", label: "Preferences", icon: <RiPaletteLine aria-hidden /> },
      { value: "notifications", label: "Notifications", icon: <RiBellLine aria-hidden /> },
      { value: "security", label: "Security", icon: <RiLockLine aria-hidden /> },
    ],
  },
  {
    label: "Workspace",
    items: [
      { value: "members", label: "Members", icon: <RiTeamLine aria-hidden />, badge: 12 },
      { value: "integrations", label: "Integrations", icon: <RiPlugLine aria-hidden /> },
      { value: "billing", label: "Billing", icon: <RiBankCardLine aria-hidden /> },
      { value: "permissions", label: "Roles & permissions", icon: <RiShieldUserLine aria-hidden /> },
    ],
  },
];

/** Grouped settings navigation; collapses into a select on small screens. */
export const SettingsSidebar = React.forwardRef<HTMLElement, SettingsSidebarProps>(
  ({ groups = defaultSettingsGroups, value, defaultValue, onValueChange, className, ...props }, ref) => {
    const [current, setCurrent] = useControllableState<string>({
      value,
      defaultValue: defaultValue ?? groups[0]?.items[0]?.value ?? "",
      onChange: onValueChange,
    });
    return (
      <nav ref={ref} aria-label="Settings" className={cn("w-full md:w-60 md:shrink-0", className)} {...props}>
        <SimpleSelect
          aria-label="Settings section"
          className="md:hidden"
          value={current}
          onValueChange={setCurrent}
          options={groups.flatMap((g) => g.items.map((i) => ({ value: i.value, label: i.label, icon: i.icon })))}
        />
        <div className="hidden flex-col gap-6 md:flex">
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <h3 className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">{group.label}</h3>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const isActive = current === item.value;
                  return (
                    <li key={item.value}>
                      <button
                        type="button"
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setCurrent(item.value)}
                        className={cn(
                          "flex h-9 w-full items-center gap-2.5 rounded-control px-2.5 text-left text-sm transition-colors",
                          "[&>svg]:size-4 [&>svg]:shrink-0",
                          isActive
                            ? "bg-accent font-medium text-foreground [&>svg]:text-primary"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground [&>svg]:text-muted-foreground",
                          focusRing
                        )}
                      >
                        {item.icon}
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.badge != null ? (
                          <span className="rounded-full bg-muted px-1.5 text-2xs font-semibold tabular-nums text-muted-foreground">
                            {item.badge}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    );
  }
);
SettingsSidebar.displayName = "SettingsSidebar";

/* ------------------------------------------------------------------ */
/* DocsSidebar                                                         */
/* ------------------------------------------------------------------ */

export interface DocsNavLink {
  id: string;
  label: string;
  href?: string;
  badge?: string;
}

export interface DocsNavSection {
  id: string;
  label: string;
  links: DocsNavLink[];
}

export interface DocsSidebarProps extends Omit<React.HTMLAttributes<HTMLElement>, "defaultValue"> {
  sections?: DocsNavSection[];
  /** Currently active link id. */
  value?: string;
  /** Initially active link id when uncontrolled. Default "installation". */
  defaultValue?: string;
  /** Called with the id of the link the user navigates to. */
  onValueChange?: (id: string) => void;
  /** @deprecated Use `value`. */
  active?: string;
  /** @deprecated Use `defaultValue`. */
  defaultActive?: string;
  /** @deprecated Use `onValueChange`. */
  onNavigate?: (id: string) => void;
  /** `sections`: collapsible groups of links. `tree`: a keyboard-navigable TreeView. */
  mode?: "sections" | "tree";
  /** Show a filter field at the top. */
  searchable?: boolean;
}

const defaultDocsSections: DocsNavSection[] = [
  {
    id: "getting-started",
    label: "Getting started",
    links: [
      { id: "introduction", label: "Introduction" },
      { id: "installation", label: "Installation" },
      { id: "theming", label: "Theming" },
      { id: "dark-mode", label: "Dark mode" },
    ],
  },
  {
    id: "components",
    label: "Components",
    links: [
      { id: "button", label: "Button" },
      { id: "dialog", label: "Dialog" },
      { id: "dropdown-menu", label: "Dropdown menu" },
      { id: "sidebar", label: "Sidebar" },
      { id: "tree-view", label: "Tree view", badge: "New" },
    ],
  },
  {
    id: "blocks",
    label: "Blocks",
    links: [
      { id: "auth", label: "Authentication" },
      { id: "headers", label: "Headers" },
      { id: "dialogs", label: "Dialogs" },
    ],
  },
];

/** Documentation navigation with filterable collapsible sections (or a TreeView). */
export const DocsSidebar = React.forwardRef<HTMLElement, DocsSidebarProps>(
  (
    {
      sections = defaultDocsSections,
      value,
      defaultValue,
      onValueChange,
      active,
      defaultActive,
      onNavigate,
      mode = "sections",
      searchable = true,
      className,
      ...props
    },
    ref
  ) => {
    const [current, setCurrent] = useControllableState<string>({
      value: value ?? active,
      defaultValue: defaultValue ?? defaultActive ?? "installation",
      onChange: (id) => {
        onValueChange?.(id);
        onNavigate?.(id);
      },
    });
    const [query, setQuery] = React.useState("");
    const q = query.trim().toLowerCase();
    const filtered = q
      ? sections
          .map((s) => ({ ...s, links: s.links.filter((l) => l.label.toLowerCase().includes(q)) }))
          .filter((s) => s.links.length > 0)
      : sections;

    const nodes: TreeNode[] = filtered.map((s) => ({
      id: s.id,
      label: s.label,
      icon: <RiFileTextLine aria-hidden />,
      children: s.links.map((l) => ({ id: l.id, label: l.label, textValue: l.label })),
    }));

    return (
      <nav ref={ref} aria-label="Documentation" className={cn("flex w-full flex-col gap-4 md:w-64", className)} {...props}>
        {searchable && (
          <SearchInput
            size="sm"
            placeholder="Filter pages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            aria-label="Filter documentation pages"
          />
        )}
        {filtered.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">No pages match “{query}”</p>
        ) : mode === "tree" ? (
          <TreeView
            nodes={nodes}
            defaultExpanded={sections.map((s) => s.id)}
            expanded={q ? nodes.map((n) => n.id) : undefined}
            selected={[current]}
            onSelectedChange={(sel) => {
              const id = sel[0];
              if (id && !sections.some((s) => s.id === id)) setCurrent(id);
            }}
            indentGuides
            size="sm"
            aria-label="Documentation pages"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((section) => (
              <CollapsiblePrimitive.Root key={section.id} defaultOpen className="group/docs-section">
                <CollapsiblePrimitive.Trigger
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground",
                    focusRing
                  )}
                >
                  {section.label}
                  <RiArrowRightSLine
                    aria-hidden
                    className="size-4 transition-transform duration-200 group-data-[state=open]/docs-section:rotate-90"
                  />
                </CollapsiblePrimitive.Trigger>
                <CollapsiblePrimitive.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                  <ul className="ml-2 mt-1 flex flex-col border-l border-border">
                    {section.links.map((link) => {
                      const isActive = current === link.id;
                      return (
                        <li key={link.id} className="relative">
                          <a
                            href={link.href ?? `#${link.id}`}
                            aria-current={isActive ? "page" : undefined}
                            onClick={(e) => {
                              if (!link.href) e.preventDefault();
                              setCurrent(link.id);
                            }}
                            className={cn(
                              "-ml-px flex items-center gap-2 border-l py-1.5 pl-3.5 pr-2 text-sm transition-colors",
                              isActive
                                ? "border-primary font-medium text-primary"
                                : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground",
                              focusRing
                            )}
                          >
                            <span className="truncate">{link.label}</span>
                            {link.badge ? (
                              <span className="rounded-full bg-primary-soft px-1.5 py-px text-2xs font-semibold text-primary-soft-foreground">
                                {link.badge}
                              </span>
                            ) : null}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </CollapsiblePrimitive.Content>
              </CollapsiblePrimitive.Root>
            ))}
          </div>
        )}
      </nav>
    );
  }
);
DocsSidebar.displayName = "DocsSidebar";

/* ------------------------------------------------------------------ */
/* AppShell                                                            */
/* ------------------------------------------------------------------ */

export interface AppShellProps extends Omit<SidebarProviderProps, "children"> {
  sidebarProps?: AppSidebarProps;
  headerProps?: AppHeaderProps;
  /** Page content. Defaults to a demo dashboard header. */
  children?: React.ReactNode;
  contentClassName?: string;
  /** Element for the content area. Default `"main"`; use `"div"` when nested inside another `<main>`. */
  insetAs?: React.ElementType;
}

/** Complete app layout: SidebarProvider + AppSidebar + SidebarInset with AppHeader and content. */
export const AppShell = React.forwardRef<HTMLDivElement, AppShellProps>(
  ({ sidebarProps, headerProps, children, contentClassName, insetAs, ...props }, ref) => (
    <SidebarProvider ref={ref} {...props}>
      <AppSidebar {...sidebarProps} />
      <SidebarInset as={insetAs}>
        <AppHeader {...headerProps} />
        <div className={cn("flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8", contentClassName)}>
          {children ?? (
            <>
              <PageHeaderWithStats />
              <div className="flex min-h-64 flex-1 flex-col items-center justify-center gap-2 rounded-box border border-dashed border-border-strong bg-subtle/60 p-8 text-center">
                <RiAddLine aria-hidden className="size-6 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Your content goes here</p>
                <p className="text-sm text-muted-foreground">Pass children to AppShell to render your page.</p>
              </div>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
);
AppShell.displayName = "AppShell";
