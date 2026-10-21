import { useControllableState } from "./use-controllable-state";
import { reorderArray, reorderBy } from "../lib/reorder";

/** Options for `useReorder`: controlled or initial items and the change callback. */
export interface UseReorderOptions<T> {
  /** Controlled items in order. Use with `onItemsChange`. */
  items?: T[];
  /** Initial items when uncontrolled. */
  defaultItems?: T[];
  /** Called with the full list in its new order after every move. */
  onItemsChange?: (items: T[]) => void;
}

/** Controlled/uncontrolled list state with move helpers. */
export function useReorder<T>({ items: itemsProp, defaultItems = [], onItemsChange }: UseReorderOptions<T> = {}) {
  const [items, setItems] = useControllableState<T[]>({ value: itemsProp, defaultValue: defaultItems, onChange: onItemsChange });
  return {
    items,
    setItems,
    // Functional updates, so two moves in one tick compose instead of the second overwriting the first.
    move: (from: number, to: number) => setItems((prev) => reorderArray(prev, from, to)),
    moveUp: (index: number) => setItems((prev) => reorderBy(prev, index, -1)),
    moveDown: (index: number) => setItems((prev) => reorderBy(prev, index, 1)),
    moveToTop: (index: number) => setItems((prev) => reorderArray(prev, index, 0)),
    moveToBottom: (index: number) => setItems((prev) => reorderArray(prev, index, prev.length - 1)),
  };
}
