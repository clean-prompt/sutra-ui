import * as React from "react";
import { cn } from "../lib/cn";
import { safeISO, toValidDate } from "../lib/date";
import { Eyebrow } from "./typography";

const proseBase = [
  "max-w-[68ch] text-pretty leading-[1.75] text-foreground/85",
  "[&>:first-child]:mt-0 [&>:last-child]:mb-0",
  // Headings
  "[&_:is(h1,h2,h3,h4)]:scroll-mt-24 [&_:is(h1,h2,h3,h4)]:font-semibold [&_:is(h1,h2,h3,h4)]:text-balance [&_:is(h1,h2,h3,h4)]:text-foreground",
  "[&_h1]:mb-[0.6em] [&_h1]:mt-[1.6em] [&_h1]:text-[2.1em] [&_h1]:leading-[1.15] [&_h1]:tracking-[-0.025em]",
  "[&_h2]:mb-[0.6em] [&_h2]:mt-[1.9em] [&_h2]:text-[1.5em] [&_h2]:leading-[1.25] [&_h2]:tracking-[-0.02em]",
  "[&_h3]:mb-[0.5em] [&_h3]:mt-[1.6em] [&_h3]:text-[1.25em] [&_h3]:leading-[1.35] [&_h3]:tracking-[-0.01em]",
  "[&_h4]:mb-[0.4em] [&_h4]:mt-[1.4em] [&_h4]:text-[1.05em] [&_h4]:leading-[1.45]",
  "[&_:is(h1,h2,h3,h4)+*]:mt-0",
  "[&_:is(h1,h2,h3,h4)_a]:font-[inherit] [&_:is(h1,h2,h3,h4)_a]:text-inherit [&_:is(h1,h2,h3,h4)_a]:no-underline",
  // Text
  "[&_p]:my-[1.15em]",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/35 [&_a]:decoration-1 [&_a]:underline-offset-[3px] [&_a]:transition-colors [&_a:hover]:decoration-primary",
  "[&_mark]:rounded-xs [&_mark]:bg-warning-soft [&_mark]:px-1 [&_mark]:text-warning-soft-foreground",
  // Lists
  "[&_ul]:my-[1.15em] [&_ul]:list-disc [&_ul]:pl-[1.4em]",
  "[&_ol]:my-[1.15em] [&_ol]:list-decimal [&_ol]:pl-[1.4em]",
  "[&_li]:my-[0.4em] [&_li]:pl-[0.3em] [&_li::marker]:text-muted-foreground",
  "[&_li>ul]:my-[0.4em] [&_li>ol]:my-[0.4em]",
  // Blockquote
  "[&_blockquote]:my-[1.6em] [&_blockquote]:border-l-[3px] [&_blockquote]:border-primary [&_blockquote]:pl-[1.1em] [&_blockquote]:text-[1.05em] [&_blockquote]:italic [&_blockquote]:text-foreground",
  "[&_blockquote_p]:my-[0.5em] [&_blockquote_cite]:mt-2 [&_blockquote_cite]:block [&_blockquote_cite]:text-[0.85em] [&_blockquote_cite]:not-italic [&_blockquote_cite]:text-muted-foreground",
  // Code
  "[&_:not(pre)>code]:rounded-xs [&_:not(pre)>code]:border [&_:not(pre)>code]:border-border [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-[0.35em] [&_:not(pre)>code]:py-[0.1em] [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.85em] [&_:not(pre)>code]:text-foreground",
  "[&_pre]:my-[1.6em] [&_pre]:overflow-x-auto [&_pre]:rounded-box [&_pre]:border [&_pre]:border-border [&_pre]:bg-subtle [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[0.85em] [&_pre]:leading-[1.7] [&_pre]:text-foreground [&_pre]:scrollbar-thin",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit",
  "[&_kbd]:rounded-xs [&_kbd]:border [&_kbd]:border-border [&_kbd]:bg-muted [&_kbd]:px-1 [&_kbd]:font-sans [&_kbd]:text-[0.8em]",
  // Media
  "[&_img]:my-[1.8em] [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-box [&_img]:border [&_img]:border-border",
  "[&_video]:my-[1.8em] [&_video]:max-w-full [&_video]:rounded-box",
  "[&_figure]:my-[1.8em] [&_figure>img]:my-0 [&_figure>pre]:my-0",
  "[&_figcaption]:mt-[0.75em] [&_figcaption]:text-center [&_figcaption]:text-[0.85em] [&_figcaption]:text-muted-foreground",
  // Rules & tables
  "[&_hr]:my-[2.5em] [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-border",
  "[&_table]:my-[1.6em] [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-[0.9em]",
  "[&_thead_th]:border-b [&_thead_th]:border-border-strong [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground",
  "[&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
  "[&_:is(th,td):first-child]:pl-0 [&_:is(th,td):last-child]:pr-0",
];

const proseSize = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
} as const;

export interface BlogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  /** Remove the readable max width. */
  fullWidth?: boolean;
  as?: "div" | "article" | "section";
}

/** Typographic container that styles raw HTML or Markdown output. */
export const BlogContent = React.forwardRef<HTMLDivElement, BlogContentProps>(
  ({ className, size = "md", fullWidth, as = "div", ...props }, ref) => {
    const Comp = as as React.ElementType;
    return (
      <Comp
        ref={ref}
        className={cn(proseBase, proseSize[size], fullWidth && "max-w-none", className)}
        {...props}
      />
    );
  }
);
BlogContent.displayName = "BlogContent";

/** Alias of `BlogContent`. */
export const Prose = BlogContent;
export type ProseProps = BlogContentProps;

export interface BlogPostHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  category?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  author?: React.ReactNode;
  date?: string | Date;
  /** Minutes (number) or a preformatted string. */
  readTime?: number | string;
  align?: "left" | "center";
}

function formatDate(date: string | Date) {
  const d = toValidDate(date);
  if (!d) return typeof date === "string" ? date : "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Article heading: category, title, subtitle and meta row. */
export const BlogPostHeader = React.forwardRef<HTMLElement, BlogPostHeaderProps>(
  ({ className, category, title, subtitle, author, date, readTime, align = "left", children, ...props }, ref) => {
    const meta: React.ReactNode[] = [];
    if (author) meta.push(<span key="author" className="font-medium text-foreground">{author}</span>);
    if (date)
      meta.push(
        <time key="date" dateTime={typeof date === "string" ? (toValidDate(date) ? date : undefined) : safeISO(date)}>
          {formatDate(date)}
        </time>
      );
    if (readTime !== undefined && readTime !== "")
      meta.push(<span key="read">{typeof readTime === "number" ? `${readTime} min read` : readTime}</span>);

    return (
      <header
        ref={ref}
        className={cn(
          "flex flex-col gap-4",
          align === "center" && "items-center text-center",
          className
        )}
        {...props}
      >
        {category ? <Eyebrow>{category}</Eyebrow> : null}
        <h1 className="max-w-[24ch] text-balance text-display-xs font-semibold text-foreground md:text-display-md">
          {title}
        </h1>
        {subtitle ? (
          <p className="max-w-[60ch] text-pretty text-lg text-muted-foreground">{subtitle}</p>
        ) : null}
        {meta.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {meta.map((node, i) => (
              <React.Fragment key={i}>
                {i > 0 ? <span aria-hidden className="size-1 rounded-full bg-border-strong" /> : null}
                {node}
              </React.Fragment>
            ))}
          </div>
        ) : null}
        {children}
      </header>
    );
  }
);
BlogPostHeader.displayName = "BlogPostHeader";

export interface BlogTocHeading {
  id: string;
  title: React.ReactNode;
  /** Heading level, typically 2–4. */
  level?: number;
}

export interface BlogTableOfContentsProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  headings: BlogTocHeading[];
  title?: React.ReactNode;
  /** Controlled active id; otherwise tracked with IntersectionObserver. */
  activeId?: string;
  /** Root margin for the observer. */
  rootMargin?: string;
  /** Smooth-scroll to headings on click. Default true. */
  smoothScroll?: boolean;
}

/** "On this page" navigation that highlights the heading in view. */
export const BlogTableOfContents = React.forwardRef<HTMLElement, BlogTableOfContentsProps>(
  (
    {
      className,
      headings,
      title = "On this page",
      activeId: activeProp,
      rootMargin = "0px 0px -65% 0px",
      smoothScroll = true,
      ...props
    },
    ref
  ) => {
    const [observed, setObserved] = React.useState<string | undefined>(headings[0]?.id);
    const ids = headings.map((h) => h.id).join("|");

    React.useEffect(() => {
      if (activeProp !== undefined || typeof IntersectionObserver === "undefined") return;
      const order = ids ? ids.split("|") : [];
      const elements = order
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null);
      if (elements.length === 0) return;
      const visible = new Map<string, boolean>();
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
          const first = order.find((id) => visible.get(id));
          if (first) setObserved(first);
        },
        { rootMargin, threshold: [0, 1] }
      );
      elements.forEach((el) => observer.observe(el));
      return () => observer.disconnect();
    }, [ids, rootMargin, activeProp]);

    const active = activeProp ?? observed;
    const minLevel = headings.reduce((m, h) => Math.min(m, h.level ?? 2), Infinity);

    return (
      <nav ref={ref} aria-label="Table of contents" className={cn("text-sm", className)} {...props}>
        {title ? <p className="mb-3 text-xs font-semibold text-foreground">{title}</p> : null}
        <ul className="flex flex-col border-l border-border">
          {headings.map((h) => {
            const isActive = h.id === active;
            const depth = Math.max(0, (h.level ?? 2) - (Number.isFinite(minLevel) ? minLevel : 2));
            return (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  aria-current={isActive ? "location" : undefined}
                  onClick={(e) => {
                    if (!smoothScroll) return;
                    const el = document.getElementById(h.id);
                    if (!el) return;
                    e.preventDefault();
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    history.replaceState(null, "", `#${h.id}`);
                    if (activeProp === undefined) setObserved(h.id);
                  }}
                  className={cn(
                    "-ml-px block border-l py-1.5 pr-2 leading-snug outline-none transition-colors focus-visible:text-foreground focus-visible:underline",
                    isActive
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground"
                  )}
                  style={{ paddingLeft: 12 + depth * 12 }}
                >
                  {h.title}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }
);
BlogTableOfContents.displayName = "BlogTableOfContents";
