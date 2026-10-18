import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdfThumbnail, PdfViewer, pdfRenderer, PDF_CSP_SAFE_OPTIONS } from "../src/kits/editor/pdf-viewer";
import { FileViewer } from "../src/patterns/file-viewer";
import { execFileSync } from "node:child_process";
import * as path from "node:path";
import { axeViolations } from "./a11y";

/* ------------------------------------------------------------------ */
/* pdf.js mock                                                         */
/* ------------------------------------------------------------------ */

interface RenderCall {
  page: number;
  scale: number;
  canvas: HTMLCanvasElement;
  transform?: number[];
}

const pdf = vi.hoisted(() => ({
  options: { workerSrc: "", workerPort: null as unknown },
  getDocument: null as unknown as ReturnType<typeof vi.fn>,
  workerCreate: null as unknown as ReturnType<typeof vi.fn>,
  renders: [] as RenderCall[],
  textLayers: [] as { container: HTMLElement }[],
  numPages: 12,
  fail: null as Error | null,
  pending: false,
  tasks: [] as { destroy: ReturnType<typeof vi.fn> }[],
  getPage: [] as number[],
  workerModuleLoaded: 0,
  real: false,
  failOnce: null as Error | null,
}));

// The viewer loads pdf.js's legacy build (see the module comment). With `pdf.real` set, the mock hands calls to the real
// pdf.js, so one test can run the actual library.
vi.mock("pdfjs-dist/legacy/build/pdf.mjs", async (importOriginal) => {
  const real = (await importOriginal()) as typeof import("pdfjs-dist");
  class TextLayer {
    constructor(opts: { container: HTMLElement }) {
      if (pdf.real) return new real.TextLayer(opts as never) as never;
      pdf.textLayers.push(opts);
    }
    render() {
      return Promise.resolve();
    }
    cancel() {}
  }
  return {
    GlobalWorkerOptions: pdf.options,
    PDFWorker: { create: (...args: unknown[]) => pdf.workerCreate(...args) },
    TextLayer,
    getDocument: (...args: unknown[]) => (pdf.real ? real.getDocument(...(args as [never])) : pdf.getDocument(...args)),
  };
});

vi.mock("pdfjs-dist/legacy/build/pdf.worker.min.mjs", () => {
  pdf.workerModuleLoaded++;
  return { WorkerMessageHandler: { setup() {} } };
});

function makePage(n: number) {
  return {
    getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale, scale }),
    render: (p: { canvas: HTMLCanvasElement; viewport: { scale: number }; transform?: number[] }) => {
      pdf.renders.push({ page: n, scale: p.viewport.scale, canvas: p.canvas, transform: p.transform });
      return { promise: Promise.resolve(), cancel: vi.fn() };
    },
    streamTextContent: () => ({}),
  };
}

function setupPdfjs() {
  pdf.options.workerSrc = "";
  pdf.options.workerPort = null;
  pdf.renders = [];
  pdf.textLayers = [];
  pdf.numPages = 12;
  pdf.fail = null;
  pdf.failOnce = null;
  pdf.real = false;
  pdf.pending = false;
  pdf.tasks = [];
  pdf.getPage = [];
  pdf.workerCreate = vi.fn((params: { port: unknown }) => ({ port: params.port }));
  pdf.getDocument = vi.fn(() => {
    const destroy = vi.fn(() => Promise.resolve());
    pdf.tasks.push({ destroy });
    const doc = {
      numPages: pdf.numPages,
      getPage: async (n: number) => {
        pdf.getPage.push(n);
        return makePage(n);
      },
    };
    const once = pdf.failOnce;
    pdf.failOnce = null;
    const promise = once ? Promise.reject(once) : pdf.pending ? new Promise(() => {}) : pdf.fail ? Promise.reject(pdf.fail) : Promise.resolve(doc);
    promise.catch(() => {});
    return { promise, destroy };
  });
}

/* ------------------------------------------------------------------ */
/* IntersectionObserver mock                                           */
/* ------------------------------------------------------------------ */

class MockIO {
  static all: MockIO[] = [];
  elements = new Set<Element>();
  live = true;
  constructor(
    public cb: IntersectionObserverCallback,
    public options: IntersectionObserverInit = {}
  ) {
    MockIO.all.push(this);
  }
  observe(el: Element) {
    this.elements.add(el);
  }
  unobserve(el: Element) {
    this.elements.delete(el);
  }
  disconnect() {
    this.live = false;
    this.elements.clear();
  }
  takeRecords() {
    return [];
  }
}

function intersect(match: (el: Element) => boolean, isIntersecting = true) {
  act(() => {
    for (const io of MockIO.all.filter((o) => o.live)) {
      const entries = [...io.elements].filter(match).map((target) => ({ target, isIntersecting }) as IntersectionObserverEntry);
      if (entries.length) io.cb(entries, io as unknown as IntersectionObserver);
    }
  });
}
const showPages = (...pages: number[]) => intersect((el) => pages.includes(Number((el as HTMLElement).dataset.pdfPage)));

const originalIO = globalThis.IntersectionObserver;
const originalDpr = window.devicePixelRatio;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  setupPdfjs();
  MockIO.all = [];
  globalThis.IntersectionObserver = MockIO as unknown as typeof IntersectionObserver;
  // Configure a worker by default; the fallback test clears it.
  pdf.options.workerSrc = "/default.worker.mjs";
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  globalThis.IntersectionObserver = originalIO;
  Object.defineProperty(window, "devicePixelRatio", { value: originalDpr, configurable: true });
  delete (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker;
  vi.restoreAllMocks();
});

async function renderViewer(ui: React.ReactElement) {
  const utils = render(ui);
  await screen.findByRole("group", { name: "Page navigation" });
  return utils;
}

const pageEl = (container: HTMLElement, n: number) => container.querySelector<HTMLElement>(`[data-pdf-page="${n}"]`)!;
const renderedPages = () => [...new Set(pdf.renders.map((r) => r.page))].sort((a, b) => a - b);
const lastDocParams = () => pdf.getDocument.mock.calls.at(-1)![0] as Record<string, unknown>;

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe("PdfViewer loading", () => {
  it("runs pdf.js on the main thread when no worker is configured", async () => {
    pdf.options.workerSrc = "";
    await renderViewer(<PdfViewer url="/a.pdf" />);
    expect(pdf.workerModuleLoaded).toBe(1);
    expect((globalThis as { pdfjsWorker?: unknown }).pdfjsWorker).toBeTruthy();
    expect(pdf.getDocument).toHaveBeenCalled();
  });

  it("reports the page count and lists every page without rendering any until visible", async () => {
    const onLoad = vi.fn();
    const { container } = await renderViewer(<PdfViewer url="/a.pdf" onLoad={onLoad} />);
    expect(onLoad).toHaveBeenLastCalledWith({ numPages: 12 });
    expect(screen.getByRole("textbox", { name: /page number/i })).toHaveValue("1");
    expect(screen.getByText("/ 12")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-pdf-page]")).toHaveLength(12);
    expect(container.querySelectorAll("canvas")).toHaveLength(0);
    expect(pdf.renders).toHaveLength(0);
  });

  it("renders only the pages near the viewport, and drops pages that leave it", async () => {
    const { container } = await renderViewer(<PdfViewer url="/a.pdf" overscan={0.5} />);
    const io = MockIO.all.filter((o) => o.live).find((o) => o.elements.size === 12)!;
    expect(io.options.root).toBe(screen.getByRole("region", { name: "document.pdf pages" }));
    expect(io.options.rootMargin).toBe("50% 0px");

    showPages(1, 2);
    await waitFor(() => expect(pageEl(container, 2)).toHaveAttribute("data-rendered"));
    expect(renderedPages()).toEqual([1, 2]);
    expect(container.querySelectorAll("canvas")).toHaveLength(2);
    expect(pageEl(container, 3)).not.toHaveAttribute("data-rendered");

    intersect((el) => (el as HTMLElement).dataset.pdfPage === "1", false);
    showPages(7);
    await waitFor(() => expect(pageEl(container, 7)).toHaveAttribute("data-rendered"));
    expect(pageEl(container, 1).querySelector("canvas")).toBeNull();
    expect(renderedPages()).toEqual([1, 2, 7]);
  });

  it("renders canvases at the device pixel ratio", async () => {
    Object.defineProperty(window, "devicePixelRatio", { value: 2, configurable: true });
    const { container } = await renderViewer(<PdfViewer url="/a.pdf" defaultZoom={1} />);
    showPages(1);
    await waitFor(() => expect(pageEl(container, 1)).toHaveAttribute("data-rendered"));
    const call = pdf.renders[0]!;
    expect(call.scale).toBeCloseTo(4 / 3);
    expect(call.transform).toEqual([2, 0, 0, 2, 0, 0]);
    expect(call.canvas.width).toBe(1600);
    expect(call.canvas.height).toBe(Math.floor(800 * (4 / 3) * 2));
    expect(pageEl(container, 1)).toHaveStyle({ width: "800px" });
  });

  it("shows skeletons while loading, without the controls", async () => {
    const { container, rerender } = render(<PdfViewer loading />);
    const root = container.querySelector('[data-slot="pdf-viewer"]')!;
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading PDF…")).toHaveClass("sr-only");
    expect(screen.queryByRole("group", { name: "Page navigation" })).toBeNull();
    expect(screen.queryByText("No document")).toBeNull();

    pdf.pending = true;
    rerender(<PdfViewer url="/a.pdf" />);
    await waitFor(() => expect(pdf.getDocument).toHaveBeenCalled());
    expect(root).toHaveAttribute("aria-busy", "true");

    rerender(<PdfViewer />);
    expect(root).not.toHaveAttribute("aria-busy");
    expect(screen.getByText("No document")).toBeInTheDocument();
  });

  it("destroys the loading task on unmount", async () => {
    const { unmount } = await renderViewer(<PdfViewer url="/a.pdf" />);
    const task = pdf.tasks.at(-1)!;
    unmount();
    expect(task.destroy).toHaveBeenCalled();
  });
});

describe("PdfViewer sources, worker and CSP", () => {
  it("passes CSP-safe options, letting documentOptions override them", async () => {
    await renderViewer(<PdfViewer url="/a.pdf" documentOptions={{ cMapUrl: "/cmaps/", useWasm: true }} />);
    const params = lastDocParams();
    expect(params).toMatchObject({ url: "/a.pdf", isEvalSupported: false, enableXfa: false, cMapUrl: "/cmaps/", useWasm: true });
    expect(PDF_CSP_SAFE_OPTIONS).toMatchObject({ isEvalSupported: false, useWasm: false, enableXfa: false });
    cleanup();
    await renderViewer(<PdfViewer url="/b.pdf" />);
    expect(lastDocParams()).toMatchObject({ useWasm: false });
  });

  it("sets the worker URL from workerSrc", async () => {
    await renderViewer(<PdfViewer url="/a.pdf" workerSrc="/assets/pdf.worker.min.mjs" />);
    expect(pdf.options.workerSrc).toBe("/assets/pdf.worker.min.mjs");
    expect(lastDocParams().worker).toBeUndefined();
  });

  it("uses a shared worker for workerPort", async () => {
    const port = { postMessage() {} } as unknown as Worker;
    await renderViewer(<PdfViewer url="/a.pdf" workerPort={port} />);
    expect(pdf.workerCreate).toHaveBeenCalledWith({ port });
    expect(lastDocParams().worker).toEqual({ port });
  });

  it("copies byte sources (pdf.js takes ownership) and reads blobs in place", async () => {
    const bytes = new Uint8Array([37, 80, 68, 70]);
    await renderViewer(<PdfViewer data={bytes} />);
    const sent = lastDocParams().data as Uint8Array;
    expect(sent).not.toBe(bytes);
    expect([...sent]).toEqual([37, 80, 68, 70]);
    expect(lastDocParams().url).toBeUndefined();

    cleanup();
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "application/pdf" });
    await renderViewer(<PdfViewer blob={blob} />);
    expect([...(lastDocParams().data as Uint8Array)]).toEqual([1, 2, 3]);
  });
});

describe("PdfViewer zoom", () => {
  it("zooms with the buttons, +/- keys and Ctrl/Cmd+wheel", async () => {
    const onZoomChange = vi.fn();
    const { container } = await renderViewer(<PdfViewer url="/a.pdf" defaultZoom={1} onZoomChange={onZoomChange} />);
    const trigger = screen.getByRole("button", { name: "Zoom level: 100%" });
    expect(trigger).toHaveTextContent("100%");
    expect(pageEl(container, 1)).toHaveStyle({ width: "800px", height: `${Math.floor(800 * (4 / 3))}px` });

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(onZoomChange).toHaveBeenLastCalledWith(1.1);
    expect(trigger).toHaveTextContent("110%");

    const scroller = screen.getByRole("region", { name: "document.pdf pages" });
    fireEvent.keyDown(scroller, { key: "+" });
    expect(onZoomChange).toHaveBeenLastCalledWith(1.25);
    fireEvent.keyDown(scroller, { key: "-" });
    fireEvent.keyDown(scroller, { key: "-" });
    expect(onZoomChange).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(onZoomChange).toHaveBeenLastCalledWith(0.9);

    const wheel = new WheelEvent("wheel", { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true });
    act(() => {
      scroller.dispatchEvent(wheel);
    });
    expect(wheel.defaultPrevented).toBe(true);
    expect(onZoomChange.mock.lastCall![0]).toBeCloseTo(0.9 * Math.exp(0.3), 2);

    const plainWheel = new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true });
    act(() => {
      scroller.dispatchEvent(plainWheel);
    });
    expect(plainWheel.defaultPrevented).toBe(false);

    fireEvent.keyDown(scroller, { key: "0", ctrlKey: true });
    expect(onZoomChange).toHaveBeenLastCalledWith("fit-width");
  });

  it("re-renders visible pages at the new scale", async () => {
    const { container } = await renderViewer(<PdfViewer url="/a.pdf" defaultZoom={1} />);
    showPages(1);
    await waitFor(() => expect(pageEl(container, 1)).toHaveAttribute("data-rendered"));
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    await waitFor(() => expect(pdf.renders.at(-1)!.scale).toBeCloseTo(1.1 * (4 / 3)));
  });

  it("offers fit width, fit page and presets in the zoom menu", async () => {
    const user = userEvent.setup();
    const onZoomChange = vi.fn();
    await renderViewer(<PdfViewer url="/a.pdf" onZoomChange={onZoomChange} />);
    await user.click(screen.getByRole("button", { name: /zoom level: fit width/i }));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitemradio", { name: "Fit width" })).toHaveAttribute("aria-checked", "true");
    await user.click(within(menu).getByRole("menuitemradio", { name: "Fit page" }));
    expect(onZoomChange).toHaveBeenLastCalledWith("fit-page");
    await user.click(screen.getByRole("button", { name: /zoom level: fit page/i }));
    await user.click(within(await screen.findByRole("menu")).getByRole("menuitemradio", { name: "150%" }));
    expect(onZoomChange).toHaveBeenLastCalledWith(1.5);
  });

  it("fits the page width to the scroller", async () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.getAttribute("role") === "region" ? 432 : 0;
    });
    const { container } = await renderViewer(<PdfViewer url="/a.pdf" />);
    // (432 - 2 × 16) / (600 pt × 4/3) = 0.5
    expect(screen.getByRole("button", { name: "Zoom level: Fit width (50%)" })).toBeInTheDocument();
    expect(pageEl(container, 1)).toHaveStyle({ width: "400px" });
  });
});

describe("PdfViewer page navigation", () => {
  it("moves with prev/next and the page field, clamped to the document", async () => {
    const onPageChange = vi.fn();
    await renderViewer(<PdfViewer url="/a.pdf" onPageChange={onPageChange} />);
    const field = screen.getByRole("textbox", { name: "Page number, of 12" });
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
    expect(field).toHaveValue("2");

    fireEvent.change(field, { target: { value: "7" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(field).toHaveValue("7");
    expect(onPageChange).toHaveBeenLastCalledWith(7);

    fireEvent.change(field, { target: { value: "99" } });
    fireEvent.blur(field);
    expect(field).toHaveValue("12");
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();

    fireEvent.change(field, { target: { value: "3" } });
    fireEvent.keyDown(field, { key: "Escape" });
    expect(field).toHaveValue("12");
    // Typing in the field doesn't zoom.
    fireEvent.keyDown(field, { key: "-" });
    expect(screen.getByRole("button", { name: /zoom level/i })).toHaveTextContent("100%");
  });

  it("scrolls to the page it navigates to, and tracks the page while scrolling", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockImplementation(function (this: HTMLElement) {
      const n = Number(this.dataset.pdfPage);
      return n ? 16 + (n - 1) * 1000 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.dataset.pdfPage ? 984 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.getAttribute("role") === "region" ? 800 : 0;
    });
    const onPageChange = vi.fn();
    await renderViewer(<PdfViewer url="/a.pdf" defaultPage={3} onPageChange={onPageChange} />);
    const scroller = screen.getByRole("region", { name: "document.pdf pages" });
    await waitFor(() => expect(scroller.scrollTop).toBe(2016 - 8));

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(scroller.scrollTop).toBe(3016 - 8);

    act(() => {
      scroller.scrollTop = 6200;
      fireEvent.scroll(scroller);
    });
    expect(screen.getByRole("textbox", { name: /page number/i })).toHaveValue("7");
    expect(onPageChange).toHaveBeenLastCalledWith(7);
  });

  it("follows a controlled page", async () => {
    function Controlled() {
      const [page, setPage] = React.useState(1);
      return (
        <>
          <button onClick={() => setPage(5)}>Go to 5</button>
          <PdfViewer url="/a.pdf" page={page} onPageChange={setPage} />
        </>
      );
    }
    await renderViewer(<Controlled />);
    fireEvent.click(screen.getByRole("button", { name: "Go to 5" }));
    expect(screen.getByRole("textbox", { name: /page number/i })).toHaveValue("5");
  });
});

describe("PdfViewer text layer", () => {
  it("adds a pdf.js text layer to rendered pages, unless turned off", async () => {
    const { container, unmount } = await renderViewer(<PdfViewer url="/a.pdf" />);
    showPages(1);
    await waitFor(() => expect(pdf.textLayers).toHaveLength(1));
    expect(pdf.textLayers[0]!.container).toBe(pageEl(container, 1).querySelector('[data-slot="pdf-text-layer"]'));
    expect(pdf.textLayers[0]!.container.style.getPropertyValue("--total-scale-factor")).not.toBe("");
    unmount();

    pdf.textLayers = [];
    const second = await renderViewer(<PdfViewer url="/a.pdf" textLayer={false} />);
    showPages(1);
    await waitFor(() => expect(pageEl(second.container, 1)).toHaveAttribute("data-rendered"));
    expect(pdf.textLayers).toHaveLength(0);
    expect(second.container.querySelector('[data-slot="pdf-text-layer"]')).toBeNull();
  });
});

describe("PdfViewer errors", () => {
  it("shows an error with a download link and retries", async () => {
    pdf.fail = Object.assign(new Error("bad"), { name: "InvalidPDFException" });
    const onError = vi.fn();
    render(<PdfViewer url="/files/r.pdf" fileName="r.pdf" onError={onError} />);
    expect(await screen.findByText("Couldn’t display this PDF")).toBeInTheDocument();
    expect(screen.getByText("This file isn’t a valid PDF.")).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(pdf.fail);
    const link = screen.getByRole("link", { name: "Download" });
    expect(link).toHaveAttribute("href", "/files/r.pdf");
    expect(link).toHaveAttribute("download", "r.pdf");

    pdf.fail = null;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("group", { name: "Page navigation" })).toBeInTheDocument();
  });

  it("offers a blob download when the source has no URL", async () => {
    pdf.fail = new Error("boom");
    const create = vi.fn(() => "blob:pdf");
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    render(<PdfViewer blob={new Blob(["x"])} />);
    expect(await screen.findByRole("link", { name: "Download" })).toHaveAttribute("href", "blob:pdf");
  });

  it("accepts a custom error state", async () => {
    pdf.fail = new Error("nope");
    render(<PdfViewer url="/a.pdf" errorState={(error) => <p>Custom: {error.message}</p>} />);
    expect(await screen.findByText("Custom: nope")).toBeInTheDocument();
  });
});

describe("pdfRenderer", () => {
  it("shows PDFs in FileViewer through PdfViewer", async () => {
    const { container } = render(
      <FileViewer inline file={{ name: "r.pdf", url: "/r.pdf" }} renderers={[pdfRenderer({ workerSrc: "/w.mjs" })]} />
    );
    await screen.findByRole("group", { name: "Page navigation" });
    expect(container.querySelector('[data-renderer="custom"]')).toHaveAttribute("data-renderer-label", "PDF viewer");
    expect(container.querySelector("object")).toBeNull();
    expect(pdf.options.workerSrc).toBe("/w.mjs");
    expect(lastDocParams().url).toBe("/r.pdf");
  });

  it("prefers the file's blob over its object URL", async () => {
    const blob = new Blob([new Uint8Array([9])], { type: "application/pdf" });
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() });
    render(<FileViewer inline file={{ name: "r.pdf", blob }} renderers={[pdfRenderer()]} />);
    await screen.findByRole("group", { name: "Page navigation" });
    expect(lastDocParams().url).toBeUndefined();
    expect([...(lastDocParams().data as Uint8Array)]).toEqual([9]);
  });

  it("leaves other files alone", () => {
    const renderer = pdfRenderer();
    expect(renderer.match({ name: "a.pdf" }, "pdf")).toBe(true);
    expect(renderer.match({ name: "a.png" }, "image")).toBe(false);
  });

  it("falls back to the built-in view when pdf.js fails", async () => {
    pdf.fail = new Error("worker failed");
    const { container } = render(<FileViewer inline file={{ name: "r.pdf", url: "/r.pdf" }} renderers={[pdfRenderer()]} />);
    await waitFor(() => expect(container.querySelector('[data-renderer="pdf"]')).not.toBeNull());
    expect(container.querySelector("object")).toHaveAttribute("data", "/r.pdf#view=FitH");
    expect(container.querySelector('[data-renderer="custom"]')).toBeNull();
  });

  it("can fall back to the download card instead", async () => {
    pdf.fail = new Error("worker failed");
    const { container } = render(
      <FileViewer inline file={{ name: "r.pdf", url: "/r.pdf" }} renderers={[pdfRenderer({ fallback: "download" })]} />
    );
    await waitFor(() => expect(container.querySelector('[data-renderer="unknown"]')).not.toBeNull());
  });
});

describe("PdfThumbnail", () => {
  it("waits until near the viewport, then draws the page at the requested width", async () => {
    const onLoad = vi.fn();
    const { container } = render(<PdfThumbnail url="/a.pdf" alt="Q3 report" page={3} width={120} onLoad={onLoad} />);
    const root = screen.getByRole("img", { name: "Q3 report" });
    expect(pdf.getDocument).not.toHaveBeenCalled();
    expect(root.querySelector('[class*="animate-shimmer"]')).not.toBeNull();

    intersect((el) => el === root);
    await waitFor(() => expect(root).toHaveAttribute("data-state", "ready"));
    expect(pdf.getPage).toContain(3);
    expect(pdf.renders.at(-1)!.scale).toBeCloseTo(120 / 600);
    expect(root).toHaveStyle({ width: "120px" });
    expect(onLoad).toHaveBeenCalledWith({ numPages: 12 });
    expect(pdf.tasks.at(-1)!.destroy).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("is decorative without alt and shows a fallback on error", async () => {
    pdf.fail = new Error("bad");
    const onError = vi.fn();
    const { container } = render(<PdfThumbnail url="/a.pdf" lazy={false} onError={onError} />);
    const root = container.querySelector('[data-slot="pdf-thumbnail"]')!;
    expect(root).toHaveAttribute("aria-hidden", "true");
    await waitFor(() => expect(root).toHaveAttribute("data-state", "error"));
    expect(onError).toHaveBeenCalled();
    expect(root.querySelector("canvas")).toBeNull();
    expect(root.querySelector("svg")).not.toBeNull();
  });
});

describe("accessibility", () => {
  it("has no axe violations when loaded, loading or failed", async () => {
    const loaded = await renderViewer(<PdfViewer url="/a.pdf" fileName="r.pdf" actions={<button>Share</button>} />);
    showPages(1, 2);
    await waitFor(() => expect(pageEl(loaded.container, 2)).toHaveAttribute("data-rendered"));
    expect(screen.getByRole("group", { name: "Page 1 of 12" })).toBeInTheDocument();
    expect(await axeViolations(loaded.container)).toEqual([]);
    loaded.unmount();

    const loading = render(<PdfViewer loading />);
    expect(await axeViolations(loading.container)).toEqual([]);
    loading.unmount();

    pdf.fail = new Error("bad");
    const failed = render(<PdfViewer url="/a.pdf" />);
    await screen.findByText("Couldn’t display this PDF");
    expect(await axeViolations(failed.container)).toEqual([]);
  });
});

describe("PdfViewer worker fallback", () => {
  it("retries in the page when the app's worker can't run in this browser", async () => {
    pdf.failOnce = Object.assign(new Error("a.toHex is not a function"), { name: "UnknownErrorException" });
    const onError = vi.fn();
    await renderViewer(<PdfViewer url="/a.pdf" onError={onError} />);
    expect(pdf.getDocument).toHaveBeenCalledTimes(2);
    expect(pdf.tasks[0]!.destroy).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("parsing PDFs in the page instead"), expect.anything());
  });

  it("doesn't retry other errors, and shows their message under Details", async () => {
    pdf.fail = Object.assign(new Error("Invalid PDF structure."), { name: "InvalidPDFException" });
    render(<PdfViewer url="/a.pdf" />);
    expect(await screen.findByText("Details")).toBeInTheDocument();
    expect(screen.getByText("InvalidPDFException: Invalid PDF structure.")).toBeInTheDocument();
    expect(pdf.getDocument).toHaveBeenCalledTimes(1);
    // Without an onError handler the error is also logged.
    expect(warnSpy).toHaveBeenCalledWith("PdfViewer: couldn't open the PDF", pdf.fail);
  });
});

/** The playground's sample: a valid two-page PDF with a correct xref table. */
function samplePdfBytes() {
  const stream = (title: string) => {
    const body = `BT /F1 28 Tf 72 700 Td (${title}) Tj ET`;
    return `<</Length ${body.length}>>\nstream\n${body}\nendstream`;
  };
  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R 5 0 R]/Count 2>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 7 0 R>>>>>>",
    stream("Quarterly report"),
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 6 0 R/Resources<</Font<</F1 7 0 R>>>>>>",
    stream("Page two"),
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(out);
}

describe("PdfViewer with the real pdf.js", () => {
  it("opens a real document through the legacy build with the CSP-safe options", async () => {
    // The real worker code, run in the page (pdf.js's "fake worker"), as the viewer's no-worker fallback does.
    const worker = await vi.importActual<{ WorkerMessageHandler: unknown }>("pdfjs-dist/legacy/build/pdf.worker.mjs");
    (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = { WorkerMessageHandler: worker.WorkerMessageHandler };
    pdf.real = true;
    pdf.options.workerSrc = "";
    const onLoad = vi.fn();
    const onError = vi.fn();
    const bytes = samplePdfBytes();
    const { container } = render(<PdfViewer data={bytes} defaultZoom={1} onLoad={onLoad} onError={onError} />);
    await screen.findByRole("group", { name: "Page navigation" }, { timeout: 5000 });
    expect(onError).not.toHaveBeenCalled();
    expect(onLoad).toHaveBeenCalledWith({ numPages: 2 });
    expect(screen.getByText("/ 2")).toBeInTheDocument();
    // 612 × 792 pt at 100% (4/3 px per pt), measured by the real getViewport.
    expect(pageEl(container, 1)).toHaveStyle({ width: "816px", height: "1056px" });
    // The app's bytes are copied, not transferred to pdf.js.
    expect(bytes.byteLength).toBeGreaterThan(0);
  }, 15000);

  it("renders a page and its text layer with the v5 render parameters", async () => {
    const worker = await vi.importActual<{ WorkerMessageHandler: unknown }>("pdfjs-dist/legacy/build/pdf.worker.mjs");
    (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = { WorkerMessageHandler: worker.WorkerMessageHandler };
    pdf.real = true;
    pdf.options.workerSrc = "";
    // jsdom has no canvas: a recording 2D context that accepts every call pdf.js makes.
    const calls: string[] = [];
    const ctx: Record<string | symbol, unknown> = new Proxy(
      {},
      {
        get(target: Record<string | symbol, unknown>, key) {
          if (key in target) return target[key];
          if (key === "measureText") return () => ({ width: 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
          if (key === "getTransform") return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, is2D: true, isIdentity: true, invertSelf() { return this; } });
          if (key === "getImageData" || key === "createImageData") return (_x: number, _y: number, w = 1, h = 1) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
          if (key === "getLineDash") return () => [];
          if (typeof key === "string" && /^(create|get)/.test(key)) return () => ({ addColorStop() {} });
          return (...args: unknown[]) => {
            calls.push(String(key));
            return args.length ? undefined : undefined;
          };
        },
        set(target, key, value) {
          target[key] = value;
          return true;
        },
      }
    ) as Record<string | symbol, unknown>;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
      ctx.canvas = this;
      return ctx;
    } as never);
    const { container } = render(<PdfViewer data={samplePdfBytes()} defaultZoom={1} />);
    await screen.findByRole("group", { name: "Page navigation" }, { timeout: 5000 });
    showPages(1);
    await waitFor(() => expect(pageEl(container, 1)).toHaveAttribute("data-rendered"), { timeout: 5000 });
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining("failed to render"), expect.anything());
    expect(calls).toContain("fillText");
    const canvas = pageEl(container, 1).querySelector("canvas")!;
    expect(canvas.width).toBe(816);
    const layer = pageEl(container, 1).querySelector('[data-slot="pdf-text-layer"]')!;
    await waitFor(() => expect(layer.textContent).toContain("Quarterly report"));
  }, 15000);
});

describe("root barrel", () => {
  it("keeps the pdf.js module out of the root (optional peer)", () => {
    const script = path.resolve(__dirname, "../scripts/gen-index.mjs");
    const code = `import { planIndex } from ${JSON.stringify(script)}; const p = planIndex(); console.log(JSON.stringify({ excluded: p.excluded, sections: p.sections }));`;
    const { excluded, sections } = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", code], { encoding: "utf8" }));
    expect(excluded).toContainEqual({ id: "kits/editor/pdf-viewer", reason: "imports optional peer pdfjs-dist" });
    expect(sections.flatMap((s: { modules: string[] }) => s.modules)).not.toContain("kits/editor/pdf-viewer");
  });
});
