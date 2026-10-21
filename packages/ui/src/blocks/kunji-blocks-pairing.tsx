/** `DevicePairingFlow`: link a new device with a QR and 8-digit code, then a "Do these match?" SAS check. */
import * as React from "react";
import { RiCheckLine, RiErrorWarningLine, RiRefreshLine, RiSmartphoneLine, RiTimeLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { OTPField } from "../primitives/input-otp";
import { Spinner } from "../primitives/spinner";
import { QRCode } from "../kits/identity/qr-code";
import { KunjiMark } from "../kits/identity/kunji-sign-in";
import { isKunjiAbortError } from "../kits/identity/kunji-client-poll";
import type { FeaturedIconColor, IconComponent } from "../assets/icons";
import { AuthFrame, type AuthHeadingLevel } from "./auth-frame-internal";
import { useCountdown } from "../hooks/use-now";
import { useLatestRef } from "../hooks/use-iso-layout-effect";
import { formatCountdown } from "../lib/duration";
import type { DevicePairingAdapter, DevicePairingPeer, DevicePairingSession } from "./kunji-blocks-model";

/* ------------------------------------------------------------------ */
/* DevicePairingFlow                                                   */
/* ------------------------------------------------------------------ */
export interface DevicePairingFlowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /**
   * Element of the card title (`1` is an `h1`).
   * @default 1
   */
  headingLevel?: AuthHeadingLevel;
  /** Adapter that performs the pairing (create, show or enter the code, confirm); the flow only drives the UI. */
  adapter: DevicePairingAdapter;
  /** `existing` shows the QR + code; `new` types the code. */
  side?: "existing" | "new";
  /** Called with the peer when pairing finishes. */
  onDone?: (peer: DevicePairingPeer) => void;
  /** Called when the user cancels the pairing. */
  onCancel?: () => void;
  /**
   * `card` draws the bordered card; `plain` drops the chrome.
   * @default "card"
   */
  variant?: "card" | "plain";
}

type PairingStep = "loading" | "code" | "expired" | "join" | "compare" | "confirming" | "done" | "mismatch" | "error";

const fmtPairCode = (c: string) => (c.length === 8 ? `${c.slice(0, 4)} ${c.slice(4)}` : c);

/** Wallet "link a new device": QR + 8-digit code with a 2-minute TTL, then a "Do these match?" SAS check on both devices. */
export const DevicePairingFlow = React.forwardRef<HTMLDivElement, DevicePairingFlowProps>(
  ({ adapter, side = "existing", onDone, onCancel, variant = "card", className, ...props }, ref) => {
    const [step, setStep] = React.useState<PairingStep>(side === "existing" ? "loading" : "join");
    const [pairing, setPairing] = React.useState<DevicePairingSession | null>(null);
    const [peer, setPeer] = React.useState<DevicePairingPeer | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [typed, setTyped] = React.useState("");
    const [pairedAt, setPairedAt] = React.useState(0);
    const ctrl = React.useRef<AbortController | null>(null);
    // Read through a ref: an inline `adapter` prop must not abort and restart pairing on every parent render.
    const adapterRef = useLatestRef(adapter);

    const fail = (e: unknown) => {
      if (isKunjiAbortError(e)) return;
      setError(e instanceof Error ? e.message : "Pairing failed.");
      setStep("error");
    };

    const startExisting = React.useCallback(() => {
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      setStep("loading");
      setError(null);
      setPeer(null);
      void (async () => {
        try {
          const p = await adapterRef.current.createPairing(c.signal);
          if (c.signal.aborted) return;
          setPairing(p);
          setPairedAt(Date.now());
          setStep("code");
          const found = await adapterRef.current.waitForPeer(p.code, c.signal);
          if (c.signal.aborted) return;
          setPeer(found);
          setStep("compare");
        } catch (e) {
          if (!c.signal.aborted) fail(e);
        }
      })();
    }, []);

    const join = (code: string) => {
      if (!adapter.joinPairing) return;
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      setStep("loading");
      setError(null);
      adapter.joinPairing(code, c.signal).then(
        (found) => {
          if (c.signal.aborted) return;
          setPeer(found);
          setStep("compare");
        },
        (e) => {
          if (c.signal.aborted) return;
          setError(e instanceof Error ? e.message : "That code didn't work.");
          setTyped("");
          setStep("join");
        }
      );
    };

    React.useEffect(() => {
      if (side === "existing") startExisting();
      else setStep("join");
      return () => ctrl.current?.abort();
    }, [side, startExisting]);

    const countdown = useCountdown(step === "code" ? pairing?.expiresAt : undefined, {
      onExpire: () => {
        ctrl.current?.abort();
        setStep("expired");
      },
    });

    const decide = async (match: boolean) => {
      setStep("confirming");
      try {
        await adapter.confirm(match);
        if (match) {
          setStep("done");
          if (peer) onDone?.(peer);
        } else setStep("mismatch");
      } catch (e) {
        fail(e);
      }
    };

    const restart = side === "existing" ? startExisting : () => (setTyped(""), setError(null), setStep("join"));
    // The countdown's clock is from before the code arrived until its first tick; cap at the TTL left on arrival.
    const remainingMs = pairing ? Math.min(countdown.remainingMs, Math.max(0, pairing.expiresAt - pairedAt)) : 0;
    const remaining = Math.ceil(remainingMs / 1000);
    const sasParts = peer ? (Array.isArray(peer.sas) ? peer.sas : peer.sas.split(/\s+/)) : [];

    let content: React.ReactNode;
    let heading: React.ReactNode = "Link a new device";
    let sub: React.ReactNode = null;
    let icon: IconComponent | undefined;
    let iconColor: FeaturedIconColor = "brand";

    if (step === "loading" || step === "confirming") {
      content = (
        <p role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Spinner size="sm" /> {step === "confirming" ? "Finishing…" : side === "existing" ? "Getting a pairing code…" : "Connecting…"}
        </p>
      );
    } else if (step === "code" || step === "expired") {
      sub = "On the new device, open kunji and choose “I have another device”. Scan this code, or type the number.";
      const expired = step === "expired";
      content = (
        <div className="flex flex-col items-center gap-4">
          <div className="relative rounded-xl bg-white p-1.5 shadow-xs ring-1 ring-black/5">
            <QRCode
              value={pairing!.qrValue}
              size={176}
              quietZone={2}
              moduleStyle="rounded"
              title="Pairing QR code"
              className={cn(expired && "opacity-30 blur-[3px]")}
            />
            {expired && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                <p className="text-sm font-semibold text-[#09090b]">Code expired</p>
                <Button size="sm" leadingIcon={<RiRefreshLine aria-hidden />} onClick={startExisting}>
                  New code
                </Button>
              </div>
            )}
          </div>
          <p data-slot="pairing-code" aria-label={`Pairing code ${pairing!.code.split("").join(" ")}`} className={cn("font-mono text-3xl font-semibold tracking-[0.18em] tabular-nums", expired ? "text-muted-foreground line-through" : "text-foreground")}>
            {fmtPairCode(pairing!.code)}
          </p>
          {!expired ? (
            <p role="timer" aria-live="off" className={cn("inline-flex items-center gap-1.5 text-xs font-medium tabular-nums", remaining <= 20 ? "text-destructive" : "text-muted-foreground")}>
              <RiTimeLine aria-hidden className="size-3.5" />
              Expires in {formatCountdown(remainingMs)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Pairing codes last 2 minutes.</p>
          )}
          <p role="status" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            {expired ? "This pairing code expired." : <><Spinner size="xs" variant="pulse" /> Waiting for the new device…</>}
          </p>
        </div>
      );
    } else if (step === "join") {
      heading = "Pair with your wallet";
      sub = "On a device that already has kunji, open Settings → Devices → Link a new device, then type the 8-digit code it shows.";
      content = (
        <form
          className="flex flex-col items-center gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.length === 8) join(typed);
          }}
        >
          <OTPField
            length={8}
            groupSize={4}
            value={typed}
            onChange={setTyped}
            onComplete={(v: string) => join(v)}
            invalid={!!error}
            aria-label="Pairing code"
            containerClassName="w-full justify-center [&>[data-slot=input-otp-group]]:min-w-0 [&>[data-slot=input-otp-group]]:flex-1 [&>[data-slot=input-otp-group]]:justify-center"
            slotClassName="size-auto min-w-0 max-w-10 flex-1 aspect-square"
          />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" fullWidth disabled={typed.length !== 8}>
            Continue
          </Button>
        </form>
      );
    } else if (step === "compare") {
      heading = "Do these match?";
      sub = (
        <>
          Check that {peer?.deviceName ? <span className="font-medium text-foreground">{peer.deviceName}</span> : "the other device"} shows exactly the same.
        </>
      );
      content = (
        <div className="flex flex-col items-center gap-5">
          <div data-slot="pairing-sas" aria-label={`Security code: ${sasParts.join(" ")}`} role="group" className="flex flex-wrap justify-center gap-2">
            {sasParts.map((p, i) => (
              <span key={i} className="rounded-control border border-border bg-subtle px-3 py-2 font-mono text-xl font-semibold tracking-wider text-foreground">
                {p}
              </span>
            ))}
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button variant="secondary" className="sm:flex-1" onClick={() => void decide(false)}>
              They don&apos;t match
            </Button>
            <Button className="sm:flex-1" leadingIcon={<RiCheckLine aria-hidden />} onClick={() => void decide(true)}>
              They match
            </Button>
          </div>
        </div>
      );
    } else if (step === "done") {
      icon = RiSmartphoneLine;
      iconColor = "success";
      heading = "Device linked";
      sub = <>{peer?.deviceName ?? "The new device"} now holds your kunji keys.</>;
      content = null;
    } else if (step === "mismatch") {
      icon = RiErrorWarningLine;
      iconColor = "destructive";
      heading = "Pairing canceled";
      sub = "The codes didn't match, so nothing was shared. Someone nearby may have tried to join. Start again on both devices.";
      content = (
        <Button fullWidth leadingIcon={<RiRefreshLine aria-hidden />} onClick={restart}>
          Start again
        </Button>
      );
    } else {
      icon = RiErrorWarningLine;
      iconColor = "destructive";
      heading = "Pairing failed";
      sub = error;
      content = (
        <Button fullWidth leadingIcon={<RiRefreshLine aria-hidden />} onClick={restart}>
          Try again
        </Button>
      );
    }

    return (
      <AuthFrame
        ref={ref}
        defaultLogo={false}
        variant={variant}
        icon={icon}
        iconColor={iconColor}
        logo={icon ? undefined : <KunjiMark variant="tile" size={40} />}
        title={heading}
        description={sub}
        data-slot="device-pairing-flow"
        data-step={step}
        className={className}
        {...props}
      >
        {content}
        {onCancel && step !== "done" && (
          <div className="mt-4 flex justify-center">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        )}
      </AuthFrame>
    );
  }
);
DevicePairingFlow.displayName = "DevicePairingFlow";
