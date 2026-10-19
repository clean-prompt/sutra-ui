/** Automation templates: blueprint types, `fillBlueprintTemplate`, BlueprintCard and BlueprintGallery. */
import * as React from "react";
import { RiExternalLinkLine, RiTimeLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useAsyncAction } from "../../hooks/use-async-action";
import { CopyButton } from "../../primitives/copy-button";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { Input, SearchInput } from "../../primitives/input";
import { SwitchField } from "../../primitives/switch";
import { NumberInput } from "../../primitives/number-input";
import { SimpleSelect, type SelectOption } from "../../primitives/select";
import { describeSchedule } from "../../patterns/cron";
import { toSelectOptions } from "./agent-jobs-internal";

/* ------------------------------------------------------------------ */
/* Blueprints                                                          */
/* ------------------------------------------------------------------ */

export type BlueprintSlotType = "text" | "number" | "select" | "time" | "boolean" | "channel";
export type BlueprintSlotValue = string | number | boolean | null;
export type BlueprintValues = Record<string, BlueprintSlotValue>;

export interface BlueprintSlot {
  id: string;
  label: string;
  type: BlueprintSlotType;
  required?: boolean;
  defaultValue?: BlueprintSlotValue;
  placeholder?: string;
  description?: string;
  /** `select` options (and `channel` options when the gallery has none). */
  options?: (string | SelectOption)[];
  min?: number;
  max?: number;
}

export interface Blueprint {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  /** Schedule string: cron or "every 30m". */
  schedule: string;
  tags?: string[];
  slots?: BlueprintSlot[];
  /** Prompt template; `{slotId}` placeholders are filled from the slot form. */
  prompt?: string;
  /** CLI command template, e.g. `sutra cron add "{schedule}" --blueprint briefing --city "{city}"`. */
  cliCommand?: string;
  /** Deep link for the "Open in app" variant. */
  appHref?: string;
}

/** Quoting context at `end` in a POSIX shell command template. */
function shellQuoteAt(template: string, end: number): "none" | "single" | "double" {
  let q: "none" | "single" | "double" = "none";
  for (let i = 0; i < end; i++) {
    const c = template[i];
    if (q === "single") {
      if (c === "'") q = "none";
    } else if (c === "\\") i++;
    else if (c === '"') q = q === "double" ? "none" : "double";
    else if (c === "'" && q === "none") q = "single";
  }
  return q;
}

/** Escape `value` so it stays one literal word in its quoting context (no expansion, no breaking out). */
function shellEscape(value: string, quote: "none" | "single" | "double"): string {
  if (quote === "single") return value.replace(/'/g, "'\\''");
  // Inside double quotes \ " $ ` stay special; `!` (bash history) is closed out into single quotes.
  if (quote === "double") return value.replace(/[\\"$`]/g, "\\$&").replace(/!/g, `"'!'"`);
  return /^[\w@%+=:,./-]+$/.test(value) ? value : `'${value.replace(/'/g, "'\\''")}'`;
}

/**
 * Replace `{key}` placeholders with values (unknown keys are left as-is).
 * Pass `{ escape: "shell" }` for a command line: each value is escaped for the quoting around its placeholder.
 */
export function fillBlueprintTemplate(
  template: string,
  values: Record<string, BlueprintSlotValue | undefined>,
  options: { escape?: "shell" } = {}
): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string, offset: number) => {
    const v = values[key];
    if (v == null || v === "") return m;
    return options.escape === "shell" ? shellEscape(String(v), shellQuoteAt(template, offset)) : String(v);
  });
}

function initialSlotValues(slots: BlueprintSlot[] = [], channels: SelectOption[] = []): BlueprintValues {
  const out: BlueprintValues = {};
  for (const s of slots) {
    if (s.defaultValue !== undefined) out[s.id] = s.defaultValue;
    else if (s.type === "boolean") out[s.id] = false;
    else if (s.type === "select") out[s.id] = toSelectOptions(s.options)[0]?.value ?? null;
    else if (s.type === "channel") out[s.id] = (channels[0] ?? toSelectOptions(s.options)[0])?.value ?? null;
    else out[s.id] = s.type === "number" ? null : "";
  }
  return out;
}

export interface BlueprintCardProps extends React.HTMLAttributes<HTMLElement> {
  blueprint: Blueprint;
  /** `create` expands into the slot form; `open` links to the app instead. */
  variant?: "create" | "open";
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onCreate?: (blueprint: Blueprint, values: BlueprintValues) => void | Promise<void>;
  onOpen?: (blueprint: Blueprint) => void;
  /** Options for `channel` slots. */
  channels?: SelectOption[];
}

function CliCommandRow({ command }: { command: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/60 py-1 pl-2.5 pr-1">
      <code data-slot="blueprint-cli" className="min-w-0 flex-1 truncate font-mono text-xs" title={command}>
        <span aria-hidden className="select-none text-muted-foreground">$ </span>
        {command}
      </code>
      <CopyButton value={command} label="Copy command" />
    </div>
  );
}

/** Automation template card: icon, title, description, schedule and tags; expands into a slot form that creates a job. */
export const BlueprintCard = React.forwardRef<HTMLElement, BlueprintCardProps>(
  ({ blueprint, variant = "create", expanded: expandedProp, defaultExpanded = false, onExpandedChange, onCreate, onOpen, channels, className, ...props }, ref) => {
    const [expanded, setExpanded] = useControllableState({ value: expandedProp, defaultValue: defaultExpanded, onChange: onExpandedChange });
    const [values, setValues] = React.useState<BlueprintValues>(() => initialSlotValues(blueprint.slots, channels));
    const [submitted, setSubmitted] = React.useState(false);
    const create = useAsyncAction(async (b: Blueprint, v: BlueprintValues) => onCreate?.(b, v));
    const id = React.useId();
    const titleId = `${id}-title`;
    const formId = `${id}-form`;
    const slots = blueprint.slots ?? [];
    const missing = slots.filter((s) => s.required && (values[s.id] == null || values[s.id] === ""));
    const scheduleText = describeSchedule(blueprint.schedule);
    const command = blueprint.cliCommand ? fillBlueprintTemplate(blueprint.cliCommand, { ...values, schedule: blueprint.schedule, title: blueprint.title, id: blueprint.id }, { escape: "shell" }) : null;

    const set = (k: string, v: BlueprintSlotValue) => setValues((p) => ({ ...p, [k]: v }));

    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitted(true);
      if (missing.length) return;
      await create.run(blueprint, values);
    };

    const renderSlot = (s: BlueprintSlot) => {
      const sid = `${id}-${s.id}`;
      const invalid = submitted && missing.includes(s);
      const v = values[s.id];
      const control = (() => {
        switch (s.type) {
          case "boolean":
            return <SwitchField id={sid} label={s.label} description={s.description} checked={v === true} onCheckedChange={(c) => set(s.id, c)} />;
          case "number":
            return (
              <NumberInput id={sid} size="sm" min={s.min} max={s.max} value={typeof v === "number" ? v : null} invalid={invalid} placeholder={s.placeholder} onValueChange={(n) => set(s.id, n)} wrapperClassName="w-40" />
            );
          case "select":
          case "channel": {
            const opts = s.type === "channel" && channels?.length ? channels : toSelectOptions(s.options);
            if (!opts.length) {
              return <Input id={sid} size="sm" value={String(v ?? "")} invalid={invalid} placeholder={s.placeholder ?? (s.type === "channel" ? "#channel" : undefined)} onChange={(e) => set(s.id, e.target.value)} />;
            }
            return <SimpleSelect id={sid} size="sm" options={opts} value={v == null ? undefined : String(v)} invalid={invalid} onValueChange={(x) => set(s.id, x)} />;
          }
          case "time":
            return <Input id={sid} size="sm" type="time" value={String(v ?? "")} invalid={invalid} onChange={(e) => set(s.id, e.target.value)} className="w-32" />;
          default:
            return <Input id={sid} size="sm" value={String(v ?? "")} invalid={invalid} placeholder={s.placeholder} onChange={(e) => set(s.id, e.target.value)} />;
        }
      })();
      if (s.type === "boolean") return <div key={s.id}>{control}</div>;
      return (
        <div key={s.id} className="flex flex-col gap-1.5">
          <label htmlFor={sid} className="text-sm font-medium">
            {s.label}
            {s.required ? (
              <span aria-hidden className="text-destructive">
                {" "}*
              </span>
            ) : null}
          </label>
          {control}
          {s.description ? <p className="text-xs text-muted-foreground">{s.description}</p> : null}
          {invalid ? (
            <p role="alert" className="text-xs text-destructive">
              {s.label} is required
            </p>
          ) : null}
        </div>
      );
    };

    return (
      <article
        ref={ref}
        aria-labelledby={titleId}
        data-expanded={expanded || undefined}
        className={cn("flex min-w-0 flex-col gap-3 rounded-box border border-border bg-card p-4 shadow-xs transition-shadow", expanded && "shadow-md", className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          {blueprint.icon ? <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground [&_svg]:size-5">{blueprint.icon}</span> : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 id={titleId} className="text-sm font-semibold text-foreground">
              {blueprint.title}
            </h3>
            <p className="text-sm text-muted-foreground">{blueprint.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge size="sm" color="brand" leadingIcon={<RiTimeLine aria-hidden />}>
            {scheduleText}
          </Badge>
          {blueprint.tags?.map((t) => (
            <Badge key={t} size="sm" variant="outline">
              {t}
            </Badge>
          ))}
        </div>

        {variant === "open" ? (
          <div className="flex flex-col gap-2">
            {command ? <CliCommandRow command={command} /> : null}
            {blueprint.appHref ? (
              <Button asChild size="sm" variant="secondary" className="self-start">
                <a href={blueprint.appHref} onClick={() => onOpen?.(blueprint)}>
                  <RiExternalLinkLine aria-hidden />
                  Open in app
                </a>
              </Button>
            ) : (
              <Button type="button" size="sm" variant="secondary" className="self-start" leadingIcon={<RiExternalLinkLine aria-hidden />} onClick={() => onOpen?.(blueprint)}>
                Open in app
              </Button>
            )}
          </div>
        ) : (
          <>
            {!expanded ? (
              <Button type="button" size="sm" variant="secondary" className="self-start" aria-expanded={false} onClick={() => setExpanded(true)}>
                Use template
              </Button>
            ) : (
              <form id={formId} noValidate onSubmit={submit} aria-label={`Set up ${blueprint.title}`} className="flex flex-col gap-3 border-t border-border pt-3">
                {slots.map(renderSlot)}
                {command ? <CliCommandRow command={command} /> : null}
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="ghost" aria-expanded aria-controls={formId} onClick={() => setExpanded(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" loading={create.busy}>
                    Create job
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </article>
    );
  }
);
BlueprintCard.displayName = "BlueprintCard";

export interface BlueprintGalleryProps extends React.HTMLAttributes<HTMLDivElement> {
  blueprints: Blueprint[];
  variant?: "create" | "open";
  onCreate?: (blueprint: Blueprint, values: BlueprintValues) => void | Promise<void>;
  onOpen?: (blueprint: Blueprint) => void;
  channels?: SelectOption[];
  searchable?: boolean;
  /** Shown when no template matches. Default "No templates match". */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  empty?: React.ReactNode;
}

/** Filterable grid of automation templates (search + tag chips); one card expands at a time. */
export const BlueprintGallery = React.forwardRef<HTMLDivElement, BlueprintGalleryProps>(
  ({ blueprints, variant = "create", onCreate, onOpen, channels, searchable = true, emptyState, empty, className, ...props }, ref) => {
    const [query, setQuery] = React.useState("");
    const [tag, setTag] = React.useState<string | null>(null);
    const [open, setOpen] = React.useState<string | null>(null);
    const tags = React.useMemo(() => [...new Set(blueprints.flatMap((b) => b.tags ?? []))].sort(), [blueprints]);
    const q = query.trim().toLowerCase();
    const shown = blueprints.filter(
      (b) =>
        (!tag || b.tags?.includes(tag)) &&
        (!q || b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q) || b.tags?.some((t) => t.toLowerCase().includes(q)))
    );
    const chip = (label: string, value: string | null) => (
      <button
        key={label}
        type="button"
        aria-pressed={tag === value}
        onClick={() => setTag(value)}
        className={cn(
          "h-7 rounded-control border px-2.5 text-xs font-medium transition-colors",
          tag === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
          focusRing
        )}
      >
        {label}
      </button>
    );
    return (
      <div ref={ref} className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {searchable ? <SearchInput size="sm" value={query} onChange={(e) => setQuery(e.target.value)} onClear={() => setQuery("")} placeholder="Search templates…" aria-label="Search templates" className="sm:max-w-xs" /> : null}
          {tags.length ? (
            <div role="group" aria-label="Filter by tag" className="flex flex-wrap gap-1.5">
              {chip("All", null)}
              {tags.map((t) => chip(t, t))}
            </div>
          ) : null}
        </div>
        {shown.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-3">
            {shown.map((b) => (
              <BlueprintCard
                key={b.id}
                blueprint={b}
                variant={variant}
                channels={channels}
                expanded={open === b.id}
                onExpandedChange={(x) => setOpen(x ? b.id : null)}
                onCreate={onCreate}
                onOpen={onOpen}
                className={open === b.id ? "sm:col-span-2 lg:col-span-1" : undefined}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-box border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{emptyState ?? empty ?? "No templates match"}</p>
        )}
      </div>
    );
  }
);
BlueprintGallery.displayName = "BlueprintGallery";
