import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Dialog as DialogPrimitive, VisuallyHidden } from "radix-ui";
import { RiArrowDownLine, RiArrowUpLine, RiCornerDownLeftLine, RiSearchLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { Kbd } from "./typography";
import { Spinner } from "./spinner";
import { DialogOverlay } from "./dialog";
import { ShortcutKeys, isShortcutKeys } from "./shortcut-keys";
import { useHasShortcutProvider } from "../hooks/use-shortcut-manager";
import { useShortcut, useShortcutRegistry, type ShortcutRegistryGroup, type ShortcutRegistryItem } from "./shortcuts";

/** Command palette root (cmdk). Handles filtering and keyboard navigation. */
export const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex size-full flex-col overflow-hidden rounded-box bg-popover text-popover-foreground",
      className
    )}
    {...props}
  />
));
Command.displayName = "Command";

export interface CommandInputProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> {
  /** Replace the search icon with a spinner. */
  loading?: boolean;
  /** Content rendered at the right of the input (e.g. an esc hint). */
  trailing?: React.ReactNode;
  wrapperClassName?: string;
}

/** Search field with a leading icon. */
export const CommandInput = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Input>, CommandInputProps>(
  ({ className, wrapperClassName, loading, trailing, ...props }, forwardedRef) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    const ref = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef]
    );
    const ariaLabel = props["aria-label"];
    // cmdk always points aria-labelledby at its own label; an explicit aria-label should win.
    React.useLayoutEffect(() => {
      if (ariaLabel && innerRef.current) innerRef.current.removeAttribute("aria-labelledby");
    });
    return (
    <div
      className={cn("flex h-12 shrink-0 items-center gap-2.5 border-b border-border px-3.5", wrapperClassName)}
      cmdk-input-wrapper=""
    >
      {loading ? (
        <Spinner size="sm" className="text-muted-foreground" />
      ) : (
        <RiSearchLine className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <CommandPrimitive.Input
        ref={ref}
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
      {trailing}
    </div>
    );
  }
);
CommandInput.displayName = "CommandInput";

/** Scrollable results list; animates its height as results change. */
export const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(
      "max-h-[min(24rem,60dvh)] scroll-py-1 overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-thin",
      "h-(--cmdk-list-height) transition-[height] duration-150 ease-out-quart",
      className
    )}
    {...props}
  />
));
CommandList.displayName = "CommandList";

/** Shown when no items match. */
export const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className={cn("py-10 text-center text-sm text-muted-foreground", className)}
    {...props}
  />
));
CommandEmpty.displayName = "CommandEmpty";

/** Labelled group of items. */
export const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1.5 text-foreground",
      "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    )}
    {...props}
  />
));
CommandGroup.displayName = "CommandGroup";

/** Divider between groups. */
export const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator ref={ref} className={cn("-mx-1 h-px bg-border", className)} {...props} />
));
CommandSeparator.displayName = "CommandSeparator";

/** Right-aligned shortcut hint. */
export const CommandShortcut = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("ml-auto pl-3 text-xs tracking-widest text-muted-foreground", className)}
      {...props}
    />
  )
);
CommandShortcut.displayName = "CommandShortcut";

export interface CommandItemProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item> {
  icon?: React.ReactNode;
  description?: React.ReactNode;
  /**
   * Shortcut hint. A keys spec ("mod+n", "g t") renders platform-aware Kbd chips; an array renders
   * one Kbd per entry (e.g. ["⌘", "N"]); any other node (or a glyph string like "⌘N") renders as text.
   */
  shortcut?: React.ReactNode | string[];
}

/** Selectable command row. */
export const CommandItem = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Item>, CommandItemProps>(
  ({ className, icon, description, shortcut, children, ...props }, ref) => (
    <CommandPrimitive.Item
      ref={ref}
      className={cn(
        "group/command-item relative flex cursor-default select-none items-center gap-2.5 rounded-sm px-2 py-2 text-sm outline-none transition-colors",
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground data-[selected=true]:[&_svg]:text-foreground",
        className
      )}
      {...props}
    >
      {icon}
      {description ? (
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">{children}</span>
          <span className="truncate text-xs text-muted-foreground">{description}</span>
        </span>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-2 truncate">{children}</span>
      )}
      {isShortcutKeys(shortcut) ? (
        <ShortcutKeys keys={shortcut} className="ml-auto pl-3" />
      ) : Array.isArray(shortcut) ? (
        <span className="ml-auto flex items-center gap-0.5 pl-3">
          {shortcut.map((k, i) => (
            <Kbd key={i}>{k}</Kbd>
          ))}
        </span>
      ) : shortcut != null ? (
        <CommandShortcut>{shortcut}</CommandShortcut>
      ) : null}
    </CommandPrimitive.Item>
  )
);
CommandItem.displayName = "CommandItem";

/** Loading row for async results. */
export const CommandLoading = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Loading>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Loading>
>(({ className, children, ...props }, ref) => (
  <CommandPrimitive.Loading ref={ref} className={className} {...props}>
    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
      <Spinner size="sm" className="text-muted-foreground" />
      {children ?? "Loading…"}
    </div>
  </CommandPrimitive.Loading>
));
CommandLoading.displayName = "CommandLoading";

/** Keyboard hints bar: ↑↓ navigate, ↵ select, esc close. */
export const CommandFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-10 shrink-0 items-center gap-4 border-t border-border bg-subtle px-3.5 text-xs text-muted-foreground",
        className
      )}
      {...props}
    >
      <span className="flex items-center gap-1.5">
        <Kbd>
          <RiArrowUpLine aria-hidden className="size-3" />
          <span className="sr-only">Up arrow</span>
        </Kbd>
        <Kbd>
          <RiArrowDownLine aria-hidden className="size-3" />
          <span className="sr-only">Down arrow</span>
        </Kbd>
        Navigate
      </span>
      <span className="flex items-center gap-1.5">
        <Kbd>
          <RiCornerDownLeftLine aria-hidden className="size-3" />
          <span className="sr-only">Enter</span>
        </Kbd>
        Select
      </span>
      <span className="flex items-center gap-1.5">
        <Kbd>esc</Kbd>
        Close
      </span>
      {children && <span className="ml-auto flex items-center gap-2">{children}</span>}
    </div>
  )
);
CommandFooter.displayName = "CommandFooter";

export interface CommandDialogProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
  /** Accessible title (visually hidden). */
  title?: string;
  /** Accessible description (visually hidden). */
  description?: string;
  /** Props passed to the inner `Command` (e.g. `filter`, `shouldFilter`, `loop`). */
  commandProps?: React.ComponentPropsWithoutRef<typeof CommandPrimitive>;
  /** Render the keyboard hints footer. Default true. */
  showFooter?: boolean;
  className?: string;
}

/** Top-anchored command palette in a modal dialog. */
export function CommandDialog({
  title = "Command menu",
  description = "Search for a command to run",
  commandProps,
  showFooter = true,
  className,
  children,
  ...rootProps
}: CommandDialogProps) {
  return (
    <DialogPrimitive.Root {...rootProps}>
      <DialogPrimitive.Portal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-[12dvh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-box border border-border bg-popover shadow-2xl outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-top-2 duration-150",
            className
          )}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description>{description}</DialogPrimitive.Description>
          </VisuallyHidden.Root>
          <Command
            loop
            vimBindings={false}
            label={title}
            {...commandProps}
            className={cn("rounded-none", commandProps?.className)}
          >
            {children}
            {showFooter && <CommandFooter />}
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
CommandDialog.displayName = "CommandDialog";

/**
 * Toggles a command menu with ⌘/Ctrl + `key` (default "k"). Registers in the shortcut registry when a
 * `ShortcutProvider` is present; otherwise uses its own listener.
 */
export function useCommandMenuShortcut(
  setOpen: React.Dispatch<React.SetStateAction<boolean>>,
  key: string = "k"
) {
  const setOpenRef = React.useRef(setOpen);
  setOpenRef.current = setOpen;
  const hasProvider = useHasShortcutProvider();
  useShortcut(hasProvider ? `mod+${key.toLowerCase()}` : null, () => setOpenRef.current((open) => !open), {
    id: `sutra:command-menu:${key.toLowerCase()}`,
    label: "Command menu",
    group: "General",
    allowInInputs: true,
  });
  React.useEffect(() => {
    if (hasProvider) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Several menus on one page: the first listener to handle the shortcut wins.
      if (event.defaultPrevented) return;
      if (event.key.toLowerCase() === key.toLowerCase() && (event.metaKey || event.ctrlKey) && !event.altKey) {
        event.preventDefault();
        setOpenRef.current((open) => !open);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [key, hasProvider]);
}

/* ------------------------------------------------------------------ */
/* Registry-driven palette                                             */
/* ------------------------------------------------------------------ */

export interface UseRegistryCommandsOptions {
  /** Registry ids to leave out (e.g. the palette's own toggle). */
  exclude?: string[];
}

/** Registry shortcuts as runnable commands, grouped. Empty outside a `ShortcutProvider`. */
export function useRegistryCommands({ exclude = [] }: UseRegistryCommandsOptions = {}) {
  const registry = useShortcutRegistry();
  const excludeKey = exclude.join("\n");
  const groups = React.useMemo<ShortcutRegistryGroup[]>(
    () =>
      registry.groups
        .map((g) => ({ ...g, shortcuts: g.shortcuts.filter((s) => !exclude.includes(s.id)) }))
        .filter((g) => g.shortcuts.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registry.groups, excludeKey]
  );
  return { groups, commands: groups.flatMap((g) => g.shortcuts), run: registry.run };
}

export interface CommandPaletteFromRegistryProps extends Omit<CommandDialogProps, "children"> {
  /** Shortcut that toggles the palette. Default "mod+k"; `null` disables. */
  keys?: string | null;
  placeholder?: string;
  /** Shown when nothing matches. Default "No commands found". */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  emptyText?: React.ReactNode;
  /** Extra items rendered above the registry groups. */
  children?: React.ReactNode;
  /** Called after a command runs. */
  onRun?: (command: ShortcutRegistryItem) => void;
}

/** Command palette listing every registered shortcut as a runnable command. */
export function CommandPaletteFromRegistry({
  keys = "mod+k",
  placeholder = "Type a command or search…",
  emptyState,
  emptyText,
  children,
  onRun,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...dialogProps
}: CommandPaletteFromRegistryProps) {
  const [openState, setOpenState] = React.useState(defaultOpen);
  const open = openProp ?? openState;
  const openRef = React.useRef(open);
  openRef.current = open;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOpenState(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange]
  );
  const paletteId = "sutra:command-palette";
  useShortcut(keys, () => setOpen(!openRef.current), {
    id: paletteId,
    label: "Command palette",
    group: "General",
    allowInInputs: true,
  });
  const { groups } = useRegistryCommands({ exclude: [paletteId] });

  const runCommand = (command: ShortcutRegistryItem) => {
    setOpen(false);
    // Let the palette close (and restore focus) before the command opens something else.
    setTimeout(() => {
      command.run();
      onRun?.(command);
    }, 0);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} {...dialogProps}>
      <CommandInput placeholder={placeholder} />
      <CommandList>
        <CommandEmpty>{emptyState ?? emptyText ?? "No commands found"}</CommandEmpty>
        {children}
        {groups.map((group) => (
          <CommandGroup key={group.group} heading={group.group}>
            {group.shortcuts.map((command) => (
              <CommandItem
                key={command.id}
                value={`${command.label} ${command.group} ${command.id}`}
                description={command.description}
                shortcut={command.keys}
                onSelect={() => runCommand(command)}
              >
                {command.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
CommandPaletteFromRegistry.displayName = "CommandPaletteFromRegistry";
