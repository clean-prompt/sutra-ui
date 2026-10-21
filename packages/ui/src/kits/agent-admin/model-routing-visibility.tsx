/** Model visibility: the ModelVisibilityManager. */
import * as React from "react";
import { RiAddLine, RiCloseLine, RiRestartLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { Input } from "../../primitives/input";
import { Switch } from "../../primitives/switch";
import { SimpleSelect } from "../../primitives/select";
import { type RoutingProvider, type ModelRef } from "./model-routing-model";

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
  /** Providers (id, name, monogram, colour and models) whose models can be shown or hidden. */
  providers: Pick<RoutingProvider, "id" | "name" | "monogram" | "color" | "models">[];
  /** Controlled visibility map: which models are hidden from pickers. */
  value?: ModelVisibilityState;
  /** Initial visibility map when `value` is not controlled. */
  defaultValue?: ModelVisibilityState;
  /** Called with the updated visibility map when the user toggles a model or a provider. */
  onValueChange?: (value: ModelVisibilityState) => void;
  /** Provider selected on mount; defaults to the first provider. */
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
      <div ref={ref} data-slot="model-visibility-manager" className={cn("grid w-full grid-cols-1 gap-3", className)} {...props}>
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
            <bdi dir="ltr">{visibleCount} of {rows.length} visible</bdi>
          </span>
          <Button variant="ghost" size="sm" className="ms-auto" leadingIcon={<RiRestartLine aria-hidden />} disabled={!dirty} onClick={reset}>
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
        <form onSubmit={add} className="grid grid-cols-1 gap-1">
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
