import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Button,
  ButtonGroup,
  ButtonGroupItem,
  ButtonGroupSeparator,
  CloseButton,
  TextLink,
  FloatingActionButton,
} from "../src";
import { axeViolations } from "./a11y";

describe("Button", () => {
  it("defaults to type=button and fires onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveAttribute("type", "button");
    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respects an explicit type", () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("type", "submit");
  });

  it("loading disables, sets aria-busy, shows a spinner and blocks onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick} leadingIcon={<svg data-testid="lead" />}>
        Save
      </Button>
    );
    const btn = screen.getByRole("button", { name: /Save/ });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    // Spinner replaces the leading icon.
    expect(screen.queryByTestId("lead")).not.toBeInTheDocument();
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not set aria-busy when not loading", () => {
    render(<Button>Idle</Button>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("disabled prevents clicks", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Nope
      </Button>
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("asChild renders the child element with button classes", () => {
    render(
      <Button asChild variant="secondary" className="extra">
        <a href="/docs">Docs</a>
      </Button>
    );
    const link = screen.getByRole("link", { name: "Docs" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/docs");
    expect(link).toHaveClass("inline-flex", "rounded-control", "extra");
    expect(link).not.toHaveAttribute("type");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders leading and trailing icons around the label in order", () => {
    render(
      <Button leadingIcon={<svg data-testid="lead" />} trailingIcon={<svg data-testid="trail" />}>
        Next
      </Button>
    );
    const btn = screen.getByRole("button", { name: "Next" });
    const lead = screen.getByTestId("lead");
    const trail = screen.getByTestId("trail");
    expect(btn).toContainElement(lead);
    expect(btn).toContainElement(trail);
    expect(btn.firstChild).toBe(lead);
    expect(btn.lastChild).toBe(trail);
  });

  it("forwards ref", () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("has no axe violations (default, loading, asChild)", async () => {
    const { container } = render(
      <div>
        <Button>Save</Button>
        <Button loading>Saving</Button>
        <Button asChild>
          <a href="/x">Link button</a>
        </Button>
        <Button size="icon" aria-label="Settings">
          <svg aria-hidden />
        </Button>
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ButtonGroup", () => {
  it("renders a group with items and a separator (plain mode)", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ButtonGroup aria-label="Actions">
        <ButtonGroupItem onClick={onClick}>Copy</ButtonGroupItem>
        <ButtonGroupSeparator />
        <ButtonGroupItem>Paste</ButtonGroupItem>
      </ButtonGroup>
    );
    const group = screen.getByRole("group", { name: "Actions" });
    expect(group).toHaveAttribute("data-orientation", "horizontal");
    expect(group).not.toHaveAttribute("aria-orientation");
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");
    const copy = screen.getByRole("button", { name: "Copy" });
    expect(copy).toHaveAttribute("type", "button");
    await user.click(copy);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("vertical orientation flips the separator orientation", () => {
    render(
      <ButtonGroup orientation="vertical" aria-label="V">
        <ButtonGroupItem>A</ButtonGroupItem>
        <ButtonGroupSeparator />
        <ButtonGroupItem>B</ButtonGroupItem>
      </ButtonGroup>
    );
    expect(screen.getByRole("group", { name: "V" })).toHaveAttribute("data-orientation", "vertical");
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "horizontal");
  });

  it("type=single toggles exactly one item", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ButtonGroup type="single" aria-label="Align" onValueChange={onValueChange}>
        <ButtonGroupItem value="left">Left</ButtonGroupItem>
        <ButtonGroupItem value="right">Right</ButtonGroupItem>
      </ButtonGroup>
    );
    const left = screen.getByRole("radio", { name: "Left" });
    const right = screen.getByRole("radio", { name: "Right" });
    await user.click(left);
    expect(left).toHaveAttribute("aria-checked", "true");
    expect(onValueChange).toHaveBeenLastCalledWith("left");
    await user.click(right);
    expect(left).toHaveAttribute("aria-checked", "false");
    expect(right).toHaveAttribute("aria-checked", "true");
    expect(onValueChange).toHaveBeenLastCalledWith("right");
  });

  it("type=multiple toggles items independently", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ButtonGroup type="multiple" aria-label="Format" onValueChange={onValueChange}>
        <ButtonGroupItem value="b">Bold</ButtonGroupItem>
        <ButtonGroupItem value="i">Italic</ButtonGroupItem>
      </ButtonGroup>
    );
    const bold = screen.getByRole("button", { name: "Bold" });
    const italic = screen.getByRole("button", { name: "Italic" });
    await user.click(bold);
    await user.click(italic);
    expect(bold).toHaveAttribute("aria-pressed", "true");
    expect(italic).toHaveAttribute("aria-pressed", "true");
    expect(onValueChange).toHaveBeenLastCalledWith(["b", "i"]);
    await user.click(bold);
    expect(bold).toHaveAttribute("aria-pressed", "false");
    expect(onValueChange).toHaveBeenLastCalledWith(["i"]);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <ButtonGroup aria-label="Plain">
          <ButtonGroupItem>One</ButtonGroupItem>
          <ButtonGroupItem>Two</ButtonGroupItem>
        </ButtonGroup>
        <ButtonGroup type="single" aria-label="Toggle" defaultValue="a">
          <ButtonGroupItem value="a">A</ButtonGroupItem>
          <ButtonGroupItem value="b">B</ButtonGroupItem>
        </ButtonGroup>
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("CloseButton", () => {
  it("has a default aria-label of Close", () => {
    render(<CloseButton />);
    const btn = screen.getByRole("button", { name: "Close" });
    expect(btn).toHaveAttribute("type", "button");
  });

  it("accepts a custom aria-label and fires onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<CloseButton aria-label="Dismiss dialog" onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: "Dismiss dialog" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations", async () => {
    const { container } = render(<CloseButton />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("TextLink", () => {
  it("renders a plain link without target/rel by default", () => {
    render(<TextLink href="/a">Home</TextLink>);
    const link = screen.getByRole("link", { name: "Home" });
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });

  it("external opens in a new tab with safe rel and an SR hint", () => {
    render(
      <TextLink href="https://example.com" external>
        Example
      </TextLink>
    );
    const link = screen.getByRole("link", { name: /Example/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveTextContent("(opens in a new tab)");
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden");
  });

  it("external keeps explicit target and rel", () => {
    render(
      <TextLink href="https://example.com" external target="_self" rel="nofollow">
        Example
      </TextLink>
    );
    const link = screen.getByRole("link", { name: /Example/ });
    expect(link).toHaveAttribute("target", "_self");
    expect(link).toHaveAttribute("rel", "nofollow");
  });

  it("asChild + external passes target/rel to the child", () => {
    render(
      <TextLink asChild external>
        <a href="https://example.com">Child</a>
      </TextLink>
    );
    const link = screen.getByRole("link", { name: /Child/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <p>
        Read <TextLink href="/docs">the docs</TextLink> or{" "}
        <TextLink href="https://example.com" external>
          the site
        </TextLink>
      </p>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("FloatingActionButton", () => {
  it("uses the label as accessible name when not extended", () => {
    render(<FloatingActionButton label="Compose" strategy="static" />);
    const btn = screen.getByRole("button", { name: "Compose" });
    expect(btn).not.toHaveAttribute("aria-haspopup");
    expect(btn).not.toHaveAttribute("aria-expanded");
  });

  it("shows the label as text when extended", () => {
    render(<FloatingActionButton label="Compose" extended strategy="static" />);
    const btn = screen.getByRole("button", { name: "Compose" });
    expect(btn).not.toHaveAttribute("aria-label");
    expect(btn).toHaveTextContent("Compose");
  });

  it("speed dial opens/closes, runs actions and closes on Escape", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <FloatingActionButton
        label="Create"
        strategy="static"
        onOpenChange={onOpenChange}
        actions={[
          { label: "Edit", icon: <svg />, onClick: onEdit },
          { label: "Share", icon: <svg /> },
        ]}
      />
    );
    const trigger = screen.getByRole("button", { name: "Create" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    const menu = screen.getByRole("menu", { hidden: true });
    expect(trigger).toHaveAttribute("aria-controls", menu.id);

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("closes on outside pointerdown", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Outside</button>
        <FloatingActionButton label="Create" strategy="static" defaultOpen actions={[{ label: "A", icon: <svg /> }]} />
      </div>
    );
    const trigger = screen.getByRole("button", { name: "Create" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("onClick preventDefault stops the dial from toggling", () => {
    render(
      <FloatingActionButton
        label="Create"
        strategy="static"
        onClick={(e) => e.preventDefault()}
        actions={[{ label: "A", icon: <svg /> }]}
      />
    );
    const trigger = screen.getByRole("button", { name: "Create" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("has no axe violations (open speed dial)", async () => {
    const { container } = render(
      <FloatingActionButton
        label="Create"
        strategy="static"
        defaultOpen
        actions={[
          { label: "Edit", icon: <svg /> },
          { label: "Docs", icon: <svg />, href: "/docs" },
        ]}
      />
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
