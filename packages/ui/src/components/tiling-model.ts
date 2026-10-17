/* Pure, immutable layout model for `TilingLayout` (no React). */

export type TilingDirection = "row" | "column";
export type TilingDropEdge = "center" | "left" | "right" | "top" | "bottom";
export type TilingInsertPosition = "before" | "after";

export interface LayoutSplitNode {
  type: "split";
  id: string;
  /** `row`: children side by side. `column`: children stacked. */
  direction: TilingDirection;
  children: LayoutNode[];
  /** Fractions (sum 1), one per child. */
  sizes: number[];
}

export interface LayoutTabsNode {
  type: "tabs";
  id: string;
  /** Pane ids shown as tabs. May be empty (an empty slot). */
  panes: string[];
  /** Active pane id ("" when the group is empty). */
  active: string;
}

export type LayoutNode = LayoutSplitNode | LayoutTabsNode;

export interface PaneLocation {
  group: LayoutTabsNode;
  index: number;
  /** Ids of the ancestors, root first, ending with the group id. */
  path: string[];
}

let idCounter = 0;

/** Unique-enough id for layout nodes. */
export function createLayoutId(prefix = "node"): string {
  idCounter = (idCounter + 1) % 1_000_000_000;
  return `${prefix}-${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const equalSizes = (n: number) => Array.from({ length: n }, () => 1 / n);

function fixSizes(sizes: readonly number[] | undefined, n: number): number[] {
  if (n <= 0) return [];
  if (!sizes || sizes.length !== n || sizes.some((s) => typeof s !== "number" || !Number.isFinite(s) || s <= 0)) {
    return equalSizes(n);
  }
  const total = sizes.reduce((a, b) => a + b, 0);
  return sizes.map((s) => s / total);
}

/** Build a tab group. */
export function createTabsNode(panes: string[] = [], active?: string, id: string = createLayoutId("tabs")): LayoutTabsNode {
  return { type: "tabs", id, panes: [...panes], active: active && panes.includes(active) ? active : (panes[0] ?? "") };
}

/** Build a split; `sizes` default to equal fractions. */
export function createSplitNode(
  direction: TilingDirection,
  children: LayoutNode[],
  sizes?: number[],
  id: string = createLayoutId("split")
): LayoutSplitNode {
  return { type: "split", id, direction, children, sizes: fixSizes(sizes, children.length) };
}

/** All tab groups in document order. */
export function listGroups(tree: LayoutNode): LayoutTabsNode[] {
  if (tree.type === "tabs") return [tree];
  return tree.children.flatMap(listGroups);
}

/** All pane ids in document order. */
export function listPanes(tree: LayoutNode): string[] {
  return listGroups(tree).flatMap((g) => g.panes);
}

/** Find any node by id. */
export function findNode(tree: LayoutNode, id: string): LayoutNode | null {
  if (tree.id === id) return tree;
  if (tree.type === "tabs") return null;
  for (const child of tree.children) {
    const hit = findNode(child, id);
    if (hit) return hit;
  }
  return null;
}

/** Parent split of a node and the node's index in it. */
export function findParent(tree: LayoutNode, id: string): { parent: LayoutSplitNode; index: number } | null {
  if (tree.type === "tabs") return null;
  const index = tree.children.findIndex((c) => c.id === id);
  if (index >= 0) return { parent: tree, index };
  for (const child of tree.children) {
    const hit = findParent(child, id);
    if (hit) return hit;
  }
  return null;
}

/** Locate the group holding `paneId`. */
export function findPane(tree: LayoutNode, paneId: string, path: string[] = []): PaneLocation | null {
  const here = [...path, tree.id];
  if (tree.type === "tabs") {
    const index = tree.panes.indexOf(paneId);
    return index >= 0 ? { group: tree, index, path: here } : null;
  }
  for (const child of tree.children) {
    const hit = findPane(child, paneId, here);
    if (hit) return hit;
  }
  return null;
}

/** Replace (or remove, by returning null) the node with `id`. Sizes stay aligned; not normalized. */
function replaceNode(tree: LayoutNode, id: string, fn: (node: LayoutNode) => LayoutNode | null): LayoutNode | null {
  if (tree.id === id) return fn(tree);
  if (tree.type === "tabs") return tree;
  let changed = false;
  const children: LayoutNode[] = [];
  const sizes: number[] = [];
  tree.children.forEach((child, i) => {
    const next = replaceNode(child, id, fn);
    if (next !== child) changed = true;
    if (next) {
      children.push(next);
      sizes.push(tree.sizes[i] ?? 0);
    }
  });
  return changed ? { ...tree, children, sizes } : tree;
}

function normalizeInner(node: LayoutNode, seen: Set<string>): LayoutNode | null {
  if (node.type === "tabs") {
    const panes = (Array.isArray(node.panes) ? node.panes : []).filter((p) => {
      if (typeof p !== "string" || !p || seen.has(p)) return false;
      seen.add(p);
      return true;
    });
    const active = panes.includes(node.active) ? node.active : (panes[0] ?? "");
    if (panes.length === node.panes.length && active === node.active) return node;
    return { ...node, panes, active };
  }
  const sizes = fixSizes(node.sizes, node.children.length);
  const children: LayoutNode[] = [];
  const childSizes: number[] = [];
  node.children.forEach((child, i) => {
    const next = normalizeInner(child, seen);
    if (!next) return;
    if (next.type === "split" && next.direction === node.direction) {
      next.children.forEach((grandchild, j) => {
        children.push(grandchild);
        childSizes.push(sizes[i] * next.sizes[j]);
      });
    } else {
      children.push(next);
      childSizes.push(sizes[i]);
    }
  });
  if (children.length === 0) return null;
  if (children.length === 1) return children[0];
  return { ...node, children, sizes: fixSizes(childSizes, children.length) };
}

/**
 * Clean a tree: drop empty splits, collapse single-child splits, flatten nested same-direction
 * splits, renormalize sizes, dedupe panes and repair `active`. Empty tab groups are kept.
 */
export function normalizeLayout(tree: LayoutNode): LayoutNode {
  return normalizeInner(tree, new Set()) ?? createTabsNode([], undefined, tree.id);
}

/** Split a group, inserting a new group (optionally with panes) before/after it. */
export function splitGroup(
  tree: LayoutNode,
  groupId: string,
  direction: TilingDirection,
  options: { position?: TilingInsertPosition; panes?: string[]; id?: string } = {}
): LayoutNode {
  const target = findNode(tree, groupId);
  if (!target) return tree;
  const { position = "after", panes = [], id } = options;
  const fresh = createTabsNode(panes, undefined, id);
  const parentInfo = findParent(tree, groupId);
  let next: LayoutNode | null;
  if (parentInfo && parentInfo.parent.direction === direction) {
    const { parent, index } = parentInfo;
    next = replaceNode(tree, parent.id, () => {
      const children = [...parent.children];
      const sizes = fixSizes(parent.sizes, children.length);
      const half = sizes[index] / 2;
      sizes[index] = half;
      const at = position === "after" ? index + 1 : index;
      children.splice(at, 0, fresh);
      sizes.splice(at, 0, half);
      return { ...parent, children, sizes };
    });
  } else {
    next = replaceNode(tree, groupId, (node) =>
      createSplitNode(direction, position === "after" ? [node, fresh] : [fresh, node], [0.5, 0.5])
    );
  }
  return normalizeLayout(next ?? tree);
}

function withoutPane(tree: LayoutNode, loc: PaneLocation): LayoutNode {
  const { group, index } = loc;
  const panes = group.panes.filter((_, i) => i !== index);
  const active = group.active === group.panes[index] ? (panes[index] ?? panes[index - 1] ?? "") : group.active;
  return replaceNode(tree, group.id, () => ({ ...group, panes, active })) ?? tree;
}

/** Remove a group entirely (the tree collapses around it). */
export function removeGroup(tree: LayoutNode, groupId: string): LayoutNode {
  if (tree.id === groupId) return createTabsNode([], undefined, tree.id);
  const next = replaceNode(tree, groupId, () => null);
  return normalizeLayout(next ?? createTabsNode());
}

/** Close a pane. An emptied group is removed unless it is the root (or `keepEmptyGroup`). */
export function closePane(tree: LayoutNode, paneId: string, options: { keepEmptyGroup?: boolean } = {}): LayoutNode {
  const loc = findPane(tree, paneId);
  if (!loc) return tree;
  const next = withoutPane(tree, loc);
  if (loc.group.panes.length === 1 && !options.keepEmptyGroup && tree.id !== loc.group.id) {
    return removeGroup(next, loc.group.id);
  }
  return normalizeLayout(next);
}

const edgeDirection = (edge: Exclude<TilingDropEdge, "center">): TilingDirection =>
  edge === "left" || edge === "right" ? "row" : "column";
const edgePosition = (edge: Exclude<TilingDropEdge, "center">): TilingInsertPosition =>
  edge === "left" || edge === "top" ? "before" : "after";

/**
 * Move a pane into a group (`center`, optionally at `index`) or into a new group on one of the
 * target group's edges. The source group is removed when it becomes empty.
 */
export function movePane(
  tree: LayoutNode,
  paneId: string,
  targetTabsId: string,
  edge: TilingDropEdge = "center",
  index?: number
): LayoutNode {
  const loc = findPane(tree, paneId);
  const target = findNode(tree, targetTabsId);
  if (!loc || !target || target.type !== "tabs") return tree;
  const source = loc.group;
  const same = source.id === target.id;

  if (edge === "center") {
    if (same) {
      const panes = source.panes.filter((p) => p !== paneId);
      const at = index === undefined ? loc.index : Math.max(0, Math.min(index, panes.length));
      panes.splice(at, 0, paneId);
      return normalizeLayout(replaceNode(tree, source.id, () => ({ ...source, panes, active: paneId })) ?? tree);
    }
    let next = withoutPane(tree, loc);
    next =
      replaceNode(next, target.id, (node) => {
        const group = node as LayoutTabsNode;
        const panes = [...group.panes];
        panes.splice(index === undefined ? panes.length : Math.max(0, Math.min(index, panes.length)), 0, paneId);
        return { ...group, panes, active: paneId };
      }) ?? next;
    if (source.panes.length === 1) next = removeGroup(next, source.id);
    return normalizeLayout(next);
  }

  if (same && source.panes.length === 1) return tree;
  let next = withoutPane(tree, loc);
  next = splitGroup(next, target.id, edgeDirection(edge), { position: edgePosition(edge), panes: [paneId] });
  if (source.panes.length === 1) next = removeGroup(next, source.id);
  return normalizeLayout(next);
}

/**
 * Split the group holding `paneId` and put `newPaneId` in a new group beside it.
 * If `newPaneId` is `paneId` (or already in the tree) it is moved instead of duplicated.
 */
export function splitPane(
  tree: LayoutNode,
  paneId: string,
  direction: TilingDirection,
  newPaneId: string,
  position: TilingInsertPosition = "after"
): LayoutNode {
  const loc = findPane(tree, paneId);
  if (!loc) return tree;
  const edge: Exclude<TilingDropEdge, "center"> =
    direction === "row" ? (position === "after" ? "right" : "left") : position === "after" ? "bottom" : "top";
  if (newPaneId === paneId) return movePane(tree, paneId, loc.group.id, edge);
  let next = tree;
  if (findPane(next, newPaneId)) next = closePane(next, newPaneId);
  return splitGroup(next, loc.group.id, direction, { position, panes: [newPaneId] });
}

/** Add a pane to a group (default: the first group). Existing panes are moved there. */
export function addPane(tree: LayoutNode, paneId: string, targetTabsId?: string): LayoutNode {
  const target = (targetTabsId && findNode(tree, targetTabsId)) || listGroups(tree)[0];
  if (!target || target.type !== "tabs") return tree;
  if (findPane(tree, paneId)) return movePane(tree, paneId, target.id, "center", target.panes.length);
  return normalizeLayout(
    replaceNode(tree, target.id, () => ({ ...target, panes: [...target.panes, paneId], active: paneId })) ?? tree
  );
}

/** Make `paneId` the active tab of its group. */
export function setActiveTab(tree: LayoutNode, paneId: string): LayoutNode {
  const loc = findPane(tree, paneId);
  if (!loc || loc.group.active === paneId) return tree;
  return replaceNode(tree, loc.group.id, () => ({ ...loc.group, active: paneId })) ?? tree;
}

/**
 * Move the divider after child `index` of a split by `deltaFraction` (of the split's size).
 * Both neighbours keep at least `min` (fraction).
 */
export function resizeSplit(tree: LayoutNode, splitId: string, index: number, deltaFraction: number, min = 0.05): LayoutNode {
  const node = findNode(tree, splitId);
  if (!node || node.type !== "split" || index < 0 || index >= node.children.length - 1) return tree;
  const sizes = fixSizes(node.sizes, node.children.length);
  const a = sizes[index];
  const pair = a + sizes[index + 1];
  const lo = Math.min(Math.max(0, min), pair / 2);
  const nextA = Math.min(pair - lo, Math.max(lo, a + deltaFraction));
  if (Math.abs(nextA - a) < 1e-9) return tree;
  sizes[index] = nextA;
  sizes[index + 1] = pair - nextA;
  return replaceNode(tree, splitId, () => ({ ...node, sizes })) ?? tree;
}

/** Reset a split's children to equal sizes. */
export function equalizeSplit(tree: LayoutNode, splitId: string): LayoutNode {
  const node = findNode(tree, splitId);
  if (!node || node.type !== "split") return tree;
  return replaceNode(tree, splitId, () => ({ ...node, sizes: equalSizes(node.children.length) })) ?? tree;
}

/** Same tree with every group emptied (a zone template). */
export function toZoneLayout(tree: LayoutNode): LayoutNode {
  if (tree.type === "tabs") return { ...tree, panes: [], active: "" };
  return { ...tree, children: tree.children.map(toZoneLayout) };
}

/** Put `panes` into the tree's groups in order; extra panes become tabs in the first group. */
export function fillLayoutSlots(tree: LayoutNode, panes: string[]): LayoutNode {
  const unique = [...new Set(panes)];
  const groups = listGroups(tree);
  const assign = new Map<string, string[]>();
  groups.forEach((g, i) => assign.set(g.id, unique[i] !== undefined ? [unique[i]] : []));
  if (groups.length > 0 && unique.length > groups.length) {
    assign.get(groups[0].id)!.push(...unique.slice(groups.length));
  }
  const fill = (node: LayoutNode): LayoutNode =>
    node.type === "tabs"
      ? { ...node, panes: assign.get(node.id) ?? [], active: assign.get(node.id)?.[0] ?? "" }
      : { ...node, children: node.children.map(fill) };
  return normalizeLayout(fill(tree));
}

/** True when both trees have the same split structure and (roughly) the same sizes. Ids and panes are ignored. */
export function isSameLayoutShape(a: LayoutNode, b: LayoutNode, tolerance = 0.02): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "tabs" || b.type === "tabs") return true;
  if (a.direction !== b.direction || a.children.length !== b.children.length) return false;
  return a.children.every(
    (c, i) => Math.abs((a.sizes[i] ?? 0) - (b.sizes[i] ?? 0)) <= tolerance && isSameLayoutShape(c, b.children[i], tolerance)
  );
}

/** Structural type guard for untrusted input. */
export function isLayoutNode(value: unknown): value is LayoutNode {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || !v.id) return false;
  if (v.type === "tabs") {
    return Array.isArray(v.panes) && v.panes.every((p) => typeof p === "string") && typeof v.active === "string";
  }
  if (v.type === "split") {
    return (
      (v.direction === "row" || v.direction === "column") &&
      Array.isArray(v.children) &&
      Array.isArray(v.sizes) &&
      v.sizes.every((s) => typeof s === "number") &&
      v.children.every(isLayoutNode)
    );
  }
  return false;
}

/** Normalized JSON for persistence. */
export function serializeLayout(tree: LayoutNode, space?: number): string {
  return JSON.stringify(normalizeLayout(tree), null, space);
}

/** Parse JSON (or an already-parsed value) into a normalized layout; null when invalid. */
export function parseLayout(input: string | unknown): LayoutNode | null {
  let value: unknown = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return null;
    }
  }
  return isLayoutNode(value) ? normalizeLayout(value) : null;
}

/* ------------------------------------------------------------------ */
/* Presets                                                             */
/* ------------------------------------------------------------------ */

export interface LayoutPreset {
  id: string;
  label: string;
  /** Number of pane slots (groups). */
  slots: number;
  /** Build the layout, filling slots with `panes` in order (extras become tabs in the first slot). */
  create: (panes?: string[]) => LayoutNode;
}

type Template = number | { d: TilingDirection; c: Template[]; s?: number[] };

function slotOrder(t: Template): number[] {
  return typeof t === "number" ? [t] : t.c.flatMap(slotOrder);
}

/** Slot numbers in a template are priorities (0 = main); extra panes become tabs in slot 0. */
function preset(id: string, label: string, template: Template): LayoutPreset {
  const slots = slotOrder(template).length;
  return {
    id,
    label,
    slots,
    create: (panes = []) => {
      const unique = [...new Set(panes)];
      const build = (t: Template): LayoutNode => {
        if (typeof t !== "number") return createSplitNode(t.d, t.c.map(build), t.s);
        const own = unique[t] !== undefined ? [unique[t]] : [];
        if (t === 0) own.push(...unique.slice(slots));
        return createTabsNode(own);
      };
      return normalizeLayout(build(template));
    },
  };
}

/** Built-in arrangements. */
export const layoutPresets: LayoutPreset[] = [
  preset("single", "Single", 0),
  preset("two-columns", "Two columns", { d: "row", c: [0, 1] }),
  preset("three-columns", "Three columns", { d: "row", c: [1, 0, 2], s: [0.25, 0.5, 0.25] }),
  preset("main-sidebar", "Main + sidebar", { d: "row", c: [1, 0], s: [0.28, 0.72] }),
  preset("grid", "2×2 grid", { d: "column", c: [{ d: "row", c: [0, 1] }, { d: "row", c: [2, 3] }] }),
  preset("main-bottom", "Main + bottom", { d: "column", c: [0, 1], s: [0.7, 0.3] }),
];
