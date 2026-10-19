import * as React from "react";
import {
  AccessGate,
  AuthProblem,
  AwaitingApproval,
  Button,
  DevicePairingFlow,
  KunjiButton,
  KunjiLink,
  KunjiLinkedBadge,
  KunjiMark,
  KunjiSignIn,
  KunjiSignInPage,
  KunjiSignInView,
  RegisterWithKunji,
  SegmentedControl,
  SignedInPanel,
  SignInMethods,
  buildKunjiSession,
  defaultKunjiCallbackUrl,
  type AccessGateAdapter,
  type AccessGateRecord,
  type AuthProblemVariant,
  type KunjiMockOutcome,
  type KunjiSignInState,
  type KunjiSignInStatus,
} from "@sutra/ui";
import { createMockKunjiClient, createMockPairingAdapter } from "@sutra/ui/blocks/registry";
import { RiRefreshLine } from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Mock data                                                           */
/* ------------------------------------------------------------------ */

const AUDIENCE = "id.sutra.app";

const gallerySession = buildKunjiSession(
  { sessionId: "demo-session", challenge: "demo-challenge-0f9a", expiresAt: Date.now() + 10 * 60_000 },
  { audience: AUDIENCE, appName: "Sutra", callbackUrl: defaultKunjiCallbackUrl(AUDIENCE), scope: ["profile"] }
);

const galleryStates: KunjiSignInStatus[] = ["idle", "loading", "ready", "scanned", "success", "expired", "denied", "notLinked", "error"];

function stateFor(status: KunjiSignInStatus, slow = false): KunjiSignInState {
  return {
    status,
    session: status === "idle" || status === "loading" ? undefined : gallerySession,
    slow,
    codeStatus: "idle",
    error: status === "error" ? "The server didn't answer. Check your connection and try again." : undefined,
  };
}

const outcomes: { value: KunjiMockOutcome; label: string }[] = [
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "notLinked", label: "Not linked" },
  { value: "expired", label: "Expired" },
  { value: "error", label: "Error" },
  { value: "never", label: "Slow" },
];

const problemVariants: AuthProblemVariant[] = ["not-owner", "sso-down", "cookie-conflict", "sign-in-loop", "expired-session", "offline"];

function mockAccessAdapter(onRecord: (r: AccessGateRecord) => void): AccessGateAdapter {
  let requestedAt = 0;
  return {
    async request() {
      await new Promise((r) => setTimeout(r, 600));
      requestedAt = Date.now();
      const record: AccessGateRecord = { status: "pending", createdAt: requestedAt };
      onRecord(record);
      return record;
    },
    async check() {
      // Approves ~6 seconds after the request.
      return Date.now() - requestedAt > 6000
        ? { status: "approved", keyName: "maya-gpu-01", grant: { resources: ["qwen3-8b", "llama-3.3-70b"], ttlDays: 30, canEvict: false } }
        : { status: "pending", createdAt: requestedAt };
    },
    async claim() {
      await new Promise((r) => setTimeout(r, 700));
    },
  };
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function KunjiPage() {
  const [outcome, setOutcome] = React.useState<KunjiMockOutcome>("approved");
  const [run, setRun] = React.useState(0);
  const liveClient = React.useMemo(
    () => createMockKunjiClient({ appName: "Sutra", audience: AUDIENCE, outcome, ttl: outcome === "expired" ? 12_000 : 120_000 }),
    // `run` restarts the demo with a fresh client.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outcome, run]
  );
  const [log, setLog] = React.useState<string | null>(null);

  const client = React.useMemo(() => createMockKunjiClient({ appName: "Sutra", audience: AUDIENCE }), []);
  const waitingClient = React.useMemo(() => createMockKunjiClient({ appName: "Sutra", audience: AUDIENCE, outcome: "never", scanAfter: 600_000 }), []);
  const pairing = React.useMemo(() => createMockPairingAdapter(), []);
  const pairingNew = React.useMemo(() => createMockPairingAdapter(), []);

  const [gateRecord, setGateRecord] = React.useState<AccessGateRecord>({ status: "none" });
  const gateAdapter = React.useMemo(() => mockAccessAdapter(setGateRecord), []);
  const [gateKey, setGateKey] = React.useState(0);

  const [problem, setProblem] = React.useState<AuthProblemVariant>("not-owner");

  return (
    <PageIntro
      eyebrow="Identity"
      title="kunji sign-in"
      description="Sign in with kunji, the user's own passkey wallet. Sutra draws the QR itself and talks only to your app's endpoints; every demo here uses a mock client that simulates the protocol with timers."
    >
      <Demo
        id="kunji-sign-in"
        title="KunjiSignIn"
        description="The full widget: QR with the kunji plate, countdown, 1-2-3 steps, short-code fallback, Open kunji deep link and a live status line. Pick how the simulated wallet responds."
        canvasClassName="flex-col"
      >
        <div className="flex max-w-full flex-wrap items-center justify-center gap-2">
          <SegmentedControl className="max-w-full overflow-x-auto" size="sm" value={outcome} onValueChange={(v) => setOutcome(v as KunjiMockOutcome)} options={outcomes} />
          <Button size="sm" variant="ghost" leadingIcon={<RiRefreshLine />} onClick={() => setRun((n) => n + 1)}>
            Restart
          </Button>
        </div>
        <KunjiSignIn
          key={`${outcome}-${run}`}
          client={liveClient}
          slowAfter={8000}
          onSuccess={(r) => setLog(`onSuccess: sub ${r.sub?.slice(0, 12)}…`)}
          onLink={() => setLog("onLink")}
          onRegister={() => setLog("onRegister")}
        />
        {log && <DemoLabel>{log}</DemoLabel>}
      </Demo>

      <Demo id="kunji-variants" title="Variants" description="card, inline and compact. Each runs its own mock session." align="start">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="flex flex-col items-center gap-2">
            <DemoLabel>card</DemoLabel>
            <KunjiSignIn client={waitingClient} />
          </div>
          <div className="flex flex-col items-center gap-6">
            <div className="flex w-full max-w-sm flex-col items-center gap-2">
              <DemoLabel>inline</DemoLabel>
              <KunjiSignIn client={waitingClient} variant="inline" showSteps={false} />
            </div>
            <div className="flex w-full flex-col items-center gap-2">
              <DemoLabel>compact</DemoLabel>
              <KunjiSignIn client={waitingClient} variant="compact" />
            </div>
          </div>
        </div>
      </Demo>

      <Demo id="kunji-states" title="States gallery" description="KunjiSignInView forced into every state (plus the slow flag), as screen readers hear them." align="start">
        <div className="@container w-full">
          <div className="grid grid-cols-1 gap-6 @2xl:grid-cols-2 @6xl:grid-cols-3">
            {galleryStates.map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <DemoLabel>{s}</DemoLabel>
                <KunjiSignInView state={stateFor(s)} variant="compact" onStart={() => {}} onRetry={() => {}} onRefresh={() => {}} onLink={() => {}} onRegister={() => {}} onRequestCode={() => {}} />
              </div>
            ))}
            <div className="flex flex-col items-center gap-2">
              <DemoLabel>scanned + slow</DemoLabel>
              <KunjiSignInView state={stateFor("scanned", true)} variant="compact" onRetry={() => {}} />
            </div>
            <div className="flex flex-col items-center gap-2">
              <DemoLabel>short code shown</DemoLabel>
              <KunjiSignInView state={{ ...stateFor("ready"), code: "482913", codeStatus: "ready" }} variant="compact" onRequestCode={() => {}} />
            </div>
          </div>
        </div>
      </Demo>

      <Demo id="kunji-button" title="KunjiButton" description="The official kunji button (amber, dark or light) with the kunji key mark. Opens KunjiSignIn in a dialog.">
        <KunjiButton client={client} onSuccess={() => setLog("KunjiButton: signed in")} />
        <KunjiButton client={client} theme="light" />
        <KunjiButton client={client} theme="amber" size="lg" />
        <KunjiButton client={client} size="sm">
          kunji
        </KunjiButton>
        <div className="flex items-center gap-2">
          <KunjiMark variant="tile" size={32} title="kunji" />
          <KunjiMark size={24} />
        </div>
      </Demo>

      <Demo id="kunji-link" title="KunjiLink" description="Link a kunji wallet to an account that is already signed in, then show Linked ✓." align="start">
        <div className="@container w-full">
          <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
            <KunjiLink client={client} onLink={() => new Promise((r) => setTimeout(r, 600))} onUnlink={() => {}} />
            <KunjiLink client={client} defaultLinked sub="9f2c41d07be35a18c6e04f9d2b7a13c58e6f0d4a91b2c3d4" onUnlink={() => {}} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <KunjiLinkedBadge sub="9f2c41d07be35a18c6e04f9d2b7a13c58e6f0d4a91b2c3d4" />
          <KunjiLinkedBadge linked={false} />
          <KunjiLinkedBadge size="sm" />
        </div>
      </Demo>

      <Demo id="kunji-sign-in-page" title="KunjiSignInPage" description="Full page: brand, the kunji QR as the hero, other ways to sign in and a footer." canvasClassName="p-0 sm:p-0">
        <div className="h-[860px] w-full overflow-auto">
          <KunjiSignInPage client={client} className="min-h-full" onPasswordSubmit={() => new Promise((r) => setTimeout(r, 800))} />
        </div>
      </Demo>

      <Demo id="sign-in-methods" title="SignInMethods" description="kunji QR, username + password and access token in tabs. The last method used is remembered.">
        <SignInMethods client={client} usernameLabel="Lab username" onPasswordSubmit={() => new Promise((r) => setTimeout(r, 800))} />
      </Demo>

      <Demo id="register-with-kunji" title="RegisterWithKunji" description="First kunji sign-in: a handle with live rules, a name and an invite code, then awaiting approval.">
        <RegisterWithKunji joinPolicy="invite" suggestedName="Maya Patel" sub="9f2c41d07be35a18c6e04f9d2b7a13c58e6f0d4a" onSubmit={() => new Promise((r) => setTimeout(() => r({ pending: true }), 700))} />
        <RegisterWithKunji firstAdmin />
      </Demo>

      <Demo id="awaiting-approval" title="AwaitingApproval" description="Waiting for an admin, checking in the background.">
        <AwaitingApproval handle="maya" onCheck={() => false} onSignOut={() => {}} />
      </Demo>

      <Demo id="signed-in-panel" title="SignedInPanel" description="AccountPanel with link kunji, sign out and sign out everywhere.">
        <SignedInPanel
          name="Maya Patel"
          handle="@maya"
          role="Admin"
          client={client}
          onLinkKunji={() => new Promise((r) => setTimeout(r, 600))}
          onSignOut={() => new Promise((r) => setTimeout(r, 600))}
          onSignOutEverywhere={() => {}}
        />
      </Demo>

      <Demo id="device-pairing" title="DevicePairingFlow" description="Wallet-side “link a new device”: QR and an 8-digit code with a 2-minute TTL, then “Do these match?” on both devices. The new-device side accepts 40718293.">
        <div className="flex flex-col items-center gap-2">
          <DemoLabel>Existing device</DemoLabel>
          <DevicePairingFlow adapter={pairing} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <DemoLabel>New device</DemoLabel>
          <DevicePairingFlow adapter={pairingNew} side="new" />
        </div>
      </Demo>

      <Demo id="access-gate" title="AccessGate" description="Request access → pending (approves after ~6s here) → collect your key. Or jump to a state." canvasClassName="flex-col">
        <SegmentedControl
          className="max-w-full overflow-x-auto"
          size="sm"
          value={gateRecord.status}
          onValueChange={(v) => {
            setGateRecord(
              v === "approved"
                ? { status: "approved", keyName: "maya-gpu-01", grant: { resources: ["qwen3-8b"], ttlDays: 30, canEvict: false } }
                : v === "pending"
                  ? { status: "pending", createdAt: Date.now() }
                  : { status: v as AccessGateRecord["status"], decidedAt: Date.now(), keyName: "maya-gpu-00" }
            );
            setGateKey((k) => k + 1);
          }}
          options={["none", "pending", "approved", "denied", "delivered"].map((v) => ({ value: v, label: v }))}
        />
        <AccessGate
          key={gateKey}
          adapter={gateAdapter}
          record={gateRecord}
          onRecordChange={setGateRecord}
          resourceName="GPU access"
          signedInAs="maya"
          scopes={[
            { value: "evict", label: "Displace other models", description: "Let my jobs unload someone else's idle model." },
            { value: "large", label: "70B-class models" },
          ]}
          otherWays={
            <span>
              Allow-listed? <Button variant="link" size="sm" className="h-auto p-0">Sign in with kunji instead</Button> for access straight away.
            </span>
          }
        />
      </Demo>

      <Demo id="auth-problem" title="AuthProblem" description="Full-panel states that are neither signed in nor signed out, each with recovery actions." canvasClassName="flex-col">
        <SegmentedControl className="max-w-full overflow-x-auto" size="sm" value={problem} onValueChange={(v) => setProblem(v as AuthProblemVariant)} options={problemVariants.map((v) => ({ value: v, label: v }))} />
        <AuthProblem
          variant={problem}
          appName="the gateway"
          accountName="Maya Patel"
          accountHandle="maya"
          onRetry={() => {}}
          onSignIn={() => {}}
          switchAccountHref="#switch-account"
          providerHref="#suite"
        />
      </Demo>
    </PageIntro>
  );
}

export default KunjiPage;
