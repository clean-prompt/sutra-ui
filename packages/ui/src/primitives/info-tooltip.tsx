import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { RiInformationLine, RiQuestionLine } from "@remixicon/react";
import { cn, focusRing, hitArea, type Size } from "../lib/cn";
import { Tooltip, TooltipContent, type TooltipContentProps } from "./tooltip";

const iconSize: Record<Size, string> = { sm: "size-3.5", md: "size-4", lg: "size-[18px]" };
const hitSize: Record<Size, string> = { sm: "size-4", md: "size-5", lg: "size-6" };

export interface InfoTooltipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  /** Bold first line. */
  title?: React.ReactNode;
  /** Body text. */
  description?: React.ReactNode;
  icon?: "info" | "help";
  size?: Size;
  side?: TooltipContentProps["side"];
  align?: TooltipContentProps["align"];
  variant?: TooltipContentProps["variant"];
  /** Accessible label for the trigger. */
  label?: string;
  contentClassName?: string;
}

/** Small (i) / (?) icon button that reveals a title + description tooltip. */
export const InfoTooltip = React.forwardRef<HTMLButtonElement, InfoTooltipProps>(
  (
    {
      title,
      description,
      icon = "info",
      size = "md",
      side = "top",
      align,
      variant,
      label,
      className,
      contentClassName,
      children,
      ...props
    },
    ref
  ) => {
    const Icon = icon === "help" ? RiQuestionLine : RiInformationLine;
    return (
      <Tooltip>
        <TooltipPrimitive.Trigger asChild>
          <button
            ref={ref}
            type="button"
            aria-label={label ?? (typeof title === "string" ? title : icon === "help" ? "Help" : "More information")}
            className={cn(
              hitArea,
              "inline-flex shrink-0 items-center justify-center rounded-full align-middle text-muted-foreground transition-colors hover:text-foreground data-[state=delayed-open]:text-foreground data-[state=instant-open]:text-foreground",
              hitSize[size],
              focusRing,
              className
            )}
            {...props}
          >
            <Icon className={iconSize[size]} aria-hidden />
          </button>
        </TooltipPrimitive.Trigger>
        <TooltipContent
          side={side}
          align={align}
          variant={variant}
          className={cn("max-w-64 px-3 py-2 text-left", contentClassName)}
        >
          {title && <p className="text-xs font-semibold">{title}</p>}
          {description && (
            <p className={cn("text-xs font-normal opacity-80", title && "mt-0.5")}>{description}</p>
          )}
          {children}
        </TooltipContent>
      </Tooltip>
    );
  }
);
InfoTooltip.displayName = "InfoTooltip";
