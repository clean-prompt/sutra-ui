/** Open-state props and hook shared by the dialog blocks. */
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";

/** Open-state props shared by the dialog blocks. */
export interface BlockDialogBaseProps {
  /** Controlled open state. Use with `onOpenChange`. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Called when the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog (rendered with `asChild`). */
  trigger?: React.ReactNode;
  /** Classes for the dialog panel. */
  className?: string;
}

export function useDialogOpen({ open, defaultOpen = false, onOpenChange }: BlockDialogBaseProps) {
  return useControllableState<boolean>({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
}
