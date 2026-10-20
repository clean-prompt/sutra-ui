import * as React from "react";
import {
  Separator,
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
  SidebarTrigger,
  Spinner,
  SutraLogo,
  Text,
  Badge,
  ShortcutsDialog,
  useShortcuts,
  prefersReducedMotion,
} from "@sutra/ui";
import {
  RiArrowRightSLine,
  RiBrushLine,
  RiCodeBoxLine,
  RiFileTextLine,
  RiFontSize,
  RiLayoutGridLine,
  RiLayoutMasonryLine,
  RiPaletteLine,
  RiShadowLine,
  RiSpace,
  RiSpeedLine,
  RiCheckboxBlankLine,
} from "@sutra/ui/icons";
import { nav, findPage, routeOf } from "./nav";
import { href, useHashRoute } from "./router";
import { ThemeControls, usePersistedTheme } from "./components/theme-controls";
import { DirectionToggle, usePersistedDirection } from "./components/direction-toggle";
import { PageRail } from "./components/page-rail";
import { NavBadge, PageMark } from "./components/nav-badge";
import { NavPalette } from "./components/nav-palette";
/** Lazy-load a named page export so each page ships as its own chunk. */
function lazyPage<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M) {
  return React.lazy(async () => ({ default: (await load())[name] as React.ComponentType }));
}

const foundations = () => import("./pages/foundations");

const pages: Record<string, React.ComponentType> = {
  "foundations/colors": lazyPage(foundations, "ColorsPage"),
  "foundations/typography": lazyPage(foundations, "TypographyPage"),
  "foundations/grid": lazyPage(foundations, "GridPage"),
  "foundations/shadows": lazyPage(foundations, "ShadowsPage"),
  "foundations/radius": lazyPage(foundations, "RadiusPage"),
  "foundations/spacing": lazyPage(foundations, "SpacingPage"),
  "foundations/motion": lazyPage(foundations, "MotionPage"),
  "foundations/styling-hooks": lazyPage(() => import("./pages/docs-reference"), "StylingHooksPage"),
  "foundations/sizing": lazyPage(() => import("./pages/docs-reference"), "SizingPage"),
  "foundations/form-recipes": lazyPage(() => import("./pages/docs-reference"), "FormRecipesPage"),
  "components/buttons": lazyPage(() => import("./pages/buttons"), "ButtonsPage"),
  "components/feedback": lazyPage(() => import("./pages/feedback"), "FeedbackPage"),
  "components/utility": lazyPage(() => import("./pages/utility"), "UtilityPage"),
  "components/content": lazyPage(() => import("./pages/content"), "ContentPage"),
  "components/data-display": lazyPage(() => import("./pages/data-display"), "DataDisplayPage"),
  "components/forms": lazyPage(() => import("./pages/forms"), "FormsPage"),
  "components/indicators": lazyPage(() => import("./pages/indicators"), "IndicatorsPage"),
  "components/navigation": lazyPage(() => import("./pages/navigation"), "NavigationPage"),
  "components/overlays": lazyPage(() => import("./pages/overlays"), "OverlaysPage"),
  "components/ai": lazyPage(() => import("./pages/ai"), "AiPage"),
  "components/more": lazyPage(() => import("./pages/more"), "MorePage"),
  "components/suite": lazyPage(() => import("./pages/suite"), "SuitePage"),
  "components/dataviz": lazyPage(() => import("./pages/dataviz"), "DataVizPage"),
  "components/metrics": lazyPage(() => import("./pages/metrics"), "MetricsPage"),
  "components/files": lazyPage(() => import("./pages/files"), "FilesPage"),
  "components/system": lazyPage(() => import("./pages/system"), "SystemPage"),
  "components/identity": lazyPage(() => import("./pages/identity"), "IdentityPage"),
  "components/ops": lazyPage(() => import("./pages/ops"), "OpsPage"),
  "components/mobile": lazyPage(() => import("./pages/mobile"), "MobilePage"),
  "components/social": lazyPage(() => import("./pages/social"), "SocialPage"),
  "components/security": lazyPage(() => import("./pages/security"), "SecurityPage"),
  "components/editor": lazyPage(() => import("./pages/editor"), "EditorPage"),
  "components/kunji": lazyPage(() => import("./pages/kunji"), "KunjiPage"),
  "components/monitoring": lazyPage(() => import("./pages/monitoring"), "MonitoringPage"),
  "components/geo": lazyPage(() => import("./pages/geo"), "GeoPage"),
  "components/layout-patterns": lazyPage(() => import("./pages/layout-patterns"), "LayoutPatternsPage"),
  "components/statement-hero": lazyPage(() => import("./pages/statement-hero"), "StatementHeroPage"),
  "components/showpieces": lazyPage(() => import("./pages/showpieces"), "ShowpiecesPage"),
  "foundations/paper": lazyPage(() => import("./pages/paper"), "PaperPage"),
  "components/globe": lazyPage(() => import("./pages/globe"), "GlobePage"),
  "components/live-visitors": lazyPage(() => import("./pages/live-visitors"), "LiveVisitorsPage"),
  "components/sign-in-map": lazyPage(() => import("./pages/sign-in-map"), "SignInMapPage"),
  "components/region-map": lazyPage(() => import("./pages/region-map"), "RegionMapPage"),
  "components/media-player": lazyPage(() => import("./pages/media-player"), "MediaPlayerPage"),
  "components/agent-timeline": lazyPage(() => import("./pages/agent-timeline"), "AgentTimelinePage"),
  "components/agent-permissions": lazyPage(() => import("./pages/agent-permissions"), "AgentPermissionsPage"),
  "components/agent-composer": lazyPage(() => import("./pages/agent-composer"), "AgentComposerPage"),
  "components/agent-sessions": lazyPage(() => import("./pages/agent-sessions"), "AgentSessionsPage"),
  "components/providers": lazyPage(() => import("./pages/providers"), "ProvidersPage"),
  "components/channels": lazyPage(() => import("./pages/channels"), "ChannelsPage"),
  "components/automation": lazyPage(() => import("./pages/automation"), "AutomationPage"),
  "components/capabilities": lazyPage(() => import("./pages/capabilities"), "CapabilitiesPage"),
  "components/browser-review": lazyPage(() => import("./pages/browser-review"), "BrowserReviewPage"),
  "components/billing-marketing": lazyPage(() => import("./pages/billing-marketing"), "BillingMarketingPage"),
  "components/workspace": lazyPage(() => import("./pages/workspace"), "WorkspacePage"),
  "components/chat-extras": lazyPage(() => import("./pages/chat-extras"), "ChatExtrasPage"),
  "components/tiling": lazyPage(() => import("./pages/tiling"), "TilingPage"),
  "components/kanban-memory": lazyPage(() => import("./pages/kanban-memory"), "KanbanMemoryPage"),
  "components/ai-extras": lazyPage(() => import("./pages/ai-extras"), "AiExtrasPage"),
  "components/voice": lazyPage(() => import("./pages/voice"), "VoicePage"),
  "components/assets": lazyPage(() => import("./pages/assets"), "AssetsPage"),
  "blocks/gallery": lazyPage(() => import("./pages/blocks"), "BlocksPage"),
};

const foundationIcons: Record<string, React.ReactNode> = {
  colors: <RiPaletteLine />,
  typography: <RiFontSize />,
  grid: <RiLayoutGridLine />,
  shadows: <RiShadowLine />,
  radius: <RiCheckboxBlankLine />,
  spacing: <RiSpace />,
  motion: <RiSpeedLine />,
  paper: <RiFileTextLine />,
};

function AppSidebar({ section, page, anchor }: { section: string; page: string; anchor?: string }) {
  return (
    <Sidebar collapsible="offcanvas" mobileTitle="Sutra UI">
      <SidebarHeader className="h-14 flex-row items-center px-4">
        <a href={href("foundations", "colors")} className="inline-flex items-center gap-2">
          <SutraLogo size="sm" />
          <Badge variant="outline" size="sm">
            UI
          </Badge>
        </a>
      </SidebarHeader>
      <SidebarContent>
        {nav.map((s) => (
          <SidebarGroup key={s.id}>
            <SidebarGroupLabel>{s.label}</SidebarGroupLabel>
            <SidebarMenu>
              {s.pages.map((p) => {
                const route = routeOf(s, p);
                const active = route === section && p.id === page;
                if (!p.items) {
                  const icon =
                    s.id === "foundations" ? foundationIcons[p.id] : s.id === "blocks" ? <RiLayoutMasonryLine /> : <RiBrushLine />;
                  return (
                    <SidebarMenuItem key={p.id}>
                      <SidebarMenuButton asChild active={active} icon={icon}>
                        <a href={href(route, p.id)}>
                          <span className="min-w-0 flex-1 truncate">{p.label}</span>
                          <PageMark page={p} />
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                return (
                  <SidebarMenuItem key={p.id}>
                    <SidebarMenuSub
                      open={active}
                      trigger={
                        <SidebarMenuButton asChild active={active && !anchor} icon={<RiCodeBoxLine />}>
                          <a href={href(route, p.id)}>
                            <span className="min-w-0 flex-1 truncate">{p.label}</span>
                            <PageMark page={p} />
                            <RiArrowRightSLine
                              aria-hidden
                              className="ms-auto transition-transform duration-200 group-data-[state=open]/menu-sub:rotate-90 rtl:-scale-x-100 rtl:group-data-[state=open]/menu-sub:-rotate-90"
                            />
                          </a>
                        </SidebarMenuButton>
                      }
                    >
                      {p.items.map((item) => (
                        <SidebarMenuSubButton
                          key={item.id}
                          size="sm"
                          href={href(route, p.id, item.id)}
                          active={active && anchor === item.id}
                        >
                          {item.label}
                          <NavBadge status={item.status} since={item.since} className="ms-1.5 align-middle" />
                        </SidebarMenuSubButton>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="px-4 py-3">
        <Text size="xs" tone="neutral">
          React 19 · Tailwind v4 · Radix
        </Text>
      </SidebarFooter>
    </Sidebar>
  );
}

/** Playground-wide shortcuts: listed in the shift+? cheat sheet and the ⌘K palette. */
function PlaygroundShortcuts() {
  const go = (section: string, page: string) => () => {
    window.location.hash = href(section, page);
  };
  useShortcuts([
    { keys: "g c", label: "Go to components", group: "Navigation", handler: go("components", "buttons") },
    { keys: "g f", label: "Go to foundations", group: "Navigation", handler: go("foundations", "colors") },
    { keys: "g b", label: "Go to blocks", group: "Navigation", handler: go("blocks", "gallery") },
    { keys: "g s", label: "Go to suite", group: "Navigation", handler: go("components", "suite") },
    {
      keys: "mod+shift+l",
      label: "Toggle dark mode",
      group: "Appearance",
      allowInInputs: true,
      handler: () => document.querySelector<HTMLButtonElement>('button[aria-label="Toggle dark mode"]')?.click(),
    },
  ]);
  return (
    <>
      <ShortcutsDialog />
      <NavPalette />
    </>
  );
}

export function App() {
  const themeApi = usePersistedTheme();
  const directionApi = usePersistedDirection();
  const { section, page, anchor } = useHashRoute();
  const Page = pages[`${section}/${page}`];
  const meta = findPage(section, page);

  React.useEffect(() => {
    if (!anchor) {
      window.scrollTo({ top: 0 });
      return;
    }
    // Pages load lazily: retry for a moment until the demo is in the DOM, then scroll to it.
    let frame = 0;
    const deadline = performance.now() + 3000;
    const tryScroll = () => {
      const el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
      else if (performance.now() < deadline) frame = requestAnimationFrame(tryScroll);
    };
    frame = requestAnimationFrame(tryScroll);
    return () => cancelAnimationFrame(frame);
  }, [section, page, anchor]);

  return (
    <SidebarProvider>
      <PlaygroundShortcuts />
      <AppSidebar section={section} page={page} anchor={anchor} />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">{meta.section?.label ?? "Sutra"}</span>
            <RiArrowRightSLine className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" aria-hidden />
            <span className="truncate font-medium">{meta.page?.label ?? "Not found"}</span>
          </nav>
          <div className="ms-auto flex items-center gap-1">
            <DirectionToggle {...directionApi} />
            <ThemeControls {...themeApi} />
          </div>
        </header>
        {Page ? (
          <React.Suspense
            fallback={
              <div className="grid flex-1 place-items-center p-10">
                <Spinner />
              </div>
            }
          >
            <Page key={`${section}/${page}`} />
            {meta.page?.items && <PageRail key={`${section}/${page}/rail`} section={section} page={page} items={meta.page.items} />}
          </React.Suspense>
        ) : (
          <div className="grid flex-1 place-items-center p-10 text-center">
            <div className="space-y-2">
              <Text weight="semibold">Page not found</Text>
              <a className="text-sm text-primary underline-offset-4 hover:underline" href={href("foundations", "colors")}>
                Back to Colors
              </a>
            </div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
