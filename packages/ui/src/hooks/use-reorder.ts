import { useControllableState } from "./use-controllable-state";
import { reorderArray, reorderBy } from "../lib/reorder";

export interface UseReorderOptions<T> {
  items?: T[];
  defaultItems?: T[];
  onItemsChange?: (items: T[]) => void;
}

/** Controlled/uncontrolled list state with move helpers. */
export function useReorder<T>({ items: itemsProp, defaultItems = [], onItemsChange }: UseReorderOptions<T> = {}) {
  const [items, setItems] = useControllableState<T[]>({ value: itemsProp, defaultValue: defaultItems, onChange: onItemsChange });
  return {
    items,
    setItems,
    move: (from: number, to: number) => setItems(reorderArray(items, from, to)),
    moveUp: (index: number) => setItems(reorderBy(items, index, -1)),
    moveDown: (index: number) => setItems(reorderBy(items, index, 1)),
    moveToTop: (index: number) => setItems(reorderArray(items, index, 0)),
    moveToBottom: (index: number) => setItems(reorderArray(items, index, items.length - 1)),
  };
}
