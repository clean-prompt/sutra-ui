import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { ChatInlineCitation, CitationHoverCard, safeSourceHref } from "../src/patterns/inline-citation";
import { axeViolations } from "./helpers/a11y";

describe("safeSourceHref", () => {
  it("keeps web links and drops script and data URLs", () => {
    expect(safeSourceHref("https://example.com/a")).toBe("https://example.com/a");
    expect(safeSourceHref("javascript:alert(1)")).toBeUndefined();
    expect(safeSourceHref("data:text/html,<b>x</b>")).toBeUndefined();
  });
});

describe("ChatInlineCitation", () => {
  it("is a plain superscript number without a source", () => {
    render(<ChatInlineCitation index={2} data-testid="c" />);
    const c = screen.getByTestId("c");
    expect(c.tagName).toBe("SUP");
    expect(c).toHaveTextContent("2");
  });

  it("links the source in a new tab with a name that carries the number and the title", () => {
    render(<ChatInlineCitation index={1} href="https://example.com/a" title="Example article" />);
    const link = screen.getByRole("link", { name: "Source 1: Example article" });
    expect(link).toHaveAttribute("href", "https://example.com/a");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("names the link by its number alone without a title", () => {
    render(<ChatInlineCitation index={3} href="https://example.com" />);
    expect(screen.getByRole("link", { name: "Source 3" })).toBeInTheDocument();
  });

  it("does not link an unsafe URL", () => {
    render(<ChatInlineCitation index={1} href="javascript:alert(1)" title="Bad" />);
    expect(screen.getByLabelText("Source 1: Bad")).not.toHaveAttribute("href"); // no href, so no link role either
  });

  it("forwards the ref, className and extra props to the element", () => {
    const ref = React.createRef<HTMLElement>();
    render(<ChatInlineCitation ref={ref} index={4} className="mine" data-extra="1" href="https://example.com" />);
    expect(ref.current).toBe(screen.getByRole("link"));
    expect(ref.current).toHaveClass("mine");
    expect(ref.current).toHaveAttribute("data-extra", "1");
  });

  it("previews the source (domain, title, snippet) when the pill is focused", async () => {
    const user = userEvent.setup();
    render(<ChatInlineCitation index={1} href="https://example.com/post" title="A post" snippet="The first lines." />);
    await user.tab();
    expect(await screen.findByText("The first lines.", {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <p>
        Claim <ChatInlineCitation index={1} href="https://example.com" title="Source" /> and <ChatInlineCitation index={2} />.
      </p>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("CitationHoverCard", () => {
  it("renders the child alone when disabled", () => {
    render(
      <CitationHoverCard disabled source={{ href: "https://example.com" }}>
        <button>Trigger</button>
      </CitationHoverCard>
    );
    expect(screen.getByRole("button", { name: "Trigger" })).toBeInTheDocument();
  });
});
