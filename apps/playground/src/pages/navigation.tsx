import * as React from "react";
import {
  Badge,
  SectionRail,
  PaginationStatus,
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  Breadcrumbs,
  BreadcrumbSeparator,
  Button,
  HeaderNav,
  HeaderNavActions,
  HeaderNavBrand,
  HeaderNavContent,
  HeaderNavFeatureLink,
  HeaderNavItem,
  HeaderNavLink,
  HeaderNavMenu,
  HeaderNavMobile,
  HeaderNavTrigger,
  PageHeader,
  Pagination,
  SectionHeader,
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
  SidebarSeparator,
  SidebarTrigger,
  SidebarUserCard,
  SutraLogo,
  SutraMark,
  TabMenu,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TreeView,
  useSidebar,
  type BreadcrumbCrumb,
  type TabMenuItem,
  type TabsVariant,
  type TreeNode,
} from "@sutra/ui";
import {
  RiAddLine,
  RiBarChartBoxLine,
  RiBookOpenLine,
  RiCalendarLine,
  RiCodeSSlashLine,
  RiDashboardLine,
  RiDownloadLine,
  RiFileTextLine,
  RiFolderLine,
  RiHome5Line,
  RiInboxLine,
  RiLifebuoyLine,
  RiMailLine,
  RiNotification3Line,
  RiPlugLine,
  RiSettings3Line,
  RiShieldCheckLine,
  RiTeamLine,
  RiUploadCloud2Line,
} from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";
import { CarouselDemo } from "./carousel-demos";
import { StepWizardDemo } from "./wizard-demos";

/* ------------------------------------------------------------------ */
/* Breadcrumbs                                                         */
/* ------------------------------------------------------------------ */

const crumbs: BreadcrumbCrumb[] = [
  { label: "Home", href: "#breadcrumbs", icon: <RiHome5Line /> },
  { label: "Projects", href: "#breadcrumbs" },
  { label: "Sutra UI", href: "#breadcrumbs" },
  { label: "Components", href: "#breadcrumbs" },
  { label: "Navigation", href: "#breadcrumbs" },
  { label: "Breadcrumbs" },
];

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

function PaginationDemo() {
  const [page, setPage] = React.useState(6);
  const [pageSize, setPageSize] = React.useState(25);
  const [loaded, setLoaded] = React.useState(1);
  const [loading, setLoading] = React.useState(false);

  const loadMore = (next: number) => {
    setLoading(true);
    window.setTimeout(() => {
      setLoaded(next);
      setLoading(false);
    }, 700);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <DemoLabel>numbered (default) · page {page} of 12</DemoLabel>
        <Pagination page={page} totalPages={12} onPageChange={setPage} />
      </div>
      <div className="space-y-3">
        <DemoLabel>siblingCount=2 · boundaryCount=2 · size="sm"</DemoLabel>
        <Pagination defaultPage={10} totalPages={20} siblingCount={2} boundaryCount={2} size="sm" />
      </div>
      <div className="space-y-3">
        <DemoLabel>pageJump · activate an ellipsis, type a page number, Enter jumps (Escape cancels)</DemoLabel>
        <Pagination defaultPage={40} totalPages={80} pageJump />
      </div>
      <div className="space-y-3">
        <DemoLabel>With page size selector</DemoLabel>
        <Pagination
          defaultPage={1}
          totalPages={Math.ceil(480 / pageSize)}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          onPageSizeChange={setPageSize}
        />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <DemoLabel>simple</DemoLabel>
          <Pagination variant="simple" defaultPage={3} totalPages={8} />
        </div>
        <div className="space-y-3">
          <DemoLabel>dots</DemoLabel>
          <Pagination variant="dots" defaultPage={2} totalPages={5} />
        </div>
      </div>
      <div className="space-y-3">
        <DemoLabel>load-more</DemoLabel>
        <Pagination variant="load-more" page={loaded} totalPages={4} onPageChange={loadMore} loading={loading} />
      </div>
      <div className="space-y-3">
        <DemoLabel>disabled · size="lg"</DemoLabel>
        <Pagination defaultPage={2} totalPages={5} size="lg" disabled />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TabMenu                                                             */
/* ------------------------------------------------------------------ */

const projectTabs: TabMenuItem[] = [
  { value: "overview", label: "Overview", icon: <RiDashboardLine /> },
  { value: "issues", label: "Issues", icon: <RiInboxLine />, count: 24 },
  { value: "docs", label: "Docs", icon: <RiBookOpenLine /> },
  { value: "analytics", label: "Analytics", icon: <RiBarChartBoxLine /> },
  { value: "integrations", label: "Integrations", icon: <RiPlugLine />, count: 3 },
  { value: "audit", label: "Audit log", icon: <RiShieldCheckLine />, disabled: true },
  { value: "settings", label: "Settings", icon: <RiSettings3Line /> },
];

function PaginationStatusDemo() {
  const [page, setPage] = React.useState(3);
  const [pageSize, setPageSize] = React.useState(10);
  const total = 245;
  return (
    <div className="@container grid grid-cols-1 w-full gap-6">
      <div className="space-y-2">
        <DemoLabel>PaginationStatus beside Pagination (page {page}, {pageSize} per page)</DemoLabel>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <PaginationStatus page={page} pageSize={pageSize} total={total} locale="en-US" />
          <Pagination
            page={page}
            totalPages={Math.ceil(total / pageSize)}
            onPageChange={setPage}
            variant="simple"
            pageSize={pageSize}
            pageSizeOptions={[10, 25, 50]}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 @lg:grid-cols-3">
        <div className="space-y-1">
          <DemoLabel>Custom format</DemoLabel>
          <PaginationStatus page={2} pageSize={25} total={61} format={({ from, to, total: t }) => `Showing ${from} to ${to} of ${t} invoices`} />
        </div>
        <div className="space-y-1">
          <DemoLabel>Loading, no rows yet</DemoLabel>
          <PaginationStatus page={1} pageSize={25} total={0} loading />
        </div>
        <div className="space-y-1">
          <DemoLabel>Empty</DemoLabel>
          <PaginationStatus page={1} pageSize={25} total={0} emptyState="No invoices" />
        </div>
      </div>
      <div className="max-w-40 space-y-1">
        <DemoLabel>Narrow container</DemoLabel>
        <PaginationStatus page={1} pageSize={10} total={1000000} locale="en-US" />
      </div>
    </div>
  );
}

function TabMenuDemo() {
  const [tab, setTab] = React.useState("issues");
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <DemoLabel>Icons, counts, disabled item · active: {tab}</DemoLabel>
        <TabMenu items={projectTabs} value={tab} onValueChange={setTab} />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <DemoLabel>size="sm" · labels only</DemoLabel>
          <TabMenu
            size="sm"
            items={[
              { value: "all", label: "All" },
              { value: "unread", label: "Unread", count: 8 },
              { value: "mentions", label: "Mentions" },
              { value: "archived", label: "Archived" },
            ]}
          />
        </div>
        <div className="max-w-xs space-y-3">
          <DemoLabel>Narrow container scrolls with edge fades</DemoLabel>
          <TabMenu items={projectTabs} defaultValue="analytics" size="lg" bordered={false} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

const tabsVariants: TabsVariant[] = ["pill", "underline", "solid", "ghost"];

const tabPanels = [
  { value: "account", label: "Account", text: "Update your name, email and profile photo." },
  { value: "security", label: "Security", text: "Two-factor authentication is enabled for this workspace." },
  { value: "billing", label: "Billing", text: "You are on the Pro plan, renewing on November 1." },
];

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

function SidebarStatus() {
  const { state } = useSidebar();
  return (
    <Badge size="sm" variant="dot" color={state === "expanded" ? "success" : "neutral"}>
      {state}
    </Badge>
  );
}

function SidebarPreview() {
  const [active, setActive] = React.useState("Inbox");
  const item = (label: string, icon: React.ReactNode, badge?: React.ReactNode) => (
    <SidebarMenuItem>
      <SidebarMenuButton icon={icon} active={active === label} onClick={() => setActive(label)} badge={badge}>
        {label}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <div className="h-[620px] w-full overflow-hidden rounded-box border border-border">
      <SidebarProvider shortcut={null} contained>
        <Sidebar mobileTitle="Workspace navigation">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" icon={<SutraMark size={28} />} tooltip="Sutra">
                  <span className="grid leading-tight">
                    <span className="truncate font-semibold">Sutra</span>
                    <span className="truncate text-xs text-muted-foreground">Design team</span>
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarMenu>
                {item("Inbox", <RiInboxLine />, 12)}
                {item("Calendar", <RiCalendarLine />)}
                {item("Mail", <RiMailLine />, 3)}
                <SidebarMenuItem>
                  <SidebarMenuSub label="Projects" icon={<RiFolderLine />} defaultOpen>
                    {["Website redesign", "Mobile app", "Brand refresh"].map((p) => (
                      <SidebarMenuSubButton
                        key={p}
                        href="#sidebar"
                        active={active === p}
                        onClick={(e) => {
                          e.preventDefault();
                          setActive(p);
                        }}
                      >
                        {p}
                      </SidebarMenuSubButton>
                    ))}
                  </SidebarMenuSub>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Organization</SidebarGroupLabel>
              <SidebarMenu>
                {item("Team", <RiTeamLine />)}
                {item("Reports", <RiBarChartBoxLine />)}
                {item("Settings", <RiSettings3Line />)}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              {item("Help & support", <RiLifebuoyLine />)}
            </SidebarMenu>
            <SidebarUserCard name="Olivia Rhye" email="olivia@sutra.app" avatarSrc="https://i.pravatar.cc/80?img=47" />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset as="div">
          <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
            <SidebarTrigger />
            <span className="h-4 w-px bg-border" aria-hidden />
            <span className="text-sm font-medium">{active}</span>
            <span className="ml-auto">
              <SidebarStatus />
            </span>
          </div>
          <div className="space-y-4 p-6">
            <p className="max-w-md text-sm text-muted-foreground">
              Click the toggle to collapse the sidebar into an icon rail; hover icons for tooltips. The ⌘B shortcut is
              disabled here with <code className="font-mono text-xs">shortcut={"{null}"}</code> so it does not fight the
              playground's own sidebar.
            </p>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 rounded-box border border-dashed border-border bg-subtle" />
              ))}
            </div>
            <div className="h-40 rounded-box border border-dashed border-border bg-subtle" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TreeView                                                            */
/* ------------------------------------------------------------------ */

const fileTree: TreeNode[] = [
  {
    id: "src",
    label: "src",
    children: [
      {
        id: "src/components",
        label: "components",
        children: [
          { id: "src/components/button.tsx", label: "button.tsx" },
          { id: "src/components/dialog.tsx", label: "dialog.tsx" },
          { id: "src/components/tabs.tsx", label: "tabs.tsx" },
          { id: "src/components/tree-view.tsx", label: "tree-view.tsx" },
        ],
      },
      {
        id: "src/hooks",
        label: "hooks",
        children: [
          { id: "src/hooks/use-copy.ts", label: "use-copy.ts" },
          { id: "src/hooks/use-theme.ts", label: "use-theme.ts" },
        ],
      },
      { id: "src/index.ts", label: "index.ts" },
    ],
  },
  {
    id: "docs",
    label: "docs",
    children: [
      { id: "docs/getting-started.md", label: "getting-started.md", icon: <RiFileTextLine /> },
      { id: "docs/theming.md", label: "theming.md", icon: <RiFileTextLine /> },
    ],
  },
  { id: "legacy", label: "legacy (archived)", disabled: true, children: [{ id: "legacy/old.js", label: "old.js" }] },
  { id: "package.json", label: "package.json", icon: <RiCodeSSlashLine /> },
  { id: "README.md", label: "README.md", icon: <RiFileTextLine /> },
];

function TreeViewDemo() {
  const [selected, setSelected] = React.useState<string[]>(["src/components/tabs.tsx"]);
  const [checked, setChecked] = React.useState<string[]>(["src/hooks", "src/hooks/use-copy.ts", "src/hooks/use-theme.ts"]);
  return (
    <div className="grid grid-cols-1 w-full gap-6 lg:grid-cols-2">
      <div className="space-y-2">
        <DemoLabel>Single selection · selected: {selected[0] ?? "none"}</DemoLabel>
        <div className="rounded-box border border-border bg-card p-2">
          <TreeView
            aria-label="Project files"
            nodes={fileTree}
            defaultExpanded={["src", "src/components"]}
            selected={selected}
            onSelectedChange={setSelected}
          />
        </div>
      </div>
      <div className="space-y-2">
        <DemoLabel>checkable · size="sm" · {checked.filter((id) => id.includes(".")).length} files checked</DemoLabel>
        <div className="rounded-box border border-border bg-card p-2">
          <TreeView
            aria-label="Files to commit"
            nodes={fileTree}
            size="sm"
            defaultExpanded={["src", "src/hooks", "docs"]}
            selectionMode="none"
            checkable
            checked={checked}
            onCheckedChange={setChecked}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const railSections = [
  { id: "overview", label: "Overview", body: "A rail lists the sections of a long page and highlights the one in view. It is a nav landmark of real links, so it works without scripting and with a keyboard." },
  { id: "install", label: "Installation", body: "Give every section an id and pass the same ids to the rail. The sections can live in the page or in any scrolling element: pass that element as root." },
  { id: "usage", label: "Usage", level: 3, body: "A click scrolls the section to the top of its scroller and highlights it at once. With reduced motion on, the page jumps instead of gliding." },
  { id: "options", label: "Options", level: 3, body: "offset moves the trigger line below a fixed header, value and onValueChange let you drive the highlight, and getHref points the links at a router URL." },
  { id: "notes", label: "Notes", body: "The rail stays on the last section it saw while none is in the observed band, so scrolling past the last heading keeps it lit." },
];

function RailDemo({ prefix, orientation, controlled = false }: { prefix: string; orientation: "vertical" | "horizontal"; controlled?: boolean }) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [picked, setPicked] = React.useState(`${prefix}-overview`);
  const sections = railSections.map((s) => ({ id: `${prefix}-${s.id}`, label: s.label, level: s.level }));
  const [last, setLast] = React.useState<string>();
  const rail = (
    <SectionRail
      sections={sections}
      root={rootRef}
      orientation={orientation}
      getHref={(id) => `#/components/navigation/${id}`}
      label={orientation === "vertical" ? "Page sections" : "Sections, tabs"}
      value={controlled ? picked : undefined}
      onValueChange={(id) => {
        setLast(id);
        setPicked(id);
      }}
      className={orientation === "vertical" ? "@xl:sticky @xl:top-0 @xl:self-start" : undefined}
    />
  );
  return (
    <div className="@container w-full space-y-2">
      <div className={orientation === "vertical" ? "grid grid-cols-1 gap-4 @xl:grid-cols-[11rem_minmax(0,1fr)]" : "space-y-3"}>
        {rail}
        <div ref={rootRef} className="scrollbar-thin h-64 min-w-0 space-y-6 overflow-y-auto rounded-box border border-border p-4">
          {railSections.map((s, i) => (
            <section key={s.id} id={`${prefix}-${s.id}`} className="scroll-mt-2 space-y-2">
              <h3 className="text-sm font-semibold">{s.label}</h3>
              <p className="text-sm text-muted-foreground">{s.body}</p>
              {i < railSections.length - 1 ? <p className="text-sm text-muted-foreground">Scroll this box: the rail follows. {s.body}</p> : <div className="h-48" aria-hidden />}
            </section>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">onValueChange last called with: <span className="font-mono text-foreground">{last ?? "nothing yet"}</span></p>
    </div>
  );
}

function SectionRailDemo() {
  return (
    <div className="grid grid-cols-1 w-full gap-8">
      <div className="space-y-2">
        <DemoLabel>Vertical, tracking a scroll container (root)</DemoLabel>
        <RailDemo prefix="rv" orientation="vertical" />
      </div>
      <div className="space-y-2">
        <DemoLabel>Horizontal tabs</DemoLabel>
        <RailDemo prefix="rh" orientation="horizontal" />
      </div>
      <div className="space-y-2">
        <DemoLabel>Controlled: value and onValueChange drive the highlight (no tracking, a click picks)</DemoLabel>
        <RailDemo prefix="rc" orientation="vertical" controlled />
      </div>
      <div className="grid grid-cols-1 gap-8 @container sm:grid-cols-2">
        <div className="space-y-2">
          <DemoLabel>Loading</DemoLabel>
          <SectionRail loading sections={[]} label="Loading rail" />
        </div>
        <div className="space-y-2">
          <DemoLabel>Empty</DemoLabel>
          <SectionRail sections={[]} emptyState="No headings on this page" label="Empty rail" />
        </div>
      </div>
      <div className="space-y-2">
        <DemoLabel>Narrow container</DemoLabel>
        <div className="max-w-48">
          <SectionRail orientation="horizontal" label="Narrow rail" sections={railSections.map((s) => ({ id: `rn-${s.id}`, label: s.label }))} />
        </div>
      </div>
    </div>
  );
}

export function NavigationPage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="Navigation"
      description="Breadcrumbs, pagination, tabs, headers, sidebars and trees for moving around an app."
    >
      <Demo id="breadcrumbs" title="Breadcrumbs" description="Data-driven trail with collapsing, or composed from primitives." align="start">
        <div className="space-y-6">
          <div className="space-y-2">
            <DemoLabel>Chevron (default)</DemoLabel>
            <Breadcrumbs items={crumbs.slice(0, 4)} />
          </div>
          <div className="space-y-2">
            <DemoLabel>separator="slash"</DemoLabel>
            <Breadcrumbs items={crumbs.slice(1, 5)} separator="slash" />
          </div>
          <div className="space-y-2">
            <DemoLabel>separator="dot" · size="sm"</DemoLabel>
            <Breadcrumbs items={crumbs.slice(1, 4)} separator="dot" size="sm" />
          </div>
          <div className="space-y-2">
            <DemoLabel>maxItems=4 collapses the middle into a menu</DemoLabel>
            <Breadcrumbs items={crumbs} maxItems={4} />
          </div>
          <div className="space-y-2">
            <DemoLabel>Composed</DemoLabel>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#breadcrumbs">
                    <RiHome5Line />
                    Home
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbEllipsis />
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="#breadcrumbs">Settings</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator variant="slash" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Notifications</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </Demo>

      <Demo id="pagination" title="Pagination" description="Numbered, simple, dots and load-more variants, with an optional page-size selector and a page jump on the ellipsis (pageJump)." align="start">
        <PaginationDemo />
      </Demo>

      <Demo id="pagination-status" title="Pagination status" description="PaginationStatus: the rows the current page shows (1–10 of 245), announced politely when the page changes, with a custom format, a loading placeholder and an empty state." align="start">
        <PaginationStatusDemo />
      </Demo>

      <Demo id="tab-menu" title="Tab menu" description="Navigation-style tabs with a sliding underline. Pass href + renderLink for router links." align="start">
        <TabMenuDemo />
      </Demo>

      <Demo id="tabs" title="Tabs" description="Radix tabs with four visual variants and a sliding active indicator." align="start">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {tabsVariants.map((variant) => (
            <div key={variant} className="space-y-3">
              <DemoLabel>variant="{variant}"</DemoLabel>
              <Tabs variant={variant} defaultValue="account">
                <TabsList>
                  {tabPanels.map((t) => (
                    <TabsTrigger key={t.value} value={t.value}>
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {tabPanels.map((t) => (
                  <TabsContent key={t.value} value={t.value} className="text-sm text-muted-foreground">
                    {t.text}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <DemoLabel>Icons, badges · fullWidth · size="lg"</DemoLabel>
            <Tabs variant="underline" size="lg" defaultValue="inbox">
              <TabsList fullWidth>
                <TabsTrigger value="inbox" icon={<RiInboxLine />} badge={12}>
                  Inbox
                </TabsTrigger>
                <TabsTrigger value="alerts" icon={<RiNotification3Line />} badge={3}>
                  Alerts
                </TabsTrigger>
                <TabsTrigger value="sent" icon={<RiMailLine />} disabled>
                  Sent
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="space-y-3">
            <DemoLabel>orientation="vertical"</DemoLabel>
            <Tabs variant="ghost" orientation="vertical" defaultValue="account" size="sm">
              <TabsList>
                {tabPanels.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabPanels.map((t) => (
                <TabsContent key={t.value} value={t.value} className="flex-1 rounded-box border border-border p-4 text-sm text-muted-foreground">
                  {t.text}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </Demo>

      <Demo
        id="header-nav"
        title="Header navigation"
        description="App header with a mega-menu. Rendered with sticky={false} so it stays inside the preview; the menu collapses to a hamburger sheet below md."
        align="start"
        canvasClassName="gap-0 p-0 sm:p-0 min-h-[360px] justify-start"
      >
        <HeaderNav sticky={false} border="always" containerSize="full">
          <HeaderNavBrand href="#header-nav">
            <SutraLogo size="sm" />
          </HeaderNavBrand>
          <HeaderNavMenu>
            <HeaderNavItem>
              <HeaderNavTrigger>Product</HeaderNavTrigger>
              <HeaderNavContent>
                <div className="grid w-[520px] grid-cols-2 gap-1">
                  <HeaderNavFeatureLink href="#header-nav" icon={<RiDashboardLine />} title="Dashboards" description="Live metrics for every team." />
                  <HeaderNavFeatureLink href="#header-nav" icon={<RiInboxLine />} title="Inbox" description="Triage requests in one place." badge="New" />
                  <HeaderNavFeatureLink href="#header-nav" icon={<RiCalendarLine />} title="Calendar" description="Plan launches and sprints." />
                  <HeaderNavFeatureLink href="#header-nav" icon={<RiPlugLine />} title="Integrations" description="Connect 120+ tools." />
                </div>
              </HeaderNavContent>
            </HeaderNavItem>
            <HeaderNavItem>
              <HeaderNavTrigger>Resources</HeaderNavTrigger>
              <HeaderNavContent>
                <div className="flex w-56 flex-col">
                  <HeaderNavLink variant="panel" href="#header-nav">
                    <RiBookOpenLine /> Documentation
                  </HeaderNavLink>
                  <HeaderNavLink variant="panel" href="#header-nav">
                    <RiCodeSSlashLine /> API reference
                  </HeaderNavLink>
                  <HeaderNavLink variant="panel" href="#header-nav">
                    <RiLifebuoyLine /> Help center
                  </HeaderNavLink>
                </div>
              </HeaderNavContent>
            </HeaderNavItem>
            <HeaderNavItem>
              <HeaderNavLink href="#header-nav">Pricing</HeaderNavLink>
            </HeaderNavItem>
            <HeaderNavItem>
              <HeaderNavLink href="#header-nav">Changelog</HeaderNavLink>
            </HeaderNavItem>
          </HeaderNavMenu>
          <HeaderNavActions>
            <Button variant="ghost" size="sm" className="max-md:hidden">
              Sign in
            </Button>
            <Button size="sm">Get started</Button>
            <HeaderNavMobile
              brand={<SutraLogo size="sm" />}
              items={[
                {
                  label: "Product",
                  children: [
                    { label: "Dashboards", href: "#header-nav", icon: <RiDashboardLine /> },
                    { label: "Inbox", href: "#header-nav", icon: <RiInboxLine /> },
                    { label: "Calendar", href: "#header-nav", icon: <RiCalendarLine /> },
                  ],
                },
                { label: "Pricing", href: "#header-nav" },
                { label: "Changelog", href: "#header-nav" },
              ]}
            >
              <Button variant="secondary">Sign in</Button>
              <Button>Get started</Button>
            </HeaderNavMobile>
          </HeaderNavActions>
        </HeaderNav>
        <div className="px-6 py-10 text-sm text-muted-foreground">Hover “Product” or “Resources” to open the mega-menu.</div>
      </Demo>

      <Demo
        id="sidebar"
        title="Sidebar"
        description="SidebarProvider + Sidebar + SidebarInset, bounded to a fixed-height box. Collapses to an icon rail on desktop and becomes a sheet on mobile."
        align="start"
      >
        <SidebarPreview />
      </Demo>

      <Demo id="section-header" title="Section & page header" description="SectionHeader for sections, PageHeader for the top of a page." align="start">
        <div className="space-y-10">
          <div className="space-y-3">
            <DemoLabel>PageHeader · breadcrumbs, back button, actions, tabs</DemoLabel>
            <PageHeader
              breadcrumbs={<Breadcrumbs items={crumbs.slice(1, 4)} size="sm" />}
              onBack={() => {}}
              title="Sutra UI"
              description="Component library for the Sutra apps. 84 components, 12 contributors."
              actions={
                <>
                  <Button variant="secondary" leadingIcon={<RiDownloadLine />}>
                    Export
                  </Button>
                  <Button leadingIcon={<RiAddLine />}>New component</Button>
                </>
              }
              tabs={<TabMenu items={projectTabs.slice(0, 4)} bordered={false} />}
              divider
            />
          </div>
          <div className="space-y-3">
            <DemoLabel>SectionHeader · eyebrow, actions, divider</DemoLabel>
            <SectionHeader
              eyebrow="Settings"
              title="Team members"
              description="Invite colleagues and manage their roles."
              actions={
                <Button size="sm" leadingIcon={<RiAddLine />}>
                  Invite
                </Button>
              }
              divider
            />
          </div>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div className="space-y-3">
              <DemoLabel>size="sm" · leading icon</DemoLabel>
              <SectionHeader
                size="sm"
                as="h3"
                leading={
                  <span className="flex size-9 items-center justify-center rounded-md bg-primary-soft text-primary">
                    <RiUploadCloud2Line className="size-5" />
                  </span>
                }
                title="Uploads"
                description="Files you shared in the last 30 days."
              />
            </div>
            <div className="space-y-3">
              <DemoLabel>align="center" · size="lg"</DemoLabel>
              <SectionHeader
                align="center"
                size="lg"
                eyebrow="Pricing"
                title="Plans for every team"
                description="Start free, upgrade when you grow."
              />
            </div>
          </div>
        </div>
      </Demo>

      <Demo
        id="section-rail"
        title="Section rail"
        description="Section navigation that highlights the section in view: an On this page column or a row of tabs. It tracks sections with useScrollSections, in the viewport or in a scroll container, and BlogTableOfContents is a preset of it."
        align="start"
      >
        <SectionRailDemo />
      </Demo>

      <Demo id="tree-view" title="Tree view" description="Keyboard-navigable file tree with selection, tri-state checkboxes and type-ahead." align="start">
        <TreeViewDemo />
      </Demo>
      <CarouselDemo />
      <StepWizardDemo />
    </PageIntro>
  );
}
