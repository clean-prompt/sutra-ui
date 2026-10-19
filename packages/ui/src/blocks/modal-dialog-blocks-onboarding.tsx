/** OnboardingDialog: multi-step onboarding with an app picker. */
import * as React from "react";
import { RiArrowLeftLine, RiArrowRightLine, RiCheckLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { Button } from "../primitives/button";
import { Input } from "../primitives/input";
import { Field, FieldDescription, FieldLabel, FieldGroup } from "../primitives/field";
import { SegmentedControl } from "../primitives/segmented-control";
import { SwitchField } from "../primitives/switch";
import { Steps } from "../primitives/step-indicator";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../primitives/dialog";
import { SutraAppIcon, sutraAppMeta, sutraApps, type SutraApp } from "../assets/brand";
import { useBlockAction as useAsyncAction } from "./block-utils";
import { type BlockDialogBaseProps, useDialogOpen } from "./modal-dialog-blocks-internal";

/* ------------------------------------------------------------------ */
/* OnboardingDialog                                                    */
/* ------------------------------------------------------------------ */

export interface OnboardingStep {
  title: string;
  description?: React.ReactNode;
  content: React.ReactNode;
}

export interface OnboardingDialogProps extends BlockDialogBaseProps {
  /** Custom steps. Defaults to pick apps → name workspace → preferences. */
  steps?: OnboardingStep[];
  /** Controlled index of the current step. Use with `onStepChange`. */
  step?: number;
  /** Initial step index when uncontrolled. */
  defaultStep?: number;
  /** Called with the new step index when the user moves between steps. */
  onStepChange?: (step: number) => void;
  /** Called when the user finishes the last step. A returned promise shows a spinner; throw to show the error message. */
  onComplete?: () => unknown;
  /**
   * Text of the button on the last step.
   * @default "Get started"
   */
  finishLabel?: React.ReactNode;
}

function AppPicker({ value, onChange }: { value: SutraApp[]; onChange: (v: SutraApp[]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Apps">
      {sutraApps.map((app) => {
        const on = value.includes(app);
        return (
          <button
            key={app}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((a) => a !== app) : [...value, app])}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-box border p-4 text-sm font-medium transition-[border-color,background-color,box-shadow]",
              on ? "border-primary bg-primary-soft/40 ring-1 ring-primary" : "border-border hover:border-border-strong hover:bg-accent/50",
              focusRing
            )}
          >
            <SutraAppIcon app={app} size={36} shape="squircle" />
            {sutraAppMeta[app].name}
            {on ? (
              <span className="absolute end-2 top-2 inline-flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <RiCheckLine aria-hidden className="size-3" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Multi-step onboarding with a step indicator, content slots and Back/Next navigation. */
export function OnboardingDialog({
  steps: stepsProp,
  step,
  defaultStep = 0,
  onStepChange,
  onComplete,
  finishLabel = "Get started",
  trigger,
  className,
  ...openProps
}: OnboardingDialogProps) {
  const [open, setOpen] = useDialogOpen(openProps);
  const [index, setIndex] = useControllableState<number>({ value: step, defaultValue: defaultStep, onChange: onStepChange });
  const [apps, setApps] = React.useState<SutraApp[]>(["notes", "tasks", "calendar"]);
  const [workspace, setWorkspace] = React.useState("Northwind Studio");
  const [theme, setTheme] = React.useState("system");
  const [digest, setDigest] = React.useState(true);
  const action = useAsyncAction();
  const slug = workspace.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const steps: OnboardingStep[] = stepsProp ?? [
    {
      title: "Choose your apps",
      description: "Pick the apps you want in your sidebar. You can add more anytime.",
      content: <AppPicker value={apps} onChange={setApps} />,
    },
    {
      title: "Name your workspace",
      description: "This is where your notes, tasks and files will live.",
      content: (
        <FieldGroup>
          <Field>
            <FieldLabel>Workspace name</FieldLabel>
            <Input value={workspace} onChange={(e) => setWorkspace(e.target.value)} size="lg" autoFocus />
          </Field>
          <Field>
            <FieldLabel>Workspace URL</FieldLabel>
            <Input value={slug} readOnly prefix="sutra.app/" size="lg" />
            <FieldDescription>Share this link to invite people later.</FieldDescription>
          </Field>
        </FieldGroup>
      ),
    },
    {
      title: "Make it yours",
      description: "Set a few preferences. All of these live in Settings too.",
      content: (
        <FieldGroup>
          <Field>
            <FieldLabel>Appearance</FieldLabel>
            <SegmentedControl
              aria-label="Appearance"
              fullWidth
              value={theme}
              onValueChange={(v) => v && setTheme(v)}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ]}
            />
          </Field>
          <div className="rounded-box border border-border p-4">
            <SwitchField
              label="Daily summary"
              description="Get a short morning email with today's tasks and events."
              labelPosition="left"
              checked={digest}
              onCheckedChange={setDigest}
            />
          </div>
        </FieldGroup>
      ),
    },
  ];

  const last = index >= steps.length - 1;
  const current = steps[Math.min(index, steps.length - 1)];

  const next = async () => {
    if (!last) return setIndex(index + 1);
    const ok = await action.run(onComplete);
    if (ok) {
      setOpen(false);
      setIndex(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent size="lg" className={cn("gap-6", className)}>
        <Steps steps={steps.map((s) => ({ title: s.title }))} current={index} variant="bars" onStepClick={setIndex} className="pe-8" />
        <DialogHeader>
          <DialogTitle>{current?.title}</DialogTitle>
          {current?.description ? <DialogDescription>{current.description}</DialogDescription> : null}
        </DialogHeader>
        <DialogBody key={index} className="animate-in fade-in-0 slide-in-from-end-2 duration-200">
          {current?.content}
        </DialogBody>
        <DialogFooter bordered className="sm:justify-between">
          <span className="hidden text-sm text-muted-foreground sm:block">
            Step {index + 1} of {steps.length}
          </span>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {index > 0 ? (
              <Button variant="secondary" leadingIcon={<RiArrowLeftLine className="rtl:-scale-x-100" aria-hidden />} onClick={() => setIndex(index - 1)}>
                Back
              </Button>
            ) : (
              <DialogClose asChild>
                <Button variant="ghost">Skip for now</Button>
              </DialogClose>
            )}
            <Button
              loading={action.busy}
              trailingIcon={last ? undefined : <RiArrowRightLine className="rtl:-scale-x-100" aria-hidden />}
              onClick={() => void next()}
            >
              {last ? finishLabel : "Continue"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
OnboardingDialog.displayName = "OnboardingDialog";
