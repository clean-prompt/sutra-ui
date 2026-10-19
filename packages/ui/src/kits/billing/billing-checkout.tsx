/** CheckoutSteps: multi-step checkout with 3-D Secure step-up. */
import * as React from "react";
import { RiArrowRightLine, RiCheckLine, RiErrorWarningLine, RiShieldCheckLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { errorMessage, useAsyncAction } from "../../hooks/use-async-action";
import { Button } from "../../primitives/button";
import { CardBrandMark, type CardBrand } from "./payment-card";
import { Spinner } from "../../primitives/spinner";
import { Steps } from "../../primitives/step-indicator";
import { formatPrice } from "./billing-format";
import { brandName } from "./billing-internal";
import type { BillingInterval } from "./billing-plans";

/* ------------------------------------------------------------------ */
/* CheckoutSteps                                                       */
/* ------------------------------------------------------------------ */

export type CheckoutStep = "plan" | "payment" | "confirm" | "authenticate" | "success" | "failure";
export type CheckoutOutcome = "succeeded" | "requires_action" | { status: "failed"; message?: string };

export interface CheckoutPaymentOption {
  id: string;
  last4: string;
  brand?: CardBrand;
  expiry?: string;
}

export interface CheckoutStepsProps extends React.HTMLAttributes<HTMLDivElement> {
  plan: { name: string; price: number; interval?: BillingInterval; description?: string };
  currency?: string;
  locale?: string;
  paymentMethods?: CheckoutPaymentOption[];
  /** Custom new-card form shown under the saved methods. */
  newPaymentSlot?: React.ReactNode;
  /** Charge; return "requires_action" to step up to 3-D Secure. Default resolves "succeeded". */
  onConfirm?: (paymentMethodId: string | null) => Promise<CheckoutOutcome> | CheckoutOutcome;
  /** Complete the SCA challenge. Default resolves "succeeded". */
  onAuthenticate?: () => Promise<"succeeded" | "failed"> | "succeeded" | "failed";
  onDone?: () => void;
  onStepChange?: (step: CheckoutStep) => void;
  defaultStep?: CheckoutStep;
}

const stepIndex: Record<CheckoutStep, number> = { plan: 0, payment: 1, confirm: 2, authenticate: 2, success: 4, failure: 3 };

/** Multi-step checkout: plan → payment → confirm (with 3-D Secure step-up) → success or failure with retry. */
export const CheckoutSteps = React.forwardRef<HTMLDivElement, CheckoutStepsProps>(
  (
    {
      plan,
      currency = "USD",
      locale = "en-US",
      paymentMethods = [],
      newPaymentSlot,
      onConfirm,
      onAuthenticate,
      onDone,
      onStepChange,
      defaultStep = "plan",
      className,
      ...props
    },
    ref
  ) => {
    const [step, setStepState] = React.useState<CheckoutStep>(defaultStep);
    const [method, setMethod] = React.useState<string | null>(paymentMethods[0]?.id ?? null);
    const [error, setError] = React.useState<string | null>(null);
    const methodName = React.useId();
    const headingRef = React.useRef<HTMLHeadingElement>(null);
    const shownStep = React.useRef(step);
    const setStep = (s: CheckoutStep) => {
      setStepState(s);
      onStepChange?.(s);
    };
    // Move focus to the new step's heading only when the step actually changes (not on mount,
    // and not when StrictMode re-runs the effect).
    React.useEffect(() => {
      if (shownStep.current === step) return;
      shownStep.current = step;
      headingRef.current?.focus();
    }, [step]);

    const price = formatPrice(plan.price, currency, locale);
    const per = plan.interval === "yearly" ? "year" : "month";
    const canPay = paymentMethods.length === 0 || method != null;

    const confirmAction = useAsyncAction(
      async (): Promise<CheckoutOutcome> => {
        setError(null);
        return onConfirm ? onConfirm(method) : "succeeded";
      },
      {
        onSuccess: (outcome) => {
          if (outcome === "succeeded") setStep("success");
          else if (outcome === "requires_action") setStep("authenticate");
          else {
            setError(outcome.message ?? "Your card was declined.");
            setStep("failure");
          }
        },
        onError: (e) => {
          setError(errorMessage(e, "Something went wrong."));
          setStep("failure");
        },
      }
    );

    const authFailed = "Authentication failed. Your bank didn't approve the payment.";
    const authAction = useAsyncAction(async () => (onAuthenticate ? onAuthenticate() : "succeeded"), {
      onSuccess: (r) => {
        if (r === "succeeded") setStep("success");
        else {
          setError(authFailed);
          setStep("failure");
        }
      },
      onError: (e) => {
        setError(errorMessage(e, authFailed));
        setStep("failure");
      },
    });
    const busy = confirmAction.busy || authAction.busy;
    const confirm = confirmAction.run;
    const authenticate = authAction.run;

    const titles: Record<CheckoutStep, string> = {
      plan: "Review your plan",
      payment: "Payment method",
      confirm: "Confirm and pay",
      authenticate: "Verify with your bank",
      success: "You're all set",
      failure: "Payment failed",
    };

    return (
      <div ref={ref} data-step={step} className={cn("flex w-full max-w-lg flex-col gap-6 rounded-box border border-border bg-card p-6 shadow-xs", className)} {...props}>
        <Steps
          aria-label="Checkout progress"
          current={stepIndex[step]}
          steps={[{ title: "Plan" }, { title: "Payment" }, { title: "Confirm" }, { title: "Done" }]}
        />
        <h3 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-foreground outline-none">
          {titles[step]}
        </h3>

        {step === "plan" && (
          <>
            <div className="flex items-start justify-between gap-4 rounded-box border border-border bg-subtle p-4">
              <div>
                <p className="font-medium text-foreground">{plan.name}</p>
                {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
              </div>
              <p className="text-right text-sm">
                <span className="block font-semibold text-foreground tabular-nums">{price}</span>
                <span className="text-muted-foreground">per {per}</span>
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep("payment")} trailingIcon={<RiArrowRightLine aria-hidden />}>
                Continue
              </Button>
            </div>
          </>
        )}

        {step === "payment" && (
          <>
            {paymentMethods.length > 0 && (
              <div role="radiogroup" aria-label="Saved payment methods" className="flex flex-col gap-2">
                {paymentMethods.map((pm) => (
                  <label
                    key={pm.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-box border px-4 py-3 text-sm transition-colors",
                      method === pm.id ? "border-primary bg-primary-soft/40" : "border-border hover:bg-accent"
                    )}
                  >
                    <input type="radio" name={methodName} value={pm.id} checked={method === pm.id} onChange={() => setMethod(pm.id)} className="size-4 accent-[var(--color-primary)]" />
                    <CardBrandMark brand={pm.brand ?? "unknown"} />
                    <span className="flex-1 font-medium text-foreground">
                      {brandName(pm.brand ?? "unknown")} •••• {pm.last4}
                    </span>
                    {pm.expiry && <span className="text-muted-foreground">{pm.expiry}</span>}
                  </label>
                ))}
              </div>
            )}
            {newPaymentSlot}
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep("plan")}>
                Back
              </Button>
              <Button disabled={!canPay} onClick={() => setStep("confirm")} trailingIcon={<RiArrowRightLine aria-hidden />}>
                Continue
              </Button>
            </div>
          </>
        )}

        {step === "confirm" && (
          <>
            <dl className="flex flex-col gap-2 rounded-box border border-border p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="font-medium text-foreground">{plan.name}</dd>
              </div>
              {method && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Payment</dt>
                  <dd className="font-medium text-foreground">•••• {paymentMethods.find((m) => m.id === method)?.last4}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="font-medium text-foreground">Due today</dt>
                <dd className="font-semibold text-foreground tabular-nums">{price}</dd>
              </div>
            </dl>
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep("payment")} disabled={busy}>
                Back
              </Button>
              <Button onClick={() => void confirm()} loading={busy}>
                Pay {price}
              </Button>
            </div>
          </>
        )}

        {step === "authenticate" && (
          <>
            <div
              data-slot="sca-frame"
              className="flex flex-col items-center gap-3 rounded-box border border-dashed border-border-strong bg-subtle px-6 py-8 text-center"
            >
              <RiShieldCheckLine aria-hidden className="size-8 text-primary" />
              <p className="text-sm font-medium text-foreground">3-D Secure verification</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Your bank needs to confirm this payment. The issuer's challenge renders here; approve it in your banking app or enter the code it sends.
              </p>
              {busy && <Spinner size="sm" label="Waiting for your bank" />}
            </div>
            <div className="flex justify-between gap-2">
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setError("Authentication was canceled.");
                  setStep("failure");
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => void authenticate()} loading={busy}>
                Complete authentication
              </Button>
            </div>
          </>
        )}

        {step === "success" && (
          <div role="status" className="flex flex-col items-center gap-3 py-4 text-center">
            <span aria-hidden className="inline-flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
              <RiCheckLine aria-hidden className="size-6" />
            </span>
            <p className="text-sm text-muted-foreground">
              You're now on {plan.name}. A receipt for {price} is on its way.
            </p>
            {onDone && <Button onClick={onDone}>Done</Button>}
          </div>
        )}

        {step === "failure" && (
          <div className="flex flex-col gap-4">
            <div role="alert" className="flex items-start gap-3 rounded-box border border-destructive/30 bg-destructive-soft p-4 text-sm text-destructive-soft-foreground">
              <RiErrorWarningLine aria-hidden className="mt-0.5 size-5 shrink-0" />
              <p>{error ?? "Your payment couldn't be completed."}</p>
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep("payment")}>
                Change payment method
              </Button>
              <Button onClick={() => setStep("confirm")}>Try again</Button>
            </div>
          </div>
        )}
      </div>
    );
  }
);
CheckoutSteps.displayName = "CheckoutSteps";
