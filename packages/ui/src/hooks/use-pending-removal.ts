import * as React from "react";

/**
 * Two-step removal of the last item (Backspace twice): the first press marks it, the second removes it, so a held key
 * cannot empty a field faster than a person notices. The mark clears itself when the list changes length.
 * `press(repeat)` returns true when the item should be removed now; auto-repeat events never confirm.
 */
export function usePendingRemoval(size: number) {
  const [markedAt, setMarkedAt] = React.useState<number | null>(null);
  const pending = size > 0 && markedAt === size;
  const clear = React.useCallback(() => setMarkedAt(null), []);
  const press = React.useCallback(
    (repeat = false) => {
      if (size === 0) return false;
      if (markedAt === size) {
        if (repeat) return false;
        setMarkedAt(null);
        return true;
      }
      setMarkedAt(size);
      return false;
    },
    [size, markedAt]
  );
  return { pending, press, clear };
}
