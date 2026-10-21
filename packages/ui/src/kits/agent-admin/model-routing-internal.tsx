/** Private helpers shared by the model-routing modules (`sameRef`, ModelRefLabel). */
import { cn } from "../../lib/cn";
import { ProviderLogo } from "./llm-providers-logo";
import { type RoutingProvider, type ModelRef, resolveModelRef } from "./model-routing-model";

export const sameRef = (a?: ModelRef | null, b?: ModelRef | null) => !!a && !!b && a.providerId === b.providerId && a.modelId === b.modelId;

export function ModelRefLabel({ providers, value, className }: { providers: RoutingProvider[]; value: ModelRef; className?: string }) {
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
