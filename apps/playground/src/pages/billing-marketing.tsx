import * as React from "react";
import {
  AuthorShelf,
  Button,
  ComparisonTable,
  ExtensionDetailPage,
  FeatureGrid,
  InstallSnippet,
  Lightbox,
  MarketplaceGrid,
  MarketplaceHero,
  TestimonialWall,
  type LightboxItem,
  type MarketplaceExtension,
} from "@sutra/ui";
import { marketingDemoData } from "@sutra/ui/blocks/registry";
import {
  BillingBanner,
  CheckoutSteps,
  CreditAutoReload,
  CreditBalanceCard,
  CurrentPlanCard,
  PlanComparisonTable,
  PlanPicker,
  UsageInvoiceTable,
  type AutoReloadSettings,
  type BillingInterval,
  type BillingInvoice,
  type BillingPlan,
  type CheckoutOutcome,
  type PlanComparisonSection,
} from "@sutra/ui/kits/billing/billing";
import { RiArrowLeftLine } from "@sutra/ui/icons";
import { Demo, PageIntro } from "../components/demo";
import { ViewportFrame } from "../components/viewport-frame";

/* ------------------------------------------------------------------ */
/* Billing data (fictional "Sutra" product)                            */
/* ------------------------------------------------------------------ */

const plans: BillingPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "For trying Sutra on your own.",
    priceMonthly: 0,
    features: [
      { label: "1 agent" },
      { label: "500 agent runs / month" },
      { label: "Community plugins" },
      { label: "Local models" },
      { label: "Subagents", state: "excluded" },
      { label: "Audit log", state: "excluded" },
      { label: "SSO", state: "excluded" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For people who live in their agents.",
    priceMonthly: 2000,
    priceYearly: 19200,
    recommended: true,
    features: [
      { label: "5 agents" },
      { label: "5,000 agent runs / month" },
      { label: "Community plugins" },
      { label: "Local models" },
      { label: "Subagents" },
      { label: "Audit log", state: "limited", note: "7 days" },
      { label: "SSO", state: "excluded" },
    ],
  },
  {
    id: "team",
    name: "Team",
    description: "Shared workspaces for small teams.",
    priceMonthly: 4500,
    priceYearly: 43200,
    unitLabel: "per seat",
    features: [
      { label: "Unlimited agents" },
      { label: "25,000 agent runs / month" },
      { label: "Community plugins" },
      { label: "Local models" },
      { label: "Subagents" },
      { label: "Audit log" },
      { label: "SSO", state: "limited", note: "Google only" },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Security reviews, SLAs and invoicing.",
    priceMonthly: 0,
    contactSales: true,
    priceLabel: "Custom",
    features: [{ label: "Everything in Team" }, { label: "SAML SSO and SCIM" }, { label: "Dedicated support" }, { label: "Self-hosted gateway" }],
  },
];

const comparisonSections: PlanComparisonSection[] = [
  {
    title: "Agents",
    rows: [
      { label: "Agents", values: { free: "1", pro: "5", team: "Unlimited", enterprise: "Unlimited" } },
      { label: "Agent runs / month", values: { free: "500", pro: "5,000", team: "25,000", enterprise: "Custom" } },
      { label: "Subagents", description: "Delegate to child agents", values: { free: false, pro: true, team: true, enterprise: true } },
      { label: "Scheduled runs", values: { free: false, pro: true, team: true, enterprise: true } },
    ],
  },
  {
    title: "Extensions",
    rows: [
      { label: "Community plugins", values: { free: true, pro: true, team: true, enterprise: true } },
      { label: "Private plugin registry", values: { free: false, pro: false, team: true, enterprise: true } },
    ],
  },
  {
    title: "Security & admin",
    rows: [
      { label: "Audit log", values: { free: false, pro: "7 days", team: "1 year", enterprise: "Unlimited" } },
      { label: "SSO", values: { free: false, pro: false, team: "Google", enterprise: "SAML + SCIM" } },
      { label: "Data residency", values: { free: false, pro: false, team: false, enterprise: true } },
    ],
  },
];

const invoices: BillingInvoice[] = [
  { id: "i6", number: "INV-2026-0010", date: "2026-10-01", amount: 2000, status: "due", description: "Pro · monthly" },
  { id: "i5", number: "INV-2026-0009", date: "2026-09-01", amount: 2000, status: "failed", description: "Pro · monthly" },
  { id: "i4", number: "INV-2026-0008", date: "2026-08-14", amount: 4500, status: "paid", description: "5,000 credits" },
  { id: "i3", number: "INV-2026-0007", date: "2026-08-01", amount: 2000, status: "paid", description: "Pro · monthly" },
  { id: "i2", number: "INV-2026-0006", date: "2026-07-01", amount: 2000, status: "refunded", description: "Pro · monthly" },
  { id: "i1", number: "INV-2026-0005", date: "2026-06-01", amount: 2000, status: "paid", description: "Pro · monthly" },
];

/* ------------------------------------------------------------------ */
/* Billing demos                                                       */
/* ------------------------------------------------------------------ */

function PlanPickerDemo() {
  const [current, setCurrent] = React.useState("pro");
  const [interval, setInterval] = React.useState<BillingInterval>("monthly");
  const [last, setLast] = React.useState<string | null>(null);
  return (
    <div className="flex w-full flex-col gap-3">
      <PlanPicker
        plans={plans}
        currentPlanId={current}
        interval={interval}
        onIntervalChange={setInterval}
        onSelect={(plan, iv) => {
          if (!plan.contactSales) setCurrent(plan.id);
          setLast(`${plan.contactSales ? "Contact sales for" : "Switched to"} ${plan.name} (${iv})`);
        }}
      />
      <p role="status" className="text-center text-xs text-muted-foreground">
        {last ?? "Try Upgrade on Team, or Downgrade to Free to see what you'd lose."}
      </p>
    </div>
  );
}

function BannersDemo() {
  const [dismissed, setDismissed] = React.useState(false);
  return (
    <div className="flex w-full flex-col gap-3">
      <BillingBanner kind="trial" daysLeft={3} onAction={() => {}} />
      {!dismissed && <BillingBanner kind="payment-failed" onAction={() => {}} onDismiss={() => setDismissed(true)} />}
      <BillingBanner kind="over-limit" onAction={() => {}} description="You've used 5,000 of 5,000 runs this month. Runs reset on Nov 1." />
      <BillingBanner kind="info" title="Yearly billing saves 20%" description="Switch at any time; we prorate the difference." onAction={() => {}} actionLabel="Switch to yearly" />
    </div>
  );
}

function CreditsDemo() {
  const [balance, setBalance] = React.useState(1840);
  const [reload, setReload] = React.useState<AutoReloadSettings>({ enabled: true, threshold: 500, amount: 2000, monthlyCap: 10000 });
  return (
    <div className="@container w-full">
      <div className="grid grid-cols-1 w-full gap-4 @2xl:grid-cols-2">
        <CreditBalanceCard
          balance={balance}
          dailyBurn={310}
          onBuy={(p) =>
            new Promise<void>((resolve) =>
              setTimeout(() => {
                setBalance((b) => b + p.credits);
                resolve();
              }, 700)
            )
          }
        />
        <CreditAutoReload value={reload} onValueChange={setReload} onSave={() => new Promise<void>((r) => setTimeout(r, 600))} />
      </div>
    </div>
  );
}

function CheckoutDemo() {
  const [mode, setMode] = React.useState<"success" | "sca" | "decline">("sca");
  const [key, setKey] = React.useState(0);
  const onConfirm = (): Promise<CheckoutOutcome> =>
    new Promise((resolve) =>
      setTimeout(
        () => resolve(mode === "success" ? "succeeded" : mode === "sca" ? "requires_action" : { status: "failed", message: "Your card was declined (insufficient funds)." }),
        800
      )
    );
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div role="group" aria-label="Simulated outcome" className="flex flex-wrap justify-center gap-2">
        {(["success", "sca", "decline"] as const).map((m) => (
          <Button
            key={m}
            size="sm"
            variant={mode === m ? "primary" : "secondary"}
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              setKey((k) => k + 1);
            }}
          >
            {m === "success" ? "Succeeds" : m === "sca" ? "Needs 3-D Secure" : "Declined"}
          </Button>
        ))}
      </div>
      <CheckoutSteps
        key={key}
        plan={{ name: "Sutra Pro", price: 19200, interval: "yearly", description: "5 agents · 5,000 runs / month · billed yearly" }}
        paymentMethods={[
          { id: "pm_visa", last4: "4242", brand: "visa", expiry: "08/28" },
          { id: "pm_mc", last4: "4444", brand: "mastercard", expiry: "02/27" },
        ]}
        onConfirm={onConfirm}
        onAuthenticate={() => new Promise((r) => setTimeout(() => r("succeeded"), 900))}
        onDone={() => setKey((k) => k + 1)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Marketing demos                                                     */
/* ------------------------------------------------------------------ */

const { extensions, authors, testimonials, features, installTabs, comparison } = marketingDemoData;

function MarketplaceDemo({ onOpen }: { onOpen: (e: MarketplaceExtension) => void }) {
  const [query, setQuery] = React.useState("");
  return (
    <div className="flex w-full flex-col gap-8">
      <MarketplaceHero query={query} onQueryChange={setQuery} stats={[{ value: "678", label: "plugins" }, { value: "120", label: "authors" }, { value: "24", label: "shown here" }]} />
      <MarketplaceGrid items={extensions} query={query} onOpen={onOpen} onClearQuery={() => setQuery("")} />
    </div>
  );
}

function screenshotSrc(seed: string, caption: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='hsl(${h},70%,62%)'/><stop offset='1' stop-color='hsl(${(h + 60) % 360},65%,38%)'/></linearGradient></defs><rect width='1280' height='720' fill='url(#g)'/><rect x='120' y='100' width='1040' height='520' rx='24' fill='white' fill-opacity='0.88'/><text x='640' y='380' font-family='system-ui' font-size='44' text-anchor='middle' fill='#333'>${caption.replace(/[<&>']/g, "")}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function DetailDemo({ extension, onOpen }: { extension: MarketplaceExtension; onOpen: (e: MarketplaceExtension) => void }) {
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const items: LightboxItem[] = (extension.screenshots ?? []).slice(0, 6).map((s) => ({ src: screenshotSrc(`${extension.id}-${s.id}`, s.caption), alt: s.caption, caption: s.caption }));
  const more = extensions.filter((e) => e.author.handle === extension.author.handle && e.id !== extension.id);
  return (
    <>
      <ExtensionDetailPage
        extension={extension}
        moreFromAuthor={more}
        shaHref="#extension-detail"
        onOpenExtension={onOpen}
        onOpenScreenshot={setLightbox}
        renderLink={({ href, className, children }) => (
          <a href={href} className={className} onClick={(e) => e.preventDefault()}>
            {children}
          </a>
        )}
      />
      <Lightbox items={items} open={lightbox !== null} onOpenChange={(o) => !o && setLightbox(null)} index={lightbox ?? 0} onIndexChange={setLightbox} label={`${extension.name} screenshots`} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function BillingMarketingPage() {
  const [selected, setSelected] = React.useState("deep-search");
  const extension = extensions.find((e) => e.id === selected) ?? extensions[0]!;
  const open = (e: MarketplaceExtension) => {
    setSelected(e.id);
    document.getElementById("extension-detail")?.scrollIntoView({ behavior: "smooth" });
  };
  const sutraAuthor = authors[0]!;

  return (
    <PageIntro
      eyebrow="Components"
      title="Billing & Marketing"
      description="Plans, credits, invoices and checkout for a fictional “Sutra” product, plus marketplace and docs-site blocks. All data is made up and every image is a generated gradient; nothing touches the network."
    >
      <Demo id="billing-banners" title="Billing banners" description="Tone-based notices: trial ending, payment failed (dismissible), over limit and an informational nudge." align="start">
        <BannersDemo />
      </Demo>

      <Demo id="plan-picker" title="Plan picker" description="Free, Pro, Team and Enterprise with a monthly/yearly toggle and “Save 20%” badge. Current and Recommended badges; Upgrade, Downgrade (with a preview of what you lose) and Contact sales." align="start">
        <PlanPickerDemo />
      </Demo>

      <Demo id="plan-comparison" title="Plan comparison table" description="Grouped feature rows × plans with checks, dashes and values. The header stays put while the box scrolls." align="start">
        <PlanComparisonTable plans={plans} sections={comparisonSections} maxHeight={420} />
      </Demo>

      <Demo id="current-plan" title="Current plan" description="Price, renewal date, seats, quota meters (warning past 75%, danger past 90%), payment method and actions." align="start">
        <CurrentPlanCard
          planName="Pro"
          price={2000}
          renewsAt="2026-11-01"
          seats={{ used: 4, total: 5 }}
          usage={[
            { id: "runs", label: "Agent runs", used: 4620, limit: 5000 },
            { id: "storage", label: "Storage", used: 6.2, limit: 20, unit: "GB" },
            { id: "voice", label: "Voice minutes", used: 312, limit: 400, unit: "min" },
          ]}
          paymentMethod={{ last4: "4242", brand: "visa", expiry: "08/28", holder: "Maya Patel" }}
          onManage={() => {}}
          onCancel={() => {}}
          onUpdatePayment={() => {}}
        />
      </Demo>

      <Demo id="credits" title="Credits and auto reload" description="Balance, burn rate and projected run-out; Buy credits opens preset amounts. Auto reload validates that the amount is above zero and the threshold sits below the monthly cap." align="start">
        <CreditsDemo />
      </Demo>

      <Demo id="invoices" title="Invoices" description="Paid, due, failed and refunded invoices with Pay now and download actions." align="start">
        <UsageInvoiceTable invoices={invoices} onDownload={() => {}} onPay={() => {}} />
      </Demo>

      <Demo id="checkout-steps" title="Checkout steps" description="Plan → payment → confirm → result. Pick an outcome: the 3-D Secure path shows the step-up placeholder, and a decline offers Try again or Change payment method.">
        <CheckoutDemo />
      </Demo>

      <Demo id="marketplace" title="Marketplace hero and grid" description="24 fictional extensions. Search in the hero filters the grid; tier and category pills show live counts; sort, View all and Load more. Click a card to open it below." align="start">
        <MarketplaceDemo onOpen={open} />
      </Demo>

      <Demo id="extension-detail" title="Extension detail page" description="Breadcrumbs, hero, copyable install command, facts sidebar, capabilities, security disclosure, screenshots (open the lightbox), README and more from the author." align="start">
        <div className="flex flex-col gap-3">
          {selected !== "deep-search" && (
            <Button variant="ghost" size="sm" leadingIcon={<RiArrowLeftLine />} className="self-start" onClick={() => setSelected("deep-search")}>
              Back to Deep Search
            </Button>
          )}
          <ViewportFrame>
            <DetailDemo extension={extension} onOpen={open} />
          </ViewportFrame>
        </div>
      </Demo>

      <Demo id="author-shelf" title="Author shelf" description="Author header with a horizontally scrolling shelf of their extensions." align="start">
        <AuthorShelf author={sutraAuthor} items={extensions.filter((e) => e.author.handle === sutraAuthor.handle)} onOpen={open} onViewAll={() => {}} />
      </Demo>

      <Demo id="testimonial-wall" title="Testimonial wall" description="Masonry quotes with X, Reddit, Discord, blog, GitHub, Hacker News and YouTube source badges, filtered by category." align="start">
        <TestimonialWall testimonials={testimonials} description="What builders say about Sutra." />
      </Demo>

      <Demo id="feature-grid" title="Feature grid" description="Icon, title and description cards; shown here in four columns." align="start">
        <FeatureGrid eyebrow="Why Sutra" title="Everything you need, nothing you don't" description="A calm, local-first home for your agents." features={features} columns={4} />
      </Demo>

      <Demo id="install-snippet" title="Install snippet" description="curl, Homebrew, npm and pip tabs with copyable commands.">
        <InstallSnippet tabs={installTabs} className="max-w-xl" />
      </Demo>

      <Demo id="comparison-table" title="Comparison table" description="Sutra versus two fictional alternatives with yes / no / partial marks and footnotes." align="start">
        <ComparisonTable {...comparison} />
      </Demo>
    </PageIntro>
  );
}

export default BillingMarketingPage;
