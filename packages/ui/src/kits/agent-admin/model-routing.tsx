/** Model routing: ModelInfoCard and ReasoningPill, plus re-exports of the data model, pickers, visibility manager, chain editors and ensemble builder. */
import * as React from "react";
import { RiArrowDownSLine, RiBrainLine, RiFlashlightLine } from "@remixicon/react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { Input } from "../../primitives/input";
import { Switch } from "../../primitives/switch";
import { PopoverContent } from "../../primitives/popover";
import { EffortSlider, defaultEffortLevels, type EffortLevel } from "../agent/agent-mode";
import { formatTokenCount } from "../../lib/token-count";
import { ProviderLogo } from "./llm-providers-logo";
import { type RoutingModel, type RoutingProvider, formatModelPrice, ModelCapabilityChips } from "./model-routing-model";

export * from "./model-routing-model";
export * from "./model-routing-picker";
export * from "./model-routing-visibility";
export * from "./model-routing-chains";
export * from "./model-routing-ensemble";

/* ------------------------------------------------------------------ */
/* ModelInfoCard                                                       */
/* ------------------------------------------------------------------ */

export interface ModelInfoCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** The model to describe (name, context length, pricing, capabilities). */
  model: RoutingModel;
  /** Provider name, monogram and colour shown beside the model; omit for a provider-less card. */
  provider?: Pick<RoutingProvider, "name" | "monogram" | "color">;
  /** Context length override in tokens; `null`/undefined uses the model's own value. */
  contextOverride?: number | null;
  /**
   * Called with a new context length in tokens, or `null` to reset to the model value; the Edit and Reset buttons
   * show only when set.
   */
  onContextOverrideChange?: (tokens: number | null) => void;
}

/** Model details: provider, effective context (override vs auto), capabilities, pricing, cutoff, notes. */
export const ModelInfoCard = React.forwardRef<HTMLDivElement, ModelInfoCardProps>(
  ({ model, provider, contextOverride, onContextOverrideChange, className, ...props }, ref) => {
    const id = React.useId();
    const overridden = contextOverride != null;
    const effective = overridden ? contextOverride : model.contextLength;
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState("");
    const price = formatModelPrice(model);
    return (
      <div ref={ref} data-slot="model-info-card" className={cn("w-full rounded-box border border-border bg-card p-4 shadow-xs", className)} {...props}>
        <div className="flex items-center gap-3">
          {provider && <ProviderLogo name={provider.name} monogram={provider.monogram} color={provider.color} />}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{model.name}</h3>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {provider ? `${provider.name} · ` : ""}
              {model.id}
            </p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Context</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <span className="font-mono tabular-nums text-foreground" data-slot="effective-context">
              {effective != null ? `${formatTokenCount(effective)} tokens` : "Unknown"}
            </span>
            <Badge size="sm" color={overridden ? "warning" : "neutral"}>
              {overridden ? "Override" : "Auto"}
            </Badge>
            {onContextOverrideChange && !editing && (
              <Button
                variant="link"
                size="xs"
                onClick={() => {
                  setDraft(String(effective ?? ""));
                  setEditing(true);
                }}
              >
                {overridden ? "Edit" : "Override"}
              </Button>
            )}
            {onContextOverrideChange && overridden && !editing && (
              <Button variant="link" size="xs" onClick={() => onContextOverrideChange(null)}>
                Use auto{model.contextLength != null ? ` (${formatTokenCount(model.contextLength)})` : ""}
              </Button>
            )}
            {editing && (
              <form
                className="flex items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = Math.round(Number(draft));
                  if (Number.isFinite(n) && n > 0) onContextOverrideChange?.(n);
                  setEditing(false);
                }}
              >
                <Input id={`${id}-ctx`} aria-label="Context length override (tokens)" type="number" min={1} size="sm" value={draft} onChange={(e) => setDraft(e.target.value)} className="w-32" autoFocus />
                <Button type="submit" size="xs">
                  Save
                </Button>
                <Button type="button" variant="ghost" size="xs" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </form>
            )}
          </dd>
          {model.capabilities && model.capabilities.length > 0 && (
            <>
              <dt className="text-muted-foreground">Capabilities</dt>
              <dd>
                <ModelCapabilityChips capabilities={model.capabilities} />
              </dd>
            </>
          )}
          {price && (
            <>
              <dt className="text-muted-foreground">Pricing</dt>
              <dd className="text-foreground">
                {price === "Free" ? "Free" : <>{price} <span className="text-xs text-muted-foreground">in / out per Mtok</span></>}
              </dd>
            </>
          )}
          {model.knowledgeCutoff && (
            <>
              <dt className="text-muted-foreground">Knowledge cutoff</dt>
              <dd className="text-foreground">{model.knowledgeCutoff}</dd>
            </>
          )}
        </dl>
        {model.notes && <div className="mt-3 rounded-control bg-subtle px-3 py-2 text-xs text-muted-foreground">{model.notes}</div>}
      </div>
    );
  }
);
ModelInfoCard.displayName = "ModelInfoCard";

/* ------------------------------------------------------------------ */
/* ReasoningPill                                                       */
/* ------------------------------------------------------------------ */

export interface ReasoningSettings {
  thinking: boolean;
  fast: boolean;
  effort: string;
}

export interface ReasoningPillProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "defaultValue"> {
  /** Controlled reasoning settings (thinking on/off, effort level, fast mode). */
  value?: ReasoningSettings;
  /** Initial settings when `value` is not controlled. */
  defaultValue?: ReasoningSettings;
  /** Called with the new settings when the user changes any control in the popover. */
  onValueChange?: (value: ReasoningSettings) => void;
  /** Effort levels offered in the slider, lowest to highest. */
  levels?: EffortLevel[];
  /** Hide controls the current model doesn't support. */
  supportsThinking?: boolean;
  /** Show the Fast mode switch; set false when the current model has no fast mode. */
  supportsFast?: boolean;
  /** Show the effort slider; set false when the current model has fixed effort. */
  supportsEffort?: boolean;
}

/** Composer pill summarizing thinking / fast / effort, with a popover of toggles and an EffortSlider. */
export const ReasoningPill = React.forwardRef<HTMLButtonElement, ReasoningPillProps>(
  (
    {
      value: valueProp,
      defaultValue = { thinking: true, fast: false, effort: "medium" },
      onValueChange,
      levels = defaultEffortLevels,
      supportsThinking = true,
      supportsFast = true,
      supportsEffort = true,
      className,
      ...props
    },
    ref
  ) => {
    const id = React.useId();
    const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
    const level = levels.find((l) => l.value === value.effort);
    const levelText = typeof level?.label === "string" ? level.label : value.effort;
    const summary = [
      supportsThinking ? (value.thinking ? (supportsEffort ? `Thinking · ${levelText}` : "Thinking") : "Thinking off") : null,
      supportsFast && value.fast ? "Fast" : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Reasoning";
    return (
      <PopoverPrimitive.Root>
        <PopoverPrimitive.Trigger asChild>
          <button
            ref={ref}
            type="button"
            data-slot="reasoning-pill"
            data-thinking={value.thinking || undefined}
            aria-label={`Reasoning: ${summary}`}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-control border px-2.5 text-xs font-medium transition-colors",
              value.thinking && supportsThinking ? "border-primary/30 bg-primary-soft text-primary-soft-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground",
              focusRing,
              className
            )}
            {...props}
          >
            {value.fast && supportsFast ? <RiFlashlightLine aria-hidden className="size-3.5" /> : <RiBrainLine aria-hidden className="size-3.5" />}
            <span>{summary}</span>
            <RiArrowDownSLine aria-hidden className="size-3.5 opacity-60" />
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverContent size="sm" align="start" className="grid grid-cols-1 gap-4" aria-label="Reasoning settings">
          {supportsThinking && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <label htmlFor={`${id}-thinking`} className="text-sm font-medium text-foreground">
                  Thinking
                </label>
                <p className="text-xs text-muted-foreground">Reason step by step before answering</p>
              </div>
              <Switch id={`${id}-thinking`} size="sm" checked={value.thinking} onCheckedChange={(c) => setValue({ ...value, thinking: c })} />
            </div>
          )}
          {supportsFast && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <label htmlFor={`${id}-fast`} className="text-sm font-medium text-foreground">
                  Fast mode
                </label>
                <p className="text-xs text-muted-foreground">Prioritize latency on supported models</p>
              </div>
              <Switch id={`${id}-fast`} size="sm" checked={value.fast} onCheckedChange={(c) => setValue({ ...value, fast: c })} />
            </div>
          )}
          {supportsEffort && (
            <div className="grid grid-cols-1 gap-2">
              <EffortSlider
                levels={levels}
                value={value.effort}
                onValueChange={(effort) => setValue({ ...value, effort })}
                disabled={supportsThinking && !value.thinking}
                tooltip={null}
              />
              {supportsThinking && !value.thinking && <p className="text-xs text-muted-foreground">Turn on thinking to set effort.</p>}
            </div>
          )}
        </PopoverContent>
      </PopoverPrimitive.Root>
    );
  }
);
ReasoningPill.displayName = "ReasoningPill";