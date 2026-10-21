/** Agent job editing: the NameCheckboxPicker, `validateAgentJob` and the AgentJobForm. */
import * as React from "react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useAsyncAction } from "../../hooks/use-async-action";
import { Button } from "../../primitives/button";
import { Input, SearchInput } from "../../primitives/input";
import { Textarea } from "../../primitives/textarea";
import { Checkbox } from "../../primitives/checkbox";
import { SwitchField } from "../../primitives/switch";
import { NumberInput } from "../../primitives/number-input";
import { SimpleSelect, type SelectOption } from "../../primitives/select";
import { SegmentedControl } from "../../primitives/segmented-control";
import { Field, FieldDescription, FieldError, FieldLabel } from "../../primitives/field";
import { CronScheduleField, cronScheduleError, valueToSchedule } from "../../patterns/cron";
import { toSelectOptions } from "./agent-jobs-internal";
import type { AgentJobDraft, AgentJobMode, DeliveryPlatform, DeliveryPlatformStatus } from "./agent-jobs-model";
import { DeliveryTargetPicker, deliveryTargetIssue } from "./agent-jobs-delivery";

/* ------------------------------------------------------------------ */
/* NameCheckboxPicker                                                  */
/* ------------------------------------------------------------------ */

export interface NameCheckboxOption {
  value: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}

export interface NameCheckboxPickerProps extends Omit<React.HTMLAttributes<HTMLFieldSetElement>, "defaultValue" | "onChange"> {
  /** Legend, also used to name the search box. */
  label: string;
  /** Choices as plain names or objects with a name, label and description. */
  options: (string | NameCheckboxOption)[];
  /** Controlled names of the checked options. */
  value?: string[];
  /** Initially checked names when `value` is not controlled. */
  defaultValue?: string[];
  /** Called with the checked names when the user checks or unchecks an option. */
  onValueChange?: (value: string[]) => void;
  /** Show the search box. Default: when there are more than 6 options. */
  searchable?: boolean;
  /** Shown when the search matches nothing. Default "No matches". */
  emptyState?: React.ReactNode;
  /** Content shown when there is nothing to list. @deprecated Use `emptyState`. */
  emptyText?: React.ReactNode;
  /** Disables every checkbox and the search box. */
  disabled?: boolean;
  /** Class for the scrolling list. */
  listClassName?: string;
}

const normalizeOption = (o: string | NameCheckboxOption): NameCheckboxOption => (typeof o === "string" ? { value: o } : o);

/** Searchable checkbox list of names (skills, toolsets, events) with select-all and a count. */
export const NameCheckboxPicker = React.forwardRef<HTMLFieldSetElement, NameCheckboxPickerProps>(
  ({ label, options, value: valueProp, defaultValue = [], onValueChange, searchable, emptyState, emptyText, disabled, listClassName, className, ...props }, ref) => {
    const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
    const [query, setQuery] = React.useState("");
    const id = React.useId();
    const all = React.useMemo(() => options.map(normalizeOption), [options]);
    const q = query.trim().toLowerCase();
    const visible = q
      ? all.filter((o) => o.value.toLowerCase().includes(q) || (typeof o.label === "string" && o.label.toLowerCase().includes(q)))
      : all;
    const selectable = visible.filter((o) => !o.disabled);
    const selectedVisible = selectable.filter((o) => value.includes(o.value)).length;
    const allState: boolean | "indeterminate" = selectable.length > 0 && selectedVisible === selectable.length ? true : selectedVisible > 0 ? "indeterminate" : false;
    const showSearch = searchable ?? all.length > 6;

    const toggle = (v: string, on: boolean) => setValue(on ? [...value.filter((x) => x !== v), v] : value.filter((x) => x !== v));
    const toggleAll = () => {
      const ids = selectable.map((o) => o.value);
      if (allState === true) setValue(value.filter((v) => !ids.includes(v)));
      else setValue([...new Set([...value, ...ids])]);
    };

    return (
      <fieldset ref={ref} data-slot="name-checkbox-picker" disabled={disabled} className={cn("flex min-w-0 flex-col gap-2", className)} {...props}>
        <legend className="mb-2 flex w-full items-center justify-between gap-2 text-sm font-medium text-foreground">
          <span>{label}</span>
        </legend>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span aria-live="polite">
            <bdi dir="ltr">{value.length} of {all.length} selected</bdi>
          </span>
          <span className="flex items-center gap-2">
            <Checkbox
              id={`${id}-all`}
              size="sm"
              checked={allState}
              disabled={!selectable.length || disabled}
              onCheckedChange={toggleAll}
            />
            <label htmlFor={`${id}-all`} className="cursor-pointer">
              Select all{q ? " shown" : ""}
            </label>
          </span>
        </div>
        {showSearch ? (
          <SearchInput size="sm" value={query} onChange={(e) => setQuery(e.target.value)} onClear={() => setQuery("")} placeholder={`Search ${label.toLowerCase()}…`} aria-label={`Search ${label}`} />
        ) : null}
        <ul className={cn("flex max-h-56 flex-col gap-0.5 overflow-y-auto rounded-box border border-border p-1 scrollbar-thin", listClassName)}>
          {visible.length === 0 ? <li className="px-2 py-3 text-center text-sm text-muted-foreground">{emptyState ?? emptyText ?? "No matches"}</li> : null}
          {visible.map((o, i) => {
            const cid = `${id}-o${i}`;
            return (
              <li key={o.value} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
                <Checkbox
                  id={cid}
                  size="sm"
                  className="mt-0.5"
                  checked={value.includes(o.value)}
                  disabled={o.disabled || disabled}
                  onCheckedChange={(c) => toggle(o.value, c === true)}
                />
                <label htmlFor={cid} className="flex min-w-0 flex-1 cursor-pointer flex-col">
                  <span className="truncate text-sm">{o.label ?? o.value}</span>
                  {o.description ? <span className="text-xs text-muted-foreground">{o.description}</span> : null}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
    );
  }
);
NameCheckboxPicker.displayName = "NameCheckboxPicker";

/* ------------------------------------------------------------------ */
/* AgentJobForm                                                        */
/* ------------------------------------------------------------------ */

export type AgentJobFormErrors = Partial<Record<"name" | "prompt" | "script" | "schedule" | "repeat" | "delivery", string>>;

/** Validation errors for a draft (empty object when valid). */
export function validateAgentJob(draft: AgentJobDraft, status?: Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>): AgentJobFormErrors {
  const errors: AgentJobFormErrors = {};
  if (!draft.name.trim()) errors.name = "Give the job a name";
  if (draft.mode === "agent" && !draft.prompt.trim()) errors.prompt = "Write a prompt for the agent";
  if (draft.mode === "script" && !draft.script?.trim()) errors.script = "Enter a script or command";
  const scheduleError = cronScheduleError(valueToSchedule(draft.schedule));
  if (scheduleError) errors.schedule = scheduleError;
  if (draft.repeat != null && (!Number.isInteger(draft.repeat) || draft.repeat < 1)) errors.repeat = "Repeat at least once, or leave empty for forever";
  const issue = deliveryTargetIssue(draft.delivery, status);
  if (issue) errors.delivery = issue;
  return errors;
}

export interface AgentJobFormProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "defaultValue"> {
  /** Initial draft (uncontrolled). Missing fields get defaults. */
  defaultValue?: Partial<AgentJobDraft>;
  /** Controlled draft. Pair with `onValueChange`. */
  value?: AgentJobDraft;
  /** Called with the next draft on every edit. */
  onValueChange?: (draft: AgentJobDraft) => void;
  /** Called with the valid job draft; may return a promise, and the submit button shows a spinner until it settles. */
  onSubmit?: (job: AgentJobDraft) => void | Promise<void>;
  /** Called when the user presses Cancel; the button is hidden when unset. */
  onCancel?: () => void;
  /** Model options (or replace the select with `modelSlot`). */
  models?: (string | SelectOption)[];
  /** Replaces the model select, for a custom model picker. */
  modelSlot?: React.ReactNode;
  /** Profile options for the profile select; the select is hidden when empty or unset. */
  profiles?: (string | SelectOption)[];
  /** Skills the user can attach to the job, as names or option objects. */
  skills?: (string | NameCheckboxOption)[];
  /** Toolsets the user can enable for the job, as names or option objects. */
  toolsets?: (string | NameCheckboxOption)[];
  /** Delivery state per platform, shown beside the delivery targets. */
  deliveryStatus?: Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>;
  /** Delivery targets to offer; defaults to the built-in platforms. */
  deliveryPlatforms?: DeliveryPlatform[];
  /** Called when the user presses Configure channels next to the delivery targets; the link is hidden when unset. */
  onConfigureChannels?: () => void;
  /** IANA time zone for the schedule preview (for example `Europe/Berlin`); the viewer's zone when unset. */
  timeZone?: string;
  /** Reference time for the schedule preview. */
  now?: Date | number;
  /** Label of the submit button. */
  submitLabel?: React.ReactNode;
}

/** Create or edit a scheduled agent job: prompt or script, schedule, model, profile, skills, toolsets, repeat limit and delivery. */
export const AgentJobForm = React.forwardRef<HTMLFormElement, AgentJobFormProps>(
  (
    {
      defaultValue,
      value,
      onValueChange,
      onSubmit,
      onCancel,
      models,
      modelSlot,
      profiles,
      skills,
      toolsets,
      deliveryStatus,
      deliveryPlatforms,
      onConfigureChannels,
      timeZone,
      now,
      submitLabel,
      className,
      ...props
    },
    ref
  ) => {
    const modelOptions = toSelectOptions(models);
    const profileOptions = toSelectOptions(profiles);
    const [initialDraft] = React.useState<AgentJobDraft>(() => ({
      name: "",
      prompt: "",
      script: "",
      schedule: { kind: "interval", every: 30, unit: "m" },
      model: modelOptions[0]?.value,
      profile: profileOptions[0]?.value,
      skills: [],
      toolsets: [],
      mode: "agent",
      repeat: null,
      delivery: { platform: "local" },
      enabled: true,
      ...defaultValue,
    }));
    const [draft, setDraft] = useControllableState<AgentJobDraft>({ value, defaultValue: initialDraft, onChange: onValueChange });
    const [scheduleValid, setScheduleValid] = React.useState<string | null>(null);
    const [submitted, setSubmitted] = React.useState(false);
    const save = useAsyncAction(async (out: AgentJobDraft) => onSubmit?.(out));
    const nameRef = React.useRef<HTMLInputElement>(null);
    const promptRef = React.useRef<HTMLTextAreaElement>(null);
    const scriptRef = React.useRef<HTMLInputElement>(null);

    const patch = (p: Partial<AgentJobDraft>) => setDraft((d) => ({ ...d, ...p }));
    const errors = validateAgentJob(draft, deliveryStatus);
    if (scheduleValid) errors.schedule = scheduleValid;
    const show = (k: keyof AgentJobFormErrors) => (submitted ? errors[k] : undefined);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitted(true);
      if (Object.keys(errors).length) {
        if (errors.name) nameRef.current?.focus();
        else if (errors.prompt) promptRef.current?.focus();
        else if (errors.script) scriptRef.current?.focus();
        return;
      }
      const out: AgentJobDraft = { ...draft, name: draft.name.trim() };
      if (out.mode === "script") {
        out.skills = [];
        out.toolsets = [];
      }
      await save.run(out);
    };

    const isEdit = !!(value?.id ?? defaultValue?.id);

    return (
      <form ref={ref} data-slot="agent-job-form" noValidate onSubmit={handleSubmit} className={cn("flex flex-col gap-5", className)} {...props}>
        <Field invalid={!!show("name")} required>
          <FieldLabel>Name</FieldLabel>
          <Input ref={nameRef} value={draft.name} placeholder="Morning briefing" onChange={(e) => patch({ name: e.target.value })} />
          <FieldError>{show("name")}</FieldError>
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Runs as
          </span>
          <SegmentedControl
            size="sm"
            aria-label="Job mode"
            value={draft.mode}
            onValueChange={(v) => v && patch({ mode: v as AgentJobMode })}
            className="self-start max-w-full overflow-x-auto scrollbar-none"
            options={[
              { value: "agent", label: "Agent" },
              { value: "script", label: "Script" },
            ]}
          />
          <p className="text-xs text-muted-foreground">
            {draft.mode === "agent" ? "The agent runs the prompt with the model, skills and toolsets below." : "Script (no agent — deliver stdout as-is)."}
          </p>
        </div>

        {draft.mode === "agent" ? (
          <Field invalid={!!show("prompt")} required>
            <FieldLabel>Prompt</FieldLabel>
            <Textarea
              ref={promptRef}
              value={draft.prompt}
              autoResize
              minRows={3}
              maxRows={10}
              placeholder="Summarise my unread email and today's calendar…"
              onChange={(e) => patch({ prompt: e.target.value })}
            />
            <FieldError>{show("prompt")}</FieldError>
          </Field>
        ) : (
          <Field invalid={!!show("script")} required>
            <FieldLabel>Script</FieldLabel>
            <Input ref={scriptRef} value={draft.script ?? ""} className="font-mono" placeholder="~/bin/backup.sh --quiet" onChange={(e) => patch({ script: e.target.value })} />
            <FieldDescription>Its stdout is delivered as-is; no model is called.</FieldDescription>
            <FieldError>{show("script")}</FieldError>
          </Field>
        )}

        <div className="flex flex-col gap-1.5">
          <CronScheduleField
            defaultValue={draft.schedule}
            timeZone={timeZone}
            now={now}
            onValueChange={(v, d) => {
              setScheduleValid(d.error);
              if (v) patch({ schedule: v });
            }}
          />
          {show("schedule") ? (
            <p role="alert" className="text-sm text-destructive">
              {show("schedule")}
            </p>
          ) : null}
        </div>

        {draft.mode === "agent" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {modelSlot ?? (modelOptions.length ? (
              <Field>
                <FieldLabel>Model</FieldLabel>
                <SimpleSelect options={modelOptions} value={draft.model} onValueChange={(v) => patch({ model: v })} />
              </Field>
            ) : null)}
            {profileOptions.length ? (
              <Field>
                <FieldLabel>Profile</FieldLabel>
                <SimpleSelect options={profileOptions} value={draft.profile} onValueChange={(v) => patch({ profile: v })} />
              </Field>
            ) : null}
          </div>
        ) : null}

        {draft.mode === "agent" && (skills?.length || toolsets?.length) ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {skills?.length ? <NameCheckboxPicker label="Skills" options={skills} value={draft.skills} onValueChange={(v) => patch({ skills: v })} /> : null}
            {toolsets?.length ? <NameCheckboxPicker label="Toolsets" options={toolsets} value={draft.toolsets} onValueChange={(v) => patch({ toolsets: v })} /> : null}
          </div>
        ) : null}

        <Field invalid={!!show("repeat")}>
          <FieldLabel>Repeat limit</FieldLabel>
          <NumberInput
            min={1}
            value={draft.repeat}
            placeholder="∞"
            onValueChange={(v) => patch({ repeat: v })}
            wrapperClassName="w-40"
          />
          <FieldDescription>{draft.repeat == null ? "Runs forever. Enter a number to stop after that many runs." : `Stops after ${draft.repeat} ${draft.repeat === 1 ? "run" : "runs"}.`}</FieldDescription>
          <FieldError>{show("repeat")}</FieldError>
        </Field>

        <DeliveryTargetPicker
          value={draft.delivery}
          onValueChange={(v) => patch({ delivery: v })}
          status={deliveryStatus}
          platforms={deliveryPlatforms}
          onConfigureChannels={onConfigureChannels}
        />

        <SwitchField label="Enabled" description="Paused jobs keep their schedule but don't run." checked={draft.enabled} onCheckedChange={(c) => patch({ enabled: c })} />

        {submitted && Object.keys(errors).length ? (
          <p role="alert" className="text-sm text-destructive">
            Fix {Object.keys(errors).length === 1 ? "the highlighted field" : `${Object.keys(errors).length} fields`} to continue.
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" loading={save.busy}>
            {submitLabel ?? (isEdit ? "Save changes" : "Create job")}
          </Button>
        </div>
      </form>
    );
  }
);
AgentJobForm.displayName = "AgentJobForm";
