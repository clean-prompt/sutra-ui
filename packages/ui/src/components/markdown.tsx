import * as React from "react";
import ReactMarkdown, { type Components, type Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { RiCheckLine, RiFileCopyLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useCopy } from "../hooks/use-copy";
import { InlineCode } from "./typography";
import { ChatInlineCitation, type ChatSourceData } from "./chat-source";

/* ------------------------------------------------------------------ */
/* Citations                                                           */
/* ------------------------------------------------------------------ */

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const CITE_SKIP = new Set(["code", "pre", "a", "script", "style", "kbd", "samp"]);
const CITE_RE = /\[(\d{1,3}(?:\s*,\s*\d{1,3})*)\]/g;

/** rehype pass: `[n]` / `[2, 3]` in prose (not code, links or math) become citation nodes, bounded by `max`. */
function rehypeCitations(options: { max: number }) {
  const { max } = options;
  return (tree: HastNode) => {
    const walk = (node: HastNode) => {
      if (!node.children) return;
      const out: HastNode[] = [];
      for (const child of node.children) {
        if (child.type === "element") {
          const cls = child.properties?.className;
          const isMath = Array.isArray(cls) && cls.some((c) => typeof c === "string" && c.startsWith("math"));
          if (!CITE_SKIP.has(child.tagName ?? "") && !isMath) walk(child);
          out.push(child);
          continue;
        }
        if (child.type !== "text" || !child.value) {
          out.push(child);
          continue;
        }
        const text = child.value;
        CITE_RE.lastIndex = 0;
        let last = 0;
        let m: RegExpExecArray | null;
        while ((m = CITE_RE.exec(text))) {
          const nums = m[1].split(",").map((n) => Number(n.trim()));
          if (nums.some((n) => n < 1 || n > max)) continue;
          if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
          nums.forEach((n) => {
            out.push({
              type: "element",
              tagName: "sup",
              properties: { dataSutraCite: String(n) },
              children: [{ type: "text", value: String(n) }],
            });
          });
          last = m.index + m[0].length;
        }
        if (last === 0) {
          out.push(child);
          continue;
        }
        if (last < text.length) out.push({ type: "text", value: text.slice(last) });
      }
      node.children = out;
    };
    walk(tree);
  };
}

export interface MarkdownCitationSource extends Partial<ChatSourceData> {
  title?: string;
}

interface CitationContextValue {
  sources?: MarkdownCitationSource[];
  onCite?: (n: number) => void;
}

const CitationContext = React.createContext<CitationContextValue>({});

const citePill =
  "mx-0.5 inline-flex h-4 min-w-4 -translate-y-px cursor-pointer items-center justify-center rounded-full bg-muted px-1 align-super text-[10px] font-medium leading-none tabular-nums text-muted-foreground no-underline transition-colors hover:bg-primary-soft hover:text-primary-soft-foreground";

function MarkdownCitation({ n }: { n: number }) {
  const { sources, onCite } = React.useContext(CitationContext);
  const source = sources?.[n - 1];
  if (onCite) {
    return (
      <button
        type="button"
        data-citation={n}
        title={source?.title ?? `Source ${n}`}
        aria-label={`Source ${n}${source?.title ? `: ${source.title}` : ""}`}
        onClick={() => onCite(n)}
        className={cn(citePill, focusRing)}
      >
        {n}
      </button>
    );
  }
  if (source?.href) {
    return <ChatInlineCitation index={n} href={source.href} title={source.title} snippet={source.snippet} data-citation={n} />;
  }
  return (
    <sup data-citation={n} title={source?.title} className={citePill.replace("cursor-pointer ", "")}>
      {n}
    </sup>
  );
}

function textFromChildren(children: React.ReactNode): string {
  if (children == null || typeof children === "boolean") return "";
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(textFromChildren).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(children)) {
    return textFromChildren(children.props.children);
  }
  return "";
}

interface MarkdownCodeBlockProps {
  code: string;
  language?: string;
}

function MarkdownCodeBlock({ code, language }: MarkdownCodeBlockProps) {
  const { copied, copy } = useCopy();
  return (
    <div className="group/code my-4 overflow-hidden rounded-box border border-code-border bg-code text-code-foreground shadow-xs [color-scheme:dark]">
      <div className="flex h-9 items-center justify-between border-b border-code-foreground/10 bg-code-foreground/[0.03] pl-3.5 pr-1.5">
        <span className="font-mono text-xs lowercase text-code-muted">{language || "text"}</span>
        <button
          type="button"
          onClick={() => void copy(code)}
          aria-label={copied ? "Copied" : "Copy code"}
          title={copied ? "Copied" : "Copy code"}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-control px-2 text-xs text-code-muted transition-colors hover:bg-code-foreground/10 hover:text-code-foreground",
            focusRing
          )}
        >
          {copied ? (
            <RiCheckLine key="check" className="size-3.5 animate-in zoom-in-50 duration-200" />
          ) : (
            <RiFileCopyLine key="copy" className="size-3.5" />
          )}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="scrollbar-thin overflow-x-auto p-4 font-mono text-[13px] leading-6">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const defaultComponents: Components = {
  h1: ({ node, className, ...props }) => (
    <h1 className={cn("mb-3 mt-7 text-2xl font-semibold tracking-tight text-foreground", className)} {...props} />
  ),
  h2: ({ node, className, ...props }) => (
    <h2 className={cn("mb-3 mt-7 text-xl font-semibold tracking-tight text-foreground", className)} {...props} />
  ),
  h3: ({ node, className, ...props }) => (
    <h3 className={cn("mb-2 mt-6 text-lg font-semibold text-foreground", className)} {...props} />
  ),
  h4: ({ node, className, ...props }) => (
    <h4 className={cn("mb-2 mt-5 text-base font-semibold text-foreground", className)} {...props} />
  ),
  h5: ({ node, className, ...props }) => (
    <h5 className={cn("mb-2 mt-4 text-sm font-semibold text-foreground", className)} {...props} />
  ),
  h6: ({ node, className, ...props }) => (
    <h6 className={cn("mb-2 mt-4 text-sm font-semibold text-muted-foreground", className)} {...props} />
  ),
  p: ({ node, className, ...props }) => <p className={cn("my-3 leading-7", className)} {...props} />,
  a: ({ node, className, href, ...props }) => {
    const external = typeof href === "string" && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        className={cn(
          "font-medium text-primary underline decoration-primary/30 underline-offset-[3px] transition-colors hover:decoration-primary",
          className
        )}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...props}
      />
    );
  },
  strong: ({ node, className, ...props }) => (
    <strong className={cn("font-semibold text-foreground", className)} {...props} />
  ),
  ul: ({ node, className, ...props }) => (
    <ul className={cn("my-3 list-disc space-y-1.5 pl-6 marker:text-muted-foreground", className)} {...props} />
  ),
  ol: ({ node, className, ...props }) => (
    <ol className={cn("my-3 list-decimal space-y-1.5 pl-6 marker:text-muted-foreground", className)} {...props} />
  ),
  li: ({ node, className, ...props }) => (
    <li className={cn("pl-1 leading-7 [&>ol]:my-1.5 [&>p]:my-1 [&>ul]:my-1.5", className)} {...props} />
  ),
  blockquote: ({ node, className, ...props }) => (
    <blockquote
      className={cn("my-4 border-l-2 border-border-strong pl-4 text-muted-foreground [&>p]:my-1.5", className)}
      {...props}
    />
  ),
  hr: ({ node, className, ...props }) => <hr className={cn("my-6 border-border", className)} {...props} />,
  table: ({ node, className, ...props }) => (
    <div className="scrollbar-thin my-4 w-full overflow-x-auto rounded-box border border-border">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  ),
  thead: ({ node, className, ...props }) => <thead className={cn("bg-subtle", className)} {...props} />,
  tr: ({ node, className, ...props }) => (
    <tr className={cn("border-b border-border last:border-b-0", className)} {...props} />
  ),
  th: ({ node, className, ...props }) => (
    <th
      className={cn("whitespace-nowrap px-3 py-2 text-left font-semibold text-foreground [&[align=center]]:text-center [&[align=right]]:text-right", className)}
      {...props}
    />
  ),
  td: ({ node, className, ...props }) => (
    <td className={cn("px-3 py-2 align-top [&[align=center]]:text-center [&[align=right]]:text-right", className)} {...props} />
  ),
  img: ({ node, className, alt, ...props }) => (
    <img alt={alt ?? ""} className={cn("my-4 max-w-full rounded-box border border-border", className)} {...props} />
  ),
  input: ({ node, className, ...props }) => (
    <input className={cn("mr-1.5 translate-y-px accent-primary", className)} {...props} />
  ),
  sup: ({ node, className, ...props }) => {
    const cite = (props as Record<string, unknown>)["data-sutra-cite"];
    if (cite != null) return <MarkdownCitation n={Number(cite)} />;
    return <sup className={className} {...props} />;
  },
  code: ({ node, className, children, ...props }) => (
    <InlineCode className={className} {...props}>
      {children}
    </InlineCode>
  ),
  pre: ({ node, children }) => {
    const child = React.Children.toArray(children)[0];
    if (React.isValidElement<{ className?: string; children?: React.ReactNode }>(child)) {
      const match = /language-([\w+#.-]+)/.exec(child.props.className ?? "");
      const code = textFromChildren(child.props.children).replace(/\n$/, "");
      return <MarkdownCodeBlock code={code} language={match?.[1]} />;
    }
    return <MarkdownCodeBlock code={textFromChildren(children).replace(/\n$/, "")} />;
  },
};

/** Split markdown into top-level blocks at blank lines, never inside fenced code (or `$$` math when `math`). */
function splitBlocks(markdown: string, math = false): string[] {
  const lines = markdown.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let fence: string | null = null;
  let inMath = false;
  for (const line of lines) {
    const fenceMatch = inMath ? null : /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (fence === null) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
    } else if (math && fence === null) {
      const delimiters = line.match(/(?<!\\)\$\$/g)?.length ?? 0;
      if (delimiters % 2 === 1) inMath = !inMath;
    }
    if (fence === null && !inMath && line.trim() === "" && current.length > 0) {
      blocks.push(current.join("\n"));
      current = [];
      continue;
    }
    if (line.trim() === "" && current.length === 0) continue;
    current.push(line);
  }
  if (current.length > 0) blocks.push(current.join("\n"));
  return blocks;
}

interface MarkdownBlockProps {
  content: string;
  components: Components;
  remarkPlugins: NonNullable<Options["remarkPlugins"]>;
  rehypePlugins?: Options["rehypePlugins"];
}

const MarkdownBlock = React.memo(
  function MarkdownBlock({ content, components, remarkPlugins, rehypePlugins }: MarkdownBlockProps) {
    return (
      <ReactMarkdown components={components} remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
        {content}
      </ReactMarkdown>
    );
  },
  (prev, next) =>
    prev.content === next.content &&
    prev.components === next.components &&
    prev.remarkPlugins === next.remarkPlugins &&
    prev.rehypePlugins === next.rehypePlugins
);

export interface MarkdownProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Markdown source. */
  children: string;
  /** Override or extend the element renderers. Keep the object stable (module scope or useMemo). */
  components?: Components;
  /** Extra remark plugins (GFM is always on). Keep the array stable. */
  remarkPlugins?: Options["remarkPlugins"];
  rehypePlugins?: Options["rehypePlugins"];
  /**
   * Render TeX math with KaTeX: inline `$…$` and display `$$…$$`. Default false.
   * Consumers must also load the KaTeX stylesheet once: `import "katex/dist/katex.min.css";`
   */
  math?: boolean;
  /**
   * Number of citable sources: bracketed refs like `[1]` or `[2,3]` in prose (not code or links)
   * render as citation pills. Defaults to `sources.length` when `sources` is given.
   */
  citeCount?: number;
  /** Sources for citation pills; `sources[n-1]` supplies the title (and href/snippet hover card). */
  sources?: MarkdownCitationSource[];
  /** Called with the 1-based source number when a citation pill is clicked (pills render as buttons). */
  onCite?: (n: number) => void;
}

/** Token-styled markdown renderer (GFM), memoized per block so streaming only re-renders the tail. */
export const Markdown = React.forwardRef<HTMLDivElement, MarkdownProps>(
  (
    { children, components, remarkPlugins, rehypePlugins, math = false, citeCount, sources, onCite, className, ...props },
    ref
  ) => {
    const id = React.useId();
    const blocks = React.useMemo(() => splitBlocks(children ?? "", math), [children, math]);
    const mergedComponents = React.useMemo<Components>(
      () => (components ? { ...defaultComponents, ...components } : defaultComponents),
      [components]
    );
    const plugins = React.useMemo(
      () => [remarkGfm, ...(math ? [remarkMath] : []), ...(remarkPlugins ?? [])],
      [remarkPlugins, math]
    );
    const maxCite = citeCount ?? sources?.length ?? 0;
    const rehype = React.useMemo<Options["rehypePlugins"]>(() => {
      if (!math && maxCite <= 0) return rehypePlugins;
      const list: NonNullable<Options["rehypePlugins"]> = [];
      if (maxCite > 0) list.push([rehypeCitations, { max: maxCite }]);
      if (math) list.push([rehypeKatex, { throwOnError: false, strict: false }]);
      return [...list, ...(rehypePlugins ?? [])];
    }, [rehypePlugins, math, maxCite]);
    const onCiteRef = React.useRef(onCite);
    onCiteRef.current = onCite;
    const hasOnCite = !!onCite;
    const citation = React.useMemo<CitationContextValue>(
      () => ({ sources, onCite: hasOnCite ? (n: number) => onCiteRef.current?.(n) : undefined }),
      [sources, hasOnCite]
    );
    return (
      <CitationContext.Provider value={citation}>
        <div
          ref={ref}
          className={cn(
            "min-w-0 break-words text-[15px] leading-7 text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
            className
          )}
          {...props}
        >
          {blocks.map((block, i) => (
            <MarkdownBlock
              key={`${id}-${i}`}
              content={block}
              components={mergedComponents}
              remarkPlugins={plugins}
              rehypePlugins={rehype}
            />
          ))}
        </div>
      </CitationContext.Provider>
    );
  }
);
Markdown.displayName = "Markdown";
