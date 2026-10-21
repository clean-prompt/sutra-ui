import * as React from "react";
import { RiAddLine, RiDeleteBinLine, RiNotification3Line, RiNotificationOffLine, RiPencilLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { accentStyle, type Accent } from "../../lib/accent";
import { pluralize } from "../../lib/format";
import {
  ALERT_RULE_PRESETS,
  describeAlertRule,
  describeAlertScope,
  newAlertRuleId,
  type AlertRule,
  type AlertRulePreset,
  type AlertTemperatureUnit,
} from "../../lib/alert-rules";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { ConfirmDialog } from "../../primitives/dialog";
import { EmptyState } from "../../primitives/empty-state";
import { Skeleton } from "../../primitives/progress";
import { StatusBadge } from "../../primitives/status-badge";
import { Switch } from "../../primitives/switch";
import { MetricIcon, accentSwitch } from "./alert-rules-internal";
import { AlertRuleDialog } from "./alert-rules-dialog";

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
