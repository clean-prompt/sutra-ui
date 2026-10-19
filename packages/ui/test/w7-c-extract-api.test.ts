import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { buildApi, type Api } from "../scripts/docs/extract-api.mjs";

/** The API extractor on the real source: union types and data-slot names that used to be cut short. */
let api: Api;
beforeAll(() => {
  api = buildApi({ root: path.resolve(__dirname, "..") });
}, 60_000);

const slotsOf = (name: string) => api.components[name]?.slots ?? (api.components[name]?.slot ? [api.components[name]!.slot!] : []);
const prop = (component: string, name: string) => api.components[component]?.props.find((p) => p.name === name);

describe("variant unions", () => {
  it("lists the keys a cva variant spreads in (Text tone = default, the Tone names, muted)", () => {
    const tone = prop("Text", "tone")!.type;
    for (const name of ["default", "primary", "neutral", "success", "warning", "destructive", "info", "muted"]) expect(tone).toContain(`"${name}"`);
    expect(api.components.Text!.variants!.tone).toEqual(expect.arrayContaining(["neutral", "success", "muted"]));
  });

  it("does not borrow another cva's variants for a prop that comes from ButtonProps (SidebarTrigger size)", () => {
    const size = prop("SidebarTrigger", "size")!.type;
    expect(size).toContain('"icon"');
    expect(size).toContain('"xs"');
    expect(api.components.SidebarTrigger!.sizes).toBeUndefined();
  });
});

describe("sizes picked in the render function", () => {
  it("reads a lookup in a module const (Progress barHeight[size])", () => {
    expect(api.components.Progress!.sizes).toEqual({ "2xs": "h-0.5", xs: "h-1", sm: "h-1.5", md: "h-2", lg: "h-3" });
  });

  it("reads \`size === \"sm\" ?\` chains, the last branch being the one size left (ProgressSegments, Pagination)", () => {
    expect(api.components.ProgressSegments!.sizes).toEqual({ sm: "h-1", md: "h-1.5", lg: "h-2" });
    expect(Object.keys(api.components.Pagination!.sizes!)).toEqual(["sm", "md", "lg"]);
  });

  it("reads a per-variant lookup of a part that gets the size from a context the component provides (Tabs, triggers)", () => {
    const sizes = api.components.Tabs!.sizes!;
    expect(Object.keys(sizes)).toEqual(["sm", "md", "lg"]);
    expect(sizes.md).toMatch(/^pill: h-7 px-3 text-sm solid: .* underline: h-10 /);
  });

  it("never lists a partial map or a bare size name as classes", () => {
    for (const [name, c] of Object.entries(api.components)) {
      if (!c.sizes) continue;
      const keys = Object.keys(c.sizes);
      expect(keys.length, name).toBeGreaterThanOrEqual(2);
      for (const text of Object.values(c.sizes)) expect(text.split(" ").every((t) => keys.includes(t)), `${name}: ${text}`).toBe(false);
    }
  });
});

describe("data-slot names", () => {
  it("reads object keys, including ones built in the body (ToggleGroup, Item, CollapsibleTrigger)", () => {
    expect(slotsOf("ToggleGroup")).toContain("toggle-group");
    expect(slotsOf("Item")).toContain("item");
    expect(slotsOf("CollapsibleTrigger")).toContain("collapsible-trigger");
    expect(slotsOf("CredentialCard")).toContain("credential-card");
  });

  it("reads both sides of a conditional (BashToolBody: stderr and output)", () => {
    expect(slotsOf("BashToolBody")).toEqual(expect.arrayContaining(["bash-stderr", "bash-output"]));
  });

  it("reads a destructured default (StackedMeter partSlot) and file-private helper components", () => {
    expect(slotsOf("StackedMeter")).toContain("stacked-meter-part");
    expect(slotsOf("Pagination")).toContain("pagination-jump");
  });

  it("does not list a template placeholder as a slot", () => {
    for (const name of Object.keys(api.components)) for (const slot of slotsOf(name)) expect(slot, name).toMatch(/^[a-z][a-z0-9-]*$/);
  });
});
