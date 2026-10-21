import * as React from "react";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import {
  RiArrowRightSLine,
  RiCheckLine,
  RiFileLine,
  RiFolderLine,
  RiFolderOpenLine,
  RiSubtractLine,
} from "@remixicon/react";
import { cn } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { logicalArrow } from "../lib/direction";

export interface TreeNode {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  children?: TreeNode[];
  disabled?: boolean;
  /** Plain text used for type-ahead when `label` is not a string. */
  textValue?: string;
}

export type TreeCheckState = "checked" | "unchecked" | "indeterminate";

export interface TreeViewProps
  extends Omit<React.HTMLAttributes<HTMLUListElement>, "onSelect" | "defaultValue" | "defaultChecked" | "children"> {
  /** Top-level nodes; each has an `id`, a `label` and optional `children`, icon and disabled flag. */
  nodes: TreeNode[];
  /** Expanded node ids. */
  expanded?: string[];
  /** Initially expanded node ids when uncontrolled. */
  defaultExpanded?: string[];
  /** Called with the expanded node ids after a node is expanded or collapsed. */
  onExpandedChange?: (expanded: string[]) => void;
  /** Default "single". */
  selectionMode?: "single" | "multiple" | "none";
  /** Controlled selected node ids. Use with `onSelectedChange`. */
  selected?: string[];
  /** Initially selected node ids when uncontrolled. */
  defaultSelected?: string[];
  /** Called with the selected node ids after the selection changes. */
  onSelectedChange?: (selected: string[]) => void;
  /** Show tri-state checkboxes. Checking a parent checks every descendant. */
  checkable?: boolean;
  /** Fully checked node ids (parents included). */
  checked?: string[];
  /** Initially checked node ids when uncontrolled (see `checkable`). */
  defaultChecked?: string[];
  /** Called with the fully checked node ids after a checkbox changes. */
  onCheckedChange?: (checked: string[]) => void;
  /** Fired on click or Enter. */
  onNodeAction?: (node: TreeNode) => void;
  /** Clicking a parent row toggles it. Default true. */
  expandOnClick?: boolean;
  /** Vertical indent guide lines. Default true. */
  indentGuides?: boolean;
  /** Default folder/file icons when a node has no `icon`. Default true. */
  showIcons?: boolean;
  /** Jump to nodes by typing their first letters. Default true. */
  typeahead?: boolean;
  /**
   * Row height and text size.
   * @default "md"
   */
  size?: "sm" | "md";
}

interface FlatNode {
  node: TreeNode;
  depth: number;
  parentId: string | null;
}

interface TreeContextValue {
  size: "sm" | "md";
  indent: number;
  expandedSet: Set<string>;
  selectedSet: Set<string>;
  selectionMode: "single" | "multiple" | "none";
  checkable: boolean;
  checkState: (id: string) => TreeCheckState;
  tabbableId: string | null;
  indentGuides: boolean;
  showIcons: boolean;
  registerRef: (id: string, el: HTMLLIElement | null) => void;
  onRowClick: (event: React.MouseEvent, node: TreeNode) => void;
  onToggleExpand: (id: string) => void;
  onToggleCheck: (node: TreeNode) => void;
  onFocusItem: (id: string) => void;
}

const TreeContext = React.createContext<TreeContextValue | null>(null);

const INDENT = { sm: 14, md: 16 } as const;
const BASE_PAD = 6;
const CHEVRON = 16;

function collectLeaves(node: TreeNode, out: string[] = []) {
  if (!node.children || node.children.length === 0) out.push(node.id);
  else node.children.forEach((c) => collectLeaves(c, out));
  return out;
}

function nodeText(node: TreeNode) {
  if (node.textValue) return node.textValue;
  return typeof node.label === "string" || typeof node.label === "number" ? String(node.label) : "";
}

/** Data-driven tree with expand/collapse, selection, tri-state checkboxes and full keyboard support. */
export const TreeView = React.forwardRef<HTMLUListElement, TreeViewProps>(
  (
    {
      nodes,
      expanded: expandedProp,
      defaultExpanded,
      onExpandedChange,
      selectionMode = "single",
      selected: selectedProp,
      defaultSelected,
      onSelectedChange,
      checkable = false,
      checked: checkedProp,
      defaultChecked,
      onCheckedChange,
      onNodeAction,
      expandOnClick = true,
      indentGuides = true,
      showIcons = true,
      typeahead = true,
      size = "md",
      className,
      onKeyDown,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    const [expanded, setExpanded] = useControllableState<string[]>({
      value: expandedProp,
      defaultValue: defaultExpanded ?? [],
      onChange: onExpandedChange,
    });
    const [selected, setSelected] = useControllableState<string[]>({
      value: selectedProp,
      defaultValue: defaultSelected ?? [],
      onChange: onSelectedChange,
    });
    const [checked, setChecked] = useControllableState<string[]>({
      value: checkedProp,
      defaultValue: defaultChecked ?? [],
      onChange: onCheckedChange,
    });

    const expandedSet = React.useMemo(() => new Set(expanded), [expanded]);
    const selectedSet = React.useMemo(() => new Set(selected), [selected]);

    const { nodeMap, parentMap, leavesMap, allNodes } = React.useMemo(() => {
      const nodeMap = new Map<string, TreeNode>();
      const parentMap = new Map<string, string | null>();
      const leavesMap = new Map<string, string[]>();
      const allNodes: TreeNode[] = [];
      const walk = (list: TreeNode[], parent: string | null) => {
        list.forEach((n) => {
          nodeMap.set(n.id, n);
          parentMap.set(n.id, parent);
          leavesMap.set(n.id, collectLeaves(n));
          allNodes.push(n);
          if (n.children) walk(n.children, n.id);
        });
      };
      walk(nodes, null);
      return { nodeMap, parentMap, leavesMap, allNodes };
    }, [nodes]);

    const visible = React.useMemo(() => {
      const out: FlatNode[] = [];
      const walk = (list: TreeNode[], depth: number, parentId: string | null) => {
        list.forEach((node) => {
          out.push({ node, depth, parentId });
          if (node.children?.length && expandedSet.has(node.id)) walk(node.children, depth + 1, node.id);
        });
      };
      walk(nodes, 0, null);
      return out;
    }, [nodes, expandedSet]);

    const checkedLeaves = React.useMemo(() => {
      const set = new Set<string>();
      checked.forEach((id) => leavesMap.get(id)?.forEach((l) => set.add(l)));
      return set;
    }, [checked, leavesMap]);

    const checkState = React.useCallback(
      (id: string): TreeCheckState => {
        const leaves = leavesMap.get(id) ?? [];
        let count = 0;
        for (const l of leaves) if (checkedLeaves.has(l)) count++;
        if (count === 0) return "unchecked";
        return count === leaves.length ? "checked" : "indeterminate";
      },
      [leavesMap, checkedLeaves]
    );

    const refs = React.useRef(new Map<string, HTMLLIElement>());
    const registerRef = React.useCallback((id: string, el: HTMLLIElement | null) => {
      if (el) refs.current.set(id, el);
      else refs.current.delete(id);
    }, []);

    const [focusedId, setFocusedId] = React.useState<string | null>(null);
    const visibleIds = React.useMemo(() => new Set(visible.map((v) => v.node.id)), [visible]);
    const tabbableId =
      focusedId && visibleIds.has(focusedId)
        ? focusedId
        : (visible.find((v) => selectedSet.has(v.node.id))?.node.id ?? visible[0]?.node.id ?? null);

    const focusNode = (id: string | undefined | null) => {
      if (!id) return;
      setFocusedId(id);
      refs.current.get(id)?.focus();
    };

    const toggleExpand = (id: string, force?: boolean) => {
      const node = nodeMap.get(id);
      if (!node?.children?.length || node.disabled) return;
      const isOpen = expandedSet.has(id);
      const next = force ?? !isOpen;
      if (next === isOpen) return;
      setExpanded(next ? [...expanded, id] : expanded.filter((e) => e !== id));
    };

    const select = (node: TreeNode, mode: "replace" | "toggle" | "add" = "replace") => {
      if (selectionMode === "none" || node.disabled) return;
      if (selectionMode === "single") {
        setSelected([node.id]);
        return;
      }
      if (mode === "toggle") {
        setSelected(selectedSet.has(node.id) ? selected.filter((s) => s !== node.id) : [...selected, node.id]);
      } else if (mode === "add") {
        if (!selectedSet.has(node.id)) setSelected([...selected, node.id]);
      } else {
        setSelected([node.id]);
      }
    };

    const toggleCheck = (node: TreeNode) => {
      if (!checkable || node.disabled) return;
      const state = checkState(node.id);
      const target = (leavesMap.get(node.id) ?? []).filter((l) => !nodeMap.get(l)?.disabled);
      const leaves = new Set(checkedLeaves);
      // A disabled, unchecked descendant keeps the parent mixed: once every enabled leaf is on, toggle them off.
      const allOn = target.length > 0 && target.every((l) => leaves.has(l));
      if (state === "checked" || allOn) target.forEach((l) => leaves.delete(l));
      else target.forEach((l) => leaves.add(l));
      const out: string[] = [];
      allNodes.forEach((n) => {
        const ls = leavesMap.get(n.id) ?? [];
        if (ls.length > 0 && ls.every((l) => leaves.has(l))) out.push(n.id);
      });
      setChecked(out);
    };

    const typeBuffer = React.useRef({ text: "", timer: 0 as ReturnType<typeof setTimeout> | 0 });

    const handleKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || !tabbableId) return;
      const index = visible.findIndex((v) => v.node.id === tabbableId);
      const current = visible[index];
      if (!current) return;
      const { node } = current;
      const hasChildren = !!node.children?.length;
      const isOpen = expandedSet.has(node.id);
      const multi = selectionMode === "multiple";

      switch (logicalArrow(event)) {
        case "ArrowDown": {
          event.preventDefault();
          const next = visible[index + 1];
          if (next) {
            focusNode(next.node.id);
            if (multi && event.shiftKey) select(next.node, "add");
          }
          return;
        }
        case "ArrowUp": {
          event.preventDefault();
          const prev = visible[index - 1];
          if (prev) {
            focusNode(prev.node.id);
            if (multi && event.shiftKey) select(prev.node, "add");
          }
          return;
        }
        case "ArrowRight": {
          event.preventDefault();
          if (!hasChildren) return;
          if (!isOpen) toggleExpand(node.id, true);
          else focusNode(node.children![0]!.id);
          return;
        }
        case "ArrowLeft": {
          event.preventDefault();
          if (hasChildren && isOpen) toggleExpand(node.id, false);
          else if (current.parentId) focusNode(current.parentId);
          return;
        }
        case "Home":
          event.preventDefault();
          focusNode(visible[0]?.node.id);
          return;
        case "End":
          event.preventDefault();
          focusNode(visible[visible.length - 1]?.node.id);
          return;
        case "Enter":
          event.preventDefault();
          if (node.disabled) return;
          select(node, multi && (event.metaKey || event.ctrlKey) ? "toggle" : "replace");
          onNodeAction?.(node);
          return;
        case " ":
          event.preventDefault();
          if (checkable) toggleCheck(node);
          else select(node, multi ? "toggle" : "replace");
          return;
        case "*": {
          event.preventDefault();
          const parentId = parentMap.get(node.id) ?? null;
          const siblings = parentId ? (nodeMap.get(parentId)?.children ?? []) : nodes;
          const toOpen = siblings.filter((s) => s.children?.length && !s.disabled && !expandedSet.has(s.id)).map((s) => s.id);
          if (toOpen.length) setExpanded([...expanded, ...toOpen]);
          return;
        }
        default:
          break;
      }

      if (multi && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelected(visible.filter((v) => !v.node.disabled).map((v) => v.node.id));
        return;
      }

      if (typeahead && event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const buf = typeBuffer.current;
        if (buf.timer) clearTimeout(buf.timer);
        buf.text += event.key.toLowerCase();
        buf.timer = setTimeout(() => {
          buf.text = "";
          buf.timer = 0;
        }, 500);
        const ordered = [...visible.slice(index + 1), ...visible.slice(0, index + 1)];
        const single = buf.text.length > 1 && buf.text.split("").every((c) => c === buf.text[0]);
        const query = single ? buf.text[0]! : buf.text;
        const pool = buf.text.length > 1 && !single ? [current, ...ordered] : ordered;
        const match = pool.find((v) => nodeText(v.node).toLowerCase().startsWith(query));
        if (match) focusNode(match.node.id);
      }
    };

    React.useEffect(() => {
      const buf = typeBuffer.current;
      return () => {
        if (buf.timer) clearTimeout(buf.timer);
      };
    }, []);

    const ctx: TreeContextValue = {
      size,
      indent: INDENT[size],
      expandedSet,
      selectedSet,
      selectionMode,
      checkable,
      checkState,
      tabbableId,
      indentGuides,
      showIcons,
      registerRef,
      onRowClick: (event, node) => {
        setFocusedId(node.id);
        if (node.disabled) return;
        const multi = selectionMode === "multiple";
        select(node, multi && (event.metaKey || event.ctrlKey || event.shiftKey) ? "toggle" : "replace");
        if (expandOnClick && node.children?.length) toggleExpand(node.id);
        onNodeAction?.(node);
      },
      onToggleExpand: (id) => toggleExpand(id),
      onToggleCheck: toggleCheck,
      onFocusItem: setFocusedId,
    };

    return (
      <TreeContext.Provider value={ctx}>
        <ul
          ref={ref}
          data-slot="tree-view"
          role="tree"
          aria-label={ariaLabel}
          aria-multiselectable={selectionMode === "multiple" || undefined}
          className={cn("relative flex select-none flex-col text-sm outline-none", className)}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {nodes.map((node, i) => (
            <TreeViewItem key={node.id} node={node} depth={0} posinset={i + 1} setsize={nodes.length} />
          ))}
        </ul>
      </TreeContext.Provider>
    );
  }
);
TreeView.displayName = "TreeView";

function TreeCheckbox({ state, disabled, onToggle }: { state: TreeCheckState; disabled?: boolean; onToggle: () => void }) {
  const on = state !== "unchecked";
  return (
    <span
      aria-hidden
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onToggle();
      }}
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-xs border shadow-xs transition-colors duration-150",
        on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:border-border-strong"
      )}
    >
      {state === "checked" && <RiCheckLine aria-hidden className="size-3" />}
      {state === "indeterminate" && <RiSubtractLine aria-hidden className="size-3" />}
    </span>
  );
}

function TreeViewItem({
  node,
  depth,
  posinset,
  setsize,
}: {
  node: TreeNode;
  depth: number;
  posinset: number;
  setsize: number;
}) {
  const ctx = React.useContext(TreeContext)!;
  const hasChildren = !!node.children?.length;
  const isOpen = hasChildren && ctx.expandedSet.has(node.id);
  const isSelected = ctx.selectedSet.has(node.id);
  const checkState = ctx.checkable ? ctx.checkState(node.id) : undefined;
  const padLeft = BASE_PAD + depth * ctx.indent;
  const rowHeight = ctx.size === "sm" ? "h-7" : "h-8";

  const icon =
    node.icon ??
    (ctx.showIcons ? (
      hasChildren ? (
        isOpen ? (
          <RiFolderOpenLine aria-hidden />
        ) : (
          <RiFolderLine aria-hidden />
        )
      ) : (
        <RiFileLine aria-hidden />
      )
    ) : null);

  const refCb = React.useCallback((el: HTMLLIElement | null) => ctx.registerRef(node.id, el), [ctx.registerRef, node.id]);

  return (
    <CollapsiblePrimitive.Root asChild open={isOpen} disabled={node.disabled}>
      <li
        ref={refCb}
        role="treeitem"
        aria-level={depth + 1}
        aria-posinset={posinset}
        aria-setsize={setsize}
        aria-expanded={hasChildren ? isOpen : undefined}
        aria-selected={ctx.selectionMode !== "none" ? isSelected : undefined}
        aria-checked={checkState ? (checkState === "indeterminate" ? "mixed" : checkState === "checked") : undefined}
        aria-disabled={node.disabled || undefined}
        tabIndex={ctx.tabbableId === node.id ? 0 : -1}
        onFocus={(e) => {
          if (e.target === e.currentTarget) ctx.onFocusItem(node.id);
        }}
        className="relative outline-none [&:focus-visible>[data-tree-row]]:ring-2 [&:focus-visible>[data-tree-row]]:ring-inset [&:focus-visible>[data-tree-row]]:ring-ring/60"
      >
        <div
          data-tree-row=""
          data-selected={isSelected || undefined}
          data-disabled={node.disabled || undefined}
          onClick={(e) => ctx.onRowClick(e, node)}
          style={{ paddingInlineStart: padLeft }}
          className={cn(
            "relative flex cursor-pointer items-center gap-1.5 rounded-sm pe-2 text-foreground transition-colors duration-150",
            rowHeight,
            "hover:bg-accent",
            "data-[selected]:bg-primary-soft data-[selected]:text-primary-soft-foreground data-[selected]:hover:bg-primary-soft",
            "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[disabled]:hover:bg-transparent",
            "[&_svg]:shrink-0"
          )}
        >
          {hasChildren ? (
            <span
              aria-hidden
              onClick={(e) => {
                e.stopPropagation();
                ctx.onFocusItem(node.id);
                ctx.onToggleExpand(node.id);
              }}
              className="inline-flex shrink-0 items-center justify-center rounded-xs text-muted-foreground hover:text-foreground"
              style={{ width: CHEVRON, height: CHEVRON }}
            >
              <RiArrowRightSLine aria-hidden
                className={cn("chevron-turn size-4 rtl:-scale-x-100", isOpen && "rotate-90 rtl:-rotate-90")}
              />
            </span>
          ) : (
            <span aria-hidden className="shrink-0" style={{ width: CHEVRON }} />
          )}
          {checkState && (
            <TreeCheckbox state={checkState} disabled={node.disabled} onToggle={() => ctx.onToggleCheck(node)} />
          )}
          {icon && (
            <span
              aria-hidden
              className={cn(
                "inline-flex shrink-0 text-muted-foreground [&_svg]:size-4",
                isSelected && "text-primary"
              )}
            >
              {icon}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate">{node.label}</span>
        </div>
        {hasChildren && (
          <CollapsiblePrimitive.Content asChild>
            <ul
              role="group"
              style={{ "--tree-guide": `${padLeft + CHEVRON / 2}px` } as React.CSSProperties}
              className={cn(
                "relative overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
                ctx.indentGuides &&
                  "before:pointer-events-none before:absolute before:inset-y-1 before:start-(--tree-guide) before:z-10 before:w-px before:bg-border"
              )}
            >
              {node.children!.map((child, i) => (
                <TreeViewItem
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  posinset={i + 1}
                  setsize={node.children!.length}
                />
              ))}
            </ul>
          </CollapsiblePrimitive.Content>
        )}
      </li>
    </CollapsiblePrimitive.Root>
  );
}
