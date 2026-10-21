/** Installing an extension: the ExtensionInstallDialog and its install status. */
import * as React from "react";
import { RiAlertLine, RiArrowDownSLine, RiCheckLine, RiCloseCircleLine, RiDownloadLine, RiPuzzleLine, RiShieldCheckLine, RiShieldLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { normalizeTaskStatus, type TaskStatusInput } from "../../lib/status";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../primitives/dialog";
import { InlineAlert, InlineAlertDescription, InlineAlertTitle } from "../../primitives/inline-alert";
import { Input } from "../../primitives/input";
import { KeyValue, KeyValueList } from "../../primitives/key-value";
import { LogViewer, type LogLine } from "../../patterns/log-viewer";
import { Spinner } from "../../primitives/spinner";

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
