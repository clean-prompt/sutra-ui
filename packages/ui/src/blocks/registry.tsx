/*
 * Block registry: every block wrapped in a demo-ready component, for "All Blocks" galleries,
 * docs and visual tests. Public path: `@sutra/ui/blocks/registry`.
 *
 * Demo-only. Importing this module has no side effects: the mock kunji client and pairing
 * adapter used by the kunji demos are created lazily, the first time one of those demos renders.
 */
import * as React from "react";
import { Button } from "../primitives/button";
import type { KunjiClient } from "../kits/identity/kunji-client";
import { SidebarProvider } from "../patterns/sidebar-navigation";
import { TabsContent } from "../primitives/tabs";
import {
  ForgotPasswordCard,
  LoginCard,
  MagicLinkCard,
  OTPVerifyCard,
  ResetPasswordCard,
  SignUpCard,
  SSOOnlyCard,
  TwoFactorSetupCard,
} from "./auth-blocks";
import { AuthCenteredPage, AuthImagePage, AuthMinimalPage, AuthSplitPage } from "./auth-pages";
import {
  NotificationsMenu,
  QuickCreateMenu,
  SortFilterMenu,
  UserAccountMenu,
  WorkspaceSwitcher,
} from "./dropdown-menu-blocks";
import { AppHeader, CenteredHeader, DocsHeader, MarketingHeader } from "./header-navigation-blocks";
import { AppShell, AppSidebar, DocsSidebar, SettingsSidebar } from "./sidebar-navigation-blocks";
import {
  HeroHeader,
  PageHeaderWithActions,
  PageHeaderWithSearch,
  PageHeaderWithStats,
  PageHeaderWithTabs,
  ProfileHeader,
} from "./section-header-blocks";
import {
  DeleteConfirmDialog,
  FeedbackDialog,
  InviteMembersDialog,
  KeyboardShortcutsDialog,
  NewItemDialog,
  OnboardingDialog,
  ShareDialog,
  UpgradeDialog,
} from "./modal-dialog-blocks";
import {
  AwaitingApproval,
  DevicePairingFlow,
  KunjiSignInPage,
  RegisterWithKunji,
  SignedInPanel,
  SignInMethods,
  createMockPairingAdapter,
  type DevicePairingAdapter,
} from "./kunji-blocks";
import {
  AuthorShelf,
  ComparisonTable,
  ExtensionDetailPage,
  FeatureGrid,
  InstallSnippet,
  MarketplaceGrid,
  MarketplaceHero,
  TestimonialWall,
  marketingDemoData,
} from "./marketing-blocks";
import { createMockKunjiClient } from "./demo-data";

/* Demo fixtures and mocks, so galleries and tests can import everything demo-related from one path. */
export * from "./demo-data";
export { marketingDemoData } from "./marketing-blocks";
export { createMockPairingAdapter, type MockPairingAdapterOptions } from "./kunji-blocks";

export type BlockCategory = "auth" | "auth-page" | "dropdown" | "header" | "sidebar" | "section-header" | "dialog" | "kunji" | "marketing";

export interface BlockRegistryEntry {
  id: string;
  name: string;
  category: BlockCategory;
  /** Demo-ready component (dialogs render with a trigger button, sidebars inside a provider). */
  component: React.ComponentType;
  description: string;
}

/** Human-readable labels for each block category. */
export const blockCategoryLabels: Record<BlockCategory, string> = {
  auth: "Login & Sign Up",
  "auth-page": "Full-Page Auth",
  dropdown: "Dropdown Menus",
  header: "Header Navigation",
  sidebar: "Sidebar Navigation",
  "section-header": "Section Headers",
  dialog: "Modals & Dialogs",
  kunji: "kunji Sign-in",
  marketing: "Marketing & Docs",
};

const h = React.createElement;

/** Wrap a demo so it can be dropped into a gallery card. */
const demo = (name: string, render: () => React.ReactElement): React.ComponentType => {
  const Demo = () => render();
  Demo.displayName = `${name}Demo`;
  return Demo;
};

const centered = (child: React.ReactElement) =>
  h("div", { className: "flex w-full items-center justify-center sm:p-6" }, child);

const withTrigger = (label: string, variant: "primary" | "secondary" | "destructive" = "secondary") =>
  h(Button, { variant }, label);

/* Created on first use (not at import time) and then shared by every kunji demo. */
let kunjiDemoClient: KunjiClient | undefined;
let pairingDemoAdapter: DevicePairingAdapter | undefined;
const getKunjiDemoClient = () => (kunjiDemoClient ??= createMockKunjiClient({ appName: "Sutra", audience: "id.sutra.app" }));
const getPairingDemoAdapter = () => (pairingDemoAdapter ??= createMockPairingAdapter());

const mk = marketingDemoData;
const mkPadded = (child: React.ReactElement) => h("div", { className: "w-full sm:p-6" }, child);
const mkDetail = mk.extensions.find((e) => e.id === "deep-search") ?? mk.extensions[0]!;
const mkByAuthor = (handle: string, exclude?: string) => mk.extensions.filter((e) => e.author.handle === handle && e.id !== exclude);

/** Every block, with a demo-friendly component, for building an "All Blocks" gallery. */
export const blockRegistry: BlockRegistryEntry[] = [
  /* Auth cards */
  { id: "login-card", name: "Login card", category: "auth", component: demo("LoginCard", () => centered(h(LoginCard))), description: "Email and password sign in with remember me, forgot password link and Google/Apple/GitHub buttons." },
  { id: "sign-up-card", name: "Sign up card", category: "auth", component: demo("SignUpCard", () => centered(h(SignUpCard))), description: "Name, email and password with a live strength meter and a terms checkbox." },
  { id: "magic-link-card", name: "Magic link card", category: "auth", component: demo("MagicLinkCard", () => centered(h(MagicLinkCard))), description: "Passwordless email sign in that switches to a “check your inbox” state." },
  { id: "otp-verify-card", name: "OTP verification card", category: "auth", component: demo("OTPVerifyCard", () => centered(h(OTPVerifyCard, { autoFocus: false }))), description: "Six-digit code entry with auto-submit and a resend countdown." },
  { id: "forgot-password-card", name: "Forgot password card", category: "auth", component: demo("ForgotPasswordCard", () => centered(h(ForgotPasswordCard))), description: "Request a reset link, with a confirmation state." },
  { id: "reset-password-card", name: "Reset password card", category: "auth", component: demo("ResetPasswordCard", () => centered(h(ResetPasswordCard))), description: "New password and confirmation with strength meter and success state." },
  { id: "sso-only-card", name: "SSO-only card", category: "auth", component: demo("SSOOnlyCard", () => centered(h(SSOOnlyCard))), description: "A stack of OAuth providers plus SAML SSO." },
  { id: "two-factor-setup-card", name: "Two-factor setup card", category: "auth", component: demo("TwoFactorSetupCard", () => centered(h(TwoFactorSetupCard))), description: "QR code, copyable setup key and a verification code, then recovery codes." },

  /* Full-page auth */
  { id: "auth-split-page", name: "Split auth page", category: "auth-page", component: demo("AuthSplitPage", () => h(AuthSplitPage)), description: "Form on the left, mesh-gradient brand panel with testimonial and logo cloud on the right." },
  { id: "auth-centered-page", name: "Centered auth page", category: "auth-page", component: demo("AuthCenteredPage", () => h(AuthCenteredPage)), description: "Centered card on a dotted background with the logo above and legal links below." },
  { id: "auth-image-page", name: "Image auth page", category: "auth-page", component: demo("AuthImagePage", () => h(AuthImagePage)), description: "Form beside a full-bleed image or illustration slot." },
  { id: "auth-minimal-page", name: "Minimal auth page", category: "auth-page", component: demo("AuthMinimalPage", () => h(AuthMinimalPage)), description: "Just the mark and the form. No card, no chrome." },

  /* Dropdowns */
  { id: "user-account-menu", name: "User account menu", category: "dropdown", component: demo("UserAccountMenu", () => centered(h(UserAccountMenu))), description: "Avatar trigger with profile header, shortcuts, theme submenu and sign out." },
  { id: "workspace-switcher", name: "Workspace switcher", category: "dropdown", component: demo("WorkspaceSwitcher", () => centered(h("div", { className: "w-64" }, h(WorkspaceSwitcher)))), description: "Current workspace with app icon, checked list and “Create workspace”." },
  { id: "notifications-menu", name: "Notifications menu", category: "dropdown", component: demo("NotificationsMenu", () => centered(h(NotificationsMenu))), description: "Bell with unread count, All/Unread tabs, unread dots and “Mark all read”." },
  { id: "quick-create-menu", name: "Quick create menu", category: "dropdown", component: demo("QuickCreateMenu", () => centered(h(QuickCreateMenu))), description: "“+ New” button to create items across all eight Sutra apps." },
  { id: "sort-filter-menu", name: "Sort & filter menu", category: "dropdown", component: demo("SortFilterMenu", () => centered(h(SortFilterMenu))), description: "Sort radio items, order and checkbox filters with an active count." },

  /* Headers */
  { id: "marketing-header", name: "Marketing header", category: "header", component: demo("MarketingHeader", () => h(MarketingHeader, { sticky: false, border: "always" })), description: "Logo, Products mega-menu of the 8 apps, links, auth actions and mobile sheet." },
  {
    id: "app-header",
    name: "App header",
    category: "header",
    component: demo("AppHeader", () => h(SidebarProvider, { contained: true, shortcut: null }, h("div", { className: "w-full" }, h(AppHeader)))),
    description: "Sidebar trigger, breadcrumbs, ⌘K command palette, notifications and account menu.",
  },
  { id: "centered-header", name: "Centered header", category: "header", component: demo("CenteredHeader", () => h(CenteredHeader, { sticky: false })), description: "Logo in the middle with links split left and right." },
  { id: "docs-header", name: "Docs header", category: "header", component: demo("DocsHeader", () => h(DocsHeader, { sticky: false })), description: "Logo, version switcher, search, GitHub link and theme toggle." },

  /* Sidebars */
  {
    id: "app-sidebar",
    name: "App sidebar",
    category: "sidebar",
    component: demo("AppSidebar", () =>
      h(
        SidebarProvider,
        { contained: true, className: "h-[900px]", shortcut: null },
        h(AppSidebar),
        h("div", { className: "flex-1 bg-background" })
      )
    ),
    description: "Workspace switcher, search, nav, apps, collapsible favorites, storage card and account. Collapses to icons.",
  },
  { id: "settings-sidebar", name: "Settings sidebar", category: "sidebar", component: demo("SettingsSidebar", () => h("div", { className: "sm:p-6" }, h(SettingsSidebar))), description: "Grouped settings navigation that becomes a select on mobile." },
  { id: "docs-sidebar", name: "Docs sidebar", category: "sidebar", component: demo("DocsSidebar", () => h("div", { className: "sm:p-6" }, h(DocsSidebar))), description: "Filterable collapsible doc sections (or a TreeView)." },
  { id: "app-shell", name: "App shell", category: "sidebar", component: demo("AppShell", () => h(AppShell, { contained: true, insetAs: "div", className: "h-[900px]", shortcut: null })), description: "SidebarProvider + AppSidebar + SidebarInset + AppHeader + content." },

  /* Section headers */
  { id: "page-header-actions", name: "Page header with actions", category: "section-header", component: demo("PageHeaderWithActions", () => h("div", { className: "sm:p-6" }, h(PageHeaderWithActions))), description: "Breadcrumbs, title, description and primary/secondary buttons." },
  { id: "page-header-tabs", name: "Page header with tabs", category: "section-header", component: demo("PageHeaderWithTabs", () => h("div", { className: "sm:p-6" }, h(PageHeaderWithTabs, null, ...["overview", "tasks", "notes", "files", "activity"].map((v) => h(TabsContent, { key: v, value: v, className: "pt-6 text-sm text-muted-foreground" }, `The ${v} panel renders here.`))))), description: "Title, collaborators, actions and an underline tab bar with counts." },
  { id: "page-header-stats", name: "Page header with stats", category: "section-header", component: demo("PageHeaderWithStats", () => h("div", { className: "sm:p-6" }, h(PageHeaderWithStats))), description: "Greeting, range select and stat cards with sparklines and trend badges." },
  { id: "page-header-search", name: "Page header with search", category: "section-header", component: demo("PageHeaderWithSearch", () => h("div", { className: "sm:p-6" }, h(PageHeaderWithSearch))), description: "Title with count, search, filter selects and a list/grid toggle." },
  { id: "profile-header", name: "Profile header", category: "section-header", component: demo("ProfileHeader", () => h("div", { className: "sm:p-6" }, h(ProfileHeader))), description: "Cover banner, overlapping avatar, bio, meta, stats and follow actions." },
  { id: "hero-header", name: "Hero header", category: "section-header", component: demo("HeroHeader", () => h(HeroHeader)), description: "Eyebrow pill, display heading, subtext and CTAs on a mesh gradient." },

  /* Dialogs */
  { id: "delete-confirm-dialog", name: "Delete confirmation", category: "dialog", component: demo("DeleteConfirmDialog", () => centered(h(DeleteConfirmDialog, { trigger: withTrigger("Delete workspace", "destructive") }))), description: "Destructive featured icon, consequences list and type-to-confirm input." },
  { id: "invite-members-dialog", name: "Invite members", category: "dialog", component: demo("InviteMembersDialog", () => centered(h(InviteMembersDialog, { trigger: withTrigger("Invite members") }))), description: "Email tags with role select, member list with role menus and invite link." },
  { id: "share-dialog", name: "Share", category: "dialog", component: demo("ShareDialog", () => centered(h(ShareDialog, { trigger: withTrigger("Share") }))), description: "Invite people, manage permissions, general link access and copy link." },
  { id: "feedback-dialog", name: "Feedback", category: "dialog", component: demo("FeedbackDialog", () => centered(h(FeedbackDialog, { trigger: withTrigger("Give feedback") }))), description: "Star rating, category segmented control, message and thank-you state." },
  { id: "upgrade-dialog", name: "Upgrade plan", category: "dialog", component: demo("UpgradeDialog", () => centered(h(UpgradeDialog, { trigger: withTrigger("Upgrade", "primary") }))), description: "Monthly/yearly toggle and three plan cards with feature checklists." },
  { id: "onboarding-dialog", name: "Onboarding", category: "dialog", component: demo("OnboardingDialog", () => centered(h(OnboardingDialog, { trigger: withTrigger("Start onboarding", "primary") }))), description: "Multi-step flow with a step indicator, content slots and Back/Continue." },
  { id: "keyboard-shortcuts-dialog", name: "Keyboard shortcuts", category: "dialog", component: demo("KeyboardShortcutsDialog", () => centered(h(KeyboardShortcutsDialog, { trigger: withTrigger("Keyboard shortcuts") }))), description: "Searchable, grouped shortcut reference with Kbd keys." },
  { id: "new-item-dialog", name: "New task / note", category: "dialog", component: demo("NewItemDialog", () => centered(h(NewItemDialog, { trigger: withTrigger("New task", "primary") }))), description: "Title, description, due date, priority and labels with “Create more”." },

  /* kunji sign-in (demos use a mock client that simulates the protocol with timers; no network) */
  { id: "kunji-sign-in-methods", name: "Sign-in methods", category: "kunji", component: demo("SignInMethods", () => centered(h(SignInMethods, { client: getKunjiDemoClient(), rememberKey: null }))), description: "Tabs for kunji QR, username + password and access token, remembering the last method used." },
  { id: "kunji-sign-in-page", name: "kunji sign-in page", category: "kunji", component: demo("KunjiSignInPage", () => h(KunjiSignInPage, { client: getKunjiDemoClient() })), description: "Full page with the kunji QR as the hero, other ways to sign in and a footer." },
  { id: "kunji-register", name: "Register with kunji", category: "kunji", component: demo("RegisterWithKunji", () => centered(h(RegisterWithKunji, { joinPolicy: "invite", suggestedName: "Maya Patel" }))), description: "Handle with live rule checks, display name and invite code, then awaiting approval." },
  { id: "kunji-awaiting-approval", name: "Awaiting approval", category: "kunji", component: demo("AwaitingApproval", () => centered(h(AwaitingApproval, { handle: "maya", onCheck: () => false, onSignOut: () => {} }))), description: "Waiting-for-admin screen that checks in the background, with check now and sign out." },
  { id: "kunji-signed-in-panel", name: "Signed-in panel", category: "kunji", component: demo("SignedInPanel", () => centered(h(SignedInPanel, { name: "Maya Patel", handle: "@maya", role: "Admin", client: getKunjiDemoClient(), onSignOut: () => {}, onSignOutEverywhere: () => {} }))), description: "Account panel with link kunji, sign out and sign out everywhere." },
  { id: "kunji-device-pairing", name: "Device pairing", category: "kunji", component: demo("DevicePairingFlow", () => centered(h(DevicePairingFlow, { adapter: getPairingDemoAdapter() }))), description: "Wallet-side “link a new device”: QR and 8-digit code with a 2-minute TTL, then a “Do these match?” check." },

  /* Marketing & docs-site (fictional data, generated gradient art; no network) */
  { id: "marketplace-hero", name: "Marketplace hero", category: "marketing", component: demo("MarketplaceHero", () => mkPadded(h(MarketplaceHero))), description: "Title, subtitle, “678 plugins · 120 authors” stats row and a search field on a mesh-gradient glow." },
  { id: "marketplace-grid", name: "Marketplace grid", category: "marketing", component: demo("MarketplaceGrid", () => mkPadded(h(MarketplaceGrid, { items: mk.extensions }))), description: "Tier and category pills with counts, sort pills, category sections with “View all”, cards with capped capability chips, load more and empty state." },
  { id: "extension-detail-page", name: "Extension detail page", category: "marketing", component: demo("ExtensionDetailPage", () => mkPadded(h(ExtensionDetailPage, { extension: mkDetail, moreFromAuthor: mkByAuthor(mkDetail.author.handle, mkDetail.id) }))), description: "Breadcrumbs, hero, copyable install command, facts sidebar, capabilities, security disclosure, screenshots, README and more from the author." },
  { id: "author-shelf", name: "Author shelf", category: "marketing", component: demo("AuthorShelf", () => mkPadded(h(AuthorShelf, { author: mk.authors[0]!, items: mkByAuthor(mk.authors[0]!.handle), onViewAll: () => {} }))), description: "Author header with a horizontally scrolling shelf of their extensions." },
  { id: "testimonial-wall", name: "Testimonial wall", category: "marketing", component: demo("TestimonialWall", () => mkPadded(h(TestimonialWall, { testimonials: mk.testimonials, description: "What builders say about Sutra." }))), description: "Masonry quotes with X / Reddit / Discord / blog source badges and a category filter." },
  { id: "feature-grid", name: "Feature grid", category: "marketing", component: demo("FeatureGrid", () => mkPadded(h(FeatureGrid, { features: mk.features.slice(0, 6), eyebrow: "Why Sutra", title: "Everything you need, nothing you don't", columns: 3 }))), description: "Icon, title and description cards in 2–4 columns with a section header." },
  { id: "install-snippet", name: "Install snippet", category: "marketing", component: demo("InstallSnippet", () => mkPadded(h(InstallSnippet, { tabs: mk.installTabs }))), description: "Tabs for curl, Homebrew, npm and pip with copyable commands." },
  { id: "comparison-table", name: "Comparison table", category: "marketing", component: demo("ComparisonTable", () => mkPadded(h(ComparisonTable, mk.comparison))), description: "Product vs alternatives with check / cross / partial marks and footnotes." },
];
