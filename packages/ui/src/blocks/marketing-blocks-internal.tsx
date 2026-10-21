/** Private helpers of the marketing blocks: tier labels, seeded gradient art, monogram, date and count formats, and pills. */
import * as React from "react";
import { RiStarFill } from "@remixicon/react";
import { cn } from "../lib/cn";
import { formatCompact } from "../lib/format";
import { hashString } from "../lib/hash";
import { initials } from "../lib/text";
import { formatShortDate } from "../lib/time";
import { type BadgeColor } from "../primitives/badge";
import type { MarketplaceTier } from "./marketing-blocks-model";

export const tierMeta: Record<MarketplaceTier, { label: string; color: BadgeColor }> = {
  official: { label: "Official", color: "brand" },
  verified: { label: "Verified", color: "info" },
  community: { label: "Community", color: "neutral" },
};

export const hueOf = (seed: string) => hashString(seed) % 360;

/** Deterministic gradient for a seed (no images, no network). */
export function seedGradient(seed: string) {
  const h = hueOf(seed);
  return `radial-gradient(120% 140% at 0% 0%, oklch(0.78 0.13 ${h}) 0%, transparent 60%), linear-gradient(135deg, oklch(0.62 0.16 ${(h + 40) % 360}), oklch(0.42 0.14 ${(h + 90) % 360}))`;
}

export function GradientArt({ seed, className, children }: { seed: string; className?: string; children?: React.ReactNode }) {
  const h = hueOf(seed);
  return (
    <div aria-hidden className={cn("relative overflow-hidden", className)} style={{ background: seedGradient(seed) }}>
      <svg className="absolute inset-0 size-full opacity-30 mix-blend-overlay" preserveAspectRatio="none" viewBox="0 0 200 100">
        <circle cx={40 + (h % 120)} cy="20" r="46" fill="white" />
        <circle cx={160 - (h % 80)} cy="96" r="36" fill="white" />
      </svg>
      {children}
    </div>
  );
}

export function Monogram({ name, className }: { name: string; className?: string }) {
  const letters = initials(name, { mode: "first-two" });
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-box font-semibold text-white shadow-sm ring-2 ring-background", className)}
      style={{ background: seedGradient(name) }}
    >
      {letters}
    </span>
  );
}

export const formatDate = (iso: string) => formatShortDate(iso, { locale: "en-US", year: "always" });

export const formatCount = (n: number) => formatCompact(n, { wholeAbove: 10 });

export function Pill({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex h-5 items-center gap-1 rounded-control border border-border bg-background px-1.5 text-2xs font-medium text-muted-foreground [&_svg]:size-3", className)}
      {...props}
    >
      {children}
    </span>
  );
}

export function StarPill({ stars }: { stars: number }) {
  return (
    <Pill>
      <RiStarFill aria-hidden className="text-warning" />
      <span>
        {formatCount(stars)}
        <span className="sr-only"> stars</span>
      </span>
    </Pill>
  );
}
