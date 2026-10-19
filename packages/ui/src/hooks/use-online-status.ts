import * as React from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

const getSnapshot = () => navigator.onLine;
/* The server can't know; assume online so SSR markup matches the common case and hydration stays clean. */
const getServerSnapshot = () => true;

/** Tracks `navigator.onLine` with online/offline events. Renders `true` on the server and during hydration. */
export function useOnlineStatus() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
