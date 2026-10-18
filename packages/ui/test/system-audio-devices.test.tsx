import * as React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RangeSlider, Slider } from "../src/primitives/slider";
import { VolumeSlider } from "../src/primitives/volume-slider";
import { BatteryLevel, batteryLevelState, formatBatteryLevel } from "../src/primitives/battery-level";
import { VolumeMixer, type VolumeMixerApp } from "../src/kits/system/volume-mixer";
import { DeviceBatteryList, summarizeDeviceBatteries, type BatteryDevice } from "../src/kits/system/device-battery";
import { axeViolations } from "./a11y";

/* ------------------------------------------------------------------ */
/* Slider getValueText                                                 */
/* ------------------------------------------------------------------ */

describe("Slider getValueText", () => {
  it("sets aria-valuetext per thumb and follows the value", async () => {
    const user = userEvent.setup();
    render(<Slider thumbLabels={["Level"]} defaultValue={[40]} getValueText={(v) => `${v} dB`} />);
    const thumb = screen.getByRole("slider", { name: "Level" });
    expect(thumb).toHaveAttribute("aria-valuetext", "40 dB");
    thumb.focus();
    await user.keyboard("{ArrowRight}");
    expect(thumb).toHaveAttribute("aria-valuetext", "41 dB");
  });

  it("passes the thumb index and is omitted by default", () => {
    const { unmount } = render(<RangeSlider defaultValue={[10, 80]} getValueText={(v, i) => (i === 0 ? `from ${v}` : `to ${v}`)} />);
    expect(screen.getByRole("slider", { name: "Minimum" })).toHaveAttribute("aria-valuetext", "from 10");
    expect(screen.getByRole("slider", { name: "Maximum" })).toHaveAttribute("aria-valuetext", "to 80");
    unmount();
    render(<Slider aria-label="Plain" defaultValue={[5]} />);
    expect(screen.getByRole("slider")).not.toHaveAttribute("aria-valuetext");
  });
});

/* ------------------------------------------------------------------ */
/* VolumeSlider                                                        */
/* ------------------------------------------------------------------ */

describe("VolumeSlider", () => {
  it("names the slider and the mute toggle and shows the level", () => {
    render(<VolumeSlider label="Music volume" defaultValue={64} />);
    const slider = screen.getByRole("slider", { name: "Music volume" });
    expect(slider).toHaveAttribute("aria-valuenow", "64");
    expect(slider).toHaveAttribute("aria-valuetext", "64%");
    const mute = screen.getByRole("button", { name: "Mute Music volume" });
    expect(mute).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("64%")).toBeInTheDocument();
  });

  it("is uncontrolled: mute keeps the value and unmute restores it", async () => {
    const user = userEvent.setup();
    const onMutedChange = vi.fn();
    const { container } = render(<VolumeSlider label="Volume" defaultValue={40} onMutedChange={onMutedChange} />);
    const mute = screen.getByRole("button", { name: "Mute Volume" });
    await user.click(mute);
    expect(onMutedChange).toHaveBeenLastCalledWith(true);
    expect(mute).toHaveAttribute("aria-pressed", "true");
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuetext", "Muted");
    expect(slider).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText("Muted")).toBeInTheDocument();
    expect(container.querySelector("[data-slot=volume-slider]")).toHaveAttribute("data-muted");
    await user.click(mute);
    expect(onMutedChange).toHaveBeenLastCalledWith(false);
    expect(slider).toHaveAttribute("aria-valuetext", "40%");
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("moves with the keyboard and unmutes when moved while muted", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onMutedChange = vi.fn();
    render(<VolumeSlider defaultValue={50} defaultMuted onValueChange={onValueChange} onMutedChange={onMutedChange} />);
    const slider = screen.getByRole("slider", { name: "Volume" });
    expect(slider).toHaveAttribute("aria-valuetext", "Muted");
    slider.focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(51);
    expect(onMutedChange).toHaveBeenLastCalledWith(false);
    expect(slider).toHaveAttribute("aria-valuetext", "51%");
    await user.keyboard("{End}");
    expect(slider).toHaveAttribute("aria-valuenow", "100");
  });

  it("is controlled: follows value and muted props and reports requests", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onMutedChange = vi.fn();
    const { rerender } = render(
      <VolumeSlider value={30} muted={false} onValueChange={onValueChange} onMutedChange={onMutedChange} />
    );
    const slider = screen.getByRole("slider");
    slider.focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(31);
    expect(slider).toHaveAttribute("aria-valuenow", "30");
    await user.click(screen.getByRole("button", { name: "Mute Volume" }));
    expect(onMutedChange).toHaveBeenLastCalledWith(true);
    expect(slider).toHaveAttribute("aria-valuetext", "30%");
    rerender(<VolumeSlider value={70} muted onValueChange={onValueChange} onMutedChange={onMutedChange} />);
    expect(slider).toHaveAttribute("aria-valuenow", "70");
    expect(slider).toHaveAttribute("aria-valuetext", "Muted");
  });

  it("disables both controls and can hide the level", () => {
    render(<VolumeSlider disabled showLevel={false} defaultValue={20} />);
    expect(screen.getByRole("button", { name: "Mute Volume" })).toBeDisabled();
    expect(screen.queryByText("20%")).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<VolumeSlider label="Music volume" defaultValue={64} defaultMuted accent="pink" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* BatteryLevel                                                        */
/* ------------------------------------------------------------------ */

describe("BatteryLevel", () => {
  it("classifies against the low and critical thresholds", () => {
    expect(batteryLevelState(42)).toBe("ok");
    expect(batteryLevelState(20)).toBe("low");
    expect(batteryLevelState(10)).toBe("critical");
    expect(batteryLevelState(30, { low: 30 })).toBe("low");
    expect(batteryLevelState(undefined)).toBe("unknown");
    expect(batteryLevelState(Number.NaN)).toBe("unknown");
  });

  it("formats accessible text", () => {
    expect(formatBatteryLevel(42, { charging: true })).toBe("42% battery, charging");
    expect(formatBatteryLevel(15)).toBe("15% battery, low");
    expect(formatBatteryLevel(5)).toBe("5% battery, critically low");
    expect(formatBatteryLevel(140)).toBe("100% battery");
    expect(formatBatteryLevel(null)).toBe("Battery level unknown");
  });

  it("renders each variant with a percentage and an accessible name", () => {
    const { container } = render(
      <>
        <BatteryLevel value={42} charging />
        <BatteryLevel value={18} variant="bar" />
        <BatteryLevel value={7} variant="text" />
      </>
    );
    expect(screen.getByRole("img", { name: "42% battery, charging" })).toHaveAttribute("data-state", "ok");
    const low = screen.getByRole("img", { name: "18% battery, low" });
    expect(low).toHaveAttribute("data-state", "low");
    expect(within(low).getByText("18%")).toHaveClass("text-warning-soft-foreground");
    const fill = low.querySelector<HTMLElement>("[data-slot=battery-level-fill]")!;
    expect(fill.style.width).toBe("18%");
    expect(fill).toHaveClass("bg-warning");
    const critical = screen.getByRole("img", { name: "7% battery, critically low" });
    expect(within(critical).getByText("7%")).toHaveClass("text-destructive");
    expect(critical.querySelector("[data-slot=battery-level-fill]")).toBeNull();
    expect(container.querySelectorAll("[data-charging]")).toHaveLength(1);
  });

  it("shows a dash for an unknown reading and accepts a label override", () => {
    render(<BatteryLevel value={undefined} label="Case battery unknown" />);
    const el = screen.getByRole("img", { name: "Case battery unknown" });
    expect(el).toHaveTextContent("—");
  });

  it("has no axe violations", async () => {
    const { container } = render(<BatteryLevel value={42} variant="bar" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* VolumeMixer                                                         */
/* ------------------------------------------------------------------ */

const apps: VolumeMixerApp[] = [
  { id: "music", name: "Music", playing: true, volume: 100 },
  { id: "chrome", name: "Google Chrome", playing: true, volume: 35 },
  { id: "slack", name: "Slack", volume: 60, muted: true },
];

const devices = [
  { id: "speakers", name: "MacBook Pro Speakers" },
  { id: "airpods", name: "AirPods Pro" },
];

describe("VolumeMixer", () => {
  it("renders the output card and one row per app", () => {
    render(<VolumeMixer apps={apps} devices={devices} defaultVolume={64} />);
    expect(screen.getByRole("region", { name: "Output" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Output volume" })).toHaveAttribute("aria-valuetext", "64%");
    const table = screen.getByRole("table", { name: "App volumes" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(4);
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["App", "Status", "Volume", "Level"]);
    const slack = rows[3]!;
    expect(within(slack).getByRole("slider", { name: "Slack volume" })).toHaveAttribute("aria-valuetext", "Muted");
    expect(within(slack).getByRole("button", { name: "Mute Slack" })).toHaveAttribute("aria-pressed", "true");
    expect(within(slack).getAllByText("Silent").length).toBeGreaterThan(0);
    expect(within(rows[1]!).getAllByText("Playing").length).toBeGreaterThan(0);
    expect(rows[1]!.querySelector("[data-slot=volume-mixer-playing]")).not.toBeNull();
    expect(within(rows[2]!).getAllByText("35%").length).toBeGreaterThan(0);
  });

  it("reports per-app volume and mute changes by id", async () => {
    const user = userEvent.setup();
    const onAppVolumeChange = vi.fn();
    const onAppMutedChange = vi.fn();
    render(<VolumeMixer apps={apps} onAppVolumeChange={onAppVolumeChange} onAppMutedChange={onAppMutedChange} />);
    const chrome = screen.getByRole("slider", { name: "Google Chrome volume" });
    chrome.focus();
    await user.keyboard("{ArrowLeft}");
    expect(onAppVolumeChange).toHaveBeenLastCalledWith("chrome", 34);
    await user.click(screen.getByRole("button", { name: "Mute Music" }));
    expect(onAppMutedChange).toHaveBeenLastCalledWith("music", true);
    await user.click(screen.getByRole("button", { name: "Mute Slack" }));
    expect(onAppMutedChange).toHaveBeenLastCalledWith("slack", false);
  });

  it("reports master volume and mute", async () => {
    const user = userEvent.setup();
    const onVolumeChange = vi.fn();
    const onMutedChange = vi.fn();
    render(<VolumeMixer apps={apps} defaultVolume={64} onVolumeChange={onVolumeChange} onMutedChange={onMutedChange} />);
    screen.getByRole("slider", { name: "Output volume" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onVolumeChange).toHaveBeenLastCalledWith(65);
    await user.click(screen.getByRole("button", { name: "Mute output" }));
    expect(onMutedChange).toHaveBeenLastCalledWith(true);
  });

  it("picks an output device from the menu", async () => {
    const user = userEvent.setup();
    const onDeviceChange = vi.fn();
    render(<VolumeMixer apps={apps} devices={devices} onDeviceChange={onDeviceChange} />);
    const trigger = screen.getByRole("button", { name: "Output device: MacBook Pro Speakers" });
    await user.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitemradio", { name: "MacBook Pro Speakers" })).toHaveAttribute("aria-checked", "true");
    await user.click(within(menu).getByRole("menuitemradio", { name: "AirPods Pro" }));
    expect(onDeviceChange).toHaveBeenCalledWith("airpods");
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Output device: AirPods Pro" })).toBeInTheDocument();
  });

  it("shows a single device as text and an empty state", () => {
    render(<VolumeMixer apps={[]} devices={[devices[0]!]} emptyState="Nothing playing" />);
    expect(screen.queryByRole("button", { name: /Output device/ })).not.toBeInTheDocument();
    expect(screen.getByText("MacBook Pro Speakers")).toBeInTheDocument();
    expect(screen.getByText("Nothing playing")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<VolumeMixer apps={apps} devices={devices} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* DeviceBatteryList                                                   */
/* ------------------------------------------------------------------ */

const btDevices: BatteryDevice[] = [
  {
    id: "airpods",
    name: "AirPods Pro",
    kind: "headphones",
    parts: [
      { id: "l", label: "Left", battery: 42 },
      { id: "r", label: "Right", battery: 58 },
      { id: "c", label: "Case", battery: 80, charging: true },
    ],
  },
  { id: "trackpad", name: "Magic Trackpad", kind: "trackpad", battery: 67 },
  { id: "keyboard", name: "Magic Keyboard", kind: "keyboard", battery: 91 },
  { id: "beats", name: "Beats Fit Pro", kind: "headphones", battery: 12, connected: false },
];

describe("summarizeDeviceBatteries", () => {
  it("finds the lowest connected reading (parts included) and the away devices", () => {
    const s = summarizeDeviceBatteries(btDevices);
    expect(s.connected.map((d) => d.id)).toEqual(["airpods", "trackpad", "keyboard"]);
    expect(s.away.map((d) => d.id)).toEqual(["beats"]);
    expect(s.lowest?.battery).toBe(42);
    expect(s.lowest?.part?.id).toBe("l");
    expect(s.sentence).toBe("Lowest battery: AirPods Pro, left, 42%. Beats Fit Pro is paired but away.");
  });

  it("handles several away devices, no readings and no input", () => {
    const s = summarizeDeviceBatteries([
      { id: "a", name: "Mouse", kind: "mouse", connected: false },
      { id: "b", name: "Pad", kind: "controller", connected: false },
    ]);
    expect(s.lowest).toBeNull();
    expect(s.sentence).toBe("No devices connected. Mouse and Pad are paired but away.");
    expect(summarizeDeviceBatteries(null).sentence).toBe("No devices connected.");
    expect(summarizeDeviceBatteries([{ id: "x", name: "Speaker", kind: "speaker" }]).sentence).toBe("");
  });
});

describe("DeviceBatteryList", () => {
  it("renders the summary header with the lowest battery and a settings link", () => {
    render(<DeviceBatteryList devices={btDevices} settingsHref="x-apple.systempreferences:bluetooth" />);
    const header = screen.getByRole("region", { name: "3 connected" });
    expect(within(header).getByText("Lowest battery: AirPods Pro, left, 42%. Beats Fit Pro is paired but away.")).toBeInTheDocument();
    expect(within(header).getByRole("img", { name: "Lowest: AirPods Pro, left, 42% battery" })).toBeInTheDocument();
    expect(within(header).getByRole("link", { name: "Bluetooth Settings" })).toHaveAttribute("href", "x-apple.systempreferences:bluetooth");
  });

  it("renders nested part rows with their levels", () => {
    render(<DeviceBatteryList devices={btDevices} />);
    const table = screen.getByRole("table", { name: "Device batteries" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(7);
    expect(rows[0]).toHaveTextContent("AirPods Pro");
    expect(within(rows[0]!).queryByRole("img")).toBeNull();
    expect(rows[1]).toHaveAttribute("data-slot", "device-battery-part");
    expect(rows[1]).toHaveTextContent("AirPods Pro, Left");
    expect(within(rows[1]!).getByRole("img", { name: "42% battery" })).toBeInTheDocument();
    expect(within(rows[3]!).getByRole("img", { name: "80% battery, charging" })).toBeInTheDocument();
    expect(within(rows[4]!).getByRole("img", { name: "67% battery" })).toBeInTheDocument();
    expect(within(rows[4]!).getAllByText("Trackpad").length).toBeGreaterThan(0);
    expect(rows[6]).toHaveAttribute("data-away");
    expect(rows[6]).toHaveTextContent("Away");
  });

  it("supports a summary override, onOpenSettings, hiding away devices and an empty state", async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();
    const { rerender } = render(
      <DeviceBatteryList devices={btDevices} summary="All good" showAway={false} onOpenSettings={onOpenSettings} />
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
    expect(screen.queryByText("Beats Fit Pro")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Bluetooth Settings" }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    rerender(<DeviceBatteryList devices={[]} />);
    expect(screen.getByText("No Bluetooth devices")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "0 connected" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<DeviceBatteryList devices={btDevices} settingsHref="#bluetooth" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
