import * as React from "react";
import { RiArrowDownSLine, RiArrowRightSLine, RiCheckLine, RiFlashlightLine, RiSearchLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { Button } from "./button";
import { Badge, type BadgeColor } from "./badge";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { useControllableState } from "../hooks/use-controllable-state";
import { toneClasses, type Tone } from "../lib/tone";

/* ------------------------------------------------------------------ */
/* ModelPicker                                                         */
/* ------------------------------------------------------------------ */

export type ModelLifecycleState = "ready" | "starting" | "asleep" | "stopped" | "failed";

export interface ModelPickerModel {
  id: string;
  name: string;
  state: ModelLifecycleState;
  group?: string;
  /** Untagged models are tucked behind a "Show N untagged" disclosure. */
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
  description?: React.ReactNode;
}

export const modelStateLabels: Record<ModelLifecycleState, string> = {
  ready: "Ready",
  starting: "Starting",
  asleep: "Asleep",
  stopped: "Stopped",
  failed: "Failed",
};

const stateRank: Record<ModelLifecycleState, number> = { ready: 0, starting: 1, asleep: 2, stopped: 3, failed: 4 };

export interface ModelStateGlyphProps extends React.SVGAttributes<SVGSVGElement> {
  state: ModelLifecycleState;
  size?: number;
}

const modelStateTone: Record<ModelLifecycleState, Tone> = {
  ready: "success",
  starting: "info",
  asleep: "neutral",
  stopped: "neutral",
  failed: "destructive",
};

/** Lifecycle mark: shape, not color, carries the state (filled, outline, moon, warning). */
export const ModelStateGlyph = React.forwardRef<SVGSVGElement, ModelStateGlyphProps>(function ModelStateGlyph(
  { state, size = 14, className, ...props },
  ref
) {
  const color = toneClasses.text[modelStateTone[state]];
  return (
    <svg
      ref={ref}
      role="img"
      aria-label={modelStateLabels[state]}
      width={size}
      height={size}
      viewBox="0 0 14 14"
      data-state={state}
      className={cn("shrink-0", color, state === "starting" && "motion-safe:animate-spin", className)}
      {...props}
    >
      <title>{modelStateLabels[state]}</title>
      {state === "ready" ? <circle cx="7" cy="7" r="4.5" fill="currentColor" /> : null}
      {state === "stopped" ? <circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" /> : null}
      {state === "starting" ? (
        <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="7 5" strokeLinecap="round" />
      ) : null}
      {state === "asleep" ? <path d="M9.6 9.1A4.2 4.2 0 0 1 5.2 3.6a4.5 4.5 0 1 0 5.3 5.9 4.2 4.2 0 0 1-.9-.4z" fill="currentColor" /> : null}
      {state === "failed" ? (
        <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 1.8 12.8 12H1.2z" />
          <path d="M7 6v2.4M7 10.3v.1" />
        </g>
      ) : null}
    </svg>
  );
});
ModelStateGlyph.displayName = "ModelStateGlyph";

/** "answers in ~3s" / "needs warm-up ~40s" for a model. */
export function modelWaitHint(m: Pick<ModelPickerModel, "state" | "answerSeconds" | "warmSeconds">) {
  switch (m.state) {
    case "ready":
      return `answers in ~${m.answerSeconds ?? 3}s`;
    case "starting":
      return "warming up…";
    case "asleep":
      return m.warmSeconds ? `wakes in ~${m.warmSeconds}s` : "wakes in a few seconds";
    case "stopped":
      return m.warmSeconds ? `needs warm-up ~${m.warmSeconds}s` : "needs warm-up";
    case "failed":
      return "failed to start";
  }
}

const costTone: Record<NonNullable<ModelPickerModel["cost"]>, Tone> = { free: "success", low: "info", medium: "warning", high: "destructive" };
const qualityColor: Record<NonNullable<ModelPickerModel["quality"]>, BadgeColor> = { basic: "gray", good: "blue", best: "purple" };

/** Sort by lifecycle (ready first), then rank, then name. */
export function rankModels<T extends ModelPickerModel>(models: T[]) {
  return [...models].sort(
    (a, b) => stateRank[a.state] - stateRank[b.state] || (a.rank ?? 99) - (b.rank ?? 99) || a.name.localeCompare(b.name)
  );
}

export interface ModelPickerProps {
  models: ModelPickerModel[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** Shows a "Warm up" button on models that aren't ready. */
  onWarmUp?: (id: string) => void;
  /** Ids currently warming (button shows a spinner). */
  warmingIds?: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  /** Popover side. Default "top" (composer). */
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  "aria-label"?: string;
}

/** Model dropdown with lifecycle glyphs, wait hints, badges, search, grouping and per-model warm-up. */
export const ModelPicker = React.forwardRef<HTMLButtonElement, ModelPickerProps>(function ModelPicker({
  models,
  value: valueProp,
  defaultValue,
  onValueChange,
  onWarmUp,
  warmingIds = [],
  placeholder = "Choose a model",
  searchPlaceholder = "Search models…",
  disabled,
  className,
  side = "top",
  align = "start",
  "aria-label": ariaLabel = "Model",
}, ref) {
  const [value, setValue] = useControllableState<string>({ value: valueProp, defaultValue: defaultValue ?? "", onChange: onValueChange });
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [showUntagged, setShowUntagged] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const uid = React.useId();
  const selected = models.find((m) => m.id === value);
  const anyTagged = models.some((m) => m.tags?.length);

  const q = query.trim().toLowerCase();
  const matches = (m: ModelPickerModel) =>
    !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.tags?.some((t) => t.toLowerCase().includes(q));
  const filtered = rankModels(models.filter(matches));
  const isUntagged = (m: ModelPickerModel) => anyTagged && !m.tags?.length;
  const untagged = filtered.filter(isUntagged);
  const visible = q || showUntagged ? filtered : filtered.filter((m) => !isUntagged(m));
  const groups = new Map<string, ModelPickerModel[]>();
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

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-label={`${ariaLabel}: ${selected ? `${selected.name}, ${modelStateLabels[selected.state]}` : placeholder}`}
          className={cn("max-w-64 gap-1.5", className)}
          trailingIcon={<RiArrowDownSLine aria-hidden className="text-muted-foreground" />}
        >
          {selected ? <ModelStateGlyph state={selected.state} aria-hidden="true" role="presentation" /> : null}
          <span className="truncate">{selected?.name ?? placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side={side} align={align} padded={false} className="w-80" onKeyDown={onListKey} aria-label="Choose a model">
        <div className="border-b border-border p-2">
          <div className="relative">
            <RiSearchLine aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              aria-label="Search models"
              value={query}
              placeholder={searchPlaceholder}
              onChange={(e) => setQuery(e.target.value)}
              className={cn("h-8 w-full rounded-control border border-input bg-background pl-8 pr-2 text-sm placeholder:text-muted-foreground", focusRing)}
            />
          </div>
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto p-1 scrollbar-thin">
          {visible.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">No models match “{query}”</p> : null}
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
                    const warming = warmingIds.includes(m.id) || m.state === "starting";
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
                            "flex min-w-0 flex-1 items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring/35",
                            "disabled:cursor-not-allowed disabled:opacity-60"
                          )}
                        >
                          <span className="mt-[3px]">
                            <ModelStateGlyph state={m.state} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate font-medium text-foreground">{m.name}</span>
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
                            </span>
                            <span id={noteId} className={cn("block truncate text-xs", blocked ? "text-destructive" : "text-muted-foreground")}>
                              {blocked ? `Unavailable: ${m.blockedReason}` : modelWaitHint(m)}
                            </span>
                          </span>
                          {isSel ? <RiCheckLine aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" /> : null}
                        </button>
                        {onWarmUp && !blocked && m.state !== "ready" ? (
                          <Button
                            size="xs"
                            variant="ghost"
                            className="my-auto mr-1 shrink-0"
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
              <RiArrowRightSLine aria-hidden="true" className={cn("size-4 transition-transform", showUntagged && "rotate-90")} />
              {showUntagged ? `Hide ${untagged.length} untagged` : `Show ${untagged.length} untagged`}
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
});
ModelPicker.displayName = "ModelPicker";
