import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar, FilterBarActive, FilterBarChip, FilterBarClear, FilterBarSearch } from "../src/patterns/filter-bar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, FAQ } from "../src/primitives/accordion";
import { Avatar } from "../src/primitives/avatar";
import { AvatarGroup } from "../src/primitives/avatar-group";
import { Separator } from "../src/primitives/separator";
import { DataTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, type DataTableColumn } from "../src/primitives/table";
import { axeViolations } from "./helpers/a11y";

interface Person {
  id: string;
  name: string;
  age: number;
}

const people: Person[] = [
  { id: "a", name: "Charlie", age: 30 },
  { id: "b", name: "alice", age: 25 },
  { id: "c", name: "Bob", age: 35 },
];

const columns: DataTableColumn<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "age", header: "Age", sortable: true, align: "right" },
];

function firstColumn() {
  const rows = screen.getAllByRole("row").slice(1);
  return rows.map((r) => {
    const cells = within(r).getAllByRole("cell");
    return cells[cells.length - 2]!.textContent;
  });
}

describe("DataTable sorting", () => {
  it("click header cycles asc -> desc -> none and updates aria-sort", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(<DataTable columns={columns} data={people} onSortChange={onSortChange} />);
    const nameHeader = screen.getByRole("columnheader", { name: "Name" });
    const ageHeader = screen.getByRole("columnheader", { name: "Age" });
    expect(nameHeader).toHaveAttribute("aria-sort", "none");
    expect(firstColumn()).toEqual(["Charlie", "alice", "Bob"]);

    await user.click(within(nameHeader).getByRole("button"));
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
    expect(onSortChange).toHaveBeenLastCalledWith({ key: "name", direction: "asc" });
    // Case-insensitive locale compare.
    expect(firstColumn()).toEqual(["alice", "Bob", "Charlie"]);

    await user.click(within(nameHeader).getByRole("button"));
    expect(nameHeader).toHaveAttribute("aria-sort", "descending");
    expect(firstColumn()).toEqual(["Charlie", "Bob", "alice"]);

    await user.click(within(nameHeader).getByRole("button"));
    expect(nameHeader).toHaveAttribute("aria-sort", "none");
    expect(onSortChange).toHaveBeenLastCalledWith(null);
    expect(firstColumn()).toEqual(["Charlie", "alice", "Bob"]);

    await user.click(within(ageHeader).getByRole("button"));
    expect(ageHeader).toHaveAttribute("aria-sort", "ascending");
    expect(nameHeader).toHaveAttribute("aria-sort", "none");
    expect(firstColumn()).toEqual(["alice", "Charlie", "Bob"]);
  });

  it("non-sortable columns have no aria-sort or sort button", () => {
    render(<DataTable columns={[{ key: "name", header: "Name" }]} data={people} />);
    const header = screen.getByRole("columnheader", { name: "Name" });
    expect(header).not.toHaveAttribute("aria-sort");
    expect(within(header).queryByRole("button")).not.toBeInTheDocument();
  });

  it("manualSorting keeps data order but still reports sort", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={people} manualSorting defaultSort={{ key: "age", direction: "desc" }} />);
    expect(screen.getByRole("columnheader", { name: "Age" })).toHaveAttribute("aria-sort", "descending");
    expect(firstColumn()).toEqual(["Charlie", "alice", "Bob"]);
    await user.click(within(screen.getByRole("columnheader", { name: "Name" })).getByRole("button"));
    expect(firstColumn()).toEqual(["Charlie", "alice", "Bob"]);
  });
});

describe("DataTable selection", () => {
  it("per-row and select-all checkboxes update selection", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(<DataTable columns={columns} data={people} selectable onSelectionChange={onSelectionChange} />);
    const all = screen.getByRole("checkbox", { name: "Select all rows" });
    const rowBoxes = screen.getAllByRole("checkbox", { name: "Select row" });
    expect(rowBoxes).toHaveLength(3);
    expect(all).not.toBeChecked();

    await user.click(rowBoxes[1]!);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["b"]);
    expect(rowBoxes[1]).toBeChecked();
    expect((all as HTMLInputElement).indeterminate).toBe(true);
    expect(rowBoxes[1]!.closest("tr")).toHaveAttribute("data-state", "selected");

    // From indeterminate, select-all clears.
    await user.click(all);
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    rowBoxes.forEach((b) => expect(b).not.toBeChecked());

    await user.click(all);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["a", "b", "c"]);
    expect(all).toBeChecked();
    expect((all as HTMLInputElement).indeterminate).toBe(false);
    rowBoxes.forEach((b) => expect(b).toBeChecked());

    await user.click(rowBoxes[0]!);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["b", "c"]);

    await user.click(all);
    await user.click(all);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["a", "b", "c"]);
    await user.click(all);
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it("checkbox clicks do not trigger onRowClick, row clicks do", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={people} selectable onRowClick={onRowClick} />);
    await user.click(screen.getAllByRole("checkbox", { name: "Select row" })[0]!);
    expect(onRowClick).not.toHaveBeenCalled();
    await user.click(screen.getByText("Bob"));
    expect(onRowClick).toHaveBeenCalledWith(people[2], 2);
  });

  it("controlled selectedRowIds", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [ids, setIds] = React.useState<string[]>(["c"]);
      return (
        <>
          <DataTable columns={columns} data={people} selectable selectedRowIds={ids} onSelectionChange={setIds} />
          <output>{ids.join(",")}</output>
        </>
      );
    }
    render(<Harness />);
    const rowBoxes = screen.getAllByRole("checkbox", { name: "Select row" });
    expect(rowBoxes[2]).toBeChecked();
    await user.click(rowBoxes[0]!);
    expect(screen.getByRole("status")).toHaveTextContent("c,a");
  });

  it("shows empty state and disables select-all with no rows", () => {
    render(<DataTable columns={columns} data={[]} selectable />);
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select all rows" })).toBeDisabled();
  });

  it("loading sets aria-busy and renders skeleton rows", () => {
    render(<DataTable columns={columns} data={people} loading loadingRows={2} />);
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <DataTable columns={columns} data={people} selectable caption="People" defaultSort={{ key: "name", direction: "asc" }} />
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("Table primitives", () => {
  it("TableHead with sortDirection sets aria-sort and calls onSort", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead sortDirection="desc" onSort={onSort}>
              Date
            </TableHead>
            <TableHead>Plain</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Today</TableCell>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    const head = screen.getByRole("columnheader", { name: "Date" });
    expect(head).toHaveAttribute("aria-sort", "descending");
    expect(head).toHaveAttribute("scope", "col");
    await user.click(within(head).getByRole("button"));
    expect(onSort).toHaveBeenCalledTimes(1);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("Avatar", () => {
  it("shows initials from the name (first + last) when there is no image", () => {
    render(<Avatar name="Ada Mary Lovelace" />);
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("single-word names give one initial; uppercase", () => {
    render(<Avatar name="  cher " />);
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("custom fallback overrides initials", () => {
    render(<Avatar name="Ada Lovelace" fallback="??" />);
    expect(screen.getByText("??")).toBeInTheDocument();
    expect(screen.queryByText("AL")).not.toBeInTheDocument();
  });

  it("status and verified badges are announced", () => {
    render(<Avatar name="Ada Lovelace" status="online" verified />);
    expect(screen.getByRole("img", { name: "online" })).toBeInTheDocument();
    expect(screen.getByText("Verified")).toHaveClass("sr-only");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <Avatar name="Ada Lovelace" />
        <Avatar name="Grace Hopper" status="busy" verified />
        <Avatar />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("AvatarGroup", () => {
  const names = ["Ann Lee", "Bo Diddley", "Cy Twombly", "Di Fox", "Ed Wood"];

  it("shows max avatars and a +N overflow bubble", () => {
    render(
      <AvatarGroup max={3} aria-label="Team">
        {names.map((n) => (
          <Avatar key={n} name={n} />
        ))}
      </AvatarGroup>
    );
    const group = screen.getByRole("group", { name: "Team" });
    expect(within(group).getByText("AL")).toBeInTheDocument();
    expect(within(group).getByText("CT")).toBeInTheDocument();
    expect(within(group).queryByText("DF")).not.toBeInTheDocument();
    const more = within(group).getByRole("img", { name: "2 more" });
    expect(more).toHaveTextContent("+2");
  });

  it("total overrides the overflow count and caps the label at 99+", () => {
    render(
      <AvatarGroup max={2} total={250}>
        <Avatar name="A B" />
        <Avatar name="C D" />
      </AvatarGroup>
    );
    const more = screen.getByRole("img", { name: "248 more" });
    expect(more).toHaveTextContent("99+");
  });

  it("no overflow bubble when everything fits; add button fires", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <AvatarGroup max={5} onAdd={onAdd}>
        <Avatar name="A B" />
      </AvatarGroup>
    );
    expect(screen.queryByRole("img", { name: /more/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add member" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <AvatarGroup max={2} aria-label="Team" onAdd={() => {}}>
        {names.map((n) => (
          <Avatar key={n} name={n} />
        ))}
      </AvatarGroup>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("Separator", () => {
  it("is decorative (role=none) by default", () => {
    const { container } = render(<Separator />);
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("role", "none");
  });

  it("non-decorative exposes role and orientation", () => {
    render(
      <div>
        <Separator decorative={false} />
        <Separator decorative={false} orientation="vertical" />
      </div>
    );
    const [h, v] = screen.getAllByRole("separator");
    expect(h).not.toHaveAttribute("aria-orientation");
    expect(h).toHaveAttribute("data-orientation", "horizontal");
    expect(v).toHaveAttribute("aria-orientation", "vertical");
  });

  it("renders a label", () => {
    render(<Separator label="OR" />);
    expect(screen.getByText("OR")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <Separator />
        <Separator decorative={false} orientation="vertical" />
        <Separator label="Section" />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("FilterBar", () => {
  it("FilterBarSearch clears via button and Escape", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <FilterBar aria-label="Filters">
        <FilterBarSearch aria-label="Search" onValueChange={onValueChange} />
      </FilterBar>
    );
    expect(screen.getByRole("toolbar", { name: "Filters" })).toBeInTheDocument();
    const input = screen.getByRole("searchbox", { name: "Search" });
    await user.type(input, "abc");
    expect(input).toHaveValue("abc");
    expect(onValueChange).toHaveBeenLastCalledWith("abc");
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    await user.type(input, "x");
    await user.keyboard("{Escape}");
    expect(input).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });

  it("FilterBarChip opens a multiselect listbox and summarizes selection", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <FilterBarChip label="Status" options={["Active", "Paused", "Archived"]} onValueChange={onValueChange} maxDisplay={1} />
    );
    const trigger = screen.getByRole("button", { name: "Status" });
    await user.click(trigger);
    const listbox = await screen.findByRole("listbox", { name: "Status" });
    expect(listbox).toHaveAttribute("aria-multiselectable", "true");
    const active = within(listbox).getByRole("option", { name: "Active" });
    expect(active).toHaveFocus();
    await user.click(active);
    expect(active).toHaveAttribute("aria-selected", "true");
    expect(onValueChange).toHaveBeenLastCalledWith(["Active"]);

    // Keyboard: ArrowDown + Space toggles the next option.
    await user.keyboard("{ArrowDown}");
    expect(within(listbox).getByRole("option", { name: "Paused" })).toHaveFocus();
    await user.keyboard(" ");
    expect(onValueChange).toHaveBeenLastCalledWith(["Active", "Paused"]);
    expect(trigger).toHaveTextContent("2 selected");

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onValueChange).toHaveBeenLastCalledWith([]);
  });

  it("FilterBarChip search filters options", async () => {
    const user = userEvent.setup();
    render(<FilterBarChip label="Tag" options={["red", "green", "blue"]} searchable />);
    await user.click(screen.getByRole("button", { name: "Tag" }));
    await user.type(await screen.findByRole("textbox", { name: "Search Tag" }), "re");
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["red", "green"]);
  });

  it("FilterBarActive tokens can be removed; FilterBarClear works", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const onClear = vi.fn();
    render(
      <div>
        <FilterBarActive filters={[{ id: "s", label: "Status", value: "Active", onRemove }]} />
        <FilterBarClear onClick={onClear} />
      </div>
    );
    const group = screen.getByRole("group", { name: "Active filters" });
    expect(group).toHaveTextContent("Status:Active");
    await user.click(within(group).getByRole("button", { name: "Remove filter" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <FilterBar aria-label="Filters">
        <FilterBarSearch aria-label="Search" defaultValue="q" />
        <FilterBarChip label="Status" options={["A", "B"]} defaultValue={["A"]} />
        <FilterBarClear />
      </FilterBar>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("Accordion", () => {
  function Single(props: { collapsible?: boolean }) {
    return (
      <Accordion type="single" collapsible={props.collapsible}>
        <AccordionItem value="a">
          <AccordionTrigger>First</AccordionTrigger>
          <AccordionContent>First body</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Second</AccordionTrigger>
          <AccordionContent>Second body</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  it("single: opening one closes the other; collapsible allows closing", async () => {
    const user = userEvent.setup();
    render(<Single collapsible />);
    const first = screen.getByRole("button", { name: "First" });
    const second = screen.getByRole("button", { name: "Second" });
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("First body")).not.toBeInTheDocument();

    await user.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "First" })).toHaveTextContent("First body");

    await user.click(second);
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(second).toHaveAttribute("aria-expanded", "true");

    await user.click(second);
    expect(second).toHaveAttribute("aria-expanded", "false");
  });

  it("single non-collapsible keeps the open item open", async () => {
    const user = userEvent.setup();
    render(<Single />);
    const first = screen.getByRole("button", { name: "First" });
    await user.click(first);
    await user.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
  });

  it("multiple: items open independently", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Accordion type="multiple" onValueChange={onValueChange}>
        <AccordionItem value="a">
          <AccordionTrigger>A</AccordionTrigger>
          <AccordionContent>A body</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>B</AccordionTrigger>
          <AccordionContent>B body</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    await user.click(screen.getByRole("button", { name: "A" }));
    await user.click(screen.getByRole("button", { name: "B" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["a", "b"]);
    expect(screen.getByText("A body")).toBeVisible();
    expect(screen.getByText("B body")).toBeVisible();
  });

  it("FAQ renders entries and respects defaultValue", async () => {
    const user = userEvent.setup();
    render(
      <FAQ
        defaultValue="1"
        items={[
          { question: "Q one", answer: "A one" },
          { question: "Q two", answer: "A two" },
        ]}
      />
    );
    expect(screen.getByRole("button", { name: "Q two" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("A two")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Q two" }));
    expect(screen.getByRole("button", { name: "Q two" })).toHaveAttribute("aria-expanded", "false");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Accordion type="single" collapsible defaultValue="a" variant="bordered" icon="plus">
        <AccordionItem value="a">
          <AccordionTrigger>Open</AccordionTrigger>
          <AccordionContent>Visible</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Closed</AccordionTrigger>
          <AccordionContent>Hidden</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
