import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axeViolations } from "./helpers/a11y";
import { Avatar, AvatarLabelGroup } from "../src/primitives/avatar";

afterEach(cleanup);

describe("Avatar naming", () => {
  it("AvatarLabelGroup exposes the name once and keeps the status dot", async () => {
    const { container } = render(<AvatarLabelGroup name="Ada Lovelace" supportingText="ada@x.dev" status="online" />);
    expect(screen.getAllByText("Ada Lovelace")).toHaveLength(1);
    expect(screen.queryByRole("img", { name: "Ada Lovelace" })).toBeNull();
    expect(screen.getByRole("img", { name: "online" })).toBeInTheDocument();
    expect(container.textContent).toContain("AL");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("a plain Avatar is still labelled by name or alt, and alt=\"\" makes it decorative", () => {
    const { rerender } = render(<Avatar name="Grace Hopper" />);
    expect(screen.getByRole("img", { name: "Grace Hopper" })).toBeInTheDocument();
    rerender(<Avatar name="Grace Hopper" alt="Admiral" />);
    expect(screen.getByRole("img", { name: "Admiral" })).toBeInTheDocument();
    rerender(<Avatar name="Grace Hopper" alt="" />);
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("avatarProps can still name the generated avatar", () => {
    render(<AvatarLabelGroup name="Ada" avatarProps={{ alt: "Profile photo" }} />);
    expect(screen.getByRole("img", { name: "Profile photo" })).toBeInTheDocument();
  });
});
