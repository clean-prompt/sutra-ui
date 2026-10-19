import * as React from "react";
import { RiArrowDownSLine, RiArrowRightSLine, RiCheckLine, RiFlashlightLine, RiSearchLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { type Tone } from "../../lib/tone";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Badge, type BadgeColor } from "../../primitives/badge";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";
import { ModelStateGlyph, modelStateLabels, modelStateRank, normalizeModelState, type ModelStateInput } from "./model-state";

/* ------------------------------------------------------------------ */
/* Shared model shape + helpers                                        */
/* ------------------------------------------------------------------ */

/** One model in a picker. Every field but `id` and `name` is optional; rows render what is present. */
export interface PickerModel {
  id: string;
  name: string;
  /** Provider name, shown muted after the model name. */
  provider?: string;
  /** Lifecycle state; adds the state glyph, a wait hint, ranking and warm-up. */
  state?: ModelStateInput;
  description?: React.ReactNode;
  /** Leading icon, used when the model has no `state`. */
  icon?: React.ReactNode;
  /** Small trailing tag such as "New" or "Pro". */
  badge?: React.ReactNode;
  group?: string;
  /** Untagged models are tucked behind a "Show N untagged" disclosure (when some models are tagged). */
  tags?: string[];
  /** Seconds to first token when ready. Default 3. */
  answerSeconds?: number;
  /** Seconds to wake / cold start. */
  warmSeconds?: number;
  cost?: "free" | "low" | "medium" | "high";
  quality?: "basic" | "good" | "best";
  /** Lower ranks first within the same lifecycle state. */
  rank?: number;
  /** Why this model can't be used right now. */
  blockedReason?: string;
}

/** "answers in ~3s" / "needs warm-up ~40s" for a model. */
export function modelWaitHint(m: { state: ModelStateInput; answerSeconds?: number; warmSeconds?: number }): string {
  switch (normalizeModelState(m.state)) {
    case "ready":
      return `answers in ~${m.answerSeconds ?? 3}s`;
    case "starting":
      return "warming up…";
    case "sleeping":
      return m.warmSeconds ? `wakes in ~${m.warmSeconds}s` : "wakes in a few seconds";
    case "stopped":
      return m.warmSeconds ? `needs warm-up ~${m.warmSeconds}s` : "needs warm-up";
    case "failed":
      return "failed to start";
    case "downloading":
      return "downloading weights…";
  }
}

/** Sort by lifecycle (ready first), then rank, then name. Models without a state count as ready. */
export function rankModels<T extends Pick<PickerModel, "state" | "rank" | "name">>(models: T[]) {
  const r = (m: T) => modelStateRank[normalizeModelState(m.state ?? "ready")];
  return [...models].sort((a, b) => r(a) - r(b) || (a.rank ?? 99) - (b.rank ?? 99) || a.name.localeCompare(b.name));
}

const costTone: Record<NonNullable<PickerModel["cost"]>, Tone> = { free: "success", low: "info", medium: "warning", high: "destructive" };
const qualityColor: Record<NonNullable<PickerModel["quality"]>, BadgeColor> = { basic: "gray", good: "blue", best: "purple" };

/* ------------------------------------------------------------------ */
/* ModelSelectOption                                                   */
/* ------------------------------------------------------------------ */

export interface ModelSelectOptionProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The model to show (name, provider, state, description and so on). */
  model: PickerModel;
  /** Second line. Defaults to the blocked reason, then the wait hint (with `state`), then the description. */
  hint?: React.ReactNode;
  /** Id for the second line, for `aria-describedby`. */
  hintId?: string;
  /** Let the second line wrap instead of truncating. */
  wrapHint?: boolean;
}

/** Content of one model row (glyph or icon, name, provider, badges, hint). Used inside menu items, options and buttons. */
export const ModelSelectOption = React.forwardRef<HTMLSpanElement, ModelSelectOptionProps>(
  ({ model: m, hint, hintId, wrapHint, className, ...props }, ref) => {
    const blocked = !!m.blockedReason;
    const line =
      hint ?? (blocked ? `Unavailable: ${m.blockedReason}` : m.state != null ? modelWaitHint({ ...m, state: m.state }) : m.description);
    return (
      <span ref={ref} data-slot="model-option" className={cn("flex min-w-0 flex-1 items-start gap-2", className)} {...props}>
        {m.state != null ? (
          <span className="mt-[3px] inline-flex">
            <ModelStateGlyph state={m.state} />
          </span>
        ) : m.icon ? (
          <span className="mt-0.5 inline-flex shrink-0 text-muted-foreground [&_svg]:size-4">{m.icon}</span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-medium text-foreground">{m.name}</span>
            {m.provider ? <span className="truncate text-xs text-muted-foreground">{m.provider}</span> : null}
            {m.cost ? (
              <Badge size="sm" tone={costTone[m.cost]}>
                {m.cost}
              </Badge>
            ) : null}
            {m.quality ? (
              <Badge size="sm" variant="outline" color={qualityColor[m.quality]}>
                {m.quality}
              </Badge>
            ) : null}
            {m.badge != null && m.badge !== false && m.badge !== "" ? (
              <Badge size="sm" tone="primary">
                {m.badge}
              </Badge>
            ) : null}
          </span>
          {line != null && line !== false && line !== "" ? (
            <span
              id={hintId}
              className={cn("block text-xs", wrapHint ? "leading-5" : "truncate", blocked && hint == null ? "text-destructive" : "text-muted-foreground")}
            >
              {line}
            </span>
          ) : null}
        </span>
      </span>
    );
  }
);
ModelSelectOption.displayName = "ModelSelectOption";

/* ------------------------------------------------------------------ */
/* ModelSelect                                                         */
/* ------------------------------------------------------------------ */

export interface ModelSelectTriggerState {
  selected: PickerModel | undefined;
  open: boolean;
}

export interface ModelSelectProps {
  /** Models to choose from, each with an id, name, provider and optional state, rank and blocked reason. */
  models: PickerModel[];
  /** Controlled id of the selected model. */
  value?: string;
  /** Initially selected model id when `value` is not controlled. */
  defaultValue?: string;
  /** Called with the model id when the user picks a model. */
  onValueChange?: (id: string) => void;
  /** Custom trigger element (or a function of the selection). It must forward its ref and props to a button. */
  trigger?: React.ReactElement | ((state: ModelSelectTriggerState) => React.ReactElement);
  /** Shows a "Warm up" button on models that have a `state` and aren't ready. */
  onWarmUp?: (id: string) => void;
  /** Ids currently warming (button shows a spinner). */
  warmingIds?: string[];
  /** Trigger text shown while no model is selected. Default "Choose a model". */
  placeholder?: string;
  /** Placeholder of the search field. Default "Search models…". */
  searchPlaceholder?: string;
  /** Show the search field. Default true. */
  searchable?: boolean;
  /** Sort by lifecycle, rank and name. Default true; false keeps the given order. */
  ranked?: boolean;
  /** Shown when nothing matches the search. Default `No models match “query”`. */
  emptyState?: React.ReactNode;
  /** Disables the trigger. */
  disabled?: boolean;
  /** Extra classes for the default trigger. */
  className?: string;
  /** Extra classes for the popover content. */
  contentClassName?: string;
  /** Popover side. Default "bottom". */
  side?: "top" | "bottom";
  /** Alignment of the popover against the trigger. */
  align?: "start" | "center" | "end";
  /** Accessible name of the trigger. Default "Model". */
  "aria-label"?: string;
}

/** Flat model list in a popover: state glyphs, wait hints, badges, search, grouping, untagged disclosure and per-model warm-up. */
export const ModelSelect = React.forwardRef<HTMLButtonElement, ModelSelectProps>(function ModelSelect(
  {
    models,
    value: valueProp,
    defaultValue,
    onValueChange,
    trigger,
    onWarmUp,
    warmingIds = [],
    placeholder = "Choose a model",
    searchPlaceholder = "Search models…",
    searchable = true,
    ranked = true,
    emptyState,
    disabled,
    className,
    contentClassName,
    side = "bottom",
    align = "start",
    "aria-label": ariaLabel = "Model",
  },
  ref
) {
  const [value, setValue] = useControllableState<string>({ value: valueProp, defaultValue: defaultValue ?? "", onChange: onValueChange });
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [showUntagged, setShowUntagged] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const uid = React.useId();
  const selected = models.find((m) => m.id === value);
  const anyTagged = models.some((m) => m.tags?.length);

  const q = query.trim().toLowerCase();
  const matches = (m: PickerModel) =>
    !q ||
    m.name.toLowerCase().includes(q) ||
    m.id.toLowerCase().includes(q) ||
    !!m.provider?.toLowerCase().includes(q) ||
    !!m.tags?.some((t) => t.toLowerCase().includes(q));
  const matching = models.filter(matches);
  const filtered = ranked ? rankModels(matching) : matching;
  const isUntagged = (m: PickerModel) => anyTagged && !m.tags?.length;
  const untagged = filtered.filter(isUntagged);
  const visible = q || showUntagged ? filtered : filtered.filter((m) => !isUntagged(m));
  const groups = new Map<string, PickerModel[]>();
  for (const m of visible) {
    const g = m.group ?? "Models";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(m);
  }

  const moveFocus = (dir: 1 | -1 | "first" | "last") => {
    const opts = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("[data-model-option]:not(:disabled)") ?? []);
    if (!opts.length) return;
    const i = opts.indexOf(document.activeElement as HTMLButtonElement);
    const next = dir === "first" ? 0 : dir === "last" ? opts.length - 1 : i < 0 ? (dir === 1 ? 0 : opts.length - 1) : (i + dir + opts.length) % opts.length;
    opts[next]?.focus();
  };
  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(-1);
    } else if (e.key === "Home" && e.target !== e.currentTarget.querySelector("input")) {
      e.preventDefault();
      moveFocus("first");
    } else if (e.key === "End" && e.target !== e.currentTarget.querySelector("input")) {
      e.preventDefault();
      moveFocus("last");
    }
  };

  const selectedLabel = selected ? (selected.state != null ? `${selected.name}, ${modelStateLabels[selected.state]}` : selected.name) : placeholder;
  const customTrigger = typeof trigger === "function" ? trigger({ selected, open }) : trigger;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      {customTrigger ? (
        <PopoverTrigger asChild ref={ref} disabled={disabled}>
          {customTrigger}
        </PopoverTrigger>
      ) : (
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-label={`${ariaLabel}: ${selectedLabel}`}
            className={cn("max-w-64 gap-1.5", className)}
            trailingIcon={<RiArrowDownSLine aria-hidden className="text-muted-foreground" />}
          >
            {selected?.state != null ? <ModelStateGlyph state={selected.state} aria-hidden="true" role="presentation" /> : null}
            <span className="truncate">{selected?.name ?? placeholder}</span>
          </Button>
        </PopoverTrigger>
      )}
      <PopoverContent side={side} align={align} padded={false} className={cn("w-80", contentClassName)} onKeyDown={onListKey} aria-label="Choose a model">
        {searchable ? (
          <div className="border-b border-border p-2">
            <div className="relative">
              <RiSearchLine aria-hidden="true" className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                aria-label="Search models"
                value={query}
                placeholder={searchPlaceholder}
                onChange={(e) => setQuery(e.target.value)}
                className={cn("h-8 w-full rounded-control border border-input bg-background ps-8 pe-2 text-sm placeholder:text-muted-foreground", focusRing)}
              />
            </div>
          </div>
        ) : null}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-1 scrollbar-thin">
          {visible.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyState ?? (q ? `No models match “${query}”` : "No models")}</p>
          ) : null}
          {[...groups].map(([group, list]) => {
            const gid = `${uid}-g-${group.replace(/\W+/g, "-")}`;
            return (
              <div key={group} role="group" aria-labelledby={gid} className="py-1">
                <p id={gid} className="px-2 pb-1 pt-1.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {list.map((m) => {
                    const blocked = !!m.blockedReason;
                    const warming = warmingIds.includes(m.id) || (m.state != null && normalizeModelState(m.state) === "starting");
                    const noteId = `${uid}-n-${m.id.replace(/\W+/g, "-")}`;
                    const isSel = m.id === value;
                    return (
                      <li key={m.id} className="group/model flex items-stretch gap-1 rounded-sm hover:bg-accent">
                        <button
                          type="button"
                          data-model-option=""
                          aria-current={isSel ? "true" : undefined}
                          disabled={blocked}
                          aria-describedby={noteId}
                          onClick={() => {
                            setValue(m.id);
                            setOpen(false);
                          }}
                          className={cn(
                            "flex min-w-0 flex-1 items-start gap-2 rounded-sm px-2 py-1.5 text-start text-sm outline-none focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring/35",
                            "disabled:cursor-not-allowed disabled:opacity-60"
                          )}
                        >
                          <ModelSelectOption model={m} hintId={noteId} />
                          {isSel ? <RiCheckLine aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" /> : null}
                        </button>
                        {onWarmUp && !blocked && m.state != null && normalizeModelState(m.state) !== "ready" ? (
                          <Button
                            size="xs"
                            variant="ghost"
                            className="my-auto me-1 shrink-0"
                            loading={warming}
                            disabled={warming}
                            aria-label={`Warm up ${m.name}`}
                            leadingIcon={warming ? undefined : <RiFlashlightLine aria-hidden />}
                            onClick={() => onWarmUp(m.id)}
                          >
                            {warming ? "Warming" : "Warm up"}
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {!q && untagged.length > 0 ? (
            <button
              type="button"
              aria-expanded={showUntagged}
              onClick={() => setShowUntagged((s) => !s)}
              className={cn("mt-1 flex w-full items-center gap-1 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground", focusRing)}
            >
              <RiArrowRightSLine aria-hidden="true" className={cn("size-4 chevron-turn rtl:-scale-x-100", showUntagged && "rotate-90 rtl:-rotate-90")} />
              {showUntagged ? `Hide ${untagged.length} untagged` : `Show ${untagged.length} untagged`}
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
});
ModelSelect.displayName = "ModelSelect";
