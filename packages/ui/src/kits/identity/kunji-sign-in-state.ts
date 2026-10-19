/* useKunjiSignIn: the kunji sign-in state machine (session, polling, short codes, slow and success timers). */
import * as React from "react";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { errorMessage as messageOf } from "../../hooks/use-async-action";
import { isKunjiAbortError, type KunjiClient, type KunjiPollResult, type KunjiSession } from "./kunji-client";

/* ------------------------------------------------------------------ */
/* useKunjiSignIn                                                      */
/* ------------------------------------------------------------------ */

export type KunjiSignInStatus = "idle" | "loading" | "ready" | "scanned" | "success" | "expired" | "denied" | "notLinked" | "error";

export interface KunjiSignInState {
  status: KunjiSignInStatus;
  session?: KunjiSession;
  result?: KunjiPollResult;
  error?: string;
  /** True once loading or awaiting approval has taken longer than `slowAfter`. */
  slow: boolean;
  /** Short code for the typed fallback. */
  code?: string;
  codeStatus: "idle" | "loading" | "ready" | "submitting" | "error";
  codeError?: string;
}

export interface UseKunjiSignInOptions {
  client: KunjiClient;
  /** Called after the success animation with the approved poll result. */
  onSuccess?: (result: KunjiPollResult) => void;
  /** Called with the error when creating the session or polling fails. */
  onError?: (error: unknown) => void;
  /** Called with the new status each time the attempt moves to another state. */
  onStatusChange?: (status: KunjiSignInStatus) => void;
  /** Start a session on mount. Default true. */
  autoStart?: boolean;
  /** Mark the attempt `slow` after this many ms of loading or awaiting approval. Default 15000. 0 disables. */
  slowAfter?: number;
  /** Delay between the success state and `onSuccess`, for the animation. Default 900ms. */
  successDelay?: number;
  /** Override the client's poll interval. */
  pollInterval?: number;
}

export interface UseKunjiSignInReturn {
  state: KunjiSignInState;
  /** Start (or restart) a session. */
  start: () => void;
  /** Alias of `start`, for "Get a new code". */
  refresh: () => void;
  /** Alias of `start`, for "Try again". */
  retry: () => void;
  /** Abort and return to idle. */
  cancel: () => void;
  /** Reveal or lazily mint the short code. */
  requestCode: () => void;
  /** Submit a code shown by the wallet (reverse flow). */
  submitCode: (code: string) => void;
  /** Whether the client offers each code path. */
  canRequestCode: boolean;
  canSubmitCode: boolean;
}

const initialState: KunjiSignInState = { status: "idle", slow: false, codeStatus: "idle" };



/** State machine for kunji sign-in: idle → loading → ready → scanned → success | expired | denied | notLinked | error. */
export function useKunjiSignIn({
  client,
  onSuccess,
  onError,
  onStatusChange,
  autoStart = true,
  slowAfter = 15000,
  successDelay = 900,
  pollInterval,
}: UseKunjiSignInOptions): UseKunjiSignInReturn {
  const [state, setState] = React.useState<KunjiSignInState>(initialState);
  const ctrl = React.useRef<AbortController | null>(null);
  const slowTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const successTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const callbacks = useLatestRef({ onSuccess, onError, onStatusChange });
  const sessionRef = React.useRef<KunjiSession | undefined>(undefined);

  const disarmSlow = React.useCallback(() => clearTimeout(slowTimer.current), []);
  const armSlow = React.useCallback(() => {
    clearTimeout(slowTimer.current);
    if (slowAfter > 0) slowTimer.current = setTimeout(() => setState((s) => ({ ...s, slow: true })), slowAfter);
  }, [slowAfter]);

  const finish = React.useCallback(
    (result: KunjiPollResult) => {
      disarmSlow();
      const status: KunjiSignInStatus =
        result.status === "approved"
          ? "success"
          : result.status === "denied"
            ? "denied"
            : result.status === "not_linked"
              ? "notLinked"
              : result.status === "expired"
                ? "expired"
                : "error";
      setState((s) => ({ ...s, status, result, slow: false, codeStatus: s.codeStatus === "submitting" ? "idle" : s.codeStatus }));
      if (status === "success") {
        clearTimeout(successTimer.current);
        successTimer.current = setTimeout(() => callbacks.current.onSuccess?.(result), successDelay);
      }
    },
    [disarmSlow, successDelay]
  );

  const start = React.useCallback(() => {
    ctrl.current?.abort();
    clearTimeout(successTimer.current);
    const c = new AbortController();
    ctrl.current = c;
    sessionRef.current = undefined;
    setState({ ...initialState, status: "loading" });
    armSlow();
    void (async () => {
      try {
        const session = await client.createSession(c.signal);
        if (c.signal.aborted) return;
        sessionRef.current = session;
        disarmSlow();
        setState((s) => ({
          ...s,
          status: "ready",
          slow: false,
          session,
          code: session.code,
          codeStatus: "idle",
        }));
        const result = await client.poll(session.sessionId, c.signal, {
          expiresAt: session.expiresAt,
          ...(pollInterval ? { interval: pollInterval } : {}),
          onStatus: (r) => {
            if (c.signal.aborted || r.status !== "scanned") return;
            setState((s) => (s.status === "ready" ? { ...s, status: "scanned" } : s));
            armSlow();
          },
        });
        if (c.signal.aborted) return;
        finish(result);
      } catch (e) {
        if (c.signal.aborted || isKunjiAbortError(e)) return;
        disarmSlow();
        setState((s) => ({ ...s, status: "error", error: messageOf(e, "Couldn't start sign-in."), slow: false }));
        callbacks.current.onError?.(e);
      }
    })();
  }, [client, armSlow, disarmSlow, finish, pollInterval]);

  const cancel = React.useCallback(() => {
    ctrl.current?.abort();
    disarmSlow();
    clearTimeout(successTimer.current);
    setState(initialState);
  }, [disarmSlow]);

  const requestCode = React.useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    if (session.code) {
      setState((s) => ({ ...s, code: session.code, codeStatus: "ready" }));
      return;
    }
    if (!client.requestCode) return;
    const signal = ctrl.current?.signal;
    setState((s) => ({ ...s, codeStatus: "loading", codeError: undefined }));
    client.requestCode(session.sessionId, signal).then(
      (code) => {
        if (!signal?.aborted) setState((s) => ({ ...s, code, codeStatus: "ready" }));
      },
      (e) => {
        if (!signal?.aborted && !isKunjiAbortError(e)) setState((s) => ({ ...s, codeStatus: "error", codeError: messageOf(e, "Couldn't get a code.") }));
      }
    );
  }, [client]);

  const submitCode = React.useCallback(
    (code: string) => {
      if (!client.submitCode) return;
      const c = ctrl.current;
      const signal = c?.signal;
      setState((s) => ({ ...s, codeStatus: "submitting", codeError: undefined }));
      client.submitCode(code, signal, sessionRef.current?.sessionId).then(
        (result) => {
          if (signal?.aborted) return;
          // Accepted but not decided yet: keep polling for the approval.
          if (result.status === "pending" || result.status === "scanned") {
            setState((s) => ({
              ...s,
              codeStatus: s.codeStatus === "submitting" ? "idle" : s.codeStatus,
              status: result.status === "scanned" && s.status === "ready" ? "scanned" : s.status,
            }));
            return;
          }
          c?.abort();
          finish(result);
        },
        (e) => {
          if (!signal?.aborted && !isKunjiAbortError(e)) setState((s) => ({ ...s, codeStatus: "error", codeError: messageOf(e, "That code didn't work.") }));
        }
      );
    },
    [client, finish]
  );

  React.useEffect(() => {
    callbacks.current.onStatusChange?.(state.status);
  }, [state.status]);

  React.useEffect(() => {
    if (autoStart) start();
    return () => {
      ctrl.current?.abort();
      clearTimeout(slowTimer.current);
      clearTimeout(successTimer.current);
    };
    // Restart only when the client changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  return {
    state,
    start,
    refresh: start,
    retry: start,
    cancel,
    requestCode,
    submitCode,
    canRequestCode: Boolean(client.requestCode) || Boolean(state.session?.code),
    canSubmitCode: Boolean(client.submitCode),
  };
}
