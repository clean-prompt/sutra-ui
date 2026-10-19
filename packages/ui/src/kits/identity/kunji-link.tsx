/* KunjiLinkedBadge and KunjiLink: show and manage the kunji wallet linked to the signed-in account. */
import * as React from "react";
import { RiCheckLine, RiLinkM, RiLinkUnlinkM } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { errorMessage as messageOf } from "../../hooks/use-async-action";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { Spinner } from "../../primitives/spinner";
import { InlineAlert } from "../../primitives/inline-alert";
import { formatKunjiSub, type KunjiClient, type KunjiPollResult } from "./kunji-client";
import { KunjiMark, KunjiSignIn } from "./kunji-sign-in";

/* ------------------------------------------------------------------ */
/* KunjiLinkedBadge / KunjiLink                                        */
/* ------------------------------------------------------------------ */

export interface KunjiLinkedBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  linked?: boolean;
  /** kunji `sub`, shortened in the tooltip. */
  sub?: string;
  size?: "sm" | "md" | "lg";
}

/** Small badge: "kunji linked" or "kunji not linked". */
export const KunjiLinkedBadge = React.forwardRef<HTMLSpanElement, KunjiLinkedBadgeProps>(
  ({ linked = true, sub, size = "md", className, children, ...props }, ref) => (
    <Badge
      ref={ref}
      color={linked ? "success" : "neutral"}
      size={size}
      leadingIcon={linked ? <RiCheckLine aria-hidden /> : <KunjiMark />}
      title={sub ? `kunji identity ${formatKunjiSub(sub, 6, 6)}` : undefined}
      data-slot="kunji-linked-badge"
      className={className}
      {...props}
    >
      {children ?? (linked ? "kunji linked" : "kunji not linked")}
    </Badge>
  )
);
KunjiLinkedBadge.displayName = "KunjiLinkedBadge";

export interface KunjiLinkProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  client: KunjiClient;
  linked?: boolean;
  defaultLinked?: boolean;
  onLinkedChange?: (linked: boolean) => void;
  /** Linked identity (`sub`). */
  sub?: string;
  /** Confirm the approved scan with the server. Throw to show an error. */
  onLink?: (result: KunjiPollResult) => unknown;
  /** Remove the link. Hidden when omitted. */
  onUnlink?: () => unknown;
  title?: React.ReactNode;
  description?: React.ReactNode;
}

/** Link a kunji wallet to the signed-in account: scan, confirm with the server, then "Linked ✓". */
export const KunjiLink = React.forwardRef<HTMLDivElement, KunjiLinkProps>(
  (
    {
      client,
      linked: linkedProp,
      defaultLinked = false,
      onLinkedChange,
      sub,
      onLink,
      onUnlink,
      title = "kunji sign-in",
      description,
      className,
      ...props
    },
    ref
  ) => {
    const [linked, setLinked] = useControllableState({ value: linkedProp, defaultValue: defaultLinked, onChange: onLinkedChange });
    const [mode, setMode] = React.useState<"idle" | "scanning" | "linking" | "unlinking">("idle");
    const [error, setError] = React.useState<string | null>(null);
    const [justLinked, setJustLinked] = React.useState(false);
    const [linkedSub, setLinkedSub] = React.useState<string | undefined>(undefined);
    const shownSub = sub ?? linkedSub;

    const confirm = async (result: KunjiPollResult) => {
      setMode("linking");
      try {
        await onLink?.(result);
        setLinkedSub(result.sub);
        setLinked(true);
        setJustLinked(true);
        setError(null);
      } catch (e) {
        setError(messageOf(e, "Couldn't link kunji."));
      } finally {
        setMode("idle");
      }
    };

    const unlink = async () => {
      setMode("unlinking");
      try {
        await onUnlink?.();
        setLinked(false);
        setJustLinked(false);
        setLinkedSub(undefined);
        setError(null);
      } catch (e) {
        setError(messageOf(e, "Couldn't unlink kunji."));
      } finally {
        setMode("idle");
      }
    };

    return (
      <div
        ref={ref}
        data-slot="kunji-link"
        data-linked={linked || undefined}
        className={cn("flex w-full flex-col gap-3 rounded-box border border-border bg-card p-4", className)}
        {...props}
      >
        <div className="flex items-center gap-3">
          <KunjiMark variant="tile" size={32} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <span className="text-xs text-muted-foreground">
              {description ?? (linked ? "Sign in by scanning with kunji." : "Optional. Lets you sign in by scanning, no password.")}
            </span>
          </div>
          <KunjiLinkedBadge linked={linked} sub={shownSub} size="sm" />
        </div>

        {error && (
          <InlineAlert variant="destructive" onDismiss={() => setError(null)}>
            {error}
          </InlineAlert>
        )}

        {mode === "scanning" ? (
          <>
            <KunjiSignIn
              client={client}
              variant="inline"
              title={null}
              successDelay={500}
              statusText={{ ready: "Waiting for you to scan with kunji to link it.", success: "Approved. Linking…" }}
              onSuccess={(r) => void confirm(r)}
            />
            <Button variant="ghost" size="sm" className="self-start" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </>
        ) : mode === "linking" ? (
          <p role="status" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner size="xs" /> Linking…
          </p>
        ) : linked ? (
          <div className="flex flex-col gap-3">
            {justLinked && (
              <InlineAlert variant="success">Linked ✓ kunji is linked: you can sign in by scanning now.</InlineAlert>
            )}
            {shownSub && (
              <p className="text-xs text-muted-foreground">
                Identity <span className="font-mono text-foreground" title={shownSub}>{formatKunjiSub(shownSub, 6, 6)}</span>
              </p>
            )}
            {onUnlink && (
              <Button
                variant="secondary"
                size="sm"
                className="self-start"
                leadingIcon={<RiLinkUnlinkM aria-hidden />}
                loading={mode === "unlinking"}
                onClick={() => void unlink()}
              >
                Unlink
              </Button>
            )}
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            leadingIcon={<RiLinkM aria-hidden />}
            onClick={() => {
              setError(null);
              setMode("scanning");
            }}
          >
            Link kunji
          </Button>
        )}
      </div>
    );
  }
);
KunjiLink.displayName = "KunjiLink";

