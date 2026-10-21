/** PromptInput model controls: the model pill (effort, fast-mode cooldown) and the model select menu. */
import * as React from "react";
import { DropdownMenu } from "radix-ui";
import { RiArrowDownSLine, RiCheckLine, RiFlashlightFill } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { Button, type ButtonProps } from "../../primitives/button";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useCountdown } from "../../hooks/use-now";
import { ModelSelectOption, type PickerModel } from "./model-select";

/** A `PickerModel` for the composer menu; `state`, `provider`, `cost` and the other shared fields render through the shared row. */
export interface PromptInputModel extends PickerModel {
  description?: string;
  /** Small trailing tag such as "New" or "Pro". */
  badge?: string;
}

/** Fast-mode indicator: on, off, or cooling down (pass `fastCooldown` seconds). */
export type PromptInputFastMode = "on" | "off" | "cooldown";

function useCooldownSeconds(seconds: number | undefined, active: boolean, onEnd?: () => void) {
  const total = Math.max(0, Math.ceil(seconds ?? 0));
  const running = active && total > 0;
  // The deadline is anchored when the length or the active flag changes, then read from the wall clock (no drift).
  const key = `${total}:${running}`;
  const [anchor, setAnchor] = React.useState(() => ({ key, at: Date.now() }));
  let at = anchor.at;
  if (anchor.key !== key) {
    at = Date.now();
    setAnchor({ key, at });
  }
  const { remainingMs } = useCountdown(running ? at + total * 1000 : undefined, { interval: 250, onExpire: onEnd });
  return running ? Math.min(total, Math.ceil(remainingMs / 1000)) : total;
}

export interface PromptInputModelPillProps extends ButtonProps {
  /** Model name. */
  model?: React.ReactNode;
  /** Replaces the default model icon. */
  icon?: React.ReactNode;
  /** Reasoning-effort display (e.g. "High" or a glyph), shown muted after the name. */
  effort?: React.ReactNode;
  /** Fast-mode indicator state. Omit to hide the indicator. */
  fast?: PromptInputFastMode;
  /** Seconds left while `fast="cooldown"`; counts down by itself. */
  fastCooldown?: number;
  /** Called when the cooldown countdown reaches zero. */
  onFastCooldownEnd?: () => void;
  /** Show the dropdown chevron. Default true. */
  chevron?: boolean;
}

/** Compact model button for agent composers: name, effort and a fast-mode indicator with cooldown countdown. */
export const PromptInputModelPill = React.forwardRef<HTMLButtonElement, PromptInputModelPillProps>(
  (
    { model, icon, effort, fast, fastCooldown, onFastCooldownEnd, chevron = true, variant = "ghost", size = "sm", className, children, ...props },
    ref
  ) => {
    const remaining = useCooldownSeconds(fastCooldown, fast === "cooldown", onFastCooldownEnd);
    const fastState = fast === "cooldown" && remaining <= 0 ? "off" : fast;
    const fastLabel =
      fastState === "on"
        ? "Fast mode on"
        : fastState === "cooldown"
          ? `Fast mode cooling down, ${remaining}s left`
          : "Fast mode off";
    return (
      <Button
        ref={ref}
        type="button"
        variant={variant}
        size={size}
        data-fast={fastState}
        className={cn(
          "min-w-0 shrink gap-1 px-2.5 text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground",
          className
        )}
        {...props}
      >
        {icon && <span className="inline-flex shrink-0 [&_svg]:size-4">{icon}</span>}
        <span className="truncate">{model ?? "Select model"}</span>
        {effort != null && effort !== false && (
          <span data-slot="model-pill-effort" className="inline-flex shrink-0 items-center gap-1 text-muted-foreground/80">
            {effort}
          </span>
        )}
        {fastState && (
          <span
            data-slot="model-pill-fast"
            data-state={fastState}
            title={fastLabel}
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 text-xs tabular-nums",
              fastState === "on" && "text-warning",
              fastState === "off" && "text-muted-foreground/50",
              fastState === "cooldown" && "text-muted-foreground"
            )}
          >
            <RiFlashlightFill aria-hidden className="size-3.5!" />
            {fastState === "cooldown" && <span aria-hidden>{remaining}s</span>}
            <span className="sr-only">{fastLabel}</span>
          </span>
        )}
        {children}
        {chevron && <RiArrowDownSLine aria-hidden className="shrink-0 opacity-70" />}
      </Button>
    );
  }
);
PromptInputModelPill.displayName = "PromptInputModelPill";

export interface PromptInputModelSelectProps extends Omit<ButtonProps, "value" | "defaultValue"> {
  /** Models to choose from, each with an id, name and optional description. */
  models: PromptInputModel[];
  /** Reasoning-effort display next to the model name. */
  effort?: React.ReactNode;
  /** Fast-mode indicator: on, off or cooling down. */
  fast?: PromptInputFastMode;
  /** Seconds left while `fast="cooldown"`. */
  fastCooldown?: number;
  /** Called when the fast-mode cooldown countdown reaches zero. */
  onFastCooldownEnd?: () => void;
  /** Extra menu content below the model list (e.g. effort or fast-mode toggles). */
  menuFooter?: React.ReactNode;
  /** Controlled id of the selected model. */
  value?: string;
  /** Initially selected model id when `value` is not controlled. */
  defaultValue?: string;
  /** Called with the model id when the user picks a model. */
  onValueChange?: (id: string) => void;
  /** Heading inside the menu. */
  menuLabel?: string;
  /** Alignment of the menu against the pill. */
  align?: "start" | "center" | "end";
}

/** Model picker dropdown for the composer toolbar. */
export const PromptInputModelSelect = React.forwardRef<HTMLButtonElement, PromptInputModelSelectProps>(
  (
    {
      models,
      value,
      defaultValue,
      onValueChange,
      menuLabel = "Model",
      align = "start",
      effort,
      fast,
      fastCooldown,
      onFastCooldownEnd,
      menuFooter,
      className,
      ...props
    },
    ref
  ) => {
    const [selected, setSelected] = useControllableState<string>({
      value,
      defaultValue: defaultValue ?? models[0]?.id ?? "",
      onChange: onValueChange,
    });
    const current = models.find((m) => m.id === selected) ?? models[0];
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <PromptInputModelPill
            ref={ref}
            model={current?.name}
            icon={current?.icon}
            effort={effort}
            fast={fast}
            fastCooldown={fastCooldown}
            onFastCooldownEnd={onFastCooldownEnd}
            className={className}
            {...props}
          />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align={align}
            sideOffset={6}
            collisionPadding={8}
            className={cn(
              "z-50 min-w-60 max-w-80 overflow-hidden rounded-box border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
            )}
          >
            {menuLabel && (
              <DropdownMenu.Label className="px-2 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">
                {menuLabel}
              </DropdownMenu.Label>
            )}
            <DropdownMenu.RadioGroup value={selected} onValueChange={setSelected}>
              {models.map((model) => (
                <DropdownMenu.RadioItem
                  key={model.id}
                  value={model.id}
                  disabled={!!model.blockedReason}
                  className="relative flex cursor-default select-none items-start rounded-md py-2 ps-2 pe-8 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-accent data-[disabled]:opacity-50"
                >
                  <ModelSelectOption model={model} wrapHint />
                  <DropdownMenu.ItemIndicator className="absolute end-2 top-2.5 inline-flex text-primary">
                    <RiCheckLine aria-hidden className="size-4" />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
            {menuFooter && (
              <>
                <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-border" />
                {menuFooter}
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  }
);
PromptInputModelSelect.displayName = "PromptInputModelSelect";
