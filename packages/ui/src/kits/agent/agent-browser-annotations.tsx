import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { RiAddLine, RiChatQuoteLine, RiCloseLine, RiDeleteBinLine, RiMapPin2Line, RiSendPlaneLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { clamp, roundTo } from "../../lib/math";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Textarea } from "../../primitives/textarea";

/* ------------------------------------------------------------------ */
/* AnnotationLayer                                                     */
/* ------------------------------------------------------------------ */

export interface BrowserAnnotation {
  id: string;
  /** Horizontal position, percent of the surface width. */
  x: number;
  /** Vertical position, percent of the surface height. */
  y: number;
  comment: string;
}

export interface AnnotationLayerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Controlled pins, each with a position and optional comment. */
  annotations?: BrowserAnnotation[];
  /** Initial pins when `annotations` is not controlled. */
  defaultAnnotations?: BrowserAnnotation[];
  /** Called with the pins when the user adds, edits or removes one. */
  onAnnotationsChange?: (annotations: BrowserAnnotation[]) => void;
  /** Annotate mode: clicks on the surface drop pins. */
  active?: boolean;
  /** Initial annotate mode when `active` is not controlled. */
  defaultActive?: boolean;
  /** Called with the new state when the user toggles annotate mode. */
  onActiveChange?: (active: boolean) => void;
  /** "Send to agent". Receives annotations that have a comment. */
  onSendAnnotations?: (annotations: BrowserAnnotation[]) => void;
  /** Clear the pins after sending. Default true. */
  clearOnSend?: boolean;
  /** Show the numbered list under the surface. Default true. */
  showList?: boolean;
  /** Extra classes for the surface that wraps `children`. */
  surfaceClassName?: string;
  /** Page content to annotate. */
  children?: React.ReactNode;
}

const clampPct = (n: number) => roundTo(clamp(n, 0, 100), 1);

let annotationSeq = 0;

/** Lets the user pin numbered comments on a page for the agent, then send them in one batch. */
export const AnnotationLayer = React.forwardRef<HTMLDivElement, AnnotationLayerProps>(
  (
    {
      annotations: annotationsProp,
      defaultAnnotations = [],
      onAnnotationsChange,
      active: activeProp,
      defaultActive = false,
      onActiveChange,
      onSendAnnotations,
      clearOnSend = true,
      showList = true,
      surfaceClassName,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [annotations, setAnnotations] = useControllableState({
      value: annotationsProp,
      defaultValue: defaultAnnotations,
      onChange: onAnnotationsChange,
    });
    const [active, setActive] = useControllableState({ value: activeProp, defaultValue: defaultActive, onChange: onActiveChange });
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [draft, setDraft] = React.useState("");
    const freshIds = React.useRef(new Set<string>());

    const drop = (x: number, y: number) => {
      const id = `ann-${++annotationSeq}`;
      freshIds.current.add(id);
      setAnnotations([...annotations, { id, x: clampPct(x), y: clampPct(y), comment: "" }]);
      setDraft("");
      setEditingId(id);
    };

    const onSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!active) return;
      const r = e.currentTarget.getBoundingClientRect();
      if (!r.width || !r.height) return;
      drop(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
    };

    const openEditor = (a: BrowserAnnotation) => {
      setDraft(a.comment);
      setEditingId(a.id);
    };

    const closeEditor = (list = annotations) => {
      const id = editingId;
      setEditingId(null);
      if (id && freshIds.current.has(id)) {
        freshIds.current.delete(id);
        const a = list.find((x) => x.id === id);
        if (a && !a.comment.trim()) setAnnotations(list.filter((x) => x.id !== id));
      }
    };

    const save = () => {
      if (!editingId) return;
      const next = annotations.map((a) => (a.id === editingId ? { ...a, comment: draft.trim() } : a));
      freshIds.current.delete(editingId);
      setAnnotations(next);
      setEditingId(null);
    };

    const remove = (id: string) => {
      freshIds.current.delete(id);
      setAnnotations(annotations.filter((a) => a.id !== id));
      if (editingId === id) setEditingId(null);
    };

    const sendable = annotations.filter((a) => a.comment.trim());
    const send = () => {
      if (!sendable.length) return;
      onSendAnnotations?.(sendable);
      if (clearOnSend) setAnnotations([]);
    };

    return (
      <div ref={ref} data-slot="annotation-layer" className={cn("flex min-h-0 flex-col", className)} {...props}>
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-subtle px-2 py-1.5">
          <Button
            type="button"
            size="xs"
            variant={active ? "soft" : "ghost"}
            aria-pressed={active}
            leadingIcon={<RiMapPin2Line aria-hidden />}
            onClick={() => setActive(!active)}
          >
            Annotate
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            leadingIcon={<RiAddLine aria-hidden />}
            onClick={() => {
              if (!active) setActive(true);
              drop(50, 50);
            }}
          >
            Add note
          </Button>
          <span className="ms-auto text-xs text-muted-foreground" aria-live="polite">
            {annotations.length === 1 ? "1 note" : `${annotations.length} notes`}
          </span>
          <Button
            type="button"
            size="xs"
            variant="primary"
            leadingIcon={<RiSendPlaneLine aria-hidden />}
            disabled={!sendable.length}
            onClick={send}
          >
            Send to agent
          </Button>
        </div>
        <div
          data-slot="annotation-surface"
          data-active={active || undefined}
          onClick={onSurfaceClick}
          className={cn("relative min-h-40 flex-1 overflow-hidden", active && "cursor-crosshair", surfaceClassName)}
        >
          <div className={cn(active && "pointer-events-none select-none")}>{children}</div>
          {active && <div aria-hidden className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-warning/50" />}
          {annotations.map((a, i) => (
            <PopoverPrimitive.Root
              key={a.id}
              open={editingId === a.id}
              onOpenChange={(o) => (o ? openEditor(a) : closeEditor())}
            >
              <PopoverPrimitive.Trigger asChild>
                <button
                  type="button"
                  aria-label={`Annotation ${i + 1}${a.comment ? `: ${a.comment}` : ""}`}
                  data-slot="annotation-pin"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "absolute z-10 flex size-6 -translate-x-1/2 rtl:translate-x-1/2 -translate-y-full items-center justify-center rounded-full rounded-es-none border-2 border-background bg-warning text-2xs font-semibold text-warning-foreground shadow-md",
                    focusRing
                  )}
                  style={{ left: `${a.x}%`, top: `${a.y}%` }}
                >
                  {i + 1}
                </button>
              </PopoverPrimitive.Trigger>
              <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                  side="right"
                  align="start"
                  sideOffset={6}
                  onClick={(e) => e.stopPropagation()}
                  className="z-50 w-64 rounded-box border border-border bg-popover p-3 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                >
                  <form
                    className="space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      save();
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <RiChatQuoteLine className="size-3.5 text-muted-foreground" aria-hidden />
                      Note {i + 1}
                    </div>
                    <Textarea
                      aria-label={`Annotation ${i + 1} comment`}
                      autoFocus
                      autoResize
                      minRows={2}
                      maxRows={6}
                      value={draft}
                      placeholder="What should the agent change here?"
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          save();
                        }
                      }}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <Button type="button" size="xs" variant="ghost" onClick={() => remove(a.id)} leadingIcon={<RiDeleteBinLine aria-hidden />}>
                        Delete
                      </Button>
                      <Button type="submit" size="xs" disabled={!draft.trim()}>
                        Save
                      </Button>
                    </div>
                  </form>
                </PopoverPrimitive.Content>
              </PopoverPrimitive.Portal>
            </PopoverPrimitive.Root>
          ))}
        </div>
        {showList && annotations.length > 0 && (
          <ol aria-label="Annotations" className="divide-y divide-border border-t border-border text-sm">
            {annotations.map((a, i) => (
              <li key={a.id} className="flex items-start gap-2 px-3 py-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-warning text-2xs font-semibold text-warning-foreground" aria-hidden>
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => openEditor(a)}
                  className={cn("-my-0.5 min-w-0 flex-1 truncate rounded-xs py-0.5 text-start hover:underline", !a.comment && "italic text-muted-foreground", focusRing)}
                >
                  {a.comment || "Empty note"}
                </button>
                <Button type="button" size="icon-xs" variant="ghost" aria-label={`Remove annotation ${i + 1}`} onClick={() => remove(a.id)}>
                  <RiCloseLine aria-hidden />
                </Button>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }
);
AnnotationLayer.displayName = "AnnotationLayer";
