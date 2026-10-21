import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../src/primitives/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../src/primitives/dropdown-menu";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../src/primitives/context-menu";
import { SimpleTooltip, Tooltip, TooltipContent, TooltipTrigger } from "../src/primitives/tooltip";
import { InfoTooltip } from "../src/primitives/info-tooltip";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "../src/primitives/popover";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  useCommandMenuShortcut,
} from "../src/patterns/command-menu";
import { Button } from "../src/primitives/button";
import { axeViolations } from "./helpers/a11y";

/** Promise whose resolution is controlled by the test. */
function deferred() {
  let resolve!: () => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

function BasicDialog(props: { onOpenChange?: (open: boolean) => void }) {
  return (
    <Dialog onOpenChange={props.onOpenChange}>
      <DialogTrigger asChild>
        <Button>Edit profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Update your details.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("opens from the trigger and closes with the close button", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<BasicDialog onOpenChange={onOpenChange} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit profile" });
    expect(dialog).toHaveAccessibleDescription("Update your details.");
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<BasicDialog />);
    const trigger = screen.getByRole("button", { name: "Edit profile" });
    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("closes from a DialogClose in the footer", async () => {
    const user = userEvent.setup();
    render(<BasicDialog />);
    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("can hide the close button", () => {
    render(
      <Dialog open>
        <DialogContent showClose={false}>
          <DialogTitle>No close</DialogTitle>
          <DialogDescription>Body</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("has no axe violations when open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<BasicDialog />);
    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    await screen.findByRole("dialog");
    // Radix focus guards (tabindex=0 + aria-hidden spans) are a known Radix pattern.
    expect(await axeViolations(baseElement, { disable: ["aria-hidden-focus"] })).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* AlertDialog                                                         */
/* ------------------------------------------------------------------ */

function BasicAlertDialog(props: { onAction?: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete project?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={props.onAction}>
            Delete forever
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe("AlertDialog", () => {
  it("opens, focuses Cancel, and closes on Cancel", async () => {
    const user = userEvent.setup();
    render(<BasicAlertDialog />);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete project?" });
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("runs the action and closes", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<BasicAlertDialog onAction={onAction} />);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(await screen.findByRole("button", { name: "Delete forever" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<BasicAlertDialog />);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByRole("alertdialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("has no axe violations when open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<BasicAlertDialog />);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByRole("alertdialog");
    // Radix focus guards (tabindex=0 + aria-hidden spans) are a known Radix pattern.
    expect(await axeViolations(baseElement, { disable: ["aria-hidden-focus"] })).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* ConfirmDialog                                                       */
/* ------------------------------------------------------------------ */

describe("ConfirmDialog", () => {
  it("shows a loading state while async onConfirm runs and closes when it resolves", async () => {
    const user = userEvent.setup();
    const d = deferred();
    const onConfirm = vi.fn(() => d.promise);
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        trigger={<Button>Archive</Button>}
        title="Archive project?"
        description="You can restore it later."
        confirmLabel="Archive it"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />
    );
    await user.click(screen.getByRole("button", { name: "Archive" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Archive project?" });
    const confirm = within(dialog).getByRole("button", { name: "Archive it" });
    await user.click(confirm);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveAttribute("aria-busy", "true");
    expect(confirm).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();

    // Escape is ignored while loading.
    await user.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    await act(async () => {
      d.resolve();
      await d.promise;
    });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("stays open when onConfirm rejects", async () => {
    const user = userEvent.setup();
    const d = deferred();
    render(
      <ConfirmDialog defaultOpen title="Delete?" confirmLabel="Delete" tone="destructive" onConfirm={() => d.promise} />
    );
    const dialog = await screen.findByRole("alertdialog");
    const confirm = within(dialog).getByRole("button", { name: "Delete" });
    await user.click(confirm);
    expect(confirm).toHaveAttribute("aria-busy", "true");
    await act(async () => {
      d.reject(new Error("nope"));
      await d.promise.catch(() => {});
    });
    await waitFor(() => expect(confirm).not.toHaveAttribute("aria-busy"));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(confirm).toBeEnabled();
  });

  it("stays open when a sync onConfirm throws", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        defaultOpen
        title="Delete?"
        confirmLabel="Delete"
        onConfirm={() => {
          throw new Error("sync failure");
        }}
      />
    );
    await user.click(await screen.findByRole("button", { name: "Delete" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
  });

  it("closes immediately for sync onConfirm and calls onCancel on cancel", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog trigger={<Button>Open</Button>} title="Sure?" onConfirm={onConfirm} onCancel={onCancel} />
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("has no axe violations when open", async () => {
    const { baseElement } = render(<ConfirmDialog defaultOpen title="Sure?" description="Really." />);
    await screen.findByRole("alertdialog");
    // Radix focus guards (tabindex=0 + aria-hidden spans) are a known Radix pattern.
    expect(await axeViolations(baseElement, { disable: ["aria-hidden-focus"] })).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* DropdownMenu                                                        */
/* ------------------------------------------------------------------ */

function MenuHarness(props: { onSelect?: (e: Event) => void }) {
  const [bookmarks, setBookmarks] = React.useState(false);
  const [person, setPerson] = React.useState("pedro");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>Options</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onSelect={props.onSelect} shortcut="⌘E">
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem disabled>Disabled</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={bookmarks} onCheckedChange={setBookmarks}>
          Show bookmarks
        </DropdownMenuCheckboxItem>
        <DropdownMenuRadioGroup value={person} onValueChange={setPerson}>
          <DropdownMenuRadioItem value="pedro">Pedro</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="colm">Colm</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("DropdownMenu", () => {
  it("opens on click and fires onSelect, then closes", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MenuHarness onSelect={onSelect} />);
    const trigger = screen.getByRole("button", { name: "Options" });
    await user.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.click(within(menu).getByRole("menuitem", { name: /Edit/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("opens from the keyboard and selects with Enter", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MenuHarness onSelect={onSelect} />);
    screen.getByRole("button", { name: "Options" }).focus();
    await user.keyboard("{Enter}");
    const menu = await screen.findByRole("menu");
    const edit = within(menu).getByRole("menuitem", { name: /Edit/ });
    await waitFor(() => expect(edit).toHaveFocus());
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("marks disabled items and does not select them", async () => {
    const user = userEvent.setup();
    render(<MenuHarness />);
    await user.click(screen.getByRole("button", { name: "Options" }));
    const disabled = within(await screen.findByRole("menu")).getByRole("menuitem", { name: "Disabled" });
    expect(disabled).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(disabled);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("toggles checkbox items and switches radio items", async () => {
    const user = userEvent.setup();
    render(<MenuHarness />);
    await user.click(screen.getByRole("button", { name: "Options" }));
    let menu = await screen.findByRole("menu");
    const checkbox = within(menu).getByRole("menuitemcheckbox", { name: "Show bookmarks" });
    expect(checkbox).toHaveAttribute("aria-checked", "false");
    await user.click(checkbox);

    await user.click(screen.getByRole("button", { name: "Options" }));
    menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitemcheckbox", { name: "Show bookmarks" })).toHaveAttribute("aria-checked", "true");
    expect(within(menu).getByRole("menuitemradio", { name: "Pedro" })).toHaveAttribute("aria-checked", "true");
    await user.click(within(menu).getByRole("menuitemradio", { name: "Colm" }));

    await user.click(screen.getByRole("button", { name: "Options" }));
    menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitemradio", { name: "Colm" })).toHaveAttribute("aria-checked", "true");
    expect(within(menu).getByRole("menuitemradio", { name: "Pedro" })).toHaveAttribute("aria-checked", "false");
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<MenuHarness />);
    await user.click(screen.getByRole("button", { name: "Options" }));
    await screen.findByRole("menu");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("has no axe violations when open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<MenuHarness />);
    await user.click(screen.getByRole("button", { name: "Options" }));
    await screen.findByRole("menu");
    // Radix focus guards (tabindex=0 + aria-hidden spans) are a known Radix pattern.
    expect(await axeViolations(baseElement, { disable: ["aria-hidden-focus"] })).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* ContextMenu                                                         */
/* ------------------------------------------------------------------ */

function ContextHarness(props: { onSelect?: () => void }) {
  const [grid, setGrid] = React.useState(true);
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div>Right-click area</div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={props.onSelect}>Copy</ContextMenuItem>
        <ContextMenuCheckboxItem checked={grid} onCheckedChange={setGrid}>
          Show grid
        </ContextMenuCheckboxItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

describe("ContextMenu", () => {
  it("opens on contextmenu and fires onSelect", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ContextHarness onSelect={onSelect} />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.contextMenu(screen.getByText("Right-click area"));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitemcheckbox", { name: "Show grid" })).toHaveAttribute("aria-checked", "true");
    await user.click(within(menu).getByRole("menuitem", { name: "Copy" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("has no axe violations when open", async () => {
    const { baseElement } = render(<ContextHarness />);
    fireEvent.contextMenu(screen.getByText("Right-click area"));
    await screen.findByRole("menu");
    // Radix focus guards (tabindex=0 + aria-hidden spans) are a known Radix pattern.
    expect(await axeViolations(baseElement, { disable: ["aria-hidden-focus"] })).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Tooltip                                                             */
/* ------------------------------------------------------------------ */

describe("Tooltip", () => {
  it("shows on hover", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button>Save</Button>
        </TooltipTrigger>
        <TooltipContent>Save changes</TooltipContent>
      </Tooltip>
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await user.hover(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Save changes");
  });

  it("shows on keyboard focus, describes the trigger, and hides on Escape", async () => {
    const user = userEvent.setup();
    render(
      <SimpleTooltip content="Search" shortcut="⌘K" delayDuration={0}>
        <Button>Find</Button>
      </SimpleTooltip>
    );
    await user.tab();
    const trigger = screen.getByRole("button", { name: "Find" });
    expect(trigger).toHaveFocus();
    const tip = await screen.findByRole("tooltip");
    expect(tip).toHaveTextContent("Search");
    expect(tip).toHaveTextContent("⌘K");
    expect(trigger).toHaveAccessibleDescription(/Search/);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });

  it("SimpleTooltip renders only children when disabled", () => {
    render(
      <SimpleTooltip content="Hidden" disabled>
        <Button>Plain</Button>
      </SimpleTooltip>
    );
    expect(screen.getByRole("button", { name: "Plain" })).not.toHaveAttribute("data-state");
  });

  it("has no axe violations when open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(
      <SimpleTooltip content="Search" delayDuration={0}>
        <Button>Find</Button>
      </SimpleTooltip>
    );
    await user.tab();
    await screen.findByRole("tooltip");
    expect(await axeViolations(baseElement)).toEqual([]);
  });
});

describe("InfoTooltip", () => {
  it("derives its label from the title and reveals title + description", async () => {
    const user = userEvent.setup();
    render(<InfoTooltip title="Usage" description="Resets monthly." />);
    const trigger = screen.getByRole("button", { name: "Usage" });
    await user.hover(trigger);
    const tip = await screen.findByRole("tooltip");
    expect(tip).toHaveTextContent("Usage");
    expect(tip).toHaveTextContent("Resets monthly.");
  });

  it("falls back to generic labels", () => {
    render(
      <>
        <InfoTooltip description="a" />
        <InfoTooltip icon="help" description="b" />
        <InfoTooltip label="Custom" description="c" />
      </>
    );
    expect(screen.getByRole("button", { name: "More information" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Help" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument();
  });

  it("has no axe violations when open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<InfoTooltip title="Usage" description="Resets monthly." />);
    await user.tab();
    await screen.findByRole("tooltip");
    expect(await axeViolations(baseElement)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Popover                                                             */
/* ------------------------------------------------------------------ */

function PopoverHarness() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button>Filters</Button>
      </PopoverTrigger>
      <PopoverContent aria-label="Filter options">
        <p>Filter body</p>
        <PopoverClose asChild>
          <Button>Done</Button>
        </PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

describe("Popover", () => {
  it("toggles from the trigger", async () => {
    const user = userEvent.setup();
    render(<PopoverHarness />);
    const trigger = screen.getByRole("button", { name: "Filters" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(await screen.findByRole("dialog", { name: "Filter options" })).toHaveTextContent("Filter body");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.click(trigger);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes on Escape, PopoverClose and outside click", async () => {
    const user = userEvent.setup();
    render(
      <>
        <PopoverHarness />
        <button type="button">Outside</button>
      </>
    );
    const trigger = screen.getByRole("button", { name: "Filters" });

    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(trigger);
    await user.click(await screen.findByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Outside" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("has no axe violations when open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<PopoverHarness />);
    await user.click(screen.getByRole("button", { name: "Filters" }));
    await screen.findByRole("dialog");
    // Radix focus guards (tabindex=0 + aria-hidden spans) are a known Radix pattern.
    expect(await axeViolations(baseElement, { disable: ["aria-hidden-focus"] })).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* CommandDialog                                                       */
/* ------------------------------------------------------------------ */

function CommandHarness(props: { onRun?: (value: string) => void; shortcutKey?: string; showFooter?: boolean }) {
  const [open, setOpen] = React.useState(false);
  useCommandMenuShortcut(setOpen, props.shortcutKey);
  const run = (value: string) => {
    props.onRun?.(value);
    setOpen(false);
  };
  return (
    <>
      <span data-testid="state">{open ? "open" : "closed"}</span>
      <CommandDialog open={open} onOpenChange={setOpen} showFooter={props.showFooter}>
        <CommandInput placeholder="Search…" aria-label="Search commands" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Pages">
            <CommandItem value="dashboard" onSelect={run}>
              Dashboard
            </CommandItem>
            <CommandItem value="settings" onSelect={run}>
              Settings
            </CommandItem>
            <CommandItem value="billing" onSelect={run}>
              Billing
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

describe("CommandDialog + useCommandMenuShortcut", () => {
  it("Ctrl+K opens and Meta+K toggles the dialog", async () => {
    const user = userEvent.setup();
    render(<CommandHarness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.keyboard("{Control>}k{/Control}");
    expect(await screen.findByRole("dialog", { name: "Command menu" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.keyboard("{Meta>}k{/Meta}");
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Meta>}k{/Meta}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it(
    "Ctrl+K does not close the open palette — cmdk's default vimBindings treat Ctrl+K as 'previous item' and call preventDefault on the focused input, so useCommandMenuShortcut bails on event.defaultPrevented. Fix: pass vimBindings={false} in CommandDialog (or have the hook listen in the capture phase).",
    async () => {
      const user = userEvent.setup();
      render(<CommandHarness />);
      await user.keyboard("{Control>}k{/Control}");
      await screen.findByRole("dialog");
      await user.keyboard("{Control>}k{/Control}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    }
  );

  it("ignores plain k, Alt-modified shortcuts and already-handled events", async () => {
    const user = userEvent.setup();
    render(<CommandHarness />);
    await user.keyboard("k");
    await user.keyboard("{Control>}{Alt>}k{/Alt}{/Control}");
    const ev = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true });
    ev.preventDefault();
    act(() => {
      document.dispatchEvent(ev);
    });
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
  });

  it("supports a custom shortcut key", async () => {
    const user = userEvent.setup();
    render(<CommandHarness shortcutKey="j" />);
    await user.keyboard("{Control>}k{/Control}");
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
    await user.keyboard("{Control>}j{/Control}");
    expect(screen.getByTestId("state")).toHaveTextContent("open");
  });

  it("filters items as you type and shows the empty state", async () => {
    const user = userEvent.setup();
    render(<CommandHarness />);
    await user.keyboard("{Control>}k{/Control}");
    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByRole("combobox");
    expect(within(dialog).getAllByRole("option")).toHaveLength(3);

    await user.type(input, "sett");
    await waitFor(() => expect(within(dialog).getAllByRole("option")).toHaveLength(1));
    expect(within(dialog).getByRole("option", { name: "Settings" })).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "zzz");
    await waitFor(() => expect(within(dialog).queryAllByRole("option")).toHaveLength(0));
    expect(within(dialog).getByText("No results.")).toBeInTheDocument();
  });

  it("selecting an item (click or Enter) runs onSelect", async () => {
    const user = userEvent.setup();
    const onRun = vi.fn();
    render(<CommandHarness onRun={onRun} />);
    await user.keyboard("{Control>}k{/Control}");
    let dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("option", { name: "Billing" }));
    expect(onRun).toHaveBeenLastCalledWith("billing");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.keyboard("{Control>}k{/Control}");
    dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("combobox"), "sett");
    await waitFor(() => expect(within(dialog).getAllByRole("option")).toHaveLength(1));
    await user.keyboard("{Enter}");
    expect(onRun).toHaveBeenLastCalledWith("settings");
  });

  it("navigates with arrow keys (looping)", async () => {
    const user = userEvent.setup();
    const onRun = vi.fn();
    render(<CommandHarness onRun={onRun} />);
    await user.keyboard("{Control>}k{/Control}");
    await screen.findByRole("dialog");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onRun).toHaveBeenLastCalledWith("settings");
    await user.keyboard("{Control>}k{/Control}");
    await screen.findByRole("dialog");
    await user.keyboard("{ArrowUp}{Enter}");
    expect(onRun).toHaveBeenLastCalledWith("billing");
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<CommandHarness />);
    await user.keyboard("{Control>}k{/Control}");
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it(
    "CommandInput's aria-label is ignored — cmdk sets aria-labelledby to its own (empty) label unless Command gets a `label` prop. Fix: CommandDialog should pass label={title} to Command.",
    async () => {
      const user = userEvent.setup();
      render(<CommandHarness />);
      await user.keyboard("{Control>}k{/Control}");
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByRole("combobox", { name: "Search commands" })).toBeInTheDocument();
    }
  );

  it("has no axe violations when open (without footer)", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<CommandHarness showFooter={false} />);
    await user.keyboard("{Control>}k{/Control}");
    await screen.findByRole("dialog");
    // Radix focus guards (tabindex=0 + aria-hidden spans) are a known Radix pattern.
    expect(await axeViolations(baseElement, { disable: ["aria-hidden-focus"] })).toEqual([]);
  });

  it(
    "CommandFooter puts aria-label on <Kbd> (a plain <kbd>), which axe flags as aria-prohibited-attr. Fix: use sr-only text (or role=\"img\") for the arrow / enter glyphs.",
    async () => {
      const user = userEvent.setup();
      const { baseElement } = render(<CommandHarness />);
      await user.keyboard("{Control>}k{/Control}");
      await screen.findByRole("dialog");
      expect(await axeViolations(baseElement, { disable: ["aria-hidden-focus"] })).toEqual([]);
    }
  );
});
