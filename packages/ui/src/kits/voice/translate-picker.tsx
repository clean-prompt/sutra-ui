import * as React from "react";
import {
  RiArrowDownSLine,
  RiArrowLeftRightLine,
  RiCheckLine,
  RiSearchLine,
  RiSparkling2Line,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";
import { type Language, DETECT_LANGUAGE, getLanguage, languages, searchLanguages } from "./translate-languages";

/* ------------------------------------------------------------------ */
/* LanguagePicker                                                      */
/* ------------------------------------------------------------------ */

export interface LanguagePickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** Controlled language code of the selected entry. */
  value?: string;
  /** Initially selected code when uncontrolled. */
  defaultValue?: string;
  /** Called with the language code when the user picks a language. */
  onValueChange?: (code: string) => void;
  /** Languages to offer, each with a code and name; defaults to the built-in list. */
  languages?: Language[];
  /** Recently used codes, most recent first. */
  recent?: string[];
  /** Offer the "Detect language" pseudo-option. */
  allowDetect?: boolean;
  /** Language detected while on "Detect". */
  detected?: string;
  /** Focuses the search field on mount. */
  autoFocus?: boolean;
  /** Accessible name for the list. Default "Languages". */
  label?: string;
}

interface PickerRow {
  key: string;
  code: string;
  label: string;
  sub?: string;
  group: string;
}

/** Searchable language list (English/native name/code) with Detect, Recent and keyboard navigation. */
export const LanguagePicker = React.forwardRef<HTMLDivElement, LanguagePickerProps>(
  ({ value: valueProp, defaultValue, onValueChange, languages: list = languages, recent = [], allowDetect = false, detected, autoFocus = true, label = "Languages", className, ...props }, ref) => {
    const [innerValue, setInnerValue] = React.useState(defaultValue);
    const value = valueProp ?? innerValue;
    const [query, setQuery] = React.useState("");
    const [active, setActive] = React.useState(0);
    const uid = React.useId();
    const listRef = React.useRef<HTMLDivElement>(null);
    const q = query.trim();

    const rows = React.useMemo<PickerRow[]>(() => {
      const out: PickerRow[] = [];
      const detectedName = detected ? getLanguage(detected, list)?.name : undefined;
      if (allowDetect && (!q || "detect language".includes(q.toLowerCase()))) {
        out.push({ key: DETECT_LANGUAGE, code: DETECT_LANGUAGE, label: "Detect language", sub: detectedName ? `${detectedName} detected` : undefined, group: "" });
      }
      if (q) {
        for (const l of searchLanguages(q, list)) out.push({ key: l.code, code: l.code, label: l.name, sub: l.nativeName, group: "Results" });
        return out;
      }
      for (const c of recent) {
        const l = getLanguage(c, list);
        if (l && !out.some((r) => r.key === `recent-${l.code}`)) out.push({ key: `recent-${l.code}`, code: l.code, label: l.name, sub: l.nativeName, group: "Recent" });
      }
      for (const l of [...list].sort((a, b) => a.name.localeCompare(b.name))) out.push({ key: l.code, code: l.code, label: l.name, sub: l.nativeName, group: "All languages" });
      return out;
    }, [q, list, recent, allowDetect, detected]);

    React.useEffect(() => {
      if (q) setActive(0);
      else {
        const i = rows.findIndex((r) => r.code === value);
        setActive(i < 0 ? 0 : i);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    React.useEffect(() => {
      listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
    }, [active]);

    const optId = (i: number) => `${uid}-o-${i}`;
    const choose = (r: PickerRow | undefined) => {
      if (!r) return;
      setInnerValue(r.code);
      // Always notify, even when re-picking the current code (callers close popovers on it).
      onValueChange?.(r.code);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
      const n = rows.length;
      if (!n || e.nativeEvent.isComposing || e.keyCode === 229) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => (i + 1) % n);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => (i - 1 + n) % n);
      } else if (e.key === "Home") {
        e.preventDefault();
        setActive(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActive(n - 1);
      } else if (e.key === "PageDown") {
        e.preventDefault();
        setActive((i) => Math.min(n - 1, i + 8));
      } else if (e.key === "PageUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 8));
      } else if (e.key === "Enter") {
        e.preventDefault();
        choose(rows[active]);
      }
    };

    let lastGroup: string | null = null;
    return (
      <div ref={ref} className={cn("flex w-full flex-col", className)} {...props}>
        <div className="relative border-b border-border p-2">
          <RiSearchLine aria-hidden="true" className="pointer-events-none absolute start-4.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            role="combobox"
            aria-expanded="true"
            aria-controls={`${uid}-list`}
            aria-activedescendant={rows[active] ? optId(active) : undefined}
            aria-autocomplete="list"
            aria-label="Search languages"
            autoFocus={autoFocus}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search languages"
            className={cn("h-8 w-full rounded-control border border-input bg-background ps-8 pe-2 text-sm placeholder:text-muted-foreground", focusRing)}
          />
        </div>
        <div ref={listRef} id={`${uid}-list`} role="listbox" aria-label={label} className="max-h-72 overflow-y-auto p-1 scrollbar-thin">
          {rows.length === 0 ? <div className="px-3 py-6 text-center text-sm text-muted-foreground">No languages match “{q}”</div> : null}
          {rows.map((r, i) => {
            const header = r.group && r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            const selected = r.code === value;
            return (
              <React.Fragment key={r.key}>
                {header ? (
                  <div role="presentation" className="px-2 pb-1 pt-2 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                    {header}
                  </div>
                ) : null}
                <div
                  id={optId(i)}
                  role="option"
                  data-index={i}
                  data-code={r.code}
                  aria-selected={selected}
                  data-active={i === active ? "" : undefined}
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(r)}
                  className={cn("flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm", i === active && "bg-accent text-accent-foreground")}
                >
                  {r.code === DETECT_LANGUAGE ? <RiSparkling2Line aria-hidden="true" className="size-4 text-primary" /> : null}
                  <span className="min-w-0 flex-1 truncate">
                    {r.label}
                    {r.sub && r.sub !== r.label ? <span className="ms-2 text-xs text-muted-foreground">{r.sub}</span> : null}
                  </span>
                  {selected ? <RiCheckLine aria-hidden="true" className="size-4 text-primary" /> : null}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }
);
LanguagePicker.displayName = "LanguagePicker";

/* ------------------------------------------------------------------ */
/* SwapButton + LanguageBar                                            */
/* ------------------------------------------------------------------ */

export interface SwapButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Called when the user presses the button to swap source and target. */
  onSwap?: () => void;
}

/** Swap source/target languages with a half-turn animation. */
export const SwapButton = React.forwardRef<HTMLButtonElement, SwapButtonProps>(({ onSwap, onClick, disabled, className, ...props }, ref) => {
  const [turns, setTurns] = React.useState(0);
  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Swap languages"
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        setTurns((t) => t + 1);
        onSwap?.();
      }}
      className={cn("shrink-0 rounded-full", className)}
      {...props}
    >
      <RiArrowLeftRightLine
        aria-hidden="true"
        className="transition-transform duration-300 ease-out-quart motion-reduce:transition-none"
        style={{ transform: `rotate(${turns * 180}deg)` }}
      />
    </Button>
  );
});
SwapButton.displayName = "SwapButton";

export interface LanguageBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Controlled source language code, or `"auto"` to detect. */
  source?: string;
  /** Initial source code when uncontrolled. Default "auto" (detect). */
  defaultSource?: string;
  /** Controlled target language code. */
  target?: string;
  /** Initial target code when uncontrolled. Default "en". */
  defaultTarget?: string;
  /** Called with the language code when the user picks a source language. */
  onSourceChange?: (code: string) => void;
  /** Called with the language code when the user picks a target language. */
  onTargetChange?: (code: string) => void;
  /** Custom swap; default swaps (using the detected language when source is "auto"). */
  onSwap?: () => void;
  /** Recently used source codes, most recent first, listed at the top of the source picker. */
  recentSources?: string[];
  /** Recently used target codes, most recent first, listed at the top of the target picker. */
  recentTargets?: string[];
  /** Language detected while source is "auto". */
  detected?: string;
  /** Languages to offer in both pickers; defaults to the built-in list. */
  languages?: Language[];
}

interface LanguageSideProps {
  side: "source" | "target";
  value: string;
  onChange?: (code: string) => void;
  recent: string[];
  list: Language[];
  detected?: string;
}

function LanguageSide({ side, value, onChange, recent, list, detected }: LanguageSideProps) {
  const [open, setOpen] = React.useState(false);
  const isSource = side === "source";
  let chips = recent.filter((c) => c !== DETECT_LANGUAGE && getLanguage(c, list)).slice(0, 3);
  if (value !== DETECT_LANGUAGE && !chips.includes(value)) chips = [value, ...chips].slice(0, 3);
  const detectedName = detected ? getLanguage(detected, list)?.name : undefined;
  const chip = (code: string, text: React.ReactNode, key: string) => (
    <button
      key={key}
      type="button"
      aria-pressed={value === code}
      onClick={() => onChange?.(code)}
      className={cn(
        "h-8 shrink-0 whitespace-nowrap rounded-control px-3 text-sm font-medium transition-colors",
        value === code ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
        focusRing
      )}
    >
      {text}
    </button>
  );
  return (
    <div role="group" aria-label={isSource ? "Source language" : "Target language"} className={cn("flex min-w-0 flex-[1_1_15rem] flex-wrap items-center gap-1", !isSource && "lg:justify-end")}>
      {isSource ? chip(DETECT_LANGUAGE, detectedName && value === DETECT_LANGUAGE ? `${detectedName} — detected` : "Detect language", "auto") : null}
      {chips.map((c) => chip(c, getLanguage(c, list)?.name ?? c, c))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={isSource ? "More source languages" : "More target languages"} className="shrink-0">
            <RiArrowDownSLine aria-hidden className={cn("chevron-turn", open && "rotate-180")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent padded={false} size="md" align={isSource ? "start" : "end"} aria-label={isSource ? "Source language" : "Target language"}>
          <LanguagePicker
            value={value}
            languages={list}
            recent={recent}
            allowDetect={isSource}
            detected={detected}
            onValueChange={(c) => {
              onChange?.(c);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Source/target language row: recent chips, full picker and a swap button. */
export const LanguageBar = React.forwardRef<HTMLDivElement, LanguageBarProps>(
  (
    {
      source: sourceProp,
      defaultSource = DETECT_LANGUAGE,
      target: targetProp,
      defaultTarget = "en",
      onSourceChange,
      onTargetChange,
      onSwap,
      recentSources = [],
      recentTargets = [],
      detected,
      languages: list = languages,
      className,
      ...props
    },
    ref
  ) => {
    const [source, setSource] = useControllableState({ value: sourceProp, defaultValue: defaultSource, onChange: onSourceChange });
    const [target, setTarget] = useControllableState({ value: targetProp, defaultValue: defaultTarget, onChange: onTargetChange });
    const canSwap = source !== DETECT_LANGUAGE || !!detected;
    const swap = () => {
      if (onSwap) return onSwap();
      const from = source === DETECT_LANGUAGE ? detected : source;
      if (!from) return;
      setSource(target);
      setTarget(from);
    };
    return (
      <div ref={ref} className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border px-2 py-1.5", className)} {...props}>
        <LanguageSide side="source" value={source} onChange={setSource} recent={recentSources} list={list} detected={detected} />
        <SwapButton onSwap={swap} disabled={!canSwap} title={canSwap ? undefined : "Waiting for the language to be detected"} />
        <LanguageSide side="target" value={target} onChange={setTarget} recent={recentTargets} list={list} />
      </div>
    );
  }
);
LanguageBar.displayName = "LanguageBar";
