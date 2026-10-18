import * as React from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { RiArrowRightSLine, RiCheckLine } from "@remixicon/react";
import { cn } from "../lib/cn";

/* Shared menu styling (also used by context-menu.tsx). */

/** Floating menu surface (append the primitive's transform-origin / available-height vars). */
export const menuContentClass = [
  "z-50 min-w-48 overflow-y-auto overflow-x-hidden scrollbar-thin rounded-box border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none",
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
  "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
].join(" ");

/** Base row shared by every menu item type. */
export const menuItemClass = [
  "group/menu-item relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground outline-none transition-colors",
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground data-[highlighted]:[&_svg]:text-accent-foreground",
].join(" ");

/** Destructive item modifier. */
export const menuItemDestructiveClass =
  "text-destructive data-[highlighted]:bg-destructive-soft data-[highlighted]:text-destructive-soft-foreground [&_svg]:text-current!";

/** Left padding used by inset items and checkbox/radio items. */
export const menuItemInsetClass = "pl-8";

/** Absolute slot holding the checkbox/radio indicator. */
export const menuItemIndicatorClass =
  "pointer-events-none absolute left-2 flex size-4 items-center justify-center";

/** Sub-menu trigger (gets an open state highlight). */
export const menuSubTriggerClass = cn(menuItemClass, "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground");

/** Section label. */
export const menuLabelClass = "px-2 py-1.5 text-xs font-medium text-muted-foreground";

/** Divider line. */
export const menuSeparatorClass = "-mx-1 my-1 h-px bg-border";

/** Right-aligned shortcut hint. */
export const menuShortcutClass =
  "ml-auto pl-4 text-xs tracking-widest text-muted-foreground font-sans group-data-[highlighted]/menu-item:text-accent-foreground/70";

/** Shared inner layout: icon, label + description, and shortcut. */
export function renderMenuItemBody({
  icon,
  description,
  shortcut,
  children,
}: {
  icon?: React.ReactNode;
  description?: React.ReactNode;
  shortcut?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <>
      {icon}
      {description ? (
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">{children}</span>
          <span className="truncate text-xs text-muted-foreground">{description}</span>
        </span>
      ) : (
        <span className="min-w-0 flex-1 truncate">{children}</span>
      )}
      {shortcut != null && <span className={menuShortcutClass}>{shortcut}</span>}
    </>
  );
}

/** Dropdown menu root. */
export const DropdownMenu = DropdownMenuPrimitive.Root;
/** Element that opens the menu. */
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
/** Groups related items. */
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
/** Portal for custom content composition. */
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
/** Sub-menu root. */
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
/** Single-choice radio group. */
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export type DropdownMenuContentProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>;

/** Menu panel (portalled). */
export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  DropdownMenuContentProps
>(({ className, sideOffset = 6, align = "start", ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      align={align}
      className={cn(
        menuContentClass,
        "max-h-(--radix-dropdown-menu-content-available-height) origin-(--radix-dropdown-menu-content-transform-origin)",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export interface DropdownMenuItemProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  icon?: React.ReactNode;
  shortcut?: React.ReactNode;
  description?: React.ReactNode;
  /** `destructive` colours the row red for dangerous actions. Default `neutral`. */
  tone?: "neutral" | "destructive";
  /** @deprecated Use `tone`. */
  variant?: "default" | "destructive";
  inset?: boolean;
}

/** Actionable menu row with optional icon, description and shortcut. */
export const DropdownMenuItem = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.Item>, DropdownMenuItemProps>(
  ({ className, icon, shortcut, description, tone, variant: variantProp, inset, asChild, children, ...props }, ref) => {
    const variant = (tone ?? variantProp) === "destructive" ? "destructive" : "default";
    return (
      <DropdownMenuPrimitive.Item
        ref={ref}
        asChild={asChild}
        data-variant={variant}
        className={cn(
          menuItemClass,
          description && "items-start [&>svg]:mt-0.5",
          variant === "destructive" && menuItemDestructiveClass,
          inset && menuItemInsetClass,
          className
        )}
        {...props}
      >
        {asChild ? children : renderMenuItemBody({ icon, description, shortcut, children })}
      </DropdownMenuPrimitive.Item>
    );
  }
);
DropdownMenuItem.displayName = "DropdownMenuItem";

export interface DropdownMenuCheckboxItemProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem> {
  shortcut?: React.ReactNode;
}

/** Toggleable item with a check indicator. */
export const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  DropdownMenuCheckboxItemProps
>(({ className, children, shortcut, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(menuItemClass, menuItemInsetClass, className)}
    {...props}
  >
    <span className={menuItemIndicatorClass}>
      <DropdownMenuPrimitive.ItemIndicator>
        <RiCheckLine aria-hidden className="text-primary!" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    <span className="min-w-0 flex-1 truncate">{children}</span>
    {shortcut != null && <span className={menuShortcutClass}>{shortcut}</span>}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

/** Radio option inside `DropdownMenuRadioGroup`. */
export const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem ref={ref} className={cn(menuItemClass, menuItemInsetClass, className)} {...props}>
    <span className={menuItemIndicatorClass}>
      <DropdownMenuPrimitive.ItemIndicator>
        <span className="block size-1.5 rounded-full bg-primary" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    <span className="min-w-0 flex-1 truncate">{children}</span>
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

export interface DropdownMenuLabelProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> {
  inset?: boolean;
}

/** Non-interactive section label. */
export const DropdownMenuLabel = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.Label>, DropdownMenuLabelProps>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label ref={ref} className={cn(menuLabelClass, inset && menuItemInsetClass, className)} {...props} />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

/** Divider between groups. */
export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator ref={ref} className={cn(menuSeparatorClass, className)} {...props} />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

/** Keyboard shortcut hint aligned to the right of an item. */
export const DropdownMenuShortcut = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => <span ref={ref} className={cn(menuShortcutClass, className)} {...props} />
);
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export interface DropdownMenuSubTriggerProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> {
  icon?: React.ReactNode;
  inset?: boolean;
}

/** Item that opens a nested sub-menu. */
export const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  DropdownMenuSubTriggerProps
>(({ className, icon, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(menuSubTriggerClass, inset && menuItemInsetClass, className)}
    {...props}
  >
    {icon}
    <span className="min-w-0 flex-1 truncate">{children}</span>
    <RiArrowRightSLine aria-hidden className="ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

/** Nested sub-menu panel. */
export const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      sideOffset={sideOffset}
      className={cn(menuContentClass, "origin-(--radix-dropdown-menu-content-transform-origin)", className)}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";
