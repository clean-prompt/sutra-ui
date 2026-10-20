import * as React from "react";
import { cn } from "../lib/cn";
import { TextLink, type TextLinkProps } from "../primitives/text-link";

/* ------------------------------------------------------------------ */
/* TextButton                                                          */
/* ------------------------------------------------------------------ */

/** `default` and `muted` are emphasis levels; `destructive` is the semantic tone (`danger` is a deprecated alias). */
export type TextButtonTone = "default" | "muted" | "destructive" | "danger";

const textButtonVariant: Record<TextButtonTone, NonNullable<TextLinkProps["variant"]>> = {
  default: "subtle",
  muted: "muted",
  destructive: "destructive",
  danger: "destructive",
};

/** @deprecated Use `TextLinkProps` (`TextLink` with `onClick` or `as="button"`). */
export interface TextButtonProps extends React.HTMLAttributes<HTMLElement> {
  /** Renders an `<a>` when set; otherwise a `<button type="button">`. */
  href?: string;
  /** Link `target` when `href` is set. */
  target?: string;
  /** Link `rel` when `href` is set. */
  rel?: string;
  /** Makes the link a download; a string sets the file name. */
  download?: string | boolean;
  /**
   * Button `type` when there is no `href`.
   * @default "button"
   */
  type?: "button" | "submit" | "reset";
  /** Disables the button. */
  disabled?: boolean;
  /**
   * Text colour: `default`, `muted` or `destructive` (`danger` is an alias).
   * @default "default"
   */
  tone?: TextButtonTone;
}

/**
 * An action that reads as part of a sentence: inline text, underlined on hover. A link with `href`, a button otherwise.
 * @deprecated Use `TextLink`: `<TextLink onClick={…} variant="subtle">` (or `as="button"`) for the button form,
 * `<TextLink href>` for the link form. `tone` maps to `variant`: default → subtle, muted → muted, destructive → destructive.
 */
export const TextButton = React.forwardRef<HTMLElement, TextButtonProps>(({ href, tone = "default", className, ...props }, ref) => (
  <TextLink
    ref={ref as React.Ref<HTMLAnchorElement>}
    as={href !== undefined ? "a" : "button"}
    href={href}
    variant={textButtonVariant[tone] ?? "subtle"}
    className={cn("inline", className)}
    {...(props as Omit<TextLinkProps, "href" | "as" | "variant" | "className">)}
  />
));
TextButton.displayName = "TextButton";
