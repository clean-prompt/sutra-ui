import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Checklist } from "../src/patterns/reorderable-list";

afterEach(cleanup);

describe("Checklist delete button on touch screens", () => {
  it("is revealed for coarse pointers (the hover and focus reveal stay), and absent when not editable", () => {
    const items = [{ id: "a", text: "Write tests", done: false }];
    const { rerender } = render(<Checklist label="Tasks" defaultItems={items} />);
    const del = screen.getByRole("button", { name: "Delete Write tests" });
    expect(del.className).toContain("opacity-0");
    expect(del.className).toContain("pointer-coarse:opacity-100");
    expect(del.className).toContain("group-hover/row:opacity-100");
    expect(del.className).toContain("focus-visible:opacity-100");
    rerender(<Checklist label="Tasks" defaultItems={items} editable={false} />);
    expect(screen.queryByRole("button", { name: "Delete Write tests" })).toBeNull();
  });
});
