import * as React from "react";
import type { SutraApp } from "../assets/brand";
import { useAsyncAction as useSharedAsyncAction } from "../hooks/use-async-action";

/* Internal helpers shared by the blocks. Not part of the public API. */

/** Router-agnostic link renderer used by blocks (`renderLink`). */
export type BlockLinkRenderer = (props: {
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) => React.ReactElement;

/** Renders a plain anchor, or the caller's router link when `renderLink` is provided. */
export function BlockLink({
  href,
  className,
  children,
  onClick,
  renderLink,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  renderLink?: BlockLinkRenderer;
}) {
  if (renderLink) return renderLink({ href, className, children, onClick });
  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

/** Blocks' action tracker: `run(fn)` resolves true on success; `busy` also reflects `externalLoading`. Wraps `hooks/use-async-action`. */
export function useAsyncAction(externalLoading?: boolean) {
  const action = useSharedAsyncAction((fn: () => unknown) => fn());
  const { run: runShared, busy, error, setError } = action;
  const run = React.useCallback(
    async (fn?: () => unknown) => {
      if (!fn) return true;
      let ok = false;
      await runShared(async () => {
        await fn();
        ok = true;
      });
      return ok;
    },
    [runShared]
  );
  return { busy: Boolean(externalLoading) || busy, error, setError, run };
}

/** One-line pitch for each Sutra app (used in menus and navigation). */
export const sutraAppDescriptions: Record<SutraApp, string> = {
  notes: "Capture ideas and docs that link together.",
  tasks: "Plan projects, track to-dos, hit deadlines.",
  calendar: "Schedule your time and share availability.",
  mail: "A calm, fast inbox with smart triage.",
  files: "Store, preview and share everything.",
  journal: "Daily reflections with prompts and moods.",
  finance: "Budgets, spending and net worth at a glance.",
  habits: "Build routines with streaks and reminders.",
};

/** Demo user used as the default across blocks. */
export const demoUser = {
  name: "Maya Patel",
  email: "maya@sutra.app",
  avatarSrc: undefined as string | undefined,
};

/** Simple email check for demo validation (see `lib/validate`). */
export { isEmail } from "../lib/validate";
