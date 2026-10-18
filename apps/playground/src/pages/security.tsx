import * as React from "react";
import {
  ActivityFeed,
  ApiKeyCreateDialog,
  ApiKeyList,
  ApiKeyUsage,
  Button,
  ConnectedAppList,
  ConsentScreen,
  CredentialCard,
  CredentialDetail,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  PaymentCard,
  PaymentCardInput,
  RecoveryKey,
  RecoveryKeyInput,
  ScopeList,
  ScopeMatrix,
  SecretField,
  SecretRevealOnce,
  SecretText,
  TOTPCard,
  TOTPCode,
  formatScope,
  parseOtpauthUri,
  validateCardNumber,
  type ApiKey,
  type ConnectedApp,
  type ConsentSelection,
  type Credential,
  type PaymentCardValue,
  type SecurityEvent,
} from "@sutra/ui";
import {
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiMore2Line,
  RiPushpinLine,
  RiQrCodeLine,
  RiShieldCheckLine,
  RiUserLine,
} from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

const NOW = Date.now();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Demo-only secrets (never use these for real accounts). */
const DEMO_SECRET = "JBSWY3DPEHPK3PXP";
const authenticatorAccounts = [
  { id: "gh", uri: `otpauth://totp/GitHub:vyom@sutra.app?secret=${DEMO_SECRET}&issuer=GitHub` },
  { id: "cloud", uri: "otpauth://totp/Sutra%20Cloud:ops@sutra.app?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=Sutra%20Cloud&digits=8" },
  { id: "bank", uri: "otpauth://totp/Ledger%20Bank:vyom.p?secret=KRUGS4ZANFZSAYJAORSXG5A&issuer=Ledger%20Bank&algorithm=SHA256" },
  { id: "mail", uri: "otpauth://totp/Proton:vyom@proton.me?secret=MFRGGZDFMZTWQ2LKNNWG23TP&issuer=Proton" },
].map((a) => ({ id: a.id, ...parseOtpauthUri(a.uri)! }));

const RECOVERY = "K7QM-2XVA-9HTR-PL4N-WE8S-C3DJ-Y6BF-ZU5G";

const initialKeys: ApiKey[] = [
  {
    id: "k1",
    name: "Production server",
    key: "sk-live-8f3c0e1d9a7b44c2a1b2",
    scopes: ["chat:write", "models:read", "embeddings:write", "files:read", "files:write"],
    createdAt: NOW - 92 * DAY,
    expiresAt: NOW + 3 * DAY,
    lastUsedAt: NOW - 4 * MIN,
    usageCount: 184_203,
  },
  {
    id: "k2",
    name: "Laptop (dev)",
    prefix: "sk-",
    last4: "7c1e",
    scopes: ["chat:write", "models:read"],
    createdAt: NOW - 12 * DAY,
    expiresAt: NOW + 78 * DAY,
    lastUsedAt: NOW - 2 * HOUR,
    usageCount: 3_419,
  },
  {
    id: "k3",
    name: "Old CI runner",
    prefix: "sk-",
    last4: "d00d",
    scopes: ["models:read"],
    createdAt: NOW - 400 * DAY,
    expiresAt: NOW - 6 * DAY,
    lastUsedAt: NOW - 9 * DAY,
    usageCount: 22_870,
  },
  { id: "k4", name: "Notebook", prefix: "sk-", last4: "51aa", scopes: ["embeddings:write"], createdAt: NOW - 30 * DAY, expiresAt: null, usageCount: 0 },
];

const apiScopes = [
  { value: "chat:write", label: "chat:write", description: "Chat completions" },
  { value: "models:read", label: "models:read", description: "List and load models" },
  { value: "embeddings:write", label: "embeddings:write", description: "Create embeddings" },
  { value: "files:read", label: "files:read", description: "Read uploaded files" },
  { value: "files:write", label: "files:write", description: "Upload and delete files" },
  { value: "admin:usage", label: "admin:usage", description: "Billing and usage reports" },
];

const apiPermissions = [
  { value: "evict", label: "Evict other models", description: "Unload models to free memory", warning: "This key can interrupt other users' running requests." },
  { value: "unmetered", label: "Bypass rate limits", warning: "Unmetered keys can exhaust the GPU budget quickly." },
];

const credentials: Credential[] = [
  {
    id: "age",
    type: "Age over 18",
    kind: "age",
    issuer: { name: "National ID", domain: "id.gov.example", verified: true },
    holder: "Vyom Patel",
    issuedAt: NOW - 200 * DAY,
    expiresAt: NOW + 900 * DAY,
    unlinkable: true,
    claims: [
      { key: "age_over_18", label: "Over 18", value: "Yes", required: true },
      { key: "age_over_21", label: "Over 21", value: "Yes" },
      { key: "nationality", label: "Nationality", value: "Indian" },
    ],
  },
  {
    id: "emp",
    type: "Employee badge",
    kind: "employment",
    issuer: { name: "Sutra Labs", domain: "sutra.app", verified: true },
    holder: "Vyom Patel · Design Systems",
    issuedAt: NOW - 400 * DAY,
    expiresAt: NOW + 330 * DAY,
    claims: [
      { key: "name", label: "Name", value: "Vyom Patel", required: true },
      { key: "employee_id", label: "Employee ID", value: "SL-00417", mono: true },
      { key: "department", label: "Department", value: "Design Systems" },
      { key: "start_date", label: "Start date", value: "2024-08-01" },
    ],
  },
  {
    id: "edu",
    type: "MSc Computer Science",
    kind: "education",
    issuer: { name: "Pune University", domain: "unipune.example" },
    holder: "Vyom Patel",
    issuedAt: NOW - 800 * DAY,
    expiresAt: null,
  },
  {
    id: "event",
    type: "Conference pass",
    kind: "membership",
    issuer: { name: "JSConf India", domain: "jsconf.example", verified: true },
    issuedAt: NOW - 30 * DAY,
    expiresAt: NOW - 2 * DAY,
    oneTime: true,
    remainingUses: 1,
  },
];

const events: SecurityEvent[] = [
  { id: "a1", type: "sign_in", description: "Signed in with a passkey", at: NOW - 12 * MIN, device: "MacBook Pro · Arc", ip: "103.21.4.18", location: "Pune, IN" },
  { id: "a2", type: "agent_action", description: "Research agent read your calendar", at: NOW - 48 * MIN, app: "Research agent", details: [{ key: "scope", label: "Scope", value: "read:calendar", mono: true }] },
  { id: "a3", type: "key_created", description: "Created API key “Laptop (dev)”", at: NOW - 3 * HOUR, device: "MacBook Pro" },
  { id: "a4", type: "credential_presented", description: "Presented “Age over 18” to shop.acme.com", at: NOW - 26 * HOUR, app: "Acme Shop" },
  { id: "a5", type: "sign_in_failed", description: "Blocked sign-in attempt", at: NOW - 30 * HOUR, ip: "185.220.101.7", location: "Frankfurt, DE", risk: "danger" },
  { id: "a6", type: "approved", description: "Approved Notes Sync", at: NOW - 3 * DAY, device: "Pixel 8" },
  { id: "a7", type: "revoked", description: "Revoked Old CI runner key", at: NOW - 6 * DAY },
  { id: "a8", type: "mfa_enabled", description: "Turned on two-step verification", at: NOW - 9 * DAY, device: "Pixel 8" },
];

const initialApps: ConnectedApp[] = [
  {
    id: "agent",
    name: "Research agent",
    kind: "agent",
    description: "Summarises your week every Friday",
    scopes: ["login", "read:calendar", "read:mail", { id: "pay", max: "20USD", maxUses: 2 }],
    connectedAt: NOW - 5 * DAY,
    lastActiveAt: NOW - 48 * MIN,
    expiresAt: NOW + 2 * DAY,
    holderKey: "SHA256:9f2c 7b1e 0a44 d8c3 41ab",
    devices: [
      { id: "mbp", name: "MacBook Pro", push: true },
      { id: "pixel", name: "Pixel 8", push: false },
    ],
    activity: events.filter((e) => e.id === "a2" || e.id === "a6"),
  },
  {
    id: "shop",
    name: "Acme Shop",
    domain: "shop.acme.com",
    scopes: ["login", "profile", "vc:age"],
    connectedAt: NOW - 40 * DAY,
    lastActiveAt: NOW - 26 * HOUR,
    activity: events.filter((e) => e.id === "a4"),
  },
  {
    id: "notes",
    name: "Notes Sync",
    domain: "notes.example",
    scopes: ["login", "read:notes", "write:notes", "offline_access"],
    connectedAt: NOW - 3 * DAY,
    lastActiveAt: NOW - 6 * HOUR,
    expiresAt: NOW + 27 * DAY,
  },
];

/* ------------------------------------------------------------------ */
/* Demos                                                               */
/* ------------------------------------------------------------------ */

function AuthenticatorDemo() {
  const [pinned, setPinned] = React.useState<string[]>(["gh"]);
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      {authenticatorAccounts.map((a) => (
        <TOTPCard
          key={a.id}
          issuer={a.issuer ?? a.account}
          account={a.account}
          secret={a.secret}
          digits={a.digits}
          period={a.period}
          algorithm={a.algorithm}
          countdown={a.digits === 8 ? "linear" : "circular"}
          className={pinned.includes(a.id) ? "ring-1 ring-primary/40" : undefined}
          menu={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label={`${a.issuer} options`}>
                  <RiMore2Line />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  icon={<RiPushpinLine />}
                  onSelect={() => setPinned((p) => (p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id]))}
                >
                  {pinned.includes(a.id) ? "Unpin" : "Pin to top"}
                </DropdownMenuItem>
                <DropdownMenuItem icon={<RiEditLine />}>Rename</DropdownMenuItem>
                <DropdownMenuItem icon={<RiQrCodeLine />}>Export QR</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem tone="destructive" icon={<RiDeleteBinLine />}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
      ))}
    </div>
  );
}

function SecretRevealOnceDemo() {
  const [secret, setSecret] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(0);
  const generate = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    setSecret(`sk-live-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`);
  };
  return secret ? (
    <SecretRevealOnce
      className="w-full max-w-lg"
      secret={secret}
      fileName="sutra-api-key.txt"
      onDone={() => {
        setSecret(null);
        setDone((n) => n + 1);
      }}
    />
  ) : (
    <div className="flex flex-col items-center gap-2">
      <Button leadingIcon={<RiAddLine />} onClick={generate}>
        Generate a key
      </Button>
      {done > 0 && <DemoLabel>Acknowledged {done}×. The secret is gone from the UI.</DemoLabel>}
    </div>
  );
}

function RecoveryKeyDemo() {
  const [n, setN] = React.useState(0);
  const [log, setLog] = React.useState<string>("");
  return (
    <div className="flex w-full max-w-xl flex-col gap-2">
      <RecoveryKey
        key={n}
        title="Kunji recovery key"
        value={RECOVERY}
        fileName="kunji-recovery-key.txt"
        share
        onHide={() => setLog("Key hidden from screen")}
        onConfirmed={() => setLog("Confirmed saved")}
      />
      <div className="flex items-center justify-between">
        <DemoLabel>{log || "Auto-hides after 60s. Confirm by typing “Y6BF…” → last 4: Z U 5 G"}</DemoLabel>
        <Button variant="ghost" size="xs" onClick={() => { setN((x) => x + 1); setLog(""); }}>
          Reset
        </Button>
      </div>
    </div>
  );
}

function RecoveryKeyInputDemo() {
  const [value, setValue] = React.useState("");
  const [ok, setOk] = React.useState(false);
  const expected = RECOVERY.replace(/-/g, "");
  return (
    <div className="grid w-full max-w-md gap-2">
      <label htmlFor="rk-input" className="text-sm font-medium">
        Enter your recovery key
      </label>
      <RecoveryKeyInput
        id="rk-input"
        length={32}
        value={value}
        onValueChange={(v) => {
          setValue(v);
          setOk(false);
        }}
        validate={(v) => (v === expected ? true : "That key doesn't match this account.")}
        onComplete={() => setOk(true)}
      />
      <div className="flex items-center gap-2">
        <Button size="xs" variant="ghost" onClick={() => setValue(expected.toLowerCase())}>
          Paste demo key
        </Button>
        {ok && <DemoLabel className="text-success">Account unlocked.</DemoLabel>}
      </div>
    </div>
  );
}

function ConsentDemo() {
  const [nonce, setNonce] = React.useState(0);
  const [result, setResult] = React.useState<string>("");
  const expiresAt = React.useMemo(() => Date.now() + 90_000, [nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ConsentScreen
        key={nonce}
        app={{ name: "Acme Shop", domain: "shop.acme.com", verified: true, firstTime: true }}
        scopes={["login", "read:orders", "email", { id: "pay", max: "50USD", maxUses: 3 }, "offline_access"]}
        optionalScopes={["email", "pay", "offline_access"]}
        profile={{ name: "Vyom Patel", detail: "vyom@sutra.app" }}
        credentials={[
          { id: "age", title: "Age over 18", description: "National ID · unlinkable proof", icon: <RiShieldCheckLine /> },
          { id: "emp", title: "Employee badge", description: "Sutra Labs · discloses name only", icon: <RiUserLine /> },
        ]}
        expiresAt={expiresAt}
        onApprove={async (sel: ConsentSelection) => {
          await new Promise((r) => setTimeout(r, 600));
          setResult(`Approved: ${sel.scopes.join(", ")}${sel.shareProfile ? " + profile" : ""} · credential ${sel.credentialId}`);
        }}
        onDeny={() => setResult("Denied")}
      />
      <div className="flex items-center gap-3">
        <DemoLabel>{result || "Approve unlocks once a credential is picked. Expires in 90s."}</DemoLabel>
        <Button variant="ghost" size="xs" onClick={() => { setNonce((n) => n + 1); setResult(""); }}>
          New request
        </Button>
      </div>
    </div>
  );
}

function ScopeMatrixDemo() {
  const [value, setValue] = React.useState<Record<string, string[]>>({
    notes: ["read:notes"],
    agent: ["read:calendar", "read:mail"],
    shop: [],
  });
  const [replace, setReplace] = React.useState(false);
  const [ttl, setTtl] = React.useState<Record<string, number>>({ notes: 604800, agent: 3600, shop: 86400 });
  return (
    <div className="flex w-full flex-col gap-3">
      <ScopeMatrix
        apps={[
          { id: "notes", name: "Notes Sync", domain: "notes.example" },
          { id: "agent", name: "Research agent", domain: "agent.local" },
          { id: "shop", name: "Acme Shop", domain: "shop.acme.com", available: ["login", "read:notes"] },
        ]}
        scopes={["login", "read:notes", "write:notes", "read:calendar", "read:mail", "offline_access"]}
        held={{ notes: ["read:notes"], agent: ["read:calendar"] }}
        value={value}
        onValueChange={setValue}
        ttl={ttl}
        onTtlChange={setTtl}
        replacePrior={replace}
        onReplacePriorChange={setReplace}
      />
      <pre className="overflow-x-auto rounded-md bg-subtle p-3 font-mono text-xs text-muted-foreground">
        {JSON.stringify({ grants: value, ttl, replacePrior: replace }, null, 0)}
      </pre>
    </div>
  );
}

function ApiKeysDemo() {
  const [keys, setKeys] = React.useState(initialKeys);
  const [log, setLog] = React.useState("");
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">API keys</p>
          <p className="text-xs text-muted-foreground">Bearer keys for /v1. Scoped keys cannot evict other models.</p>
        </div>
        <ApiKeyCreateDialog
          trigger={
            <Button size="sm" leadingIcon={<RiAddLine />}>
              New key
            </Button>
          }
          scopes={apiScopes}
          permissions={apiPermissions}
          fileName="sutra-gateway-key.txt"
          onCreate={async (input) => {
            await new Promise((r) => setTimeout(r, 500));
            const hex = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
            const secret = `sk-live-${hex}`;
            setKeys((k) => [
              {
                id: hex.slice(0, 8),
                name: input.name,
                key: secret,
                scopes: input.scopes,
                createdAt: Date.now(),
                expiresAt: input.expiresInDays == null ? null : Date.now() + input.expiresInDays * DAY,
                usageCount: 0,
              },
              ...k,
            ]);
            return secret;
          }}
        />
      </div>
      <ApiKeyList
        keys={keys}
        onEdit={(k) => setLog(`Edit “${k.name}”`)}
        onRotate={(k) => setLog(`Rotated “${k.name}”`)}
        onRevoke={async (k) => {
          await new Promise((r) => setTimeout(r, 500));
          setKeys((all) => all.map((x) => (x.id === k.id ? { ...x, revoked: true } : x)));
          setLog(`Revoked “${k.name}”`);
        }}
      />
      {log && <DemoLabel>{log}</DemoLabel>}
      <div className="grid gap-2">
        <p className="text-sm font-semibold">Usage · Production server (24h)</p>
        <ApiKeyUsage
          rows={[
            { label: "POST /v1/chat/completions", requests: 12_480, errors: 41, lastUsedAt: NOW - 4 * MIN },
            { label: "POST /v1/embeddings", requests: 6_210, errors: 2, lastUsedAt: NOW - 9 * MIN },
            { label: "GET /v1/models", requests: 830, lastUsedAt: NOW - HOUR },
            { label: "POST /v1/files", requests: 64, errors: 7, lastUsedAt: NOW - 5 * HOUR },
          ]}
        />
      </div>
    </div>
  );
}

function CredentialDetailDemo() {
  const [selected, setSelected] = React.useState<string[]>(["name"]);
  return (
    <div className="grid w-full max-w-md gap-3">
      <CredentialDetail credential={credentials[1]} selectable value={selected} onValueChange={setSelected} />
      <DemoLabel>Sharing: {selected.join(", ")}</DemoLabel>
    </div>
  );
}

function PaymentCardInputDemo() {
  const [value, setValue] = React.useState<PaymentCardValue>({ number: "", expiry: "", cvc: "" });
  const brand = validateCardNumber(value.number).brand;
  return (
    <div className="grid w-full items-center gap-6 md:grid-cols-2">
      <PaymentCardInput value={value} onValueChange={setValue} className="max-w-sm" />
      <PaymentCard
        number={value.number || "0000"}
        brand={value.number ? undefined : "unknown"}
        holder="Vyom Patel"
        expiry={value.expiry || "MM/YY"}
        cvv={value.cvc || undefined}
        revealable={false}
        defaultRevealed
        issuer={brand === "unknown" ? "Live preview" : undefined}
      />
    </div>
  );
}

function ConnectedAppsDemo() {
  const [apps, setApps] = React.useState(initialApps);
  return (
    <div className="w-full max-w-lg">
      <ConnectedAppList
        apps={apps}
        onRevoke={async (app) => {
          await new Promise((r) => setTimeout(r, 400));
          setApps((all) => all.filter((a) => a.id !== app.id));
        }}
        onPushChange={(app, deviceId, enabled) =>
          setApps((all) =>
            all.map((a) => (a.id === app.id ? { ...a, devices: a.devices?.map((d) => (d.id === deviceId ? { ...d, push: enabled } : d)) } : a))
          )
        }
        empty="Nothing connected. Revoked apps lose access immediately."
      />
      {apps.length < initialApps.length && (
        <Button variant="ghost" size="xs" onClick={() => setApps(initialApps)}>
          Restore demo apps
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function SecurityPage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="Security"
      description="Authenticator codes, secrets, recovery keys, consent and scopes, API keys, verifiable credentials, payment cards, connected apps and security activity. Everything runs locally; TOTP codes are generated in the browser with Web Crypto."
    >
      <Demo
        id="authenticator"
        title="Authenticator"
        description="TOTPCard entries parsed from otpauth:// URIs with parseOtpauthUri. Codes are RFC 6238 (HMAC-SHA1/256) from demo base32 secrets, auto-advance each period and preview the next code in the last 5 seconds."
        align="start"
      >
        <AuthenticatorDemo />
      </Demo>

      <Demo id="totp-code" title="TOTP code" description="Circular or linear countdown, three sizes, and server-provided codes via `code`.">
        <div className="flex flex-col gap-2">
          <TOTPCode secret={DEMO_SECRET} size="lg" label="Demo" />
          <DemoLabel>Large · circular</DemoLabel>
        </div>
        <div className="flex w-56 flex-col gap-2">
          <TOTPCode secret={DEMO_SECRET} digits={8} countdown="linear" label="Demo" />
          <DemoLabel>8 digits · linear</DemoLabel>
        </div>
        <div className="flex flex-col gap-2">
          <TOTPCode code="482913" size="sm" countdown="none" />
          <DemoLabel>Server code · small</DemoLabel>
        </div>
      </Demo>

      <Demo id="secret-field" title="Secret field" description="Masked with a fixed-length mask, timed reveal, copy with clipboard auto-clear, canvas rendering and a strength badge." align="start">
        <div className="grid w-full max-w-md gap-4">
          <SecretField label="Wi-Fi password" value="correct-horse-battery" strength="auto" revealFor={5000} description="Reveals for 5 seconds." />
          <SecretField label="Database URL" value="postgres://app:Sx9!t2@db.internal:5432/main" renderAs="canvas" description="Revealed value is drawn on a canvas, out of reach of DOM scrapers." />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Inline:</span>
            <SecretText value="4f9a-22c1" label="PIN" />
          </div>
        </div>
      </Demo>

      <Demo id="secret-reveal-once" title="Show-once secret" description="Copy or download now; Done stays disabled until the user acknowledges storing it.">
        <SecretRevealOnceDemo />
      </Demo>

      <Demo id="recovery-key" title="Recovery key" description="Grouped mono grid with copy, download (Blob), share, print, a 60s auto-clear and a confirm-saved step.">
        <RecoveryKeyDemo />
      </Demo>

      <Demo id="recovery-key-input" title="Recovery key input" description="Auto-groups as you type, uppercases, ignores separators and validates on completion.">
        <RecoveryKeyInputDemo />
      </Demo>

      <Demo id="consent-screen" title="Consent screen" description="Verified domain headline, scopes from formatScope with risk, optional toggles (default-deny), profile share, credential choice (none preselected) and a live expiry." dots>
        <ConsentDemo />
      </Demo>

      <Demo id="scope-list" title="Scope list & formatScope" description="Readable labels, icons and constraint prose from raw scope strings. The map is extensible." align="start">
        <div className="grid w-full gap-6 md:grid-cols-2">
          <ScopeList
            scopes={["login", "profile", "read:contacts", "write:calendar", "delete:files", { id: "pay", max: "100EUR" }, "custom:export"]}
            optional={["profile", "write:calendar"]}
            held={["read:contacts"]}
            labels={{ "custom:export": "Export your data (app-supplied label)" }}
          />
          <ul className="grid content-start gap-1 font-mono text-xs text-muted-foreground">
            {["login", "read:orders", "write:notes", "admin:billing", "agent:summarise", "vc:age_over_18"].map((s) => {
              const f = formatScope(s);
              return (
                <li key={s}>
                  {s} → <span className="text-foreground">{f.label}</span> · {f.risk}
                  {f.locked ? " · locked" : ""}
                </li>
              );
            })}
          </ul>
        </div>
      </Demo>

      <Demo id="scope-matrix" title="Scope matrix" description="Grant scopes to several apps at once with a TTL per row. Held scopes are pre-ticked; optionally replace prior grants." align="start">
        <ScopeMatrixDemo />
      </Demo>

      <Demo id="api-keys" title="API keys" description="Masked prefixes, scope chips with +N more, expiry warnings, usage, row menu (edit, rotate, revoke with confirm) and a create flow that ends in a show-once secret." align="start">
        <ApiKeysDemo />
      </Demo>

      <Demo id="credential-card" title="Credential card" description="Verifiable credentials as wallet cards (gradient by kind) and compact rows with unlinkable and remaining-uses chips.">
        <div className="grid w-full gap-4 sm:grid-cols-2">
          {credentials.slice(0, 2).map((c) => (
            <CredentialCard key={c.id} credential={c} onClick={() => undefined} />
          ))}
        </div>
        <div className="w-full max-w-md divide-y divide-border rounded-box border border-border">
          {credentials.map((c) => (
            <CredentialCard key={c.id} credential={c} variant="row" onClick={() => undefined} className="rounded-none" />
          ))}
        </div>
      </Demo>

      <Demo id="credential-detail" title="Credential detail" description="Claims as a key/value list with selective-disclosure checkboxes; required claims are locked on.">
        <CredentialDetailDemo />
      </Demo>

      <Demo id="payment-card" title="Payment card" description="Brand detected from the number (IIN prefix rules), masked with reveal, flip for the CVV, per-brand or custom gradients and three sizes.">
        <PaymentCard number="4242424242424242" holder="Vyom Patel" expiry="08/29" cvv="123" issuer="Sutra Bank" />
        <PaymentCard number="5555555555554444" holder="Vyom Patel" expiry="02/28" cvv="907" issuer="Travel" />
        <PaymentCard number="378282246310005" holder="Vyom Patel" expiry="11/27" cvv="4410" size="sm" />
        <PaymentCard number="6521500000000006" holder="Vyom Patel" expiry="05/30" size="sm" color="#7c3aed" issuer="Custom color" />
        <PaymentCard number="1234" brand="jcb" holder="Vyom Patel" expiry="09/26" size="sm" issuer="Last 4 only" />
      </Demo>

      <Demo id="payment-card-input" title="Payment card input" description="Auto-formatting (Amex 4-6-5), brand mark, Luhn and expiry validation, CVC length per brand and auto-advance. Try 4242 4242 4242 4242." align="start">
        <PaymentCardInputDemo />
      </Demo>

      <Demo id="connected-apps" title="Connected apps" description="Apps and agents with granted scopes, activity and expiry. Open one for the capability scope, holder key fingerprint, per-device push and recent activity; revoke with confirmation.">
        <ConnectedAppsDemo />
      </Demo>

      <Demo id="activity-feed" title="Activity feed" description="Security events grouped by day with type icons, device, IP and location. Click a row for details." align="start">
        <ActivityFeed events={events} className="max-w-xl" />
      </Demo>
    </PageIntro>
  );
}

export default SecurityPage;
