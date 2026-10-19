/** CreditBalanceCard and CreditAutoReload. */
import * as React from "react";
import { RiCoinsLine, RiTimeLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useAsyncAction } from "../../hooks/use-async-action";
import { Button } from "../../primitives/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../primitives/dialog";
import { NumberInput } from "../../primitives/number-input";
import { Switch } from "../../primitives/switch";
import { safeISO } from "../../lib/time";
import { formatPrice, projectRunOut } from "./billing-format";
import { formatDay, formatNumber } from "./billing-internal";

/* ------------------------------------------------------------------ */
/* CreditBalanceCard                                                   */
/* ------------------------------------------------------------------ */

export interface CreditPreset {
  credits: number;
  /** Price in minor units. */
  price: number;
  label?: string;
}

export interface CreditBalanceCardProps extends React.HTMLAttributes<HTMLElement> {
  balance: number;
  /** Average credits spent per day. */
  dailyBurn?: number;
  /** "Now" for the projection (defaults to the current date). */
  now?: Date;
  presets?: CreditPreset[];
  currency?: string;
  locale?: string;
  unitLabel?: string;
  /** Days of runway below which the card warns. Default 7. */
  lowRunwayDays?: number;
  /** May return a promise; the dialog closes when it resolves. */
  onBuy?: (preset: CreditPreset) => void | Promise<void>;
}

const defaultPresets: CreditPreset[] = [
  { credits: 1000, price: 1000 },
  { credits: 5000, price: 4500, label: "Save 10%" },
  { credits: 20000, price: 16000, label: "Save 20%" },
];

/** Credit balance with burn rate, projected run-out date and a Buy credits dialog with preset amounts. */
export const CreditBalanceCard = React.forwardRef<HTMLElement, CreditBalanceCardProps>(
  (
    {
      balance,
      dailyBurn = 0,
      now,
      presets = defaultPresets,
      currency = "USD",
      locale = "en-US",
      unitLabel = "credits",
      lowRunwayDays = 7,
      onBuy,
      className,
      ...props
    },
    ref
  ) => {
    const titleId = React.useId();
    const [open, setOpen] = React.useState(false);
    const [selected, setSelected] = React.useState(0);
    const purchase = useAsyncAction(async (preset: CreditPreset) => onBuy?.(preset), { onSuccess: () => setOpen(false) });
    const busy = purchase.busy;
    const from = now ?? new Date();
    const runOut = projectRunOut(balance, dailyBurn, from);
    const runwayDays = dailyBurn > 0 ? balance / dailyBurn : Infinity;
    const low = runwayDays < lowRunwayDays;

    const buy = async () => {
      const preset = presets[selected];
      if (!preset) return;
      await purchase.run(preset);
    };

    return (
      <section
        ref={ref}
        aria-labelledby={titleId}
        data-low={low || undefined}
        className={cn("flex flex-col gap-4 rounded-box border border-border bg-card p-5 shadow-xs", className)}
        {...props}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3 id={titleId} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Credit balance
            </h3>
            <p className="flex items-baseline gap-1.5">
              <span data-slot="credit-balance" className="text-display-xs font-semibold tracking-tight text-foreground tabular-nums">
                {formatNumber(balance, locale)}
              </span>
              <span className="text-sm text-muted-foreground">{unitLabel}</span>
            </p>
          </div>
          <span aria-hidden className="inline-flex size-10 items-center justify-center rounded-box bg-primary-soft text-primary-soft-foreground">
            <RiCoinsLine aria-hidden className="size-5" />
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Burn rate</dt>
            <dd className="font-medium text-foreground tabular-nums">{dailyBurn > 0 ? `~${formatNumber(dailyBurn, locale)} / day` : "No recent usage"}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Projected run-out</dt>
            <dd data-slot="run-out" className={cn("font-medium tabular-nums", low ? "text-destructive" : "text-foreground")}>
              {runOut ? <time dateTime={safeISO(runOut)}>{formatDay(runOut, locale)}</time> : "Not projected"}
            </dd>
          </div>
        </dl>
        {low && (
          <p role="status" className="flex items-center gap-1.5 text-xs text-destructive">
            <RiTimeLine aria-hidden className="size-3.5" />
            Less than {lowRunwayDays} days of credits left at the current rate.
          </p>
        )}
        <Button
          onClick={() => {
            purchase.reset();
            setOpen(true);
          }}
          leadingIcon={<RiCoinsLine aria-hidden />}
        >
          Buy credits
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Buy credits</DialogTitle>
              <DialogDescription>Credits never expire and are used before overage billing.</DialogDescription>
            </DialogHeader>
            <div role="group" aria-label="Credit amount" className="flex flex-col gap-2">
              {presets.map((p, i) => (
                <button
                  key={p.credits}
                  type="button"
                  aria-pressed={selected === i}
                  onClick={() => setSelected(i)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-box border px-4 py-3 text-start text-sm transition-colors",
                    selected === i ? "border-primary bg-primary-soft/40 ring-1 ring-primary" : "border-border hover:bg-accent",
                    focusRing
                  )}
                >
                  <span className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {formatNumber(p.credits, locale)} {unitLabel}
                    </span>
                    {p.label && <span className="text-xs text-success">{p.label}</span>}
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">{formatPrice(p.price, currency, locale)}</span>
                </button>
              ))}
            </div>
            {purchase.error && (
              <p role="alert" className="text-sm text-destructive">
                {purchase.error}
              </p>
            )}
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button loading={busy} onClick={() => void buy()}>
                Buy for {presets[selected] ? formatPrice(presets[selected]!.price, currency, locale) : ""}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    );
  }
);
CreditBalanceCard.displayName = "CreditBalanceCard";

/* ------------------------------------------------------------------ */
/* CreditAutoReload                                                    */
/* ------------------------------------------------------------------ */

export interface AutoReloadSettings {
  enabled: boolean;
  /** Reload when the balance falls below this. */
  threshold: number | null;
  /** Amount added per reload. */
  amount: number | null;
  /** Max total reloaded per month; null = no cap. */
  monthlyCap: number | null;
}

export interface AutoReloadErrors {
  threshold?: string;
  amount?: string;
  monthlyCap?: string;
}

/** Validate auto-reload settings; returns an empty object when valid (or disabled). */
export function validateAutoReload(v: AutoReloadSettings): AutoReloadErrors {
  const e: AutoReloadErrors = {};
  if (!v.enabled) return e;
  if (v.amount == null || !(v.amount > 0)) e.amount = "Reload amount must be greater than 0.";
  if (v.threshold == null || v.threshold < 0) e.threshold = "Enter a threshold of 0 or more.";
  if (v.monthlyCap != null) {
    if (!(v.monthlyCap > 0)) e.monthlyCap = "Monthly cap must be greater than 0.";
    else if (v.threshold != null && v.threshold >= v.monthlyCap) e.threshold = "Threshold must be below the monthly cap.";
    else if (v.amount != null && v.amount > v.monthlyCap) e.amount = "Reload amount can't exceed the monthly cap.";
  }
  return e;
}

export interface CreditAutoReloadProps extends Omit<React.HTMLAttributes<HTMLElement>, "defaultValue" | "onChange"> {
  value?: AutoReloadSettings;
  defaultValue?: AutoReloadSettings;
  onValueChange?: (value: AutoReloadSettings) => void;
  /** May return a promise; shows "Saved" when it resolves. */
  onSave?: (value: AutoReloadSettings) => void | Promise<void>;
  unitLabel?: string;
  locale?: string;
}

const defaultAutoReload: AutoReloadSettings = { enabled: false, threshold: 500, amount: 2000, monthlyCap: 10000 };

/** Auto top-up settings: switch, "below X add Y" inputs, optional monthly cap, validation and save. */
export const CreditAutoReload = React.forwardRef<HTMLElement, CreditAutoReloadProps>(
  (
    { value: valueProp, defaultValue = defaultAutoReload, onValueChange, onSave, unitLabel = "credits", locale, className, ...props },
    ref
  ) => {
    const [value, setValue] = useControllableState<AutoReloadSettings>({ value: valueProp, defaultValue, onChange: onValueChange });
    const [status, setStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
    const errors = validateAutoReload(value);
    const invalid = Object.keys(errors).length > 0;
    const id = React.useId();
    const titleId = `${id}-title`;
    const patch = (p: Partial<AutoReloadSettings>) => {
      setValue({ ...value, ...p });
      setStatus("idle");
    };
    const capOn = value.monthlyCap != null;

    const save = async () => {
      if (invalid) return;
      setStatus("saving");
      try {
        await onSave?.(value);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    };

    const field = (key: keyof AutoReloadErrors, label: string, v: number | null, onChange: (n: number | null) => void) => (
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-${key}`} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        <NumberInput
          id={`${id}-${key}`}
          value={v}
          onValueChange={onChange}
          min={0}
          step={100}
          locale={locale}
          disabled={!value.enabled}
          invalid={!!errors[key]}
          aria-describedby={errors[key] ? `${id}-${key}-error` : undefined}
          wrapperClassName="w-40"
        />
        {errors[key] && (
          <p id={`${id}-${key}-error`} className="text-xs text-destructive">
            {errors[key]}
          </p>
        )}
      </div>
    );

    return (
      <section
        ref={ref}
        aria-labelledby={titleId}
        className={cn("flex flex-col gap-4 rounded-box border border-border bg-card p-5 shadow-xs", className)}
        {...props}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3 id={titleId} className="text-sm font-semibold text-foreground">
              Auto reload
            </h3>
            <p id={`${id}-desc`} className="text-sm text-muted-foreground">
              Top up automatically so agents never stop mid-task.
            </p>
          </div>
          <Switch
            checked={value.enabled}
            onCheckedChange={(enabled) => patch({ enabled })}
            aria-labelledby={titleId}
            aria-describedby={`${id}-desc`}
          />
        </div>
        <div className={cn("flex flex-wrap items-end gap-x-3 gap-y-3 text-sm", !value.enabled && "opacity-60")}>
          {field("threshold", `When balance falls below (${unitLabel})`, value.threshold, (n) => patch({ threshold: n }))}
          {field("amount", `Add (${unitLabel})`, value.amount, (n) => patch({ amount: n }))}
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={capOn}
              disabled={!value.enabled}
              onChange={(e) => patch({ monthlyCap: e.target.checked ? Math.max((value.amount ?? 0) * 5, 1000) : null })}
              className={cn("size-4 accent-[var(--color-primary)]", focusRing)}
            />
            Limit reloads per month
          </label>
          {capOn && field("monthlyCap", `Monthly cap (${unitLabel})`, value.monthlyCap, (n) => patch({ monthlyCap: n }))}
        </div>
        <div className="flex items-center justify-end gap-3">
          <span role="status" className="text-xs text-muted-foreground">
            {status === "saved" ? "Saved" : status === "error" ? "Couldn't save. Try again." : ""}
          </span>
          <Button size="sm" onClick={() => void save()} disabled={invalid} loading={status === "saving"}>
            Save
          </Button>
        </div>
      </section>
    );
  }
);
CreditAutoReload.displayName = "CreditAutoReload";
