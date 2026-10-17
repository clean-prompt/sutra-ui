import { render, screen } from "@testing-library/react";
import { Button } from "../src";
import { axeViolations } from "./a11y";

describe("test harness", () => {
  it("renders and runs axe", async () => {
    const { container } = render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});
