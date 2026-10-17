import { AspectRatio, ScrollArea, Separator, type AspectRatioPreset } from "@sutra/ui";
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
        <div className="grid gap-6 md:grid-cols-2">
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
        <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
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
    </PageIntro>
  );
}
