import * as React from "react";
import type { SutraApp } from "../assets/brand";

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

/** Tracks a possibly-async action: exposes `busy` and the thrown error message. */
export function useAsyncAction(externalLoading?: boolean) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const run = React.useCallback(async (fn?: () => unknown) => {
    if (!fn) return true;
    setError(null);
    try {
      setPending(true);
      await fn();
      return true;
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      if (mounted.current) setPending(false);
    }
  }, []);
  return { busy: Boolean(externalLoading) || pending, error, setError, run };
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

/** Simple email check for demo validation. */
export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
