/** LLM provider connect flow: the ProviderConnectDialog with its device-code, paste-code and API-key panels. */
import * as React from "react";
import { RiExternalLinkLine, RiRefreshLine } from "@remixicon/react";
import { cn, focusRing, hitArea } from "../../lib/cn";
import { formatCountdown } from "../../lib/duration";
import { isSafeHref } from "../../lib/validate";
import { errorMessage, useAsyncAction, useMountedRef } from "../../hooks/use-async-action";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useCountdown } from "../../hooks/use-now";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { CopyButton } from "../../primitives/copy-button";
import { Button } from "../../primitives/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../primitives/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../primitives/tabs";
import { Input, PasswordInput } from "../../primitives/input";
import { Label } from "../../primitives/label";
import { SecretField } from "../identity/secret";
import { Spinner } from "../../primitives/spinner";
import { InlineAlert } from "../../primitives/inline-alert";
import { ProviderLogo } from "./llm-providers-logo";
import { type ProviderEntry } from "./llm-providers-model";

/* ------------------------------------------------------------------ */
/* ProviderConnectDialog                                               */
/* ------------------------------------------------------------------ */

export type ProviderConnectMethod = "device" | "pkce" | "api-key";

export interface DeviceCodeGrant {
  userCode: string;
  verificationUrl: string;
  /** Seconds until the code expires. */
  expiresIn: number;
  /** Seconds between polls. Default 5. */
  interval?: number;
}

export type DeviceCodePollResult = "pending" | "approved" | "denied";

export interface ApiKeyValidation {
  ok: boolean;
  message?: string;
}

export interface ProviderConnectDialogProps {
  /** Controlled open state of the dialog. */
  open?: boolean;
  /** Initial open state when `open` is not controlled. */
  defaultOpen?: boolean;
  /** Called when the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Provider being connected (name, monogram, colour), shown in the dialog header. */
  provider: Pick<ProviderEntry, "name" | "monogram" | "color">;
  /** Tabs to show, in order. Default all three. */
  methods?: ProviderConnectMethod[];
  /** Tab shown first; defaults to the first of `methods`. */
  defaultMethod?: ProviderConnectMethod;
  /** Device flow: request a user code. */
  onStartDeviceFlow?: () => Promise<DeviceCodeGrant>;
  /** Device flow: called every `interval` seconds until approved, denied or expired. */
  onPollDeviceFlow?: () => Promise<DeviceCodePollResult>;
  /** PKCE: sign-in page URL the user opens to obtain a code. */
  authorizeUrl?: string;
  /** PKCE: exchange the pasted code. Throw to show an error. */
  onSubmitCode?: (code: string) => Promise<void> | void;
  /** API key: "Get a key" link. */
  getKeyUrl?: string;
  /** API key flow: checks the typed key before saving; resolve `true`, `false` or a result with a message. */
  onValidateKey?: (key: string) => Promise<ApiKeyValidation | boolean>;
  /** API key flow: called with the key when the user saves it. */
  onSaveKey?: (key: string) => void;
  /** Called once any flow completes. */
  onConnected?: (method: ProviderConnectMethod) => void;
}

const methodLabels: Record<ProviderConnectMethod, string> = { device: "Device code", pkce: "Paste code", "api-key": "API key" };

type DeviceState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "waiting"; grant: DeviceCodeGrant; deadline: number }
  | { phase: "approved" }
  | { phase: "expired" }
  | { phase: "error"; message: string };

function DeviceFlowPanel({
  providerName,
  onStart,
  onPoll,
  onDone,
}: {
  providerName: string;
  onStart?: () => Promise<DeviceCodeGrant>;
  onPoll?: () => Promise<DeviceCodePollResult>;
  onDone: () => void;
}) {
  const [state, setState] = React.useState<DeviceState>({ phase: "idle" });
  const mounted = useMountedRef();
  const onDoneRef = useLatestRef(onDone);
  // Held in a ref so an inline `onPoll` (new identity every parent render) doesn't restart the interval.
  const onPollRef = useLatestRef(onPoll);

  const start = async () => {
    if (!onStart) return;
    setState({ phase: "starting" });
    try {
      const grant = await onStart();
      if (mounted.current) setState({ phase: "waiting", grant, deadline: Date.now() + grant.expiresIn * 1000 });
    } catch (e) {
      if (mounted.current) setState({ phase: "error", message: errorMessage(e, "Couldn't start sign-in.") });
    }
  };

  const waiting = state.phase === "waiting";
  const grant = waiting ? state.grant : null;
  const { remainingMs } = useCountdown(waiting ? state.deadline : undefined, {
    onExpire: () => setState((s) => (s.phase === "waiting" ? { phase: "expired" } : s)),
  });

  React.useEffect(() => {
    if (!grant) return;
    let inFlight = false;
    const poll = setInterval(async () => {
      const fn = onPollRef.current;
      if (inFlight || !fn) return;
      inFlight = true;
      try {
        const result = await fn();
        if (!mounted.current) return;
        if (result === "approved") {
          setState((s) => (s.phase === "waiting" ? { phase: "approved" } : s));
          onDoneRef.current();
        } else if (result === "denied") {
          setState((s) => (s.phase === "waiting" ? { phase: "error", message: "Access was denied." } : s));
        }
      } catch {
        /* transient: keep polling */
      } finally {
        inFlight = false;
      }
    }, (grant.interval ?? 5) * 1000);
    return () => clearInterval(poll);
  }, [grant, onPollRef, mounted]);

  if (state.phase === "idle" || state.phase === "starting") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Get a one-time code, open the verification page on any device and approve access to {providerName}.
        </p>
        <Button onClick={start} loading={state.phase === "starting"} disabled={!onStart}>
          Get sign-in code
        </Button>
      </div>
    );
  }
  if (state.phase === "approved") {
    return (
      <InlineAlert variant="success" data-slot="device-approved">
        Connected to {providerName}.
      </InlineAlert>
    );
  }
  if (state.phase === "expired" || state.phase === "error") {
    return (
      <div className="space-y-3">
        <InlineAlert variant={state.phase === "expired" ? "warning" : "destructive"}>
          {state.phase === "expired" ? "The code expired before it was approved." : state.message}
        </InlineAlert>
        <Button variant="secondary" leadingIcon={<RiRefreshLine aria-hidden />} onClick={start}>
          Start over
        </Button>
      </div>
    );
  }
  const g = state.grant;
  return (
    <div className="space-y-4" data-slot="device-waiting">
      <div className="rounded-box border border-border bg-subtle p-4 text-center">
        <p className="text-xs text-muted-foreground">Your code</p>
        <div className="mt-1 flex items-center justify-center gap-2">
          <span data-slot="device-user-code" className="font-mono text-2xl font-semibold tracking-[0.2em] text-foreground">
            {g.userCode}
          </span>
          <CopyButton value={g.userCode} label="Copy code" copiedLabel="Copied" timeout={1500} />
        </div>
        <a
          href={isSafeHref(g.verificationUrl) ? g.verificationUrl : undefined}
          target="_blank"
          rel="noreferrer noopener"
          className={cn("mt-2 inline-flex items-center gap-1 rounded-xs text-sm font-medium text-primary hover:underline", focusRing)}
        >
          {g.verificationUrl.replace(/^https?:\/\//, "")}
          <RiExternalLinkLine aria-hidden className="size-3.5" />
        </a>
      </div>
      {/* Only the state text is live; the ticking countdown sits outside the region so it isn't re-announced every second. */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Spinner size="xs" label="" aria-hidden />
        <span role="status">Waiting for approval…</span>
        <span className="font-mono tabular-nums" data-slot="device-countdown">
          {formatCountdown(remainingMs)}
        </span>
      </div>
    </div>
  );
}

function PkcePanel({
  authorizeUrl,
  onSubmit,
  onDone,
}: {
  authorizeUrl?: string;
  onSubmit?: (code: string) => Promise<void> | void;
  onDone: () => void;
}) {
  const id = React.useId();
  const [code, setCode] = React.useState("");
  const [done, setDone] = React.useState(false);
  const { run, busy, error } = useAsyncAction(
    async (value: string) => {
      await onSubmit?.(value);
    },
    {
      fallbackMessage: "That code didn't work.",
      onSuccess: () => {
        setDone(true);
        onDone();
      },
    }
  );
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    void run(code.trim());
  };
  if (done) return <InlineAlert variant="success">Signed in.</InlineAlert>;
  return (
    <form className="space-y-3" onSubmit={submit}>
      <ol className="list-decimal space-y-1 ps-5 text-sm text-muted-foreground">
        <li>
          Open the{" "}
          {authorizeUrl && isSafeHref(authorizeUrl) ? (
            <a href={authorizeUrl} target="_blank" rel="noreferrer noopener" className={cn("rounded-xs font-medium text-primary hover:underline", focusRing)}>
              sign-in page
            </a>
          ) : (
            "sign-in page"
          )}{" "}
          and approve access.
        </li>
        <li>Copy the code it shows and paste it below.</li>
      </ol>
      <div className="grid grid-cols-1 gap-1.5">
        <Label htmlFor={`${id}-code`}>Authorization code</Label>
        <Input
          id={`${id}-code`}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste code"
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        {error && (
          <p id={`${id}-err`} role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" loading={busy} disabled={!code.trim()}>
        Submit code
      </Button>
    </form>
  );
}

function ApiKeyPanel({
  providerName,
  getKeyUrl,
  onValidate,
  onSave,
  onDone,
}: {
  providerName: string;
  getKeyUrl?: string;
  onValidate?: (key: string) => Promise<ApiKeyValidation | boolean>;
  onSave?: (key: string) => void;
  onDone: () => void;
}) {
  const id = React.useId();
  const [key, setKey] = React.useState("");
  const [result, setResult] = React.useState<ApiKeyValidation | null>(null);
  const [saved, setSaved] = React.useState(false);
  const { run, busy, reset } = useAsyncAction((value: string) => onValidate?.(value), {
    onSuccess: (r) => setResult(typeof r === "boolean" ? { ok: r } : (r ?? { ok: true })),
    onError: (e) => setResult({ ok: false, message: errorMessage(e, "") || undefined }),
  });

  const validate = () => {
    if (!key.trim()) return;
    if (!onValidate) {
      setResult({ ok: true });
      return;
    }
    void run(key.trim());
  };

  if (saved) {
    return (
      <div className="space-y-3">
        <InlineAlert variant="success">Key saved for {providerName}.</InlineAlert>
        <SecretField label="Saved key" value={key.trim()} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${id}-key`}>{providerName} API key</Label>
          {getKeyUrl && isSafeHref(getKeyUrl) && (
            <a
              href={getKeyUrl}
              target="_blank"
              rel="noreferrer noopener"
              className={cn(hitArea, "inline-flex items-center gap-1 rounded-xs text-xs font-medium text-primary hover:underline", focusRing)}
            >
              Get a key
              <RiExternalLinkLine aria-hidden className="size-3" />
            </a>
          )}
        </div>
        <PasswordInput
          id={`${id}-key`}
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setResult(null);
            reset();
          }}
          placeholder="Paste your key"
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          invalid={result?.ok === false}
        />
      </div>
      {result && (
        <InlineAlert variant={result.ok ? "success" : "destructive"} data-slot="api-key-result">
          {result.message ?? (result.ok ? "Key works." : "That key was rejected.")}
        </InlineAlert>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={validate} loading={busy} disabled={!key.trim()}>
          Validate
        </Button>
        <Button
          disabled={!result?.ok}
          onClick={() => {
            onSave?.(key.trim());
            setSaved(true);
            onDone();
          }}
        >
          Save key
        </Button>
      </div>
    </div>
  );
}

/** Connect a provider via OAuth device code, PKCE paste-code or an API key. */
export function ProviderConnectDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  provider,
  methods = ["device", "pkce", "api-key"],
  defaultMethod,
  onStartDeviceFlow,
  onPollDeviceFlow,
  authorizeUrl,
  onSubmitCode,
  getKeyUrl,
  onValidateKey,
  onSaveKey,
  onConnected,
}: ProviderConnectDialogProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const [method, setMethod] = React.useState<string>(defaultMethod ?? methods[0] ?? "device");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent size="md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <ProviderLogo name={provider.name} monogram={provider.monogram} color={provider.color} />
            <DialogTitle>Connect {provider.name}</DialogTitle>
          </div>
          <DialogDescription>Choose how to sign in. Credentials stay on this device.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Tabs value={method} onValueChange={setMethod} size="sm">
            {methods.length > 1 && (
              <TabsList fullWidth>
                {methods.map((m) => (
                  <TabsTrigger key={m} value={m}>
                    {methodLabels[m]}
                  </TabsTrigger>
                ))}
              </TabsList>
            )}
            {methods.includes("device") && (
              <TabsContent value="device">
                <DeviceFlowPanel providerName={provider.name} onStart={onStartDeviceFlow} onPoll={onPollDeviceFlow} onDone={() => onConnected?.("device")} />
              </TabsContent>
            )}
            {methods.includes("pkce") && (
              <TabsContent value="pkce">
                <PkcePanel authorizeUrl={authorizeUrl} onSubmit={onSubmitCode} onDone={() => onConnected?.("pkce")} />
              </TabsContent>
            )}
            {methods.includes("api-key") && (
              <TabsContent value="api-key">
                <ApiKeyPanel
                  providerName={provider.name}
                  getKeyUrl={getKeyUrl}
                  onValidate={onValidateKey}
                  onSave={onSaveKey}
                  onDone={() => onConnected?.("api-key")}
                />
              </TabsContent>
            )}
          </Tabs>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
ProviderConnectDialog.displayName = "ProviderConnectDialog";
