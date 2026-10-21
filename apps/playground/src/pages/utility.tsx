import * as React from "react";
import {
  AspectRatio,
  Button,
  Collapse,
  Input,
  ScrollArea,
  Separator,
  useDebouncedValue,
  useDisclosure,
  usePrevious,
  type AspectRatioPreset,
} from "@cleanprompt/sutra-ui";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

const gradients: { ratio: AspectRatioPreset; className: string }[] = [
  { ratio: "1/1", className: "from-brand-300 to-brand-600" },
  { ratio: "4/3", className: "from-sky-300 to-indigo-500" },
  { ratio: "3/4", className: "from-amber-200 to-rose-500" },
  { ratio: "9/16", className: "from-emerald-200 to-teal-600" },
];

const releases = Array.from({ length: 40 }, (_, i) => {
  const minor = 40 - i;
  return { version: `v2.${minor}.0`, date: new Date(2026, 9, 18 - i * 3).toLocaleDateString(undefined, { month: "short", day: "numeric" }) };
});

const artworks = [
  { title: "Ornamental Ridge", artist: "Mira Okafor", photo: "photo-1506744038136-46273834b3fb" },
  { title: "Low Tide", artist: "Jonas Weller", photo: "photo-1507525428034-b723cf961d3e" },
  { title: "Pine Hollow", artist: "Aiko Tanaka", photo: "photo-1441974231531-c6227db76b6e" },
  { title: "Glass City", artist: "Rafael Ortiz", photo: "photo-1477959858617-67f85cf4f1df" },
  { title: "Dune Line", artist: "Leila Haddad", photo: "photo-1509316785289-025f5b846b35" },
  { title: "Alpine Lake", artist: "Sven Lund", photo: "photo-1501785888041-af3ef285b470" },
];

const unsplash = (id: string, w = 800) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

function DisclosureDemo() {
  const disclosure = useDisclosure();
  const [count, setCount] = React.useState(0);
  const controlled = useDisclosure({ open: count % 2 === 1, onOpenChange: () => setCount((c) => c + 1) });
  return (
    <Demo
      id="use-disclosure"
      title="useDisclosure"
      description="Open state for any overlay or section, controlled or not, with stable handlers and a props object to spread onto Dialog, Sheet, Popover or Collapse."
      align="start"
      canvasClassName="gap-6"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <DemoLabel>Uncontrolled</DemoLabel>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={disclosure.onOpen}>
              Open
            </Button>
            <Button size="sm" variant="secondary" onClick={disclosure.onClose}>
              Close
            </Button>
            <Button size="sm" variant="ghost" onClick={disclosure.toggle}>
              Toggle
            </Button>
          </div>
          <Collapse open={disclosure.open}>
            <p className="rounded-box border border-border bg-card p-3 text-sm text-muted-foreground">
              open is {String(disclosure.open)}.
            </p>
          </Collapse>
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Controlled by the parent (every request flips a counter)</DemoLabel>
          <Button size="sm" variant="secondary" onClick={controlled.toggle}>
            Request toggle ({count})
          </Button>
          <p className="text-sm text-muted-foreground">open is {String(controlled.open)}.</p>
        </div>
      </div>
    </Demo>
  );
}

function DebouncedDemo() {
  const [text, setText] = React.useState("");
  const debounced = useDebouncedValue(text, 400);
  const results = ["Alpine", "Aspen", "Birch", "Cedar", "Cypress", "Elm", "Maple", "Oak", "Pine", "Spruce"].filter((t) =>
    t.toLowerCase().includes(debounced.trim().toLowerCase())
  );
  return (
    <Demo
      id="use-debounced-value"
      title="useDebouncedValue"
      description="A copy of a value that follows it after it has stopped changing (400 ms here). Filter or fetch on the debounced one."
      align="start"
    >
      <div className="w-full max-w-sm space-y-3">
        <Input aria-label="Search trees" placeholder="Type to search trees" value={text} onChange={(e) => setText(e.target.value)} />
        <p className="text-xs text-muted-foreground">
          typed: <code>{text || "(empty)"}</code> · debounced: <code>{debounced || "(empty)"}</code>
        </p>
        {results.length ? (
          <ul className="flex flex-wrap gap-2 text-sm">
            {results.map((r) => (
              <li key={r} className="rounded-control bg-muted px-2 py-1">
                {r}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No matches</p>
        )}
      </div>
    </Demo>
  );
}

function PreviousDemo() {
  const [n, setN] = React.useState(5);
  const previous = usePrevious(n);
  return (
    <Demo
      id="use-previous"
      title="usePrevious"
      description="The last different value, kept across unrelated re-renders: use it for direction (up or down) or for a from-to caption."
      align="start"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" onClick={() => setN((v) => v - 1)}>
          Decrease
        </Button>
        <span className="text-sm tabular-nums">
          {previous === undefined ? `Value ${n}` : `${previous} → ${n} (${n > previous ? "up" : "down"})`}
        </span>
        <Button size="sm" variant="secondary" onClick={() => setN((v) => v + 1)}>
          Increase
        </Button>
      </div>
    </Demo>
  );
}

export function UtilityPage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="Utility"
      description="Layout primitives that keep media in proportion and make overflowing content scroll gracefully."
    >
      <Demo
        id="aspect-ratio"
        title="Aspect ratio"
        description="Keeps a fixed width/height ratio. Accepts presets like 16/9 or any number; images fill the box with object-cover."
        align="start"
        canvasClassName="gap-6"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <DemoLabel>16/9 · rounded image</DemoLabel>
            <AspectRatio ratio="16/9" rounded>
              <img src={unsplash("photo-1506744038136-46273834b3fb", 1200)} alt="Mountain valley at sunrise" />
            </AspectRatio>
          </div>
          <div className="space-y-2">
            <DemoLabel>21/9 · framed placeholder</DemoLabel>
            <AspectRatio ratio="21/9" rounded framed>
              <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                Video embed
              </div>
            </AspectRatio>
          </div>
        </div>
        <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-4">
          {gradients.map(({ ratio, className }) => (
            <div key={ratio} className="space-y-2">
              <DemoLabel>{ratio}</DemoLabel>
              <AspectRatio ratio={ratio} rounded>
                <div className={`flex size-full items-end bg-gradient-to-br p-3 ${className}`}>
                  <span className="rounded-control bg-black/25 px-2 py-0.5 font-mono text-xs text-white">{ratio}</span>
                </div>
              </AspectRatio>
            </div>
          ))}
        </div>
      </Demo>

      <Demo
        id="scroll-area"
        title="Scroll area"
        description="Thin overlay scrollbars with optional fading edges, vertically or horizontally."
        align="start"
        canvasClassName="gap-6"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_1fr]">
          <div className="space-y-2">
            <DemoLabel>Vertical · fade edges</DemoLabel>
            <ScrollArea fadeEdges="vertical" className="h-72 rounded-box border border-border bg-card">
              <div className="p-4">
                <p className="mb-3 text-sm font-medium text-foreground">Releases</p>
                {releases.map((release, i) => (
                  <div key={release.version}>
                    {i > 0 && <Separator className="my-2" />}
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono text-foreground">{release.version}</span>
                      <span className="text-muted-foreground">{release.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div className="min-w-0 space-y-2">
            <DemoLabel>Horizontal</DemoLabel>
            <ScrollArea orientation="horizontal" type="always" className="w-full rounded-box border border-border bg-card">
              <div className="flex w-max gap-4 p-4">
                {artworks.map((art) => (
                  <figure key={art.photo} className="w-44 shrink-0">
                    <AspectRatio ratio="3/4" rounded>
                      <img src={unsplash(art.photo, 400)} alt={art.title} loading="lazy" />
                    </AspectRatio>
                    <figcaption className="pt-2 text-xs text-muted-foreground">
                      <span className="block font-medium text-foreground">{art.title}</span>
                      {art.artist}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </Demo>
      <DisclosureDemo />

      <DebouncedDemo />

      <PreviousDemo />
    </PageIntro>
  );
}
