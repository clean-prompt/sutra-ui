import * as React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mergeRefs } from "../src/lib/refs";
import { useMergedRefs } from "../src/hooks/use-merged-refs";

type Div = HTMLDivElement;

function Merged({ a, b, c }: { a?: React.Ref<Div>; b?: React.Ref<Div>; c?: React.Ref<Div> }) {
  const ref = useMergedRefs<Div>(a, b, c);
  return <div ref={ref} data-testid="x" />;
}

/** a cleanup-style ref that records its calls */
function cleanupRef() {
  const calls: (Div | null)[] = [];
  const cleanup = vi.fn();
  const ref = (el: Div | null) => {
    calls.push(el);
    return cleanup;
  };
  return { ref, calls, cleanup };
}

describe("mergeRefs with React 19 cleanup refs", () => {
  it("runs a cleanup-returning ref's cleanup on unmount and never calls it with null", () => {
    const { ref, calls, cleanup } = cleanupRef();
    const { unmount, getByTestId } = render(<Merged a={ref} />);
    const el = getByTestId("x");
    expect(calls).toEqual(expect.arrayContaining([el]));
    expect(cleanup).toHaveBeenCalledTimes(calls.length - 1); // StrictMode re-attach ran earlier cleanups
    const before = cleanup.mock.calls.length;
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(before + 1);
    expect(calls).not.toContain(null);
  });

  it("still gives a plain callback ref the element and then null", () => {
    const cb = vi.fn();
    const { unmount, getByTestId } = render(<Merged a={cb} />);
    const el = getByTestId("x");
    expect(cb).toHaveBeenCalledWith(el);
    unmount();
    expect(cb).toHaveBeenLastCalledWith(null);
  });

  it("sets and clears an object ref", () => {
    const obj = React.createRef<Div>();
    const { unmount, getByTestId } = render(<Merged a={obj} />);
    expect(obj.current).toBe(getByTestId("x"));
    unmount();
    expect(obj.current).toBeNull();
  });

  it("handles mixed refs together (cleanup, plain, object)", () => {
    const { ref, calls, cleanup } = cleanupRef();
    const plain = vi.fn();
    const obj = React.createRef<Div>();
    const { unmount, getByTestId } = render(<Merged a={ref} b={plain} c={obj} />);
    const el = getByTestId("x");
    expect(obj.current).toBe(el);
    expect(plain).toHaveBeenLastCalledWith(el);
    const cleanups = cleanup.mock.calls.length;
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(cleanups + 1);
    expect(calls).not.toContain(null);
    expect(plain).toHaveBeenLastCalledWith(null);
    expect(obj.current).toBeNull();
  });

  it("detaches the old ref and attaches the new one on a swap", () => {
    const first = cleanupRef();
    const second = cleanupRef();
    const obj = React.createRef<Div>();
    const { rerender, unmount, getByTestId } = render(<Merged a={first.ref} b={obj} />);
    const el = getByTestId("x");
    const firstCleanups = first.cleanup.mock.calls.length;
    rerender(<Merged a={second.ref} b={obj} />);
    expect(first.cleanup).toHaveBeenCalledTimes(firstCleanups + 1);
    expect(first.calls).not.toContain(null);
    expect(second.calls.at(-1)).toBe(el);
    expect(obj.current).toBe(el);
    const secondCleanups = second.cleanup.mock.calls.length;
    unmount();
    expect(second.cleanup).toHaveBeenCalledTimes(secondCleanups + 1);
    expect(obj.current).toBeNull();
  });

  it("balances attach and detach under StrictMode", () => {
    const attach = vi.fn();
    const detach = vi.fn();
    const ref = (el: Div | null) => {
      if (el) attach();
      return () => detach();
    };
    const { unmount } = render(
      <React.StrictMode>
        <Merged a={ref} />
      </React.StrictMode>
    );
    unmount();
    expect(attach).toHaveBeenCalled();
    expect(detach).toHaveBeenCalledTimes(attach.mock.calls.length);
  });

  it("returns nothing when no inner ref returns a cleanup", () => {
    const merged = mergeRefs<Div>(vi.fn(), React.createRef<Div>(), undefined);
    expect(merged(document.createElement("div") as Div)).toBeUndefined();
  });

  it("keeps the merged identity stable while the refs are stable", () => {
    const seen: React.RefCallback<Div>[] = [];
    function Probe({ a }: { a: React.Ref<Div> }) {
      seen.push(useMergedRefs<Div>(a));
      return null;
    }
    const a = React.createRef<Div>();
    const { rerender } = render(<Probe a={a} />);
    rerender(<Probe a={a} />);
    expect(seen.at(-1)).toBe(seen.at(-2));
  });
});
