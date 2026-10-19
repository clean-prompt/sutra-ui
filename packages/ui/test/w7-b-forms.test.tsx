/**
 * Wave 7 group B, native form posts: with a `name`, FileUpload and Dropzone keep the picked files on their hidden input
 * through DataTransfer (jsdom has none, so a small stand-in records what is set). Without a `name` nothing is touched.
 */
import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dropzone } from "../src/primitives/dropzone";
import { FileUpload, FileUploadDropzone, FileUploadList } from "../src/patterns/file-upload";

let created = 0;
class FakeDataTransfer {
  list: File[] = [];
  items = { add: (f: File) => void this.list.push(f) };
  constructor() {
    created++;
  }
  get files() {
    return this.list as unknown as FileList;
  }
}

const file = (name: string, size = 3) => new File(["x".repeat(size)], name, { type: "text/plain", lastModified: 1 });
const names = (input: HTMLInputElement) => Array.from(input.files ?? []).map((f) => f.name);
const hiddenInput = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[type="file"]')!;
const pick = (input: HTMLInputElement, ...files: File[]) => fireEvent.change(input, { target: { files } });

beforeEach(() => {
  created = 0;
  vi.stubGlobal("DataTransfer", FakeDataTransfer);
});
afterEach(() => vi.unstubAllGlobals());

const Upload = ({ name, maxSize }: { name?: string; maxSize?: number }) => (
  <FileUpload name={name} maxSize={maxSize}>
    <FileUploadDropzone />
    <FileUploadList />
  </FileUpload>
);

describe("FileUpload with a name", () => {
  it("keeps the whole list on the hidden input: picks add, removing a file removes it, a rejected pick changes nothing", () => {
    const { container } = render(<Upload name="docs" maxSize={5} />);
    const input = hiddenInput(container);
    pick(input, file("a.txt"));
    expect(names(input)).toEqual(["a.txt"]);
    pick(input, file("b.txt"));
    expect(names(input)).toEqual(["a.txt", "b.txt"]);
    pick(input, file("huge.txt", 50));
    expect(names(input)).toEqual(["a.txt", "b.txt"]);
    fireEvent.click(screen.getByRole("button", { name: "Remove a.txt" }));
    expect(names(input)).toEqual(["b.txt"]);
  });

  it("without a name it never builds a DataTransfer", () => {
    const { container } = render(<Upload />);
    pick(hiddenInput(container), file("a.txt"));
    expect(screen.getByText("a.txt")).toBeInTheDocument();
    expect(created).toBe(0);
  });

  it("falls back to emptying the input where DataTransfer is missing", () => {
    vi.stubGlobal("DataTransfer", undefined);
    const { container } = render(<Upload name="docs" />);
    const input = hiddenInput(container);
    pick(input, file("a.txt"));
    expect(screen.getByText("a.txt")).toBeInTheDocument();
    expect(input.value).toBe("");
  });
});

describe("Dropzone with a name", () => {
  it("keeps accepted picks and drops on the input, merges while currentCount says files are held, and empties at 0", () => {
    const onDrop = vi.fn();
    const { container, rerender } = render(<Dropzone name="attachments" accept="text/plain" onDrop={onDrop} />);
    const input = hiddenInput(container);
    pick(input, file("a.txt"));
    expect(names(input)).toEqual(["a.txt"]);
    // a pick that is entirely rejected leaves what was accepted
    pick(input, new File(["x"], "pic.png", { type: "image/png" }));
    expect(names(input)).toEqual(["a.txt"]);
    // currentCount 0: the next batch replaces; with files held it is merged (and duplicates are not added twice)
    rerender(<Dropzone name="attachments" accept="text/plain" onDrop={onDrop} currentCount={1} />);
    pick(input, file("a.txt"), file("b.txt"));
    expect(names(input)).toEqual(["a.txt", "b.txt"]);
    // a drop reaches the input too
    fireEvent.drop(screen.getByRole("button"), { dataTransfer: { files: [file("c.txt")], items: [], types: ["Files"] } });
    expect(names(input)).toEqual(["a.txt", "b.txt", "c.txt"]);
    // the parent no longer holds anything
    rerender(<Dropzone name="attachments" accept="text/plain" onDrop={onDrop} currentCount={0} />);
    expect(names(input)).toEqual([]);
    expect(onDrop).toHaveBeenCalledTimes(4);
  });

  it("without a name it does not touch the input files", () => {
    const { container } = render(<Dropzone onDrop={() => {}} />);
    pick(hiddenInput(container), file("a.txt"));
    expect(created).toBe(0);
  });
});
