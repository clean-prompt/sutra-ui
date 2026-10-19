import * as React from "react";
import {
  RiAddLine,
  RiCpuLine,
  RiDeleteBinLine,
  RiDownload2Line,
  RiGlobalLine,
  RiInstanceLine,
  RiLineChartLine,
  RiNotification3Line,
  RiNotificationOffLine,
  RiPencilLine,
  RiRamLine,
  RiTempHotLine,
  RiUpload2Line,
  type RemixiconComponentType,
} from "@remixicon/react";
import { cn } from "../../lib/cn";
import { accentClasses, accentStyle, type Accent } from "../../lib/accent";
import { pluralize } from "../../lib/format";
import {
  ALERT_METRICS,
  ALERT_METRIC_ORDER,
  ALERT_RULE_PRESETS,
  ALERT_WINDOW_PRESETS,
  alertThresholdRange,
  changeAlertMetric,
  createAlertRule,
  describeAlertRule,
  describeAlertScope,
  formatAlertWindow,
  fromDisplayThreshold,
  newAlertRuleId,
  toDisplayThreshold,
  validateAlertRule,
  type AlertMetric,
  type AlertRule,
  type AlertRuleErrors,
  type AlertRuleField,
  type AlertRulePreset,
  type AlertScope,
  type AlertTemperatureUnit,
} from "../../lib/alert-rules";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { Chip, ChipGroup } from "../../primitives/chip";
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../primitives/dialog";
import { EmptyState } from "../../primitives/empty-state";
import { Field, FieldError, FieldLabel } from "../../primitives/field";
import { Input } from "../../primitives/input";
import { Monogram } from "../../primitives/monogram";
import { NumberInput } from "../../primitives/number-input";
import { Skeleton } from "../../primitives/progress";
import { SegmentedControl } from "../../primitives/segmented-control";
import { SimpleSelect } from "../../primitives/select";
import { StatusBadge } from "../../primitives/status-badge";
import { Switch } from "../../primitives/switch";

export {
  ALERT_METRICS,
  ALERT_METRIC_ORDER,
  ALERT_RULE_PRESETS,
  ALERT_WINDOW_PRESETS,
  createAlertRule,
  describeAlertRule,
  evaluateAlertRule,
  validateAlertRule,
  type AlertAggregate,
  type AlertComparator,
  type AlertEvaluation,
  type AlertMetric,
  type AlertMetricInfo,
  type AlertRule,
  type AlertRuleErrors,
  type AlertRulePreset,
  type AlertSample,
  type AlertScope,
  type AlertTemperatureUnit,
} from "../../lib/alert-rules";

const METRIC_ICONS: Record<AlertMetric, RemixiconComponentType> = {
  cpu: RiCpuLine,
  memory: RiRamLine,
  "memory-growth": RiLineChartLine,
  "disk-read": RiDownload2Line,
  "disk-write": RiUpload2Line,
  network: RiGlobalLine,
  temperature: RiTempHotLine,
  gpu: RiInstanceLine,
};

function MetricIcon({ metric, className }: { metric: AlertMetric; className?: string }) {
  const Icon = METRIC_ICONS[metric] ?? RiNotification3Line;
  return (
    <span aria-hidden className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", accentClasses.soft, className)}>
      <Icon aria-hidden />
    </span>
  );
}

const accentSwitch = "data-[state=checked]:bg-[var(--sutra-accent,var(--primary))]";

/* ------------------------------------------------------------------------------------------------
 * MutedAppsList
 * ----------------------------------------------------------------------------------------------*/

export interface MutedAppsListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** Muted app names. */
  value?: string[];
  /** Initially muted app names when `value` is not controlled. */
  defaultValue?: string[];
  /** Called with the remaining muted apps when the user unmutes one. */
  onValueChange?: (apps: string[]) => void;
  /** Called with the app that was unmuted (in addition to `onValueChange`). */
  onUnmute?: (app: string) => void;
  /** App icons by name. Default: a `Monogram` of the name. */
  appIcons?: Record<string, React.ReactNode>;
  /** Accessible name of the list. Default "Muted apps". */
  label?: string;
  /** Default "No muted apps". */
  emptyState?: React.ReactNode;
  /** Categorical colour. Default "red". */
  accent?: Accent;
}

/** Apps an alert ignores, each with an Unmute button. */
export const MutedAppsList = React.forwardRef<HTMLDivElement, MutedAppsListProps>(
  (
    { value, defaultValue, onValueChange, onUnmute, appIcons, label = "Muted apps", emptyState, accent = "red", className, style, ...props },
    ref
  ) => {
    const [apps, setApps] = useControllableState<string[]>({ value, defaultValue: defaultValue ?? [], onChange: onValueChange });
    const unmute = (app: string) => {
      setApps(apps.filter((a) => a !== app));
      onUnmute?.(app);
    };
    return (
      <div ref={ref} data-slot="muted-apps-list" style={accentStyle(accent, style)} className={cn("flex flex-col text-sm", className)} {...props}>
        {apps.length === 0 ? (
          <div data-slot="muted-apps-empty" className="px-3 py-4 text-center text-muted-foreground">
            {emptyState ?? "No muted apps"}
          </div>
        ) : (
          <ul role="list" aria-label={label} className="m-0 flex list-none flex-col p-0">
            {apps.map((app) => (
              <li key={app} data-slot="muted-app" className="flex items-center gap-3 rounded-box px-3 py-2 hover:bg-muted/50">
                <span aria-hidden className="inline-flex shrink-0">
                  {appIcons?.[app] ?? <Monogram name={app} size="sm" />}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">{app}</span>
                <RiNotificationOffLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <Button variant="ghost" size="xs" onClick={() => unmute(app)} aria-label={`Unmute ${app}`}>
                  Unmute
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);
MutedAppsList.displayName = "MutedAppsList";

/* ------------------------------------------------------------------------------------------------
 * AlertRuleEditor
 * ----------------------------------------------------------------------------------------------*/

type AggregateChoice = "sustained" | "average" | "peak";

export interface AlertRuleEditorProps
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "defaultValue" | "onChange"> {
  /** The draft rule (controlled). */
  value?: AlertRule;
  /** Initial draft. Default: a new CPU rule. */
  defaultValue?: AlertRule;
  /** Called with the draft rule on every edit. */
  onValueChange?: (rule: AlertRule) => void;
  /** Called with the cleaned-up rule when the form is valid and submitted. */
  onSubmit?: (rule: AlertRule) => void;
  /** Shows a Cancel button. */
  onCancel?: () => void;
  /** Apps to pick for a one-app rule and to mute. */
  apps?: string[];
  /** Unit for temperature thresholds. Default "celsius". */
  temperatureUnit?: AlertTemperatureUnit;
  /** Default "Save". */
  submitLabel?: React.ReactNode;
  /** Default "Cancel". */
  cancelLabel?: React.ReactNode;
  /** Categorical colour. Default "red". */
  accent?: Accent;
}

function windowLabel(metric: AlertMetric, aggregate: AggregateChoice): string {
  if (metric === "memory-growth" || aggregate === "peak") return "Within";
  if (aggregate === "average") return "Averaged over";
  return "Sustained for";
}

function shortWindow(ms: number): string {
  if (ms % 3_600_000 === 0) return `${ms / 3_600_000} h`;
  if (ms % 60_000 === 0) return `${ms / 60_000} min`;
  return formatAlertWindow(ms);
}

/** Removes fields that don't apply (aggregate on growth, muted apps outside "any app", blank names). */
function cleanRule(rule: AlertRule): AlertRule {
  const info = ALERT_METRICS[rule.metric];
  const next: AlertRule = { ...rule };
  if (!info?.aggregates) delete next.aggregate;
  if (next.scope.kind === "app") next.scope = { kind: "app", app: next.scope.app.trim() };
  if (next.scope.kind !== "any-app" || !next.mutedApps?.length) delete next.mutedApps;
  if (next.label !== undefined && !next.label.trim()) delete next.label;
  return next;
}

/** Form to create or edit an alert rule: metric, comparator, threshold, window, scope, muted apps and a live preview. */
export const AlertRuleEditor = React.forwardRef<HTMLFormElement, AlertRuleEditorProps>(
  (
    {
      value,
      defaultValue,
      onValueChange,
      onSubmit,
      onCancel,
      apps = [],
      temperatureUnit = "celsius",
      submitLabel = "Save",
      cancelLabel = "Cancel",
      accent = "red",
      className,
      style,
      ...props
    },
    ref
  ) => {
    const baseId = React.useId();
    const [initial] = React.useState(() => defaultValue ?? createAlertRule("cpu"));
    const [rule, setControlled] = useControllableState<AlertRule>({ value, defaultValue: initial, onChange: onValueChange });
    // The latest draft, including changes made earlier in the same event (Enter commits the number, then submits).
    const latest = React.useRef(rule);
    latest.current = rule;
    const setRule = (fn: (prev: AlertRule) => AlertRule) =>
      setControlled((prev) => {
        const next = fn(prev);
        latest.current = next;
        return next;
      });
    const [submitted, setSubmitted] = React.useState(false);
    const [touched, setTouched] = React.useState<Partial<Record<AlertRuleField, boolean>>>({});

    const info = ALERT_METRICS[rule.metric] ?? ALERT_METRICS.cpu;
    const range = alertThresholdRange(info.id, temperatureUnit);
    const allErrors = validateAlertRule(rule, { temperatureUnit });
    const errors: AlertRuleErrors = {};
    for (const key of Object.keys(allErrors) as AlertRuleField[]) {
      if (submitted || touched[key]) errors[key] = allErrors[key];
    }
    const aggregate: AggregateChoice = info.aggregates && rule.aggregate ? rule.aggregate : "sustained";

    const ids = {
      metric: `${baseId}-metric`,
      comparator: `${baseId}-comparator`,
      threshold: `${baseId}-threshold`,
      aggregate: `${baseId}-aggregate`,
      window: `${baseId}-window`,
      scope: `${baseId}-scope`,
      app: `${baseId}-app`,
      muted: `${baseId}-muted`,
    };
    const errorId = (field: AlertRuleField) => `${baseId}-${field}-error`;

    const update = (patch: Partial<AlertRule>, field?: AlertRuleField) => {
      setRule((prev) => ({ ...prev, ...patch }));
      if (field) setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
    };

    const setAggregate = (choice: string) =>
      setRule((prev) => {
        const next: AlertRule = { ...prev };
        if (choice === "sustained") delete next.aggregate;
        else next.aggregate = choice as AlertRule["aggregate"];
        if (next.aggregate && next.window === undefined) next.window = info.defaultWindow ?? ALERT_WINDOW_PRESETS[1];
        return next;
      });

    const setWindow = (choice: string) => {
      setRule((prev) => {
        const next: AlertRule = { ...prev };
        if (choice === "none") delete next.window;
        else next.window = Number(choice);
        return next;
      });
      setTouched((t) => ({ ...t, window: true }));
    };

    const setScopeKind = (kind: string) =>
      setRule((prev) => {
        const scope: AlertScope =
          kind === "app" ? { kind: "app", app: prev.scope.kind === "app" ? prev.scope.app : "" } : { kind: kind as "mac" | "any-app" };
        const next: AlertRule = { ...prev, scope };
        if (kind !== "any-app") delete next.mutedApps;
        return next;
      });

    const windowChoices = [...ALERT_WINDOW_PRESETS];
    if (rule.window !== undefined && Number.isFinite(rule.window) && !windowChoices.includes(rule.window)) {
      windowChoices.push(rule.window);
      windowChoices.sort((a, b) => a - b);
    }
    const windowOptions = [
      ...(!info.windowRequired && aggregate === "sustained" ? [{ value: "none", label: "Instantly" }] : []),
      ...windowChoices.map((ms) => ({ value: String(ms), label: shortWindow(ms), "aria-label": formatAlertWindow(ms) })),
    ];

    const scopeLabels: Record<AlertScope["kind"], string> = { mac: "Mac", "any-app": "Any app", app: "One app" };
    const appChoices = rule.scope.kind === "app" && rule.scope.app && !apps.includes(rule.scope.app) ? [rule.scope.app, ...apps] : apps;
    const mutable = rule.scope.kind === "any-app" && apps.length > 0;

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const draft = latest.current;
      const found = Object.keys(validateAlertRule(draft, { temperatureUnit })) as AlertRuleField[];
      if (found.length > 0) {
        setSubmitted(true);
        const order: AlertRuleField[] = ["metric", "comparator", "threshold", "window", "scope"];
        const first = order.find((f) => found.includes(f));
        const target =
          first === "scope" && draft.scope.kind === "app" ? ids.app : first === "threshold" ? ids.threshold : first ? ids[first] : undefined;
        const el = target ? document.getElementById(target) : null;
        (el?.querySelector<HTMLElement>("[data-state=on], button, input") ?? el)?.focus();
        return;
      }
      onSubmit?.(cleanRule(draft));
    };

    const groupError = (field: AlertRuleField) =>
      errors[field] ? (
        <FieldError id={errorId(field)}>{errors[field]}</FieldError>
      ) : null;

    return (
      <form
        ref={ref}
        noValidate
        data-slot="alert-rule-editor"
        style={accentStyle(accent, style)}
        className={cn("flex flex-col gap-5 text-sm", className)}
        onSubmit={handleSubmit}
        {...props}
      >
        <Field invalid={!!errors.metric}>
          <FieldLabel htmlFor={ids.metric}>Metric</FieldLabel>
          <SimpleSelect
            id={ids.metric}
            value={info.id}
            onValueChange={(m) => setRule((prev) => changeAlertMetric(prev, m as AlertMetric))}
            options={ALERT_METRIC_ORDER.map((m) => {
              const Icon = METRIC_ICONS[m];
              return { value: m, label: ALERT_METRICS[m].label, icon: <Icon aria-hidden /> };
            })}
          />
          <FieldError>{errors.metric}</FieldError>
        </Field>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {info.comparators.length > 1 ? (
            <div className="flex flex-col gap-2">
              <span id={`${ids.comparator}-label`} className="text-sm font-medium text-foreground">
                When
              </span>
              <SegmentedControl
                id={ids.comparator}
                aria-labelledby={`${ids.comparator}-label`}
                aria-describedby={errors.comparator ? errorId("comparator") : undefined}
                value={rule.comparator}
                onValueChange={(c) => update({ comparator: c as AlertRule["comparator"] }, "comparator")}
                options={[
                  { value: "above", label: "Above" },
                  { value: "below", label: "Below" },
                ]}
              />
              {groupError("comparator")}
            </div>
          ) : null}
          <Field invalid={!!errors.threshold} className="sm:w-auto sm:flex-1">
            <FieldLabel htmlFor={ids.threshold}>
              {info.id === "memory-growth" ? "Grows by more than" : "Threshold"}
              <span className="sr-only"> ({range.unitLabel})</span>
            </FieldLabel>
            <div className="flex items-center gap-2">
              <NumberInput
                id={ids.threshold}
                value={Number.isFinite(rule.threshold) ? toDisplayThreshold(info.id, rule.threshold, temperatureUnit) : null}
                onValueChange={(v) =>
                  update({ threshold: v === null ? Number.NaN : fromDisplayThreshold(info.id, v, temperatureUnit) }, "threshold")
                }
                min={range.min}
                max={range.max}
                step={range.step}
                clampOnBlur={false}
                wrapperClassName="w-44"
              />
              <span aria-hidden className="whitespace-nowrap text-muted-foreground">
                {range.unitLabel}
              </span>
            </div>
            <FieldError>{errors.threshold}</FieldError>
          </Field>
        </div>

        {info.aggregates ? (
          <div className="flex flex-col gap-2">
            <span id={`${ids.aggregate}-label`} className="text-sm font-medium text-foreground">
              Measure
            </span>
            <SegmentedControl
              id={ids.aggregate}
              aria-labelledby={`${ids.aggregate}-label`}
              value={aggregate}
              onValueChange={setAggregate}
              className="self-start"
              options={[
                { value: "sustained", label: "Every reading" },
                { value: "average", label: "Average" },
                { value: "peak", label: "Peak" },
              ]}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <span id={`${ids.window}-label`} className="text-sm font-medium text-foreground">
            {windowLabel(info.id, aggregate)}
          </span>
          <SegmentedControl
            id={ids.window}
            aria-labelledby={`${ids.window}-label`}
            aria-describedby={errors.window ? errorId("window") : undefined}
            value={rule.window === undefined ? "none" : String(rule.window)}
            onValueChange={setWindow}
            className="max-w-full self-start overflow-x-auto scrollbar-none"
            options={windowOptions}
          />
          {groupError("window")}
        </div>

        <div className="flex flex-col gap-2">
          <span id={`${ids.scope}-label`} className="text-sm font-medium text-foreground">
            Watch
          </span>
          {info.scopes.length > 1 ? (
            <SegmentedControl
              id={ids.scope}
              aria-labelledby={`${ids.scope}-label`}
              aria-describedby={errors.scope && rule.scope.kind !== "app" ? errorId("scope") : undefined}
              value={rule.scope.kind}
              onValueChange={setScopeKind}
              className="self-start"
              options={info.scopes.map((k) => ({ value: k, label: scopeLabels[k] }))}
            />
          ) : (
            <p className="text-muted-foreground">The whole Mac</p>
          )}
          {rule.scope.kind === "app" ? (
            appChoices.length > 0 ? (
              <SimpleSelect
                id={ids.app}
                aria-label="App"
                aria-describedby={errors.scope ? errorId("scope") : undefined}
                invalid={!!errors.scope}
                placeholder="Choose an app…"
                value={rule.scope.app || undefined}
                onValueChange={(app) => update({ scope: { kind: "app", app } }, "scope")}
                options={appChoices.map((a) => ({ value: a, label: a }))}
                className="sm:max-w-xs"
              />
            ) : (
              <Input
                id={ids.app}
                aria-label="App"
                aria-describedby={errors.scope ? errorId("scope") : undefined}
                invalid={!!errors.scope}
                placeholder="App name"
                value={rule.scope.app}
                onChange={(e) => update({ scope: { kind: "app", app: e.target.value } })}
                className="sm:max-w-xs"
              />
            )
          ) : null}
          {groupError("scope")}
        </div>

        {mutable ? (
          <div className="flex flex-col gap-2">
            <span id={`${ids.muted}-label`} className="text-sm font-medium text-foreground">
              Muted apps
            </span>
            <ChipGroup
              type="multiple"
              id={ids.muted}
              aria-labelledby={`${ids.muted}-label`}
              size="sm"
              value={rule.mutedApps ?? []}
              onValueChange={(muted) => update({ mutedApps: muted })}
            >
              {apps.map((app) => (
                <Chip key={app} value={app}>
                  {app}
                </Chip>
              ))}
            </ChipGroup>
          </div>
        ) : null}

        <div data-slot="alert-rule-preview" className="flex items-start gap-3 rounded-box bg-muted/50 p-3">
          <MetricIcon metric={info.id} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Notifies you when</span>
            <p aria-live="polite" className="m-0 font-medium text-foreground">
              {describeAlertRule(rule, { temperatureUnit })}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancel ? (
            <Button type="button" variant="secondary" onClick={onCancel}>
              {cancelLabel}
            </Button>
          ) : null}
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    );
  }
);
AlertRuleEditor.displayName = "AlertRuleEditor";

/* ------------------------------------------------------------------------------------------------
 * AlertRuleDialog
 * ----------------------------------------------------------------------------------------------*/

export interface AlertRuleDialogProps {
  /** Controlled open state of the dialog. */
  open?: boolean;
  /** Initial open state when `open` is not controlled. */
  defaultOpen?: boolean;
  /** Called when the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog. */
  trigger?: React.ReactNode;
  /** The rule to edit. Omit to create one (starting from `defaultMetric`). */
  rule?: AlertRule;
  /** Metric of a new rule. Default "cpu". */
  defaultMetric?: AlertMetric;
  /** Called with the saved rule; the dialog then closes. */
  onSubmit?: (rule: AlertRule) => void;
  /** Apps to pick for a one-app rule and to mute. */
  apps?: string[];
  /** Unit for temperature thresholds. Default "celsius". */
  temperatureUnit?: AlertTemperatureUnit;
  /** Default "New alert" or "Edit alert". */
  title?: React.ReactNode;
  /** Helper text under the dialog heading. */
  description?: React.ReactNode;
  /** Default "Add alert" or "Save". */
  submitLabel?: React.ReactNode;
  /** Categorical colour. Default "red". */
  accent?: Accent;
  /** Extra classes for the dialog content. */
  className?: string;
}

/** `AlertRuleEditor` in a dialog; the draft resets every time it opens (the content unmounts when closed). */
export function AlertRuleDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger,
  rule,
  defaultMetric = "cpu",
  onSubmit,
  apps,
  temperatureUnit,
  title,
  description = "Sutra notifies you when the condition is met.",
  submitLabel,
  accent = "red",
  className,
}: AlertRuleDialogProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const editing = rule !== undefined;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className={cn("sm:max-w-lg", className)} style={accentStyle(accent)}>
        <DialogHeader>
          <DialogTitle>{title ?? (editing ? "Edit alert" : "New alert")}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <AlertRuleEditor
          key={rule?.id ?? "new"}
          defaultValue={rule ?? createAlertRule(defaultMetric)}
          apps={apps}
          temperatureUnit={temperatureUnit}
          accent={accent}
          submitLabel={submitLabel ?? (editing ? "Save" : "Add alert")}
          onCancel={() => setOpen(false)}
          onSubmit={(next) => {
            onSubmit?.(next);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
AlertRuleDialog.displayName = "AlertRuleDialog";

/* ------------------------------------------------------------------------------------------------
 * AlertRuleList
 * ----------------------------------------------------------------------------------------------*/

export interface AlertRuleListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "defaultValue" | "onChange" | "onToggle"> {
  /** Controlled list of alert rules. */
  rules?: AlertRule[];
  /** Initial rules when `rules` is not controlled. */
  defaultRules?: AlertRule[];
  /** Called with the full list after the user adds, edits, toggles or deletes a rule. */
  onRulesChange?: (rules: AlertRule[]) => void;
  /** Called with the rule id and the new enabled state when the user flips a rule's switch. */
  onToggle?: (id: string, enabled: boolean) => void;
  /** Edit a rule yourself. When omitted, the built-in `AlertRuleDialog` edits it and updates `rules`. */
  onEdit?: (rule: AlertRule) => void;
  /** Called after the delete is confirmed. */
  onDelete?: (id: string) => void | Promise<void>;
  /** Add a rule yourself. When omitted, "Add alert" opens the built-in dialog. */
  onAdd?: () => void;
  /** Called with a rule created from the dialog or a preset. */
  onCreate?: (rule: AlertRule) => void;
  /** Ids of rules that are firing now (shown with a "Firing" badge). */
  firingIds?: string[];
  /** Suggestions in the empty state. Default `ALERT_RULE_PRESETS`; `[]` hides them. */
  presets?: readonly AlertRulePreset[];
  /** Apps for the built-in editor. */
  apps?: string[];
  /** Unit for temperature thresholds in the built-in editor. Default "celsius". */
  temperatureUnit?: AlertTemperatureUnit;
  /** Header title. Default "Alerts". */
  title?: React.ReactNode;
  /** Default "Add alert". */
  addLabel?: React.ReactNode;
  /** Replaces the default empty state (with presets). */
  emptyState?: React.ReactNode;
  /** Categorical colour. Default "red". */
  accent?: Accent;
  /** Rules are on their way. With no rules yet placeholder rows replace the presets empty state; with rules the root is only marked busy. */
  loading?: boolean;
  /** Placeholder rows while loading. Default 3. */
  loadingRows?: number;
}

interface RowProps {
  rule: AlertRule;
  firing: boolean;
  temperatureUnit: AlertTemperatureUnit;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
}

function AlertRuleRow({ rule, firing, temperatureUnit, onToggle, onEdit, onDelete }: RowProps) {
  const sentence = describeAlertRule(rule, { temperatureUnit });
  const muted = rule.scope.kind === "any-app" ? (rule.mutedApps?.length ?? 0) : 0;
  const name = rule.label || sentence;
  return (
    <li
      data-slot="alert-rule-row"
      data-enabled={rule.enabled}
      data-firing={firing || undefined}
      className="group/row flex items-center gap-3 rounded-box px-3 py-3 transition-colors hover:bg-muted/50"
    >
      <MetricIcon metric={rule.metric} className={cn(!rule.enabled && "opacity-50")} />
      <span className={cn("flex min-w-0 flex-1 flex-col gap-1", !rule.enabled && "opacity-60")}>
        {rule.label ? <span className="truncate font-medium text-foreground">{rule.label}</span> : null}
        <span data-slot="alert-rule-description" className={cn(rule.label ? "text-muted-foreground" : "font-medium text-foreground")}>
          {sentence}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge data-slot="alert-rule-scope" size="sm" variant="outline">
            {describeAlertScope(rule.scope)}
          </Badge>
          {muted > 0 ? (
            <Badge data-slot="alert-rule-muted" size="sm" leadingIcon={<RiNotificationOffLine aria-hidden />}>
              {muted} {pluralize(muted, "muted app")}
            </Badge>
          ) : null}
          {firing && rule.enabled ? <StatusBadge tone="destructive" size="sm" label="Firing" /> : null}
        </span>
      </span>
      <Button variant="ghost" size="icon-xs" aria-label={`Edit alert: ${name}`} onClick={onEdit} className="shrink-0 text-muted-foreground">
        <RiPencilLine aria-hidden />
      </Button>
      <ConfirmDialog
        title="Delete this alert?"
        description={`“${sentence}” will stop notifying you.`}
        confirmLabel="Delete"
        tone="destructive"
        icon={<RiDeleteBinLine aria-hidden />}
        onConfirm={onDelete}
        trigger={
          <Button variant="ghost" size="icon-xs" aria-label={`Delete alert: ${name}…`} className="shrink-0 text-muted-foreground">
            <RiDeleteBinLine aria-hidden />
          </Button>
        }
      />
      <Switch
        checked={rule.enabled}
        onCheckedChange={onToggle}
        aria-label={`Alert on: ${name}`}
        className={cn("shrink-0", accentSwitch)}
      />
    </li>
  );
}

/** Alert rules with an on/off switch, the rule sentence, scope and muted apps, edit and delete; presets when empty. */
export const AlertRuleList = React.forwardRef<HTMLDivElement, AlertRuleListProps>(
  (
    {
      rules: rulesProp,
      defaultRules,
      onRulesChange,
      onToggle,
      onEdit,
      onDelete,
      onAdd,
      onCreate,
      firingIds,
      presets = ALERT_RULE_PRESETS,
      apps,
      temperatureUnit = "celsius",
      title = "Alerts",
      addLabel = "Add alert",
      emptyState,
      accent = "red",
      loading = false,
      loadingRows = 3,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const titleId = React.useId();
    const [rules, setRules] = useControllableState<AlertRule[]>({ value: rulesProp, defaultValue: defaultRules ?? [], onChange: onRulesChange });
    const skeleton = loading && rules.length === 0;
    const [dialog, setDialog] = React.useState<{ open: boolean; rule?: AlertRule }>({ open: false });
    const firing = new Set(firingIds ?? []);

    const create = (rule: AlertRule) => {
      setRules((prev) => [...prev, rule]);
      onCreate?.(rule);
    };
    const openAdd = () => (onAdd ? onAdd() : setDialog({ open: true }));
    const openEdit = (rule: AlertRule) => (onEdit ? onEdit(rule) : setDialog({ open: true, rule }));
    const toggle = (id: string, enabled: boolean) => {
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));
      onToggle?.(id, enabled);
    };
    const remove = async (id: string) => {
      await onDelete?.(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    };
    const save = (rule: AlertRule) => {
      if (rules.some((r) => r.id === rule.id)) setRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)));
      else create(rule);
    };

    return (
      <div
        ref={ref}
        data-slot="alert-rule-list"
        aria-busy={loading || undefined}
        style={accentStyle(accent, style)}
        className={cn("flex flex-col gap-1 text-sm", className)}
        {...props}
      >
        <div className="flex items-center gap-3 px-3 py-2">
          <span id={titleId} className="flex-1 font-medium text-foreground">
            {title}
          </span>
          {rules.length > 0 ? (
            <Button variant="secondary" size="sm" leadingIcon={<RiAddLine aria-hidden />} onClick={openAdd}>
              {addLabel}
            </Button>
          ) : null}
        </div>
        {skeleton ? (
          <>
            <span className="sr-only">Loading alerts…</span>
            <ul aria-hidden className="m-0 flex list-none flex-col p-0">
              {Array.from({ length: Math.max(0, loadingRows) }, (_, i) => (
                <li key={i} data-slot="alert-rule-skeleton-row" className="flex items-center gap-3 rounded-box px-3 py-3">
                  <Skeleton className="size-8 shrink-0 rounded-md" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Skeleton shape="text" className="w-64 max-w-full" />
                    <Skeleton className="h-5 w-20 rounded-control" />
                  </div>
                  <Skeleton className="size-7 shrink-0 rounded-control" />
                  <Skeleton className="size-7 shrink-0 rounded-control" />
                  <Skeleton className="h-5 w-9 shrink-0 rounded-full" />
                </li>
              ))}
            </ul>
          </>
        ) : rules.length === 0 ? (
          emptyState ?? (
            <EmptyState
              data-slot="alert-rule-empty"
              size="sm"
              icon={<RiNotification3Line aria-hidden />}
              title="No alerts yet"
              description="Get notified when an app keeps the CPU busy, memory keeps growing or your Mac runs hot."
              actions={
                <div className="flex flex-col items-center gap-3">
                  {presets.length > 0 ? (
                    <ul role="list" aria-label="Suggested alerts" className="m-0 flex list-none flex-wrap justify-center gap-2 p-0">
                      {presets.map((preset) => (
                        <li key={preset.id}>
                          <Button
                            variant="outline"
                            size="sm"
                            leadingIcon={<MetricIcon metric={preset.rule.metric} className="size-5 rounded-xs [&_svg]:size-3" />}
                            onClick={() => create({ ...preset.rule, id: newAlertRuleId() })}
                          >
                            {preset.title}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <Button size="sm" leadingIcon={<RiAddLine aria-hidden />} onClick={openAdd}>
                    {addLabel}
                  </Button>
                </div>
              }
            />
          )
        ) : (
          <ul role="list" aria-labelledby={titleId} className="m-0 flex list-none flex-col p-0">
            {rules.map((rule) => (
              <AlertRuleRow
                key={rule.id}
                rule={rule}
                firing={firing.has(rule.id)}
                temperatureUnit={temperatureUnit}
                onToggle={(enabled) => toggle(rule.id, enabled)}
                onEdit={() => openEdit(rule)}
                onDelete={() => remove(rule.id)}
              />
            ))}
          </ul>
        )}
        {!onAdd || !onEdit ? (
          <AlertRuleDialog
            open={dialog.open}
            onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
            rule={dialog.rule}
            apps={apps}
            temperatureUnit={temperatureUnit}
            accent={accent}
            onSubmit={save}
          />
        ) : null}
      </div>
    );
  }
);
AlertRuleList.displayName = "AlertRuleList";
