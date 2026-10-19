import * as React from "react";
import {
  RiArrowRightSLine,
  RiEyeOffLine,
  RiShieldCheckLine,
  RiTicket2Line,
  RiVerifiedBadgeFill,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { pluralize } from "../../lib/format";
import { formatShortDate, toMs, type TimeInput as DateInput } from "../../lib/time";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Badge, type BadgeColor } from "../../primitives/badge";
import { Checkbox } from "../../primitives/checkbox";
import { Favicon } from "../../primitives/favicon";
import { KeyValueList, type KeyValueItem } from "../../primitives/key-value";

const fmtDate = (v: DateInput) => formatShortDate(v, { year: "always" });

export type CredentialStatus = "valid" | "expired" | "revoked";
export type CredentialKind = "identity" | "age" | "membership" | "education" | "employment" | "license" | "health" | "custom";

export interface CredentialClaim {
  key: string;
  label: React.ReactNode;
  value: React.ReactNode;
  /** Can't be withheld when disclosing. */
  required?: boolean;
  mono?: boolean;
}

export interface Credential {
  id: string;
  /** Credential type, e.g. "Age over 18". */
  type: string;
  kind?: CredentialKind;
  issuer: { name: string; domain?: string; verified?: boolean; iconUrl?: string };
  holder?: React.ReactNode;
  issuedAt?: DateInput;
  expiresAt?: DateInput | null;
  /** Explicit status; otherwise derived from `expiresAt`. */
  status?: CredentialStatus;
  /** Each presentation is a fresh, unlinkable proof. */
  unlinkable?: boolean;
  /** Single-use copies. */
  oneTime?: boolean;
  remainingUses?: number;
  claims?: CredentialClaim[];
}

/** Status from explicit value or expiry. */
export function credentialStatus(c: Pick<Credential, "status" | "expiresAt">, now: number = Date.now()): CredentialStatus {
  if (c.status) return c.status;
  const expires = toMs(c.expiresAt);
  if (expires !== undefined && expires <= now) return "expired";
  return "valid";
}

const statusMeta: Record<CredentialStatus, { label: string; color: BadgeColor }> = {
  valid: { label: "Valid", color: "success" },
  expired: { label: "Expired", color: "warning" },
  revoked: { label: "Revoked", color: "destructive" },
};

/** Card gradients per credential kind. */
export const credentialGradients: Record<CredentialKind, string> = {
  identity: "linear-gradient(135deg, var(--color-brand-600, #4f46e5), var(--color-brand-900, #1e1b4b))",
  age: "linear-gradient(135deg, #0f766e, #134e4a)",
  membership: "linear-gradient(135deg, #b45309, #78350f)",
  education: "linear-gradient(135deg, #7c3aed, #3b0764)",
  employment: "linear-gradient(135deg, #0369a1, #0c4a6e)",
  license: "linear-gradient(135deg, #be123c, #4c0519)",
  health: "linear-gradient(135deg, #15803d, #14532d)",
  custom: "linear-gradient(135deg, #3f3f46, #18181b)",
};

function CredentialChips({ c, inverse }: { c: Credential; inverse?: boolean }) {
  const chipClass = inverse ? "border-white/25 bg-white/15 text-white" : undefined;
  return (
    <>
      {c.unlinkable && (
        <Badge size="sm" variant={inverse ? "outline" : "soft"} color="brand" className={chipClass} leadingIcon={<RiEyeOffLine aria-hidden />}>
          Unlinkable
        </Badge>
      )}
      {c.oneTime && (
        <Badge size="sm" variant={inverse ? "outline" : "soft"} color="neutral" className={chipClass} leadingIcon={<RiTicket2Line aria-hidden />}>
          {c.remainingUses != null ? `${c.remainingUses} ${pluralize(c.remainingUses, "use")} left` : "One-time"}
        </Badge>
      )}
    </>
  );
}

export interface CredentialCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "onClick"> {
  credential: Credential;
  /** `card` is the wallet visual, `row` a compact list row. */
  variant?: "card" | "row";
  /** Makes the card/row a button. */
  onClick?: (credential: Credential) => void;
  /** Override the gradient (CSS background). */
  background?: string;
  now?: number;
}

/** Verifiable credential as a gradient wallet card or a compact row. */
export const CredentialCard = React.forwardRef<HTMLElement, CredentialCardProps>(
  ({ credential: c, variant = "card", onClick, background, now, className, ...props }, ref) => {
    const status = credentialStatus(c, now);
    const interactive = !!onClick;
    const Comp = (interactive ? "button" : "div") as "div";
    const shared = {
      ref: ref as React.Ref<HTMLDivElement>,
      "data-slot": "credential-card",
      "data-variant": variant,
      "data-status": status,
      ...(interactive ? { type: "button", onClick: () => onClick?.(c) } : {}),
      ...props,
    };
    const issuer = (
      <span className="inline-flex min-w-0 items-center gap-1">
        <span className="truncate">{c.issuer.name}</span>
        {c.issuer.verified && (
          <>
            <RiVerifiedBadgeFill aria-hidden className="size-3.5 shrink-0" />
            <span className="sr-only">(verified issuer)</span>
          </>
        )}
      </span>
    );

    if (variant === "row") {
      const claimNames = c.claims?.map((cl) => (typeof cl.label === "string" ? cl.label : cl.key)).join(", ");
      return (
        <Comp
          {...shared}
          className={cn(
            "flex w-full items-center gap-3 rounded-box px-3 py-3 text-left",
            interactive && cn("group/credential transition-colors hover:bg-accent", focusRing),
            className
          )}
        >
          <Favicon domain={c.issuer.domain ?? c.issuer.name} src={c.issuer.iconUrl} shape="square" className="size-9 rounded-md" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">{c.type}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {issuer}
              {claimNames && <span className="truncate">· {claimNames}</span>}
            </span>
            {(c.unlinkable || c.oneTime || status !== "valid") && (
              <span className="mt-1 flex flex-wrap gap-1">
                {status !== "valid" && (
                  <Badge size="sm" color={statusMeta[status].color}>
                    {statusMeta[status].label}
                  </Badge>
                )}
                <CredentialChips c={c} />
              </span>
            )}
          </span>
          {interactive && <RiArrowRightSLine aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/credential:translate-x-0.5" />}
        </Comp>
      );
    }

    return (
      <Comp
        {...shared}
        className={cn(
          "relative flex aspect-[1.586] w-full max-w-sm flex-col justify-between overflow-hidden rounded-2xl p-5 text-left text-white shadow-lg",
          interactive && cn("transition-transform hover:-translate-y-0.5", focusRing),
          status !== "valid" && "saturate-[0.35]",
          className
        )}
        style={{ background: background ?? credentialGradients[c.kind ?? "custom"], ...props.style }}
      >
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-white/10" />
        <span aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 size-56 rounded-full bg-black/10" />
        <span className="relative flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-white/85">
            <Favicon domain={c.issuer.domain ?? c.issuer.name} src={c.issuer.iconUrl} shape="square" className="size-6 rounded-md ring-1 ring-white/30" />
            {issuer}
          </span>
          <span
            className={cn(
              "inline-flex h-5 shrink-0 items-center rounded-control px-1.5 text-2xs font-semibold uppercase tracking-wide",
              status === "valid" ? "bg-white/20 text-white" : status === "expired" ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground"
            )}
          >
            {statusMeta[status].label}
          </span>
        </span>
        <span className="relative grid gap-1">
          <span className="flex items-center gap-1.5 text-2xs uppercase tracking-[0.14em] text-white/70">
            <RiShieldCheckLine aria-hidden className="size-3.5" />
            Verifiable credential
          </span>
          <span className="text-xl font-semibold leading-tight tracking-tight">{c.type}</span>
          {c.holder && <span className="truncate text-sm text-white/85">{c.holder}</span>}
        </span>
        <span className="relative flex flex-wrap items-end justify-between gap-2">
          <span className="flex gap-4 text-2xs text-white/70">
            {c.issuedAt != null && (
              <span className="grid">
                <span className="uppercase tracking-wide">Issued</span>
                <span className="text-xs font-medium text-white">{fmtDate(c.issuedAt)}</span>
              </span>
            )}
            <span className="grid">
              <span className="uppercase tracking-wide">Expires</span>
              <span className="text-xs font-medium text-white">{c.expiresAt != null ? fmtDate(c.expiresAt) : "Never"}</span>
            </span>
          </span>
          <span className="flex flex-wrap gap-1">
            <CredentialChips c={c} inverse />
          </span>
        </span>
      </Comp>
    );
  }
);
CredentialCard.displayName = "CredentialCard";

/* ------------------------------------------------------------------ */
/* CredentialDetail                                                    */
/* ------------------------------------------------------------------ */

export interface CredentialDetailProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  credential: Credential;
  /** Selective disclosure: show a checkbox per claim. */
  selectable?: boolean;
  /** Disclosed claim keys (controlled). */
  value?: string[];
  /** Default: required claims only. */
  defaultValue?: string[];
  onValueChange?: (keys: string[]) => void;
  /** Show the metadata block (issuer, dates, status). Default true. */
  showMeta?: boolean;
  now?: number;
}

/** Credential metadata plus its claims, with optional per-claim disclosure checkboxes. */
export const CredentialDetail = React.forwardRef<HTMLDivElement, CredentialDetailProps>(
  ({ credential: c, selectable, value, defaultValue, onValueChange, showMeta = true, now, className, ...props }, ref) => {
    const claims = c.claims ?? [];
    const required = claims.filter((cl) => cl.required).map((cl) => cl.key);
    const [chosen, setSelected] = useControllableState({
      value,
      defaultValue: defaultValue ?? required,
      onChange: onValueChange,
    });
    // Required claims are always disclosed, even when `value`/`defaultValue` leaves them out.
    const missing = required.filter((k) => !chosen.includes(k));
    const selected = missing.length ? [...missing, ...chosen] : chosen;
    const status = credentialStatus(c, now);
    const meta: KeyValueItem[] = [
      {
        key: "issuer",
        label: "Issuer",
        value: (
          <span className="inline-flex items-center gap-1.5">
            {c.issuer.name}
            {c.issuer.verified && (
              <Badge size="sm" color="success" leadingIcon={<RiVerifiedBadgeFill aria-hidden />}>
                Verified
              </Badge>
            )}
          </span>
        ),
      },
      ...(c.holder ? [{ key: "holder", label: "Holder", value: c.holder }] : []),
      ...(c.issuedAt != null ? [{ key: "issued", label: "Issued", value: fmtDate(c.issuedAt) }] : []),
      { key: "expires", label: "Expires", value: c.expiresAt != null ? fmtDate(c.expiresAt) : "Never" },
      {
        key: "status",
        label: "Status",
        value: (
          <Badge size="sm" color={statusMeta[status].color}>
            {statusMeta[status].label}
          </Badge>
        ),
      },
    ];
    const items: KeyValueItem[] = claims.map((cl) => {
      const id = `claim-${c.id}-${cl.key}`.replace(/[^a-z0-9_-]/gi, "_");
      return {
        key: cl.key,
        mono: cl.mono,
        label: selectable ? (
          <span className="inline-flex items-center gap-2">
            <Checkbox
              id={id}
              size="sm"
              checked={selected.includes(cl.key)}
              disabled={cl.required}
              onCheckedChange={(v) =>
                setSelected(v === true ? [...selected.filter((k) => k !== cl.key), cl.key] : selected.filter((k) => k !== cl.key))
              }
            />
            <label htmlFor={id} className="cursor-pointer">
              {cl.label}
              {cl.required && <span className="ml-1 text-2xs text-muted-foreground">(required)</span>}
            </label>
          </span>
        ) : (
          cl.label
        ),
        value: selectable && !selected.includes(cl.key) ? <span className="text-muted-foreground">Withheld</span> : cl.value,
      };
    });
    return (
      <div ref={ref} data-slot="credential-detail" className={cn("flex flex-col gap-4", className)} {...props}>
        {showMeta && <KeyValueList items={meta} />}
        {(c.unlinkable || c.oneTime) && (
          <div className="flex flex-wrap gap-1.5">
            <CredentialChips c={c} />
          </div>
        )}
        {claims.length > 0 && (
          <div className="grid gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {selectable ? `Disclose ${selected.length} of ${claims.length} claims` : "Claims"}
            </p>
            <KeyValueList items={items} />
          </div>
        )}
      </div>
    );
  }
);
CredentialDetail.displayName = "CredentialDetail";
