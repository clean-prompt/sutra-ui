/** Review 2 de-duplication: VolumeControl on VolumeSlider, KeyboardShortcutsDialog on ShortcutsDialog, SecretRow, McpServerForm fields. */
import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VolumeControl } from "../src/kits/media/media-controls";
import { VolumeSlider } from "../src/primitives/volume-slider";
import { KeyboardShortcutsDialog } from "../src/blocks/modal-dialog-blocks";
import { ShortcutProvider, ShortcutsDialog, useShortcut } from "../src/patterns/shortcuts";
import { ProviderKeysGroups } from "../src/kits/agent-admin/llm-providers";
import { ToolsetProviderDrawer, type ToolsetProvider } from "../src/kits/agent-admin/tool-toggles";
import { McpServerForm } from "../src/kits/agent-admin/mcp";
import { axeViolations } from "./helpers/a11y";

const flush = () => act(async () => {});

/* ------------------------------------------------------------------ */
/* VolumeControl on VolumeSlider                                       */
/* ------------------------------------------------------------------ */

describe("VolumeControl (preset over VolumeSlider)", () => {
  function Controlled({ initial = 0.5, tone }: { initial?: number; tone?: "default" | "overlay" }) {
    const [volume, setVolume] = React.useState(initial);
    const [muted, setMuted] = React.useState(false);
    return (
      <>
        <VolumeControl tone={tone} volume={volume} muted={muted} onVolumeChange={setVolume} onMutedChange={setMuted} />
        <output data-testid="v">{volume}</output>
        <output data-testid="m">{String(muted)}</output>
      </>
    );
  }

  it("is a VolumeSlider (toggle + slider) whose value text follows the level and mute state", async () => {
    const { container } = render(<Controlled />);
    const base = container.querySelector('[data-slot="volume-slider"]')!;
    expect(base).toHaveAttribute("data-orientation", "horizontal");
    const slider = within(base as HTMLElement).getByRole("slider", { name: "Volume" });
    expect(slider).toHaveAttribute("aria-valuenow", "50");
    expect(slider).toHaveAttribute("aria-valuetext", "50%");
    // The toggle is the base's, styled as a media button, with the flipping Mute / Unmute names.
    const toggle = within(base as HTMLElement).getByRole("button", { name: "Mute" });
    expect(toggle).not.toHaveAttribute("aria-pressed");
    expect(toggle).toHaveClass("rounded-full", "size-9");
    expect(base.querySelector('[data-slot="volume-slider-reveal"] [role="slider"]')).toBe(slider);
    fireEvent.click(toggle);
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    expect(slider).toHaveAttribute("aria-valuetext", "Muted");
    expect(base).toHaveAttribute("data-muted");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("moving the slider while muted unmutes once and sets the volume", () => {
    render(<Controlled />);
    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    const slider = screen.getByRole("slider", { name: "Volume" });
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(screen.getByTestId("m")).toHaveTextContent("false");
    expect(screen.getByTestId("v")).toHaveTextContent("0.05");
    expect(screen.getByRole("button", { name: "Mute" })).toHaveAttribute("data-state", "unmuted");
  });

  it("unmuting at zero still restores half volume", () => {
    render(<Controlled initial={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Unmute" }));
    expect(screen.getByTestId("v")).toHaveTextContent("0.5");
    expect(screen.getByRole("slider", { name: "Volume" })).toHaveAttribute("aria-valuetext", "50%");
  });

  it("the overlay tone colours the base through its accent", () => {
    const { container } = render(<Controlled tone="overlay" />);
    const base = container.querySelector('[data-slot="volume-slider"]')!;
    expect(base.querySelector('[style*="--sutra-accent"]')).toBeInTheDocument();
    expect(within(base as HTMLElement).getByRole("button", { name: "Mute" })).toHaveClass("text-white/85");
  });

  it("the vertical popover is the base's slider, wrapped", () => {
    const { container } = render(<VolumeControl orientation="vertical" defaultVolume={0.2} />);
    const base = container.querySelector('[data-slot="volume-slider"]')!;
    expect(base).toHaveAttribute("data-orientation", "vertical");
    const slider = screen.getByRole("slider", { name: "Volume" });
    expect(base.querySelector('[data-slot="volume-popover"] [role="slider"]')).toBe(slider);
    expect(slider).toHaveAttribute("aria-orientation", "vertical");
    expect(slider).toHaveAttribute("aria-valuetext", "20%");
  });
});

/* ------------------------------------------------------------------ */
/* VolumeSlider: new props                                             */
/* ------------------------------------------------------------------ */

describe("VolumeSlider base props", () => {
  it("defaults are unchanged: fixed name with aria-pressed, muting keeps the level, mute at 0 just mutes", async () => {
    const onValueChange = vi.fn();
    const { container } = render(<VolumeSlider defaultValue={0} onValueChange={onValueChange} />);
    const toggle = screen.getByRole("button", { name: "Mute Volume" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Mute Volume" })).toBe(toggle);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("slider")).not.toHaveAttribute("aria-orientation", "vertical");
    expect(container.querySelector('[data-slot="volume-slider"]')).toHaveClass("w-full");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("muting with the default keeps the stored level on the slider", () => {
    render(<VolumeSlider defaultValue={64} />);
    fireEvent.click(screen.getByRole("button", { name: "Mute Volume" }));
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "64");
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "Muted");
  });

  it("orientation, sliderClassName, muteButtonClassName and renderSlider", async () => {
    const { container } = render(
      <VolumeSlider
        orientation="vertical"
        defaultValue={30}
        sliderClassName="h-24"
        muteButtonClassName="rounded-full size-9"
        renderSlider={(slider) => <div data-testid="wrap">{slider}</div>}
      />
    );
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-orientation", "vertical");
    expect(screen.getByTestId("wrap")).toContainElement(slider);
    expect(screen.getByTestId("wrap").firstElementChild).toHaveClass("h-24");
    const toggle = screen.getByRole("button", { name: "Mute Volume" });
    expect(toggle).toHaveClass("rounded-full", "size-9");
    expect(toggle).not.toHaveClass("rounded-control", "size-7");
    expect(container.querySelector('[data-slot="volume-slider"]')).toHaveClass("flex-col");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("restoreOnUnmute, muteToggle=\"label\" and zeroWhenMuted", () => {
    const onValueChange = vi.fn();
    render(<VolumeSlider defaultValue={0} restoreOnUnmute={40} muteToggle="label" muteLabel="Mute" unmuteLabel="Unmute" zeroWhenMuted onValueChange={onValueChange} />);
    // At 0 the toggle offers to unmute and restores the level.
    const toggle = screen.getByRole("button", { name: "Unmute" });
    expect(toggle).not.toHaveAttribute("aria-pressed");
    fireEvent.click(toggle);
    expect(onValueChange).toHaveBeenLastCalledWith(40);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "40");
    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "0");
    // Unmuting a non-zero level keeps it.
    fireEvent.click(screen.getByRole("button", { name: "Unmute" }));
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "40");
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------ */
/* KeyboardShortcutsDialog on ShortcutsDialog                          */
/* ------------------------------------------------------------------ */

function Bind({ keys, label }: { keys: string; label: string }) {
  useShortcut(keys, () => {}, { label });
  return null;
}

describe("KeyboardShortcutsDialog (preset over ShortcutsDialog)", () => {
  it("renders the default static groups through ShortcutsDialog, with glyph keys and spoken text", async () => {
    render(<KeyboardShortcutsDialog defaultOpen />);
    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" });
    // ShortcutsDialog labels each group section and renders ShortcutKeys (data-shortcut + sr-only text).
    const general = within(dialog).getByRole("region", { name: "General" });
    const row = within(general).getByText("Command menu").closest("li")!;
    expect(row.querySelector("[data-shortcut]")).toHaveAttribute("data-shortcut", "meta+k");
    expect(within(row).getByText("⌘")).toBeInTheDocument();
    expect(within(row).getByText("Command K")).toHaveClass("sr-only");
    const nav = within(dialog).getByRole("region", { name: "Navigation" });
    const seq = within(nav).getByText("Go to Home").closest("li")!;
    expect(seq.querySelector("[data-shortcut]")).toHaveAttribute("data-shortcut", "g h");
    expect(within(seq).getByText("then")).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("searches the static groups", async () => {
    const user = userEvent.setup();
    render(<KeyboardShortcutsDialog defaultOpen />);
    await user.type(screen.getByRole("searchbox", { name: "Search shortcuts" }), "journal");
    expect(screen.getByText("Journal entry")).toBeInTheDocument();
    expect(screen.queryByText("Command menu")).not.toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox", { name: "Search shortcuts" }));
    await user.type(screen.getByRole("searchbox", { name: "Search shortcuts" }), "zzz");
    expect(screen.getByText("No shortcuts match “zzz”")).toBeInTheDocument();
  });

  it("static groups replace the registry inside a provider; without groups the registry is listed", async () => {
    const { unmount } = render(
      <ShortcutProvider platform="other">
        <Bind keys="g t" label="Go to tasks" />
        <KeyboardShortcutsDialog defaultOpen groups={[{ title: "Mine", shortcuts: [{ label: "Static one", keys: ["Ctrl", "1"] }] }]} />
      </ShortcutProvider>
    );
    expect(screen.getByText("Static one")).toBeInTheDocument();
    expect(screen.queryByText("Go to tasks")).not.toBeInTheDocument();
    // Word keys follow the provider's platform.
    expect(within(screen.getByText("Static one").closest("li")!).getByText("Ctrl")).toBeInTheDocument();
    unmount();
    render(
      <ShortcutProvider platform="other">
        <Bind keys="mod+j" label="Jump" />
        <KeyboardShortcutsDialog defaultOpen />
      </ShortcutProvider>
    );
    expect(await screen.findByText("Jump")).toBeInTheDocument();
    expect(screen.queryByText("New note")).not.toBeInTheDocument();
    // The preset does not register ShortcutsDialog's own shift+? toggle.
    expect(screen.queryByText("Keyboard shortcuts", { selector: "li *" })).not.toBeInTheDocument();
  });

  it("opens from the trigger and returns focus to it on close", async () => {
    const user = userEvent.setup();
    render(<KeyboardShortcutsDialog trigger={<button type="button">Shortcuts</button>} />);
    const trigger = screen.getByRole("button", { name: "Shortcuts" });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    // A real Radix DialogTrigger now (ShortcutsDialog's `trigger`).
    expect(trigger).toHaveAttribute("aria-controls", screen.getByRole("dialog").id);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("calls onOpenChange when controlled", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<KeyboardShortcutsDialog open onOpenChange={onOpenChange} />);
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("ShortcutsDialog base props", () => {
  const extra = [
    {
      group: "Static",
      shortcuts: [{ id: "s", keys: "meta+s", allKeys: ["meta+s"], label: "Save all", group: "Static", scope: "static", active: true, run: () => {} }],
    },
  ];

  it("defaults are unchanged: registry plus extra groups, detected platform, no trigger", () => {
    render(
      <ShortcutProvider platform="other">
        <Bind keys="mod+j" label="Jump" />
        <ShortcutsDialog defaultOpen keys={null} extraGroups={extra} />
      </ShortcutProvider>
    );
    expect(screen.getByText("Jump")).toBeInTheDocument();
    expect(screen.getByText("Save all")).toBeInTheDocument();
    expect(within(screen.getByText("Save all").closest("li")!).getByText("Win")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open" })).not.toBeInTheDocument();
  });

  it("includeRegistry={false} lists only the static groups; platform picks the glyphs", () => {
    render(
      <ShortcutProvider platform="other">
        <Bind keys="mod+j" label="Jump" />
        <ShortcutsDialog defaultOpen keys={null} includeRegistry={false} extraGroups={extra} platform="mac" />
      </ShortcutProvider>
    );
    expect(screen.queryByText("Jump")).not.toBeInTheDocument();
    expect(within(screen.getByText("Save all").closest("li")!).getByText("⌘")).toBeInTheDocument();
  });

  it("trigger is a Radix DialogTrigger: aria wiring and native focus return", async () => {
    const user = userEvent.setup();
    const { container } = render(<ShortcutsDialog keys={null} trigger={<button type="button">Open</button>} />);
    const trigger = screen.getByRole("button", { name: "Open" });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    await user.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(trigger).toHaveAttribute("aria-controls", dialog.id);
    expect(await axeViolations(container)).toEqual([]);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});

/* ------------------------------------------------------------------ */
/* Shared SecretRow (EnvKeyRow + CredentialRow)                        */
/* ------------------------------------------------------------------ */

describe("SecretRow shared by ProviderKeysGroups and ToolsetProviderDrawer", () => {
  it("env key rows now show a failed async save, and clear the draft after a successful one", async () => {
    const onSetKey = vi.fn().mockRejectedValueOnce(new Error("Vault locked")).mockResolvedValueOnce(undefined);
    const { container } = render(<ProviderKeysGroups groups={[{ id: "c", name: "Corvid", keys: [{ name: "CORVID_API_KEY" }] }]} hideCustom onSetKey={onSetKey} />);
    const input = screen.getByLabelText("Value for CORVID_API_KEY");
    fireEvent.change(input, { target: { value: "ck-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Vault locked");
    expect(input).toHaveValue("ck-1");
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await flush();
    expect(onSetKey).toHaveBeenLastCalledWith("CORVID_API_KEY", "ck-1");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("both rows use the same fallback error message", async () => {
    render(<ProviderKeysGroups groups={[{ id: "c", name: "Corvid", keys: [{ name: "K" }] }]} hideCustom onSetKey={() => Promise.reject({})} />);
    fireEvent.change(screen.getByLabelText("Value for K"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save the key");

    const providers: ToolsetProvider[] = [{ id: "t", name: "Tavily", fields: [{ key: "T", label: "Tavily key", isSet: false }] }];
    render(<ToolsetProviderDrawer open title="Search" providers={providers} onSaveCredential={() => Promise.reject({})} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Tavily key"), { target: { value: "x" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Could not save the key");
  });

  it("set env keys keep the masked value and the clear button", () => {
    const onClearKey = vi.fn();
    render(<ProviderKeysGroups groups={[{ id: "n", name: "Nimbus", keys: [{ name: "NIMBUS_API_KEY", value: "nk-1" }] }]} hideCustom onClearKey={onClearKey} />);
    expect(screen.queryByText("nk-1")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Replace" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear NIMBUS_API_KEY" }));
    expect(onClearKey).toHaveBeenCalledWith("NIMBUS_API_KEY");
  });
});

/* ------------------------------------------------------------------ */
/* McpServerForm on primitives/field                                   */
/* ------------------------------------------------------------------ */

describe("McpServerForm fields (primitives/field)", () => {
  it("wires labels, hints and errors through Field", async () => {
    const { container } = render(<McpServerForm />);
    const name = screen.getByLabelText(/^Name/);
    expect(name.closest('[data-slot="field"]')).toBeInTheDocument();
    expect(name).toBeRequired();
    const command = screen.getByLabelText(/^Command/);
    const hint = container.querySelector('[data-slot="field-hint"]')!;
    expect(hint).toHaveTextContent("Executable that starts the server");
    expect(command.getAttribute("aria-describedby")).toBe(hint.id);
    expect(hint.id).toBe(`${command.id}-hint`);

    fireEvent.click(screen.getByRole("button", { name: "Add server" }));
    const error = await screen.findByText("Name is required");
    const errorEl = error.closest('[data-slot="field-error"]')!;
    expect(errorEl.id).toBe(`${name.id}-error`);
    expect(name).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(name.getAttribute("aria-describedby")).toBe(errorEl.id));
    await waitFor(() => expect(command.getAttribute("aria-describedby")).toBe(`${command.id}-error`));
    expect(screen.queryByText(/Executable that starts the server/)).not.toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});
