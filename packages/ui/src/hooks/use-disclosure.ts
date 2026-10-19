import * as React from "react";
import { useControllableState } from "./use-controllable-state";

/** Options for `useDisclosure`: controlled or initial open state and the change callback. */
export interface UseDisclosureOptions {
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled (default false). */
  defaultOpen?: boolean;
  /** Called with the next state whenever it changes through `onOpen`, `onClose`, `toggle`, `setOpen` or `props`. */
  onOpenChange?: (open: boolean) => void;
}

/** What `useDisclosure` returns: the open state, the open, close, toggle and set actions, and props to spread on a trigger. */
export interface UseDisclosureReturn {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  /** Spread onto a Dialog, Sheet, Popover, Collapsible or Collapse: `{ open, onOpenChange }`. */
  props: { open: boolean; onOpenChange: (open: boolean) => void };
}

/** Open/close state for any overlay or disclosure, controlled or uncontrolled, with stable handlers. */
export function useDisclosure({ open, defaultOpen = false, onOpenChange }: UseDisclosureOptions = {}): UseDisclosureReturn {
  const [current, setOpen] = useControllableState<boolean>({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
  const onOpen = React.useCallback(() => setOpen(true), [setOpen]);
  const onClose = React.useCallback(() => setOpen(false), [setOpen]);
  const toggle = React.useCallback(() => setOpen((v) => !v), [setOpen]);
  const props = React.useMemo(() => ({ open: current, onOpenChange: setOpen }), [current, setOpen]);
  return { open: current, onOpen, onClose, toggle, setOpen, props };
}
