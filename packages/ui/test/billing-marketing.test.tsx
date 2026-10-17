import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  BillingBanner,
  CheckoutSteps,
  CreditAutoReload,
  CreditBalanceCard,
  CurrentPlanCard,
  PlanComparisonTable,
  PlanPicker,
  UsageInvoiceTable,
  formatPrice,
  planFeatureLosses,
  projectRunOut,
  validateAutoReload,
  yearlySavings,
  type BillingPlan,
  type CheckoutOutcome,
} from "../src/components/billing";
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
  type MarketplaceExtension,
} from "../src/blocks/marketing-blocks";
import { blockRegistry } from "../src";
import { axeViolations } from "./a11y";

const plans: BillingPlan[] = [
  { id: "free", name: "Free", priceMonthly: 0, features: [{ label: "1 agent" }, { label: "Community plugins" }, { label: "Audit log", state: "excluded" }] },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 2000,
    priceYearly: 19200,
    recommended: true,
    features: [{ label: "1 agent" }, { label: "Community plugins" }, { label: "Subagents" }, { label: "Audit log", state: "limited", note: "7 days" }],
  },
  {
    id: "team",
    name: "Team",
    priceMonthly: 5000,
    priceYearly: 48000,
    features: [{ label: "1 agent" }, { label: "Community plugins" }, { label: "Subagents" }, { label: "Audit log" }, { label: "SSO" }],
  },
  { id: "ent", name: "Enterprise", priceMonthly: 0, contactSales: true, priceLabel: "Custom", features: [{ label: "Everything in Team" }] },
];

function mockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return writeText;
}

/* ------------------------------------------------------------------ */

describe("billing helpers", () => {
  it("formatPrice formats minor units and trims whole amounts", () => {
    expect(formatPrice(2000, "USD", "en-US")).toBe("$20");
    expect(formatPrice(1999, "USD", "en-US")).toBe("$19.99");
    expect(formatPrice(500, "JPY", "en-US")).toBe("¥500");
    expect(formatPrice(123456, "EUR", "de-DE")).toMatch(/1\.234,56\s?€/);
    expect(formatPrice(0)).toBe("$0");
  });

  it("yearlySavings returns a rounded percent, never negative", () => {
    expect(yearlySavings(2000, 19200)).toBe(20);
    expect(yearlySavings(1000, 12000)).toBe(0);
    expect(yearlySavings(1000, 13000)).toBe(0);
    expect(yearlySavings(0, 0)).toBe(0);
    expect(yearlySavings(999, 9990)).toBe(17);
  });

  it("projectRunOut projects the zero date", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    expect(projectRunOut(100, 10, from)?.toISOString()).toBe("2026-01-11T00:00:00.000Z");
    expect(projectRunOut(15, 10, from)?.toISOString()).toBe("2026-01-02T12:00:00.000Z");
    expect(projectRunOut(100, 0, from)).toBeNull();
    expect(projectRunOut(0, 5, from)?.toISOString()).toBe(from.toISOString());
  });

  it("planFeatureLosses lists features lost on downgrade", () => {
    expect(planFeatureLosses(plans[2]!, plans[1]!).map((f) => f.label)).toEqual(["Audit log", "SSO"]);
  });

  it("validateAutoReload checks amount and cap", () => {
    expect(validateAutoReload({ enabled: false, threshold: null, amount: 0, monthlyCap: null })).toEqual({});
    expect(validateAutoReload({ enabled: true, threshold: 100, amount: 0, monthlyCap: null }).amount).toBeTruthy();
    expect(validateAutoReload({ enabled: true, threshold: 1000, amount: 100, monthlyCap: 1000 }).threshold).toMatch(/below the monthly cap/);
    expect(validateAutoReload({ enabled: true, threshold: 100, amount: 500, monthlyCap: 1000 })).toEqual({});
  });
});

describe("PlanPicker", () => {
  it("toggles interval prices, shows badges and confirms a downgrade", async () => {
    const onSelect = vi.fn();
    render(<PlanPicker plans={plans} currentPlanId="team" onSelect={onSelect} />);
    const pro = document.querySelector('[data-plan="pro"]') as HTMLElement;
    expect(within(pro).getByText("$20")).toBeInTheDocument();
    expect(screen.getByText("Save 20%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Yearly" }));
    expect(within(pro).getByText("$16")).toBeInTheDocument();
    expect(within(pro).getByText(/\$192 billed yearly/)).toBeInTheDocument();

    const team = document.querySelector('[data-plan="team"]') as HTMLElement;
    expect(within(team).getByText("Current plan", { selector: "span" })).toBeInTheDocument();
    expect(within(team).getByRole("button", { name: "Current plan" })).toBeDisabled();
    expect(within(pro).getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Contact sales: Enterprise" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Downgrade: Pro" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Downgrade to Pro?")).toBeInTheDocument();
    const lost = within(dialog).getByRole("list", { name: "Features you'll lose" });
    expect(within(lost).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Audit log", "SSO"]);
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm downgrade" }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "pro" }), "yearly");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("upgrades directly without a dialog and passes axe", async () => {
    const onSelect = vi.fn();
    render(<PlanPicker plans={plans} currentPlanId="free" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Upgrade: Pro" }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "pro" }), "monthly");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getAllByText("Included:", { exact: false }).length).toBeGreaterThan(0);
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe("PlanComparisonTable", () => {
  it("renders section headers and check/dash/value cells", async () => {
    render(
      <PlanComparisonTable
        plans={plans.slice(0, 3)}
        sections={[
          { title: "Agents", rows: [{ label: "Subagents", values: { free: false, pro: true, team: true } }] },
          { title: "Limits", rows: [{ label: "Runs / month", values: { free: "100", pro: "5,000", team: "Unlimited" } }] },
        ]}
      />
    );
    expect(screen.getByRole("columnheader", { name: "Pro" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Agents" })).toBeInTheDocument();
    const row = screen.getByRole("row", { name: /Subagents/ });
    const cells = within(row).getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("Not included");
    expect(cells[1]).toHaveTextContent("Included");
    expect(within(screen.getByRole("row", { name: /Runs/ })).getAllByRole("cell")[2]).toHaveTextContent("Unlimited");
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe("CurrentPlanCard", () => {
  it("shows price, renewal, seats and quota meters", async () => {
    const onCancel = vi.fn();
    render(
      <CurrentPlanCard
        planName="Pro"
        price={2000}
        renewsAt="2026-11-18"
        seats={{ used: 3, total: 5 }}
        usage={[
          { id: "runs", label: "Agent runs", used: 4600, limit: 5000 },
          { id: "storage", label: "Storage", used: 2, limit: 10, unit: "GB" },
        ]}
        paymentMethod={{ last4: "4242", brand: "visa", expiry: "08/28" }}
        onManage={() => {}}
        onCancel={onCancel}
        onUpdatePayment={() => {}}
      />
    );
    expect(screen.getByRole("heading", { name: "Pro" })).toBeInTheDocument();
    expect(screen.getByText("Nov 18, 2026")).toBeInTheDocument();
    const meters = screen.getAllByRole("meter");
    expect(meters).toHaveLength(3);
    expect(screen.getByRole("meter", { name: "Agent runs" })).toHaveAttribute("aria-valuenow", "4600");
    expect(screen.getByRole("meter", { name: "Agent runs" }).closest("[data-level]")).toHaveAttribute("data-level", "danger");
    expect(screen.getByText("Visa ending in 4242")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel plan" }));
    expect(onCancel).toHaveBeenCalled();
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe("CreditBalanceCard", () => {
  it("projects run-out and buys a preset", async () => {
    const onBuy = vi.fn().mockResolvedValue(undefined);
    render(<CreditBalanceCard balance={1200} dailyBurn={300} now={new Date("2026-10-18T00:00:00Z")} onBuy={onBuy} />);
    expect(screen.getByText("Oct 22, 2026")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Less than 7 days/);
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Buy credits" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /5,000 credits/ }));
    expect(within(dialog).getByRole("button", { name: /5,000 credits/ })).toHaveAttribute("aria-pressed", "true");
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Buy for $45" }));
    expect(onBuy).toHaveBeenCalledWith(expect.objectContaining({ credits: 5000, price: 4500 }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("CreditAutoReload", () => {
  it("validates amount and threshold vs cap, then saves", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<CreditAutoReload defaultValue={{ enabled: true, threshold: 500, amount: 2000, monthlyCap: 10000 }} onSave={onSave} />);
    const amount = screen.getByLabelText(/^Add/);
    const threshold = screen.getByLabelText(/When balance falls below/);
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeEnabled();

    fireEvent.change(amount, { target: { value: "0" } });
    fireEvent.blur(amount);
    expect(screen.getByText("Reload amount must be greater than 0.")).toBeInTheDocument();
    expect(amount).toHaveAttribute("aria-invalid", "true");
    expect(save).toBeDisabled();

    fireEvent.change(amount, { target: { value: "1000" } });
    fireEvent.blur(amount);
    fireEvent.change(threshold, { target: { value: "20000" } });
    fireEvent.blur(threshold);
    expect(screen.getByText("Threshold must be below the monthly cap.")).toBeInTheDocument();
    expect(save).toBeDisabled();
    expect(await axeViolations(document.body)).toEqual([]);

    fireEvent.change(threshold, { target: { value: "800" } });
    fireEvent.blur(threshold);
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith({ enabled: true, threshold: 800, amount: 1000, monthlyCap: 10000 });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saved"));
  });

  it("disables inputs when switched off", () => {
    render(<CreditAutoReload />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByLabelText(/^Add/)).toBeDisabled();
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByLabelText(/^Add/)).toBeEnabled();
  });
});

describe("UsageInvoiceTable", () => {
  it("renders statuses and download actions", async () => {
    const onDownload = vi.fn();
    const onPay = vi.fn();
    render(
      <UsageInvoiceTable
        onDownload={onDownload}
        onPay={onPay}
        invoices={[
          { id: "1", number: "INV-0012", date: "2026-10-01", amount: 2000, status: "paid" },
          { id: "2", number: "INV-0013", date: "2026-11-01", amount: 4550, status: "due" },
          { id: "3", number: "INV-0011", date: "2026-09-01", amount: 2000, status: "failed" },
        ]}
      />
    );
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getByText("Due")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("$45.50")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pay invoice INV-0012" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pay invoice INV-0011" }));
    expect(onPay).toHaveBeenCalledWith(expect.objectContaining({ id: "3" }));
    fireEvent.click(screen.getByRole("button", { name: "Download invoice INV-0013" }));
    expect(onDownload).toHaveBeenCalledWith(expect.objectContaining({ id: "2" }));
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("shows an empty row", () => {
    render(<UsageInvoiceTable invoices={[]} />);
    expect(screen.getByText("No invoices yet.")).toBeInTheDocument();
  });
});

describe("BillingBanner", () => {
  it("renders each tone with its role and CTA", async () => {
    const onAction = vi.fn();
    const { container } = render(
      <div>
        <BillingBanner tone="trial" daysLeft={3} onAction={onAction} />
        <BillingBanner tone="payment-failed" onAction={() => {}} onDismiss={() => {}} />
        <BillingBanner tone="over-limit" onAction={() => {}} />
      </div>
    );
    expect(screen.getByRole("status")).toHaveTextContent("Your trial ends in 3 days");
    const alerts = screen.getAllByRole("alert");
    expect(alerts[0]).toHaveTextContent("Your last payment failed");
    expect(alerts[1]).toHaveTextContent("over your plan limit");
    expect(container.querySelector('[data-tone="payment-failed"]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Choose a plan" }));
    expect(onAction).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Update payment" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upgrade" })).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("handles singular day and today", () => {
    const { rerender } = render(<BillingBanner tone="trial" daysLeft={1} />);
    expect(screen.getByText("Your trial ends in 1 day")).toBeInTheDocument();
    rerender(<BillingBanner tone="trial" daysLeft={0} />);
    expect(screen.getByText("Your trial ends today")).toBeInTheDocument();
  });
});

describe("CheckoutSteps", () => {
  const methods = [
    { id: "pm1", last4: "4242", brand: "visa" as const, expiry: "08/28" },
    { id: "pm2", last4: "4444", brand: "mastercard" as const },
  ];

  it("doesn't steal focus on mount, but moves it to the new step's heading on change", () => {
    render(<CheckoutSteps plan={{ name: "Sutra Pro", price: 2000 }} paymentMethods={methods} onConfirm={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Review your plan" })).not.toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(document.activeElement?.tagName).toMatch(/^H\d$/);
  });

  it("walks plan → payment → confirm → 3-D Secure → success", async () => {
    const onConfirm = vi.fn<(id: string | null) => Promise<CheckoutOutcome>>().mockResolvedValue("requires_action");
    const onAuthenticate = vi.fn().mockResolvedValue("succeeded");
    const { container } = render(
      <CheckoutSteps plan={{ name: "Sutra Pro", price: 2000 }} paymentMethods={methods} onConfirm={onConfirm} onAuthenticate={onAuthenticate} />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(screen.getByRole("heading", { name: "Review your plan" })).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(root).toHaveAttribute("data-step", "payment");
    fireEvent.click(screen.getByRole("radio", { name: /4444/ }));
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(root).toHaveAttribute("data-step", "confirm");
    fireEvent.click(screen.getByRole("button", { name: "Pay $20" }));
    expect(onConfirm).toHaveBeenCalledWith("pm2");
    expect(await screen.findByRole("heading", { name: "Verify with your bank" })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="sca-frame"]')).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Complete authentication" }));
    expect(await screen.findByRole("heading", { name: "You're all set" })).toBeInTheDocument();
    expect(onAuthenticate).toHaveBeenCalled();
  });

  it("shows a failure and retries", async () => {
    const onConfirm = vi
      .fn<(id: string | null) => Promise<CheckoutOutcome>>()
      .mockResolvedValueOnce({ status: "failed", message: "Card declined (insufficient funds)." })
      .mockResolvedValueOnce("succeeded");
    render(<CheckoutSteps defaultStep="confirm" plan={{ name: "Sutra Pro", price: 2000 }} paymentMethods={methods} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Pay $20" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Card declined (insufficient funds).");
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    fireEvent.click(screen.getByRole("button", { name: "Pay $20" }));
    expect(await screen.findByRole("heading", { name: "You're all set" })).toBeInTheDocument();
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it("fails when SCA is canceled", async () => {
    render(<CheckoutSteps defaultStep="confirm" plan={{ name: "Sutra Pro", price: 2000 }} onConfirm={() => "requires_action"} />);
    fireEvent.click(screen.getByRole("button", { name: "Pay $20" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Authentication was canceled.");
    fireEvent.click(screen.getByRole("button", { name: "Change payment method" }));
    expect(screen.getByRole("heading", { name: "Payment method" })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Marketing                                                           */
/* ------------------------------------------------------------------ */

const exts = marketingDemoData.extensions;

describe("MarketplaceHero", () => {
  it("renders stats and reports the query", async () => {
    const onQueryChange = vi.fn();
    render(<MarketplaceHero onQueryChange={onQueryChange} />);
    expect(screen.getByRole("heading", { name: "Extend Sutra with plugins" })).toBeInTheDocument();
    expect(document.querySelector('[data-slot="hero-stats"]')).toHaveTextContent("678 plugins · 120 authors");
    fireEvent.change(screen.getByRole("searchbox", { name: "Search extensions" }), { target: { value: "git" } });
    expect(onQueryChange).toHaveBeenCalledWith("git");
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe("MarketplaceGrid", () => {
  it("shows filter counts, sorts, loads more and caps capability chips", async () => {
    render(<MarketplaceGrid items={exts} sectioned={false} pageSize={9} />);
    const tiers = screen.getByRole("group", { name: "Filter by tier" });
    const count = (name: RegExp, group = tiers) => within(group).getByRole("button", { name }).querySelector('[data-slot="pill-count"]')?.textContent;
    expect(count(/All tiers/)).toBe("24");
    const officialCount = exts.filter((e) => e.tier === "official").length;
    expect(count(/Official/)).toBe(String(officialCount));
    const cats = screen.getByRole("group", { name: "Filter by category" });
    expect(count(/Security/, cats)).toBe("4");

    expect(screen.getAllByRole("article")).toHaveLength(9);
    // Most stars first.
    expect(screen.getAllByRole("article")[0]).toHaveAttribute("data-extension", "workflow-builder");
    fireEvent.click(screen.getByRole("button", { name: "A–Z" }));
    expect(screen.getAllByRole("article")[0]).toHaveAttribute("data-extension", "api-playground");

    fireEvent.click(screen.getByRole("button", { name: /Load more \(15 remaining\)/ }));
    expect(screen.getAllByRole("article")).toHaveLength(18);
    fireEvent.click(screen.getByRole("button", { name: /Load more/ }));
    expect(screen.getAllByRole("article")).toHaveLength(24);
    expect(screen.queryByRole("button", { name: /Load more/ })).not.toBeInTheDocument();

    const git = document.querySelector('[data-extension="git-companion"]') as HTMLElement;
    expect(within(git).getByText("+2")).toBeInTheDocument();

    fireEvent.click(within(tiers).getByRole("button", { name: /Official/ }));
    expect(screen.getAllByRole("article")).toHaveLength(officialCount);
    expect(within(tiers).getByRole("button", { name: /Official/ })).toHaveAttribute("aria-pressed", "true");
    // Category counts follow the tier filter.
    expect(count(/Security/, cats)).toBe(String(exts.filter((e) => e.tier === "official" && e.category === "Security").length));
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("groups by category with View all, and shows an empty state", async () => {
    const onOpen = vi.fn();
    const { rerender } = render(<MarketplaceGrid items={exts} sectionLimit={2} onOpen={onOpen} />);
    expect(screen.getByRole("region", { name: "Security" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Security" })).getAllByRole("article")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "View all Security" }));
    expect(screen.getAllByRole("article")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Secret Scanner" }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "secret-scanner" }));
    expect(await axeViolations(document.body)).toEqual([]);
    rerender(<MarketplaceGrid items={exts} query="zzzz-nothing" />);
    expect(screen.getByText("No extensions match")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("0 extensions");
  });
});

describe("ExtensionDetailPage", () => {
  it("renders every section and copies the install command", async () => {
    const writeText = mockClipboard();
    const ext = exts.find((e) => e.id === "deep-search")!;
    const more = exts.filter((e) => e.author.handle === ext.author.handle && e.id !== ext.id);
    const onOpenScreenshot = vi.fn();
    render(<ExtensionDetailPage extension={ext} moreFromAuthor={more} onOpenScreenshot={onOpenScreenshot} />);
    expect(screen.getByRole("heading", { level: 1, name: "Deep Search" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toBeInTheDocument();
    for (const name of ["Capabilities", "Screenshots", "README"]) expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Security disclosure" })).toBeInTheDocument();
    const facts = screen.getByRole("complementary", { name: "Facts" });
    expect(within(facts).getByText(`v${ext.version}`)).toBeInTheDocument();
    expect(within(facts).getByText(ext.sha!.slice(0, 7))).toBeInTheDocument();
    expect(within(facts).getByText(ext.license!)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Provides tools" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: `More from ${ext.author.name}` })).toBeInTheDocument();

    const shots = screen.getAllByRole("button", { name: /Open screenshot/ });
    expect(shots.length).toBe(Math.min(6, ext.screenshots!.length));
    fireEvent.click(shots[1]!);
    expect(onOpenScreenshot).toHaveBeenCalledWith(1);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy command" }));
    });
    expect(writeText).toHaveBeenCalledWith(ext.installCommand);
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("caps screenshots at six", () => {
    const ext: MarketplaceExtension = {
      ...exts[0]!,
      screenshots: Array.from({ length: 9 }, (_, i) => ({ id: `x${i}`, caption: `Shot ${i}` })),
    };
    render(<ExtensionDetailPage extension={ext} />);
    expect(screen.getAllByRole("button", { name: /Open screenshot/ })).toHaveLength(6);
  });
});

describe("AuthorShelf", () => {
  it("renders the author header and shelf", async () => {
    const onViewAll = vi.fn();
    const author = marketingDemoData.authors[0]!;
    const items = exts.filter((e) => e.author.handle === author.handle);
    render(<AuthorShelf author={author} items={items} onViewAll={onViewAll} />);
    expect(screen.getByRole("heading", { name: author.name })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${items.length} extensions`))).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: `Extensions by ${author.name}` })).getAllByRole("article")).toHaveLength(items.length);
    fireEvent.click(screen.getByRole("button", { name: `View all by ${author.name}` }));
    expect(onViewAll).toHaveBeenCalled();
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe("TestimonialWall", () => {
  it("filters by category and shows source badges", async () => {
    const all = marketingDemoData.testimonials;
    render(<TestimonialWall testimonials={all} />);
    expect(document.querySelectorAll("[data-testimonial]")).toHaveLength(all.length);
    expect(screen.getAllByText("Reddit").length).toBeGreaterThan(0);
    const group = screen.getByRole("group", { name: "Filter testimonials" });
    fireEvent.click(within(group).getByRole("button", { name: /Privacy/ }));
    const privacy = all.filter((t) => t.categories?.includes("Privacy"));
    expect(document.querySelectorAll("[data-testimonial]")).toHaveLength(privacy.length);
    expect(screen.getByText(/zero calls home/)).toBeInTheDocument();
    expect(screen.queryByText(/first plugin in an afternoon/)).not.toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe("FeatureGrid", () => {
  it("renders cards in the requested columns", async () => {
    render(<FeatureGrid title="Why Sutra" features={marketingDemoData.features.slice(0, 4)} columns={4} />);
    expect(screen.getByRole("heading", { name: "Why Sutra" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);
    expect(screen.getByRole("list")).toHaveAttribute("data-columns", "4");
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe("InstallSnippet", () => {
  it("switches tabs and copies the command", async () => {
    const writeText = mockClipboard();
    render(<InstallSnippet tabs={marketingDemoData.installTabs} />);
    expect(screen.getByText("curl -fsSL sutra.dev/install.sh | sh")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "npm" }), { button: 0 });
    expect(screen.getByRole("tab", { name: "npm" })).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("npm install -g @sutra/cli");
    await act(async () => {
      fireEvent.click(within(panel).getByRole("button", { name: "Copy command" }));
    });
    expect(writeText).toHaveBeenCalledWith("npm install -g @sutra/cli");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Homebrew" }), { button: 0 });
    expect(within(screen.getByRole("tabpanel")).getAllByRole("button", { name: "Copy command" })).toHaveLength(2);
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe("ComparisonTable", () => {
  it("renders marks and footnotes", async () => {
    render(<ComparisonTable {...marketingDemoData.comparison} />);
    const row = screen.getByRole("row", { name: /Runs locally/ });
    const cells = within(row).getAllByRole("cell");
    expect(cells.map((c) => c.textContent)).toEqual(["Yes", "No", "Partial"]);
    expect(within(row).getByRole("link", { name: "Footnote 1" })).toHaveAttribute("href", expect.stringMatching(/^#.*-fn-local$/));
    expect(screen.getByRole("list", { name: "Footnotes" }).children).toHaveLength(2);
    expect(within(screen.getByRole("row", { name: /Starting price/ })).getAllByRole("cell")[1]).toHaveTextContent("$25/mo");
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe("marketing blocks in the registry", () => {
  const ids = ["marketplace-hero", "marketplace-grid", "extension-detail-page", "author-shelf", "testimonial-wall", "feature-grid", "install-snippet", "comparison-table"];
  it("registers every marketing block", () => {
    const marketing = blockRegistry.filter((b) => b.category === "marketing").map((b) => b.id);
    expect(marketing).toEqual(ids);
  });
  it.each(ids)("%s renders and passes axe", async (id) => {
    const Block = blockRegistry.find((b) => b.id === id)!.component;
    const { container } = render(<Block />);
    expect(container).not.toBeEmptyDOMElement();
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe("demo data", () => {
  it("has 24 fictional extensions with unique ids", () => {
    expect(exts).toHaveLength(24);
    expect(new Set(exts.map((e) => e.id)).size).toBe(24);
    void React;
  });
});
