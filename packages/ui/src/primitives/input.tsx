import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { RiCloseCircleFill, RiEyeLine, RiEyeOffLine, RiSearchLine } from "@remixicon/react";
import { cn, focusRing, invalidRing, type Size } from "../lib/cn";
import { Kbd } from "./typography";
import { useField } from "./field";
import { filledShell } from "./input-internal";
import { detectShortcutPlatform, getShortcutKeyLabels } from "../lib/shortcuts";

const shellHeights: Record<Size, string> = { sm: "h-8", md: "h-9", lg: "h-10" };

/**
 * The bordered box shared by the text-entry controls (input, textarea, select / combobox / date triggers,
 * number, tag and time inputs, input groups, OTP slots): border, radius, surface, shadow, transition and,
 * per `focus` mode, where the focus / invalid / disabled styling comes from.
 */
export const inputShellVariants = cva(
  "border border-input bg-background text-foreground shadow-xs transition-[color,box-shadow,border-color] duration-150",
  {
    variants: {
      /**
       * `control` (default): the shell is the focusable element (focus ring, `aria-invalid`, `:disabled`).
       * `within`: the shell wraps the real control (`focus-within` ring; pass `invalid` / `disabled`).
       * `none`: the component styles these states itself.
       */
      focus: {
        control: [focusRing, invalidRing, "disabled:cursor-not-allowed disabled:opacity-50"],
        within: "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/35",
        none: "",
      },
      /** With `focus="within"`: invalid styling driven by state instead of `aria-invalid` on the shell. */
      invalid: { true: "", false: "" },
      /** With `focus="within"`: disabled styling driven by state instead of `:disabled` on the shell. */
      disabled: { true: "", false: "" },
      /** `box` caps the radius at the box radius, for multi-line shells (textarea, tag input). */
      radius: { control: "rounded-control", box: "rounded-[min(var(--radius-control),var(--radius-box))]" },
      /** Popover triggers lift their border on hover. */
      hover: { true: "hover:border-border-strong", false: "" },
      /** Fixed height (omit for auto-height shells). */
      size: shellHeights,
      /** `filled` swaps the bordered box for a tinted surface with a hidden border (the surface returns to normal on focus). */
      variant: { outline: "", filled: filledShell },
    },
    compoundVariants: [
      { variant: "filled", focus: "control", className: "focus-visible:bg-background" },
      { variant: "filled", focus: "within", className: "focus-within:bg-background" },
      {
        focus: "within",
        invalid: true,
        className: "border-destructive ring-[3px] ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20",
      },
      { focus: "within", disabled: true, className: "cursor-not-allowed opacity-50" },
    ],
    defaultVariants: { focus: "control", radius: "control", variant: "outline" },
  }
);

export const inputVariants = cva(
  [
    "flex w-full min-w-0",
    inputShellVariants(),
    "placeholder:text-muted-foreground selection:bg-primary/25",
    "file:me-3 file:inline-flex file:h-full file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
    "read-only:bg-subtle",
  ],
  {
    variants: {
      size: {
        sm: [shellHeights.sm, "px-2.5 text-sm"],
        md: [shellHeights.md, "px-3 text-sm"],
        lg: [shellHeights.lg, "px-3.5 text-sm"],
      },
      variant: { outline: "", filled: [filledShell, "focus-visible:bg-background"] },
    },
    defaultVariants: { size: "md", variant: "outline" },
  }
);

const wrapperVariants = cva(
  [
    "group/input relative flex w-full min-w-0 cursor-text items-stretch overflow-hidden",
    inputShellVariants({ focus: "within" }),
    "has-[input[aria-invalid=true]]:border-destructive has-[input[aria-invalid=true]]:ring-[3px] has-[input[aria-invalid=true]]:ring-destructive/20",
    "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50",
  ],
  {
    variants: {
      size: { sm: [shellHeights.sm, "text-sm"], md: [shellHeights.md, "text-sm"], lg: [shellHeights.lg, "text-sm"] },
      variant: { outline: "", filled: [filledShell, "focus-within:bg-background"] },
    },
    defaultVariants: { size: "md", variant: "outline" },
  }
);

const sidePadding: Record<Size, string> = { sm: "px-2.5", md: "px-3", lg: "px-3.5" };

function setNativeValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "prefix">,
    VariantProps<typeof inputVariants> {
  /** `outline` (default) is the bordered box; `filled` is a tinted surface with a hidden border. */
  variant?: "outline" | "filled" | null;
  invalid?: boolean;
  /** Icon rendered inside the field before the text. */
  leadingIcon?: React.ReactNode;
  /** Icon or small action rendered inside the field after the text. */
  trailingIcon?: React.ReactNode;
  /** Text addon before the field, e.g. "https://". */
  prefix?: React.ReactNode;
  /** Text addon after the field, e.g. ".com". */
  suffix?: React.ReactNode;
  /** Shows a clear button while the field has a value. */
  clearable?: boolean;
  onClear?: () => void;
  /**
   * Classes for the element that renders. Without addons that is the `<input>` itself (the root).
   * With addons (`leadingIcon`, `trailingIcon`, `prefix`, `suffix`, `clearable`) it lands on the
   * **inner** `<input>`, not the outer wrapper, so layout classes (`w-48`, `flex-1`, margins) have no
   * visible effect there; use `wrapperClassName` for those.
   */
  className?: string;
  /**
   * Classes for the outer wrapper `<div>`, which is only rendered when addons are present. Put
   * layout/sizing classes here when the input has addons.
   */
  wrapperClassName?: string;
}

/** Text input with optional icons, text addons and a clear button. Consumes `Field` context. */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      wrapperClassName,
      size,
      variant,
      invalid,
      leadingIcon,
      trailingIcon,
      prefix,
      suffix,
      clearable,
      onClear,
      id,
      disabled,
      required,
      type = "text",
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref
  ) => {
    const s: Size = size ?? "md";
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    const field = useField({
      id,
      disabled,
      required,
      invalid,
      "aria-describedby": props["aria-describedby"],
      "aria-invalid": props["aria-invalid"],
    });

    const isControlled = value !== undefined;
    const [uncontrolledFilled, setUncontrolledFilled] = React.useState(
      defaultValue !== undefined && String(defaultValue).length > 0
    );
    const filled = isControlled ? value !== null && String(value).length > 0 : uncontrolledFilled;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setUncontrolledFilled(e.target.value.length > 0);
      onChange?.(e);
    };

    const clear = () => {
      const el = innerRef.current;
      if (el) {
        setNativeValue(el, "");
        el.focus();
      }
      if (!isControlled) setUncontrolledFilled(false);
      onClear?.();
    };

    const showClear = clearable && filled && !field.disabled && !props.readOnly;
    const hasAddons = leadingIcon != null || trailingIcon != null || prefix != null || suffix != null || clearable;

    const inputProps = {
      ...props,
      ref: innerRef,
      type,
      value,
      defaultValue,
      onChange: handleChange,
      id: field.id,
      disabled: field.disabled,
      required: field.required,
      "aria-invalid": field["aria-invalid"],
      "aria-describedby": field["aria-describedby"],
    };

    if (!hasAddons) {
      return <input data-slot="input" {...inputProps} className={cn(inputVariants({ size, variant }), className)} />;
    }

    const iconSlot =
      "pointer-events-none flex shrink-0 items-center text-muted-foreground [&_svg]:size-4 [&_button]:pointer-events-auto";

    return (
      <div
        data-slot="input-wrapper"
        className={cn(wrapperVariants({ size, variant }), wrapperClassName)}
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          if (target === innerRef.current || target.closest("button, a")) return;
          e.preventDefault();
          innerRef.current?.focus();
        }}
      >
        {prefix != null && (
          <span className="flex shrink-0 select-none items-center border-e border-input bg-subtle px-3 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        {leadingIcon != null && <span className={cn(iconSlot, "ps-3", s === "sm" && "ps-2.5")}>{leadingIcon}</span>}
        <input
          data-slot="input"
          {...inputProps}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
            "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
            sidePadding[s],
            leadingIcon != null && "ps-2",
            (trailingIcon != null || showClear) && "pe-2",
            className
          )}
        />
        {showClear && (
          <span className="flex shrink-0 items-center pe-1.5">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Clear"
              onClick={clear}
              className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground animate-in fade-in-0 zoom-in-75 duration-150"
            >
              <RiCloseCircleFill className="size-4" aria-hidden />
            </button>
          </span>
        )}
        {trailingIcon != null && (
          <span className={cn(iconSlot, "pe-3", s === "sm" && "pe-2.5", showClear && "ps-0.5")}>{trailingIcon}</span>
        )}
        {suffix != null && (
          <span className="flex shrink-0 select-none items-center border-s border-input bg-subtle px-3 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface PasswordInputProps extends Omit<InputProps, "type" | "trailingIcon"> {
  /** Initial visibility of the password. */
  defaultVisible?: boolean;
}

/** Password field with a show/hide toggle. */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ defaultVisible = false, autoComplete = "current-password", ...props }, ref) => {
    const [visible, setVisible] = React.useState(defaultVisible);
    return (
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        spellCheck={false}
        trailingIcon={
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            disabled={props.disabled}
            onClick={() => setVisible((v) => !v)}
            className={cn(
              "-me-1 inline-flex size-6 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none",
              focusRing
            )}
          >
            {visible ? <RiEyeOffLine className="size-4" aria-hidden /> : <RiEyeLine className="size-4" aria-hidden />}
          </button>
        }
        {...props}
      />
    );
  }
);
PasswordInput.displayName = "PasswordInput";

const isMac = () => detectShortcutPlatform() === "mac";

function matchesHotkey(e: KeyboardEvent, hotkey: string) {
  const parts = hotkey.toLowerCase().split("+").map((p) => p.trim());
  const key = parts[parts.length - 1];
  const mods = new Set(parts.slice(0, -1));
  const mod = mods.has("mod");
  const wantMeta = mods.has("meta") || mods.has("cmd") || (mod && isMac());
  const wantCtrl = mods.has("ctrl") || (mod && !isMac());
  return (
    (e.key ?? "").toLowerCase() === key &&
    e.metaKey === wantMeta &&
    e.ctrlKey === wantCtrl &&
    e.altKey === mods.has("alt") &&
    (key.length !== 1 || /[a-z0-9]/.test(key) ? e.shiftKey === mods.has("shift") : true)
  );
}


export interface SearchInputProps extends Omit<InputProps, "type" | "leadingIcon"> {
  /**
   * Global shortcut that focuses the field, e.g. "/" or "mod+k" (⌘ on macOS, Ctrl elsewhere).
   * Also rendered as a key hint unless `shortcut` is provided.
   */
  hotkey?: string;
  /** Custom key hint shown while the field is empty (strings render as `Kbd`). */
  shortcut?: React.ReactNode | string[];
}

/** Search field with an icon, a keyboard shortcut hint and a clear button. */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    { hotkey, shortcut, clearable = true, placeholder = "Search…", value, defaultValue, onChange, onClear, onKeyDown, ...props },
    ref
  ) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);
    const isControlled = value !== undefined;
    const [uncontrolledFilled, setUncontrolledFilled] = React.useState(
      defaultValue !== undefined && String(defaultValue).length > 0
    );
    const filled = isControlled ? value !== null && String(value).length > 0 : uncontrolledFilled;
    const [hint, setHint] = React.useState<string[] | null>(null);

    React.useEffect(() => {
      setHint(hotkey ? (getShortcutKeyLabels(hotkey)[0] ?? null) : null);
      if (!hotkey) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.isComposing || e.keyCode === 229 || !matchesHotkey(e, hotkey)) return;
        const t = e.target as HTMLElement | null;
        const typing = t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName));
        // Plain keys typed into any field (including this one) are text, not the shortcut.
        if (typing && !e.metaKey && !e.ctrlKey) return;
        e.preventDefault();
        innerRef.current?.focus();
        innerRef.current?.select();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [hotkey]);

    const keys = Array.isArray(shortcut) ? shortcut : shortcut == null ? hint : null;
    const hintNode =
      keys && keys.length > 0 ? (
        <span className="flex items-center gap-0.5" aria-hidden>
          {keys.map((k, i) => (
            <Kbd key={`${k}-${i}`}>{k}</Kbd>
          ))}
        </span>
      ) : Array.isArray(shortcut) ? null : (
        shortcut
      );

    return (
      <Input
        ref={innerRef}
        type="search"
        placeholder={placeholder}
        clearable={clearable}
        value={value}
        defaultValue={defaultValue}
        aria-keyshortcuts={hotkey ? hotkey.replace(/mod/i, isMac() ? "Meta" : "Control") : undefined}
        onChange={(e) => {
          if (!isControlled) setUncontrolledFilled(e.target.value.length > 0);
          onChange?.(e);
        }}
        onClear={() => {
          if (!isControlled) setUncontrolledFilled(false);
          onClear?.();
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          if (e.key === "Escape" && filled && clearable) {
            e.preventDefault();
            const el = e.currentTarget;
            setNativeValue(el, "");
            if (!isControlled) setUncontrolledFilled(false);
            onClear?.();
          }
        }}
        leadingIcon={<RiSearchLine aria-hidden />}
        trailingIcon={!filled && hintNode ? hintNode : undefined}
        {...props}
      />
    );
  }
);
SearchInput.displayName = "SearchInput";
