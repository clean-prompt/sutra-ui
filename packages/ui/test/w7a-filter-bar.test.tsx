import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FilterBarActive } from "../src/patterns/filter-bar";

afterEach(cleanup);

describe("FilterBarActive remove labels", () => {
  const filters = [
    { id: "status", label: "Status", value: "Active", onRemove: vi.fn() },
    { id: "owner", label: "Owner", value: "Ada", onRemove: vi.fn(), removeLabel: "Clear owner" },
  ];

  it("keeps 'Remove filter' by default", () => {
    render(<FilterBarActive filters={filters.map(({ removeLabel: _r, ...f }) => f)} />);
    expect(screen.getAllByRole("button", { name: "Remove filter" })).toHaveLength(2);
  });

  it("takes a function, a string and a per-filter label (the filter's own wins)", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<FilterBarActive filters={filters} removeLabel={(f) => `Remove ${f.label}`} />);
    expect(screen.getByRole("button", { name: "Remove Status" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear owner" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Status" }));
    expect(filters[0]!.onRemove).toHaveBeenCalledTimes(1);
    rerender(<FilterBarActive filters={filters} removeLabel="Drop it" />);
    expect(screen.getByRole("button", { name: "Drop it" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear owner" })).toBeInTheDocument();
  });
});
