import { render, screen, within } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { AuthCenteredPage, AuthImagePage, AuthMinimalPage, AuthSplitPage } from "../src/blocks/auth-pages";

const form = <form aria-label="Custom form">fields</form>;

describe("auth pages", () => {
  const pages = [
    ["AuthSplitPage", AuthSplitPage],
    ["AuthCenteredPage", AuthCenteredPage],
    ["AuthImagePage", AuthImagePage],
    ["AuthMinimalPage", AuthMinimalPage],
  ] as const;

  it.each(pages)("%s renders the given form in its main landmark, with the legal footer", (_name, Page) => {
    render(<Page>{form}</Page>);
    expect(within(screen.getByRole("main")).getByRole("form", { name: "Custom form" })).toBeInTheDocument();
    const legal = screen.getByRole("navigation", { name: "Legal" });
    expect(within(legal).getAllByRole("link").map((a) => a.textContent)).toEqual(["Terms", "Privacy", "Help"]);
    expect(screen.getByText(/© 2026/)).toBeInTheDocument();
  });

  it.each(pages)("%s falls back to a sign-in card when there are no children", (_name, Page) => {
    render(<Page />);
    expect(within(screen.getByRole("main")).getAllByRole("button", { name: /sign in|continue/i }).length).toBeGreaterThan(0);
  });

  it.each(pages)("%s links the logo home and lets the app render the links (router)", (_name, Page) => {
    const rendered: string[] = [];
    render(
      <Page
        homeHref="/start"
        renderLink={({ href, className, children }) => {
          rendered.push(href);
          return (
            <a href={href} className={className} data-router>
              {children}
            </a>
          );
        }}
      >
        {form}
      </Page>
    );
    expect([...new Set(rendered)].sort()).toEqual(["#help", "#privacy", "#terms", "/start"]); // StrictMode renders twice
    expect(document.querySelectorAll("a[data-router]")).toHaveLength(4);
  });

  it.each(pages)("%s takes custom footer links, a copyright line, a className and ref", (_name, Page) => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(
      <Page ref={ref} className="custom-root" copyright="© Acme" footerLinks={[{ label: "Status", href: "/status" }]} data-testid="root">
        {form}
      </Page>
    );
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current).toHaveClass("custom-root");
    expect(screen.getByText("© Acme")).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Legal" })).getAllByRole("link")).toHaveLength(1);
  });

  it("hides the legal navigation when there are no footer links", () => {
    render(<AuthMinimalPage footerLinks={[]}>{form}</AuthMinimalPage>);
    expect(screen.queryByRole("navigation", { name: "Legal" })).toBeNull();
  });
});

describe("AuthSplitPage panel", () => {
  it("shows the testimonial, and `panel` replaces the whole panel", () => {
    const { rerender } = render(<AuthSplitPage testimonial={{ quote: "It just works.", name: "Ada Lovelace", role: "Analyst" }}>{form}</AuthSplitPage>);
    expect(screen.getByText("It just works.")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "5 out of 5 stars" })).toBeInTheDocument();
    rerender(<AuthSplitPage panel={<p>Own panel</p>}>{form}</AuthSplitPage>);
    expect(screen.getByText("Own panel")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "5 out of 5 stars" })).toBeNull();
  });

  it("puts the brand panel first with `reverse`", () => {
    const { container, rerender } = render(<AuthSplitPage>{form}</AuthSplitPage>);
    const column = () => container.firstElementChild!.firstElementChild!;
    expect(column()).not.toHaveClass("lg:order-last");
    rerender(<AuthSplitPage reverse>{form}</AuthSplitPage>);
    expect(column()).toHaveClass("lg:order-last");
  });
});

describe("AuthImagePage media", () => {
  it("draws `imageSrc` as a decorative image unless `imageAlt` is set", () => {
    const { container, rerender } = render(<AuthImagePage imageSrc="/hero.jpg">{form}</AuthImagePage>);
    expect(container.querySelector('img[src="/hero.jpg"]')).toHaveAttribute("alt", "");
    rerender(<AuthImagePage imageSrc="/hero.jpg" imageAlt="A desk">{form}</AuthImagePage>);
    expect(screen.getByRole("img", { name: "A desk" })).toBeInTheDocument();
  });

  it("lets `media` replace the image and `caption={null}` drop the caption", () => {
    render(
      <AuthImagePage imageSrc="/hero.jpg" media={<div data-testid="media" />} caption={null}>
        {form}
      </AuthImagePage>
    );
    expect(screen.getByTestId("media")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
    expect(screen.queryByText("Everything in one calm place")).toBeNull();
  });
});

describe("AuthCenteredPage pattern", () => {
  it("draws a background pattern unless it is `none`", () => {
    const { container, rerender } = render(<AuthCenteredPage>{form}</AuthCenteredPage>);
    const decorative = () => container.querySelectorAll('[aria-hidden="true"]').length;
    const withPattern = decorative();
    rerender(<AuthCenteredPage pattern="none">{form}</AuthCenteredPage>);
    expect(decorative()).toBeLessThan(withPattern);
  });
});
