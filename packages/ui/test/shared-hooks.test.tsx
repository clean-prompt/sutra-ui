import * as React from "react";
import { render, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mergeRefs } from "../src/lib/refs";
import { useMergedRefs } from "../src/hooks/use-merged-refs";
import { useObjectUrl, useObjectUrlState } from "../src/hooks/use-object-url";

describe("mergeRefs / useMergedRefs", () => {
  it("writes the node to callback and object refs, and clears them", () => {
    const obj = React.createRef<HTMLDivElement>();
    const cb = vi.fn();
    const { unmount } = render(<div ref={mergeRefs(obj, cb, undefined)} />);
    expect(obj.current).toBeInstanceOf(HTMLDivElement);
    expect(cb).toHaveBeenLastCalledWith(obj.current);
    unmount();
    expect(obj.current).toBeNull();
    expect(cb).toHaveBeenLastCalledWith(null);
  });

  it("keeps a stable identity while the refs are the same", () => {
    const a = React.createRef<HTMLDivElement>();
    const { result, rerender } = renderHook(({ r }) => useMergedRefs(r), { initialProps: { r: a } });
    const first = result.current;
    rerender({ r: a });
    expect(result.current).toBe(first);
    rerender({ r: React.createRef<HTMLDivElement>() });
    expect(result.current).not.toBe(first);
  });
});

describe("useObjectUrl", () => {
  it("creates a URL for a blob and revokes it on change and unmount", () => {
    // jsdom has no object URLs; stub them for the test.
    let n = 0;
    const create = vi.fn(() => `blob:test-${++n}`);
    const revoke = vi.fn();
    const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const a = new Blob(["a"]);
    const b = new Blob(["b"]);
    const { result, rerender, unmount } = renderHook(({ s }) => useObjectUrl(s), { initialProps: { s: a as Blob | null } });
    const urlA = result.current;
    expect(urlA).toMatch(/^blob:/);
    rerender({ s: b });
    expect(revoke).toHaveBeenCalledWith(urlA);
    const urlB = result.current;
    rerender({ s: null });
    expect(result.current).toBeUndefined();
    expect(revoke).toHaveBeenCalledWith(urlB);
    unmount();
    // StrictMode double-mount creates and revokes balanced URLs.
    expect(create.mock.calls.length).toBe(revoke.mock.calls.length);
    Object.assign(URL, { createObjectURL: original.create, revokeObjectURL: original.revoke });
  });

  it("never returns a revoked URL for a new source, and settles without createObjectURL", () => {
    let n = 0;
    const revoked = new Set<string>();
    const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    Object.assign(URL, { createObjectURL: () => `blob:t-${++n}`, revokeObjectURL: (u: string) => revoked.add(u) });
    const a = new Blob(["a"]);
    const b = new Blob(["b"]);
    const seen: (string | undefined)[] = [];
    const { rerender } = renderHook(({ s }) => {
      const state = useObjectUrlState(s);
      seen.push(state.url);
      return state;
    }, { initialProps: { s: a } });
    seen.length = 0;
    rerender({ s: b });
    // Every URL rendered after switching belongs to b: none of them was revoked at render time.
    for (const url of seen) if (url) expect(revoked.has(url)).toBe(false);
    Object.assign(URL, { createObjectURL: undefined, revokeObjectURL: undefined });
    const { result } = renderHook(() => useObjectUrlState(a));
    expect(result.current).toEqual({ url: undefined, pending: false });
    Object.assign(URL, { createObjectURL: original.create, revokeObjectURL: original.revoke });
  });
});
