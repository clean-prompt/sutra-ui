import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useFollowListProp } from "../src/hooks/use-follow-list-prop";

describe("useFollowListProp", () => {
  const setup = (initial: readonly string[] | undefined, enabled = true) => {
    const setLocal = vi.fn();
    const view = renderHook(({ prop, on }) => useFollowListProp(prop, setLocal, on), { initialProps: { prop: initial, on: enabled } });
    return { setLocal, ...view };
  };

  it("leaves the initial value alone", () => {
    const { setLocal } = setup(["a", "b"]);
    expect(setLocal).not.toHaveBeenCalled();
  });

  it("copies a new array into the local state, never the prop itself", () => {
    const { setLocal, rerender } = setup(["a"]);
    const next = ["a", "b"];
    rerender({ prop: next, on: true });
    expect(setLocal).toHaveBeenCalledTimes(1);
    expect(setLocal.mock.calls[0]![0]).toEqual(["a", "b"]);
    expect(setLocal.mock.calls[0]![0]).not.toBe(next);
  });

  it("treats a new array with the same elements as unchanged (an inline literal is fine)", () => {
    const { setLocal, rerender } = setup(["a", "b"]);
    rerender({ prop: ["a", "b"], on: true });
    expect(setLocal).not.toHaveBeenCalled();
  });

  it("follows a change of order or length", () => {
    const { setLocal, rerender } = setup(["a", "b"]);
    rerender({ prop: ["b", "a"], on: true });
    rerender({ prop: ["b"], on: true });
    expect(setLocal).toHaveBeenCalledTimes(2);
  });

  it("does nothing while disabled (a change handler owns the state) or when the prop is undefined", () => {
    const off = setup(["a"], false);
    off.rerender({ prop: ["z"], on: false });
    expect(off.setLocal).not.toHaveBeenCalled();
    const none = setup(["a"]);
    none.rerender({ prop: undefined, on: true });
    expect(none.setLocal).not.toHaveBeenCalled();
  });
});
