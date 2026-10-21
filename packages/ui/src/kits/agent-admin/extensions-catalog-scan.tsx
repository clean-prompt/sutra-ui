/** Security scanning: the SecurityScanVerdict, scan finding types and `countScanFindings`. */
import * as React from "react";
import { RiAlertLine, RiErrorWarningLine, RiShieldCheckLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { normalizeTone, toneClasses, type Tone, type ToneInput } from "../../lib/tone";
import { Badge, type BadgeColor } from "../../primitives/badge";

/* ------------------------------------------------------------------ */
/* SecurityScanVerdict                                                 */
/* ------------------------------------------------------------------ */

export type ScanVerdictLevel = "safe" | "caution" | "dangerous";
export type ScanSeverity = "critical" | "high" | "medium" | "low";

export const SCAN_SEVERITIES: ScanSeverity[] = ["critical", "high", "medium", "low"];

export interface ScanFinding {
  id?: string;
  severity: ScanSeverity;
  title: string;
  file?: string;
  line?: number;
  rule?: string;
  detail?: string;
}

/** Count findings per severity. */
export function countScanFindings(findings: ScanFinding[]): Record<ScanSeverity, number> {
  const out: Record<ScanSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) out[f.severity] += 1;
  return out;
}

const verdictMeta: Record<ScanVerdictLevel, { label: string; tone: string; icon: React.ReactNode }> = {
  safe: { label: "Safe", tone: cn("border-success/40", toneClasses.soft.success), icon: <RiShieldCheckLine aria-hidden /> },
  caution: { label: "Caution", tone: cn("border-warning/40", toneClasses.soft.warning), icon: <RiAlertLine aria-hidden /> },
  dangerous: { label: "Dangerous", tone: cn("border-destructive/40", toneClasses.soft.destructive), icon: <RiErrorWarningLine aria-hidden /> },
};

const severityColor: Record<ScanSeverity, BadgeColor> = { critical: "destructive", high: "orange", medium: "warning", low: "neutral" };

export interface SecurityScanVerdictProps extends React.HTMLAttributes<HTMLElement> {
  /** Overall scan result (`safe`, `caution` or `dangerous`); sets the headline and tone. */
  verdict: ScanVerdictLevel;
  /** Individual issues the scan found, listed under the verdict. */
  findings?: ScanFinding[];
  /** Policy outcome, e.g. "Blocked by policy" or "Allowed". */
  policy?: string;
  /** Colour of the policy badge: `allow` (success), `block` (destructive) or any `Tone`. `warn` is a deprecated alias of `warning`. */
  policyTone?: "allow" | "block" | ToneInput;
  /** Preformatted scan time. */
  scannedAt?: string;
  /** Name of the scanner that produced the verdict. */
  scanner?: string;
}

/** Security scan result: verdict, policy, per-severity counts and findings with file:line. */
export const SecurityScanVerdict = React.forwardRef<HTMLElement, SecurityScanVerdictProps>(
  ({ verdict, findings = [], policy, policyTone = "allow", scannedAt, scanner, className, ...props }, ref) => {
    const meta = verdictMeta[verdict];
    const policyColor: Tone = policyTone === "allow" ? "success" : policyTone === "block" ? "destructive" : normalizeTone(policyTone, "success");
    const counts = countScanFindings(findings);
    const sorted = [...findings].sort((a, b) => SCAN_SEVERITIES.indexOf(a.severity) - SCAN_SEVERITIES.indexOf(b.severity));
    const headId = React.useId();
    return (
      <section ref={ref} aria-labelledby={headId} data-slot="security-scan-verdict" data-verdict={verdict} className={cn("space-y-3", className)} {...props}>
        <div className={cn("flex flex-wrap items-center gap-3 rounded-box border p-3", meta.tone)}>
          <span aria-hidden className="[&_svg]:size-6">
            {meta.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h3 id={headId} className="text-sm font-semibold">
              Verdict: {meta.label}
            </h3>
            {(scanner || scannedAt) && (
              <p className="text-xs opacity-80">
                {scanner}
                {scanner && scannedAt && " · "}
                {scannedAt}
              </p>
            )}
          </div>
          {policy && (
            <Badge size="sm" variant="solid" color={policyColor} data-policy={policyTone}>
              {policy}
            </Badge>
          )}
        </div>
        <dl className="grid grid-cols-4 gap-2" aria-label="Findings by severity">
          {SCAN_SEVERITIES.map((s) => (
            <div key={s} data-severity={s} className="rounded-box border border-border bg-card px-3 py-2">
              <dt className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{s}</dt>
              <dd className={cn("text-lg font-semibold tabular-nums", counts[s] > 0 && (s === "critical" || s === "high") ? "text-destructive" : "text-foreground")}>
                {counts[s]}
              </dd>
            </div>
          ))}
        </dl>
        {sorted.length > 0 ? (
          <ul aria-label="Findings" className="divide-y divide-border rounded-box border border-border bg-card">
            {sorted.map((f, i) => (
              <li key={f.id ?? i} className="flex items-start gap-2 px-3 py-2">
                <Badge size="sm" color={severityColor[f.severity]} className="mt-0.5 capitalize">
                  {f.severity}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{f.title}</p>
                  {f.detail && <p className="text-xs text-muted-foreground">{f.detail}</p>}
                  {(f.file || f.rule) && (
                    <p className="font-mono text-xs text-muted-foreground">
                      {f.file && (
                        <span>
                          {f.file}
                          {f.line != null && `:${f.line}`}
                        </span>
                      )}
                      {f.file && f.rule && " · "}
                      {f.rule}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No findings.</p>
        )}
      </section>
    );
  }
);
SecurityScanVerdict.displayName = "SecurityScanVerdict";
