import * as React from "react";
import {
  RiArrowLeftLine,
  RiBox3Line,
  RiCheckboxCircleLine,
  RiCloseLine,
  RiComputerLine,
  RiFlagLine,
  RiGlobalLine,
  RiGroupLine,
  RiQuestionLine,
  RiShieldCheckLine,
  RiSparklingLine,
  RiStore2Line,
  RiUserLine,
  RiVerifiedBadgeLine,
} from "@remixicon/react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Badge, type BadgeColor } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { Monogram } from "../../primitives/monogram";
import { SearchInput } from "../../primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../primitives/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../primitives/tabs";
import { SimpleTooltip } from "../../primitives/tooltip";

/* ------------------------------------------------------------------ */
/* ProvenancePill                                                      */
/* ------------------------------------------------------------------ */

export type CapabilityProvenance = "official" | "learned" | "hub" | "community" | "local" | "bundled";

const provenanceMeta: Record<CapabilityProvenance, { label: string; color: BadgeColor; icon: React.ReactNode; hint: string }> = {
  official: { label: "Official", color: "brand", icon: <RiVerifiedBadgeLine aria-hidden />, hint: "Published and maintained by the vendor" },
  learned: { label: "Learned", color: "purple", icon: <RiSparklingLine aria-hidden />, hint: "Written by the agent from experience" },
  hub: { label: "Hub", color: "info", icon: <RiStore2Line aria-hidden />, hint: "Installed from the skills hub" },
  community: { label: "Community", color: "orange", icon: <RiGroupLine aria-hidden />, hint: "Contributed by the community" },
  local: { label: "Local", color: "neutral", icon: <RiComputerLine aria-hidden />, hint: "Lives in a local directory you control" },
  bundled: { label: "Bundled", color: "gray", icon: <RiBox3Line aria-hidden />, hint: "Ships with the agent" },
};

export interface ProvenancePillProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  provenance: CapabilityProvenance;
  size?: "sm" | "md";
  /** Hide the icon. */
  hideIcon?: boolean;
}

/** Where a capability came from: official, learned, hub, community, local or bundled. */
export const ProvenancePill = React.forwardRef<HTMLSpanElement, ProvenancePillProps>(
  ({ provenance, size = "sm", hideIcon, className, ...props }, ref) => {
    const meta = provenanceMeta[provenance];
    return (
      <Badge
        ref={ref}
        color={meta.color}
        size={size}
        title={meta.hint}
        data-provenance={provenance}
        leadingIcon={hideIcon ? undefined : <span aria-hidden className="[&_svg]:size-3">{meta.icon}</span>}
        className={className}
        {...props}
      >
        {meta.label}
      </Badge>
    );
  }
);
ProvenancePill.displayName = "ProvenancePill";

/* ------------------------------------------------------------------ */
/* TrustBadge                                                          */
/* ------------------------------------------------------------------ */

export type CapabilityTrustLevel = "verified" | "trusted" | "community" | "unverified" | "flagged";

export const TRUST_LEVELS: CapabilityTrustLevel[] = ["verified", "trusted", "community", "unverified", "flagged"];

const trustMeta: Record<CapabilityTrustLevel, { label: string; color: BadgeColor; icon: React.ReactNode; explain: string }> = {
  verified: {
    label: "Verified",
    color: "success",
    icon: <RiShieldCheckLine aria-hidden />,
    explain: "Signed by a verified publisher and passed the security scan.",
  },
  trusted: {
    label: "Trusted",
    color: "info",
    icon: <RiCheckboxCircleLine aria-hidden />,
    explain: "From a source you or your organization marked as trusted.",
  },
  community: {
    label: "Community",
    color: "neutral",
    icon: <RiUserLine aria-hidden />,
    explain: "Published by the community. Reviewed by users, not by the vendor.",
  },
  unverified: {
    label: "Unverified",
    color: "warning",
    icon: <RiQuestionLine aria-hidden />,
    explain: "Unknown source with no signature. Review the code before enabling.",
  },
  flagged: {
    label: "Flagged",
    color: "destructive",
    icon: <RiFlagLine aria-hidden />,
    explain: "The security scan or a report flagged this item. It is disabled until reviewed.",
  },
};

/** Plain-language explanation of a trust level (used by the tooltip). */
export function trustExplanation(level: CapabilityTrustLevel) {
  return trustMeta[level].explain;
}

export interface TrustBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  level: CapabilityTrustLevel;
  size?: "sm" | "md";
  /** Override the tooltip explanation. */
  explanation?: React.ReactNode;
  /** Show a 5-step scale next to the label. */
  showScale?: boolean;
}

/** Trust scale badge (verified → flagged) with a tooltip explaining what the level means. */
export const TrustBadge = React.forwardRef<HTMLSpanElement, TrustBadgeProps>(
  ({ level, size = "sm", explanation, showScale, className, ...props }, ref) => {
    const meta = trustMeta[level];
    const step = TRUST_LEVELS.length - TRUST_LEVELS.indexOf(level);
    const descId = React.useId();
    return (
      <SimpleTooltip content={<span className="block max-w-60">{explanation ?? meta.explain}</span>}>
        <span
          ref={ref}
          tabIndex={0}
          aria-describedby={descId}
          data-trust={level}
          className={cn("inline-flex rounded-control outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35", className)}
          {...props}
        >
          <Badge color={meta.color} size={size} leadingIcon={<span aria-hidden className="[&_svg]:size-3">{meta.icon}</span>}>
            {meta.label}
            {showScale && (
              <span aria-hidden className="ml-1 inline-flex gap-px">
                {TRUST_LEVELS.map((_, i) => (
                  <span key={i} className={cn("h-2 w-1 rounded-full", i < step ? "bg-current" : "bg-current/25")} />
                ))}
              </span>
            )}
          </Badge>
          <span id={descId} className="sr-only">
            {typeof explanation === "string" ? explanation : meta.explain}
          </span>
        </span>
      </SimpleTooltip>
    );
  }
);
TrustBadge.displayName = "TrustBadge";

/* ------------------------------------------------------------------ */
/* ScopeChip / ScopeSelector                                           */
/* ------------------------------------------------------------------ */

export const ALL_PROFILES_SCOPE = "__all__";

export interface ScopeChipProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "prefix"> {
  /** Profile name, or `null`/omitted for "All profiles". */
  profile?: string | null;
  /** Prefix label. Default "Applies to". */
  prefix?: React.ReactNode;
}

/** Read-only "Applies to: All profiles / <profile>" chip. */
export const ScopeChip = React.forwardRef<HTMLSpanElement, ScopeChipProps>(
  ({ profile, prefix = "Applies to", className, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="scope-chip"
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-control border border-border bg-background px-2 text-xs shadow-xs",
        className
      )}
      {...props}
    >
      {profile ? <RiUserLine aria-hidden className="size-3.5 text-muted-foreground" /> : <RiGlobalLine aria-hidden className="size-3.5 text-muted-foreground" />}
      <span className="text-muted-foreground">{prefix}:</span>
      <span className="font-medium text-foreground">{profile || "All profiles"}</span>
    </span>
  )
);
ScopeChip.displayName = "ScopeChip";

export interface ScopeSelectorProps {
  /** Available profile names. */
  profiles: string[];
  /** Selected profile, or `null` for all profiles. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (profile: string | null) => void;
  prefix?: React.ReactNode;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}

/** Selector for which profile a capability change applies to. The ref goes to the trigger. */
export const ScopeSelector = React.forwardRef<HTMLButtonElement, ScopeSelectorProps>(function ScopeSelector({
  profiles,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  prefix = "Applies to",
  size = "sm",
  disabled,
  className,
}, ref) {
  const [value, setValue] = useControllableState<string | null>({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const prefixId = React.useId();
  return (
    <Select
      value={value ?? ALL_PROFILES_SCOPE}
      onValueChange={(v) => setValue(v === ALL_PROFILES_SCOPE ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger
        ref={ref}
        size={size}
        aria-labelledby={`${prefixId} ${prefixId}-v`}
        className={cn("w-auto gap-1.5", className)}
      >
        {value ? <RiUserLine aria-hidden className="size-3.5 text-muted-foreground" /> : <RiGlobalLine aria-hidden className="size-3.5 text-muted-foreground" />}
        <span id={prefixId} className="text-muted-foreground">
          {prefix}:
        </span>
        <span id={`${prefixId}-v`} className="font-medium">
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_PROFILES_SCOPE}>All profiles</SelectItem>
        {profiles.map((p) => (
          <SelectItem key={p} value={p}>
            {p}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});
ScopeSelector.displayName = "ScopeSelector";

/* ------------------------------------------------------------------ */
/* CapabilityDetailHeader                                              */
/* ------------------------------------------------------------------ */

export interface CapabilityDetailHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  provenance?: CapabilityProvenance;
  trust?: CapabilityTrustLevel;
  /** Extra badges after provenance/trust. */
  badges?: React.ReactNode;
  /** Buttons on the right. */
  actions?: React.ReactNode;
  /** Shows a close button (detail pane). */
  onClose?: () => void;
}

/** Header of a capability detail pane: icon, title, provenance/trust badges and actions. */
export const CapabilityDetailHeader = React.forwardRef<HTMLElement, CapabilityDetailHeaderProps>(
  ({ icon, title, subtitle, description, provenance, trust, badges, actions, onClose, className, ...props }, ref) => (
    <header ref={ref} data-slot="capability-detail-header" className={cn("flex items-start gap-3", className)} {...props}>
      {icon != null && (
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-box border border-border bg-subtle text-foreground [&_svg]:size-5"
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-base font-semibold text-foreground">{title}</h2>
          {provenance && <ProvenancePill provenance={provenance} />}
          {trust && <TrustBadge level={trust} />}
          {badges}
        </div>
        {subtitle != null && <p className="font-mono text-xs text-muted-foreground">{subtitle}</p>}
        {description != null && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {(actions || onClose) && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {onClose && (
            <Button variant="ghost" size="icon-sm" aria-label="Close details" onClick={onClose}>
              <RiCloseLine aria-hidden />
            </Button>
          )}
        </div>
      )}
    </header>
  )
);
CapabilityDetailHeader.displayName = "CapabilityDetailHeader";

/* ------------------------------------------------------------------ */
/* CapabilitiesShell                                                   */
/* ------------------------------------------------------------------ */

export interface CapabilitiesShellTab {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  /** Badge for attention (e.g. updates available). */
  attention?: boolean;
  content: React.ReactNode;
}

export interface CapabilitiesShellProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "defaultValue"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  tabs: CapabilitiesShellTab[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  search?: string;
  defaultSearch?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
  /** Sort control (e.g. a select) next to the search. */
  sortSlot?: React.ReactNode;
  /** Scope selector slot in the header. */
  scope?: React.ReactNode;
  /** Header actions (e.g. "Add"). */
  actions?: React.ReactNode;
  /** Detail pane content. When set, the shell becomes master/detail. */
  detail?: React.ReactNode;
  /** Called by the mobile back button. */
  onDetailClose?: () => void;
  /** Hide the search toolbar. */
  hideToolbar?: boolean;
}

/** Tabbed Skills / Toolsets / Connectors / Plugins hub with counts, search + sort and a responsive detail pane. */
export const CapabilitiesShell = React.forwardRef<HTMLDivElement, CapabilitiesShellProps>(
  (
    {
      title = "Capabilities",
      description,
      tabs,
      value: valueProp,
      defaultValue,
      onValueChange,
      search: searchProp,
      defaultSearch = "",
      onSearchChange,
      searchPlaceholder,
      sortSlot,
      scope,
      actions,
      detail,
      onDetailClose,
      hideToolbar,
      className,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useControllableState<string>({
      value: valueProp,
      defaultValue: defaultValue ?? tabs[0]?.value ?? "",
      onChange: onValueChange,
    });
    const [search, setSearch] = useControllableState<string>({
      value: searchProp,
      defaultValue: defaultSearch,
      onChange: onSearchChange,
    });
    const active = tabs.find((t) => t.value === value);
    const hasDetail = detail != null && detail !== false;
    const labelText = typeof active?.label === "string" ? active.label.toLowerCase() : "items";
    return (
      <div ref={ref} data-slot="capabilities-shell" className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {description != null && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {scope}
            {actions}
          </div>
        </div>
        <Tabs value={value} onValueChange={setValue} variant="underline" className="gap-0">
          <TabsList aria-label="Capability types" className="overflow-x-auto scrollbar-none">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                icon={t.icon}
                badge={t.count}
                aria-label={t.count != null ? `${typeof t.label === "string" ? t.label : t.value} (${t.count})` : undefined}
              >
                {t.label}
                {t.attention && <span aria-hidden className="size-1.5 rounded-full bg-primary" />}
              </TabsTrigger>
            ))}
          </TabsList>
          {!hideToolbar && (
            <div className="flex flex-wrap items-center gap-2 pt-4">
              <SearchInput
                size="sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch("")}
                clearable
                placeholder={searchPlaceholder ?? `Search ${labelText}…`}
                aria-label={searchPlaceholder ?? `Search ${labelText}`}
                wrapperClassName="min-w-48 flex-1"
                className="min-w-48 flex-1"
              />
              {sortSlot}
            </div>
          )}
          <div
            className={cn(
              "grid min-w-0 gap-4 pt-4",
              hasDetail && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
            )}
          >
            <div className={cn("min-w-0", hasDetail && "hidden lg:block")}>
              {tabs.map((t) => (
                <TabsContent key={t.value} value={t.value} className="mt-0">
                  {t.content}
                </TabsContent>
              ))}
            </div>
            {hasDetail && (
              <aside
                aria-label="Details"
                data-slot="capabilities-detail"
                className="min-w-0 rounded-box border border-border bg-card p-4 shadow-xs lg:sticky lg:top-4 lg:self-start"
              >
                {onDetailClose && (
                  <Button variant="ghost" size="sm" leadingIcon={<RiArrowLeftLine aria-hidden />} onClick={onDetailClose} className="mb-3 lg:hidden">
                    Back
                  </Button>
                )}
                {detail}
              </aside>
            )}
          </div>
        </Tabs>
      </div>
    );
  }
);
CapabilitiesShell.displayName = "CapabilitiesShell";

/* ------------------------------------------------------------------ */
/* CapabilityMonogram                                                  */
/* ------------------------------------------------------------------ */

export interface CapabilityMonogramProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children" | "color"> {
  name: string;
}

/** Monogram tile used when a capability has no icon. A `Monogram` preset (brand gradient, card radius). */
export const CapabilityMonogram = React.forwardRef<HTMLSpanElement, CapabilityMonogramProps>(function CapabilityMonogram(
  { name, className, ...props },
  ref
) {
  return (
    <Monogram
      ref={ref}
      name={name}
      variant="brand"
      size="md"
      data-slot="capability-monogram"
      className={cn("flex size-9 rounded-box", className)}
      {...props}
    />
  );
});
CapabilityMonogram.displayName = "CapabilityMonogram";

