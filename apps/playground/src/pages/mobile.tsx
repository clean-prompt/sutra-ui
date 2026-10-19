import * as React from "react";
import {
  AdaptiveTabs,
  BottomTabBar,
  Button,
  DeviceFrame,
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  FilePreviewCard,
  FileViewer,
  ImageWithFallback,
  Lightbox,
  LightboxTrigger,
  PresenceAvatars,
  PresenceIndicator,
  RemoteCursor,
  ShareDialog,
  SplitPane,
  SplitPaneHandle,
  SplitPanePanel,
  Markdown,
  SegmentedControl,
  Slider,
  TypingIndicator,
  type LightboxItem,
  type PresenceConnection,
  type PresenceUser,
  type ViewerFile,
} from "@sutra/ui";
import {
  RiAddLine,
  RiCompass3Line,
  RiHome5Fill,
  RiHome5Line,
  RiImageLine,
  RiMic2Line,
  RiFileTextLine,
  RiMessage3Line,
  RiSearchLine,
  RiShareLine,
  RiText,
  RiUser3Line,
} from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";
import { SwipeRowDemo } from "./gesture-demos";

/* ------------------------------------------------------------------ */
/* Placeholder media (no network)                                      */
/* ------------------------------------------------------------------ */

function gradientImage(a: string, b: string, label: string, w = 1200, h = 800) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w * 0.78}" cy="${h * 0.28}" r="${h * 0.12}" fill="white" fill-opacity="0.35"/><path d="M0 ${h * 0.8} L${w * 0.3} ${h * 0.5} L${w * 0.55} ${h * 0.72} L${w * 0.75} ${h * 0.55} L${w} ${h * 0.82} V${h} H0Z" fill="black" fill-opacity="0.18"/><text x="48" y="${h - 48}" font-family="system-ui, sans-serif" font-size="44" font-weight="600" fill="white">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const gallery: LightboxItem[] = [
  { src: gradientImage("#615fff", "#00b8db", "Harbor at dawn"), alt: "Harbor at dawn", caption: "Harbor at dawn — first light over the water." },
  { src: gradientImage("#ff6900", "#ff2056", "Desert dunes"), alt: "Desert dunes", caption: "Wind-carved dunes, late afternoon." },
  { src: gradientImage("#00c950", "#00b8db", "Forest trail"), alt: "Forest trail" },
  { src: gradientImage("#8e51ff", "#ff2056", "City lights", 800, 1200), alt: "City lights", caption: "Portrait orientation works too." },
  { src: gradientImage("#f0b100", "#ff6900", "Golden field"), alt: "Golden field" },
  { src: gradientImage("#62748e", "#0b0b0d", "Night sky"), alt: "Night sky", caption: "Long exposure, 30 seconds." },
];

const PDF_SOURCE = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 88>>stream
BT /F1 28 Tf 72 700 Td (Quarterly report) Tj 0 -40 Td /F1 14 Tf (Placeholder PDF page.) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`;

const markdownSample = `# Release notes

**Sutra 2.4** brings mobile-first viewers:

- Bottom tab bar with badges
- Drag-to-dismiss drawers
- A fullscreen lightbox

> Everything works offline and syncs when you're back.

\`\`\`ts
const lb = useLightbox();
lb.openAt(2);
\`\`\`
`;

const jsonSample = JSON.stringify({ id: "doc_8d2f", title: "Q4 Launch Plan", collaborators: 4, tags: ["launch", "q4"], shared: true });

/* ------------------------------------------------------------------ */
/* Demos                                                               */
/* ------------------------------------------------------------------ */

function PhoneTabBarDemo() {
  const [tab, setTab] = React.useState("home");
  const titles: Record<string, string> = { home: "Home", search: "Search", inbox: "Inbox", me: "Profile" };
  return (
    <DeviceFrame variant="phone">
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-3 px-4 pt-2">
          <p className="text-lg font-semibold">{titles[tab]}</p>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-14 rounded-box bg-muted" />
          ))}
        </div>
        <BottomTabBar
          value={tab}
          onValueChange={setTab}
          position="sticky"
          hideAbove="never"
          aria-label="Phone sections"
          primaryAction={{ icon: <RiAddLine />, label: "New note", onClick: () => undefined }}
          items={[
            { value: "home", label: "Home", icon: <RiHome5Line />, activeIcon: <RiHome5Fill /> },
            { value: "search", label: "Search", icon: <RiSearchLine /> },
            { value: "inbox", label: "Inbox", icon: <RiMessage3Line />, badge: 3 },
            { value: "me", label: "Me", icon: <RiUser3Line />, badge: true },
          ]}
        />
      </div>
    </DeviceFrame>
  );
}

function AdaptiveTabsDemo() {
  const [mode, setMode] = React.useState<"inline" | "bottom">("inline");
  const [value, setValue] = React.useState("text");
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <SegmentedControl
        size="sm"
        aria-label="Preview width"
        value={mode}
        onValueChange={(v) => v && setMode(v as "inline" | "bottom")}
        options={[
          { value: "inline", label: "Wide" },
          { value: "bottom", label: "Phone" },
        ]}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-box border border-border bg-subtle">
        <div className="flex h-48 items-start justify-center p-4">
          <AdaptiveTabs
            mode={mode}
            value={value}
            onValueChange={setValue}
            label="What to translate"
            bottomBarProps={{ position: "static", className: "absolute inset-x-0 bottom-0" }}
            items={[
              { value: "text", label: "Text", icon: <RiText /> },
              { value: "images", label: "Images", icon: <RiImageLine /> },
              { value: "documents", label: "Documents", icon: <RiFileTextLine />, badge: 2 },
              { value: "converse", label: "Conversation", icon: <RiMic2Line /> },
            ]}
          />
        </div>
      </div>
      <DemoLabel>In an app, leave `mode` on "auto": pills from `md` up, a bottom bar below.</DemoLabel>
    </div>
  );
}

function DrawerDemo() {
  const [volume, setVolume] = React.useState([60]);
  return (
    <div className="flex flex-wrap gap-3">
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="secondary">Basic drawer</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Now playing</DrawerTitle>
            <DrawerDescription>Drag the sheet down, flick it, press Escape or tap the scrim.</DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="space-y-4">
            <ImageWithFallback src={gallery[0]!.src} alt="Album art" ratio={1} className="mx-auto w-48 rounded-box" />
            <div className="space-y-2">
              <DemoLabel>Volume — dragging the slider never moves the sheet</DemoLabel>
              <Slider value={volume} onValueChange={setVolume} aria-label="Volume" />
            </div>
          </DrawerBody>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button>Done</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer snapPoints={[0.45, 0.92]}>
        <DrawerTrigger asChild>
          <Button variant="secondary">With snap points</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Queue</DrawerTitle>
            <DrawerDescription>Drag up to expand. Scroll the list — a drag never starts mid-scroll.</DrawerDescription>
          </DrawerHeader>
          <DrawerBody>
            <ol className="divide-y divide-border">
              {Array.from({ length: 30 }, (_, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5">
                  <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                  <span className="size-9 rounded-md bg-muted" />
                  <span className="text-sm">Track {i + 1}</span>
                </li>
              ))}
            </ol>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Drawer dismissible={false}>
        <DrawerTrigger asChild>
          <Button variant="outline">Non-dismissible</Button>
        </DrawerTrigger>
        <DrawerContent showHandle={false}>
          <DrawerHeader>
            <DrawerTitle>Finish setup</DrawerTitle>
            <DrawerDescription>This sheet ignores drags, Escape and the scrim.</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button>I'm done</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function GalleryDemo() {
  return (
    <Lightbox items={gallery} download loop>
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
        {gallery.map((item, i) => (
          <LightboxTrigger key={item.alt} index={i}>
            <ImageWithFallback src={item.src} alt="" ratio={4 / 3} className="transition-transform duration-200 hover:scale-[1.02]" />
          </LightboxTrigger>
        ))}
      </div>
    </Lightbox>
  );
}

function ImageStatesDemo() {
  const slowFetcher = React.useCallback(
    (src: string) => new Promise<Blob>((resolve) => setTimeout(() => resolve(new Blob([decodeURIComponent(src.split(",")[1]!)], { type: "image/svg+xml" })), 1500)),
    []
  );
  const [key, setKey] = React.useState(0);
  return (
    <div className="grid grid-cols-1 w-full gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <DemoLabel>Loaded</DemoLabel>
        <ImageWithFallback src={gallery[2]!.src} alt="Forest" width={1200} height={800} className="rounded-box" />
      </div>
      <div className="space-y-2">
        <DemoLabel>Authenticated fetcher (1.5s)</DemoLabel>
        <ImageWithFallback key={key} src={gallery[4]!.src} alt="Golden field" ratio={3 / 2} fetcher={slowFetcher} className="rounded-box" />
        <Button size="xs" variant="ghost" onClick={() => setKey((k) => k + 1)}>
          Reload
        </Button>
      </div>
      <div className="space-y-2">
        <DemoLabel>Error</DemoLabel>
        <ImageWithFallback src="data:image/png;base64,broken" alt="Missing" ratio={3 / 2} className="rounded-box" />
      </div>
    </div>
  );
}

function FileDetails({ file }: { file: ViewerFile }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 p-4 text-sm">
      <dt className="text-muted-foreground">Name</dt>
      <dd className="truncate">{file.name}</dd>
      <dt className="text-muted-foreground">Size</dt>
      <dd>{file.size ? `${(file.size / 1000).toFixed(1)} kB` : "—"}</dd>
      <dt className="text-muted-foreground">Type</dt>
      <dd>{file.mimeType ?? file.name.split(".").pop()}</dd>
    </dl>
  );
}

function FileViewerDemo() {
  const pdfUrl = React.useMemo(() => URL.createObjectURL(new Blob([PDF_SOURCE], { type: "application/pdf" })), []);
  React.useEffect(() => () => URL.revokeObjectURL(pdfUrl), [pdfUrl]);
  const files: Array<ViewerFile & { textContent?: string }> = [
    { name: "harbor.svg", url: gallery[0]!.src, size: 284_000, mimeType: "image/svg+xml" },
    { name: "Quarterly report.pdf", url: pdfUrl, size: PDF_SOURCE.length },
    { name: "RELEASE_NOTES.md", size: markdownSample.length, textContent: markdownSample },
    { name: "document.json", size: jsonSample.length, textContent: jsonSample },
    { name: "backup-2026-10.zip", size: 48_200_000, url: "data:application/zip;base64,UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==" },
  ];
  const viewerFiles: ViewerFile[] = files.map(({ textContent, ...f }) => ({ ...f, text: textContent }));
  const [active, setActive] = React.useState<number | null>(null);
  const current = active === null ? null : files[active]!;
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        {files.map((f, i) => (
          <FilePreviewCard key={f.name} file={f} onClick={() => setActive(i)} />
        ))}
      </div>
      {current && (
        <FileViewer
          files={viewerFiles}
          index={active ?? 0}
          onIndexChange={(i) => setActive(i)}
          thumbnails
          actions={<Button size="xs" variant="ghost">Share</Button>}
          panel={(file) => <FileDetails file={file} />}
          defaultPanelOpen={false}
          open={active !== null}
          onOpenChange={(o) => !o && setActive(null)}
        />
      )}
      <DemoLabel>Inline gallery with a details panel (arrow keys move between files)</DemoLabel>
      <FileViewer inline files={viewerFiles} defaultIndex={0} panel={(file) => <FileDetails file={file} />} className="h-[28rem]" />
    </div>
  );
}

function SplitPaneDemo() {
  const [source, setSource] = React.useState(markdownSample);
  return (
    <SplitPane storageKey="playground:split" defaultSize={50} min={25} max={75} collapseBelow={560} collapseMode="primary" className="h-96 w-full rounded-box border border-border">
      <SplitPanePanel label="Editor" className="flex">
        <textarea
          aria-label="Markdown source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="size-full resize-none bg-subtle p-4 font-mono text-[13px] leading-relaxed text-foreground outline-none"
        />
      </SplitPanePanel>
      <SplitPaneHandle />
      <SplitPanePanel label="Preview" className="p-5">
        <Markdown>{source}</Markdown>
      </SplitPanePanel>
    </SplitPane>
  );
}

const collaborators: PresenceUser[] = [
  { id: "aiko", name: "Aiko Tanaka", status: "active", detail: "Editing · Intro" },
  { id: "ben", name: "Ben Ortiz", status: "active", detail: "Viewing" },
  { id: "chen", name: "Chen Wei", status: "idle", detail: "Idle 4 min" },
  { id: "dana", name: "Dana Fox", status: "active" },
  { id: "eli", name: "Eli Stone", status: "idle" },
  { id: "fern", name: "Fern Lee", status: "active" },
];

function PresenceDemo() {
  const [connection, setConnection] = React.useState<PresenceConnection>("live");
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1400);
    return () => clearInterval(t);
  }, []);
  const typing = [["Aiko"], ["Aiko", "Ben"], ["Aiko", "Ben", "Chen", "Dana"], []][tick % 4]!;
  // px on a wide stage, never past 70% of a narrow one (a cursor outside the clipped stage would just vanish).
  const aiko = { x: `min(${40 + ((tick * 53) % 220)}px, 70%)`, y: 30 + ((tick * 37) % 110) };
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PresenceAvatars users={collaborators} max={4} currentUserId="ben" />
        <div className="flex items-center gap-3">
          <PresenceIndicator status={connection} pending={connection === "live" ? 0 : 3} />
          <SegmentedControl
            size="sm"
            aria-label="Connection"
            value={connection}
            onValueChange={(v) => v && setConnection(v as PresenceConnection)}
            options={[
              { value: "live", label: "Live" },
              { value: "reconnecting", label: "Retry" },
              { value: "offline", label: "Offline" },
            ]}
          />
        </div>
      </div>
      <div className="relative h-52 overflow-hidden rounded-box border border-border bg-dots">
        <RemoteCursor id="aiko" name="Aiko" x={aiko.x} y={aiko.y} />
        <RemoteCursor id="ben" name="Ben" x="min(320px, 78%)" y={120} idleTimeout={2000} />
        <div className="absolute bottom-4 left-4 rounded-md bg-background px-3 py-2 font-mono text-sm shadow-xs">
          The quick brown fox
          <span className="relative inline-block align-middle">
            <RemoteCursor id="chen" name="Chen" variant="caret" x={0} y={-10} idleTimeout={0} />
          </span>{" "}
          jumps over the lazy dog.
        </div>
      </div>
      <TypingIndicator users={typing} />
    </div>
  );
}

export function MobilePage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="Mobile & Viewers"
      description="Phone-first navigation and sheets, media and file viewers, resizable panes and live collaboration cues."
    >
      <Demo id="bottom-tab-bar" title="Bottom tab bar" description="Icon over label, 44px+ targets, badges, safe-area padding and an optional raised primary action. Hidden from md up by default.">
        <PhoneTabBarDemo />
      </Demo>
      <Demo id="adaptive-tabs" title="Adaptive tabs" description="One list of tabs: inline pills on wide screens, a bottom bar on phones.">
        <AdaptiveTabsDemo />
      </Demo>
      <Demo id="drawer" title="Drawer" description="Bottom sheet with drag-to-dismiss (80px or a flick), rubber-band, snap points and a non-dismissible mode. The drag runs on useDrag: no React render per move, touch-action set by the hook.">
        <DrawerDemo />
      </Demo>
      <SwipeRowDemo />
      <Demo id="lightbox" title="Lightbox" description="Arrows, swipe, ←/→ keys, double-click or ctrl+wheel to zoom, drag to pan, thumbnails and a counter." align="start">
        <GalleryDemo />
      </Demo>
      <Demo id="image-with-fallback" title="Image with fallback" description="Reserves its aspect ratio, shimmers while loading, supports authenticated fetchers and fails gracefully." align="start">
        <ImageStatesDemo />
      </Demo>
      <Demo id="file-viewer" title="File viewer" description="Picks a renderer by type: image, PDF, video/audio, text/markdown/JSON, or a download card." align="start">
        <FileViewerDemo />
      </Demo>
      <Demo id="split-pane" title="Split pane" description="Drag or use arrow keys (Home/End, Enter collapses, double-click resets). Persists to localStorage; narrow containers switch to one pane with a toggle." align="start">
        <SplitPaneDemo />
      </Demo>
      <Demo id="presence" title="Presence" description="Collaborator avatars with status, connection chip, remote cursors and a typing indicator." align="start">
        <PresenceDemo />
      </Demo>
      <Demo id="share-dialog" title="Share dialog" description="Per-person roles, invite with a role, general access, link permission, expiry and public comments.">
        <ShareDialog trigger={<Button leadingIcon={<RiShareLine />}>Share</Button>} />
        <ShareDialog
          currentUserId="p3"
          defaultAccess="restricted"
          itemName="Design review"
          trigger={
            <Button variant="secondary" leadingIcon={<RiCompass3Line />}>
              As a commenter
            </Button>
          }
        />
      </Demo>
    </PageIntro>
  );
}

export default MobilePage;
