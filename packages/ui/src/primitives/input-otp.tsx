import * as React from "react";
import { OTPInput, OTPInputContext, REGEXP_ONLY_DIGITS } from "input-otp";
import { cn, type Size } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { useField } from "./field";
import { inputShellVariants } from "./input";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

type OTPInputPrimitiveProps = React.ComponentPropsWithoutRef<typeof OTPInput>;

interface InputOTPStyleContextValue {
  size: Size;
  invalid: boolean;
}

const InputOTPStyleContext = React.createContext<InputOTPStyleContextValue>({ size: "md", invalid: false });

export type InputOTPProps = DistributiveOmit<OTPInputPrimitiveProps, "size"> & {
  /** Slot size. */
  size?: Size;
  /** Marks the field invalid: error ring on the slots and `aria-invalid`. Inherited from a surrounding `Field` when omitted. */
  invalid?: boolean;
};

/** One-time code input built on `input-otp`. Compose with `InputOTPGroup` and `InputOTPSlot`. */
export const InputOTP = React.forwardRef<React.ElementRef<typeof OTPInput>, InputOTPProps>((allProps, ref) => {
  const {
    className,
    containerClassName,
    size = "md",
    invalid,
    id,
    disabled,
    required,
    value: valueProp,
    defaultValue,
    onChange,
    ...props
  } = allProps;
  // input-otp forwards `defaultValue` to its controlled <input>, so we own the uncontrolled state.
  const [value, handleChange] = useControllableState<string>({
    value: valueProp,
    defaultValue: typeof defaultValue === "string" ? defaultValue : defaultValue != null ? String(defaultValue) : "",
    onChange,
  });
  const field = useField({
    id,
    disabled,
    required,
    invalid,
    "aria-describedby": allProps["aria-describedby"],
    "aria-invalid": allProps["aria-invalid"],
  });
  const style = React.useMemo(() => ({ size, invalid: field.invalid }), [size, field.invalid]);
  return (
    <InputOTPStyleContext.Provider value={style}>
      <OTPInput
        ref={ref}
        data-slot="input-otp"
        {...(props as OTPInputPrimitiveProps)}
        value={value}
        onChange={handleChange}
        id={field.id}
        disabled={field.disabled}
        required={field.required}
        aria-invalid={field["aria-invalid"]}
        aria-describedby={field["aria-describedby"]}
        containerClassName={cn(
          "flex items-center gap-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
          containerClassName
        )}
        className={cn("disabled:cursor-not-allowed", className)}
      />
    </InputOTPStyleContext.Provider>
  );
});
InputOTP.displayName = "InputOTP";

/** A visual run of slots. */
export const InputOTPGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="input-otp-group" className={cn("flex items-center gap-1.5", className)} {...props} />
  )
);
InputOTPGroup.displayName = "InputOTPGroup";

const slotSize: Record<Size, string> = {
  sm: "size-8 text-sm",
  md: "size-10 text-base",
  lg: "size-12 text-lg",
};

export interface InputOTPSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Zero-based position of the character this slot shows. */
  index: number;
}

/** A single character cell with a blinking fake caret. */
export const InputOTPSlot = React.forwardRef<HTMLDivElement, InputOTPSlotProps>(({ index, className, ...props }, ref) => {
  const ctx = React.useContext(OTPInputContext);
  const { size, invalid } = React.useContext(InputOTPStyleContext);
  const slot = ctx?.slots?.[index];
  const char = slot?.char ?? null;
  const isActive = slot?.isActive ?? false;
  const hasFakeCaret = slot?.hasFakeCaret ?? false;
  const placeholderChar = slot?.placeholderChar ?? null;

  return (
    <div
      ref={ref}
      data-slot="input-otp-slot"
      data-active={isActive || undefined}
      data-filled={char ? true : undefined}
      aria-invalid={invalid || undefined}
      className={cn(
        inputShellVariants({ focus: "none" }),
        "relative flex items-center justify-center font-medium tabular-nums",
        "transition-[color,box-shadow,border-color,transform,translate,scale,rotate]",
        slotSize[size],
        char && "animate-in zoom-in-90 fade-in-0 duration-150",
        isActive && "z-10 border-ring ring-[3px] ring-ring/35",
        invalid && "border-destructive",
        invalid && isActive && "ring-destructive/20",
        className
      )}
      {...props}
    >
      {char ?? (placeholderChar ? <span className="text-muted-foreground/60">{placeholderChar}</span> : null)}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <div className="h-[45%] w-px animate-caret-blink bg-foreground" />
        </div>
      )}
    </div>
  );
});
InputOTPSlot.displayName = "InputOTPSlot";

/** Decorative separator between slot groups. */
export const InputOTPSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      role="separator"
      data-slot="input-otp-separator"
      className={cn("flex items-center text-muted-foreground", className)}
      {...props}
    >
      {children ?? <span className="h-0.5 w-2.5 rounded-full bg-border-strong" />}
    </div>
  )
);
InputOTPSeparator.displayName = "InputOTPSeparator";

export type OTPFieldProps = Omit<OTPInputPrimitiveProps, "children" | "render" | "maxLength" | "size"> & {
  /** Number of characters. */
  length?: number;
  /** Split slots into groups of this size with a separator between them. */
  groupSize?: number;
  /** Custom separator node. */
  separator?: React.ReactNode;
  /** Slot size. */
  size?: Size;
  /** Marks the field invalid: error ring on the slots and `aria-invalid`. Inherited from a surrounding `Field` when omitted. */
  invalid?: boolean;
  /** Classes for every slot. */
  slotClassName?: string;
};

/** Ready-made OTP input that renders its slots automatically. Digits only by default. */
export const OTPField = React.forwardRef<React.ElementRef<typeof OTPInput>, OTPFieldProps>(
  ({ length = 6, groupSize, separator, slotClassName, pattern = REGEXP_ONLY_DIGITS, inputMode, ...props }, ref) => {
    const chunk = groupSize && groupSize > 0 ? groupSize : length;
    const groups: number[][] = [];
    for (let start = 0; start < length; start += chunk) {
      groups.push(Array.from({ length: Math.min(chunk, length - start) }, (_, i) => start + i));
    }
    const numeric = pattern === REGEXP_ONLY_DIGITS;
    return (
      <InputOTP
        ref={ref}
        maxLength={length}
        pattern={pattern}
        inputMode={inputMode ?? (numeric ? "numeric" : "text")}
        {...props}
      >
        {groups.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <InputOTPSeparator>{separator}</InputOTPSeparator>}
            <InputOTPGroup>
              {group.map((index) => (
                <InputOTPSlot key={index} index={index} className={slotClassName} />
              ))}
            </InputOTPGroup>
          </React.Fragment>
        ))}
      </InputOTP>
    );
  }
);
OTPField.displayName = "OTPField";
