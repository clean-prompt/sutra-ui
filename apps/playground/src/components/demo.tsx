import * as React from "react";
import { cn, Eyebrow, Heading, Text } from "@sutra/ui";
import { href, useHashRoute } from "../router";

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
}

/** Titled preview card that renders an example on a bg-background canvas. */
export function Demo({
  id,
  title,
  description,
  dots,
  align = "center",
  canvasClassName,
  className,
  children,
  ...props
}: DemoProps) {
  const route = useHashRoute();
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
                document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:underline underline-offset-4"
            >
              {title}
            </a>
          ) : (
            title
          )}
        </Heading>
        {description && (
          <Text size="sm" tone="neutral">
            {description}
          </Text>
        )}
      </div>
      <div className="overflow-hidden rounded-box border border-border bg-background shadow-xs">
        <div
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
      </header>
      <div className="space-y-14">{children}</div>
    </div>
  );
}
