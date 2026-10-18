import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { encode } from "uqr";
import { QRCode, QRCodeCard } from "../src/kits/identity/qr-code";
import { QRScanner, type QRScannerDetector } from "../src/kits/identity/qr-scanner";
import { SettingsGroup, SettingsRow, SettingsSection, SettingsShell, SettingsDangerZone } from "../src/patterns/settings";
import { KeyValue, KeyValueList } from "../src/primitives/key-value";
import { EmptyState, Note } from "../src/primitives/empty-state";
import { BootScreen, LockScreen } from "../src/patterns/loading-screen";
import { AccountPanel, SessionList, formatSessionLastActive, type Session } from "../src/kits/identity/device-sessions";
import { ThemeToggle } from "../src/patterns/theme-toggle";
import { axeViolations } from "./a11y";

beforeAll(() => {
  if (!document.elementFromPoint) document.elementFromPoint = () => null;
});

/* ------------------------------------------------------------------ */
/* QRCode                                                              */
/* ------------------------------------------------------------------ */

describe("QRCode", () => {
  it("encodes the value into the expected module grid", () => {
    const value = "https://sutra.app/pair/7F3K-92QX";
    const expected = encode(value, { ecc: "M", border: 0 });
    const { container } = render(<QRCode value={value} ecc="M" title="Pairing code" />);
    const svg = screen.getByRole("img", { name: "Pairing code" });
    expect(svg).toHaveAttribute("data-modules", String(expected.size));
    expect(svg).toHaveAttribute("data-ecc", "M");
    // Square modules are drawn as one "M x,y h1v1h-1z" segment each; finders are drawn separately (3 × 33 dark modules).
    const dataPath = container.querySelector("svg > path")!.getAttribute("d")!;
    const drawn = (dataPath.match(/M/g) ?? []).length;
    const dark = expected.data.flat().filter(Boolean).length;
    expect(drawn + 99).toBe(dark);
  });

  it("version 1 for a short value at ECC L", () => {
    render(<QRCode value="HELLO" ecc="L" />);
    const svg = screen.getByRole("img", { name: "QR code" });
    expect(svg).toHaveAttribute("data-modules", "21");
    expect(svg).toHaveAttribute("data-version", "1");
  });

  it("forces ECC H when a logo is shown and draws a plate", () => {
    const { container } = render(<QRCode value="HELLO" ecc="L" logo="/logo.svg" moduleStyle="rounded" />);
    expect(screen.getByRole("img", { name: "QR code" })).toHaveAttribute("data-ecc", "H");
    expect(container.querySelector("[data-slot=qr-code-plate]")).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("src", "/logo.svg");
  });

  it("has no axe violations", async () => {
    const { container } = render(<QRCode value="https://sutra.app" moduleStyle="dots" logo={<span>S</span>} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("QRCodeCard", () => {
  afterEach(() => vi.useRealTimers());

  it("counts down, expires once and offers a refresh", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    const onExpire = vi.fn();
    const onRefresh = vi.fn();
    render(
      <QRCodeCard
        value="https://sutra.app/pair/abc"
        title="Link a device"
        expiresAt={Date.now() + 119_000}
        onExpire={onExpire}
        onRefresh={onRefresh}
      />
    );
    expect(screen.getByRole("timer")).toHaveTextContent("Expires in 1:59");
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByRole("timer")).toHaveTextContent("Expires in 0:59");
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText("Code expired")).toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5_000));
    expect(onExpire).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Refresh code" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("copies the link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<QRCodeCard value="https://sutra.app/pair/abc" caption="Scan with the Sutra app" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://sutra.app/pair/abc"));
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <QRCodeCard value="https://sutra.app/pair/abc" title="Link a device" caption="Scan me" expiresAt={Date.now() + 60_000} />
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* QRScanner                                                           */
/* ------------------------------------------------------------------ */

describe("QRScanner", () => {
  type FakeTrack = { stop: ReturnType<typeof vi.fn>; getCapabilities: () => object; kind: string };
  // `track` is always the most recently opened stream's track (the live one). Each getUserMedia call
  // gets its own stream, like a real camera, so StrictMode's discarded first mount can stop its own
  // stream without looking like the live camera was stopped.
  let track: FakeTrack;
  let tracks: FakeTrack[];
  let getUserMedia: ReturnType<typeof vi.fn>;
  const original = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");

  beforeEach(() => {
    tracks = [];
    getUserMedia = vi.fn().mockImplementation(async () => {
      const t: FakeTrack = { stop: vi.fn(), getCapabilities: () => ({}), kind: "video" };
      tracks.push(t);
      track = t;
      return { getTracks: () => [t], getVideoTracks: () => [t] };
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia, enumerateDevices: vi.fn().mockResolvedValue([]) },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "readyState", { configurable: true, get: () => 4 });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (HTMLMediaElement.prototype as { readyState?: number }).readyState;
    if (original) Object.defineProperty(navigator, "mediaDevices", original);
    else delete (navigator as { mediaDevices?: unknown }).mediaDevices;
  });

  it("requests the rear camera, calls onResult once and stops the camera", async () => {
    const detector: QRScannerDetector = { detect: vi.fn().mockResolvedValue([{ rawValue: "sutra://pair/123" }]) };
    const onResult = vi.fn();
    render(<QRScanner onResult={onResult} detector={detector} fps={20} />);
    expect(screen.getByText("Waiting for camera permission…", { selector: "p:not(.sr-only)" })).toBeInTheDocument();
    await waitFor(() => expect(onResult).toHaveBeenCalledWith("sutra://pair/123"));
    expect(getUserMedia.mock.calls[0]![0].video.facingMode).toEqual({ ideal: "environment" });
    await new Promise((r) => setTimeout(r, 150));
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(track.stop).toHaveBeenCalled();
    expect(screen.getByText("Code scanned")).toBeInTheDocument();
  });

  it("stops tracks on unmount", async () => {
    const detector: QRScannerDetector = { detect: vi.fn().mockResolvedValue([]) };
    const { container, unmount } = render(<QRScanner onResult={vi.fn()} detector={detector} fps={20} />);
    await waitFor(() => expect(container.querySelector("[data-state=scanning]")).toBeInTheDocument());
    await waitFor(() => expect(detector.detect).toHaveBeenCalled());
    expect(track.stop).not.toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
    unmount();
    expect(track.stop).toHaveBeenCalled();
    // No camera stream is left running, including any opened by a discarded StrictMode mount.
    for (const t of tracks) expect(t.stop).toHaveBeenCalled();
  });

  it("shows the denied state with instructions", async () => {
    getUserMedia.mockRejectedValue(Object.assign(new Error("Permission denied"), { name: "NotAllowedError" }));
    const onError = vi.fn();
    const { container } = render(<QRScanner onResult={vi.fn()} onError={onError} detector={{ detect: vi.fn() }} />);
    expect(await screen.findByText("Camera access is blocked", { selector: "p:not(.sr-only)" })).toBeInTheDocument();
    expect(screen.getByText(/Allow camera access/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload image instead" })).toBeInTheDocument();
    expect(onError).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("reports unsupported browsers", () => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
    const { container } = render(<QRScanner onResult={vi.fn()} />);
    expect(container.querySelector("[data-state=unsupported]")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

const sections = [
  { id: "general", label: "General", description: "Name, language" },
  { id: "appearance", label: "Appearance", description: "Theme and density" },
];

function renderShell(props: Partial<React.ComponentProps<typeof SettingsShell>> = {}) {
  return render(
    <SettingsShell sections={sections} {...props}>
      {(id) => <p>{id === "general" ? "General body" : "Appearance body"}</p>}
    </SettingsShell>
  );
}

describe("SettingsShell", () => {
  it("split layout shows nav + the first section", () => {
    const onSectionChange = vi.fn();
    renderShell({ layout: "split", onSectionChange });
    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    expect(within(nav).getByRole("button", { name: "General" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("General body")).toBeInTheDocument();
    fireEvent.click(within(nav).getByRole("button", { name: "Appearance" }));
    expect(onSectionChange).toHaveBeenCalledWith("appearance");
    expect(screen.getByText("Appearance body")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Appearance" })).toBeInTheDocument();
  });

  it("stacked layout drills in and back", () => {
    renderShell({ layout: "stacked" });
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.queryByText("General body")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Appearance/ }));
    expect(screen.getByText("Appearance body")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to settings" }));
    expect(screen.getByRole("button", { name: /General/ })).toBeInTheDocument();
    expect(screen.queryByText("Appearance body")).not.toBeInTheDocument();
  });

  it("closes on Escape unless a nested layer handled it", () => {
    const onClose = vi.fn();
    renderShell({ layout: "split", onClose });
    const prevented = new KeyboardEvent("keydown", { key: "Escape", cancelable: true, bubbles: true });
    prevented.preventDefault();
    window.dispatchEvent(prevented);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("has no axe violations", async () => {
    const { container } = renderShell({ layout: "split" });
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("SettingsRow", () => {
  function Rows({ onCheckedChange = vi.fn(), onNav = vi.fn() }) {
    return (
      <SettingsSection title="Editor" description="How notes look">
        <SettingsGroup title="Writing" footer="Applies to every note.">
          <SettingsRow type="toggle" title="Spell check" description="Underline typos" onCheckedChange={onCheckedChange} />
          <SettingsRow type="toggle" title="Wide mode" disabledReason="Set by front matter" />
          <SettingsRow type="nav" title="Font" value="Inter" onClick={onNav} />
          <SettingsRow title="Version">
            <span>1.2.0</span>
          </SettingsRow>
        </SettingsGroup>
        <SettingsDangerZone description="Irreversible">
          <SettingsRow title="Delete vault">
            <button type="button">Delete</button>
          </SettingsRow>
        </SettingsDangerZone>
      </SettingsSection>
    );
  }

  it("toggles when the whole row is clicked", () => {
    const onCheckedChange = vi.fn();
    render(<Rows onCheckedChange={onCheckedChange} />);
    const sw = screen.getByRole("switch", { name: "Spell check" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    fireEvent.click(screen.getByText("Underline typos"));
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    fireEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "false");
  });

  it("disabledReason disables the control and explains why", () => {
    render(<Rows />);
    const sw = screen.getByRole("switch", { name: "Wide mode" });
    expect(sw).toBeDisabled();
    expect(sw).toHaveAccessibleDescription(/Set by front matter/);
    fireEvent.click(screen.getByText("Wide mode"));
    expect(sw).toHaveAttribute("aria-checked", "false");
  });

  it("nav rows show the value and fire onClick", () => {
    const onNav = vi.fn();
    render(<Rows onNav={onNav} />);
    const row = screen.getByRole("button", { name: /Font/ });
    expect(row).toHaveTextContent("Inter");
    fireEvent.click(row);
    expect(onNav).toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Rows />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* KeyValue                                                            */
/* ------------------------------------------------------------------ */

describe("KeyValue", () => {
  it("renders a dl, placeholders and copies values", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { container } = render(
      <KeyValueList mono>
        <KeyValue label="Host" value="api.sutra.app" copyable />
        <KeyValue label="Region" value={null} />
        <KeyValue label="Token" value="sk_live_123" copyable="sk_live_123_full" />
      </KeyValueList>
    );
    expect(container.querySelector("dl")).toBeInTheDocument();
    expect(container.querySelectorAll("dt")).toHaveLength(3);
    expect(container.querySelectorAll("dd")[1]).toHaveTextContent("—");
    expect(screen.getByText("api.sutra.app")).toHaveAttribute("title", "api.sutra.app");
    fireEvent.click(screen.getByRole("button", { name: "Copy Host" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("api.sutra.app"));
    fireEvent.click(screen.getByRole("button", { name: "Copy Token" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("sk_live_123_full"));
    expect(await axeViolations(container)).toEqual([]);
  });

  it("supports data-driven grid layout", async () => {
    const { container } = render(
      <KeyValueList layout="grid" columns={3} items={[{ label: "CPU", value: "4 cores" }, { label: "RAM", value: "16 GB" }]} />
    );
    expect(container.querySelector("dl")).toHaveAttribute("data-layout", "grid");
    expect(screen.getByText("16 GB")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* EmptyState / Note                                                   */
/* ------------------------------------------------------------------ */

describe("EmptyState and Note", () => {
  it("EmptyState is a labelled region with actions", async () => {
    const { container } = render(
      <div>
        <EmptyState title="No notes yet" description="Create your first note." actions={<button type="button">New note</button>} />
        <EmptyState variant="dashed" illustration="search" title="Nothing matched" size="sm" />
      </div>
    );
    expect(screen.getByRole("region", { name: "No notes yet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New note" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Nothing matched" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("Note uses status/alert roles and aria-busy", async () => {
    const { container } = render(
      <div>
        <Note>Nothing matched “foo”.</Note>
        <Note busy>Loading…</Note>
        <Note tone="error" align="start">
          Couldn't reach the server.
        </Note>
      </div>
    );
    const statuses = screen.getAllByRole("status");
    expect(statuses).toHaveLength(2);
    expect(statuses[1]).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't reach the server.");
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* BootScreen / LockScreen                                             */
/* ------------------------------------------------------------------ */

describe("BootScreen", () => {
  afterEach(() => vi.useRealTimers());

  it("announces status and reveals after the delay", async () => {
    vi.useFakeTimers();
    const { container } = render(<BootScreen fullscreen={false} delay={300} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Checking session…");
    expect(status).not.toHaveAttribute("data-visible");
    act(() => vi.advanceTimersByTime(300));
    expect(status).toHaveAttribute("data-visible", "true");
    vi.useRealTimers();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("LockScreen", () => {
  it("rejects a wrong password, then unlocks with the right one", async () => {
    const onUnlock = vi.fn(async (s: string) => s === "hunter2");
    const { container } = render(<LockScreen mode="password" fullscreen={false} maxAttempts={3} onUnlock={onUnlock} />);
    const input = screen.getByLabelText("Password");
    fireEvent.change(input, { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    expect(await screen.findByText("Incorrect password. 2 attempts remaining.")).toBeInTheDocument();
    expect(input).toHaveValue("");
    fireEvent.change(input, { target: { value: "hunter2" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    await waitFor(() => expect(onUnlock).toHaveBeenLastCalledWith("hunter2"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(""));
    expect(await axeViolations(container)).toEqual([]);
  });

  it("locks out after too many attempts", async () => {
    const onUnlock = vi.fn(async () => false);
    render(<LockScreen mode="password" fullscreen={false} maxAttempts={2} lockoutSeconds={30} onUnlock={onUnlock} />);
    const input = screen.getByLabelText("Password");
    for (let i = 0; i < 2; i++) {
      fireEvent.change(input, { target: { value: "wrong" } });
      fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
      await waitFor(() => expect(onUnlock).toHaveBeenCalledTimes(i + 1));
    }
    expect(await screen.findByText(/Too many attempts\. Try again in/)).toHaveTextContent("0:30");
    expect(input).toBeDisabled();
  });

  it("submits a complete PIN and switches to recovery mode", async () => {
    const onUnlock = vi.fn(async () => true);
    const onRecover = vi.fn(async () => true);
    const onPasskey = vi.fn();
    const { container } = render(
      <LockScreen fullscreen={false} pinLength={4} onUnlock={onUnlock} onRecover={onRecover} onPasskey={onPasskey} />
    );
    const pin = screen.getByLabelText("PIN");
    fireEvent.change(pin, { target: { value: "1234" } });
    await waitFor(() => expect(onUnlock).toHaveBeenCalledWith("1234"));
    fireEvent.click(screen.getByRole("button", { name: "Unlock with passkey" }));
    await waitFor(() => expect(onPasskey).toHaveBeenCalled());
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Use recovery key" }));
    fireEvent.change(screen.getByLabelText("Recovery key"), { target: { value: "AAAA-BBBB" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock with recovery key" }));
    await waitFor(() => expect(onRecover).toHaveBeenCalledWith("AAAA-BBBB"));
    expect(screen.getByRole("button", { name: "Use PIN instead" })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

const NOW = new Date("2026-03-01T12:00:00Z").getTime();
const sessions: Session[] = [
  { id: "s1", name: "MacBook Pro", device: "laptop", browser: "Arc", os: "macOS", location: "Pune, IN", lastActive: NOW, current: true },
  { id: "s2", name: "Pixel 8", device: "phone", browser: "Chrome", os: "Android", ip: "10.0.0.4", lastActive: NOW - 5 * 60_000 },
  { id: "s3", name: "iPad Air", device: "tablet", lastActive: NOW - 3 * 3_600_000 },
  { id: "s4", name: "Living room TV", device: "tv", lastActive: NOW - 26 * 3_600_000 },
];

describe("SessionList", () => {
  it("formats last active times", () => {
    expect(formatSessionLastActive(NOW, NOW)).toBe("Active now");
    expect(formatSessionLastActive(NOW - 5 * 60_000, NOW)).toBe("5 min ago");
    expect(formatSessionLastActive(NOW - 3 * 3_600_000, NOW)).toBe("3h ago");
    expect(formatSessionLastActive(NOW - 26 * 3_600_000, NOW)).toBe("Yesterday");
  });

  it("revokes a session after an inline confirm", async () => {
    const onRevoke = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<SessionList sessions={sessions} onRevoke={onRevoke} onRevokeOthers={vi.fn()} now={NOW} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("This device")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign out MacBook Pro" })).not.toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Sign out Pixel 8" }));
    const row = screen.getByRole("listitem", { name: "Pixel 8" });
    expect(within(row).getByText("Sign out this device?")).toBeInTheDocument();
    fireEvent.click(within(row).getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(onRevoke).toHaveBeenCalledWith("s2"));
  });

  it("signs out all other sessions through a confirm dialog", async () => {
    const onRevokeOthers = vi.fn().mockResolvedValue(undefined);
    render(<SessionList sessions={sessions} onRevokeOthers={onRevokeOthers} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out all other sessions" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("3 other sessions");
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign out others" }));
    await waitFor(() => expect(onRevokeOthers).toHaveBeenCalledTimes(1));
  });

  it("shows loading and empty states", () => {
    const { rerender, container } = render(<SessionList sessions={null} />);
    expect(container.querySelector("[aria-busy=true]")).toBeInTheDocument();
    rerender(<SessionList sessions={[]} />);
    expect(screen.getByRole("region", { name: "No active sessions" })).toBeInTheDocument();
  });
});

describe("AccountPanel", () => {
  it("signs out and confirms sign out everywhere", async () => {
    const onSignOut = vi.fn();
    const onSignOutEverywhere = vi.fn();
    const { container } = render(
      <AccountPanel
        name="Vyom Shah"
        handle="@vyom"
        role="Admin"
        apps={[{ id: "notes", name: "Notes", href: "/notes" }]}
        onSignOut={onSignOut}
        onSignOutEverywhere={onSignOutEverywhere}
      />
    );
    expect(screen.getByRole("link", { name: "Notes" })).toHaveAttribute("href", "/notes");
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(onSignOut).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign out everywhere" }));
    await waitFor(() => expect(onSignOutEverywhere).toHaveBeenCalled());
  });
});

/* ------------------------------------------------------------------ */
/* ThemeToggle                                                         */
/* ------------------------------------------------------------------ */

describe("ThemeToggle", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
  });

  it("cycles light → dark → system and sets the html class", async () => {
    const onValueChange = vi.fn();
    const { container } = render(<ThemeToggle defaultValue="light" storageKey={null} onValueChange={onValueChange} />);
    const button = screen.getByRole("button", { name: /Theme: Light/ });
    expect(document.documentElement).not.toHaveClass("dark");
    fireEvent.click(button);
    expect(onValueChange).toHaveBeenLastCalledWith("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(button).toHaveAccessibleName("Theme: Dark. Switch to System");
    fireEvent.click(button);
    expect(onValueChange).toHaveBeenLastCalledWith("system");
    expect(document.documentElement).not.toHaveClass("dark"); // matchMedia stub: light system
    fireEvent.click(button);
    expect(onValueChange).toHaveBeenLastCalledWith("light");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("two-state toggle and segmented variant", async () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <div>
        <ThemeToggle modes={["light", "dark"]} defaultValue="dark" storageKey={null} applyToDocument={false} />
        <ThemeToggle variant="segmented" value="light" onValueChange={onValueChange} applyToDocument={false} />
      </div>
    );
    const icon = screen.getByRole("button", { name: /Theme: Dark/ });
    fireEvent.click(icon);
    expect(icon).toHaveAccessibleName("Theme: Light. Switch to Dark");
    expect(document.documentElement).not.toHaveClass("dark");
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(onValueChange).toHaveBeenCalledWith("dark");
    expect(await axeViolations(container)).toEqual([]);
  });
});
