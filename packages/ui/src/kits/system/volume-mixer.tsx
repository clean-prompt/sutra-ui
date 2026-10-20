import * as React from "react";
import { RiArrowDownSLine, RiVolumeUpLine } from "@remixicon/react";
import { cn, focusRing, hitArea } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { accentClasses, accentStyle, type Accent } from "../../lib/accent";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Monogram } from "../../primitives/monogram";
import { Skeleton } from "../../primitives/progress";
import { VolumeSlider } from "../../primitives/volume-slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../../primitives/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../primitives/table";

export interface VolumeMixerApp {
  id: string;
  name: string;
  /** App icon (an `<img>` or icon). Defaults to a `Monogram` of the name. */
  icon?: React.ReactNode;
  /** The app is producing sound right now ("Playing" vs "Silent"). */
  playing?: boolean;
  /** Volume 0–100. */
  volume: number;
  muted?: boolean;
}

export interface AudioOutputDevice {
  id: string;
  name: string;
}

export interface VolumeMixerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "onVolumeChange"> {
  /** Apps using audio, each with a name, volume, muted state and playing flag. */
  apps: VolumeMixerApp[];
  /** Called with the app id and the new volume (0 to 100) while the user moves its slider. */
  onAppVolumeChange?: (id: string, volume: number) => void;
  /** Called with the app id and the new state when the user mutes or unmutes an app. */
  onAppMutedChange?: (id: string, muted: boolean) => void;
  /** Master output volume 0–100. */
  volume?: number;
  /** Initial master volume when `volume` is not controlled. */
  defaultVolume?: number;
  /** Called with the master volume (0 to 100) while the user moves the slider. */
  onVolumeChange?: (volume: number) => void;
  /** Controlled master mute state. */
  muted?: boolean;
  /** Initial master mute state when `muted` is not controlled. */
  defaultMuted?: boolean;
  /** Called with the new state when the user mutes or unmutes the output. */
  onMutedChange?: (muted: boolean) => void;
  /** Output devices for the picker. With one device or none, the name is shown as plain text. */
  devices?: AudioOutputDevice[];
  /** Selected device id. */
  device?: string;
  /** Initially selected device id when `device` is not controlled. */
  defaultDevice?: string;
  /** Called with the device id when the user picks an output device. */
  onDeviceChange?: (id: string) => void;
  /** Header title. Default "Output". */
  outputLabel?: React.ReactNode;
  /** Categorical colour for the icon chip, sliders and playing indicator. Default "pink". */
  accent?: Accent;
  /** Shown when `apps` is empty. Default "No apps using audio". */
  emptyState?: React.ReactNode;
  /** Accessible name of the apps table. Default "App volumes". */
  label?: string;
  /** Disables the master and per-app controls. */
  disabled?: boolean;
  /** Data is on its way. With no apps yet the card and table show placeholders; with apps the root is only marked busy. */
  loading?: boolean;
  /** Placeholder app rows while loading. Default 3. */
  loadingRows?: number;
}

function PlayingBars() {
  return (
    <span aria-hidden data-slot="volume-mixer-playing" className="inline-flex h-3 items-end gap-px">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className={cn("h-full w-0.5 origin-bottom rounded-full animate-bar-scale motion-reduce:animate-none", accentClasses.solid)}
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

function AppStatus({ playing }: { playing?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", playing ? "text-foreground" : "text-muted-foreground")}>
      {playing ? <PlayingBars /> : null}
      {playing ? "Playing" : "Silent"}
    </span>
  );
}

/**
 * Sound mixer: an output card (device picker, master volume) over a table of apps with their status,
 * a per-app `VolumeSlider` and level. Data in, events out.
 */
export const VolumeMixer = React.forwardRef<HTMLDivElement, VolumeMixerProps>(
  (
    {
      apps,
      onAppVolumeChange,
      onAppMutedChange,
      volume,
      defaultVolume = 100,
      onVolumeChange,
      muted,
      defaultMuted,
      onMutedChange,
      devices = [],
      device: deviceProp,
      defaultDevice,
      onDeviceChange,
      outputLabel = "Output",
      accent = "pink",
      emptyState = "No apps using audio",
      label = "App volumes",
      disabled,
      loading = false,
      loadingRows = 3,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const skeleton = loading && apps.length === 0;
    const [deviceId, setDeviceId] = useControllableState<string | undefined>({
      value: deviceProp,
      defaultValue: defaultDevice ?? devices[0]?.id,
      onChange: (id) => id !== undefined && onDeviceChange?.(id),
    });
    const current = devices.find((d) => d.id === deviceId) ?? devices[0];
    const titleId = React.useId();

    return (
      <div
        ref={ref}
        data-slot="volume-mixer"
        aria-busy={loading || undefined}
        style={accentStyle(accent, style)}
        className={cn("@container flex flex-col gap-4 text-sm", className)}
        {...props}
      >
        {skeleton ? <span className="sr-only">Loading audio…</span> : null}
        <section
          aria-labelledby={titleId}
          data-slot="volume-mixer-output"
          className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-box border border-border bg-card p-4 shadow-xs"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5", accentClasses.soft)}>
              <RiVolumeUpLine />
            </span>
            <div className="flex min-w-0 flex-col items-start">
              <div id={titleId} className="text-base font-semibold text-foreground">
                {outputLabel}
              </div>
              {devices.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild disabled={disabled}>
                    <button
                      type="button"
                      className={cn(
                        hitArea,
                        "-mx-1 inline-flex max-w-full items-center gap-1 rounded-xs px-1 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
                        focusRing
                      )}
                    >
                      <span className="sr-only">Output device: </span>
                      <span className="truncate">{current?.name}</span>
                      <RiArrowDownSLine aria-hidden className="size-4 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Output device</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={current?.id} onValueChange={setDeviceId}>
                      {devices.map((d) => (
                        <DropdownMenuRadioItem key={d.id} value={d.id}>
                          {d.name}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : current ? (
                <span className="truncate text-muted-foreground">{current.name}</span>
              ) : skeleton ? (
                <Skeleton data-slot="volume-mixer-skeleton" shape="text" className="mt-1 w-32" />
              ) : null}
            </div>
          </div>
          {skeleton ? (
            <div data-slot="volume-mixer-skeleton" aria-hidden className="flex min-w-48 flex-1 basis-full items-center gap-2 @md:basis-0">
              <Skeleton className="size-7 shrink-0 rounded-control" />
              <Skeleton className="h-1.5 min-w-10 flex-1 rounded-full" />
              <Skeleton shape="text" className="h-[1em] w-12 shrink-0" />
            </div>
          ) : (
            <VolumeSlider
              value={volume}
              defaultValue={defaultVolume}
              onValueChange={onVolumeChange}
              muted={muted}
              defaultMuted={defaultMuted}
              onMutedChange={onMutedChange}
              accent={accent}
              disabled={disabled}
              label="Output volume"
              muteLabel="Mute output"
              levelClassName="text-base font-semibold"
              className="min-w-48 flex-1 basis-full @md:basis-0"
            />
          )}
        </section>

        <div data-slot="volume-mixer-apps" className="rounded-box border border-border bg-card py-2 shadow-xs">
          <Table bare aria-label={label} className="table-fixed">
            <TableHeader>
              <TableRow>
                {["App", "Status", "Volume", "Level"].map((h) => (
                  <TableHead
                    key={h}
                    align={h === "Level" ? "right" : "left"}
                    className={cn(
                      "border-b-0 bg-transparent uppercase tracking-wider",
                      h === "Status" && "hidden w-28 @xl:table-cell",
                      h === "Volume" && "w-[60%] @lg:w-[48%] @xl:w-[40%]",
                      h === "Level" && "hidden w-20 @lg:table-cell"
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
                  <TableRow key={i} data-slot="volume-mixer-skeleton-row" aria-hidden className="hover:bg-transparent">
                    <TableCell className="border-b-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <Skeleton className="size-7 shrink-0 rounded-md" />
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <Skeleton shape="text" className="w-24 max-w-full" />
                          <Skeleton shape="text" className="h-[0.7em] w-14 @xl:hidden" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden border-b-0 @xl:table-cell">
                      <Skeleton shape="text" className="w-14" />
                    </TableCell>
                    <TableCell className="border-b-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <Skeleton className="size-6 shrink-0 rounded-control" />
                        <Skeleton className="h-1.5 min-w-10 flex-1 rounded-full" />
                      </div>
                    </TableCell>
                    <TableCell align="right" className="hidden border-b-0 @lg:table-cell">
                      <Skeleton shape="text" className="ms-auto w-10" />
                    </TableCell>
                  </TableRow>
                ))
              ) : apps.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="border-b-0 py-8 text-center text-muted-foreground">
                    {emptyState}
                  </TableCell>
                </TableRow>
              ) : (
                apps.map((app) => {
                  const level = app.muted ? "Muted" : `${Math.round(clamp(app.volume, 0, 100))}%`;
                  return (
                    <TableRow key={app.id} data-playing={app.playing ? "" : undefined}>
                      <TableCell className="border-b-0">
                        <div className="flex min-w-0 items-center gap-3">
                          <span aria-hidden className="inline-flex size-7 shrink-0 items-center justify-center [&_img]:size-7 [&_img]:rounded-md [&_svg]:size-5">
                            {app.icon ?? <Monogram name={app.name} size="sm" />}
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate font-medium text-foreground">{app.name}</span>
                            <span className="text-xs @xl:hidden">
                              <AppStatus playing={app.playing} />
                            </span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden border-b-0 @xl:table-cell">
                        <AppStatus playing={app.playing} />
                      </TableCell>
                      <TableCell className="border-b-0">
                        <VolumeSlider
                          size="sm"
                          value={app.volume}
                          muted={app.muted ?? false}
                          onValueChange={(v) => onAppVolumeChange?.(app.id, v)}
                          onMutedChange={(m) => onAppMutedChange?.(app.id, m)}
                          accent={accent}
                          disabled={disabled}
                          label={`${app.name} volume`}
                          muteLabel={`Mute ${app.name}`}
                          levelClassName="@lg:hidden"
                        />
                      </TableCell>
                      <TableCell
                        align="right"
                        className={cn("hidden border-b-0 font-medium tabular-nums @lg:table-cell", app.muted ? "text-muted-foreground" : "text-foreground")}
                      >
                        {level}
                      </TableCell>
                    </TableRow>
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
VolumeMixer.displayName = "VolumeMixer";
