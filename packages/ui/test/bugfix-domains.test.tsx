import * as React from "react";
import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { EditorView } from "@codemirror/view";
import { TOTPCode, formatOtpCode, parseOtpauthUri } from "../src/kits/identity/totp";
import { QRCode } from "../src/kits/identity/qr-code";
import { QRScanner, type QRScannerDetector } from "../src/kits/identity/qr-scanner";
import { createKunjiClient, createMockKunjiClient, type KunjiClient } from "../src/kits/identity/kunji-client";
import { useKunjiSignIn } from "../src/kits/identity/kunji";
import { RecoveryKey } from "../src/kits/identity/recovery-key";
import { ScopeList, formatScope } from "../src/kits/identity/consent";
import { CredentialDetail, type Credential } from "../src/kits/identity/credential-card";
import { PaymentCardInput, validateCardNumber } from "../src/kits/billing/payment-card";
import { CheckoutSteps, CreditBalanceCard } from "../src/kits/billing/billing";
import { TodayTimeline, type TimelineItem } from "../src/kits/workspace/today-timeline";
import { MemoryMap, TimeScrubber, type MemoryNode } from "../src/kits/workspace/memory-map";
import { MessageList, type MessengerMessage } from "../src/kits/social/messenger";
import { LanguagePicker, TransliterationCandidates, getLanguage, languageDir } from "../src/kits/voice/translate";
import { extractOutline } from "../src/kits/editor/document-outline";
import { SaveStatus } from "../src/kits/editor/editor-status";
import { CodeEditor, type CodeEditorHandle } from "../src/kits/editor/code-editor";
import { MiniPlayer } from "../src/kits/media/audio-player";
import { DevicePairingFlow, type DevicePairingAdapter } from "../src/blocks/kunji-blocks";
import { NotificationsMenu, type NotificationItem } from "../src/blocks/dropdown-menu-blocks";
import { FeedbackDialog, InviteMembersDialog } from "../src/blocks/modal-dialog-blocks";
import { AppSidebar } from "../src/blocks/sidebar-navigation-blocks";
import { OTPVerifyCard } from "../src/blocks/auth-blocks";
import { SidebarProvider } from "../src/patterns/sidebar-navigation";

/** Wednesday, 14 October 2026, 10:00 local time. */
const NOW = new Date(2026, 9, 14, 10, 0);
const at = (h: number, m = 0, day = 14) => new Date(2026, 9, day, h, m);

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/* ------------------------------------------------------------------ */
/* identity: totp                                                      */
/* ------------------------------------------------------------------ */

describe("totp", () => {
  it("re-resolves the code when getCode changes (another account)", async () => {
    const { rerender } = render(<TOTPCode getCode={() => "111111"} showNext={false} />);
    expect(await screen.findByText("111 111")).toBeInTheDocument();
    rerender(<TOTPCode getCode={() => "222222"} showNext={false} />);
    // Well before the next period rolls over.
    expect(await screen.findByText("222 222", undefined, { timeout: 300 })).toBeInTheDocument();
  });

  it("rejects fractional digits and periods in otpauth URIs", () => {
    const p = parseOtpauthUri("otpauth://totp/A:b?secret=JBSWY3DPEHPK3PXP&digits=6.5&period=0.5")!;
    expect(p.digits).toBe(6);
    expect(p.period).toBe(30);
    expect(parseOtpauthUri("otpauth://totp/A:b?secret=JBSWY3DPEHPK3PXP&digits=8&period=60")).toMatchObject({ digits: 8, period: 60 });
  });

  it("groups odd-length codes without a one-digit tail", () => {
    expect(formatOtpCode("12345")).toBe("123 45");
    expect(formatOtpCode("1234567")).toBe("1234 567");
    expect(formatOtpCode("123456")).toBe("123 456");
    expect(formatOtpCode("12345678")).toBe("1234 5678");
  });
});

/* ------------------------------------------------------------------ */
/* identity: qr-code, qr-scanner                                       */
/* ------------------------------------------------------------------ */

describe("QRCode", () => {
  it("does not crash on data too long for the chosen level", () => {
    const long = "https://sutra.app/pair?d=" + "x".repeat(2500);
    expect(() => render(<QRCode value={long} logo="/logo.png" />)).not.toThrow();
    // Still a scannable code: falls back to a lower level and drops the logo.
    const svg = document.querySelector("svg[data-ecc]");
    expect(svg).not.toBeNull();
    expect(svg).not.toHaveAttribute("data-ecc", "H");
    expect(document.querySelector("[data-slot=qr-code-plate]")).toBeNull();
  });

  it("shows an error state when nothing fits", () => {
    render(<QRCode value={"x".repeat(9000)} />);
    expect(screen.getByRole("img", { name: /too long/i })).toBeInTheDocument();
  });
});

describe("QRScanner", () => {
  const original = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  afterEach(() => {
    vi.restoreAllMocks();
    if (original) Object.defineProperty(navigator, "mediaDevices", original);
    else delete (navigator as { mediaDevices?: unknown }).mediaDevices;
  });

  it("does not switch to scanning when it was paused while play() was pending", async () => {
    const plays: Array<() => void> = [];
    const getUserMedia = vi.fn(async () => {
      const t = { stop: vi.fn(), getCapabilities: () => ({}), kind: "video" };
      return { getTracks: () => [t], getVideoTracks: () => [t] };
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia, enumerateDevices: vi.fn().mockResolvedValue([]) },
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => new Promise<void>((r) => plays.push(r)));
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const detector: QRScannerDetector = { detect: vi.fn().mockResolvedValue([]) };
    const { container, rerender } = render(<QRScanner onResult={vi.fn()} detector={detector} />);
    await waitFor(() => expect(plays.length).toBeGreaterThan(0));
    rerender(<QRScanner onResult={vi.fn()} detector={detector} paused />);
    await act(async () => {
      plays.forEach((r) => r());
      await Promise.resolve();
    });
    expect(container.querySelector("[data-slot=qr-scanner]")).not.toHaveAttribute("data-state", "scanning");
  });
});

/* ------------------------------------------------------------------ */
/* identity: kunji                                                     */
/* ------------------------------------------------------------------ */

describe("kunji submitCode", () => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  it("keeps the server's error message on a non-OK response", async () => {
    const fetch = vi.fn(async () => json({ error: { message: "Code already used" } }, 400));
    const client = createKunjiClient({ sessionUrl: "/s", pollUrl: "/p", codeSubmitUrl: "/c", audience: "a.example", fetch });
    await expect(client.submitCode!("12345678")).rejects.toThrow("Code already used");
  });

  it("keeps polling when a submitted code is accepted but not yet approved", async () => {
    const base = createMockKunjiClient({ latency: 5, scanAfter: 10_000, pollInterval: 10 });
    const client: KunjiClient = { ...base, submitCode: async () => ({ status: "pending" }) };
    const { result } = renderHook(() => useKunjiSignIn({ client }));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    act(() => result.current.submitCode("12345678"));
    await waitFor(() => expect(result.current.state.codeStatus).toBe("idle"));
    await new Promise((r) => setTimeout(r, 30));
    expect(result.current.state.status).toBe("ready");
  });
});

/* ------------------------------------------------------------------ */
/* identity: recovery key print                                        */
/* ------------------------------------------------------------------ */

describe("RecoveryKey print", () => {
  it("keeps the print frame until printing is done", () => {
    vi.useFakeTimers();
    try {
      const print = vi.fn();
      const desc = Object.getOwnPropertyDescriptor(window, "print");
      // jsdom gives each iframe its own window; stub print on every window it creates.
      const origAppend = document.body.appendChild.bind(document.body);
      const spy = vi.spyOn(document.body, "appendChild").mockImplementation(<T extends Node>(node: T): T => {
        const out = origAppend(node);
        if (node instanceof HTMLIFrameElement && node.contentWindow) {
          node.contentWindow.print = print;
          node.contentWindow.focus = () => {};
        }
        return out;
      });
      render(<RecoveryKey value="ABCD-EFGH-IJKL-MNOP" />);
      fireEvent.click(screen.getByRole("button", { name: /print/i }));
      expect(print).toHaveBeenCalled();
      const frame = document.querySelector("iframe")!;
      expect(frame).not.toBeNull();
      act(() => vi.advanceTimersByTime(5000));
      expect(frame.isConnected).toBe(true);
      act(() => {
        frame.contentWindow!.dispatchEvent(new Event("afterprint"));
      });
      expect(frame.isConnected).toBe(false);
      spy.mockRestore();
      if (desc) Object.defineProperty(window, "print", desc);
    } finally {
      vi.useRealTimers();
    }
  });
});

/* ------------------------------------------------------------------ */
/* identity: consent, credential                                       */
/* ------------------------------------------------------------------ */

describe("consent scopes", () => {
  it("does not crash on scope ids that are Object.prototype keys", () => {
    expect(formatScope("constructor", { labels: { other: "x" } }).label).toBe("Constructor");
    expect(formatScope("toString").label).toBe("ToString");
    expect(() => render(<ScopeList scopes={["constructor", "__proto__"]} labels={{}} />)).not.toThrow();
  });

  it("gives every switch a unique label id, even across lists and similar ids", () => {
    render(
      <>
        <ScopeList scopes={["read:orders", "read_orders"]} optional={["read:orders", "read_orders"]} />
        <ScopeList scopes={["read:orders"]} optional={["read:orders"]} />
      </>
    );
    const ids = screen.getAllByRole("switch").map((s) => s.getAttribute("aria-labelledby"));
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(document.querySelectorAll(`[id="${id}"]`)).toHaveLength(1);
  });
});

describe("CredentialDetail", () => {
  const cred: Credential = {
    id: "c1",
    type: "Age",
    issuer: { name: "Gov" },
    claims: [
      { key: "age_over_18", label: "Over 18", value: "Yes", required: true },
      { key: "birthdate", label: "Birthdate", value: "1990-04-01" },
    ],
  };
  it("always discloses required claims, even when value leaves them out", () => {
    const onValueChange = vi.fn();
    render(<CredentialDetail credential={cred} selectable value={["birthdate"]} onValueChange={onValueChange} />);
    expect(screen.queryByText("Withheld")).toBeNull();
    expect(screen.getByRole("checkbox", { name: /Over 18/ })).toBeChecked();
    expect(screen.getByText("Disclose 2 of 2 claims")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Birthdate" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["age_over_18"]);
  });
});

/* ------------------------------------------------------------------ */
/* billing                                                             */
/* ------------------------------------------------------------------ */

describe("payment card", () => {
  it("reads a pasted or autofilled MM/YYYY expiry", () => {
    const onValueChange = vi.fn();
    render(<PaymentCardInput now={NOW} onValueChange={onValueChange} />);
    const expiry = screen.getByLabelText("Expiry");
    fireEvent.change(expiry, { target: { value: "12/2028" } });
    expect(expiry).toHaveValue("12/28");
    expect(screen.queryByText("Card has expired")).toBeNull();
  });

  it("validates 14-digit Diners Club numbers", () => {
    expect(validateCardNumber("36227206271667")).toMatchObject({ complete: true, valid: true });
    expect(validateCardNumber("30569309025904")).toMatchObject({ complete: true, valid: true });
  });
});

describe("billing", () => {
  it("shows why a credit purchase failed", async () => {
    const onBuy = vi.fn().mockRejectedValue(new Error("Card declined"));
    render(<CreditBalanceCard balance={100} dailyBurn={10} onBuy={onBuy} />);
    fireEvent.click(screen.getByRole("button", { name: "Buy credits" }));
    fireEvent.click(await screen.findByRole("button", { name: /^Buy for/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Card declined");
  });

  it("gives each checkout its own radio group name", () => {
    const methods = [{ id: "pm1", last4: "4242" }];
    render(
      <>
        <CheckoutSteps plan={{ name: "Pro", price: 2000 }} paymentMethods={methods} defaultStep="payment" />
        <CheckoutSteps plan={{ name: "Pro", price: 2000 }} paymentMethods={methods} defaultStep="payment" />
      </>
    );
    const names = screen.getAllByRole("radio").map((r) => r.getAttribute("name"));
    expect(names[0]).toBeTruthy();
    expect(names[0]).not.toBe(names[1]);
  });
});

/* ------------------------------------------------------------------ */
/* workspace                                                           */
/* ------------------------------------------------------------------ */

describe("TodayTimeline across midnight", () => {
  it("extends the rail to midnight for an event that ends tomorrow, and hides other days", () => {
    const items: TimelineItem[] = [
      { id: "late", app: "calendar", title: "Late show", start: at(23), end: at(1, 0, 15) },
      { id: "old", app: "calendar", title: "Yesterday thing", start: at(15, 0, 13), end: at(16, 0, 13) },
      { id: "night", app: "calendar", title: "Night shift", start: at(22, 0, 13), end: at(9, 0, 14) },
    ];
    render(<TodayTimeline items={items} now={NOW} />);
    expect(screen.queryByText("Yesterday thing")).toBeNull();
    const late = screen.getByText("Late show").closest("li")!;
    const rail = late.closest("ol")!.parentElement!.parentElement as HTMLElement;
    // Rail starts at 00:00 (the night shift began yesterday) and ends at 24:00.
    expect(rail.style.height).toBe(`${24 * 64}px`);
    expect(late.style.top).toBe(`${23 * 64}px`);
    expect(late.style.height).toBe("64px");
    const night = screen.getByText("Night shift").closest("li")!;
    expect(night.style.top).toBe("0px");
    expect(night.style.height).toBe(`${9 * 64}px`);
  });
});

describe("MemoryMap default time range", () => {
  const T0 = Date.UTC(2026, 0, 1);
  const DAY = 864e5;
  const mk = (n: number): MemoryNode[] =>
    Array.from({ length: n }, (_, i) => ({ id: `n${i}`, label: `Node ${i}`, kind: "memory", createdAt: T0 + i * DAY }));

  it("follows nodes that load after mount while the range is untouched", () => {
    const { rerender } = render(<MemoryMap nodes={[]} staticLayout />);
    rerender(<MemoryMap nodes={mk(2)} staticLayout />);
    expect(screen.getByRole("img", { name: /2 of 2 nodes shown/ })).toBeInTheDocument();
    rerender(<MemoryMap nodes={mk(4)} staticLayout />);
    expect(screen.getByRole("img", { name: /4 of 4 nodes shown/ })).toBeInTheDocument();
  });

  it("TimeScrubber's uncontrolled range follows the node extent", () => {
    const { rerender } = render(<TimeScrubber nodes={mk(2)} />);
    rerender(<TimeScrubber nodes={mk(5)} />);
    expect(screen.getByText("5 of 5 in range")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* social: messenger autoscroll                                        */
/* ------------------------------------------------------------------ */

describe("MessageList autoscroll", () => {
  const msg = (id: string, senderId = "b", minutes = 0): MessengerMessage => ({
    id,
    senderId,
    text: id,
    createdAt: new Date(NOW.getTime() + minutes * 60_000),
  });

  function setup(initial: MessengerMessage[]) {
    const utils = render(<MessageList messages={initial} currentUserId="a" now={NOW} />);
    const log = screen.getByRole("log");
    let top = 0;
    Object.defineProperty(log, "scrollHeight", { configurable: true, get: () => 1000 });
    Object.defineProperty(log, "clientHeight", { configurable: true, get: () => 200 });
    Object.defineProperty(log, "scrollTop", { configurable: true, get: () => top, set: (v: number) => (top = v) });
    return { ...utils, log, getTop: () => top, setTop: (v: number) => (top = v) };
  }

  it("does not yank a reader who scrolled up when a message arrives", () => {
    const first = [msg("m1", "b", 0), msg("m2", "b", 1)];
    const { rerender, log, getTop, setTop } = setup(first);
    setTop(100);
    fireEvent.scroll(log);
    rerender(<MessageList messages={[...first, msg("m3", "b", 2)]} currentUserId="a" now={NOW} />);
    expect(getTop()).toBe(100);
  });

  it("does not jump to the bottom when older history is prepended", () => {
    const first = [msg("m2", "b", 1), msg("m3", "b", 2)];
    const { rerender, getTop, setTop } = setup(first);
    setTop(800);
    rerender(<MessageList messages={[msg("m1", "b", 0), ...first]} currentUserId="a" now={NOW} />);
    expect(getTop()).toBe(800);
  });

  it("still follows new messages at the bottom, and always after sending", () => {
    const first = [msg("m1", "b", 0)];
    const { rerender, log, getTop, setTop } = setup(first);
    setTop(800);
    fireEvent.scroll(log);
    rerender(<MessageList messages={[...first, msg("m2", "b", 1)]} currentUserId="a" now={NOW} />);
    expect(getTop()).toBe(1000);
    setTop(0);
    fireEvent.scroll(log);
    rerender(<MessageList messages={[...first, msg("m2", "b", 1), msg("m3", "a", 2)]} currentUserId="a" now={NOW} />);
    expect(getTop()).toBe(1000);
  });
});

/* ------------------------------------------------------------------ */
/* voice: translate                                                    */
/* ------------------------------------------------------------------ */

describe("translate", () => {
  it("resolves generic and script-tagged Chinese codes", () => {
    expect(getLanguage("zh")?.code).toBe("zh-CN");
    expect(getLanguage("zh-Hans")?.code).toBe("zh-CN");
    expect(getLanguage("zh-Hant")?.code).toBe("zh-TW");
    expect(getLanguage("zh-HK")?.code).toBe("zh-TW");
    expect(getLanguage("zh_TW")?.code).toBe("zh-TW");
    expect(getLanguage("en-GB")?.code).toBe("en");
    expect(languageDir("ar-EG")).toBe("rtl");
  });

  it("LanguagePicker ignores Enter while an IME is composing", () => {
    const onValueChange = vi.fn();
    render(<LanguagePicker autoFocus={false} onValueChange={onValueChange} />);
    const search = screen.getByRole("combobox", { name: "Search languages" });
    fireEvent.change(search, { target: { value: "deu" } });
    fireEvent.keyDown(search, { key: "Enter", isComposing: true });
    fireEvent.keyDown(search, { key: "Enter", keyCode: 229 });
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onValueChange).toHaveBeenCalledWith("de");
  });

  it("TransliterationCandidates hides the previous word's candidates while new ones load", async () => {
    const pending = deferred<string[]>();
    const getCandidates = (w: string) => (w === "na" ? ["ना"] : pending.promise);
    function Harness() {
      const ref = React.useRef<HTMLTextAreaElement>(null);
      const [value, setValue] = React.useState("");
      return (
        <>
          <textarea aria-label="Source" ref={ref} value={value} onChange={(e) => setValue(e.target.value)} />
          <TransliterationCandidates anchorRef={ref} lang="hi" getCandidates={getCandidates} />
        </>
      );
    }
    render(<Harness />);
    const ta = screen.getByRole("textbox", { name: "Source" });
    ta.focus();
    fireEvent.input(ta, { target: { value: "na" } });
    await screen.findByRole("listbox", { name: "Candidates for na" });
    fireEvent.input(ta, { target: { value: "nam" } });
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.keyDown(ta, { key: "Enter" });
    expect(ta).toHaveValue("nam");
    await act(async () => pending.resolve(["नम"]));
    expect(await screen.findByRole("listbox", { name: "Candidates for nam" })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* editor                                                              */
/* ------------------------------------------------------------------ */

describe("editor", () => {
  it("extractOutline never repeats an id", () => {
    const ids = extractOutline("# Foo\n\n# Foo\n\n# Foo 1\n\n# Foo").map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["foo", "foo-1", "foo-1-1", "foo-2"]);
  });

  it("SaveStatus keeps the ticking relative time out of the live region", () => {
    render(<SaveStatus status="saved" savedAt={NOW.getTime() - 120_000} now={NOW} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Saved 2m ago");
    expect(screen.getByText("Saved 2m ago")).toHaveAttribute("aria-hidden", "true");
    expect(within(status).getByText("Saved", { selector: ".sr-only" })).toBeInTheDocument();
  });

  it("CodeEditor keeps unsaved text when it remounts", () => {
    const ref = React.createRef<CodeEditorHandle>();
    const Host = ({ mode }: { mode: "visible" | "hidden" }) => (
      <React.Activity mode={mode}>
        <CodeEditor ref={ref} defaultValue="hello" />
      </React.Activity>
    );
    const { rerender } = render(<Host mode="visible" />);
    act(() => void ref.current!.replaceRange(5, 5, " world"));
    expect(ref.current!.getValue()).toBe("hello world");
    rerender(<Host mode="hidden" />);
    rerender(<Host mode="visible" />);
    expect(ref.current!.getValue()).toBe("hello world");
  });

  it("CodeEditor does not reconfigure for a new array with the same extensions", () => {
    let updates = 0;
    const ext = EditorView.updateListener.of(() => {
      updates++;
    });
    const { rerender } = render(<CodeEditor defaultValue="x" extensions={[ext]} />);
    const before = updates;
    rerender(<CodeEditor defaultValue="x" extensions={[ext]} />);
    rerender(<CodeEditor defaultValue="x" extensions={[ext]} />);
    expect(updates).toBe(before);
  });
});

/* ------------------------------------------------------------------ */
/* media                                                               */
/* ------------------------------------------------------------------ */

describe("MiniPlayer live stream", () => {
  it("handles an Infinity duration", () => {
    const onSeek = vi.fn();
    render(<MiniPlayer track={{ id: "t", title: "Live radio" }} playing currentTime={30} duration={Infinity} onSeek={onSeek} layout="compact" />);
    const bar = screen.getByRole("progressbar", { name: "Playback progress" });
    expect(bar.getAttribute("aria-valuemax")).not.toBe("Infinity");
    vi.spyOn(bar, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 100, height: 4, right: 100, bottom: 4, x: 0, y: 0, toJSON() {} } as DOMRect);
    fireEvent.click(bar, { clientX: 50 });
    expect(onSeek).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* blocks                                                              */
/* ------------------------------------------------------------------ */

describe("blocks", () => {
  it("DevicePairingFlow does not restart when the parent re-renders with an inline adapter", async () => {
    const createPairing = vi.fn(async () => ({ code: "12345678", qrValue: "q", expiresAt: Date.now() + 120_000 }));
    const waitForPeer = () => new Promise<never>(() => {});
    let rerenderParent!: () => void;
    function Parent() {
      const [, setN] = React.useState(0);
      rerenderParent = () => setN((n) => n + 1);
      const adapter: DevicePairingAdapter = { createPairing, waitForPeer, confirm: async () => {} };
      return <DevicePairingFlow adapter={adapter} />;
    }
    render(<Parent />);
    expect(await screen.findByText("1234 5678")).toBeInTheDocument();
    const calls = createPairing.mock.calls.length;
    act(() => rerenderParent());
    act(() => rerenderParent());
    expect(createPairing.mock.calls.length).toBe(calls);
    expect(screen.getByText("1234 5678")).toBeInTheDocument();
  });

  it("NotificationsMenu shows new notifications passed without a change handler", () => {
    const n = (id: string, unread = true): NotificationItem => ({ id, actor: { name: `Actor ${id}` }, message: `did ${id}`, time: "now", unread });
    const { rerender } = render(<NotificationsMenu notifications={[n("a")]} defaultOpen />);
    expect(screen.getByText("Actor a")).toBeInTheDocument();
    rerender(<NotificationsMenu notifications={[n("a"), n("b")]} defaultOpen />);
    expect(screen.getByText("Actor b")).toBeInTheDocument();
  });

  it("InviteMembersDialog follows a new members prop without a change handler", () => {
    const m = (id: string) => ({ id, name: `Person ${id}`, email: `${id}@x.dev`, role: "member" });
    const { rerender } = render(<InviteMembersDialog defaultOpen members={[m("a")]} />);
    expect(screen.getByText("Person a")).toBeInTheDocument();
    rerender(<InviteMembersDialog defaultOpen members={[m("a"), m("b")]} />);
    expect(screen.getByText("Person b")).toBeInTheDocument();
  });

  it("FeedbackDialog's rating label id is unique per instance", () => {
    render(<FeedbackDialog defaultOpen />);
    expect(document.getElementById("feedback-rating-label")).toBeNull();
    const label = screen.getByText("How would you rate your experience?");
    expect(label.id).toBeTruthy();
    expect(document.querySelector(`[aria-labelledby="${label.id}"]`)).not.toBeNull();
  });

  it("AppSidebar shows 0% for an empty storage quota", () => {
    render(
      <SidebarProvider>
        <AppSidebar storage={{ used: 0, total: 0 }} />
      </SidebarProvider>
    );
    expect(screen.queryByText("NaN%")).toBeNull();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("OTPVerifyCard keeps the ticking resend countdown out of the live region", () => {
    render(<OTPVerifyCard email="a@b.dev" resendSeconds={30} />);
    const ticking = screen.getByText(/Resend in/);
    expect(ticking.closest("[aria-hidden=true]")).not.toBeNull();
  });
});
