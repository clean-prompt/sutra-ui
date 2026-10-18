import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";

export interface InlineEditTextProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> {
  /** Draft text (controlled). */
  value?: string;
  /** Initial draft text (uncontrolled). Also the value a commit is compared against. */
  defaultValue?: string;
  /** Called on every keystroke with the raw draft. */
  onValueChange?: (value: string) => void;
  /** Called with the trimmed text on Enter or blur, when it is non-empty and differs from the starting value. */
  onCommit?: (value: string) => void;
  /** Called on Escape, and on Enter / blur when there is nothing to commit (empty or unchanged). */
  onCancel?: () => void;
  /** Accessible name. Default "Edit text". `aria-label` wins when both are set. */
  label?: string;
  /** Focus the field and select its text when it mounts. Default true. */
  autoFocus?: boolean;
}

/**
 * Single-line inline editor for renaming things in place: Enter or blur commits, Escape cancels,
 * and key presses never reach the surrounding row's shortcuts.
 */
export const InlineEditText = React.forwardRef<HTMLInputElement, InlineEditTextProps>(
  (
    {
      value: valueProp,
      defaultValue,
      onValueChange,
      onCommit,
      onCancel,
      label = "Edit text",
      autoFocus = true,
      className,
      onKeyDown,
      onBlur,
      onFocus,
      onClick,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    const [draft, setDraft] = useControllableState<string>({
      value: valueProp,
      defaultValue: defaultValue ?? valueProp ?? "",
      onChange: onValueChange,
    });
    /** What the field held when editing started; an unchanged draft is a cancel. */
    const [original] = React.useState(() => valueProp ?? defaultValue ?? "");
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    /** Set after a commit / cancel so the blur that follows (or an unmount) doesn't finish twice. */
    const done = React.useRef(false);

    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    React.useEffect(() => {
      done.current = false;
      if (!autoFocus) return;
      inputRef.current?.focus();
      inputRef.current?.select();
      // Only on mount: editing "starts" when the field appears.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const finish = (commit: boolean) => {
      if (done.current) return;
      done.current = true;
      const text = (inputRef.current?.value ?? draft).trim();
      if (commit && text && text !== original) onCommit?.(text);
      else {
        if (valueProp === undefined) setDraft(original);
        onCancel?.();
      }
    };

    return (
      <input
        ref={setRefs}
        type="text"
        aria-label={ariaLabel ?? label}
        value={draft}
        onChange={(e) => {
          done.current = false;
          setDraft(e.target.value);
        }}
        onFocus={(e) => {
          done.current = false;
          onFocus?.(e);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (e.key === "Enter") {
            e.preventDefault();
            finish(true);
          } else if (e.key === "Escape") {
            e.preventDefault();
            finish(false);
          }
        }}
        onBlur={(e) => {
          onBlur?.(e);
          finish(true);
        }}
        className={cn(
          "h-8 w-full min-w-0 rounded-control border border-input bg-background px-2.5 text-sm text-foreground shadow-xs",
          focusRing,
          className
        )}
        {...props}
      />
    );
  }
);
InlineEditText.displayName = "InlineEditText";
