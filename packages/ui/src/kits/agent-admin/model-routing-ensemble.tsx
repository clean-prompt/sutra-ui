/** Model ensembles: the EnsembleBuilder. */
import * as React from "react";
import { RiAddLine, RiCloseLine, RiStackLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { pluralize } from "../../lib/format";
import { Button } from "../../primitives/button";
import { Input } from "../../primitives/input";
import { InlineAlert } from "../../primitives/inline-alert";
import { type RoutingProvider, type ModelRef, modelRefKey, resolveModelRef } from "./model-routing-model";
import { sameRef, ModelRefLabel } from "./model-routing-internal";
import { ProviderModelPickerDialog } from "./model-routing-picker";

/* ------------------------------------------------------------------ */
/* EnsembleBuilder                                                     */
/* ------------------------------------------------------------------ */

export interface EnsembleConfig {
  references: ModelRef[];
  aggregator: ModelRef | null;
  rounds: number;
}

export interface EnsembleBuilderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  /** Providers whose models can join the ensemble. */
  providers: RoutingProvider[];
  /** Controlled configuration: `references`, `aggregator` and `rounds`. */
  value?: EnsembleConfig;
  /** Initial configuration when `value` is not controlled. */
  defaultValue?: EnsembleConfig;
  /** Called with the new configuration when the user changes any part of it. */
  onValueChange?: (value: EnsembleConfig) => void;
  /** Extra check for models that resolve to an ensemble (models with `ensemble: true` are always rejected). */
  isEnsemble?: (ref: ModelRef) => boolean;
  /** Upper bound of the rounds stepper. */
  maxRounds?: number;
  /** Maximum number of reference models that can be added. */
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
    // Text being typed in the rounds field; null shows the committed value. Lets the field be cleared and retyped.
    const [roundsDraft, setRoundsDraft] = React.useState<string | null>(null);
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
      <div ref={ref} data-slot="ensemble-builder" className={cn("grid w-full grid-cols-1 gap-4", className)} {...props}>
        <section aria-labelledby={`${id}-refs`} className="grid grid-cols-1 gap-2">
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
            <ul className="grid grid-cols-1 gap-1.5">
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
        <section aria-labelledby={`${id}-agg`} className="grid grid-cols-1 gap-2">
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
            value={roundsDraft ?? value.rounds}
            onChange={(e) => {
              const text = e.target.value;
              setRoundsDraft(text);
              const n = Math.round(Number(text));
              if (text.trim() !== "" && Number.isFinite(n) && n >= 1) setValue({ ...value, rounds: Math.min(maxRounds, n) });
            }}
            onBlur={() => setRoundsDraft(null)}
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
