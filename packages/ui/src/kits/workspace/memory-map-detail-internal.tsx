/* Private MemoryNodeDetail: the default node detail panel of MemoryMap. */
import * as React from "react";
import { RiCloseLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { Button } from "../../primitives/button";
import type { MemoryLegendItem, MemoryNode } from "./memory-map-model";
import { MemoryGlyphIcon } from "./memory-map-legend";

export function MemoryNodeDetail({
  node,
  legend,
  links,
  onSelect,
  actions,
  dateText,
}: {
  node: MemoryNode;
  legend?: MemoryLegendItem;
  links: MemoryNode[];
  onSelect: (id: string | null) => void;
  actions: React.ReactNode;
  dateText: string;
}) {
  return (
    <>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            {legend && <MemoryGlyphIcon glyph={legend.glyph} color={legend.color} />}
            {legend?.label ?? node.kind} · {dateText}
          </span>
          <h3 className="text-base font-semibold text-foreground">{node.label}</h3>
        </div>
        {actions}
        <Button size="icon-xs" variant="ghost" aria-label="Close details" onClick={() => onSelect(null)}>
          <RiCloseLine aria-hidden />
        </Button>
      </div>
      {node.description && <p className="text-sm text-muted-foreground">{node.description}</p>}
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Weight</dt>
          <dd className="font-medium tabular-nums">{node.weight ?? 1}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Links</dt>
          <dd className="font-medium tabular-nums">{links.length}</dd>
        </div>
      </dl>
      {links.length > 0 && (
        <div className="flex flex-col gap-1">
          <h4 className="text-xs font-medium text-muted-foreground">Linked</h4>
          <ul className="flex flex-col gap-0.5">
            {links.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => onSelect(l.id)}
                  className={cn("w-full truncate rounded-xs px-1 py-0.5 text-start text-sm hover:bg-accent", focusRing)}
                >
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
