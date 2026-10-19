import * as React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "../src/primitives/drawer";
import { FloatingActionButton } from "../src/primitives/fab";
import { Lightbox, useLightbox, type LightboxItem } from "../src/patterns/lightbox";

afterEach(cleanup);

const gallery: LightboxItem[] = [
  { src: "/a.jpg", alt: "Alpha" },
  { src: "/b.jpg", alt: "Beta" },
];

function DrawerHarness({ onCloseAutoFocus }: { onCloseAutoFocus?: (e: Event) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent onCloseAutoFocus={onCloseAutoFocus}>
          <DrawerTitle>Sheet</DrawerTitle>
          <DrawerDescription>Body</DrawerDescription>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function LightboxHarness() {
  const lb = useLightbox();
  return (
    <>
      <button onClick={() => lb.openAt(0)}>Open</button>
      <Lightbox items={gallery} {...lb.props} />
    </>
  );
}

describe("focus returns to the opener when there is no trigger", () => {
  it("Drawer opened from controlled state", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    const opener = screen.getByRole("button", { name: "Open" });
    await user.click(opener);
    await screen.findByRole("dialog");
    expect(document.activeElement).not.toBe(opener);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("Drawer still honours a caller's preventDefault in onCloseAutoFocus", async () => {
    const user = userEvent.setup();
    const onCloseAutoFocus = vi.fn((e: Event) => e.preventDefault());
    render(<DrawerHarness onCloseAutoFocus={onCloseAutoFocus} />);
    const opener = screen.getByRole("button", { name: "Open" });
    await user.click(opener);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onCloseAutoFocus).toHaveBeenCalled();
    expect(document.activeElement).not.toBe(opener);
  });

  it("Lightbox opened with useLightbox", async () => {
    const user = userEvent.setup();
    render(<LightboxHarness />);
    const opener = screen.getByRole("button", { name: "Open" });
    await user.click(opener);
    await screen.findByRole("dialog");
    expect(document.activeElement).not.toBe(opener);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
});

describe("FloatingActionButton actions", () => {
  it("running an action by keyboard puts focus back on the trigger", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <FloatingActionButton
        label="Create"
        strategy="static"
        actions={[
          { label: "Edit", icon: <svg />, onClick: onEdit },
          { label: "Share", icon: <svg /> },
        ]}
      />
    );
    const trigger = screen.getByRole("button", { name: "Create" });
    trigger.focus();
    await user.keyboard("{ArrowUp}");
    await waitFor(() => expect(screen.getAllByRole("menuitem").includes(document.activeElement as HTMLElement)).toBe(true));
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("leaves focus alone when the action moved it elsewhere", async () => {
    const user = userEvent.setup();
    render(
      <>
        <input aria-label="Target" />
        <FloatingActionButton
          label="Create"
          strategy="static"
          defaultOpen
          actions={[{ label: "Focus input", icon: <svg />, onClick: () => document.querySelector<HTMLInputElement>("input")!.focus() }]}
        />
      </>
    );
    await user.click(screen.getByRole("menuitem", { name: "Focus input" }));
    expect(screen.getByRole("textbox", { name: "Target" })).toHaveFocus();
  });
});
