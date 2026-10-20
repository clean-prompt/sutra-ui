import { render, screen } from "@testing-library/react";
import { ApprovalStack } from "../src/kits/ai/approval-stack";
import { DirectionProvider } from "../src/primitives/direction-provider";
import { FlowArrow } from "../src/primitives/flow-arrow-internal";

describe("text arrows in right-to-left", () => {
  it("FlowArrow is decorative and carries the rtl mirror class", () => {
    const { container } = render(<p>a <FlowArrow /> b</p>);
    const arrow = container.querySelector("span[aria-hidden='true']")!;
    expect(arrow).toHaveTextContent("→");
    expect(arrow).toHaveClass("rtl:-scale-x-100", "inline-block");
  });

  it("ApprovalStack names its keys by reading order: previous is ← in LTR and → in RTL", () => {
    const items = [{ id: "a" }, { id: "b" }];
    const ui = (dir: "ltr" | "rtl") => (
      <DirectionProvider dir={dir}>
        <ApprovalStack items={items} defaultIndex={1} renderItem={(item: { id: string }) => <span>{item.id}</span>} />
      </DirectionProvider>
    );
    const { unmount } = render(ui("ltr"));
    expect(screen.getByRole("button", { name: "Previous approval" })).toHaveAttribute("title", "Previous (←)");
    unmount();
    render(ui("rtl"));
    expect(screen.getByRole("button", { name: "Previous approval" })).toHaveAttribute("title", "Previous (→)");
    expect(screen.getByRole("button", { name: "Next approval" })).toHaveAttribute("title", "Next (←)");
  });
});
