/* AccessGate: request-access flow for admin-approved apps (request, pending, approved, denied, collected). */
import * as React from "react";
import { RiCheckLine, RiCloseCircleLine, RiErrorWarningLine, RiHourglassLine, RiKey2Line, RiShieldCheckLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { toValidDate } from "../../lib/time";
import { useAsyncAction } from "../../hooks/use-async-action";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Spinner } from "../../primitives/spinner";
import { Textarea } from "../../primitives/textarea";
import { CheckboxField } from "../../primitives/checkbox";
import { Field, FieldHint, FieldLabel } from "../../primitives/field";
import { InlineAlert } from "../../primitives/inline-alert";
import { FeaturedIcon, type FeaturedIconColor, type IconComponent } from "../../assets/icons";

/* ------------------------------------------------------------------ */
/* AccessGate                                                          */
/* ------------------------------------------------------------------ */

export type AccessGateStatus = "none" | "pending" | "approved" | "denied" | "delivered" | "collected";

export interface AccessGateGrant {
  /** Allowed resources (e.g. models); `null`/absent means all. */
  resources?: string[] | null;
  ttlDays?: number | null;
  canEvict?: boolean;
}

export interface AccessGateRecord {
  status: AccessGateStatus;
  createdAt?: Date | number | string;
  decidedAt?: Date | number | string;
  keyName?: string;
  grant?: AccessGateGrant;
}

export interface AccessGateScopeOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
}

export interface AccessGateAdapter {
  /** Send the request. Resolves to the new record (usually `pending`). */
  request: (input: { purpose: string; scopes: string[] }) => Promise<AccessGateRecord>;
  /** Poll for a decision while pending. A tick is skipped while the previous check is in flight; `signal` aborts on unmount. */
  check?: (signal?: AbortSignal) => Promise<AccessGateRecord>;
  /** Collect the issued key once approved. */
  claim?: () => Promise<unknown>;
}

export interface AccessGateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Functions that send, poll and cancel the access request against your backend. */
  adapter: AccessGateAdapter;
  /** Controlled access request record (status and details); drives which step is shown. */
  record?: AccessGateRecord;
  /** Initial record when `record` is not controlled. */
  defaultRecord?: AccessGateRecord;
  /** Called with the record whenever the request changes state. */
  onRecordChange?: (record: AccessGateRecord) => void;
  /** What is being requested, e.g. "GPU access". */
  resourceName?: string;
  /** Who is signed in. */
  signedInAs?: React.ReactNode;
  /** Scopes the user can ask for in the form. */
  scopes?: AccessGateScopeOption[];
  /** Scope ids ticked initially. */
  defaultScopes?: string[];
  /** Placeholder of the purpose field. */
  purposePlaceholder?: string;
  /** Poll interval while pending. Default 5000ms. */
  pollInterval?: number;
  /** Called once the user has collected the approved access (for example after copying the credential). */
  onCollected?: () => void;
  /** Escape hatch shown under the form, e.g. "Sign in with kunji instead". */
  otherWays?: React.ReactNode;
}



const fmtDate = (v: Date | number | string | undefined) => toValidDate(v)?.toLocaleString() ?? null;

/** Request-access flow for admin-approved apps: request → pending → approved (collect key) | denied. */
export const AccessGate = React.forwardRef<HTMLDivElement, AccessGateProps>(
  (
    {
      adapter,
      record: recordProp,
      defaultRecord = { status: "none" },
      onRecordChange,
      resourceName = "access",
      signedInAs,
      scopes,
      defaultScopes = [],
      purposePlaceholder = "e.g. running the benchmark suite against the new model",
      pollInterval = 5000,
      onCollected,
      otherWays,
      className,
      ...props
    },
    ref
  ) => {
    const [record, setRecord] = useControllableState<AccessGateRecord>({
      value: recordProp,
      defaultValue: defaultRecord,
      onChange: onRecordChange,
    });
    const [purpose, setPurpose] = React.useState("");
    const [picked, setPicked] = React.useState<string[]>(defaultScopes);
    const { run, busy, error } = useAsyncAction((fn: () => Promise<void>) => fn());
    const purposeId = React.useId();
    const status = record.status;
    const check = adapter.check;

    React.useEffect(() => {
      if (status !== "pending" || !check) return;
      const ctrl = new AbortController();
      let inFlight = false;
      const id = setInterval(() => {
        if (inFlight) return;
        inFlight = true;
        check(ctrl.signal)
          .then(
            (r) => {
              if (!ctrl.signal.aborted && r.status !== "pending") setRecord(r);
            },
            () => {}
          )
          .finally(() => {
            inFlight = false;
          });
      }, pollInterval);
      return () => {
        ctrl.abort();
        clearInterval(id);
      };
    }, [status, check, pollInterval, setRecord]);


    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!purpose.trim()) return;
      void run(async () => setRecord(await adapter.request({ purpose: purpose.trim(), scopes: picked })));
    };

    const form = (label: string) => (
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field>
          <FieldLabel htmlFor={purposeId}>What do you need it for?</FieldLabel>
          <Textarea id={purposeId} rows={4} value={purpose} placeholder={purposePlaceholder} onChange={(e) => setPurpose(e.target.value)} />
          <FieldHint>Saying what you need makes the owner&apos;s decision easy.</FieldHint>
        </Field>
        {scopes && scopes.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-foreground">Access requested</legend>
            {scopes.map((s) => (
              <CheckboxField
                key={s.value}
                label={s.label}
                description={s.description}
                checked={picked.includes(s.value)}
                onCheckedChange={(v) => setPicked((p) => (v === true ? [...p, s.value] : p.filter((x) => x !== s.value)))}
              />
            ))}
          </fieldset>
        )}
        <Button type="submit" className="self-start" loading={busy} disabled={!purpose.trim()}>
          {label}
        </Button>
      </form>
    );

    const heading: Record<AccessGateStatus, string> = {
      none: `Request ${resourceName}`,
      pending: "Waiting for approval",
      approved: "Your access is ready",
      denied: "Request declined",
      delivered: "Your key needs replacing",
      collected: "You're all set",
    };
    const icons: Record<AccessGateStatus, [IconComponent, FeaturedIconColor]> = {
      none: [RiKey2Line, "brand"],
      pending: [RiHourglassLine, "warning"],
      approved: [RiShieldCheckLine, "success"],
      denied: [RiCloseCircleLine, "destructive"],
      delivered: [RiErrorWarningLine, "warning"],
      collected: [RiCheckLine, "success"],
    };
    const [Icon, color] = icons[status];

    return (
      <div
        ref={ref}
        data-slot="access-gate"
        data-status={status}
        className={cn("flex w-full max-w-lg flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm", className)}
        {...props}
      >
        <div className="flex items-start gap-4">
          <FeaturedIcon icon={Icon} color={color} size="md" />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{heading[status]}</h2>
            {signedInAs && (
              <p className="text-sm text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{signedInAs}</span>. That proves who you are but doesn&apos;t itself grant{" "}
                {resourceName}.
              </p>
            )}
          </div>
        </div>

        {error && <InlineAlert variant="destructive">{error}</InlineAlert>}

        {status === "none" && form("Send request")}

        {status === "pending" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {record.createdAt ? <>Your request was sent on {fmtDate(record.createdAt)} and is </> : "Your request is "}
              waiting for the owner to decide. You can leave this page: we&apos;ll let you know, and the decision will be here when you come back.
            </p>
            <p role="status" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner size="xs" /> Checking for a decision…
            </p>
          </div>
        )}

        {status === "approved" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              A key has been issued{record.keyName && <> as <span className="font-mono text-foreground">{record.keyName}</span></>}. Collect it to
              store it in this browser. The server erases its copy as it hands it over.
            </p>
            {record.grant && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 rounded-control border border-border bg-subtle px-4 py-3 text-sm">
                <dt className="text-muted-foreground">Allowed</dt>
                <dd className="text-foreground">{record.grant.resources?.length ? record.grant.resources.join(", ") : "everything"}</dd>
                <dt className="text-muted-foreground">Expires</dt>
                <dd className="text-foreground">{record.grant.ttlDays ? `in ${record.grant.ttlDays} days` : "never"}</dd>
                {record.grant.canEvict != null && (
                  <>
                    <dt className="text-muted-foreground">Can evict others</dt>
                    <dd className="text-foreground">{record.grant.canEvict ? "yes" : "no"}</dd>
                  </>
                )}
              </dl>
            )}
            {adapter.claim && (
              <Button
                className="self-start"
                leadingIcon={<RiKey2Line aria-hidden />}
                loading={busy}
                onClick={() =>
                  void run(async () => {
                    await adapter.claim!();
                    setRecord({ ...record, status: "collected" });
                    onCollected?.();
                  })
                }
              >
                Collect your key
              </Button>
            )}
          </div>
        )}

        {status === "collected" && (
          <InlineAlert variant="success">Key collected. This browser can use {resourceName} now.</InlineAlert>
        )}

        {status === "denied" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              This request was declined{record.decidedAt && <> on {fmtDate(record.decidedAt)}</>}. You can ask again with more context.
            </p>
            {form("Ask again")}
          </div>
        )}

        {status === "delivered" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              A key was issued to this account{record.keyName && <> (<span className="font-mono text-foreground">{record.keyName}</span>)</>}, but it
              can&apos;t be used any more: it may have been revoked or expired. Asking for a new one fixes it.
            </p>
            {form("Ask for a new key")}
          </div>
        )}

        {otherWays && <div className="border-t border-border pt-4 text-sm text-muted-foreground">{otherWays}</div>}
      </div>
    );
  }
);
AccessGate.displayName = "AccessGate";

