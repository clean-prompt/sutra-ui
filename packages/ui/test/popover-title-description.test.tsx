import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axeViolations } from "./helpers/a11y";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "../src/primitives/popover";

afterEach(cleanup);

describe("Popover title and description wiring", () => {
  it("names and describes the dialog from PopoverTitle / PopoverDescription", async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent padded={false}>
          <PopoverHeader>
            <PopoverTitle>Invite a teammate</PopoverTitle>
            <PopoverDescription>They get an email.</PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
    );
    const dialog = await screen.findByRole("dialog", { name: "Invite a teammate" });
    expect(dialog).toHaveAccessibleDescription("They get an email.");
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("keeps an explicit aria-label / aria-labelledby / aria-describedby from the caller", async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent aria-label="Own label" aria-describedby="own-desc">
          <PopoverTitle>Heading</PopoverTitle>
          <PopoverDescription>Muted</PopoverDescription>
          <span id="own-desc">Custom description</span>
        </PopoverContent>
      </Popover>
    );
    const dialog = await screen.findByRole("dialog", { name: "Own label" });
    expect(dialog).not.toHaveAttribute("aria-labelledby");
    expect(dialog).toHaveAccessibleDescription("Custom description");
  });

  it("uses a caller-supplied id on the title and leaves a title-less popover unlabelled", async () => {
    const { rerender } = render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <PopoverTitle id="my-title">Mine</PopoverTitle>
        </PopoverContent>
      </Popover>
    );
    const dialog = await screen.findByRole("dialog", { name: "Mine" });
    expect(dialog).toHaveAttribute("aria-labelledby", "my-title");
    rerender(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Plain body</PopoverContent>
      </Popover>
    );
    expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-labelledby");
    expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-describedby");
  });

  it("still renders a plain h3 / p outside a PopoverContent", () => {
    render(
      <div>
        <PopoverTitle>Loose</PopoverTitle>
        <PopoverDescription>Loose text</PopoverDescription>
      </div>
    );
    expect(screen.getByRole("heading", { name: "Loose" })).not.toHaveAttribute("id");
  });
});
