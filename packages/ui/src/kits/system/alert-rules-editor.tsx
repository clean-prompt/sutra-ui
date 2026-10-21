import * as React from "react";
import { cn } from "../../lib/cn";
import { accentStyle, type Accent } from "../../lib/accent";
import {
  ALERT_METRICS,
  ALERT_METRIC_ORDER,
  ALERT_WINDOW_PRESETS,
  alertThresholdRange,
  changeAlertMetric,
  createAlertRule,
  describeAlertRule,
  formatAlertWindow,
  fromDisplayThreshold,
  toDisplayThreshold,
  validateAlertRule,
  type AlertMetric,
  type AlertRule,
  type AlertRuleErrors,
  type AlertRuleField,
  type AlertScope,
  type AlertTemperatureUnit,
} from "../../lib/alert-rules";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Chip, ChipGroup } from "../../primitives/chip";
import { Field, FieldError, FieldLabel } from "../../primitives/field";
import { Input } from "../../primitives/input";
import { NumberInput } from "../../primitives/number-input";
import { SegmentedControl } from "../../primitives/segmented-control";
import { SimpleSelect } from "../../primitives/select";
import { METRIC_ICONS, MetricIcon } from "./alert-rules-internal";

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
