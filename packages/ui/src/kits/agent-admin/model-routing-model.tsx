/** Model routing data model: provider and model types, `modelRefKey`, `resolveModelRef`, `formatModelPrice` and the ModelCapabilityChips. */
import * as React from "react";
import { RiBrainLine, RiEyeLine, RiToolsLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { formatCost } from "../../lib/format";
import { Badge } from "../../primitives/badge";
import { type PickerModel } from "../ai/model-select";

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

/** Look up the provider and model for a reference. */
export function resolveModelRef(providers: RoutingProvider[], ref: ModelRef | null | undefined) {
  if (!ref) return null;
  const provider = providers.find((p) => p.id === ref.providerId);
  const model = provider?.models.find((m) => m.id === ref.modelId);
  return provider ? { provider, model } : null;
}

/** "$3 / $15" style price per million tokens, or "" when unknown. */
export function formatModelPrice(model: Pick<RoutingModel, "inputPrice" | "outputPrice">) {
  // Per-million prices are often sub-cent ($0.075), so keep up to four decimals instead of rounding to cents.
  const f = (n: number) => (n === 0 ? "Free" : formatCost(n, { minFraction: 0, maxFraction: 4, tiny: 0.0001, locale: "en-US" }));
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
  /**
   * Capabilities to show as chips (`tools`, `vision`, `reasoning`), in the order given; renders nothing when empty.
   */
  capabilities?: ModelCapability[];
  /** Badge size of each chip. */
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
            <Badge key={c} size={size} variant="outline" color="neutral" data-capability={c} leadingIcon={<Icon aria-hidden className="text-muted-foreground" />}>
              {label}
            </Badge>
          );
        })}
      </span>
    );
  }
);
ModelCapabilityChips.displayName = "ModelCapabilityChips";
