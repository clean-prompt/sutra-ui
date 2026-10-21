import * as React from "react";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RangeSlider, Slider } from "../src/primitives/slider";
import { useTheme } from "../src/hooks/use-theme";
import { useOnlineStatus } from "../src/hooks/use-online-status";
import { TallyCounter } from "../src/patterns/tally-counter";
import { axeViolations } from "./helpers/a11y";

describe("Slider ref and className", () => {
  it("lands ref and className on the same outer element", async () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(
      <Slider ref={ref} className="slider-under-test" marks={[0, 50, 100]} defaultValue={[40]} thumbLabels={["Volume"]} />
    );
    const outer = container.firstElementChild as HTMLElement;
    expect(outer).toHaveClass("slider-under-test");
    expect(ref.current).toBe(outer);
    // The marks still sit inside the same outer element.
    expect(outer.contains(screen.getByRole("slider", { name: "Volume" }))).toBe(true);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("RangeSlider forwards the ref to the outer element too", () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(<RangeSlider ref={ref} className="range-under-test" />);
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current).toHaveClass("range-under-test");
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });
});

describe("useTheme keeps a theme set before hydration", () => {
  const root = document.documentElement;
  afterEach(() => {
    root.className = "";
    delete root.dataset.brand;
    delete root.dataset.neutral;
    delete root.dataset.radius;
  });

  it("reads the existing <html> attributes and writes nothing on mount", () => {
    root.classList.add("dark");
    root.dataset.brand = "rose";
    root.dataset.neutral = "slate";
    root.dataset.radius = "pill";
    const observer = new MutationObserver(() => {});
    observer.observe(root, { attributes: true });
    const { result } = renderHook(() => useTheme());
    const writes = observer.takeRecords();
    observer.disconnect();
    expect(result.current.theme).toEqual({ mode: "dark", brand: "rose", neutral: "slate", radius: "pill" });
    expect(writes).toEqual([]);
    expect(root.classList.contains("dark")).toBe(true);
    expect(root.dataset.brand).toBe("rose");
  });

  it("fills missing or unknown attributes from defaults and lets `initial` win", () => {
    root.classList.add("dark");
    root.dataset.brand = "not-a-brand";
    const { result } = renderHook(() => useTheme({ radius: "square" }));
    expect(result.current.theme).toEqual({ mode: "dark", brand: "indigo", neutral: "zinc", radius: "square" });
    expect(root.classList.contains("dark")).toBe(true);
    expect(root.dataset.brand).toBe("indigo");
    expect(root.dataset.radius).toBe("square");

    act(() => result.current.setTheme({ mode: "light" }));
    expect(root.classList.contains("dark")).toBe(false);
  });
});

describe("useOnlineStatus hydration", () => {
  afterEach(() => vi.restoreAllMocks());

  function Status() {
    return <span>{useOnlineStatus() ? "online" : "offline"}</span>;
  }

  it("renders online on the server and hydrates without a mismatch, then shows the real state", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const html = renderToString(<Status />);
    expect(html).toContain("online");
    expect(html).not.toContain("offline");

    const host = document.createElement("div");
    host.innerHTML = html;
    document.body.appendChild(host);
    const onRecoverableError = vi.fn();
    let app: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      app = hydrateRoot(host, <Status />, { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(host.textContent).toBe("offline");

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    expect(host.textContent).toBe("online");
    act(() => app?.unmount());
    host.remove();
  });
});

describe("TallyCounter with max < min", () => {
  it("treats swapped bounds as a range instead of sticking at max", async () => {
    const onValueChange = vi.fn();
    const { container } = render(<TallyCounter min={10} max={5} defaultValue={7} onValueChange={onValueChange} showLog={false} />);
    const output = container.querySelector("[data-tally-value]")!;
    const inc = screen.getByRole("button", { name: "Increase by 1" });
    const dec = screen.getByRole("button", { name: "Decrease by 1" });
    expect(inc).toBeEnabled();
    expect(dec).toBeEnabled();

    fireEvent.click(inc);
    expect(output).toHaveTextContent("8");
    fireEvent.click(inc);
    fireEvent.click(inc);
    fireEvent.click(inc);
    expect(output).toHaveTextContent("10");
    expect(inc).toBeDisabled();

    for (let i = 0; i < 6; i++) fireEvent.click(dec);
    expect(output).toHaveTextContent("5");
    expect(dec).toBeDisabled();
    expect(onValueChange).toHaveBeenLastCalledWith(5);
    expect(await axeViolations(container)).toEqual([]);
  });
});
