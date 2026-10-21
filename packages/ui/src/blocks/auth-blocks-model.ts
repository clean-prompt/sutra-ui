/** Props shared by the auth cards. */
import * as React from "react";
import type { BlockLinkRenderer } from "./block-utils";
import type { AuthHeadingLevel } from "./auth-frame-internal";

/** Props shared by every auth card. */
export interface AuthCardBaseProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "onSubmit"> {
  /** Card heading; each card has its own default. */
  title?: React.ReactNode;
  /** Supporting text under the heading; each card has its own default. */
  description?: React.ReactNode;
  /** `card` renders a bordered surface; `plain` renders only the content (for full-page layouts). */
  variant?: "card" | "plain";
  /** Show the Sutra mark above the title, or pass a custom logo. Default: true for `card`. */
  logo?: boolean | React.ReactNode;
  /** Router link renderer for the footer and inline links. */
  renderLink?: BlockLinkRenderer;
  /** Replace the default footer (e.g. "Don't have an account? Sign up"). Pass `null` to hide it. */
  footer?: React.ReactNode;
  /**
   * Element of the card title (`1` is an `h1`). Use `2` or lower when the card sits inside a page that has its own `h1`.
   * @default 1
   */
  headingLevel?: AuthHeadingLevel;
}
