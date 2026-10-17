import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Badge,
  Chip,
  ChipGroup,
  Progress,
  ProgressCircle,
  ProgressSegments,
  Spinner,
  StatusBadge,
  StatusDot,
  StepIndicator,
  Steps,
} from "../src";
import { axeViolations } from "./a11y";

describe("Chip", () => {
  it("is a plain button (no aria-pressed) when not selectable", () => {
    render(<Chip>Static</Chip>);
    expect(screen.getByRole("button", { name: "Static" })).not.toHaveAttribute("aria-pressed");
  });

  it("toggles uncontrolled with defaultSelected and reports changes", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    render(
      <Chip defaultSelected={false} onSelectedChange={onSelectedChange}>
        Filter
      </Chip>
    );
    const chip = screen.getByRole("button", { name: "Filter" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(onSelectedChange).toHaveBeenLastCalledWith(true);
    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(onSelectedChange).toHaveBeenLastCalledWith(false);
  });

  it("controlled selected does not change without parent update", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    render(
      <Chip selected={false} onSelectedChange={onSelectedChange}>
        Ctl
      </Chip>
    );
    const chip = screen.getByRole("button", { name: "Ctl" });
    await user.click(chip);
    expect(onSelectedChange).toHaveBeenCalledWith(true);
    expect(chip).toHaveAttribute("aria-pressed", "false");
  });

  it("remove button and Backspace/Delete call onRemove", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const onClick = vi.fn();
    render(
      <Chip onRemove={onRemove} onClick={onClick} removeLabel="Remove React">
        React
      </Chip>
    );
    await user.click(screen.getByRole("button", { name: "Remove React" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
    screen.getByRole("button", { name: "React" }).focus();
    await user.keyboard("{Backspace}");
    await user.keyboard("{Delete}");
    expect(onRemove).toHaveBeenCalledTimes(3);
  });

  it("disabled chip does not toggle", async () => {
    const user = userEvent.setup();
    render(
      <Chip defaultSelected={false} disabled>
        Off
      </Chip>
    );
    const chip = screen.getByRole("button", { name: "Off" });
    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
  });
});

describe("ChipGroup", () => {
  it("single selection (default) selects one and allows deselect", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ChipGroup aria-label="Size" onValueChange={onValueChange}>
        <Chip value="s">Small</Chip>
        <Chip value="m">Medium</Chip>
      </ChipGroup>
    );
    const group = screen.getByRole("group", { name: "Size" });
    const small = within(group).getByRole("button", { name: "Small" });
    const medium = within(group).getByRole("button", { name: "Medium" });
    expect(small).toHaveAttribute("aria-pressed", "false");
    await user.click(small);
    expect(small).toHaveAttribute("aria-pressed", "true");
    expect(onValueChange).toHaveBeenLastCalledWith("s");
    await user.click(medium);
    expect(small).toHaveAttribute("aria-pressed", "false");
    expect(medium).toHaveAttribute("aria-pressed", "true");
    expect(onValueChange).toHaveBeenLastCalledWith("m");
    await user.click(medium);
    expect(medium).toHaveAttribute("aria-pressed", "false");
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it("allowDeselect=false keeps the current selection", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ChipGroup defaultValue="a" allowDeselect={false} onValueChange={onValueChange}>
        <Chip value="a">A</Chip>
        <Chip value="b">B</Chip>
      </ChipGroup>
    );
    const a = screen.getByRole("button", { name: "A" });
    await user.click(a);
    expect(a).toHaveAttribute("aria-pressed", "true");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("multiple selection toggles independently", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ChipGroup type="multiple" defaultValue={["x"]} onValueChange={onValueChange}>
        <Chip value="x">X</Chip>
        <Chip value="y">Y</Chip>
        <Chip value="z">Z</Chip>
      </ChipGroup>
    );
    const [x, y, z] = ["X", "Y", "Z"].map((n) => screen.getByRole("button", { name: n }));
    expect(x).toHaveAttribute("aria-pressed", "true");
    await user.click(y);
    expect(onValueChange).toHaveBeenLastCalledWith(["x", "y"]);
    await user.click(x);
    expect(onValueChange).toHaveBeenLastCalledWith(["y"]);
    expect(x).toHaveAttribute("aria-pressed", "false");
    expect(y).toHaveAttribute("aria-pressed", "true");
    expect(z).toHaveAttribute("aria-pressed", "false");
  });

  it("controlled value follows the parent", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = React.useState<string[]>([]);
      return (
        <>
          <ChipGroup type="multiple" value={value} onValueChange={setValue}>
            <Chip value="a">A</Chip>
            <Chip value="b">B</Chip>
          </ChipGroup>
          <output>{value.join(",")}</output>
        </>
      );
    }
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "A" }));
    await user.click(screen.getByRole("button", { name: "B" }));
    expect(screen.getByRole("status")).toHaveTextContent("a,b");
  });

  it("group disabled disables all chips", () => {
    render(
      <ChipGroup disabled>
        <Chip value="a">A</Chip>
        <Chip value="b">B</Chip>
      </ChipGroup>
    );
    screen.getAllByRole("button").forEach((b) => expect(b).toBeDisabled());
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <ChipGroup type="multiple" aria-label="Tags" defaultValue={["a"]}>
        <Chip value="a">A</Chip>
        <Chip value="b" onRemove={() => {}}>
          B
        </Chip>
      </ChipGroup>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("Badge / StatusBadge / StatusDot", () => {
  it("Badge renders text and optional remove button", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <Badge color="success" onRemove={onRemove} removeLabel="Remove tag">
        Paid
      </Badge>
    );
    expect(screen.getByText("Paid")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove tag" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("StatusBadge shows the default status label, a custom label, or children", () => {
    render(
      <div>
        <StatusBadge status="online" />
        <StatusBadge status="error" label="Failed" />
        <StatusBadge status="draft">Unpublished</StatusBadge>
      </div>
    );
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Unpublished")).toBeInTheDocument();
    // The inner dot is decorative inside a badge.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("StatusDot is labelled by status or hidden with an empty label", () => {
    render(
      <div>
        <StatusDot status="busy" />
        <StatusDot status="away" label="" />
      </div>
    );
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Busy" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <Badge>New</Badge>
        <Badge variant="dot" color="info">
          Info
        </Badge>
        <StatusBadge status="pending" pulse />
        <StatusDot status="online" />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("Progress", () => {
  it("exposes value/min/max and percentage text", () => {
    render(<Progress value={30} max={60} aria-label="Upload" showValue />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-valuenow", "30");
    expect(bar).toHaveAttribute("aria-valuemax", "60");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("clamps out-of-range values", () => {
    render(<Progress value={150} aria-label="Over" />);
    expect(screen.getByRole("progressbar", { name: "Over" })).toHaveAttribute("aria-valuenow", "100");
  });

  it("is indeterminate without a value", () => {
    render(<Progress aria-label="Loading" showValue />);
    const bar = screen.getByRole("progressbar", { name: "Loading" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).toHaveAttribute("data-state", "indeterminate");
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it("label names the bar and formatValue customizes the text", () => {
    render(<Progress value={3} max={10} label="Steps done" showValue formatValue={(v, m) => `${v} of ${m}`} />);
    expect(screen.getByRole("progressbar", { name: "Steps done" })).toHaveAttribute("aria-valuenow", "3");
    expect(screen.getByText("3 of 10")).toBeInTheDocument();
  });

  it("ProgressCircle exposes progressbar values and centered percentage", () => {
    render(<ProgressCircle value={25} max={50} label="Storage" />);
    const ring = screen.getByRole("progressbar", { name: "Storage" });
    expect(ring).toHaveAttribute("aria-valuenow", "25");
    expect(ring).toHaveAttribute("aria-valuemin", "0");
    expect(ring).toHaveAttribute("aria-valuemax", "50");
    expect(ring).toHaveTextContent("50%");
  });

  it("ProgressSegments fills the right number of segments", () => {
    render(<ProgressSegments value={2} segments={4} label="Strength" />);
    const bar = screen.getByRole("progressbar", { name: "Strength" });
    expect(bar).toHaveAttribute("aria-valuenow", "2");
    expect(bar).toHaveAttribute("aria-valuemax", "4");
    const segs = Array.from(bar.children);
    expect(segs).toHaveLength(4);
    expect(segs.filter((s) => s.classList.contains("bg-primary"))).toHaveLength(2);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <Progress value={40} label="Uploading" showValue />
        <Progress aria-label="Indeterminate" />
        <ProgressCircle value={70} label="Quota" />
        <ProgressSegments value={3} label="Password strength" />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("Spinner", () => {
  it("has role=status with default and custom labels for all variants", () => {
    render(
      <div>
        <Spinner />
        <Spinner variant="dots" label="Fetching" />
        <Spinner variant="bars" label="Bars" />
        <Spinner variant="pulse" label="Pulse" />
      </div>
    );
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Fetching" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Bars" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Pulse" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Spinner />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("Steps / StepIndicator", () => {
  it("announces completed steps to screen readers", () => {
    render(<Steps steps={[{ title: "Account" }, { title: "Profile" }, { title: "Done" }]} current={1} />);
    const items = within(screen.getByRole("list", { name: "Progress" })).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("(completed)");
    expect(items[1]).not.toHaveTextContent("(completed)");
  });

  const steps = [{ title: "Account" }, { title: "Profile" }, { title: "Review" }];

  it("marks complete, current and upcoming steps", () => {
    render(<Steps steps={steps} current={1} />);
    const list = screen.getByRole("list", { name: "Progress" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).not.toHaveAttribute("aria-current");
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[2]).not.toHaveAttribute("aria-current");
    // Complete step shows a check instead of its number; others show numbers.
    expect(items[0]).not.toHaveTextContent("1");
    expect(items[0]!.querySelector("svg")).not.toBeNull();
    expect(items[1]).toHaveTextContent("2");
    expect(items[2]).toHaveTextContent("3");
  });

  it("current = steps.length marks all complete", () => {
    render(<Steps steps={steps} current={3} />);
    const items = screen.getAllByRole("listitem");
    items.forEach((li) => expect(li).not.toHaveAttribute("aria-current"));
  });

  it("StepIndicator is an alias with a custom aria-label", () => {
    render(<StepIndicator steps={steps} current={0} aria-label="Checkout" variant="bars" />);
    const list = screen.getByRole("list", { name: "Checkout" });
    expect(within(list).getAllByRole("listitem")[0]).toHaveAttribute("aria-current", "step");
    expect(within(list).getByText("Step 1")).toBeInTheDocument();
  });

  it("onStepClick only allows completed/current steps by default", async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();
    render(<Steps steps={steps} current={1} onStepClick={onStepClick} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    await user.click(buttons[0]!);
    expect(onStepClick).toHaveBeenCalledWith(0);
    await user.click(screen.getByRole("button", { name: /Profile/ }));
    expect(onStepClick).toHaveBeenCalledWith(1);
  });

  it("restrictToCompleted=false makes every step clickable", async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();
    render(<Steps steps={steps} current={0} onStepClick={onStepClick} restrictToCompleted={false} orientation="vertical" />);
    expect(screen.getAllByRole("button")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: /Review/ }));
    expect(onStepClick).toHaveBeenCalledWith(2);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <Steps steps={steps} current={1} />
        <Steps steps={steps} current={1} variant="dots" orientation="vertical" aria-label="Vertical" />
        <Steps steps={steps} current={2} variant="bars" aria-label="Bars" onStepClick={() => {}} />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
