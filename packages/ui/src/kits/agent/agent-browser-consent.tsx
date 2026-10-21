import * as React from "react";
import { RiCookieLine, RiHistoryLine, RiKey2Line, RiShieldUserLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { CheckboxField } from "../../primitives/checkbox";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../primitives/dialog";

/* ------------------------------------------------------------------ */
/* RealProfileConsentDialog                                            */
/* ------------------------------------------------------------------ */

export type RealProfileChoice = "once" | "always" | "clean";

export interface RealProfileConsentDialogProps {
  /** Controlled open state of the dialog. */
  open?: boolean;
  /** Initial open state when `open` is not controlled. */
  defaultOpen?: boolean;
  /** Called when the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Called with the choice and whether to remember it. Closes the dialog. */
  onChoose?: (choice: RealProfileChoice, options: { remember: boolean }) => void;
  /** Name of the agent asking for the real browser profile, shown in the copy. */
  agentName?: string;
  /** e.g. "Chrome — Personal". */
  profileName?: string;
  /** Site the agent wants to open, shown in the copy. */
  site?: string;
  /** Default state of "Remember my choice". */
  defaultRemember?: boolean;
  /** Extra classes for the dialog content. */
  className?: string;
}

const accessItems = [
  { icon: <RiCookieLine aria-hidden />, title: "Cookies and signed-in sessions", body: "It can act as you on sites where you’re logged in." },
  { icon: <RiKey2Line aria-hidden />, title: "Saved logins and autofill", body: "Password-manager autofill may be available to the page." },
  { icon: <RiHistoryLine aria-hidden />, title: "History and extensions", body: "Your browsing history and extensions stay active." },
];

/** Asks before letting the agent use the user's real browser profile (cookies, logins) instead of a clean one. */
export function RealProfileConsentDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onChoose,
  agentName = "The agent",
  profileName,
  site,
  defaultRemember = false,
  className,
}: RealProfileConsentDialogProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const [remember, setRemember] = React.useState(defaultRemember);
  const choose = (choice: RealProfileChoice) => {
    onChoose?.(choice, { remember: choice === "always" ? true : remember });
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className={cn("sm:max-w-md", className)}>
        <DialogHeader icon={<RiShieldUserLine aria-hidden />} tone="warning">
          <DialogTitle>Use your real browser profile?</DialogTitle>
          <DialogDescription>
            {agentName} wants to browse{site ? <> {site}</> : null} with{" "}
            {profileName ? <span className="font-medium text-foreground">{profileName}</span> : "your own browser profile"} instead of a
            clean, signed-out one.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <ul className="space-y-2.5">
            {accessItems.map((it) => (
              <li key={it.title} className="flex gap-3 text-sm">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-control bg-muted text-muted-foreground [&_svg]:size-4" aria-hidden>
                  {it.icon}
                </span>
                <span>
                  <span className="block font-medium text-foreground">{it.title}</span>
                  <span className="block text-muted-foreground">{it.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <CheckboxField
            label="Remember my choice"
            checked={remember}
            onCheckedChange={(v) => setRemember(v === true)}
          />
        </DialogBody>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => choose("clean")}>
            Use a clean profile
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => choose("once")}>
              Allow once
            </Button>
            <Button type="button" variant="primary" onClick={() => choose("always")}>
              Always allow
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
