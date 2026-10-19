import * as React from "react";
import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowRightLine,
  RiArrowRightSLine,
  RiArrowUpLine,
  RiCalendarLine,
  RiDownload2Line,
  RiGlobalLine,
  RiLayoutGridLine,
  RiListCheck,
  RiMapPinLine,
  RiMessage3Line,
  RiMoreLine,
  RiPlayCircleLine,
  RiShareForwardLine,
  RiUserAddLine,
  RiUserFollowLine,
  RiLinkM,
} from "@remixicon/react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { Badge } from "../primitives/badge";
import { Avatar } from "../primitives/avatar";
import { AvatarGroup } from "../primitives/avatar-group";
import { Heading } from "../primitives/typography";
import { PageHeader, SectionHeader } from "../patterns/section-header";
import { Breadcrumbs, type BreadcrumbCrumb } from "../primitives/breadcrumbs";
import { Tabs, TabsList, TabsTrigger } from "../primitives/tabs";
import { Sparkline } from "../patterns/sparkline";
import { SearchInput } from "../primitives/input";
import { SimpleSelect, type SelectOption } from "../primitives/select";
import { SegmentedControl } from "../primitives/segmented-control";
import { MeshGradient } from "../primitives/mesh-gradient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../primitives/dropdown-menu";
import { Container } from "../primitives/layout";
import { BackgroundPattern } from "../assets/misc";
import { LogoCloud } from "../assets/placeholder-logos";

export interface HeaderAction {
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
}

function ActionButton({ action, variant }: { action: HeaderAction; variant: "primary" | "secondary" }) {
  if (action.href) {
    return (
      <Button asChild variant={variant}>
        <a href={action.href} onClick={action.onClick}>
          {action.icon}
          {action.label}
        </a>
      </Button>
    );
  }
  return (
    <Button variant={variant} leadingIcon={action.icon} onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/* PageHeaderWithActions                                               */
/* ------------------------------------------------------------------ */

export interface PageHeaderWithActionsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: BreadcrumbCrumb[];
  primaryAction?: HeaderAction | null;
  secondaryActions?: HeaderAction[];
  /** Replace the generated buttons entirely. */
  actions?: React.ReactNode;
  /** Small badges or meta next to the title. */
  meta?: React.ReactNode;
  onBack?: () => void;
  divider?: boolean;
}

/** Page header with breadcrumbs, title, description and primary/secondary buttons. */
export const PageHeaderWithActions = React.forwardRef<HTMLDivElement, PageHeaderWithActionsProps>(
  (
    {
      title = "Projects",
      description = "Plan, track and ship work across every app in your workspace.",
      breadcrumbs = [{ label: "Workspace", href: "#" }, { label: "Projects" }],
      primaryAction = { label: "New project", icon: <RiAddLine aria-hidden /> },
      secondaryActions = [
        { label: "Share", icon: <RiShareForwardLine aria-hidden /> },
        { label: "Export", icon: <RiDownload2Line aria-hidden /> },
      ],
      actions,
      meta,
      onBack,
      divider = true,
      className,
      ...props
    },
    ref
  ) => (
    <div ref={ref} className={className} {...props}>
      <PageHeader
        breadcrumbs={breadcrumbs.length > 0 ? <Breadcrumbs items={breadcrumbs} size="sm" /> : undefined}
        onBack={onBack}
        divider={divider}
        title={
          meta ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              {title}
              {meta}
            </span>
          ) : (
            title
          )
        }
        description={description}
        actions={
          actions ?? (
            <>
              {secondaryActions.map((a, i) => (
                <ActionButton key={i} action={a} variant="secondary" />
              ))}
              {primaryAction ? <ActionButton action={primaryAction} variant="primary" /> : null}
            </>
          )
        }
      />
    </div>
  )
);
PageHeaderWithActions.displayName = "PageHeaderWithActions";

/* ------------------------------------------------------------------ */
/* PageHeaderWithTabs                                                  */
/* ------------------------------------------------------------------ */

export interface PageHeaderTab {
  value: string;
  label: React.ReactNode;
  count?: number;
  icon?: React.ReactNode;
}

export interface PageHeaderWithTabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  tabs?: PageHeaderTab[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  actions?: React.ReactNode;
  /** Tab panels (`TabsContent`) rendered under the header, sharing the tab state. */
  children?: React.ReactNode;
}

const defaultTabs: PageHeaderTab[] = [
  { value: "overview", label: "Overview" },
  { value: "tasks", label: "Tasks", count: 24 },
  { value: "notes", label: "Notes", count: 8 },
  { value: "files", label: "Files", count: 13 },
  { value: "activity", label: "Activity" },
];

/** Page header with title, actions and an underline tab bar. */
export const PageHeaderWithTabs = React.forwardRef<HTMLDivElement, PageHeaderWithTabsProps>(
  (
    {
      title = "Q4 Launch Plan",
      description = "Everything the team needs to ship Sutra 3.0 before December.",
      tabs = defaultTabs,
      value,
      defaultValue,
      onValueChange,
      actions,
      children,
      className,
      ...props
    },
    ref
  ) => (
    <Tabs
      value={value}
      defaultValue={defaultValue ?? tabs[0]?.value}
      onValueChange={onValueChange}
      variant="underline"
      className={cn("w-full", className)}
    >
      <div ref={ref} {...props}>
        <SectionHeader
          as="h1"
          size="lg"
          title={title}
          description={description}
          actions={
            actions ?? (
              <>
                <AvatarGroup size="sm" max={4} className="mr-1 hidden sm:flex">
                  {["Aiko Tanaka", "Diego Alvarez", "Priya Shah", "Noah Kim", "Lena Okafor"].map((n) => (
                    <Avatar key={n} name={n} />
                  ))}
                </AvatarGroup>
                <Button variant="secondary" leadingIcon={<RiUserAddLine aria-hidden />}>
                  Invite
                </Button>
                <Button leadingIcon={<RiAddLine aria-hidden />}>Add task</Button>
              </>
            )
          }
          tabs={
            <TabsList className="-mb-px gap-5 overflow-x-auto scrollbar-none">
              {tabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value} icon={t.icon} badge={t.count}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          }
          divider
        />
      </div>
      {children}
    </Tabs>
  )
);
PageHeaderWithTabs.displayName = "PageHeaderWithTabs";

/* ------------------------------------------------------------------ */
/* PageHeaderWithStats                                                 */
/* ------------------------------------------------------------------ */

export interface PageHeaderStat {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Percentage change, e.g. 12.5 or -3.2. */
  change?: number;
  /** Treat a decrease as good (e.g. response time). */
  invert?: boolean;
  trend?: number[];
  caption?: React.ReactNode;
}

export interface PageHeaderWithStatsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  stats?: PageHeaderStat[];
  actions?: React.ReactNode;
  rangeOptions?: SelectOption[];
  range?: string;
  defaultRange?: string;
  onRangeChange?: (value: string) => void;
}

const defaultStats: PageHeaderStat[] = [
  { label: "Tasks completed", value: "128", change: 12.4, trend: [8, 12, 10, 14, 13, 18, 17, 22, 21, 26], caption: "vs last week" },
  { label: "Focus time", value: "21h 40m", change: 6.1, trend: [3, 4, 3.5, 5, 4.2, 4.8, 5.5, 5.1, 6, 6.4], caption: "vs last week" },
  { label: "Habit streak", value: "34 days", change: 3.0, trend: [20, 22, 23, 25, 26, 28, 29, 31, 33, 34], caption: "personal best" },
  { label: "Overdue", value: "7", change: -18.2, invert: true, trend: [14, 13, 12, 12, 11, 10, 9, 9, 8, 7], caption: "vs last week" },
];

const defaultRanges: SelectOption[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last quarter" },
];

/** Dashboard header: title, range select and a row of stat cards with sparklines and trend badges. */
export const PageHeaderWithStats = React.forwardRef<HTMLDivElement, PageHeaderWithStatsProps>(
  (
    {
      title = "Good morning, Maya",
      description = "Here's how your week is going across Sutra.",
      stats = defaultStats,
      actions,
      rangeOptions = defaultRanges,
      range,
      defaultRange,
      onRangeChange,
      className,
      ...props
    },
    ref
  ) => (
    <div ref={ref} className={cn("@container flex flex-col gap-6", className)} {...props}>
      <SectionHeader
        as="h1"
        size="lg"
        title={title}
        description={description}
        actions={
          actions ?? (
            <>
              <SimpleSelect
                options={rangeOptions}
                value={range}
                defaultValue={range === undefined ? (defaultRange ?? rangeOptions[0]?.value) : undefined}
                onValueChange={onRangeChange}
                leadingIcon={<RiCalendarLine aria-hidden />}
                aria-label="Date range"
                className="w-44"
              />
              <Button variant="secondary" leadingIcon={<RiDownload2Line aria-hidden />}>
                Export
              </Button>
            </>
          )
        }
      />
      <dl className={cn("grid grid-cols-1 gap-4 @md:grid-cols-2", stats.length >= 4 ? "@4xl:grid-cols-4" : "@3xl:grid-cols-3")}>
        {stats.map((s, i) => {
          const up = (s.change ?? 0) >= 0;
          const good = s.invert ? !up : up;
          return (
            <div key={i} className="flex flex-col gap-3 rounded-box border border-border bg-card p-5 shadow-xs">
              <dt className="text-sm font-medium text-muted-foreground">{s.label}</dt>
              <dd className="flex items-end justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-display-xs font-semibold tracking-tight text-foreground tabular-nums">{s.value}</span>
                  {s.change !== undefined ? (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge
                        size="sm"
                        color={good ? "success" : "destructive"}
                        leadingIcon={up ? <RiArrowUpLine aria-hidden /> : <RiArrowDownLine aria-hidden />}
                        className="tabular-nums"
                      >
                        {Math.abs(s.change).toFixed(1)}%
                      </Badge>
                      {s.caption}
                    </span>
                  ) : s.caption ? (
                    <span className="text-xs text-muted-foreground">{s.caption}</span>
                  ) : null}
                </div>
                {s.trend && s.trend.length > 1 ? (
                  <Sparkline
                    data={s.trend}
                    type="area"
                    width={96}
                    height={40}
                    smooth
                    gradient
                    highlightLast
                    color={good ? "success" : "destructive"}
                    label={`Trend for ${typeof s.label === "string" ? s.label : "stat"}`}
                    className="shrink-0"
                  />
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  )
);
PageHeaderWithStats.displayName = "PageHeaderWithStats";

/* ------------------------------------------------------------------ */
/* PageHeaderWithSearch                                                */
/* ------------------------------------------------------------------ */

export interface PageHeaderFilter {
  id: string;
  label: string;
  options: SelectOption[];
  defaultValue?: string;
}

export interface PageHeaderWithSearchProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  count?: number;
  description?: React.ReactNode;
  searchPlaceholder?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  filters?: PageHeaderFilter[];
  onFilterChange?: (id: string, value: string) => void;
  view?: "list" | "grid";
  defaultView?: "list" | "grid";
  onViewChange?: (view: "list" | "grid") => void;
  primaryAction?: HeaderAction | null;
}

const defaultFilters: PageHeaderFilter[] = [
  {
    id: "status",
    label: "Status",
    defaultValue: "all",
    options: [
      { value: "all", label: "All statuses" },
      { value: "todo", label: "To do" },
      { value: "progress", label: "In progress" },
      { value: "done", label: "Done" },
    ],
  },
  {
    id: "owner",
    label: "Owner",
    defaultValue: "anyone",
    options: [
      { value: "anyone", label: "Anyone" },
      { value: "me", label: "Assigned to me" },
      { value: "unassigned", label: "Unassigned" },
    ],
  },
];

/** Index page header: title with count, search field, filter selects and a list/grid toggle. */
export const PageHeaderWithSearch = React.forwardRef<HTMLDivElement, PageHeaderWithSearchProps>(
  (
    {
      title = "All tasks",
      count = 248,
      description,
      searchPlaceholder = "Search tasks…",
      search,
      onSearchChange,
      filters = defaultFilters,
      onFilterChange,
      view,
      defaultView = "list",
      onViewChange,
      primaryAction = { label: "New task", icon: <RiAddLine aria-hidden /> },
      className,
      ...props
    },
    ref
  ) => (
    <div ref={ref} className={cn("flex flex-col gap-4 border-b border-border pb-4", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <Heading as="h1" size="display-xs">
              {title}
            </Heading>
            {count !== undefined ? (
              <Badge variant="outline" color="neutral" className="tabular-nums">
                {count.toLocaleString()}
              </Badge>
            ) : null}
          </div>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {primaryAction ? <ActionButton action={primaryAction} variant="primary" /> : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          placeholder={searchPlaceholder}
          hotkey="/"
          value={search}
          onChange={onSearchChange ? (e) => onSearchChange(e.target.value) : undefined}
          onClear={onSearchChange ? () => onSearchChange("") : undefined}
          wrapperClassName="sm:max-w-80"
          aria-label="Search"
        />
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {filters.map((f) => (
            <SimpleSelect
              key={f.id}
              options={f.options}
              defaultValue={f.defaultValue ?? f.options[0]?.value}
              onValueChange={(v) => onFilterChange?.(f.id, v)}
              aria-label={f.label}
              className="w-auto min-w-36"
            />
          ))}
          <SegmentedControl
            aria-label="View"
            value={view}
            defaultValue={view === undefined ? defaultView : undefined}
            onValueChange={(v) => onViewChange?.(v as "list" | "grid")}
            options={[
              { value: "list", icon: <RiListCheck aria-hidden />, "aria-label": "List view" },
              { value: "grid", icon: <RiLayoutGridLine aria-hidden />, "aria-label": "Grid view" },
            ]}
          />
        </div>
      </div>
    </div>
  )
);
PageHeaderWithSearch.displayName = "PageHeaderWithSearch";

/* ------------------------------------------------------------------ */
/* ProfileHeader                                                       */
/* ------------------------------------------------------------------ */

export interface ProfileHeaderMeta {
  icon?: React.ReactNode;
  label: React.ReactNode;
  href?: string;
}

export interface ProfileHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  name?: string;
  handle?: string;
  bio?: React.ReactNode;
  avatarSrc?: string;
  /** Cover image URL; defaults to a brand mesh gradient. */
  coverSrc?: string;
  verified?: boolean;
  meta?: ProfileHeaderMeta[];
  stats?: { label: React.ReactNode; value: React.ReactNode }[];
  actions?: React.ReactNode;
  onFollow?: () => void;
  onMessage?: () => void;
}

/** Profile banner: cover, overlapping large avatar, name, meta, stats and actions. */
export const ProfileHeader = React.forwardRef<HTMLDivElement, ProfileHeaderProps>(
  (
    {
      name = "Maya Patel",
      handle = "@maya",
      bio = "Product designer at Northwind. Writing about calm software, deep work and slow mornings.",
      avatarSrc,
      coverSrc,
      verified = true,
      meta = [
        { icon: <RiMapPinLine aria-hidden />, label: "Lisbon, Portugal" },
        { icon: <RiLinkM aria-hidden />, label: "maya.design", href: "#" },
        { icon: <RiCalendarLine aria-hidden />, label: "Joined March 2024" },
      ],
      stats = [
        { label: "Following", value: "214" },
        { label: "Followers", value: "1,892" },
        { label: "Public notes", value: "56" },
      ],
      actions,
      onFollow,
      onMessage,
      className,
      ...props
    },
    ref
  ) => {
    const [following, setFollowing] = React.useState(false);
    return (
      <div ref={ref} className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-xs", className)} {...props}>
        {coverSrc ? (
          <img src={coverSrc} alt="" className="h-36 w-full object-cover sm:h-48" />
        ) : (
          <MeshGradient grain intensity={0.9} className="h-36 bg-brand-200 sm:h-48" aria-hidden>
            <BackgroundPattern variant="grid" fade="top" color="rgb(255 255 255 / 0.18)" />
          </MeshGradient>
        )}
        <div className="px-5 pb-5 sm:px-8 sm:pb-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
            <Avatar
              name={name}
              src={avatarSrc}
              size="2xl"
              verified={verified}
              frameClassName="size-24 text-2xl ring-4 ring-card sm:size-28 sm:text-3xl shadow-md"
            />
            <div className="flex max-w-full flex-wrap items-center gap-2">
              {actions ?? (
                <>
                  <Button variant="secondary" leadingIcon={<RiMessage3Line aria-hidden />} onClick={onMessage}>
                    Message
                  </Button>
                  <Button
                    variant={following ? "secondary" : "primary"}
                    leadingIcon={following ? <RiUserFollowLine aria-hidden /> : <RiUserAddLine aria-hidden />}
                    aria-pressed={following}
                    onClick={() => {
                      setFollowing((f) => !f);
                      onFollow?.();
                    }}
                  >
                    {following ? "Following" : "Follow"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" aria-label="More actions">
                        <RiMoreLine aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem icon={<RiShareForwardLine aria-hidden />}>Share profile</DropdownMenuItem>
                      <DropdownMenuItem icon={<RiLinkM aria-hidden />}>Copy link</DropdownMenuItem>
                      <DropdownMenuItem icon={<RiGlobalLine aria-hidden />}>View public page</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{name}</h1>
            {handle ? <p className="text-sm text-muted-foreground">{handle}</p> : null}
          </div>
          {bio ? <p className="mt-3 max-w-2xl text-pretty text-sm text-foreground/90">{bio}</p> : null}
          {meta.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {meta.map((m, i) => (
                <li key={i} className="flex items-center gap-1.5 [&_svg]:size-4">
                  {m.icon}
                  {m.href ? (
                    <a href={m.href} className="font-medium text-primary hover:underline">
                      {m.label}
                    </a>
                  ) : (
                    m.label
                  )}
                </li>
              ))}
            </ul>
          )}
          {stats.length > 0 && (
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {stats.map((s, i) => (
                <div key={i} className="flex items-baseline gap-1.5">
                  <dd className="font-semibold text-foreground tabular-nums">{s.value}</dd>
                  <dt className="text-muted-foreground">{s.label}</dt>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    );
  }
);
ProfileHeader.displayName = "ProfileHeader";

/* ------------------------------------------------------------------ */
/* HeroHeader                                                          */
/* ------------------------------------------------------------------ */

export interface HeroHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  eyebrow?: React.ReactNode;
  eyebrowHref?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  primaryAction?: HeaderAction | null;
  secondaryAction?: HeaderAction | null;
  /** Media below the copy (screenshot, DeviceFrame…). */
  media?: React.ReactNode;
  /** Show a logo cloud under the actions. */
  showLogos?: boolean;
  align?: "center" | "start";
}

/** Marketing hero: eyebrow pill, display heading, subtext, CTAs on a mesh gradient. */
export const HeroHeader = React.forwardRef<HTMLElement, HeroHeaderProps>(
  (
    {
      eyebrow = "Sutra Journal is here",
      eyebrowHref = "#journal",
      title = (
        <>
          Your whole life, <span className="bg-gradient-to-br from-brand-400 to-brand-700 bg-clip-text text-transparent">one calm thread</span>
        </>
      ),
      description = "Notes, tasks, calendar, mail, files, journal, finance and habits in one beautifully connected suite. Less switching, more doing.",
      primaryAction = { label: "Get started free", href: "#signup" },
      secondaryAction = { label: "Watch the demo", icon: <RiPlayCircleLine aria-hidden /> },
      media,
      showLogos = true,
      align = "center",
      className,
      ...props
    },
    ref
  ) => {
    const centered = align === "center";
    return (
      <MeshGradient
        intensity={0.35}
        blur={90}
        className={cn("bg-background", className)}
        layerClassName="[mask-image:linear-gradient(to_bottom,#000_40%,transparent)]"
      >
        <section ref={ref} className="relative" {...props}>
          <BackgroundPattern variant="grid" fade="radial" className="opacity-60" />
          <Container className={cn("relative flex flex-col gap-8 py-20 sm:py-28", centered && "items-center text-center")}>
            {eyebrow ? (
              <a
                href={eyebrowHref}
                className="group inline-flex items-center gap-2 rounded-full border border-border bg-background/70 py-1 pl-1 pr-3 text-sm shadow-xs backdrop-blur transition-colors hover:border-border-strong"
              >
                <Badge color="brand" variant="solid" size="sm" className="rounded-full">
                  New
                </Badge>
                <span className="font-medium text-foreground">{eyebrow}</span>
                <RiArrowRightSLine aria-hidden className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </a>
            ) : null}
            <div className={cn("flex max-w-3xl flex-col gap-5", centered && "items-center")}>
              <Heading as="h1" size="display-2xl" className="tracking-tight">
                {title}
              </Heading>
              {description ? (
                <p className="max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">{description}</p>
              ) : null}
            </div>
            {(primaryAction || secondaryAction) && (
              <div className={cn("flex w-full flex-col gap-3 sm:w-auto sm:flex-row", centered && "justify-center")}>
                {primaryAction ? (
                  primaryAction.href ? (
                    <Button asChild size="xl" className="group/cta">
                      <a href={primaryAction.href} onClick={primaryAction.onClick}>
                        {primaryAction.label}
                        <RiArrowRightLine aria-hidden className="transition-transform group-hover/cta:translate-x-0.5" />
                      </a>
                    </Button>
                  ) : (
                    <Button size="xl" className="group/cta" trailingIcon={<RiArrowRightLine aria-hidden className="transition-transform group-hover/cta:translate-x-0.5" />} onClick={primaryAction.onClick}>
                      {primaryAction.label}
                    </Button>
                  )
                ) : null}
                {secondaryAction ? (
                  <Button size="xl" variant="secondary" leadingIcon={secondaryAction.icon} onClick={secondaryAction.onClick}>
                    {secondaryAction.label}
                  </Button>
                ) : null}
              </div>
            )}
            {media ? <div className="mt-6 w-full">{media}</div> : null}
            {showLogos ? (
              <LogoCloud title="Trusted by 40,000+ people at" limit={6} columns={6} logoSize="sm" className="mt-8 max-w-4xl" />
            ) : null}
          </Container>
        </section>
      </MeshGradient>
    );
  }
);
HeroHeader.displayName = "HeroHeader";
