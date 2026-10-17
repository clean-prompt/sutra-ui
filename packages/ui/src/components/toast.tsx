import * as React from "react";
import {
  Toaster as SonnerToaster,
  toast,
  type ExternalToast,
  type ToasterProps as SonnerToasterProps,
} from "sonner";
import {
  RiAlertFill,
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiInformationFill,
} from "@remixicon/react";
import { cn } from "../lib/cn";
import { CloseButton } from "./close-button";
import { Spinner } from "./spinner";

export { toast };

type ToastClassNames = NonNullable<NonNullable<SonnerToasterProps["toastOptions"]>["classNames"]>;

function readDocumentTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const root = document.documentElement;
  return root.classList.contains("dark") || root.dataset.theme === "dark" ? "dark" : "light";
}

/** Tracks the `.dark` class / `data-theme` attribute on <html>. */
function useDocumentTheme(enabled: boolean): "light" | "dark" {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  React.useEffect(() => {
    if (!enabled || typeof MutationObserver === "undefined") return;
    setTheme(readDocumentTheme());
    const observer = new MutationObserver(() => setTheme(readDocumentTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => observer.disconnect();
  }, [enabled]);
  return theme;
}

const baseClassNames: ToastClassNames = {
  toast: cn(
    "group/toast pointer-events-auto flex w-[var(--width)] items-start gap-3 rounded-box border border-border bg-popover p-4",
    "font-sans text-sm text-popover-foreground shadow-lg"
  ),
  content: "flex min-w-0 flex-1 flex-col gap-0.5",
  title: "font-medium leading-5 text-foreground",
  description: "leading-5 text-muted-foreground!",
  icon: "mt-0.5 text-muted-foreground",
  actionButton:
    "ml-auto! h-7! shrink-0 rounded-control! bg-primary! px-2.5! text-xs! font-medium! text-primary-foreground! transition-colors hover:bg-primary-hover!",
  cancelButton:
    "h-7! shrink-0 rounded-control! bg-muted! px-2.5! text-xs! font-medium! text-foreground! transition-colors hover:bg-accent!",
  closeButton:
    "border-border! bg-popover! text-muted-foreground! transition-colors hover:bg-muted! hover:text-foreground!",
  success: "[&_[data-icon]]:text-success",
  error: "[&_[data-icon]]:text-destructive",
  warning: "[&_[data-icon]]:text-warning",
  info: "[&_[data-icon]]:text-info",
  loading: "[&_[data-icon]]:text-muted-foreground",
};

function mergeClassNames(base: ToastClassNames, extra?: ToastClassNames): ToastClassNames {
  if (!extra) return base;
  const out: Record<string, string | undefined> = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    out[key] = cn(out[key], value as string | undefined);
  }
  return out as ToastClassNames;
}

export interface ToasterProps extends SonnerToasterProps {}

/** Sonner toaster styled with Sutra tokens. Follows the `.dark` class on <html> unless `theme` is set. */
export function Toaster({
  position = "bottom-right",
  theme,
  toastOptions,
  icons,
  className,
  gap = 10,
  ...props
}: ToasterProps) {
  const docTheme = useDocumentTheme(theme === undefined);
  return (
    <SonnerToaster
      position={position}
      theme={theme ?? docTheme}
      gap={gap}
      className={cn("toaster group/toaster font-sans", className)}
      icons={{
        success: <RiCheckboxCircleFill className="size-4" />,
        info: <RiInformationFill className="size-4" />,
        warning: <RiAlertFill className="size-4" />,
        error: <RiErrorWarningFill className="size-4" />,
        loading: <Spinner size="sm" className="text-muted-foreground" />,
        ...icons,
      }}
      {...props}
      toastOptions={{
        ...toastOptions,
        unstyled: toastOptions?.unstyled ?? true,
        classNames: mergeClassNames(baseClassNames, toastOptions?.classNames),
      }}
    />
  );
}
Toaster.displayName = "Toaster";

export interface SnackbarAction {
  label: React.ReactNode;
  onClick?: () => void;
}

export interface SnackbarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  message: React.ReactNode;
  icon?: React.ReactNode;
  action?: SnackbarAction;
  /** Shows a close button when provided. */
  onClose?: () => void;
  closeLabel?: string;
}

/** Compact dark (inverse) notification bar with an optional action, Material-style. */
export const Snackbar = React.forwardRef<HTMLDivElement, SnackbarProps>(
  ({ className, message, icon, action, onClose, closeLabel = "Dismiss", role, ...props }, ref) => (
    <div
      ref={ref}
      role={role ?? "status"}
      aria-live="polite"
      className={cn(
        "pointer-events-auto flex w-full min-w-[18rem] max-w-[min(36rem,calc(100vw-2rem))] items-center gap-3",
        "rounded-box bg-inverse py-2 pl-4 pr-2 font-sans text-sm text-inverse-foreground shadow-2xl",
        className
      )}
      {...props}
    >
      {icon ? (
        <span aria-hidden className="flex shrink-0 opacity-80 [&_svg]:size-[18px]">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1 py-1.5 leading-5">{message}</div>
      {action || onClose ? (
        <div className="-my-0.5 flex shrink-0 items-center gap-1">
          {action ? (
            <button
              type="button"
              onClick={action.onClick}
              className={cn(
                "inline-flex h-8 items-center rounded-control px-2.5 text-sm font-semibold text-inverse-primary transition-colors",
                "hover:bg-inverse-foreground/10 outline-none focus-visible:ring-[3px] focus-visible:ring-inverse-foreground/30"
              )}
            >
              {action.label}
            </button>
          ) : null}
          {onClose ? <CloseButton variant="inverse" size="sm" aria-label={closeLabel} onClick={onClose} /> : null}
        </div>
      ) : null}
    </div>
  )
);
Snackbar.displayName = "Snackbar";

export interface SnackbarOptions extends Omit<ExternalToast, "action" | "icon"> {
  action?: SnackbarAction;
  icon?: React.ReactNode;
  /** Show a close button. Default true. */
  closable?: boolean;
  /** Called when the snackbar is dismissed by its own controls. */
  onClose?: () => void;
}

const bareToast =
  "border-0! bg-transparent! p-0! shadow-none! rounded-none!";

/** Shows a `Snackbar` through sonner. Returns the toast id. */
export function snackbar(message: React.ReactNode, options: SnackbarOptions = {}) {
  const { action, icon, closable = true, onClose, className, ...rest } = options;
  return toast.custom(
    (id) => (
      <Snackbar
        message={message}
        icon={icon}
        action={
          action
            ? {
                label: action.label,
                onClick: () => {
                  action.onClick?.();
                  toast.dismiss(id);
                },
              }
            : undefined
        }
        onClose={
          closable
            ? () => {
                onClose?.();
                toast.dismiss(id);
              }
            : undefined
        }
      />
    ),
    { ...rest, className: cn(bareToast, className) }
  );
}
