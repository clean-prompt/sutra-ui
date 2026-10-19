/* KunjiButton (brand button that opens the sign-in dialog) and KunjiRpSignIn (the opt-in hosted rp.js widget). */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, focusRing } from "../../lib/cn";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { errorMessage as messageOf } from "../../hooks/use-async-action";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Spinner } from "../../primitives/spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../primitives/dialog";
import {
  createRpScriptAdapter,
  type KunjiClient,
  type KunjiPollResult,
  type KunjiRpOptions,
  type KunjiRpScriptAdapter,
  type KunjiRpSuccessDetail,
} from "./kunji-client";
import { KunjiMark, KunjiSignIn, type KunjiSignInProps } from "./kunji-sign-in";

/* ------------------------------------------------------------------ */
/* KunjiButton                                                         */
/* ------------------------------------------------------------------ */

export const kunjiButtonVariants = cva(
  [
    "inline-flex select-none items-center justify-center gap-2.5 whitespace-nowrap rounded-control font-medium shadow-xs transition-[background-color,box-shadow,scale] active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50",
    focusRing,
  ],
  {
    variants: {
      theme: {
        dark: "bg-[#17130f] text-[#fffaf0] hover:bg-[#2a221b]",
        light: "border border-border-strong bg-white text-[#17130f] hover:bg-[#faf7f2]",
        amber: "bg-[#f5b031] text-[#1f1405] hover:bg-[#eaa21c]",
      },
      size: {
        sm: "h-8 px-3 text-sm [&_svg]:size-4",
        md: "h-10 px-4 text-sm [&_svg]:size-[18px]",
        lg: "h-12 px-5 text-base [&_svg]:size-5",
      },
      fullWidth: { true: "w-full" },
    },
    defaultVariants: { theme: "dark", size: "md" },
  }
);

export interface KunjiButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onError">,
    VariantProps<typeof kunjiButtonVariants> {
  client: KunjiClient;
  onSuccess?: (result: KunjiPollResult) => void;
  onError?: (error: unknown) => void;
  /** Props for the `KunjiSignIn` inside the dialog. */
  signInProps?: Partial<Omit<KunjiSignInProps, "client" | "onSuccess" | "onError">>;
  /** Controlled dialog open state. */
  open?: boolean;
  /** Initial dialog open state when uncontrolled. Default false. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Brand "Sign in with kunji" button that opens `KunjiSignIn` in a dialog. */
export const KunjiButton = React.forwardRef<HTMLButtonElement, KunjiButtonProps>(
  (
    { client, onSuccess, onError, signInProps, open: openProp, defaultOpen = false, onOpenChange, theme, size, fullWidth, className, children, ...props },
    ref
  ) => {
    const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button ref={ref} type="button" data-slot="kunji-button" className={cn(kunjiButtonVariants({ theme, size, fullWidth }), className)} {...props}>
            <KunjiMark variant={theme === "amber" ? "glyph" : "tile"} />
            {children ?? "Sign in with kunji"}
          </button>
        </DialogTrigger>
        <DialogContent size="sm">
          <DialogHeader align="center">
            <DialogTitle className="inline-flex items-center gap-2">
              <KunjiMark variant="tile" size={24} />
              Sign in with kunji
            </DialogTitle>
            <DialogDescription>
              You&apos;re signing in to <span className="font-medium text-foreground">{client.appName}</span>
              {client.audience && (
                <>
                  {" "}at <span className="font-mono text-xs font-medium text-foreground">{client.audience}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <KunjiSignIn
            client={client}
            variant="inline"
            title={null}
            onError={onError}
            onSuccess={(r) => {
              onSuccess?.(r);
              setOpen(false);
            }}
            {...signInProps}
          />
        </DialogContent>
      </Dialog>
    );
  }
);
KunjiButton.displayName = "KunjiButton";

/* ------------------------------------------------------------------ */
/* KunjiRpSignIn (opt-in hosted widget)                                */
/* ------------------------------------------------------------------ */

export interface KunjiRpSignInProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onError"> {
  /** Adapter from `createRpScriptAdapter()`. Loading the hosted script is a third-party request. */
  adapter?: KunjiRpScriptAdapter;
  options: KunjiRpOptions;
  onSuccess?: (detail: KunjiRpSuccessDetail) => void;
  onError?: (error: unknown) => void;
}

/** Renders the official hosted rp.js button. Opt-in: Sutra's own `KunjiSignIn` makes no third-party requests. */
export const KunjiRpSignIn = React.forwardRef<HTMLDivElement, KunjiRpSignInProps>(
  ({ adapter: adapterProp, options, onSuccess, onError, className, ...props }, ref) => {
    const box = React.useRef<HTMLDivElement | null>(null);
    const [phase, setPhase] = React.useState<"loading" | "ready" | "error">("loading");
    const [message, setMessage] = React.useState("");
    const [attempt, setAttempt] = React.useState(0);
    const adapter = React.useMemo(() => adapterProp ?? createRpScriptAdapter(), [adapterProp]);
    const cbs = useLatestRef({ onSuccess, onError });
    const key = JSON.stringify(options);

    React.useEffect(() => {
      let cleanup: (() => void) | undefined;
      let cancelled = false;
      const el = box.current;
      if (!el) return;
      setPhase("loading");
      adapter.render(el, options, (d) => cbs.current.onSuccess?.(d)).then(
        (fn) => {
          if (cancelled) fn();
          else {
            cleanup = fn;
            setPhase("ready");
          }
        },
        (e) => {
          if (cancelled) return;
          setPhase("error");
          setMessage(messageOf(e, "Could not load kunji."));
          cbs.current.onError?.(e);
        }
      );
      return () => {
        cancelled = true;
        cleanup?.();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adapter, key, attempt]);

    return (
      <div ref={ref} data-slot="kunji-rp-sign-in" className={cn("flex flex-col items-center gap-2", className)} {...props}>
        {phase === "loading" && (
          <p role="status" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner size="xs" /> Loading kunji…
          </p>
        )}
        {phase === "error" && (
          <div className="flex flex-col items-center gap-2 text-center">
            <p role="alert" className="text-sm text-destructive">{message}</p>
            <Button size="sm" variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </Button>
          </div>
        )}
        <div ref={box} hidden={phase !== "ready"} />
      </div>
    );
  }
);
KunjiRpSignIn.displayName = "KunjiRpSignIn";
