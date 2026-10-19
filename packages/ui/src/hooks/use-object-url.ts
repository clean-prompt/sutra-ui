import * as React from "react";

/** Result of `useObjectUrl`: the object URL (or `undefined`) and whether it is still being created. */
export interface ObjectUrlState {
  /** The object URL for the current source; undefined while pending, for no source, or where object URLs are unsupported. */
  url: string | undefined;
  /** True for the render(s) between a new source arriving and its URL being created. */
  pending: boolean;
}

/**
 * An object URL for a Blob or File plus a pending flag. The URL is created in an effect (StrictMode-safe), revoked
 * when the source changes or the component unmounts, and never returned for a source other than the current one
 * (so a revoked URL is never rendered). Without `URL.createObjectURL` (old runtimes, some test setups) it settles
 * on `url: undefined`.
 */
export function useObjectUrlState(source: Blob | null | undefined): ObjectUrlState {
  const [entry, setEntry] = React.useState<{ source: Blob; url: string | undefined }>();
  React.useEffect(() => {
    if (!source) return;
    if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
      setEntry({ source, url: undefined });
      return;
    }
    const url = URL.createObjectURL(source);
    setEntry({ source, url });
    return () => {
      if (typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
    };
  }, [source]);
  if (!source) return { url: undefined, pending: false };
  return entry?.source === source ? { url: entry.url, pending: false } : { url: undefined, pending: true };
}

/**
 * An object URL for a Blob or File, revoked when the source changes or the component unmounts. Returns undefined
 * for no source, until the URL is created, and during the first render on the server. See `useObjectUrlState`.
 */
export function useObjectUrl(source: Blob | null | undefined): string | undefined {
  return useObjectUrlState(source).url;
}
