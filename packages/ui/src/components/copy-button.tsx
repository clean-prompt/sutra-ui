import * as React from "react";
import { RiCheckLine, RiFileCopyLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useCopy } from "../hooks/use-copy";
import { buttonVariants } from "./button";

/* ------------------------------------------------------------------ */
/* CopyButton                                                          */
/* ------------------------------------------------------------------ */

export type CopyButtonVariant = "icon" | "button" | "ghost";
export type CopyButtonSize = "xs" | "sm" | "md";

export interface CopyButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "children" | "onCopy"> {
  /** Text to copy, or a function read at click time. */
  value: string | (() => string);
  /** Accessible name (icon variant) or visible text. Default `"Copy"`. */
  label?: string;
  /** Shown for `timeout` ms after a successful copy. Default `"Copied"`. */
  copiedLabel?: string;
  /** `"icon"` (default, icon-only), `"button"` (bordered, icon + text) or `"ghost"` (icon + text). */
  variant?: CopyButtonVariant;
  /** Default `"sm"`. */
  size?: CopyButtonSize;
  /** How long the copied state lasts, in ms. Default 1600. */
  timeout?: number;
  /** Called with the copied text after a successful copy. */
  onCopied?: (text: string) => void;
}

const iconSize: Record<CopyButtonSize, string> = { xs: "size-6", sm: "size-7", md: "size-8" };
const glyphSize: Record<CopyButtonSize, string> = { xs: "size-3.5", sm: "size-4", md: "size-4" };

/** Copies a value to the clipboard, swaps to a check mark and announces "Copied to clipboard". */
export const CopyButton = React.forwardRef<HTMLButtonElement, CopyButtonProps>(
  (
    {
      value,
      label = "Copy",
      copiedLabel = "Copied",
      variant = "icon",
      size = "sm",
      timeout,
      onCopied,
      onClick,
      className,
      type = "button",
      ...props
    },
    ref
  ) => {
    const { copied, copy } = useCopy(timeout);
    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      let text: string;
      try {
        text = typeof value === "function" ? value() : value;
      } catch {
        return;
      }
      if (await copy(String(text ?? ""))) onCopied?.(String(text ?? ""));
    };
    const current = copied ? copiedLabel : label;
    const isIcon = variant === "icon";
    const glyphs = (
      <span aria-hidden className={cn("relative inline-flex shrink-0 items-center justify-center", glyphSize[size])}>
        <RiFileCopyLine
          aria-hidden
          className={cn(
            "absolute size-full transition-[opacity,transform] duration-200",
            copied ? "scale-50 opacity-0" : "scale-100 opacity-100"
          )}
        />
        <RiCheckLine
          aria-hidden
          className={cn(
            "absolute size-full text-success transition-[opacity,transform] duration-200",
            copied ? "scale-100 opacity-100" : "scale-50 opacity-0"
          )}
        />
      </span>
    );
    return (
      <>
        <button
          ref={ref}
          type={type}
          data-copied={copied ? "" : undefined}
          aria-label={isIcon ? current : undefined}
          title={isIcon ? current : undefined}
          onClick={(e) => void handleClick(e)}
          className={cn(
            isIcon
              ? [
                  "relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
                  iconSize[size],
                  focusRing,
                ]
              : buttonVariants({ variant: variant === "button" ? "secondary" : "ghost", size }),
            className
          )}
          {...props}
        >
          {glyphs}
          {isIcon ? null : <span>{current}</span>}
        </button>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {copied ? "Copied to clipboard" : ""}
        </span>
      </>
    );
  }
);
CopyButton.displayName = "CopyButton";

/* ------------------------------------------------------------------ */
/* CopyField                                                           */
/* ------------------------------------------------------------------ */

export interface CopyFieldProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "prefix"> {
  /** The text shown and copied. */
  value: string;
  /** What the value is (e.g. "API key"); names the group and the copy button ("Copy API key"). */
  label?: string;
  /** Monospace text. Default true. */
  mono?: boolean;
  /** Decorative lead-in that is not copied, e.g. `"$"` for shell commands. */
  prefix?: React.ReactNode;
  /** Truncate long values with an ellipsis (full value in the tooltip). Default true. */
  truncate?: boolean;
  /** `"field"` (default, input-like row) or `"chip"` (compact inline pill). */
  variant?: "field" | "chip";
  /** Props for the inner copy button. */
  copyButtonProps?: Partial<Omit<CopyButtonProps, "value">>;
}

/** Read-only value with a copy button, for commands, ids, keys and URLs. */
export const CopyField = React.forwardRef<HTMLDivElement, CopyFieldProps>(
  (
    { value, label, mono = true, prefix, truncate = true, variant = "field", copyButtonProps, className, ...props },
    ref
  ) => {
    const chip = variant === "chip";
    const Value = mono ? "code" : "span";
    return (
      <div
        ref={ref}
        role="group"
        aria-label={label}
        className={cn(
          "inline-flex max-w-full items-center gap-2 rounded-control border border-border text-foreground",
          chip ? "h-7 bg-muted pl-2 pr-0.5 text-xs" : "h-9 w-full bg-background pl-3 pr-1 text-[13px] shadow-xs",
          mono && "font-mono",
          className
        )}
        {...props}
      >
        {prefix !== undefined && prefix !== null && prefix !== false ? (
          <span aria-hidden className="shrink-0 select-none text-muted-foreground">
            {prefix}
          </span>
        ) : null}
        <Value className={cn("min-w-0 flex-1", truncate ? "truncate" : "break-all")} title={truncate ? value : undefined}>
          {value}
        </Value>
        <CopyButton
          value={value}
          size={chip ? "xs" : "sm"}
          label={label ? `Copy ${label}` : "Copy"}
          {...copyButtonProps}
        />
      </div>
    );
  }
);
CopyField.displayName = "CopyField";
