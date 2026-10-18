import * as React from "react";
import { RiCheckLine, RiCloseLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { clamp } from "../lib/math";
import type { Tone } from "../lib/tone";
import { ProgressSegments } from "../primitives/progress";

export interface PasswordRequirement {
  label: React.ReactNode;
  test: (password: string) => boolean;
}

/** Default checklist: length ≥ 8, uppercase, lowercase, number, symbol. */
export const defaultPasswordRequirements: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "One number", test: (p) => /\d/.test(p) },
  { label: "One symbol", test: (p) => /[^A-Za-z0-9\s]/.test(p) },
];

const COMMON = new Set(["password", "passw0rd", "qwerty", "letmein", "welcome", "admin", "iloveyou", "abc123", "123456", "monkey", "dragon"]);

/** A common password, possibly with digits or symbols around it ("Password123!"), but not a longer word that starts with one. */
function isCommon(password: string) {
  const lower = password.toLowerCase();
  const core = lower.replace(/^[^a-z]+|[^a-z]+$/g, "");
  return COMMON.has(core) || COMMON.has(lower.replace(/[^a-z0-9]+$/, ""));
}

/** Words in a passphrase ("correct horse battery staple"): runs of 2+ letters separated by spaces or punctuation. */
const passphraseWords = (password: string) => password.split(/[\s\-_.,]+/).filter((w) => /^\p{L}{2,}$/u.test(w)).length;

/** Scores a password from 0 (empty) to 4 (strong) using length and character variety. */
export function getPasswordScore(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9\s]/].filter((re) => re.test(password)).length;
  const len = password.length;
  if (len < 6 || /^(.)\1+$/.test(password) || isCommon(password)) return 1;
  // A long passphrase of several words is strong even in one character class.
  const words = len >= 16 ? passphraseWords(password) : 0;
  let score = 0;
  if (len >= 8) score++;
  if (len >= 12) score++;
  if (variety >= 3 || words >= 4) score++;
  if (variety === 4 || (len >= 16 && variety >= 2) || words >= 5) score++;
  if (variety <= 1 && words < 4) score = Math.min(score, 1);
  return clamp(score, 1, 4) as 1 | 2 | 3 | 4;
}

const levels: { label: string; tone: Tone; bar?: string; text: string }[] = [
  { label: "", tone: "neutral", text: "text-muted-foreground" },
  { label: "Weak", tone: "destructive", text: "text-destructive" },
  { label: "Fair", tone: "warning", text: "text-warning-soft-foreground" },
  { label: "Good", tone: "success", bar: "bg-success/70", text: "text-success" },
  { label: "Strong", tone: "success", text: "text-success" },
];

export interface PasswordStrengthProps extends React.HTMLAttributes<HTMLDivElement> {
  password: string;
  /** Checklist items; pass `[]` to hide the checklist. */
  requirements?: PasswordRequirement[];
  /** Custom labels for scores 1–4. */
  labels?: [string, string, string, string];
  /** Override the computed score (0–4). */
  score?: 0 | 1 | 2 | 3 | 4;
  showLabel?: boolean;
}

/** Segmented strength meter with a label and live requirement checklist. */
export const PasswordStrength = React.forwardRef<HTMLDivElement, PasswordStrengthProps>(
  (
    {
      password,
      requirements = defaultPasswordRequirements,
      labels,
      score: scoreProp,
      showLabel = true,
      className,
      ...props
    },
    ref
  ) => {
    const score = scoreProp ?? getPasswordScore(password);
    const level = levels[score];
    const label = score > 0 ? (labels?.[score - 1] ?? level.label) : "";

    return (
      <div ref={ref} className={cn("flex flex-col gap-2.5", className)} {...props}>
        <div className="flex items-center gap-3">
          <ProgressSegments
            role="meter"
            label="Password strength"
            segments={4}
            max={4}
            value={score}
            aria-valuetext={label || "No password"}
            tone={level.tone}
            indicatorClassName={level.bar}
            className="flex-1 gap-1.5"
          />
          {showLabel && (
            <span
              aria-live="polite"
              className={cn("min-w-12 text-right text-xs font-medium transition-colors", level.text)}
            >
              {label}
            </span>
          )}
        </div>
        {requirements.length > 0 && (
          <ul className="grid gap-1.5 sm:grid-cols-2" aria-label="Password requirements">
            {requirements.map((req, i) => {
              const met = req.test(password);
              return (
                <li
                  key={i}
                  className={cn(
                    "flex items-center gap-2 text-xs transition-colors duration-200",
                    met ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full transition-colors duration-200 [&_svg]:size-3",
                      met ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {met ? <RiCheckLine aria-hidden /> : <RiCloseLine aria-hidden />}
                  </span>
                  <span>{req.label}</span>
                  <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }
);
PasswordStrength.displayName = "PasswordStrength";
