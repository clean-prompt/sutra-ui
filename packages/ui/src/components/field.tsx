import * as React from "react";
import { RiErrorWarningFill, RiInformationLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { useSafeId } from "../hooks/use-safe-id";
import { Label, type LabelProps } from "./label";

type FieldPart = "description" | "error" | "hint";

export interface FieldContextValue {
  /** Id of the form control inside the field. */
  id: string;
  labelId: string;
  descriptionId: string;
  errorId: string;
  hintId: string;
  invalid: boolean;
  disabled: boolean;
  required: boolean;
  hasDescription: boolean;
  hasError: boolean;
  hasHint: boolean;
  registerPart: (part: FieldPart) => () => void;
}

export const FieldContext = React.createContext<FieldContextValue | null>(null);

/** Read the surrounding field context, or `null` outside a `Field`. */
export function useFieldContext() {
  return React.useContext(FieldContext);
}

function joinIds(...ids: Array<string | false | null | undefined>) {
  const joined = ids.filter(Boolean).join(" ");
  return joined || undefined;
}

function isAriaTrue(value: React.AriaAttributes["aria-invalid"]) {
  return value === true || value === "true" || value === "grammar" || value === "spelling";
}

export interface UseFieldProps {
  id?: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
}

export interface UseFieldReturn {
  id: string | undefined;
  disabled: boolean | undefined;
  required: boolean | undefined;
  invalid: boolean;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
}

/**
 * Wires a form control to the nearest `Field`: id, aria-describedby, aria-invalid,
 * disabled and required. Explicit props always win over the field context.
 */
export function useField(props: UseFieldProps = {}): UseFieldReturn {
  const ctx = React.useContext(FieldContext);
  const invalid = Boolean(props.invalid ?? (isAriaTrue(props["aria-invalid"]) || ctx?.invalid));
  const describedBy = joinIds(
    props["aria-describedby"],
    ctx?.hasDescription && ctx.descriptionId,
    ctx?.hasHint && ctx.hintId,
    ctx?.hasError && ctx.errorId
  );
  const disabled = props.disabled ?? (ctx?.disabled || undefined);
  const required = props.required ?? (ctx?.required || undefined);
  return {
    id: props.id ?? ctx?.id,
    disabled,
    required,
    invalid,
    "aria-describedby": describedBy,
    "aria-invalid": invalid || undefined,
  };
}

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Id applied to the control. Generated when omitted. */
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  orientation?: "vertical" | "horizontal";
}

/** Groups a label, control, description and error, and wires their ids together. */
export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  (
    { id: idProp, invalid = false, disabled = false, required = false, orientation = "vertical", className, ...props },
    ref
  ) => {
    const generated = useSafeId("field");
    const id = idProp ?? generated;
    const [parts, setParts] = React.useState<Record<FieldPart, number>>({ description: 0, error: 0, hint: 0 });

    const registerPart = React.useCallback((part: FieldPart) => {
      setParts((p) => ({ ...p, [part]: p[part] + 1 }));
      return () => setParts((p) => ({ ...p, [part]: Math.max(0, p[part] - 1) }));
    }, []);

    const value = React.useMemo<FieldContextValue>(
      () => ({
        id,
        labelId: `${id}-label`,
        descriptionId: `${id}-description`,
        errorId: `${id}-error`,
        hintId: `${id}-hint`,
        invalid,
        disabled,
        required,
        hasDescription: parts.description > 0,
        hasError: parts.error > 0,
        hasHint: parts.hint > 0,
        registerPart,
      }),
      [id, invalid, disabled, required, parts, registerPart]
    );

    return (
      <FieldContext.Provider value={value}>
        <div
          ref={ref}
          data-slot="field"
          data-orientation={orientation}
          data-invalid={invalid || undefined}
          data-disabled={disabled ? "true" : undefined}
          className={cn(
            "group/field flex w-full gap-2",
            orientation === "vertical"
              ? "flex-col"
              : "flex-row items-start [&>[data-slot=field-content]]:flex-1",
            className
          )}
          {...props}
        />
      </FieldContext.Provider>
    );
  }
);
Field.displayName = "Field";

/** Stacks label, description and error next to a control in a horizontal field. */
export const FieldContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="field-content" className={cn("flex flex-col gap-1.5", className)} {...props} />
  )
);
FieldContent.displayName = "FieldContent";

export type FieldLabelProps = LabelProps;

/** Label bound to the field's control. */
export const FieldLabel = React.forwardRef<React.ElementRef<typeof Label>, FieldLabelProps>(
  ({ htmlFor, id, required, className, ...props }, ref) => {
    const ctx = React.useContext(FieldContext);
    return (
      <Label
        ref={ref}
        id={id ?? ctx?.labelId}
        htmlFor={htmlFor ?? ctx?.id}
        required={required ?? ctx?.required}
        className={cn(ctx?.disabled && "cursor-not-allowed opacity-60", className)}
        {...props}
      />
    );
  }
);
FieldLabel.displayName = "FieldLabel";

function useRegisterPart(part: FieldPart, active: boolean) {
  const ctx = React.useContext(FieldContext);
  const register = ctx?.registerPart;
  React.useEffect(() => {
    if (!active || !register) return;
    return register(part);
  }, [active, register, part]);
  return ctx;
}

export type FieldDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

/** Helper text describing the control. */
export const FieldDescription = React.forwardRef<HTMLParagraphElement, FieldDescriptionProps>(
  ({ id, className, ...props }, ref) => {
    const ctx = useRegisterPart("description", true);
    return (
      <p
        ref={ref}
        id={id ?? ctx?.descriptionId}
        data-slot="field-description"
        className={cn("text-sm leading-snug text-muted-foreground", className)}
        {...props}
      />
    );
  }
);
FieldDescription.displayName = "FieldDescription";

export interface FieldHintProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Show a leading info icon, or pass a custom icon. */
  icon?: boolean | React.ReactNode;
}

/** Small secondary hint, typically placed under the control. */
export const FieldHint = React.forwardRef<HTMLParagraphElement, FieldHintProps>(
  ({ id, icon, className, children, ...props }, ref) => {
    const ctx = useRegisterPart("hint", true);
    return (
      <p
        ref={ref}
        id={id ?? ctx?.hintId}
        data-slot="field-hint"
        className={cn(
          "flex items-start gap-1.5 text-xs leading-4 text-muted-foreground [&_svg]:mt-px [&_svg]:size-3.5 [&_svg]:shrink-0",
          className
        )}
        {...props}
      >
        {icon === true ? <RiInformationLine aria-hidden /> : icon || null}
        <span>{children}</span>
      </p>
    );
  }
);
FieldHint.displayName = "FieldHint";

type FieldErrorEntry = string | { message?: string } | null | undefined;

export interface FieldErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Error objects or strings (e.g. from a form library). Used when no children are given. */
  errors?: FieldErrorEntry[];
  /** Hide the leading icon. */
  hideIcon?: boolean;
}

/** Validation message, announced to assistive tech. Renders nothing when empty. */
export const FieldError = React.forwardRef<HTMLDivElement, FieldErrorProps>(
  ({ id, errors, hideIcon, className, children, ...props }, ref) => {
    let content: React.ReactNode = children;
    if (content == null || content === false || content === "") {
      const messages = Array.from(
        new Set(
          (errors ?? [])
            .map((e) => (typeof e === "string" ? e : e?.message))
            .filter((m): m is string => Boolean(m))
        )
      );
      content =
        messages.length === 0 ? null : messages.length === 1 ? (
          messages[0]
        ) : (
          <ul className="ml-4 list-disc space-y-0.5">
            {messages.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        );
    }
    const active = content != null && content !== "";
    const ctx = useRegisterPart("error", active);
    if (!active) return null;
    return (
      <div
        ref={ref}
        id={id ?? ctx?.errorId}
        role="alert"
        data-slot="field-error"
        className={cn(
          "flex items-start gap-1.5 text-sm leading-snug text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-150",
          className
        )}
        {...props}
      >
        {!hideIcon && <RiErrorWarningFill aria-hidden className="mt-0.5 size-4 shrink-0" />}
        <div className="min-w-0">{content}</div>
      </div>
    );
  }
);
FieldError.displayName = "FieldError";

/** Vertical stack of fields with consistent spacing. */
export const FieldGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="field-group" className={cn("flex w-full flex-col gap-5", className)} {...props} />
  )
);
FieldGroup.displayName = "FieldGroup";

export type FieldsetProps = React.FieldsetHTMLAttributes<HTMLFieldSetElement>;

/** Native fieldset for grouping related fields under a legend. */
export const Fieldset = React.forwardRef<HTMLFieldSetElement, FieldsetProps>(({ className, ...props }, ref) => (
  <fieldset
    ref={ref}
    data-slot="fieldset"
    className={cn("flex min-w-0 flex-col gap-4 border-0 p-0 disabled:opacity-60", className)}
    {...props}
  />
));
Fieldset.displayName = "Fieldset";

export interface FieldLegendProps extends React.HTMLAttributes<HTMLLegendElement> {
  /** `legend` renders a section title, `label` matches a field label. */
  variant?: "legend" | "label";
}

/** Title of a `Fieldset`. */
export const FieldLegend = React.forwardRef<HTMLLegendElement, FieldLegendProps>(
  ({ variant = "legend", className, ...props }, ref) => (
    <legend
      ref={ref}
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-1 p-0 font-medium text-foreground",
        variant === "legend" ? "text-base" : "text-sm",
        className
      )}
      {...props}
    />
  )
);
FieldLegend.displayName = "FieldLegend";
