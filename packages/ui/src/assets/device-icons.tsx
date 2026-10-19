import {
  RiCastLine,
  RiComputerLine,
  RiGlobalLine,
  RiMacbookLine,
  RiServerLine,
  RiSmartphoneLine,
  RiSpeaker2Line,
  RiTabletLine,
  RiTvLine,
  type RemixiconComponentType,
} from "@remixicon/react";

/** Device kinds with an icon: shared by device sessions, sign-ins, live visitors and the cast picker. */
export type DeviceIconKind = "desktop" | "laptop" | "phone" | "tablet" | "tv" | "browser" | "server" | "speaker" | "cast";

export const deviceIcons: Readonly<Record<DeviceIconKind, RemixiconComponentType>> = {
  desktop: RiComputerLine,
  laptop: RiMacbookLine,
  phone: RiSmartphoneLine,
  tablet: RiTabletLine,
  tv: RiTvLine,
  browser: RiGlobalLine,
  server: RiServerLine,
  speaker: RiSpeaker2Line,
  cast: RiCastLine,
};

export const deviceLabels: Readonly<Record<DeviceIconKind, string>> = {
  desktop: "Desktop",
  laptop: "Laptop",
  phone: "Phone",
  tablet: "Tablet",
  tv: "TV",
  browser: "Browser",
  server: "Server",
  speaker: "Speaker",
  cast: "Cast device",
};

/** Icon for a device kind (any case); `fallback` (the globe) for a missing or unknown kind. */
export function deviceIcon(
  kind: string | null | undefined,
  fallback: RemixiconComponentType = RiGlobalLine
): RemixiconComponentType {
  const key = kind?.trim().toLowerCase();
  return key && Object.hasOwn(deviceIcons, key) ? deviceIcons[key as DeviceIconKind] : fallback;
}
