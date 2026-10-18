import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { PermissionPrompt } from "../src/kits/ai/permission-prompt";
import { EmbedConsentProvider, RichEmbed, resolveEmbed } from "../src/kits/ai/embeds";
import { TwoFactorSetupCard, buildOtpauthUri } from "../src/blocks/auth-blocks";
import { QRCode } from "../src/kits/identity/qr-code";
import { SecretText } from "../src/kits/identity/secret";
import { useSpeechRecognition, VoiceInput } from "../src/kits/voice/voice";

const flush = () => act(async () => {});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ */
/* 1. PermissionPrompt: global Enter must not hijack other controls     */
/* ------------------------------------------------------------------ */

describe("PermissionPrompt active shortcuts", () => {
  it("Enter / arrows on an outside button are left alone; Enter inside the prompt still decides", () => {
    const onDecision = vi.fn();
    const onStop = vi.fn();
    render(
      <>
        <button onClick={onStop}>Stop agent</button>
        <input aria-label="Notes" />
        <PermissionPrompt tool="bash" target="ls" active onDecision={onDecision} />
      </>
    );
    const stop = screen.getByRole("button", { name: "Stop agent" });
    stop.focus();
    // fireEvent returns false when the event was defaultPrevented.
    expect(fireEvent.keyDown(stop, { key: "Enter" })).toBe(true);
    expect(fireEvent.keyDown(stop, { key: "ArrowDown" })).toBe(true);
    expect(fireEvent.keyDown(stop, { key: "ArrowUp" })).toBe(true);
    expect(onDecision).not.toHaveBeenCalled();

    const notes = screen.getByRole("textbox", { name: "Notes" });
    notes.focus();
    expect(fireEvent.keyDown(notes, { key: "1" })).toBe(true);
    expect(fireEvent.keyDown(notes, { key: "Enter" })).toBe(true);
    expect(onDecision).not.toHaveBeenCalled();

    const radios = screen.getAllByRole("radio");
    radios[1].focus();
    fireEvent.keyDown(radios[1], { key: "Enter" });
    expect(onDecision).toHaveBeenCalledWith(expect.objectContaining({ choice: expect.any(String) }));
  });

  it("still captures keys when nothing interactive is focused (body)", () => {
    const onDecision = vi.fn();
    render(
      <>
        <button>Stop agent</button>
        <PermissionPrompt tool="bash" target="ls" active onDecision={onDecision} />
      </>
    );
    (document.activeElement as HTMLElement | null)?.blur();
    expect(fireEvent.keyDown(document.body, { key: "Enter" })).toBe(false);
    expect(onDecision).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------ */
/* 2. Embeds: Mastodon consent is per origin, https only               */
/* ------------------------------------------------------------------ */

describe("RichEmbed origin-scoped consent", () => {
  const openMenu = (trigger: HTMLElement) => {
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
    if (trigger.getAttribute("aria-expanded") !== "true") fireEvent.keyDown(trigger, { key: "Enter" });
  };

  it("Always allow for mastodon.social does not auto-load another origin with the same path shape", () => {
    const onAllowAlways = vi.fn();
    const onAllowedChange = vi.fn();
    const { container } = render(
      <EmbedConsentProvider onAllowedChange={onAllowedChange}>
        <RichEmbed url="https://mastodon.social/@alice/109876543210" title="Good" onAllowAlways={onAllowAlways} />
        <RichEmbed url="https://evil.example/@a/123456" title="Evil" />
      </EmbedConsentProvider>
    );
    expect(screen.getByText("evil.example", { selector: "span.font-medium" })).toBeInTheDocument();
    openMenu(screen.getAllByRole("button", { name: "More Mastodon options" })[0]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Always allow mastodon.social" }));
    expect(onAllowAlways).toHaveBeenCalledWith("mastodon:https://mastodon.social");
    expect(onAllowedChange).toHaveBeenCalledWith(["mastodon:https://mastodon.social"]);

    const frames = container.querySelectorAll("iframe");
    expect(frames).toHaveLength(1);
    expect(frames[0]).toHaveAttribute("src", "https://mastodon.social/@alice/109876543210/embed");
    expect(frames[0].getAttribute("sandbox")).not.toContain("allow-popups-to-escape-sandbox");
    expect(container.querySelector('[data-provider="mastodon:https://evil.example"]')).toBeInTheDocument();
  });

  it("a legacy provider-wide 'mastodon' grant no longer auto-loads arbitrary origins", () => {
    const { container } = render(
      <EmbedConsentProvider allowed={["mastodon"]}>
        <RichEmbed url="https://evil.example/@a/123456" />
      </EmbedConsentProvider>
    );
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("rejects http: Mastodon URLs (falls back to a link card)", () => {
    expect(resolveEmbed("http://mastodon.social/@alice/109876543210")).toBeNull();
    expect(resolveEmbed("https://mastodon.social/@alice/109876543210")).toMatchObject({
      consentKey: "mastodon:https://mastodon.social",
      domain: "mastodon.social",
    });
    expect(resolveEmbed("https://vimeo.com/76979871")).toMatchObject({ consentKey: "vimeo", domain: "vimeo.com" });
    const { container } = render(
      <EmbedConsentProvider allowed={["mastodon:http://mastodon.social", "mastodon"]}>
        <RichEmbed url="http://mastodon.social/@alice/109876543210" />
      </EmbedConsentProvider>
    );
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector('[data-slot="rich-embed"]')).toHaveAttribute("data-provider", "link");
    expect(container.querySelector('[data-slot="link-preview-card"]')).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* 3. TwoFactorSetupCard renders a real, scannable QR code              */
/* ------------------------------------------------------------------ */

describe("TwoFactorSetupCard QR code", () => {
  const firstPath = (root: ParentNode) => root.querySelector('[data-slot="qr-code"] svg path')?.getAttribute("d");

  it("encodes the otpauth URI built from issuer, account and secret", () => {
    const { container } = render(<TwoFactorSetupCard secret="JBSW Y3DP EHPK 3PXP" account="maya@acme.dev" issuer="Acme" />);
    const qr = container.querySelector('[data-slot="qr-code"]');
    expect(qr).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /QR code to add Acme/ })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "QR code" })).toBeNull(); // the decorative placeholder
    expect(screen.getByText("JBSW Y3DP EHPK 3PXP")).toBeInTheDocument();
    expect(screen.getByText("Acme · maya@acme.dev")).toBeInTheDocument();

    const uri = buildOtpauthUri({ issuer: "Acme", account: "maya@acme.dev", secret: "JBSW Y3DP EHPK 3PXP" });
    expect(uri).toBe("otpauth://totp/Acme:maya%40acme.dev?secret=JBSWY3DPEHPK3PXP&issuer=Acme");
    const ref = render(<QRCode value={uri} size={156} quietZone={0} logo={<span />} />);
    expect(firstPath(container)).toBe(firstPath(ref.container));
  });

  it("uses an explicit otpauthUri when given", () => {
    const uri = "otpauth://totp/Acme:bob?secret=ABCDEFGH&issuer=Acme&digits=8";
    const { container } = render(<TwoFactorSetupCard otpauthUri={uri} />);
    const ref = render(<QRCode value={uri} size={156} quietZone={0} logo={<span />} />);
    expect(firstPath(container)).toBe(firstPath(ref.container));
  });
});

/* ------------------------------------------------------------------ */
/* 4. SecretText clipboard clear survives unmount                       */
/* ------------------------------------------------------------------ */

describe("SecretText clipboard clear", () => {
  const origClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  const origPermissions = Object.getOwnPropertyDescriptor(navigator, "permissions");
  afterEach(() => {
    if (origClipboard) Object.defineProperty(navigator, "clipboard", origClipboard);
    else delete (navigator as { clipboard?: unknown }).clipboard;
    if (origPermissions) Object.defineProperty(navigator, "permissions", origPermissions);
    else delete (navigator as { permissions?: unknown }).permissions;
  });

  function mockClipboard({ readable, granted }: { readable: boolean; granted?: boolean }) {
    let content = "";
    const writeText = vi.fn(async (t: string) => {
      content = t;
    });
    const readText = vi.fn(async () => content);
    Object.defineProperty(navigator, "clipboard", {
      value: readable ? { writeText, readText } : { writeText },
      configurable: true,
    });
    Object.defineProperty(navigator, "permissions", {
      value: granted === undefined ? undefined : { query: vi.fn(async () => ({ state: granted ? "granted" : "prompt" })) },
      configurable: true,
    });
    return { writeText, readText, set: (t: string) => (content = t) };
  }

  it("still clears the clipboard after the component unmounts", async () => {
    vi.useFakeTimers();
    const clip = mockClipboard({ readable: false });
    const { unmount } = render(<SecretText value="unmount-secret" clipboardClearAfter={1000} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy secret" }));
    await flush();
    expect(clip.writeText).toHaveBeenCalledWith("unmount-secret");
    unmount();
    act(() => vi.advanceTimersByTime(1000));
    await flush();
    expect(clip.writeText).toHaveBeenLastCalledWith("");
  });

  it("does not wipe the clipboard when it no longer holds the secret (readText permitted)", async () => {
    vi.useFakeTimers();
    const clip = mockClipboard({ readable: true, granted: true });
    const { unmount } = render(<SecretText value="changed-secret" clipboardClearAfter={1000} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy secret" }));
    await flush();
    unmount();
    clip.set("something the user copied later");
    act(() => vi.advanceTimersByTime(1000));
    await flush();
    await flush();
    expect(clip.readText).toHaveBeenCalled();
    expect(clip.writeText).not.toHaveBeenCalledWith("");
  });

  it("clears when the clipboard still holds the secret (readText permitted)", async () => {
    vi.useFakeTimers();
    const clip = mockClipboard({ readable: true, granted: true });
    render(<SecretText value="same-secret" clipboardClearAfter={1000} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy secret" }));
    await flush();
    act(() => vi.advanceTimersByTime(1000));
    await flush();
    await flush();
    expect(clip.writeText).toHaveBeenLastCalledWith("");
  });

  it("falls back to clearing when clipboard-read is not granted (no prompt)", async () => {
    vi.useFakeTimers();
    const clip = mockClipboard({ readable: true, granted: false });
    render(<SecretText value="prompt-secret" clipboardClearAfter={1000} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy secret" }));
    await flush();
    clip.set("other");
    act(() => vi.advanceTimersByTime(1000));
    await flush();
    await flush();
    expect(clip.readText).not.toHaveBeenCalled();
    expect(clip.writeText).toHaveBeenLastCalledWith("");
  });
});

/* ------------------------------------------------------------------ */
/* 5. VoiceInput releases the mic; recognizer restart race              */
/* ------------------------------------------------------------------ */

type MockResult = { isFinal: boolean; length: number; 0: { transcript: string } };
class MockRecognition {
  static last: MockRecognition | null = null;
  static syncEnd = true;
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((e: { resultIndex: number; results: MockResult[] }) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => MockRecognition.syncEnd && this.onend?.());
  abort = vi.fn(() => MockRecognition.syncEnd && this.onend?.());
  constructor() {
    MockRecognition.last = this;
  }
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function fakeStream() {
  const track = { stop: vi.fn() };
  return { stream: { getTracks: () => [track] } as unknown as MediaStream, track };
}

describe("VoiceInput mic stream lifecycle", () => {
  const w = window as unknown as { SpeechRecognition?: unknown };
  const origMedia = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  let pending: ReturnType<typeof deferred<MediaStream>>[];
  beforeEach(() => {
    MockRecognition.syncEnd = true;
    w.SpeechRecognition = MockRecognition;
    pending = [];
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn(() => {
          const d = deferred<MediaStream>();
          pending.push(d);
          return d.promise;
        }),
      },
      configurable: true,
    });
  });
  afterEach(() => {
    delete w.SpeechRecognition;
    if (origMedia) Object.defineProperty(navigator, "mediaDevices", origMedia);
    else delete (navigator as { mediaDevices?: unknown }).mediaDevices;
  });

  it("stops the mic tracks on unmount", async () => {
    const { unmount } = render(<VoiceInput />);
    fireEvent.click(screen.getByRole("button", { name: "Start dictation" }));
    const { stream, track } = fakeStream();
    await act(async () => pending[0].resolve(stream));
    expect(track.stop).not.toHaveBeenCalled();
    unmount();
    expect(track.stop).toHaveBeenCalled();
  });

  it("stops a stream that resolves after dictation was stopped", async () => {
    render(<VoiceInput />);
    fireEvent.click(screen.getByRole("button", { name: "Start dictation" }));
    fireEvent.click(screen.getByRole("button", { name: "Stop dictation" }));
    const { stream, track } = fakeStream();
    await act(async () => pending[0].resolve(stream));
    expect(track.stop).toHaveBeenCalled();
  });

  it("stops a stream that resolves after unmount", async () => {
    const { unmount } = render(<VoiceInput />);
    fireEvent.click(screen.getByRole("button", { name: "Start dictation" }));
    unmount();
    const { stream, track } = fakeStream();
    await act(async () => pending[0].resolve(stream));
    expect(track.stop).toHaveBeenCalled();
  });

  it("an old recognizer's late onend does not end the new session", () => {
    MockRecognition.syncEnd = false;
    function Harness() {
      const sr = useSpeechRecognition();
      return (
        <div>
          <span data-testid="listening">{String(sr.listening)}</span>
          <button onClick={sr.start}>start</button>
        </div>
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByText("start"));
    const first = MockRecognition.last!;
    fireEvent.click(screen.getByText("start"));
    expect(first.abort).toHaveBeenCalled();
    expect(MockRecognition.last).not.toBe(first);
    act(() => first.onend?.());
    act(() => first.onerror?.({ error: "aborted" }));
    expect(screen.getByTestId("listening")).toHaveTextContent("true");
  });
});
