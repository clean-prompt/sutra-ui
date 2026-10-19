import { readFileSync } from "node:fs";
import path from "node:path";
import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from "../src/primitives/breadcrumbs";
import { Button } from "../src/primitives/button";
import { Checkbox } from "../src/primitives/checkbox";
import { CloseButton } from "../src/primitives/close-button";
import { CopyButton } from "../src/primitives/copy-button";
import { InfoTooltip } from "../src/primitives/info-tooltip";
import { RadioGroup, RadioGroupItem } from "../src/primitives/radio";
import { Rating } from "../src/primitives/rating";
import { Slider } from "../src/primitives/slider";
import { Switch } from "../src/primitives/switch";
import { TextLink } from "../src/primitives/text-link";
import { cn, hitArea, hitAreaTouch } from "../src/lib/cn";

/** Touch targets (A3, WCAG 2.5.8): a control smaller than 24px keeps its look and gains an invisible 24px hit area. */

const MIN = ["relative", "after:absolute", "after:left-1/2", "after:top-1/2", "after:-translate-x-1/2", "after:-translate-y-1/2", "after:content-['']", "after:h-[max(100%,1.5rem)]", "after:w-[max(100%,1.5rem)]"];
const classes = (el: Element) => (el.getAttribute("class") ?? "").split(/\s+/);

describe("hitArea", () => {
  it("is a centred, transparent ::after that is as large as the control and never under 24px", () => {
    expect(hitArea.split(" ")).toEqual(expect.arrayContaining(MIN));
    expect(hitArea).not.toMatch(/\b(bg-|border|ring|shadow|opacity)/);
  });

  it("hitAreaTouch adds a 44px floor under a coarse pointer and nothing else", () => {
    expect(hitAreaTouch.startsWith(hitArea)).toBe(true);
    expect(hitAreaTouch).toContain("pointer-coarse:after:h-[max(100%,2.75rem)]");
    expect(hitAreaTouch).toContain("pointer-coarse:after:w-[max(100%,2.75rem)]");
  });

  it("survives cn(): an absolute or fixed host replaces `relative` but keeps the pseudo-element", () => {
    const merged = classes({ getAttribute: () => cn(hitArea, "absolute top-2") } as unknown as Element);
    expect(merged).toContain("absolute");
    expect(merged).not.toContain("relative");
    expect(merged).toEqual(expect.arrayContaining(MIN.filter((c) => c !== "relative")));
  });
});

describe("controls that are visually under 24px carry it (their size is unchanged)", () => {
  const has = (el: Element) => expect(classes(el)).toEqual(expect.arrayContaining(MIN));

  it("Checkbox, Radio and Switch", () => {
    render(
      <>
        <Checkbox aria-label="C" />
        <Checkbox aria-label="C sm" size="sm" />
        <RadioGroup aria-label="R">
          <RadioGroupItem value="a" aria-label="A" />
        </RadioGroup>
        <Switch aria-label="S" size="sm" />
      </>,
    );
    for (const el of [...screen.getAllByRole("checkbox"), screen.getByRole("radio"), screen.getByRole("switch")]) has(el);
    expect(classes(screen.getAllByRole("checkbox")[0]!)).toContain("size-4");
    expect(classes(screen.getAllByRole("checkbox")[1]!)).toContain("size-3.5");
    expect(classes(screen.getByRole("switch"))).toEqual(expect.arrayContaining(["h-4", "w-7"]));
  });

  it("icon buttons: 24px floor everywhere, 44px under touch, and the text sizes are untouched", () => {
    render(
      <>
        {(["icon-xs", "icon-sm", "icon", "icon-lg"] as const).map((size) => (
          <Button key={size} size={size} aria-label={size} />
        ))}
        <Button size="md">Text</Button>
      </>,
    );
    for (const size of ["icon-xs", "icon-sm", "icon", "icon-lg"]) {
      const c = classes(screen.getByRole("button", { name: size }));
      expect(c).toEqual(expect.arrayContaining(MIN));
      expect(c).toContain("pointer-coarse:after:h-[max(100%,2.75rem)]");
    }
    expect(classes(screen.getByRole("button", { name: "Text" }))).not.toContain("after:absolute");
    expect(classes(screen.getByRole("button", { name: "icon" }))).toContain("size-9");
  });

  it("CloseButton (control and the chip/tag pill), CopyButton, InfoTooltip, TextLink, breadcrumb links", () => {
    render(
      <>
        <CloseButton aria-label="close control" />
        <CloseButton shape="pill" size="3xs" aria-label="close pill" />
        <CopyButton value="x" />
        <InfoTooltip title="Info" />
        <TextLink href="#x">Docs</TextLink>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#home">Home</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </>,
    );
    has(screen.getByRole("button", { name: "close control" }));
    has(screen.getByRole("button", { name: "close pill" }));
    has(screen.getByRole("button", { name: /copy/i }));
    has(screen.getByRole("button", { name: /info/i }));
    has(screen.getByRole("link", { name: "Docs" }));
    has(screen.getByRole("link", { name: "Home" }));
    expect(classes(screen.getByRole("button", { name: "close pill" }))).toContain("size-4");
  });

  it("Slider thumb and Rating stars", () => {
    render(
      <>
        <Slider aria-label="Volume" defaultValue={[20]} />
        <Rating aria-label="Score" defaultValue={2} />
      </>,
    );
    has(screen.getByRole("slider"));
    for (const star of screen.getAllByRole("radio")) has(star);
  });
});

describe("the layout audit counts the hit area", () => {
  it("the playground audit script measures ::before/::after boxes and skips inline links and scaled previews", () => {
    const script = readFileSync(path.resolve(__dirname, "../../../apps/playground/scripts/layout-audit.mjs"), "utf8");
    expect(script).toContain('["::before", "::after"]');
    expect(script).toContain("getComputedStyle(el, pseudo)");
    expect(script).toContain("tap-target-small");
    expect(script).toMatch(/scaledDown/);
  });
});
