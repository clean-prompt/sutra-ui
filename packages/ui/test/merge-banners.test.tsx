import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { AlertBanner, type AlertBannerAction, type BannerAction } from "../src/primitives/alert-banner";
import { RotatingNoticeBar, normalizeNoticeTone, type NoticeAction, type NoticeItem } from "../src/patterns/notice-bar";
import { InlineAlert } from "../src/primitives/inline-alert";
import { BillingBanner } from "../src/kits/billing/billing";
import { OfflineBanner } from "../src/kits/workspace/sync-status";
import { ProfileScopeBanner } from "../src/kits/workspace/workspace-switcher";
import { QRCodeCard } from "../src/kits/identity/qr-code";
import { GuidedSetupSteps, RotatingQRPairing } from "../src/kits/agent-admin/channels";
import { StepIndicator, Steps } from "../src/primitives/step-indicator";
import { OnboardingChecklist } from "../src/kits/agent/agent-onboarding";
import { QRCodePlaceholder } from "../src/assets/misc";
import { axeViolations } from "./helpers/a11y";

describe("BannerAction", () => {
  it("is the one action type behind AlertBannerAction and NoticeAction", () => {
    const onClick = vi.fn();
    const action: BannerAction = { label: "Open", onClick };
    const legacyBanner: AlertBannerAction = action;
    const legacyNotice: NoticeAction = action;
    render(
      <div>
        <AlertBanner message="Banner" action={legacyBanner} />
        <RotatingNoticeBar notices={[{ id: "n", message: "Notice", action: legacyNotice }]} />
      </div>
    );
    const buttons = screen.getAllByRole("button", { name: "Open" });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1]!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("AlertBanner appearance and slots", () => {
  it("soft appearance uses the soft tone fill; solid stays the default", () => {
    render(
      <div>
        <AlertBanner data-testid="solid" tone="warning" message="Solid" />
        <AlertBanner data-testid="soft" tone="warning" appearance="soft" message="Soft" />
        <AlertBanner data-testid="soft-neutral" tone="neutral" appearance="soft" message="Neutral" />
      </div>
    );
    expect(screen.getByTestId("solid")).toHaveClass("bg-warning");
    expect(screen.getByTestId("soft")).toHaveClass("bg-warning-soft", "text-warning-soft-foreground", "border-b");
    expect(screen.getByTestId("soft")).not.toHaveClass("bg-warning");
    expect(screen.getByTestId("soft-neutral")).toHaveClass("bg-subtle");
  });

  it("renders leading/trailing slots and forwards contentProps to the message block", () => {
    render(
      <AlertBanner
        message="Hello"
        leading={<button type="button">Prev</button>}
        trailing={<button type="button">Next</button>}
        contentProps={{ "data-testid": "content", className: "flex-1" }}
      />
    );
    const content = screen.getByTestId("content");
    expect(content).toHaveTextContent("Hello");
    expect(content).toHaveClass("flex-1", "min-w-0");
    const banner = screen.getByRole("region", { name: "Announcement" });
    const order = Array.from(banner.children).map((el) => el.textContent);
    expect(order).toEqual(["Prev", "Hello", "Next"]);
  });
});

describe("RotatingNoticeBar on AlertBanner", () => {
  const notices: NoticeItem[] = [
    { id: "a", message: "All good", tone: "success" },
    { id: "b", message: "Promo", tone: "promo" },
  ];

  it("renders an AlertBanner with soft fills and keeps the carousel semantics", async () => {
    const { container } = render(<RotatingNoticeBar notices={notices} autoRotate={false} />);
    const region = screen.getByRole("region", { name: "Notices" });
    expect(region).toHaveAttribute("aria-roledescription", "carousel");
    expect(region).toHaveAttribute("data-tone", "success");
    expect(region).toHaveAttribute("data-variant", "success");
    expect(region).toHaveClass("bg-success-soft");
    const slide = within(region).getByRole("group", { name: "1 of 2" });
    expect(slide).toHaveAttribute("data-notice", "a");
    expect(slide).toHaveAttribute("aria-roledescription", "slide");
    expect(await axeViolations(container)).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Next notice" }));
    expect(region).toHaveAttribute("data-tone", "promo");
    expect(region).toHaveClass("bg-primary");
    expect(region).not.toHaveClass("bg-primary-soft");
  });

  it("lets a notice pick its appearance", () => {
    render(<RotatingNoticeBar notices={[{ id: "x", message: "Soft promo", tone: "primary", appearance: "soft" }]} />);
    expect(screen.getByRole("region", { name: "Notices" })).toHaveClass("bg-primary-soft");
  });

  it("does not remount the controls when the notice changes (focus stays on Next)", () => {
    render(<RotatingNoticeBar notices={notices} autoRotate={false} />);
    const next = screen.getByRole("button", { name: "Next notice" });
    next.focus();
    fireEvent.click(next);
    expect(document.activeElement).toBe(next);
  });

  it("normalizes every canonical tone and the deprecated spellings", () => {
    expect(normalizeNoticeTone("success")).toBe("success");
    expect(normalizeNoticeTone("neutral")).toBe("neutral");
    expect(normalizeNoticeTone("danger")).toBe("destructive");
    expect(normalizeNoticeTone("warn")).toBe("warning");
    expect(normalizeNoticeTone("promo")).toBe("primary");
    expect(normalizeNoticeTone("constructor")).toBe("info");
  });
});

describe("InlineAlert action slot and strip layout", () => {
  it("renders a trailing action before the close button", () => {
    const onDismiss = vi.fn();
    render(
      <InlineAlert tone="info" action={<button type="button">Fix</button>} onDismiss={onDismiss}>
        Message
      </InlineAlert>
    );
    const alert = screen.getByRole("status");
    const slot = alert.querySelector('[data-slot="inline-alert-action"]');
    expect(slot).toHaveTextContent("Fix");
    expect(slot?.nextElementSibling).toBe(screen.getByRole("button", { name: "Dismiss" }));
  });

  it("strip layout drops the rounded box for an edge-to-edge bar", () => {
    render(<InlineAlert data-testid="s" tone="warning" layout="strip" role="status">Offline</InlineAlert>);
    expect(screen.getByTestId("s")).toHaveClass("rounded-none", "border-t-0", "bg-warning-soft");
    expect(screen.getByTestId("s")).not.toHaveClass("rounded-box");
  });
});

describe("Domain banners compose InlineAlert", () => {
  it("BillingBanner puts its CTA in the InlineAlert action slot", () => {
    const onAction = vi.fn();
    render(<BillingBanner data-testid="b" kind="over-limit" onAction={onAction} />);
    const el = screen.getByTestId("b");
    expect(el).toHaveAttribute("data-variant", "warning");
    expect(el).toHaveClass("rounded-box", "bg-warning-soft");
    const slot = el.querySelector('[data-slot="inline-alert-action"]')!;
    fireEvent.click(within(slot as HTMLElement).getByRole("button", { name: "Upgrade" }));
    expect(onAction).toHaveBeenCalled();
  });

  it("OfflineBanner is a warning strip with retry and dismiss", () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();
    render(<OfflineBanner offline onRetry={onRetry} dismissible onDismiss={onDismiss} />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("data-tone", "warning");
    expect(status).toHaveClass("rounded-none", "bg-warning-soft");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("ProfileScopeBanner keeps its region name and stickiness", () => {
    render(<ProfileScopeBanner profileName="Work" sticky={false} />);
    const region = screen.getByRole("region", { name: "Profile scope" });
    expect(region).toHaveAttribute("data-tone", "warning");
    expect(region).not.toHaveClass("sticky");
    expect(region).toHaveClass("rounded-none");
  });
});

describe("QRCodeCard hooks", () => {
  it("supports forced expiry, custom expired copy, a custom code and a footer", () => {
    const onRefresh = vi.fn();
    const { container } = render(
      <QRCodeCard value="x" url={false} expired expiredLabel="Session over" onRefresh={onRefresh} code={<span>custom</span>} frameClassName="bg-subtle">
        <p>footer</p>
      </QRCodeCard>
    );
    expect(screen.getByText("Session over")).toBeInTheDocument();
    expect(screen.getByText("custom")).toBeInTheDocument();
    expect(screen.getByText("footer")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="qr-code"]')).toBeNull();
    expect(container.querySelector('[data-slot="qr-code-card-frame"]')).toHaveClass("bg-subtle");
    fireEvent.click(screen.getByRole("button", { name: "Refresh code" }));
    expect(onRefresh).toHaveBeenCalled();
  });

  it("expired={false} overrides a past deadline", () => {
    render(<QRCodeCard value="x" expiresAt={Date.now() - 1000} expired={false} />);
    expect(screen.queryByText("Code expired")).not.toBeInTheDocument();
  });
});

describe("RotatingQRPairing on QRCodeCard", () => {
  afterEach(() => vi.useRealTimers());

  it("renders inside the QRCodeCard chrome without hard-coded neutral colours", () => {
    const { container, rerender } = render(<RotatingQRPairing getPayload={() => "pair:1"} phase="connected" />);
    const root = container.querySelector("[data-slot='rotating-qr-pairing']")!;
    expect(root.querySelector("[data-slot='qr-code-card-frame']")).toHaveClass("bg-subtle");
    expect(root.innerHTML).not.toMatch(/neutral-\d/);
    rerender(<RotatingQRPairing getPayload={() => "pair:1"} phase="error" />);
    expect(root.innerHTML).not.toMatch(/neutral-\d/);
    rerender(<RotatingQRPairing getPayload={() => "pair:1"} phase="expired" />);
    expect(screen.getByText("Code expired").closest("div")).toHaveClass("bg-background/70");
  });

  it("goes straight back to expired when refreshed past a fixed session deadline", () => {
    vi.useFakeTimers();
    const onRefresh = vi.fn();
    const { container } = render(
      <RotatingQRPairing getPayload={() => "pair:1"} expiresAt={Date.now() + 2000} onRefresh={onRefresh} />
    );
    const phase = () => container.querySelector("[data-phase]")?.getAttribute("data-phase");
    act(() => vi.advanceTimersByTime(2500));
    expect(phase()).toBe("expired");
    fireEvent.click(screen.getByRole("button", { name: "Refresh code" }));
    expect(onRefresh).toHaveBeenCalled();
    expect(phase()).toBe("expired");
  });
});

describe("Steps slots", () => {
  it("accepts per-step status, content, action, itemProps, size and no connector", () => {
    const { container } = render(
      <Steps
        orientation="vertical"
        size="sm"
        connector={false}
        current={0}
        aria-labelledby="h"
        steps={[
          { id: "a", title: "A", status: "complete", content: <input aria-label="A input" /> },
          { id: "b", title: "B", status: "upcoming", action: <button type="button">Go</button>, itemProps: { "data-x": "1" } },
          { id: "c", title: "C", status: "current" },
        ]}
      />
    );
    const list = container.querySelector("ol")!;
    expect(list).toHaveAttribute("aria-labelledby", "h");
    expect(list).not.toHaveAttribute("aria-label");
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("data-status"))).toEqual(["complete", "upcoming", "current"]);
    expect(items[2]).toHaveAttribute("aria-current", "step");
    expect(items[1]).toHaveAttribute("data-x", "1");
    expect(within(items[0]!).getByRole("textbox", { name: "A input" })).toBeInTheDocument();
    expect(within(items[1]!).getByRole("button", { name: "Go" })).toBeInTheDocument();
    expect(container.querySelector("li > span[aria-hidden].absolute")).toBeNull();
    expect(items[2]!.querySelector(".size-6")).not.toBeNull();
  });

  it("StepIndicator still aliases Steps", () => {
    expect(StepIndicator).toBe(Steps);
  });
});

describe("GuidedSetupSteps and OnboardingChecklist on Steps", () => {
  it("GuidedSetupSteps marks out-of-order completion through Steps statuses", () => {
    render(
      <GuidedSetupSteps
        defaultValue={["b"]}
        steps={[
          { id: "a", title: "First" },
          { id: "b", title: "Second" },
          { id: "c", title: "Third" },
        ]}
      />
    );
    const list = screen.getByRole("list", { name: "Setup steps" });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("data-status"))).toEqual(["current", "complete", "upcoming"]);
    expect(items[1]).toHaveAttribute("data-done", "true");
    expect(items[1]).toHaveTextContent("(completed)");
  });

  it("OnboardingChecklist uses Progress for its bar", async () => {
    const { container } = render(
      <OnboardingChecklist
        items={[
          { id: "a", title: "One", completed: true },
          { id: "b", title: "Two" },
        ]}
      />
    );
    const bar = screen.getByRole("progressbar", { name: "Get started" });
    expect(bar).toHaveAttribute("aria-valuenow", "1");
    expect(bar).toHaveAttribute("aria-valuemax", "2");
    expect(bar).toHaveAttribute("aria-valuetext", "1 of 2 complete");
    expect(screen.getByRole("list", { name: "Get started" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("QRCodePlaceholder", () => {
  it("still renders (deprecated, decorative)", () => {
    render(<QRCodePlaceholder value="demo" />);
    expect(screen.getByRole("img", { name: "QR code" })).toBeInTheDocument();
  });
});
