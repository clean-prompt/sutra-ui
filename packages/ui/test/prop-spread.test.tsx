import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Avatar } from "../src/primitives/avatar";
import { Badge } from "../src/primitives/badge";
import { Button } from "../src/primitives/button";
import { Checkbox } from "../src/primitives/checkbox";
import { Chip } from "../src/primitives/chip";
import { Dropzone } from "../src/primitives/dropzone";
import { Input } from "../src/primitives/input";
import { RadioGroup, RadioGroupItem } from "../src/primitives/radio";
import { Switch } from "../src/primitives/switch";
import { Tabs, TabsList, TabsTrigger } from "../src/primitives/tabs";
import { Textarea } from "../src/primitives/textarea";
import { ToggleGroup, ToggleGroupItem } from "../src/primitives/toggle-group";
import { attributesAfterSpread, count, sourceFiles, tagAttributes } from "./helpers/conventions-scan";
import { existsSync } from "node:fs";
import path from "node:path";
import { SRC } from "./helpers/conventions-scan";

/**
 * Prop-spread contract (R13).
 *
 * THE RULE. A component that forwards `...props` to its root spreads them AFTER the attributes it sets as defaults (`type`,
 * `role`, `aria-*`, `tabIndex`, `id`, `data-*` including `data-slot`), so a consumer can override any of those, and BEFORE
 * the few things it must own:
 *   - `ref`, and the merged `className` / `style` (the consumer's value is merged, never replaced);
 *   - composed handlers (`onClick` calls the consumer's `onClick`, then its own; destructure the handler out of `props`);
 *   - attributes re-derived from props the component destructured (Field context: `id`, `disabled`, `required`,
 *     `aria-invalid`, `aria-describedby`; `value` / `checked`);
 *   - state it must guarantee: an inert `asChild` Button keeps `aria-disabled`, `data-disabled` and `tabIndex=-1`, a loading
 *     Button keeps `aria-busy`, a disabled Dropzone keeps `tabIndex=-1`, widgets keep the ARIA of the role they implement.
 * `data-slot` is a default like the others (it sits before the spread at all of the ~290 call sites), so a wrapper may re-tag.
 */

/* ---- 1. the scans ------------------------------------------------------------------------------------------ */

const files = sourceFiles(/\.tsx$/);

/** After-spread attributes that the component did not destructure from its own props: they silently win over the consumer. */
function ownedAfterSpread() {
  const out: string[] = [];
  for (const [file, text] of files) {
    for (const hit of attributesAfterSpread(file, text)) {
      const [, tag, attrs] = hit.split(" ") as [string, string, string];
      const own = attrs.split(",").filter((attr) => !derivedFromProps(text, attr));
      if (own.length) out.push(`${file} ${tag} ${own.join(",")}`);
    }
  }
  return out;
}

/** The attribute's value is derived from a prop the component destructured or reads (`props["aria-describedby"]`, `props.id`). */
function derivedFromProps(text: string, attr: string) {
  const camel = attr.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
  const destructured = new RegExp(`[{,]\\s*(?:["']${attr}["']:\\s*\\w+|${camel})\\s*[,=}:]`).test(text);
  const read = new RegExp(`props\\[["']${attr}["']\\]|props\\.${camel}\\b`).test(text);
  return destructured || read;
}

/** Handlers set before the spread that the component never takes out of props: a consumer's same-named handler would replace them. */
function handlersBeforeSpread() {
  const out: string[] = [];
  for (const [file, text] of files) {
    for (const m of text.matchAll(/<([A-Za-z][\w.]*)(?=[\s/>])/g)) {
      const end = tagEnd(text, m.index!);
      if (end < 0) continue;
      const attrs = tagAttributes(text.slice(m.index!, end));
      const spread = attrs.indexOf("...");
      if (spread < 0) continue;
      for (const handler of attrs.slice(0, spread).filter((a) => /^on[A-Z]/.test(a))) {
        const taken = new RegExp(`[{,]\\s*${handler}\\s*[,=}:]|props\\.${handler}\\b|props\\[["']${handler}["']\\]`).test(text);
        if (!taken) out.push(`${file} ${m[1]} ${handler}`);
      }
    }
  }
  return out;
}

function tagEnd(s: string, start: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start + 1; i < s.length; i++) {
    const c = s[i]!;
    if (quote) {
      if (c === quote && s[i - 1] !== "\\") quote = null;
    } else if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0 && s[i - 1] !== "=") return i;
  }
  return -1;
}

/** Ratchet: `"file Tag attr,attr": reason`. Fails on new entries and on entries that no longer occur. */
function expectRatchet(found: string[], allow: Record<string, string>, what: string) {
  const unique = [...new Set(found)];
  expect(unique.filter((x) => !(x in allow)), `new: ${what}`).toEqual([]);
  expect(Object.keys(allow).filter((x) => !unique.includes(x)), "fixed but still listed: remove the entry").toEqual([]);
  for (const key of Object.keys(allow)) expect(existsSync(path.join(SRC, key.split(" ")[0]!)), key).toBe(true);
}

describe("prop-spread rule: scans", () => {
  it("lists every component that sets attributes after the consumer's spread without taking them from props", () => {
    expectRatchet(
      ownedAfterSpread(),
      {
        "primitives/number-input.tsx input aria-valuemin,aria-valuemax,aria-valuenow,aria-valuetext": "ARIA of the spinbutton role it implements",
        "primitives/tag-input.tsx input aria-required,role,aria-expanded,aria-controls,aria-autocomplete,aria-activedescendant": "ARIA of the combobox role it implements",
        "kits/workspace/kanban-board.tsx KanbanCard activatorRef,activatorProps": "drag-and-drop plumbing",
        "patterns/chart-cartesian.tsx CartesianChart chartType,band,renderActive,renderMarks": "chart engine internals",
        "patterns/chart-cartesian.tsx CartesianChart chartType,band,renderMarks": "chart engine internals",
        "primitives/dropzone.tsx div data-drag,data-density": "drag state and density the component guarantees",
      },
      "attributes after the spread",
    );
  });

  it("lists handlers set before the spread that a consumer's handler would replace (compose them, or omit the prop from the type)", () => {
    const allow: Record<string, string> = {};
    const reviewed = "to review: harmless when the prop type omits the handler, a bug when it does not";
    for (const key of [
      "kits/agent-admin/webhooks.tsx form onSubmit",
      "kits/agent/git-review.tsx TreeView onNodeAction",
      "kits/ai/slash-menu.tsx div onMouseDown",
      "kits/geo/globe.tsx div onKeyDown",
      "kits/identity/connected-apps.tsx button onClick",
      "kits/media/video-player.tsx div onPointerDown",
      "kits/media/video-player.tsx div onFocus",
      "kits/media/video-player.tsx div onBlur",
      "kits/ops/process-table.tsx div onKeyDown",
      "kits/social/call-overlay.tsx div onKeyDown",
      "kits/social/messenger.tsx form onSubmit",
      "kits/voice/translate.tsx div onMouseDown",
      "kits/voice/voice.tsx Button onClick",
      "kits/workspace/install-prompt.tsx Button onClick",
      "primitives/table.tsx input onClick",
    ]) allow[key] = reviewed;
    allow["patterns/file-upload.tsx Dropzone onDrop"] = "Dropzone's own onDrop(files) API, not the DOM event";
    allow["primitives/checkbox.tsx CheckboxField onCheckedChange"] = "omitted from the prop type (the group owns it)";
    expectRatchet(handlersBeforeSpread(), allow, "owned handlers before the spread");
  });

  it("the scanners read attribute order correctly", () => {
    expect(tagAttributes('<div a="1" {...props} b={x > 1 ? "}" : 2} {...other} c />')).toEqual(["a", "...", "b", "{...other}", "c"]);
    const after = (jsx: string) => attributesAfterSpread("x.tsx", jsx);
    expect(after('<div role="button" {...props} tabIndex={0} className="x" onClick={go} />')).toEqual(["x.tsx div tabIndex"]);
    expect(after('<div tabIndex={0} {...props} ref={ref} className="x" data-slot="y" />')).toEqual([]);
    expect(after('<path d="M0" {...p} fill="red" />')).toEqual([]);
    expect(count("", /x/g)).toBe(0);
  });
});

/* ---- 2. behaviour ------------------------------------------------------------------------------------------ */

interface RootCase {
  name: string;
  /** Where `className` lands when it is not the element that receives the other props. */
  classHost?: (root: HTMLElement) => HTMLElement;
  /** Renders the component with the given props on the element that should receive them. */
  element: (props: Record<string, unknown>) => React.ReactElement;
}

const roots: RootCase[] = [
  { name: "Button", element: (p) => <Button {...p}>Go</Button> },
  { name: "Button asChild", element: (p) => <Button asChild {...p}><a href="#go">Go</a></Button> },
  { name: "Badge", element: (p) => <Badge {...p}>New</Badge> },
  // Chip: `className` styles the pill (the wrapper), the other props and the ref go to the inner button
  { name: "Chip", classHost: (root) => root.parentElement!, element: (p) => <Chip {...p}>Tag</Chip> },
  { name: "Avatar", element: (p) => <Avatar name="Maya Chen" {...p} /> },
  { name: "Switch", element: (p) => <Switch aria-label="Notify" {...p} /> },
  { name: "Checkbox", element: (p) => <Checkbox aria-label="Agree" {...p} /> },
  { name: "Input", element: (p) => <Input aria-label="Name" {...p} /> },
  { name: "Textarea", element: (p) => <Textarea aria-label="Notes" {...p} /> },
  { name: "Dropzone", element: (p) => <Dropzone onDrop={() => {}} {...p} /> },
  {
    name: "RadioGroup",
    element: (p) => (
      <RadioGroup aria-label="Choice" {...p}>
        <RadioGroupItem value="a" aria-label="A" />
      </RadioGroup>
    ),
  },
  {
    name: "Tabs",
    element: (p) => (
      <Tabs defaultValue="a" {...p}>
        <TabsList aria-label="Sections">
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>
    ),
  },
  {
    name: "ToggleGroup",
    element: (p) => (
      <ToggleGroup aria-label="View" {...p}>
        <ToggleGroupItem value="a">A</ToggleGroupItem>
      </ToggleGroup>
    ),
  },
];

describe.each(roots)("prop-spread contract: $name", (c) => {
  it("forwards the ref and any data-* or aria-* attribute to the root, and merges className with its own classes", () => {
    const ref = React.createRef<HTMLElement>();
    const { container } = render(c.element({ ref, "data-testid": "root", "data-extra": "1", lang: "fr", className: "consumer-class" }));
    const root = screen.getByTestId("root");
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("data-extra", "1");
    expect(root).toHaveAttribute("lang", "fr");
    const host = c.classHost?.(root) ?? root;
    expect(host).toHaveClass("consumer-class");
    expect(host.className.split(/\s+/).length).toBeGreaterThan(2); // its own classes are still there
    expect(container.contains(root)).toBe(true);
  });

  it("lets the consumer override a default attribute (data-slot is a default)", () => {
    const { rerender } = render(c.element({ "data-testid": "root" }));
    const own = screen.getByTestId("root").getAttribute("data-slot");
    rerender(c.element({ "data-testid": "root", "data-slot": "custom" }));
    expect(screen.getByTestId("root")).toHaveAttribute("data-slot", "custom");
    expect(own === null || own !== "custom").toBe(true);
  });
});

describe("prop-spread contract: owned state survives the consumer's props", () => {
  it("Button: type is a default (consumer wins), aria-busy follows loading", () => {
    const { rerender } = render(<Button type="submit">Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
    rerender(<Button loading aria-busy={false}>Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button")).toBeDisabled();
    rerender(<Button aria-busy>Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });

  it("Button asChild: an inert link keeps aria-disabled, data-disabled and tabIndex -1 whatever the consumer passes", async () => {
    const onClick = vi.fn();
    render(
      <Button asChild disabled aria-disabled={false} tabIndex={0} data-disabled="no" onClick={onClick}>
        <a href="#go">Go</a>
      </Button>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("data-disabled", "");
    expect(link).toHaveAttribute("tabindex", "-1");
    await userEvent.setup().click(link);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("Button asChild: an enabled link takes the consumer's tabIndex and aria-disabled", () => {
    render(
      <Button asChild tabIndex={3}>
        <a href="#go">Go</a>
      </Button>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("tabindex", "3");
  });

  it("Dropzone: a disabled zone stays out of the tab order and keeps aria-disabled, an enabled one takes the consumer's tabIndex", () => {
    const { rerender } = render(<Dropzone onDrop={() => {}} disabled tabIndex={0} aria-disabled={false} />);
    const zone = screen.getByRole("button");
    expect(zone).toHaveAttribute("tabindex", "-1");
    expect(zone).toHaveAttribute("aria-disabled", "true");
    rerender(<Dropzone onDrop={() => {}} tabIndex={5} />);
    expect(screen.getByRole("button")).toHaveAttribute("tabindex", "5");
  });

  it("Dropzone: the consumer's aria-describedby is kept next to the hint, not replaced by it", () => {
    render(<Dropzone onDrop={() => {}} hint="PNG up to 2 MB" aria-describedby="outside" />);
    const ids = (screen.getByRole("button").getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids).toContain("outside");
    expect(ids.length).toBe(2);
    expect(document.getElementById(ids.find((id) => id !== "outside")!)).toHaveTextContent("PNG up to 2 MB");
  });

  it("Dropzone: a consumer's drag handlers run and the drag state still follows", () => {
    const onDragEnter = vi.fn();
    const onDragOver = vi.fn();
    const onDragLeave = vi.fn();
    render(<Dropzone onDrop={() => {}} onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} />);
    const zone = screen.getByRole("button");
    const data = { dataTransfer: { items: [{ kind: "file", type: "image/png" }], files: [], types: ["Files"], dropEffect: "none" } };
    fireEvent.dragEnter(zone, data);
    expect(onDragEnter).toHaveBeenCalledTimes(1);
    expect(zone).toHaveAttribute("data-drag");
    fireEvent.dragOver(zone, data);
    expect(onDragOver).toHaveBeenCalledTimes(1);
    fireEvent.dragLeave(zone, data);
    expect(onDragLeave).toHaveBeenCalledTimes(1);
    expect(zone).not.toHaveAttribute("data-drag");
  });

  it("Switch and Checkbox: the consumer's id, aria-describedby and aria-invalid survive the Field context", () => {
    render(
      <>
        <Switch aria-label="S" id="sw" aria-describedby="why" aria-invalid />
        <Checkbox aria-label="C" id="cb" aria-describedby="why" aria-invalid />
      </>,
    );
    for (const [role, id] of [["switch", "sw"], ["checkbox", "cb"]] as const) {
      const el = screen.getByRole(role);
      expect(el).toHaveAttribute("id", id);
      expect(el.getAttribute("aria-describedby")).toContain("why");
      expect(el).toHaveAttribute("aria-invalid", "true");
    }
  });
});
