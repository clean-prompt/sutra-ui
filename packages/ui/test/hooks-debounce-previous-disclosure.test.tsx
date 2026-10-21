import * as React from "react";
import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useDebouncedValue } from "../src/hooks/use-debounced-value";
import { usePrevious } from "../src/hooks/use-previous";
import { useDisclosure } from "../src/hooks/use-disclosure";
import { Collapse } from "../src/primitives/collapse";

describe("useDebouncedValue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns the first value at once, then follows after the delay and only the last of a burst", () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 200), { initialProps: { v: "a" } });
    expect(result.current).toBe("a");
    rerender({ v: "ab" });
    act(() => void vi.advanceTimersByTime(150));
    rerender({ v: "abc" });
    act(() => void vi.advanceTimersByTime(150));
    expect(result.current).toBe("a");
    act(() => void vi.advanceTimersByTime(60));
    expect(result.current).toBe("abc");
  });

  it("default delay is 300 ms, a changed delay is respected and unmount drops the pending update", () => {
    const { result, rerender, unmount } = renderHook(({ v, d }: { v: number; d?: number }) => useDebouncedValue(v, d), {
      initialProps: { v: 1 } as { v: number; d?: number },
    });
    rerender({ v: 2 });
    act(() => void vi.advanceTimersByTime(299));
    expect(result.current).toBe(1);
    act(() => void vi.advanceTimersByTime(2));
    expect(result.current).toBe(2);
    rerender({ v: 3, d: 50 });
    act(() => void vi.advanceTimersByTime(51));
    expect(result.current).toBe(3);
    rerender({ v: 4, d: 50 });
    unmount();
    expect(() => act(() => void vi.advanceTimersByTime(500))).not.toThrow();
  });

  it("handles objects by identity and a zero delay", () => {
    const a = { n: 1 };
    const b = { n: 2 };
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 0), { initialProps: { v: a } });
    rerender({ v: b });
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBe(b);
  });
});

describe("usePrevious", () => {
  it("is undefined first, then the last different value, stable across unrelated re-renders", () => {
    const { result, rerender } = renderHook(({ v }) => usePrevious(v), { initialProps: { v: 1 } });
    expect(result.current).toBeUndefined();
    rerender({ v: 1 });
    expect(result.current).toBeUndefined();
    rerender({ v: 2 });
    expect(result.current).toBe(1);
    rerender({ v: 2 });
    expect(result.current).toBe(1);
    rerender({ v: 5 });
    expect(result.current).toBe(2);
  });

  it("accepts an initial previous value and works inside StrictMode", () => {
    const { result, rerender } = renderHook(({ v }) => usePrevious(v, 0), {
      initialProps: { v: 10 },
      wrapper: React.StrictMode,
    });
    expect(result.current).toBe(0);
    rerender({ v: 11 });
    expect(result.current).toBe(10);
  });

  it("tells a component which way a value moved", () => {
    function Meter({ n }: { n: number }) {
      const prev = usePrevious(n);
      return <span>{prev === undefined ? "start" : n > prev ? "up" : "down"}</span>;
    }
    const { rerender } = render(<Meter n={1} />);
    expect(screen.getByText("start")).toBeInTheDocument();
    rerender(<Meter n={3} />);
    expect(screen.getByText("up")).toBeInTheDocument();
    rerender(<Meter n={2} />);
    expect(screen.getByText("down")).toBeInTheDocument();
  });
});

describe("useDisclosure", () => {
  it("uncontrolled: open, close, toggle, setOpen, with defaultOpen and a stable API", () => {
    const { result } = renderHook(() => useDisclosure({ defaultOpen: true }));
    expect(result.current.open).toBe(true);
    const { onOpen, onClose, toggle } = result.current;
    act(() => result.current.onClose());
    expect(result.current.open).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);
    act(() => result.current.setOpen(false));
    expect(result.current.open).toBe(false);
    act(() => result.current.onOpen());
    expect(result.current.open).toBe(true);
    expect(result.current.onOpen).toBe(onOpen);
    expect(result.current.onClose).toBe(onClose);
    expect(result.current.toggle).toBe(toggle);
  });

  it("starts closed by default and reports changes through onOpenChange once each", () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() => useDisclosure({ onOpenChange }));
    expect(result.current.open).toBe(false);
    act(() => result.current.onClose());
    expect(onOpenChange).not.toHaveBeenCalled();
    act(() => result.current.onOpen());
    act(() => result.current.toggle());
    expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  });

  it("controlled: follows `open`, reports requests, props spread onto a component", () => {
    const onOpenChange = vi.fn();
    const { result, rerender } = renderHook(({ open }) => useDisclosure({ open, onOpenChange }), { initialProps: { open: false } });
    act(() => result.current.onOpen());
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(result.current.open).toBe(false);
    rerender({ open: true });
    expect(result.current.props).toMatchObject({ open: true });
    act(() => result.current.props.onOpenChange(false));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("drives a Collapse through props", async () => {
    const user = userEvent.setup();
    function Panel() {
      const d = useDisclosure();
      return (
        <>
          <button onClick={d.toggle}>Toggle</button>
          <Collapse open={d.open}>Content</Collapse>
        </>
      );
    }
    const { container } = render(<Panel />);
    const root = container.querySelector("[data-slot=collapse]") as HTMLElement;
    expect(root.dataset.state).toBe("closed");
    await user.click(screen.getByRole("button", { name: "Toggle" }));
    expect(root.dataset.state).toBe("open");
  });
});
