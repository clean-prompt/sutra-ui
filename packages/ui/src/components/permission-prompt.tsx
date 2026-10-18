import * as React from "react";
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiArrowUpLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiFileEditLine,
  RiGlobalLine,
  RiShieldKeyholeLine,
  RiTerminalBoxLine,
  RiTimeLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Kbd } from "./typography";
import { isEditableTarget, useShortcuts } from "./shortcuts";

/** Controls that own the Enter / arrow keys when focused. */
const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "textarea",
  "select",
  "summary",
  '[contenteditable]:not([contenteditable="false"])',
  ...["button", "link", "menuitem", "menuitemcheckbox", "menuitemradio", "tab", "option", "checkbox", "switch", "radio", "combobox", "slider", "textbox", "treeitem", "gridcell"].map(
    (r) => `[role="${r}"]`
  ),
].join(",");

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type PermissionToolKind = "edit" | "bash" | "fetch" | "read" | "mcp" | "other";

/** Where an "always allow" rule is saved. */
export type PermissionRuleScope = "session" | "projectLocal" | "projectShared" | "user";

export interface PermissionScopeOption {
  value: string;
  /** Short label shown in the destination link, e.g. "this session". */
  label: React.ReactNode;
  description?: React.ReactNode;
}

export const defaultPermissionScopes: PermissionScopeOption[] = [
  { value: "session", label: "this session", description: "Forgotten when the session ends" },
  { value: "projectLocal", label: "this project (local)", description: "Saved for you only, not checked in" },
  { value: "projectShared", label: "this project (shared)", description: "Saved in project settings for the whole team" },
  { value: "user", label: "all projects (user)", description: "Saved in your user settings" },
];

export interface PermissionOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Renders a rule-scope picker next to the label; the decision carries `scope`. */
  scoped?: boolean;
  /** Choosing it reveals a feedback field; the decision carries `feedback`. */
  feedback?: boolean;
  tone?: "default" | "destructive";
  disabled?: boolean;
}

export interface PermissionDecision {
  choice: string;
  scope?: string;
  feedback?: string;
}

const toolMeta: Record<PermissionToolKind, { icon: React.ReactNode; question: (target?: React.ReactNode) => React.ReactNode; rule: string }> = {
  edit: {
    icon: <RiFileEditLine />,
    question: (t) => (t != null ? <>Make this edit to <code className="font-mono text-[0.92em]">{t}</code>?</> : "Make this edit?"),
    rule: "edits",
  },
  bash: { icon: <RiTerminalBoxLine />, question: () => "Run this command?", rule: "this command" },
  fetch: { icon: <RiGlobalLine />, question: () => "Fetch this URL?", rule: "this domain" },
  read: {
    icon: <RiFileEditLine />,
    question: (t) => (t != null ? <>Read <code className="font-mono text-[0.92em]">{t}</code>?</> : "Read this file?"),
    rule: "reads in this directory",
  },
  mcp: { icon: <RiShieldKeyholeLine />, question: () => "Use this tool?", rule: "this tool" },
  other: { icon: <RiShieldKeyholeLine />, question: () => "Allow this action?", rule: "this action" },
};

/** Default Yes / Always / No options for a tool kind. */
export function getDefaultPermissionOptions(tool: PermissionToolKind = "other", ruleLabel?: React.ReactNode): PermissionOption[] {
  return [
    { value: "allow", label: "Yes" },
    { value: "always", label: <>Yes, and don&apos;t ask again for {ruleLabel ?? toolMeta[tool].rule}</>, scoped: true },
    { value: "deny", label: "No, and tell the agent what to do instead", feedback: true, tone: "destructive" },
  ];
}

/* ------------------------------------------------------------------ */
/* RuleScopePicker                                                     */
/* ------------------------------------------------------------------ */

export interface RuleScopePickerProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  scopes?: PermissionScopeOption[];
  /** Text before the link (visually). Default "in". */
  prefix?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Inline destination link ("in this session ▾") that opens a menu of rule scopes. */
export function RuleScopePicker({
  value: valueProp,
  defaultValue,
  onValueChange,
  scopes = defaultPermissionScopes,
  prefix = "in",
  disabled,
  className,
}: RuleScopePickerProps) {
  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue: defaultValue ?? scopes[0]?.value ?? "",
    onChange: onValueChange,
  });
  const current = scopes.find((s) => s.value === value) ?? scopes[0];
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm text-muted-foreground", className)} data-slot="rule-scope-picker">
      {prefix != null && <span aria-hidden>{prefix}</span>}
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          aria-label="Save rule to"
          data-value={value}
          className={cn(
            "inline-flex items-center gap-0.5 rounded-xs font-medium text-primary underline decoration-primary/40 decoration-dotted underline-offset-4 hover:decoration-primary disabled:opacity-50",
            focusRing
          )}
        >
          {current?.label}
          <RiArrowDownSLine aria-hidden className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72">
          <DropdownMenuLabel>Save rule to</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={value} onValueChange={setValue}>
            {scopes.map((s) => (
              <DropdownMenuRadioItem key={s.value} value={s.value} className="items-start">
                <span className="flex min-w-0 flex-col">
                  <span>{s.label}</span>
                  {s.description != null && <span className="text-xs text-muted-foreground">{s.description}</span>}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}
RuleScopePicker.displayName = "RuleScopePicker";

/* ------------------------------------------------------------------ */
/* PermissionPrompt                                                    */
/* ------------------------------------------------------------------ */

export interface PermissionPromptProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Tool kind; picks the icon, default question and default options. Default "other". */
  tool?: PermissionToolKind;
  /** Header question; defaults from `tool` and `target`. */
  title?: React.ReactNode;
  /** File path, command or URL the tool acts on. */
  target?: React.ReactNode;
  icon?: React.ReactNode;
  /** Preview slot (diff, command, URL). `children` is used when omitted. */
  preview?: React.ReactNode;
  /** Replaces the default Yes / Always / No options. */
  options?: PermissionOption[];
  /** What "don't ask again for …" refers to, e.g. <code>npm test</code>. */
  ruleLabel?: React.ReactNode;
  scopes?: PermissionScopeOption[];
  scope?: string;
  defaultScope?: string;
  onScopeChange?: (scope: string) => void;
  folded?: boolean;
  defaultFolded?: boolean;
  onFoldedChange?: (folded: boolean) => void;
  /** Capture number / arrow keys even when focus is elsewhere (e.g. the newest prompt). Default: only while focused. */
  active?: boolean;
  /** Called with the user's choice. */
  onDecision?: (decision: PermissionDecision) => void;
  /** Escape. Hints "Esc to cancel" when set. */
  onCancel?: () => void;
  /** A recorded decision: renders the prompt locked with its outcome. */
  decision?: PermissionDecision | null;
  /** Show the keyboard hints footer. Default true. */
  showHints?: boolean;
  feedbackPlaceholder?: string;
}

/** Inline permission request for a tool action with a numbered, keyboard-driven option list. */
export const PermissionPrompt = React.forwardRef<HTMLDivElement, PermissionPromptProps>(
  (
    {
      tool = "other",
      title,
      target,
      icon,
      preview,
      options: optionsProp,
      ruleLabel,
      scopes = defaultPermissionScopes,
      scope: scopeProp,
      defaultScope,
      onScopeChange,
      folded: foldedProp,
      defaultFolded = false,
      onFoldedChange,
      active,
      onDecision,
      onCancel,
      decision: decisionProp,
      showHints = true,
      feedbackPlaceholder = "Tell the agent what to do instead…",
      className,
      children,
      ...props
    },
    ref
  ) => {
    const uid = React.useId();
    const titleId = `${uid}-title`;
    const rootRef = React.useRef<HTMLDivElement>(null);
    const optionRefs = React.useRef<(HTMLDivElement | null)[]>([]);
    const meta = toolMeta[tool];
    const options = React.useMemo(() => optionsProp ?? getDefaultPermissionOptions(tool, ruleLabel), [optionsProp, tool, ruleLabel]);
    const [folded, setFolded] = useControllableState({ value: foldedProp, defaultValue: defaultFolded, onChange: onFoldedChange });
    const [scope, setScope] = useControllableState({
      value: scopeProp,
      defaultValue: defaultScope ?? scopes[0]?.value ?? "",
      onChange: onScopeChange,
    });
    const [highlight, setHighlight] = React.useState(0);
    const [feedbackFor, setFeedbackFor] = React.useState<string | null>(null);
    const [feedback, setFeedback] = React.useState("");
    const [localDecision, setLocalDecision] = React.useState<PermissionDecision | null>(null);
    const decision = decisionProp ?? localDecision;
    const locked = decision != null;

    React.useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);

    const decide = (d: PermissionDecision) => {
      setLocalDecision(d);
      setFeedbackFor(null);
      onDecision?.(d);
    };

    const choose = (index: number) => {
      const opt = options[index];
      if (!opt || opt.disabled || locked) return;
      setHighlight(index);
      if (opt.feedback) {
        setFeedbackFor(opt.value);
        return;
      }
      decide({ choice: opt.value, ...(opt.scoped ? { scope } : {}) });
    };

    const submitFeedback = () => {
      if (!feedbackFor) return;
      const text = feedback.trim();
      decide({ choice: feedbackFor, ...(text ? { feedback: text } : {}) });
    };

    const isActive = () => {
      if (locked || folded) return false;
      if (active) return true;
      const el = rootRef.current;
      return !!el && typeof document !== "undefined" && el.contains(document.activeElement);
    };
    const keysUsable = () => isActive() && feedbackFor == null;
    /**
     * Where focus is relative to the prompt: "inside", "idle" (nothing interactive focused, e.g. body),
     * "editable" (a text field elsewhere) or "interactive" (another control elsewhere on the page).
     * Enter / arrows only act for "inside" and "idle", so pressing Enter on e.g. a "Stop agent" button
     * never approves the highlighted option.
     */
    const focusZone = (): "inside" | "idle" | "editable" | "interactive" => {
      if (typeof document === "undefined") return "idle";
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body || el === document.documentElement) return "idle";
      if (rootRef.current?.contains(el)) return "inside";
      if (isEditableTarget(el)) return "editable";
      if (typeof el.matches === "function" && el.matches(INTERACTIVE_SELECTOR)) return "interactive";
      return "idle";
    };
    const navUsable = () => {
      if (!keysUsable()) return false;
      const zone = focusZone();
      return zone === "inside" || zone === "idle";
    };
    const digitUsable = () => keysUsable() && focusZone() !== "editable";
    const focusOption = (i: number) => {
      setHighlight(i);
      if (rootRef.current?.contains(document.activeElement)) optionRefs.current[i]?.focus();
    };
    const move = (delta: number) => {
      const n = options.length;
      if (!n) return;
      let i = highlight;
      for (let step = 0; step < n; step++) {
        i = (i + delta + n) % n;
        if (!options[i].disabled) break;
      }
      focusOption(i);
    };

    useShortcuts([
      ...options.slice(0, 9).map((_, i) => ({
        keys: String(i + 1),
        handler: () => choose(i),
        when: digitUsable,
        id: `${uid}-opt-${i}`,
      })),
      { keys: "up", handler: () => move(-1), when: navUsable, id: `${uid}-up` },
      { keys: "down", handler: () => move(1), when: navUsable, id: `${uid}-down` },
      {
        keys: "enter",
        handler: () => choose(highlight),
        id: `${uid}-enter`,
        when: () => {
          if (!navUsable()) return false;
          const el = typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
          if (el && rootRef.current?.contains(el) && el.getAttribute("role") !== "radio" && el !== rootRef.current) return false;
          return true;
        },
      },
      { keys: "escape", handler: () => onCancel?.(), when: () => !!onCancel && keysUsable(), id: `${uid}-esc` },
    ]);

    const headerIcon = icon ?? meta.icon;
    const question = title ?? meta.question(target);
    const body = preview ?? children;
    const decidedOption = decision ? options.find((o) => o.value === decision.choice) : undefined;
    const denied = decision ? decision.choice === "deny" || decidedOption?.tone === "destructive" : false;

    const header = (
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <span
          aria-hidden
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md [&_svg]:size-3.5",
            locked ? "bg-muted text-muted-foreground" : "bg-warning-soft text-warning-soft-foreground"
          )}
        >
          {headerIcon}
        </span>
        <p id={titleId} className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {question}
        </p>
        {!locked && (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={folded ? "Expand permission request" : "Collapse permission request"}
            aria-expanded={!folded}
            onClick={() => setFolded(!folded)}
            data-slot="permission-fold"
          >
            {folded ? <RiArrowRightSLine /> : <RiArrowDownSLine />}
          </Button>
        )}
      </div>
    );

    return (
      <div
        ref={rootRef}
        role="group"
        aria-labelledby={titleId}
        data-slot="permission-prompt"
        data-tool={tool}
        data-folded={folded ? "" : undefined}
        data-decided={locked ? decision.choice : undefined}
        className={cn(
          "w-full overflow-hidden rounded-box border bg-card text-card-foreground shadow-xs",
          locked ? "border-border" : "border-warning/50",
          className
        )}
        {...props}
      >
        {header}
        {!folded && body != null && !locked && <div className="flex flex-col gap-2 px-3.5 pb-3">{body}</div>}
        {!folded && !body && !locked && target != null && tool !== "edit" && tool !== "read" && (
          <div className="px-3.5 pb-3">
            <pre className="scrollbar-thin overflow-x-auto rounded-md border border-border bg-subtle px-3 py-2 font-mono text-xs leading-5 text-foreground">
              <code>{target}</code>
            </pre>
          </div>
        )}
        {locked ? (
          <div
            role="status"
            className={cn(
              "flex items-center gap-1.5 border-t border-border bg-subtle px-3.5 py-2 text-sm font-medium [&_svg]:size-4",
              denied ? "text-destructive" : "text-success"
            )}
          >
            {denied ? <RiCloseCircleLine aria-hidden /> : <RiCheckLine aria-hidden />}
            <span className="min-w-0 truncate">
              {denied ? "Denied" : decidedOption?.scoped ? "Always allowed" : "Allowed"}
              {decision.scope && decidedOption?.scoped ? (
                <span className="font-normal text-muted-foreground"> · {scopes.find((s) => s.value === decision.scope)?.label ?? decision.scope}</span>
              ) : null}
              {decision.feedback ? <span className="font-normal text-muted-foreground"> · “{decision.feedback}”</span> : null}
            </span>
          </div>
        ) : (
          !folded && (
            <>
              <div role="radiogroup" aria-labelledby={titleId} className="flex flex-col gap-0.5 border-t border-border px-1.5 py-1.5" data-slot="permission-options">
                {options.map((opt, i) => {
                  const selected = i === highlight;
                  return (
                    <React.Fragment key={opt.value}>
                      <div
                        className={cn(
                          "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md pr-2 transition-colors",
                          selected ? "bg-accent" : "hover:bg-subtle"
                        )}
                      >
                        <div
                          ref={(el) => {
                            optionRefs.current[i] = el;
                          }}
                          role="radio"
                          aria-checked={selected}
                          aria-disabled={opt.disabled || undefined}
                          tabIndex={selected ? 0 : -1}
                          data-slot="permission-option"
                          data-value={opt.value}
                          onClick={() => choose(i)}
                          onFocus={() => setHighlight(i)}
                          onKeyDown={(e) => {
                            if (e.key === " ") {
                              e.preventDefault();
                              choose(i);
                            }
                          }}
                          className={cn(
                            "flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm",
                            opt.disabled && "cursor-not-allowed opacity-50",
                            focusRing
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded-xs font-mono text-2xs tabular-nums",
                              selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            )}
                          >
                            {i + 1}
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className={cn("text-foreground", opt.tone === "destructive" && selected && "text-destructive")}>{opt.label}</span>
                            {opt.description != null && <span className="text-xs text-muted-foreground">{opt.description}</span>}
                          </span>
                        </div>
                        {opt.scoped && <RuleScopePicker scopes={scopes} value={scope} onValueChange={setScope} className="pl-9 sm:pl-0" />}
                      </div>
                      {feedbackFor === opt.value && (
                        <div className="flex flex-col gap-1.5 px-2 pb-1.5 pl-9" data-slot="permission-feedback">
                          <textarea
                            autoFocus
                            rows={2}
                            aria-label="What should the agent do instead?"
                            value={feedback}
                            placeholder={feedbackPlaceholder}
                            onChange={(e) => setFeedback(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                submitFeedback();
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                e.stopPropagation();
                                setFeedbackFor(null);
                                optionRefs.current[i]?.focus();
                              }
                            }}
                            className={cn(
                              "w-full resize-none rounded-[min(var(--radius-control),var(--radius-box))] border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground",
                              focusRing
                            )}
                          />
                          <div className="flex items-center justify-end gap-2">
                            <span className="mr-auto text-xs text-muted-foreground">
                              <Kbd>Enter</Kbd> to send · <Kbd>Esc</Kbd> to cancel
                            </span>
                            <Button type="button" size="xs" variant="ghost" onClick={() => setFeedbackFor(null)}>
                              Cancel
                            </Button>
                            <Button type="button" size="xs" variant="primary" onClick={submitFeedback}>
                              Send
                            </Button>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              {showHints && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border bg-subtle px-3.5 py-1.5 text-xs text-muted-foreground" data-slot="permission-hints">
                  <span>
                    <Kbd>1</Kbd>–<Kbd>{Math.min(options.length, 9)}</Kbd> to choose
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Kbd>↑</Kbd>
                    <Kbd>↓</Kbd> <Kbd>Enter</Kbd> to confirm
                  </span>
                  {onCancel && (
                    <span>
                      <Kbd>Esc</Kbd> to cancel
                    </span>
                  )}
                </div>
              )}
            </>
          )
        )}
      </div>
    );
  }
);
PermissionPrompt.displayName = "PermissionPrompt";

/* ------------------------------------------------------------------ */
/* PermissionPendingHint                                               */
/* ------------------------------------------------------------------ */

export interface PermissionPendingHintProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Element (or ref) to scroll into view on click. */
  target?: React.RefObject<HTMLElement | null> | HTMLElement | null;
  /** Number of pending prompts. */
  count?: number;
  children?: React.ReactNode;
}

/** Subtle "Waiting for permission…" pill near the composer; click scrolls the pending prompt into view. */
export const PermissionPendingHint = React.forwardRef<HTMLButtonElement, PermissionPendingHintProps>(
  ({ target, count = 1, onClick, className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      data-slot="permission-pending-hint"
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        const el = target && "current" in target ? target.current : target;
        if (el) {
          el.scrollIntoView?.({ behavior: "smooth", block: "center" });
          const focusable = el.querySelector<HTMLElement>('[role="radio"][tabindex="0"]') ?? el;
          focusable.focus?.({ preventScroll: true });
        }
      }}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-control border border-warning/40 bg-warning-soft px-2.5 text-xs font-medium text-warning-soft-foreground shadow-xs transition-colors hover:border-warning/70",
        "[&_svg]:size-3.5",
        focusRing,
        className
      )}
      {...props}
    >
      <RiTimeLine aria-hidden className="animate-pulse" />
      <span>{children ?? (count > 1 ? `${count} permission requests waiting…` : "Waiting for permission…")}</span>
      <RiArrowUpLine aria-hidden />
    </button>
  )
);
PermissionPendingHint.displayName = "PermissionPendingHint";
