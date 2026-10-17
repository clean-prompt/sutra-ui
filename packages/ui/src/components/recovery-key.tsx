import * as React from "react";
import {
  RiCheckLine,
  RiCheckboxCircleFill,
  RiDownloadLine,
  RiEyeLine,
  RiEyeOffLine,
  RiFileCopyLine,
  RiPrinterLine,
  RiShareLine,
} from "@remixicon/react";
import { cn } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { useCopy } from "../hooks/use-copy";
import { Button } from "./button";
import { Input, type InputProps } from "./input";
import { downloadTextFile } from "./secret";

/** Uppercase and strip everything outside the alphabet. */
export function normalizeRecoveryKey(value: string, alphabet: RegExp = /[A-Z0-9]/) {
  return Array.from(value.toUpperCase())
    .filter((ch) => alphabet.test(ch))
    .join("");
}

/** Split a key into fixed-size groups: "ABCDEFGH" → ["ABCD", "EFGH"]. */
export function groupRecoveryKey(value: string, groupSize = 4, alphabet?: RegExp) {
  const clean = normalizeRecoveryKey(value, alphabet);
  const groups: string[] = [];
  for (let i = 0; i < clean.length; i += groupSize) groups.push(clean.slice(i, i + groupSize));
  return groups;
}

function printText(title: string, body: string) {
  if (typeof document === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0";
  document.body.appendChild(iframe);
  try {
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (doc && win) {
      doc.open();
      doc.write(
        `<!doctype html><title>${title.replace(/</g, "&lt;")}</title><body style="font-family:ui-monospace,monospace;padding:40px"><h1 style="font:600 18px system-ui">${title.replace(/</g, "&lt;")}</h1><pre style="font-size:20px;letter-spacing:0.08em;line-height:1.8">${body.replace(/</g, "&lt;")}</pre></body>`
      );
      doc.close();
      win.focus();
      win.print();
    }
  } catch {
    /* printing unavailable */
  } finally {
    setTimeout(() => iframe.remove(), 1000);
  }
}

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* RecoveryKey                                                         */
/* ------------------------------------------------------------------ */

export type RecoveryKeyStep = "show" | "confirm" | "done";

export interface RecoveryKeyProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  /** The raw key (separators are ignored). */
  value: string;
  groupSize?: number;
  /** Grid columns for the groups. Default 4. */
  columns?: 2 | 3 | 4 | 6;
  title?: string;
  /** Download file name; `false` hides the button. */
  fileName?: string | false;
  /** File body. Defaults to a short header plus the grouped key. */
  fileContent?: string;
  /** Show a Share button when the Web Share API is available. */
  share?: boolean;
  /** Show a Print button. Default true. */
  printable?: boolean;
  /** Hide the key after this many ms (0 disables). Default 60000. */
  autoClearAfter?: number;
  /** Fired when the key is hidden (timer or "Hide now"). */
  onHide?: () => void;
  /** Ask the user to type the last 4 characters before finishing. Default true. */
  confirm?: boolean;
  /** Called after the confirm step succeeds (or on "I've saved it" when `confirm` is false). */
  onConfirmed?: () => void;
  onCopy?: () => void;
  onDownload?: () => void;
  /** Override printing. */
  onPrint?: () => void;
}

/** Recovery key panel: grouped mono grid, copy/download/share/print, auto-clear countdown and a confirm-saved step. */
export const RecoveryKey = React.forwardRef<HTMLDivElement, RecoveryKeyProps>(
  (
    {
      value,
      groupSize = 4,
      columns = 4,
      title = "Recovery key",
      fileName = "recovery-key.txt",
      fileContent,
      share = false,
      printable = true,
      autoClearAfter = 60000,
      onHide,
      confirm = true,
      onConfirmed,
      onCopy,
      onDownload,
      onPrint,
      className,
      ...props
    },
    ref
  ) => {
    const groups = React.useMemo(() => groupRecoveryKey(value, groupSize), [value, groupSize]);
    const formatted = groups.join("-");
    const clean = groups.join("");
    const [step, setStep] = React.useState<RecoveryKeyStep>("show");
    const [visible, setVisible] = React.useState(true);
    const [left, setLeft] = React.useState(Math.ceil(autoClearAfter / 1000));
    const [typed, setTyped] = React.useState("");
    const [error, setError] = React.useState<string>();
    const { copied, copy } = useCopy(2000);
    const inputId = React.useId();
    const onHideRef = React.useRef(onHide);
    onHideRef.current = onHide;

    const hide = React.useCallback(() => {
      setVisible(false);
      onHideRef.current?.();
    }, []);

    React.useEffect(() => {
      if (!visible || autoClearAfter <= 0 || step !== "show") return;
      const deadline = Date.now() + autoClearAfter;
      setLeft(Math.ceil(autoClearAfter / 1000));
      const id = setInterval(() => {
        const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        setLeft(s);
        if (s === 0) {
          clearInterval(id);
          hide();
        }
      }, 250);
      return () => clearInterval(id);
    }, [visible, autoClearAfter, step, hide]);

    const body = fileContent ?? `${title}\n\n${formatted}\n\nKeep this somewhere safe and offline. Anyone with this key can recover your account.\n`;
    const canShare = share && typeof navigator !== "undefined" && typeof navigator.share === "function";

    const handleDone = () => {
      if (confirm) {
        setStep("confirm");
        setTyped("");
        setError(undefined);
      } else {
        setStep("done");
        onConfirmed?.();
      }
    };

    const submitConfirm = (e: React.FormEvent) => {
      e.preventDefault();
      if (normalizeRecoveryKey(typed) === clean.slice(-4)) {
        setStep("done");
        setError(undefined);
        onConfirmed?.();
      } else {
        setError("That doesn't match the end of your key.");
      }
    };

    return (
      <div
        ref={ref}
        data-slot="recovery-key"
        data-step={step}
        className={cn("flex flex-col gap-4 rounded-box border border-border bg-card p-5 text-card-foreground shadow-xs", className)}
        {...props}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{title}</p>
          {step === "show" && visible && autoClearAfter > 0 && (
            <span role="timer" aria-live="off" className="text-xs tabular-nums text-muted-foreground">
              Hides in {formatClock(left)}
            </span>
          )}
        </div>

        {step === "show" && (
          <>
            {visible ? (
              <ol
                aria-label={`${title}, ${groups.length} groups`}
                data-slot="recovery-key-groups"
                className={cn(
                  "grid gap-2 font-mono",
                  { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4", 6: "grid-cols-3 sm:grid-cols-6" }[columns]
                )}
              >
                {groups.map((g, i) => (
                  <li
                    key={i}
                    className="flex items-baseline gap-1.5 rounded-md border border-border bg-subtle px-2.5 py-2 text-sm font-semibold tracking-[0.12em] text-foreground"
                  >
                    <span aria-hidden className="text-2xs font-normal tracking-normal text-muted-foreground tabular-nums">
                      {i + 1}
                    </span>
                    {g}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-subtle px-4 py-6 text-center">
                <RiEyeOffLine aria-hidden className="size-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Key hidden from screen.</p>
                <Button variant="ghost" size="sm" leadingIcon={<RiEyeLine />} onClick={() => setVisible(true)}>
                  Show again
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={copied ? <RiCheckLine className="text-success" /> : <RiFileCopyLine />}
                onClick={async () => {
                  if (await copy(formatted)) onCopy?.();
                }}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
              {fileName !== false && (
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={<RiDownloadLine />}
                  onClick={() => {
                    downloadTextFile(body, fileName);
                    onDownload?.();
                  }}
                >
                  Download
                </Button>
              )}
              {canShare && (
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={<RiShareLine />}
                  onClick={() => navigator.share({ title, text: body }).catch(() => undefined)}
                >
                  Share
                </Button>
              )}
              {printable && (
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={<RiPrinterLine />}
                  onClick={() => (onPrint ? onPrint() : printText(title, formatted))}
                >
                  Print
                </Button>
              )}
              {visible && (
                <Button variant="ghost" size="sm" leadingIcon={<RiEyeOffLine />} onClick={hide} className="sm:ml-auto">
                  Hide now
                </Button>
              )}
            </div>
            <div className="flex justify-end border-t border-border pt-4">
              <Button onClick={handleDone}>I've saved it</Button>
            </div>
          </>
        )}

        {step === "confirm" && (
          <form onSubmit={submitConfirm} className="flex flex-col gap-3" noValidate>
            <label htmlFor={inputId} className="text-sm text-foreground">
              Type the last 4 characters of your key to confirm you saved it.
            </label>
            <Input
              id={inputId}
              value={typed}
              onChange={(e) => {
                setTyped(normalizeRecoveryKey(e.target.value).slice(0, 4));
                setError(undefined);
              }}
              autoComplete="off"
              spellCheck={false}
              maxLength={4}
              invalid={!!error}
              aria-describedby={error ? `${inputId}-error` : undefined}
              className="w-32 font-mono uppercase tracking-[0.2em]"
              autoFocus
            />
            {error && (
              <p id={`${inputId}-error`} role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep("show")}>
                Back
              </Button>
              <Button type="submit" disabled={typed.length < 4}>
                Confirm
              </Button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div role="status" className="flex items-center gap-2 text-sm text-success">
            <RiCheckboxCircleFill aria-hidden className="size-5" />
            Recovery key saved.
          </div>
        )}
      </div>
    );
  }
);
RecoveryKey.displayName = "RecoveryKey";

/* ------------------------------------------------------------------ */
/* RecoveryKeyInput                                                    */
/* ------------------------------------------------------------------ */

export interface RecoveryKeyInputProps
  extends Omit<InputProps, "value" | "defaultValue" | "onChange" | "maxLength"> {
  /** Normalized key (no separators). */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called once the key reaches `length` and passes `validate`. */
  onComplete?: (value: string) => void;
  /** Expected number of characters. Default 24. */
  length?: number;
  groupSize?: number;
  separator?: string;
  /** Allowed characters (tested per uppercased char). */
  alphabet?: RegExp;
  /** Return true or an error message. */
  validate?: (value: string) => boolean | string;
  /** Show the "n / length" counter and validity hint. Default true. */
  showStatus?: boolean;
}

/** Recovery key entry with auto-grouping, uppercase normalization and validation. */
export const RecoveryKeyInput = React.forwardRef<HTMLInputElement, RecoveryKeyInputProps>(
  (
    {
      value: valueProp,
      defaultValue = "",
      onValueChange,
      onComplete,
      length = 24,
      groupSize = 4,
      separator = "-",
      alphabet = /[A-Z0-9]/,
      validate,
      showStatus = true,
      invalid,
      className,
      id,
      placeholder,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);
    const caret = React.useRef<number | null>(null);
    const generated = React.useId();
    const inputId = id ?? generated;
    const statusId = `${inputId}-status`;

    const format = React.useCallback(
      (raw: string) => {
        const parts: string[] = [];
        for (let i = 0; i < raw.length; i += groupSize) parts.push(raw.slice(i, i + groupSize));
        return parts.join(separator);
      },
      [groupSize, separator]
    );

    const complete = value.length === length;
    const verdict = complete && validate ? validate(value) : true;
    const error = complete ? (verdict === true ? undefined : typeof verdict === "string" ? verdict : "This key isn't valid.") : undefined;
    const valid = complete && !error;

    const completeRef = React.useRef(onComplete);
    completeRef.current = onComplete;
    React.useEffect(() => {
      if (valid) completeRef.current?.(value);
    }, [valid, value]);

    React.useLayoutEffect(() => {
      const el = innerRef.current;
      if (el && caret.current != null && document.activeElement === el) {
        el.setSelectionRange(caret.current, caret.current);
        caret.current = null;
      }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const el = e.target;
      const pos = el.selectionStart ?? el.value.length;
      const before = normalizeRecoveryKey(el.value.slice(0, pos), alphabet).length;
      const raw = normalizeRecoveryKey(el.value, alphabet).slice(0, length);
      const n = Math.min(before, raw.length);
      caret.current = n + Math.floor(Math.max(0, n - 1) / groupSize) * separator.length + (n > 0 && n % groupSize === 0 && n < raw.length ? separator.length : 0);
      setValue(raw);
    };

    const exampleGroups = Math.ceil(length / groupSize);
    const ph = placeholder ?? Array.from({ length: exampleGroups }, () => "X".repeat(groupSize)).join(separator);

    return (
      <div data-slot="recovery-key-input" className="grid gap-1.5">
        <Input
          ref={innerRef}
          id={inputId}
          value={format(value)}
          onChange={handleChange}
          placeholder={ph}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          invalid={invalid || !!error}
          aria-describedby={showStatus ? statusId : undefined}
          className={cn("font-mono uppercase tracking-[0.08em]", className)}
          trailingIcon={valid ? <RiCheckboxCircleFill aria-hidden className="size-4 text-success" /> : undefined}
          {...props}
        />
        {showStatus && (
          <p id={statusId} aria-live="polite" className={cn("text-xs tabular-nums", error ? "text-destructive" : "text-muted-foreground")}>
            {error ?? (valid ? "Recovery key looks good." : `${value.length} / ${length} characters`)}
          </p>
        )}
      </div>
    );
  }
);
RecoveryKeyInput.displayName = "RecoveryKeyInput";
