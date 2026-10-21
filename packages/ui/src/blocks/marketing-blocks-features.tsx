/** FeatureGrid and InstallSnippet: the feature cards and the tabbed install commands. */
import * as React from "react";
import { cn } from "../lib/cn";
import { InlineCopy } from "../patterns/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../primitives/tabs";

export interface FeatureGridItem {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}

export interface FeatureGridProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Features to list; each has a `title`, a `description` and an `icon`. */
  features: FeatureGridItem[];
  /** Small label above the title. */
  eyebrow?: React.ReactNode;
  /** Section heading. */
  title?: React.ReactNode;
  /** Supporting text under the heading. */
  description?: React.ReactNode;
  /**
   * Number of columns on large screens (fewer on small ones).
   * @default 3
   */
  columns?: 2 | 3 | 4;
}

const featureCols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" } as const;

/** Icon + title + description cards in a 2–4 column grid, with an optional section header. */
export const FeatureGrid = React.forwardRef<HTMLElement, FeatureGridProps>(
  ({ features, eyebrow, title, description, columns = 3, className, ...props }, ref) => {
    const titleId = React.useId();
    return (
      <section ref={ref} aria-labelledby={title ? titleId : undefined} className={cn("flex flex-col gap-8", className)} {...props}>
        {(eyebrow || title || description) && (
          <div className="flex flex-col items-center gap-2 text-center">
            {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>}
            {title && (
              <h2 id={titleId} className="text-display-xs font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {description && <p className="max-w-xl text-muted-foreground">{description}</p>}
          </div>
        )}
        <ul data-columns={columns} className={cn("grid gap-4", featureCols[columns])}>
          {features.map((f) => (
            <li key={f.title} className="flex flex-col gap-3 rounded-box border border-border bg-card p-5 shadow-xs">
              <span aria-hidden className="inline-flex size-10 items-center justify-center rounded-box bg-primary-soft text-primary-soft-foreground [&_svg]:size-5">
                {f.icon}
              </span>
              <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </li>
          ))}
        </ul>
      </section>
    );
  }
);
FeatureGrid.displayName = "FeatureGrid";

/* ------------------------------------------------------------------ */
/* InstallSnippet                                                      */
/* ------------------------------------------------------------------ */

export interface InstallSnippetTab {
  id: string;
  label: string;
  /** One command, or several run in order. */
  command: string | string[];
  note?: React.ReactNode;
}

export interface InstallSnippetProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** Install methods as tabs; each has an `id`, a `label` and a `command` (or several). */
  tabs: InstallSnippetTab[];
  /** Controlled selected tab id. Use with `onValueChange`. */
  value?: string;
  /** Initially selected tab id when uncontrolled. */
  defaultValue?: string;
  /** Called with the id of the tab the user picked. */
  onValueChange?: (id: string) => void;
  /**
   * Accessible name of the tab list.
   * @default "Install method"
   */
  label?: string;
}

/** Tabbed install commands per platform or package manager, each copyable. */
export const InstallSnippet = React.forwardRef<HTMLDivElement, InstallSnippetProps>(
  ({ tabs, value, defaultValue, onValueChange, label = "Install method", className, ...props }, ref) => (
    <div ref={ref} className={cn("w-full rounded-box border border-border bg-card p-4 shadow-xs", className)} {...props}>
      <Tabs variant="underline" size="sm" value={value} defaultValue={defaultValue ?? tabs[0]?.id} onValueChange={onValueChange}>
        <TabsList aria-label={label}>
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => {
          const lines = Array.isArray(t.command) ? t.command : [t.command];
          return (
            <TabsContent key={t.id} value={t.id} className="flex flex-col gap-2">
              {lines.map((line) => (
                <InlineCopy key={line} value={line} theme="dark" className="w-full" />
              ))}
              {t.note && <p className="text-xs text-muted-foreground">{t.note}</p>}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  )
);
InstallSnippet.displayName = "InstallSnippet";
