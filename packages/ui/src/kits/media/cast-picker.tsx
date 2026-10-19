import * as React from "react";
import {
  RiCastLine,
  RiCheckLine,
  RiRefreshLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import { deviceIcons } from "../../assets/device-icons";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Spinner } from "../../primitives/spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../primitives/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";

/* ------------------------------------------------------------------ */
/* DeviceIcon                                                          */
/* ------------------------------------------------------------------ */

export type DeviceKind = "tv" | "phone" | "tablet" | "laptop" | "desktop" | "speaker" | "browser" | "cast";

const deviceAliases: Record<string, DeviceKind> = {
  tv: "tv",
  television: "tv",
  phone: "phone",
  mobile: "phone",
  smartphone: "phone",
  tablet: "tablet",
  ipad: "tablet",
  laptop: "laptop",
  notebook: "laptop",
  desktop: "desktop",
  computer: "desktop",
  pc: "desktop",
  speaker: "speaker",
  audio: "speaker",
  browser: "browser",
  web: "browser",
  cast: "cast",
  chromecast: "cast",
};

/** Normalize a free-form device type ("Mobile", "TV", "chromecast") to a `DeviceKind`. Unknown → "desktop". */
export function resolveDeviceKind(type?: string | null): DeviceKind {
  return (type && deviceAliases[type.trim().toLowerCase()]) || "desktop";
}

export interface DeviceIconProps extends Omit<React.ComponentProps<RemixiconComponentType>, "type" | "ref"> {
  /** tv, phone, tablet, laptop, desktop, speaker, browser, cast (case-insensitive aliases accepted). */
  type?: string | null;
  /** Accessible label; decorative (aria-hidden) when omitted. */
  label?: string;
}

/** One glyph per kind of device; unrecognised types fall back to a desktop monitor. */
export const DeviceIcon = React.forwardRef<SVGSVGElement, DeviceIconProps>(function DeviceIcon({ type, label, className, ...props }, ref) {
  const Icon = deviceIcons[resolveDeviceKind(type)];
  return (
    <Icon
      ref={ref}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("size-5 shrink-0", className)}
      {...props}
    />
  );
});
DeviceIcon.displayName = "DeviceIcon";

/* ------------------------------------------------------------------ */
/* CastPicker                                                          */
/* ------------------------------------------------------------------ */

export type CastDeviceStatus = "available" | "connecting" | "connected" | "busy" | "unavailable";

export interface CastDevice {
  id: string;
  name: string;
  type?: string;
  /** Secondary line, e.g. "Safari on iPhone" or "Playing Dune". */
  description?: React.ReactNode;
  /** The device you are on. */
  current?: boolean;
  status?: CastDeviceStatus;
}

export interface CastDeviceListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  devices: CastDevice[];
  onSelect?: (device: CastDevice) => void;
  onDisconnect?: (device: CastDevice) => void;
  loading?: boolean;
  error?: React.ReactNode;
  onRetry?: () => void;
  /** Shown when there is nothing to list. Default "No other devices are available right now". */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  emptyMessage?: React.ReactNode;
  /** Accessible list name. Default "Devices". */
  label?: string;
}

const statusText: Partial<Record<CastDeviceStatus, string>> = {
  connecting: "Connecting…",
  connected: "Connected",
  busy: "Busy",
  unavailable: "Unavailable",
};

/** The device rows used inside `CastPicker` (usable on its own, e.g. in a settings page). */
export const CastDeviceList = React.forwardRef<HTMLDivElement, CastDeviceListProps>(
  (
    {
      devices,
      onSelect,
      onDisconnect,
      loading,
      error,
      onRetry,
      emptyState,
      emptyMessage,
      label = "Devices",
      className,
      ...props
    },
    ref
  ) => {
    const connecting = devices.some((d) => d.status === "connecting");
    let body: React.ReactNode;
    if (loading) {
      body = (
        <div className="flex justify-center py-8">
          <Spinner label="Looking for devices" />
        </div>
      );
    } else if (error) {
      body = (
        <div role="alert" className="flex flex-col items-center gap-3 py-6 text-center text-sm text-destructive">
          {error}
          {onRetry && (
            <Button variant="secondary" size="sm" leadingIcon={<RiRefreshLine aria-hidden />} onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      );
    } else if (!devices.length) {
      body = <p className="py-6 text-center text-sm text-muted-foreground">{emptyState ?? emptyMessage ?? "No other devices are available right now"}</p>;
    } else {
      body = (
        <ul aria-label={label} className="flex flex-col gap-1">
          {devices.map((d) => {
            const status = d.status ?? "available";
            const disabled = status === "busy" || status === "unavailable" || (connecting && status !== "connecting");
            const connected = status === "connected";
            const stateText = statusText[status];
            return (
              <li key={d.id} className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={disabled || status === "connecting"}
                  aria-current={d.current ? "true" : undefined}
                  aria-busy={status === "connecting" || undefined}
                  data-status={status}
                  onClick={() => !connected && onSelect?.(d)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-3 rounded-control px-3 py-2.5 text-start transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-55 aria-busy:opacity-100",
                    connected && "bg-primary-soft hover:bg-primary-soft",
                    focusRing
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full",
                      connected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <DeviceIcon type={d.type} className="size-[18px]" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={cn("truncate text-sm font-medium", connected ? "text-primary-soft-foreground" : "text-foreground")}>
                        {d.name}
                      </span>
                      {d.current && (
                        <span className="shrink-0 rounded-control bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                          This device
                        </span>
                      )}
                    </span>
                    {(d.description || stateText) && (
                      <span className="truncate text-xs text-muted-foreground">
                        {stateText ?? d.description}
                        {stateText && d.description ? <span aria-hidden> · </span> : null}
                        {stateText && d.description}
                      </span>
                    )}
                  </span>
                  {status === "connecting" && <Spinner size="sm" label={`Connecting to ${d.name}`} />}
                  {connected && <RiCheckLine aria-hidden className="size-5 shrink-0 text-primary" />}
                </button>
                {connected && onDisconnect && (
                  <Button variant="ghost" size="sm" onClick={() => onDisconnect(d)} aria-label={`Disconnect ${d.name}`}>
                    Disconnect
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      );
    }
    return (
      <div ref={ref} className={cn("min-w-0", className)} {...props}>
        {body}
      </div>
    );
  }
);
CastDeviceList.displayName = "CastDeviceList";

export interface CastPickerProps extends Omit<CastDeviceListProps, "title"> {
  /** Heading. Default "Play on…". */
  title?: React.ReactNode;
  /** What is about to be cast (shown under the title). */
  description?: React.ReactNode;
  /** Modal dialog (bottom sheet on phones) or an anchored popover. Default "dialog". */
  variant?: "dialog" | "popover";
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Custom trigger element. Default: an icon button with a cast glyph. */
  trigger?: React.ReactElement;
  triggerLabel?: string;
  /** Close as soon as a device is picked. Default false (stay open to show connecting/connected). */
  closeOnSelect?: boolean;
  /** Trigger tone, e.g. on top of a video. */
  triggerTone?: "default" | "overlay";
  contentClassName?: string;
}

/** Lists cast targets (TVs, phones, speakers…) with current-device marker and connecting/connected states. */
export function CastPicker({
  title = "Play on…",
  description,
  variant = "dialog",
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger,
  triggerLabel = "Play on another device",
  closeOnSelect = false,
  triggerTone = "default",
  contentClassName,
  onSelect,
  devices,
  ...listProps
}: CastPickerProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const connected = devices.find((d) => d.status === "connected" && !d.current);
  const handleSelect = (d: CastDevice) => {
    onSelect?.(d);
    if (closeOnSelect) setOpen(false);
  };
  const triggerEl = trigger ?? (
    <Button
      variant="ghost"
      size="icon"
      aria-label={connected ? `${triggerLabel} (connected to ${connected.name})` : triggerLabel}
      className={cn(
        triggerTone === "overlay" && "text-white/85 hover:bg-white/15 hover:text-white",
        connected && (triggerTone === "overlay" ? "text-white" : "text-primary")
      )}
    >
      <RiCastLine aria-hidden />
    </Button>
  );
  const list = <CastDeviceList devices={devices} onSelect={handleSelect} {...listProps} />;

  if (variant === "popover") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{triggerEl}</PopoverTrigger>
        <PopoverContent align="end" padded={false} className={cn("w-80 p-2", contentClassName)} aria-label={typeof title === "string" ? title : "Play on"}>
          <div className="px-2 pb-2 pt-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
          </div>
          {list}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerEl}</DialogTrigger>
      <DialogContent size="sm" className={contentClassName} >
        <DialogHeader icon={<RiCastLine aria-hidden />} tone="primary">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription className="truncate">{description}</DialogDescription> : <DialogDescription className="sr-only">Choose a device</DialogDescription>}
        </DialogHeader>
        {list}
      </DialogContent>
    </Dialog>
  );
}
CastPicker.displayName = "CastPicker";
