/** Schema form: SchemaForm (sections, search, validation, autosave) with re-exports of the schema types, validation and defaults, and the NestedValueEditor, one module per family. */
import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { useAsyncAction } from "../hooks/use-async-action";
import { useControllableState } from "../hooks/use-controllable-state";
import { useSafeId } from "../hooks/use-safe-id";
import { useLatestRef } from "../hooks/use-iso-layout-effect";
import { Button } from "../primitives/button";
import { SearchInput } from "../primitives/input";
import { NestedValueEditor } from "./schema-form-editor";
import { schemaDefaults, validateAgainstSchema } from "./schema-form-model";
import { SchemaFormContext, defaultLabels, humanize, inferType, type SchemaFormCtx } from "./schema-form-internal";
import type { SchemaFieldSaveStatus, SchemaFormLabels, SchemaFormSchema } from "./schema-form-types";

export * from "./schema-form-types";
export * from "./schema-form-model";
export * from "./schema-form-editor";

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
  /** Texts of the form chrome (English by default); pass them to translate the form. */
  labels?: SchemaFormLabels;
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
      labels: labelsProp,
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
    const labels = React.useMemo(() => ({ ...defaultLabels, ...labelsProp }), [labelsProp]);
    const errors = React.useMemo(() => validateAgainstSchema({ ...schema, type: "object" }, value), [schema, value]);

    const pending = React.useRef<Set<string>>(new Set());
    const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    /** Per field, the id of the newest save that includes it: an older save that settles late must not overwrite its status. */
    const saveIds = React.useRef<Map<string, number>>(new Map());
    const saveSeq = React.useRef(0);
    const latest = useLatestRef(value);
    const onSaveRef = useLatestRef(onSave);

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
      const id = ++saveSeq.current;
      for (const k of valid) saveIds.current.set(k, id);
      const settle = (state: SchemaFieldSaveStatus) => {
        const mine = valid.filter((k) => saveIds.current.get(k) === id);
        if (!mine.length) return;
        setStatus((s) => ({ ...s, ...Object.fromEntries(mine.map((k) => [k, state])) }));
      };
      setStatus((s) => ({ ...s, ...Object.fromEntries(valid.map((k) => [k, "saving" as const])) }));
      try {
        await onSaveRef.current?.(v, valid);
        settle("saved");
      } catch {
        settle("error");
      }
    }, [schema]);

    // An edit made just before the form unmounts is saved instead of dropped with its timer.
    const flushRef = useLatestRef(flush);
    React.useEffect(
      () => () => {
        if (!timer.current) return;
        clearTimeout(timer.current);
        void flushRef.current();
      },
      [flushRef]
    );

    /** `patch` gets the value including edits already requested this tick, so two changes in one tick both land. */
    const handleChange = (patch: (prev: Record<string, unknown>) => Record<string, unknown>) => {
      let changed: string[] = [];
      setValue((prev) => {
        const obj = patch(prev);
        changed = Object.keys({ ...prev, ...obj }).filter((k) => obj[k] !== prev[k]);
        return obj;
      });
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
        labels,
      }),
      [errors, submitted, touched, status, disabledFields, disabled, idPrefix, labels]
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
        {shownSections.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{labels.noMatch(query)}</p>}
        {shownSections.map((s) => (
          <section key={s.id} data-slot="schema-form-section" aria-labelledby={`${idPrefix}-sec-${s.id}`} className="space-y-4">
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
                  onValueChange={(v) =>
                    handleChange((prev) => {
                      const next = { ...prev };
                      if (v === undefined) delete next[k];
                      else next[k] = v;
                      return next;
                    })
                  }
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
              <nav aria-label={labels.sections} data-slot="schema-form-nav" className="space-y-2 @xl:w-48 @xl:shrink-0">
                <SearchInput size="sm" value={query} onChange={(e) => setQuery(e.target.value)} onClear={() => setQuery("")} clearable placeholder={labels.searchPlaceholder} aria-label={labels.search} />
                <ul className="flex gap-1 overflow-x-auto @xl:flex-col">
                  <li>
                    <button
                      type="button"
                      aria-current={!activeSection ? "true" : undefined}
                      onClick={() => setActiveSection(null)}
                      className={cn("w-full rounded-control px-2.5 py-1.5 text-start text-sm", !activeSection ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent", focusRing)}
                    >
                      {labels.all}
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
                              <span className="sr-only"> {labels.errors}</span>
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
                  {labels.fixFields(errorCount)}
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
