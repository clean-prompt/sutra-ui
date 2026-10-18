import * as React from "react";
import {
  RiAddLine,
  RiArrowDownSLine,
  RiBankCardLine,
  RiCheckDoubleLine,
  RiCheckLine,
  RiComputerLine,
  RiExpandUpDownLine,
  RiFilter3Line,
  RiKeyboardLine,
  RiLogoutBoxRLine,
  RiMoonLine,
  RiNotification3Line,
  RiPaletteLine,
  RiQuestionLine,
  RiSettings3Line,
  RiSunLine,
  RiUserLine,
  RiRefreshLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { initials } from "../lib/text";
import { useControllableState } from "../hooks/use-controllable-state";
import { Button } from "../components/button";
import { Avatar } from "../components/avatar";
import { Badge } from "../components/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../components/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../components/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/tabs";
import { SutraAppIcon, SutraMark, type SutraApp } from "../assets/brand";
import { EmptyStateIllustration } from "../assets/misc";
import { demoUser } from "./block-utils";

type Align = "start" | "center" | "end";
type Side = "top" | "right" | "bottom" | "left";

/* ------------------------------------------------------------------ */
/* UserAccountMenu                                                     */
/* ------------------------------------------------------------------ */

export type ThemePreference = "light" | "dark" | "system";

export interface UserAccountMenuUser {
  name: string;
  email?: string;
  avatarSrc?: string;
  /** Plan label shown next to the name, e.g. "Pro". */
  plan?: string;
}

export interface UserAccountMenuItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  shortcut?: React.ReactNode;
}

export interface UserAccountMenuProps {
  user?: UserAccountMenuUser;
  /** Custom trigger element (e.g. a `SidebarUserCard`). Defaults to an avatar button. */
  trigger?: React.ReactElement;
  items?: UserAccountMenuItem[];
  onSelect?: (key: string) => void;
  onSignOut?: () => void;
  theme?: ThemePreference;
  defaultTheme?: ThemePreference;
  onThemeChange?: (theme: ThemePreference) => void;
  /** Show the theme submenu. Default true. */
  showTheme?: boolean;
  align?: Align;
  side?: Side;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentClassName?: string;
}

const defaultAccountItems: UserAccountMenuItem[] = [
  { key: "profile", label: "Profile", icon: <RiUserLine aria-hidden />, shortcut: "⇧⌘P" },
  { key: "settings", label: "Settings", icon: <RiSettings3Line aria-hidden />, shortcut: "⌘," },
  { key: "billing", label: "Billing", icon: <RiBankCardLine aria-hidden />, shortcut: "⌘B" },
  { key: "shortcuts", label: "Keyboard shortcuts", icon: <RiKeyboardLine aria-hidden />, shortcut: "?" },
];

/** Avatar-triggered account menu: profile header, settings, theme submenu and sign out. */
export function UserAccountMenu({
  user = { ...demoUser, plan: "Pro" },
  trigger,
  items = defaultAccountItems,
  onSelect,
  onSignOut,
  theme: themeProp,
  defaultTheme = "system",
  onThemeChange,
  showTheme = true,
  align = "end",
  side = "bottom",
  open,
  defaultOpen,
  onOpenChange,
  contentClassName,
}: UserAccountMenuProps) {
  const [theme, setTheme] = useControllableState<ThemePreference>({
    value: themeProp,
    defaultValue: defaultTheme,
    onChange: onThemeChange,
  });
  return (
    <DropdownMenu open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            aria-label={`Account menu for ${user.name}`}
            className={cn(
              "inline-flex shrink-0 rounded-full transition-shadow hover:ring-4 hover:ring-muted data-[state=open]:ring-4 data-[state=open]:ring-primary/20",
              focusRing
            )}
          >
            <Avatar name={user.name} src={user.avatarSrc} size="sm" status="online" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className={cn("w-64", contentClassName)}>
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar name={user.name} src={user.avatarSrc} size="md" aria-hidden />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-foreground">{user.name}</span>
              {user.plan ? (
                <Badge color="brand" size="sm">
                  {user.plan}
                </Badge>
              ) : null}
            </div>
            {user.email ? <div className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</div> : null}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {items.map((item) => (
            <DropdownMenuItem key={item.key} icon={item.icon} shortcut={item.shortcut} onSelect={() => onSelect?.(item.key)}>
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {showTheme && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger icon={<RiPaletteLine aria-hidden />}>Theme</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-40">
                <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemePreference)}>
                  <DropdownMenuRadioItem value="light">
                    <span className="flex items-center gap-2">
                      <RiSunLine aria-hidden /> Light
                    </span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <span className="flex items-center gap-2">
                      <RiMoonLine aria-hidden /> Dark
                    </span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <span className="flex items-center gap-2">
                      <RiComputerLine aria-hidden /> System
                    </span>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem icon={<RiQuestionLine aria-hidden />} onSelect={() => onSelect?.("help")}>
              Help &amp; support
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" icon={<RiLogoutBoxRLine aria-hidden />} shortcut="⇧⌘Q" onSelect={() => onSignOut?.()}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
UserAccountMenu.displayName = "UserAccountMenu";

/* ------------------------------------------------------------------ */
/* WorkspaceSwitcher                                                   */
/* ------------------------------------------------------------------ */

export interface Workspace {
  id: string;
  name: string;
  /** Secondary line, e.g. plan or member count. */
  plan?: string;
  /** App whose icon represents the workspace. */
  app?: SutraApp;
  /** Custom logo (overrides `app`). */
  logo?: React.ReactNode;
}

export interface WorkspaceSwitcherProps {
  workspaces?: Workspace[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  onCreate?: () => void;
  /** `sidebar` is a full-width row (collapses to an icon in an icon sidebar); `compact` is a small inline button. */
  variant?: "sidebar" | "compact";
  align?: Align;
  side?: Side;
  className?: string;
}

const defaultWorkspaces: Workspace[] = [
  { id: "personal", name: "Personal", plan: "Pro · Just you", logo: <SutraMark size={32} /> },
  { id: "northwind", name: "Northwind Studio", plan: "Team · 12 members", app: "tasks" },
  { id: "family", name: "Patel Family", plan: "Family · 4 members", app: "calendar" },
];

function WorkspaceLogo({ workspace, size }: { workspace: Workspace; size: number }) {
  if (workspace.logo) {
    return (
      <span className="inline-flex shrink-0 overflow-hidden rounded-md [&>svg]:size-full" style={{ width: size, height: size }}>
        {workspace.logo}
      </span>
    );
  }
  if (workspace.app) return <SutraAppIcon app={workspace.app} size={size} shape="squircle" />;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md bg-inverse text-xs font-semibold text-inverse-foreground"
      style={{ width: size, height: size }}
    >
      {initials(workspace.name, { max: 1 })}
    </span>
  );
}

/** Workspace picker: current workspace with its app icon, a checked list and "Create workspace". */
export function WorkspaceSwitcher({
  workspaces = defaultWorkspaces,
  value,
  defaultValue,
  onValueChange,
  onCreate,
  variant = "sidebar",
  align = "start",
  side = "bottom",
  className,
}: WorkspaceSwitcherProps) {
  const [current, setCurrent] = useControllableState<string>({
    value,
    defaultValue: defaultValue ?? workspaces[0]?.id ?? "",
    onChange: onValueChange,
  });
  const active = workspaces.find((w) => w.id === current) ?? workspaces[0];
  if (!active) return null;
  const sidebar = variant === "sidebar";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Switch workspace (current: ${active.name})`}
          className={cn(
            "group/ws flex min-w-0 items-center gap-2.5 text-left outline-none transition-[background-color,padding] duration-150 hover:bg-accent data-[state=open]:bg-accent",
            sidebar
              ? "h-12 w-full rounded-control p-2 group-data-[collapsible=icon]/sidebar:size-8! group-data-[collapsible=icon]/sidebar:p-0!"
              : "h-9 rounded-control px-2",
            focusRing,
            className
          )}
        >
          <WorkspaceLogo workspace={active} size={sidebar ? 32 : 22} />
          <span className="grid min-w-0 flex-1 leading-tight">
            <span className="truncate text-sm font-semibold text-foreground">{active.name}</span>
            {sidebar && active.plan ? <span className="truncate text-xs text-muted-foreground">{active.plan}</span> : null}
          </span>
          {sidebar ? (
            <RiExpandUpDownLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <RiArrowDownSLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-(--radix-dropdown-menu-trigger-width) min-w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((w, i) => (
          <DropdownMenuItem
            key={w.id}
            onSelect={() => setCurrent(w.id)}
            shortcut={i < 9 ? `⌘${i + 1}` : undefined}
            className="gap-2.5"
          >
            <WorkspaceLogo workspace={w} size={24} />
            <span className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate">{w.name}</span>
              {w.plan ? <span className="truncate text-xs text-muted-foreground">{w.plan}</span> : null}
            </span>
            {w.id === active.id ? <RiCheckLine aria-label="Current workspace" className="text-primary!" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onCreate?.()} className="gap-2.5 text-muted-foreground">
          <span className="inline-flex size-6 items-center justify-center rounded-md border border-dashed border-border-strong">
            <RiAddLine aria-hidden className="size-3.5!" />
          </span>
          Create workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
WorkspaceSwitcher.displayName = "WorkspaceSwitcher";

/* ------------------------------------------------------------------ */
/* NotificationsMenu                                                   */
/* ------------------------------------------------------------------ */

export interface NotificationItem {
  id: string;
  actor: { name: string; avatarSrc?: string };
  /** Message after the actor's name. */
  message: React.ReactNode;
  /** Target, e.g. a document title (bold). */
  target?: React.ReactNode;
  time: string;
  unread?: boolean;
  app?: SutraApp;
}

export interface NotificationsMenuProps {
  /**
   * Controlled list when paired with `onNotificationsChange`. Passed alone it only seeds the
   * list (deprecated: use `defaultNotifications` for that).
   */
  notifications?: NotificationItem[];
  /** Initial list when uncontrolled. */
  defaultNotifications?: NotificationItem[];
  onNotificationsChange?: (items: NotificationItem[]) => void;
  onNotificationClick?: (item: NotificationItem) => void;
  onViewAll?: () => void;
  align?: Align;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const defaultNotifications: NotificationItem[] = [
  { id: "n1", actor: { name: "Aiko Tanaka" }, message: "commented on", target: "Q4 Roadmap", time: "2m ago", unread: true, app: "notes" },
  { id: "n2", actor: { name: "Diego Alvarez" }, message: "assigned you", target: "Ship onboarding v2", time: "18m ago", unread: true, app: "tasks" },
  { id: "n3", actor: { name: "Priya Shah" }, message: "invited you to", target: "Design sync", time: "1h ago", unread: true, app: "calendar" },
  { id: "n4", actor: { name: "Noah Kim" }, message: "shared a file", target: "Brand-kit.fig", time: "Yesterday", app: "files" },
  { id: "n5", actor: { name: "Sutra" }, message: "Your 30-day streak is live for", target: "Morning run", time: "2d ago", app: "habits" },
];

/** Bell button with unread count opening a notification list with All/Unread tabs and "Mark all read". */
export function NotificationsMenu({
  notifications,
  defaultNotifications: defaultNotificationsProp,
  onNotificationsChange,
  onNotificationClick,
  onViewAll,
  align = "end",
  open,
  defaultOpen,
  onOpenChange,
  className,
}: NotificationsMenuProps) {
  const [items, setItems] = useControllableState<NotificationItem[]>({
    value: notifications && onNotificationsChange ? notifications : undefined,
    defaultValue: defaultNotificationsProp ?? notifications ?? defaultNotifications,
    onChange: onNotificationsChange,
  });
  const [tab, setTab] = React.useState("all");
  const unread = items.filter((n) => n.unread).length;
  const visible = tab === "unread" ? items.filter((n) => n.unread) : items;
  const titleId = React.useId();

  return (
    <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          className={cn("relative", className)}
        >
          <RiNotification3Line aria-hidden />
          {unread > 0 && (
            <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground ring-2 ring-background tabular-nums">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        padded={false}
        size="auto"
        aria-labelledby={titleId}
        className="w-[min(24rem,calc(100vw-1rem))] overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3">
          <h2 id={titleId} className="text-sm font-semibold text-foreground">
            Notifications
          </h2>
          <Button
            variant="ghost"
            size="xs"
            leadingIcon={<RiCheckDoubleLine aria-hidden />}
            disabled={unread === 0}
            onClick={() => setItems(items.map((n) => ({ ...n, unread: false })))}
            className="text-muted-foreground"
          >
            Mark all read
          </Button>
        </div>
        <Tabs value={tab} onValueChange={setTab} variant="underline" size="sm" className="gap-0">
          <TabsList className="gap-4 border-b px-4">
            <TabsTrigger value="all" badge={items.length}>
              All
            </TabsTrigger>
            <TabsTrigger value="unread" badge={unread || undefined}>
              Unread
            </TabsTrigger>
          </TabsList>
          {(["all", "unread"] as const).map((value) => (
            <TabsContent key={value} value={value} className="rounded-none">
              <div className="max-h-[22rem] overflow-y-auto scrollbar-thin">
                {visible.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                    <EmptyStateIllustration variant="inbox" size={96} />
                    <p className="text-sm font-medium text-foreground">You&apos;re all caught up</p>
                    <p className="text-xs text-muted-foreground">New notifications will show up here.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {visible.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => {
                            if (n.unread) setItems(items.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
                            onNotificationClick?.(n);
                          }}
                          className={cn(
                            "relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                            n.unread && "bg-primary-soft/30"
                          )}
                        >
                          <span className="relative shrink-0">
                            <Avatar name={n.actor.name} src={n.actor.avatarSrc} size="sm" />
                            {n.app ? (
                              <SutraAppIcon app={n.app} size={16} className="absolute -bottom-1 -right-1 rounded-[5px] ring-2 ring-popover" />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm leading-snug text-muted-foreground">
                              <span className="font-medium text-foreground">{n.actor.name}</span> {n.message}{" "}
                              {n.target ? <span className="font-medium text-foreground">{n.target}</span> : null}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">{n.time}</span>
                          </span>
                          {n.unread ? (
                            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" role="img" />
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
        <div className="border-t border-border bg-subtle p-2">
          <Button variant="ghost" size="sm" fullWidth onClick={onViewAll}>
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
NotificationsMenu.displayName = "NotificationsMenu";

/* ------------------------------------------------------------------ */
/* QuickCreateMenu                                                     */
/* ------------------------------------------------------------------ */

export interface QuickCreateItem {
  app: SutraApp;
  label: React.ReactNode;
  description?: React.ReactNode;
  shortcut?: React.ReactNode;
}

export interface QuickCreateMenuProps {
  items?: QuickCreateItem[];
  onCreate?: (app: SutraApp) => void;
  label?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
  align?: Align;
  className?: string;
}

const defaultQuickCreate: QuickCreateItem[] = [
  { app: "notes", label: "Note", description: "Blank page or template", shortcut: "N" },
  { app: "tasks", label: "Task", description: "Add to your inbox", shortcut: "T" },
  { app: "calendar", label: "Event", description: "Schedule time", shortcut: "E" },
  { app: "mail", label: "Email", description: "Compose a message", shortcut: "M" },
  { app: "files", label: "Upload file", description: "From your device", shortcut: "U" },
  { app: "journal", label: "Journal entry", description: "Today's reflection", shortcut: "J" },
  { app: "finance", label: "Transaction", description: "Log income or spend", shortcut: "F" },
  { app: "habits", label: "Habit", description: "Start a new streak", shortcut: "H" },
];

/** "+ New" button opening a menu to create items in any Sutra app. */
export function QuickCreateMenu({
  items = defaultQuickCreate,
  onCreate,
  label = "New",
  size = "sm",
  variant = "primary",
  align = "end",
  className,
}: QuickCreateMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          leadingIcon={<RiAddLine aria-hidden />}
          trailingIcon={<RiArrowDownSLine aria-hidden className="-mr-1 opacity-70" />}
          className={className}
        >
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-64">
        <DropdownMenuLabel>Create new</DropdownMenuLabel>
        {items.map((item, i) => (
          <React.Fragment key={item.app + i}>
            {i === 4 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onSelect={() => onCreate?.(item.app)}
              icon={<SutraAppIcon app={item.app} size={28} shape="squircle" />}
              description={item.description}
              shortcut={item.shortcut}
              className="gap-2.5 [&_svg]:size-7 items-center! [&>svg]:mt-0!"
            >
              {item.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
QuickCreateMenu.displayName = "QuickCreateMenu";

/* ------------------------------------------------------------------ */
/* SortFilterMenu                                                      */
/* ------------------------------------------------------------------ */

export interface SortFilterOption {
  value: string;
  label: React.ReactNode;
}

export interface SortFilterMenuProps {
  sortOptions?: SortFilterOption[];
  sort?: string;
  defaultSort?: string;
  onSortChange?: (value: string) => void;
  direction?: "asc" | "desc";
  defaultDirection?: "asc" | "desc";
  onDirectionChange?: (value: "asc" | "desc") => void;
  filterOptions?: SortFilterOption[];
  filters?: string[];
  defaultFilters?: string[];
  onFiltersChange?: (value: string[]) => void;
  label?: React.ReactNode;
  align?: Align;
  className?: string;
}

const defaultSortOptions: SortFilterOption[] = [
  { value: "due", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "created", label: "Date created" },
  { value: "updated", label: "Last updated" },
  { value: "title", label: "Title" },
];

const defaultFilterOptions: SortFilterOption[] = [
  { value: "completed", label: "Completed tasks" },
  { value: "subtasks", label: "Subtasks" },
  { value: "assigned", label: "Assigned to me" },
  { value: "archived", label: "Archived" },
];

/** View options menu with sort radio items, direction and checkbox filters. */
export function SortFilterMenu({
  sortOptions = defaultSortOptions,
  sort,
  defaultSort,
  onSortChange,
  direction,
  defaultDirection = "asc",
  onDirectionChange,
  filterOptions = defaultFilterOptions,
  filters,
  defaultFilters = ["subtasks", "assigned"],
  onFiltersChange,
  label = "View",
  align = "end",
  className,
}: SortFilterMenuProps) {
  const [sortValue, setSort] = useControllableState<string>({
    value: sort,
    defaultValue: defaultSort ?? sortOptions[0]?.value ?? "",
    onChange: onSortChange,
  });
  const [dir, setDir] = useControllableState<"asc" | "desc">({
    value: direction,
    defaultValue: defaultDirection,
    onChange: onDirectionChange,
  });
  const [active, setActive] = useControllableState<string[]>({
    value: filters,
    defaultValue: defaultFilters,
    onChange: onFiltersChange,
  });
  const toggle = (v: string, on: boolean) => setActive(on ? [...active, v] : active.filter((x) => x !== v));
  const isDefault =
    sortValue === (defaultSort ?? sortOptions[0]?.value) &&
    dir === defaultDirection &&
    active.length === defaultFilters.length &&
    active.every((a) => defaultFilters.includes(a));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" leadingIcon={<RiFilter3Line aria-hidden />} className={className}>
          {label}
          {active.length > 0 && (
            <Badge color="brand" size="sm" className="-mr-1 tabular-nums">
              {active.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-60">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sortValue} onValueChange={setSort}>
          {sortOptions.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value} onSelect={(e) => e.preventDefault()}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Order</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={dir} onValueChange={(v) => setDir(v as "asc" | "desc")}>
          <DropdownMenuRadioItem value="asc" onSelect={(e) => e.preventDefault()}>
            Ascending
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc" onSelect={(e) => e.preventDefault()}>
            Descending
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Show</DropdownMenuLabel>
        {filterOptions.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={active.includes(o.value)}
            onCheckedChange={(c) => toggle(o.value, c === true)}
            onSelect={(e) => e.preventDefault()}
          >
            {o.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          icon={<RiRefreshLine aria-hidden />}
          disabled={isDefault}
          onSelect={() => {
            setSort(defaultSort ?? sortOptions[0]?.value ?? "");
            setDir(defaultDirection);
            setActive(defaultFilters);
          }}
        >
          Reset to default
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
SortFilterMenu.displayName = "SortFilterMenu";
