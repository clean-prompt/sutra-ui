import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { LogViewer, detectLogLevel, parseAnsi, stripAnsi, type LogLine } from "../src/components/log-viewer";
import {
  TransferItem,
  TransferList,
  TransferTray,
  formatEta,
  formatSpeed,
  getTransferStats,
  summarizeTransfers,
  type TransferItemData,
} from "../src/components/transfer-list";
import { ProgressDialog, useStreamingTask, type StreamingTaskEvent } from "../src/components/progress-dialog";
import { Markdown } from "../src/components/markdown";
import { axeViolations } from "./a11y";

// jsdom has no Element#scrollTo; useStickToBottom calls it.
Element.prototype.scrollTo ??= function () {} as typeof Element.prototype.scrollTo;

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* detectLogLevel / parseAnsi                                          */
/* ------------------------------------------------------------------ */

describe("detectLogLevel", () => {
  it.each([
    ["2024-01-01 12:00:00 ERROR failed to bind", "error"],
    ["level=error msg=boom", "error"],
    ["Traceback (most recent call last):", "error"],
    ["ValueError: bad input", "error"],
    ["CRITICAL disk full", "error"],
    ["WARN slow query 1200ms", "warn"],
    ["warning: deprecated flag", "warn"],
    ["INFO server started on :8080", "info"],
    ["DEBUG cache miss key=a", "debug"],
    ['127.0.0.1 - - "GET /v1/models HTTP/1.1" 200 512', "http"],
    ["POST /v1/chat/completions 201 12ms", "http"],
    ['INFO aiohttp.access: "GET /health HTTP/1.1" 404 0', "warn"],
    ['"POST /v1/embed HTTP/1.1" 502 0', "error"],
    ["\x1b[31mERROR\x1b[0m colored", "error"],
    ["just some text", "other"],
    ["0 errors found", "other"],
  ])("%s → %s", (line, level) => {
    expect(detectLogLevel(line)).toBe(level);
  });
});

describe("parseAnsi", () => {
  it("maps SGR colors and resets", () => {
    expect(parseAnsi("\x1b[31mred\x1b[0m plain")).toEqual([{ text: "red", fg: "red" }, { text: " plain" }]);
  });
  it("handles bold, bright, background and combined codes", () => {
    expect(parseAnsi("\x1b[1;92mok\x1b[22m done\x1b[44m bg\x1b[49m")).toEqual([
      { text: "ok", fg: "bright-green", bold: true },
      { text: " done", fg: "bright-green" },
      { text: " bg", fg: "bright-green", bg: "blue" },
    ]);
  });
  it("strips non-color escapes and maps 256-color low indexes", () => {
    expect(parseAnsi("\x1b[2K\x1b[38;5;3mwarn\x1b[39m")).toEqual([{ text: "warn", fg: "yellow" }]);
    expect(stripAnsi("\x1b[1m\x1b[33mhi\x1b[0m")).toBe("hi");
  });
  it("returns plain text as one segment", () => {
    expect(parseAnsi("hello")).toEqual([{ text: "hello" }]);
  });
});

/* ------------------------------------------------------------------ */
/* LogViewer                                                           */
/* ------------------------------------------------------------------ */

const sample: LogLine[] = [
  "INFO starting gateway",
  "WARN model cache cold",
  "ERROR upstream timeout",
  'INFO aiohttp.access: "GET /v1/models HTTP/1.1" 200 512',
  "\x1b[32mDEBUG\x1b[0m tokenizer loaded",
];

const rows = (container: HTMLElement) => container.querySelectorAll("[data-log-row]");

describe("LogViewer", () => {
  it("renders lines with detected levels and ANSI spans", () => {
    const { container } = render(<LogViewer lines={sample} />);
    const r = rows(container);
    expect(r).toHaveLength(5);
    expect(Array.from(r).map((el) => el.getAttribute("data-level"))).toEqual(["info", "warn", "error", "http", "debug"]);
    expect(container.querySelector(".text-green-400")).toHaveTextContent("DEBUG");
    expect(container.textContent).not.toContain("\x1b");
  });

  it("accepts structured entries with timestamps and toggles them", () => {
    const { container } = render(
      <LogViewer entries={[{ id: 1, ts: "12:00:01", level: "warning", source: "gw", message: "hot" }]} />
    );
    expect(rows(container)[0]).toHaveAttribute("data-level", "warn");
    expect(container).toHaveTextContent("12:00:01");
    fireEvent.click(screen.getByRole("button", { name: "Show timestamps" }));
    expect(container).not.toHaveTextContent("12:00:01");
  });

  it("filters text case-insensitively with highlights, and supports regex", () => {
    const { container } = render(<LogViewer lines={sample} />);
    const input = screen.getByRole("searchbox", { name: "Filter log lines" });
    fireEvent.change(input, { target: { value: "upstream" } });
    expect(rows(container)).toHaveLength(1);
    expect(container.querySelector("mark")).toHaveTextContent("upstream");
    fireEvent.change(input, { target: { value: "UPSTREAM" } });
    expect(rows(container)).toHaveLength(1);

    fireEvent.change(input, { target: { value: "^(WARN|ERROR)" } });
    expect(rows(container)).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Use regular expression" }));
    expect(rows(container)).toHaveLength(2);
    fireEvent.change(input, { target: { value: "([" } });
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("toggles levels with counts", () => {
    const { container } = render(<LogViewer lines={sample} />);
    const levels = screen.getByRole("group", { name: "Levels" });
    const error = within(levels).getByRole("checkbox", { name: /Error\s*1/ });
    fireEvent.click(within(levels).getByRole("checkbox", { name: /Info/ }));
    expect(rows(container)).toHaveLength(4);
    fireEvent.click(error);
    expect(rows(container)).toHaveLength(3);
    fireEvent.click(error);
    expect(rows(container)).toHaveLength(4);
  });

  it("buffers new lines while paused and resumes from the pill", () => {
    const { container, rerender } = render(<LogViewer lines={sample} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    rerender(<LogViewer lines={[...sample, "INFO one", "INFO two"]} />);
    expect(rows(container)).toHaveLength(5);
    const pill = screen.getByRole("button", { name: "2 new lines" });
    fireEvent.click(pill);
    expect(rows(container)).toHaveLength(7);
    expect(screen.queryByRole("button", { name: /new lines/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });

  it("caps retained lines with maxLines (ring buffer)", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `line ${i}`);
    const { container, rerender } = render(<LogViewer lines={lines} maxLines={10} />);
    expect(rows(container)).toHaveLength(10);
    expect(rows(container)[0]).toHaveTextContent("line 40");
    rerender(<LogViewer lines={[...lines, "line 50", "line 51"]} maxLines={10} />);
    expect(rows(container)).toHaveLength(10);
    expect(rows(container)[0]).toHaveTextContent("line 42");
    expect(rows(container)[9]).toHaveTextContent("line 51");
  });

  it("virtualizes 10k lines into a small window", () => {
    const lines = Array.from({ length: 10_000 }, (_, i) => `INFO request ${i}`);
    const { container } = render(<LogViewer lines={lines} height={400} />);
    const count = rows(container).length;
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(100);
    expect(container.querySelector("[role=log]")).toHaveAttribute("data-virtual");
  });

  it("shows connecting and disconnected states", () => {
    const onReconnect = vi.fn();
    const { rerender } = render(<LogViewer lines={[]} status="connecting" />);
    expect(screen.getByText("Connecting…")).toBeInTheDocument();
    rerender(<LogViewer lines={[]} status="disconnected" onReconnect={onReconnect} />);
    fireEvent.click(screen.getByRole("button", { name: "Reconnect" }));
    expect(onReconnect).toHaveBeenCalled();
  });

  it("renders a source picker and filters by source when asked", () => {
    const { container } = render(
      <LogViewer
        entries={[
          { message: "a", source: "gateway" },
          { message: "b", source: "llama" },
        ]}
        sources={["gateway", "llama"]}
        source="llama"
        filterBySource
      />
    );
    expect(screen.getByRole("combobox", { name: "Log source" })).toHaveTextContent("llama");
    expect(rows(container)).toHaveLength(1);
    expect(rows(container)[0]).toHaveTextContent("b");
  });

  it("has no axe violations", async () => {
    const { container } = render(<LogViewer lines={sample} status="live" sources={["gateway"]} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* TransferList                                                        */
/* ------------------------------------------------------------------ */

describe("formatEta / formatSpeed", () => {
  it("formats durations", () => {
    expect(formatEta(0.2)).toBe("<1s");
    expect(formatEta(45)).toBe("45s");
    expect(formatEta(125)).toBe("2m 5s");
    expect(formatEta(120)).toBe("2m");
    expect(formatEta(3725)).toBe("1h 2m");
    expect(formatEta(90000)).toBe("1d 1h");
    expect(formatEta(Infinity)).toBe("—");
    expect(formatEta(undefined)).toBe("—");
  });
  it("formats speeds", () => {
    expect(formatSpeed(0)).toBe("0 B/s");
    expect(formatSpeed(1536)).toBe("1.5 KB/s");
    expect(formatSpeed(13 * 1024 * 1024)).toBe("13 MB/s");
  });
  it("computes speed and ETA from samples or startedAt", () => {
    const s = getTransferStats({
      id: "a",
      name: "a.zip",
      status: "active",
      bytes: 3000,
      total: 10000,
      samples: [
        { t: 0, bytes: 1000 },
        { t: 1000, bytes: 2000 },
        { t: 2000, bytes: 3000 },
      ],
    });
    expect(s.speed).toBe(1000);
    expect(s.eta).toBe(7);
    expect(s.percent).toBe(30);
    const t = getTransferStats({ id: "b", name: "b", status: "active", bytes: 500, total: 1000, startedAt: 0 }, 5000);
    expect(t.speed).toBe(100);
    expect(t.eta).toBe(5);
  });
});

const MB = 1024 * 1024;
const transfers: TransferItemData[] = [
  { id: "1", name: "photos.zip", direction: "upload", status: "active", bytes: 20 * MB, total: 80 * MB, speed: 4 * MB },
  { id: "2", name: "track.flac", direction: "download", status: "failed", bytes: 2 * MB, total: 30 * MB, error: "upstream 502: Bad Gateway" },
  { id: "3", name: "notes.pdf", direction: "upload", status: "completed", total: 1 * MB },
  { id: "4", name: "album", direction: "move", status: "paused", progress: 40, icon: <span>📁</span> },
  { id: "5", name: "report.docx", direction: "upload", status: "queued", total: 2 * MB },
];

describe("TransferList", () => {
  it("renders statuses, progress, bytes, speed/ETA and retained errors", () => {
    render(<TransferList items={transfers} />);
    const list = screen.getByRole("list", { name: "Transfers" });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((i) => i.getAttribute("data-status"))).toEqual(["active", "failed", "completed", "paused", "queued"]);
    expect(items[0]).toHaveTextContent("25%");
    expect(items[0]).toHaveTextContent("20 MB of 80 MB");
    expect(items[0]).toHaveTextContent("4 MB/s");
    expect(items[0]).toHaveTextContent("15s left");
    expect(within(items[1]).getByRole("alert")).toHaveTextContent("upstream 502: Bad Gateway");
    expect(items[2]).toHaveTextContent("Completed");
    expect(within(items[0]).getByRole("img", { name: "Upload" })).toBeInTheDocument();
    expect(within(items[3]).getByRole("img", { name: "Move" })).toBeInTheDocument();
  });

  it("shows a summary header and clear completed", () => {
    const onClear = vi.fn();
    const { container } = render(<TransferList items={transfers} onClearCompleted={onClear} />);
    expect(container.querySelector("[data-transfer-summary]")).toHaveTextContent(
      "1 active · 1 queued · 1 paused · 1 failed · 1 done · 4 MB/s"
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear completed" }));
    expect(onClear).toHaveBeenCalled();
    expect(summarizeTransfers([]).text).toBe("No transfers");
  });

  it("offers per-status actions", () => {
    const handlers = {
      onPause: vi.fn(),
      onResume: vi.fn(),
      onCancel: vi.fn(),
      onRetry: vi.fn(),
      onRemove: vi.fn(),
      onOpen: vi.fn(),
    };
    render(<TransferList items={transfers} {...handlers} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause photos.zip" }));
    expect(handlers.onPause).toHaveBeenCalledWith("1");
    fireEvent.click(screen.getByRole("button", { name: "Retry track.flac" }));
    expect(handlers.onRetry).toHaveBeenCalledWith("2");
    fireEvent.click(screen.getByRole("button", { name: "Open notes.pdf" }));
    expect(handlers.onOpen).toHaveBeenCalledWith("3");
    fireEvent.click(screen.getByRole("button", { name: "Resume album" }));
    expect(handlers.onResume).toHaveBeenCalledWith("4");
    fireEvent.click(screen.getByRole("button", { name: "Cancel report.docx" }));
    expect(handlers.onCancel).toHaveBeenCalledWith("5");
    fireEvent.click(screen.getByRole("button", { name: "Remove notes.pdf" }));
    expect(handlers.onRemove).toHaveBeenCalledWith("3");
    expect(screen.queryByRole("button", { name: "Pause track.flac" })).toBeNull();
  });

  it("renders a standalone TransferItem", () => {
    render(
      <ul>
        <TransferItem name="x.mp4" status="canceled" />
      </ul>
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("Canceled");
  });

  it("TransferTray minimizes and closes", () => {
    const onClose = vi.fn();
    render(<TransferTray items={transfers} onClose={onClose} />);
    const region = screen.getByRole("region", { name: /Transferring 3 items|Uploading 3 items/ });
    expect(region).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Minimize transfers" });
    fireEvent.click(toggle);
    expect(screen.queryByRole("list")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Expand transfers" }));
    expect(screen.getByRole("list")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close transfers" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <TransferList items={transfers} onPause={() => {}} onRetry={() => {}} onRemove={() => {}} onCancel={() => {}} />
        <TransferTray items={transfers} inline onClose={() => {}} />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* ProgressDialog + useStreamingTask                                   */
/* ------------------------------------------------------------------ */

async function* okStream(): AsyncGenerator<StreamingTaskEvent> {
  yield { phase: "Downloading…", progress: 10, log: "INFO fetching manifest" };
  await tick(5);
  yield { progress: 42, log: ["INFO 12/30 files", "WARN slow mirror"] };
  await tick(5);
  yield { phase: "Verifying…", progress: 90 };
}

let failNext = true;
async function* flakyStream(): AsyncGenerator<StreamingTaskEvent> {
  yield { phase: "Syncing…", progress: 20, log: "INFO start" };
  await tick(5);
  if (failNext) {
    failNext = false;
    throw new Error("rsync exited with code 23");
  }
  yield { progress: 100, done: true };
}

function Harness({ stream }: { stream: () => AsyncIterable<StreamingTaskEvent> }) {
  const task = useStreamingTask({ task: () => stream() });
  return (
    <ProgressDialog
      open
      title="Sync dataset"
      task={task}
      onStart={() => void task.start()}
      successMessage="All files are up to date."
    >
      <p>Choose a target</p>
    </ProgressDialog>
  );
}

describe("ProgressDialog / useStreamingTask", () => {
  it("streams progress, phases and logs to success", async () => {
    render(<Harness stream={okStream} />);
    expect(screen.getByText("Choose a target")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(screen.getByText("Downloading…")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("All files are up to date.")).toBeInTheDocument());
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByRole("log", { name: "Operation log" })).toHaveTextContent("WARN slow mirror");
    expect(screen.getAllByRole("button", { name: "Close" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("fails with the error and retries", async () => {
    failNext = true;
    render(<Harness stream={flakyStream} />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("rsync exited with code 23"));
    expect(screen.getByText("Syncing…")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText("100%")).toBeInTheDocument());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("confirms before closing while running and cancels", async () => {
    let release!: () => void;
    async function* slow(): AsyncGenerator<StreamingTaskEvent> {
      yield { phase: "Working…", progress: null };
      await new Promise<void>((r) => (release = r));
      yield { progress: 100 };
    }
    const onOpenChange = vi.fn();
    function Slow() {
      const task = useStreamingTask();
      React.useEffect(() => {
        void task.start(slow());
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <ProgressDialog open title="Long job" task={task} onOpenChange={onOpenChange} />;
    }
    render(<Slow />);
    await waitFor(() => expect(screen.getByText("Working…")).toBeInTheDocument());
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("Stop this operation?");
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Stop and close" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    await act(async () => {
      release();
      await tick(5);
    });
  });

  it("consumes an EventSource-like emitter", async () => {
    const listeners: Record<string, ((e: unknown) => void)[]> = {};
    const emitter = {
      addEventListener: (t: string, l: (e: unknown) => void) => (listeners[t] ??= []).push(l),
      removeEventListener: (t: string, l: (e: unknown) => void) => {
        listeners[t] = (listeners[t] ?? []).filter((x) => x !== l);
      },
      close: vi.fn(),
    };
    const emit = (t: string, e: unknown) => listeners[t]?.forEach((l) => l(e));
    let result!: ReturnType<typeof useStreamingTask>;
    function Probe() {
      result = useStreamingTask();
      return null;
    }
    render(<Probe />);
    act(() => void result.start(emitter));
    await act(async () => {
      await tick();
      emit("message", { data: JSON.stringify({ progress: 50, phase: "Half", log: "x" }) });
    });
    expect(result.progress).toBe(50);
    expect(result.phase).toBe("Half");
    expect(result.logs).toEqual(["x"]);
    await act(async () => emit("message", { data: '{"done":true}' }));
    expect(result.state).toBe("succeeded");
    expect(emitter.close).toHaveBeenCalled();
  });

  it("has no axe violations while running", async () => {
    render(
      <ProgressDialog open title="Sync" state="running" progress={42} phase="Downloading…" logs={["INFO a", "ERROR b"]} onCancel={() => {}} />
    );
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Markdown math + citations                                           */
/* ------------------------------------------------------------------ */

describe("Markdown math", () => {
  it("renders inline and display math with KaTeX", () => {
    const { container } = render(
      <Markdown math>{"Energy $x^2$ here.\n\n$$\n\\begin{aligned}\na &= b \\\\\n\nc &= d\n\\end{aligned}\n$$\n\nAfter."}</Markdown>
    );
    expect(container.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll(".katex-display")).toHaveLength(1);
    expect(container.textContent).not.toContain("$$");
    expect(container).toHaveTextContent("After.");
  });

  it("leaves dollars alone without the math prop", () => {
    const { container } = render(<Markdown>{"Cost $x^2$"}</Markdown>);
    expect(container.querySelector(".katex")).toBeNull();
    expect(container).toHaveTextContent("$x^2$");
  });
});

describe("Markdown citations", () => {
  const md = "Rust is fast [1] and safe [2,3]. Not [9].\n\nCode `arr[1]` stays.\n\n```\nx = a[2]\n```";

  it("renders pills and calls onCite, skipping code", () => {
    const onCite = vi.fn();
    const { container } = render(
      <Markdown citeCount={3} sources={[{ title: "Rust book" }, { title: "Nomicon" }, { title: "Blog" }]} onCite={onCite}>
        {md}
      </Markdown>
    );
    const pills = container.querySelectorAll("[data-citation]");
    expect(Array.from(pills).map((p) => p.textContent)).toEqual(["1", "2", "3"]);
    const first = screen.getByRole("button", { name: "Source 1: Rust book" });
    expect(first).toHaveAttribute("title", "Rust book");
    fireEvent.click(screen.getByRole("button", { name: "Source 3: Blog" }));
    expect(onCite).toHaveBeenCalledWith(3);
    expect(container).toHaveTextContent("Not [9].");
    expect(container.querySelector("code")).toHaveTextContent("arr[1]");
    expect(container.querySelector("pre")).toHaveTextContent("x = a[2]");
  });

  it("uses sources length and renders link pills without onCite", () => {
    const { container } = render(
      <Markdown sources={[{ href: "https://example.com", title: "Example" }]}>{"See [1]."}</Markdown>
    );
    expect(container.querySelector("a[data-citation]")).toHaveAttribute("href", "https://example.com");
  });

  it("works together with math and passes axe", async () => {
    const { container } = render(
      <Markdown math citeCount={1} onCite={() => {}}>{"Area $\\pi r^2$ [1]."}</Markdown>
    );
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.querySelectorAll("[data-citation]")).toHaveLength(1);
    expect(await axeViolations(container)).toEqual([]);
  });
});
