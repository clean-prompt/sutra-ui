/**
 * usePresence, Presence and AnimatedList: the enter / idle / exit state machine (fake timers), the DOM contract
 * (data-state, data-presence, inert, aria-hidden), reduced motion, StrictMode (every test renders inside it).
 */
import * as React from "react";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePresence } from "../src/hooks/use-presence";
import { Presence } from "../src/patterns/presence";
import { AnimatedList } from "../src/patterns/animated-list";
import { axeViolations } from "./helpers/a11y";
import { reduceMotion, resetMedia } from "./helpers/media";

beforeEach(() => {
  vi.useFakeTimers();
  reduceMotion(false);
});
afterEach(() => {
  vi.useRealTimers();
  resetMedia();
});

const idOf = (s: string) => s;
const states = (rows: { key: string; state: string }[]) => rows.map((r) => `${r.key}:${r.state}`);

describe("usePresence", () => {
  const setup = (initialItems: string[], options?: Parameters<typeof usePresence<string>>[2]) =>
    renderHook(({ items }) => usePresence(items, idOf, options), { initialProps: { items: initialItems } });

  it("the first render is idle for everyone, or enter with `initial`", () => {
    expect(states(setup(["a", "b"]).result.current)).toEqual(["a:idle", "b:idle"]);
    expect(states(setup(["a", "b"], { initial: true }).result.current)).toEqual(["a:enter", "b:enter"]);
  });

  it("a new item enters, and is idle on the next render (or stays entering with holdEnter)", () => {
    const { result, rerender } = setup(["a"]);
    rerender({ items: ["a", "b"] });
    expect(states(result.current)).toEqual(["a:idle", "b:enter"]);
    rerender({ items: ["a", "b"] });
    expect(states(result.current)).toEqual(["a:idle", "b:idle"]);

    const held = setup(["a"], { holdEnter: true });
    held.rerender({ items: ["a", "b"] });
    held.rerender({ items: ["a", "b"] });
    held.rerender({ items: ["a", "b", "c"] });
    expect(states(held.result.current)).toEqual(["a:idle", "b:enter", "c:enter"]);
    held.rerender({ items: ["a", "c"] }); // b leaves
    expect(states(held.result.current)).toEqual(["a:idle", "b:exit", "c:enter"]);
  });

  it("a removed item stays in its place as exit for exitDuration, then goes", () => {
    const { result, rerender } = setup(["a", "b", "c"], { exitDuration: 300 });
    rerender({ items: ["a", "c"] });
    expect(states(result.current)).toEqual(["a:idle", "b:exit", "c:idle"]);
    act(() => void vi.advanceTimersByTime(299));
    expect(states(result.current)).toEqual(["a:idle", "b:exit", "c:idle"]);
    act(() => void vi.advanceTimersByTime(1));
    expect(states(result.current)).toEqual(["a:idle", "c:idle"]);
  });

  it("defaults the exit to 200 ms, the speed token", () => {
    const { result, rerender } = setup(["a", "b"]);
    rerender({ items: ["a"] });
    act(() => void vi.advanceTimersByTime(199));
    expect(result.current).toHaveLength(2);
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toHaveLength(1);
  });

  it("a key that comes back while exiting is present once, entering again, and stays after the timer", () => {
    const { result, rerender } = setup(["a", "b"]);
    rerender({ items: ["a"] });
    act(() => void vi.advanceTimersByTime(100));
    rerender({ items: ["a", "b"] });
    expect(states(result.current)).toEqual(["a:idle", "b:enter"]);
    act(() => void vi.advanceTimersByTime(500)); // the cancelled exit timer must not remove it
    rerender({ items: ["a", "b"] });
    expect(states(result.current)).toEqual(["a:idle", "b:idle"]);
  });

  it("rapid updates do not strand a row in exit: every removal has its own timer", () => {
    const { result, rerender } = setup(["a", "b", "c", "d"]);
    rerender({ items: ["b", "c", "d"] });
    act(() => void vi.advanceTimersByTime(50));
    rerender({ items: ["c", "d"] });
    act(() => void vi.advanceTimersByTime(50));
    rerender({ items: ["d"] });
    expect(states(result.current)).toEqual(["a:exit", "b:exit", "c:exit", "d:idle"]);
    act(() => void vi.advanceTimersByTime(100)); // t=200: a is due
    expect(states(result.current)).toEqual(["b:exit", "c:exit", "d:idle"]);
    act(() => void vi.advanceTimersByTime(50)); // t=250: b
    expect(states(result.current)).toEqual(["c:exit", "d:idle"]);
    act(() => void vi.advanceTimersByTime(50)); // t=300: c
    expect(states(result.current)).toEqual(["d:idle"]);
  });

  it("an item added after another one left still gets its own entrance (an id may be reused)", () => {
    const { result, rerender } = setup(["a"]);
    rerender({ items: [] });
    act(() => void vi.advanceTimersByTime(300));
    expect(result.current).toEqual([]);
    rerender({ items: ["a"] });
    expect(states(result.current)).toEqual(["a:enter"]);
  });

  it("clears its timers on unmount", () => {
    const { rerender, unmount } = setup(["a", "b"]);
    rerender({ items: ["a"] });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("under reduced motion nothing enters or exits: removal is immediate and there is no exit state", () => {
    reduceMotion(true);
    const { result, rerender } = setup(["a", "b"], { initial: true });
    expect(states(result.current)).toEqual(["a:idle", "b:idle"]);
    rerender({ items: ["a", "b", "c"] });
    expect(states(result.current)).toEqual(["a:idle", "b:idle", "c:idle"]);
    rerender({ items: ["a"] });
    expect(states(result.current)).toEqual(["a:idle"]);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("Presence", () => {
  const Box = ({ present, ...rest }: { present: boolean; initial?: boolean; exitDuration?: number; onExited?: () => void }) => (
    <Presence present={present} {...rest}>
      <div data-testid="box" className="data-[presence=enter]:animate-pop-in data-[presence=exit]:animate-fade-out">
        hello
      </div>
    </Presence>
  );

  it("renders nothing while absent and the child (idle, open) when present on mount", () => {
    const { rerender } = render(<Box present={false} />);
    expect(screen.queryByTestId("box")).toBeNull();
    rerender(<Box present />);
    // turning on later is an entrance
    expect(screen.getByTestId("box")).toHaveAttribute("data-presence", "enter");
    expect(screen.getByTestId("box")).toHaveAttribute("data-state", "open");
    expect(screen.getByTestId("box")).not.toHaveAttribute("inert");
  });

  it("is idle on first render unless `initial`", () => {
    const first = render(<Box present />);
    expect(screen.getByTestId("box")).toHaveAttribute("data-presence", "idle");
    first.unmount();
    render(<Box present initial />);
    expect(screen.getByTestId("box")).toHaveAttribute("data-presence", "enter");
  });

  it("keeps the child as exit (closed, inert, aria-hidden) until exitDuration, then removes it and calls onExited once", () => {
    const onExited = vi.fn();
    const { rerender } = render(<Box present exitDuration={250} onExited={onExited} />);
    rerender(<Box present={false} exitDuration={250} onExited={onExited} />);
    const box = screen.getByTestId("box");
    expect(box).toHaveAttribute("data-state", "closed");
    expect(box).toHaveAttribute("data-presence", "exit");
    expect(box).toHaveAttribute("inert");
    expect(box).toHaveAttribute("aria-hidden", "true");
    act(() => void vi.advanceTimersByTime(249));
    expect(screen.queryByTestId("box")).not.toBeNull();
    expect(onExited).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1));
    expect(screen.queryByTestId("box")).toBeNull();
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it("is removed early by its own animationend, not by one from a descendant", () => {
    const onExited = vi.fn();
    const { rerender } = render(
      <Presence present onExited={onExited}>
        <div data-testid="box">
          <span data-testid="inner" />
        </div>
      </Presence>
    );
    rerender(
      <Presence present={false} onExited={onExited}>
        <div data-testid="box">
          <span data-testid="inner" />
        </div>
      </Presence>
    );
    fireEvent.animationEnd(screen.getByTestId("inner"));
    expect(screen.queryByTestId("box")).not.toBeNull();
    fireEvent.animationEnd(screen.getByTestId("box"));
    expect(screen.queryByTestId("box")).toBeNull();
    expect(onExited).toHaveBeenCalledTimes(1);
    act(() => void vi.advanceTimersByTime(1000));
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it("coming back while exiting cancels the removal", () => {
    const onExited = vi.fn();
    const { rerender } = render(<Box present onExited={onExited} />);
    rerender(<Box present={false} onExited={onExited} />);
    act(() => void vi.advanceTimersByTime(100));
    rerender(<Box present onExited={onExited} />);
    expect(screen.getByTestId("box")).toHaveAttribute("data-presence", "enter");
    expect(screen.getByTestId("box")).not.toHaveAttribute("inert");
    act(() => void vi.advanceTimersByTime(1000));
    expect(screen.queryByTestId("box")).not.toBeNull();
    expect(onExited).not.toHaveBeenCalled();
  });

  it("under reduced motion mounts and unmounts at once, with no enter or exit state", () => {
    reduceMotion(true);
    const onExited = vi.fn();
    const { rerender } = render(<Box present={false} initial onExited={onExited} />);
    rerender(<Box present initial onExited={onExited} />);
    expect(screen.getByTestId("box")).toHaveAttribute("data-presence", "idle");
    rerender(<Box present={false} initial onExited={onExited} />);
    expect(screen.queryByTestId("box")).toBeNull();
    expect(onExited).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("leaves no timer behind once it has gone, and passes the child's own props through", () => {
    const { rerender } = render(
      <Presence present>
        <button type="button" data-testid="b" className="x" onClick={() => {}}>
          go
        </button>
      </Presence>
    );
    expect(screen.getByTestId("b")).toHaveClass("x");
    rerender(
      <Presence present={false}>
        <button type="button" data-testid="b" className="x" onClick={() => {}}>
          go
        </button>
      </Presence>
    );
    act(() => void vi.advanceTimersByTime(300));
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("AnimatedList", () => {
  type Task = { id: string; title: string };
  const t = (...ids: string[]): Task[] => ids.map((id) => ({ id, title: `Task ${id}` }));
  const List = ({ items, ...rest }: { items: Task[] } & Partial<React.ComponentProps<typeof AnimatedList<Task>>>) => (
    <AnimatedList<Task> aria-label="Tasks" items={items} getKey={(x) => x.id} renderItem={(x) => <span>{x.title}</span>} {...rest} />
  );
  const rowOf = (name: string) => screen.getByText(name).closest("[data-slot=animated-list-item]") as HTMLElement;

  it("renders a ul > li structure; the first render does not animate", () => {
    render(<List items={t("a", "b")} />);
    const list = screen.getByRole("list", { name: "Tasks" });
    expect(list.tagName).toBe("UL");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    for (const li of screen.getAllByRole("listitem")) {
      expect(li).toHaveAttribute("data-presence", "idle");
      expect(li.className).not.toContain("animate-pop-in");
    }
  });

  it("can be an ol or a div with div rows", () => {
    const { rerender } = render(<List items={t("a")} as="ol" />);
    expect(screen.getByRole("list").tagName).toBe("OL");
    rerender(<List items={t("a")} as="div" />);
    expect(screen.queryByRole("list")).toBeNull();
    expect(rowOf("Task a").tagName).toBe("DIV");
  });

  it("an added row enters with animate-pop-in and keeps its class when other rows arrive later", () => {
    const { rerender } = render(<List items={t("a")} />);
    rerender(<List items={t("a", "b")} />);
    expect(rowOf("Task b")).toHaveAttribute("data-presence", "enter");
    expect(rowOf("Task b").className).toContain("animate-pop-in");
    expect(rowOf("Task a").className).not.toContain("animate-pop-in");
    rerender(<List items={t("a", "b", "c")} />);
    expect(rowOf("Task b").className).toContain("animate-pop-in"); // not cut by the next update
  });

  it("rows added together are staggered by position; a row keeps the position it entered with", () => {
    const { rerender } = render(<List items={t("a")} />);
    rerender(<List items={t("a", "b", "c", "d")} />);
    expect(rowOf("Task b").style.getPropertyValue("--i")).toBe("0");
    expect(rowOf("Task c").style.getPropertyValue("--i")).toBe("1");
    expect(rowOf("Task d").style.getPropertyValue("--i")).toBe("2");
    expect(rowOf("Task a").style.getPropertyValue("--i")).toBe("");
    rerender(<List items={t("a", "b", "c", "d", "e")} />);
    expect(rowOf("Task c").style.getPropertyValue("--i")).toBe("1"); // unchanged: a new delay would replay it
    expect(rowOf("Task e").style.getPropertyValue("--i")).toBe("0");
    rerender(<List items={t("a", "b", "c", "d", "e")} stagger={false} />);
    expect(rowOf("Task c").style.getPropertyValue("--i")).toBe("");
  });

  it("a removed row leaves in place: closed, inert, aria-hidden, collapsing, then gone", () => {
    const { rerender } = render(<List items={t("a", "b", "c")} exitDuration={240} />);
    rerender(<List items={t("a", "c")} exitDuration={240} />);
    const gone = rowOf("Task b");
    expect(gone).toHaveAttribute("data-state", "closed");
    expect(gone).toHaveAttribute("data-presence", "exit");
    expect(gone).toHaveAttribute("inert");
    expect(gone).toHaveAttribute("aria-hidden", "true");
    expect(gone.className).toContain("animate-fade-out");
    expect(gone.className).toContain("grid-rows-[0fr]");
    // the exiting row is out of the accessibility tree at once
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Task a", "Task c"]);
    act(() => void vi.advanceTimersByTime(240));
    expect(screen.queryByText("Task b")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('collapse="width" closes a chip row sideways instead of vertically', () => {
    const { rerender } = render(<List items={t("a", "b")} as="div" collapse="width" />);
    expect(rowOf("Task a").className).toContain("grid-cols-[1fr]");
    expect(rowOf("Task a").className).not.toContain("grid-rows");
    rerender(<List items={t("a")} as="div" collapse="width" />);
    expect(rowOf("Task b").className).toContain("grid-cols-[0fr]");
    expect(rowOf("Task b").className).toContain("transition-[grid-template-columns]");
    expect(rowOf("Task b").firstElementChild).toHaveClass("overflow-hidden");
  });

  it("a row that leaves and returns before it is gone is one row, entering again", () => {
    const { rerender } = render(<List items={t("a", "b")} />);
    rerender(<List items={t("a")} />);
    act(() => void vi.advanceTimersByTime(80));
    rerender(<List items={t("a", "b")} />);
    expect(screen.getAllByText("Task b")).toHaveLength(1);
    expect(rowOf("Task b")).toHaveAttribute("data-presence", "enter");
    expect(rowOf("Task b")).not.toHaveAttribute("inert");
    act(() => void vi.advanceTimersByTime(500));
    expect(screen.getAllByText("Task b")).toHaveLength(1);
  });

  it("collapse={false} renders the content straight in the wrapper", () => {
    render(<List items={t("a")} collapse={false} />);
    expect(rowOf("Task a").className).not.toContain("grid");
    expect(rowOf("Task a").firstElementChild!.tagName).toBe("SPAN");
  });

  it("passes the state and index to renderItem, forwards ref and props, and takes itemClassName", () => {
    const seen: string[] = [];
    const ref = React.createRef<HTMLElement>();
    const { rerender } = render(
      <List ref={ref} id="tasks" data-x="1" itemClassName="row" items={t("a")} renderItem={(x, state, i) => (seen.push(`${x.id}:${state}:${i}`), x.title)} />
    );
    expect(ref.current?.tagName).toBe("UL");
    expect(ref.current).toHaveAttribute("id", "tasks");
    expect(ref.current).toHaveAttribute("data-x", "1");
    expect(rowOf("Task a")).toHaveClass("row");
    rerender(<List ref={ref} items={t("a", "b")} renderItem={(x, state, i) => (seen.push(`${x.id}:${state}:${i}`), x.title)} />);
    expect(seen).toContain("b:enter:1");
  });

  it("under reduced motion rows come and go at once", () => {
    reduceMotion(true);
    const { rerender } = render(<List items={t("a", "b")} />);
    rerender(<List items={t("a", "b", "c")} />);
    expect(rowOf("Task c")).toHaveAttribute("data-presence", "idle");
    expect(rowOf("Task c").className).not.toContain("animate-pop-in");
    rerender(<List items={t("a")} />);
    expect(screen.queryByText("Task b")).toBeNull();
    expect(screen.queryByText("Task c")).toBeNull();
  });

  it("is axe clean while a row is leaving", async () => {
    vi.useRealTimers();
    const { container, rerender } = render(<List items={t("a", "b")} />);
    rerender(<List items={t("a")} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
