import * as React from "react";
import { RiAlertLine, RiDownloadLine, RiEyeLine, RiEyeOffLine, RiKey2Line } from "@remixicon/react";
import { cn } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { Button } from "./button";
import { Badge, type BadgeColor } from "./badge";
import { CheckboxField } from "./checkbox";
import { CopyButton } from "./copy-button";
import { getPasswordScore } from "./password-strength";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Save text as a file through a Blob + temporary anchor. */
export function downloadTextFile(text: string, fileName: string, mimeType = "text/plain;charset=utf-8") {
  if (typeof document === "undefined") return;
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    a.remove();
    setTimeout(() => URL.revokeObjectURL?.(url), 0);
  }
}

/**
 * Pending clipboard clears, keyed by the copied value. Module-level on purpose: a clear must still
 * happen after the component that scheduled it unmounts, or the secret would stay on the clipboard.
 */
const pendingClipboardClears = new Map<string, ReturnType<typeof setTimeout>>();

/** Can we read the clipboard without prompting? Falls back to "yes" only where no Permissions API exists. */
function canReadClipboard(): Promise<boolean> {
  const permissions = typeof navigator !== "undefined" ? navigator.permissions : undefined;
  if (!permissions?.query) return Promise.resolve(true);
  try {
    return permissions.query({ name: "clipboard-read" as PermissionName }).then(
      (status) => status.state === "granted",
      () => false
    );
  } catch {
    return Promise.resolve(false);
  }
}

/** Empty the clipboard, but only if it still holds `value` when that can be checked. */
function clearClipboardIfUnchanged(value: string) {
  const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
  if (!clipboard?.writeText) return;
  const wipe = () => {
    clipboard.writeText("").catch(() => undefined);
  };
  if (typeof clipboard.readText !== "function") {
    wipe();
    return;
  }
  void canReadClipboard().then((readable) => {
    if (!readable) return wipe();
    return clipboard.readText().then((current) => {
      if (current === value) wipe();
    }, wipe);
  });
}

/** Schedule a clipboard clear for `value` in `ms`. Survives unmounts; re-copying the same value restarts it. */
function scheduleClipboardClear(value: string, ms: number) {
  clearTimeout(pendingClipboardClears.get(value));
  pendingClipboardClears.set(
    value,
    setTimeout(() => {
      pendingClipboardClears.delete(value);
      clearClipboardIfUnchanged(value);
    }, ms)
  );
}

const strengthMeta: Record<0 | 1 | 2 | 3 | 4, { label: string; color: BadgeColor }> = {
  0: { label: "Very weak", color: "destructive" },
  1: { label: "Weak", color: "destructive" },
  2: { label: "Fair", color: "warning" },
  3: { label: "Good", color: "info" },
  4: { label: "Strong", color: "success" },
};

/** Draws text into a canvas (DOM text scrapers can't read it). */
function SecretCanvas({ value, label, className }: { value: string; label: string; className?: string }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext?.("2d");
    if (!ctx) return;
    const style = getComputedStyle(canvas);
    const fontSize = parseFloat(style.fontSize) || 13;
    const font = `${style.fontWeight || "500"} ${fontSize}px ${style.fontFamily || "ui-monospace, monospace"}`;
    const dpr = window.devicePixelRatio || 1;
    ctx.font = font;
    const width = Math.ceil(ctx.measureText(value).width) + 2;
    const height = Math.ceil(fontSize * 1.5);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.ceil(width * dpr);
    canvas.height = Math.ceil(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.font = font;
    ctx.fillStyle = style.color || "#111";
    ctx.textBaseline = "middle";
    ctx.fillText(value, 1, height / 2);
  }, [value]);
  return <canvas ref={ref} role="img" aria-label={label} data-slot="secret-canvas" className={cn("block max-w-full", className)} />;
}

/* ------------------------------------------------------------------ */
/* SecretText / SecretField                                            */
/* ------------------------------------------------------------------ */

export interface SecretTextProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onCopy"> {
  value: string;
  revealed?: boolean;
  defaultRevealed?: boolean;
  onRevealedChange?: (revealed: boolean) => void;
  /** Auto-hide this many ms after revealing. */
  revealFor?: number;
  /** Fixed mask length so the secret's length isn't leaked. Default 8. */
  maskLength?: number;
  maskChar?: string;
  /** Show a reveal toggle. Default true. */
  revealable?: boolean;
  /** Show a copy button. Default true. */
  copyable?: boolean;
  onCopy?: () => void;
  /** Clear the clipboard this many ms after copying (0 disables). Default 30000. */
  clipboardClearAfter?: number;
  /** `canvas` draws the revealed value into a <canvas> so it never lands in the DOM as text. */
  renderAs?: "text" | "canvas";
  /** Accessible name used for the canvas and buttons, e.g. "Password". */
  label?: string;
  /** Strength badge: a 0–4 score, or `"auto"` to score the value. */
  strength?: 0 | 1 | 2 | 3 | 4 | "auto";
  mono?: boolean;
  /** `field` renders a bordered input-like box. */
  variant?: "inline" | "field";
}

/** Masked secret with reveal (optionally timed), copy with clipboard auto-clear, and canvas rendering. */
export const SecretText = React.forwardRef<HTMLDivElement, SecretTextProps>(
  (
    {
      value,
      revealed: revealedProp,
      defaultRevealed = false,
      onRevealedChange,
      revealFor,
      maskLength = 8,
      maskChar = "•",
      revealable = true,
      copyable = true,
      onCopy,
      clipboardClearAfter = 30000,
      renderAs = "text",
      label = "Secret",
      strength,
      mono = true,
      variant = "inline",
      className,
      ...props
    },
    ref
  ) => {
    const [revealed, setRevealed] = useControllableState({
      value: revealedProp,
      defaultValue: defaultRevealed,
      onChange: onRevealedChange,
    });
    const [clearNote, setClearNote] = React.useState(false);
    // Only hides the "Clipboard clears in…" note; the clear itself is scheduled at module level.
    const noteTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
    React.useEffect(() => () => clearTimeout(noteTimer.current), []);

    React.useEffect(() => {
      if (!revealed || !revealFor) return;
      const id = setTimeout(() => setRevealed(false), revealFor);
      return () => clearTimeout(id);
    }, [revealed, revealFor, setRevealed]);

    const handleCopied = () => {
      onCopy?.();
      if (clipboardClearAfter > 0) {
        setClearNote(true);
        scheduleClipboardClear(value, clipboardClearAfter);
        clearTimeout(noteTimer.current);
        noteTimer.current = setTimeout(() => setClearNote(false), clipboardClearAfter);
      }
    };

    const score = strength === "auto" ? getPasswordScore(value) : strength;
    const field = variant === "field";

    return (
      <div
        ref={ref}
        data-slot="secret-text"
        data-revealed={revealed || undefined}
        className={cn("flex min-w-0 flex-col gap-1", className)}
        {...props}
      >
        <div
          className={cn(
            "flex min-w-0 items-center gap-1",
            field && "h-9 rounded-control border border-input bg-subtle pl-3 pr-1 shadow-xs"
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate text-sm text-foreground", mono && "font-mono tracking-tight")}>
            {revealed ? (
              renderAs === "canvas" ? (
                <SecretCanvas value={value} label={`${label} (shown as an image; use Copy to copy it)`} />
              ) : (
                <span data-slot="secret-value">{value}</span>
              )
            ) : (
              <>
                <span aria-hidden data-slot="secret-mask" className="tracking-widest text-muted-foreground">
                  {maskChar.repeat(maskLength)}
                </span>
                <span className="sr-only">{label} hidden</span>
              </>
            )}
          </span>
          {score !== undefined && (
            <Badge size="sm" color={strengthMeta[score].color} data-slot="secret-strength">
              {strengthMeta[score].label}
            </Badge>
          )}
          {revealable && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
              aria-pressed={revealed}
              onClick={() => setRevealed(!revealed)}
              className="text-muted-foreground hover:text-foreground"
            >
              {revealed ? <RiEyeOffLine /> : <RiEyeLine />}
            </Button>
          )}
          {copyable && (
            <CopyButton value={value} size="xs" label={`Copy ${label.toLowerCase()}`} copiedLabel="Copied" timeout={2000} onCopied={handleCopied} />
          )}
        </div>
        {clearNote && (
          <p role="status" className="text-xs text-muted-foreground">
            Copied. Clipboard clears in {Math.round(clipboardClearAfter / 1000)}s.
          </p>
        )}
      </div>
    );
  }
);
SecretText.displayName = "SecretText";

export interface SecretFieldProps extends Omit<SecretTextProps, "variant" | "label"> {
  /** Visible field label (also used as the accessible name). */
  label: string;
  description?: React.ReactNode;
}

/** Labeled, input-styled `SecretText`. */
export const SecretField = React.forwardRef<HTMLDivElement, SecretFieldProps>(
  ({ label, description, className, id, ...props }, ref) => {
    const generated = React.useId();
    const labelId = `${id ?? generated}-label`;
    return (
      <div ref={ref} id={id} role="group" aria-labelledby={labelId} data-slot="secret-field" className={cn("grid gap-1.5", className)}>
        <span id={labelId} className="text-sm font-medium leading-none text-foreground">
          {label}
        </span>
        <SecretText variant="field" label={label} {...props} />
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    );
  }
);
SecretField.displayName = "SecretField";

/* ------------------------------------------------------------------ */
/* SecretRevealOnce                                                    */
/* ------------------------------------------------------------------ */

export interface SecretRevealOnceProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "children" | "onCopy"> {
  secret: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  acknowledgeLabel?: React.ReactNode;
  doneLabel?: React.ReactNode;
  onDone?: () => void;
  onCopy?: () => void;
  /** File name for the download button; `false` hides it. Default "secret.txt". */
  fileName?: string | false;
  /** Content written to the downloaded file. Defaults to the secret plus a newline. */
  fileContent?: string;
  renderAs?: "text" | "canvas";
  /** Extra content between the secret and the acknowledgement (e.g. usage snippet). */
  children?: React.ReactNode;
}

/** Show-once secret: copy or download it now, acknowledge, then Done. */
export const SecretRevealOnce = React.forwardRef<HTMLDivElement, SecretRevealOnceProps>(
  (
    {
      secret,
      title = "Copy this key now",
      description = "Only a hash is stored. You won't be able to see this key again.",
      acknowledgeLabel = "I've stored this key somewhere safe",
      doneLabel = "Done",
      onDone,
      onCopy,
      fileName = "secret.txt",
      fileContent,
      renderAs = "text",
      children,
      className,
      ...props
    },
    ref
  ) => {
    const [ack, setAck] = React.useState(false);
    const titleId = React.useId();
    return (
      <div
        ref={ref}
        role="region"
        aria-labelledby={titleId}
        data-slot="secret-reveal-once"
        className={cn("flex flex-col gap-4", className)}
        {...props}
      >
        <div className="flex items-start gap-3 rounded-box border border-warning/40 bg-warning-soft p-3 text-warning-soft-foreground">
          <RiAlertLine aria-hidden className="mt-0.5 size-4 shrink-0" />
          <div className="grid gap-0.5">
            <p id={titleId} className="text-sm font-semibold">
              {title}
            </p>
            <p className="text-sm opacity-90">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-box border border-border bg-subtle p-3">
          <RiKey2Line aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 break-all font-mono text-sm text-foreground" data-slot="secret-reveal-value">
            {renderAs === "canvas" ? <SecretCanvas value={secret} label="New secret (shown as an image; use Copy to copy it)" /> : secret}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton variant="button" value={secret} label="Copy" copiedLabel="Copied" timeout={2000} onCopied={() => onCopy?.()} />
          {fileName !== false && (
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<RiDownloadLine />}
              onClick={() => downloadTextFile(fileContent ?? `${secret}\n`, fileName)}
            >
              Download
            </Button>
          )}
        </div>
        {children}
        <CheckboxField label={acknowledgeLabel} checked={ack} onCheckedChange={(v) => setAck(v === true)} />
        <div className="flex justify-end">
          <Button disabled={!ack} onClick={onDone}>
            {doneLabel}
          </Button>
        </div>
      </div>
    );
  }
);
SecretRevealOnce.displayName = "SecretRevealOnce";
