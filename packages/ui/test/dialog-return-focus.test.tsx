import * as React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useReturnFocus } from "../src/hooks/use-return-focus";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "../src/primitives/dialog";
import { CommandDialog } from "../src/patterns/command-menu";
import { CommandInput, CommandList } from "../src/patterns/command-menu";

afterEach(cleanup);

/** An opener that is NOT a Dialog.Trigger: it only flips controlled state (like a hotkey or SearchTrigger would). */
function Harness({ kind, onCloseAutoFocus }: { kind: "dialog" | "alert" | "sheet" | "command"; onCloseAutoFocus?: (e: Event) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {kind === "dialog" && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent onCloseAutoFocus={onCloseAutoFocus}>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Body</DialogDescription>
          </DialogContent>
        </Dialog>
      )}
      {kind === "alert" && (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogTitle>Sure?</AlertDialogTitle>
            <AlertDialogDescription>Body</AlertDialogDescription>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {kind === "sheet" && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent>
            <SheetTitle>Panel</SheetTitle>
            <SheetDescription>Body</SheetDescription>
          </SheetContent>
        </Sheet>
      )}
      {kind === "command" && (
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="Search" />
          <CommandList />
        </CommandDialog>
      )}
    </>
  );
}

describe("dialogs opened without a trigger give focus back to the opener on close", () => {
  it.each([
    ["dialog", "dialog"],
    ["alert dialog", "alert"],
    ["sheet", "sheet"],
    ["command dialog", "command"],
  ] as const)("%s", async (_name, kind) => {
    const user = userEvent.setup();
    render(<Harness kind={kind} />);
    const opener = screen.getByRole("button", { name: "Open" });
    await user.click(opener);
    await screen.findByRole(kind === "alert" ? "alertdialog" : "dialog");
    expect(document.activeElement).not.toBe(opener);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole(kind === "alert" ? "alertdialog" : "dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("still returns focus to a real Dialog.Trigger", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger asChild>
          <button>Trigger</button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>T</DialogTitle>
          <DialogDescription>B</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    const trigger = screen.getByRole("button", { name: "Trigger" });
    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("respects a caller's preventDefault in onCloseAutoFocus", async () => {
    const user = userEvent.setup();
    const handler = vi.fn((e: Event) => e.preventDefault());
    render(<Harness kind="dialog" onCloseAutoFocus={handler} />);
    const opener = screen.getByRole("button", { name: "Open" });
    await user.click(opener);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(handler).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 30));
    expect(document.activeElement).not.toBe(opener);
  });

  it("does not throw when the opener is gone by the time the dialog closes", async () => {
    const user = userEvent.setup();
    function Gone() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          {!open && <button onClick={() => setOpen(true)}>Open once</button>}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogTitle>T</DialogTitle>
              <DialogDescription>B</DialogDescription>
            </DialogContent>
          </Dialog>
        </>
      );
    }
    render(<Gone />);
    await user.click(screen.getByRole("button", { name: "Open once" }));
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("useReturnFocus", () => {
  it("runs the caller's handlers first", () => {
    const calls: string[] = [];
    let handlers!: ReturnType<typeof useReturnFocus>;
    function Probe() {
      handlers = useReturnFocus({ onOpenAutoFocus: () => calls.push("open"), onCloseAutoFocus: () => calls.push("close") });
      return null;
    }
    render(<Probe />);
    handlers.onOpenAutoFocus(new Event("focus", { cancelable: true }));
    handlers.onCloseAutoFocus(new Event("focus", { cancelable: true }));
    expect(calls).toEqual(["open", "close"]);
  });
});
