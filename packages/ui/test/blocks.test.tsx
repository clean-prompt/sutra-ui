import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareDialog } from "../src/blocks/modal-dialog-blocks";
import { blockCategoryLabels, blockRegistry } from "../src/blocks/registry";
import { axeViolations } from "./a11y";
import { OPENABLE, renderBlock } from "./blocks-helpers";

describe("blockRegistry", () => {
  it("has unique ids and a label for every category", () => {
    const ids = blockRegistry.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of blockRegistry) {
      expect(blockCategoryLabels[entry.category]).toBeTruthy();
      expect(entry.name).toBeTruthy();
      expect(entry.description).toBeTruthy();
    }
  });

  it("covers every category", () => {
    const used = new Set(blockRegistry.map((b) => b.category));
    expect([...used].sort()).toEqual(Object.keys(blockCategoryLabels).sort());
  });
});

/** Per-block axe rules to skip, with the reason. Keep this list empty if possible. */
const AXE_DISABLE: Record<string, string[]> = {};

describe("blocks render and pass axe", () => {
  it.each(blockRegistry.map((b) => [b.id, b] as const))("%s (closed)", async (_id, entry) => {
    const { container } = await renderBlock(entry, { open: false });
    expect(container).not.toBeEmptyDOMElement();
    expect(await axeViolations(document.body, { disable: AXE_DISABLE[entry.id] })).toEqual([]);
  });

  const openable = blockRegistry.filter((b) => OPENABLE.includes(b.category));
  it.each(openable.map((b) => [b.id, b] as const))("%s (open)", async (_id, entry) => {
    await renderBlock(entry);
    expect(await axeViolations(document.body, { disable: AXE_DISABLE[entry.id] })).toEqual([]);
  });
});

describe("PageHeaderWithTabs with panels", () => {
  it("has valid tab ↔ panel wiring when TabsContent children are supplied", async () => {
    const { PageHeaderWithTabs, TabsContent } = await import("../src");
    const { render } = await import("@testing-library/react");
    const tabs = [
      { value: "a", label: "Alpha" },
      { value: "b", label: "Beta" },
    ];
    render(
      <PageHeaderWithTabs tabs={tabs}>
        <TabsContent value="a">Alpha panel</TabsContent>
        <TabsContent value="b">Beta panel</TabsContent>
      </PageHeaderWithTabs>
    );
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Alpha panel");
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* ShareDialog (modal-dialog-blocks)                                   */
/* ------------------------------------------------------------------ */

describe("ShareDialog", () => {
  // Silence act() warnings from Radix presence timers that settle after a test ends.
  afterEach(async () => {
    await act(async () => {});
  });
  it("changes a person's role and the link expiry, with callbacks", async () => {
    const user = userEvent.setup();
    const onRoleChange = vi.fn();
    const onExpiryChange = vi.fn();
    const onLinkRoleChange = vi.fn();
    const onAllowCommentsChange = vi.fn();
    render(
      <ShareDialog
        defaultOpen
        onRoleChange={onRoleChange}
        onExpiryChange={onExpiryChange}
        onLinkRoleChange={onLinkRoleChange}
        onAllowCommentsChange={onAllowCommentsChange}
      />
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Owner")).toBeInTheDocument();
    expect(within(dialog).getByText(/Expires in 7 days/)).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);

    await user.click(within(dialog).getByRole("button", { name: "Role for Priya Shah: Editor" }));
    await user.click(await screen.findByRole("menuitemradio", { name: /Viewer/ }));
    expect(onRoleChange).toHaveBeenCalledWith("p2", "viewer");
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Role for Priya Shah: Viewer" })).toBeInTheDocument());

    await user.click(within(dialog).getByRole("combobox", { name: "Link expiry" }));
    await user.click(await screen.findByRole("option", { name: "30 days" }));
    expect(onExpiryChange).toHaveBeenCalledWith("30d", expect.any(Date));
    const [, date] = onExpiryChange.mock.calls[0]!;
    expect(Math.round(((date as Date).getTime() - Date.now()) / 86_400_000)).toBe(30);
    expect(within(dialog).getByText(/Expires in 30 days/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("combobox", { name: "Link expiry" }));
    await user.click(await screen.findByRole("option", { name: "Never expires" }));
    expect(onExpiryChange).toHaveBeenLastCalledWith("never", null);

    await user.click(within(dialog).getByRole("combobox", { name: "Link permission" }));
    await user.click(await screen.findByRole("option", { name: "Can comment" }));
    expect(onLinkRoleChange).toHaveBeenCalledWith("commenter");

    await user.click(within(dialog).getByRole("switch", { name: "Allow comments on public link" }));
    expect(onAllowCommentsChange).toHaveBeenCalledWith(true);
  });

  it("offers Leave for yourself when you are not the owner and invites with a role", async () => {
    const user = userEvent.setup();
    const onLeave = vi.fn();
    const onInvite = vi.fn();
    render(<ShareDialog defaultOpen currentUserId="p3" onLeave={onLeave} onInvite={onInvite} defaultAccess="restricted" />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("(you)")).toBeInTheDocument();
    expect(within(dialog).queryByRole("combobox", { name: "Link expiry" })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Leave" }));
    expect(onLeave).toHaveBeenCalled();
    expect(within(dialog).queryByText("Lena Okafor")).not.toBeInTheDocument();

    await user.type(within(dialog).getByRole("textbox", { name: "Email address" }), "sam@northwind.co");
    await user.click(within(dialog).getByRole("button", { name: "Invite" }));
    await waitFor(() => expect(onInvite).toHaveBeenCalledWith("sam@northwind.co", "editor"));
    expect(await within(dialog).findByText("sam@northwind.co")).toBeInTheDocument();
  });

  it("keeps legacy role values working", () => {
    render(
      <ShareDialog
        defaultOpen
        currentUserId=""
        people={[
          { id: "a", name: "Ada", email: "ada@x.co", role: "edit", owner: true },
          { id: "b", name: "Bo", email: "bo@x.co", role: "comment" },
        ]}
      />
    );
    expect(screen.getByRole("button", { name: "Role for Bo: Commenter" })).toBeInTheDocument();
  });
});
