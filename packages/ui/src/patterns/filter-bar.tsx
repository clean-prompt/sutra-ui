import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { RiAddCircleLine, RiCheckLine, RiCloseLine, RiSearchLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";

/** Toolbar row for lists and tables: search, filter chips and actions. */
export const FilterBar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="toolbar"
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    />
  )
);
FilterBar.displayName = "FilterBar";

export interface FilterBarSearchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "size"> {
  /** Controlled search text. Use with `onValueChange`. */
  value?: string;
  /** Initial search text when uncontrolled. */
  defaultValue?: string;
  /** Called with the search text as it changes. */
  onValueChange?: (value: string) => void;
  /**
   * Field height and text size.
   * @default "sm"
   */
  size?: "sm" | "md";
}

/** Compact search input with a clear button. */
export const FilterBarSearch = React.forwardRef<HTMLInputElement, FilterBarSearchProps>(
  (
    {
      className,
      value: valueProp,
      defaultValue = "",
      onValueChange,
      onChange,
      onKeyDown,
      size = "sm",
      placeholder = "Search…",
      disabled,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    });
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    return (
      <div
        className={cn(
          "group relative flex w-full items-center sm:w-64",
          size === "sm" ? "h-8" : "h-9",
          className
        )}
      >
        <RiSearchLine
          aria-hidden
          className="pointer-events-none absolute start-2.5 size-4 text-muted-foreground transition-colors group-focus-within:text-foreground"
        />
        <input
          ref={innerRef}
          type="search"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            onChange?.(e);
            setValue(e.target.value);
          }}
          onKeyDown={(e) => {
            onKeyDown?.(e);
            // Escape during IME composition cancels the composition, not the search.
            if (e.key === "Escape" && value && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault();
              setValue("");
            }
          }}
          className={cn(
            "size-full rounded-control border border-input bg-background ps-8 pe-8 text-sm text-foreground shadow-xs transition-[border-color,box-shadow]",
            "placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
            "[&::-webkit-search-cancel-button]:appearance-none",
            focusRing
          )}
          {...props}
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setValue("");
              innerRef.current?.focus();
            }}
            className={cn(
              "absolute end-1.5 flex size-5 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              focusRing
            )}
          >
            <RiCloseLine className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
    );
  }
);
FilterBarSearch.displayName = "FilterBarSearch";

export interface FilterBarOption {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Optional facet count shown on the right. */
  count?: number;
  /** Plain-text label used for search matching and the selected summary. */
  textValue?: string;
}

export interface FilterBarChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "defaultValue"> {
  /** Filter name shown on the chip (e.g. "Status"). */
  label: string;
  /** Choices in the popover; each is a string or `{ value, label }`. */
  options: Array<FilterBarOption | string>;
  /** Controlled selected values. Use with `onValueChange`. */
  value?: string[];
  /** Initially selected values when uncontrolled. */
  defaultValue?: string[];
  /** Called with the selected values after every change. */
  onValueChange?: (value: string[]) => void;
  /** Show a search input inside the popover. Defaults to true when there are more than 7 options. */
  searchable?: boolean;
  /** How many selected values to list before collapsing to "N selected". */
  maxDisplay?: number;
  /** Icon shown before the label. */
  icon?: React.ReactNode;
  /**
   * Alignment of the popover against the chip.
   * @default "start"
   */
  align?: "start" | "center" | "end";
}

function normalize(option: FilterBarOption | string): FilterBarOption {
  return typeof option === "string" ? { value: option, label: option, textValue: option } : option;
}

function optionText(option: FilterBarOption) {
  if (option.textValue) return option.textValue;
  return typeof option.label === "string" || typeof option.label === "number"
    ? String(option.label)
    : option.value;
}

/** Dashed "+ Filter" button that opens a multi-select checklist. */
export const FilterBarChip = React.forwardRef<HTMLButtonElement, FilterBarChipProps>(
  (
    {
      className,
      label,
      options: rawOptions,
      value: valueProp,
      defaultValue = [],
      onValueChange,
      searchable,
      maxDisplay = 2,
      icon,
      align = "start",
      disabled,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useControllableState<string[]>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    });
    const [query, setQuery] = React.useState("");
    const listRef = React.useRef<HTMLDivElement>(null);
    const options = React.useMemo(() => rawOptions.map(normalize), [rawOptions]);
    const showSearch = searchable ?? options.length > 7;
    const filtered = query
      ? options.filter((o) => optionText(o).toLowerCase().includes(query.toLowerCase()))
      : options;
    const selected = options.filter((o) => value.includes(o.value));
    const listId = React.useId();

    const toggle = (v: string) =>
      setValue(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

    const onListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
      const items = Array.from(
        listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []
      );
      if (items.length === 0) return;
      e.preventDefault();
      const index = items.indexOf(document.activeElement as HTMLElement);
      let next = 0;
      if (e.key === "ArrowDown") next = index < 0 ? 0 : (index + 1) % items.length;
      if (e.key === "ArrowUp") next = index <= 0 ? items.length - 1 : index - 1;
      if (e.key === "End") next = items.length - 1;
      items[next]?.focus();
    };

    return (
      <PopoverPrimitive.Root onOpenChange={(open) => !open && setQuery("")}>
        <PopoverPrimitive.Trigger asChild>
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control border border-dashed border-border-strong bg-background px-2.5 text-sm font-medium text-foreground transition-colors",
              "hover:bg-accent data-[state=open]:bg-accent disabled:pointer-events-none disabled:opacity-50",
              "[&_svg]:size-4 [&_svg]:shrink-0",
              selected.length > 0 && "border-solid border-border shadow-xs",
              focusRing,
              className
            )}
            {...props}
          >
            {icon ?? <RiAddCircleLine aria-hidden className="text-muted-foreground" />}
            {label}
            {selected.length > 0 ? (
              <>
                <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
                {selected.length > maxDisplay ? (
                  <span className="rounded-xs bg-primary-soft px-1.5 py-0.5 text-xs font-medium text-primary-soft-foreground">
                    {selected.length} selected
                  </span>
                ) : (
                  selected.map((o) => (
                    <span
                      key={o.value}
                      className="max-w-28 truncate rounded-xs bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground"
                    >
                      {optionText(o)}
                    </span>
                  ))
                )}
              </>
            ) : null}
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align={align}
            sideOffset={6}
            onOpenAutoFocus={(e) => {
              if (!showSearch) {
                e.preventDefault();
                listRef.current?.querySelector<HTMLElement>('[role="option"]')?.focus();
              }
            }}
            className={cn(
              "z-50 w-60 overflow-hidden rounded-box border border-border bg-popover text-popover-foreground shadow-lg outline-none",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
            )}
          >
            {showSearch ? (
              <div className="flex items-center gap-2 border-b border-border px-3">
                <RiSearchLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      listRef.current?.querySelector<HTMLElement>('[role="option"]')?.focus();
                    }
                  }}
                  placeholder={label}
                  aria-label={`Search ${label}`}
                  aria-controls={listId}
                  className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            ) : null}
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-multiselectable="true"
              aria-label={label}
              onKeyDown={onListKeyDown}
              className="max-h-64 overflow-y-auto p-1 scrollbar-thin"
            >
              {filtered.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">No results</div>
              ) : (
                filtered.map((o) => {
                  const checked = value.includes(o.value);
                  return (
                    <div
                      key={o.value}
                      role="option"
                      aria-selected={checked}
                      tabIndex={-1}
                      onClick={() => toggle(o.value)}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          toggle(o.value);
                        }
                      }}
                      className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-[4px] border shadow-xs transition-colors",
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border-strong bg-background"
                        )}
                      >
                        <RiCheckLine aria-hidden
                          className={cn("size-3 transition-[opacity,transform,translate,scale,rotate] duration-150", checked ? "scale-100 opacity-100" : "scale-50 opacity-0")}
                        />
                      </span>
                      {o.icon ? (
                        <span className="flex text-muted-foreground [&_svg]:size-4">{o.icon}</span>
                      ) : null}
                      <span className="flex-1 truncate">{o.label}</span>
                      {o.count !== undefined ? (
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">{o.count}</span>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
            {value.length > 0 ? (
              <div className="border-t border-border p-1">
                <button
                  type="button"
                  onClick={() => setValue([])}
                  className={cn(
                    "flex w-full items-center justify-center rounded-sm px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    focusRing
                  )}
                >
                  Clear filters
                </button>
              </div>
            ) : null}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  }
);
FilterBarChip.displayName = "FilterBarChip";

/** Alias of `FilterBarChip`. @deprecated Use `FilterBarChip` (the dashed "+ Filter" button; it is not a pill). */
export const FilterPill = FilterBarChip;
/** @deprecated Use `FilterBarChipProps`. */
export type FilterPillProps = FilterBarChipProps;

export interface FilterBarActiveFilter {
  id: string;
  /** Field name, e.g. "Status". */
  label: React.ReactNode;
  /** Current value, e.g. "Active, Pending". */
  value: React.ReactNode;
  onRemove?: () => void;
  /** Accessible name of this token's remove button, e.g. "Remove Status: Active". Wins over `FilterBarActive`'s `removeLabel`. */
  removeLabel?: string;
}

export interface FilterBarActiveProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Active filters to show as removable tokens, each with a `label` and a remove handler. */
  filters?: FilterBarActiveFilter[];
  /**
   * Accessible name of the remove buttons of `filters`: a string for all of them, or a function of the filter, e.g.
   * `(f) => "Remove " + f.id`. A filter's own `removeLabel` wins.
   * @default "Remove filter"
   */
  removeLabel?: string | ((filter: FilterBarActiveFilter) => string);
}

/** Row of applied filter tokens. Pass `filters` or `FilterBarToken` children. */
export const FilterBarActive = React.forwardRef<HTMLDivElement, FilterBarActiveProps>(
  ({ className, filters, removeLabel, children, ...props }, ref) => (
    <div
      ref={ref}
      aria-label="Active filters"
      role="group"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      {...props}
    >
      {filters?.map((f) => (
        <FilterBarToken
          key={f.id}
          label={f.label}
          onRemove={f.onRemove}
          removeLabel={f.removeLabel ?? (typeof removeLabel === "function" ? removeLabel(f) : removeLabel)}
        >
          {f.value}
        </FilterBarToken>
      ))}
      {children}
    </div>
  )
);
FilterBarActive.displayName = "FilterBarActive";

export interface FilterBarTokenProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Token text, e.g. "Status: Open". */
  label?: React.ReactNode;
  /** Called when the remove button is clicked; setting it shows the button. */
  onRemove?: () => void;
  /**
   * Accessible name of the remove button.
   * @default "Remove filter"
   */
  removeLabel?: string;
}

/** A single applied filter: "Status: Active ×". */
export const FilterBarToken = React.forwardRef<HTMLSpanElement, FilterBarTokenProps>(
  ({ className, label, onRemove, removeLabel, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-control border border-border bg-background ps-2.5 text-xs text-foreground shadow-xs animate-in fade-in-0 zoom-in-95",
        onRemove ? "pe-1" : "pe-2.5",
        className
      )}
      {...props}
    >
      {label ? <span className="text-muted-foreground">{label}:</span> : null}
      <span className="max-w-48 truncate font-medium">{children}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? "Remove filter"}
          className={cn(
            "ms-0.5 flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            focusRing
          )}
        >
          <RiCloseLine className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </span>
  )
);
FilterBarToken.displayName = "FilterBarToken";

/** "Clear all" text button for resetting filters. */
export const FilterBarClear = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, type, ...props }, ref) => (
  <button
    ref={ref}
    type={type ?? "button"}
    className={cn(
      "inline-flex h-8 items-center gap-1 rounded-control px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
      focusRing,
      className
    )}
    {...props}
  >
    {children ?? (
      <>
        Clear all
        <RiCloseLine className="size-4" aria-hidden />
      </>
    )}
  </button>
));
FilterBarClear.displayName = "FilterBarClear";
