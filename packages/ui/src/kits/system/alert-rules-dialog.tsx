import * as React from "react";
import { cn } from "../../lib/cn";
import { accentStyle, type Accent } from "../../lib/accent";
import { createAlertRule, type AlertMetric, type AlertRule, type AlertTemperatureUnit } from "../../lib/alert-rules";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../primitives/dialog";
import { AlertRuleEditor } from "./alert-rules-editor";

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
