/**
 * Wave 7 group B, hydration: ThemeToggle, SplitPane and useShortcutPlatform / ShortcutKeys render the server-safe default on the
 * server AND on the first client render, then settle on the browser value (saved mode, saved size, Mac glyphs) before paint.
 * The server HTML is made with a clean browser, then the browser state is set and the same tree is hydrated: no recoverable
 * error and no "didn't match" console error.
 */
import * as React from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "../src/patterns/theme-toggle";
import { SplitPane, SplitPaneHandle, SplitPanePanel } from "../src/patterns/split-pane";
import { ShortcutKeys } from "../src/primitives/shortcut-keys";
import { ShortcutProvider } from "../src/patterns/shortcuts";

async function hydrate(html: string, ui: React.ReactElement) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  const onRecoverableError = vi.fn();
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  let app: ReturnType<typeof hydrateRoot> | undefined;
  await act(async () => {
    app = hydrateRoot(host, ui, { onRecoverableError });
  });
  const errors = consoleError.mock.calls.map((c) => String(c[0]));
  return {
    host,
    onRecoverableError,
    errors,
    cleanup: () => {
      act(() => app?.unmount());
      host.remove();
    },
  };
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "";
});
afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("ThemeToggle hydration", () => {
  it("hydrates the server default, then restores the saved mode without calling onValueChange or overwriting storage", async () => {
    const ui = (onValueChange?: (m: string) => void) => <ThemeToggle onValueChange={onValueChange} />;
    const html = renderToString(ui());
    expect(html).toContain('data-mode="system"');

    window.localStorage.setItem("sutra-theme", "dark");
    const onValueChange = vi.fn();
    const run = await hydrate(html, ui(onValueChange));
    expect(run.onRecoverableError).not.toHaveBeenCalled();
    expect(run.errors.filter((e) => /match|hydrat/i.test(e))).toEqual([]);
    const button = run.host.querySelector("button")!;
    expect(button.dataset.mode).toBe("dark");
    expect(button.getAttribute("aria-label")).toContain("Theme: Dark");
    expect(window.localStorage.getItem("sutra-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(onValueChange).not.toHaveBeenCalled();

    // a user change still reports and persists
    await act(async () => button.click());
    expect(onValueChange).toHaveBeenCalledWith("system");
    expect(window.localStorage.getItem("sutra-theme")).toBe("system");
    run.cleanup();
  });

  it("with no saved mode it keeps defaultValue and persists it", async () => {
    const html = renderToString(<ThemeToggle defaultValue="light" />);
    const run = await hydrate(html, <ThemeToggle defaultValue="light" />);
    expect(run.onRecoverableError).not.toHaveBeenCalled();
    expect(run.host.querySelector("button")!.dataset.mode).toBe("light");
    expect(window.localStorage.getItem("sutra-theme")).toBe("light");
    run.cleanup();
  });

  it("two-state toggle with no default reads a dark page after mount", async () => {
    const ui = <ThemeToggle modes={["light", "dark"]} />;
    const html = renderToString(ui);
    expect(html).toContain('data-mode="light"');
    document.documentElement.classList.add("dark");
    const run = await hydrate(html, ui);
    expect(run.onRecoverableError).not.toHaveBeenCalled();
    expect(run.host.querySelector("button")!.dataset.mode).toBe("dark");
    run.cleanup();
  });
});

describe("SplitPane hydration", () => {
  const Split = ({ onSizeChange }: { onSizeChange?: (n: number) => void }) => (
    <SplitPane storageKey="w7-split" defaultSize={50} onSizeChange={onSizeChange}>
      <SplitPanePanel label="A">A</SplitPanePanel>
      <SplitPaneHandle />
      <SplitPanePanel label="B">B</SplitPanePanel>
    </SplitPane>
  );

  it("hydrates at defaultSize, then restores the saved size without calling onSizeChange", async () => {
    const html = renderToString(<Split />);
    expect(html).toContain('aria-valuenow="50"');
    window.localStorage.setItem("w7-split", "35");
    const onSizeChange = vi.fn();
    const run = await hydrate(html, <Split onSizeChange={onSizeChange} />);
    expect(run.onRecoverableError).not.toHaveBeenCalled();
    expect(run.errors.filter((e) => /match|hydrat/i.test(e))).toEqual([]);
    const sep = run.host.querySelector('[role="separator"]')!;
    expect(sep.getAttribute("aria-valuenow")).toBe("35");
    expect(onSizeChange).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("w7-split")).toBe("35");
    run.cleanup();
  });
});

describe("useShortcutPlatform hydration", () => {
  it("ShortcutKeys hydrates the non-Mac labels on a Mac browser, then shows the glyphs", async () => {
    const ui = <ShortcutKeys keys="mod+shift+k" />;
    const html = renderToString(ui);
    expect(html).toContain("Ctrl");
    vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
    const run = await hydrate(html, ui);
    expect(run.onRecoverableError).not.toHaveBeenCalled();
    expect(run.errors.filter((e) => /match|hydrat/i.test(e))).toEqual([]);
    expect(run.host.textContent).toContain("⌘");
    expect(run.host.textContent).not.toContain("Ctrl");
    run.cleanup();
  });

  it("inside a ShortcutProvider that detects the platform itself it hydrates the same way", async () => {
    const ui = (
      <ShortcutProvider>
        <ShortcutKeys keys="mod+k" />
      </ShortcutProvider>
    );
    const html = renderToString(ui);
    expect(html).toContain("Ctrl");
    vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
    const run = await hydrate(html, ui);
    expect(run.onRecoverableError).not.toHaveBeenCalled();
    expect(run.errors.filter((e) => /match|hydrat/i.test(e))).toEqual([]);
    expect(run.host.textContent).toContain("⌘");
    run.cleanup();
  });

  it("a provider platform still wins from the first render", () => {
    const html = renderToString(
      <ShortcutProvider platform="mac">
        <ShortcutKeys keys="mod+k" />
      </ShortcutProvider>
    );
    expect(html).toContain("⌘");
  });
});
