import {
  applyEdits,
  decodeMappings,
  encodeMappings,
  needsUseClient,
  prependDirective,
  treeShakeEdits,
} from "../scripts/dist-transforms";

const transform = (code: string) => applyEdits(code, null, treeShakeEdits(code)).code;

describe("needsUseClient", () => {
  it("marks components and hooks, not pure modules", () => {
    expect(needsUseClient("components/button.tsx", "export const Button = () => null;")).toBe(true);
    expect(needsUseClient("hooks/use-copy.ts", "export function useCopy() {}")).toBe(true);
    expect(needsUseClient("lib/cn.ts", "export const cn = () => '';")).toBe(false);
    expect(needsUseClient("lib/refs.ts", 'import type * as React from "react";')).toBe(false);
    expect(needsUseClient("components/tiling-model.ts", "export const x = 1;")).toBe(false);
    expect(needsUseClient("entries/ai.ts", 'export * from "../components/chat-message";')).toBe(false);
    expect(needsUseClient("index.ts", 'export { Button } from "./components/button";')).toBe(false);
  });

  it("skips .tsx re-export barrels", () => {
    const barrel = 'export { SplitButton } from "./split-button";\nexport type { SplitButtonProps } from "./split-button";\n';
    expect(needsUseClient("components/primitives-extra.tsx", barrel)).toBe(false);
    expect(needsUseClient("components/primitives-extra.tsx", `${barrel}export const extra = 1;\n`)).toBe(true);
  });

  it("treats a plain .ts that imports React values as client code", () => {
    expect(needsUseClient("components/thing.ts", 'import * as React from "react";')).toBe(true);
    expect(needsUseClient("components/thing.ts", 'import { useState } from "react";')).toBe(true);
    expect(needsUseClient("components/thing.ts", 'import { type Ref } from "react";')).toBe(false);
    expect(needsUseClient("components/thing.ts", 'import type { Ref } from "react";')).toBe(false);
  });
});

describe("treeShakeEdits", () => {
  it("folds displayName into a pure Object.assign and keeps the line count", () => {
    const code = [
      'import * as React from "react";',
      "var A = React.forwardRef(",
      "  (props, ref) => null",
      ");",
      'A.displayName = "A";',
      "export { A };",
    ].join("\n");
    const out = transform(code);
    expect(out.split("\n")).toHaveLength(code.split("\n").length);
    expect(out).toContain("var A = /* @__PURE__ */ Object.assign(/* @__PURE__ */ React.forwardRef(");
    expect(out).toContain('), { displayName: "A" });');
    expect(out).not.toContain("A.displayName =");
  });

  it("annotates pure factories without a displayName", () => {
    const out = transform('var v = cva("x");\nvar Ctx = React.createContext(null);\nvar n = other();\n');
    expect(out).toContain('var v = /* @__PURE__ */ cva("x");');
    expect(out).toContain("var Ctx = /* @__PURE__ */ React.createContext(null);");
    expect(out).toContain("var n = other();");
  });

  it("tags the placeholder-logo factory so an unused logo can be dropped", () => {
    const out = transform('var AcmeLogo = createPlaceholderLogo("Acme", mark, "w");\nvar LumenLogo = createPlaceholderLogo("Lumen", mark2, "w");\n');
    expect(out).toContain('var AcmeLogo = /* @__PURE__ */ createPlaceholderLogo("Acme", mark, "w");');
    expect(out).toContain('var LumenLogo = /* @__PURE__ */ createPlaceholderLogo("Lumen", mark2, "w");');
  });

  it("tags side-effect-free data chains, each call on its own", () => {
    const out = transform(
      [
        "var names = Object.keys(map);",
        "var colors = Object.fromEntries(Object.entries(formats).map(([ext, f]) => [ext, f.color]));",
        'var cls = ["a", "b"].join(" ");',
        "var roles = all.filter((r) => r.value !== 1);",
      ].join("\n")
    );
    expect(out).toContain("var names = /* @__PURE__ */ Object.keys(map);");
    // Annotation on the outer call, on the `.map` call, and a parenthesised one on the receiver `Object.entries(...)`.
    expect(out).toContain(
      "var colors = /* @__PURE__ */ Object.fromEntries(/* @__PURE__ */ (/* @__PURE__ */ Object.entries(formats)).map(([ext, f]) => [ext, f.color]));"
    );
    expect(out).toContain('var cls = /* @__PURE__ */ ["a", "b"].join(" ");');
    expect(out).toContain("var roles = /* @__PURE__ */ all.filter((r) => r.value !== 1);");
    expect(transform(out)).toBe(out);
  });

  it("does not tag a data chain whose arguments or callbacks can have effects", () => {
    const cases = [
      "var a = Object.keys(register(x));",
      "var b = list.map((x) => registry.add(x));",
      "var c = list.map((x) => { seen++; return x; });",
      "var d = list.map((x) => (state.last = x));",
      "var e = list.map((x) => new Thing(x));",
      "var f = Object.fromEntries(list.map(sideEffect));",
      "var g = items.sort();",
      "var h = [load()].join(',');",
    ];
    for (const code of cases) expect(transform(code), code).toBe(code);
  });

  it("keeps a line-for-line layout when tagging chains (source maps stay valid)", () => {
    const code = "var colors = Object.fromEntries(\n  Object.entries(formats).map(([e, f]) => [e, f.c])\n);\n";
    expect(transform(code).split("\n")).toHaveLength(code.split("\n").length);
  });

  it("leaves unknown or dynamic displayName assignments alone", () => {
    const code = 'var F = make();\nF.displayName = "F";\nvar G = React.forwardRef(() => null);\nG.displayName = `${p}G`;\n';
    const out = transform(code);
    expect(out).toContain('var F = make();\nF.displayName = "F";');
    expect(out).toContain("G.displayName = `${p}G`;");
    expect(out).toContain("var G = /* @__PURE__ */ React.forwardRef(");
  });

  it("folds displayName into arrow bindings and function declarations", () => {
    const out = transform('var A = (p) => null;\nA.displayName = "A";\nfunction B(p) {\n  return B;\n}\nB.displayName = "B";\n');
    expect(out).toContain('var A = /* @__PURE__ */ Object.assign((p) => null, { displayName: "A" });');
    expect(out).toContain('var B = /* @__PURE__ */ Object.assign(function B(p) {\n  return B;\n}, { displayName: "B" });');
    expect(out.split("\n")).toHaveLength(7);
  });

  it("keeps a hoisted function declaration that earlier code relies on", () => {
    const code = 'var x = render(B);\nfunction B() {}\nB.displayName = "B";\n';
    expect(transform(code)).toBe(code);
  });

  it("ignores an import specifier that shares the declaration's name", () => {
    const out = transform('import { Tooltip as P } from "radix-ui";\nfunction Tooltip() {}\nTooltip.displayName = "Tooltip";\n');
    expect(out).toContain('var Tooltip = /* @__PURE__ */ Object.assign(function Tooltip() {}, { displayName: "Tooltip" });');
  });

  it("is idempotent", () => {
    const once = transform('var A = React.forwardRef(() => null);\nA.displayName = "A";\n');
    expect(transform(once)).toBe(once);
  });
});

describe("source maps", () => {
  it("round-trips mappings", () => {
    const mappings = "AAAA,SAAS;;AACA,IAAI,KAAK;AAClB";
    expect(encodeMappings(decodeMappings(mappings))).toBe(mappings);
  });

  it("shifts columns after an insertion and drops segments inside a deletion", () => {
    const code = "var A = f(x);\nA.d = 1;\nend;";
    const map = { version: 3, mappings: encodeMappings([[[0, 0, 0, 0], [8, 0, 0, 10], [12, 0, 0, 14]], [[0, 0, 1, 0]], [[0, 0, 2, 0]]]) };
    const edits = [
      { start: 8, end: 8, text: "W(" },
      { start: 12, end: 12, text: ")" },
      { start: 14, end: 22, text: "" },
    ];
    const out = applyEdits(code, map, edits);
    expect(out.code).toBe("var A = W(f(x));\n\nend;");
    expect(decodeMappings(out.map!.mappings)).toEqual([
      [[0, 0, 0, 0], [10, 0, 0, 10], [15, 0, 0, 14]],
      [],
      [[0, 0, 2, 0]],
    ]);
  });

  it("moves the map down one line when the directive is prepended", () => {
    const out = prependDirective("x;", { mappings: "AAAA" });
    expect(out.code).toBe('"use client";\nx;');
    expect(out.map!.mappings).toBe(";AAAA");
    expect(prependDirective(out.code, out.map).code).toBe(out.code);
  });
});
