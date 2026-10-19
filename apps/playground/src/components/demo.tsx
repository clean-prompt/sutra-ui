import * as React from "react";
import { cn, Eyebrow, Heading, prefersReducedMotion, Text } from "@sutra/ui";
import { findPage } from "../nav";
import { href, useHashRoute } from "../router";
import { NavBadge } from "./nav-badge";
import { DemoPanels, PageInstall, type DemoPanelsProps } from "./demo-panels";

export interface DemoProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Anchor id, matches the nav item id so `#/components/<page>/<id>` scrolls here. */
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Dotted canvas background. */
  dots?: boolean;
  /** Classes for the inner canvas (layout of the example). */
  canvasClassName?: string;
  /** Start-aligned, full-width canvas instead of centered content. */
  align?: "center" | "start";
  /** Components or hooks for the generated Props panel; `false` hides it. Default: found from the id, title and code. */
  props?: DemoPanelsProps["props"];
  /** Replaces the source shown in the Code panel (default: the JSX extracted from the page file); `false` hides it. */
  code?: DemoPanelsProps["code"];
}

/** Titled preview card that renders an example on a bg-background canvas. */
export function Demo({
  id,
  title,
  description,
  dots,
  align = "center",
  canvasClassName,
  props: propsFor,
  code,
  className,
  children,
  ...props
}: DemoProps) {
  const route = useHashRoute();
  // New, beta or deprecated per nav.ts, so the badge on the demo matches the one in the sidebar.
  const navItem = id ? findPage(route.section, route.page).page?.items?.find((item) => item.id === id) : undefined;
  return (
    <section id={id} className={cn("scroll-mt-20 space-y-3", className)} {...props}>
      <div className="space-y-1">
        <Heading as="h2" size="lg">
          {id ? (
            <a
              href={href(route.section, route.page, id)}
              onClick={(e) => {
                // Let modified clicks (new tab, new window) follow the link.
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
              }}
              className="hover:underline underline-offset-4"
            >
              {title}
            </a>
          ) : (
            title
          )}
          <NavBadge status={navItem?.status} since={navItem?.since} className="ms-2 align-middle" />
        </Heading>
        {description && (
          <Text size="sm" tone="neutral">
            {description}
          </Text>
        )}
      </div>
      <div className="overflow-hidden rounded-box border border-border bg-background shadow-xs">
        <div
          data-slot="demo-canvas"
          className={cn(
            "relative flex min-h-40 gap-4 p-6 sm:p-8",
            align === "center" ? "flex-wrap items-center justify-center" : "flex-col items-stretch",
            dots && "bg-dots",
            canvasClassName
          )}
        >
          {children}
        </div>
      </div>
      <DemoPanels demoKey={id ?? (typeof title === "string" ? title : undefined)} props={propsFor} code={code} />
    </section>
  );
}

/** Small label used to caption a row of variants inside a Demo. */
export function DemoLabel({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs font-medium text-muted-foreground", className)} {...props} />;
}

export interface PageIntroProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}

/** Page wrapper: title block followed by stacked demos. */
export function PageIntro({ eyebrow, title, description, children }: PageIntroProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:px-8">
      <header className="mb-10 space-y-2">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Heading as="h1" size="display-sm">
          {title}
        </Heading>
        {description && (
          <Text tone="neutral" className="max-w-2xl">
            {description}
          </Text>
        )}
        <PageInstall className="pt-1" />
      </header>
      <div className="space-y-14">{children}</div>
    </div>
  );
}
