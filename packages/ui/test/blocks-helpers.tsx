import { render, screen, waitFor, within, type RenderResult } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import type { BlockRegistryEntry } from "../src/blocks/registry";

/** Categories whose demo renders a trigger that opens floating content. */
export const OPENABLE: BlockRegistryEntry["category"][] = ["dialog", "dropdown"];

/** Render a registry entry; for dialogs/dropdowns also click the trigger so the content is in the DOM. */
export async function renderBlock(
  entry: BlockRegistryEntry,
  { open = true } = {}
): Promise<{ container: HTMLElement; user: UserEvent; unmount: RenderResult["unmount"] }> {
  const user = userEvent.setup();
  const Block = entry.component;
  const result = render(<Block />);
  if (open && OPENABLE.includes(entry.category)) {
    const trigger = within(result.container)
      .getAllByRole("button")
      .find((b) => b.hasAttribute("aria-haspopup") && b.getAttribute("aria-expanded") === "false");
    if (!trigger) throw new Error(`No popup trigger found for block ${entry.id}`);
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // Content is portaled; wait for it.
    await waitFor(() =>
      expect(screen.queryByRole("dialog") ?? screen.queryByRole("alertdialog") ?? screen.queryByRole("menu")).toBeInTheDocument()
    );
  }
  return { container: result.container, unmount: result.unmount, user };
}
