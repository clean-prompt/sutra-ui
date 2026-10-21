import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatementHero } from "../src/patterns/statement-hero";
import { Button } from "../src/primitives/button";
import { Dropzone } from "../src/primitives/dropzone";
import { SutraMark } from "../src/assets/brand";
import { axeViolations } from "./helpers/a11y";

const base = {
  title: "Your files, handled quietly",
  description: "Drop in what you have and get back what you need.",
  action: <Button>Choose a file</Button>,
  hint: "Files stay on your device.",
};

describe("StatementHero", () => {
  it("is one region named by its title, with an h1 by default", () => {
    render(<StatementHero {...base} />);
    const region = screen.getByRole("region", { name: "Your files, handled quietly" });
    expect(region.tagName).toBe("SECTION");
    const heading = within(region).getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Your files, handled quietly");
    expect(region).toHaveAttribute("aria-labelledby", heading.id);
    expect(screen.getAllByRole("region")).toHaveLength(1);
  });

  it("sets the heading level with `as`", () => {
    render(<StatementHero {...base} as="h2" />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("keeps ids unique across several heroes", () => {
    render(
      <div>
        <StatementHero title="One" as="h2" />
        <StatementHero title="Two" as="h2" />
      </div>
    );
    expect(screen.getByRole("region", { name: "One" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Two" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "One" }).id).not.toBe(screen.getByRole("heading", { name: "Two" }).id);
  });

  it("renders the title in the display-3xl size with balanced wrapping, and steps down for md", () => {
    const { rerender } = render(<StatementHero {...base} />);
    const heading = screen.getByRole("heading");
    expect(heading.className).toContain("lg:text-display-3xl");
    expect(heading.className).toContain("text-balance");
    expect(heading.className).toContain("sm:text-display-xl");
    rerender(<StatementHero {...base} size="md" />);
    expect(screen.getByRole("heading").className).not.toContain("text-display-3xl");
    expect(screen.getByRole("region")).toHaveAttribute("data-size", "md");
  });

  it("describes the subtitle as muted and balanced, and the hint as small and muted", () => {
    render(<StatementHero {...base} />);
    const description = screen.getByText(base.description);
    expect(description.className).toContain("text-muted-foreground");
    expect(description.className).toContain("text-balance");
    expect(screen.getByText(base.hint).className).toContain("text-sm");
    expect(screen.getByText(base.hint).className).toContain("text-muted-foreground");
  });

  it("centres by default and aligns to the start on request", () => {
    const { rerender } = render(<StatementHero {...base} />);
    const region = () => screen.getByRole("region");
    expect(region().className).toContain("items-center");
    expect(region().className).toContain("text-center");
    expect(region()).toHaveAttribute("data-align", "center");
    rerender(<StatementHero {...base} align="start" />);
    expect(region().className).toContain("items-start");
    expect(region().className).not.toContain("items-center");
    expect(region().className).not.toContain("text-center");
    expect(region()).toHaveAttribute("data-align", "start");
  });

  it("floats the media only when asked", () => {
    const { container, rerender } = render(<StatementHero {...base} media={<SutraMark title="Mark" />} />);
    expect(container.querySelector(".animate-bob")).toBeNull();
    rerender(<StatementHero {...base} media={<SutraMark title="Mark" />} float />);
    const bob = container.querySelector(".animate-bob")!;
    expect(bob).not.toBeNull();
    expect(bob).toContainElement(screen.getByRole("img", { name: "Mark" }));
    // The idle motion sits inside the entrance wrapper, so the two transforms never fight.
    expect(bob.parentElement!.className).toContain("animate-fade-up");
    expect(bob.className).not.toContain("animate-fade-up");
  });

  it("staggers the parts that exist, in order", () => {
    const { container } = render(<StatementHero {...base} media={<SutraMark />} />);
    const parts = Array.from(container.querySelectorAll<HTMLElement>(".animate-fade-up"));
    expect(parts).toHaveLength(5);
    const delays = parts.map((el) => parseInt(el.style.animationDelay, 10));
    expect(delays[0]).toBe(0);
    expect([...delays].sort((a, b) => a - b)).toEqual(delays);
    expect(new Set(delays).size).toBe(5);
    // Order in the DOM: media, title, description, action, hint.
    expect(parts[1]).toBe(screen.getByRole("heading"));
    expect(parts[4]).toHaveTextContent(base.hint);
  });

  it("leaves no gaps in the stagger or empty wrappers when slots are empty", () => {
    const { container } = render(<StatementHero title="Just a title" />);
    const parts = Array.from(container.querySelectorAll<HTMLElement>(".animate-fade-up"));
    expect(parts).toHaveLength(1);
    expect(parts[0]!.style.animationDelay).toBe("0ms");
    expect(screen.getByRole("region").children).toHaveLength(1);
  });

  it("does not animate with animated={false}", () => {
    const { container } = render(<StatementHero {...base} media={<SutraMark />} float animated={false} />);
    expect(container.querySelector(".animate-fade-up")).toBeNull();
    expect(container.querySelector<HTMLElement>("[style*='animation-delay']")).toBeNull();
    // Idle float is a separate switch.
    expect(container.querySelector(".animate-bob")).not.toBeNull();
  });

  it("merges className, forwards the ref and spreads props onto the section", () => {
    const ref = React.createRef<HTMLElement>();
    render(<StatementHero {...base} ref={ref} className="bg-subtle" data-testid="hero" id="top" />);
    expect(ref.current).toBe(screen.getByTestId("hero"));
    expect(ref.current!.className).toContain("bg-subtle");
    expect(ref.current).toHaveAttribute("id", "top");
  });

  it("renders the action and keeps it keyboard reachable", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<StatementHero {...base} action={<Button onClick={onClick}>Choose a file</Button>} />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Choose a file" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("takes a Dropzone as the action", () => {
    render(<StatementHero {...base} action={<Dropzone />} />);
    expect(screen.getByRole("button", { name: /upload|drop/i })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <main>
        <StatementHero {...base} media={<SutraMark variant="badge" title="Sutra" />} float />
        <StatementHero {...base} title="Drop it here" as="h2" size="md" align="start" animated={false} action={<Dropzone />} />
      </main>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
