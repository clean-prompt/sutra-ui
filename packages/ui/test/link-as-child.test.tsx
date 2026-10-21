import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axeViolations } from "./helpers/a11y";
import { SocialButton } from "../src/primitives/social-button";
import { TextLink } from "../src/primitives/text-link";

afterEach(cleanup);

describe("SocialButton asChild inert states", () => {
  it("disabled makes the child aria-disabled, unfocusable and click-proof", async () => {
    const onClick = vi.fn();
    const { container } = render(
      <SocialButton provider="google" asChild disabled>
        <a href="/auth/google" onClick={onClick}>
          Continue with Google
        </a>
      </SocialButton>
    );
    const link = screen.getByRole("link", { name: "Continue with Google" });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("tabindex", "-1");
    fireEvent.click(link);
    expect(onClick).not.toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("loading is inert and aria-busy; enabled stays untouched", () => {
    const onClick = vi.fn((e: React.MouseEvent) => e.preventDefault());
    const { rerender } = render(
      <SocialButton provider="github" asChild loading>
        <a href="/x" onClick={onClick}>
          Go
        </a>
      </SocialButton>
    );
    const link = screen.getByRole("link", { name: /Go/ });
    expect(link).toHaveAttribute("aria-busy", "true");
    expect(link).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(link);
    expect(onClick).not.toHaveBeenCalled();
    rerender(
      <SocialButton provider="github" asChild>
        <a href="/x" onClick={onClick}>
          Go
        </a>
      </SocialButton>
    );
    const live = screen.getByRole("link", { name: "Go" });
    expect(live).not.toHaveAttribute("aria-disabled");
    expect(live).not.toHaveAttribute("tabindex");
    fireEvent.click(live);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("TextLink asChild external", () => {
  it("adds the hidden new-tab text, like the plain link", () => {
    const { rerender } = render(
      <TextLink asChild external>
        <a href="https://example.com">Docs</a>
      </TextLink>
    );
    expect(screen.getByRole("link", { name: "Docs (opens in a new tab)" })).toHaveAttribute("target", "_blank");
    rerender(<TextLink external href="https://example.com">Docs</TextLink>);
    expect(screen.getByRole("link", { name: "Docs (opens in a new tab)" })).toBeInTheDocument();
    rerender(
      <TextLink asChild>
        <a href="/local">Docs</a>
      </TextLink>
    );
    expect(screen.getByRole("link", { name: "Docs" })).toBeInTheDocument();
  });
});
