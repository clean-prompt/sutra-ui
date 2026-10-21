import * as React from "react";
import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { useTheme } from "../src/hooks/use-theme";
import { ThemeToggle } from "../src/patterns/theme-toggle";

const root = document.documentElement;

afterEach(() => {
  cleanup(); // unmount first: resetting <html> below must not reach live subscribers outside act
  root.className = "";
  root.removeAttribute("style");
  delete root.dataset.brand;
  delete root.dataset.neutral;
  delete root.dataset.radius;
  delete root.dataset.style;
  window.localStorage.clear();
});

describe("useTheme shares <html> with every other writer", () => {
  it("a second caller changing one field does not undo the first caller's change", () => {
    const a = renderHook(() => useTheme());
    const b = renderHook(() => useTheme());
    act(() => a.result.current.setTheme({ mode: "dark" }));
    act(() => b.result.current.setTheme({ brand: "rose" }));
    // Before the shared store, `b` rewrote `mode: "light"` from its own stale copy here.
    expect(root.classList.contains("dark")).toBe(true);
    expect(root.dataset.brand).toBe("rose");
    expect(a.result.current.theme).toMatchObject({ mode: "dark", brand: "rose" });
    expect(b.result.current.theme).toMatchObject({ mode: "dark", brand: "rose" });
  });

  it("follows a change made outside React", async () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme.mode).toBe("light");
    act(() => {
      root.classList.add("dark");
      root.dataset.neutral = "slate";
    });
    await waitFor(() => expect(result.current.theme).toMatchObject({ mode: "dark", neutral: "slate" }));
  });

  it("setTheme writes only the given fields and sets color-scheme with the mode", () => {
    root.dataset.brand = "rose";
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme({ mode: "dark" }));
    expect(root.dataset.brand).toBe("rose");
    expect(root.style.colorScheme).toBe("dark");
    act(() => result.current.setTheme({ style: "paper" }));
    expect(root.dataset.style).toBe("paper");
    act(() => result.current.setTheme({ style: undefined }));
    expect(root.dataset.style).toBeUndefined();
  });

  it("`initial` seeds once on mount and no longer overrides the document afterwards", async () => {
    root.dataset.radius = "pill";
    const { result } = renderHook(() => useTheme({ brand: "violet" }));
    await waitFor(() => expect(root.dataset.brand).toBe("violet"));
    expect(result.current.theme).toMatchObject({ brand: "violet", radius: "pill" });
    act(() => {
      root.dataset.brand = "rose";
    });
    await waitFor(() => expect(result.current.theme.brand).toBe("rose"));
  });

  it("the server render uses the defaults plus `initial`, not the document", () => {
    root.dataset.brand = "rose";
    function Probe() {
      const { theme } = useTheme({ radius: "square" });
      return <p>{`${theme.brand}/${theme.radius}`}</p>;
    }
    expect(renderToString(<Probe />)).toContain("indigo/square");
  });
});

describe("ThemeToggle and useTheme agree on the document", () => {
  it("a toggle changes what useTheme reports, and leaves the other fields alone", async () => {
    root.dataset.brand = "rose";
    const theme = renderHook(() => useTheme());
    render(<ThemeToggle modes={["light", "dark"]} defaultValue="light" />);
    await userEvent.click(screen.getByRole("button"));
    expect(root.classList.contains("dark")).toBe(true);
    expect(root.style.colorScheme).toBe("dark");
    expect(theme.result.current.theme).toMatchObject({ mode: "dark", brand: "rose" });
  });

  it("a later useTheme change is not undone when the toggle re-renders", async () => {
    const theme = renderHook(() => useTheme());
    const { rerender } = render(<ThemeToggle modes={["light", "dark"]} defaultValue="light" />);
    act(() => theme.result.current.setTheme({ mode: "dark" }));
    rerender(<ThemeToggle modes={["light", "dark"]} defaultValue="light" className="x" />);
    expect(root.classList.contains("dark")).toBe(true);
  });
});
