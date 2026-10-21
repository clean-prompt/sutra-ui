/** Model chains: the FallbackChainEditor and the TaskModelAssignment. */
import * as React from "react";
import { RiAddLine, RiCloseLine, RiLoopLeftLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { SimpleSelect } from "../../primitives/select";
import { ConfirmDialog } from "../../primitives/dialog";
import { ReorderableList } from "../../patterns/reorderable-list";
import { type RoutingProvider, type ModelRef, modelRefKey, resolveModelRef } from "./model-routing-model";
import { sameRef, ModelRefLabel } from "./model-routing-internal";
import { ProviderModelPickerDialog } from "./model-routing-picker";

/* ------------------------------------------------------------------ */
/* FallbackChainEditor                                                 */
/* ------------------------------------------------------------------ */

export interface FallbackChainEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  /** Providers whose models can be added to the chain. */
  providers: RoutingProvider[];
  /** Controlled chain: model references in the order they are tried. */
  value?: ModelRef[];
  /** Initial chain when `value` is not controlled. */
  defaultValue?: ModelRef[];
  /** Called with the new chain when the user adds, removes or reorders a model. */
  onValueChange?: (value: ModelRef[]) => void;
  /** Helper text above the chain. */
  caption?: React.ReactNode;
  /** Called from an unconfigured provider's "Set up" call to action in the add-model picker. */
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
      <div ref={ref} data-slot="fallback-chain-editor" className={cn("grid w-full grid-cols-1 gap-3", className)} {...props}>
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
              <div className="flex items-center gap-3 pe-1">
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
  /** Providers whose models can be assigned to a task. */
  providers: RoutingProvider[];
  /** Auxiliary tasks (title generation, summaries and so on) to assign a model to; defaults to the built-in list. */
  tasks?: AuxiliaryTask[];
  /** Controlled map of task id to model reference; a task without an entry uses the main model (Auto). */
  value?: TaskModelMap;
  /** Initial map when `value` is not controlled. */
  defaultValue?: TaskModelMap;
  /** Called with the updated map when the user assigns or clears a task's model. */
  onValueChange?: (value: TaskModelMap) => void;
  /** Caption for the Auto option. */
  autoLabel?: string;
}

/** Matrix of auxiliary tasks → model, with Auto default, reset-to-auto confirmation and "Use for all". */
export const TaskModelAssignment = React.forwardRef<HTMLDivElement, TaskModelAssignmentProps>(
  ({ providers, tasks = defaultAuxiliaryTasks, value: valueProp, defaultValue = {}, onValueChange, autoLabel = "Auto (main model)", className, ...props }, ref) => {
    const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
    const [confirmTask, setConfirmTask] = React.useState<AuxiliaryTask | null>(null);
    const uid = React.useId();
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
            const labelId = `${uid}-task-${t.id}-label`;
            return (
              <li key={t.id} data-task={t.id} data-auto={v === "auto" || undefined} className="grid grid-cols-1 items-center gap-2 px-4 py-3 sm:grid-cols-[1fr_minmax(12rem,18rem)_auto]">
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
