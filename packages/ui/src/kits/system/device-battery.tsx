import * as React from "react";
import {
  RiArrowRightUpLine,
  RiBluetoothLine,
  RiGamepadLine,
  RiHeadphoneLine,
  RiKeyboardBoxLine,
  RiLayoutBottom2Line,
  RiMouseLine,
  RiSmartphoneLine,
  RiSpeakerLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { cn, focusRing, hitArea } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { formatList } from "../../lib/format";
import { accentClasses, accentStyle, type Accent } from "../../lib/accent";
import { BatteryLevel, formatBatteryLevel } from "../../primitives/battery-level";
import { Skeleton } from "../../primitives/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../primitives/table";

export type BatteryDeviceKind = "headphones" | "trackpad" | "keyboard" | "mouse" | "speaker" | "controller" | "phone" | "other";

export interface BatteryDevicePart {
  id: string;
  /** "Left", "Right", "Case" … */
  label: string;
  /** Charge 0–100. */
  battery?: number;
  charging?: boolean;
}

export interface BatteryDevice {
  id: string;
  name: string;
  kind: BatteryDeviceKind | (string & {});
  /** Charge 0–100 (ignored for the level when `parts` are given). */
  battery?: number;
  /** Separately charged parts (earbuds and their case); shown as nested rows. */
  parts?: BatteryDevicePart[];
  /** `false` means paired but away. Default true. */
  connected?: boolean;
  charging?: boolean;
  /** Override the kind icon. */
  icon?: React.ReactNode;
}

export interface DeviceBatteryReading {
  device: BatteryDevice;
  part?: BatteryDevicePart;
  battery: number;
  /** "AirPods Pro, left" or "Magic Trackpad". */
  label: string;
}

export interface DeviceBatterySummary {
  connected: BatteryDevice[];
  away: BatteryDevice[];
  /** Lowest reading among connected devices and their parts. */
  lowest: DeviceBatteryReading | null;
  /** "Lowest battery: AirPods Pro, left, 42%. Beats Fit Pro is paired but away." */
  sentence: string;
}

const KIND_ICONS: Record<BatteryDeviceKind, RemixiconComponentType> = {
  headphones: RiHeadphoneLine,
  trackpad: RiLayoutBottom2Line,
  keyboard: RiKeyboardBoxLine,
  mouse: RiMouseLine,
  speaker: RiSpeakerLine,
  controller: RiGamepadLine,
  phone: RiSmartphoneLine,
  other: RiBluetoothLine,
};

const KIND_LABELS: Record<BatteryDeviceKind, string> = {
  headphones: "Headphones",
  trackpad: "Trackpad",
  keyboard: "Keyboard",
  mouse: "Mouse",
  speaker: "Speaker",
  controller: "Controller",
  phone: "Phone",
  other: "Device",
};

const isKnownKind = (kind: string): kind is BatteryDeviceKind => Object.hasOwn(KIND_ICONS, kind);
const hasReading = (v: number | undefined): v is number => typeof v === "number" && Number.isFinite(v);

/** Display label for a device kind ("Headphones"); unknown kinds are shown as given. */
export function deviceKindLabel(kind: string): string {
  return isKnownKind(kind) ? KIND_LABELS[kind] : kind;
}

/** Compute the connected and away devices, the lowest battery reading and a one-sentence summary. Pure. */
export function summarizeDeviceBatteries(
  devices: readonly BatteryDevice[] | null | undefined,
  options: { locale?: string } = {}
): DeviceBatterySummary {
  const list = devices ?? [];
  const connected = list.filter((d) => d.connected !== false);
  const away = list.filter((d) => d.connected === false);
  let lowest: DeviceBatteryReading | null = null;
  const consider = (reading: DeviceBatteryReading) => {
    if (!lowest || reading.battery < lowest.battery) lowest = reading;
  };
  for (const device of connected) {
    if (device.parts?.length) {
      for (const part of device.parts) {
        if (hasReading(part.battery)) {
          consider({ device, part, battery: clamp(part.battery, 0, 100), label: `${device.name}, ${part.label.toLocaleLowerCase(options.locale)}` });
        }
      }
    } else if (hasReading(device.battery)) {
      consider({ device, battery: clamp(device.battery, 0, 100), label: device.name });
    }
  }

  const sentences: string[] = [];
  const low = lowest as DeviceBatteryReading | null;
  if (low) sentences.push(`Lowest battery: ${low.label}, ${Math.round(low.battery)}%.`);
  else if (connected.length === 0) sentences.push("No devices connected.");
  if (away.length > 0) {
    sentences.push(`${formatList(away.map((d) => d.name), { locale: options.locale })} ${away.length === 1 ? "is" : "are"} paired but away.`);
  }
  return { connected, away, lowest: low, sentence: sentences.join(" ") };
}

export interface DeviceBatteryListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  /** Bluetooth devices with their battery level, charging state and connection. */
  devices: BatteryDevice[];
  /** Replaces the computed summary sentence. */
  summary?: React.ReactNode;
  /** Header title. Default "{n} connected". */
  title?: React.ReactNode;
  /** Link for the settings action in the header. */
  settingsHref?: string;
  /** Called when the settings action is used (renders a button when there is no `settingsHref`). */
  onOpenSettings?: () => void;
  /** Settings action text. Default "Bluetooth Settings". */
  settingsLabel?: React.ReactNode;
  /** List away (paired, not connected) devices too, dimmed. Default true. */
  showAway?: boolean;
  /** Categorical colour for the icon chips and the settings link. Default "cyan". */
  accent?: Accent;
  /** Shown when `devices` is empty. Default "No Bluetooth devices". */
  emptyState?: React.ReactNode;
  /** Accessible name of the devices table. Default "Device batteries". */
  label?: string;
  /** BCP 47 locale used to format numbers. */
  locale?: string;
  /** Data is on its way. With no devices yet the summary and table show placeholders; with devices the root is only marked busy. */
  loading?: boolean;
  /** Placeholder device rows while loading. Default 3. */
  loadingRows?: number;
}

function LevelCells({ battery, charging, away }: { battery?: number; charging?: boolean; away?: boolean }) {
  if (away) {
    return (
      <>
        <TableCell className="hidden border-b-0 @lg:table-cell" />
        <TableCell align="right" className="border-b-0 text-muted-foreground">
          Away
        </TableCell>
      </>
    );
  }
  if (!hasReading(battery)) {
    return (
      <>
        <TableCell className="hidden border-b-0 @lg:table-cell" />
        <TableCell className="border-b-0" />
      </>
    );
  }
  return (
    <>
      <TableCell className="hidden border-b-0 @lg:table-cell">
        <BatteryLevel variant="bar" value={battery} charging={charging} showValue={false} aria-hidden />
      </TableCell>
      <TableCell align="right" className="border-b-0">
        <BatteryLevel variant="text" value={battery} charging={charging} />
      </TableCell>
    </>
  );
}

/**
 * Bluetooth device batteries: a summary card (connected count, lowest battery, away devices, settings link)
 * over a table of devices by kind, with nested rows for separately charged parts.
 */
export const DeviceBatteryList = React.forwardRef<HTMLDivElement, DeviceBatteryListProps>(
  (
    {
      devices,
      summary,
      title,
      settingsHref,
      onOpenSettings,
      settingsLabel = "Bluetooth Settings",
      showAway = true,
      accent = "cyan",
      emptyState = "No Bluetooth devices",
      label = "Device batteries",
      locale,
      loading = false,
      loadingRows = 3,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const skeleton = loading && devices.length === 0;
    const computed = React.useMemo(() => summarizeDeviceBatteries(devices, { locale }), [devices, locale]);
    const rows = showAway ? devices : computed.connected;
    const titleId = React.useId();
    const lowest = computed.lowest;

    const settingsClass = cn(
      hitArea,
      "inline-flex items-center gap-0.5 whitespace-nowrap rounded-xs font-medium underline-offset-4 hover:underline [&_svg]:size-4",
      accentClasses.text,
      focusRing
    );
    const settingsContent = (
      <>
        {settingsLabel}
        <RiArrowRightUpLine aria-hidden />
      </>
    );

    return (
      <div
        ref={ref}
        data-slot="device-battery-list"
        aria-busy={loading || undefined}
        style={accentStyle(accent, style)}
        className={cn("@container flex flex-col gap-4 text-sm", className)}
        {...props}
      >
        {skeleton ? <span className="sr-only">Loading devices…</span> : null}
        <section
          aria-labelledby={skeleton && title == null ? undefined : titleId}
          data-slot="device-battery-summary"
          className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-box border border-border bg-card p-4 shadow-xs"
        >
          <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
            <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5", accentClasses.soft)}>
              <RiBluetoothLine />
            </span>
            <div className="flex min-w-0 flex-col">
              {skeleton && title == null ? (
                <Skeleton data-slot="device-battery-skeleton" shape="text" className="my-1 h-[1em] w-28" />
              ) : (
                <div id={titleId} className="text-base font-semibold text-foreground">
                  {title ?? `${computed.connected.length} connected`}
                </div>
              )}
              {skeleton && summary == null ? (
                <Skeleton data-slot="device-battery-skeleton" shape="text" className="mt-1 w-56 max-w-full" />
              ) : (summary ?? computed.sentence) ? (
                <p className="m-0 text-muted-foreground">{summary ?? computed.sentence}</p>
              ) : null}
            </div>
          </div>
          {skeleton || lowest || settingsHref || onOpenSettings ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {skeleton ? (
                <div data-slot="device-battery-skeleton" aria-hidden className="flex items-center gap-3">
                  <Skeleton className="h-2 w-24 rounded-full" />
                  <Skeleton shape="text" className="w-8" />
                </div>
              ) : lowest ? (
                <BatteryLevel
                  variant="bar"
                  size="lg"
                  value={lowest.battery}
                  charging={lowest.part?.charging ?? lowest.device.charging}
                  label={`Lowest: ${lowest.label}, ${formatBatteryLevel(lowest.battery, { charging: lowest.part?.charging ?? lowest.device.charging })}`}
                  className="gap-3 [&>span:last-child]:font-semibold"
                />
              ) : null}
              {settingsHref ? (
                <a href={settingsHref} onClick={onOpenSettings} className={settingsClass}>
                  {settingsContent}
                </a>
              ) : onOpenSettings ? (
                <button type="button" onClick={onOpenSettings} className={cn("cursor-pointer", settingsClass)}>
                  {settingsContent}
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        <div data-slot="device-battery-devices" className="rounded-box border border-border bg-card py-2 shadow-xs">
          <Table bare aria-label={label} className="table-fixed">
            <TableHeader>
              <TableRow>
                {["Device", "Kind", "Battery", "Level"].map((h) => (
                  <TableHead
                    key={h}
                    align={h === "Level" ? "right" : "left"}
                    className={cn(
                      "border-b-0 bg-transparent uppercase tracking-wider",
                      h === "Kind" && "hidden w-32 @xl:table-cell",
                      h === "Battery" && "hidden w-32 @lg:table-cell @3xl:w-52",
                      h === "Level" && "w-24"
                    )}
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {skeleton ? (
                Array.from({ length: Math.max(0, loadingRows) }, (_, i) => (
                  <TableRow key={i} data-slot="device-battery-skeleton-row" aria-hidden className="hover:bg-transparent">
                    <TableCell className="border-b-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <Skeleton className="size-7 shrink-0 rounded-md" />
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <Skeleton shape="text" className="w-28 max-w-full" />
                          <Skeleton shape="text" className="h-[0.7em] w-16 @xl:hidden" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden border-b-0 @xl:table-cell">
                      <Skeleton shape="text" className="w-16" />
                    </TableCell>
                    <TableCell className="hidden border-b-0 @lg:table-cell">
                      <Skeleton className="h-1.5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell align="right" className="border-b-0">
                      <Skeleton shape="text" className="ms-auto w-12" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="border-b-0 py-8 text-center text-muted-foreground">
                    {emptyState}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((device) => {
                  const away = device.connected === false;
                  const Icon = isKnownKind(device.kind) ? KIND_ICONS[device.kind] : RiBluetoothLine;
                  const kind = deviceKindLabel(device.kind);
                  const parts = device.parts ?? [];
                  return (
                    <React.Fragment key={device.id}>
                      <TableRow data-away={away ? "" : undefined} className={cn(away && "[&>td:not(:last-child)]:opacity-60")}>
                        <TableCell className="border-b-0">
                          <div className="flex min-w-0 items-center gap-3">
                            <span aria-hidden className={cn("flex size-7 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", accentClasses.soft)}>
                              {device.icon ?? <Icon />}
                            </span>
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate font-medium text-foreground">{device.name}</span>
                              <span className="truncate text-xs text-muted-foreground @xl:hidden">{kind}</span>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden border-b-0 text-muted-foreground @xl:table-cell">{kind}</TableCell>
                        <LevelCells battery={parts.length ? undefined : device.battery} charging={device.charging} away={away} />
                      </TableRow>
                      {away
                        ? null
                        : parts.map((part) => (
                            <TableRow key={part.id} data-slot="device-battery-part" className="text-muted-foreground">
                              <TableCell className="border-b-0 py-1.5 ps-14">
                                <span className="sr-only">{device.name}, </span>
                                {part.label}
                              </TableCell>
                              <TableCell className="hidden border-b-0 py-1.5 @xl:table-cell" />
                              <LevelCells battery={part.battery} charging={part.charging} />
                            </TableRow>
                          ))}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
);
DeviceBatteryList.displayName = "DeviceBatteryList";
