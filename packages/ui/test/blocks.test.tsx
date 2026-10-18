import { screen } from "@testing-library/react";
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
