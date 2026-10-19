import * as React from "react";
import { RiArrowDownSLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { Button, type ButtonProps } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

/* ------------------------------------------------------------------ */
/* SplitButton                                                         */
/* ------------------------------------------------------------------ */

export interface SplitButtonAction {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  shortcut?: React.ReactNode;
  disabled?: boolean;
  variant?: "default" | "destructive";
  onSelect: () => void;
}

/** SplitButton follows Button's full text scale (xs h-7, sm h-8, md h-9, lg h-10, xl h-12). */
export type SplitButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface SplitButtonProps extends Omit<ButtonProps, "size"> {
  /** Button's text-size scale; the chevron uses the matching icon size. Default "md". */
  size?: SplitButtonSize;
  /** Secondary actions listed in the chevron menu. */
  actions?: SplitButtonAction[];
  /** Custom menu content (rendered after `actions`). */
  menuContent?: React.ReactNode;
  /** Accessible name of the chevron button. Default "More options". */
  menuLabel?: string;
  /** Optional heading inside the menu. */
  menuHeading?: React.ReactNode;
  align?: "start" | "center" | "end";
  /** Class for the outer group. */
  groupClassName?: string;
}

const chevronSize: Record<SplitButtonSize, ButtonProps["size"]> = {
  xs: "icon-xs",
  sm: "icon-sm",
  md: "icon",
  lg: "icon-lg",
  xl: "icon-xl",
};

const dividerByVariant: Partial<Record<NonNullable<ButtonProps["variant"]>, string>> = {
  primary: "border-s border-primary-foreground/25",
  destructive: "border-s border-destructive-foreground/25",
  inverse: "border-s border-inverse-foreground/20",
  soft: "border-s border-primary-soft-foreground/20",
  tertiary: "border-s border-border-strong",
  ghost: "border-s border-border",
  "destructive-soft": "border-s border-destructive-soft-foreground/20",
};

/** A primary action fused with a chevron that opens a menu of secondary actions. */
export const SplitButton = React.forwardRef<HTMLButtonElement, SplitButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      actions = [],
      menuContent,
      menuLabel = "More options",
      menuHeading,
      align = "end",
      disabled,
      loading,
      className,
      groupClassName,
      children,
      ...props
    },
    ref
  ) => {
    const hasMenu = actions.length > 0 || !!menuContent;
    return (
      <div role="group" className={cn("inline-flex items-stretch", groupClassName)}>
        <Button
          ref={ref}
          variant={variant}
          size={size}
          disabled={disabled}
          loading={loading}
          className={cn(hasMenu && "rounded-e-none active:scale-100", className)}
          {...props}
        >
          {children}
        </Button>
        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={variant}
                size={chevronSize[size]}
                disabled={disabled || loading}
                aria-label={menuLabel}
                title={menuLabel}
                className={cn(
                  "rounded-s-none active:scale-100 data-[state=open]:brightness-95",
                  variant === "secondary" || variant === "outline" ? "-ms-px" : dividerByVariant[variant ?? "primary"],
                  size === "xs" ? "w-6" : size === "sm" ? "w-7" : "w-8"
                )}
              >
                <RiArrowDownSLine aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="min-w-52">
              {menuHeading && (
                <>
                  <DropdownMenuLabel>{menuHeading}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              {actions.map((a) => (
                <DropdownMenuItem
                  key={a.id}
                  icon={a.icon}
                  description={a.description}
                  shortcut={a.shortcut}
                  disabled={a.disabled}
                  variant={a.variant}
                  onSelect={a.onSelect}
                >
                  {a.label}
                </DropdownMenuItem>
              ))}
              {menuContent}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }
);
SplitButton.displayName = "SplitButton";
