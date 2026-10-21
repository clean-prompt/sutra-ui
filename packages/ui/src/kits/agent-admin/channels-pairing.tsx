/** Channel pairing and setup: the RotatingQRPairing and GuidedSetupSteps. */
import * as React from "react";
import { RiCheckLine, RiErrorWarningLine, RiExternalLinkLine, RiRefreshLine } from "@remixicon/react";
import { cn, focusRing, hitArea } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useCountdown } from "../../hooks/use-now";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { CopyButton } from "../../primitives/copy-button";
import { Button } from "../../primitives/button";
import { Spinner } from "../../primitives/spinner";
import { Checkbox } from "../../primitives/checkbox";
import { QRCode, QRCodeCard } from "../identity/qr-code";
import { Steps } from "../../primitives/step-indicator";
import { isSafeHref } from "../../lib/validate";

/* ------------------------------------------------------------------ */
/* RotatingQRPairing                                                   */
/* ------------------------------------------------------------------ */

export type QRPairingPhase = "installing" | "waiting" | "connected" | "expired" | "error";

export interface RotatingQRPayload {
  value: string;
  /** New deadline for this code (ms epoch). */
  expiresAt?: number;
  /** The device finished pairing. */
  connected?: boolean;
}

export type RotatingQRPollResult = string | RotatingQRPayload | null | undefined;

export interface RotatingQRPairingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Polled while waiting for a scan. Return the current pairing payload (or `{ connected: true }`). */
  getPayload: () => RotatingQRPollResult | Promise<RotatingQRPollResult>;
  /** Poll interval in ms. Default 2000. */
  pollInterval?: number;
  /** Controlled phase of the pairing flow: `installing`, `waiting`, `connected`, `expired` or `error`. */
  phase?: QRPairingPhase;
  /** Initial phase when `phase` is not controlled. */
  defaultPhase?: QRPairingPhase;
  /** Called with the new phase when polling or the timer moves the flow on. */
  onPhaseChange?: (phase: QRPairingPhase) => void;
  /** Absolute deadline (ms epoch) for the whole pairing session. */
  expiresAt?: number;
  /** Session lifetime in seconds, restarted on refresh. Ignored when `expiresAt` is set. */
  ttl?: number;
  /** Called by the Refresh / Retry button, after the phase returns to waiting. */
  onRefresh?: () => void;
  /** Called once when the device links and the phase becomes `connected`. */
  onConnected?: () => void;
  /** Error detail shown in the `error` phase. */
  error?: React.ReactNode;
  /** Heading above the QR code. */
  title?: React.ReactNode;
  /** Instructions under the QR code, shown only while waiting for a scan. */
  caption?: React.ReactNode;
  /** Text shown in the `installing` phase. Default "Installing the bridge…". */
  installingLabel?: React.ReactNode;
  /** Text shown in the `connected` phase. Default "Device linked". */
  connectedLabel?: React.ReactNode;
  /** QR code width and height in px. */
  size?: number;
}

/** Live pairing QR: polls a rotating payload, crossfades on change, counts down and walks through pairing phases. Built on `QRCodeCard`. */
export const RotatingQRPairing = React.forwardRef<HTMLDivElement, RotatingQRPairingProps>(
  (
    {
      getPayload,
      pollInterval = 2000,
      phase: phaseProp,
      defaultPhase = "waiting",
      onPhaseChange,
      expiresAt,
      ttl,
      onRefresh,
      onConnected,
      error,
      title = "Scan to link",
      caption,
      installingLabel = "Installing the bridge…",
      connectedLabel = "Device linked",
      size = 192,
      ...props
    },
    ref
  ) => {
    const [phase, setPhase] = useControllableState<QRPairingPhase>({ value: phaseProp, defaultValue: defaultPhase, onChange: onPhaseChange });
    const [layers, setLayers] = React.useState<{ key: number; value: string }[]>([]);
    const [deadline, setDeadline] = React.useState<number | null>(() =>
      expiresAt ?? (ttl != null ? Date.now() + ttl * 1000 : null)
    );
    const waiting = phase === "waiting";
    // Drives the phase machine; QRCodeCard runs the visible countdown from the same deadline.
    const { expired: timeUp } = useCountdown(waiting ? deadline : undefined);
    const keyRef = React.useRef(0);
    const currentRef = React.useRef<string | null>(null);
    const getRef = useLatestRef(getPayload);
    const connectedRef = useLatestRef(onConnected);

    React.useEffect(() => {
      if (expiresAt != null) setDeadline(expiresAt);
    }, [expiresAt]);

    const apply = React.useCallback(
      (r: RotatingQRPollResult) => {
        if (r == null) return;
        const p: RotatingQRPayload = typeof r === "string" ? { value: r } : r;
        if (p.connected) {
          setPhase("connected");
          connectedRef.current?.();
          return;
        }
        if (p.expiresAt != null) setDeadline(p.expiresAt);
        if (p.value && p.value !== currentRef.current) {
          currentRef.current = p.value;
          const key = ++keyRef.current;
          setLayers((ls) => [...ls.slice(-1), { key, value: p.value }]);
        }
      },
      [setPhase]
    );

    React.useEffect(() => {
      if (phase !== "waiting") return;
      let alive = true;
      const poll = () => {
        let r: RotatingQRPollResult | Promise<RotatingQRPollResult>;
        try {
          r = getRef.current();
        } catch {
          return;
        }
        if (r && typeof (r as Promise<RotatingQRPollResult>).then === "function") {
          (r as Promise<RotatingQRPollResult>).then((v) => alive && apply(v)).catch(() => {});
        } else apply(r as RotatingQRPollResult);
      };
      poll();
      const id = setInterval(poll, pollInterval);
      return () => {
        alive = false;
        clearInterval(id);
      };
    }, [phase, pollInterval, apply]);

    React.useEffect(() => {
      if (layers.length < 2) return;
      const t = setTimeout(() => setLayers((ls) => ls.slice(-1)), 500);
      return () => clearTimeout(t);
    }, [layers]);

    React.useEffect(() => {
      if (waiting && timeUp) setPhase("expired");
    }, [waiting, timeUp, setPhase]);

    const refresh = () => {
      currentRef.current = null;
      setLayers([]);
      if (expiresAt == null && ttl != null) setDeadline(Date.now() + ttl * 1000);
      setPhase("waiting");
      onRefresh?.();
    };

    const showQR = phase === "waiting" || phase === "expired";
    let code: React.ReactNode;
    if (phase === "installing") {
      code = (
        <div className="flex flex-col items-center gap-3 p-4 text-sm text-muted-foreground">
          <Spinner label="" />
          <span>{installingLabel}</span>
        </div>
      );
    } else if (phase === "connected") {
      code = (
        <div className="flex flex-col items-center gap-2 p-4 text-foreground">
          <span className="flex size-12 items-center justify-center rounded-full bg-success text-success-foreground">
            <RiCheckLine aria-hidden className="size-7" />
          </span>
          <span className="text-sm font-semibold">{connectedLabel}</span>
        </div>
      );
    } else if (phase === "error") {
      code = (
        <div className="flex flex-col items-center gap-2 p-4 text-foreground">
          <RiErrorWarningLine aria-hidden className="size-8 text-destructive" />
          <span className="text-sm font-semibold">Pairing failed</span>
        </div>
      );
    } else if (layers.length === 0) {
      code = waiting ? <Spinner label="Generating code" className="text-muted-foreground" /> : null;
    } else {
      code = layers.map((l, i) => (
        <span
          key={l.key}
          data-payload={i === layers.length - 1 ? l.value : undefined}
          aria-hidden={i !== layers.length - 1 || undefined}
          className={cn("absolute inset-1", i === layers.length - 1 && layers.length > 1 && "animate-in fade-in-0 duration-500")}
        >
          <QRCode value={l.value} size={size} quietZone={2} title="Pairing QR code" />
        </span>
      ));
    }

    return (
      <QRCodeCard
        ref={ref}
        data-slot="rotating-qr-pairing"
        data-phase={phase}
        value={layers[layers.length - 1]?.value ?? ""}
        url={false}
        size={size}
        title={title}
        caption={waiting ? caption : undefined}
        expiresAt={waiting && deadline != null ? deadline : undefined}
        expired={phase === "expired"}
        onRefresh={refresh}
        code={code}
        frameClassName={showQR ? undefined : "bg-subtle ring-border"}
        {...props}
      >
        <div role="status" aria-live="polite" className="sr-only">
          {phase === "installing" ? "Installing" : phase === "waiting" ? "Waiting for scan" : phase === "connected" ? "Connected" : phase === "expired" ? "Pairing code expired" : "Pairing failed"}
        </div>
        {phase === "error" && (
          <div className="flex flex-col items-center gap-2">
            {error != null && <p className="text-sm text-destructive">{error}</p>}
            <Button size="sm" variant="secondary" leadingIcon={<RiRefreshLine aria-hidden />} onClick={refresh}>
              Try again
            </Button>
          </div>
        )}
      </QRCodeCard>
    );
  }
);
RotatingQRPairing.displayName = "RotatingQRPairing";

/* ------------------------------------------------------------------ */
/* GuidedSetupSteps                                                    */
/* ------------------------------------------------------------------ */

export interface GuidedSetupStep {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** A value to copy (command, bot name, URL). */
  copyValue?: string;
  copyLabel?: string;
  /** External link for this step. Opens in a new tab. */
  href?: string;
  linkLabel?: React.ReactNode;
  /** Extra content (e.g. an input). */
  content?: React.ReactNode;
  /** Label for the completion check. Default "I did this". */
  confirmLabel?: React.ReactNode;
}

export interface GuidedSetupStepsProps extends Omit<React.HTMLAttributes<HTMLOListElement>, "defaultValue"> {
  /** Setup steps in order, each with an id, title and optional description, copyable value and link. */
  steps: GuidedSetupStep[];
  /** Ids of completed steps. */
  value?: string[];
  /** Initially completed step ids when `value` is not controlled. */
  defaultValue?: string[];
  /** Called with the ids of the completed steps when the user checks or unchecks a step. */
  onValueChange?: (ids: string[]) => void;
  /** Fired once every step is checked. */
  onComplete?: () => void;
}

function StepCopy({ value, label }: { value: string; label?: string }) {
  return (
    <div className="flex max-w-full items-center gap-1 rounded-lg border border-border bg-subtle py-1 ps-2.5 pe-1">
      <code className="min-w-0 truncate font-mono text-xs text-foreground">{value}</code>
      <CopyButton value={value} label={label ?? `Copy ${value}`} />
    </div>
  );
}

/** Numbered onboarding checklist with copyable values, external links and "I did this" checks. Built on `Steps orientation="vertical"`. */
export const GuidedSetupSteps = React.forwardRef<HTMLOListElement, GuidedSetupStepsProps>(
  ({ steps, value, defaultValue = [], onValueChange, onComplete, className, ...props }, ref) => {
    const [done, setDone] = useControllableState<string[]>({ value, defaultValue, onChange: onValueChange });
    const currentIdx = steps.findIndex((s) => !done.includes(s.id));
    const completeRef = useLatestRef(onComplete);

    const toggle = (id: string, on: boolean) => {
      const next = on ? [...done.filter((d) => d !== id), id] : done.filter((d) => d !== id);
      setDone(next);
      if (on && steps.every((s) => next.includes(s.id))) completeRef.current?.();
    };

    return (
      <Steps
        ref={ref}
        data-slot="guided-setup-steps"
        aria-label="Setup steps"
        orientation="vertical"
        size="sm"
        current={currentIdx === -1 ? steps.length : currentIdx}
        className={className}
        {...props}
        steps={steps.map((s, i) => {
          const isDone = done.includes(s.id);
          const isCurrent = i === currentIdx;
          return {
            id: s.id,
            status: isDone ? "complete" : isCurrent ? "current" : "upcoming",
            title: isDone ? <span className="text-muted-foreground line-through decoration-muted-foreground/40">{s.title}</span> : s.title,
            description: s.description,
            itemProps: { "data-done": isDone || undefined },
            content: (
              <div className={cn("flex min-w-0 flex-col gap-2", !isDone && !isCurrent && "opacity-75")}>
                {(s.copyValue || s.href) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {s.copyValue && <StepCopy value={s.copyValue} label={s.copyLabel} />}
                    {s.href && isSafeHref(s.href) && (
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className={cn(hitArea, "inline-flex items-center gap-1 rounded-xs text-sm font-medium text-primary hover:underline", focusRing)}
                      >
                        {s.linkLabel ?? "Open"}
                        <RiExternalLinkLine aria-hidden className="size-3.5" />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    )}
                  </div>
                )}
                {s.content}
                <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox size="sm" checked={isDone} onCheckedChange={(v) => toggle(s.id, v === true)} />
                  {s.confirmLabel ?? "I did this"}
                </label>
              </div>
            ),
          };
        })}
      />
    );
  }
);
GuidedSetupSteps.displayName = "GuidedSetupSteps";
