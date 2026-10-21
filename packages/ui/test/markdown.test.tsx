import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Markdown } from "../src/patterns/markdown";
import { axeViolations } from "./helpers/a11y";

afterEach(() => {
  vi.restoreAllMocks();
});

/** user-event installs its own clipboard stub on setup, so install ours afterwards. */
function mockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText, readText: vi.fn(), write: vi.fn(), read: vi.fn() },
    configurable: true,
    writable: true,
  });
  return writeText;
}

describe("Markdown", () => {
  const source = [
    "# Title",
    "",
    "Some **bold** text and a [link](https://example.com).",
    "",
    "| Name | Qty |",
    "| ---- | --: |",
    "| Apple | 3 |",
    "| Pear | 5 |",
    "",
    "```ts",
    "const a = 1;",
    "",
    "const b = 2;",
    "```",
  ].join("\n");

  it("renders a GFM table and a fenced code block", () => {
    render(<Markdown>{source}</Markdown>);
    expect(screen.getByRole("heading", { level: 1, name: "Title" })).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((c) => c.textContent)).toEqual(["Name", "Qty"]);
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByRole("cell", { name: "5" })).toHaveStyle({ textAlign: "right" });

    const code = document.querySelector("pre code");
    // The blank line inside the fence must not split the block.
    expect(code?.textContent).toBe("const a = 1;\n\nconst b = 2;");
    expect(screen.getByText("ts")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
  });

  it("opens external links in a new tab", () => {
    render(<Markdown>{"[ext](https://example.com) and [int](/docs)"}</Markdown>);
    expect(screen.getByRole("link", { name: "ext" })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "int" })).not.toHaveAttribute("target");
  });

  it("copies fenced code", async () => {
    const user = userEvent.setup();
    const writeText = mockClipboard();
    render(<Markdown>{"```\nnpm i\n```"}</Markdown>);
    await user.click(screen.getByRole("button", { name: "Copy code" }));
    expect(writeText).toHaveBeenCalledWith("npm i");
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Markdown>{source}</Markdown>);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("Markdown math", () => {
  it("renders inline and display math with KaTeX", () => {
    const { container } = render(
      <Markdown math>{"Energy $x^2$ here.\n\n$$\n\\begin{aligned}\na &= b \\\\\n\nc &= d\n\\end{aligned}\n$$\n\nAfter."}</Markdown>
    );
    expect(container.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll(".katex-display")).toHaveLength(1);
    expect(container.textContent).not.toContain("$$");
    expect(container).toHaveTextContent("After.");
  });

  it("leaves dollars alone without the math prop", () => {
    const { container } = render(<Markdown>{"Cost $x^2$"}</Markdown>);
    expect(container.querySelector(".katex")).toBeNull();
    expect(container).toHaveTextContent("$x^2$");
  });
});

describe("Markdown citations", () => {
  const md = "Rust is fast [1] and safe [2,3]. Not [9].\n\nCode `arr[1]` stays.\n\n```\nx = a[2]\n```";

  it("renders pills and calls onCite, skipping code", () => {
    const onCite = vi.fn();
    const { container } = render(
      <Markdown citeCount={3} sources={[{ title: "Rust book" }, { title: "Nomicon" }, { title: "Blog" }]} onCite={onCite}>
        {md}
      </Markdown>
    );
    const pills = container.querySelectorAll("[data-citation]");
    expect(Array.from(pills).map((p) => p.textContent)).toEqual(["1", "2", "3"]);
    const first = screen.getByRole("button", { name: "Source 1: Rust book" });
    expect(first).toHaveAttribute("title", "Rust book");
    fireEvent.click(screen.getByRole("button", { name: "Source 3: Blog" }));
    expect(onCite).toHaveBeenCalledWith(3);
    expect(container).toHaveTextContent("Not [9].");
    expect(container.querySelector("code")).toHaveTextContent("arr[1]");
    expect(container.querySelector("pre")).toHaveTextContent("x = a[2]");
  });

  it("uses sources length and renders link pills without onCite", () => {
    const { container } = render(
      <Markdown sources={[{ href: "https://example.com", title: "Example" }]}>{"See [1]."}</Markdown>
    );
    expect(container.querySelector("a[data-citation]")).toHaveAttribute("href", "https://example.com");
  });

  it("works together with math and passes axe", async () => {
    const { container } = render(
      <Markdown math citeCount={1} onCite={() => {}}>{"Area $\\pi r^2$ [1]."}</Markdown>
    );
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.querySelectorAll("[data-citation]")).toHaveLength(1);
    expect(await axeViolations(container)).toEqual([]);
  });
});
