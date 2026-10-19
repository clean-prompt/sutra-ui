/** Private TilingLayout views: split nodes, tab groups with drop zones, and tabs. */
import * as React from "react";
import {
  RiCloseLine,
  RiFullscreenExitLine,
  RiFullscreenLine,
  RiLayoutColumnLine,
  RiLayoutMasonryLine,
  RiLayoutRowLine,
  RiPictureInPicture2Line,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { Button } from "../primitives/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../primitives/context-menu";
import {
  equalizeSplit,
  removeGroup,
  resizeSplit,
  type LayoutNode,
  type LayoutTabsNode,
  type TilingDropEdge,
} from "./tiling-model";
import { PaneSlot, TilingHandle, useTiling } from "./tiling-layout-internal";

export function TilingNodeView({ node }: { node: LayoutNode }) {
  const ctx = useTiling();
  if (node.type === "tabs") return <TilingGroupView group={node} />;
  const row = node.direction === "row";
  return (
    <div
      data-slot="tiling-split"
      data-direction={node.direction}
      className={cn("flex h-full min-h-0 w-full min-w-0", row ? "flex-row" : "flex-col")}
    >
      {node.children.map((child, i) => (
        <React.Fragment key={child.id}>
          {i > 0 && (
            <TilingHandle
              direction={node.direction}
              sizes={node.sizes}
              index={i - 1}
              min={ctx.minSize}
              step={ctx.step}
              controls={ctx.cellId(node.children[i - 1].id)}
              label={row ? "Resize columns" : "Resize rows"}
              onResize={(index, delta) => ctx.update((l) => resizeSplit(l, node.id, index, delta, ctx.minSize))}
              onEqualize={() => ctx.update((l) => equalizeSplit(l, node.id))}
            />
          )}
          <div
            id={ctx.cellId(child.id)}
            data-slot="tiling-cell"
            className="flex min-h-0 min-w-0 overflow-hidden"
            style={{ flex: `${node.sizes[i] ?? 1} 1 0%` }}
          >
            <TilingNodeView node={child} />
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

const dropZoneClass: Record<TilingDropEdge, string> = {
  left: "inset-y-0 left-0 w-1/4",
  right: "inset-y-0 right-0 w-1/4",
  top: "inset-x-1/4 top-0 h-1/4",
  bottom: "inset-x-1/4 bottom-0 h-1/4",
  center: "inset-1/4",
};

const dropPreviewClass: Record<TilingDropEdge, string> = {
  left: "top-1 bottom-1 left-1 right-1/2",
  right: "top-1 bottom-1 left-1/2 right-1",
  top: "top-1 left-1 right-1 bottom-1/2",
  bottom: "top-1/2 left-1 right-1 bottom-1",
  center: "inset-1",
};

const dropEdges: TilingDropEdge[] = ["left", "right", "top", "bottom", "center"];

function TilingGroupView({ group }: { group: LayoutTabsNode }) {
  const ctx = useTiling();
  const index = ctx.groups.findIndex((g) => g.id === group.id);
  const maximized = ctx.maximized === group.id;
  const covered = ctx.maximized != null && !maximized;
  const focused = ctx.focusedGroup === group.id;
  const target = ctx.dropTarget?.groupId === group.id ? ctx.dropTarget.edge : null;
  const removable = ctx.groups.length > 1;
  const stripRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!group.active) return;
    const tab = document.getElementById(ctx.tabId(group.active));
    tab?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.active]);

  const onStripKeyDown = (event: React.KeyboardEvent) => {
    const panes = group.panes;
    const i = panes.indexOf(group.active);
    let next: string | undefined;
    if (event.key === "ArrowRight") next = panes[(i + 1) % panes.length];
    else if (event.key === "ArrowLeft") next = panes[(i - 1 + panes.length) % panes.length];
    else if (event.key === "Home") next = panes[0];
    else if (event.key === "End") next = panes[panes.length - 1];
    else if (event.key === "Delete" && group.active && ctx.closable(group.active)) {
      event.preventDefault();
      const after = panes[i + 1] ?? panes[i - 1];
      ctx.close(group.active);
      if (after) requestAnimationFrame?.(() => document.getElementById(ctx.tabId(after))?.focus());
      return;
    } else return;
    event.preventDefault();
    if (next) {
      ctx.activate(next);
      document.getElementById(ctx.tabId(next))?.focus();
    }
  };

  const stripDrop = {
    "data-tiling-drop-group": group.id,
    "data-tiling-drop-edge": "center",
  } as const;

  return (
    <div
      role="group"
      aria-label={`Group ${index + 1}`}
      data-slot="tiling-group"
      data-group-id={group.id}
      data-focused={focused || undefined}
      data-maximized={maximized || undefined}
      inert={covered || undefined}
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col bg-background",
        maximized ? "absolute inset-0 z-20" : "relative"
      )}
    >
      <div
        data-slot="tiling-group-header"
        className={cn(
          "flex h-9 shrink-0 items-stretch border-b border-border bg-subtle",
          target === "center" && "bg-primary-soft"
        )}
      >
        {group.panes.length > 0 ? (
          <div
            ref={stripRef}
            role="tablist"
            aria-label={`Group ${index + 1} tabs`}
            data-slot="tiling-tabstrip"
            {...stripDrop}
            className="flex min-w-0 flex-1 overflow-x-auto overflow-y-hidden scrollbar-none"
            onKeyDown={onStripKeyDown}
            onWheel={(event) => {
              const el = stripRef.current;
              if (el && Math.abs(event.deltaY) > Math.abs(event.deltaX)) el.scrollLeft += event.deltaY;
            }}
            onDoubleClick={(event) => {
              if (event.target === event.currentTarget) ctx.toggleMaximize(group.id);
            }}
          >
            {group.panes.map((paneId) => (
              <TilingTab key={paneId} group={group} paneId={paneId} focused={focused} />
            ))}
          </div>
        ) : (
          <div {...stripDrop} className="flex min-w-0 flex-1 items-center px-3 text-xs text-muted-foreground">
            Empty
          </div>
        )}
        <div className="flex shrink-0 items-center gap-0.5 border-l border-border px-1">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Split group right"
            onClick={() => (group.active ? ctx.split(group.active, "row") : ctx.splitEmpty(group.id, "row"))}
          >
            <RiLayoutColumnLine aria-hidden className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={maximized ? "Restore group" : "Maximize group"}
            aria-pressed={maximized}
            onClick={() => ctx.toggleMaximize(group.id)}
          >
            {maximized ? <RiFullscreenExitLine aria-hidden className="size-3.5" /> : <RiFullscreenLine aria-hidden className="size-3.5" />}
          </Button>
          {group.panes.length === 0 && removable && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Close group"
              onClick={() => ctx.update((l) => removeGroup(l, group.id))}
            >
              <RiCloseLine aria-hidden className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div data-slot="tiling-group-body" className="relative min-h-0 flex-1">
        {group.panes.map((paneId) => (
          <div
            key={paneId}
            role="tabpanel"
            id={ctx.panelId(paneId)}
            aria-labelledby={ctx.tabId(paneId)}
            data-pane-id={paneId}
            hidden={paneId !== group.active}
            className="absolute inset-0 overflow-auto"
          >
            <PaneSlot paneId={paneId} />
          </div>
        ))}
        {group.panes.length === 0 &&
          (ctx.renderEmptyGroup?.(group.id) ?? (
            <div
              data-slot="tiling-empty"
              className="flex h-full flex-col items-center justify-center gap-1.5 p-4 text-center text-sm text-muted-foreground"
            >
              <RiLayoutMasonryLine aria-hidden className="size-6 opacity-60" />
              <p className="font-medium text-foreground">Empty group</p>
              <p className="text-xs">Drag a tab here</p>
            </div>
          ))}
        {ctx.drag && (
          <div data-slot="tiling-drop-overlay" className="absolute inset-0 z-30">
            {dropEdges.map((edge) => (
              <div
                key={edge}
                aria-hidden
                data-tiling-drop-group={group.id}
                data-tiling-drop-edge={edge}
                className={cn("absolute", dropZoneClass[edge])}
              />
            ))}
            {target && (
              <div
                aria-hidden
                data-slot="tiling-drop-preview"
                data-edge={target}
                className={cn(
                  "pointer-events-none absolute rounded-box border-2 border-primary bg-primary/15 transition-all duration-100",
                  dropPreviewClass[target]
                )}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TilingTab({ group, paneId, focused }: { group: LayoutTabsNode; paneId: string; focused: boolean }) {
  const ctx = useTiling();
  const active = group.active === paneId;
  const name = ctx.label(paneId);
  const closable = ctx.closable(paneId);
  const others = group.panes.filter((p) => p !== paneId && ctx.closable(p)).length;
  const dragging = ctx.drag?.paneId === paneId;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="presentation"
          data-slot="tiling-tab"
          data-active={active || undefined}
          data-dragging={dragging || undefined}
          className={cn(
            "group/tab relative flex max-w-52 shrink-0 items-center border-r border-border text-xs transition-colors",
            active ? "bg-background text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            active &&
              "after:absolute after:inset-x-0 after:top-0 after:h-0.5 after:content-['']",
            active && (focused ? "after:bg-primary" : "after:bg-border-strong"),
            dragging && "opacity-50"
          )}
        >
          <button
            type="button"
            role="tab"
            id={ctx.tabId(paneId)}
            aria-selected={active}
            aria-controls={ctx.panelId(paneId)}
            tabIndex={active ? 0 : -1}
            aria-keyshortcuts={closable ? "Delete" : undefined}
            draggable={false}
            className={cn("flex h-full min-w-0 items-center gap-1.5 pl-3", closable ? "pr-1" : "pr-3", focusRing, "focus-visible:ring-inset")}
            onClick={() => ctx.activate(paneId)}
            onPointerDown={(event) => ctx.startTabDrag(event, paneId)}
            onMouseDown={(event) => {
              if (event.button === 1) event.preventDefault();
            }}
            onAuxClick={(event) => {
              if (event.button === 1 && closable) {
                event.preventDefault();
                ctx.close(paneId);
              }
            }}
          >
            {ctx.icon(paneId) && <span className="flex shrink-0 [&_svg]:size-3.5">{ctx.icon(paneId)}</span>}
            <span className="truncate">{ctx.title(paneId)}</span>
          </button>
          {closable && (
            // Mouse affordance only: keyboard users close with Delete, mod+w or the context menu.
            <span
              aria-hidden
              title={`Close ${name}`}
              data-slot="tiling-tab-close"
              className={cn(
                "mr-1 flex size-5 shrink-0 cursor-default items-center justify-center rounded-xs text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground",
                active ? "opacity-100" : "opacity-0 group-hover/tab:opacity-100"
              )}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => ctx.close(paneId)}
            >
              <RiCloseLine aria-hidden className="size-3.5" />
            </span>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-48">
        <ContextMenuItem icon={<RiLayoutColumnLine aria-hidden />} onSelect={() => ctx.split(paneId, "row")}>
          Split right
        </ContextMenuItem>
        <ContextMenuItem icon={<RiLayoutRowLine aria-hidden />} onSelect={() => ctx.split(paneId, "column")}>
          Split down
        </ContextMenuItem>
        <ContextMenuItem disabled={group.panes.length < 2} onSelect={() => ctx.moveToNewGroup(paneId)}>
          Move to new group
        </ContextMenuItem>
        {ctx.floatingEnabled && (
          <ContextMenuItem icon={<RiPictureInPicture2Line aria-hidden />} onSelect={() => ctx.popOut(paneId)}>
            Pop out
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          icon={ctx.maximized === group.id ? <RiFullscreenExitLine aria-hidden /> : <RiFullscreenLine aria-hidden />}
          onSelect={() => ctx.toggleMaximize(group.id)}
        >
          {ctx.maximized === group.id ? "Restore group" : "Maximize group"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={!closable} onSelect={() => ctx.close(paneId)}>
          Close
        </ContextMenuItem>
        <ContextMenuItem disabled={others === 0} onSelect={() => ctx.closeOthers(paneId)}>
          Close others
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
