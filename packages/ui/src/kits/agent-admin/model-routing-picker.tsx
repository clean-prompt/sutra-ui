/** Model picking: the ProviderModelPicker and its dialog and popover wrappers. */
import * as React from "react";
import { RiArrowDownSLine, RiKey2Line, RiSearchLine } from "@remixicon/react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn, focusRing } from "../../lib/cn";
import { logicalArrow } from "../../lib/direction";
import { useControllableState } from "../../hooks/use-controllable-state";
import { clamp } from "../../lib/math";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { Input } from "../../primitives/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../primitives/dialog";
import { PopoverContent } from "../../primitives/popover";
import { EmptyState } from "../../primitives/empty-state";
import { formatTokenCount } from "../../lib/token-count";
import { highlightMatch } from "../ai/slash-menu";
import { ProviderLogo } from "./llm-providers-logo";
import { ModelStateGlyph, normalizeModelState } from "../ai/model-state";
import { modelWaitHint } from "../ai/model-select";
import { type RoutingModel, type RoutingProvider, type ModelRef, formatModelPrice, ModelCapabilityChips } from "./model-routing-model";
import { sameRef, ModelRefLabel } from "./model-routing-internal";

/* ------------------------------------------------------------------ */
/* ProviderModelPicker                                                 */
/* ------------------------------------------------------------------ */

export interface ProviderModelPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect" | "defaultValue"> {
  /** Providers with their models; unconfigured providers show a "Set up" call to action instead of models. */
  providers: RoutingProvider[];
  /** The current model ("current" tag). */
  value?: ModelRef | null;
  /** Called with the chosen model reference and the model record when the user picks a model. */
  onSelect?: (ref: ModelRef, model: RoutingModel) => void;
  /** Called from an unconfigured provider's "Set up" CTA. */
  onSetupProvider?: (providerId: string) => void;
  /** Actions for the "no providers" empty state (e.g. buttons to keys / OAuth). */
  emptyActions?: React.ReactNode;
  /** Return true to disable a model (shown greyed with `disabledReason`). */
  isModelDisabled?: (ref: ModelRef, model: RoutingModel) => boolean;
  /** Tooltip text for models that `isModelDisabled` greys out. */
  disabledReason?: string;
  /** Focus the search field on mount. */
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
      else if (logicalArrow(e) === "ArrowRight" || e.key === "Enter") focusModels();
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
      else if (logicalArrow(e) === "ArrowLeft") focusProviders();
      else if (e.key === "Enter" || e.key === " ") {
        const m = models[modelIdx];
        if (m) choose(m);
      } else return;
      e.preventDefault();
    };

    return (
      <div ref={ref} data-slot="provider-model-picker" className={cn("@container flex w-full flex-col overflow-hidden rounded-box border border-border bg-popover", className)} {...props}>
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
        <div className="grid min-h-64 grid-cols-1 @md:grid-cols-[minmax(9rem,38%)_minmax(0,1fr)]">
          <div
            ref={providersRef}
            role="listbox"
            tabIndex={0}
            aria-label="Providers"
            aria-activedescendant={activeProvider ? `${id}-p-${providerIndex}` : undefined}
            onKeyDown={onProvidersKey}
            className={cn("max-h-40 overflow-y-auto border-b border-border p-1 scrollbar-thin @md:max-h-80 @md:border-b-0 @md:border-e", focusRing, "focus-visible:ring-inset")}
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
  /** Controlled open state of the dialog. */
  open?: boolean;
  /** Initial open state when `open` is not controlled. */
  defaultOpen?: boolean;
  /** Called when the dialog opens or closes (it closes after a model is picked). */
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog. */
  trigger?: React.ReactNode;
  /** Dialog heading; screen-reader label of the picker. */
  title?: React.ReactNode;
  /** Helper text under the dialog heading. */
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
  /** Called with the chosen model reference and the model record when the user picks a model. */
  onValueChange?: (ref: ModelRef, model: RoutingModel) => void;
  /** Trigger text shown while no model is selected. */
  placeholder?: string;
  /** Extra classes for the trigger button; `className` goes to the picker inside the popover. */
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
