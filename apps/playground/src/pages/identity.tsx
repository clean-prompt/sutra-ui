import * as React from "react";
import {
  AccountPanel,
  BootScreen,
  Button,
  EmptyState,
  KeyValue,
  KeyValueList,
  LockScreen,
  Note,
  QRCode,
  QRCodeCard,
  QRScannerDialog,
  SegmentedControl,
  SessionList,
  SettingsDangerZone,
  SettingsDialog,
  SettingsGroup,
  SettingsRow,
  SettingsSection,
  SettingsShell,
  SimpleSelect,
  SutraAppIcon,
  SutraMark,
  ThemeToggle,
  type LockScreenMode,
  type Session,
  type SettingsShellSection,
  type ThemeToggleMode,
} from "@sutra/ui";
import {
  RiBellLine,
  RiDeviceLine,
  RiLayoutLine,
  RiPaletteLine,
  RiQrScan2Line,
  RiSearchLine,
  RiSettings3Line,
  RiShieldKeyholeLine,
  RiUserLine,
} from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

const NOW = Date.now();

const initialSessions: Session[] = [
  { id: "mbp", name: "Vyom's MacBook Pro", device: "laptop", browser: "Arc 1.62", os: "macOS 15", location: "Pune, IN", ip: "103.21.4.18", lastActive: NOW, current: true },
  { id: "pixel", name: "Pixel 8", device: "phone", browser: "Chrome 131", os: "Android 15", location: "Pune, IN", lastActive: NOW - 7 * 60_000 },
  { id: "ipad", name: "iPad Air", device: "tablet", browser: "Safari", os: "iPadOS 18", location: "Mumbai, IN", lastActive: NOW - 5 * 3_600_000 },
  { id: "jetson", name: "Lab desktop", device: "desktop", browser: "Firefox 133", os: "Ubuntu 24.04", ip: "10.0.4.22", lastActive: NOW - 3 * 86_400_000 },
];

function newPairingLink() {
  const code = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `https://id.sutra.app/pair/${code.slice(0, 4)}-${code.slice(4)}`;
}

/* ------------------------------------------------------------------ */
/* Settings sample                                                     */
/* ------------------------------------------------------------------ */

function SutraSettingsBody({ section }: { section: string }) {
  const [density, setDensity] = React.useState("comfortable");
  const [theme, setTheme] = React.useState<ThemeToggleMode>("system");
  if (section === "general") {
    return (
      <SettingsSection title="General" description="How Sutra behaves across every app.">
        <SettingsGroup title="Startup">
          <SettingsRow type="toggle" icon={<RiLayoutLine />} title="Reopen last workspace" description="Pick up where you left off." defaultChecked />
          <SettingsRow type="nav" title="Default app" value="Notes" onClick={() => {}} />
          <SettingsRow title="Language">
            <SimpleSelect
              size="sm"
              aria-label="Language"
              defaultValue="en"
              className="w-36"
              options={[
                { value: "en", label: "English" },
                { value: "hi", label: "हिन्दी" },
                { value: "mr", label: "मराठी" },
              ]}
            />
          </SettingsRow>
        </SettingsGroup>
        <SettingsGroup title="Editor" footer="Front matter in a note overrides these defaults.">
          <SettingsRow type="toggle" title="Spell check" description="Underline misspelled words." defaultChecked />
          <SettingsRow type="toggle" title="Wide mode" disabledReason="Set by front matter" />
          <SettingsRow type="toggle" title="Smart quotes" description="Turn straight quotes into curly ones." />
        </SettingsGroup>
      </SettingsSection>
    );
  }
  if (section === "appearance") {
    return (
      <SettingsSection title="Appearance" description="Theme, density and accent.">
        <SettingsGroup>
          <SettingsRow title="Theme" description="System follows your OS setting.">
            <ThemeToggle variant="segmented" size="sm" value={theme} onValueChange={setTheme} applyToDocument={false} />
          </SettingsRow>
          <SettingsRow title="Density">
            <SegmentedControl
              size="sm"
              aria-label="Density"
              value={density}
              onValueChange={setDensity}
              options={[
                { value: "compact", label: "Compact" },
                { value: "comfortable", label: "Comfortable" },
              ]}
            />
          </SettingsRow>
          <SettingsRow type="toggle" title="Reduce motion" description="Tone down animations everywhere." />
        </SettingsGroup>
      </SettingsSection>
    );
  }
  if (section === "notifications") {
    return (
      <SettingsSection title="Notifications">
        <SettingsGroup title="Push">
          <SettingsRow type="toggle" icon={<RiBellLine />} title="Task reminders" defaultChecked />
          <SettingsRow type="toggle" title="Calendar alerts" description="10 minutes before events." defaultChecked />
          <SettingsRow type="toggle" title="Mentions" />
        </SettingsGroup>
        <SettingsGroup title="Email">
          <SettingsRow type="nav" title="Weekly digest" value="Mondays" onClick={() => {}} />
        </SettingsGroup>
      </SettingsSection>
    );
  }
  if (section === "security") {
    return (
      <SettingsSection title="Privacy & security">
        <SettingsGroup>
          <SettingsRow type="toggle" title="Lock after inactivity" description="Require your PIN after 15 minutes." defaultChecked />
          <SettingsRow type="nav" title="Passkeys" value="2" onClick={() => {}} />
          <SettingsRow type="nav" title="Recovery key" value="Saved Mar 2026" onClick={() => {}} />
        </SettingsGroup>
        <SettingsDangerZone description="These actions can't be undone.">
          <SettingsRow title="Reset vault" description="Erase every note, task and file on all devices.">
            <Button size="sm" variant="destructive">
              Reset…
            </Button>
          </SettingsRow>
        </SettingsDangerZone>
      </SettingsSection>
    );
  }
  return (
    <SettingsSection title="Account">
      <AccountPanel name="Vyom Shah" handle="vyom@sutra.app" role="Owner" className="max-w-none" onSignOut={() => {}} />
    </SettingsSection>
  );
}

const settingsSections: SettingsShellSection[] = [
  { id: "general", label: "General", description: "Startup, language, editor", icon: <RiSettings3Line /> },
  { id: "appearance", label: "Appearance", description: "Theme and density", icon: <RiPaletteLine /> },
  { id: "notifications", label: "Notifications", description: "Push and email", icon: <RiBellLine /> },
  { id: "security", label: "Privacy & security", description: "Lock, passkeys, recovery", icon: <RiShieldKeyholeLine /> },
  { id: "account", label: "Account", description: "Profile and sign out", icon: <RiUserLine /> },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function IdentityPage() {
  const [pairing, setPairing] = React.useState(() => ({ url: newPairingLink(), expiresAt: Date.now() + 120_000 }));
  const [scanned, setScanned] = React.useState<string | null>(null);
  const [section, setSection] = React.useState<string | null>("general");
  const [mobileSection, setMobileSection] = React.useState<string | null>(null);
  const [sessions, setSessions] = React.useState(initialSessions);
  const [bootKey, setBootKey] = React.useState(0);
  const [lockMode, setLockMode] = React.useState<LockScreenMode>("pin");
  const [lockKey, setLockKey] = React.useState(0);
  const [unlocked, setUnlocked] = React.useState(false);
  const [theme, setTheme] = React.useState<ThemeToggleMode>("light");
  const [theme2, setTheme2] = React.useState<ThemeToggleMode>("dark");

  const refreshPairing = () => setPairing({ url: newPairingLink(), expiresAt: Date.now() + 120_000 });

  return (
    <PageIntro
      eyebrow="Components"
      title="Identity"
      description="Everything around who you are and which device you're on: QR pairing and scanning, settings, sessions, boot and lock screens, and the theme switch."
    >
      <Demo
        id="qr-code"
        title="QR code"
        description="Real QR codes rendered to inline SVG. A logo forces error-correction H and sits on a plate that clears the modules behind it."
        align="start"
        canvasClassName="gap-8"
      >
        <div className="flex flex-wrap items-start gap-8">
          <QRCodeCard
            title="Link a device"
            value={pairing.url}
            expiresAt={pairing.expiresAt}
            onRefresh={refreshPairing}
            caption="Open Sutra on your phone and scan this code."
            logo={<SutraMark size={48} />}
            qrProps={{ moduleStyle: "rounded" }}
          />
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {(["square", "rounded", "dots"] as const).map((style) => (
              <div key={style} className="space-y-2">
                <DemoLabel className="capitalize">{style}</DemoLabel>
                <QRCode value="https://sutra.app" moduleStyle={style} size={120} quietZone={2} className="rounded-lg ring-1 ring-border" />
              </div>
            ))}
            <div className="space-y-2">
              <DemoLabel>Circle finders · brand</DemoLabel>
              <QRCode value="https://sutra.app" moduleStyle="dots" finderStyle="circle" size={120} quietZone={2} className="rounded-lg text-primary ring-1 ring-border" />
            </div>
            <div className="space-y-2">
              <DemoLabel>App logo</DemoLabel>
              <QRCode value="https://notes.sutra.app/share/9c1f" moduleStyle="rounded" size={120} quietZone={2} logo={<SutraAppIcon app="notes" size={28} />} className="rounded-lg ring-1 ring-border" />
            </div>
            <div className="space-y-2">
              <DemoLabel>ECC L (smallest)</DemoLabel>
              <QRCode value="https://sutra.app" ecc="L" size={120} quietZone={2} className="rounded-lg ring-1 ring-border" />
            </div>
          </div>
        </div>
      </Demo>

      <Demo
        id="qr-scanner"
        title="QR scanner"
        description="Camera scanner in a full-screen dialog. Uses BarcodeDetector when available, otherwise jsQR loaded on demand. Torch and camera switch appear when supported; 'Upload image instead' decodes from a file."
      >
        <div className="flex flex-col items-center gap-4">
          <QRScannerDialog
            description="Point at the code on your other device."
            onResult={setScanned}
            trigger={<Button leadingIcon={<RiQrScan2Line />}>Scan a pairing code</Button>}
          />
          {scanned ? (
            <KeyValueList className="w-80">
              <KeyValue label="Scanned" value={scanned} copyable mono />
            </KeyValueList>
          ) : (
            <Note>Nothing scanned yet. Scan the code above from your phone.</Note>
          )}
        </div>
      </Demo>

      <Demo
        id="settings-shell"
        title="Settings shell"
        description="Two panes on wide containers; on narrow ones a drill-in list with a back button. Inline here, or in a dialog."
        align="start"
      >
        <div className="flex justify-end">
          <SettingsDialog
            sections={settingsSections}
            trigger={<Button variant="secondary" leadingIcon={<RiSettings3Line />}>Open in a dialog</Button>}
          >
            {(id) => <SutraSettingsBody section={id} />}
          </SettingsDialog>
        </div>
        <div className="h-[560px] overflow-hidden rounded-box border border-border">
          <SettingsShell title="Sutra settings" sections={settingsSections} section={section} onSectionChange={setSection} layout="split">
            {(id) => <SutraSettingsBody section={id} />}
          </SettingsShell>
        </div>
        <DemoLabel>Narrow container (drill-in)</DemoLabel>
        <div className="mx-auto h-[560px] w-[375px] max-w-full overflow-hidden rounded-[2rem] border-4 border-border-strong">
          <SettingsShell title="Settings" sections={settingsSections} section={mobileSection} onSectionChange={setMobileSection}>
            {(id) => <SutraSettingsBody section={id} />}
          </SettingsShell>
        </div>
      </Demo>

      <Demo id="key-value" title="Key–value" description="Facts the system knows, in a semantic <dl>, with copyable mono values." align="start">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-2">
            <DemoLabel>Rows · server config</DemoLabel>
            <KeyValueList>
              <KeyValue label="Host" value="id.sutra.app" copyable mono />
              <KeyValue label="Region" value="ap-south-1" mono />
              <KeyValue label="Version" value="2.14.0 (a3f9c21)" mono />
              <KeyValue label="Client ID" value="sutra_web_8f2c1b7e9d4a6f03b5e1c2d7" copyable mono />
              <KeyValue label="Webhook" value={null} />
              <KeyValue label="Signed in as" value="vyom" />
            </KeyValueList>
          </div>
          <div className="space-y-2">
            <DemoLabel>Grid · stats</DemoLabel>
            <KeyValueList
              layout="grid"
              columns={2}
              items={[
                { label: "Uptime", value: "41 days" },
                { label: "CPU", value: "12%" },
                { label: "Memory", value: "3.1 / 8 GB" },
                { label: "Disk", value: "182 GB free" },
                { label: "Public key", value: "ed25519:9QhT…kX2p", mono: true, copyable: "ed25519:9QhTmB4fJk2LrX2p" },
              ]}
            />
            <DemoLabel className="pt-4">Stacked</DemoLabel>
            <KeyValueList layout="stacked">
              <KeyValue label="Redirect URI" value="https://notes.sutra.app/auth/callback" mono copyable />
            </KeyValueList>
          </div>
        </div>
      </Demo>

      <Demo id="empty-state" title="Empty state" description="First-run, no-results and error placeholders." align="start">
        <div className="grid gap-4 md:grid-cols-3">
          <EmptyState
            title="No notes yet"
            description="Notes you write appear here."
            actions={<Button size="sm">New note</Button>}
          />
          <EmptyState
            variant="dashed"
            icon={<RiSearchLine />}
            title="Nothing matched “quarterly”"
            description="Try a shorter query or search all apps."
            actions={
              <Button size="sm" variant="secondary">
                Clear search
              </Button>
            }
          />
          <EmptyState illustration="cloud" size="sm" title="You're offline" description="Changes will sync when you reconnect." />
        </div>
      </Demo>

      <Demo id="note" title="Note" description="The quiet line a screen says while working or when there's nothing here. Not a banner." align="start">
        <Note busy>Searching…</Note>
        <Note>Nothing matched “invoices 2019”.</Note>
        <Note align="start">No sessions in this project yet.</Note>
        <Note tone="error">Couldn't reach id.sutra.app. Retrying in 10s.</Note>
      </Demo>

      <Demo id="boot-screen" title="Boot screen" description="Shown while the app checks who you are. Waits a beat before appearing so fast loads never flash." align="start">
        <div className="relative h-64 overflow-hidden rounded-box border border-border">
          <BootScreen key={bootKey} fullscreen={false} delay={250} />
        </div>
        <Button size="sm" variant="secondary" className="self-start" onClick={() => setBootKey((k) => k + 1)}>
          Replay
        </Button>
      </Demo>

      <Demo
        id="lock-screen"
        title="Lock screen"
        description="Vault unlock with PIN, password or passkey. Wrong secrets shake, count down attempts and lock out. The demo PIN is 246810 and the password is sutra."
        align="start"
      >
        <SegmentedControl
          aria-label="Unlock method"
          className="self-start"
          value={lockMode}
          onValueChange={(v) => {
            setLockMode(v as LockScreenMode);
            setLockKey((k) => k + 1);
            setUnlocked(false);
          }}
          options={[
            { value: "pin", label: "PIN" },
            { value: "password", label: "Password" },
            { value: "passkey", label: "Passkey" },
          ]}
        />
        <div className="relative h-[600px] overflow-hidden rounded-box border border-border">
          {unlocked ? (
            <EmptyState
              illustration="success"
              title="Unlocked"
              className="h-full justify-center"
              actions={
                <Button size="sm" variant="secondary" onClick={() => { setUnlocked(false); setLockKey((k) => k + 1); }}>
                  Lock again
                </Button>
              }
            />
          ) : (
            <LockScreen
              key={lockKey}
              fullscreen={false}
              mode={lockMode}
              appName="Sutra Vault"
              maxAttempts={3}
              lockoutSeconds={15}
              onUnlock={async (secret) => {
                await new Promise((r) => setTimeout(r, 400));
                const ok = secret === (lockMode === "pin" ? "246810" : "sutra");
                if (ok) setUnlocked(true);
                return ok;
              }}
              onPasskey={async () => {
                await new Promise((r) => setTimeout(r, 600));
                setUnlocked(true);
              }}
              onRecover={async (key) => {
                await new Promise((r) => setTimeout(r, 400));
                const ok = key.trim().length >= 16;
                if (ok) setUnlocked(true);
                return ok;
              }}
              footer={
                <Button variant="link" size="sm" className="text-muted-foreground">
                  Sign out
                </Button>
              }
            />
          )}
        </div>
      </Demo>

      <Demo id="sessions" title="Sessions" description="Devices & sessions manager with inline revoke and “sign out all other sessions”." align="start">
        <SessionList
          title="Devices"
          description="Sign out any device you don't recognise."
          sessions={sessions}
          onRevoke={async (id) => {
            await new Promise((r) => setTimeout(r, 500));
            setSessions((list) => list.filter((s) => s.id !== id));
          }}
          onRevokeOthers={async () => {
            await new Promise((r) => setTimeout(r, 600));
            setSessions((list) => list.filter((s) => s.current));
          }}
        />
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setSessions(initialSessions)}>
            Reset devices
          </Button>
        </div>
        <DemoLabel>Loading</DemoLabel>
        <SessionList sessions={null} />
      </Demo>

      <Demo id="account-panel" title="Account panel" description="Signed-in summary with app launchers. “Sign out everywhere” ends every session after confirming.">
        <AccountPanel
          name="Vyom Shah"
          handle="vyom@sutra.app"
          role="Admin"
          apps={[
            { id: "notes", name: "Notes", href: "#", icon: <SutraAppIcon app="notes" size={22} /> },
            { id: "tasks", name: "Tasks", href: "#", icon: <SutraAppIcon app="tasks" size={22} /> },
            { id: "calendar", name: "Calendar", href: "#", icon: <SutraAppIcon app="calendar" size={22} /> },
            { id: "files", name: "Files", href: "#", icon: <SutraAppIcon app="files" size={22} /> },
          ]}
          onSignOut={() => new Promise((r) => setTimeout(r, 600))}
          onSignOutEverywhere={() => new Promise((r) => setTimeout(r, 600))}
        />
      </Demo>

      <Demo
        id="theme-toggle"
        title="Theme toggle"
        description="Icon button with a sun/moon morph (cycling light → dark → system, or two-state), or a segmented control. These demos are controlled and don't touch the page theme."
      >
        <div className="flex flex-col items-center gap-2">
          <ThemeToggle value={theme} onValueChange={setTheme} applyToDocument={false} />
          <DemoLabel>3-state · {theme}</DemoLabel>
        </div>
        <div className="flex flex-col items-center gap-2">
          <ThemeToggle modes={["light", "dark"]} value={theme2} onValueChange={setTheme2} applyToDocument={false} />
          <DemoLabel>2-state · {theme2}</DemoLabel>
        </div>
        <div className="flex flex-col items-center gap-2">
          <ThemeToggle variant="segmented" value={theme} onValueChange={setTheme} applyToDocument={false} />
          <DemoLabel>Segmented</DemoLabel>
        </div>
        <div className="flex flex-col items-center gap-2">
          <ThemeToggle variant="segmented" size="sm" showLabels={false} value={theme} onValueChange={setTheme} applyToDocument={false} />
          <DemoLabel>Icons only</DemoLabel>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <RiDeviceLine className="size-4" />
          <span className="text-xs">“System” follows prefers-color-scheme live.</span>
        </div>
      </Demo>
    </PageIntro>
  );
}

export default IdentityPage;
