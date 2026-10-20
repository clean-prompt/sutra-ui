import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { InlineAlert } from "../src/primitives/inline-alert";
import { RotatingNoticeBar, normalizeNoticeTone, type NoticeItem } from "../src/patterns/notice-bar";
import { Meter, meterLevel, meterLevelTone } from "../src/primitives/meter";
import { Gauge, RingMeter } from "../src/patterns/gauge";
import { KanbanRunBadge, TaskDetailDialog, type KanbanBoardModel } from "../src/kits/workspace/kanban";
import { TrackCycleChip } from "../src/kits/media/media-controls";
import { PaginationItem } from "../src/primitives/pagination";
import { TextButton } from "../src/patterns/text-button";
import { LogViewer } from "../src/patterns/log-viewer";
import { HardwareFitHint } from "../src/kits/agent-admin/local-models";

describe("InlineAlert tone", () => {
  it("accepts the canonical tone and the deprecated variant alike", () => {
    const { rerender } = render(<InlineAlert tone="warning">Heads up</InlineAlert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("data-tone", "warning");
    const toneClasses = alert.className;

    rerender(<InlineAlert variant="warning">Heads up</InlineAlert>);
    expect(screen.getByRole("alert")).toHaveAttribute("data-tone", "warning");
    expect(screen.getByRole("alert").className).toBe(toneClasses);
  });

  it("maps primary and the legacy brand to the same styles, tone winning over variant", () => {
    const { rerender } = render(<InlineAlert tone="primary">New</InlineAlert>);
    const el = screen.getByRole("status");
    expect(el).toHaveAttribute("data-tone", "primary");
    expect(el).toHaveAttribute("data-variant", "brand");
    const cls = el.className;
    rerender(<InlineAlert variant="brand">New</InlineAlert>);
    expect(screen.getByRole("status").className).toBe(cls);
    rerender(<InlineAlert tone="destructive" variant="info">Boom</InlineAlert>);
    expect(screen.getByRole("alert")).toHaveAttribute("data-tone", "destructive");
  });

  it("maps legacy tone spellings (danger → destructive)", () => {
    render(<InlineAlert tone="danger">Boom</InlineAlert>);
    expect(screen.getByRole("alert")).toHaveAttribute("data-tone", "destructive");
  });
});

describe("RotatingNoticeBar tone", () => {
  const bar = (tone: NoticeItem["tone"]) => (
    <RotatingNoticeBar notices={[{ id: "n", message: "Budget almost used", tone }]} />
  );

  it("styles warning and the legacy warn identically", () => {
    const { rerender } = render(bar("warning"));
    const region = screen.getByRole("region", { name: "Notices" });
    expect(region).toHaveAttribute("data-tone", "warning");
    expect(region.className).toContain("bg-warning-soft");
    const cls = region.className;
    rerender(bar("warn"));
    expect(screen.getByRole("region", { name: "Notices" }).className).toBe(cls);
  });

  it("maps error → destructive and promo → primary", () => {
    expect(normalizeNoticeTone("error")).toBe("destructive");
    expect(normalizeNoticeTone("promo")).toBe("primary");
    expect(normalizeNoticeTone("warn")).toBe("warning");
    expect(normalizeNoticeTone(undefined)).toBe("info");
    expect(normalizeNoticeTone("toString")).toBe("info");
    const { rerender } = render(bar("primary"));
    const cls = screen.getByRole("region", { name: "Notices" }).className;
    expect(cls).toContain("bg-primary");
    rerender(bar("promo"));
    expect(screen.getByRole("region", { name: "Notices" }).className).toBe(cls);
  });
});

describe("Meter / Gauge tone", () => {
  const fill = (c: HTMLElement) => c.querySelector('[data-slot="meter-fill"]')!;

  it("Meter accepts tone and the deprecated color", () => {
    const { container, rerender } = render(<Meter label="CPU" value={10} tone="success" />);
    expect(fill(container)).toHaveClass("bg-success");
    rerender(<Meter label="CPU" value={10} color="success" />);
    expect(fill(container)).toHaveClass("bg-success");
    rerender(<Meter label="CPU" value={10} tone="info" color="success" />);
    expect(fill(container)).toHaveClass("bg-info");
    rerender(<Meter label="CPU" value={10} tone="danger" />);
    expect(fill(container)).toHaveClass("bg-destructive");
    rerender(<Meter label="CPU" value={10} />);
    expect(fill(container)).toHaveClass("bg-primary");
  });

  it("keeps emitting the legacy levels, with a canonical mapping helper", () => {
    expect(meterLevel(80)).toBe("warn");
    expect(meterLevel(95)).toBe("danger");
    expect(meterLevelTone("warn")).toBe("warning");
    expect(meterLevelTone("danger")).toBe("destructive");
    expect(meterLevelTone("ok")).toBeNull();
  });

  it("Gauge and RingMeter accept tone and the deprecated color", () => {
    const { container, rerender } = render(<Gauge value={10} tone="success" />);
    expect(container.querySelector('[data-slot="gauge-fill"]')).toHaveAttribute("stroke", "var(--success)");
    rerender(<Gauge value={10} color="success" />);
    expect(container.querySelector('[data-slot="gauge-fill"]')).toHaveAttribute("stroke", "var(--success)");
    rerender(<RingMeter value={10} tone="info" />);
    expect(container.querySelector('[data-slot="ring-fill"]')).toHaveAttribute("stroke", "var(--info)");
    rerender(<RingMeter value={10} color="info" />);
    expect(container.querySelector('[data-slot="ring-fill"]')).toHaveAttribute("stroke", "var(--info)");
  });
});

describe("Kanban vocabulary", () => {
  const board: KanbanBoardModel = {
    columns: [{ id: "todo", title: "To do" }],
    cards: [{ id: "t1", title: "Write docs", columnId: "todo" }],
  };

  it("TaskDetailDialog opens from defaultOpen and closes uncontrolled", () => {
    const onOpenChange = vi.fn();
    render(<TaskDetailDialog defaultOpen task={board.cards[0]!} board={board} onOpenChange={onOpenChange} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("TaskDetailDialog stays closed without open or defaultOpen, and still honours controlled open", () => {
    const { rerender } = render(<TaskDetailDialog task={board.cards[0]!} board={board} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    rerender(<TaskDetailDialog open task={board.cards[0]!} board={board} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("KanbanRunBadge accepts canonical and legacy run statuses", () => {
    const { container, rerender } = render(<KanbanRunBadge status="canceled" />);
    expect(container.querySelector("[data-run-status]")).toHaveTextContent("Run canceled");
    rerender(<KanbanRunBadge status="cancelled" />);
    expect(container.querySelector("[data-run-status]")).toHaveTextContent("Run canceled");
    expect(container.querySelector("[data-run-status]")).toHaveAttribute("data-run-status", "cancelled");
    rerender(<KanbanRunBadge status="pending" />);
    expect(container.querySelector("[data-run-status]")).toHaveTextContent("Queued");
    rerender(<KanbanRunBadge status="queued" />);
    expect(container.querySelector("[data-run-status]")).toHaveTextContent("Queued");
  });
});

describe("TrackCycleChip defaultValue", () => {
  const tracks = [
    { id: "en", label: "English", language: "en" },
    { id: "es", label: "Spanish", language: "es" },
  ];

  it("works uncontrolled from defaultValue", () => {
    const onValueChange = vi.fn();
    render(<TrackCycleChip kind="subtitles" tracks={tracks} defaultValue="en" onValueChange={onValueChange} />);
    const chip = screen.getByRole("button");
    expect(chip).toHaveAccessibleName("Subtitles: English. Switch to next");
    fireEvent.click(chip);
    expect(onValueChange).toHaveBeenLastCalledWith("es");
    expect(chip).toHaveAccessibleName("Subtitles: Spanish. Switch to next");
  });

  it("stays controlled when value is passed", () => {
    const onValueChange = vi.fn();
    render(<TrackCycleChip kind="subtitles" tracks={tracks} value={null} onValueChange={onValueChange} />);
    const chip = screen.getByRole("button");
    fireEvent.click(chip);
    expect(onValueChange).toHaveBeenLastCalledWith("en");
    expect(chip).toHaveAccessibleName("Subtitles: Off. Switch to next");
  });

  it("forwards its ref to the button", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<TrackCycleChip ref={ref} kind="audio" tracks={tracks} defaultValue="en" />);
    expect(ref.current).toBe(screen.getByRole("button"));
  });
});

describe("PaginationItem active", () => {
  it("accepts active and the deprecated isActive", () => {
    const { rerender } = render(<PaginationItem page={2} active />);
    expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    rerender(<PaginationItem page={2} isActive />);
    expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    rerender(<PaginationItem page={2} active={false} isActive />);
    expect(screen.getByRole("button", { name: "Page 2" })).not.toHaveAttribute("aria-current");
  });
});

describe("other aliases", () => {
  const originalScrollTo = Element.prototype.scrollTo;
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
  });
  afterEach(() => {
    Element.prototype.scrollTo = originalScrollTo;
  });

  it("TextButton accepts destructive and the legacy danger", () => {
    const { rerender } = render(<TextButton tone="destructive">Discard</TextButton>);
    expect(screen.getByRole("button")).toHaveClass("text-destructive");
    rerender(<TextButton tone="danger">Discard</TextButton>);
    expect(screen.getByRole("button")).toHaveClass("text-destructive");
  });

  it("LogViewer accepts emptyState and the deprecated emptyMessage", () => {
    const { rerender } = render(<LogViewer lines={[]} emptyState="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    rerender(<LogViewer lines={[]} emptyMessage="Still nothing" />);
    expect(screen.getByText("Still nothing")).toBeInTheDocument();
    rerender(<LogViewer lines={[]} />);
    expect(screen.getByText("No log lines yet")).toBeInTheDocument();
  });

  it("HardwareFitHint accepts density and the deprecated variant", () => {
    const hw = { vramGB: 24, ramGB: 64 };
    const model = { sizeGB: 4 };
    const { container, rerender } = render(<HardwareFitHint density="compact" model={model} hardware={hw} />);
    expect(container.querySelector('[data-slot="hardware-fit-hint"]')).toHaveClass("inline-flex");
    rerender(<HardwareFitHint variant="compact" model={model} hardware={hw} />);
    expect(container.querySelector('[data-slot="hardware-fit-hint"]')).toHaveClass("inline-flex");
    rerender(<HardwareFitHint model={model} hardware={hw} />);
    expect(container.querySelector('[data-slot="hardware-fit-hint"]')).toHaveClass("grid");
  });
});
