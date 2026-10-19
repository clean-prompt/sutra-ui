import * as React from "react";
import {
  RiArrowRightSLine,
  RiCheckLine,
  RiDeleteBin6Line,
  RiErrorWarningLine,
  RiFolderLine,
  RiGlobalLine,
  RiKey2Line,
  RiLockLine,
  RiMoneyDollarCircleLine,
  RiEyeLine,
  RiSettings3Line,
  RiToolsLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useAsyncAction } from "../../hooks/use-async-action";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Badge, type BadgeColor } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { Chip } from "../../primitives/chip";
import { SheetBody, Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../../primitives/dialog";
import { SearchInput } from "../../primitives/input";
import { JsonViewer } from "../../patterns/json-viewer";
import { LogViewer, type LogLine } from "../../patterns/log-viewer";
import { RadioCard, RadioGroup } from "../../primitives/radio";
import { SecretRow } from "./secret-row";
import { Spinner } from "../../primitives/spinner";
import { Switch } from "../../primitives/switch";
import { SimpleTooltip } from "../../primitives/tooltip";

/* ------------------------------------------------------------------ */
/* Hint tags                                                           */
/* ------------------------------------------------------------------ */

export type ToolHint = "read-only" | "destructive" | "network" | "filesystem" | "costly";

export const TOOL_HINTS: ToolHint[] = ["read-only", "destructive", "network", "filesystem", "costly"];

const hintMeta: Record<ToolHint, { label: string; color: BadgeColor; icon: React.ReactNode; long: string }> = {
  "read-only": { label: "Read-only", color: "neutral", icon: <RiEyeLine aria-hidden />, long: "Only reads data; never changes anything." },
  destructive: { label: "Destructive", color: "destructive", icon: <RiDeleteBin6Line aria-hidden />, long: "Can delete or overwrite data." },
  network: { label: "Network", color: "info", icon: <RiGlobalLine aria-hidden />, long: "Talks to external services over the network." },
  filesystem: { label: "Filesystem", color: "warning", icon: <RiFolderLine aria-hidden />, long: "Reads or writes files on this machine." },
  costly: { label: "Costly", color: "orange", icon: <RiMoneyDollarCircleLine aria-hidden />, long: "May incur usage charges." },
};

export interface ToolHintTagProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  hint: ToolHint;
}

/** Small tag describing a tool's side effects. */
export const ToolHintTag = React.forwardRef<HTMLSpanElement, ToolHintTagProps>(({ hint, className, ...props }, ref) => {
  const meta = hintMeta[hint];
  return (
    <Badge
      ref={ref}
      size="sm"
      variant="outline"
      color={meta.color}
      title={meta.long}
      data-hint={hint}
      leadingIcon={<span aria-hidden className="[&_svg]:size-3">{meta.icon}</span>}
      className={className}
      {...props}
    >
      {meta.label}
    </Badge>
  );
});
ToolHintTag.displayName = "ToolHintTag";

/* ------------------------------------------------------------------ */
/* ToolToggleList                                                      */
/* ------------------------------------------------------------------ */

export interface ToolToggleItem {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  hints?: ToolHint[];
  /** JSON schema of the tool's input, shown in the expanded row. */
  inputSchema?: unknown;
  /** Frozen by policy. A string is used as the reason. */
  locked?: boolean | string;
  deprecated?: boolean;
}

export interface ToolToggleRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onToggle"> {
  tool: ToolToggleItem;
  /** Controlled switch state. */
  checked?: boolean;
  /** Initial switch state when uncontrolled. Defaults to `tool.enabled`. */
  defaultChecked?: boolean;
  dirty?: boolean;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onCheckedChange?: (checked: boolean) => void;
}

const LOCK_REASON = "Managed by your organization";

/** One tool row: name, hint tags, lock state, switch and an expandable detail. */
export const ToolToggleRow = React.memo(
  React.forwardRef<HTMLDivElement, ToolToggleRowProps>(
    (
      {
        tool,
        checked: checkedProp,
        defaultChecked,
        dirty,
        expanded: expandedProp,
        defaultExpanded = false,
        onExpandedChange,
        onCheckedChange,
        className,
        ...props
      },
      ref
    ) => {
      const [checked, setChecked] = useControllableState<boolean>({
        value: checkedProp,
        defaultValue: defaultChecked ?? tool.enabled,
        onChange: onCheckedChange,
      });
      const [expanded, setExpanded] = useControllableState<boolean>({
        value: expandedProp,
        defaultValue: defaultExpanded,
        onChange: onExpandedChange,
      });
      const locked = Boolean(tool.locked);
      const lockReason = typeof tool.locked === "string" ? tool.locked : LOCK_REASON;
      const detailId = React.useId();
      const expandable = Boolean(tool.description || tool.inputSchema);
      return (
        <div
          ref={ref}
          role="listitem"
          data-slot="tool-toggle-row"
          data-tool={tool.id}
          data-locked={locked || undefined}
          data-dirty={dirty || undefined}
          className={cn("border-b border-border last:border-b-0", locked && "bg-muted/40", expanded && "bg-subtle", className)}
          {...props}
        >
          <div className="flex min-h-11 items-center gap-2 px-3 py-1.5">
            <button
              type="button"
              aria-expanded={expandable ? expanded : undefined}
              aria-controls={expandable && expanded ? detailId : undefined}
              disabled={!expandable}
              onClick={() => setExpanded(!expanded)}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left disabled:cursor-default",
                focusRing
              )}
            >
              <RiArrowRightSLine
                aria-hidden
                className={cn(
                  "size-4 shrink-0 text-muted-foreground chevron-turn",
                  expanded && "rotate-90",
                  !expandable && "invisible"
                )}
              />
              <span
                className={cn(
                  "truncate font-mono text-xs font-medium",
                  tool.deprecated ? "text-muted-foreground line-through" : "text-foreground"
                )}
              >
                {tool.name}
              </span>
              {dirty && <span aria-label="Unsaved" className="size-1.5 shrink-0 rounded-full bg-primary" />}
            </button>
            <div className="hidden shrink-0 items-center gap-1 sm:flex">
              {tool.deprecated && (
                <Badge size="sm" color="gray">
                  Deprecated
                </Badge>
              )}
              {(tool.hints ?? []).map((h) => (
                <ToolHintTag key={h} hint={h} />
              ))}
            </div>
            {locked && (
              <SimpleTooltip content={lockReason}>
                <span className="inline-flex shrink-0 items-center gap-1 text-2xs text-muted-foreground" tabIndex={0}>
                  <RiLockLine aria-hidden className="size-3.5" />
                  <span className="sr-only sm:not-sr-only">{lockReason}</span>
                </span>
              </SimpleTooltip>
            )}
            <Switch
              size="sm"
              checked={checked}
              disabled={locked}
              onCheckedChange={(v) => !locked && setChecked(v)}
              aria-label={`Enable ${tool.name}`}
            />
          </div>
          {expandable && expanded && (
            <div id={detailId} className="space-y-3 px-3 pb-3 pl-9">
              <div className="flex flex-wrap gap-1 sm:hidden">
                {(tool.hints ?? []).map((h) => (
                  <ToolHintTag key={h} hint={h} />
                ))}
              </div>
              {tool.description && <p className="text-sm text-muted-foreground">{tool.description}</p>}
              {tool.inputSchema != null && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Input schema</p>
                  <JsonViewer data={tool.inputSchema} label={`${tool.name} input schema`} toolbar={false} maxHeight={240} defaultExpandDepth={2} />
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
  )
);
ToolToggleRow.displayName = "ToolToggleRow";

export interface ToolToggleListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  tools: ToolToggleItem[];
  /** Called with the full enabled map and the ids that changed. May return a promise. */
  onSave?: (enabled: Record<string, boolean>, changed: string[]) => void | Promise<void>;
  onDiscard?: () => void;
  /** Fires on every draft change. */
  onDraftChange?: (enabled: Record<string, boolean>, changed: string[]) => void;
  /** Max height of the scrolling list (keeps long lists cheap to lay out). */
  maxHeight?: number | string;
  showDeprecated?: boolean;
  defaultShowDeprecated?: boolean;
  onShowDeprecatedChange?: (show: boolean) => void;
  /** Hide the search + filter toolbar. */
  hideToolbar?: boolean;
  label?: string;
  /** Shown when no tool matches the search or filters. Default "No tools match". */
  emptyState?: React.ReactNode;
}

function baselineOf(tools: ToolToggleItem[]) {
  const map: Record<string, boolean> = {};
  for (const t of tools) map[t.id] = t.enabled;
  return map;
}

/** Tool list with per-tool switches, filters, bulk actions, policy locks and a sticky unsaved-changes footer. */
export const ToolToggleList = React.forwardRef<HTMLDivElement, ToolToggleListProps>(
  (
    {
      tools,
      onSave,
      onDiscard,
      onDraftChange,
      maxHeight,
      showDeprecated: showDeprecatedProp,
      defaultShowDeprecated = false,
      onShowDeprecatedChange,
      hideToolbar,
      label = "Tools",
      emptyState = "No tools match",
      className,
      ...props
    },
    ref
  ) => {
    const [baseline, setBaseline] = React.useState(() => baselineOf(tools));
    const [draft, setDraft] = React.useState(() => baselineOf(tools));
    const toolsKey = tools.map((t) => `${t.id}:${t.enabled ? 1 : 0}`).join(",");
    React.useEffect(() => {
      const b = baselineOf(tools);
      setBaseline(b);
      setDraft(b);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toolsKey]);
    const [query, setQuery] = React.useState("");
    const [hintFilter, setHintFilter] = React.useState<ToolHint[]>([]);
    const [expanded, setExpanded] = React.useState<string | null>(null);
    const saveAction = useAsyncAction(
      async () => {
        await onSave?.(draft, changed);
        setBaseline(draft);
      },
      { fallbackMessage: "Could not save changes" }
    );
    const { busy: saving, error, setError } = saveAction;
    const [showDeprecated, setShowDeprecated] = useControllableState({
      value: showDeprecatedProp,
      defaultValue: defaultShowDeprecated,
      onChange: onShowDeprecatedChange,
    });
    const deprecatedCount = tools.filter((t) => t.deprecated).length;
    const presentHints = TOOL_HINTS.filter((h) => tools.some((t) => t.hints?.includes(h)));

    const changed = React.useMemo(() => tools.filter((t) => draft[t.id] !== baseline[t.id]).map((t) => t.id), [tools, draft, baseline]);

    const visible = React.useMemo(() => {
      const q = query.trim().toLowerCase();
      return tools.filter((t) => {
        if (t.deprecated && !showDeprecated) return false;
        if (hintFilter.length && !hintFilter.some((h) => t.hints?.includes(h))) return false;
        if (q && !t.name.toLowerCase().includes(q) && !(t.description ?? "").toLowerCase().includes(q)) return false;
        return true;
      });
    }, [tools, query, hintFilter, showDeprecated]);

    const update = (next: Record<string, boolean>) => {
      setDraft(next);
      setError(null);
      onDraftChange?.(next, tools.filter((t) => next[t.id] !== baseline[t.id]).map((t) => t.id));
    };
    const setOne = React.useCallback(
      (id: string, v: boolean) => update({ ...draft, [id]: v }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [draft, baseline, tools]
    );
    const bulk = (v: boolean) => {
      const next = { ...draft };
      for (const t of visible) if (!t.locked) next[t.id] = v;
      update(next);
    };
    const discard = () => {
      setDraft(baseline);
      setError(null);
      onDiscard?.();
    };
    const save = () => void saveAction.run();
    const enabledCount = tools.filter((t) => draft[t.id]).length;
    const togglable = visible.filter((t) => !t.locked);

    return (
      <div ref={ref} data-slot="tool-toggle-list" className={cn("flex flex-col rounded-box border border-border bg-card shadow-xs", className)} {...props}>
        {!hideToolbar && (
          <div className="space-y-2 border-b border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                size="sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClear={() => setQuery("")}
                clearable
                placeholder="Search tools…"
                aria-label="Search tools"
                wrapperClassName="min-w-40 flex-1"
                className="min-w-40 flex-1"
              />
              <Button size="sm" variant="outline" onClick={() => bulk(true)} disabled={togglable.length === 0}>
                Enable all
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulk(false)} disabled={togglable.length === 0}>
                Disable all
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {presentHints.length > 0 && (
                <div role="group" aria-label="Filter by hint" className="flex flex-wrap gap-1.5">
                  {presentHints.map((h) => (
                    <Chip
                      key={h}
                      size="sm"
                      selected={hintFilter.includes(h)}
                      onSelectedChange={(sel) => setHintFilter((f) => (sel ? [...f, h] : f.filter((x) => x !== h)))}
                    >
                      {hintMeta[h].label}
                    </Chip>
                  ))}
                </div>
              )}
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                {enabledCount} of {tools.length} enabled
              </span>
              {deprecatedCount > 0 && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Switch size="sm" checked={showDeprecated} onCheckedChange={setShowDeprecated} aria-label="Show deprecated" />
                  Show deprecated ({deprecatedCount})
                </label>
              )}
            </div>
          </div>
        )}
        <div
          role="list"
          aria-label={label}
          className="overflow-y-auto scrollbar-thin"
          style={maxHeight != null ? { maxHeight } : undefined}
        >
          {visible.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{emptyState}</p>
          ) : (
            visible.map((t) => (
              <ToolToggleRow
                key={t.id}
                tool={t}
                checked={Boolean(draft[t.id])}
                dirty={draft[t.id] !== baseline[t.id]}
                expanded={expanded === t.id}
                onExpandedChange={(open) => setExpanded(open ? t.id : null)}
                onCheckedChange={(v) => setOne(t.id, v)}
              />
            ))
          )}
        </div>
        {changed.length > 0 && (
          <div
            role="region"
            aria-label="Unsaved changes"
            className="sticky bottom-0 flex flex-wrap items-center gap-2 rounded-b-box border-t border-border bg-popover/95 px-3 py-2 shadow-lg backdrop-blur"
          >
            <span role="status" className="text-sm font-medium text-foreground">
              {changed.length} unsaved {changed.length === 1 ? "change" : "changes"}
            </span>
            {error && (
              <span role="alert" className="inline-flex items-center gap-1 text-xs text-destructive">
                <RiErrorWarningLine aria-hidden className="size-3.5" />
                {error}
              </span>
            )}
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="ghost" onClick={discard} disabled={saving}>
                Discard
              </Button>
              <Button size="sm" onClick={save} loading={saving}>
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
);
ToolToggleList.displayName = "ToolToggleList";

/* ------------------------------------------------------------------ */
/* ToolsetCard                                                         */
/* ------------------------------------------------------------------ */

export type ToolsetHealth = "configured" | "needs-keys" | "error";

const healthMeta: Record<ToolsetHealth, { label: string; color: BadgeColor; icon: React.ReactNode }> = {
  configured: { label: "Configured", color: "success", icon: <RiCheckLine aria-hidden /> },
  "needs-keys": { label: "Needs keys", color: "warning", icon: <RiKey2Line aria-hidden /> },
  error: { label: "Error", color: "destructive", icon: <RiErrorWarningLine aria-hidden /> },
};

export interface ToolsetHealthPillProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  health: ToolsetHealth;
}

/** Configured / Needs keys / Error pill. */
export const ToolsetHealthPill = React.forwardRef<HTMLSpanElement, ToolsetHealthPillProps>(({ health, ...props }, ref) => {
  const meta = healthMeta[health];
  return (
    <Badge ref={ref} size="sm" color={meta.color} data-health={health} leadingIcon={<span aria-hidden className="[&_svg]:size-3">{meta.icon}</span>} {...props}>
      {meta.label}
    </Badge>
  );
});
ToolsetHealthPill.displayName = "ToolsetHealthPill";

export interface ToolsetCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  name: string;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  toolCount?: number;
  enabled?: boolean;
  defaultEnabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  health?: ToolsetHealth;
  /** Error or hint shown under the description. */
  healthMessage?: React.ReactNode;
  onConfigure?: () => void;
  disabled?: boolean;
}

/** Toolset summary card: icon, description, tool count, enabled switch, health pill and Configure. */
export const ToolsetCard = React.forwardRef<HTMLDivElement, ToolsetCardProps>(
  (
    {
      name,
      icon,
      description,
      toolCount,
      enabled: enabledProp,
      defaultEnabled = false,
      onEnabledChange,
      health,
      healthMessage,
      onConfigure,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const [enabled, setEnabled] = useControllableState({ value: enabledProp, defaultValue: defaultEnabled, onChange: onEnabledChange });
    const titleId = React.useId();
    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={titleId}
        data-slot="toolset-card"
        className={cn(
          "flex flex-col gap-3 rounded-box border border-border bg-card p-4 shadow-xs transition-colors",
          !enabled && "bg-subtle",
          className
        )}
        {...props}
      >
        <div className="flex items-start gap-3">
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-box border border-border bg-background text-foreground [&_svg]:size-[18px]">
            {icon ?? <RiToolsLine aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <h3 id={titleId} className="truncate text-sm font-semibold text-foreground">
              {name}
            </h3>
            {toolCount != null && (
              <p className="text-xs text-muted-foreground tabular-nums">
                {toolCount} {toolCount === 1 ? "tool" : "tools"}
              </p>
            )}
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} disabled={disabled} aria-label={`Enable ${name}`} />
        </div>
        {description != null && <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>}
        {healthMessage != null && (
          <p className={cn("text-xs", health === "error" ? "text-destructive" : "text-muted-foreground")}>{healthMessage}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2">
          {health ? <ToolsetHealthPill health={health} /> : <span />}
          {onConfigure && (
            <Button size="sm" variant={health === "needs-keys" ? "soft" : "ghost"} leadingIcon={<RiSettings3Line aria-hidden />} onClick={onConfigure}>
              Configure
            </Button>
          )}
        </div>
      </div>
    );
  }
);
ToolsetCard.displayName = "ToolsetCard";

/* ------------------------------------------------------------------ */
/* ToolsetProviderDrawer                                               */
/* ------------------------------------------------------------------ */

export interface ToolsetCredentialField {
  key: string;
  label: string;
  description?: React.ReactNode;
  /** "Get a key" link. */
  getKeyUrl?: string;
  /** Whether a value is stored. */
  isSet: boolean;
  /** Masked/stored value to show in the secret field (optional). */
  value?: string;
  optional?: boolean;
}

export interface ToolsetProvider {
  id: string;
  name: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Short tag, e.g. "Free tier" or "Recommended". */
  tag?: string;
  fields?: ToolsetCredentialField[];
}

export type ToolsetInstallStatus = "idle" | "running" | "success" | "error";

export interface ToolsetProviderDrawerProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  enabled?: boolean;
  defaultEnabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  providers: ToolsetProvider[];
  provider?: string;
  defaultProvider?: string;
  onProviderChange?: (id: string) => void;
  /** Store a credential. May return a promise. */
  onSaveCredential?: (providerId: string, key: string, value: string) => void | Promise<void>;
  onClearCredential?: (providerId: string, key: string) => void;
  /** Post-setup install step (e.g. pip install). Omit to hide. */
  onInstall?: () => void;
  installStatus?: ToolsetInstallStatus;
  installLog?: readonly LogLine[];
  installLabel?: React.ReactNode;
  className?: string;
}

function CredentialRow({
  field,
  onSave,
  onClear,
}: {
  field: ToolsetCredentialField;
  onSave?: (value: string) => void | Promise<void>;
  onClear?: () => void;
}) {
  return (
    <SecretRow
      layout="stacked"
      name={field.key}
      label={field.label}
      isSet={field.isSet}
      value={field.value}
      description={field.description}
      optional={field.optional}
      getKeyUrl={field.getKeyUrl}
      onSave={onSave}
      onClear={onClear}
    />
  );
}

const installStatusMeta: Record<ToolsetInstallStatus, { label: string; color: BadgeColor }> = {
  idle: { label: "Not installed", color: "neutral" },
  running: { label: "Installing…", color: "info" },
  success: { label: "Installed", color: "success" },
  error: { label: "Install failed", color: "destructive" },
};

/** Side sheet to configure a toolset: on/off, backend provider, credentials and a post-setup install step. */
export const ToolsetProviderDrawer = React.forwardRef<HTMLDivElement, ToolsetProviderDrawerProps>(function ToolsetProviderDrawer({
  open,
  defaultOpen,
  onOpenChange,
  title,
  description,
  enabled: enabledProp,
  defaultEnabled = true,
  onEnabledChange,
  providers,
  provider: providerProp,
  defaultProvider,
  onProviderChange,
  onSaveCredential,
  onClearCredential,
  onInstall,
  installStatus = "idle",
  installLog,
  installLabel = "Run setup",
  className,
}, ref) {
  const [enabled, setEnabled] = useControllableState({ value: enabledProp, defaultValue: defaultEnabled, onChange: onEnabledChange });
  const [chosenProvider, setProvider] = useControllableState({
    value: providerProp,
    defaultValue: defaultProvider ?? providers[0]?.id ?? "",
    onChange: onProviderChange,
  });
  // Uncontrolled with no valid choice yet (e.g. providers loaded after mount): fall back to the first one.
  const provider =
    providerProp === undefined && !providers.some((p) => p.id === chosenProvider) ? (providers[0]?.id ?? chosenProvider) : chosenProvider;
  const current = providers.find((p) => p.id === provider);
  const st = installStatusMeta[installStatus];
  return (
    <Sheet open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <SheetContent ref={ref} side="right" className={cn("w-full max-w-lg gap-0 overflow-y-auto p-0 sm:max-w-lg", className)}>
        <SheetHeader className="border-b border-border p-5 pr-12">
          <SheetTitle>{title}</SheetTitle>
          {description != null ? <SheetDescription>{description}</SheetDescription> : <SheetDescription className="sr-only">Configure {title}</SheetDescription>}
        </SheetHeader>
        <SheetBody className="flex-1 space-y-6 p-5">
          <label className="flex items-center justify-between gap-3 rounded-box border border-border p-3">
            <span>
              <span className="block text-sm font-medium text-foreground">Enabled</span>
              <span className="block text-xs text-muted-foreground">Make these tools available to the agent.</span>
            </span>
            <Switch checked={enabled} onCheckedChange={setEnabled} aria-label={`Enable ${title}`} />
          </label>
          <fieldset className={cn("space-y-2", !enabled && "opacity-60")} disabled={!enabled}>
            <legend className="mb-2 text-sm font-medium text-foreground">Provider</legend>
            <RadioGroup value={provider} onValueChange={setProvider} aria-label="Provider" className="grid gap-2">
              {providers.map((p) => (
                <RadioCard
                  key={p.id}
                  value={p.id}
                  icon={p.icon}
                  label={
                    <span className="flex flex-wrap items-center gap-1.5">
                      {p.name}
                      {p.tag && (
                        <Badge size="sm" color="neutral">
                          {p.tag}
                        </Badge>
                      )}
                      {p.id === provider && (
                        <Badge size="sm" color="brand">
                          Selected
                        </Badge>
                      )}
                    </span>
                  }
                  description={p.description}
                />
              ))}
            </RadioGroup>
          </fieldset>
          {current?.fields && current.fields.length > 0 && (
            <section aria-label="Credentials" className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Credentials</h3>
              {current.fields.map((f) => (
                <CredentialRow
                  key={`${current.id}:${f.key}`}
                  field={f}
                  onSave={(v) => onSaveCredential?.(current.id, f.key, v)}
                  onClear={onClearCredential ? () => onClearCredential(current.id, f.key) : undefined}
                />
              ))}
            </section>
          )}
          {onInstall && (
            <section aria-label="Setup" className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-foreground">Setup</h3>
                <Badge size="sm" color={st.color} data-install-status={installStatus} leadingIcon={installStatus === "running" ? <Spinner size="xs" /> : undefined}>
                  {st.label}
                </Badge>
                <Button size="sm" variant="outline" className="ml-auto" onClick={onInstall} disabled={installStatus === "running"}>
                  {installStatus === "error" ? "Retry" : installLabel}
                </Button>
              </div>
              {installLog && installLog.length > 0 && (
                <LogViewer
                  lines={installLog}
                  height={180}
                  hideToolbar
                  status={installStatus === "running" ? "live" : installStatus === "error" ? "error" : "idle"}
                  aria-label="Setup log"
                />
              )}
            </section>
          )}
        </SheetBody>
        <SheetFooter className="border-t border-border p-4">
          <SheetClose asChild>
            <Button variant="secondary">Done</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
ToolsetProviderDrawer.displayName = "ToolsetProviderDrawer";
