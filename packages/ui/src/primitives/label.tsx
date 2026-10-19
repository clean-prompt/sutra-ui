import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";
import { cn } from "../lib/cn";

export interface LabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  /** Appends a red asterisk (hidden from assistive technology); set `required` on the control itself for validation. */
  required?: boolean;
  /** Muted helper shown after the label text, e.g. "(optional)". */
  hint?: React.ReactNode;
}

/** Form label with an optional required asterisk and `hint`; use it with `htmlFor` or let `Field` wire it. Extra props are spread to the `<label>`. */
export const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, LabelProps>(
  ({ className, required, hint, children, ...props }, ref) => (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium leading-none text-foreground select-none",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-60 group-data-[disabled=true]:opacity-60",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-destructive" aria-hidden>*</span>}
      {hint && <span className="font-normal text-muted-foreground">{hint}</span>}
    </LabelPrimitive.Root>
  )
);
Label.displayName = "Label";
