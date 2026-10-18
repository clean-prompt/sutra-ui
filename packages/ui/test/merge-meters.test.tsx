import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatAttachment, formatAttachmentSize } from "../src/components/chat-attachment";
import { AttachmentThumbnails } from "../src/components/agent-composer";
import { ContextMeter } from "../src/components/context-meter";
import { ContextUsageBreakdown } from "../src/components/agent-usage";
import { StackedMeter } from "../src/components/meter";
import { RingMeter } from "../src/components/gauge";
import { Progress, ProgressCircle, ProgressRingSvg, ProgressSegments } from "../src/components/progress";
import { PasswordStrength } from "../src/components/password-strength";
import { FileUploadItem, formatBytes as formatUploadBytes } from "../src/components/file-upload";
import { formatFileSize } from "../src/components/file-viewer";
import { StatusStackRow } from "../src/components/status-stack";
import { AgentTodoList } from "../src/components/agent-tasks";
import { axeViolations } from "./a11y";

const IMG = "data:image/png;base64,iVBORw0KGgo=";

describe("attachments share ChatAttachment", () => {
  it("AttachmentThumbnails renders ChatAttachment tiles and keeps its data-state values", () => {
    const { container } = render(
      <AttachmentThumbnails
        onRetry={() => {}}
        items={[
          { id: "i1", name: "shot.png", url: IMG, mimeType: "image/png" },
          { id: "i2", name: "bad.png", url: IMG, status: "failed", error: "Too big" },
          { id: "f1", name: "notes.pdf", size: 2048, pages: 1 },
          { id: "f2", name: "data.csv", status: "uploading" },
        ]}
      />
    );
    const items = screen.getAllByRole("listitem");
    expect(items.map((i) => i.getAttribute("data-variant"))).toEqual(["image", "image", "card", "card"]);
    expect(items.map((i) => i.getAttribute("data-state"))).toEqual(["ready", "failed", "ready", "uploading"]);
    expect(screen.getByText("1 page · 2.0 KB")).toBeInTheDocument();
    // failed image: labelled overlay + retry; indeterminate upload: labelled spinner
    expect(screen.getByRole("img", { name: "Too big" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry bad.png" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Uploading data.csv" })).toBeInTheDocument();
    expect(screen.getByText("Uploading…")).toBeInTheDocument();
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
  });

  it("ChatAttachment gains pages, retry, preview and an explicit status", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onPreview = vi.fn();
    const { rerender } = render(<ChatAttachment name="spec.pdf" fileSize={1_400_000} pages={12} />);
    expect(screen.getByText("PDF · 12 pages · 1.3 MB")).toBeInTheDocument();

    rerender(<ChatAttachment name="spec.pdf" error="Nope" onRetry={onRetry} />);
    await user.click(screen.getByRole("button", { name: "Retry spec.pdf" }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(<ChatAttachment name="a.png" previewUrl={IMG} variant="image" onPreview={onPreview} />);
    await user.click(screen.getByRole("button", { name: "Preview a.png" }));
    expect(onPreview).toHaveBeenCalledTimes(1);

    rerender(<ChatAttachment name="a.png" status="uploading" />);
    expect(screen.getByText("Uploading…")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Uploading a.png" })).toBeInTheDocument();

    rerender(<ChatAttachment name="a.png" progress={30} status="ready" />);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("upload progress uses ProgressCircle (labelled progressbar instead of a hidden ring)", () => {
    const { container } = render(<ChatAttachment name="a.png" progress={42} variant="chip" />);
    const ring = screen.getByRole("progressbar", { name: "Uploading a.png" });
    expect(ring).toHaveAttribute("aria-valuenow", "42");
    expect(container.querySelector("circle[pathLength='100']")).not.toBeNull();
  });

  it("byte helpers keep their outputs on top of lib formatBytes", () => {
    expect(formatAttachmentSize(1536)).toBe("1.5 KB");
    expect(formatAttachmentSize(12 * 1024 * 1024)).toBe("12 MB");
    expect(formatAttachmentSize(-1)).toBe("");
    expect(formatUploadBytes(2048)).toBe("2 KB");
    expect(formatFileSize(1500)).toBe("1.5 KB");
    expect(formatFileSize(undefined)).toBe("");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <AttachmentThumbnails
        onRemove={() => {}}
        onRetry={() => {}}
        items={[
          { id: "i2", name: "bad.png", url: IMG, status: "failed" },
          { id: "f2", name: "data.csv", status: "uploading", progress: 10 },
        ]}
      />
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("context meters share ContextUsageBreakdown", () => {
  it("ContextUsageBreakdown draws a StackedMeter with meter semantics", () => {
    const { container } = render(
      <ContextUsageBreakdown
        max={1000}
        categories={[
          { key: "a", label: "A", tokens: 300 },
          { key: "r", label: "Reply", tokens: 200, reserved: true },
        ]}
      />
    );
    const meter = screen.getByRole("meter", { name: "Context window" });
    expect(meter).toHaveAttribute("aria-valuenow", "300");
    expect(meter).not.toHaveAttribute("aria-label");
    expect(meter.closest('[role="group"]')).not.toBeNull();
    expect(container.querySelectorAll("[data-slot=context-usage-segment]")).toHaveLength(2);
    expect(screen.getByText("300 / 1k tokens (30%)")).toBeInTheDocument();
    const free = container.querySelector("[data-key=free]") as HTMLElement;
    expect(within(free).getByText("500")).toBeInTheDocument();
  });

  it("a larger `used` adds an Other part; compacting disables the button", () => {
    const onCompact = vi.fn();
    const { container } = render(
      <ContextUsageBreakdown max={100} used={60} categories={[{ key: "a", label: "A", tokens: 20 }]} onCompact={onCompact} compacting />
    );
    expect(container.querySelector("[data-key=other]")).toHaveTextContent("40");
    const btn = screen.getByRole("button", { name: /Compacting/ });
    expect(btn).toBeDisabled();
  });

  it("StackedMeter keeps role=img by default and can hide its header", () => {
    const { container } = render(<StackedMeter showValue={false} label="Disk" parts={[{ label: "A", value: 1 }]} />);
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", "A 1");
    expect(screen.queryByText("Disk")).toBeNull();
    expect(container.querySelector("[data-slot=stacked-meter-part]")).not.toBeNull();
  });

  it("ContextMeter accepts categories and onCompact; its popover is a ContextUsageBreakdown", async () => {
    const user = userEvent.setup();
    const onCompact = vi.fn();
    render(
      <ContextMeter
        limit={10_000}
        categories={[
          { key: "tools", label: "Tools", tokens: 2_000 },
          { key: "msgs", label: "Messages", tokens: 3_000 },
        ]}
        onCompact={onCompact}
      />
    );
    await user.click(screen.getByRole("button", { name: "Context window 50% full" }));
    const pop = await screen.findByRole("dialog");
    expect(within(pop).getByRole("meter", { name: "Context window" })).toHaveAttribute("aria-valuenow", "5000");
    expect(within(pop).getByText("Tools")).toBeInTheDocument();
    expect(within(pop).getByText("Plenty of room")).toBeInTheDocument();
    await user.click(within(pop).getByRole("button", { name: "Compact conversation" }));
    expect(onCompact).toHaveBeenCalledTimes(1);
  });

  it("onCompress stays as a deprecated alias with the old wording", async () => {
    const user = userEvent.setup();
    const onCompress = vi.fn();
    render(<ContextMeter limit={100} used={10} onCompress={onCompress} compressing />);
    await user.click(screen.getByRole("button", { name: /Context window/ }));
    const pop = await screen.findByRole("dialog");
    expect(within(pop).getByRole("button", { name: /Compressing/ })).toBeDisabled();
    expect(within(pop).getByText("Plenty of room")).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe("Progress replaces hand-rolled bars", () => {
  it("has a 2xs size and tolerates an empty range without console errors", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Progress size="2xs" value={0} max={0} aria-label="Empty" />);
    const bar = screen.getByRole("progressbar", { name: "Empty" });
    expect(bar).toHaveClass("h-0.5");
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it("FileUploadItem, StatusStackRow and AgentTodoList render Progress", () => {
    const file = new File(["x"], "a.txt");
    render(
      <ul>
        <FileUploadItem file={{ id: "1", file, status: "uploading", progress: 33.4 }} hideRemove />
      </ul>
    );
    const upload = screen.getByRole("progressbar", { name: "Uploading a.txt" });
    expect(upload).toHaveAttribute("aria-valuenow", "33");
    expect(upload).toHaveAttribute("data-state", "loading");

    render(<StatusStackRow label="Goal" tone="success" progress={{ value: 3, max: 4, label: "Goal progress" }} />);
    const goal = screen.getByRole("progressbar", { name: "Goal progress" });
    expect(goal).toHaveAttribute("aria-valuemax", "4");
    expect(goal).toHaveAttribute("aria-valuenow", "3");
    expect(goal).toHaveClass("w-auto");
    expect(goal.firstElementChild).toHaveClass("bg-success");

    render(<AgentTodoList items={[{ id: "1", content: "A", status: "completed" }, { id: "2", content: "B", status: "pending" }]} />);
    const todo = screen.getAllByRole("progressbar").at(-1)!;
    expect(todo).toHaveAttribute("aria-valuemax", "2");
    expect(todo).toHaveAttribute("aria-valuetext", "1 of 2 done");
  });
});

describe("PasswordStrength uses ProgressSegments", () => {
  it("keeps meter semantics and colours segments by level", () => {
    const { rerender } = render(<PasswordStrength password="abcdefG1" requirements={[]} />);
    const meter = screen.getByRole("meter", { name: "Password strength" });
    expect(meter).toHaveAttribute("aria-valuenow", "2");
    expect(meter).toHaveAttribute("aria-valuetext", "Fair");
    const segs = Array.from(meter.children);
    expect(segs).toHaveLength(4);
    expect(segs.filter((s) => s.classList.contains("bg-warning"))).toHaveLength(2);
    rerender(<PasswordStrength password="abcdefG1!" requirements={[]} />);
    expect(Array.from(meter.children).filter((s) => s.classList.contains("bg-success/70"))).toHaveLength(3);
  });

  it("ProgressSegments takes role=meter and indicatorClassName", () => {
    render(<ProgressSegments role="meter" value={1} segments={3} label="Level" indicatorClassName="bg-info" />);
    const meter = screen.getByRole("meter", { name: "Level" });
    expect(meter.firstElementChild).toHaveClass("bg-info");
    expect(meter.firstElementChild).not.toHaveClass("bg-primary");
  });
});

describe("rings share ProgressRingSvg", () => {
  it("ProgressCircle and RingMeter draw the same ring with different semantics", () => {
    const { container } = render(
      <>
        <ProgressCircle value={25} label="Done" tone="warning" />
        <RingMeter value={25} label="Context" />
      </>
    );
    expect(screen.getByRole("progressbar", { name: "Done" })).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Context" })).toBeInTheDocument();
    const fills = container.querySelectorAll("circle[pathLength='100']");
    expect(fills).toHaveLength(2);
    for (const f of fills) expect(f).toHaveAttribute("stroke-dasharray", "25 100");
    expect(container.querySelector(".stroke-warning")).not.toBeNull();
  });

  it("ProgressRingSvg is decorative", () => {
    const { container } = render(<ProgressRingSvg percent={150} size={20} strokeWidth={2} fillSlot="x" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("[data-slot=x]")).toHaveAttribute("stroke-dasharray", "100 100");
  });
});

describe("audio and media strips keep their values", () => {
  it("Progress forwards clicks and aria overrides", () => {
    const onClick = vi.fn();
    render(<Progress value={50} aria-label="Strip" aria-valuemax={200} aria-valuenow={100} onClick={onClick} />);
    const bar = screen.getByRole("progressbar", { name: "Strip" });
    expect(bar).toHaveAttribute("aria-valuemax", "200");
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    fireEvent.click(bar);
    expect(onClick).toHaveBeenCalled();
  });
});
