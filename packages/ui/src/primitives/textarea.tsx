import * as React from "react";
import { cn } from "../lib/cn";
import { useIsoLayoutEffect } from "../hooks/use-iso-layout-effect";
import { useResizeObserver } from "../hooks/use-resize-observer";
import { useField } from "./field";
import { inputShellVariants } from "./input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** `outline` (default) is the bordered box; `filled` is a tinted surface with a hidden border. */
  variant?: "outline" | "filled";
  /** Marks the textarea invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. */
  invalid?: boolean;
  /** Grow with the content between `minRows` and `maxRows`. */
  autoResize?: boolean;
  /**
   * Minimum height in text rows (also the initial height).
   * @default 3
   */
  minRows?: number;
  /** Largest height in text rows when `autoResize` is on; taller content scrolls. Default: unlimited. */
  maxRows?: number;
  /** Show a character counter (uses `maxLength` as the limit when set). */
  showCount?: boolean;
  /** Class for the wrapper rendered when `showCount` is on. */
  wrapperClassName?: string;
}

/** Multi-line text input with optional auto-resize and character counter. Consumes `Field` context. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      wrapperClassName,
      variant,
      invalid,
      autoResize = false,
      minRows = 3,
      maxRows,
      showCount = false,
      maxLength,
      rows,
      id,
      disabled,
      required,
      value,
      defaultValue,
      onChange,
      style,
      ...props
    },
    ref
  ) => {
    const innerRef = React.useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);
    const field = useField({
      id,
      disabled,
      required,
      invalid,
      "aria-describedby": props["aria-describedby"],
      "aria-invalid": props["aria-invalid"],
    });

    const isControlled = value !== undefined;
    const [uncontrolledLength, setUncontrolledLength] = React.useState(
      defaultValue != null ? String(defaultValue).length : 0
    );
    const length = isControlled ? (value == null ? 0 : String(value).length) : uncontrolledLength;

    const resize = React.useCallback(() => {
      const el = innerRef.current;
      if (!el || !autoResize) return;
      const cs = window.getComputedStyle(el);
      const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
      const border = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
      const chrome = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + border;
      const min = minRows * lineHeight + chrome;
      const max = maxRows ? maxRows * lineHeight + chrome : Infinity;
      el.style.height = "auto";
      const next = Math.min(Math.max(el.scrollHeight + border, min), max);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight + border > max ? "auto" : "hidden";
    }, [autoResize, minRows, maxRows]);

    useIsoLayoutEffect(() => {
      resize();
    }, [resize, value]);

    const widthRef = React.useRef<number | null>(null);
    useResizeObserver(autoResize ? innerRef : null, (entry) => {
      const width = (entry.target as HTMLElement).offsetWidth;
      if (width === widthRef.current) return;
      widthRef.current = width;
      resize();
    });

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!isControlled) setUncontrolledLength(e.target.value.length);
      onChange?.(e);
      if (!isControlled) resize();
    };

    const textarea = (
      <textarea
        ref={innerRef}
        data-slot="textarea"
        {...props}
        id={field.id}
        disabled={field.disabled}
        required={field.required}
        aria-invalid={field["aria-invalid"]}
        aria-describedby={field["aria-describedby"]}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        maxLength={maxLength}
        rows={rows ?? minRows}
        style={style}
        className={cn(
          "flex w-full min-w-0 px-3 py-2 text-sm leading-6",
          inputShellVariants({ radius: "box", variant }),
          "placeholder:text-muted-foreground scrollbar-thin read-only:bg-subtle",
          autoResize ? "resize-none" : "resize-y",
          showCount && "pb-7",
          className
        )}
      />
    );

    if (!showCount) return textarea;

    const over = maxLength != null && length >= maxLength;
    return (
      <div data-slot="textarea-wrapper" className={cn("relative w-full", wrapperClassName)}>
        {textarea}
        <span
          className={cn(
            "pointer-events-none absolute bottom-2 end-3 select-none text-xs tabular-nums text-muted-foreground transition-colors",
            over && "text-destructive",
            field.disabled && "opacity-50"
          )}
        >
          {maxLength != null ? (
            <>
              {length}
              <span className="text-muted-foreground/60">/{maxLength}</span>
              <span className="sr-only"> characters used</span>
            </>
          ) : (
            <>
              {length}
              <span className="sr-only"> characters</span>
            </>
          )}
        </span>
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
