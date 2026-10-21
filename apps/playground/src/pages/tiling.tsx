import * as React from "react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  FloatingPanes,
  Input,
  JsonViewer,
  LayoutPresetPicker,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Textarea,
  TilingLayout,
  TreeView,
  ZoneEditor,
  addPane,
  closePane,
  listPanes,
  type FloatingPaneState,
  type LayoutNode,
  type SavedLayoutPreset,
  type TreeNode,
} from "@cleanprompt/sutra-ui";
import {
  RiChat3Line,
  RiEyeLine,
  RiFolder3Line,
  RiLayoutGridLine,
  RiLayoutMasonryLine,
  RiPictureInPicture2Line,
  RiRestartLine,
  RiStickyNoteLine,
  RiTerminalBoxLine,
} from "@cleanprompt/sutra-ui/icons";
import { Demo, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Mock panes                                                          */
/* ------------------------------------------------------------------ */

const paneMeta: Record<string, { title: string; icon: React.ReactNode }> = {
  chat: { title: "Chat", icon: <RiChat3Line /> },
  terminal: { title: "Terminal", icon: <RiTerminalBoxLine /> },
  files: { title: "Files", icon: <RiFolder3Line /> },
  preview: { title: "Preview", icon: <RiEyeLine /> },
  notes: { title: "Notes", icon: <RiStickyNoteLine /> },
};
const allPanes = Object.keys(paneMeta);

function ChatPane() {
  const [messages, setMessages] = React.useState([
    { from: "you", text: "Can you tidy up the tiling demo?" },
    { from: "agent", text: "Sure — drag tabs between groups, or right-click a tab to split it." },
  ]);
  const [draft, setDraft] = React.useState("");
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-auto p-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.from === "you"
                ? "ml-auto w-fit max-w-[80%] rounded-box bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                : "w-fit max-w-[80%] rounded-box bg-muted px-3 py-1.5 text-sm"
            }
          >
            {m.text}
          </div>
        ))}
      </div>
      <form
        className="flex gap-2 border-t border-border p-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          setMessages((ms) => [...ms, { from: "you", text: draft.trim() }, { from: "agent", text: "Noted." }]);
          setDraft("");
        }}
      >
        <Input size="sm" aria-label="Message" placeholder="Message…" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Button size="sm" type="submit">
          Send
        </Button>
      </form>
    </div>
  );
}

function TerminalPane() {
  const [ticks, setTicks] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => setTicks((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <pre className="h-full overflow-auto bg-inverse p-3 font-mono text-xs leading-relaxed text-inverse-foreground">
      {`$ pnpm dev\n  VITE ready in 312 ms\n  ➜  Local: http://localhost:5173/\n\n`}
      {`uptime: ${ticks}s  (this counter keeps running while the tab is hidden, moved or popped out)\n`}
      {Array.from({ length: Math.min(ticks, 12) }, (_, i) => `[hmr] update /src/pages/tiling.tsx (${ticks - i})\n`).join("")}
    </pre>
  );
}

const fileTree: TreeNode[] = [
  {
    id: "src",
    label: "src",
    children: [
      { id: "components", label: "components", children: [{ id: "tiling", label: "tiling-layout.tsx" }, { id: "model", label: "tiling-model.ts" }] },
      { id: "index", label: "index.ts" },
    ],
  },
  { id: "test", label: "test", children: [{ id: "tiling-test", label: "tiling.test.tsx" }] },
  { id: "pkg", label: "package.json" },
];

function FilesPane() {
  return (
    <div className="p-2">
      <TreeView nodes={fileTree} defaultExpanded={["src", "components"]} size="sm" aria-label="Files" />
    </div>
  );
}

function PreviewPane() {
  return (
    <div className="flex h-full items-center justify-center bg-dots p-4">
      <div className="w-full max-w-xs rounded-box border border-border bg-card p-4 shadow-lg">
        <div className="mb-3 h-20 rounded-box bg-gradient-to-br from-brand-400 to-brand-700" />
        <p className="text-sm font-medium">Preview</p>
        <p className="text-xs text-muted-foreground">A rendered page would appear here.</p>
      </div>
    </div>
  );
}

function NotesPane() {
  return (
    <div className="h-full p-3">
      <Textarea aria-label="Notes" className="h-full min-h-32 resize-none" defaultValue={"- Try the zone editor\n- Pop the terminal out\n- Type here, then move this tab: the text stays"} />
    </div>
  );
}

function renderMockPane(id: string) {
  switch (id) {
    case "chat":
      return <ChatPane />;
    case "terminal":
      return <TerminalPane />;
    case "files":
      return <FilesPane />;
    case "preview":
      return <PreviewPane />;
    case "notes":
      return <NotesPane />;
    default:
      return <div className="p-4 text-sm text-muted-foreground">Pane {id}</div>;
  }
}

const initialLayout = (): LayoutNode => ({
  type: "split",
  id: "root",
  direction: "row",
  sizes: [0.22, 0.5, 0.28],
  children: [
    { type: "tabs", id: "left", panes: ["files"], active: "files" },
    {
      type: "split",
      id: "center",
      direction: "column",
      sizes: [0.65, 0.35],
      children: [
        { type: "tabs", id: "main", panes: ["chat", "notes"], active: "chat" },
        { type: "tabs", id: "bottom", panes: ["terminal"], active: "terminal" },
      ],
    },
    { type: "tabs", id: "right", panes: ["preview"], active: "preview" },
  ],
});

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function TilingPage() {
  const [layout, setLayout] = React.useState<LayoutNode>(initialLayout);
  const [floating, setFloating] = React.useState<FloatingPaneState[]>([]);
  const [saved, setSaved] = React.useState<SavedLayoutPreset[]>([]);
  const [zonesOpen, setZonesOpen] = React.useState(false);
  const [presetsOpen, setPresetsOpen] = React.useState(false);

  const inTree = listPanes(layout);
  const closed = allPanes.filter((p) => !inTree.includes(p) && !floating.some((f) => f.id === p));
  const panesForPresets = [...inTree, ...closed];

  return (
    <PageIntro
      eyebrow="Layout"
      title="Tiling Layout"
      description="A tiling workspace: nested resizable splits of tab groups. Drag tabs onto another group's edges or center, right-click a tab to split, maximize a group, pop panes out into floating windows, pick presets or draw your own zones. Inactive tabs stay mounted, so terminals and drafts keep their state."
    >
      <Demo
        id="workspace"
        title="IDE workspace"
        description="Try: drag the Terminal tab onto the right edge of Preview; right-click a tab for Split right / Pop out; double-click a divider to equalize; mod+\ splits, ctrl+tab cycles tabs, mod+1…9 focuses a group."
        align="start"
        canvasClassName="p-0 sm:p-0 gap-0"
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-subtle px-3 py-2">
          <Popover open={presetsOpen} onOpenChange={setPresetsOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" leadingIcon={<RiLayoutGridLine />}>
                Presets
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={6} className="w-[26rem]">
              <LayoutPresetPicker
                current={layout}
                panes={panesForPresets}
                savedPresets={saved}
                onSavedPresetsChange={setSaved}
                onSelect={(next) => {
                  setLayout(next);
                  setPresetsOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          <Button size="sm" variant="outline" leadingIcon={<RiLayoutMasonryLine />} onClick={() => setZonesOpen(true)}>
            Edit zones
          </Button>
          <Button
            size="sm"
            variant="outline"
            leadingIcon={<RiPictureInPicture2Line />}
            disabled={!inTree.includes("terminal")}
            onClick={() => {
              setLayout((l) => closePane(l, "terminal"));
              setFloating((f) => [...f, { id: "terminal", x: 80, y: 80, width: 440, height: 240 }]);
            }}
          >
            Pop out terminal
          </Button>
          {closed.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Reopen:</span>
              {closed.map((id) => (
                <Button
                  key={id}
                  size="xs"
                  variant="ghost"
                  onClick={() => setLayout((l) => addPane(l, id))}
                >
                  {paneMeta[id].title}
                </Button>
              ))}
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            leadingIcon={<RiRestartLine />}
            onClick={() => {
              setLayout(initialLayout());
              setFloating([]);
            }}
          >
            Reset
          </Button>
        </div>
        {/* The workspace needs room for three groups: below that width it scrolls sideways instead of squeezing the panes. */}
        <div className="overflow-x-auto">
        <div className="h-[600px] min-w-[40rem]">
          <TilingLayout
            layout={layout}
            onLayoutChange={setLayout}
            renderPane={renderMockPane}
            paneTitle={(id) => paneMeta[id]?.title ?? id}
            paneIcon={(id) => paneMeta[id]?.icon}
            floating={floating}
            onFloatingChange={setFloating}
            shortcuts
          />
        </div>
        </div>
        <Dialog open={zonesOpen} onOpenChange={setZonesOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit zones</DialogTitle>
              <DialogDescription>Draw a custom arrangement; current panes are filled into the zones in order.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <ZoneEditor
                defaultLayout={layout}
                panes={inTree}
                onApply={(next) => {
                  setLayout(next);
                  setZonesOpen(false);
                }}
                onCancel={() => setZonesOpen(false)}
              />
            </DialogBody>
          </DialogContent>
        </Dialog>
      </Demo>

      <Demo id="layout-json" title="Layout JSON" description="The workspace above is a plain serializable tree (serializeLayout / parseLayout). It updates live as you drag, resize and split." align="start">
        <JsonViewer data={layout} defaultExpandDepth={3} maxHeight={360} label="Layout tree" className="w-full" />
      </Demo>

      <Demo id="preset-picker" title="Layout preset picker" description="Thumbnail previews of built-in arrangements, plus saving the current arrangement under a name. Bound to the workspace above." align="start">
        <LayoutPresetPicker
          className="w-full max-w-lg"
          current={layout}
          panes={panesForPresets}
          savedPresets={saved}
          onSavedPresetsChange={setSaved}
          onSelect={setLayout}
        />
      </Demo>

      <Demo id="zone-editor" title="Zone editor" description="FancyZones-style: click a zone to split it vertically, Shift+click to split horizontally, drag dividers, delete zones, then Apply. Output is a layout tree with empty pane slots." align="start">
        <ZoneEditorDemo />
      </Demo>

      <Demo id="floating-panes" title="Floating panes" description="Standalone floating window layer: drag the title bar, resize from the corner (or use arrow keys on either), click to bring to front, dock to send it back." align="start">
        <FloatingDemo />
      </Demo>
    </PageIntro>
  );
}

function ZoneEditorDemo() {
  const [output, setOutput] = React.useState<LayoutNode | null>(null);
  const [key, setKey] = React.useState(0);
  return (
    <div className="grid grid-cols-1 w-full gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <ZoneEditor key={key} onApply={setOutput} onCancel={() => setKey((k) => k + 1)} />
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Applied output</p>
        {output ? (
          <JsonViewer data={output} defaultExpandDepth={2} maxHeight={280} toolbar={false} label="Zone output" />
        ) : (
          <p className="text-sm text-muted-foreground">Press Apply to see the tree.</p>
        )}
      </div>
    </div>
  );
}

function FloatingDemo() {
  const [panes, setPanes] = React.useState<FloatingPaneState[]>([
    { id: "inspector", x: 24, y: 24, width: 260, height: 170 },
    { id: "console", x: 200, y: 110, width: 300, height: 180 },
  ]);
  const [docked, setDocked] = React.useState<string[]>([]);
  return (
    <div className="w-full space-y-2">
      <div className="relative h-[360px] w-full overflow-hidden rounded-box border border-border bg-dots">
        <FloatingPanes
          panes={panes}
          onPanesChange={setPanes}
          paneTitle={(id) => (id === "inspector" ? "Inspector" : "Console")}
          renderPane={(id) =>
            id === "inspector" ? (
              <div className="space-y-1 p-3 text-xs">
                <p className="font-medium">button.primary</p>
                <p className="text-muted-foreground">padding: 8px 14px</p>
                <p className="text-muted-foreground">radius: var(--radius-control)</p>
              </div>
            ) : (
              <pre className="h-full bg-inverse p-2 font-mono text-2xs text-inverse-foreground">{"> layout.serialize()\n'{\"type\":\"split\",…}'"}</pre>
            )
          }
          onDock={(id) => {
            setPanes((ps) => ps.filter((p) => p.id !== id));
            setDocked((d) => [...d, id]);
          }}
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        Docked: {docked.length ? docked.join(", ") : "none"}
        {docked.length > 0 && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              setPanes((ps) => [...ps, ...docked.map((id, i) => ({ id, x: 40 + i * 30, y: 40 + i * 30, width: 260, height: 170 }))]);
              setDocked([]);
            }}
          >
            Float again
          </Button>
        )}
      </div>
    </div>
  );
}

export default TilingPage;
