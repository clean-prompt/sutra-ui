/** Item sizes follow the sm | md | lg vocabulary (md default); `default` stays as a deprecated alias of `md`. */
import * as React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Item } from "../src/primitives/item";

const classOf = (node: React.ReactElement) => {
  const { container } = render(node);
  return container.querySelector('[data-slot="item"]')!;
};

describe("Item size", () => {
  it("renders md, the deprecated default alias and no size with identical padding classes", () => {
    const md = classOf(<Item size="md">a</Item>);
    const alias = classOf(<Item size="default">a</Item>);
    const none = classOf(<Item>a</Item>);
    expect(md).toHaveClass("gap-3", "px-4", "py-3");
    expect(alias.className).toBe(md.className);
    expect(none.className).toBe(md.className);
  });

  it("emits the normalized size in data-size", () => {
    expect(classOf(<Item size="md">a</Item>)).toHaveAttribute("data-size", "md");
    expect(classOf(<Item size="default">a</Item>)).toHaveAttribute("data-size", "md");
    expect(classOf(<Item>a</Item>)).toHaveAttribute("data-size", "md");
    expect(classOf(<Item size="sm">a</Item>)).toHaveAttribute("data-size", "sm");
    expect(classOf(<Item size="xs">a</Item>)).toHaveAttribute("data-size", "xs");
  });

  it("applies the alias to links, buttons and asChild rows too", () => {
    expect(classOf(<Item size="default" href="#x">a</Item>)).toHaveClass("gap-3", "px-4", "py-3");
    expect(classOf(<Item size="default" onClick={() => {}}>a</Item>)).toHaveClass("gap-3", "px-4", "py-3");
    expect(classOf(<Item size="default" asChild><a href="#x">a</a></Item>)).toHaveClass("gap-3", "px-4", "py-3");
  });

  it("documents default as a deprecated alias on the size prop (what the props reference reads)", () => {
    const src = readFileSync(path.resolve(__dirname, "../src/primitives/item.tsx"), "utf8");
    const doc = /\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*size\?:/.exec(src)?.[1] ?? "";
    expect(doc).toMatch(/`?"default"`? is a deprecated alias of `?"md"`?/);
    expect(doc).toMatch(/@default "md"/);
  });
});
