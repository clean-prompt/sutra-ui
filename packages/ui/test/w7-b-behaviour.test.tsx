/** Wave 7 group B, behaviour: the small fixes that are not about direction or hydration. */
import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TextShimmer } from "../src/primitives/text-shimmer";
import { DatePicker, DateRangePicker, DateTimePicker } from "../src/primitives/date-picker";
import { calendarLocaleProps } from "../src/primitives/date-picker-internal";
import { GlyphSpinner } from "../src/primitives/glyph-spinner";
import { Item, ItemContent, ItemTitle } from "../src/primitives/item";
import { Progress } from "../src/primitives/progress";
import { GridItem } from "../src/primitives/layout";

describe("TextShimmer", () => {
  it("keeps the shimmer class when className carries a text colour, and still keeps size and custom classes", () => {
    render(
      <TextShimmer className="text-primary text-sm font-medium my-class" data-testid="t">
        Thinking
      </TextShimmer>
    );
    const el = screen.getByTestId("t");
    expect(el).toHaveClass("text-shimmer", "text-sm", "font-medium", "my-class", "inline-block");
    expect(el).not.toHaveClass("text-primary");
  });
});

describe("GridItem", () => {
  it("every span the types allow produces a class at its breakpoint", () => {
    const cls = (props: React.ComponentProps<typeof GridItem>) => {
      const { getByTestId, unmount } = render(<GridItem data-testid="g" {...props} />);
      const className = getByTestId("g").className;
      unmount();
      return className;
    };
    for (let n = 1; n <= 12; n++) {
      expect(cls({ span: n as 1 })).toContain(`col-span-${n}`);
      expect(cls({ lg: n as 1 })).toContain(`lg:col-span-${n}`);
    }
    for (let n = 1; n <= 8; n++) expect(cls({ md: n as 1 })).toContain(`md:col-span-${n}`);
    expect(cls({ span: "full", md: "full", lg: "full" })).toEqual(expect.stringContaining("md:col-span-full"));
  });

  it("md stops at the 8 tablet columns in the types", () => {
    // @ts-expect-error the tablet grid has 8 columns
    const item = <GridItem md={9} />;
    expect(item.props.md).toBe(9);
  });
});

describe("Progress formatValue", () => {
  it("is what the progressbar announces when it returns text, and the default percentage otherwise", () => {
    const { rerender } = render(<Progress value={3} max={8} showValue formatValue={(v, m) => `${v} of ${m} GB`} aria-label="Disk" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "3 of 8 GB");
    rerender(<Progress value={50} aria-label="Disk" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "50%");
    rerender(<Progress value={50} showValue formatValue={() => <b>half</b>} aria-label="Disk" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "50%");
    rerender(<Progress value={3} max={8} formatValue={() => "ignored"} aria-valuetext="three eighths" aria-label="Disk" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "three eighths");
    rerender(<Progress indeterminate formatValue={() => "x"} aria-label="Disk" />);
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuetext", "x");
  });
});

describe("Item asChild", () => {
  it("renders the chevron after the child content, and none on a static row", () => {
    const { container, rerender } = render(
      <Item asChild chevron>
        <a href="/inbox">
          <ItemContent>
            <ItemTitle>Inbox</ItemTitle>
          </ItemContent>
        </a>
      </Item>
    );
    const link = screen.getByRole("link", { name: "Inbox" });
    expect(link.querySelectorAll("svg[aria-hidden]").length).toBe(1);
    expect(link.lastElementChild?.tagName.toLowerCase()).toBe("svg");
    expect(link.firstElementChild?.getAttribute("data-slot")).toBe("item-content");
    rerender(
      <Item asChild>
        <a href="/inbox">
          <ItemContent>
            <ItemTitle>Inbox</ItemTitle>
          </ItemContent>
        </a>
      </Item>
    );
    expect(container.querySelector("svg")).toBeNull();
    rerender(<Item chevron>Static</Item>);
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("GlyphSpinner size", () => {
  it("sets the font size from size and inherits it without", () => {
    render(
      <>
        <GlyphSpinner label="inherits" />
        <GlyphSpinner label="large" size="lg" />
        <GlyphSpinner label="tiny" size="xs" paused />
      </>
    );
    const [inherits, large, tiny] = screen.getAllByRole("status").map((el) => el.className);
    expect(inherits).not.toMatch(/text-(xs|sm|base|lg|2xl)/);
    expect(large).toContain("text-lg");
    expect(tiny).toContain("text-xs");
  });
});

describe("date pickers pass locale to the calendar", () => {
  const month = new Date(2026, 9, 1);
  const opened = async (ui: React.ReactElement) => {
    const user = userEvent.setup();
    render(ui);
    await user.click(screen.getByRole("button"));
    return screen.getAllByRole("grid")[0]!;
  };

  it("DatePicker: month name, weekday names and week start follow the locale", async () => {
    const grid = await opened(<DatePicker aria-label="Day" locale="fr" defaultValue={month} />);
    expect(screen.getByRole("status")).toHaveTextContent("octobre 2026");
    const heads = [...grid.querySelectorAll("th")].map((h) => h.textContent);
    expect(heads).toHaveLength(7);
    expect(heads[0]).toMatch(/^lun/i);
    // week starts on Monday in France: 1 Oct 2026 is a Thursday, so the first row begins with 28 September
    expect(grid.querySelector("tbody tr td")).toHaveAttribute("data-day", "2026-09-28");
  });

  it("DatePicker without a locale keeps DayPicker's English calendar", async () => {
    const grid = await opened(<DatePicker aria-label="Day" defaultValue={month} />);
    expect(screen.getByRole("status")).toHaveTextContent("October 2026");
    expect(grid.querySelector("th")).toHaveTextContent(/^Su/);
  });

  it("DateRangePicker and DateTimePicker use it too", async () => {
    const range = await opened(<DateRangePicker aria-label="Range" locale="de" defaultValue={{ from: month, to: month }} />);
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Oktober 2026");
    expect(range.querySelector("th")).toHaveTextContent(/^Mo/);
  });

  it("DateTimePicker", async () => {
    await opened(<DateTimePicker aria-label="Moment" locale="es" defaultValue={month} />);
    expect(screen.getByRole("status")).toHaveTextContent("octubre de 2026");
  });

  it("calendarLocaleProps returns nothing without a usable locale", () => {
    expect(calendarLocaleProps(undefined)).toEqual({});
    expect(calendarLocaleProps("")).toEqual({});
    expect(calendarLocaleProps("not a locale!!")).toEqual({});
    expect(calendarLocaleProps("en-GB").formatters?.formatCaption).toBeTypeOf("function");
  });
});
