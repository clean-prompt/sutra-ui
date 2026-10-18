import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { StatusBadge, StatusDot } from "../src/primitives/status-badge";
import { StatCard } from "../src/patterns/stat-card";
import { StatusStackRow } from "../src/kits/agent-admin/status-stack";
import { TimelineBar } from "../src/patterns/timeline-bar";
import { ToolGroup, ToolTimeline, ToolTimelineDot, ToolTimelineItem, BashToolBody } from "../src/kits/agent/tool-timeline";
import { DataTable, Table, TableBody, TableCell, TableCheckbox, TableRow } from "../src/primitives/table";
import { TodayTimeline, type TimelineItem } from "../src/kits/workspace/today-timeline";
import { Snackbar } from "../src/primitives/toast";
import { ZoneEditor } from "../src/patterns/tiling-layout";
import { LanguagePicker, SourcePane, TransliterationToggle } from "../src/kits/voice/translate";
import { TransferItem, TransferList, normalizeTransferStatus, summarizeTransfers } from "../src/patterns/transfer-list";
import { SubagentStatusGlyph } from "../src/kits/agent-admin/subagents";
import { ToolToggleRow } from "../src/kits/agent-admin/tool-toggles";
import { AudioLevelMeter } from "../src/kits/voice/voice";
import { StatusCycle } from "../src/patterns/status-cycle";
import { TagInput } from "../src/primitives/tag-input";
import { WebhookRouteList } from "../src/kits/agent-admin/webhooks";
import { FeaturedIcon, Icon } from "../src/assets/icons";
import { RiHomeLine } from "@remixicon/react";

describe("StatusDot / StatusBadge tone", () => {
  it("renders a preset status as before", () => {
    const { container } = render(<StatusBadge status="processing" />);
    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("bg-primary-soft");
  });

  it("accepts an open canonical tone and a legacy alias", () => {
    const { container, rerender } = render(<StatusBadge tone="success" label="Healthy" />);
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("bg-success-soft");
    rerender(<StatusBadge tone="danger" label="Down" />);
    expect(container.firstElementChild).toHaveClass("bg-destructive-soft");
    rerender(<StatusBadge status="online" tone="brand" />);
    expect(container.firstElementChild).toHaveClass("bg-primary-soft");
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("StatusDot colours by tone, labelled or decorative", () => {
    const { container, rerender } = render(<StatusDot tone="warning" label="Degraded" />);
    expect(screen.getByRole("img", { name: "Degraded" })).toBeInTheDocument();
    expect(container.querySelector(".bg-warning")).not.toBeNull();
    rerender(<StatusDot tone="error" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".bg-destructive")).not.toBeNull();
  });
});

describe("tone aliases on domain components", () => {
  it("StatCard, StatusStackRow, TimelineBar, AudioLevelMeter, Icon, FeaturedIcon, StatusCycle", () => {
    const { container: stat } = render(<StatCard label="Errors" value={3} tone="danger" icon={<span />} />);
    expect(stat.querySelector('[data-slot="stat-value"]')).toHaveClass("text-destructive");
    render(<StatCard label="Ok" value={1} tone="default" icon={<span data-testid="i" />} />);
    expect(screen.getByTestId("i").parentElement).toHaveClass("bg-muted");

    const { container: row } = render(<StatusStackRow label="Goal" tone="brand" progress={{ value: 1, max: 2, label: "p" }} />);
    expect(row.querySelector('[role="progressbar"] > div')).toHaveClass("bg-primary");

    render(<TimelineBar from={0} to={100} now={100} spans={[{ start: 0, end: 50, label: "Job", tone: "warn" }]} />);
    expect(screen.getByRole("img", { name: /Job/ })).toHaveClass("bg-warning");

    const { container: meter } = render(<AudioLevelMeter level={1} tone="muted" />);
    expect(meter.querySelector('[data-slot="level-bar"]')).toHaveClass("bg-muted-foreground");

    const { container: icon } = render(<Icon as={RiHomeLine} tone="danger" />);
    expect(icon.querySelector("svg")).toHaveClass("text-destructive");
    const { container: inherit } = render(<Icon as={RiHomeLine} />);
    expect(inherit.querySelector("svg")?.getAttribute("class")).not.toMatch(/text-/);

    const { container: featured } = render(<FeaturedIcon icon={RiHomeLine} tone="success" />);
    expect(featured.firstElementChild).toHaveClass("bg-success-soft");
    const { container: legacy } = render(<FeaturedIcon icon={RiHomeLine} color="brand" />);
    expect(legacy.firstElementChild).toHaveClass("bg-primary-soft");

    render(
      <StatusCycle
        statuses={[
          { value: "a", label: "Alpha", tone: "success" },
          { value: "b", label: "Beta", color: "warning" },
        ]}
        defaultValue="a"
      />
    );
    expect(screen.getByText("Alpha").closest("button")).toHaveClass("bg-success-soft");
  });
});

describe("ToolTimeline canonical TaskStatus", () => {
  it("maps succeeded / failed / running / canceled to the timeline dots", () => {
    render(
      <ToolTimeline>
        <ToolTimelineItem name="Read" status="succeeded" />
        <ToolTimelineItem name="Bash" status="failed" />
        <ToolTimelineItem name="Grep" status="running" />
        <ToolTimelineItem name="Edit" status="canceled" />
        <ToolTimelineItem name="Glob" status="success" />
      </ToolTimeline>
    );
    expect(screen.getAllByRole("img", { name: "Succeeded" })).toHaveLength(2);
    expect(screen.getByRole("img", { name: "Failed" })).toHaveClass("absolute");
    expect(screen.getByRole("img", { name: "In progress" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Canceled" })).toBeInTheDocument();
    const items = document.querySelectorAll('[data-slot="tool-timeline-item"]');
    expect([...items].map((i) => i.getAttribute("data-status"))).toEqual(["success", "failure", "progress", "canceled", "success"]);
    expect(screen.getByText("Running Grep…")).toBeInTheDocument();
  });

  it("derives a group status from canonical child statuses and keeps the emitted union", () => {
    const label = vi.fn(({ count }: { count: number }) => `${count} calls`);
    render(
      <ToolTimeline>
        <ToolGroup label={label}>
          <ToolTimelineItem name="Read" status="completed" />
          <ToolTimelineItem name="Read" status="cancelled" />
        </ToolGroup>
      </ToolTimeline>
    );
    expect(label).toHaveBeenLastCalledWith(expect.objectContaining({ status: "success", running: false }));
    render(<ToolTimelineDot status="cancelled" />);
    expect(screen.getAllByRole("img", { name: "Canceled" }).length).toBeGreaterThan(0);
  });

  it("BashToolBody uses the code surface tokens", () => {
    const { container } = render(<BashToolBody command="ls" output="a" />);
    expect(container.firstElementChild).toHaveClass("bg-code", "text-code-foreground", "border-code-border");
  });
});

describe("Table density + defaultChecked", () => {
  it("accepts canonical density and the legacy comfortable alias", () => {
    const { rerender } = render(
      <Table density="compact">
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    expect(screen.getByText("x")).toHaveClass("py-1.5");
    rerender(
      <Table density="comfortable">
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    expect(screen.getByText("x")).toHaveClass("py-4");
  });

  it("TableCheckbox works uncontrolled with defaultChecked and controlled with checked", () => {
    const onCheckedChange = vi.fn();
    render(<TableCheckbox aria-label="Row" defaultChecked onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox", { name: "Row" });
    expect(box).toBeChecked();
    fireEvent.click(box);
    expect(box).not.toBeChecked();
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);

    render(<TableCheckbox aria-label="Fixed" checked onCheckedChange={() => {}} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Fixed" }));
    expect(screen.getByRole("checkbox", { name: "Fixed" })).toBeChecked();
  });

  it("DataTable forwards ref and takes relaxed density", () => {
    const ref = React.createRef<HTMLTableElement>();
    render(<DataTable ref={ref} density="relaxed" columns={[{ key: "name", header: "Name" }]} data={[{ id: "1", name: "Ada" }]} />);
    expect(ref.current?.tagName).toBe("TABLE");
    expect(screen.getByText("Ada")).toHaveClass("py-4");
  });
});

describe("TodayTimeline density", () => {
  const items: TimelineItem[] = [
    { id: "1", app: "calendar", title: "Standup", start: new Date(2025, 0, 1, 9, 0), end: new Date(2025, 0, 1, 9, 30) },
  ];
  it("normalizes the legacy comfortable to relaxed and defaults to normal", () => {
    const { container, rerender } = render(<TodayTimeline items={items} density="comfortable" now={new Date(2025, 0, 1, 8)} />);
    expect(container.firstElementChild).toHaveAttribute("data-density", "relaxed");
    rerender(<TodayTimeline items={items} now={new Date(2025, 0, 1, 8)} />);
    expect(container.firstElementChild).toHaveAttribute("data-density", "normal");
    rerender(<TodayTimeline items={items} density="compact" now={new Date(2025, 0, 1, 8)} />);
    expect(container.firstElementChild).toHaveAttribute("data-density", "compact");
  });
});

describe("Snackbar onDismiss", () => {
  it("fires onDismiss, and still fires the deprecated onClose", () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<Snackbar message="Saved" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    const onClose = vi.fn();
    rerender(<Snackbar message="Saved" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ZoneEditor onValueChange", () => {
  it("calls onValueChange on edits, and the deprecated onChange", () => {
    const onValueChange = vi.fn();
    const { unmount } = render(<ZoneEditor onApply={() => {}} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: /^Zone 1,/ }));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    unmount();
    const onChange = vi.fn();
    render(<ZoneEditor onApply={() => {}} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /^Zone 1,/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("translate defaults", () => {
  it("LanguagePicker supports defaultValue (uncontrolled)", () => {
    const onValueChange = vi.fn();
    render(<LanguagePicker defaultValue="fr" autoFocus={false} onValueChange={onValueChange} />);
    const list = screen.getByRole("listbox", { name: "Languages" });
    const french = within(list).getAllByRole("option").find((o) => o.getAttribute("data-code") === "fr")!;
    expect(french).toHaveAttribute("aria-selected", "true");
    const german = within(list).getAllByRole("option").find((o) => o.getAttribute("data-code") === "de")!;
    fireEvent.click(german);
    expect(onValueChange).toHaveBeenCalledWith("de");
    expect(german).toHaveAttribute("aria-selected", "true");
    expect(french).toHaveAttribute("aria-selected", "false");
  });

  it("SourcePane and TransliterationToggle work uncontrolled", () => {
    render(<SourcePane defaultValue="hello" />);
    const area = screen.getByRole("textbox", { name: "Text to translate" });
    expect(area).toHaveValue("hello");
    fireEvent.change(area, { target: { value: "hola" } });
    expect(area).toHaveValue("hola");
    render(<TransliterationToggle defaultPressed languageName="Hindi" />);
    const toggle = screen.getByRole("button", { name: "Type in Hindi script" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });
});

describe("transfer-list vocabulary", () => {
  it("accepts cancelled / canonical statuses and density", () => {
    expect(normalizeTransferStatus("cancelled")).toBe("canceled");
    expect(normalizeTransferStatus("running")).toBe("active");
    expect(normalizeTransferStatus("succeeded")).toBe("completed");
    expect(normalizeTransferStatus("paused")).toBe("paused");
    const summary = summarizeTransfers([
      { id: "a", name: "a.txt", status: "cancelled" },
      { id: "b", name: "b.txt", status: "succeeded", total: 10 },
    ]);
    expect(summary.counts.canceled).toBe(1);
    expect(summary.counts.completed).toBe(1);

    const { container } = render(<TransferItem name="x.zip" status="cancelled" density="compact" />);
    expect(container.firstElementChild).toHaveAttribute("data-status", "canceled");
    expect(container.firstElementChild).toHaveClass("py-2.5");
    const { container: legacy } = render(<TransferItem name="y.zip" status="queued" compact />);
    expect(legacy.firstElementChild).toHaveClass("py-2.5");
  });

  it("TransferList emptyState and the deprecated emptyMessage", () => {
    const { rerender } = render(<TransferList items={[]} emptyState="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    rerender(<TransferList items={[]} emptyMessage="Legacy empty" />);
    expect(screen.getByText("Legacy empty")).toBeInTheDocument();
    rerender(<TransferList items={[]} title={null} />);
    expect(screen.getByText("No transfers")).toBeInTheDocument();
  });
});

describe("misc aliases", () => {
  it("SubagentStatusGlyph accepts TaskStatus and forwards its ref", () => {
    const ref = React.createRef<HTMLSpanElement>();
    render(<SubagentStatusGlyph ref={ref} status="succeeded" />);
    expect(screen.getByRole("img", { name: "Done" })).toBe(ref.current);
    render(<SubagentStatusGlyph status="canceled" />);
    expect(screen.getByRole("img", { name: "Canceled" })).toBeInTheDocument();
  });

  it("ToolToggleRow works uncontrolled with defaultChecked", () => {
    const onCheckedChange = vi.fn();
    render(<ToolToggleRow tool={{ id: "t", name: "search", enabled: false }} defaultChecked onCheckedChange={onCheckedChange} />);
    const sw = screen.getByRole("switch", { name: "Enable search" });
    expect(sw).toBeChecked();
    fireEvent.click(sw);
    expect(sw).not.toBeChecked();
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
  });

  it("TagInput emptyState / emptyText and WebhookRouteList emptyState / empty", () => {
    render(<WebhookRouteList routes={[]} />);
    expect(screen.getByText("No webhook routes yet")).toBeInTheDocument();
    render(<WebhookRouteList routes={[]} emptyState="Add one" />);
    expect(screen.getByText("Add one")).toBeInTheDocument();
    render(<WebhookRouteList routes={[]} empty="Legacy" />);
    expect(screen.getByText("Legacy")).toBeInTheDocument();
    render(<TagInput aria-label="Tags" suggestions={["alpha"]} emptyState="No match" />);
  });
});
