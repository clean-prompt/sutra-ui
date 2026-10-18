import * as React from "react";
import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import {
  KUNJI_RP_SCRIPT_URL,
  KunjiError,
  createKunjiClient,
  createMockKunjiClient,
  createRpScriptAdapter,
  decodeKunjiCompactQr,
  encodeKunjiCodeQr,
  kunjiAsciiFold,
  normalizeKunjiStatus,
  type KunjiClient,
  type KunjiPollResult,
} from "../src/components/kunji-client";
import {
  AccessGate,
  AuthProblem,
  KunjiButton,
  KunjiLink,
  KunjiLinkedBadge,
  KunjiMark,
  KunjiSignIn,
  KunjiSignInView,
  kunjiStatusText,
  useKunjiSignIn,
  type AccessGateAdapter,
  type AuthProblemVariant,
  type KunjiSignInState,
  type KunjiSignInStatus,
} from "../src/components/kunji";
import {
  AwaitingApproval,
  DevicePairingFlow,
  KunjiSignInPage,
  RegisterWithKunji,
  SignInMethods,
  SignedInPanel,
  createMockPairingAdapter,
  validateKunjiHandle,
} from "../src/blocks/kunji-blocks";
import { blockRegistry } from "../src/blocks";
import { axeViolations } from "./a11y";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

interface Call {
  url: string;
  init?: RequestInit;
}

function fakeFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (init?.signal?.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
    return handler(url, init);
  });
  return { fetch: fn as unknown as typeof fetch, calls };
}

const fastMock = (opts: Parameters<typeof createMockKunjiClient>[0] = {}) =>
  createMockKunjiClient({ latency: 5, scanAfter: 30, decideAfter: 30, pollInterval: 10, ...opts });

const liveRegion = (root: ParentNode = document) => root.querySelector("[data-slot=kunji-status]") as HTMLElement;

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

describe("createKunjiClient", () => {
  it("POSTs the session request and builds the exact v2 lean QR payload (K1) and deep link", async () => {
    const { fetch, calls } = fakeFetch(() => json({ sessionId: "c2Vzc2lvbi0x", challenge: "Y2hhbGxlbmdl", expiresAt: 1750000000000 }));
    const client = createKunjiClient({
      sessionUrl: "/kunji/session",
      pollUrl: "/kunji/status",
      appName: "Sutra \u2014 Notes \u2018beta\u2019 \u2728",
      audience: "notes.sutra.app",
      scope: "profile",
      returnUrl: "https://notes.sutra.app/back",
      fetch,
    });
    const session = await client.createSession();

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("/kunji/session");
    expect(calls[0]!.init!.method).toBe("POST");
    expect(JSON.parse(String(calls[0]!.init!.body))).toEqual({
      audience: "notes.sutra.app",
      callbackUrl: "https://notes.sutra.app/kunji/callback",
      appName: "Sutra - Notes 'beta'",
      scope: ["profile"],
    });

    expect(session.qrFormat).toBe("k1");
    expect(session.qrValue).toMatch(/^K1:[A-Z2-7]+$/);
    // Derived default callback is omitted from the lean QR.
    expect(decodeKunjiCompactQr(session.qrValue)).toEqual({
      kunjiAuth: "v2",
      sessionId: "c2Vzc2lvbi0x",
      challenge: "Y2hhbGxlbmdl",
      audience: "notes.sutra.app",
      expiresAt: 1750000000000,
      appName: "Sutra - Notes 'beta'",
      scope: ["profile"],
    });

    const url = new URL(session.deepLink);
    expect(url.origin + url.pathname).toBe("https://app.kunji.cc/");
    const b64 = url.searchParams.get("approve")!.replace(/-/g, "+").replace(/_/g, "/");
    expect(JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)))).toEqual({
      kunjiAuth: "v2",
      mode: "discoverable",
      sessionId: "c2Vzc2lvbi0x",
      challenge: "Y2hhbGxlbmdl",
      audience: "notes.sutra.app",
      callbackUrl: "https://notes.sutra.app/kunji/callback",
      appName: "Sutra - Notes 'beta'",
      expiresAt: 1750000000000,
      returnUrl: "https://notes.sutra.app/back",
      scope: ["profile"],
    });
  });

  it("keeps a custom callback in the QR, resolves relative callbacks, and supports json / KC formats", async () => {
    const { fetch } = fakeFetch(() => json({ data: { sessionId: "abc123", challenge: "deadbeef", expiresAt: 1750000000, code: "123456" } }));
    const jsonClient = createKunjiClient({ sessionUrl: "/s", pollUrl: "/p", audience: "sutra.app", callbackUrl: "/auth/kunji/callback", qrFormat: "json", fetch });
    const s1 = await jsonClient.createSession();
    expect(s1.expiresAt).toBe(1750000000000);
    expect(s1.code).toBe("123456");
    const payload = JSON.parse(s1.qrValue);
    expect(payload.callbackUrl).toBe(`${location.origin}/auth/kunji/callback`);
    expect(payload).not.toHaveProperty("mode");
    expect(payload).not.toHaveProperty("returnUrl");

    const kcClient = createKunjiClient({ sessionUrl: "/s", pollUrl: "/p", audience: "sutra.app", qrFormat: "code", fetch });
    const s2 = await kcClient.createSession();
    expect(s2.qrFormat).toBe("code");
    expect(s2.qrValue).toBe(encodeKunjiCodeQr({ domain: "sutra.app", code: "123456" }));
    expect(s2.qrValue).toMatch(/^KC:[A-Z2-7]+$/);
  });

  it("falls back to K1 when KC is requested without an eager code", async () => {
    const { fetch } = fakeFetch(() => json({ sessionId: "abc", challenge: "def", expiresAt: Date.now() + 1000 }));
    const s = await createKunjiClient({ sessionUrl: "/s", pollUrl: "/p", audience: "a.example", qrFormat: "code", fetch }).createSession();
    expect(s.qrFormat).toBe("k1");
  });

  it("reads appName/audience/callback from configUrl", async () => {
    const { fetch, calls } = fakeFetch((url) =>
      url === "/auth/config"
        ? json({ data: { appName: "Model Gateway", audience: "gw.lab.dev", callbackUrl: "https://gw.lab.dev/relay/cb" } })
        : json({ sessionId: "s", challenge: "c", expiresAt: Date.now() + 1000 })
    );
    const client = createKunjiClient({ configUrl: "/auth/config", sessionUrl: "/auth/session", pollUrl: "/auth/status", fetch });
    const s = await client.createSession();
    expect(calls.map((c) => c.url)).toEqual(["/auth/config", "/auth/session"]);
    expect(s.audience).toBe("gw.lab.dev");
    expect(s.appName).toBe("Model Gateway");
    expect(decodeKunjiCompactQr(s.qrValue).callbackUrl).toBe("https://gw.lab.dev/relay/cb");
  });

  it("maps poll responses and HTTP codes to protocol statuses", async () => {
    let next: Response = json({ status: "pending" });
    const { fetch, calls } = fakeFetch(() => next);
    const client = createKunjiClient({ sessionUrl: "/s", pollUrl: "/kunji/status?x=1", audience: "a.example", fetch });
    expect((await client.checkStatus("id 1")).status).toBe("pending");
    expect(calls[0]!.url).toBe("/kunji/status?x=1&sessionId=id%201");
    next = json({ status: "approved", sub: "abc", customToken: "tok" });
    expect(await client.checkStatus("id")).toMatchObject({ status: "approved", sub: "abc", customToken: "tok" });
    next = json({}, 403);
    expect((await client.checkStatus("id")).status).toBe("not_linked");
    next = json({}, 410);
    expect((await client.checkStatus("id")).status).toBe("expired");
    next = json({ error: { message: "boom" } }, 500);
    await expect(client.checkStatus("id")).rejects.toThrow("boom");
    expect(normalizeKunjiStatus("rejected")).toBe("denied");
    expect(normalizeKunjiStatus("not-linked")).toBe("not_linked");
    expect(normalizeKunjiStatus("weird")).toBe("pending");
  });

  it("polls through scanned to approved, backing off over transient errors", async () => {
    const responses = [json({ status: "pending" }), json({}, 503), json({ status: "scanned" }), json({ status: "approved", sub: "s1" })];
    const { fetch } = fakeFetch(() => responses.shift() ?? json({ status: "pending" }));
    const client = createKunjiClient({ sessionUrl: "/s", pollUrl: "/p", audience: "a.example", pollInterval: 5, fetch });
    const seen: string[] = [];
    const result = await client.poll("sid", undefined, { onStatus: (r) => seen.push(r.status) });
    expect(seen).toEqual(["pending", "scanned"]);
    expect(result).toMatchObject({ status: "approved", sub: "s1", sessionId: "sid" });
  });

  it("returns expired when the session lifetime passes and rejects with AbortError when aborted", async () => {
    const { fetch } = fakeFetch(() => json({ status: "pending" }));
    const client = createKunjiClient({ sessionUrl: "/s", pollUrl: "/p", audience: "a.example", pollInterval: 10, fetch });
    await expect(client.poll("sid", undefined, { expiresAt: Date.now() + 30 })).resolves.toMatchObject({ status: "expired" });
    const ctrl = new AbortController();
    const p = client.poll("sid", ctrl.signal);
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });

  it("mints the short code lazily and submits wallet codes", async () => {
    const { fetch, calls } = fakeFetch((url) => (url === "/code" ? json({ code: "482913" }) : json({ status: "approved", sub: "x" })));
    const client = createKunjiClient({ sessionUrl: "/s", pollUrl: "/p", codeUrl: "/code", codeSubmitUrl: "/code/submit", audience: "a.example", fetch });
    await expect(client.requestCode!("sid")).resolves.toBe("482913");
    expect(JSON.parse(String(calls[0]!.init!.body))).toEqual({ sessionId: "sid" });
    await expect(client.submitCode!("12345678", undefined, "sid")).resolves.toMatchObject({ status: "approved", sub: "x" });
    expect(calls[1]!.url).toBe("/code/submit");
    expect(JSON.parse(String(calls[1]!.init!.body))).toEqual({ code: "12345678", sessionId: "sid" });
    expect(createKunjiClient({ sessionUrl: "/s", pollUrl: "/p", audience: "a" }).requestCode).toBeUndefined();
  });

  it("folds app names to printable ASCII", () => {
    expect(kunjiAsciiFold("CleanPrompt \u2014 Chat \u201Cdev\u201D")).toBe('CleanPrompt - Chat "dev"');
    expect(kunjiAsciiFold("\u2728")).toBe("Sign in");
  });
});

/* ------------------------------------------------------------------ */
/* rp.js adapter                                                       */
/* ------------------------------------------------------------------ */

describe("createRpScriptAdapter", () => {
  afterEach(() => {
    delete (globalThis as { kunji?: unknown }).kunji;
    document.querySelectorAll("script[data-kunji-rp]").forEach((s) => s.remove());
  });

  it("does not inject any script by default, even after rendering every kunji component", async () => {
    const adapter = createRpScriptAdapter();
    render(
      <div>
        <KunjiSignIn client={fastMock()} />
        <KunjiButton client={fastMock()} />
        <KunjiLink client={fastMock()} />
      </div>
    );
    await screen.findAllByRole("img", { name: /kunji sign-in code/ });
    expect(adapter.src).toBe(KUNJI_RP_SCRIPT_URL);
    expect(document.querySelectorAll("script")).toHaveLength(0);
  });

  it("injects the script only when load() is called, once, and resolves window.kunji", async () => {
    const adapter = createRpScriptAdapter({ src: "/vendor/rp.js" });
    const p1 = adapter.load();
    const p2 = adapter.load();
    const scripts = document.querySelectorAll("script[data-kunji-rp]");
    expect(scripts).toHaveLength(1);
    expect(scripts[0]!.getAttribute("src")).toBe("/vendor/rp.js");
    const fake = { render: vi.fn(), signIn: vi.fn(), init: vi.fn() };
    (globalThis as { kunji?: unknown }).kunji = fake;
    scripts[0]!.dispatchEvent(new Event("load"));
    await expect(p1).resolves.toBe(fake);
    await expect(p2).resolves.toBe(fake);

    const el = document.createElement("div");
    const onSuccess = vi.fn();
    const cleanup = await adapter.render(el, { appName: "Sutra \u2014 Id", sessionUrl: "/s", pollUrl: "/p", callbackUrl: "/c" }, onSuccess);
    expect(fake.render).toHaveBeenCalledWith(el, expect.objectContaining({ appName: "Sutra - Id" }));
    el.dispatchEvent(new CustomEvent("kunji:success", { detail: { sub: "abc" } }));
    expect(onSuccess).toHaveBeenCalledWith({ sub: "abc" });
    cleanup();
  });
});

/* ------------------------------------------------------------------ */
/* useKunjiSignIn / KunjiSignIn                                        */
/* ------------------------------------------------------------------ */

describe("KunjiSignIn", () => {
  it("walks loading → ready → scanned → success with matching live-region text, then calls onSuccess", async () => {
    const onSuccess = vi.fn();
    const seen = new Set<KunjiSignInStatus>();
    render(
      <KunjiSignIn
        client={fastMock({ appName: "Sutra Notes", audience: "notes.sutra.app", scanAfter: 60, decideAfter: 60 })}
        successDelay={10}
        onSuccess={onSuccess}
        onStatusChange={(s) => seen.add(s)}
      />
    );
    expect(liveRegion()).toHaveTextContent(kunjiStatusText.loading);
    expect(screen.getByText(/You're signing in to/)).toHaveTextContent("You're signing in to Sutra Notes at notes.sutra.app");
    await screen.findByRole("img", { name: "kunji sign-in code for Sutra Notes" });
    expect(liveRegion()).toHaveTextContent(kunjiStatusText.ready);
    expect(screen.getByRole("timer")).toHaveTextContent(/Expires in \d:\d\d/);
    expect(screen.getByRole("list", { name: "How to sign in" })).toHaveTextContent("notes.sutra.app");
    await waitFor(() => expect(liveRegion()).toHaveTextContent(kunjiStatusText.scanned));
    await waitFor(() => expect(liveRegion()).toHaveTextContent(kunjiStatusText.success));
    expect(document.querySelector("[data-slot=kunji-success]")).toBeInTheDocument();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ status: "approved", sub: expect.any(String) })));
    expect([...seen]).toEqual(["idle", "loading", "ready", "scanned", "success"]);
  });

  it("expires, then refreshes into a new session", async () => {
    const client = fastMock({ ttl: 80, scanAfter: 10_000 });
    const create = vi.spyOn(client, "createSession");
    render(<KunjiSignIn client={client} />);
    await waitFor(() => expect(liveRegion()).toHaveTextContent(kunjiStatusText.expired));
    expect(screen.getByText("Code expired")).toBeInTheDocument();
    // StrictMode mounts twice; every session except the live one must have been aborted.
    const atMount = create.mock.calls.length;
    for (const [signal] of create.mock.calls.slice(0, -1)) expect((signal as AbortSignal).aborted).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Get a new code" }));
    await waitFor(() => expect(liveRegion()).toHaveTextContent(kunjiStatusText.ready));
    expect(create).toHaveBeenCalledTimes(atMount + 1);
  });

  it("shows an error and retries", async () => {
    const good = fastMock({ scanAfter: 10_000 });
    let fail = true;
    const client: KunjiClient = {
      ...good,
      appName: good.appName,
      createSession: (signal) => (fail ? Promise.reject(new KunjiError("Server is down.")) : good.createSession(signal)),
    };
    const onError = vi.fn();
    render(<KunjiSignIn client={client} onError={onError} />);
    await waitFor(() => expect(liveRegion()).toHaveTextContent("Server is down."));
    expect(onError).toHaveBeenCalled();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(liveRegion()).toHaveTextContent(kunjiStatusText.ready));
  });

  it("flags a slow approval after the threshold and offers to start over", async () => {
    render(<KunjiSignIn client={fastMock({ outcome: "never", scanAfter: 10 })} slowAfter={60} />);
    await waitFor(() => expect(liveRegion()).toHaveTextContent("taking longer than usual"));
    expect(liveRegion()).toHaveTextContent(kunjiStatusText.scanned);
    expect(screen.getByRole("button", { name: "Start over" })).toBeInTheDocument();
  });

  it("reports notLinked with link / register actions", async () => {
    const onLink = vi.fn();
    const onRegister = vi.fn();
    render(<KunjiSignIn client={fastMock({ outcome: "notLinked" })} onLink={onLink} onRegister={onRegister} />);
    await waitFor(() => expect(liveRegion()).toHaveTextContent(kunjiStatusText.notLinked));
    fireEvent.click(screen.getByRole("button", { name: "Sign in another way to link" }));
    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
    expect(onLink).toHaveBeenCalled();
    expect(onRegister).toHaveBeenCalled();
  });

  it("reports a denied approval", async () => {
    render(<KunjiSignIn client={fastMock({ outcome: "denied" })} />);
    await waitFor(() => expect(liveRegion()).toHaveTextContent(kunjiStatusText.denied));
    expect(screen.getByText("Sign-in declined")).toBeInTheDocument();
  });

  it("aborts in-flight polling when unmounted", async () => {
    const { fetch, calls } = fakeFetch((url) =>
      url === "/s" ? json({ sessionId: "sid", challenge: "c", expiresAt: Date.now() + 60_000 }) : json({ status: "pending" })
    );
    const client = createKunjiClient({ sessionUrl: "/s", pollUrl: "/p", audience: "a.example", pollInterval: 10, fetch });
    const { unmount } = render(<KunjiSignIn client={client} />);
    await waitFor(() => expect(calls.some((c) => c.url.startsWith("/p"))).toBe(true));
    const signals = calls.map((c) => c.init?.signal).filter(Boolean) as AbortSignal[];
    unmount();
    expect(signals.length).toBeGreaterThan(1);
    expect(signals.every((s) => s.aborted)).toBe(true);
    const count = calls.length;
    await new Promise((r) => setTimeout(r, 50));
    expect(calls.length).toBe(count);
  });

  it("reveals the lazily minted short code", async () => {
    const client = fastMock({ scanAfter: 10_000 });
    const requestCode = vi.spyOn(client, "requestCode" as never);
    render(<KunjiSignIn client={client} />);
    fireEvent.click(await screen.findByRole("button", { name: "Can't scan? Use a code" }));
    expect(requestCode).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("482 913")).toBeInTheDocument();
    expect(screen.getByText("Enter this code in the kunji app")).toBeInTheDocument();
  });

  it("submits a wallet-shown code (reverse flow) and succeeds", async () => {
    const onSuccess = vi.fn();
    const client = fastMock({ scanAfter: 10_000 });
    const { result } = renderHook(() => useKunjiSignIn({ client, onSuccess, successDelay: 0 }));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.canSubmitCode).toBe(true);
    act(() => result.current.submitCode("000000"));
    await waitFor(() => expect(result.current.state.codeStatus).toBe("error"));
    expect(result.current.state.codeError).toMatch(/didn't match/);
    act(() => result.current.submitCode("482913"));
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("renders the code-entry form in enter mode", async () => {
    render(<KunjiSignIn client={fastMock({ scanAfter: 10_000 })} codeMode="enter" codeLength={6} />);
    fireEvent.click(await screen.findByRole("button", { name: "Use a code instead" }));
    expect(screen.getByText("Type the code kunji shows")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Code from kunji" })).toBeInTheDocument();
  });

  it("shows an Open kunji deep link (secondary on desktop, hero when forced)", async () => {
    const { unmount } = render(<KunjiSignIn client={fastMock({ scanAfter: 10_000 })} />);
    const link = await screen.findByRole("link", { name: /On this device\? Open kunji/ });
    expect(link.getAttribute("href")).toMatch(/^https:\/\/app\.kunji\.cc\/\?approve=/);
    unmount();
    render(<KunjiSignIn client={fastMock({ scanAfter: 10_000 })} deepLink="always" />);
    expect(await screen.findByRole("link", { name: "Open kunji" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show QR for another device" }));
    expect(screen.getByRole("img", { name: /kunji sign-in code/ })).toBeInTheDocument();
  });

  it("does not start until asked when autoStart is false", async () => {
    const client = fastMock();
    const create = vi.spyOn(client, "createSession");
    render(<KunjiSignIn client={client} autoStart={false} />);
    expect(create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Show sign-in code" }));
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("passes axe in the ready state for every variant", async () => {
    render(
      <div>
        <KunjiSignIn client={fastMock({ scanAfter: 10_000 })} variant="card" />
        <KunjiSignIn client={fastMock({ scanAfter: 10_000 })} variant="inline" />
        <KunjiSignIn client={fastMock({ scanAfter: 10_000 })} variant="compact" />
      </div>
    );
    await waitFor(() => expect(screen.getAllByRole("img", { name: /kunji sign-in code/ })).toHaveLength(3));
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* KunjiSignInView states gallery                                      */
/* ------------------------------------------------------------------ */

describe("KunjiSignInView", () => {
  const session = {
    sessionId: "sid",
    challenge: "c",
    expiresAt: Date.now() + 90_000,
    audience: "id.sutra.app",
    appName: "Sutra",
    callbackUrl: "https://id.sutra.app/kunji/callback",
    scope: [],
    payload: { kunjiAuth: "v2" as const, sessionId: "sid", challenge: "c", audience: "id.sutra.app", expiresAt: 0 },
    qrValue: "K1:ABCDEF",
    qrFormat: "k1" as const,
    deepLink: "https://app.kunji.cc/?approve=x",
  };
  const statuses: KunjiSignInStatus[] = ["idle", "loading", "ready", "scanned", "success", "expired", "denied", "notLinked", "error"];

  it.each(statuses)("renders %s with the right live-region text and passes axe", async (s) => {
    const state: KunjiSignInState = { status: s, session: s === "idle" || s === "loading" ? undefined : session, slow: false, codeStatus: "idle" };
    const { container } = render(<KunjiSignInView state={state} onStart={() => {}} onRetry={() => {}} onRefresh={() => {}} onLink={() => {}} />);
    expect(liveRegion(container)).toHaveTextContent(kunjiStatusText[s]);
    expect(container.querySelector("[data-slot=kunji-sign-in]")).toHaveAttribute("data-status", s);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("appends the slow notice", () => {
    const { container } = render(<KunjiSignInView state={{ status: "loading", slow: true, codeStatus: "idle" }} onRetry={() => {}} />);
    expect(liveRegion(container)).toHaveTextContent("Preparing sign-in… This is taking longer than usual.");
  });
});

/* ------------------------------------------------------------------ */
/* KunjiButton / KunjiLink / badge / mark                              */
/* ------------------------------------------------------------------ */

describe("KunjiButton, KunjiLink, KunjiLinkedBadge", () => {
  it("KunjiButton opens a dialog with the QR and passes axe", async () => {
    render(<KunjiButton client={fastMock({ scanAfter: 10_000 })} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in with kunji" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/You're signing in to/)).toBeInTheDocument();
    await within(dialog).findByRole("img", { name: /kunji sign-in code/ });
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("KunjiLink scans, confirms with the server and shows Linked ✓", async () => {
    const onLink = vi.fn(async (_r: KunjiPollResult) => {});
    const onLinkedChange = vi.fn();
    render(<KunjiLink client={fastMock({ scanAfter: 10, decideAfter: 10 })} onLink={onLink} onLinkedChange={onLinkedChange} onUnlink={() => {}} />);
    expect(screen.getByText("kunji not linked")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Link kunji" }));
    await screen.findByRole("img", { name: /kunji sign-in code/ });
    await waitFor(() => expect(screen.getByText(/Linked ✓/)).toBeInTheDocument(), { timeout: 3000 });
    expect(onLink).toHaveBeenCalledWith(expect.objectContaining({ status: "approved" }));
    expect(onLinkedChange).toHaveBeenCalledWith(true);
    expect(screen.getByText("kunji linked")).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Unlink" }));
    await waitFor(() => expect(screen.getByText("kunji not linked")).toBeInTheDocument());
  });

  it("KunjiLink surfaces a server error", async () => {
    render(
      <KunjiLink
        client={fastMock({ scanAfter: 10, decideAfter: 10 })}
        onLink={() => {
          throw new Error("That kunji identity is linked to another account.");
        }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Link kunji" }));
    expect(await screen.findByText("That kunji identity is linked to another account.", undefined, { timeout: 3000 })).toBeInTheDocument();
  });

  it("badge and mark render accessibly", async () => {
    const { container } = render(
      <div>
        <KunjiLinkedBadge sub="9f2c41d07be35a18c6e04f9d2b7a13c58e6f0d4a91b2" />
        <KunjiLinkedBadge linked={false} />
        <KunjiMark title="kunji" variant="tile" />
      </div>
    );
    expect(screen.getByText("kunji linked").closest("[title]")).toHaveAttribute("title", "kunji identity 9f2c41…4a91b2");
    expect(screen.getByRole("img", { name: "kunji" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* AccessGate                                                          */
/* ------------------------------------------------------------------ */

describe("AccessGate", () => {
  it("request → pending → approved → collected", async () => {
    let decided = false;
    const adapter: AccessGateAdapter = {
      request: vi.fn(async () => ({ status: "pending" as const, createdAt: Date.now() })),
      check: vi.fn(async () => (decided ? { status: "approved" as const, keyName: "maya-gpu", grant: { resources: ["qwen3-8b"], ttlDays: 30, canEvict: false } } : { status: "pending" as const })),
      claim: vi.fn(async () => {}),
    };
    const onCollected = vi.fn();
    render(
      <AccessGate
        adapter={adapter}
        resourceName="GPU access"
        signedInAs="maya"
        pollInterval={20}
        scopes={[{ value: "evict", label: "Can displace other models" }]}
        onCollected={onCollected}
      />
    );
    expect(screen.getByRole("heading", { name: "Request GPU access" })).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
    const send = screen.getByRole("button", { name: "Send request" });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText("What do you need it for?"), { target: { value: "Benchmarks" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Can displace other models" }));
    fireEvent.click(send);
    await screen.findByRole("heading", { name: "Waiting for approval" });
    expect(adapter.request).toHaveBeenCalledWith({ purpose: "Benchmarks", scopes: ["evict"] });
    expect(screen.getByText(/we'll let you know/)).toBeInTheDocument();
    decided = true;
    await screen.findByRole("heading", { name: "Your access is ready" });
    expect(screen.getByText("qwen3-8b")).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Collect your key" }));
    await screen.findByText(/Key collected/);
    expect(onCollected).toHaveBeenCalled();
  });

  it("denied shows the reason and lets you ask again", async () => {
    render(<AccessGate adapter={{ request: async () => ({ status: "pending" }) }} defaultRecord={{ status: "denied", decidedAt: Date.now() }} />);
    expect(screen.getByRole("heading", { name: "Request declined" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask again" })).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* AuthProblem                                                         */
/* ------------------------------------------------------------------ */

describe("AuthProblem", () => {
  const cases: [AuthProblemVariant, RegExp][] = [
    ["not-owner", /Not an owner of Gateway/],
    ["sso-down", /sign-in is not answering/],
    ["cookie-conflict", /Two sign-ins for this site/],
    ["sign-in-loop", /but not here/],
    ["expired-session", /Your session expired/],
    ["offline", /You're offline/],
  ];
  it.each(cases)("%s renders title, explanation and actions, and passes axe", async (variant, title) => {
    const onRetry = vi.fn();
    const { container } = render(
      <AuthProblem
        variant={variant}
        appName="Gateway"
        accountName="Maya"
        accountHandle="maya"
        onRetry={onRetry}
        onSignIn={() => {}}
        switchAccountHref="#switch"
        providerHref="#suite"
      />
    );
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(container.querySelectorAll("button, a").length).toBeGreaterThan(0);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("offline retries when the browser comes back online", () => {
    const onRetry = vi.fn();
    render(<AuthProblem variant="offline" onRetry={onRetry} fullPage />);
    window.dispatchEvent(new Event("online"));
    expect(onRetry).toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

describe("kunji blocks", () => {
  beforeEach(() => localStorage.clear());

  it("SignInMethods switches tabs and remembers the last method", async () => {
    const onTokenSubmit = vi.fn();
    const { unmount } = render(<SignInMethods client={fastMock({ scanAfter: 10_000 })} rememberKey="test.method" onTokenSubmit={onTokenSubmit} />);
    expect(screen.getByRole("tab", { name: "kunji" })).toHaveAttribute("aria-selected", "true");
    await screen.findByRole("img", { name: /kunji sign-in code/ });
    expect(await axeViolations(document.body)).toEqual([]);
    const tokenTab = screen.getByRole("tab", { name: "Access token" });
    fireEvent.mouseDown(tokenTab);
    fireEvent.click(tokenTab);
    await waitFor(() => expect(tokenTab).toHaveAttribute("aria-selected", "true"));
    expect(localStorage.getItem("test.method")).toBe("token");
    unmount();
    render(<SignInMethods client={fastMock()} rememberKey="test.method" />);
    expect(screen.getByRole("tab", { name: "Access token" })).toHaveAttribute("aria-selected", "true");
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("KunjiSignInPage shows the hero and switches to other ways", async () => {
    render(<KunjiSignInPage client={fastMock({ scanAfter: 10_000 })} />);
    expect(screen.getByRole("heading", { name: "Sign in to Sutra" })).toBeInTheDocument();
    expect(screen.getByText("Other ways to sign in")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Password" }));
    expect(screen.getByRole("heading", { name: "Sign in with password" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to kunji" }));
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("RegisterWithKunji validates the handle live and goes to awaiting approval", async () => {
    expect(validateKunjiHandle("ab")).toContain("length");
    expect(validateKunjiHandle("_alice")).toContain("start");
    expect(validateKunjiHandle("Alice")).toContain("chars");
    expect(validateKunjiHandle("admin", ["admin"])).toEqual(["reserved"]);
    expect(validateKunjiHandle("alice.b-c_1")).toEqual([]);

    const onSubmit = vi.fn(async () => ({ pending: true }));
    render(<RegisterWithKunji joinPolicy="invite" onSubmit={onSubmit} />);
    expect(await axeViolations(document.body)).toEqual([]);
    const handle = screen.getByLabelText("Handle");
    fireEvent.change(handle, { target: { value: "Al" } });
    expect(handle).toHaveValue("al");
    const rules = screen.getByRole("list", { name: "Handle rules" });
    expect(within(rules).getByText(/3 to 32 characters/).closest("li")).not.toHaveAttribute("data-met");
    fireEvent.change(handle, { target: { value: "alice" } });
    expect(within(rules).getAllByRole("listitem").every((li) => li.hasAttribute("data-met"))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Enter the code an admin gave you.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Invitation code"), { target: { value: "INV-42" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "Waiting for approval" });
    expect(onSubmit).toHaveBeenCalledWith({ handle: "alice", name: "alice", invite: "INV-42" });
  });

  it("RegisterWithKunji shows the first-admin note", () => {
    render(<RegisterWithKunji firstAdmin />);
    expect(screen.getByText(/you'll be its admin/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Invitation code")).toBeNull();
  });

  it("AwaitingApproval polls and reports approval", async () => {
    let ok = false;
    const onApproved = vi.fn();
    render(<AwaitingApproval handle="maya" onCheck={() => ok} pollInterval={20} onApproved={onApproved} onSignOut={() => {}} />);
    expect(screen.getByRole("heading", { name: "Waiting for approval" })).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
    ok = true;
    await screen.findByRole("heading", { name: "You're approved" });
    expect(onApproved).toHaveBeenCalled();
  });

  it("SignedInPanel composes AccountPanel with kunji linking", async () => {
    render(<SignedInPanel name="Maya Patel" handle="@maya" client={fastMock()} onSignOut={() => {}} onSignOutEverywhere={() => {}} />);
    expect(screen.getByText("Maya Patel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link kunji" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out everywhere" })).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("DevicePairingFlow: code with 2-minute TTL, then SAS comparison, then linked", async () => {
    const onDone = vi.fn();
    render(<DevicePairingFlow adapter={createMockPairingAdapter({ latency: 5, peerAfter: 40 })} onDone={onDone} />);
    expect(await screen.findByText("4071 8293")).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent(/Expires in (2:00|1:59)/);
    expect(await axeViolations(document.body)).toEqual([]);
    await screen.findByRole("heading", { name: "Do these match?" });
    expect(screen.getByRole("group", { name: "Security code: maple orbit velvet comet" })).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "They match" }));
    await screen.findByRole("heading", { name: "Device linked" });
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ deviceName: "Pixel 8" }));
  });

  it("DevicePairingFlow: mismatch cancels; expired code offers a new one", async () => {
    const { unmount } = render(<DevicePairingFlow adapter={createMockPairingAdapter({ latency: 5, peerAfter: 10 })} />);
    fireEvent.click(await screen.findByRole("button", { name: "They don't match" }));
    await screen.findByRole("heading", { name: "Pairing canceled" });
    unmount();
    render(<DevicePairingFlow adapter={createMockPairingAdapter({ latency: 5, peerAfter: 60_000, ttl: 30 })} />);
    expect(await screen.findByText("This pairing code expired.", undefined, { timeout: 2500 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New code" })).toBeInTheDocument();
  });

  it("DevicePairingFlow new-device side asks for the 8-digit code", async () => {
    render(<DevicePairingFlow side="new" adapter={createMockPairingAdapter({ latency: 5 })} />);
    expect(screen.getByRole("heading", { name: "Pair with your wallet" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Pairing code" })).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("registers every kunji block under the kunji category", () => {
    const ids = blockRegistry.filter((b) => b.category === "kunji").map((b) => b.id);
    expect(ids).toEqual([
      "kunji-sign-in-methods",
      "kunji-sign-in-page",
      "kunji-register",
      "kunji-awaiting-approval",
      "kunji-signed-in-panel",
      "kunji-device-pairing",
    ]);
  });
});

