import * as React from "react";
import {
  RiAddLine,
  RiArrowDownSLine,
  RiBrainLine,
  RiCloseLine,
  RiEyeLine,
  RiFlashlightLine,
  RiKey2Line,
  RiLoopLeftLine,
  RiRestartLine,
  RiSearchLine,
  RiStackLine,
  RiToolsLine,
} from "@remixicon/react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { formatCost, pluralize } from "../lib/format";
import { clamp } from "../lib/math";
import { Button } from "./button";
import { Badge } from "./badge";
import { Input } from "./input";
import { Switch } from "./switch";
import { SimpleSelect } from "./select";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { PopoverContent } from "./popover";
import { EmptyState } from "./empty-state";
import { InlineAlert } from "./inline-alert";
import { ReorderableList } from "./reorderable-list";
import { EffortSlider, defaultEffortLevels, type EffortLevel } from "./agent-mode";
import { formatTokenCount, highlightMatch } from "./ai-extras";
import { ProviderLogo } from "./providers";
import { ModelStateGlyph, normalizeModelState } from "./model-state";
import { modelWaitHint, type PickerModel } from "./model-select";

/* ------------------------------------------------------------------ */
/* Types + helpers                                                     */
/* ------------------------------------------------------------------ */

export type ModelCapability = "tools" | "vision" | "reasoning";

export interface RoutingModel extends Pick<PickerModel, "id" | "name" | "state" | "answerSeconds" | "warmSeconds"> {
  /** Context window in tokens. */
  contextLength?: number;
  /** USD per million input tokens. */
  inputPrice?: number;
  /** USD per million output tokens. */
  outputPrice?: number;
  capabilities?: ModelCapability[];
  /** e.g. "2025-03". */
  knowledgeCutoff?: string;
  notes?: React.ReactNode;
  /** The model is itself a mixture-of-agents ensemble. */
  ensemble?: boolean;
}

export interface RoutingProvider {
  id: string;
  name: string;
  monogram?: string;
  color?: string;
  /** Has credentials; unconfigured providers show a "Set up" call to action. */
  configured: boolean;
  models: RoutingModel[];
}

export interface ModelRef {
  providerId: string;
  modelId: string;
}

export const modelRefKey = (ref: ModelRef) => `${ref.providerId}/${ref.modelId}`;
const sameRef = (a?: ModelRef | null, b?: ModelRef | null) => !!a && !!b && a.providerId === b.providerId && a.modelId === b.modelId;

/** Look up the provider and model for a reference. */
export function resolveModelRef(providers: RoutingProvider[], ref: ModelRef | null | undefined) {
  if (!ref) return null;
  const provider = providers.find((p) => p.id === ref.providerId);
  const model = provider?.models.find((m) => m.id === ref.modelId);
  return provider ? { provider, model } : null;
}

/** "$3 / $15" style price per million tokens, or "" when unknown. */
export function formatModelPrice(model: Pick<RoutingModel, "inputPrice" | "outputPrice">) {
  const f = (n: number) => (n === 0 ? "Free" : formatCost(n, { minFraction: 0, locale: "en-US" }));
  if (model.inputPrice == null && model.outputPrice == null) return "";
  if (model.inputPrice === 0 && model.outputPrice === 0) return "Free";
  return [model.inputPrice, model.outputPrice].map((n) => (n == null ? "—" : f(n))).join(" / ");
}

const capabilityMeta: Record<ModelCapability, { label: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: React.AriaAttributes["aria-hidden"] }> }> = {
  tools: { label: "Tools", icon: RiToolsLine },
  vision: { label: "Vision", icon: RiEyeLine },
  reasoning: { label: "Reasoning", icon: RiBrainLine },
};

export interface ModelCapabilityChipsProps extends React.HTMLAttributes<HTMLSpanElement> {
  capabilities?: ModelCapability[];
  size?: "sm" | "md";
}

/** Tools / vision / reasoning chips. */
export const ModelCapabilityChips = React.forwardRef<HTMLSpanElement, ModelCapabilityChipsProps>(
  ({ capabilities = [], size = "sm", className, ...props }, ref) => {
    if (capabilities.length === 0) return null;
    return (
      <span ref={ref} data-slot="model-capabilities" className={cn("inline-flex flex-wrap gap-1", className)} {...props}>
        {capabilities.map((c) => {
          const { label, icon: Icon } = capabilityMeta[c];
          return (
            <Badge key={c} size={size} variant="outline" color="neutral" data-capability={c}>
              <Icon aria-hidden className="text-muted-foreground" />
              {label}
            </Badge>
          );
        })}
      </span>
    );
  }
);
ModelCapabilityChips.displayName = "ModelCapabilityChips";

function ModelRefLabel({ providers, value, className }: { providers: RoutingProvider[]; value: ModelRef; className?: string }) {
  const r = resolveModelRef(providers, value);
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <ProviderLogo name={r?.provider.name ?? value.providerId} monogram={r?.provider.monogram} color={r?.provider.color} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{r?.model?.name ?? value.modelId}</span>
        <span className="block truncate text-xs text-muted-foreground">{r?.provider.name ?? value.providerId}</span>
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* ProviderModelPicker                                                 */
/* ------------------------------------------------------------------ */

export interface ProviderModelPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect" | "defaultValue"> {
  providers: RoutingProvider[];
  /** The current model ("current" tag). */
  value?: ModelRef | null;
  onSelect?: (ref: ModelRef, model: RoutingModel) => void;
  /** Called from an unconfigured provider's "Set up" CTA. */
  onSetupProvider?: (providerId: string) => void;
  /** Actions for the "no providers" empty state (e.g. buttons to keys / OAuth). */
  emptyActions?: React.ReactNode;
  /** Return true to disable a model (shown greyed with `disabledReason`). */
  isModelDisabled?: (ref: ModelRef, model: RoutingModel) => boolean;
  disabledReason?: string;
  autoFocus?: boolean;
}

/** Two-column provider → model picker with search highlighting and arrow-key navigation between columns. */
export const ProviderModelPicker = React.forwardRef<HTMLDivElement, ProviderModelPickerProps>(
  (
    { providers, value, onSelect, onSetupProvider, emptyActions, isModelDisabled, disabledReason, autoFocus, className, ...props },
    ref
  ) => {
    const id = React.useId();
    const [query, setQuery] = React.useState("");
    const initial = providers.find((p) => p.id === value?.providerId) ?? providers.find((p) => p.configured) ?? providers[0];
    const [activeProviderId, setActiveProviderId] = React.useState(initial?.id ?? "");
    const [activeModelIndex, setActiveModelIndex] = React.useState(0);
    const providersRef = React.useRef<HTMLDivElement>(null);
    const modelsRef = React.useRef<HTMLDivElement>(null);
    const searchRef = React.useRef<HTMLInputElement>(null);
    const setupRef = React.useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
      if (autoFocus) searchRef.current?.focus();
    }, [autoFocus]);

    const q = query.trim().toLowerCase();
    const matches = (m: RoutingModel) => !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
    const activeProvider = providers.find((p) => p.id === activeProviderId) ?? providers[0];
    const models = activeProvider ? activeProvider.models.filter(matches) : [];
    const anyConfigured = providers.some((p) => p.configured);
    const providerIndex = Math.max(0, providers.findIndex((p) => p.id === activeProvider?.id));
    const modelIdx = Math.min(activeModelIndex, Math.max(0, models.length - 1));

    React.useEffect(() => {
      if (!q || !activeProvider || activeProvider.models.some(matches)) return;
      const first = providers.find((p) => p.configured && p.models.some(matches));
      if (first) setActiveProviderId(first.id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    React.useEffect(() => {
      document.getElementById(`${id}-m-${modelIdx}`)?.scrollIntoView?.({ block: "nearest" });
    }, [id, modelIdx]);

    const focusProviders = () => providersRef.current?.focus();
    const focusModels = () => {
      if (activeProvider && !activeProvider.configured) setupRef.current?.focus();
      else modelsRef.current?.focus();
    };
    const choose = (m: RoutingModel) => {
      if (!activeProvider) return;
      const r = { providerId: activeProvider.id, modelId: m.id };
      if (isModelDisabled?.(r, m)) return;
      onSelect?.(r, m);
    };
    const selectProvider = (i: number) => {
      const p = providers[clamp(i, 0, providers.length - 1)];
      if (!p) return;
      setActiveProviderId(p.id);
      setActiveModelIndex(0);
    };

    const onProvidersKey = (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") selectProvider(providerIndex + 1);
      else if (e.key === "ArrowUp") selectProvider(providerIndex - 1);
      else if (e.key === "Home") selectProvider(0);
      else if (e.key === "End") selectProvider(providers.length - 1);
      else if (e.key === "ArrowRight" || e.key === "Enter") focusModels();
      else return;
      e.preventDefault();
    };
    const onModelsKey = (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") setActiveModelIndex(Math.min(models.length - 1, modelIdx + 1));
      else if (e.key === "ArrowUp") {
        if (modelIdx === 0) searchRef.current?.focus();
        else setActiveModelIndex(modelIdx - 1);
      } else if (e.key === "Home") setActiveModelIndex(0);
      else if (e.key === "End") setActiveModelIndex(Math.max(0, models.length - 1));
      else if (e.key === "ArrowLeft") focusProviders();
      else if (e.key === "Enter" || e.key === " ") {
        const m = models[modelIdx];
        if (m) choose(m);
      } else return;
      e.preventDefault();
    };

    return (
      <div ref={ref} data-slot="provider-model-picker" className={cn("flex w-full flex-col overflow-hidden rounded-box border border-border bg-popover", className)} {...props}>
        <div className="border-b border-border p-2">
          <Input
            ref={searchRef}
            size="sm"
            leadingIcon={<RiSearchLine aria-hidden />}
            placeholder="Search models"
            aria-label="Search models"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveModelIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                focusModels();
              }
            }}
            className="border-transparent shadow-none"
          />
        </div>
        <div className="grid min-h-64 grid-cols-[minmax(9rem,38%)_1fr]">
          <div
            ref={providersRef}
            role="listbox"
            tabIndex={0}
            aria-label="Providers"
            aria-activedescendant={activeProvider ? `${id}-p-${providerIndex}` : undefined}
            onKeyDown={onProvidersKey}
            className={cn("max-h-80 overflow-y-auto border-r border-border p-1 scrollbar-thin", focusRing, "focus-visible:ring-inset")}
          >
            {providers.map((p, i) => {
              const count = q ? p.models.filter(matches).length : p.models.length;
              const selected = p.id === activeProvider?.id;
              return (
                <div
                  key={p.id}
                  id={`${id}-p-${i}`}
                  role="option"
                  aria-selected={selected}
                  data-configured={p.configured || undefined}
                  onClick={() => selectProvider(i)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-sm",
                    selected ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60",
                    q && count === 0 && "opacity-50"
                  )}
                >
                  <ProviderLogo name={p.name} monogram={p.monogram} color={p.color} size="sm" className={cn(!p.configured && "opacity-60 grayscale")} />
                  <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                  {p.configured ? (
                    <span className="text-2xs tabular-nums text-muted-foreground">{count}</span>
                  ) : (
                    <Badge size="sm" variant="outline" color="neutral">
                      Set up
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
          <div className="min-w-0">
            {providers.length === 0 || !anyConfigured ? (
              <EmptyState
                size="sm"
                icon={<RiKey2Line aria-hidden />}
                title="No providers connected"
                description="Add an API key or sign in with OAuth to choose a model."
                actions={
                  emptyActions ??
                  (activeProvider && onSetupProvider ? (
                    <Button ref={setupRef} size="sm" onClick={() => onSetupProvider(activeProvider.id)}>
                      Set up {activeProvider.name}
                    </Button>
                  ) : undefined)
                }
              />
            ) : activeProvider && !activeProvider.configured ? (
              <div data-slot="provider-setup-cta" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <ProviderLogo name={activeProvider.name} monogram={activeProvider.monogram} color={activeProvider.color} size="lg" />
                <div>
                  <p className="text-sm font-medium text-foreground">{activeProvider.name} isn't set up</p>
                  <p className="text-xs text-muted-foreground">Connect it to use its {activeProvider.models.length || ""} models.</p>
                </div>
                <Button ref={setupRef} size="sm" disabled={!onSetupProvider} onClick={() => onSetupProvider?.(activeProvider.id)}>
                  Set up {activeProvider.name}
                </Button>
              </div>
            ) : (
              <div
                ref={modelsRef}
                role="listbox"
                tabIndex={0}
                aria-label={activeProvider ? `${activeProvider.name} models` : "Models"}
                aria-activedescendant={models.length ? `${id}-m-${modelIdx}` : undefined}
                onKeyDown={onModelsKey}
                className={cn("max-h-80 overflow-y-auto p-1 scrollbar-thin", focusRing, "focus-visible:ring-inset")}
              >
                {models.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">No models match “{query}”</p>}
                {models.map((m, i) => {
                  const r = { providerId: activeProvider!.id, modelId: m.id };
                  const current = sameRef(value, r);
                  const disabled = isModelDisabled?.(r, m) ?? false;
                  const price = formatModelPrice(m);
                  return (
                    <div
                      key={m.id}
                      id={`${id}-m-${i}`}
                      role="option"
                      aria-selected={current}
                      aria-disabled={disabled || undefined}
                      data-active={i === modelIdx || undefined}
                      onMouseMove={() => i !== modelIdx && setActiveModelIndex(i)}
                      onClick={() => choose(m)}
                      className={cn(
                        "cursor-pointer rounded-control px-2.5 py-2",
                        i === modelIdx && "bg-accent",
                        disabled && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {m.state != null && <ModelStateGlyph state={m.state} />}
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{highlightMatch(m.name, query.trim())}</span>
                        {current && (
                          <Badge size="sm" color="brand">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-muted-foreground">
                        <ModelCapabilityChips capabilities={m.capabilities} />
                        {m.contextLength != null && <span>{formatTokenCount(m.contextLength)} ctx</span>}
                        {price && <span>{price === "Free" ? "Free" : `${price} /Mtok`}</span>}
                        {m.state != null && normalizeModelState(m.state) !== "ready" && <span>{modelWaitHint({ ...m, state: m.state })}</span>}
                        {disabled && disabledReason && <span className="text-warning-soft-foreground">{disabledReason}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-border px-3 py-1.5 text-2xs text-muted-foreground">
          <span>↑↓ move</span>
          <span>←→ switch column</span>
          <span>↵ select</span>
        </div>
      </div>
    );
  }
);
ProviderModelPicker.displayName = "ProviderModelPicker";

export interface ProviderModelPickerDialogProps extends Omit<ProviderModelPickerProps, "autoFocus" | "title"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog. */
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
}

/** `ProviderModelPicker` in a modal dialog; closes after a selection. */
export function ProviderModelPickerDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger,
  title = "Choose a model",
  description = "Pick a provider, then a model.",
  onSelect,
  ...props
}: ProviderModelPickerDialogProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent size="lg" className="gap-3">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ProviderModelPicker
          autoFocus
          {...props}
          onSelect={(r, m) => {
            onSelect?.(r, m);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
ProviderModelPickerDialog.displayName = "ProviderModelPickerDialog";

export interface ProviderModelPickerPopoverProps extends Omit<ProviderModelPickerProps, "autoFocus" | "onSelect"> {
  /** Initial model when uncontrolled (no `value`). */
  defaultValue?: ModelRef | null;
  onValueChange?: (ref: ModelRef, model: RoutingModel) => void;
  placeholder?: string;
  triggerClassName?: string;
}

/** Trigger button showing the current model; opens the picker in a popover. */
export function ProviderModelPickerPopover({
  providers,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  placeholder = "Choose a model",
  triggerClassName,
  ...props
}: ProviderModelPickerPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [uncontrolled, setUncontrolled] = React.useState<ModelRef | null>(defaultValue);
  const value = valueProp !== undefined ? valueProp : uncontrolled;
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button variant="outline" className={cn("justify-between gap-2", triggerClassName)} trailingIcon={<RiArrowDownSLine aria-hidden />}>
          {value ? <ModelRefLabel providers={providers} value={value} className="[&_.text-xs]:hidden" /> : placeholder}
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverContent padded={false} align="start" className="w-[min(36rem,calc(100vw-2rem))] border-0 p-0">
        <ProviderModelPicker
          autoFocus
          providers={providers}
          value={value}
          {...props}
          onSelect={(r, m) => {
            if (valueProp === undefined) setUncontrolled(r);
            onValueChange?.(r, m);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </PopoverPrimitive.Root>
  );
}
ProviderModelPickerPopover.displayName = "ProviderModelPickerPopover";

/* ------------------------------------------------------------------ */
/* ModelVisibilityManager                                              */
/* ------------------------------------------------------------------ */

export interface ModelVisibilityState {
  /** Hidden model keys (`providerId/modelId`). */
  hidden: string[];
  /** User-added model ids. */
  custom: ModelRef[];
}

export interface ModelVisibilityManagerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  providers: Pick<RoutingProvider, "id" | "name" | "monogram" | "color" | "models">[];
  value?: ModelVisibilityState;
  defaultValue?: ModelVisibilityState;
  onValueChange?: (value: ModelVisibilityState) => void;
  defaultProviderId?: string;
}

const emptyVisibility: ModelVisibilityState = { hidden: [], custom: [] };

/** Per-provider show/hide switches for models, custom model ids and reset. */
export const ModelVisibilityManager = React.forwardRef<HTMLDivElement, ModelVisibilityManagerProps>(
  ({ providers, value: valueProp, defaultValue = emptyVisibility, onValueChange, defaultProviderId, className, ...props }, ref) => {
    const id = React.useId();
    const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
    const [providerId, setProviderId] = React.useState(defaultProviderId ?? providers[0]?.id ?? "");
    const [draft, setDraft] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const provider = providers.find((p) => p.id === providerId) ?? providers[0];
    if (!provider) return null;
    const custom = value.custom.filter((c) => c.providerId === provider.id);
    const rows = [
      ...provider.models.map((m) => ({ id: m.id, name: m.name, custom: false })),
      ...custom.map((c) => ({ id: c.modelId, name: c.modelId, custom: true })),
    ];
    const hidden = new Set(value.hidden);
    const visibleCount = rows.filter((r) => !hidden.has(`${provider.id}/${r.id}`)).length;
    const dirty = custom.length > 0 || value.hidden.some((k) => k.startsWith(`${provider.id}/`));

    const toggle = (modelId: string, show: boolean) => {
      const key = `${provider.id}/${modelId}`;
      setValue({ ...value, hidden: show ? value.hidden.filter((k) => k !== key) : [...value.hidden, key] });
    };
    const add = (e: React.FormEvent) => {
      e.preventDefault();
      const mid = draft.trim();
      if (!mid) return;
      if (rows.some((r) => r.id === mid)) {
        setError(`${mid} is already in the list.`);
        return;
      }
      setValue({ ...value, custom: [...value.custom, { providerId: provider.id, modelId: mid }] });
      setDraft("");
      setError(null);
    };
    const reset = () =>
      setValue({
        hidden: value.hidden.filter((k) => !k.startsWith(`${provider.id}/`)),
        custom: value.custom.filter((c) => c.providerId !== provider.id),
      });

    return (
      <div ref={ref} data-slot="model-visibility-manager" className={cn("grid w-full gap-3", className)} {...props}>
        <div className="flex flex-wrap items-center gap-2">
          <span id={`${id}-prov`} className="sr-only">
            Provider
          </span>
          <SimpleSelect
            aria-labelledby={`${id}-prov`}
            size="sm"
            value={provider.id}
            onValueChange={setProviderId}
            options={providers.map((p) => ({ value: p.id, label: p.name }))}
            className="w-48"
          />
          <span className="text-xs text-muted-foreground" data-slot="visibility-count">
            {visibleCount} of {rows.length} visible
          </span>
          <Button variant="ghost" size="sm" className="ml-auto" leadingIcon={<RiRestartLine aria-hidden />} disabled={!dirty} onClick={reset}>
            Reset
          </Button>
        </div>
        <ul className="divide-y divide-border overflow-hidden rounded-box border border-border bg-card">
          {rows.map((r) => {
            const shown = !hidden.has(`${provider.id}/${r.id}`);
            return (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2">
                <span className={cn("min-w-0 flex-1 truncate text-sm", shown ? "text-foreground" : "text-muted-foreground line-through")}>{r.name}</span>
                {r.custom && (
                  <Badge size="sm" variant="outline">
                    Custom
                  </Badge>
                )}
                {r.custom && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove ${r.name}`}
                    onClick={() =>
                      setValue({
                        hidden: value.hidden.filter((k) => k !== `${provider.id}/${r.id}`),
                        custom: value.custom.filter((c) => !(c.providerId === provider.id && c.modelId === r.id)),
                      })
                    }
                  >
                    <RiCloseLine aria-hidden />
                  </Button>
                )}
                <Switch size="sm" checked={shown} onCheckedChange={(c) => toggle(r.id, c)} aria-label={`Show ${r.name}`} />
              </li>
            );
          })}
        </ul>
        <form onSubmit={add} className="grid gap-1">
          <div className="flex gap-2">
            <Input
              size="sm"
              aria-label="Custom model id"
              placeholder="Add a model id, e.g. vendor/model-name"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError(null);
              }}
              className="font-mono"
              invalid={!!error}
            />
            <Button type="submit" size="sm" variant="secondary" leadingIcon={<RiAddLine aria-hidden />} disabled={!draft.trim()}>
              Add
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </form>
      </div>
    );
  }
);
ModelVisibilityManager.displayName = "ModelVisibilityManager";

/* ------------------------------------------------------------------ */
/* FallbackChainEditor                                                 */
/* ------------------------------------------------------------------ */

export interface FallbackChainEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  providers: RoutingProvider[];
  value?: ModelRef[];
  defaultValue?: ModelRef[];
  onValueChange?: (value: ModelRef[]) => void;
  caption?: React.ReactNode;
  onSetupProvider?: (providerId: string) => void;
  /** Maximum chain length. */
  max?: number;
}

/** Ordered primary + fallback models: reorder, add through the picker, remove. */
export const FallbackChainEditor = React.forwardRef<HTMLDivElement, FallbackChainEditorProps>(
  (
    {
      providers,
      value: valueProp,
      defaultValue = [],
      onValueChange,
      caption = "Tried in order when a model fails or is rate-limited.",
      onSetupProvider,
      max = 8,
      className,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
    const [picking, setPicking] = React.useState(false);
    const label = (r: ModelRef) => {
      const x = resolveModelRef(providers, r);
      return `${x?.model?.name ?? r.modelId} (${x?.provider.name ?? r.providerId})`;
    };
    return (
      <div ref={ref} data-slot="fallback-chain-editor" className={cn("grid w-full gap-3", className)} {...props}>
        <p className="text-xs text-muted-foreground">{caption}</p>
        {value.length === 0 ? (
          <p className="rounded-box border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">No models yet. Add a primary model.</p>
        ) : (
          <ReorderableList
            label="Model fallback order"
            items={value}
            getKey={modelRefKey}
            getLabel={label}
            onReorder={(items) => setValue(items)}
            moveButtons
            itemClassName="border border-border bg-card px-1 py-1"
            renderItem={(item, { index }) => (
              <div className="flex items-center gap-3 pr-1">
                <span className="w-5 text-center font-mono text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                <ModelRefLabel providers={providers} value={item} className="flex-1" />
                <Badge size="sm" color={index === 0 ? "brand" : "neutral"}>
                  {index === 0 ? "Primary" : `Fallback ${index}`}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove ${label(item)}`}
                  onClick={() => setValue(value.filter((v) => !sameRef(v, item)))}
                >
                  <RiCloseLine aria-hidden />
                </Button>
              </div>
            )}
          />
        )}
        <div>
          <Button variant="secondary" size="sm" leadingIcon={<RiAddLine aria-hidden />} disabled={value.length >= max} onClick={() => setPicking(true)}>
            {value.length === 0 ? "Add primary model" : "Add fallback"}
          </Button>
        </div>
        <ProviderModelPickerDialog
          open={picking}
          onOpenChange={setPicking}
          title={value.length === 0 ? "Choose the primary model" : "Add a fallback model"}
          providers={providers}
          onSetupProvider={onSetupProvider}
          isModelDisabled={(r) => value.some((v) => sameRef(v, r))}
          disabledReason="Already in chain"
          onSelect={(r) => setValue([...value, r])}
        />
      </div>
    );
  }
);
FallbackChainEditor.displayName = "FallbackChainEditor";

/* ------------------------------------------------------------------ */
/* TaskModelAssignment                                                 */
/* ------------------------------------------------------------------ */

export interface AuxiliaryTask {
  id: string;
  label: string;
  description?: React.ReactNode;
}

export const defaultAuxiliaryTasks: AuxiliaryTask[] = [
  { id: "vision", label: "Vision", description: "Describe images and screenshots" },
  { id: "compression", label: "Context compression", description: "Summarize long histories" },
  { id: "title", label: "Title generation", description: "Name new conversations" },
  { id: "web-extract", label: "Web extraction", description: "Pull content out of fetched pages" },
  { id: "mcp-sampling", label: "MCP sampling", description: "Completions requested by MCP servers" },
  { id: "embeddings", label: "Embeddings", description: "Vectors for memory and search" },
];

/** Task id → model, or "auto" (missing keys are auto). */
export type TaskModelMap = Record<string, ModelRef | "auto">;

export interface TaskModelAssignmentProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  providers: RoutingProvider[];
  tasks?: AuxiliaryTask[];
  value?: TaskModelMap;
  defaultValue?: TaskModelMap;
  onValueChange?: (value: TaskModelMap) => void;
  /** Caption for the Auto option. */
  autoLabel?: string;
}

/** Matrix of auxiliary tasks → model, with Auto default, reset-to-auto confirmation and "Use for all". */
export const TaskModelAssignment = React.forwardRef<HTMLDivElement, TaskModelAssignmentProps>(
  ({ providers, tasks = defaultAuxiliaryTasks, value: valueProp, defaultValue = {}, onValueChange, autoLabel = "Auto (main model)", className, ...props }, ref) => {
    const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
    const [confirmTask, setConfirmTask] = React.useState<AuxiliaryTask | null>(null);
    const options = [
      { value: "auto", label: autoLabel },
      ...providers.filter((p) => p.configured).flatMap((p) => p.models.map((m) => ({ value: modelRefKey({ providerId: p.id, modelId: m.id }), label: `${m.name} · ${p.name}` }))),
    ];
    const parse = (key: string): ModelRef | "auto" => {
      if (key === "auto") return "auto";
      const i = key.indexOf("/");
      return { providerId: key.slice(0, i), modelId: key.slice(i + 1) };
    };
    const nameOf = (r: ModelRef) => resolveModelRef(providers, r)?.model?.name ?? r.modelId;
    return (
      <div ref={ref} data-slot="task-model-assignment" className={cn("w-full overflow-hidden rounded-box border border-border bg-card", className)} {...props}>
        <ul className="divide-y divide-border">
          {tasks.map((t) => {
            const v = value[t.id] ?? "auto";
            const key = v === "auto" ? "auto" : modelRefKey(v);
            const labelId = `task-${t.id}-label`;
            return (
              <li key={t.id} data-task={t.id} data-auto={v === "auto" || undefined} className="grid items-center gap-2 px-4 py-3 sm:grid-cols-[1fr_minmax(12rem,18rem)_auto]">
                <div className="min-w-0">
                  <p id={labelId} className="text-sm font-medium text-foreground">
                    {t.label}
                  </p>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                </div>
                <SimpleSelect
                  aria-labelledby={labelId}
                  size="sm"
                  value={key}
                  onValueChange={(k) => setValue({ ...value, [t.id]: parse(k) })}
                  options={options.some((o) => o.value === key) ? options : [...options, { value: key, label: key }]}
                />
                <div className="flex justify-end gap-1">
                  {v !== "auto" && (
                    <>
                      <Button
                        variant="ghost"
                        size="xs"
                        aria-label={`Use ${nameOf(v)} for all tasks`}
                        onClick={() => setValue(Object.fromEntries(tasks.map((x) => [x.id, v])))}
                      >
                        Use for all
                      </Button>
                      <Button variant="ghost" size="icon-xs" aria-label={`Reset ${t.label} to Auto`} onClick={() => setConfirmTask(t)}>
                        <RiLoopLeftLine aria-hidden />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <ConfirmDialog
          open={confirmTask != null}
          onOpenChange={(o) => !o && setConfirmTask(null)}
          title={`Reset ${confirmTask?.label ?? "task"} to Auto?`}
          description="It will use the main model again."
          confirmLabel="Reset to Auto"
          onConfirm={() => {
            if (confirmTask) setValue({ ...value, [confirmTask.id]: "auto" });
          }}
        />
      </div>
    );
  }
);
TaskModelAssignment.displayName = "TaskModelAssignment";

/* ------------------------------------------------------------------ */
/* EnsembleBuilder                                                     */
/* ------------------------------------------------------------------ */

export interface EnsembleConfig {
  references: ModelRef[];
  aggregator: ModelRef | null;
  rounds: number;
}

export interface EnsembleBuilderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  providers: RoutingProvider[];
  value?: EnsembleConfig;
  defaultValue?: EnsembleConfig;
  onValueChange?: (value: EnsembleConfig) => void;
  /** Extra check for models that resolve to an ensemble (models with `ensemble: true` are always rejected). */
  isEnsemble?: (ref: ModelRef) => boolean;
  maxRounds?: number;
  maxReferences?: number;
}

/** Mixture-of-agents preset: reference models, an aggregator and rounds, with a recursion guard. */
export const EnsembleBuilder = React.forwardRef<HTMLDivElement, EnsembleBuilderProps>(
  (
    {
      providers,
      value: valueProp,
      defaultValue = { references: [], aggregator: null, rounds: 1 },
      onValueChange,
      isEnsemble,
      maxRounds = 5,
      maxReferences = 6,
      className,
      ...props
    },
    ref
  ) => {
    const id = React.useId();
    const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
    const [picking, setPicking] = React.useState<"reference" | "aggregator" | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const recursive = (r: ModelRef) => !!resolveModelRef(providers, r)?.model?.ensemble || !!isEnsemble?.(r);
    const nameOf = (r: ModelRef) => resolveModelRef(providers, r)?.model?.name ?? r.modelId;

    const pick = (r: ModelRef) => {
      if (recursive(r)) {
        setError(`${nameOf(r)} is itself an ensemble. Ensembles can't include other ensembles.`);
        return;
      }
      setError(null);
      if (picking === "aggregator") setValue({ ...value, aggregator: r });
      else if (!value.references.some((x) => sameRef(x, r))) setValue({ ...value, references: [...value.references, r] });
    };
    const calls = value.references.length * value.rounds + (value.aggregator ? 1 : 0);

    return (
      <div ref={ref} data-slot="ensemble-builder" className={cn("grid w-full gap-4", className)} {...props}>
        <section aria-labelledby={`${id}-refs`} className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <h4 id={`${id}-refs`} className="text-sm font-medium text-foreground">
              Reference models
            </h4>
            <Button variant="ghost" size="sm" leadingIcon={<RiAddLine aria-hidden />} disabled={value.references.length >= maxReferences} onClick={() => setPicking("reference")}>
              Add reference
            </Button>
          </div>
          {value.references.length === 0 ? (
            <p className="rounded-box border border-dashed border-border px-4 py-4 text-center text-xs text-muted-foreground">Add two or more models that answer in parallel.</p>
          ) : (
            <ul className="grid gap-1.5">
              {value.references.map((r) => (
                <li key={modelRefKey(r)} className="flex items-center gap-2 rounded-control border border-border bg-card px-2 py-1.5">
                  <ModelRefLabel providers={providers} value={r} className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove ${nameOf(r)}`}
                    onClick={() => setValue({ ...value, references: value.references.filter((x) => !sameRef(x, r)) })}
                  >
                    <RiCloseLine aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby={`${id}-agg`} className="grid gap-2">
          <h4 id={`${id}-agg`} className="text-sm font-medium text-foreground">
            Aggregator
          </h4>
          <div className="flex items-center gap-2 rounded-control border border-border bg-card px-2 py-1.5">
            {value.aggregator ? (
              <ModelRefLabel providers={providers} value={value.aggregator} className="flex-1" />
            ) : (
              <span className="flex-1 px-1 text-sm text-muted-foreground">Not chosen</span>
            )}
            <Button variant="ghost" size="sm" onClick={() => setPicking("aggregator")}>
              {value.aggregator ? "Change" : "Choose"}
            </Button>
          </div>
        </section>
        <div className="flex items-center gap-3">
          <label htmlFor={`${id}-rounds`} className="text-sm font-medium text-foreground">
            Rounds
          </label>
          <Input
            id={`${id}-rounds`}
            type="number"
            size="sm"
            min={1}
            max={maxRounds}
            value={value.rounds}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value));
              if (Number.isFinite(n)) setValue({ ...value, rounds: Math.max(1, Math.min(maxRounds, n)) });
            }}
            className="w-20"
          />
          <span className="text-xs text-muted-foreground">Each round lets references see the previous answers.</span>
        </div>
        {error && (
          <InlineAlert variant="warning" data-slot="ensemble-error" onDismiss={() => setError(null)}>
            {error}
          </InlineAlert>
        )}
        <div role="status" data-slot="ensemble-summary" className="flex items-start gap-2 rounded-box bg-subtle px-3 py-2.5 text-xs text-muted-foreground">
          <RiStackLine aria-hidden className="mt-px size-4 shrink-0" />
          {value.references.length === 0 || !value.aggregator ? (
            <span>Add reference models and an aggregator to finish the ensemble.</span>
          ) : (
            <span>
              {value.references.length} reference {pluralize(value.references.length, "model")} × {value.rounds}{" "}
              {pluralize(value.rounds, "round")}, combined by {nameOf(value.aggregator)}. About {calls} model calls per request.
            </span>
          )}
        </div>
        <ProviderModelPickerDialog
          open={picking != null}
          onOpenChange={(o) => !o && setPicking(null)}
          title={picking === "aggregator" ? "Choose the aggregator" : "Add a reference model"}
          providers={providers}
          value={picking === "aggregator" ? value.aggregator : undefined}
          onSelect={pick}
        />
      </div>
    );
  }
);
EnsembleBuilder.displayName = "EnsembleBuilder";

/* ------------------------------------------------------------------ */
/* ModelInfoCard                                                       */
/* ------------------------------------------------------------------ */

export interface ModelInfoCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  model: RoutingModel;
  provider?: Pick<RoutingProvider, "name" | "monogram" | "color">;
  /** Context length override in tokens; `null`/undefined uses the model's own value. */
  contextOverride?: number | null;
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
  value?: ReasoningSettings;
  defaultValue?: ReasoningSettings;
  onValueChange?: (value: ReasoningSettings) => void;
  levels?: EffortLevel[];
  /** Hide controls the current model doesn't support. */
  supportsThinking?: boolean;
  supportsFast?: boolean;
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
        <PopoverContent size="sm" align="start" className="grid gap-4" aria-label="Reasoning settings">
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
            <div className="grid gap-2">
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
