import * as React from "react";
import {
  RiAlertLine,
  RiArchiveLine,
  RiArrowDownSLine,
  RiArrowUpCircleLine,
  RiBookOpenLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiEditLine,
  RiErrorWarningLine,
  RiEyeOffLine,
  RiGitBranchLine,
  RiGithubLine,
  RiKey2Line,
  RiLayoutMasonryLine,
  RiLinkUnlink,
  RiPuzzleLine,
  RiRestartLine,
  RiShieldCheckLine,
  RiShieldLine,
  RiStarLine,
} from "@remixicon/react";
import { cn, focusRing, hitArea } from "../../lib/cn";
import { normalizeTaskStatus, type TaskStatusInput } from "../../lib/status";
import { normalizeTone, toneClasses, type Tone, type ToneInput } from "../../lib/tone";
import { formatCompact } from "../../lib/format";
import { isSafeHref } from "../../lib/validate";
import { useAsyncAction } from "../../hooks/use-async-action";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Badge, type BadgeColor } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { CodeBlock } from "../../patterns/code-block";
import {
  ConfirmDialog,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../primitives/dialog";
import { InlineAlert, InlineAlertDescription, InlineAlertTitle } from "../../primitives/inline-alert";
import { Input } from "../../primitives/input";
import { KeyValue, KeyValueList } from "../../primitives/key-value";
import { LogViewer, type LogLine } from "../../patterns/log-viewer";
import { Markdown } from "../../patterns/markdown";
import { Spinner } from "../../primitives/spinner";
import { StatusBadge, type StatusBadgeStatus } from "../../primitives/status-badge";
import { Switch } from "../../primitives/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../primitives/tabs";
import { CapabilityMonogram, ProvenancePill, TrustBadge, type CapabilityProvenance, type CapabilityTrustLevel } from "./capabilities";
import { FlowArrow } from "../../primitives/flow-arrow-internal";

function ExternalLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <a
      href={isSafeHref(href) ? href : undefined}
      target="_blank"
      rel="noreferrer"
      className={cn(hitArea, "inline-flex items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground hover:text-foreground [&_svg]:size-3.5", focusRing)}
    >
      <span aria-hidden>{icon}</span>
      {children}
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* CatalogCard                                                         */
/* ------------------------------------------------------------------ */

export type ExtensionTier = "official" | "community";
export type CatalogEntryState = "available" | "installed" | "update-available" | "removed";

export interface CatalogCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Extension name, shown as the card title. */
  name: string;
  /** Publisher, shown as "by <author>" under the name. */
  author?: string;
  /** Short summary of what the extension does; clamped to two lines. */
  description?: React.ReactNode;
  /** Extension icon or logo, shown beside the name. */
  icon?: React.ReactNode;
  /** Banner image URL or node. */
  banner?: string | React.ReactNode;
  /** `official` (first-party) or `community`; sets the tier badge. */
  tier?: ExtensionTier;
  /** Trust level of the publisher or capability; shown as a trust badge. */
  trust?: CapabilityTrustLevel;
  /** Version of the catalog entry (without the leading `v`). */
  version?: string;
  /**
   * Newest available version; with `onUpdate` and `state="update-available"` it labels the Update button ("Update to
   * v1.2").
   */
  latestVersion?: string;
  /** Capability ids (mono chips), capped at `maxCapabilities`. */
  capabilities?: string[];
  /** How many capability chips to show before collapsing the rest into a "+N" badge. */
  maxCapabilities?: number;
  /** Supported platforms (e.g. "macos", "linux"), shown as small chips. */
  platforms?: string[];
  /** Star count from the source repository; hidden when unset. */
  stars?: number;
  /** Install state of this entry; drives the action button (Install, Installed, Update, Removed). */
  state?: CatalogEntryState;
  /** Link to the extension's documentation; shows a Docs link when set. */
  docsUrl?: string;
  /** Link to the source repository; shows a Repository link when set. */
  repoUrl?: string;
  /** Called when the user presses Install; may return a promise to keep the button busy until it settles. */
  onInstall?: () => void | Promise<void>;
  /** Called when the user presses Update (shown when the entry has a newer version). */
  onUpdate?: () => void;
  /** Called when the user presses Open; the button is hidden when unset. */
  onOpen?: () => void;
}

const formatStars = (n: number) => formatCompact(n, { decimals: 1, wholeAbove: 10, trimZeros: false });

/** Plugin/skill catalog entry with tier, trust, capabilities, platforms, stars and install/update states. */
export const CatalogCard = React.forwardRef<HTMLElement, CatalogCardProps>(
  (
    {
      name,
      author,
      description,
      icon,
      banner,
      tier,
      trust,
      version,
      latestVersion,
      capabilities = [],
      maxCapabilities = 4,
      platforms = [],
      stars,
      state = "available",
      docsUrl,
      repoUrl,
      onInstall,
      onUpdate,
      onOpen,
      className,
      ...props
    },
    ref
  ) => {
    const installAction = useAsyncAction(async () => {
      await onInstall?.();
    });
    const busy = installAction.busy;
    const titleId = React.useId();
    const shownCaps = capabilities.slice(0, maxCapabilities);
    const extra = capabilities.length - shownCaps.length;
    const install = () => void installAction.run();
    return (
      <article
        ref={ref}
        aria-labelledby={titleId}
        data-slot="catalog-card"
        data-state={state}
        className={cn("flex flex-col overflow-hidden rounded-box border border-border bg-card shadow-xs", className)}
        {...props}
      >
        {banner != null &&
          (typeof banner === "string" ? (
            <img src={banner} alt="" className="h-24 w-full object-cover" />
          ) : (
            <div aria-hidden className="h-24 w-full overflow-hidden">
              {banner}
            </div>
          ))}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
            <div className="flex min-w-0 flex-1 basis-40 items-start gap-3">
              {icon ? (
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-box border border-border bg-background [&_svg]:size-5">
                  {icon}
                </span>
              ) : (
                <CapabilityMonogram name={name} className="size-10" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 id={titleId} className="truncate text-sm font-semibold text-foreground">
                    {name}
                  </h3>
                  {tier && (
                    <Badge size="sm" color={tier === "official" ? "brand" : "neutral"} variant={tier === "official" ? "soft" : "outline"} data-tier={tier}>
                      {tier === "official" ? "Official" : "Community"}
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {author && <>by {author}</>}
                  {author && version && " · "}
                  {version && <span className="font-mono">v{version}</span>}
                </p>
              </div>
            </div>
            {trust && <TrustBadge level={trust} />}
          </div>
          {description != null && <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>}
          {capabilities.length > 0 && (
            <ul aria-label="Capabilities" className="flex flex-wrap gap-1">
              {shownCaps.map((c) => (
                <li key={c}>
                  <Badge size="sm" variant="outline" className="font-mono">
                    {c}
                  </Badge>
                </li>
              ))}
              {extra > 0 && (
                <li>
                  <Badge size="sm" color="gray" title={capabilities.slice(maxCapabilities).join(", ")} aria-label={`${extra} more capabilities`}>
                    +{extra}
                  </Badge>
                </li>
              )}
            </ul>
          )}
          {(platforms.length > 0 || stars != null) && (
            <div className="flex flex-wrap items-center gap-1">
              {platforms.map((p) => (
                <span key={p} className="rounded-control bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
                  {p}
                </span>
              ))}
              {stars != null && (
                <span className="ms-auto inline-flex items-center gap-0.5 text-xs text-muted-foreground tabular-nums">
                  <RiStarLine aria-hidden className="size-3.5" />
                  <span className="sr-only">Stars:</span>
                  {formatStars(stars)}
                </span>
              )}
            </div>
          )}
          {state === "removed" && (
            <p role="note" className="flex items-start gap-1.5 rounded-md bg-warning-soft px-2.5 py-1.5 text-xs text-warning-soft-foreground">
              <RiLinkUnlink aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              Removed from the catalog. It keeps working but will not receive updates.
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
            {docsUrl && (
              <ExternalLink href={docsUrl} icon={<RiBookOpenLine aria-hidden />}>
                Docs
              </ExternalLink>
            )}
            {repoUrl && (
              <ExternalLink href={repoUrl} icon={<RiGithubLine aria-hidden />}>
                Repo
              </ExternalLink>
            )}
            <span className="flex-1" />
            {state === "available" && onInstall && (
              <Button size="sm" leadingIcon={<RiDownloadLine aria-hidden />} loading={busy} onClick={install} aria-label={`Install ${name}`}>
                Install
              </Button>
            )}
            {state === "update-available" && (
              <Button size="sm" variant="soft" leadingIcon={<RiArrowUpCircleLine aria-hidden />} onClick={onUpdate} aria-label={`Update ${name}${latestVersion ? ` to v${latestVersion}` : ""}`}>
                Update{latestVersion ? ` to v${latestVersion}` : ""}
              </Button>
            )}
            {(state === "installed" || state === "removed") && (
              <>
                <Badge size="sm" color="success" leadingIcon={<RiCheckLine aria-hidden className="size-3" />}>
                  Installed
                </Badge>
                {onOpen && (
                  <Button size="sm" variant="ghost" onClick={onOpen} aria-label={`Open ${name}`}>
                    Open
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </article>
    );
  }
);
CatalogCard.displayName = "CatalogCard";

/* ------------------------------------------------------------------ */
/* InstalledExtensionCard                                              */
/* ------------------------------------------------------------------ */

export type ExtensionRuntimeStatus = "running" | "disabled" | "error" | "restart-required";

const runtimeMeta: Record<ExtensionRuntimeStatus, { status: StatusBadgeStatus; label: string }> = {
  running: { status: "online", label: "Running" },
  disabled: { status: "offline", label: "Disabled" },
  error: { status: "error", label: "Error" },
  "restart-required": { status: "warning", label: "Restart required" },
};

export interface InstalledExtensionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Extension name, shown as the card title. */
  name: string;
  /** Extension icon or logo, shown beside the name. */
  icon?: React.ReactNode;
  /** "Catalog", a git URL or a local path. */
  source?: string;
  /** Installed version (without the leading `v`). */
  version?: string;
  /** Newest available version; an update is offered when it differs from `version` and `onUpdate` is set. */
  latestVersion?: string;
  /** Runtime status of the extension (`running`, `disabled`, `error`, `restart-required`); sets the status pill. */
  runtime: ExtensionRuntimeStatus;
  /** Error detail shown when `runtime` is `error`. */
  error?: string;
  /** Shows an "Auth required" badge when the extension needs the user to sign in before it works. */
  authRequired?: boolean;
  /** Controlled on/off state of the enable switch. */
  enabled?: boolean;
  /** Initial on/off state when `enabled` is not controlled. */
  defaultEnabled?: boolean;
  /** Called with the new state when the user flips the enable switch. */
  onEnabledChange?: (enabled: boolean) => void;
  /** Called after the user consents to the update. */
  onUpdate?: () => void | Promise<void>;
  /** Changelog or notes shown in the consent dialog. */
  updateNotes?: React.ReactNode;
  /** New permissions requested by the update. */
  updatePermissions?: string[];
  /** Called when the user opens the extension's page or settings; the button is hidden when unset. */
  onOpen?: () => void;
  /** Called when the user hides the extension from the UI without uninstalling it; the button is hidden when unset. */
  onHide?: () => void;
  /** Called after the user confirms removal; may return a promise to keep the dialog busy until it settles. */
  onRemove?: () => void | Promise<void>;
  /** UI slots this extension contributes to (e.g. "sidebar.footer"). */
  slots?: string[];
  /** Setup command shown in a copyable block. */
  setupCommand?: string;
}

/** Installed plugin row: source, version, runtime status, auth, enable / update (consent) / open / hide / remove, slots and setup. */
export const InstalledExtensionCard = React.forwardRef<HTMLDivElement, InstalledExtensionCardProps>(
  (
    {
      name,
      icon,
      source,
      version,
      latestVersion,
      runtime,
      error,
      authRequired,
      enabled: enabledProp,
      defaultEnabled = true,
      onEnabledChange,
      onUpdate,
      updateNotes,
      updatePermissions,
      onOpen,
      onHide,
      onRemove,
      slots,
      setupCommand,
      className,
      ...props
    },
    ref
  ) => {
    const [enabled, setEnabled] = useControllableState({ value: enabledProp, defaultValue: defaultEnabled, onChange: onEnabledChange });
    const titleId = React.useId();
    const rt = runtimeMeta[runtime];
    const hasUpdate = Boolean(onUpdate && latestVersion && latestVersion !== version);
    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={titleId}
        data-slot="installed-extension-card"
        data-runtime={runtime}
        className={cn("space-y-3 rounded-box border border-border bg-card p-4 shadow-xs", className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          {icon ? (
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-box border border-border bg-background [&_svg]:size-[18px]">
              {icon}
            </span>
          ) : (
            <CapabilityMonogram name={name} />
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 id={titleId} className="truncate text-sm font-semibold text-foreground">
                {name}
              </h3>
              {version && <span className="font-mono text-xs text-muted-foreground">v{version}</span>}
              <StatusBadge status={rt.status} label={rt.label} size="sm" />
              {authRequired && (
                <Badge size="sm" color="warning" leadingIcon={<RiKey2Line aria-hidden className="size-3" />}>
                  Auth required
                </Badge>
              )}
            </div>
            {source && (
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <RiGitBranchLine aria-hidden className="size-3 shrink-0" />
                <span className="truncate font-mono">{source}</span>
              </p>
            )}
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label={`Enable ${name}`} />
        </div>
        {runtime === "restart-required" && (
          <p role="note" className="flex items-center gap-1.5 rounded-md bg-warning-soft px-2.5 py-1.5 text-xs text-warning-soft-foreground">
            <RiRestartLine aria-hidden className="size-3.5 shrink-0" />
            Takes effect after restart
          </p>
        )}
        {runtime === "error" && error && (
          <p className="flex items-start gap-1.5 rounded-md bg-destructive-soft px-2.5 py-1.5 font-mono text-xs text-destructive-soft-foreground">
            <RiErrorWarningLine aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            {error}
          </p>
        )}
        {slots && slots.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <RiLayoutMasonryLine aria-hidden className="size-3.5" />
              Contributes to
            </span>
            <ul aria-label="UI slots" className="flex flex-wrap gap-1">
              {slots.map((s) => (
                <li key={s}>
                  <Badge size="sm" variant="outline" className="font-mono">
                    {s}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
        {setupCommand && <CodeBlock code={setupCommand} language="bash" filename="Setup" theme="light" />}
        <div className="flex flex-wrap items-center gap-1.5">
          {hasUpdate && (
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="soft" leadingIcon={<RiArrowUpCircleLine aria-hidden />}>
                  Update to v{latestVersion}
                </Button>
              }
              title={`Update ${name} to v${latestVersion}?`}
              description={`You are on v${version ?? "?"}. Review what changes before updating.`}
              confirmLabel="Update"
              onConfirm={onUpdate}
            >
              <div className="space-y-3 text-sm">
                {updateNotes != null && <div className="text-muted-foreground">{updateNotes}</div>}
                {updatePermissions && updatePermissions.length > 0 && (
                  <InlineAlert variant="warning">
                    <InlineAlertTitle>New permissions requested</InlineAlertTitle>
                    <InlineAlertDescription>
                      <ul className="list-disc ps-4 font-mono text-xs">
                        {updatePermissions.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </InlineAlertDescription>
                  </InlineAlert>
                )}
              </div>
            </ConfirmDialog>
          )}
          {onOpen && (
            <Button size="sm" variant="ghost" onClick={onOpen}>
              Open
            </Button>
          )}
          <span className="flex-1" />
          {onHide && (
            <Button size="sm" variant="ghost" leadingIcon={<RiEyeOffLine aria-hidden />} onClick={onHide}>
              Hide
            </Button>
          )}
          {onRemove && (
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="ghost" className="text-destructive" leadingIcon={<RiDeleteBinLine aria-hidden />}>
                  Remove
                </Button>
              }
              tone="destructive"
              title={`Remove ${name}?`}
              description="The plugin and its settings are deleted. Its UI contributions disappear after restart."
              confirmLabel="Remove"
              onConfirm={onRemove}
            />
          )}
        </div>
      </div>
    );
  }
);
InstalledExtensionCard.displayName = "InstalledExtensionCard";

/* ------------------------------------------------------------------ */
/* ExtensionInstallDialog                                              */
/* ------------------------------------------------------------------ */

/** Install progress. Also accepts the canonical lifecycle names (`pending`, `running`, `succeeded`, `failed`, `canceled`). */
export type ExtensionInstallStatus = "idle" | "installing" | "success" | "error" | TaskStatusInput;

export interface ExtensionInstallDialogProps {
  /** Controlled open state of the dialog. */
  open?: boolean;
  /** Initial open state when `open` is not controlled. */
  defaultOpen?: boolean;
  /** Called when the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog when pressed. */
  trigger?: React.ReactNode;
  /** "catalog" installs a known entry; "git" asks for a URL. */
  mode?: "catalog" | "git";
  /** Name of the extension being installed (catalog mode). */
  name?: string;
  /** Source URL (prefill for git mode). */
  source?: string;
  /** Source is a verified publisher. */
  verified?: boolean;
  /** Commit sha / digest. */
  sha?: string;
  /** Permissions or capabilities requested. */
  permissions?: string[];
  /**
   * Progress of the install (`idle`, `installing`, `success`, `error`); the dialog shows the log and the Done button
   * once it leaves `idle`.
   */
  status?: ExtensionInstallStatus;
  /** Installer output lines streamed into the log view while installing. */
  log?: readonly LogLine[];
  /** Failure message shown when `status` is `error`. */
  error?: string;
  /** Called with the source (catalog id or git URL) when the user confirms the install. */
  onInstall?: (source: string) => void;
  /** Called by "Done" after success. */
  onDone?: () => void;
}

const GIT_URL_RE = /^(https?:\/\/|git@)[\w.@:/~-]+$/;

/** Install a plugin from the catalog or a git URL: source verification warning, advanced details, progress log and result. */
export function ExtensionInstallDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger,
  mode = "catalog",
  name,
  source = "",
  verified = false,
  sha,
  permissions = [],
  status = "idle",
  log,
  error,
  onInstall,
  onDone,
}: ExtensionInstallDialogProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const phase = status === "installing" ? "running" : normalizeTaskStatus(status);
  const installing = phase === "running";
  const [url, setUrl] = React.useState(source);
  const [advanced, setAdvanced] = React.useState(false);
  const [acknowledged, setAcknowledged] = React.useState(false);
  // The risk acknowledgement is per plugin and per opening: reset it when either changes.
  const ackKey = `${open}\u0000${name ?? ""}\u0000${source}`;
  const [ackFor, setAckFor] = React.useState(ackKey);
  if (ackFor !== ackKey) {
    setAckFor(ackKey);
    setAcknowledged(false);
  }
  React.useEffect(() => setUrl(source), [source]);
  const urlValid = mode === "catalog" || GIT_URL_RE.test(url.trim());
  const canInstall = urlValid && (verified || acknowledged) && !installing;
  const advId = React.useId();
  const urlId = React.useId();
  const ackId = React.useId();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-lg">
        <DialogHeader icon={<RiPuzzleLine aria-hidden />}>
          <DialogTitle>{name ? `Install ${name}` : "Install plugin"}</DialogTitle>
          <DialogDescription>{mode === "git" ? "Install a plugin from a git repository." : "Install this plugin from the catalog."}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {mode === "git" && (
            <div className="space-y-1.5">
              <label htmlFor={urlId} className="text-sm font-medium text-foreground">
                Git URL
              </label>
              <Input
                id={urlId}
                size="sm"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/org/plugin.git"
                className="font-mono"
                invalid={url.trim() !== "" && !urlValid}
                disabled={installing}
              />
              {url.trim() !== "" && !urlValid && <p className="text-xs text-destructive">Enter an https:// or git@ URL</p>}
            </div>
          )}
          {verified ? (
            <InlineAlert variant="success" icon={<RiShieldCheckLine aria-hidden />} role="note">
              <InlineAlertTitle>Verified source</InlineAlertTitle>
              <InlineAlertDescription>Signed by a verified publisher.</InlineAlertDescription>
            </InlineAlert>
          ) : (
            <InlineAlert variant="warning" icon={<RiAlertLine aria-hidden />} role="note" data-unverified>
              <InlineAlertTitle>Unverified source</InlineAlertTitle>
              <InlineAlertDescription>
                This plugin isn't signed by a verified publisher. Plugins run code on your machine with the permissions below.
                <label htmlFor={ackId} className="mt-2 flex items-center gap-2 font-medium">
                  <input id={ackId} type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="size-4 accent-current" />
                  I understand the risk
                </label>
              </InlineAlertDescription>
            </InlineAlert>
          )}
          {(sha || permissions.length > 0 || (mode === "catalog" && source)) && (
            <div className="rounded-box border border-border">
              <button
                type="button"
                aria-expanded={advanced}
                aria-controls={advanced ? advId : undefined}
                onClick={() => setAdvanced((a) => !a)}
                className={cn("flex w-full items-center gap-1.5 px-3 py-2 text-start text-sm font-medium text-foreground", focusRing)}
              >
                <RiArrowDownSLine aria-hidden className={cn("size-4 text-muted-foreground chevron-turn", !advanced && "-rotate-90 rtl:rotate-90")} />
                Advanced details
              </button>
              {advanced && (
                <div id={advId} className="space-y-3 border-t border-border px-3 py-3">
                  <KeyValueList>
                    {source && mode === "catalog" && <KeyValue label="Source" value={source} mono />}
                    {sha && <KeyValue label="Commit" value={sha} mono copyable />}
                  </KeyValueList>
                  {permissions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Requested permissions</p>
                      <ul className="flex flex-wrap gap-1">
                        {permissions.map((p) => (
                          <li key={p}>
                            <Badge size="sm" variant="outline" className="font-mono" leadingIcon={<RiShieldLine aria-hidden className="size-3" />}>
                              {p}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {phase !== "pending" && phase !== "canceled" && (
            <div className="space-y-2" data-install-status={status}>
              <p role="status" className="flex items-center gap-2 text-sm font-medium">
                {installing && (
                  <>
                    <Spinner size="xs" /> Installing…
                  </>
                )}
                {phase === "succeeded" && (
                  <span className="inline-flex items-center gap-1.5 text-success-soft-foreground">
                    <RiCheckLine aria-hidden className="size-4" /> Installed successfully
                  </span>
                )}
                {phase === "failed" && (
                  <span className="inline-flex items-center gap-1.5 text-destructive">
                    <RiCloseCircleLine aria-hidden className="size-4" /> Install failed{error ? `: ${error}` : ""}
                  </span>
                )}
              </p>
              {log && log.length > 0 && (
                <LogViewer lines={log} height={160} hideToolbar status={installing ? "live" : phase === "failed" ? "error" : "idle"} aria-label="Install log" />
              )}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          {phase === "succeeded" ? (
            <Button
              onClick={() => {
                onDone?.();
                setOpen(false);
              }}
            >
              Done
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={installing}>
                Cancel
              </Button>
              <Button onClick={() => onInstall?.(url.trim())} disabled={!canInstall} loading={installing} leadingIcon={<RiDownloadLine aria-hidden />}>
                {phase === "failed" ? "Retry" : "Install"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* SecurityScanVerdict                                                 */
/* ------------------------------------------------------------------ */

export type ScanVerdictLevel = "safe" | "caution" | "dangerous";
export type ScanSeverity = "critical" | "high" | "medium" | "low";

export const SCAN_SEVERITIES: ScanSeverity[] = ["critical", "high", "medium", "low"];

export interface ScanFinding {
  id?: string;
  severity: ScanSeverity;
  title: string;
  file?: string;
  line?: number;
  rule?: string;
  detail?: string;
}

/** Count findings per severity. */
export function countScanFindings(findings: ScanFinding[]): Record<ScanSeverity, number> {
  const out: Record<ScanSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) out[f.severity] += 1;
  return out;
}

const verdictMeta: Record<ScanVerdictLevel, { label: string; tone: string; icon: React.ReactNode }> = {
  safe: { label: "Safe", tone: cn("border-success/40", toneClasses.soft.success), icon: <RiShieldCheckLine aria-hidden /> },
  caution: { label: "Caution", tone: cn("border-warning/40", toneClasses.soft.warning), icon: <RiAlertLine aria-hidden /> },
  dangerous: { label: "Dangerous", tone: cn("border-destructive/40", toneClasses.soft.destructive), icon: <RiErrorWarningLine aria-hidden /> },
};

const severityColor: Record<ScanSeverity, BadgeColor> = { critical: "destructive", high: "orange", medium: "warning", low: "neutral" };

export interface SecurityScanVerdictProps extends React.HTMLAttributes<HTMLElement> {
  /** Overall scan result (`safe`, `caution` or `dangerous`); sets the headline and tone. */
  verdict: ScanVerdictLevel;
  /** Individual issues the scan found, listed under the verdict. */
  findings?: ScanFinding[];
  /** Policy outcome, e.g. "Blocked by policy" or "Allowed". */
  policy?: string;
  /** Colour of the policy badge: `allow` (success), `block` (destructive) or any `Tone`. `warn` is a deprecated alias of `warning`. */
  policyTone?: "allow" | "block" | ToneInput;
  /** Preformatted scan time. */
  scannedAt?: string;
  /** Name of the scanner that produced the verdict. */
  scanner?: string;
}

/** Security scan result: verdict, policy, per-severity counts and findings with file:line. */
export const SecurityScanVerdict = React.forwardRef<HTMLElement, SecurityScanVerdictProps>(
  ({ verdict, findings = [], policy, policyTone = "allow", scannedAt, scanner, className, ...props }, ref) => {
    const meta = verdictMeta[verdict];
    const policyColor: Tone = policyTone === "allow" ? "success" : policyTone === "block" ? "destructive" : normalizeTone(policyTone, "success");
    const counts = countScanFindings(findings);
    const sorted = [...findings].sort((a, b) => SCAN_SEVERITIES.indexOf(a.severity) - SCAN_SEVERITIES.indexOf(b.severity));
    const headId = React.useId();
    return (
      <section ref={ref} aria-labelledby={headId} data-slot="security-scan-verdict" data-verdict={verdict} className={cn("space-y-3", className)} {...props}>
        <div className={cn("flex flex-wrap items-center gap-3 rounded-box border p-3", meta.tone)}>
          <span aria-hidden className="[&_svg]:size-6">
            {meta.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h3 id={headId} className="text-sm font-semibold">
              Verdict: {meta.label}
            </h3>
            {(scanner || scannedAt) && (
              <p className="text-xs opacity-80">
                {scanner}
                {scanner && scannedAt && " · "}
                {scannedAt}
              </p>
            )}
          </div>
          {policy && (
            <Badge size="sm" variant="solid" color={policyColor} data-policy={policyTone}>
              {policy}
            </Badge>
          )}
        </div>
        <dl className="grid grid-cols-4 gap-2" aria-label="Findings by severity">
          {SCAN_SEVERITIES.map((s) => (
            <div key={s} data-severity={s} className="rounded-box border border-border bg-card px-3 py-2">
              <dt className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{s}</dt>
              <dd className={cn("text-lg font-semibold tabular-nums", counts[s] > 0 && (s === "critical" || s === "high") ? "text-destructive" : "text-foreground")}>
                {counts[s]}
              </dd>
            </div>
          ))}
        </dl>
        {sorted.length > 0 ? (
          <ul aria-label="Findings" className="divide-y divide-border rounded-box border border-border bg-card">
            {sorted.map((f, i) => (
              <li key={f.id ?? i} className="flex items-start gap-2 px-3 py-2">
                <Badge size="sm" color={severityColor[f.severity]} className="mt-0.5 capitalize">
                  {f.severity}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{f.title}</p>
                  {f.detail && <p className="text-xs text-muted-foreground">{f.detail}</p>}
                  {(f.file || f.rule) && (
                    <p className="font-mono text-xs text-muted-foreground">
                      {f.file && (
                        <span>
                          {f.file}
                          {f.line != null && `:${f.line}`}
                        </span>
                      )}
                      {f.file && f.rule && " · "}
                      {f.rule}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No findings.</p>
        )}
      </section>
    );
  }
);
SecurityScanVerdict.displayName = "SecurityScanVerdict";

/* ------------------------------------------------------------------ */
/* SkillCard / SkillDetail                                             */
/* ------------------------------------------------------------------ */

export interface SkillToolsetRef {
  name: string;
  icon?: React.ReactNode;
}

export interface SkillSummary {
  id: string;
  name: string;
  description?: string;
  provenance: CapabilityProvenance;
  category?: string;
  toolsets?: SkillToolsetRef[];
  enabled: boolean;
  trust?: CapabilityTrustLevel;
  /** Flagged by a scan; shows a warning. */
  flagged?: boolean;
}

export interface SkillCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** The skill to show (name, description, source, enabled state). */
  skill: SkillSummary;
  /** Marks the card as the selected one in a list. */
  selected?: boolean;
  /** Called when the card is pressed. */
  onSelect?: () => void;
  /** Called with the new state when the user flips the enable switch. */
  onEnabledChange?: (enabled: boolean) => void;
}

function ToolsetIcons({ toolsets }: { toolsets?: SkillToolsetRef[] }) {
  if (!toolsets?.length) return null;
  return (
    <ul aria-label="Toolsets" className="flex items-center gap-1">
      {toolsets.map((t) => (
        <li key={t.name} title={t.name} className="flex size-6 items-center justify-center rounded-md border border-border bg-background text-muted-foreground [&_svg]:size-3.5">
          {t.icon ? <span aria-hidden>{t.icon}</span> : <span aria-hidden className="text-2xs font-semibold">{t.name[0]?.toUpperCase()}</span>}
          <span className="sr-only">{t.name}</span>
        </li>
      ))}
    </ul>
  );
}

/** Skill list card: name, description, provenance, category, toolset icons and an enable switch. */
export const SkillCard = React.forwardRef<HTMLDivElement, SkillCardProps>(({ skill, selected, onSelect, onEnabledChange, className, ...props }, ref) => {
  const titleId = React.useId();
  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={titleId}
      data-slot="skill-card"
      data-selected={selected || undefined}
      className={cn(
        "relative flex gap-3 rounded-box border border-border bg-card p-3 shadow-xs transition-colors hover:border-border-strong",
        selected && "border-primary ring-1 ring-primary",
        skill.flagged && "border-destructive/50",
        className
      )}
      {...props}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {onSelect ? (
            <button type="button" onClick={onSelect} aria-pressed={selected} className={cn("truncate rounded-sm text-start font-mono text-sm font-semibold text-foreground hover:underline", focusRing)}>
              <span id={titleId}>{skill.name}</span>
            </button>
          ) : (
            <h3 id={titleId} className="truncate font-mono text-sm font-semibold text-foreground">
              {skill.name}
            </h3>
          )}
          <ProvenancePill provenance={skill.provenance} />
          {skill.flagged && (
            <Badge size="sm" color="destructive" leadingIcon={<RiAlertLine aria-hidden className="size-3" />}>
              Flagged
            </Badge>
          )}
        </div>
        {skill.description && <p className="line-clamp-2 text-sm text-muted-foreground">{skill.description}</p>}
        <div className="flex items-center gap-2">
          {skill.category && <span className="text-xs text-muted-foreground">{skill.category}</span>}
          <ToolsetIcons toolsets={skill.toolsets} />
        </div>
      </div>
      {onEnabledChange && (
        <Switch size="sm" checked={skill.enabled} onCheckedChange={onEnabledChange} aria-label={`Enable ${skill.name}`} disabled={skill.flagged} />
      )}
    </div>
  );
});
SkillCard.displayName = "SkillCard";

export interface SkillDetailProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The skill to show (name, description, source, enabled state). */
  skill: SkillSummary;
  /** SKILL.md body (markdown). */
  markdown?: string;
  /** Parsed SKILL.md frontmatter, shown as key/value rows on the Frontmatter tab. */
  frontmatter?: Record<string, unknown>;
  /** Security scan result for the skill; props of `SecurityScanVerdict`, shown on the Security tab. */
  scan?: SecurityScanVerdictProps;
  /** Controlled active tab (`preview`, `frontmatter` or `security`). */
  tab?: string;
  /** Initially active tab when `tab` is not controlled. */
  defaultTab?: "preview" | "frontmatter" | "security";
  /** Called with the tab id when the user switches tabs. */
  onTabChange?: (tab: string) => void;
  /** Called with the new state when the user flips the enable switch. */
  onEnabledChange?: (enabled: boolean) => void;
  /** Called after the user confirms archiving the skill; the button is hidden when unset. */
  onArchive?: () => void | Promise<void>;
  /** Called when the user presses Edit; the button is hidden when unset. */
  onEdit?: () => void;
  /** Called when the user closes the detail view; the close button is hidden when unset. */
  onClose?: () => void;
}

function formatFrontmatterValue(v: unknown): React.ReactNode {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v.map(String).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Skill detail: header with actions, SKILL.md preview, frontmatter and security scan tabs. */
export const SkillDetail = React.forwardRef<HTMLDivElement, SkillDetailProps>(
  ({ skill, markdown, frontmatter, scan, tab, defaultTab = "preview", onTabChange, onEnabledChange, onArchive, onEdit, onClose, className, ...props }, ref) => {
    const [current, setCurrent] = useControllableState<string>({ value: tab, defaultValue: defaultTab, onChange: onTabChange });
    return (
      <div ref={ref} data-slot="skill-detail" className={cn("space-y-4", className)} {...props}>
        <header className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="font-mono text-base font-semibold text-foreground">{skill.name}</h2>
                <ProvenancePill provenance={skill.provenance} />
                {skill.trust && <TrustBadge level={skill.trust} />}
              </div>
              {skill.description && <p className="text-sm text-muted-foreground">{skill.description}</p>}
              <div className="flex items-center gap-2">
                {skill.category && <span className="text-xs text-muted-foreground">{skill.category}</span>}
                <ToolsetIcons toolsets={skill.toolsets} />
              </div>
            </div>
            {onClose && (
              <Button size="icon-sm" variant="ghost" aria-label="Close" onClick={onClose}>
                <RiCloseCircleLine aria-hidden />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onEnabledChange && (
              <label className="flex items-center gap-2 text-sm">
                <Switch size="sm" checked={skill.enabled} onCheckedChange={onEnabledChange} disabled={skill.flagged} aria-label={`Enable ${skill.name}`} />
                {skill.enabled ? "Enabled" : "Disabled"}
              </label>
            )}
            <span className="flex-1" />
            {onEdit && (
              <Button size="sm" variant="outline" leadingIcon={<RiEditLine aria-hidden />} onClick={onEdit}>
                Edit
              </Button>
            )}
            {onArchive && (
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="ghost" leadingIcon={<RiArchiveLine aria-hidden />}>
                    Archive
                  </Button>
                }
                tone="destructive"
                title={`Archive ${skill.name}?`}
                description="The agent stops loading this skill. You can restore it from the archive."
                confirmLabel="Archive"
                onConfirm={onArchive}
              />
            )}
          </div>
          {skill.flagged && (
            <InlineAlert variant="destructive">
              <InlineAlertTitle>Flagged by security scan</InlineAlertTitle>
              <InlineAlertDescription>This skill stays disabled until the findings are reviewed.</InlineAlertDescription>
            </InlineAlert>
          )}
        </header>
        <Tabs value={current} onValueChange={setCurrent} variant="underline" size="sm" className="gap-3">
          <TabsList aria-label="Skill details">
            <TabsTrigger value="preview">SKILL.md</TabsTrigger>
            <TabsTrigger value="frontmatter">Frontmatter</TabsTrigger>
            {scan && (
              <TabsTrigger value="security" badge={scan.findings?.length || undefined}>
                Security
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="preview">
            {markdown ? (
              <div className="max-h-[480px] overflow-y-auto rounded-box border border-border bg-card p-4 scrollbar-thin">
                <Markdown>{markdown}</Markdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No SKILL.md content.</p>
            )}
          </TabsContent>
          <TabsContent value="frontmatter">
            {frontmatter && Object.keys(frontmatter).length ? (
              <KeyValueList mono>
                {Object.entries(frontmatter).map(([k, v]) => (
                  <KeyValue key={k} label={k} value={formatFrontmatterValue(v)} />
                ))}
              </KeyValueList>
            ) : (
              <p className="text-sm text-muted-foreground">No frontmatter.</p>
            )}
          </TabsContent>
          {scan && (
            <TabsContent value="security">
              <SecurityScanVerdict {...scan} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    );
  }
);
SkillDetail.displayName = "SkillDetail";

/* ------------------------------------------------------------------ */
/* SyncReceiptCard                                                     */
/* ------------------------------------------------------------------ */

export interface SyncReceiptUpdated {
  name: string;
  from?: string;
  to?: string;
}

export interface SyncReceiptIssue {
  name: string;
  reason?: string;
}

export interface SyncReceiptCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Heading of the receipt; defaults to a generic "Sync complete" style title. */
  title?: React.ReactNode;
  /** Preformatted time of the sync. */
  syncedAt?: string;
  /** Items that were updated by the sync, with old and new versions. */
  updated?: SyncReceiptUpdated[];
  /** Items that failed to sync, each with the reason. */
  failed?: SyncReceiptIssue[];
  /** Items disabled by a dependency conflict, each with the reason. */
  disabled?: SyncReceiptIssue[];
  /** Items with updates still available after the sync. */
  availableUpdates?: SyncReceiptUpdated[];
  /** Called when the user presses Retry on the failures; the button is hidden when unset. */
  onRetry?: () => void;
  /** Called when the user presses Update all for `availableUpdates`; the button is hidden when unset. */
  onUpdateAll?: () => void;
}

function ReceiptSection({
  label,
  count,
  tone,
  icon,
  children,
}: {
  label: string;
  count: number;
  tone: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!count) return null;
  return (
    <section aria-label={label} className="space-y-1.5">
      <h4 className={cn("flex items-center gap-1.5 text-xs font-semibold", tone)}>
        <span aria-hidden className="[&_svg]:size-3.5">
          {icon}
        </span>
        {label}
        <span className="tabular-nums">({count})</span>
      </h4>
      <ul className="space-y-1 ps-5 text-sm">{children}</ul>
    </section>
  );
}

/** Post-sync summary: updated, failed rebuilds, disabled by dependency conflict and available updates. */
export const SyncReceiptCard = React.forwardRef<HTMLElement, SyncReceiptCardProps>(
  ({ title = "Sync complete", syncedAt, updated = [], failed = [], disabled = [], availableUpdates = [], onRetry, onUpdateAll, className, ...props }, ref) => {
    const clean = !updated.length && !failed.length && !disabled.length && !availableUpdates.length;
    const headId = React.useId();
    return (
      <article ref={ref} aria-labelledby={headId} data-slot="sync-receipt-card" className={cn("space-y-3 rounded-box border border-border bg-card p-4 shadow-xs", className)} {...props}>
        <header className="flex items-center gap-2">
          <h3 id={headId} className="text-sm font-semibold text-foreground">
            {title}
          </h3>
          {syncedAt && <span className="text-xs text-muted-foreground">{syncedAt}</span>}
        </header>
        <div className="flex flex-wrap gap-1.5">
          <Badge size="sm" color="success">{updated.length} updated</Badge>
          {failed.length > 0 && <Badge size="sm" color="destructive">{failed.length} failed</Badge>}
          {disabled.length > 0 && <Badge size="sm" color="warning">{disabled.length} disabled</Badge>}
          {availableUpdates.length > 0 && <Badge size="sm" color="info">{availableUpdates.length} updates available</Badge>}
        </div>
        {clean && <p className="text-sm text-muted-foreground">Everything is up to date.</p>}
        <ReceiptSection label="Updated" count={updated.length} tone="text-success-soft-foreground" icon={<RiCheckLine aria-hidden />}>
          {updated.map((u) => (
            <li key={u.name} className="font-mono text-xs">
              {u.name}
              {(u.from || u.to) && (
                <span className="text-muted-foreground">
                  {" "}
                  {u.from} <FlowArrow /> {u.to}
                </span>
              )}
            </li>
          ))}
        </ReceiptSection>
        <ReceiptSection label="Failed rebuilds" count={failed.length} tone="text-destructive" icon={<RiCloseCircleLine aria-hidden />}>
          {failed.map((f) => (
            <li key={f.name} className="text-xs">
              <span className="font-mono">{f.name}</span>
              {f.reason && <span className="text-muted-foreground"> — {f.reason}</span>}
            </li>
          ))}
        </ReceiptSection>
        <ReceiptSection label="Disabled by dependency conflict" count={disabled.length} tone="text-warning-soft-foreground" icon={<RiAlertLine aria-hidden />}>
          {disabled.map((f) => (
            <li key={f.name} className="text-xs">
              <span className="font-mono">{f.name}</span>
              {f.reason && <span className="text-muted-foreground"> — {f.reason}</span>}
            </li>
          ))}
        </ReceiptSection>
        <ReceiptSection label="Available updates" count={availableUpdates.length} tone="text-info-soft-foreground" icon={<RiArrowUpCircleLine aria-hidden />}>
          {availableUpdates.map((u) => (
            <li key={u.name} className="font-mono text-xs">
              {u.name}
              {u.to && <span className="text-muted-foreground"> <FlowArrow /> {u.to}</span>}
            </li>
          ))}
        </ReceiptSection>
        {(onRetry || onUpdateAll) && (failed.length > 0 || availableUpdates.length > 0) && (
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            {onRetry && failed.length > 0 && (
              <Button size="sm" variant="ghost" leadingIcon={<RiRestartLine aria-hidden />} onClick={onRetry}>
                Retry failed
              </Button>
            )}
            {onUpdateAll && availableUpdates.length > 0 && (
              <Button size="sm" variant="soft" leadingIcon={<RiArrowUpCircleLine aria-hidden />} onClick={onUpdateAll}>
                Update all
              </Button>
            )}
          </div>
        )}
      </article>
    );
  }
);
SyncReceiptCard.displayName = "SyncReceiptCard";

