import * as React from "react";
import { RiAddLine, RiCheckLine, RiDeleteBinLine, RiErrorWarningLine, RiLockLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { capitalize } from "../lib/text";
import { isEmail, isHttpUrl } from "../lib/validate";
import { useAsyncAction } from "../hooks/use-async-action";
import { useControllableState } from "../hooks/use-controllable-state";
import { useSafeId } from "../hooks/use-safe-id";
import { useLatestRef } from "../hooks/use-iso-layout-effect";
import { Button } from "../primitives/button";
import { Input, PasswordInput, SearchInput } from "../primitives/input";
import { SegmentedControl } from "../primitives/segmented-control";
import { SimpleSelect } from "../primitives/select";
import { Spinner } from "../primitives/spinner";
import { Switch } from "../primitives/switch";
import { Textarea } from "../primitives/textarea";

/* ------------------------------------------------------------------ */
/* Schema model                                                        */
/* ------------------------------------------------------------------ */

export type SchemaFormType = "string" | "number" | "integer" | "boolean" | "array" | "object";

/** JSON-Schema-like description of a value. */
export interface SchemaFormSchema {
  type?: SchemaFormType;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: (string | number)[];
  /** Display labels for `enum` values (same order). */
  enumLabels?: string[];
  /** password | uri | email | textarea | any other hint. */
  format?: string;
  placeholder?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  properties?: Record<string, SchemaFormSchema>;
  required?: string[];
  items?: SchemaFormSchema;
  minItems?: number;
  maxItems?: number;
  readOnly?: boolean;
  /** Treat as a secret (masked input). */
  "x-secret"?: boolean;
  /** Category used for section navigation (top-level fields). */
  "x-category"?: string;
  /** Disables the field and shows the reason. */
  "x-disabled-reason"?: string;
}

export type SchemaFormErrors = Record<string, string>;

function isEmpty(v: unknown) {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}

function inferType(schema: SchemaFormSchema): SchemaFormType | undefined {
  if (schema.type) return schema.type;
  if (schema.properties) return "object";
  if (schema.items) return "array";
  if (schema.enum) return typeof schema.enum[0] === "number" ? "number" : "string";
  return undefined;
}

/** Tests a schema `pattern`; an invalid pattern can't be checked, so it never fails (or throws). */
function matchesPattern(pattern: string, value: string) {
  try {
    return new RegExp(pattern).test(value);
  } catch {
    return true;
  }
}

function joinPath(base: string, seg: string | number) {
  return base ? `${base}.${seg}` : String(seg);
}

/** Validate a value against a schema. Returns `{ [path]: message }`; paths are dotted (`servers.0.url`), root is `""`. */
export function validateAgainstSchema(schema: SchemaFormSchema, value: unknown, path = ""): SchemaFormErrors {
  const errors: SchemaFormErrors = {};
  const type = inferType(schema);
  if (value === undefined || value === null || value === "") return errors;

  switch (type) {
    case "string": {
      if (typeof value !== "string") {
        errors[path] = "Must be text";
        break;
      }
      if (schema.minLength != null && value.length < schema.minLength) errors[path] = `Must be at least ${schema.minLength} characters`;
      else if (schema.maxLength != null && value.length > schema.maxLength) errors[path] = `Must be at most ${schema.maxLength} characters`;
      else if (schema.pattern && !matchesPattern(schema.pattern, value)) errors[path] = "Invalid format";
      else if (schema.format === "email" && !isEmail(value)) errors[path] = "Enter a valid email address";
      else if (schema.format === "uri" && !isHttpUrl(value)) errors[path] = "Enter a valid URL";
      break;
    }
    case "number":
    case "integer": {
      if (typeof value !== "number" || Number.isNaN(value)) {
        errors[path] = "Must be a number";
        break;
      }
      if (type === "integer" && !Number.isInteger(value)) errors[path] = "Must be a whole number";
      else if (schema.minimum != null && value < schema.minimum) errors[path] = `Must be at least ${schema.minimum}`;
      else if (schema.maximum != null && value > schema.maximum) errors[path] = `Must be at most ${schema.maximum}`;
      break;
    }
    case "boolean":
      if (typeof value !== "boolean") errors[path] = "Must be true or false";
      break;
    case "array": {
      if (!Array.isArray(value)) {
        errors[path] = "Must be a list";
        break;
      }
      if (schema.minItems != null && value.length < schema.minItems) errors[path] = `Add at least ${schema.minItems} ${schema.minItems === 1 ? "item" : "items"}`;
      else if (schema.maxItems != null && value.length > schema.maxItems) errors[path] = `At most ${schema.maxItems} items`;
      if (schema.items) value.forEach((item, i) => Object.assign(errors, validateAgainstSchema(schema.items!, item, joinPath(path, i))));
      break;
    }
    case "object": {
      if (typeof value !== "object" || Array.isArray(value)) {
        errors[path] = "Must be an object";
        break;
      }
      const obj = value as Record<string, unknown>;
      for (const key of schema.required ?? []) {
        if (isEmpty(obj[key])) errors[joinPath(path, key)] = "Required";
      }
      for (const [key, sub] of Object.entries(schema.properties ?? {})) {
        if (errors[joinPath(path, key)]) continue;
        Object.assign(errors, validateAgainstSchema(sub, obj[key], joinPath(path, key)));
      }
      break;
    }
  }
  if (schema.enum && !errors[path] && !schema.enum.includes(value as string | number)) errors[path] = "Choose one of the allowed values";
  return errors;
}

/** Build a value from the schema's `default`s (objects recurse; arrays default to []). */
export function schemaDefaults(schema: SchemaFormSchema): unknown {
  if (schema.default !== undefined) return schema.default;
  const type = inferType(schema);
  if (type === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, sub] of Object.entries(schema.properties ?? {})) {
      const d = schemaDefaults(sub);
      if (d !== undefined) out[k] = d;
    }
    return out;
  }
  if (type === "array") return [];
  return undefined;
}

function humanize(key: string) {
  return capitalize(key.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2"));
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

export type SchemaFieldSaveStatus = "saving" | "saved" | "error";

interface SchemaFormCtx {
  errors: SchemaFormErrors;
  showError: (path: string) => boolean;
  touch: (path: string) => void;
  status: Record<string, SchemaFieldSaveStatus>;
  disabledFields: Record<string, string>;
  disabled: boolean;
  idPrefix: string;
}

const SchemaFormContext = React.createContext<SchemaFormCtx>({
  errors: {},
  showError: () => true,
  touch: () => {},
  status: {},
  disabledFields: {},
  disabled: false,
  idPrefix: "sf",
});

function fieldId(prefix: string, path: string) {
  return `${prefix}-${path.replace(/[^\w-]/g, "_") || "root"}`;
}

function SaveStatus({ status }: { status?: SchemaFieldSaveStatus }) {
  if (!status) return null;
  return (
    <span data-save-status={status} className={cn("inline-flex items-center gap-1 text-2xs font-medium", status === "error" ? "text-destructive" : "text-muted-foreground")}>
      {status === "saving" && (
        <>
          <Spinner size="xs" /> Saving…
        </>
      )}
      {status === "saved" && (
        <>
          <RiCheckLine aria-hidden className="size-3 animate-pop text-success" /> Saved
        </>
      )}
      {status === "error" && (
        <>
          <RiErrorWarningLine aria-hidden className="size-3" /> Not saved
        </>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* NestedValueEditor                                                   */
/* ------------------------------------------------------------------ */

const noop = () => {};

export interface NestedValueEditorProps {
  /** JSON-schema-like description of the value to edit (type, properties, enums, constraints). */
  schema: SchemaFormSchema;
  /** The value to edit; its shape follows `schema`. */
  value: unknown;
  /** Called with the edited value. */
  onValueChange?: (value: unknown) => void;
  /** Legacy name of `onValueChange`. @deprecated Use `onValueChange`. */
  onChange?: (value: unknown) => void;
  /** Dotted path of this value inside the form. */
  path?: string;
  /** Property name (used for the label when the schema has no title). */
  name?: string;
  /** Marks the field required: shows the asterisk and blocks an empty value. */
  required?: boolean;
  /** Render without the label row (e.g. array items of primitive type). */
  bare?: boolean;
  /** Accessible label when `bare`. */
  ariaLabel?: string;
}

/** Recursive editor for one schema value: primitives, nested object sections and arrays with add/remove. */
export function NestedValueEditor({ schema, value, onValueChange, onChange: onChangeLegacy, path = "", name, required, bare, ariaLabel }: NestedValueEditorProps) {
  const onChange = onValueChange ?? onChangeLegacy ?? noop;
  const ctx = React.useContext(SchemaFormContext);
  const type = inferType(schema);
  const id = fieldId(ctx.idPrefix, path);
  const label = schema.title ?? (name ? humanize(name) : "Value");
  const disabledReason = schema["x-disabled-reason"] ?? ctx.disabledFields[path];
  const disabled = ctx.disabled || schema.readOnly || disabledReason != null;
  const error = ctx.showError(path) ? ctx.errors[path] : undefined;
  const errorId = `${id}-error`;
  const descId = `${id}-desc`;
  const describedBy = [error ? errorId : null, schema.description && !bare ? descId : null].filter(Boolean).join(" ") || undefined;
  const status = ctx.status[path];

  if (type === "object") {
    const obj = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
    const body = (
      <div className="space-y-4">
        {Object.entries(schema.properties ?? {}).map(([k, sub]) => (
          <NestedValueEditor
            key={k}
            name={k}
            schema={sub}
            path={joinPath(path, k)}
            required={schema.required?.includes(k)}
            value={obj[k]}
            onValueChange={(v) => {
              const next = { ...obj };
              if (v === undefined) delete next[k];
              else next[k] = v;
              onChange(next);
            }}
          />
        ))}
      </div>
    );
    if (bare) return body;
    return (
      <fieldset data-path={path} className="space-y-3 rounded-box border border-border p-4" disabled={disabled}>
        <legend className="px-1 text-sm font-semibold text-foreground">{label}</legend>
        {schema.description && <p className="-mt-1 text-xs text-muted-foreground">{schema.description}</p>}
        {body}
      </fieldset>
    );
  }

  if (type === "array") {
    const list = Array.isArray(value) ? value : [];
    const itemSchema = schema.items ?? { type: "string" };
    const itemType = inferType(itemSchema);
    const canAdd = !disabled && (schema.maxItems == null || list.length < schema.maxItems);
    const singular = label.replace(/s$/, "");
    return (
      <div data-path={path} role="group" aria-labelledby={`${id}-label`} aria-describedby={describedBy} className="space-y-2">
        <div className="flex items-center gap-2">
          <span id={`${id}-label`} className="text-sm font-medium text-foreground">
            {label}
            {required && <span aria-hidden className="ms-0.5 text-destructive">*</span>}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">{list.length}</span>
          <SaveStatus status={status} />
        </div>
        {schema.description && <p id={descId} className="text-xs text-muted-foreground">{schema.description}</p>}
        <ul className="space-y-2">
          {list.map((item, i) => {
            const itemPath = joinPath(path, i);
            const remove = (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove ${singular} ${i + 1}`}
                disabled={disabled || (schema.minItems != null && list.length <= schema.minItems)}
                onClick={() => onChange(list.filter((_, j) => j !== i))}
              >
                <RiDeleteBinLine aria-hidden />
              </Button>
            );
            const set = (v: unknown) => onChange(list.map((x, j) => (j === i ? v : x)));
            return itemType === "object" ? (
              <li key={i} data-path={itemPath} className="space-y-3 rounded-box border border-border bg-subtle p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {singular} {i + 1}
                  </span>
                  {remove}
                </div>
                <NestedValueEditor schema={itemSchema} value={item} onValueChange={set} path={itemPath} bare />
              </li>
            ) : (
              <li key={i} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <NestedValueEditor schema={itemSchema} value={item} onValueChange={set} path={itemPath} bare ariaLabel={`${singular} ${i + 1}`} />
                </div>
                {remove}
              </li>
            );
          })}
        </ul>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          leadingIcon={<RiAddLine aria-hidden />}
          disabled={!canAdd}
          onClick={() => onChange([...list, schemaDefaults(itemSchema) ?? (itemType === "boolean" ? false : itemType === "number" || itemType === "integer" ? undefined : "")])}
        >
          Add {singular.toLowerCase()}
        </Button>
        {error && (
          <p id={errorId} className="text-xs text-destructive">
            {error}
          </p>
        )}
        {disabledReason && <DisabledNote reason={disabledReason} />}
      </div>
    );
  }

  const common = {
    id,
    disabled,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    "aria-label": bare ? ariaLabel ?? label : undefined,
    "aria-required": required || undefined,
    onBlur: () => ctx.touch(path),
  };

  let control: React.ReactNode;
  if (type === "boolean") {
    control = (
      <Switch
        id={id}
        checked={Boolean(value)}
        disabled={disabled}
        onCheckedChange={(v) => {
          ctx.touch(path);
          onChange(v);
        }}
        aria-describedby={describedBy}
        aria-label={bare ? ariaLabel ?? label : undefined}
      />
    );
  } else if (schema.enum) {
    const options = schema.enum.map((v, i) => ({ value: String(v), label: schema.enumLabels?.[i] ?? String(v) }));
    const toValue = (s: string) => {
      const match = schema.enum!.find((v) => String(v) === s);
      return match;
    };
    control =
      options.length <= 3 ? (
        <SegmentedControl
          size="sm"
          value={value == null ? "" : String(value)}
          onValueChange={(s) => {
            if (!s) return;
            ctx.touch(path);
            onChange(toValue(s));
          }}
          options={options.map((o) => ({ ...o, disabled }))}
          aria-labelledby={bare ? undefined : `${id}-label`}
          aria-label={bare ? ariaLabel ?? label : undefined}
          aria-describedby={describedBy}
        />
      ) : (
        <SimpleSelect
          id={id}
          size="sm"
          options={options}
          value={value == null ? undefined : String(value)}
          onValueChange={(s) => {
            ctx.touch(path);
            onChange(toValue(s));
          }}
          disabled={disabled}
          aria-labelledby={bare ? undefined : `${id}-label`}
          aria-label={bare ? ariaLabel ?? label : undefined}
          aria-describedby={describedBy}
          invalid={Boolean(error)}
          className="w-full sm:w-64"
        />
      );
  } else if (type === "number" || type === "integer") {
    control = (
      <Input
        {...common}
        type="number"
        size="sm"
        inputMode={type === "integer" ? "numeric" : "decimal"}
        min={schema.minimum}
        max={schema.maximum}
        step={type === "integer" ? 1 : "any"}
        placeholder={schema.placeholder}
        value={value == null || Number.isNaN(value) ? "" : String(value)}
        invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className="w-full sm:w-48"
      />
    );
  } else if (schema.format === "password" || schema["x-secret"]) {
    control = (
      <PasswordInput
        {...common}
        size="sm"
        autoComplete="off"
        placeholder={schema.placeholder}
        value={typeof value === "string" ? value : ""}
        invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
        className="font-mono"
      />
    );
  } else if (schema.format === "textarea") {
    control = (
      <Textarea
        {...common}
        rows={3}
        placeholder={schema.placeholder}
        value={typeof value === "string" ? value : ""}
        invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      />
    );
  } else {
    control = (
      <Input
        {...common}
        size="sm"
        type={schema.format === "email" ? "email" : schema.format === "uri" ? "url" : "text"}
        placeholder={schema.placeholder}
        maxLength={schema.maxLength}
        value={typeof value === "string" ? value : value == null ? "" : String(value)}
        invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
        className={cn(schema.format === "uri" && "font-mono")}
      />
    );
  }

  if (bare) {
    return (
      <div className="space-y-1" data-path={path}>
        {control}
        {error && (
          <p id={errorId} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div data-path={path} className={cn("space-y-1.5", type === "boolean" && "flex flex-wrap items-start justify-between gap-x-4 space-y-0")}>
      <div className={cn("flex items-center gap-2", type === "boolean" && "min-w-0 flex-1 flex-col items-start gap-0.5")}>
        <span className="flex items-center gap-2">
          <label id={`${id}-label`} htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
            {required && <span aria-hidden className="ms-0.5 text-destructive">*</span>}
          </label>
          <SaveStatus status={status} />
        </span>
        {type === "boolean" && schema.description && (
          <p id={descId} className="text-xs text-muted-foreground">
            {schema.description}
          </p>
        )}
      </div>
      {control}
      {type !== "boolean" && schema.description && (
        <p id={descId} className="text-xs text-muted-foreground">
          {schema.description}
        </p>
      )}
      {error && (
        <p id={errorId} className="w-full text-xs text-destructive">
          {error}
        </p>
      )}
      {disabledReason && <DisabledNote reason={disabledReason} />}
    </div>
  );
}

function DisabledNote({ reason }: { reason: string }) {
  return (
    <p className="flex w-full items-center gap-1 text-xs text-muted-foreground/80">
      <RiLockLine aria-hidden className="size-3" />
      {reason}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* SchemaForm                                                          */
/* ------------------------------------------------------------------ */

export interface SchemaFormProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onChange" | "onSubmit" | "defaultValue"> {
  /** Root schema (an object schema). */
  schema: SchemaFormSchema;
  /** Controlled form value. Use with `onValueChange`. */
  value?: Record<string, unknown>;
  /** Initial form value when uncontrolled. */
  defaultValue?: Record<string, unknown>;
  /** Called with the whole form value after every edit. */
  onValueChange?: (value: Record<string, unknown>) => void;
  /** Legacy name of `onValueChange`. @deprecated Use `onValueChange`. */
  onChange?: (value: Record<string, unknown>) => void;
  /** Explicit submit (non-autosave). Only called when valid. */
  onSubmit?: (value: Record<string, unknown>) => void | Promise<void>;
  /**
   * Text of the submit button (explicit-submit mode).
   * @default "Save"
   */
  submitLabel?: React.ReactNode;
  /** Save automatically after edits (debounced). */
  autosave?: boolean;
  /** Debounce in ms for autosave. Default 800. */
  autosaveDelay?: number;
  /** Autosave callback with the full value and the changed top-level keys. Throw to mark the fields "Not saved". */
  onSave?: (value: Record<string, unknown>, changedKeys: string[]) => void | Promise<void>;
  /** Disable fields by path with a reason. */
  disabledFields?: Record<string, string>;
  /** Disables every field. */
  disabled?: boolean;
  /** Show section navigation + search when there are more top-level fields than this. Default 8. */
  navThreshold?: number;
  /** Show all validation errors immediately (default: after blur or submit). */
  validateOnMount?: boolean;
}

interface Section {
  id: string;
  label: string;
  keys: string[];
}

function buildSections(schema: SchemaFormSchema): Section[] {
  const order: Section[] = [];
  const byId = new Map<string, Section>();
  for (const [k, sub] of Object.entries(schema.properties ?? {})) {
    const cat = sub["x-category"] ?? (inferType(sub) === "object" ? sub.title ?? humanize(k) : "General");
    let s = byId.get(cat);
    if (!s) {
      s = { id: cat.toLowerCase().replace(/\W+/g, "-"), label: cat, keys: [] };
      byId.set(cat, s);
      order.push(s);
    }
    s.keys.push(k);
  }
  return order;
}

function matchesQuery(key: string, schema: SchemaFormSchema, q: string): boolean {
  if (!q) return true;
  const hay = `${key} ${schema.title ?? ""} ${schema.description ?? ""}`.toLowerCase();
  if (hay.includes(q)) return true;
  return Object.entries(schema.properties ?? {}).some(([k, s]) => matchesQuery(k, s, q));
}

/** Form generated from a JSON-Schema-like object: nested sections, arrays, validation, section nav + search, and debounced autosave. */
export const SchemaForm = React.forwardRef<HTMLFormElement, SchemaFormProps>(
  (
    {
      schema,
      value: valueProp,
      defaultValue,
      onValueChange,
      onChange,
      onSubmit,
      submitLabel = "Save",
      autosave = false,
      autosaveDelay = 800,
      onSave,
      disabledFields = {},
      disabled = false,
      navThreshold = 8,
      validateOnMount = false,
      className,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useControllableState<Record<string, unknown>>({
      value: valueProp,
      defaultValue: defaultValue ?? ((schemaDefaults(schema) as Record<string, unknown>) || {}),
      onChange: onValueChange ?? onChange,
    });
    const [touched, setTouched] = React.useState<Set<string>>(() => new Set());
    const [submitted, setSubmitted] = React.useState(validateOnMount);
    const [status, setStatus] = React.useState<Record<string, SchemaFieldSaveStatus>>({});
    const [query, setQuery] = React.useState("");
    const [activeSection, setActiveSection] = React.useState<string | null>(null);
    const { run: runSubmit, busy } = useAsyncAction(async (v: Record<string, unknown>) => {
      await onSubmit?.(v);
    });
    const idPrefix = useSafeId("sf");
    const errors = React.useMemo(() => validateAgainstSchema({ ...schema, type: "object" }, value), [schema, value]);

    const pending = React.useRef<Set<string>>(new Set());
    const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const latest = useLatestRef(value);
    const onSaveRef = useLatestRef(onSave);
    React.useEffect(() => () => {
      if (timer.current) clearTimeout(timer.current);
    }, []);

    const flush = React.useCallback(async () => {
      timer.current = null;
      const keys = Array.from(pending.current);
      pending.current.clear();
      const v = latest.current;
      const errs = validateAgainstSchema({ ...schema, type: "object" }, v);
      const valid = keys.filter((k) => !Object.keys(errs).some((p) => p === k || p.startsWith(`${k}.`)));
      if (!valid.length) {
        setStatus((s) => {
          const n = { ...s };
          for (const k of keys) delete n[k];
          return n;
        });
        return;
      }
      setStatus((s) => ({ ...s, ...Object.fromEntries(valid.map((k) => [k, "saving" as const])) }));
      try {
        await onSaveRef.current?.(v, valid);
        setStatus((s) => ({ ...s, ...Object.fromEntries(valid.map((k) => [k, "saved" as const])) }));
      } catch {
        setStatus((s) => ({ ...s, ...Object.fromEntries(valid.map((k) => [k, "error" as const])) }));
      }
    }, [schema]);

    const handleChange = (next: unknown) => {
      const obj = next as Record<string, unknown>;
      const changed = Object.keys({ ...value, ...obj }).filter((k) => obj[k] !== value[k]);
      setValue(obj);
      if (autosave && changed.length) {
        setTouched((t) => new Set([...t, ...changed]));
        for (const k of changed) pending.current.add(k);
        setStatus((s) => {
          const n = { ...s };
          for (const k of changed) delete n[k];
          return n;
        });
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void flush(), autosaveDelay);
      }
    };

    const ctx = React.useMemo<SchemaFormCtx>(
      () => ({
        errors,
        showError: (path) => submitted || touched.has(path) || touched.has(path.split(".")[0]!),
        touch: (path) =>
          setTouched((t) => {
            if (t.has(path)) return t;
            const n = new Set(t);
            n.add(path);
            return n;
          }),
        status,
        disabledFields,
        disabled,
        idPrefix,
      }),
      [errors, submitted, touched, status, disabledFields, disabled, idPrefix]
    );

    const keys = Object.keys(schema.properties ?? {});
    const sections = buildSections(schema);
    const showNav = keys.length > navThreshold || sections.length > 2;
    const q = query.trim().toLowerCase();
    const visibleKeys = keys.filter((k) => matchesQuery(k, schema.properties![k]!, q));
    const shownSections = sections
      .map((s) => ({ ...s, keys: s.keys.filter((k) => visibleKeys.includes(k)) }))
      .filter((s) => s.keys.length && (!showNav || q || !activeSection || s.id === activeSection));

    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitted(true);
      if (Object.keys(errors).length) return;
      void runSubmit(value);
    };

    const errorCount = Object.keys(errors).length;
    const fields = (
      <div className="min-w-0 flex-1 space-y-8">
        {shownSections.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No settings match “{query}”</p>}
        {shownSections.map((s) => (
          <section key={s.id} aria-labelledby={`${idPrefix}-sec-${s.id}`} className="space-y-4">
            {(showNav || sections.length > 1) && (
              <h3 id={`${idPrefix}-sec-${s.id}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {s.label}
              </h3>
            )}
            {!(showNav || sections.length > 1) && (
              <h3 id={`${idPrefix}-sec-${s.id}`} className="sr-only">
                {s.label}
              </h3>
            )}
            {s.keys.map((k) => {
              const sub = schema.properties![k]!;
              const isObj = inferType(sub) === "object";
              return (
                <NestedValueEditor
                  key={k}
                  name={k}
                  schema={isObj && !sub["x-category"] && sections.length > 1 ? { ...sub, title: sub.title ?? humanize(k) } : sub}
                  path={k}
                  required={schema.required?.includes(k)}
                  value={value[k]}
                  onValueChange={(v) => {
                    const next = { ...value };
                    if (v === undefined) delete next[k];
                    else next[k] = v;
                    handleChange(next);
                  }}
                />
              );
            })}
          </section>
        ))}
      </div>
    );

    return (
      <SchemaFormContext.Provider value={ctx}>
        <form ref={ref} noValidate onSubmit={submit} data-slot="schema-form" className={cn("@container w-full space-y-5", className)} {...props}>
          {showNav ? (
            <div className="flex flex-col gap-6 @xl:flex-row">
              <nav aria-label="Sections" className="space-y-2 @xl:w-48 @xl:shrink-0">
                <SearchInput size="sm" value={query} onChange={(e) => setQuery(e.target.value)} onClear={() => setQuery("")} clearable placeholder="Search settings…" aria-label="Search settings" />
                <ul className="flex gap-1 overflow-x-auto @xl:flex-col">
                  <li>
                    <button
                      type="button"
                      aria-current={!activeSection ? "true" : undefined}
                      onClick={() => setActiveSection(null)}
                      className={cn("w-full rounded-control px-2.5 py-1.5 text-start text-sm", !activeSection ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent", focusRing)}
                    >
                      All
                    </button>
                  </li>
                  {sections.map((s) => {
                    const secErrors = Object.keys(errors).filter((p) => s.keys.includes(p.split(".")[0]!)).length;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          aria-current={activeSection === s.id ? "true" : undefined}
                          onClick={() => setActiveSection(s.id)}
                          className={cn(
                            "flex w-full items-center gap-2 whitespace-nowrap rounded-control px-2.5 py-1.5 text-start text-sm",
                            activeSection === s.id ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent",
                            focusRing
                          )}
                        >
                          {s.label}
                          {submitted && secErrors > 0 && (
                            <span className="ms-auto rounded-full bg-destructive-soft px-1.5 text-2xs font-semibold text-destructive-soft-foreground">
                              {secErrors}
                              <span className="sr-only"> errors</span>
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              {fields}
            </div>
          ) : (
            fields
          )}
          {!autosave && onSubmit && (
            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
              {submitted && errorCount > 0 && (
                <span role="alert" className="text-xs text-destructive">
                  Fix {errorCount} {errorCount === 1 ? "field" : "fields"} to continue
                </span>
              )}
              <Button type="submit" loading={busy} disabled={disabled}>
                {submitLabel}
              </Button>
            </div>
          )}
        </form>
      </SchemaFormContext.Provider>
    );
  }
);
SchemaForm.displayName = "SchemaForm";
