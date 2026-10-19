/** Open-state props and hook shared by the dialog blocks. */
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";

/** Open-state props shared by the dialog blocks. */
export interface BlockDialogBaseProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog (rendered with `asChild`). */
  trigger?: React.ReactNode;
  className?: string;
}

export function useDialogOpen({ open, defaultOpen = false, onOpenChange }: BlockDialogBaseProps) {
  return useControllableState<boolean>({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
}
