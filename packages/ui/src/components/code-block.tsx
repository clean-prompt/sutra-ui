import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { RiFileCodeLine, RiTerminalBoxLine, RiTextWrap } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { CopyButton, CopyField } from "./copy-button";

/* ------------------------------------------------------------------ */
/* Tokenizer                                                           */
/* ------------------------------------------------------------------ */

type TokenType =
  | "plain"
  | "keyword"
  | "string"
  | "comment"
  | "number"
  | "function"
  | "type"
  | "tag"
  | "attr"
  | "property"
  | "punctuation"
  | "variable";

interface Token {
  type: TokenType;
  value: string;
}

type Rule = readonly [TokenType, RegExp];

const words = (list: string) => new RegExp(`\\b(?:${list.trim().split(/\s+/).join("|")})\\b`, "y");

const JS_KEYWORDS = words(`
  abstract as async await break case catch class const continue debugger declare default delete do else
  enum export extends false finally for from function get if implements import in infer instanceof interface
  keyof let namespace new null of private protected public readonly return satisfies set static super switch
  this throw true try type typeof undefined var void while with yield
`);

const STRING_RE = /`(?:\\[\s\S]|[^\\`])*`?|"(?:\\.|[^\\"\n])*"?|'(?:\\.|[^\\'\n])*'?/y;
const PUNCT_RE = /=>|\.\.\.|[=!<>]=+|&&|\|\||\?\?|[{}()[\];,.:?]|[+\-*/%=&|^~!<>]/y;
const WS_RE = /\s+/y;

const jsRules = (jsx: boolean): Rule[] => [
  ["comment", /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y],
  ["string", STRING_RE],
  ...(jsx
    ? ([
        ["tag", /<\/?[A-Za-z][\w.-]*|\/>/y],
        ["attr", /[A-Za-z_][\w-]*(?==[{"'])/y],
      ] as Rule[])
    : []),
  ["keyword", JS_KEYWORDS],
  ["number", /\b(?:0[xX][\da-fA-F_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?n?)\b/y],
  ["property", /(?<=\.)[A-Za-z_$][\w$]*(?![\w$])(?!\s*\()/y],
  ["function", /[A-Za-z_$][\w$]*(?=\s*(?:<[^>\n]*>)?\()/y],
  ["type", /[A-Z][\w$]*/y],
  ["plain", /[A-Za-z_$][\w$]*/y],
  ["punctuation", PUNCT_RE],
  ["plain", WS_RE],
];

const jsonRules: Rule[] = [
  ["comment", /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y],
  ["property", /"(?:\\.|[^\\"\n])*"(?=\s*:)/y],
  ["string", /"(?:\\.|[^\\"\n])*"?/y],
  ["number", /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y],
  ["keyword", /\b(?:true|false|null)\b/y],
  ["punctuation", /[{}[\],:]/y],
  ["plain", WS_RE],
];

const cssRules: Rule[] = [
  ["comment", /\/\*[\s\S]*?(?:\*\/|$)/y],
  ["string", /"(?:\\.|[^\\"\n])*"?|'(?:\\.|[^\\'\n])*'?/y],
  ["keyword", /@[\w-]+|!important\b/y],
  ["number", /#[\da-fA-F]{3,8}\b/y],
  ["variable", /--[\w-]+/y],
  ["property", /[a-z-]+(?=\s*:\s*[^;{}\n]*(?:[;}\n]|$))(?![^{\n]*\{)/y],
  ["function", /[\w-]+(?=\()/y],
  ["number", /-?(?:\d+\.?\d*|\.\d+)(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex|s|ms|deg|turn|fr|dvh|svh)?/y],
  ["type", /[.#][A-Za-z_-][\w-]*/y],
  ["plain", /[\w-]+/y],
  ["punctuation", /[{}()[\];,:>+~*=]/y],
  ["plain", WS_RE],
];

const htmlRules: Rule[] = [
  ["comment", /<!--[\s\S]*?(?:-->|$)/y],
  ["tag", /<\/?[A-Za-z][\w:-]*|\/?>/y],
  ["attr", /[A-Za-z_:@][\w:.-]*(?==)/y],
  ["string", /(?<==)(?:"[^"]*"?|'[^']*'?)/y],
  ["number", /&[#\w]+;/y],
  ["punctuation", /=/y],
  ["plain", /[^<&=\s]+/y],
  ["plain", WS_RE],
];

const bashRules: Rule[] = [
  ["punctuation", /^\s*[$>](?= )/my],
  ["comment", /(?<!\S)#[^\n]*/y],
  ["string", /"(?:\\.|[^\\"])*"?|'[^']*'?/y],
  ["variable", /\$(?:\{[^}\n]*\}?|[\w@#?$!*-]+)/y],
  [
    "keyword",
    /\b(?:if|then|else|elif|fi|for|while|until|do|done|case|esac|in|function|return|export|local|sudo|source)\b/y,
  ],
  ["function", /(?<=(?:^|[|;&(]|^\s*[$>])\s*)[A-Za-z_.~/][\w.~/@:-]*/my],
  ["attr", /(?<!\S)--?[A-Za-z][\w-]*/y],
  ["number", /\b\d+(?:\.\d+)*\b/y],
  ["punctuation", /[|&;<>()\\]+/y],
  ["plain", /[^\s"'$|&;<>()\\]+/y],
  ["plain", WS_RE],
];

function rulesFor(language?: string): Rule[] | null {
  switch ((language ?? "").toLowerCase()) {
    case "js":
    case "javascript":
    case "mjs":
    case "cjs":
    case "ts":
    case "typescript":
    case "mts":
      return jsRules(false);
    case "jsx":
    case "tsx":
      return jsRules(true);
    case "json":
    case "jsonc":
    case "json5":
      return jsonRules;
    case "css":
    case "scss":
    case "less":
      return cssRules;
    case "html":
    case "xml":
    case "svg":
    case "vue":
    case "svelte":
      return htmlRules;
    case "bash":
    case "sh":
    case "shell":
    case "zsh":
    case "console":
    case "terminal":
      return bashRules;
    default:
      return null;
  }
}

function tokenize(code: string, language?: string): Token[][] {
  const rules = rulesFor(language);
  const tokens: Token[] = [];
  const push = (type: TokenType, value: string) => {
    const last = tokens[tokens.length - 1];
    if (last && last.type === type) last.value += value;
    else tokens.push({ type, value });
  };
  if (!rules) {
    push("plain", code);
  } else {
    let pos = 0;
    outer: while (pos < code.length) {
      for (const [type, re] of rules) {
        re.lastIndex = pos;
        const match = re.exec(code);
        if (match && match[0].length > 0) {
          push(type, match[0]);
          pos += match[0].length;
          continue outer;
        }
      }
      push("plain", code[pos]!);
      pos++;
    }
  }
  const lines: Token[][] = [[]];
  for (const token of tokens) {
    const parts = token.value.split("\n");
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1]!.push({ type: token.type, value: part });
    });
  }
  return lines;
}

export type CodeBlockTheme = "dark" | "light";

const tokenClass: Record<CodeBlockTheme, Record<TokenType, string>> = {
  dark: {
    plain: "",
    keyword: "text-violet-300",
    string: "text-emerald-300",
    comment: "italic text-code-muted/75",
    number: "text-amber-300",
    function: "text-sky-300",
    type: "text-rose-300",
    tag: "text-pink-300",
    attr: "text-amber-200",
    property: "text-sky-200",
    punctuation: "text-code-muted",
    variable: "text-cyan-300",
  },
  light: {
    plain: "",
    keyword: "text-violet-600 dark:text-violet-300",
    string: "text-emerald-700 dark:text-emerald-300",
    comment: "italic text-muted-foreground",
    number: "text-amber-700 dark:text-amber-300",
    function: "text-blue-600 dark:text-sky-300",
    type: "text-rose-600 dark:text-rose-300",
    tag: "text-pink-600 dark:text-pink-300",
    attr: "text-amber-700 dark:text-amber-200",
    property: "text-sky-700 dark:text-sky-200",
    punctuation: "text-muted-foreground",
    variable: "text-cyan-700 dark:text-cyan-300",
  },
};

const surface: Record<CodeBlockTheme, { root: string; header: string; muted: string; button: string }> = {
  dark: {
    root: "border-code-border bg-code text-code-foreground [color-scheme:dark]",
    header: "border-code-foreground/10 bg-code-foreground/[0.03]",
    muted: "text-code-muted",
    button: "text-code-muted hover:bg-code-foreground/10 hover:text-code-foreground",
  },
  light: {
    root: "border-border bg-subtle text-foreground",
    header: "border-border bg-muted/50",
    muted: "text-muted-foreground",
    button: "text-muted-foreground hover:bg-accent hover:text-foreground",
  },
};

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

/** The shared copy button, tinted for the code surface. */
function CodeCopyButton({
  text,
  theme,
  className,
  label = "Copy code",
}: {
  text: string;
  theme: CodeBlockTheme;
  className?: string;
  label?: string;
}) {
  return <CopyButton value={text} label={label} className={cn(surface[theme].button, className)} />;
}

interface CodeBodyProps {
  code: string;
  language?: string;
  theme: CodeBlockTheme;
  showLineNumbers?: boolean;
  startLine?: number;
  highlightLines?: number[];
  wrap?: boolean;
  maxHeight?: number | string;
  className?: string;
}

function CodeBody({
  code,
  language,
  theme,
  showLineNumbers,
  startLine = 1,
  highlightLines,
  wrap,
  maxHeight,
  className,
}: CodeBodyProps) {
  const lines = React.useMemo(() => tokenize(code, language), [code, language]);
  const highlighted = React.useMemo(() => new Set(highlightLines ?? []), [highlightLines]);
  const digits = String(startLine + lines.length - 1).length;
  const colors = tokenClass[theme];

  return (
    <pre
      tabIndex={0}
      className={cn("overflow-auto py-3.5 font-mono text-[13px] leading-6 outline-none scrollbar-thin", className)}
      style={maxHeight !== undefined ? { maxHeight } : undefined}
    >
      <code className={cn("grid", wrap ? "w-full" : "w-max min-w-full")} data-language={language}>
        {lines.map((line, i) => {
          const n = startLine + i;
          const isHighlighted = highlighted.has(n);
          return (
            <span
              key={i}
              className={cn(
                "flex px-4",
                isHighlighted && "bg-primary/15 shadow-[inset_2px_0_0_var(--primary)]"
              )}
            >
              {showLineNumbers ? (
                <span
                  aria-hidden
                  className={cn(
                    "mr-4 shrink-0 select-none text-right tabular-nums",
                    isHighlighted ? "opacity-80" : "opacity-40"
                  )}
                  style={{ minWidth: `${digits}ch` }}
                >
                  {n}
                </span>
              ) : null}
              <span className={cn(wrap ? "min-w-0 flex-1 whitespace-pre-wrap break-words" : "whitespace-pre")}>
                {line.length === 0
                  ? " "
                  : line.map((token, j) =>
                      token.type === "plain" ? (
                        <React.Fragment key={j}>{token.value}</React.Fragment>
                      ) : (
                        <span key={j} className={colors[token.type]}>
                          {token.value}
                        </span>
                      )
                    )}
              </span>
            </span>
          );
        })}
      </code>
    </pre>
  );
}

const isShell = (language?: string) =>
  ["bash", "sh", "shell", "zsh", "console", "terminal"].includes((language ?? "").toLowerCase());

/* ------------------------------------------------------------------ */
/* CodeBlock                                                           */
/* ------------------------------------------------------------------ */

export interface CodeBlockProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Source to display. `children` (a string) works too. */
  code?: string;
  children?: string;
  language?: string;
  filename?: string;
  /** dark: always-dark editor surface · light: follows the app theme */
  theme?: CodeBlockTheme;
  showLineNumbers?: boolean;
  startLine?: number;
  /** 1-based line numbers to highlight. */
  highlightLines?: number[];
  wrap?: boolean;
  defaultWrap?: boolean;
  onWrapChange?: (wrap: boolean) => void;
  /** Show a soft-wrap toggle in the header. */
  showWrapToggle?: boolean;
  maxHeight?: number | string;
  copyable?: boolean;
  hideHeader?: boolean;
  /** Extra header actions, placed before the copy button. */
  actions?: React.ReactNode;
}

/** Syntax-highlighted code with filename, copy, line numbers and highlights. */
export const CodeBlock = React.forwardRef<HTMLDivElement, CodeBlockProps>(
  (
    {
      className,
      code: codeProp,
      children,
      language,
      filename,
      theme = "dark",
      showLineNumbers,
      startLine,
      highlightLines,
      wrap: wrapProp,
      defaultWrap = false,
      onWrapChange,
      showWrapToggle,
      maxHeight,
      copyable = true,
      hideHeader,
      actions,
      ...props
    },
    ref
  ) => {
    const code = (codeProp ?? children ?? "").replace(/\n$/, "");
    const [wrap, setWrap] = useControllableState({
      value: wrapProp,
      defaultValue: defaultWrap,
      onChange: onWrapChange,
    });
    const s = surface[theme];
    const hasHeader = !hideHeader && (!!filename || !!language || !!actions || !!showWrapToggle);

    return (
      <div
        ref={ref}
        className={cn("group/code relative overflow-hidden rounded-box border shadow-xs", s.root, className)}
        {...props}
      >
        {hasHeader ? (
          <div className={cn("flex h-10 items-center gap-2 border-b pl-4 pr-1.5 text-xs", s.header)}>
            {filename ? (
              <>
                {isShell(language) ? (
                  <RiTerminalBoxLine aria-hidden className={cn("size-4 shrink-0", s.muted)} />
                ) : (
                  <RiFileCodeLine aria-hidden className={cn("size-4 shrink-0", s.muted)} />
                )}
                <span className="truncate font-medium">{filename}</span>
              </>
            ) : null}
            <span className="flex-1" />
            {language ? (
              <span className={cn("px-1.5 font-mono text-2xs uppercase tracking-wider", s.muted)}>
                {language}
              </span>
            ) : null}
            {actions}
            {showWrapToggle ? (
              <button
                type="button"
                aria-pressed={wrap}
                aria-label="Toggle line wrap"
                title="Toggle line wrap"
                onClick={() => setWrap(!wrap)}
                className={cn(
                  "inline-flex size-7 cursor-pointer items-center justify-center rounded-sm transition-colors",
                  s.button,
                  wrap && (theme === "dark" ? "bg-code-foreground/10 text-code-foreground" : "bg-accent text-foreground"),
                  focusRing
                )}
              >
                <RiTextWrap aria-hidden className="size-4" />
              </button>
            ) : null}
            {copyable ? <CodeCopyButton text={code} theme={theme} /> : null}
          </div>
        ) : copyable ? (
          <CodeCopyButton
            text={code}
            theme={theme}
            className={cn(
              "absolute right-2 top-2 z-[1] opacity-0 backdrop-blur-sm group-hover/code:opacity-100 focus-visible:opacity-100",
              theme === "dark" ? "bg-code-border/60" : "bg-background/80"
            )}
          />
        ) : null}
        <CodeBody
          code={code}
          language={language}
          theme={theme}
          showLineNumbers={showLineNumbers}
          startLine={startLine}
          highlightLines={highlightLines}
          wrap={wrap}
          maxHeight={maxHeight}
          className={!hasHeader && copyable ? "pr-10" : undefined}
        />
      </div>
    );
  }
);
CodeBlock.displayName = "CodeBlock";

/* ------------------------------------------------------------------ */
/* CodeBlockTabs                                                       */
/* ------------------------------------------------------------------ */

export interface CodeBlockTab {
  value?: string;
  label: React.ReactNode;
  code: string;
  language?: string;
  icon?: React.ReactNode;
  highlightLines?: number[];
}

export interface CodeBlockTabsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "dir"> {
  tabs: CodeBlockTab[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  theme?: CodeBlockTheme;
  showLineNumbers?: boolean;
  wrap?: boolean;
  maxHeight?: number | string;
  copyable?: boolean;
}

/** Code block with tabs, e.g. npm / pnpm / yarn or several files. */
export const CodeBlockTabs = React.forwardRef<HTMLDivElement, CodeBlockTabsProps>(
  (
    {
      className,
      tabs,
      value: valueProp,
      defaultValue,
      onValueChange,
      theme = "dark",
      showLineNumbers,
      wrap,
      maxHeight,
      copyable = true,
      ...props
    },
    ref
  ) => {
    const keyOf = (tab: CodeBlockTab, i: number) =>
      tab.value ?? (typeof tab.label === "string" ? tab.label : String(i));
    const [value, setValue] = useControllableState<string>({
      value: valueProp,
      defaultValue: defaultValue ?? (tabs[0] ? keyOf(tabs[0], 0) : ""),
      onChange: onValueChange,
    });
    const s = surface[theme];
    const activeIndex = Math.max(
      0,
      tabs.findIndex((t, i) => keyOf(t, i) === value)
    );
    const active = tabs[activeIndex];

    return (
      <TabsPrimitive.Root
        ref={ref}
        value={value}
        onValueChange={setValue}
        className={cn("overflow-hidden rounded-box border shadow-xs", s.root, className)}
        {...props}
      >
        <div className={cn("flex h-10 items-center gap-2 border-b pl-2 pr-1.5", s.header)}>
          <TabsPrimitive.List className="flex h-full min-w-0 flex-1 items-stretch gap-1 overflow-x-auto scrollbar-none">
            {tabs.map((tab, i) => (
              <TabsPrimitive.Trigger
                key={keyOf(tab, i)}
                value={keyOf(tab, i)}
                className={cn(
                  "relative inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap px-2.5 text-xs font-medium outline-none transition-colors [&_svg]:size-3.5",
                  s.muted,
                  theme === "dark" ? "hover:text-code-foreground data-[state=active]:text-code-foreground" : "hover:text-foreground data-[state=active]:text-foreground",
                  "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-200 data-[state=active]:after:scale-x-100",
                  "focus-visible:after:scale-x-100 focus-visible:after:bg-ring"
                )}
              >
                {tab.icon}
                {tab.label}
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>
          {copyable && active ? <CodeCopyButton text={active.code.replace(/\n$/, "")} theme={theme} /> : null}
        </div>
        {tabs.map((tab, i) => (
          <TabsPrimitive.Content key={keyOf(tab, i)} value={keyOf(tab, i)} className="outline-none">
            <CodeBody
              code={tab.code.replace(/\n$/, "")}
              language={tab.language}
              theme={theme}
              showLineNumbers={showLineNumbers}
              highlightLines={tab.highlightLines}
              wrap={wrap}
              maxHeight={maxHeight}
            />
          </TabsPrimitive.Content>
        ))}
      </TabsPrimitive.Root>
    );
  }
);
CodeBlockTabs.displayName = "CodeBlockTabs";

/* ------------------------------------------------------------------ */
/* InlineCopy                                                          */
/* ------------------------------------------------------------------ */

export interface InlineCopyProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The command or text to show and copy. */
  value: string;
  /** Prefix shown before the value (not copied). Set `false` to hide. */
  prompt?: React.ReactNode | false;
  theme?: CodeBlockTheme;
  size?: "sm" | "md" | "lg";
}

/** Single-line command with a copy button, e.g. `npm i @sutra/ui`. */
export const InlineCopy = React.forwardRef<HTMLDivElement, InlineCopyProps>(
  ({ className, value, prompt = "$", theme = "light", size = "md", ...props }, ref) => {
    const s = surface[theme];
    return (
      <CopyField
        ref={ref}
        value={value}
        prefix={prompt !== false ? <span className={s.muted}>{prompt}</span> : undefined}
        copyButtonProps={{ label: "Copy command", className: cn(s.button, size === "lg" && "size-8") }}
        className={cn(
          "w-auto",
          s.root,
          theme === "light" && "bg-background",
          size === "sm" ? "h-8 text-xs" : size === "md" ? "h-9 text-[13px]" : "h-11 pl-4 text-sm",
          className
        )}
        {...props}
      />
    );
  }
);
InlineCopy.displayName = "InlineCopy";
