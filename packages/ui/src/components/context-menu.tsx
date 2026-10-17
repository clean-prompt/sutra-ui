import * as React from "react";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import { RiArrowRightSLine, RiCheckLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import {
  menuContentClass,
  menuItemClass,
  menuItemDestructiveClass,
  menuItemIndicatorClass,
  menuItemInsetClass,
  menuLabelClass,
  menuSeparatorClass,
  menuShortcutClass,
  menuSubTriggerClass,
  renderMenuItemBody,
} from "./dropdown-menu";

/** Context (right-click) menu root. */
export const ContextMenu = ContextMenuPrimitive.Root;
/** Area that opens the menu on right-click / long-press. */
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
/** Groups related items. */
export const ContextMenuGroup = ContextMenuPrimitive.Group;
/** Sub-menu root. */
export const ContextMenuSub = ContextMenuPrimitive.Sub;
/** Single-choice radio group. */
export const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

/** Menu panel (portalled). */
export const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      ref={ref}
      className={cn(
        menuContentClass,
        "max-h-(--radix-context-menu-content-available-height) origin-(--radix-context-menu-content-transform-origin)",
        className
      )}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
));
ContextMenuContent.displayName = "ContextMenuContent";

export interface ContextMenuItemProps extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> {
  icon?: React.ReactNode;
  shortcut?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  inset?: boolean;
}

/** Actionable menu row with optional icon, description and shortcut. */
export const ContextMenuItem = React.forwardRef<React.ElementRef<typeof ContextMenuPrimitive.Item>, ContextMenuItemProps>(
  ({ className, icon, shortcut, description, variant = "default", inset, asChild, children, ...props }, ref) => (
    <ContextMenuPrimitive.Item
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
    </ContextMenuPrimitive.Item>
  )
);
ContextMenuItem.displayName = "ContextMenuItem";

export interface ContextMenuCheckboxItemProps
  extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem> {
  shortcut?: React.ReactNode;
}

/** Toggleable item with a check indicator. */
export const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  ContextMenuCheckboxItemProps
>(({ className, children, shortcut, ...props }, ref) => (
  <ContextMenuPrimitive.CheckboxItem ref={ref} className={cn(menuItemClass, menuItemInsetClass, className)} {...props}>
    <span className={menuItemIndicatorClass}>
      <ContextMenuPrimitive.ItemIndicator>
        <RiCheckLine className="text-primary!" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    <span className="min-w-0 flex-1 truncate">{children}</span>
    {shortcut != null && <span className={menuShortcutClass}>{shortcut}</span>}
  </ContextMenuPrimitive.CheckboxItem>
));
ContextMenuCheckboxItem.displayName = "ContextMenuCheckboxItem";

/** Radio option inside `ContextMenuRadioGroup`. */
export const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem ref={ref} className={cn(menuItemClass, menuItemInsetClass, className)} {...props}>
    <span className={menuItemIndicatorClass}>
      <ContextMenuPrimitive.ItemIndicator>
        <span className="block size-1.5 rounded-full bg-primary" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    <span className="min-w-0 flex-1 truncate">{children}</span>
  </ContextMenuPrimitive.RadioItem>
));
ContextMenuRadioItem.displayName = "ContextMenuRadioItem";

/** Non-interactive section label. */
export const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label ref={ref} className={cn(menuLabelClass, inset && menuItemInsetClass, className)} {...props} />
));
ContextMenuLabel.displayName = "ContextMenuLabel";

/** Divider between groups. */
export const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator ref={ref} className={cn(menuSeparatorClass, className)} {...props} />
));
ContextMenuSeparator.displayName = "ContextMenuSeparator";

/** Keyboard shortcut hint aligned to the right of an item. */
export const ContextMenuShortcut = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => <span ref={ref} className={cn(menuShortcutClass, className)} {...props} />
);
ContextMenuShortcut.displayName = "ContextMenuShortcut";

export interface ContextMenuSubTriggerProps
  extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> {
  icon?: React.ReactNode;
  inset?: boolean;
}

/** Item that opens a nested sub-menu. */
export const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  ContextMenuSubTriggerProps
>(({ className, icon, inset, children, ...props }, ref) => (
  <ContextMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(menuSubTriggerClass, inset && menuItemInsetClass, className)}
    {...props}
  >
    {icon}
    <span className="min-w-0 flex-1 truncate">{children}</span>
    <RiArrowRightSLine className="ml-auto" />
  </ContextMenuPrimitive.SubTrigger>
));
ContextMenuSubTrigger.displayName = "ContextMenuSubTrigger";

/** Nested sub-menu panel. */
export const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.SubContent
      ref={ref}
      className={cn(menuContentClass, "origin-(--radix-context-menu-content-transform-origin)", className)}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
));
ContextMenuSubContent.displayName = "ContextMenuSubContent";
