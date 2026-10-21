import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { TOTPCard, TOTPCode, base32Decode, formatOtpCode, generateTOTP, parseOtpauthUri } from "../src/kits/identity/totp";
import { SecretField, SecretRevealOnce, SecretText } from "../src/kits/identity/secret";
import { RecoveryKey, RecoveryKeyInput, groupRecoveryKey } from "../src/kits/identity/recovery-key";
import { ConsentScreen, ScopeList, ScopeMatrix, formatScope } from "../src/kits/identity/consent";
import { ApiKeyCreateDialog, ApiKeyList, ApiKeyUsage, formatRelativeDate, maskApiKey, type ApiKey } from "../src/kits/identity/api-keys";
import { CredentialCard, CredentialDetail, credentialStatus, type Credential } from "../src/kits/identity/credential-card";
import {
  PaymentCard,
  PaymentCardInput,
  detectCardBrand,
  formatCardNumber,
  luhnCheck,
  validateCardExpiry,
  validateCardNumber,
} from "../src/kits/billing/payment-card";
import { ActivityFeed, ConnectedAppList, groupEventsByDay, type ConnectedApp, type SecurityEvent } from "../src/kits/identity/connected-apps";
import { axeViolations } from "./helpers/a11y";

const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"; // base32("12345678901234567890")
const T0 = Date.UTC(2026, 0, 1); // divisible by 30 s

let writeText: ReturnType<typeof vi.fn>;
beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});
afterEach(() => vi.useRealTimers());

function mockDownloads() {
  const create = vi.fn((_b: Blob) => "blob:mock");
  const revoke = vi.fn();
  const origCreate = URL.createObjectURL;
  const origRevoke = URL.revokeObjectURL;
  URL.createObjectURL = create as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = revoke;
  const names: string[] = [];
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    names.push(this.download);
  });
  return {
    create,
    names,
    restore() {
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
      click.mockRestore();
    },
  };
}

const flush = () => act(async () => {});

/* ------------------------------------------------------------------ */
/* TOTP                                                                */
/* ------------------------------------------------------------------ */

describe("base32Decode", () => {
  it("decodes RFC 4648 vectors", () => {
    const text = (s: string) => new TextDecoder().decode(base32Decode(s));
    expect(text("")).toBe("");
    expect(text("MY======")).toBe("f");
    expect(text("MZXW6===")).toBe("foo");
    expect(text("MZXW6YTBOI======")).toBe("foobar");
    expect(text("mzxw 6ytb oi")).toBe("foobar");
    expect(text(RFC_SECRET)).toBe("12345678901234567890");
  });
  it("throws on invalid characters", () => {
    expect(() => base32Decode("ABC1")).toThrow(/Invalid base32/);
  });
});

describe("generateTOTP (RFC 6238, SHA1, 8 digits)", () => {
  const vectors: [number, string][] = [
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
  ];
  it.each(vectors)("T=%i → %s", async (t, expected) => {
    expect(await generateTOTP(RFC_SECRET, { digits: 8, timestamp: t * 1000 })).toBe(expected);
  });
  it("defaults to 6 digits and accepts raw key bytes", async () => {
    const bytes = new TextEncoder().encode("12345678901234567890");
    expect(await generateTOTP(bytes, { timestamp: 59_000 })).toBe("287082");
  });
  it("supports SHA256", async () => {
    const seed = new TextEncoder().encode("12345678901234567890123456789012");
    expect(await generateTOTP(seed, { digits: 8, algorithm: "SHA256", timestamp: 59_000 })).toBe("46119246");
  });
});

describe("parseOtpauthUri / formatOtpCode", () => {
  it("parses issuer, account and parameters", () => {
    const p = parseOtpauthUri(
      "otpauth://totp/ACME%20Co:john.doe@email.com?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=ACME%20Co&algorithm=SHA256&digits=8&period=60"
    );
    expect(p).toEqual({
      type: "totp",
      label: "ACME Co:john.doe@email.com",
      issuer: "ACME Co",
      account: "john.doe@email.com",
      secret: "HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ",
      algorithm: "SHA256",
      digits: 8,
      period: 60,
      counter: undefined,
    });
  });
  it("applies defaults and falls back to the label issuer", () => {
    const p = parseOtpauthUri("otpauth://totp/GitHub:vyom?secret=jbsw y3dp ehpk 3pxp")!;
    expect(p.issuer).toBe("GitHub");
    expect(p.account).toBe("vyom");
    expect(p.secret).toBe("JBSWY3DPEHPK3PXP");
    expect([p.algorithm, p.digits, p.period]).toEqual(["SHA1", 6, 30]);
  });
  it("rejects invalid URIs", () => {
    expect(parseOtpauthUri("https://example.com")).toBeNull();
    expect(parseOtpauthUri("otpauth://totp/x?issuer=y")).toBeNull();
    expect(parseOtpauthUri("otpauth://totp/x?secret=not*base32")).toBeNull();
  });
  it("groups codes", () => {
    expect(formatOtpCode("123456")).toBe("123 456");
    expect(formatOtpCode("12345678")).toBe("1234 5678");
  });
});

describe("TOTPCode", () => {
  const getCode = (ts: number) => Promise.resolve(String(Math.floor(ts / 30000) % 1_000_000).padStart(6, "0"));
  const value = (c: HTMLElement) => c.querySelector("[data-slot=totp-value]")!.textContent;

  it("counts down, previews the next code and rolls over", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0 + 20_000);
    const onRollover = vi.fn();
    const { container } = render(<TOTPCode getCode={getCode} onRollover={onRollover} label="GitHub" />);
    await flush();
    const counter = Math.floor(T0 / 30000) % 1_000_000;
    expect(value(container)).toBe(formatOtpCode(String(counter)));
    const timer = screen.getByRole("timer");
    expect(timer).toHaveAttribute("data-remaining", "10");
    expect(timer).toHaveAccessibleName("Code refreshes in 10 seconds");
    expect(container.querySelector("[data-slot=totp-next]")).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });
    await flush();
    expect(screen.getByRole("timer")).toHaveAttribute("data-remaining", "4");
    expect(container.querySelector("[data-slot=totp-code]")).toHaveAttribute("data-near-end", "true");
    expect(container.querySelector("[data-slot=totp-next]")).toHaveTextContent(`Next: ${formatOtpCode(String(counter + 1))}`);

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    await flush();
    expect(value(container)).toBe(formatOtpCode(String(counter + 1)));
    expect(screen.getByRole("timer")).toHaveAttribute("data-remaining", "30");
    expect(onRollover).toHaveBeenCalledWith(Math.floor(T0 / 30000) + 1);
  });

  it("generates from a base32 secret and copies the code", async () => {
    vi.spyOn(Date, "now").mockReturnValue(59_000);
    const { container } = render(<TOTPCode secret={RFC_SECRET} digits={8} countdown="linear" />);
    await waitFor(() => expect(value(container)).toBe("9428 7082"));
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await flush();
    expect(writeText).toHaveBeenCalledWith("94287082");
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("uses a server-provided code", () => {
    const { container } = render(<TOTPCode code="123456" />);
    expect(value(container)).toBe("123 456");
  });

  it("TOTPCard has no axe violations", async () => {
    const { container } = render(<TOTPCard issuer="GitHub" account="vyom@sutra.app" code="123456" menu={<button aria-label="More">…</button>} />);
    expect(screen.getByText("vyom@sutra.app")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Secrets                                                             */
/* ------------------------------------------------------------------ */

describe("SecretField", () => {
  it("reveals, auto-hides after revealFor, and copies with a clipboard clear", async () => {
    vi.useFakeTimers();
    render(<SecretField label="Password" value="hunter2!" revealFor={5000} />);
    expect(screen.queryByText("hunter2!")).toBeNull();
    expect(screen.getByText("••••••••")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByText("hunter2!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByText("hunter2!")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Copy password" }));
    await flush();
    expect(writeText).toHaveBeenCalledWith("hunter2!");
    expect(screen.getByRole("status")).toHaveTextContent("Clipboard clears in 30s");
    act(() => vi.advanceTimersByTime(30_000));
    expect(writeText).toHaveBeenLastCalledWith("");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("canvas mode keeps the value out of DOM text", () => {
    const { container } = render(<SecretText value="s3cr3t-value" renderAs="canvas" label="API token" defaultRevealed />);
    expect(screen.getByRole("img", { name: /API token/ })).toBeInstanceOf(HTMLCanvasElement);
    expect(container.textContent).not.toContain("s3cr3t-value");
  });

  it("shows a strength badge", () => {
    render(<SecretText value="abc" strength="auto" />);
    expect(screen.getByText(/weak/i)).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <SecretField label="Password" value="hunter2!" strength={3} description="Last changed 3 days ago" />
        <SecretText value="x" defaultRevealed />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("SecretRevealOnce", () => {
  it("gates Done behind the acknowledgement and downloads the secret", () => {
    const dl = mockDownloads();
    const onDone = vi.fn();
    render(<SecretRevealOnce secret="sk-live-abc123" fileName="key.txt" onDone={onDone} />);
    expect(screen.getByText("sk-live-abc123")).toBeInTheDocument();
    const done = screen.getByRole("button", { name: "Done" });
    expect(done).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(dl.create).toHaveBeenCalledTimes(1);
    expect(dl.names).toEqual(["key.txt"]);
    fireEvent.click(screen.getByRole("checkbox", { name: /stored this key/ }));
    expect(done).toBeEnabled();
    fireEvent.click(done);
    expect(onDone).toHaveBeenCalledTimes(1);
    dl.restore();
  });

  it("has no axe violations", async () => {
    const { container } = render(<SecretRevealOnce secret="sk-live-abc123" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Recovery key                                                        */
/* ------------------------------------------------------------------ */

describe("RecoveryKey", () => {
  const KEY = "abcd-efgh ijkl mnop qrst uvwx";

  it("groups the key and downloads it as a file", async () => {
    const dl = mockDownloads();
    render(<RecoveryKey value={KEY} fileName="kunji-recovery.txt" autoClearAfter={0} />);
    expect(groupRecoveryKey(KEY)).toEqual(["ABCD", "EFGH", "IJKL", "MNOP", "QRST", "UVWX"]);
    const list = screen.getByRole("list", { name: /Recovery key, 6 groups/ });
    expect(within(list).getAllByRole("listitem")).toHaveLength(6);
    expect(within(list).getAllByRole("listitem")[0]).toHaveTextContent("1ABCD");
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(dl.names).toEqual(["kunji-recovery.txt"]);
    const blob = dl.create.mock.calls[0][0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await flush();
    expect(writeText).toHaveBeenCalledWith("ABCD-EFGH-IJKL-MNOP-QRST-UVWX");
    dl.restore();
  });

  it("auto-clears after the countdown and can hide now", () => {
    vi.useFakeTimers();
    const onHide = vi.fn();
    render(<RecoveryKey value={KEY} onHide={onHide} />);
    expect(screen.getByRole("timer")).toHaveTextContent("Hides in 1:00");
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByRole("timer")).toHaveTextContent("Hides in 0:30");
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByText("Key hidden from screen.")).toBeInTheDocument();
    expect(onHide).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Show again" }));
    expect(screen.getByRole("list")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hide now" }));
    expect(screen.queryByRole("list")).toBeNull();
    expect(onHide).toHaveBeenCalledTimes(2);
  });

  it("confirms the last 4 characters", () => {
    const onConfirmed = vi.fn();
    render(<RecoveryKey value={KEY} autoClearAfter={0} onConfirmed={onConfirmed} />);
    fireEvent.click(screen.getByRole("button", { name: "I've saved it" }));
    const input = screen.getByLabelText(/last 4 characters/);
    fireEvent.change(input, { target: { value: "qrst" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(screen.getByRole("alert")).toHaveTextContent("doesn't match");
    expect(onConfirmed).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "uvwx" } });
    expect(input).toHaveValue("UVWX");
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirmed).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("Recovery key saved.");
  });

  it("has no axe violations", async () => {
    const { container } = render(<RecoveryKey value={KEY} share printable />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("RecoveryKeyInput", () => {
  it("formats, normalizes and validates", () => {
    const onValueChange = vi.fn();
    const onComplete = vi.fn();
    render(
      <RecoveryKeyInput
        aria-label="Recovery key"
        length={8}
        onValueChange={onValueChange}
        onComplete={onComplete}
        validate={(v) => (v.startsWith("A") ? true : "Keys start with A")}
      />
    );
    const input = screen.getByRole("textbox", { name: "Recovery key" });
    fireEvent.change(input, { target: { value: "abcd e" } });
    expect(input).toHaveValue("ABCD-E");
    expect(onValueChange).toHaveBeenLastCalledWith("ABCDE");
    expect(screen.getByText("5 / 8 characters")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "bbcd-efgh-zz" } });
    expect(input).toHaveValue("BBCD-EFGH");
    expect(screen.getByText("Keys start with A")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(input, { target: { value: "ABCDEFGH" } });
    expect(onComplete).toHaveBeenCalledWith("ABCDEFGH");
    expect(screen.getByText("Recovery key looks good.")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<RecoveryKeyInput aria-label="Recovery key" defaultValue="ABCD" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Consent                                                             */
/* ------------------------------------------------------------------ */

describe("formatScope", () => {
  it("formats reserved, action and object scopes", () => {
    expect(formatScope("login")).toMatchObject({ label: "Sign in as you", locked: true, risk: "low" });
    expect(formatScope("read:orders")).toMatchObject({ label: "View your orders", action: "read", resource: "orders", risk: "low" });
    expect(formatScope("delete:files").risk).toBe("high");
    expect(formatScope({ id: "pay", max: "50USD", maxUses: 3 })).toMatchObject({
      label: "Make payments on your behalf",
      constraints: "up to $50 · 3 uses",
      risk: "high",
    });
    expect(formatScope("frob:widget_list")).toMatchObject({ label: "Frob widget list", risk: "medium", locked: false });
  });
  it("is extensible", () => {
    const definitions = { "custom:*": { label: (r?: string) => `Custom ${r}`, risk: "low" as const } };
    expect(formatScope("custom:thing", { definitions })).toMatchObject({ label: "Custom thing", risk: "low" });
    expect(formatScope("x:y", { labels: { "x:y": "Read your notes" } }).label).toBe("Read your notes");
  });
});

describe("ScopeList", () => {
  it("toggles optional scopes and locks required ones", () => {
    const onValueChange = vi.fn();
    render(<ScopeList scopes={["login", "read:mail", "email"]} optional={["email", "login"]} onValueChange={onValueChange} />);
    expect(screen.getByText("Included")).toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.getAllByRole("switch")).toHaveLength(1);
    fireEvent.click(screen.getByRole("switch", { name: "Your email address" }));
    expect(onValueChange).toHaveBeenCalledWith(["email"]);
  });
});

describe("ConsentScreen", () => {
  const app = { name: "Acme Shop", domain: "shop.acme.com", verified: true, firstTime: true };
  const credentials = [
    { id: "c1", title: "Age over 18", description: "Issued by Gov ID" },
    { id: "c2", title: "Student card", description: "Issued by Uni" },
  ];

  it("requires a credential and disables Approve when the request expires", async () => {
    vi.useFakeTimers();
    const onExpire = vi.fn();
    render(
      <ConsentScreen app={app} scopes={["login", "read:orders"]} credentials={credentials} expiresAt={Date.now() + 3000} onExpire={onExpire} />
    );
    const approve = screen.getByRole("button", { name: "Approve" });
    expect(approve).toBeDisabled();
    expect(screen.getAllByRole("radio").every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: /Age over 18/ }));
    expect(approve).toBeEnabled();
    expect(screen.getByRole("timer")).toHaveTextContent("Expires in 0:03");
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole("timer")).toHaveTextContent("Request expired");
    expect(approve).toBeDisabled();
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("passes the selection to onApprove", async () => {
    const onApprove = vi.fn();
    render(
      <ConsentScreen
        app={app}
        scopes={["login", "read:orders", "email", "offline_access"]}
        optionalScopes={["email", "offline_access"]}
        profile={{ name: "Vyom" }}
        credentials={credentials}
        onApprove={onApprove}
      />
    );
    expect(screen.getByText("First time connecting to this app")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Your email address" }));
    fireEvent.click(screen.getByRole("switch", { name: "Share your profile" }));
    fireEvent.click(screen.getByRole("radio", { name: /Student card/ }));
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await flush();
    expect(onApprove).toHaveBeenCalledWith({ scopes: ["login", "read:orders", "email"], shareProfile: true, credentialId: "c2" });
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <ConsentScreen
        app={app}
        scopes={["login", "read:orders", { id: "pay", max: "50USD" }]}
        optionalScopes={["pay"]}
        profile={{ name: "Vyom" }}
        credentials={credentials}
        expiresAt={Date.now() + 60_000}
      />
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ScopeMatrix", () => {
  const apps = [
    { id: "mail", name: "Mail" },
    { id: "cal", name: "Calendar", available: ["login", "read:mail"] },
  ];
  it("pre-ticks held scopes, toggles cells and the replace option", () => {
    const onValueChange = vi.fn();
    const onReplace = vi.fn();
    render(
      <ScopeMatrix
        apps={apps}
        scopes={["login", "read:mail", "write:mail"]}
        held={{ mail: ["read:mail"] }}
        onValueChange={onValueChange}
        onReplacePriorChange={onReplace}
      />
    );
    const held = screen.getByRole("checkbox", { name: "Mail: View your mail (already granted)" });
    expect(held).toHaveAttribute("data-state", "checked");
    const login = screen.getByRole("checkbox", { name: "Mail: Sign in as you" });
    expect(login).toBeDisabled();
    expect(login).toHaveAttribute("data-state", "checked");
    expect(screen.getByText("Not available")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Mail: Create and edit mail" }));
    expect(onValueChange).toHaveBeenLastCalledWith({ mail: ["read:mail", "write:mail"], cal: [] });
    fireEvent.click(screen.getByRole("checkbox", { name: "Replace prior grant" }));
    expect(onReplace).toHaveBeenCalledWith(true);
    expect(screen.getByRole("combobox", { name: "Mail expiry" })).toBeInTheDocument();
  });
  it("has no axe violations", async () => {
    const { container } = render(<ScopeMatrix apps={apps} scopes={["login", "read:mail"]} held={{ mail: ["read:mail"] }} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* API keys                                                            */
/* ------------------------------------------------------------------ */

describe("ApiKeyList", () => {
  const NOW = T0;
  const DAY = 86_400_000;
  const keys: ApiKey[] = [
    {
      id: "k1",
      name: "Production",
      key: "sk-live-0000a1b2",
      scopes: ["chat:write", "models:read", "files:read", "files:write"],
      createdAt: NOW - 40 * DAY,
      expiresAt: NOW + 3 * DAY,
      lastUsedAt: NOW - 5 * 60_000,
      usageCount: 12840,
    },
    { id: "k2", name: "Old CI", prefix: "sk-", last4: "9f9f", scopes: ["models:read"], createdAt: NOW - 400 * DAY, expiresAt: NOW - 2 * DAY },
  ];

  it("masks keys, flags expiry and shows +N more", () => {
    render(<ApiKeyList keys={keys} now={NOW} />);
    expect(maskApiKey("sk-live-0000a1b2")).toBe("sk-…a1b2");
    expect(screen.getByText("sk-…a1b2")).toBeInTheDocument();
    expect(screen.getByText("sk-…9f9f")).toBeInTheDocument();
    expect(screen.getByText("Expires in 3 days")).toBeInTheDocument();
    expect(screen.getByText("Expired 2 days ago")).toBeInTheDocument();
    expect(screen.getByText("12,840")).toBeInTheDocument();
    const more = screen.getByRole("button", { name: "Show 2 more scopes for Production" });
    expect(more).toHaveTextContent("+2 more");
    fireEvent.click(more);
    expect(screen.getByRole("dialog", { name: "Scopes for Production" })).toHaveTextContent("files:write");
  });

  it("revokes through a confirm dialog", async () => {
    const onRevoke = vi.fn();
    render(<ApiKeyList keys={keys} now={NOW} onRevoke={onRevoke} onRotate={() => {}} />);
    const trigger = screen.getByRole("button", { name: "Actions for Production" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Revoke" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Revoke “Production”?");
    expect(onRevoke).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Revoke key" }));
    await flush();
    expect(onRevoke).toHaveBeenCalledWith(keys[0]);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("formats relative dates", () => {
    expect(formatRelativeDate(NOW + 3 * DAY, NOW)).toBe("in 3 days");
    expect(formatRelativeDate(NOW - DAY, NOW)).toBe("yesterday");
    expect(formatRelativeDate(NOW - 10_000, NOW)).toBe("just now");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <ApiKeyList keys={keys} now={NOW} onRevoke={() => {}} />
        <ApiKeyUsage rows={[{ label: "/v1/chat", requests: 900, errors: 3 }, { label: "/v1/embed", requests: 120 }]} />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ApiKeyCreateDialog", () => {
  it("validates, creates and shows the secret once", async () => {
    const onCreate = vi.fn().mockResolvedValue({ secret: "sk-new-secret-1234" });
    render(
      <ApiKeyCreateDialog
        defaultOpen
        scopes={[{ value: "chat:write", label: "chat:write" }, { value: "models:read", label: "models:read" }]}
        permissions={[{ value: "evict", label: "Evict models", warning: "Can unload other models" }]}
        onCreate={onCreate}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Create key" }));
    expect(screen.getByText("Give the key a name.")).toBeInTheDocument();
    expect(screen.getByText("Pick at least one scope.")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: /Name/ }), { target: { value: "Laptop" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "chat:write" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Evict models" }));
    expect(screen.getByRole("note")).toHaveTextContent("Can unload other models");
    fireEvent.click(screen.getByRole("button", { name: "Create key" }));
    await flush();
    expect(onCreate).toHaveBeenCalledWith({ name: "Laptop", scopes: ["chat:write"], expiresInDays: 30, permissions: ["evict"] });
    expect(screen.getByText("sk-new-secret-1234")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();
  });
});

/* ------------------------------------------------------------------ */
/* Credentials                                                         */
/* ------------------------------------------------------------------ */

describe("CredentialCard", () => {
  const cred: Credential = {
    id: "age",
    type: "Age over 18",
    kind: "age",
    issuer: { name: "Gov ID", domain: "id.gov.example", verified: true },
    holder: "Vyom",
    issuedAt: Date.UTC(2025, 0, 1),
    expiresAt: Date.UTC(2030, 0, 1),
    unlinkable: true,
    oneTime: true,
    remainingUses: 3,
    claims: [
      { key: "age_over_18", label: "Over 18", value: "Yes", required: true },
      { key: "birthdate", label: "Birthdate", value: "1990-04-01" },
    ],
  };

  it("derives status and renders chips", () => {
    expect(credentialStatus({ expiresAt: Date.UTC(2020, 0, 1) })).toBe("expired");
    expect(credentialStatus({ status: "revoked" })).toBe("revoked");
    const onClick = vi.fn();
    render(<CredentialCard credential={cred} variant="row" onClick={onClick} />);
    expect(screen.getByText("Unlinkable")).toBeInTheDocument();
    expect(screen.getByText("3 uses left")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledWith(cred);
  });

  it("selective disclosure keeps required claims and toggles others", () => {
    const onValueChange = vi.fn();
    render(<CredentialDetail credential={cred} selectable onValueChange={onValueChange} />);
    expect(screen.getByText("Disclose 1 of 2 claims")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Over 18/ })).toBeDisabled();
    expect(screen.getByText("Withheld")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Birthdate" }));
    expect(onValueChange).toHaveBeenCalledWith(["age_over_18", "birthdate"]);
    expect(screen.getByText("1990-04-01")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <CredentialCard credential={cred} />
        <CredentialCard credential={{ ...cred, id: "x", status: "revoked" }} variant="row" />
        <CredentialDetail credential={cred} selectable />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Payment cards                                                       */
/* ------------------------------------------------------------------ */

describe("card helpers", () => {
  it.each([
    ["4111 1111 1111 1111", "visa"],
    ["5555555555554444", "mastercard"],
    ["2223003122003222", "mastercard"],
    ["378282246310005", "amex"],
    ["6011111111111117", "discover"],
    ["6445644564456445", "discover"],
    ["3530111333300000", "jcb"],
    ["6200000000000005", "unionpay"],
    ["6521500000000000", "rupay"],
    ["6080010000000000", "rupay"],
    ["9999", "unknown"],
    ["", "unknown"],
  ])("detectCardBrand(%s) → %s", (n, brand) => {
    expect(detectCardBrand(n)).toBe(brand);
  });

  it("luhnCheck", () => {
    expect(luhnCheck("4242424242424242")).toBe(true);
    expect(luhnCheck("4242 4242 4242 4241")).toBe(false);
    expect(luhnCheck("79927398713")).toBe(true);
    expect(luhnCheck("378282246310005")).toBe(true);
    expect(luhnCheck("1")).toBe(false);
  });

  it("formatCardNumber", () => {
    expect(formatCardNumber("4111111111111111")).toBe("4111 1111 1111 1111");
    expect(formatCardNumber("378282246310005")).toBe("3782 822463 10005");
    expect(formatCardNumber("41111")).toBe("4111 1");
    expect(formatCardNumber("4111-1111-1111-1111-9999")).toBe("4111 1111 1111 1111 999");
    expect(formatCardNumber("37828224631000599")).toBe("3782 822463 10005");
  });

  it("validates numbers and expiry", () => {
    expect(validateCardNumber("4242424242424242")).toEqual({ brand: "visa", complete: true, valid: true });
    expect(validateCardNumber("4242424242424241").valid).toBe(false);
    const now = new Date(2026, 5, 15);
    expect(validateCardExpiry("06/26", now).valid).toBe(true);
    expect(validateCardExpiry("05/26", now).error).toBe("Card has expired");
    expect(validateCardExpiry("13/30", now).error).toBe("Invalid month");
  });
});

describe("PaymentCard", () => {
  it("masks the number, reveals it and flips to a masked CVV", () => {
    const { container } = render(<PaymentCard number="4242424242424242" holder="Vyom Patel" expiry="08/29" cvv="123" />);
    const num = container.querySelector("[data-slot=payment-card-number]")!;
    expect(num).toHaveTextContent("•••• •••• •••• 4242");
    expect(screen.getByText("Card ending in 4242")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Visa" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show card number" }));
    expect(num).toHaveTextContent("4242 4242 4242 4242");
    fireEvent.click(screen.getByRole("button", { name: "Show card back" }));
    expect(container.querySelector("[data-slot=payment-card]")).toHaveAttribute("data-flipped", "true");
    const cvv = container.querySelector("[data-slot=payment-card-cvv]")!;
    expect(cvv).toHaveTextContent("•••");
    fireEvent.click(screen.getByRole("button", { name: "Show security code" }));
    expect(cvv).toHaveTextContent("123");
  });

  it("last-4 only cards can't be revealed", () => {
    const { container } = render(<PaymentCard number="0005" brand="amex" />);
    expect(container.querySelector("[data-slot=payment-card-number]")).toHaveTextContent("•••• •••••• •0005");
    expect(screen.queryByRole("button", { name: "Show card number" })).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = render(<PaymentCard number="5555555555554444" holder="Vyom" expiry="01/30" cvv="321" issuer="Sutra Bank" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("PaymentCardInput", () => {
  it("formats fields, detects the brand and validates", () => {
    const onComplete = vi.fn();
    render(<PaymentCardInput now={new Date(2026, 0, 1)} onComplete={onComplete} />);
    const number = screen.getByRole("textbox", { name: "Card number" });
    fireEvent.change(number, { target: { value: "378282246310006" } });
    expect(number).toHaveValue("3782 822463 10006");
    expect(screen.getByRole("img", { name: "American Express" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Card number is invalid");
    fireEvent.change(number, { target: { value: "4242424242424242" } });
    expect(number).toHaveValue("4242 4242 4242 4242");
    expect(screen.queryByRole("alert")).toBeNull();
    const expiry = screen.getByRole("textbox", { name: "Expiry" });
    fireEvent.change(expiry, { target: { value: "1230" } });
    expect(expiry).toHaveValue("12/30");
    fireEvent.change(expiry, { target: { value: "4" } });
    expect(expiry).toHaveValue("04");
    fireEvent.change(expiry, { target: { value: "04/29" } });
    fireEvent.change(screen.getByRole("textbox", { name: "CVC" }), { target: { value: "12a34" } });
    expect(screen.getByRole("textbox", { name: "CVC" })).toHaveValue("123");
    expect(onComplete).toHaveBeenCalledWith({ number: "4242424242424242", expiry: "04/29", cvc: "123" }, "visa");
  });

  it("has no axe violations", async () => {
    const { container } = render(<PaymentCardInput />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Connected apps + activity                                           */
/* ------------------------------------------------------------------ */

const NOW = new Date(2026, 5, 15, 12, 0).getTime();
const HOUR = 3_600_000;
const events: SecurityEvent[] = [
  { id: "e1", type: "sign_in", description: "Signed in", at: NOW - 2 * HOUR, device: "MacBook Pro", ip: "103.21.4.18", location: "Pune, IN" },
  { id: "e2", type: "key_created", description: "Created API key “Laptop”", at: NOW - 4 * HOUR },
  { id: "e3", type: "revoked", description: "Revoked Acme Shop", at: NOW - 24 * HOUR },
  { id: "e4", type: "sign_in_failed", description: "Failed sign-in", at: NOW - 5 * 24 * HOUR, risk: "danger" },
];

describe("ActivityFeed", () => {
  it("groups events by day and expands details", () => {
    expect(groupEventsByDay(events, NOW).map((g) => [g.label, g.events.length])).toEqual([
      ["Today", 2],
      ["Yesterday", 1],
      [new Date(NOW - 5 * 24 * HOUR).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }), 1],
    ]);
    render(<ActivityFeed events={[...events].reverse()} now={NOW} />);
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.textContent).slice(0, 2)).toEqual(["Today", "Yesterday"]);
    const today = screen.getByRole("region", { name: "Today" });
    expect(within(today).getAllByRole("listitem")).toHaveLength(2);
    expect(within(today).getAllByRole("listitem")[0]).toHaveTextContent("Signed in");
    const row = screen.getByRole("button", { name: /Signed in/ });
    expect(row).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("IP address")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<ActivityFeed events={events} now={NOW} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ConnectedAppList", () => {
  const apps: ConnectedApp[] = [
    {
      id: "agent",
      name: "Research agent",
      kind: "agent",
      scopes: ["login", "read:calendar"],
      lastActiveAt: NOW - HOUR,
      expiresAt: NOW + 2 * 24 * HOUR,
      holderKey: "SHA256:9f2c…41ab",
      devices: [{ id: "d1", name: "Pixel 8", push: true }],
      activity: events.slice(0, 2),
    },
    { id: "shop", name: "Acme Shop", domain: "shop.acme.com", scopes: ["login"], lastActiveAt: NOW - 3 * 24 * HOUR },
  ];

  it("opens details, toggles push and revokes with confirmation", async () => {
    const onRevoke = vi.fn();
    const onPushChange = vi.fn();
    render(<ConnectedAppList apps={apps} now={NOW} onRevoke={onRevoke} onPushChange={onPushChange} />);
    const row = screen.getByRole("button", { name: /Research agent/ });
    expect(row).toHaveTextContent("2 permissions · Active 1h ago · Expires in 2 days");
    fireEvent.click(row);
    const drawer = await screen.findByRole("dialog");
    expect(within(drawer).getByText("SHA256:9f2c…41ab")).toBeInTheDocument();
    expect(within(drawer).getByText("View your calendar")).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole("switch", { name: "Pixel 8" }));
    expect(onPushChange).toHaveBeenCalledWith(apps[0], "d1", false);
    fireEvent.click(within(drawer).getByRole("button", { name: "Revoke access" }));
    const confirm = await screen.findByRole("alertdialog");
    fireEvent.click(within(confirm).getByRole("button", { name: "Revoke" }));
    await flush();
    expect(onRevoke).toHaveBeenCalledWith(apps[0]);
  });

  it("has no axe violations", async () => {
    const { container } = render(<ConnectedAppList apps={apps} now={NOW} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
