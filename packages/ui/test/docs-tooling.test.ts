import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { extractDemos, declarationsOf, matchProps, pageFiles } from "../../../apps/playground/plugins/demo-source";
import { paletteEntries, paletteFilter, textScore } from "../../../apps/playground/src/components/nav-search";
import { nav } from "../../../apps/playground/src/nav";

/**
 * The playground's docs tooling: demo source extraction, the props-to-demo mapping, the nav metadata the palette and the
 * sidebar read, the ⌘K fuzzy filter, and the generated props reference. (Pure functions; the UI is checked in a browser.)
 */
const PKG = path.resolve(__dirname, "..");
const api = {
  components: { Button: { layer: "primitives" }, ToggleGroup: { layer: "primitives" }, ToggleButton: { layer: "primitives" }, InputOTP: { layer: "primitives" }, Carousel: { layer: "patterns" } },
  hooks: { useDrag: {} },
  entries: { Button: "core", ToggleGroup: "core", Carousel: "navigation", Markdown: "ai" },
} as Parameters<typeof matchProps>[3] & Parameters<typeof extractDemos>[2];

const PAGE = `
import * as React from "react";
import { Button, Carousel, type ButtonProps } from "@sutra/ui";
import { RiHeartLine } from "@sutra/ui/icons";
import { Demo } from "../components/demo";
import { Other } from "./other-demos";

function CounterDemo() {
  const [n, setN] = React.useState(0);
  return (
    <Demo id="counter" title="Counter">
      <Button onClick={() => setN(n + 1)}>Count {n}</Button>
    </Demo>
  );
}

export function ButtonsPage() {
  return (
    <>
      <Demo id="button" title="Button" description="One">
        <Button variant="soft" leadingIcon={<RiHeartLine />}>
          Save
        </Button>
        <Other />
      </Demo>
      <Demo title="Carousel items">
        <Carousel />
      </Demo>
      <Demo id="wrapped" title="Wrapped"><CounterDemo2 /></Demo>
    </>
  );
}
`;

describe("demo source extraction", () => {
  const { demos } = extractDemos("buttons.tsx", PAGE, api);

  it("keys a demo by its id, else its string title", () => {
    expect(Object.keys(demos).sort()).toEqual(["Carousel items", "button", "counter", "wrapped"]);
  });

  it("shows a page-level demo's children, dedented", () => {
    expect(demos.button!.code).toBe('<Button variant="soft" leadingIcon={<RiHeartLine />}>\n  Save\n</Button>\n<Other />');
    expect(demos.button!.helpers).toEqual(["Other"]);
  });

  it("shows the whole helper component, minus the Demo frame, when the demo owns state", () => {
    expect(demos.counter!.code.startsWith("function CounterDemo() {")).toBe(true);
    expect(demos.counter!.code).toContain("const [n, setN] = React.useState(0);");
    expect(demos.counter!.code).not.toContain("<Demo");
    expect(demos.counter!.imports).toContain('import * as React from "react";');
  });

  it("computes imports from the entry that exports each name (the icon set is /icons, types are left out)", () => {
    expect(demos.button!.imports).toBe('import { Button } from "@sutra/ui/core";\nimport { RiHeartLine } from "@sutra/ui/icons";');
    expect(demos["Carousel items"]!.imports).toBe('import { Carousel } from "@sutra/ui/navigation";');
    expect(demos.button!.names).toEqual(["Button", "RiHeartLine"]);
  });

  it("expands a demo that is only <SomeDemo /> to SomeDemo's source", () => {
    const helper = `import { Button } from "@sutra/ui";\nexport function CounterDemo2() {\n  return <Button>Two</Button>;\n}\n`;
    const decls = declarationsOf("other-demos.tsx", helper);
    const { demos: found } = extractDemos("buttons.tsx", PAGE, api, decls);
    expect(found.wrapped!.code).toBe("function CounterDemo2() {\n  return <Button>Two</Button>;\n}");
    expect(found.wrapped!.imports).toBe('import { Button } from "@sutra/ui/core";');
  });

  it("maps the routes of App.tsx's page map to their files", () => {
    const app = `const foundations = () => import("./pages/foundations");\nconst pages = {\n  "foundations/colors": lazyPage(foundations, "ColorsPage"),\n  "components/buttons": lazyPage(() => import("./pages/buttons"), "ButtonsPage"),\n};`;
    expect(pageFiles(app)).toEqual({ "foundations/colors": "foundations", "components/buttons": "buttons" });
  });
});

describe("props panel mapping", () => {
  it("uses the id when it spells a component or hook, whatever the casing", () => {
    expect(matchProps("toggle-group", "Anything", [], api)).toEqual(["ToggleGroup"]);
    expect(matchProps("input-otp", "One-time code", [], api)).toEqual(["InputOTP"]);
    expect(matchProps("drag", "Dragging", [], api)).toEqual(["useDrag"]);
  });

  it("reads component names out of the title, longest first, plurals singular", () => {
    expect(matchProps("x", "Toggle button and toggle group", [], api)).toEqual(["ToggleButton", "ToggleGroup"]);
    expect(matchProps("x", "Buttons", [], api)).toEqual(["Button"]);
  });

  it("falls back to the pattern, kit or block component the demo renders, never a primitive", () => {
    expect(matchProps("x", "Nothing here", ["Button", "Carousel"], api)).toEqual(["Carousel"]);
    expect(matchProps("x", "Nothing here", ["Button"], api)).toEqual([]);
    expect(matchProps("x", "Nothing here", ["useDrag", "useDrag"], api)).toEqual(["useDrag"]);
  });

  it("shows no table without an api", () => {
    expect(matchProps("button", "Button", [], null)).toEqual([]);
  });
});

describe("nav metadata and the palette", () => {
  const entries = paletteEntries();

  it("lists every section, page and item of nav.ts with a link", () => {
    const pages = nav.flatMap((s) => s.pages);
    const items = pages.flatMap((p) => p.items ?? []);
    expect(entries.filter((e) => e.kind === "section")).toHaveLength(nav.length);
    expect(entries.filter((e) => e.kind === "page")).toHaveLength(pages.length);
    expect(entries.filter((e) => e.kind === "item")).toHaveLength(items.length);
    expect(entries.every((e) => e.href.startsWith("#/"))).toBe(true);
  });

  it("carries since and status through, and only the known statuses", () => {
    const flagged = entries.filter((e) => e.status);
    expect(flagged.length).toBeGreaterThan(30);
    for (const e of flagged) {
      expect(["new", "beta", "deprecated"]).toContain(e.status);
      expect(e.since, `${e.label} has a status but no since`).toBeTruthy();
    }
  });

  it("ranks an exact label above a prefix, a word start and loose letters", () => {
    expect(textScore("button", "Button")).toBe(1);
    expect(textScore("button", "Buttons & Actions")).toBeGreaterThan(textScore("button", "Close Button") - 0.001);
    expect(textScore("group", "Toggle Group")).toBeGreaterThan(textScore("group", "Regroup"));
    expect(textScore("tgrp", "Toggle Group")).toBeGreaterThan(textScore("tgrp", "Typography"));
    expect(textScore("zq", "Toggle Group")).toBe(0);
    expect(textScore("tg", "Toggle Group")).toBe(0); // two letters are a prefix or word start, never a scatter
  });

  it("needs every word of the query to match, and hides Recent rows once you type", () => {
    const value = ["Toggle Group", "Primitives › Buttons & Actions", "toggle-group"].join("¦");
    expect(paletteFilter(value, "", [])).toBe(1);
    expect(paletteFilter(value, "toggle buttons", [])).toBeGreaterThan(0);
    expect(paletteFilter(value, "toggle zebra", [])).toBe(0);
    expect(paletteFilter(`~recent~${value}`, "toggle", [])).toBe(0);
    expect(paletteFilter(`~recent~${value}`, "", [])).toBe(1);
  });
});

describe("props reference", () => {
  // The generator is the one in scripts/gen-docs.mjs; --stats reads the same extraction as api.json.
  it("describes components with their own props, defaults and variants", () => {
    const api2 = JSON.parse(readFileSync(path.join(PKG, "../../apps/playground/src/generated/api.json"), "utf8"));
    const button = api2.components.Button;
    expect(button.module).toBe("primitives/button");
    expect(button.entry).toBeTruthy();
    const variant = button.props.find((p: { name: string }) => p.name === "variant");
    expect(variant.default).toBe('"primary"');
    expect(variant.type).toContain('"primary"');
    expect(button.variants.size).toContain("md");
    expect(api2.hooks.useDrag.kind).toBe("hook");
    expect(Object.keys(api2.entries).length).toBeGreaterThan(1000);
  });

  it("the stats the ratchet reads come from the same scan", () => {
    const stats = JSON.parse(execFileSync(process.execPath, [path.join(PKG, "scripts/gen-docs.mjs"), "--stats"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
    expect(stats.components).toBeGreaterThan(900);
    expect(stats.undocumentedProps).toBeLessThan(stats.props);
    // It spawns a full TypeScript scan: the default 5 s is too tight when the whole suite runs in parallel.
  }, 60_000);
});
