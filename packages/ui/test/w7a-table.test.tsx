import * as React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axeViolations } from "./a11y";
import { DataTable, Table, TableBody, TableCell, TableRow, type DataTableColumn } from "../src/primitives/table";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** jsdom has no layout: make every element report content wider than its box. */
function overflowing() {
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(500);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(200);
}

interface P {
  id: string;
  name: string;
  score: number | null;
}
const people: P[] = [
  { id: "a", name: "Ada", score: 3 },
  { id: "b", name: "Bea", score: null },
  { id: "c", name: "Cy", score: 9 },
  { id: "d", name: "", score: 5 },
];
const columns: DataTableColumn<P>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
];

function names() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((r) => within(r).getAllByRole("cell")[0]!.textContent);
}

describe("DataTable clickable rows are keyboard operable", () => {
  it("focuses rows and activates with Enter and Space, but not from an inner control", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    const onInner = vi.fn();
    render(
      <DataTable
        columns={[...columns, { key: "x", header: "Act", cell: (r) => <button onClick={onInner}>Act {r.name}</button> }]}
        data={people.slice(0, 2)}
        onRowClick={onRowClick}
      />
    );
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveAttribute("tabindex", "0");
    rows[0]!.focus();
    await user.keyboard("{Enter}");
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0]![0]).toMatchObject({ id: "a" });
    await user.keyboard(" ");
    expect(onRowClick).toHaveBeenCalledTimes(2);
    // Enter on the inner button runs the button only (the click bubbles once, as it always did)
    screen.getByRole("button", { name: "Act Ada" }).focus();
    onRowClick.mockClear();
    await user.keyboard("{Enter}");
    expect(onInner).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledTimes(1); // from the click event only, not an extra keydown
  });

  it("leaves rows alone without onRowClick", () => {
    render(<DataTable columns={columns} data={people} />);
    for (const r of screen.getAllByRole("row")) expect(r).not.toHaveAttribute("tabindex");
  });
});

describe("DataTable row checkbox names", () => {
  it("keeps 'Select row' by default and takes rowLabel", () => {
    const { rerender } = render(<DataTable columns={columns} data={people} selectable />);
    expect(screen.getAllByRole("checkbox", { name: "Select row" })).toHaveLength(4);
    rerender(<DataTable columns={columns} data={people} selectable rowLabel={(r) => `Select ${r.name || "unnamed"}`} />);
    expect(screen.getByRole("checkbox", { name: "Select Ada" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select unnamed" })).toBeInTheDocument();
  });
});

describe("DataTable sort keeps empty values last", () => {
  it("asc and desc both put null and empty last", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={people} defaultSort={{ key: "score", direction: "asc" }} />);
    const scores = () => screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[1]!.textContent);
    expect(scores()).toEqual(["3", "5", "9", ""]);
    await user.click(screen.getByRole("button", { name: /Score/ }));
    expect(screen.getByRole("columnheader", { name: /Score/ })).toHaveAttribute("aria-sort", "descending");
    expect(scores()).toEqual(["9", "5", "3", ""]);
  });

  it("puts an empty string last in a text sort, both ways", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={people} defaultSort={{ key: "name", direction: "asc" }} />);
    expect(names()).toEqual(["Ada", "Bea", "Cy", ""]);
    await user.click(screen.getByRole("button", { name: /Name/ }));
    expect(names()).toEqual(["Cy", "Bea", "Ada", ""]);
  });
});

describe("Table scroll region", () => {
  it("is focusable while it overflows and a named region when the table has a name", async () => {
    overflowing();
    const { container } = render(
      <Table aria-label="Scores">
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    const region = screen.getByRole("region", { name: "Scores" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toContainElement(screen.getByRole("table", { name: "Scores" }));
    expect(await axeViolations(container)).toEqual([]);
  });

  it("is no tab stop while the table fits, and has no region role when unnamed", () => {
    const { container, unmount } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    expect(container.firstElementChild).not.toHaveAttribute("tabindex");
    expect(container.firstElementChild).not.toHaveAttribute("role");
    unmount();
    overflowing();
    const second = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    expect(second.container.firstElementChild).toHaveAttribute("tabindex", "0");
    expect(second.container.firstElementChild).not.toHaveAttribute("role");
  });

  it("DataTable passes aria-label to the region", () => {
    render(<DataTable columns={columns} data={people} aria-label="People" />);
    expect(screen.getByRole("region", { name: "People" })).toBeInTheDocument();
  });
});
