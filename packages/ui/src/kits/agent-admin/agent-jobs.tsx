import * as React from "react";
import {
  type RemixiconComponentType,
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiDeleteBinLine,
  RiDiscordFill,
  RiEditLine,
  RiErrorWarningLine,
  RiExternalLinkLine,
  RiFileTextLine,
  RiGithubFill,
  RiInboxLine,
  RiMailLine,
  RiPauseLine,
  RiPlayLine,
  RiSkipForwardLine,
  RiSlackFill,
  RiTelegramFill,
  RiTimeLine,
  RiWebhookLine,
  RiWhatsappFill,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useAsyncAction } from "../../hooks/use-async-action";
import { formatCost } from "../../lib/format";
import { formatDateTime, safeISO, toMs as toValidMs } from "../../lib/time";
import { toneClasses, type Tone } from "../../lib/tone";
import { normalizeTaskStatus, taskStatusTone, type TaskStatus, type TaskStatusInput } from "../../lib/status";
import { CopyButton } from "../../primitives/copy-button";
import { Button } from "../../primitives/button";
import { Spinner } from "../../primitives/spinner";
import { Badge } from "../../primitives/badge";
import { StatusBadge } from "../../primitives/status-badge";
import { Input, SearchInput } from "../../primitives/input";
import { Textarea } from "../../primitives/textarea";
import { Checkbox } from "../../primitives/checkbox";
import { SwitchField } from "../../primitives/switch";
import { NumberInput } from "../../primitives/number-input";
import { SimpleSelect, type SelectOption } from "../../primitives/select";
import { SegmentedControl } from "../../primitives/segmented-control";
import { ConfirmDialog } from "../../primitives/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "../../primitives/field";
import { KeyValueList, type KeyValueItem } from "../../primitives/key-value";
import { TimelineBar, formatTimelineDuration, type TimelineSpan } from "../../patterns/timeline-bar";
import { formatTokenCount } from "../../lib/token-count";
import {
  CronScheduleField,
  cronScheduleError,
  describeSchedule,
  formatCountdownClock,
  formatScheduleRelative,
  nextScheduleRuns,
  toScheduleString,
  useScheduleNow,
  valueToSchedule,
  type CronScheduleValue,
} from "../../patterns/cron";

type TimeLike = Date | number | string;

const toMs = (t: TimeLike) => toValidMs(t) ?? NaN;

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type AgentJobState = "scheduled" | "running" | "paused" | "error" | "completed" | "disabled";
export type AgentJobMode = "agent" | "script";
export type AgentJobRunStatus = "success" | "error" | "running" | "cancelled";
/** Run statuses accepted on input: the legacy `AgentJobRunStatus` values plus canonical `TaskStatus` names. */
export type AgentJobRunStatusInput = AgentJobRunStatus | TaskStatusInput;
export type AgentJobTrigger = "schedule" | "manual" | "webhook";

export type DeliveryPlatform = "local" | "telegram" | "discord" | "slack" | "whatsapp" | "email" | "github" | "webhook";

export interface DeliveryTarget {
  platform: DeliveryPlatform;
  /** Channel id, chat id, address, issue ref or URL. Empty means "the platform's home channel". */
  destination?: string;
}

export interface DeliveryPlatformStatus {
  /** `false` disables the option ("Not connected"). Default true. */
  configured?: boolean;
  /** Default destination used when none is entered. */
  homeChannel?: string;
  /** Disable the option with this reason. */
  disabledReason?: string;
}

/** Everything the job form edits. */
export interface AgentJobDraft {
  id?: string;
  name: string;
  prompt: string;
  /** Script mode: the command whose stdout is delivered as-is. */
  script?: string;
  schedule: CronScheduleValue;
  model?: string;
  profile?: string;
  skills: string[];
  toolsets: string[];
  mode: AgentJobMode;
  /** Stop after this many runs; `null` = forever. */
  repeat: number | null;
  delivery: DeliveryTarget;
  enabled: boolean;
}

export interface AgentJob extends AgentJobDraft {
  id: string;
  state?: AgentJobState;
  nextRunAt?: TimeLike | null;
  lastRunAt?: TimeLike | null;
  lastStatus?: AgentJobRunStatusInput;
  /** Runs completed so far (shown against `repeat`). */
  runCount?: number;
}

export interface AgentJobRun {
  id: string;
  startedAt: TimeLike;
  durationMs?: number;
  status: AgentJobRunStatusInput;
  trigger?: AgentJobTrigger;
  costUsd?: number;
  tokens?: number;
  error?: string;
}

/** Effective state: explicit `state`, otherwise inferred from `enabled`. */
export function agentJobState(job: Pick<AgentJob, "state" | "enabled">): AgentJobState {
  return job.state ?? (job.enabled === false ? "disabled" : "scheduled");
}

/* ------------------------------------------------------------------ */
/* JobStatePill                                                        */
/* ------------------------------------------------------------------ */

const stateMeta: Record<AgentJobState, { label: string; tone: Tone }> = {
  scheduled: { label: "Scheduled", tone: "info" },
  running: { label: "Running", tone: "primary" },
  paused: { label: "Paused", tone: "warning" },
  error: { label: "Error", tone: "destructive" },
  completed: { label: "Completed", tone: "success" },
  disabled: { label: "Disabled", tone: "neutral" },
};

export interface JobStatePillProps extends React.HTMLAttributes<HTMLSpanElement> {
  state: AgentJobState;
  label?: React.ReactNode;
  size?: "sm" | "md";
}

/** Pill for a scheduled job's state (a StatusBadge preset); `running` shows a spinner. */
export const JobStatePill = React.forwardRef<HTMLSpanElement, JobStatePillProps>(
  ({ state, label, size = "md", ...props }, ref) => {
    const meta = stateMeta[state];
    return (
      <StatusBadge
        ref={ref}
        data-state={state}
        tone={meta.tone}
        icon={state === "running" ? "spinner" : "dot"}
        size={size}
        label={label ?? meta.label}
        {...props}
      />
    );
  }
);
JobStatePill.displayName = "JobStatePill";

/* ------------------------------------------------------------------ */
/* Delivery targets                                                    */
/* ------------------------------------------------------------------ */

interface PlatformMeta {
  label: string;
  icon: RemixiconComponentType;
  tint: string;
  field?: { label: string; placeholder: string; type?: string };
  /** Has a "home channel" fallback. */
  home: boolean;
}

export const deliveryPlatformMeta: Record<DeliveryPlatform, PlatformMeta> = {
  local: { label: "Inbox", icon: RiInboxLine, tint: "bg-muted text-foreground", home: false },
  telegram: { label: "Telegram", icon: RiTelegramFill, tint: "bg-sky-500/15 text-sky-600 dark:text-sky-400", field: { label: "Chat ID", placeholder: "-1001234567890" }, home: true },
  discord: { label: "Discord", icon: RiDiscordFill, tint: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400", field: { label: "Channel ID", placeholder: "112233445566778899" }, home: true },
  slack: { label: "Slack", icon: RiSlackFill, tint: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400", field: { label: "Channel", placeholder: "#general" }, home: true },
  whatsapp: { label: "WhatsApp", icon: RiWhatsappFill, tint: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", field: { label: "Phone number", placeholder: "+15551234567", type: "tel" }, home: true },
  email: { label: "Email", icon: RiMailLine, tint: "bg-amber-500/15 text-amber-700 dark:text-amber-400", field: { label: "Email address", placeholder: "me@example.com", type: "email" }, home: true },
  github: { label: "GitHub comment", icon: RiGithubFill, tint: "bg-muted text-foreground", field: { label: "Issue or PR", placeholder: "owner/repo#123" }, home: true },
  webhook: { label: "Webhook", icon: RiWebhookLine, tint: "bg-rose-500/15 text-rose-700 dark:text-rose-400", field: { label: "URL", placeholder: "https://example.com/hook", type: "url" }, home: false },
};

const ALL_PLATFORMS: DeliveryPlatform[] = ["local", "telegram", "discord", "slack", "whatsapp", "email", "github", "webhook"];

export interface DeliveryPlatformIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  platform: DeliveryPlatform;
  size?: "sm" | "md";
}

/** Tinted platform glyph (decorative). */
export const DeliveryPlatformIcon = React.forwardRef<HTMLSpanElement, DeliveryPlatformIconProps>(function DeliveryPlatformIcon(
  { platform, size = "md", className, ...props },
  ref
) {
  const meta = deliveryPlatformMeta[platform];
  const Icon = meta.icon;
  return (
    <span
      ref={ref}
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-md", size === "sm" ? "size-5 [&_svg]:size-3" : "size-7 [&_svg]:size-4", meta.tint, className)}
      {...props}
    >
      <Icon />
    </span>
  );
});
DeliveryPlatformIcon.displayName = "DeliveryPlatformIcon";

/** Why a target can't deliver yet, or `null`. */
export function deliveryTargetIssue(target: DeliveryTarget, status?: Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>): string | null {
  const meta = deliveryPlatformMeta[target.platform];
  const s = status?.[target.platform];
  if (s?.disabledReason) return s.disabledReason;
  if (s?.configured === false) return `${meta.label} is not connected`;
  if (!meta.field || target.destination?.trim()) return null;
  if (meta.home && !s?.homeChannel) return "Needs a home channel — set one in Channels";
  if (!meta.home) return `Enter a ${meta.field.label.toLowerCase()}`;
  return null;
}

/** Human label for a target, e.g. "Slack · #ops" or "Telegram (home channel)". */
export function formatDeliveryTarget(target: DeliveryTarget, status?: Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>) {
  const meta = deliveryPlatformMeta[target.platform];
  if (!meta.field) return meta.label;
  const dest = target.destination?.trim() || status?.[target.platform]?.homeChannel;
  return dest ? `${meta.label} · ${dest}` : `${meta.label} (home channel)`;
}

export interface DeliveryTargetPickerProps extends Omit<React.HTMLAttributes<HTMLFieldSetElement>, "defaultValue" | "onChange"> {
  value?: DeliveryTarget;
  defaultValue?: DeliveryTarget;
  onValueChange?: (value: DeliveryTarget) => void;
  /** Platforms offered, in order. */
  platforms?: DeliveryPlatform[];
  /** Per-platform connection state and home channel. */
  status?: Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>;
  /** Shows a "Channels" button in the home-channel warning. */
  onConfigureChannels?: () => void;
  legend?: React.ReactNode;
  disabled?: boolean;
}

/** Where a job's results go: the local inbox, a messaging platform, an email, a GitHub comment or a webhook. */
export const DeliveryTargetPicker = React.forwardRef<HTMLFieldSetElement, DeliveryTargetPickerProps>(
  (
    { value: valueProp, defaultValue = { platform: "local" }, onValueChange, platforms = ALL_PLATFORMS, status, onConfigureChannels, legend = "Deliver to", disabled, className, ...props },
    ref
  ) => {
    const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
    const id = React.useId();
    const meta = deliveryPlatformMeta[value.platform];
    const s = status?.[value.platform];
    const issue = deliveryTargetIssue(value, status);
    const destId = `${id}-dest`;
    const warnId = `${id}-warn`;

    return (
      <fieldset ref={ref} disabled={disabled} className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
        <legend className="mb-2 text-sm font-medium text-foreground">{legend}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {platforms.map((p) => {
            const pm = deliveryPlatformMeta[p];
            const ps = status?.[p];
            const reason = ps?.disabledReason ?? (ps?.configured === false ? "Not connected" : undefined);
            const checked = value.platform === p;
            return (
              <label
                key={p}
                className={cn(
                  "relative flex min-w-0 cursor-pointer items-center gap-2 rounded-box border bg-background p-2 text-sm transition-colors",
                  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1 has-[:focus-visible]:ring-offset-background",
                  checked ? "border-primary bg-primary-soft/40" : "border-border hover:bg-accent",
                  reason && "cursor-not-allowed opacity-60 hover:bg-background"
                )}
              >
                <input
                  type="radio"
                  name={`${id}-platform`}
                  value={p}
                  checked={checked}
                  disabled={!!reason || disabled}
                  aria-describedby={reason ? `${id}-${p}-reason` : undefined}
                  onChange={() => setValue({ platform: p, destination: p === value.platform ? value.destination : "" })}
                  className="sr-only"
                />
                <DeliveryPlatformIcon platform={p} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{pm.label}</span>
                  {reason ? (
                    <span id={`${id}-${p}-reason`} className="truncate text-2xs text-muted-foreground">
                      {reason}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
        {meta.field ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={destId} className="text-sm font-medium">
              {meta.field.label}
              {meta.home ? <span className="font-normal text-muted-foreground"> (optional)</span> : null}
            </label>
            <Input
              id={destId}
              size="sm"
              type={meta.field.type ?? "text"}
              value={value.destination ?? ""}
              placeholder={s?.homeChannel ? `Home channel: ${s.homeChannel}` : meta.field.placeholder}
              aria-describedby={issue ? warnId : undefined}
              onChange={(e) => setValue({ ...value, destination: e.target.value })}
            />
          </div>
        ) : null}
        {issue ? (
          <div id={warnId} role="status" className="flex items-start gap-2 rounded-box bg-warning-soft p-2.5 text-sm text-warning-soft-foreground">
            <RiErrorWarningLine aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span className="flex-1">{issue}</span>
            {onConfigureChannels && issue.includes("Channels") ? (
              <Button type="button" size="xs" variant="outline" onClick={onConfigureChannels}>
                Channels
              </Button>
            ) : null}
          </div>
        ) : null}
      </fieldset>
    );
  }
);
DeliveryTargetPicker.displayName = "DeliveryTargetPicker";

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
  options: (string | NameCheckboxOption)[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Show the search box. Default: when there are more than 6 options. */
  searchable?: boolean;
  /** Shown when the search matches nothing. Default "No matches". */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  emptyText?: React.ReactNode;
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
      <fieldset ref={ref} disabled={disabled} className={cn("flex min-w-0 flex-col gap-2", className)} {...props}>
        <legend className="mb-2 flex w-full items-center justify-between gap-2 text-sm font-medium text-foreground">
          <span>{label}</span>
        </legend>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span aria-live="polite">
            {value.length} of {all.length} selected
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

const toSelectOptions = (opts?: (string | SelectOption)[]): SelectOption[] => (opts ?? []).map((o) => (typeof o === "string" ? { value: o, label: o } : o));

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
  onSubmit?: (job: AgentJobDraft) => void | Promise<void>;
  onCancel?: () => void;
  /** Model options (or replace the select with `modelSlot`). */
  models?: (string | SelectOption)[];
  modelSlot?: React.ReactNode;
  profiles?: (string | SelectOption)[];
  skills?: (string | NameCheckboxOption)[];
  toolsets?: (string | NameCheckboxOption)[];
  deliveryStatus?: Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>;
  deliveryPlatforms?: DeliveryPlatform[];
  onConfigureChannels?: () => void;
  timeZone?: string;
  /** Reference time for the schedule preview. */
  now?: Date | number;
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
      <form ref={ref} noValidate onSubmit={handleSubmit} className={cn("flex flex-col gap-5", className)} {...props}>
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
            className="self-start"
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
          <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="grid gap-4 sm:grid-cols-2">
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

/* ------------------------------------------------------------------ */
/* JobRow / JobList                                                    */
/* ------------------------------------------------------------------ */

const runStatusLabel: Record<TaskStatus, string> = {
  pending: "Pending",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  canceled: "Canceled",
};

const runStatusOf = (status: AgentJobRunStatusInput) => normalizeTaskStatus(status);

function RunStatusGlyph({ status: statusInput }: { status: AgentJobRunStatusInput }) {
  const status = runStatusOf(statusInput);
  const label = runStatusLabel[status];
  const className = toneClasses.text[taskStatusTone[status]];
  if (status === "running") return <Spinner size="xs" label={label} className={className} />;
  const Icon = status === "succeeded" ? RiCheckboxCircleFill : RiCloseCircleFill;
  return (
    <span className={cn("inline-flex", className)}>
      <Icon aria-hidden className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export interface JobNextRunProps extends Omit<React.TimeHTMLAttributes<HTMLTimeElement>, "children"> {
  at: TimeLike;
}

/** "in 12:34" under an hour (live), otherwise "in 3h". */
export const JobNextRun = React.forwardRef<HTMLTimeElement, JobNextRunProps>(function JobNextRun({ at, className, ...props }, ref) {
  const target = toMs(at);
  const soon = target - Date.now() < 3_600_000;
  const now = useScheduleNow(true, soon ? 1000 : 30_000);
  const diff = target - now;
  const text = diff <= 0 ? "due now" : diff < 3_600_000 ? `in ${formatCountdownClock(diff)}` : formatScheduleRelative(target, now);
  return (
    <time ref={ref} dateTime={safeISO(target)} data-slot="job-next-run" className={cn("tabular-nums", className)} {...props}>
      {text}
    </time>
  );
});
JobNextRun.displayName = "JobNextRun";

export interface JobRowActions {
  onPause?: (job: AgentJob) => void;
  onResume?: (job: AgentJob) => void;
  onRunNow?: (job: AgentJob) => void;
  onEdit?: (job: AgentJob) => void;
  /** Called after the user confirms. */
  onDelete?: (job: AgentJob) => void | Promise<void>;
}

export interface JobRowProps extends Omit<React.HTMLAttributes<HTMLLIElement>, "onSelect" | "onPause">, JobRowActions {
  job: AgentJob;
  selected?: boolean;
  onSelect?: (job: AgentJob) => void;
  /** Label for the model id. */
  modelLabel?: React.ReactNode;
}

function JobActionButtons({ job, onPause, onResume, onRunNow, onEdit, onDelete, compact }: JobRowActions & { job: AgentJob; compact?: boolean }) {
  const state = agentJobState(job);
  const paused = state === "paused" || state === "disabled";
  const size = compact ? "icon-sm" : "sm";
  const btn = (label: string, icon: React.ReactNode, onClick: () => void, text: string) =>
    compact ? (
      <Button type="button" variant="ghost" size={size} aria-label={label} title={text} onClick={onClick}>
        {icon}
      </Button>
    ) : (
      <Button type="button" variant="outline" size={size} leadingIcon={icon} aria-label={label} onClick={onClick}>
        {text}
      </Button>
    );
  return (
    <div className="flex shrink-0 items-center gap-1">
      {paused && onResume ? btn(`Resume ${job.name}`, <RiPlayLine aria-hidden />, () => onResume(job), "Resume") : null}
      {!paused && onPause ? btn(`Pause ${job.name}`, <RiPauseLine aria-hidden />, () => onPause(job), "Pause") : null}
      {onRunNow ? btn(`Run ${job.name} now`, <RiSkipForwardLine aria-hidden />, () => onRunNow(job), "Run now") : null}
      {onEdit ? btn(`Edit ${job.name}`, <RiEditLine aria-hidden />, () => onEdit(job), "Edit") : null}
      {onDelete ? (
        <ConfirmDialog
          tone="destructive"
          title={`Delete “${job.name}”?`}
          description="The job and its schedule are removed. Past run history is kept."
          confirmLabel="Delete job"
          onConfirm={() => onDelete(job)}
          trigger={
            compact ? (
              <Button type="button" variant="ghost" size={size} aria-label={`Delete ${job.name}`} title="Delete">
                <RiDeleteBinLine aria-hidden />
              </Button>
            ) : (
              <Button type="button" variant="destructive-soft" size={size} leadingIcon={<RiDeleteBinLine aria-hidden />} aria-label={`Delete ${job.name}`}>
                Delete
              </Button>
            )
          }
        />
      ) : null}
    </div>
  );
}

/** One scheduled job: name, schedule, state, next/last run, model and mode, with row actions. */
export const JobRow = React.forwardRef<HTMLLIElement, JobRowProps>(
  ({ job, selected, onSelect, modelLabel, onPause, onResume, onRunNow, onEdit, onDelete, className, ...props }, ref) => {
    const state = agentJobState(job);
    const showNext = job.nextRunAt != null && (state === "scheduled" || state === "running" || state === "error");
    return (
      <li
        ref={ref}
        data-selected={selected || undefined}
        className={cn(
          "group flex items-center gap-3 rounded-box border border-transparent px-3 py-2.5 transition-colors",
          selected ? "border-border bg-accent" : "hover:bg-accent/60",
          className
        )}
        {...props}
      >
        <button
          type="button"
          aria-pressed={onSelect ? !!selected : undefined}
          onClick={() => onSelect?.(job)}
          className={cn("flex min-w-0 flex-1 flex-col items-start gap-1 rounded-md text-left", focusRing)}
        >
          <span className="flex w-full min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{job.name}</span>
            <JobStatePill state={state} size="sm" />
            {job.mode === "script" ? (
              <Badge size="sm" color="gray">
                Script
              </Badge>
            ) : null}
          </span>
          <span className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <RiTimeLine aria-hidden className="size-3.5" />
              {describeSchedule(job.schedule)}
            </span>
            {showNext ? (
              <span>
                Next <JobNextRun at={job.nextRunAt!} />
              </span>
            ) : null}
            {job.lastRunAt != null ? (
              <span className="inline-flex items-center gap-1">
                {job.lastStatus ? <RunStatusGlyph status={job.lastStatus} /> : null}
                Last {formatScheduleRelative(job.lastRunAt)}
              </span>
            ) : null}
            {job.mode === "agent" && (modelLabel ?? job.model) ? <span className="truncate">{modelLabel ?? job.model}</span> : null}
          </span>
        </button>
        <JobActionButtons compact job={job} onPause={onPause} onResume={onResume} onRunNow={onRunNow} onEdit={onEdit} onDelete={onDelete} />
      </li>
    );
  }
);
JobRow.displayName = "JobRow";

export interface JobListProps extends Omit<React.HTMLAttributes<HTMLUListElement>, "onSelect" | "onPause">, JobRowActions {
  jobs: AgentJob[];
  selectedId?: string | null;
  onSelect?: (job: AgentJob) => void;
  /** Map model ids to labels. */
  modelLabels?: Record<string, React.ReactNode>;
  /** Shown when there are no jobs. Default "No scheduled jobs yet". */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  empty?: React.ReactNode;
}

/** Master list of scheduled jobs. */
export const JobList = React.forwardRef<HTMLUListElement, JobListProps>(
  ({ jobs, selectedId, onSelect, modelLabels, emptyState, empty, onPause, onResume, onRunNow, onEdit, onDelete, className, ...props }, ref) => {
    if (!jobs.length) {
      return <div className="rounded-box border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{emptyState ?? empty ?? "No scheduled jobs yet"}</div>;
    }
    return (
      <ul ref={ref} aria-label="Scheduled jobs" className={cn("flex flex-col gap-1", className)} {...props}>
        {jobs.map((job) => (
          <JobRow
            key={job.id}
            job={job}
            selected={selectedId === job.id}
            onSelect={onSelect}
            modelLabel={job.model ? modelLabels?.[job.model] : undefined}
            onPause={onPause}
            onResume={onResume}
            onRunNow={onRunNow}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>
    );
  }
);
JobList.displayName = "JobList";

/* ------------------------------------------------------------------ */
/* RunHistory                                                          */
/* ------------------------------------------------------------------ */

const usd = (n: number) => formatCost(n, { locale: "en-US" });

export interface RunHistoryProps extends React.HTMLAttributes<HTMLDivElement> {
  runs: AgentJobRun[];
  /** Runs revealed per "Load more". Default 5. */
  pageSize?: number;
  /** More runs exist on the server; "Load more" calls `onLoadMore` once local runs are exhausted. */
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  onOpenTranscript?: (run: AgentJobRun) => void;
  locale?: string;
  /** Shown when there are no runs. Default "No runs yet". */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  empty?: React.ReactNode;
}

/** Past runs of a job: start, duration, status, cost/tokens, trigger, error snippet and a transcript link. */
export const RunHistory = React.forwardRef<HTMLDivElement, RunHistoryProps>(
  ({ runs, pageSize = 5, hasMore, onLoadMore, loadingMore, onOpenTranscript, locale, emptyState, empty, className, ...props }, ref) => {
    const [shown, setShown] = React.useState(pageSize);
    const visible = runs.slice(0, shown);
    const localMore = runs.length > shown;
    const formatStart = (t: number) => formatDateTime(t, { locale: locale ?? "en-US", year: "never" });
    const loadMore = () => {
      if (localMore) setShown((s) => s + pageSize);
      else {
        setShown((s) => s + pageSize);
        onLoadMore?.();
      }
    };
    return (
      <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props}>
        {!runs.length ? <p className="py-4 text-center text-sm text-muted-foreground">{emptyState ?? empty ?? "No runs yet"}</p> : null}
        {runs.length ? (
          <ol aria-label="Run history" className="flex flex-col divide-y divide-border rounded-box border border-border">
            {visible.map((run) => {
              const started = toMs(run.startedAt);
              return (
                <li key={run.id} className="flex flex-col gap-1.5 px-3 py-2.5 text-sm">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1.5">
                      <RunStatusGlyph status={run.status} />
                      <time dateTime={safeISO(started)} className="font-medium tabular-nums">
                        {formatStart(started)}
                      </time>
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{run.durationMs != null ? formatTimelineDuration(run.durationMs) : runStatusOf(run.status) === "running" ? "running…" : "—"}</span>
                    {run.trigger ? (
                      <Badge size="sm" color={run.trigger === "manual" ? "purple" : run.trigger === "webhook" ? "orange" : "gray"}>
                        {run.trigger === "schedule" ? "Scheduled" : run.trigger === "manual" ? "Manual" : "Webhook"}
                      </Badge>
                    ) : null}
                    {run.costUsd != null || run.tokens != null ? (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {[run.costUsd != null ? usd(run.costUsd) : null, run.tokens != null ? `${formatTokenCount(run.tokens)} tokens` : null].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                    {onOpenTranscript ? (
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        className="ml-auto"
                        leadingIcon={<RiFileTextLine aria-hidden />}
                        aria-label={`Open transcript for run at ${formatStart(started)}`}
                        onClick={() => onOpenTranscript(run)}
                      >
                        Transcript
                      </Button>
                    ) : null}
                  </div>
                  {run.error ? <p className="line-clamp-2 rounded-md bg-destructive-soft px-2 py-1 font-mono text-xs text-destructive-soft-foreground">{run.error}</p> : null}
                </li>
              );
            })}
          </ol>
        ) : null}
        {localMore || hasMore ? (
          <Button type="button" variant="ghost" size="sm" className="self-center" loading={loadingMore} onClick={loadMore}>
            Load more
          </Button>
        ) : null}
      </div>
    );
  }
);
RunHistory.displayName = "RunHistory";

/* ------------------------------------------------------------------ */
/* JobDetail                                                           */
/* ------------------------------------------------------------------ */

export interface JobDetailProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onPause">, JobRowActions {
  job: AgentJob;
  runs?: AgentJobRun[];
  hasMoreRuns?: boolean;
  onLoadMoreRuns?: () => void;
  loadingMoreRuns?: boolean;
  onOpenTranscript?: (run: AgentJobRun) => void;
  /** Show a timeline of recent runs. */
  showTimeline?: boolean;
  timeZone?: string;
  now?: Date | number;
  modelLabel?: React.ReactNode;
  deliveryStatus?: Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>;
  runsPageSize?: number;
}

/** Detail pane for one job: actions, schedule and next runs, configuration and run history. */
export const JobDetail = React.forwardRef<HTMLDivElement, JobDetailProps>(
  (
    {
      job,
      runs = [],
      hasMoreRuns,
      onLoadMoreRuns,
      loadingMoreRuns,
      onOpenTranscript,
      showTimeline,
      timeZone,
      now,
      modelLabel,
      deliveryStatus,
      runsPageSize,
      onPause,
      onResume,
      onRunNow,
      onEdit,
      onDelete,
      className,
      ...props
    },
    ref
  ) => {
    const state = agentJobState(job);
    const headingId = React.useId();
    const ref0 = now ?? Date.now();
    const upcoming = state === "paused" || state === "disabled" || state === "completed" ? [] : nextScheduleRuns(job.schedule, ref0, 3, { timeZone });
    const fmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone });

    const items: KeyValueItem[] = [
      { label: "Mode", value: job.mode === "script" ? "Script (no agent)" : "Agent" },
      ...(job.mode === "agent"
        ? [
            { label: "Model", value: modelLabel ?? job.model },
            { label: "Profile", value: job.profile },
            { label: "Skills", value: job.skills.length ? job.skills.join(", ") : undefined },
            { label: "Toolsets", value: job.toolsets.length ? job.toolsets.join(", ") : undefined },
          ]
        : [{ label: "Script", value: job.script, mono: true, copyable: true }]),
      { label: "Schedule", value: toScheduleString(job.schedule), mono: true, copyable: true },
      { label: "Repeat", value: job.repeat == null ? "Forever" : `${job.runCount ?? 0} of ${job.repeat} runs` },
      { label: "Delivers to", value: formatDeliveryTarget(job.delivery, deliveryStatus) },
      { label: "Enabled", value: job.enabled ? "Yes" : "No" },
    ];

    const spans: TimelineSpan[] = runs.slice(0, 30).map((r) => ({
      id: r.id,
      start: r.startedAt,
      end: r.durationMs != null ? toMs(r.startedAt) + r.durationMs : null,
      live: runStatusOf(r.status) === "running",
      tone: taskStatusTone[runStatusOf(r.status)],
      label: runStatusLabel[runStatusOf(r.status)],
    }));
    const windowStart = spans.length ? Math.min(...spans.map((s) => toMs(s.start))) : toMs(ref0) - 86_400_000;

    return (
      <section ref={ref} aria-labelledby={headingId} className={cn("flex min-w-0 flex-col gap-6", className)} {...props}>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 id={headingId} className="truncate text-lg font-semibold text-foreground">
                {job.name}
              </h2>
              <JobStatePill state={state} />
            </div>
            {job.mode === "agent" && job.prompt ? <p className="line-clamp-2 text-sm text-muted-foreground">{job.prompt}</p> : null}
          </div>
          <JobActionButtons job={job} onPause={onPause} onResume={onResume} onRunNow={onRunNow} onEdit={onEdit} onDelete={onDelete} />
        </header>

        <div className="flex flex-col gap-2 rounded-box border border-border bg-subtle p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <RiTimeLine aria-hidden className="size-4 text-muted-foreground" />
            {describeSchedule(job.schedule)}
          </p>
          {upcoming.length ? (
            <ol aria-label="Next runs" className="flex flex-col gap-0.5 text-sm">
              {upcoming.map((d) => (
                <li key={d.getTime()} className="flex justify-between gap-2 tabular-nums">
                  <time dateTime={d.toISOString()}>{fmt.format(d)}</time>
                  <span className="text-xs text-muted-foreground">{formatScheduleRelative(d, ref0)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-muted-foreground">{state === "paused" ? "Paused — no upcoming runs" : "No upcoming runs"}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Configuration</h3>
          <KeyValueList items={items} />
        </div>

        {showTimeline && spans.length ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Recent runs</h3>
            <TimelineBar from={windowStart} to={ref0} now={ref0} spans={spans} label={`Recent runs of ${job.name}`} />
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Run history</h3>
          <RunHistory runs={runs} pageSize={runsPageSize} hasMore={hasMoreRuns} onLoadMore={onLoadMoreRuns} loadingMore={loadingMoreRuns} onOpenTranscript={onOpenTranscript} />
        </div>
      </section>
    );
  }
);
JobDetail.displayName = "JobDetail";

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

/** Replace `{key}` placeholders with values (unknown keys are left as-is). */
export function fillBlueprintTemplate(template: string, values: Record<string, BlueprintSlotValue | undefined>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => {
    const v = values[key];
    return v == null || v === "" ? m : String(v);
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
    const command = blueprint.cliCommand ? fillBlueprintTemplate(blueprint.cliCommand, { ...values, schedule: blueprint.schedule, title: blueprint.title, id: blueprint.id }) : null;

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
              <Button type="button" size="sm" variant="secondary" className="self-start" aria-expanded={false} aria-controls={formId} onClick={() => setExpanded(true)}>
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
