import * as React from "react";

interface AutoFocusHandlers {
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
}

/**
 * Hand focus back to whatever had it when a modal opened. Radix only restores focus to a `Dialog.Trigger`, so a
 * dialog opened from a hotkey, a `SearchTrigger` or any controlled `open` state (no trigger) drops focus to the page
 * body on close, which loses the user's place. Spread the returned handlers onto the Radix content; the caller's own
 * `onOpenAutoFocus` / `onCloseAutoFocus` run first and a `preventDefault()` in the close handler still wins. If the
 * opener is gone by then (a menu item that opened the dialog and unmounted), Radix's default applies.
 */
export function useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus }: AutoFocusHandlers = {}) {
  const opener = React.useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: (event: Event) => {
      onOpenAutoFocus?.(event);
      const active = typeof document === "undefined" ? null : document.activeElement;
      opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
    },
    onCloseAutoFocus: (event: Event) => {
      onCloseAutoFocus?.(event);
      const el = opener.current;
      opener.current = null;
      if (event.defaultPrevented || !el || !el.isConnected) return;
      event.preventDefault();
      el.focus();
    },
  };
}
