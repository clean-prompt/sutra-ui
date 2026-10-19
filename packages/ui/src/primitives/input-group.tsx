import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, type Size } from "../lib/cn";
import { Button, type ButtonProps } from "./button";
import { useField } from "./field";
import { inputShellVariants } from "./input";

const CONTROL = "[data-slot=input-group-control]";

export const inputGroupVariants = cva(
  [
    "group/input-group relative flex w-full min-w-0 items-center outline-none",
    inputShellVariants({ focus: "none" }),
    "has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-[3px] has-[[data-slot=input-group-control]:focus-visible]:ring-ring/35",
    "has-[[data-slot=input-group-control][aria-invalid=true]]:border-destructive has-[[data-slot=input-group-control][aria-invalid=true]]:ring-[3px] has-[[data-slot=input-group-control][aria-invalid=true]]:ring-destructive/20",
    "has-[[data-slot=input-group-control]:disabled]:cursor-not-allowed has-[[data-slot=input-group-control]:disabled]:opacity-50",
    "has-[>textarea]:h-auto has-[>textarea]:rounded-[min(var(--radius-control),var(--radius-box))]",
    "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:rounded-[min(var(--radius-control),var(--radius-box))]",
    "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:rounded-[min(var(--radius-control),var(--radius-box))]",
  ],
  {
    variants: {
      size: {
        sm: "h-8 text-sm",
        md: "h-9 text-sm",
        lg: "h-10 text-sm",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface InputGroupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof inputGroupVariants> {}

/** A container that looks like a single input and hosts addons around a control. */
export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(({ className, size, ...props }, ref) => (
  <div
    ref={ref}
    role="group"
    data-slot="input-group"
    data-size={size ?? "md"}
    className={cn(inputGroupVariants({ size }), className)}
    {...props}
  />
));
InputGroup.displayName = "InputGroup";

export const inputGroupAddonVariants = cva(
  [
    "flex h-auto shrink-0 cursor-text select-none items-center justify-center gap-2 text-sm font-medium text-muted-foreground",
    "[&>svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      align: {
        "inline-start": "order-first pl-3 has-[>button]:-ml-1.5 has-[>kbd]:-ml-1",
        "inline-end": "order-last pr-3 has-[>button]:-mr-1.5 has-[>kbd]:-mr-1",
        "block-start": "order-first w-full justify-start px-3 pt-2.5",
        "block-end": "order-last w-full justify-start px-3 pb-2.5",
      },
    },
    defaultVariants: { align: "inline-start" },
  }
);

export interface InputGroupAddonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof inputGroupAddonVariants> {}

/** Text, icon or button placed at an edge of an `InputGroup`. Clicking it focuses the control. */
export const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ className, align = "inline-start", onMouseDown, ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onMouseDown={(e) => {
        onMouseDown?.(e);
        if (e.defaultPrevented) return;
        const target = e.target as HTMLElement;
        if (target.closest("button, a, input, textarea, select, [role=button]")) return;
        const control = e.currentTarget.parentElement?.querySelector<HTMLElement>(CONTROL);
        if (control) {
          e.preventDefault();
          control.focus();
        }
      }}
      {...props}
    />
  )
);
InputGroupAddon.displayName = "InputGroupAddon";

/** Muted inline text inside an addon, e.g. "https://" or "USD". */
export const InputGroupText = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="input-group-text"
      className={cn(
        "flex items-center gap-2 whitespace-nowrap text-sm font-normal text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
);
InputGroupText.displayName = "InputGroupText";

export interface InputGroupButtonProps extends Omit<ButtonProps, "size"> {
  size?: "xs" | "sm" | "icon-xs" | "icon-sm";
}

/** Compact button sized to sit inside an `InputGroup`. */
export const InputGroupButton = React.forwardRef<HTMLButtonElement, InputGroupButtonProps>(
  ({ className, variant = "ghost", size = "xs", ...props }, ref) => (
    <Button
      ref={ref}
      data-slot="input-group-button"
      variant={variant}
      size={size}
      className={cn(
        "shadow-none",
        size === "xs" && "h-6 gap-1 px-2 text-xs",
        size === "icon-xs" && "size-6",
        className
      )}
      {...props}
    />
  )
);
InputGroupButton.displayName = "InputGroupButton";

const controlBase =
  "min-w-0 flex-1 border-0 bg-transparent text-foreground shadow-none outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed";

export interface InputGroupInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  invalid?: boolean;
  size?: Size;
}

/** The input inside an `InputGroup`. Consumes `Field` context. */
export const InputGroupInput = React.forwardRef<HTMLInputElement, InputGroupInputProps>(
  ({ className, invalid, size, id, disabled, required, ...props }, ref) => {
    const field = useField({
      id,
      disabled,
      required,
      invalid,
      "aria-describedby": props["aria-describedby"],
      "aria-invalid": props["aria-invalid"],
    });
    return (
      <input
        ref={ref}
        data-slot="input-group-control"
        {...props}
        id={field.id}
        disabled={field.disabled}
        required={field.required}
        aria-invalid={field["aria-invalid"]}
        aria-describedby={field["aria-describedby"]}
        className={cn(
          controlBase,
          "h-full w-full self-stretch px-3 text-sm",
          size === "sm" && "px-2.5",
          size === "lg" && "px-3.5",
          "group-has-[>[data-align=inline-start]]/input-group:pl-2 group-has-[>[data-align=inline-end]]/input-group:pr-2",
          "group-has-[>[data-align=block-start]]/input-group:h-9 group-has-[>[data-align=block-end]]/input-group:h-9",
          className
        )}
      />
    );
  }
);
InputGroupInput.displayName = "InputGroupInput";

export interface InputGroupTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

/** The textarea inside an `InputGroup`. Consumes `Field` context. */
export const InputGroupTextarea = React.forwardRef<HTMLTextAreaElement, InputGroupTextareaProps>(
  ({ className, invalid, id, disabled, required, ...props }, ref) => {
    const field = useField({
      id,
      disabled,
      required,
      invalid,
      "aria-describedby": props["aria-describedby"],
      "aria-invalid": props["aria-invalid"],
    });
    return (
      <textarea
        ref={ref}
        data-slot="input-group-control"
        {...props}
        id={field.id}
        disabled={field.disabled}
        required={field.required}
        aria-invalid={field["aria-invalid"]}
        aria-describedby={field["aria-describedby"]}
        className={cn(controlBase, "field-sizing-content min-h-16 w-full resize-none px-3 py-2.5 text-sm", className)}
      />
    );
  }
);
InputGroupTextarea.displayName = "InputGroupTextarea";
