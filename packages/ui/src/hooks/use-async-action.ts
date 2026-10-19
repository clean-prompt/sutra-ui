import * as React from "react";
import { useIsoLayoutEffect, useLatestRef } from "./use-iso-layout-effect";

/** A ref that is true while mounted: set on (re)mount, false after unmount (StrictMode-safe). */
export function useMountedRef(): React.RefObject<boolean> {
  const mounted = React.useRef(false);
  useIsoLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}

const DEFAULT_ERROR = "Something went wrong. Please try again.";

/** Readable message for a thrown value (Error message, non-empty string, or `fallback`). */
export function errorMessage(error: unknown, fallback = DEFAULT_ERROR): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

/** Options for `useAsyncAction`: success and error callbacks and the fallback error message. */
export interface UseAsyncActionOptions<R> {
  /** Called with the raw error of the latest run (not for superseded runs or after unmount). */
  onError?: (error: unknown) => void;
  /** Called with the result of the latest successful run. */
  onSuccess?: (result: R) => void;
  /** `error` text when the thrown value has no message. */
  fallbackMessage?: string;
}

/** What `useAsyncAction` returns: `run`, the `busy` flag, the `error` message and its `cause`, plus `reset` and `setError`. */
export interface AsyncAction<A extends unknown[], R> {
  /** Runs the action. Resolves to its result, or `undefined` if it threw, was superseded or the component unmounted. Never rejects. */
  run: (...args: A) => Promise<R | undefined>;
  /** True while the latest run is pending. */
  busy: boolean;
  /** Message of the latest run's error. */
  error: string | null;
  /** The raw thrown value of the latest run's error. */
  cause: unknown;
  /** Clears `busy` and `error` and ignores any pending run. */
  reset: () => void;
  /** Sets (or clears) the error message by hand, e.g. for client-side validation. */
  setError: (message: string | null) => void;
}

interface State {
  busy: boolean;
  error: string | null;
  cause: unknown;
}

const IDLE: State = { busy: false, error: null, cause: undefined };

/**
 * Tracks a possibly-async action: `busy`, `error`, and a stable `run`.
 * Errors are caught (no unhandled rejections); results of superseded runs and after unmount are ignored.
 */
export function useAsyncAction<A extends unknown[] = [], R = unknown>(
  fn?: (...args: A) => R | PromiseLike<R>,
  options: UseAsyncActionOptions<Awaited<R>> = {}
): AsyncAction<A, Awaited<R>> {
  const [state, setState] = React.useState<State>(IDLE);
  const fnRef = useLatestRef(fn);
  const optionsRef = useLatestRef(options);
  const mounted = useMountedRef();
  const token = React.useRef(0);

  const run = React.useCallback(
    async (...args: A): Promise<Awaited<R> | undefined> => {
      const action = fnRef.current;
      if (!action) return undefined;
      const mine = ++token.current;
      const current = () => mounted.current && mine === token.current;
      setState({ busy: true, error: null, cause: undefined });
      try {
        const result = (await action(...args)) as Awaited<R>;
        if (!current()) return undefined;
        setState(IDLE);
        try {
          optionsRef.current.onSuccess?.(result);
        } catch {
          /* a throwing callback must not turn success into a rejection */
        }
        return result;
      } catch (e) {
        if (!current()) return undefined;
        setState({ busy: false, error: errorMessage(e, optionsRef.current.fallbackMessage), cause: e });
        try {
          optionsRef.current.onError?.(e);
        } catch {
          /* ignore */
        }
        return undefined;
      }
    },
    [fnRef, optionsRef, mounted]
  );

  const reset = React.useCallback(() => {
    token.current++;
    setState(IDLE);
  }, []);

  const setError = React.useCallback((message: string | null) => {
    setState((s) => ({ ...s, error: message, cause: message === null ? undefined : s.cause }));
  }, []);

  return { run, busy: state.busy, error: state.error, cause: state.cause, reset, setError };
}
