import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import {
  Dropzone,
  getDroppedFiles,
  getFileRelativePath,
  supportsDirectoryPicker,
  type FileRejection,
  type FileWithPath,
} from "../src/primitives/dropzone";
import { FileUpload, FileUploadDropzone, FileUploadList, FileUploadTrigger } from "../src/patterns/file-upload";
import { axeViolations } from "./helpers/a11y";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function makeFile(name: string, type: string, relative?: string) {
  const file = new File(["x"], name, { type });
  if (relative !== undefined) Object.defineProperty(file, "webkitRelativePath", { value: relative });
  return file;
}

/** jsdom has no `webkitdirectory`; defining it makes the input look like a browser that supports folder picks. */
function withDirectorySupport(on: boolean) {
  if (on) {
    Object.defineProperty(HTMLInputElement.prototype, "webkitdirectory", {
      configurable: true,
      get: () => false,
      set: () => {},
    });
  } else {
    delete (HTMLInputElement.prototype as { webkitdirectory?: boolean }).webkitdirectory;
  }
}

type MockEntry = {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
  file?: (ok: (f: File) => void, err?: (e: unknown) => void) => void;
  createReader?: () => { readEntries: (ok: (e: MockEntry[]) => void, err?: (e: unknown) => void) => void };
};

const fileEntry = (file: File): MockEntry => ({
  name: file.name,
  isFile: true,
  isDirectory: false,
  file: (ok) => setTimeout(() => ok(file), 0),
});

/** A directory whose reader hands its children out in batches of two, like Chrome's batches of 100. */
const dirEntry = (name: string, children: MockEntry[]): MockEntry => ({
  name,
  isFile: false,
  isDirectory: true,
  createReader: () => {
    let offset = 0;
    return {
      readEntries: (ok) => {
        const batch = children.slice(offset, offset + 2);
        offset += batch.length;
        setTimeout(() => ok(batch), 0);
      },
    };
  },
});

const brokenEntry = (name: string): MockEntry => ({
  name,
  isFile: true,
  isDirectory: false,
  file: (_ok, err) => setTimeout(() => err?.(new Error("gone")), 0),
});

function dataTransferOf(entries: MockEntry[]) {
  return {
    items: entries.map((entry) => ({ kind: "file", type: "", webkitGetAsEntry: () => entry, getAsFile: () => null })),
    files: [],
    types: ["Files"],
  };
}

function trip() {
  return [
    dirEntry("Trip", [
      fileEntry(makeFile("a.jpg", "image/jpeg")),
      fileEntry(makeFile("notes.txt", "text/plain")),
      dirEntry("Photos", [fileEntry(makeFile("b.png", "image/png")), dirEntry("Empty", []), fileEntry(makeFile("c.png", "image/png"))]),
    ]),
    fileEntry(makeFile("loose.png", "image/png")),
  ];
}

const paths = (files: File[]) => files.map(getFileRelativePath).sort();

afterEach(() => withDirectorySupport(false));

/* ------------------------------------------------------------------ */
/* Helpers: paths, detection, walking                                  */
/* ------------------------------------------------------------------ */

describe("folder helpers", () => {
  it("feature-detects webkitdirectory on a real input", () => {
    expect(supportsDirectoryPicker()).toBe(false);
    withDirectorySupport(true);
    expect(supportsDirectoryPicker()).toBe(true);
  });

  it("getFileRelativePath prefers relativePath, then webkitRelativePath, then the name", () => {
    expect(getFileRelativePath(makeFile("a.txt", "text/plain"))).toBe("a.txt");
    expect(getFileRelativePath(makeFile("a.txt", "text/plain", ""))).toBe("a.txt");
    expect(getFileRelativePath(makeFile("a.txt", "text/plain", "Docs/a.txt"))).toBe("Docs/a.txt");
  });

  it("walks nested dropped folders, reading every batch, and skips unreadable entries", async () => {
    const files = await getDroppedFiles(dataTransferOf([...trip(), brokenEntry("gone.png")]) as unknown as DataTransfer);
    expect(paths(files)).toEqual(["Trip/Photos/b.png", "Trip/Photos/c.png", "Trip/a.jpg", "Trip/notes.txt", "loose.png"]);
    expect((files[0] as FileWithPath).relativePath).toBe("Trip/a.jpg");
    // Non-enumerable: spreading or serialising a File is unchanged.
    expect(Object.keys(files[0]!)).not.toContain("relativePath");
  });

  it("falls back to dataTransfer.files without the entry API", async () => {
    const file = makeFile("a.png", "image/png");
    const files = await getDroppedFiles({ items: [{ kind: "file", type: "image/png" }], files: [file] } as unknown as DataTransfer);
    expect(files).toEqual([file]);
  });
});

/* ------------------------------------------------------------------ */
/* Dropzone                                                            */
/* ------------------------------------------------------------------ */

describe("Dropzone directory", () => {
  it("keeps the old input and drop behaviour without `directory`", () => {
    withDirectorySupport(true);
    const onDrop = vi.fn();
    const { container } = render(<Dropzone onDrop={onDrop} />);
    const input = container.querySelector("input")!;
    expect(input.hasAttribute("webkitdirectory")).toBe(false);
    expect(screen.getByRole("button")).toHaveTextContent("Click to upload or drag and drop");
    const file = makeFile("a.png", "image/png");
    fireEvent.drop(screen.getByRole("button"), { dataTransfer: { ...dataTransferOf(trip()), files: [file] } });
    // Synchronous, from dataTransfer.files: the folder entries are not walked.
    expect(onDrop).toHaveBeenCalledWith([file], []);
  });

  it("turns the input into a folder picker where supported", async () => {
    withDirectorySupport(true);
    const { container } = render(<Dropzone directory />);
    const input = container.querySelector("input")!;
    expect(input).toHaveAttribute("webkitdirectory");
    expect(input).toHaveAttribute("multiple");
    expect(screen.getByRole("button")).toHaveTextContent("Click to choose a folder");
    expect(screen.queryByText(/can't choose folders/)).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("falls back to the file picker with an announced reason where unsupported", async () => {
    const { container } = render(<Dropzone directory accept="image/*" />);
    expect(container.querySelector("input")!.hasAttribute("webkitdirectory")).toBe(false);
    const zone = screen.getByRole("button");
    expect(zone).toHaveAccessibleDescription(/Images.*This browser can't choose folders/);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("walks a dropped folder and applies accept to every file inside", async () => {
    const onDrop = vi.fn<(files: File[], rejections: FileRejection[]) => void>();
    render(<Dropzone directory accept="image/*" onDrop={onDrop} />);
    const zone = screen.getByRole("button");
    fireEvent.drop(zone, { dataTransfer: dataTransferOf(trip()) });
    expect(zone).toHaveAttribute("aria-busy", "true");
    await waitFor(() => expect(onDrop).toHaveBeenCalledTimes(1));
    const [accepted, rejected] = onDrop.mock.calls[0]!;
    expect(paths(accepted)).toEqual(["Trip/Photos/b.png", "Trip/Photos/c.png", "Trip/a.jpg", "loose.png"]);
    expect(rejected.map((r) => getFileRelativePath(r.file))).toEqual(["Trip/notes.txt"]);
    expect(rejected[0]!.errors[0]!.code).toBe("file-invalid-type");
    expect(zone).not.toHaveAttribute("aria-busy");
  });

  it("counts folder contents against maxFiles", async () => {
    const onDrop = vi.fn<(files: File[], rejections: FileRejection[]) => void>();
    render(<Dropzone directory maxFiles={2} onDrop={onDrop} />);
    fireEvent.drop(screen.getByRole("button"), { dataTransfer: dataTransferOf(trip()) });
    await waitFor(() => expect(onDrop).toHaveBeenCalled());
    expect(onDrop.mock.calls[0]![0]).toHaveLength(2);
    expect(onDrop.mock.calls[0]![1].every((r) => r.errors[0]!.code === "too-many-files")).toBe(true);
  });

  it("ignores drops while disabled", async () => {
    const onDrop = vi.fn();
    render(<Dropzone directory disabled onDrop={onDrop} />);
    fireEvent.drop(screen.getByRole("button"), { dataTransfer: dataTransferOf(trip()) });
    await new Promise((r) => setTimeout(r, 20));
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("drops the result when unmounted mid-walk", async () => {
    const onDrop = vi.fn();
    const { unmount } = render(<Dropzone directory onDrop={onDrop} />);
    fireEvent.drop(screen.getByRole("button"), { dataTransfer: dataTransferOf(trip()) });
    unmount();
    await new Promise((r) => setTimeout(r, 30));
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("tags picked folder files with their webkitRelativePath", () => {
    withDirectorySupport(true);
    const onDrop = vi.fn<(files: File[], rejections: FileRejection[]) => void>();
    const { container } = render(<Dropzone directory accept=".md" onDrop={onDrop} />);
    const input = container.querySelector("input")!;
    fireEvent.change(input, {
      target: { files: [makeFile("a.md", "text/markdown", "Docs/a.md"), makeFile("b.bin", "", "Docs/x/b.bin")] },
    });
    const [accepted, rejected] = onDrop.mock.calls[0]!;
    expect((accepted[0] as FileWithPath).relativePath).toBe("Docs/a.md");
    expect(getFileRelativePath(rejected[0]!.file)).toBe("Docs/x/b.bin");
  });
});

/* ------------------------------------------------------------------ */
/* FileUpload                                                          */
/* ------------------------------------------------------------------ */

describe("FileUpload folders", () => {
  it("keeps the plain trigger unchanged", () => {
    withDirectorySupport(true);
    const { container } = render(
      <FileUpload>
        <FileUploadTrigger />
      </FileUpload>
    );
    expect(screen.getByRole("button", { name: "Upload files" })).toBeEnabled();
    expect(container.querySelectorAll("input")).toHaveLength(1);
    expect(container.querySelector("input")!.hasAttribute("webkitdirectory")).toBe(false);
  });

  it("offers Upload files and Upload folder side by side and lists picked paths", async () => {
    withDirectorySupport(true);
    const onFilesAdded = vi.fn();
    const { container } = render(
      <FileUpload accept="image/*" onFilesAdded={onFilesAdded}>
        <FileUploadTrigger />
        <FileUploadTrigger directory />
        <FileUploadList />
      </FileUpload>
    );
    const folderButton = screen.getByRole("button", { name: "Upload folder" });
    const folderInput = container.querySelector<HTMLInputElement>("input[webkitdirectory]")!;
    expect(folderInput).toBeTruthy();
    const click = vi.spyOn(folderInput, "click");
    fireEvent.click(folderButton);
    expect(click).toHaveBeenCalledTimes(1);

    fireEvent.change(folderInput, {
      target: { files: [makeFile("a.png", "image/png", "Trip/a.png"), makeFile("n.txt", "text/plain", "Trip/n.txt")] },
    });
    expect(screen.getByText("Trip/a.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Trip/a.png" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("n.txt isn't a supported file type.");
    expect(onFilesAdded.mock.calls[0]![0][0].file.relativePath).toBe("Trip/a.png");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("makes the folder button inert with a reason where unsupported, or hides it", async () => {
    const { container, rerender } = render(
      <FileUpload>
        <FileUploadTrigger directory />
      </FileUpload>
    );
    const button = screen.getByRole("button", { name: "Upload folder" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription("This browser can't choose folders. Choose files instead.");
    expect(container.querySelector("input[webkitdirectory]")).toBeNull();
    fireEvent.click(button);
    expect(await axeViolations(container)).toEqual([]);

    rerender(
      <FileUpload>
        <FileUploadTrigger directory hideWhenUnsupported />
      </FileUpload>
    );
    expect(screen.queryByRole("button", { name: "Upload folder" })).toBeNull();
  });

  it("FileUploadDropzone walks dropped folders into the list with paths", async () => {
    render(
      <FileUpload accept="image/*">
        <FileUploadDropzone directory />
        <FileUploadList />
      </FileUpload>
    );
    fireEvent.drop(screen.getByRole("button", { name: /drag and drop/ }), { dataTransfer: dataTransferOf(trip()) });
    expect(await screen.findByText("Trip/Photos/b.png")).toBeInTheDocument();
    expect(screen.getByText("Trip/a.jpg")).toBeInTheDocument();
    // A loose file's path is its own name, so it reads the same as before.
    expect(screen.getByText("loose.png")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("notes.txt isn't a supported file type.");
  });
});

/* ------------------------------------------------------------------ */
/* Accessibility fixes in the default markup                           */
/* ------------------------------------------------------------------ */

describe("Dropzone and FileUpload structure", () => {
  it("keeps the hidden input outside the role=button zone, which still opens it", async () => {
    const { container } = render(<Dropzone aria-label="Upload" className="custom" />);
    const zone = screen.getByRole("button", { name: "Upload" });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(zone.contains(input)).toBe(false);
    expect(zone).toHaveClass("custom");
    const click = vi.spyOn(input, "click");
    fireEvent.click(zone);
    fireEvent.keyDown(zone, { key: "Enter" });
    fireEvent.keyDown(zone, { key: " " });
    expect(click).toHaveBeenCalledTimes(3);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("puts role=alert on a wrapper around a plain error list", async () => {
    const { container } = render(
      <FileUpload accept="image/*">
        <FileUploadDropzone aria-label="Drop files" />
      </FileUpload>
    );
    fireEvent.drop(screen.getByRole("button", { name: "Drop files" }), {
      dataTransfer: { files: [makeFile("t.txt", "text/plain")], items: [] },
    });
    const alert = screen.getByRole("alert");
    expect(alert.tagName).toBe("DIV");
    expect(alert.querySelector("ul > li")).toHaveTextContent("t.txt isn't a supported file type.");
    expect(await axeViolations(container)).toEqual([]);
  });
});
