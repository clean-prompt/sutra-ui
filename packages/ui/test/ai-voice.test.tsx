import * as React from "react";
import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ContextMeter,
  ConversationSidebarList,
  detectSlashTrigger,
  JobBanner,
  ModelPicker,
  QuestionCard,
  SlashMenu,
  StatusStrip,
  UsageSummary,
  useSlashTrigger,
  type ModelPickerModel,
  type SlashCommand,
  type UsageDay,
} from "../src/kits/ai/ai-extras";
import { AudioLevelMeter, SpeakButton, useSpeechRecognition, VoiceInput } from "../src/kits/voice/voice";
import {
  ConversationTurns,
  DictionaryCard,
  LanguageBar,
  LanguagePicker,
  languages,
  searchLanguages,
  SourcePane,
  TargetPane,
  TransliterationCandidates,
} from "../src/kits/voice/translate";
import { axeViolations } from "./a11y";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ */
/* ContextMeter                                                        */
/* ------------------------------------------------------------------ */

describe("ContextMeter", () => {
  it("colors by level and only shows the percent near full", () => {
    const { rerender } = render(<ContextMeter limit={1000} used={500} />);
    const btn = screen.getByRole("button", { name: "Context window 50% full" });
    expect(btn).toHaveAttribute("data-level", "ok");
    expect(btn.querySelector('[data-slot="ring-value"]')).toBeNull();
    rerender(<ContextMeter limit={1000} used={800} />);
    expect(screen.getByRole("button")).toHaveAttribute("data-level", "warn");
    expect(screen.getByText("80%")).toBeInTheDocument();
    rerender(<ContextMeter limit={1000} used={950} />);
    expect(screen.getByRole("button")).toHaveAttribute("data-level", "danger");
  });

  it("popover shows the breakdown and compresses", async () => {
    const user = userEvent.setup();
    const onCompress = vi.fn();
    render(
      <ContextMeter limit={32000} model="qwen3-8b" breakdown={{ system: 1200, history: 14000, attachments: 3000, reserved: 2000 }} onCompress={onCompress} />
    );
    await user.click(screen.getByRole("button", { name: /Context window/ }));
    const pop = await screen.findByRole("dialog");
    for (const k of ["System", "History", "Attachments", "Remaining", "Model context"]) expect(within(pop).getByText(k)).toBeInTheDocument();
    expect(within(pop).getByText("1.2K")).toBeInTheDocument();
    expect(within(pop).getByText("14K")).toBeInTheDocument();
    expect(within(pop).getByText("32K tokens")).toBeInTheDocument();
    expect(within(pop).getByText("qwen3-8b")).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
    await user.click(within(pop).getByRole("button", { name: "Compress conversation" }));
    expect(onCompress).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------ */
/* StatusStrip / JobBanner                                             */
/* ------------------------------------------------------------------ */

describe("StatusStrip", () => {
  it("counts down a retry every second with Retry now / Cancel", () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    const onCancel = vi.fn();
    render(<StatusStrip status={{ kind: "retrying", retryIn: 7, message: "At capacity" }} onRetry={onRetry} onCancel={onCancel} />);
    const strip = screen.getByRole("status");
    expect(strip).toHaveTextContent("Retrying in 7s");
    act(() => vi.advanceTimersByTime(1000));
    expect(strip).toHaveTextContent("Retrying in 6s");
    act(() => vi.advanceTimersByTime(3000));
    expect(strip).toHaveTextContent("Retrying in 3s");
    act(() => vi.advanceTimersByTime(4000));
    expect(strip).toHaveTextContent("Retrying…");
    fireEvent.click(screen.getByRole("button", { name: "Retry now" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders waking ETA, queue, offline and tones", async () => {
    vi.useFakeTimers();
    const start = Date.now();
    const { rerender, container } = render(<StatusStrip status={{ kind: "waking", estimate: 20, startedAt: start }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Waking the model… ~20s");
    expect(screen.getByRole("status")).toHaveAttribute("data-tone", "info");
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole("status")).toHaveTextContent("~15s");
    expect(container.querySelector<HTMLElement>('[data-slot="status-progress"]')!.style.width).toBe("25%");
    rerender(<StatusStrip status={{ kind: "queued", position: 3 }} />);
    expect(screen.getByRole("status")).toHaveTextContent("position 3");
    rerender(<StatusStrip status={{ kind: "offline" }} />);
    expect(screen.getByRole("status")).toHaveAttribute("data-tone", "destructive");
    rerender(<StatusStrip status={null} />);
    expect(screen.queryByRole("status")).toBeNull();
    vi.useRealTimers();
    rerender(<StatusStrip status={{ kind: "rate-limited", retryIn: 30 }} onCancel={() => {}} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("JobBanner", () => {
  it("shows step dots, current phase and done actions", async () => {
    const onOpen = vi.fn();
    const { rerender, container } = render(<JobBanner title="Compare vector DBs" phase="reading" elapsed={75} onCancel={() => {}} />);
    const steps = container.querySelectorAll('[data-slot="job-step"]');
    expect(Array.from(steps).map((s) => s.getAttribute("data-state"))).toEqual(["complete", "complete", "active", "pending"]);
    expect(screen.getByText("Reading sources…")).toBeInTheDocument();
    expect(screen.getByText("1:15")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    rerender(<JobBanner title="Compare vector DBs" status="done" elapsed={120} onAskAgain={() => {}} onOpenResult={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "Open result" }));
    expect(onOpen).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Ask again" })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* QuestionCard                                                        */
/* ------------------------------------------------------------------ */

describe("QuestionCard", () => {
  const options = [
    { value: "pg", label: "Postgres" },
    { value: "sqlite", label: "SQLite" },
    { value: "mongo", label: "MongoDB" },
  ];

  it("single choice answers on pick and locks", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    const { container } = render(<QuestionCard question="Which database?" options={options} onAnswer={onAnswer} />);
    expect(await axeViolations(container)).toEqual([]);
    await user.click(screen.getByRole("radio", { name: "SQLite" }));
    expect(onAnswer).toHaveBeenCalledWith({ values: ["sqlite"] });
    expect(screen.queryByRole("radio")).toBeNull();
    expect(container.querySelector('[data-slot="question-answer"]')).toHaveTextContent("Your answer: SQLite");
  });

  it("multi choice confirms selections, with Other…", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    const { container } = render(<QuestionCard type="multi" allowOther question="Which ones?" options={options} onAnswer={onAnswer} />);
    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(confirm).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "Postgres" }));
    await user.click(screen.getByRole("checkbox", { name: "Other…" }));
    await user.type(screen.getByRole("textbox", { name: "Other answer" }), "DuckDB");
    expect(await axeViolations(container)).toEqual([]);
    await user.click(confirm);
    expect(onAnswer).toHaveBeenCalledWith({ values: ["pg", "__other__"], text: "DuckDB" });
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(container).toHaveTextContent("Postgres, DuckDB");
  });

  it("free text submits on Enter; prior answer renders locked", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    const { rerender, container } = render(<QuestionCard type="text" allowAttachments question="What should it be called?" onAnswer={onAnswer} />);
    expect(screen.getByRole("button", { name: "Attach files" })).toBeInTheDocument();
    await user.type(screen.getByRole("textbox"), "Sutra{Enter}");
    expect(onAnswer).toHaveBeenCalledWith({ values: [], text: "Sutra", files: undefined });
    rerender(<QuestionCard question="Which database?" options={options} answer={{ values: ["mongo"] }} />);
    expect(screen.queryByRole("radio")).toBeNull();
    expect(container).toHaveTextContent("MongoDB");
  });
});

/* ------------------------------------------------------------------ */
/* useSlashTrigger / SlashMenu                                         */
/* ------------------------------------------------------------------ */

describe("detectSlashTrigger / useSlashTrigger", () => {
  it("detects triggers only at the start of a word", () => {
    expect(detectSlashTrigger("/he", 3)).toEqual({ trigger: "/", query: "he", start: 0, end: 3 });
    expect(detectSlashTrigger("hello /cm", 9)).toEqual({ trigger: "/", query: "cm", start: 6, end: 9 });
    expect(detectSlashTrigger("/", 1)).toEqual({ trigger: "/", query: "", start: 0, end: 1 });
    expect(detectSlashTrigger("a/b", 3)).toBeNull();
    expect(detectSlashTrigger("/foo bar", 8)).toBeNull();
    expect(detectSlashTrigger("/abc def", 4)?.query).toBe("abc");
    expect(detectSlashTrigger("hi @jo", 6, ["/", "@"])).toMatchObject({ trigger: "@", query: "jo" });
    expect(detectSlashTrigger("hi @jo", 6)).toBeNull();
    expect(detectSlashTrigger("line\n/x", 7)?.start).toBe(5);
  });

  it("tracks the caret in a textarea and can be dismissed", () => {
    const ta = document.createElement("textarea");
    document.body.appendChild(ta);
    const ref = { current: ta };
    const { result } = renderHook(() => useSlashTrigger(ref, ["/", "@"]));
    expect(result.current.match).toBeNull();
    act(() => {
      ta.value = "ask @ma";
      ta.setSelectionRange(7, 7);
      ta.dispatchEvent(new Event("input"));
    });
    expect(result.current.match).toEqual({ trigger: "@", query: "ma", start: 4, end: 7 });
    act(() => result.current.dismiss());
    expect(result.current.match).toBeNull();
    act(() => {
      ta.value = "ask @mar";
      ta.setSelectionRange(8, 8);
      ta.dispatchEvent(new Event("input"));
    });
    expect(result.current.match).toBeNull();
    act(() => {
      ta.value = "ask @mar /s";
      ta.setSelectionRange(11, 11);
      ta.dispatchEvent(new Event("input"));
    });
    expect(result.current.match).toMatchObject({ trigger: "/", query: "s" });
    act(() => result.current.replace("/summarize "));
    expect(ta.value).toBe("ask @mar /summarize ");
    ta.remove();
  });
});

const commands: SlashCommand[] = [
  { id: "summarize", name: "summarize", description: "Summarize the thread" },
  { id: "search", name: "search", description: "Search the web" },
  { id: "image", name: "image", description: "Generate an image", keywords: ["picture"] },
];

function SlashHarness({ onSelect }: { onSelect: (c: SlashCommand) => void }) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = React.useState("");
  return (
    <div>
      <textarea aria-label="Message" ref={ref} value={value} onChange={(e) => setValue(e.target.value)} />
      <SlashMenu anchorRef={ref} commands={commands} onSelect={(c) => onSelect(c)} />
    </div>
  );
}

describe("SlashMenu", () => {
  it("filters, highlights, navigates with arrows and selects with Enter", async () => {
    const onSelect = vi.fn();
    render(<SlashHarness onSelect={onSelect} />);
    const ta = screen.getByRole("textbox", { name: "Message" });
    ta.focus();
    fireEvent.input(ta, { target: { value: "/s" } });
    const list = await screen.findByRole("listbox", { name: "Commands" });
    const opts = within(list).getAllByRole("option");
    expect(opts.map((o) => o.textContent)).toEqual(["/summarizeSummarize the thread", "/searchSearch the web"]);
    expect(opts[0]).toHaveAttribute("aria-selected", "true");
    expect(ta).toHaveAttribute("aria-activedescendant", opts[0]!.id);
    expect(screen.getByText("↑↓")).toBeInTheDocument();
    fireEvent.keyDown(ta, { key: "ArrowDown" });
    expect(within(list).getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.keyDown(ta, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "search" }));
    expect(ta).toHaveValue("");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("highlights the matched substring, matches keywords, Esc closes", async () => {
    render(<SlashHarness onSelect={() => {}} />);
    const ta = screen.getByRole("textbox", { name: "Message" });
    ta.focus();
    fireEvent.input(ta, { target: { value: "try /um" } });
    const list = await screen.findByRole("listbox");
    const mark = list.querySelector("mark");
    expect(mark).toHaveTextContent("um");
    fireEvent.input(ta, { target: { value: "try /pict" } });
    expect(within(screen.getByRole("listbox")).getByRole("option")).toHaveTextContent("image");
    fireEvent.keyDown(ta, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* ModelPicker                                                         */
/* ------------------------------------------------------------------ */

const models: ModelPickerModel[] = [
  { id: "llama", name: "Llama 3.1 8B", state: "stopped", warmSeconds: 40, tags: ["chat"], cost: "free" },
  { id: "qwen", name: "Qwen3 8B", state: "ready", answerSeconds: 3, tags: ["chat"], quality: "good" },
  { id: "phi", name: "Phi-4 mini", state: "asleep", warmSeconds: 4, tags: ["fast"] },
  { id: "gemma", name: "Gemma 27B", state: "failed", tags: ["chat"] },
  { id: "big", name: "DeepSeek 70B", state: "stopped", tags: ["chat"], blockedReason: "not enough memory" },
  { id: "misc", name: "Mystery model", state: "stopped" },
];

describe("ModelPicker", () => {
  it("lists ranked models with shape glyph labels, hints, blocked note and untagged disclosure", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ModelPicker models={models} defaultValue="qwen" onValueChange={onValueChange} />);
    const trigger = screen.getByRole("button", { name: "Model: Qwen3 8B, Ready" });
    await user.click(trigger);
    const pop = await screen.findByRole("dialog");
    expect(within(pop).getAllByRole("img", { name: "Ready" })).toHaveLength(1);
    expect(within(pop).getByRole("img", { name: "Sleeping" })).toBeInTheDocument();
    expect(within(pop).getAllByRole("img", { name: "Stopped" })).toHaveLength(2);
    expect(within(pop).getByRole("img", { name: "Failed" })).toBeInTheDocument();
    const names = within(pop)
      .getAllByRole("button")
      .filter((b) => b.hasAttribute("data-model-option"))
      .map((b) => b.textContent);
    expect(names[0]).toContain("Qwen3 8B");
    expect(names[1]).toContain("Phi-4 mini");
    expect(within(pop).getByText("answers in ~3s")).toBeInTheDocument();
    expect(within(pop).getByText("needs warm-up ~40s")).toBeInTheDocument();
    expect(within(pop).getByText("Unavailable: not enough memory")).toBeInTheDocument();
    expect(within(pop).getByRole("button", { name: /DeepSeek 70B/ })).toBeDisabled();
    expect(within(pop).queryByText("Mystery model")).toBeNull();
    await user.click(within(pop).getByRole("button", { name: "Show 1 untagged" }));
    expect(within(pop).getByText("Mystery model")).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
    await user.click(within(pop).getByRole("button", { name: /Phi-4 mini/ }));
    expect(onValueChange).toHaveBeenCalledWith("phi");
  });

  it("warm up, search and keyboard navigation", async () => {
    const user = userEvent.setup();
    const onWarmUp = vi.fn();
    render(<ModelPicker models={models} defaultValue="qwen" onWarmUp={onWarmUp} />);
    await user.click(screen.getByRole("button", { name: /^Model:/ }));
    const pop = await screen.findByRole("dialog");
    expect(within(pop).queryByRole("button", { name: "Warm up Qwen3 8B" })).toBeNull();
    await user.click(within(pop).getByRole("button", { name: "Warm up Llama 3.1 8B" }));
    expect(onWarmUp).toHaveBeenCalledWith("llama");
    const search = within(pop).getByRole("searchbox", { name: "Search models" });
    await user.type(search, "gem");
    expect(within(pop).getByText("Gemma 27B")).toBeInTheDocument();
    expect(within(pop).queryByText("Qwen3 8B")).toBeNull();
    await user.keyboard("{ArrowDown}");
    const gemma = within(pop).getAllByRole("button", { name: /Gemma 27B/ }).find((b) => b.hasAttribute("data-model-option"));
    expect(gemma).toHaveFocus();
  });
});

/* ------------------------------------------------------------------ */
/* UsageSummary                                                        */
/* ------------------------------------------------------------------ */

describe("UsageSummary", () => {
  const days: UsageDay[] = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10);
    const n = i >= 83 ? 10 : 1;
    return { date: d, requests: n, tokens: n * 1000, waitMs: n * 500, generateMs: n * 1500, models: { qwen: n }, finishReasons: { stop: n } };
  });

  it("switches range and recomputes tiles", async () => {
    const user = userEvent.setup();
    const onRangeChange = vi.fn();
    const { container } = render(<UsageSummary days={days} onRangeChange={onRangeChange} />);
    const requests = () => container.querySelector('[data-stat="requests"]')!;
    expect(requests()).toHaveTextContent("70");
    await user.click(screen.getByRole("radio", { name: "30 days" }));
    expect(onRangeChange).toHaveBeenCalledWith("30");
    expect(requests()).toHaveTextContent("93");
    await user.click(screen.getByRole("radio", { name: "90 days" }));
    expect(requests()).toHaveTextContent("153");
    expect(screen.getByText("Wait vs. generate")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* ConversationSidebarList                                             */
/* ------------------------------------------------------------------ */

describe("ConversationSidebarList", () => {
  const conversations = [
    { id: "a", title: "Trip plan", pinned: true },
    { id: "b", title: "Rust lifetimes", folderId: "work" },
    { id: "c", title: "Recipe ideas" },
    { id: "d", title: "Old thing", archived: true },
  ];
  const folders = [
    { id: "work", name: "Work" },
    { id: "home", name: "Home" },
  ];

  it("groups pinned, folders, chats and archived", async () => {
    const user = userEvent.setup();
    const { container } = render(<ConversationSidebarList conversations={conversations} folders={folders} activeId="c" onPin={() => {}} />);
    expect(screen.getByRole("heading", { name: "Pinned" }).parentElement).toHaveTextContent("Trip plan");
    expect(screen.getByRole("button", { name: "Recipe ideas" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText("Old thing")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Archived/ }));
    expect(screen.getByText("Old thing")).toBeInTheDocument();
    const work = screen.getByRole("button", { name: /^Work/ });
    expect(work).toHaveAttribute("aria-expanded", "true");
    await user.click(work);
    expect(screen.queryByText("Rust lifetimes")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("pins, moves to a folder via submenu and renames inline", async () => {
    const user = userEvent.setup();
    const onPin = vi.fn();
    const onMove = vi.fn();
    const onRename = vi.fn();
    const onRenameFolder = vi.fn();
    render(
      <ConversationSidebarList
        conversations={conversations}
        folders={folders}
        onPin={onPin}
        onMove={onMove}
        onRename={onRename}
        onRenameFolder={onRenameFolder}
        onArchive={() => {}}
        onDelete={() => {}}
      />
    );
    await user.click(screen.getByRole("button", { name: "Actions for Recipe ideas" }));
    await user.click(await screen.findByRole("menuitem", { name: "Pin" }));
    expect(onPin).toHaveBeenCalledWith("c", true);

    await user.click(screen.getByRole("button", { name: "Actions for Recipe ideas" }));
    await user.click(await screen.findByRole("menuitem", { name: "Move to" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Home" }));
    expect(onMove).toHaveBeenCalledWith("c", "home");

    await user.click(screen.getByRole("button", { name: "Actions for Recipe ideas" }));
    await user.click(await screen.findByRole("menuitem", { name: "Rename" }));
    const input = await screen.findByRole("textbox", { name: "Conversation title" });
    await user.clear(input);
    await user.type(input, "Dinner recipes{Enter}");
    expect(onRename).toHaveBeenCalledWith("c", "Dinner recipes");

    await user.click(screen.getByRole("button", { name: "Rename folder Work" }));
    const folderInput = screen.getByRole("textbox", { name: "Folder name" });
    await user.clear(folderInput);
    await user.type(folderInput, "Job{Enter}");
    expect(onRenameFolder).toHaveBeenCalledWith("work", "Job");
  });
});

/* ------------------------------------------------------------------ */
/* Voice                                                               */
/* ------------------------------------------------------------------ */

type MockResult = { isFinal: boolean; length: number; 0: { transcript: string } };
class MockRecognition {
  static last: MockRecognition | null = null;
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((e: { resultIndex: number; results: MockResult[] }) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn(() => this.onend?.());
  constructor() {
    MockRecognition.last = this;
  }
  emit(text: string, isFinal: boolean) {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal, length: 1, 0: { transcript: text } }] });
  }
}

function SRHarness() {
  const sr = useSpeechRecognition({ lang: "en-US" });
  return (
    <div>
      <span data-testid="supported">{String(sr.supported)}</span>
      <span data-testid="listening">{String(sr.listening)}</span>
      <span data-testid="interim">{sr.interim}</span>
      <span data-testid="final">{sr.transcript}</span>
      <span data-testid="error">{sr.error ?? ""}</span>
      <button onClick={sr.start}>start</button>
      <button onClick={sr.stop}>stop</button>
    </div>
  );
}

describe("useSpeechRecognition / VoiceInput", () => {
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  afterEach(() => {
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
  });

  it("is inert when unsupported and VoiceInput hides unless a fallback is given", () => {
    render(<SRHarness />);
    expect(screen.getByTestId("supported")).toHaveTextContent("false");
    fireEvent.click(screen.getByText("start"));
    expect(screen.getByTestId("error")).toHaveTextContent("not-supported");
    expect(screen.getByTestId("listening")).toHaveTextContent("false");
    const { container, rerender } = render(<VoiceInput />);
    expect(container).toBeEmptyDOMElement();
    rerender(<VoiceInput fallback={<span>Voice not available</span>} />);
    expect(screen.getByText("Voice not available")).toBeInTheDocument();
  });

  it("runs a mocked recognition: interim, final, stop", () => {
    w.SpeechRecognition = MockRecognition;
    render(<SRHarness />);
    expect(screen.getByTestId("supported")).toHaveTextContent("true");
    fireEvent.click(screen.getByText("start"));
    const rec = MockRecognition.last!;
    expect(rec.start).toHaveBeenCalled();
    expect(rec.lang).toBe("en-US");
    expect(screen.getByTestId("listening")).toHaveTextContent("true");
    act(() => rec.emit("hel", false));
    expect(screen.getByTestId("interim")).toHaveTextContent("hel");
    act(() => rec.emit("hello", true));
    expect(screen.getByTestId("final")).toHaveTextContent("hello");
    expect(screen.getByTestId("interim")).toBeEmptyDOMElement();
    fireEvent.click(screen.getByText("stop"));
    expect(screen.getByTestId("listening")).toHaveTextContent("false");
  });

  it("VoiceInput toggles, previews interim text and reports the transcript", async () => {
    w.SpeechRecognition = MockRecognition;
    const onTranscript = vi.fn();
    const { container } = render(<VoiceInput onTranscript={onTranscript} maxDuration={30} />);
    const mic = screen.getByRole("button", { name: "Start dictation" });
    expect(mic).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(mic);
    expect(screen.getByRole("button", { name: "Stop dictation" })).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector('[data-slot="voice-timer"]')).toHaveTextContent("0:00 / 0:30");
    const rec = MockRecognition.last!;
    act(() => rec.emit("hello wor", false));
    expect(container.querySelector('[data-slot="voice-interim"]')).toHaveTextContent("hello wor");
    act(() => rec.emit("hello world", true));
    expect(onTranscript).toHaveBeenCalledWith("hello world", { done: false });
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Stop dictation" }));
    expect(onTranscript).toHaveBeenLastCalledWith("hello world", { done: true });
    expect(screen.getByRole("button", { name: "Start dictation" })).toBeInTheDocument();
  });

  it("AudioLevelMeter exposes the level", async () => {
    const { container } = render(<AudioLevelMeter level={0.42} />);
    expect(screen.getByRole("meter", { name: "Input level" })).toHaveAttribute("aria-valuenow", "42");
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("SpeakButton", () => {
  const w = window as unknown as { speechSynthesis?: unknown; SpeechSynthesisUtterance?: unknown };
  function installSynth(voices: Array<{ lang: string; name: string }>) {
    const synth = {
      getVoices: () => voices,
      speak: vi.fn(),
      cancel: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true, writable: true });
    w.SpeechSynthesisUtterance = class {
      text: string;
      lang = "";
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    };
    (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance = w.SpeechSynthesisUtterance;
    return synth;
  }
  afterEach(() => {
    delete w.speechSynthesis;
    delete w.SpeechSynthesisUtterance;
    delete (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
  });

  it("hides without speech synthesis or without a voice for the language", () => {
    const { container, rerender } = render(<SpeakButton text="नमस्ते" lang="hi" />);
    expect(container).toBeEmptyDOMElement();
    installSynth([{ lang: "en-US", name: "Samantha" }]);
    rerender(<SpeakButton key="2" text="नमस्ते" lang="hi" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("speaks and stops with a matching voice", async () => {
    const synth = installSynth([{ lang: "hi-IN", name: "Lekha" }]);
    const { container } = render(<SpeakButton text="नमस्ते" lang="hi" />);
    const btn = screen.getByRole("button", { name: "Listen" });
    fireEvent.click(btn);
    expect(synth.speak).toHaveBeenCalledTimes(1);
    const utterance = synth.speak.mock.calls[0]![0] as { text: string; lang: string; onend: () => void };
    expect(utterance.text).toBe("नमस्ते");
    expect(utterance.lang).toBe("hi-IN");
    expect(screen.getByRole("button", { name: "Stop speaking" })).toHaveAttribute("aria-pressed", "true");
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Stop speaking" }));
    expect(synth.cancel).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Listen" })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Translate                                                           */
/* ------------------------------------------------------------------ */

describe("languages / LanguagePicker", () => {
  it("has ~100 unique languages with rtl flags", () => {
    expect(languages.length).toBeGreaterThanOrEqual(100);
    expect(new Set(languages.map((l) => l.code)).size).toBe(languages.length);
    expect(languages.find((l) => l.code === "ar")?.rtl).toBe(true);
    expect(searchLanguages("ja")[0]?.code).toBe("ja");
  });

  it("searches by native name and code, shows Detect + Recent, and picks with the keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(<LanguagePicker value="en" recent={["fr", "de"]} allowDetect detected="hi" onValueChange={onValueChange} />);
    const list = screen.getByRole("listbox", { name: "Languages" });
    expect(within(list).getByText("Recent")).toBeInTheDocument();
    const opts = within(list).getAllByRole("option");
    expect(opts[0]).toHaveTextContent("Detect languageHindi detected");
    expect(opts[1]).toHaveTextContent("French");
    expect(opts[2]).toHaveTextContent("German");
    expect(await axeViolations(container)).toEqual([]);
    const search = screen.getByRole("combobox", { name: "Search languages" });
    await user.type(search, "हिन्दी");
    expect(within(list).getAllByRole("option")).toHaveLength(1);
    expect(within(list).getByRole("option")).toHaveTextContent("Hindi");
    await user.clear(search);
    await user.type(search, "zh-tw");
    expect(within(list).getAllByRole("option")[0]).toHaveTextContent("Chinese (Traditional)");
    await user.clear(search);
    await user.type(search, "Deu");
    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith("de");
    await user.clear(search);
    await user.type(search, "sp");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onValueChange).toHaveBeenCalledTimes(2);
  });
});

describe("LanguageBar / SwapButton", () => {
  it("disables swap until the language is detected and swaps with it", async () => {
    const user = userEvent.setup();
    const onSource = vi.fn();
    const onTarget = vi.fn();
    const { rerender, container } = render(<LanguageBar source="auto" target="en" recentSources={["hi", "fr"]} recentTargets={["en", "es"]} onSourceChange={onSource} onTargetChange={onTarget} />);
    expect(screen.getByRole("button", { name: "Swap languages" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Detect language" })).toHaveAttribute("aria-pressed", "true");
    expect(await axeViolations(container)).toEqual([]);
    rerender(<LanguageBar source="auto" target="en" detected="hi" recentSources={["hi", "fr"]} recentTargets={["en", "es"]} onSourceChange={onSource} onTargetChange={onTarget} />);
    expect(screen.getByRole("button", { name: "Hindi — detected" })).toBeInTheDocument();
    const swap = screen.getByRole("button", { name: "Swap languages" });
    expect(swap).toBeEnabled();
    await user.click(swap);
    expect(onSource).toHaveBeenCalledWith("en");
    expect(onTarget).toHaveBeenCalledWith("hi");
    await user.click(within(screen.getByRole("group", { name: "Target language" })).getByRole("button", { name: "Spanish" }));
    expect(onTarget).toHaveBeenLastCalledWith("es");
    await user.click(screen.getByRole("button", { name: "More target languages" }));
    await user.type(await screen.findByRole("combobox", { name: "Search languages" }), "日本語{Enter}");
    expect(onTarget).toHaveBeenLastCalledWith("ja");
  });
});

describe("SourcePane / TargetPane", () => {
  it("source pane counts, clears, suggests and sets rtl", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onAccept = vi.fn();
    const { container } = render(<SourcePane value="مرحبا" lang="ar" maxLength={100} onValueChange={onValueChange} suggestion="مرحباً" onAcceptSuggestion={onAccept} />);
    expect(screen.getByRole("textbox", { name: "Text to translate" })).toHaveAttribute("dir", "rtl");
    expect(screen.getByText(/5 \/ 100/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "مرحباً" }));
    expect(onAccept).toHaveBeenCalledWith("مرحباً");
    await user.click(screen.getByRole("button", { name: "Clear text" }));
    expect(onValueChange).toHaveBeenCalledWith("");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("target pane streams with a caret, then shows romanization, alternatives, senses and latency", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const { container, rerender } = render(<TargetPane text="नमस्" lang="hi" streaming />);
    expect(container.querySelector('[data-slot="stream-caret"]')).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Translation" })).toHaveAttribute("aria-busy", "true");
    rerender(
      <TargetPane
        text="नमस्ते"
        lang="hi"
        romanization="namaste"
        alternatives={["नमस्कार"]}
        onPickAlternative={onPick}
        latencyMs={420}
        senses={[{ partOfSpeech: "interjection", terms: ["नमस्ते", "प्रणाम"] }]}
      />
    );
    expect(container.querySelector('[data-slot="stream-caret"]')).toBeNull();
    expect(screen.getByText("namaste")).toBeInTheDocument();
    expect(screen.getByText("420 ms")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "नमस्कार" }));
    expect(onPick).toHaveBeenCalledWith("नमस्कार");
    await user.click(screen.getByRole("button", { name: "Show 2 meanings" }));
    expect(screen.getByText("interjection")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy translation" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

const hindi: Record<string, string[]> = { namaste: ["नमस्ते", "नमस्थे", "नामस्ते"], kaise: ["कैसे", "केसे"] };
function TranslitHarness({ onSelect }: { onSelect?: (c: string, w: string) => void }) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = React.useState("");
  return (
    <>
      <textarea aria-label="Source" ref={ref} value={value} onChange={(e) => setValue(e.target.value)} />
      <TransliterationCandidates anchorRef={ref} lang="hi" getCandidates={(w) => hindi[w.toLowerCase()] ?? []} onSelect={onSelect} />
    </>
  );
}

describe("TransliterationCandidates", () => {
  it("picks a candidate by number", async () => {
    const onSelect = vi.fn();
    render(<TranslitHarness onSelect={onSelect} />);
    const ta = screen.getByRole("textbox", { name: "Source" });
    ta.focus();
    fireEvent.input(ta, { target: { value: "namaste" } });
    const list = await screen.findByRole("listbox", { name: "Candidates for namaste" });
    expect(within(list).getAllByRole("option").map((o) => o.textContent)).toEqual(["1नमस्ते", "2नमस्थे", "3नामस्ते"]);
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.keyDown(ta, { key: "2" });
    expect(ta).toHaveValue("नमस्थे");
    expect(onSelect).toHaveBeenCalledWith("नमस्थे", "namaste");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("arrow + Enter, Space commits with a space, Esc keeps raw", async () => {
    render(<TranslitHarness />);
    const ta = screen.getByRole("textbox", { name: "Source" });
    ta.focus();
    fireEvent.input(ta, { target: { value: "kaise" } });
    await screen.findByRole("listbox");
    fireEvent.keyDown(ta, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(ta, { key: "Enter" });
    expect(ta).toHaveValue("केसे");
    fireEvent.input(ta, { target: { value: "केसे namaste" } });
    await screen.findByRole("listbox");
    fireEvent.keyDown(ta, { key: " " });
    expect(ta).toHaveValue("केसे नमस्ते ");
    fireEvent.input(ta, { target: { value: "केसे नमस्ते kaise" } });
    await screen.findByRole("listbox");
    fireEvent.keyDown(ta, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(ta).toHaveValue("केसे नमस्ते kaise");
  });
});

describe("DictionaryCard", () => {
  it("renders word, phonetic, senses by part of speech and frequency", async () => {
    const { container } = render(
      <DictionaryCard
        word="bank"
        phonetic="/bæŋk/"
        frequency={2}
        senses={[
          { partOfSpeech: "noun", definitions: [{ text: "A financial institution.", example: "I went to the bank.", synonyms: ["lender"] }, { text: "The land beside a river." }] },
          { partOfSpeech: "verb", definitions: [{ text: "To tilt an aircraft." }] },
        ]}
      />
    );
    expect(screen.getByRole("heading", { name: "bank" })).toBeInTheDocument();
    expect(screen.getByText("/bæŋk/")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "noun" })).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("“I went to the bank.”")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "How common" })).toHaveAttribute("aria-valuetext", "Common");
    expect(container.querySelectorAll("[data-lit]")).toHaveLength(2);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ConversationTurns", () => {
  it("shows an empty state, turns and live speaker state", async () => {
    const onMic = vi.fn();
    const { rerender, container } = render(<ConversationTurns left={{ lang: "en" }} right={{ lang: "hi" }} turns={[]} onMicPress={onMic} />);
    expect(screen.getByText("No conversation yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Speak Hindi" }));
    expect(onMic).toHaveBeenCalledWith("right");
    rerender(
      <ConversationTurns
        left={{ lang: "en" }}
        right={{ lang: "hi" }}
        turns={[
          { id: "1", speaker: "left", original: "Where is the station?", translation: "स्टेशन कहाँ है?" },
          { id: "2", speaker: "right", original: "सीधे जाइए", translation: "Go straight" },
        ]}
        live={{ speaker: "left", state: "hearing", level: 0.5, text: "Thank" }}
        onMicPress={onMic}
      />
    );
    const log = screen.getByRole("log", { name: "Conversation" });
    expect(within(log).getAllByRole("listitem")).toHaveLength(2);
    expect(within(log).getByText("Go straight")).toHaveAttribute("lang", "en");
    expect(screen.getByText("Listening…")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "English input level" })).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByRole("button", { name: "Stop listening (English)" })).toHaveAttribute("aria-pressed", "true");
    expect(await axeViolations(container)).toEqual([]);
  });
});
