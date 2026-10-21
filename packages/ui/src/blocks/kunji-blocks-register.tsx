/** `RegisterWithKunji`: first-time registration with live handle rules, then the awaiting-approval screen if needed. */
import * as React from "react";
import { RiCheckLine, RiCloseLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { Input } from "../primitives/input";
import { Field, FieldError, FieldGroup, FieldHint, FieldLabel } from "../primitives/field";
import { InlineAlert } from "../primitives/inline-alert";
import { KunjiMark } from "../kits/identity/kunji-sign-in";
import { formatKunjiSub } from "../kits/identity/kunji-client";
import { AuthFrame, FormError, type AuthHeadingLevel } from "./auth-frame-internal";
import { useBlockAction } from "./block-utils";
import { AwaitingApproval, type AwaitingApprovalProps } from "./kunji-blocks-approval";
import { kunjiHandleRules, validateKunjiHandle, type RegisterWithKunjiValues } from "./kunji-blocks-model";

/* ------------------------------------------------------------------ */
/* RegisterWithKunji                                                   */
/* ------------------------------------------------------------------ */

export interface RegisterWithKunjiProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSubmit" | "title"> {
  /**
   * Element of the card title (`1` is an `h1`).
   * @default 1
   */
  headingLevel?: AuthHeadingLevel;
  /** First person on the server becomes its admin. */
  firstAdmin?: boolean;
  /** How new people join. */
  joinPolicy?: "open" | "invite" | "approval";
  /**
   * Name the field starts with.
   * @default ""
   */
  suggestedName?: string;
  /**
   * Handles that cannot be taken (checked case-insensitively).
   * @default ["admin", "root", "system", "support", "kunji"]
   */
  reservedHandles?: string[];
  /** kunji identity being registered. */
  sub?: string;
  /** Create the account. Return `{ pending: true }` (or use `joinPolicy="approval"`) to show `AwaitingApproval`. */
  onSubmit?: (values: RegisterWithKunjiValues) => unknown;
  /** Props passed through to the `AwaitingApproval` screen shown when the account is pending. */
  awaitingProps?: Partial<AwaitingApprovalProps>;
  /**
   * `card` draws the bordered card; `plain` drops the chrome.
   * @default "card"
   */
  variant?: "card" | "plain";
  /** Heading of the form. */
  title?: React.ReactNode;
}

/** First-time kunji registration: handle with live rules, name, invite code, then awaiting approval if needed. */
export const RegisterWithKunji = React.forwardRef<HTMLDivElement, RegisterWithKunjiProps>(
  (
    {
      firstAdmin = false,
      joinPolicy = "open",
      suggestedName = "",
      reservedHandles = ["admin", "root", "system", "support", "kunji"],
      sub,
      onSubmit,
      awaitingProps,
      variant = "card",
      title = "Choose your handle",
      ...props
    },
    ref
  ) => {
    const [handle, setHandle] = React.useState("");
    const [name, setName] = React.useState(suggestedName);
    const [invite, setInvite] = React.useState("");
    const [touched, setTouched] = React.useState(false);
    const [pending, setPending] = React.useState(false);
    const action = useBlockAction();
    const failing = validateKunjiHandle(handle, reservedHandles);
    const needsInvite = !firstAdmin && joinPolicy === "invite";
    const valid = failing.length === 0 && (!needsInvite || invite.trim().length > 0);
    const rulesId = React.useId();

    if (pending) return <AwaitingApproval ref={ref} handle={handle} variant={variant} {...awaitingProps} />;

    return (
      <AuthFrame
        ref={ref}
        defaultLogo={false}
        variant={variant}
        logo={<KunjiMark variant="tile" size={40} />}
        title={title}
        description={
          firstAdmin
            ? "You're the first person here, so you'll be its admin. Choose the name you go by in every app."
            : "Welcome. Choose the name you go by in every app."
        }
        data-slot="register-with-kunji"
        {...props}
      >
        <FormError>{action.error}</FormError>
        {firstAdmin && (
          <InlineAlert variant="brand" className="mb-5">
            First sign-in: this account gets admin rights and approves everyone after you.
          </InlineAlert>
        )}
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!valid) return;
            void action.run(async () => {
              const values: RegisterWithKunjiValues = { handle, name: name.trim() || handle, ...(needsInvite ? { invite: invite.trim() } : {}) };
              const res = (await onSubmit?.(values)) as { pending?: boolean } | undefined;
              if ((joinPolicy === "approval" && !firstAdmin) || res?.pending) setPending(true);
            });
          }}
        >
          <FieldGroup>
            <Field invalid={touched && failing.length > 0}>
              <FieldLabel>Handle</FieldLabel>
              <Input
                size="lg"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="e.g. alice"
                value={handle}
                aria-describedby={rulesId}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                disabled={action.busy}
              />
              <ul id={rulesId} aria-label="Handle rules" className="mt-1 flex flex-col gap-1 text-xs">
                {kunjiHandleRules.map((r) => {
                  const ok = handle.length > 0 && !failing.includes(r.id);
                  return (
                    <li
                      key={r.id}
                      data-met={ok || undefined}
                      className={cn("flex items-center gap-1.5", ok ? "text-success" : "text-muted-foreground")}
                    >
                      {ok ? <RiCheckLine aria-hidden className="size-3.5" /> : <RiCloseLine aria-hidden className="size-3.5 opacity-60" />}
                      {r.label}
                      <span className="sr-only">{ok ? "(met)" : "(not met)"}</span>
                    </li>
                  );
                })}
              </ul>
              <FieldHint>It can&apos;t be changed later.</FieldHint>
            </Field>
            <Field>
              <FieldLabel>Your name</FieldLabel>
              <Input size="lg" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} disabled={action.busy} />
            </Field>
            {needsInvite && (
              <Field invalid={touched && !invite.trim()}>
                <FieldLabel>Invitation code</FieldLabel>
                <Input size="lg" className="font-mono" value={invite} onChange={(e) => setInvite(e.target.value)} disabled={action.busy} />
                <FieldHint>From an admin.</FieldHint>
                <FieldError>{touched && !invite.trim() ? "Enter the code an admin gave you." : undefined}</FieldError>
              </Field>
            )}
            {!firstAdmin && joinPolicy === "approval" && (
              <p className="text-xs text-muted-foreground">An admin approves new accounts; you can sign in once they have.</p>
            )}
            {sub && (
              <p className="text-xs text-muted-foreground">
                kunji identity <span className="font-mono text-foreground">{formatKunjiSub(sub, 6, 6)}</span>
              </p>
            )}
            <Button type="submit" size="lg" fullWidth loading={action.busy} disabled={!handle}>
              Continue
            </Button>
          </FieldGroup>
        </form>
      </AuthFrame>
    );
  }
);
RegisterWithKunji.displayName = "RegisterWithKunji";
