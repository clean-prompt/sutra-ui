/** Skills: the SkillCard and SkillDetail. */
import * as React from "react";
import { RiAlertLine, RiArchiveLine, RiCloseCircleLine, RiEditLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { ConfirmDialog } from "../../primitives/dialog";
import { InlineAlert, InlineAlertDescription, InlineAlertTitle } from "../../primitives/inline-alert";
import { KeyValue, KeyValueList } from "../../primitives/key-value";
import { Markdown } from "../../patterns/markdown";
import { Switch } from "../../primitives/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../primitives/tabs";
import { ProvenancePill, TrustBadge, type CapabilityProvenance, type CapabilityTrustLevel } from "./capabilities";
import { type SecurityScanVerdictProps, SecurityScanVerdict } from "./extensions-catalog-scan";

/* ------------------------------------------------------------------ */
/* SkillCard / SkillDetail                                             */
/* ------------------------------------------------------------------ */

export interface SkillToolsetRef {
  name: string;
  icon?: React.ReactNode;
}

export interface SkillSummary {
  id: string;
  name: string;
  description?: string;
  provenance: CapabilityProvenance;
  category?: string;
  toolsets?: SkillToolsetRef[];
  enabled: boolean;
  trust?: CapabilityTrustLevel;
  /** Flagged by a scan; shows a warning. */
  flagged?: boolean;
}

export interface SkillCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** The skill to show (name, description, source, enabled state). */
  skill: SkillSummary;
  /** Marks the card as the selected one in a list. */
  selected?: boolean;
  /** Called when the card is pressed. */
  onSelect?: () => void;
  /** Called with the new state when the user flips the enable switch. */
  onEnabledChange?: (enabled: boolean) => void;
}

function ToolsetIcons({ toolsets }: { toolsets?: SkillToolsetRef[] }) {
  if (!toolsets?.length) return null;
  return (
    <ul aria-label="Toolsets" className="flex items-center gap-1">
      {toolsets.map((t) => (
        <li key={t.name} title={t.name} className="flex size-6 items-center justify-center rounded-md border border-border bg-background text-muted-foreground [&_svg]:size-3.5">
          {t.icon ? <span aria-hidden>{t.icon}</span> : <span aria-hidden className="text-2xs font-semibold">{t.name[0]?.toUpperCase()}</span>}
          <span className="sr-only">{t.name}</span>
        </li>
      ))}
    </ul>
  );
}

/** Skill list card: name, description, provenance, category, toolset icons and an enable switch. */
export const SkillCard = React.forwardRef<HTMLDivElement, SkillCardProps>(({ skill, selected, onSelect, onEnabledChange, className, ...props }, ref) => {
  const titleId = React.useId();
  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={titleId}
      data-slot="skill-card"
      data-selected={selected || undefined}
      className={cn(
        "relative flex gap-3 rounded-box border border-border bg-card p-3 shadow-xs transition-colors hover:border-border-strong",
        selected && "border-primary ring-1 ring-primary",
        skill.flagged && "border-destructive/50",
        className
      )}
      {...props}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {onSelect ? (
            <button type="button" onClick={onSelect} aria-pressed={selected} className={cn("truncate rounded-sm text-start font-mono text-sm font-semibold text-foreground hover:underline", focusRing)}>
              <span id={titleId}>{skill.name}</span>
            </button>
          ) : (
            <h3 id={titleId} className="truncate font-mono text-sm font-semibold text-foreground">
              {skill.name}
            </h3>
          )}
          <ProvenancePill provenance={skill.provenance} />
          {skill.flagged && (
            <Badge size="sm" color="destructive" leadingIcon={<RiAlertLine aria-hidden className="size-3" />}>
              Flagged
            </Badge>
          )}
        </div>
        {skill.description && <p className="line-clamp-2 text-sm text-muted-foreground">{skill.description}</p>}
        <div className="flex items-center gap-2">
          {skill.category && <span className="text-xs text-muted-foreground">{skill.category}</span>}
          <ToolsetIcons toolsets={skill.toolsets} />
        </div>
      </div>
      {onEnabledChange && (
        <Switch size="sm" checked={skill.enabled} onCheckedChange={onEnabledChange} aria-label={`Enable ${skill.name}`} disabled={skill.flagged} />
      )}
    </div>
  );
});
SkillCard.displayName = "SkillCard";

export interface SkillDetailProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The skill to show (name, description, source, enabled state). */
  skill: SkillSummary;
  /** SKILL.md body (markdown). */
  markdown?: string;
  /** Parsed SKILL.md frontmatter, shown as key/value rows on the Frontmatter tab. */
  frontmatter?: Record<string, unknown>;
  /** Security scan result for the skill; props of `SecurityScanVerdict`, shown on the Security tab. */
  scan?: SecurityScanVerdictProps;
  /** Controlled active tab (`preview`, `frontmatter` or `security`). */
  tab?: string;
  /** Initially active tab when `tab` is not controlled. */
  defaultTab?: "preview" | "frontmatter" | "security";
  /** Called with the tab id when the user switches tabs. */
  onTabChange?: (tab: string) => void;
  /** Called with the new state when the user flips the enable switch. */
  onEnabledChange?: (enabled: boolean) => void;
  /** Called after the user confirms archiving the skill; the button is hidden when unset. */
  onArchive?: () => void | Promise<void>;
  /** Called when the user presses Edit; the button is hidden when unset. */
  onEdit?: () => void;
  /** Called when the user closes the detail view; the close button is hidden when unset. */
  onClose?: () => void;
}

function formatFrontmatterValue(v: unknown): React.ReactNode {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v.map(String).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Skill detail: header with actions, SKILL.md preview, frontmatter and security scan tabs. */
export const SkillDetail = React.forwardRef<HTMLDivElement, SkillDetailProps>(
  ({ skill, markdown, frontmatter, scan, tab, defaultTab = "preview", onTabChange, onEnabledChange, onArchive, onEdit, onClose, className, ...props }, ref) => {
    const [current, setCurrent] = useControllableState<string>({ value: tab, defaultValue: defaultTab, onChange: onTabChange });
    return (
      <div ref={ref} data-slot="skill-detail" className={cn("space-y-4", className)} {...props}>
        <header className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="font-mono text-base font-semibold text-foreground">{skill.name}</h2>
                <ProvenancePill provenance={skill.provenance} />
                {skill.trust && <TrustBadge level={skill.trust} />}
              </div>
              {skill.description && <p className="text-sm text-muted-foreground">{skill.description}</p>}
              <div className="flex items-center gap-2">
                {skill.category && <span className="text-xs text-muted-foreground">{skill.category}</span>}
                <ToolsetIcons toolsets={skill.toolsets} />
              </div>
            </div>
            {onClose && (
              <Button size="icon-sm" variant="ghost" aria-label="Close" onClick={onClose}>
                <RiCloseCircleLine aria-hidden />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onEnabledChange && (
              <label className="flex items-center gap-2 text-sm">
                <Switch size="sm" checked={skill.enabled} onCheckedChange={onEnabledChange} disabled={skill.flagged} aria-label={`Enable ${skill.name}`} />
                {skill.enabled ? "Enabled" : "Disabled"}
              </label>
            )}
            <span className="flex-1" />
            {onEdit && (
              <Button size="sm" variant="outline" leadingIcon={<RiEditLine aria-hidden />} onClick={onEdit}>
                Edit
              </Button>
            )}
            {onArchive && (
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="ghost" leadingIcon={<RiArchiveLine aria-hidden />}>
                    Archive
                  </Button>
                }
                tone="destructive"
                title={`Archive ${skill.name}?`}
                description="The agent stops loading this skill. You can restore it from the archive."
                confirmLabel="Archive"
                onConfirm={onArchive}
              />
            )}
          </div>
          {skill.flagged && (
            <InlineAlert variant="destructive">
              <InlineAlertTitle>Flagged by security scan</InlineAlertTitle>
              <InlineAlertDescription>This skill stays disabled until the findings are reviewed.</InlineAlertDescription>
            </InlineAlert>
          )}
        </header>
        <Tabs value={current} onValueChange={setCurrent} variant="underline" size="sm" className="gap-3">
          <TabsList aria-label="Skill details">
            <TabsTrigger value="preview">SKILL.md</TabsTrigger>
            <TabsTrigger value="frontmatter">Frontmatter</TabsTrigger>
            {scan && (
              <TabsTrigger value="security" badge={scan.findings?.length || undefined}>
                Security
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="preview">
            {markdown ? (
              <div className="max-h-[480px] overflow-y-auto rounded-box border border-border bg-card p-4 scrollbar-thin">
                <Markdown>{markdown}</Markdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No SKILL.md content.</p>
            )}
          </TabsContent>
          <TabsContent value="frontmatter">
            {frontmatter && Object.keys(frontmatter).length ? (
              <KeyValueList mono>
                {Object.entries(frontmatter).map(([k, v]) => (
                  <KeyValue key={k} label={k} value={formatFrontmatterValue(v)} />
                ))}
              </KeyValueList>
            ) : (
              <p className="text-sm text-muted-foreground">No frontmatter.</p>
            )}
          </TabsContent>
          {scan && (
            <TabsContent value="security">
              <SecurityScanVerdict {...scan} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    );
  }
);
SkillDetail.displayName = "SkillDetail";
