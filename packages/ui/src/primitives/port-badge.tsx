import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { accentClasses, accentStyle, type Accent } from "../lib/accent";
import type { ToneInput } from "../lib/tone";
import { isSafeHref } from "../lib/validate";
import { Badge } from "./badge";

/** The URL a port opens on this machine (`localhost:3000` over plain HTTP). Only followed when the user clicks. */
export function portHref(port: number | string, host = "localhost"): string {
  return `http://${host}:${String(port).replace(/^:/, "")}`;
}

export interface PortBadgeProps extends Omit<React.HTMLAttributes<HTMLElement>, "color" | "children"> {
  /** Port number; a leading colon is stripped when a string is given. */
  port: number | string;
  /** Show a leading colon (":3000"). Default false. */
  colon?: boolean;
  /** Makes the badge a link: `true` opens `localhost:<port>` (see `host`), a string is used as is. */
  href?: string | boolean;
  /** Host for `href={true}`. Default "localhost". */
  host?: string;
  /** Link target. Default "_blank" (with `rel="noopener noreferrer"`). */
  target?: string;
  /** Categorical colour. Without `accent` or `tone` the badge follows the inherited accent (or primary). */
  accent?: Accent;
  /** Semantic colour; wins over the accent. */
  tone?: ToneInput;
  /**
   * Badge height and text size.
   * @default "sm"
   */
  size?: "sm" | "md" | "lg";
}

/** Small monospaced chip for a network port, optionally linking to it on localhost. */
export const PortBadge = React.forwardRef<HTMLElement, PortBadgeProps>(
  ({ port, colon = false, href, host, target = "_blank", accent, tone, size = "sm", className, style, ...props }, ref) => {
    const text = `${colon ? ":" : ""}${String(port).replace(/^:/, "")}`;
    const url = href === true ? portHref(port, host) : typeof href === "string" && isSafeHref(href) ? href : undefined;
    const badgeClass = cn("font-mono tabular-nums", !tone && accentClasses.soft);
    if (url) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={url}
          target={target}
          rel={target === "_blank" ? "noopener noreferrer" : undefined}
          aria-label={`Open ${url.replace(/^https?:\/\//, "")}`}
          data-slot="port-badge"
          style={accentStyle(accent, style)}
          className={cn("inline-flex rounded-control transition-opacity hover:opacity-80", focusRing, className)}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          <Badge size={size} tone={tone} className={badgeClass}>
            {text}
          </Badge>
        </a>
      );
    }
    return (
      <Badge
        ref={ref as React.Ref<HTMLSpanElement>}
        data-slot="port-badge"
        size={size}
        tone={tone}
        style={accentStyle(accent, style)}
        className={cn(badgeClass, className)}
        {...(props as Omit<React.HTMLAttributes<HTMLSpanElement>, "color">)}
      >
        {text}
      </Badge>
    );
  }
);
PortBadge.displayName = "PortBadge";

export interface PortBadgeListProps extends Omit<React.HTMLAttributes<HTMLUListElement>, "color" | "children"> {
  /** Ports to show, in order. */
  ports: readonly (number | string)[];
  /** Show at most this many badges, then "+N". Default: all. */
  max?: number;
  /** Link each port to localhost. Default false. */
  linked?: boolean;
  /**
   * Host for the links when `linked`.
   * @default "localhost"
   */
  host?: string;
  /**
   * Shows a leading colon on every badge (":3000").
   * @default false
   */
  colon?: boolean;
  /** Categorical colour for every badge; without `accent` or `tone` they follow the inherited accent. */
  accent?: Accent;
  /** Semantic colour for every badge; wins over `accent`. */
  tone?: ToneInput;
  /**
   * Badge height and text size.
   * @default "sm"
   */
  size?: "sm" | "md" | "lg";
  /** Accessible name of the list. Default "Ports". */
  label?: string;
}

/** A row of port badges with a "+N" overflow chip that names the hidden ports to screen readers and on hover. */
export const PortBadgeList = React.forwardRef<HTMLUListElement, PortBadgeListProps>(
  ({ ports, max, linked = false, host, colon, accent, tone, size = "sm", label = "Ports", className, style, ...props }, ref) => {
    const limit = max !== undefined && Number.isFinite(max) ? Math.max(0, Math.floor(max)) : ports.length;
    const visible = ports.slice(0, limit);
    const hidden = ports.slice(limit);
    if (ports.length === 0) return null;
    return (
      <ul
        ref={ref}
        role="list"
        aria-label={label}
        data-slot="port-badge-list"
        style={accentStyle(accent, style)}
        className={cn("m-0 flex list-none flex-wrap items-center gap-1.5 p-0", className)}
        {...props}
      >
        {visible.map((port, i) => (
          <li key={`${port}-${i}`} className="flex">
            <PortBadge port={port} colon={colon} href={linked || undefined} host={host} tone={tone} size={size} />
          </li>
        ))}
        {hidden.length > 0 ? (
          <li className="flex">
            <Badge
              size={size}
              data-slot="port-badge-overflow"
              title={hidden.join(", ")}
              className="font-mono tabular-nums text-muted-foreground"
            >
              <span aria-hidden>+{hidden.length}</span>
              <span className="sr-only">
                {hidden.length} more: {hidden.join(", ")}
              </span>
            </Badge>
          </li>
        ) : null}
      </ul>
    );
  }
);
PortBadgeList.displayName = "PortBadgeList";
