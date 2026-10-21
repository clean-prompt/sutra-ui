import { renderBlock } from "./helpers/blocks-helpers";

/*
 * The blocks barrel must be a plain barrel: importing it builds no mock client or pairing adapter
 * and starts no timers. The registry (src/blocks/registry.tsx) creates its mocks lazily, on first render.
 */

vi.mock("../src/kits/identity/kunji-client-mock", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../src/kits/identity/kunji-client-mock")>();
  return { ...mod, createMockKunjiClient: vi.fn(mod.createMockKunjiClient) };
});

vi.mock("../src/blocks/kunji-blocks", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../src/blocks/kunji-blocks")>();
  return { ...mod, createMockPairingAdapter: vi.fn(mod.createMockPairingAdapter) };
});

/* Import the barrel first, before anything else loads the block modules, while watching for side effects. */
const timeoutSpy = vi.spyOn(globalThis, "setTimeout");
const intervalSpy = vi.spyOn(globalThis, "setInterval");
const blocks = await import("../src/blocks");
const timersStartedOnImport = timeoutSpy.mock.calls.length + intervalSpy.mock.calls.length;
timeoutSpy.mockRestore();
intervalSpy.mockRestore();
const { createMockKunjiClient } = await import("../src/kits/identity/kunji-client-mock");
const { createMockPairingAdapter } = await import("../src/blocks/kunji-blocks");
const mocksCreatedOnImport = vi.mocked(createMockKunjiClient).mock.calls.length + vi.mocked(createMockPairingAdapter).mock.calls.length;

describe("blocks barrel has no import-time side effects", () => {
  it("does not construct a mock client or pairing adapter when imported", () => {
    expect(blocks.blockRegistry.length).toBeGreaterThan(0);
    expect(mocksCreatedOnImport).toBe(0);
  });

  it("starts no timers when imported", () => {
    expect(timersStartedOnImport).toBe(0);
  });
});

describe("blockRegistry (src/blocks/registry.tsx)", async () => {
  const { blockRegistry } = await import("../src/blocks/registry");

  it.each(blockRegistry.map((b) => [b.id, b] as const))("renders %s", async (_id, entry) => {
    const { container } = await renderBlock(entry, { open: false });
    expect(container).not.toBeEmptyDOMElement();
  });

  it("created the shared kunji mocks lazily, once, when the kunji demos rendered", () => {
    expect(createMockKunjiClient).toHaveBeenCalledTimes(1);
    expect(createMockPairingAdapter).toHaveBeenCalledTimes(1);
  });
});

describe("deprecated names are still exported from their old paths", () => {
  it("root, @sutra/ui/blocks and the blocks barrel re-export the registry and demo helpers", async () => {
    const registry = await import("../src/blocks/registry");
    for (const mod of [await import("../src"), await import("../src/entries/blocks"), await import("../src/blocks")]) {
      expect(mod.blockRegistry).toBe(registry.blockRegistry);
      expect(mod.blockCategoryLabels).toBe(registry.blockCategoryLabels);
      expect(mod.marketingDemoData).toBe(registry.marketingDemoData);
      expect(mod.createMockPairingAdapter).toBe(registry.createMockPairingAdapter);
    }
    const root = await import("../src");
    expect(root.createMockKunjiClient).toBe(registry.createMockKunjiClient);
  });

  it("block-utils keeps only the internal block helpers", async () => {
    const utils = await import("../src/blocks/block-utils");
    expect(Object.keys(utils).sort()).toEqual(["BlockLink", "sutraAppDescriptions", "useBlockAction"]);
  });

  it("the registry path carries every demo helper", async () => {
    const registry = await import("../src/blocks/registry");
    for (const name of ["blockRegistry", "blockCategoryLabels", "demoUser", "marketingDemoData", "createMockKunjiClient", "createMockPairingAdapter"]) {
      expect(registry).toHaveProperty(name);
    }
  });
});
