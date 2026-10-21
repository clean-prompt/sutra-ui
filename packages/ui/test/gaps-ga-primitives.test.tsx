import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../src/primitives/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../src/primitives/layout";
import { Collapse } from "../src/primitives/collapse";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../src/primitives/collapsible";
import { ToggleButton, ToggleGroup, ToggleGroupItem } from "../src/primitives/toggle-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../src/primitives/accordion";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "../src/primitives/dialog";
import { axeViolations } from "./helpers/a11y";

/** jsdom has no TransitionEvent, so build one that carries `propertyName`. */
function endTransition(el: Element, propertyName: string) {
  const event = new Event("transitionend", { bubbles: true });
  Object.assign(event, { propertyName });
  act(() => {
    el.dispatchEvent(event);
  });
}

describe("Card parts", () => {
  it("keeps the old Card contract (div, padded adds p-6, className wins)", () => {
    const { container } = render(<Card padded className="p-2" data-testid="c" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.tagName).toBe("DIV");
    expect(el.className).toContain("rounded-box");
    expect(el.className).not.toContain("p-(--card-pad)");
    expect(el.className).toContain("p-2");
    const plain = render(<Card padded />).container.firstElementChild as HTMLElement;
    expect(plain.className).toContain("p-(--card-pad)");
  });

  it("renders as the requested element and forwards the ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Card as="article" ref={ref} aria-label="Plan" />);
    expect(ref.current?.tagName).toBe("ARTICLE");
    expect(screen.getByRole("article", { name: "Plan" })).toBe(ref.current);
  });

  it("size sm sets the tighter padding variables; md the defaults", () => {
    const { container } = render(
      <>
        <Card size="sm" />
        <Card />
      </>
    );
    const [sm, md] = Array.from(container.children) as HTMLElement[];
    expect(sm!.dataset.size).toBe("sm");
    expect(sm!.className).toContain("[--card-pad:1rem]");
    expect(md!.dataset.size).toBeUndefined();
    expect(md!.className).toContain("[--card-pad:1.5rem]");
  });

  it("composes header, title level, description, action, content and footer variants", async () => {
    const { container } = render(
      <Card as="section" aria-label="Billing">
        <CardHeader>
          <CardTitle as="h3">Plan</CardTitle>
          <CardDescription>Billed yearly.</CardDescription>
          <CardAction>
            <Button size="sm">Edit</Button>
          </CardAction>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter variant="panel">Footer</CardFooter>
      </Card>
    );
    expect(screen.getByRole("heading", { level: 3, name: "Plan" })).toBeInTheDocument();
    expect(container.querySelector("[data-slot=card-header]")!.className).toContain("has-[[data-slot=card-action]]:grid-cols");
    expect(container.querySelector("[data-slot=card-action]")).toContainElement(screen.getByRole("button", { name: "Edit" }));
    const footer = container.querySelector("[data-slot=card-footer]") as HTMLElement;
    expect(footer.dataset.variant).toBe("panel");
    expect(footer.className).toContain("bg-subtle");
    expect(footer.className).toContain("border-t");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("CardTitle is a plain div unless `as` is a heading, and a plain footer has no band", () => {
    const { container } = render(
      <Card>
        <CardTitle>Just text</CardTitle>
        <CardFooter>Plain</CardFooter>
      </Card>
    );
    expect(screen.queryByRole("heading")).toBeNull();
    expect(container.querySelector("[data-slot=card-title]")!.tagName).toBe("DIV");
    expect(container.querySelector("[data-slot=card-footer]")!.className).not.toContain("bg-subtle");
  });
});

describe("Button spinnerProps", () => {
  it("passes options to the loading spinner and keeps the default otherwise", () => {
    const { rerender } = render(<Button loading>Save</Button>);
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
    expect(document.querySelector("[data-slot=spinner], .animate-spin, [role=status]")).toBeTruthy();
    rerender(
      <Button loading spinnerProps={{ variant: "dots", label: "Saving", className: "text-primary" }}>
        Save
      </Button>
    );
    const spinner = screen.getByRole("status", { name: "Saving" });
    expect(spinner.className).toContain("text-primary");
  });
});

describe("Collapse", () => {
  it("shows children open, hides closed ones from focus and the accessibility tree, keeps them mounted", async () => {
    const { container, rerender } = render(
      <Collapse open data-testid="c">
        <button>Inside</button>
      </Collapse>
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.state).toBe("open");
    expect(root.className).toContain("grid-rows-[1fr]");
    expect(screen.getByRole("button", { name: "Inside" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    rerender(
      <Collapse open={false}>
        <button>Inside</button>
      </Collapse>
    );
    expect(root.dataset.state).toBe("closed");
    expect(root.className).toContain("grid-rows-[0fr]");
    expect(root.className).toContain("opacity-0");
    expect(root.querySelector("[data-slot=collapse-content]")).toHaveAttribute("inert");
    expect(screen.getByText("Inside")).toBeInTheDocument();
  });

  it("starts closed without animating, then opens", () => {
    const { container, rerender } = render(<Collapse open={false}>Body</Collapse>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.state).toBe("closed");
    rerender(<Collapse open>Body</Collapse>);
    expect(root.dataset.state).toBe("open");
    expect(root.querySelector("[data-slot=collapse-content]")).not.toHaveAttribute("inert");
  });

  it("fade={false} skips the opacity change", () => {
    const { container } = render(<Collapse open={false} fade={false}>Body</Collapse>);
    expect((container.firstElementChild as HTMLElement).className).not.toContain("opacity-0");
  });

  it("unmountOnExit: not rendered while closed, mounted on open, removed after the transition ends", () => {
    const { container, rerender } = render(<Collapse open={false} unmountOnExit>Body</Collapse>);
    expect(screen.queryByText("Body")).toBeNull();
    rerender(<Collapse open unmountOnExit>Body</Collapse>);
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect((container.firstElementChild as HTMLElement).dataset.state).toBe("open");
    rerender(<Collapse open={false} unmountOnExit>Body</Collapse>);
    expect(screen.getByText("Body")).toBeInTheDocument();
    const root = container.firstElementChild as HTMLElement;
    // A bubbled transition from a child must not unmount it.
    endTransition(screen.getByText("Body"), "grid-template-rows");
    expect(screen.getByText("Body")).toBeInTheDocument();
    endTransition(root, "opacity");
    expect(screen.getByText("Body")).toBeInTheDocument();
    endTransition(root, "grid-template-rows");
    expect(screen.queryByText("Body")).toBeNull();
  });

  it("unmountOnExit falls back to a timer when no transitionend arrives, and re-opening cancels it", () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<Collapse open unmountOnExit>Body</Collapse>);
      rerender(<Collapse open={false} unmountOnExit>Body</Collapse>);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      rerender(<Collapse open unmountOnExit>Body</Collapse>);
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByText("Body")).toBeInTheDocument();
      rerender(<Collapse open={false} unmountOnExit>Body</Collapse>);
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.queryByText("Body")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("merges refs and className", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Collapse open ref={ref} className="mt-2" contentClassName="p-0">x</Collapse>);
    expect(ref.current!.className).toContain("mt-2");
    expect(ref.current!.querySelector("[data-slot=collapse-content]")!.className).toContain("p-0");
  });
});

describe("Collapsible", () => {
  function Basic(props: Partial<React.ComponentProps<typeof Collapsible>>) {
    return (
      <Collapsible {...props}>
        <CollapsibleTrigger>Details</CollapsibleTrigger>
        <CollapsibleContent>Hidden text</CollapsibleContent>
      </Collapsible>
    );
  }

  it("toggles with the mouse and keyboard and wires aria-expanded / aria-controls", async () => {
    const user = userEvent.setup();
    const { container } = render(<Basic />);
    const trigger = screen.getByRole("button", { name: "Details" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Hidden text")).toBeNull();
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Hidden text")).toBeInTheDocument();
    const controlled = container.querySelector(`#${CSS.escape(trigger.getAttribute("aria-controls")!)}`);
    expect(controlled).toContainElement(screen.getByText("Hidden text"));
    expect(await axeViolations(container)).toEqual([]);
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.keyboard(" ");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("supports defaultOpen, controlled open + onOpenChange, and disabled", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const first = render(<Basic defaultOpen />);
    expect(screen.getByText("Hidden text")).toBeInTheDocument();
    first.unmount();
    const { rerender } = render(<Basic open={false} onOpenChange={onOpenChange} />);
    expect(screen.queryByText("Hidden text")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    // Controlled: stays closed until the parent says so.
    expect(screen.getByRole("button", { name: "Details" })).toHaveAttribute("aria-expanded", "false");
    rerender(<Basic open onOpenChange={onOpenChange} />);
    expect(screen.getByText("Hidden text")).toBeInTheDocument();
    rerender(<Basic disabled />);
    expect(screen.getByRole("button", { name: "Details" })).toBeDisabled();
  });

  it("keepMounted keeps the closed content in the tree (inert), per root or per panel", () => {
    const { rerender } = render(<Basic keepMounted />);
    expect(screen.getByText("Hidden text")).toBeInTheDocument();
    expect(screen.getByText("Hidden text").closest("[data-slot=collapse-content]")).toHaveAttribute("inert");
    rerender(
      <Collapsible>
        <CollapsibleTrigger>Details</CollapsibleTrigger>
        <CollapsibleContent keepMounted>Kept</CollapsibleContent>
      </Collapsible>
    );
    expect(screen.getByText("Kept")).toBeInTheDocument();
  });

  it("asChild trigger keeps the child element and adds the wiring; variants add classes", async () => {
    const user = userEvent.setup();
    render(
      <Collapsible variant="surface">
        <CollapsibleTrigger asChild>
          <button data-testid="mine">Mine</button>
        </CollapsibleTrigger>
        <CollapsibleContent>Body</CollapsibleContent>
      </Collapsible>
    );
    const mine = screen.getByTestId("mine");
    expect(mine).toHaveAttribute("aria-expanded", "false");
    await user.click(mine);
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(document.querySelector("[data-slot=collapsible]")!.className).toContain("rounded-box");
  });

  it("trigger and content throw outside a Collapsible", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<CollapsibleTrigger>x</CollapsibleTrigger>)).toThrow(/inside <Collapsible>/);
    spy.mockRestore();
  });
});

describe("ToggleButton and ToggleGroup", () => {
  it("ToggleButton is a pressable button (controlled and uncontrolled)", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    const { rerender } = render(<ToggleButton aria-label="Bold" onPressedChange={onPressedChange}>B</ToggleButton>);
    const btn = screen.getByRole("button", { name: "Bold" });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(onPressedChange).toHaveBeenLastCalledWith(true);
    rerender(<ToggleButton aria-label="Bold" pressed={false}>B</ToggleButton>);
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("single: one pressed at a time, aria-pressed (not radio), group role, clearing gives an empty string", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(
      <ToggleGroup aria-label="Align" defaultValue="left" onValueChange={onValueChange}>
        <ToggleGroupItem value="left">Left</ToggleGroupItem>
        <ToggleGroupItem value="center">Center</ToggleGroupItem>
        <ToggleGroupItem value="right">Right</ToggleGroupItem>
      </ToggleGroup>
    );
    expect(screen.getByRole("group", { name: "Align" })).toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    const [l, c] = screen.getAllByRole("button");
    expect(l).toHaveAttribute("aria-pressed", "true");
    expect(c).toHaveAttribute("aria-pressed", "false");
    await user.click(c!);
    expect(onValueChange).toHaveBeenLastCalledWith("center");
    expect(l).toHaveAttribute("aria-pressed", "false");
    expect(c).toHaveAttribute("aria-pressed", "true");
    await user.click(c!);
    expect(onValueChange).toHaveBeenLastCalledWith("");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("multiple: any number pressed; array values", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ToggleGroup type="multiple" aria-label="Format" defaultValue={["bold"]} onValueChange={onValueChange}>
        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
        <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
      </ToggleGroup>
    );
    await user.click(screen.getByRole("button", { name: "Italic" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["bold", "italic"]);
    await user.click(screen.getByRole("button", { name: "Bold" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["italic"]);
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "false");
  });

  it("controlled value follows the parent", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(
      <ToggleGroup aria-label="Size" value="a" onValueChange={onValueChange}>
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>
    );
    await user.click(screen.getByRole("button", { name: "B" }));
    expect(onValueChange).toHaveBeenCalledWith("b");
    expect(screen.getByRole("button", { name: "A" })).toHaveAttribute("aria-pressed", "true");
    rerender(
      <ToggleGroup aria-label="Size" value="b" onValueChange={onValueChange}>
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>
    );
    expect(screen.getByRole("button", { name: "B" })).toHaveAttribute("aria-pressed", "true");
  });

  it("roving focus: one tab stop, arrows move, Home/End jump, disabled items are skipped, loop can be turned off", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>before</button>
        <ToggleGroup aria-label="Pick" defaultValue="b">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
          <ToggleGroupItem value="c" disabled>
            C
          </ToggleGroupItem>
          <ToggleGroupItem value="d">D</ToggleGroupItem>
        </ToggleGroup>
        <button>after</button>
      </>
    );
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "B" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "D" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "A" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("button", { name: "D" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("button", { name: "A" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
    await user.keyboard(" ");
  });

  it("loop={false} stops at the ends; vertical orientation uses up and down", async () => {
    const user = userEvent.setup();
    render(
      <ToggleGroup aria-label="V" orientation="vertical" loop={false}>
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "A" })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("button", { name: "A" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "B" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "B" })).toHaveAttribute("aria-pressed", "true");
  });

  it("variant and size flow from the group to the items, and an item can override", () => {
    render(
      <ToggleGroup aria-label="Look" variant="soft" size="lg">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b" variant="outline" size="sm">
          B
        </ToggleGroupItem>
      </ToggleGroup>
    );
    expect(screen.getByRole("button", { name: "A" }).className).toContain("data-[state=on]:bg-primary-soft");
    expect(screen.getByRole("button", { name: "A" }).className).toContain("h-10");
    expect(screen.getByRole("button", { name: "B" }).className).toContain("border-input");
    expect(screen.getByRole("button", { name: "B" }).className).toContain("h-8");
  });
});

describe("Accordion variants and keepMounted", () => {
  function Demo(props: Partial<React.ComponentProps<typeof Accordion>> & { itemKeep?: boolean }) {
    const { itemKeep, ...rest } = props;
    return (
      <Accordion type="single" collapsible {...(rest as object)}>
        <AccordionItem value="a">
          <AccordionTrigger>First</AccordionTrigger>
          <AccordionContent keepMounted={itemKeep}>
            <input aria-label="inside" />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Second</AccordionTrigger>
          <AccordionContent>Second body</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  it("surface and separated variants render and are axe-clean", async () => {
    for (const variant of ["surface", "separated"] as const) {
      const { container, unmount } = render(<Demo variant={variant} defaultValue="a" />);
      expect(container.firstElementChild!.className).toContain(variant === "surface" ? "overflow-hidden" : "gap-2");
      expect(container.querySelector("[data-slot], [data-state=open]")).toBeTruthy();
      expect(await axeViolations(container)).toEqual([]);
      unmount();
    }
    const { container } = render(<Demo variant="separated" />);
    expect(container.querySelector("[data-state]")!.className).toContain("bg-subtle");
  });

  it("existing variants keep their classes", () => {
    const { container } = render(<Demo variant="bordered" />);
    expect(container.firstElementChild!.className).toContain("gap-3");
    expect(container.querySelector("[data-state]")!.className).toContain("rounded-box");
  });

  it("closed panels are unmounted by default and kept (hidden) with keepMounted, which also keeps input state", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Demo />);
    expect(screen.queryByLabelText("inside")).toBeNull();
    rerender(<Demo keepMounted />);
    expect(document.querySelector('input[aria-label="inside"]')).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "First" }));
    const input = screen.getByLabelText("inside");
    await user.type(input, "draft");
    await user.click(screen.getByRole("button", { name: "Second" }));
    // Closed but mounted: Radix only marks it data-state=closed, the class hides it (jsdom has no stylesheet).
    const panel = screen.getByLabelText("inside").closest("[data-state]") as HTMLElement;
    expect(panel.dataset.state).toBe("closed");
    expect(panel.className).toContain("data-[state=closed]:hidden");
    await user.click(screen.getByRole("button", { name: "First" }));
    expect(screen.getByLabelText("inside")).toHaveValue("draft");
  });

  it("a panel can opt in on its own", () => {
    render(<Demo itemKeep />);
    expect(document.querySelector('input[aria-label="inside"]')).toBeTruthy();
  });
});

describe("Sheet options", () => {
  function Harness(props: Partial<React.ComponentProps<typeof SheetContent>> & { nested?: boolean }) {
    const { nested, ...rest } = props;
    const [open, setOpen] = React.useState(false);
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button>Open</button>
        </SheetTrigger>
        <SheetContent data-testid="panel" {...rest}>
          <SheetTitle>Panel</SheetTitle>
          <SheetDescription>Body</SheetDescription>
          {nested ? (
            <Sheet>
              <SheetTrigger asChild>
                <button>Open inner</button>
              </SheetTrigger>
              <SheetContent data-testid="inner" side="right" size="sm">
                <SheetTitle>Inner</SheetTitle>
                <SheetDescription>Inner body</SheetDescription>
              </SheetContent>
            </Sheet>
          ) : null}
        </SheetContent>
      </Sheet>
    );
  }

  it("keeps the default side right with its width and the close button", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const panel = screen.getByTestId("panel");
    expect(panel.dataset.side).toBe("right");
    expect(panel.className).toContain("w-[85vw]");
    expect(panel.className).toContain("slide-in-from-right");
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("logical sides: start and end map to physical logical classes with RTL flips", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness side="start" />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    let cls = screen.getByTestId("panel").className;
    expect(cls).toContain("start-0");
    expect(cls).toContain("border-e");
    expect(cls).toContain("slide-in-from-left");
    expect(cls).toContain("rtl:data-[state=open]:slide-in-from-right");
    unmount();
    render(<Harness side="end" />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    cls = screen.getByTestId("panel").className;
    expect(cls).toContain("end-0");
    expect(cls).toContain("slide-in-from-right");
  });

  it("size changes width for side sheets and height for top and bottom sheets; className still wins", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness size="lg" />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByTestId("panel").className).toContain("max-w-2xl");
    expect(screen.getByTestId("panel").className).not.toContain("max-w-sm");
    unmount();
    const second = render(<Harness side="bottom" size="half" />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByTestId("panel").className).toContain("h-[50dvh]");
    second.unmount();
    render(<Harness size="full" className="max-w-xs" />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByTestId("panel").className).toContain("max-w-xs");
    expect(screen.getByTestId("panel").className).toContain("w-screen");
  });

  it("detached floats off the edges with rounded corners; blur makes the panel translucent", async () => {
    const user = userEvent.setup();
    render(<Harness detached blur side="left" />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const panel = screen.getByTestId("panel");
    expect(panel).toHaveAttribute("data-detached");
    expect(panel.className).toContain("rounded-2xl");
    expect(panel.className).toContain("left-2");
    expect(panel.className).not.toContain("border-r");
    expect(panel.className).toContain("backdrop-blur-xl");
    expect(panel.className).toContain("bg-dialog/75");
    expect(panel.className).not.toMatch(/(^| )bg-dialog( |$)/);
  });

  it("dismissible={false} ignores Escape and outside clicks and hides the close button; a footer action can still close", async () => {
    const user = userEvent.setup();
    function Locked() {
      const [open, setOpen] = React.useState(true);
      return (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent dismissible={false}>
            <SheetTitle>Locked</SheetTitle>
            <SheetDescription>Body</SheetDescription>
            <button onClick={() => setOpen(false)}>Done</button>
          </SheetContent>
        </Sheet>
      );
    }
    render(<Locked />);
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    fireEvent.click(document.body);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("dismissible={false} + explicit showClose shows the button; a caller's own handlers still run", async () => {
    const user = userEvent.setup();
    const onEscapeKeyDown = vi.fn();
    render(
      <Sheet defaultOpen>
        <SheetContent dismissible={false} showClose onEscapeKeyDown={onEscapeKeyDown}>
          <SheetTitle>Locked</SheetTitle>
          <SheetDescription>Body</SheetDescription>
        </SheetContent>
      </Sheet>
    );
    await user.keyboard("{Escape}");
    expect(onEscapeKeyDown).toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("a dismissible sheet still closes on Escape and returns focus to the opener", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open" });
    await user.click(opener);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });

  it("stacking: a nested sheet marks the sheet underneath as nested until it closes", async () => {
    const user = userEvent.setup();
    render(<Harness nested />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const outer = screen.getByTestId("panel");
    expect(outer).not.toHaveAttribute("data-nested");
    await user.click(screen.getByRole("button", { name: "Open inner" }));
    expect(screen.getByTestId("inner")).toBeInTheDocument();
    expect(outer).toHaveAttribute("data-nested");
    expect(outer.className).toContain("data-[nested]:scale-[0.96]");
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("inner")).toBeNull();
    expect(outer).not.toHaveAttribute("data-nested");
    expect(screen.getByTestId("panel")).toBeInTheDocument();
  });
});
