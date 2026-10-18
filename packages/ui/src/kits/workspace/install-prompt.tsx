import * as React from "react";
import { RiAddBoxLine, RiDownloadLine, RiShare2Line } from "@remixicon/react";
import { useMediaQuery } from "../../hooks/use-media-query";
import { Button, type ButtonProps } from "../../primitives/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";

/** The non-standard `beforeinstallprompt` event fired by Chromium browsers. */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
}

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

export interface UseInstallPromptResult {
  /** A deferred native install prompt is available. */
  canInstall: boolean;
  /** Running as an installed app (display-mode standalone) or the `appinstalled` event fired. */
  installed: boolean;
  /** iOS / iPadOS, where installing is manual via Share → Add to Home Screen. */
  isIOS: boolean;
  /** Shows the native prompt. Resolves with the user's choice. */
  promptInstall: () => Promise<InstallOutcome>;
}

function detectIOSStandalone() {
  if (typeof window === "undefined") return false;
  return Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function detectIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1);
}

/** Captures `beforeinstallprompt` and tracks whether the PWA is installed. */
export function useInstallPrompt(): UseInstallPromptResult {
  const deferred = React.useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = React.useState(false);
  const standalone = useMediaQuery("(display-mode: standalone)");
  const [installedFlag, setInstalled] = React.useState(detectIOSStandalone);
  const installed = installedFlag || standalone;
  const [isIOS] = React.useState(detectIOS);

  React.useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      deferred.current = event as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      deferred.current = null;
      setCanInstall(false);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = React.useCallback(async (): Promise<InstallOutcome> => {
    const event = deferred.current;
    if (!event) return "unavailable";
    await event.prompt();
    const choice = await event.userChoice;
    deferred.current = null;
    setCanInstall(false);
    if (choice.outcome === "accepted") setInstalled(true);
    return choice.outcome;
  }, []);

  return { canInstall, installed, isIOS, promptInstall };
}

export interface InstallButtonProps extends Omit<ButtonProps, "onClick"> {
  /** App name used in the label and the iOS instructions. */
  appName?: string;
  /** Force a platform: `ios` always shows the Add to Home Screen instructions (useful for previews). */
  platform?: "auto" | "ios";
  onOutcome?: (outcome: InstallOutcome) => void;
}

/** Install-the-app button. Hidden when not installable or already installed; shows Add to Home Screen steps on iOS. */
export const InstallButton = React.forwardRef<HTMLButtonElement, InstallButtonProps>(
  ({ appName = "app", platform = "auto", onOutcome, children, variant = "secondary", leadingIcon, ...props }, ref) => {
    const { canInstall, installed, isIOS, promptInstall } = useInstallPrompt();
    const forcedIOS = platform === "ios";
    const label = children ?? `Install ${appName}`;
    const icon = leadingIcon ?? <RiDownloadLine aria-hidden />;

    if (!forcedIOS && (installed || (!canInstall && !isIOS))) return null;

    if (forcedIOS || (!canInstall && isIOS)) {
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button ref={ref} variant={variant} leadingIcon={icon} {...props}>
              {label}
            </Button>
          </PopoverTrigger>
          <PopoverContent size="md" aria-label={`Install ${appName}`}>
            <p className="text-sm font-semibold text-foreground">Install {appName}</p>
            <p className="mt-1 text-sm text-muted-foreground">Add it to your Home Screen for an app-like experience.</p>
            <ol className="mt-3 divide-y divide-border border-y border-border text-sm">
              <li className="flex items-center gap-3 py-2.5">
                <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-soft-foreground">
                  1
                </span>
                <span>
                  Tap <RiShare2Line aria-hidden className="inline size-4 align-text-bottom text-primary" />{" "}
                  <strong className="font-medium">Share</strong> in Safari's toolbar.
                </span>
              </li>
              <li className="flex items-center gap-3 py-2.5">
                <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-soft-foreground">
                  2
                </span>
                <span>
                  Choose <RiAddBoxLine aria-hidden className="inline size-4 align-text-bottom text-primary" />{" "}
                  <strong className="font-medium">Add to Home Screen</strong>.
                </span>
              </li>
            </ol>
          </PopoverContent>
        </Popover>
      );
    }

    return (
      <Button
        ref={ref}
        variant={variant}
        leadingIcon={icon}
        onClick={async () => {
          const outcome = await promptInstall();
          onOutcome?.(outcome);
        }}
        {...props}
      >
        {label}
      </Button>
    );
  }
);
InstallButton.displayName = "InstallButton";
