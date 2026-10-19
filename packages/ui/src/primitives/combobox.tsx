import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Command as CommandPrimitive } from "cmdk";
import { cva } from "class-variance-authority";
import {
  RiAddLine,
  RiCheckLine,
  RiExpandUpDownLine,
  RiSearchLine,
} from "@remixicon/react";
import { cn, type Size } from "../lib/cn";
import { useAddedKeys } from "../hooks/use-added-keys";
import { useControllableState } from "../hooks/use-controllable-state";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { usePendingRemoval } from "../hooks/use-pending-removal";
import { useField, useFieldContext } from "./field";
import { CloseButton } from "./close-button";
import { inputShellVariants } from "./input";
import { Spinner } from "./spinner";

export interface ComboboxOption {
  value: string;
  /** Text shown and searched. */
  label: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Group heading this option belongs to. */
  group?: string;
  /** Extra search terms. */
  keywords?: string[];
}

interface ComboboxBaseProps {
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  /** Shown when the query matches nothing. Default "No results". */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  emptyText?: React.ReactNode;
  /** Hide the search input. */
  searchable?: boolean;
  /** Offer "Create …" when the query matches no option. */
  creatable?: boolean;
  /**
   * Called with the query when the user picks "Create …". The new value is selected
   * automatically: return a different string (e.g. a generated id) to select that instead.
   */
  onCreate?: (query: string) => string | void;
  createLabel?: (query: string) => React.ReactNode;
  size?: Size;
  disabled?: boolean;
  /** Marks the combobox required. Inherited from a surrounding `Field` when omitted. */
  required?: boolean;
  invalid?: boolean;
  /** Max chips shown in the trigger before collapsing into "+N" (multiple only). */
  maxChips?: number;
  /**
   * How options are matched against the search text. Omit for the built-in fuzzy match. `false` shows `options` exactly
   * as given (server-side search: pass the results for the current `inputValue`). A function keeps the options it accepts.
   */
  filter?: false | ((option: ComboboxOption, query: string) => boolean);
  /** The search text, to control it (for async search). Cleared to "" when the list closes. */
  inputValue?: string;
  /** Initial search text when uncontrolled. */
  defaultInputValue?: string;
  /** Called as the search text changes. Debounce the fetch on your side (see `useDebouncedValue`). */
  onInputValueChange?: (value: string) => void;
  /** Options are being fetched: shows a loading row (or a spinner beside the search text while options are on screen). */
  loading?: boolean;
  /** Text of the loading row. Default "Loading…". */
  loadingState?: React.ReactNode;
  /** Show a clear button while something is selected; Delete also clears (Backspace too, when single). */
  clearable?: boolean;
  /** Accessible name of the clear button. Default "Clear". */
  clearLabel?: string;
  /** Open the list when the field gets keyboard focus (pointer clicks keep their normal toggle). */
  openOnFocus?: boolean;
  /**
   * Multiple only: Backspace on the focused field first marks the last chip (announced politely) and a second press
   * removes it, so a held key cannot empty the field. Default false: Backspace removes the last chip at once.
   */
  confirmBackspace?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  contentClassName?: string;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export interface ComboboxSingleProps extends ComboboxBaseProps {
  multiple?: false;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export interface ComboboxMultipleProps extends ComboboxBaseProps {
  multiple: true;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
}

export type ComboboxProps = ComboboxSingleProps | ComboboxMultipleProps;

const triggerVariants = cva(
  [
    "group/combobox flex w-full cursor-pointer items-center gap-2 text-left text-sm",
    inputShellVariants({ hover: true }),
    "data-[state=open]:border-ring data-[state=open]:ring-[3px] data-[state=open]:ring-ring/20",
    // The trigger is a div, so it is disabled through aria-disabled (the shell's :disabled styles never match).
    "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      size: {
        sm: "min-h-8 px-2.5 [&_svg]:size-4",
        md: "min-h-9 px-3 [&_svg]:size-4",
        lg: "min-h-10 px-3.5 [&_svg]:size-[18px]",
      },
      multiple: { true: "py-1", false: "" },
    },
    defaultVariants: { size: "md", multiple: false },
  }
);

/** Searchable select built on Popover + cmdk, with multi-select chips and creatable options. */
export const Combobox = React.forwardRef<HTMLDivElement, ComboboxProps>((props, forwardedRef) => {
  const {
    options,
    placeholder = "Select…",
    searchPlaceholder = "Search…",
    emptyState,
    emptyText,
    searchable = true,
    creatable = false,
    onCreate,
    createLabel = (q) => (
      <>
        Create <span className="font-medium text-foreground">“{q}”</span>
      </>
    ),
    size = "md",
    disabled: disabledProp,
    required: requiredProp,
    invalid: invalidProp,
    maxChips = 3,
    filter,
    inputValue,
    defaultInputValue = "",
    onInputValueChange,
    loading = false,
    loadingState,
    clearable = false,
    clearLabel = "Clear",
    openOnFocus = false,
    confirmBackspace = false,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    className,
    contentClassName,
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  } = props;
  const multiple = props.multiple === true;
  const field = useField({
    id,
    disabled: disabledProp,
    required: requiredProp,
    invalid: invalidProp,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  });
  const disabled = field.disabled ?? false;
  // A <label htmlFor> can't name a div, so reference the surrounding FieldLabel explicitly.
  const fieldCtx = useFieldContext();
  const labelledBy = ariaLabelledBy ?? (ariaLabel ? undefined : fieldCtx?.labelId);

  const toArray = (v: string | string[] | undefined) =>
    v === undefined ? [] : Array.isArray(v) ? v : v === "" ? [] : [v];

  const isControlled = props.value !== undefined;
  const [internal, setInternal] = React.useState<string[]>(() => toArray(props.defaultValue));
  const selected = isControlled ? toArray(props.value) : internal;

  const triggerRef = React.useRef<HTMLDivElement>(null);
  const ref = useMergedRefs<HTMLDivElement>(forwardedRef, triggerRef);
  const [search, setSearch] = useControllableState<string>({
    value: inputValue,
    defaultValue: defaultInputValue,
    onChange: onInputValueChange,
  });
  /** A pointer press focuses the field before its click: that focus must not open the list (the click toggles it). */
  const pointerFocusRef = React.useRef(false);
  /** Focus returning to the field as the list closes must not open it again. */
  const skipFocusOpenRef = React.useRef(false);
  const [openState, setOpenState] = React.useState(defaultOpen);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    if (disabled && next) return;
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
    if (!next) setSearch("");
  };

  const emit = (next: string[]) => {
    if (!isControlled) setInternal(next);
    if (props.multiple === true) props.onValueChange?.(next);
    else props.onValueChange?.(next[0] ?? "");
  };

  const toggle = (value: string) => {
    if (multiple) {
      emit(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    } else {
      if (selected[0] !== value) emit([value]);
      setOpen(false);
    }
  };

  // Async results come and go: remember every option seen so a selected value keeps its label once it leaves the results.
  const knownRef = React.useRef(new Map<string, ComboboxOption>());
  for (const o of options) knownRef.current.set(o.value, o);
  const byValue = React.useMemo(() => new Map([...knownRef.current, ...options.map((o): [string, ComboboxOption] => [o.value, o])]), [options]);
  const visibleOptions = React.useMemo(
    () => (typeof filter === "function" ? options.filter((o) => filter(o, search)) : options),
    [options, filter, search]
  );
  const groups = React.useMemo(() => {
    const map = new Map<string, ComboboxOption[]>();
    for (const option of visibleOptions) {
      const key = option.group ?? "";
      const list = map.get(key);
      if (list) list.push(option);
      else map.set(key, [option]);
    }
    return Array.from(map.entries());
  }, [visibleOptions]);

  const query = search.trim();
  const canCreate =
    creatable && !loading && query.length > 0 && !options.some((o) => o.label.toLowerCase() === query.toLowerCase());

  const handleCreate = () => {
    const created = onCreate?.(query);
    const value = typeof created === "string" && created ? created : query;
    if (multiple) {
      if (!selected.includes(value)) emit([...selected, value]);
    } else {
      if (selected[0] !== value) emit([value]);
      setOpen(false);
    }
    setSearch("");
  };

  const selectedOptions = selected.map(
    (v) => byValue.get(v) ?? ({ value: v, label: v } as ComboboxOption)
  );
  const single = !multiple ? selectedOptions[0] : undefined;
  const addedValues = useAddedKeys(selected);
  const visibleChips = selectedOptions.slice(0, maxChips);
  const hiddenCount = selectedOptions.length - visibleChips.length;
  const removal = usePendingRemoval(multiple && confirmBackspace ? selected.length : 0);
  const lastOption = selectedOptions[selectedOptions.length - 1];
  const canClear = clearable && selected.length > 0 && !disabled;
  const clearAll = () => {
    emit([]);
    triggerRef.current?.focus();
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <div
          ref={ref}
          id={field.id}
          role="combobox"
          tabIndex={disabled ? -1 : 0}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-disabled={disabled || undefined}
          aria-label={ariaLabel}
          aria-labelledby={labelledBy}
          aria-describedby={field["aria-describedby"]}
          aria-invalid={field["aria-invalid"]}
          aria-required={field.required}
          onPointerDown={() => {
            pointerFocusRef.current = true;
          }}
          onFocus={(e) => {
            if (e.target !== e.currentTarget) return;
            const byPointer = pointerFocusRef.current;
            pointerFocusRef.current = false;
            if (openOnFocus && !byPointer && !skipFocusOpenRef.current && !open) setOpen(true);
          }}
          onBlur={(e) => {
            pointerFocusRef.current = false;
            if (e.target === e.currentTarget) removal.clear();
          }}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key !== "Backspace") removal.clear();
            if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            } else if (canClear && (e.key === "Delete" || (e.key === "Backspace" && !multiple))) {
              e.preventDefault();
              emit([]);
            } else if (multiple && e.key === "Backspace" && selected.length) {
              if (!confirmBackspace) emit(selected.slice(0, -1));
              else if (removal.press(e.repeat)) emit(selected.slice(0, -1));
            }
          }}
          className={cn(triggerVariants({ size, multiple }), className)}
        >
          {multiple ? (
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {selectedOptions.length === 0 && (
                <span className="truncate text-muted-foreground">{placeholder}</span>
              )}
              {visibleChips.map((option) => (
                <span
                  key={option.value}
                  data-pending-remove={removal.pending && option === lastOption ? "true" : undefined}
                  className={cn(
                    "data-[pending-remove=true]:border-destructive data-[pending-remove=true]:bg-destructive-soft data-[pending-remove=true]:text-destructive-soft-foreground",
                    "inline-flex h-6 max-w-40 items-center gap-1 rounded-control border border-border bg-muted pl-2 pr-0.5 text-xs font-medium text-foreground",
                    // A chip the user just added eases in (not at all under reduced motion); chips there on mount do not.
                    addedValues.has(option.value) && "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150"
                  )}
                >
                  {option.icon && <span className="flex [&_svg]:size-3.5">{option.icon}</span>}
                  <span className="truncate">{option.label}</span>
                  <CloseButton
                    shape="pill"
                    variant="muted"
                    size="2xs"
                    tabIndex={-1}
                    aria-label={`Remove ${option.label}`}
                    disabled={disabled}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      emit(selected.filter((v) => v !== option.value));
                    }}
                    className="[&_svg]:size-3"
                  />
                </span>
              ))}
              {hiddenCount > 0 && (
                <span
                  data-pending-remove={removal.pending && lastOption && !visibleChips.includes(lastOption) ? "true" : undefined}
                  className="inline-flex h-6 items-center rounded-control bg-muted px-2 text-xs font-medium text-muted-foreground data-[pending-remove=true]:bg-destructive-soft data-[pending-remove=true]:text-destructive-soft-foreground"
                >
                  +{hiddenCount}
                </span>
              )}
              {confirmBackspace && (
                <span data-slot="combobox-announcer" aria-live="polite" className="sr-only">
                  {removal.pending && lastOption ? `Press Backspace again to remove ${lastOption.label}` : ""}
                </span>
              )}
            </span>
          ) : (
            <span className={cn("flex min-w-0 flex-1 items-center gap-2", !single && "text-muted-foreground")}>
              {single?.icon && <span className="flex text-muted-foreground">{single.icon}</span>}
              <span className="truncate">{single ? single.label : placeholder}</span>
            </span>
          )}
          {canClear && (
            <CloseButton
              shape="pill"
              variant="muted"
              size="xs"
              tabIndex={-1}
              data-slot="combobox-clear"
              aria-label={clearLabel}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
            />
          )}
          <RiExpandUpDownLine aria-hidden className="text-muted-foreground" />
        </div>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          aria-label={labelledBy ? undefined : (ariaLabel ?? placeholder)}
          aria-labelledby={labelledBy}
          onCloseAutoFocus={() => {
            skipFocusOpenRef.current = true;
            setTimeout(() => {
              skipFocusOpenRef.current = false;
            }, 0);
          }}
          className={cn(
            "z-50 w-(--radix-popover-trigger-width) min-w-48 overflow-hidden rounded-box border border-border bg-popover p-0 text-popover-foreground shadow-lg outline-none",
            "origin-(--radix-popover-content-transform-origin)",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            contentClassName
          )}
        >
          <CommandPrimitive loop shouldFilter={filter === undefined} className="flex flex-col">
            {searchable && (
              <div className="flex items-center gap-2 border-b border-border px-3">
                <RiSearchLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <CommandPrimitive.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder={searchPlaceholder}
                  className="h-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                {loading && visibleOptions.length > 0 && <Spinner size="sm" label="" className="text-muted-foreground" />}
              </div>
            )}
            <CommandPrimitive.List
              aria-multiselectable={multiple || undefined}
              aria-busy={loading || undefined}
              className="scrollbar-thin max-h-72 overflow-y-auto overscroll-contain p-1"
            >
              {loading && visibleOptions.length === 0 && (
                <div data-slot="combobox-loading" className="flex items-center justify-center gap-2 px-2 py-6 text-sm text-muted-foreground">
                  <Spinner size="sm" label="" className="text-muted-foreground" />
                  {loadingState ?? "Loading…"}
                </div>
              )}
              {loading && visibleOptions.length > 0 && <span className="sr-only">Loading…</span>}
              {!canCreate && !loading && (
                <CommandPrimitive.Empty className="px-2 py-6 text-center text-sm text-muted-foreground">
                  {emptyState ?? emptyText ?? "No results"}
                </CommandPrimitive.Empty>
              )}
              {groups.map(([heading, items]) => (
                <CommandPrimitive.Group
                  key={heading || "__default"}
                  heading={heading || undefined}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {items.map((option) => {
                    const isSelected = selected.includes(option.value);
                    return (
                      <CommandPrimitive.Item
                        key={option.value}
                        value={option.value}
                        keywords={[option.label, ...(option.keywords ?? [])]}
                        disabled={option.disabled}
                        onSelect={() => toggle(option.value)}
                        data-checked={isSelected ? "" : undefined}
                        className={cn(
                          "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
                          "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
                          "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
                          "[&_svg]:pointer-events-none [&_svg]:shrink-0",
                          option.description && "items-start"
                        )}
                      >
                        {multiple && (
                          <span
                            aria-hidden
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-border-strong transition-colors [&_svg]:size-3",
                              option.description && "mt-0.5",
                              isSelected && "border-primary bg-primary text-primary-foreground"
                            )}
                          >
                            {isSelected && <RiCheckLine aria-hidden />}
                          </span>
                        )}
                        {option.icon && (
                          <span className={cn("flex text-muted-foreground [&_svg]:size-4", option.description && "mt-0.5")}>
                            {option.icon}
                          </span>
                        )}
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate">{option.label}</span>
                          {option.description && (
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          )}
                        </span>
                        {!multiple && isSelected && <RiCheckLine aria-hidden className="size-4 text-primary" />}
                      </CommandPrimitive.Item>
                    );
                  })}
                </CommandPrimitive.Group>
              ))}
              {canCreate && (
                <CommandPrimitive.Item
                  forceMount
                  value={`__create__${query}`}
                  onSelect={handleCreate}
                  className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground outline-none data-[selected=true]:bg-accent"
                >
                  <RiAddLine aria-hidden className="size-4 shrink-0" />
                  <span className="truncate">{createLabel(query)}</span>
                </CommandPrimitive.Item>
              )}
            </CommandPrimitive.List>
          </CommandPrimitive>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
});
Combobox.displayName = "Combobox";
