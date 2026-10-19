import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../src/primitives/accordion";
import { Checkbox } from "../src/primitives/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../src/primitives/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../src/primitives/dialog";
import { Input } from "../src/primitives/input";
import { NumberInput } from "../src/primitives/number-input";
import { RadioGroup, RadioGroupItem } from "../src/primitives/radio";
import { Rating } from "../src/primitives/rating";
import { SegmentedControl } from "../src/primitives/segmented-control";
import { SimpleSelect } from "../src/primitives/select";
import { Slider } from "../src/primitives/slider";
import { Switch } from "../src/primitives/switch";
import { TagInput } from "../src/primitives/tag-input";
import { Tabs, TabsList, TabsTrigger } from "../src/primitives/tabs";
import { Textarea } from "../src/primitives/textarea";
import { ToggleGroup, ToggleGroupItem } from "../src/primitives/toggle-group";

/**
 * Controlled / uncontrolled lifecycle contract (R13). Every component with `value | checked | open` + `default*` + an
 * `on*Change` callback is driven through the same table:
 *  - uncontrolled: starts at the default, follows the user, reports each change once;
 *  - controlled: follows the prop (the user's change is reported but not applied until the prop changes);
 *  - no React warning when the controlled value changes or when a component goes from uncontrolled to controlled.
 */

type User = ReturnType<typeof userEvent.setup>;

interface Case {
  name: string;
  /** The controlled prop and its `default*` partner. */
  prop: "value" | "checked" | "open";
  defaultProp: "defaultValue" | "defaultChecked" | "defaultOpen";
  /** The state before and after the user's action. */
  from: unknown;
  to: unknown;
  /** Render with the given state props and a spy wired to the component's change callback. */
  element: (state: Record<string, unknown>, spy: (value: unknown) => void) => React.ReactElement;
  /** Read the state the user sees. */
  read: () => unknown;
  /** Known deviation: the component warns when it goes from uncontrolled to controlled (React's own warning for native inputs). The test is expected to fail until it is fixed; then remove the entry. */
  warnsOnSwitch?: string;
  /** One user action that moves the state from `from` to `to`. */
  act: (user: User) => Promise<void>;
}

const aria = (el: HTMLElement, name: string) => el.getAttribute(name);

const cases: Case[] = [
  {
    name: "Input",
    warnsOnSwitch: "Input passes both value and defaultValue to the native input, so React warns when value goes from undefined to defined (Textarea does not)",
    prop: "value",
    defaultProp: "defaultValue",
    from: "a",
    to: "ab",
    element: (s, spy) => <Input aria-label="Field" onChange={(e) => spy(e.target.value)} {...s} />,
    read: () => (screen.getByRole("textbox") as HTMLInputElement).value,
    act: (user) => user.type(screen.getByRole("textbox"), "b"),
  },
  {
    name: "Textarea",
    prop: "value",
    defaultProp: "defaultValue",
    from: "a",
    to: "ab",
    element: (s, spy) => <Textarea aria-label="Field" onChange={(e) => spy(e.target.value)} {...s} />,
    read: () => (screen.getByRole("textbox") as HTMLTextAreaElement).value,
    act: (user) => user.type(screen.getByRole("textbox"), "b"),
  },
  {
    name: "Checkbox",
    prop: "checked",
    defaultProp: "defaultChecked",
    from: false,
    to: true,
    element: (s, spy) => <Checkbox aria-label="Agree" onCheckedChange={spy} {...s} />,
    read: () => aria(screen.getByRole("checkbox"), "aria-checked") === "true",
    act: (user) => user.click(screen.getByRole("checkbox")),
  },
  {
    name: "Switch",
    prop: "checked",
    defaultProp: "defaultChecked",
    from: false,
    to: true,
    element: (s, spy) => <Switch aria-label="Notify" onCheckedChange={spy} {...s} />,
    read: () => aria(screen.getByRole("switch"), "aria-checked") === "true",
    act: (user) => user.click(screen.getByRole("switch")),
  },
  {
    name: "RadioGroup",
    prop: "value",
    defaultProp: "defaultValue",
    from: "a",
    to: "b",
    element: (s, spy) => (
      <RadioGroup aria-label="Choice" onValueChange={spy} {...s}>
        <RadioGroupItem value="a" aria-label="A" />
        <RadioGroupItem value="b" aria-label="B" />
      </RadioGroup>
    ),
    read: () => screen.getByRole("radio", { checked: true }).getAttribute("value"),
    act: (user) => user.click(screen.getByRole("radio", { name: "B" })),
  },
  {
    name: "Tabs",
    prop: "value",
    defaultProp: "defaultValue",
    from: "a",
    to: "b",
    element: (s, spy) => (
      <Tabs onValueChange={spy} {...s}>
        <TabsList aria-label="Sections">
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
      </Tabs>
    ),
    read: () => screen.getByRole("tab", { selected: true }).textContent?.toLowerCase(),
    // keyboard: a click makes Radix activate on mouse down and again on focus (before React flushes, in jsdom)
    act: async (user) => {
      screen.getByRole("tab", { name: "A" }).focus();
      await user.keyboard("{ArrowRight}");
    },
  },
  {
    name: "Slider",
    prop: "value",
    defaultProp: "defaultValue",
    from: [20],
    to: [21],
    element: (s, spy) => <Slider aria-label="Volume" onValueChange={spy} {...s} />,
    read: () => [Number(aria(screen.getByRole("slider"), "aria-valuenow"))],
    act: async (user) => {
      screen.getByRole("slider").focus();
      await user.keyboard("{ArrowRight}");
    },
  },
  {
    name: "ToggleGroup (single)",
    prop: "value",
    defaultProp: "defaultValue",
    from: "a",
    to: "b",
    element: (s, spy) => (
      <ToggleGroup aria-label="View" onValueChange={spy as (v: string) => void} {...s}>
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>
    ),
    read: () => screen.getAllByRole("button").find((b) => aria(b, "aria-pressed") === "true")?.textContent?.toLowerCase(),
    act: (user) => user.click(screen.getByRole("button", { name: "B" })),
  },
  {
    name: "ToggleGroup (multiple)",
    prop: "value",
    defaultProp: "defaultValue",
    from: ["a"],
    to: ["a", "b"],
    element: (s, spy) => (
      <ToggleGroup type="multiple" aria-label="Filters" onValueChange={spy as (v: string[]) => void} {...s}>
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>
    ),
    read: () => screen.getAllByRole("button").filter((b) => aria(b, "aria-pressed") === "true").map((b) => b.textContent?.toLowerCase()),
    act: (user) => user.click(screen.getByRole("button", { name: "B" })),
  },
  {
    name: "SegmentedControl",
    prop: "value",
    defaultProp: "defaultValue",
    from: "a",
    to: "b",
    element: (s, spy) => (
      <SegmentedControl
        aria-label="Layout"
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ]}
        onValueChange={spy}
        {...s}
      />
    ),
    read: () => screen.getByRole("radio", { checked: true }).textContent?.toLowerCase(),
    act: (user) => user.click(screen.getByRole("radio", { name: "B" })),
  },
  {
    name: "Collapsible",
    prop: "open",
    defaultProp: "defaultOpen",
    from: false,
    to: true,
    element: (s, spy) => (
      <Collapsible onOpenChange={spy} {...s}>
        <CollapsibleTrigger>More</CollapsibleTrigger>
        <CollapsibleContent>Details</CollapsibleContent>
      </Collapsible>
    ),
    read: () => aria(screen.getByRole("button", { name: "More" }), "aria-expanded") === "true",
    act: (user) => user.click(screen.getByRole("button", { name: "More" })),
  },
  {
    name: "Accordion (single)",
    prop: "value",
    defaultProp: "defaultValue",
    from: "a",
    to: "b",
    element: (s, spy) => (
      <Accordion type="single" collapsible onValueChange={spy as (v: string) => void} {...s}>
        <AccordionItem value="a">
          <AccordionTrigger>First</AccordionTrigger>
          <AccordionContent>One</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Second</AccordionTrigger>
          <AccordionContent>Two</AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
    read: () => (aria(screen.getByRole("button", { name: "First" }), "aria-expanded") === "true" ? "a" : aria(screen.getByRole("button", { name: "Second" }), "aria-expanded") === "true" ? "b" : ""),
    act: (user) => user.click(screen.getByRole("button", { name: "Second" })),
  },
  {
    name: "SimpleSelect",
    prop: "value",
    defaultProp: "defaultValue",
    from: "a",
    to: "b",
    element: (s, spy) => (
      <SimpleSelect
        aria-label="Pick"
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ]}
        onValueChange={spy}
        {...s}
      />
    ),
    read: () => screen.getByRole("combobox").textContent?.toLowerCase(),
    act: async (user) => {
      await user.click(screen.getByRole("combobox"));
      await user.click(await screen.findByRole("option", { name: "B" }));
    },
  },
  {
    name: "NumberInput",
    prop: "value",
    defaultProp: "defaultValue",
    from: 5,
    to: 6,
    element: (s, spy) => <NumberInput aria-label="Quantity" onValueChange={spy} {...s} />,
    read: () => Number((screen.getByRole("spinbutton") as HTMLInputElement).value),
    act: async (user) => {
      screen.getByRole("spinbutton").focus();
      await user.keyboard("{ArrowUp}");
    },
  },
  {
    name: "TagInput",
    prop: "value",
    defaultProp: "defaultValue",
    from: ["a"],
    to: ["a", "b"],
    element: (s, spy) => <TagInput aria-label="Tags" onValueChange={spy} {...s} />,
    read: () => Array.from(document.querySelectorAll('[data-slot="tag-input-tag"]')).map((el) => el.textContent?.replace(/\s*(remove|×).*$/i, "").trim()),
    act: (user) => user.type(screen.getByRole("textbox"), "b{Enter}"),
  },
  {
    name: "Rating",
    prop: "value",
    defaultProp: "defaultValue",
    from: 2,
    to: 3,
    element: (s, spy) => <Rating aria-label="Score" onValueChange={spy} {...s} />,
    read: () => Number(screen.getByRole("radio", { checked: true }).getAttribute("aria-posinset") ?? screen.getAllByRole("radio").findIndex((r) => aria(r, "aria-checked") === "true") + 1),
    act: (user) => user.click(screen.getAllByRole("radio")[2]!),
  },
  {
    name: "Dialog",
    prop: "open",
    defaultProp: "defaultOpen",
    from: true,
    to: false,
    element: (s, spy) => (
      <Dialog onOpenChange={spy} {...s}>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Body</DialogDescription>
        </DialogContent>
      </Dialog>
    ),
    read: () => screen.queryByRole("dialog") !== null,
    act: (user) => user.keyboard("{Escape}"),
  },
];

let errors: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errors = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errors.mockRestore());

const warnings = () => errors.mock.calls.map((c) => String(c[0]));

describe.each(cases)("lifecycle contract: $name", (c) => {
  const state = (value: unknown) => ({ [c.prop]: value });
  const defaults = (value: unknown) => ({ [c.defaultProp]: value });

  /** A parent that applies every change it is told about (the usual way to control a component). */
  function Applying({ spy }: { spy: (value: unknown) => void }) {
    const [value, setValue] = React.useState<unknown>(c.from);
    return c.element(state(value), (next) => {
      spy(next);
      setValue(next);
    });
  }

  it("uncontrolled: starts at the default, follows the user and reports the change once", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(c.element(defaults(c.from), spy));
    expect(c.read()).toEqual(c.from);
    await c.act(user);
    expect(c.read()).toEqual(c.to);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toEqual(c.to);
  });

  it("controlled: a parent that applies the change sees it once and the component follows", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Applying spy={spy} />);
    expect(c.read()).toEqual(c.from);
    await c.act(user);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toEqual(c.to);
    expect(c.read()).toEqual(c.to);
  });

  it("controlled: follows the prop, not the user, when the parent refuses the change", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    const { rerender } = render(c.element(state(c.from), spy));
    expect(c.read()).toEqual(c.from);
    await c.act(user);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toEqual(c.to);
    expect(c.read()).toEqual(c.from);
    rerender(c.element(state(c.to), spy));
    expect(c.read()).toEqual(c.to);
    rerender(c.element(state(c.from), spy));
    expect(c.read()).toEqual(c.from);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("a controlled value that changes raises no React warning", () => {
    const spy = vi.fn();
    const { rerender } = render(c.element(state(c.from), spy));
    rerender(c.element(state(c.to), spy));
    expect(c.read()).toEqual(c.to);
    expect(warnings()).toEqual([]);
  });

  (c.warnsOnSwitch ? it.fails : it)("going from uncontrolled to controlled raises no controlled/uncontrolled warning, and the prop wins", () => {
    const spy = vi.fn();
    const { rerender } = render(c.element(defaults(c.from), spy));
    rerender(c.element(state(c.to), spy));
    expect(warnings().filter((w) => /controlled|uncontrolled/i.test(w))).toEqual([]);
    expect(c.read()).toEqual(c.to);
  });
});

it("the table covers the components the plan names", () => {
  expect(cases.map((c) => c.name)).toEqual(expect.arrayContaining(["Input", "Textarea", "Checkbox", "Switch", "Tabs", "Slider", "ToggleGroup (single)", "SimpleSelect", "Collapsible"]));
  void within;
});
