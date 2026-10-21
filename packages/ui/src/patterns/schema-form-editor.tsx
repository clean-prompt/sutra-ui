/** NestedValueEditor: the recursive editor for one schema value (primitives, nested objects, arrays), with its save-status badge and disabled note. */
import * as React from "react";
import { RiAddLine, RiCheckLine, RiDeleteBinLine, RiErrorWarningLine, RiLockLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { Input, PasswordInput } from "../primitives/input";
import { SegmentedControl } from "../primitives/segmented-control";
import { SimpleSelect } from "../primitives/select";
import { Spinner } from "../primitives/spinner";
import { Switch } from "../primitives/switch";
import { Textarea } from "../primitives/textarea";
import { SchemaFormContext, fieldId, humanize, inferType, joinPath } from "./schema-form-internal";
import { schemaDefaults } from "./schema-form-model";
import type { SchemaFieldSaveStatus, SchemaFormSchema } from "./schema-form-types";

function SaveStatus({ status }: { status?: SchemaFieldSaveStatus }) {
  const { labels } = React.useContext(SchemaFormContext);
  if (!status) return null;
  return (
    <span data-slot="schema-form-status" data-save-status={status} className={cn("inline-flex items-center gap-1 text-2xs font-medium", status === "error" ? "text-destructive" : "text-muted-foreground")}>
      {status === "saving" && (
        <>
          <Spinner size="xs" /> {labels.saving}
        </>
      )}
      {status === "saved" && (
        <>
          <RiCheckLine aria-hidden className="size-3 animate-pop text-success" /> {labels.saved}
        </>
      )}
      {status === "error" && (
        <>
          <RiErrorWarningLine aria-hidden className="size-3" /> {labels.notSaved}
        </>
      )}
    </span>
  );
}

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
      <fieldset data-slot="schema-form-group" data-path={path} className="space-y-3 rounded-box border border-border p-4" disabled={disabled}>
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
      <div data-slot="schema-form-field" data-path={path} role="group" aria-labelledby={`${id}-label`} aria-describedby={describedBy} className="space-y-2">
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
                aria-label={ctx.labels.remove(singular, i + 1)}
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
          {ctx.labels.add(singular)}
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
    <div data-slot="schema-form-field" data-path={path} className={cn("space-y-1.5", type === "boolean" && "flex flex-wrap items-start justify-between gap-x-4 space-y-0")}>
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
    <p data-slot="schema-form-disabled-note" className="flex w-full items-center gap-1 text-xs text-muted-foreground/80">
      <RiLockLine aria-hidden className="size-3" />
      {reason}
    </p>
  );
}

