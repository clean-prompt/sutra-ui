import * as React from "react";
import { cn, Badge, Button, Heading, Text } from "@sutra/ui";
import { blockRegistry as registryEntries } from "@sutra/ui/blocks/registry";
import { RiCollapseDiagonalLine, RiExpandDiagonalLine } from "@sutra/ui/icons";
import { PageIntro } from "../components/demo";
import { ViewportFrame } from "../components/viewport-frame";

/** Shape of an entry in `blockRegistry` (packages/ui/src/blocks/registry.tsx). */
interface BlockEntry {
  id: string;
  name: string;
  category: string;
  component: React.ComponentType;
  description?: string;
  /** Optional hint; otherwise inferred from the category. */
  fullPage?: boolean;
}

const blockRegistry: readonly BlockEntry[] = registryEntries;

/** Width full-page blocks are laid out at before being scaled down to fit the frame. */
const PAGE_WIDTH = 1280;
const PAGE_FRAME_HEIGHT = 560;

const FULL_PAGE_CATEGORY = /page|landing|dashboard|shell|layout|app/i;

function isFullPage(block: BlockEntry) {
  return block.fullPage ?? FULL_PAGE_CATEGORY.test(block.category);
}

/** Keep block links and forms from hijacking the playground's hash router. */
function stopNavigation(event: React.SyntheticEvent) {
  const target = event.target as HTMLElement;
  if (event.type === "submit" || target.closest("a[href]")) event.preventDefault();
}

/** Renders children at PAGE_WIDTH and scales them to the frame width, clipped to a fixed height. */
function ScaledFrame({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.6);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry!.contentRect.width / PAGE_WIDTH)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative overflow-hidden" style={{ height: PAGE_FRAME_HEIGHT }}>
      <div
        className="origin-top-left bg-background"
        style={{ width: PAGE_WIDTH, height: PAGE_FRAME_HEIGHT / scale, transform: `scale(${scale})` }}
      >
        {children}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}

/** Blocks whose breakpoints follow the browser window (headers, page headers, marketing sections, the app shell). */
const VIEWPORT_CATEGORY = /^(header|section-header|marketing)$/;

function followsViewport(block: BlockEntry) {
  return !isFullPage(block) && (VIEWPORT_CATEGORY.test(block.category) || block.id === "app-shell");
}

function BlockPreview({ block }: { block: BlockEntry }) {
  const fullPage = isFullPage(block);
  const [expanded, setExpanded] = React.useState(false);
  const Component = block.component;
  const content = (
    <div onClickCapture={stopNavigation} onSubmitCapture={stopNavigation}>
      <Component />
    </div>
  );

  return (
    <section id={`block-${block.id}`} className="scroll-mt-20 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Heading as="h3" size="lg">
            {block.name}
          </Heading>
          {block.description && (
            <Text size="sm" tone="neutral">
              {block.description}
            </Text>
          )}
        </div>
        {fullPage && (
          <Button
            variant="outline"
            size="sm"
            leadingIcon={expanded ? <RiCollapseDiagonalLine /> : <RiExpandDiagonalLine />}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Fit to frame" : "Actual size"}
          </Button>
        )}
      </div>
      <div className="overflow-hidden rounded-box border border-border bg-background shadow-sm">
        {fullPage && !expanded ? (
          <ScaledFrame>{content}</ScaledFrame>
        ) : (
          (followsViewport(block) ? (
            <ViewportFrame className="bg-dots p-6 sm:p-10">{content}</ViewportFrame>
          ) : (
            <div className={cn(fullPage ? "overflow-x-auto" : "bg-dots p-6 sm:p-10")}>{content}</div>
          ))
        )}
      </div>
    </section>
  );
}

export function BlocksPage() {
  const groups = React.useMemo(() => {
    const map = new Map<string, BlockEntry[]>();
    for (const block of blockRegistry) {
      const list = map.get(block.category) ?? [];
      list.push(block);
      map.set(block.category, list);
    }
    return [...map.entries()];
  }, []);

  return (
    <PageIntro
      eyebrow="Blocks"
      title="Block Gallery"
      description="Composed sections and full pages built from Sutra components. Full-page blocks are scaled to fit; toggle Actual size to inspect them at full width."
    >
      {groups.length === 0 ? (
        <Text tone="neutral">No blocks registered yet.</Text>
      ) : (
        <>
          <nav aria-label="Block categories" className="-mt-6 flex flex-wrap gap-2">
            {groups.map(([category, blocks]) => (
              <a key={category} href={`#/blocks/gallery/${slug(category)}`}>
                <Badge variant="outline" size="lg" className="hover:bg-accent">
                  {category} <span className="text-muted-foreground">{blocks.length}</span>
                </Badge>
              </a>
            ))}
          </nav>
          {groups.map(([category, blocks]) => (
            <div key={category} id={slug(category)} className="scroll-mt-20 space-y-8">
              <Heading as="h2" size="display-xs" className="border-b border-border pb-3">
                {category}
              </Heading>
              {blocks.map((block) => (
                <BlockPreview key={block.id} block={block} />
              ))}
            </div>
          ))}
        </>
      )}
    </PageIntro>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
