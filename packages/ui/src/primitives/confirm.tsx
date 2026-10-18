import * as React from "react";
import { normalizeTone, type ToneInput } from "../lib/tone";
import { useSafeId } from "../hooks/use-safe-id";
import { Button } from "./button";
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Field, FieldError, FieldLabel } from "./field";
import { Input } from "./input";
import { RadioGroupField } from "./radio";

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

interface BaseDialogOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  /** `destructive` turns the confirm button red. */
  tone?: ToneInput;
}

export interface ConfirmOptions extends BaseDialogOptions {
  /** Featured icon above the title. */
  icon?: React.ReactNode;
  /** Runs before resolving `true`; the button shows a spinner until it settles. Throw to keep the dialog open. */
  onConfirm?: () => void | Promise<void>;
  /** Extra content between the header and the buttons. */
  children?: React.ReactNode;
}

export interface PromptOptions extends BaseDialogOptions {
  /** Visible label of the text field. Defaults to the title when omitted (as an accessible name only). */
  label?: React.ReactNode;
  defaultValue?: string;
  placeholder?: string;
  type?: "text" | "email" | "url" | "password" | "search" | "tel" | "number";
  /** Reject an empty answer. Default true. */
  required?: boolean;
  /** Trim whitespace before validating and resolving. Default true. */
  trim?: boolean;
  /** Return an error message to keep the dialog open; anything else accepts the value. May be async. */
  validate?: (value: string) => string | null | undefined | void | boolean | Promise<string | null | undefined | void | boolean>;
  maxLength?: number;
  autoComplete?: string;
}

export interface ChooseOption<T> {
  value: T;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Shown but not selectable (e.g. the folder a file is already in). */
  disabled?: boolean;
}

export interface ChooseOptions<T> extends BaseDialogOptions {
  options: ChooseOption<T>[];
  /** Label of the option group. Defaults to the title. */
  label?: React.ReactNode;
  /** Initially selected value; defaults to the first enabled option. */
  defaultValue?: T;
  /** `card` renders each option as a card. */
  variant?: "default" | "card";
}

export interface DialogsApi {
  /** Ask a yes/no question. Resolves `true` on confirm; Cancel and Escape resolve `false`. */
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  /** Ask for a line of text. Resolves the (trimmed) text, or `null` when canceled. */
  prompt: (options?: PromptOptions | string) => Promise<string | null>;
  /** Ask which of several options. Resolves the chosen option's `value`, or `null` when canceled. */
  choose: <T>(options: ChooseOptions<T>) => Promise<T | null>;
}

type Request =
  | { id: number; kind: "confirm"; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { id: number; kind: "prompt"; options: PromptOptions; resolve: (v: string | null) => void }
  | { id: number; kind: "choose"; options: ChooseOptions<unknown>; resolve: (v: unknown) => void };

const cancelValue = (kind: Request["kind"]) => (kind === "confirm" ? false : null);

const DialogsContext = React.createContext<DialogsApi | null>(null);

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export interface DialogProviderProps {
  children?: React.ReactNode;
}

/**
 * Mount once near the root to enable `useDialogs()`: promise-based `confirm`, `prompt` and `choose`
 * built on `ConfirmDialog` and `Dialog`. One dialog shows at a time; later calls wait in a queue.
 */
export function DialogProvider({ children }: DialogProviderProps) {
  const [queue, setQueueState] = React.useState<Request[]>([]);
  const queueRef = React.useRef<Request[]>([]);
  const nextId = React.useRef(0);
  /** Element focused before the first dialog of a run opened; focus returns there when the queue empties. */
  const returnFocus = React.useRef<HTMLElement | null>(null);

  const setQueue = React.useCallback((next: Request[]) => {
    queueRef.current = next;
    setQueueState(next);
  }, []);

  const enqueue = React.useCallback(
    (req: Omit<Request, "id">) => {
      if (queueRef.current.length === 0 && typeof document !== "undefined") {
        const active = document.activeElement;
        // Keep an earlier opener when focus is momentarily on <body> between two back-to-back dialogs.
        if (active instanceof HTMLElement && active !== document.body) returnFocus.current = active;
      }
      setQueue([...queueRef.current, { ...req, id: nextId.current++ } as Request]);
    },
    [setQueue]
  );

  const settle = React.useCallback(
    (id: number, value: unknown) => {
      const req = queueRef.current.find((r) => r.id === id);
      if (!req) return;
      setQueue(queueRef.current.filter((r) => r.id !== id));
      (req.resolve as (v: unknown) => void)(value);
    },
    [setQueue]
  );

  // Unmounting the provider cancels every open or queued dialog, so no caller awaits forever. The check is
  // deferred so StrictMode's simulated unmount (which remounts in the same task) doesn't cancel anything.
  const alive = React.useRef(true);
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      queueMicrotask(() => {
        if (alive.current) return;
        const pending = queueRef.current;
        queueRef.current = [];
        for (const r of pending) (r.resolve as (v: unknown) => void)(cancelValue(r.kind));
      });
    };
  }, []);

  // When the last dialog closes, return focus to the element that opened the first one. Radix restores focus to
  // the element focused when each dialog mounted, which for a queued dialog is gone, so finish the job here.
  const queueLength = queue.length;
  React.useEffect(() => {
    if (queueLength > 0 || !returnFocus.current) return;
    const timer = setTimeout(() => {
      const target = returnFocus.current;
      if (queueRef.current.length > 0 || !target) return;
      returnFocus.current = null;
      const active = document.activeElement;
      if (target.isConnected && (!active || active === document.body || !active.isConnected)) target.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [queueLength]);

  const api = React.useMemo<DialogsApi>(
    () => ({
      confirm: (options) =>
        new Promise<boolean>((resolve) =>
          enqueue({ kind: "confirm", options: typeof options === "string" ? { title: options } : options, resolve })
        ),
      prompt: (options = {}) =>
        new Promise<string | null>((resolve) =>
          enqueue({ kind: "prompt", options: typeof options === "string" ? { title: options } : options, resolve })
        ),
      choose: <T,>(options: ChooseOptions<T>) =>
        new Promise<T | null>((resolve) =>
          enqueue({
            kind: "choose",
            options: options as ChooseOptions<unknown>,
            resolve: resolve as (v: unknown) => void,
          })
        ),
    }),
    [enqueue]
  );

  const current = queue[0];

  return (
    <DialogsContext.Provider value={api}>
      {children}
      {current?.kind === "confirm" && (
        <ConfirmRequest key={current.id} request={current} settle={settle} />
      )}
      {current?.kind === "prompt" && (
        <PromptRequest key={current.id} request={current} settle={settle} />
      )}
      {current?.kind === "choose" && (
        <ChooseRequest key={current.id} request={current} settle={settle} />
      )}
    </DialogsContext.Provider>
  );
}
DialogProvider.displayName = "DialogProvider";

/**
 * Promise-based `confirm`, `prompt` and `choose` (`if (!(await confirm("Delete?"))) return;`).
 * Throws when no `DialogProvider` is mounted above.
 */
export function useDialogs(): DialogsApi {
  const ctx = React.useContext(DialogsContext);
  if (!ctx) throw new Error("useDialogs must be used inside <DialogProvider>. Mount <DialogProvider> once near the app root.");
  return ctx;
}

/** Shortcut for `useDialogs().confirm`. */
export function useConfirm(): DialogsApi["confirm"] {
  return useDialogs().confirm;
}

/* ------------------------------------------------------------------ */
/* Dialog renderers                                                    */
/* ------------------------------------------------------------------ */

interface RequestProps<K extends Request["kind"]> {
  request: Extract<Request, { kind: K }>;
  settle: (id: number, value: unknown) => void;
}

function ConfirmRequest({ request, settle }: RequestProps<"confirm">) {
  const { options, id } = request;
  const confirmed = React.useRef(false);
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) settle(id, confirmed.current);
      }}
      title={options.title ?? "Are you sure?"}
      description={options.description}
      confirmLabel={options.confirmLabel}
      cancelLabel={options.cancelLabel}
      tone={options.tone}
      icon={options.icon}
      onConfirm={async () => {
        await options.onConfirm?.();
        confirmed.current = true;
      }}
    >
      {options.children}
    </ConfirmDialog>
  );
}

function confirmVariant(tone: ToneInput | undefined) {
  return normalizeTone(tone) === "destructive" ? "destructive" : "primary";
}

function PromptRequest({ request, settle }: RequestProps<"prompt">) {
  const { options, id } = request;
  const { required = true, trim = true } = options;
  const [value, setValue] = React.useState(options.defaultValue ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const fieldId = useSafeId("prompt");
  const alive = React.useRef(true);
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const normalized = trim ? value.trim() : value;
  const empty = normalized.length === 0;

  const check = async (v: string): Promise<string | null> => {
    if (required && v.length === 0) return "Enter a value";
    const result = await options.validate?.(v);
    return typeof result === "string" && result ? result : null;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setTouched(true);
    setBusy(true);
    const message = await check(normalized);
    if (!alive.current) return;
    setBusy(false);
    if (message) {
      setError(message);
      inputRef.current?.focus();
      return;
    }
    settle(id, normalized);
  };

  const title = options.title ?? (typeof options.label === "string" ? options.label : "Enter a value");

  return (
    <Dialog open onOpenChange={(open) => !open && settle(id, null)}>
      <DialogContent
        size="sm"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
          inputRef.current?.select();
        }}
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {options.description && <DialogDescription>{options.description}</DialogDescription>}
          </DialogHeader>
          <Field id={fieldId} invalid={!!error} required={required}>
            {options.label != null ? (
              <FieldLabel>{options.label}</FieldLabel>
            ) : null}
            <Input
              ref={inputRef}
              type={options.type ?? "text"}
              value={value}
              placeholder={options.placeholder}
              maxLength={options.maxLength}
              autoComplete={options.autoComplete ?? "off"}
              aria-label={options.label == null ? (typeof title === "string" ? title : "Value") : undefined}
              onChange={(e) => {
                setValue(e.target.value);
                if (touched && error) {
                  const v = trim ? e.target.value.trim() : e.target.value;
                  void check(v).then((m) => alive.current && setError(m));
                }
              }}
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>
          <DialogFooter className="sm:pt-2">
            <Button type="button" variant="secondary" onClick={() => settle(id, null)}>
              {options.cancelLabel ?? "Cancel"}
            </Button>
            <Button type="submit" variant={confirmVariant(options.tone)} loading={busy} disabled={required && empty}>
              {options.confirmLabel ?? "OK"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChooseRequest({ request, settle }: RequestProps<"choose">) {
  const { options: spec, id } = request;
  const options = spec.options ?? [];
  const initial = (() => {
    const i = spec.defaultValue !== undefined ? options.findIndex((o) => Object.is(o.value, spec.defaultValue) && !o.disabled) : -1;
    return i >= 0 ? i : options.findIndex((o) => !o.disabled);
  })();
  const [selected, setSelected] = React.useState(initial);
  const title = spec.title ?? "Choose an option";

  return (
    <Dialog open onOpenChange={(open) => !open && settle(id, null)}>
      <DialogContent size="sm">
        <form
          className="flex min-h-0 flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const option = options[selected];
            if (option && !option.disabled) settle(id, option.value);
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {spec.description && <DialogDescription>{spec.description}</DialogDescription>}
          </DialogHeader>
          <RadioGroupField
            label={spec.label}
            aria-label={spec.label == null ? (typeof title === "string" ? title : "Options") : undefined}
            variant={spec.variant}
            value={selected >= 0 ? String(selected) : ""}
            onValueChange={(v) => setSelected(Number(v))}
            wrapperClassName="-mx-1 max-h-[50dvh] overflow-y-auto px-1 py-0.5 scrollbar-thin"
            options={options.map((o, i) => ({
              value: String(i),
              label: o.label,
              description: o.description,
              icon: o.icon,
              disabled: o.disabled,
            }))}
          />
          <DialogFooter className="sm:pt-2">
            <Button type="button" variant="secondary" onClick={() => settle(id, null)}>
              {spec.cancelLabel ?? "Cancel"}
            </Button>
            <Button type="submit" variant={confirmVariant(spec.tone)} disabled={selected < 0}>
              {spec.confirmLabel ?? "Confirm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
