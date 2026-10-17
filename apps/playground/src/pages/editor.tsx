import * as React from "react";
import {
  Button,
  Markdown,
  PresenceAvatars,
  SegmentedControl,
  SplitPane,
  SplitPaneHandle,
  SplitPanePanel,
  type PresenceUser,
} from "@sutra/ui";
import {
  CodeEditor,
  CommentsPanel,
  DiffViewer,
  DocumentOutline,
  EditorStatusBar,
  EditorToolbar,
  EditorToolbarButton,
  EditorToolbarMenu,
  EditorToolbarSeparator,
  RichTextEditor,
  SaveStatus,
  SuggestionDiff,
  VersionHistory,
  extractOutline,
  findActiveHeading,
  getOutlineKey,
  type CodeEditorHandle,
  type CommentThreadData,
  type DiffMode,
  type DocumentVersion,
  type SaveState,
} from "@sutra/ui/editor";
import {
  RiBold,
  RiBookOpenLine,
  RiCodeLine,
  RiDoubleQuotesL,
  RiFileList3Line,
  RiFunctions,
  RiImageLine,
  RiItalic,
  RiLink,
  RiListOrdered,
  RiListUnordered,
  RiSeparator,
  RiSparkling2Line,
  RiStrikethrough,
  RiTableLine,
  RiFlowChart,
  RiInformationLine,
  RiPageSeparator,
  RiHashtag,
} from "@sutra/ui/icons";
import { Demo, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Sample content                                                      */
/* ------------------------------------------------------------------ */

const sampleMarkdown = `# Field notes on local-first sync

Local-first apps keep the **primary copy** of your data on your device and sync it in the background.

## Why it matters

- Work keeps going offline
- Every action is instant
- You own the data

> [!NOTE]
> Conflicts are rare in practice, but the UI must explain them when they happen.

## How sync works

Each change is an operation with a logical clock. Peers exchange operations and converge.

\`\`\`ts
// # this is code, not a heading
const merged = merge(local, remote);
\`\`\`

### Conflict resolution

Last-writer-wins is simple; CRDTs keep both intents.

### Presence

Cursors and avatars show who is here.

## Open questions

1. How long should history be kept?
2. Who can restore a version?
`;

const people: PresenceUser[] = [
  { id: "aiko", name: "Aiko Tanaka", status: "active", detail: "Editing · How sync works" },
  { id: "ben", name: "Ben Ortiz", status: "idle" },
];

/* ------------------------------------------------------------------ */
/* Workspace (md2pdf-like)                                             */
/* ------------------------------------------------------------------ */

function useSaveSimulation(text: string, failNext: boolean) {
  const [status, setStatus] = React.useState<SaveState>("saved");
  const [savedAt, setSavedAt] = React.useState(() => Date.now() - 120_000);
  const first = React.useRef(true);
  const fail = React.useRef(failNext);
  fail.current = failNext;

  const save = React.useCallback(() => {
    setStatus("saving");
    setTimeout(() => {
      if (fail.current) setStatus("error");
      else {
        setStatus("saved");
        setSavedAt(Date.now());
      }
    }, 900);
  }, []);

  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus("dirty");
    const t = setTimeout(save, 1200);
    return () => clearTimeout(t);
  }, [text, save]);

  return { status, setStatus, savedAt, save };
}

function WorkspaceDemo() {
  const editor = React.useRef<CodeEditorHandle>(null);
  const preview = React.useRef<HTMLDivElement>(null);
  const [text, setText] = React.useState(sampleMarkdown);
  const [cursor, setCursor] = React.useState({ line: 1, column: 1, selected: 0 });
  const [offline, setOffline] = React.useState(false);
  const [failSaves, setFailSaves] = React.useState(false);
  const { status, setStatus, savedAt, save } = useSaveSimulation(text, failSaves);
  const outline = React.useMemo(() => extractOutline(text), [text]);
  const active = findActiveHeading(outline, cursor.line - 1);

  const block = (md: string) => () => editor.current?.insertBlock(md);
  const wrap = (before: string, after = before) => () => editor.current?.wrapSelection(before, after);
  const prefix = (p: string) => () => {
    const sel = editor.current?.getSelection();
    if (!sel) return;
    editor.current?.insert(`${p}${sel.text}`);
  };

  return (
    <div className="flex h-[640px] w-full flex-col overflow-hidden rounded-box border border-border">
      <EditorToolbar
        aria-label="Markdown tools"
        end={
          <Button size="sm" variant="soft" leadingIcon={<RiSparkling2Line />}>
            Polish
          </Button>
        }
      >
        <EditorToolbarButton label="Bold" shortcut="mod+b" icon={<RiBold />} onClick={wrap("**")} />
        <EditorToolbarButton label="Italic" shortcut="mod+i" icon={<RiItalic />} onClick={wrap("_")} />
        <EditorToolbarButton label="Strikethrough" icon={<RiStrikethrough />} onClick={wrap("~~")} />
        <EditorToolbarButton label="Inline code" icon={<RiCodeLine />} onClick={wrap("`")} />
        <EditorToolbarButton label="Link" shortcut="mod+k" icon={<RiLink />} onClick={() => editor.current?.insert("[](https://)", 11)} />
        <EditorToolbarSeparator />
        <EditorToolbarButton label="Bulleted list" icon={<RiListUnordered />} onClick={prefix("- ")} />
        <EditorToolbarButton label="Numbered list" icon={<RiListOrdered />} onClick={prefix("1. ")} />
        <EditorToolbarButton label="Quote" icon={<RiDoubleQuotesL />} onClick={prefix("> ")} />
        <EditorToolbarSeparator />
        <EditorToolbarButton label="Image" icon={<RiImageLine />} onClick={() => editor.current?.insert("![alt text](image.png)")} />
        <EditorToolbarButton label="Table" icon={<RiTableLine />} onClick={block("| Column | Column |\n|---|---|\n| Cell | Cell |")} />
        <EditorToolbarMenu
          label="Insert"
          items={[
            { label: "Math", icon: <RiFunctions />, description: "Display equation", shortcut: "mod+shift+m", onSelect: block("$$\n\n$$") },
            {
              label: "Mermaid diagram",
              icon: <RiFlowChart />,
              description: "Flowchart, sequence, gantt…",
              onSelect: block("```mermaid\nflowchart LR\n  A[Start] --> B[Next] --> C[Done]\n```"),
            },
            { label: "Callout", icon: <RiInformationLine />, description: "Note, tip or warning box", onSelect: block("> [!NOTE]\n> ") },
            { type: "separator" },
            { label: "Page break", icon: <RiPageSeparator />, onSelect: block("<!-- pagebreak -->") },
            { label: "Table of contents", icon: <RiFileList3Line />, onSelect: block("[[toc]]") },
          ]}
        />
        <EditorToolbarMenu
          label="Cite"
          items={[
            { label: "Insert a citation", icon: <RiBookOpenLine />, shortcut: "[@…]", onSelect: () => editor.current?.insert("[@]", 1) },
            { label: "Add by DOI…", icon: <RiHashtag />, description: "Fetch metadata from doi.org" },
          ]}
          footer="Type @ in the text for your references and labels."
        />
        <EditorToolbarButton label="Divider" icon={<RiSeparator />} onClick={block("---")} />
      </EditorToolbar>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-subtle/50 p-2 md:block">
          <DocumentOutline
            headings={outline}
            activeId={active ? getOutlineKey(active) : undefined}
            onNavigate={(h) => editor.current?.scrollToLine((h.line ?? 0) + 1)}
            filterable
            className="h-full"
          />
        </aside>
        <SplitPane storageKey="playground:editor-split" defaultSize={55} min={30} max={75} className="min-w-0 flex-1">
          <SplitPanePanel label="Markdown" className="flex min-h-0">
            <CodeEditor
              ref={editor}
              value={text}
              onChange={setText}
              placeholder="Start writing markdown…"
              onSave={save}
              onSelectionChange={(s) => setCursor({ line: s.line, column: s.column, selected: s.to - s.from })}
              onScroll={(s) => {
                const el = preview.current;
                if (el) el.scrollTop = s.ratio * (el.scrollHeight - el.clientHeight);
              }}
            />
          </SplitPanePanel>
          <SplitPaneHandle />
          <SplitPanePanel label="Preview" className="min-h-0">
            <div ref={preview} className="h-full overflow-y-auto scrollbar-thin bg-subtle/40 px-6 py-5">
              <Markdown>{text}</Markdown>
            </div>
          </SplitPanePanel>
        </SplitPane>
      </div>

      <EditorStatusBar
        status={
          <SaveStatus
            status={offline ? "dirty" : status}
            savedAt={savedAt}
            labels={offline ? { dirty: "Saved on this device" } : undefined}
            onRetry={() => {
              setFailSaves(false);
              save();
            }}
            onKeepMine={() => save()}
            onLoadTheirs={() => setStatus("saved")}
          />
        }
        presence={<PresenceAvatars users={people} size="xs" max={3} />}
        text={text}
        cursor={{ line: cursor.line, column: cursor.column }}
        selectionLength={cursor.selected}
        mode={offline ? "Offline" : "Live"}
        modeTone={offline ? "offline" : "live"}
      >
        <span className="ml-2 flex items-center gap-1">
          <Button size="xs" variant="ghost" onClick={() => setOffline((o) => !o)}>
            {offline ? "Go online" : "Go offline"}
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setFailSaves((f) => !f)}>
            {failSaves ? "Saves OK" : "Fail saves"}
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setStatus("conflict")}>
            Conflict
          </Button>
        </span>
      </EditorStatusBar>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Smaller demos                                                       */
/* ------------------------------------------------------------------ */

function CodeEditorDemo() {
  const [lineNumbers, setLineNumbers] = React.useState("on");
  const [value, setValue] = React.useState("function greet(name) {\n  return `Hello, ${name}!`;\n}\n");
  return (
    <div className="w-full space-y-2">
      <SegmentedControl
        size="sm"
        aria-label="Line numbers"
        value={lineNumbers}
        onValueChange={(v) => v && setLineNumbers(v)}
        options={[
          { value: "on", label: "Line numbers" },
          { value: "off", label: "No gutter" },
          { value: "ro", label: "Read only" },
        ]}
      />
      <div className="h-48 overflow-hidden rounded-box border border-border">
        <CodeEditor
          language="plain"
          value={value}
          onChange={setValue}
          lineNumbers={lineNumbers !== "off"}
          readOnly={lineNumbers === "ro"}
          label="Code"
        />
      </div>
    </div>
  );
}

function ToolbarOverflowDemo() {
  const [width, setWidth] = React.useState(360);
  const [pressed, setPressed] = React.useState({ bold: true, italic: false });
  return (
    <div className="w-full space-y-3">
      <label className="flex items-center gap-3 text-sm text-muted-foreground">
        Width
        <input type="range" min={160} max={720} value={width} onChange={(e) => setWidth(Number(e.target.value))} aria-label="Toolbar width" />
        <span className="tabular-nums">{width}px</span>
      </label>
      <div style={{ width }} className="overflow-hidden rounded-box border border-border">
        <EditorToolbar aria-label="Overflow demo" className="border-b-0">
          <EditorToolbarButton label="Bold" shortcut="mod+b" icon={<RiBold />} pressed={pressed.bold} onClick={() => setPressed((p) => ({ ...p, bold: !p.bold }))} />
          <EditorToolbarButton label="Italic" shortcut="mod+i" icon={<RiItalic />} pressed={pressed.italic} onClick={() => setPressed((p) => ({ ...p, italic: !p.italic }))} />
          <EditorToolbarButton label="Strikethrough" icon={<RiStrikethrough />} />
          <EditorToolbarSeparator />
          <EditorToolbarButton label="Bulleted list" icon={<RiListUnordered />} />
          <EditorToolbarButton label="Numbered list" icon={<RiListOrdered />} />
          <EditorToolbarButton label="Quote" icon={<RiDoubleQuotesL />} />
          <EditorToolbarSeparator />
          <EditorToolbarButton label="Image" icon={<RiImageLine />} />
          <EditorToolbarButton label="Table" icon={<RiTableLine />} />
          <EditorToolbarMenu
            label="Insert"
            items={[
              { label: "Math", icon: <RiFunctions />, shortcut: "mod+shift+m" },
              { label: "Callout", icon: <RiInformationLine /> },
            ]}
          />
        </EditorToolbar>
      </div>
    </div>
  );
}

function SaveStatusDemo() {
  const now = Date.now();
  return (
    <div className="flex flex-col items-start gap-3">
      <SaveStatus status="saved" savedAt={now - 2 * 60_000} />
      <SaveStatus status="dirty" />
      <SaveStatus status="saving" />
      <SaveStatus status="error" error="Network unreachable" onRetry={() => {}} />
      <SaveStatus status="conflict" onKeepMine={() => {}} onLoadTheirs={() => {}} onResolve={() => {}} />
    </div>
  );
}

function RichTextDemo() {
  const [html, setHtml] = React.useState(
    "<h2>Meeting notes</h2><p>Select some text to see the <strong>bubble toolbar</strong>, or use the toolbar above. Links like <a href=\"https://example.com\">example.com</a> work too.</p><ul><li>Ship the editor</li><li>Write docs</li></ul><blockquote><p>Simple things should be simple.</p></blockquote>"
  );
  return (
    <div className="w-full space-y-3">
      <div className="rounded-box border border-border">
        <RichTextEditor value={html} onChange={(v) => setHtml(v as string)} toolbar="both" className="max-h-96" contentClassName="px-4" />
      </div>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">HTML output</summary>
        <pre className="mt-2 whitespace-pre-wrap break-all rounded-box bg-subtle p-3 font-mono">{html}</pre>
      </details>
    </div>
  );
}

const diffOld = `# Release notes

The sync engine now batches writes every 500 ms.
Conflicts are resolved with last-writer-wins.
Offline edits are queued in IndexedDB.

## Fixes

- Fixed a crash when the clock skewed.
- Improved startup time.
- Reduced memory use on large documents.
- Fixed tooltip flicker.
- Fixed a race in the uploader.
- Polished the settings page.
- Updated translations.
- Removed legacy API.
`;

const diffNew = `# Release notes

The sync engine now batches writes every 250 ms.
Conflicts are merged with CRDTs, so both edits survive.
Offline edits are queued in IndexedDB.

## Fixes

- Fixed a crash when the clock skewed.
- Improved startup time.
- Reduced memory use on large documents.
- Fixed tooltip flicker.
- Fixed a race in the uploader.
- Polished the settings page.
- Updated translations for 12 languages.
`;

function DiffDemo({ initialMode }: { initialMode: DiffMode }) {
  const [mode, setMode] = React.useState<DiffMode>(initialMode);
  return (
    <DiffViewer
      oldValue={diffOld}
      newValue={diffNew}
      mode={mode}
      onModeChange={setMode}
      context={2}
      authors={{ aiko: { name: "Aiko Tanaka" }, ben: { name: "Ben Ortiz" } }}
      changeAuthors={["aiko", "ben", "aiko"]}
      maxHeight={360}
      className="w-full"
    />
  );
}

function SuggestionDemo() {
  const original = "The sync engine batch writes every half second and conflicts is resolved by last writer wins, which loses data sometimes.";
  const proposal = "The sync engine batches writes every 500 ms. Conflicts are resolved with last-writer-wins, which can occasionally lose data.";
  const [result, setResult] = React.useState<string | null>(null);
  const [key, setKey] = React.useState(0);
  return (
    <div className="w-full max-w-2xl space-y-3">
      <SuggestionDiff
        key={key}
        original={original}
        suggestion={proposal}
        meta="Polish · llama-3.1-8b"
        onAccept={setResult}
        onDiscard={() => setResult(original)}
      />
      {result != null && (
        <div className="flex items-start gap-3 rounded-box border border-border bg-subtle p-3 text-sm">
          <p className="flex-1">{result}</p>
          <Button size="xs" variant="ghost" onClick={() => (setResult(null), setKey((k) => k + 1))}>
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}

const aiko = { id: "aiko", name: "Aiko Tanaka" };
const ben = { id: "ben", name: "Ben Ortiz" };
const chen = { id: "chen", name: "Chen Wei" };

function makeVersions(): DocumentVersion[] {
  const h = 3600_000;
  const now = Date.now();
  const v1 = "# Field notes\n\nLocal-first apps keep data on your device.";
  const v2 = v1 + "\n\n## Why it matters\n\n- Work offline\n- Instant actions";
  const v3 = v2.replace("Instant actions", "Every action is instant") + "\n- You own the data";
  const v4 = v3.replace("keep data on your device", "keep the primary copy of your data on your device") + "\n\n## How sync works\n\nPeers exchange operations.";
  const v5 = v4.replace("Peers exchange operations.", "Each change is an operation with a logical clock. Peers exchange operations and converge.");
  return [
    { id: "v5", createdAt: now - 0.2 * h, contributors: [aiko, chen], content: v5, description: "Edited the text" },
    { id: "v4", createdAt: now - 2 * h, contributors: [ben], content: v4, label: "Sent to reviewers", description: "Edited the text" },
    { id: "v3", createdAt: now - 26 * h, contributors: [aiko], content: v3, description: "Edited the text" },
    { id: "v2", createdAt: now - 28 * h, contributors: [aiko, ben], content: v2, description: "Edited the text · Renamed" },
    { id: "v1", createdAt: now - 75 * h, contributors: [aiko], content: v1, label: "First draft", description: "Created the document" },
  ];
}

function VersionHistoryDemo() {
  const [versions, setVersions] = React.useState(makeVersions);
  const [restored, setRestored] = React.useState<string | null>(null);
  return (
    <div className="w-full space-y-2">
      <VersionHistory
        versions={versions}
        onRename={(v, label) => setVersions((all) => all.map((x) => (x.id === v.id ? { ...x, label: label || undefined } : x)))}
        onRestore={(v) => setRestored(new Date(v.createdAt).toLocaleString())}
        renderContent={(v) => <Markdown>{v.content ?? ""}</Markdown>}
        className="h-[520px]"
      />
      {restored && <p className="text-sm text-muted-foreground">Restored the version from {restored}.</p>}
    </div>
  );
}

function initialThreads(): CommentThreadData[] {
  const m = 60_000;
  const now = Date.now();
  return [
    {
      id: "t1",
      quote: "keep the primary copy of your data on your device",
      comments: [
        { id: "c1", author: aiko, body: "Should we say **authoritative** copy instead?", createdAt: now - 42 * m, reactions: [{ emoji: "👀", count: 1 }] },
        { id: "c2", author: ben, body: "Primary reads better for a general audience.", createdAt: now - 30 * m },
      ],
    },
    {
      id: "t2",
      quote: "Last-writer-wins is simple",
      comments: [{ id: "c3", author: { id: "me", name: "You" }, body: "Add a link to the CRDT explainer.", createdAt: now - 5 * m }],
    },
    {
      id: "t3",
      quote: "Cursors and avatars",
      resolved: true,
      resolvedBy: "Chen Wei",
      comments: [{ id: "c4", author: chen, body: "Done — added a screenshot.", createdAt: now - 26 * 60 * m }],
    },
  ];
}

function CommentsDemo() {
  const [threads, setThreads] = React.useState(initialThreads);
  const [selection, setSelection] = React.useState("exchange operations and converge");
  const [active, setActive] = React.useState<string | undefined>();
  const me = { id: "me", name: "You" };
  const update = (id: string, fn: (t: CommentThreadData) => CommentThreadData) => setThreads((all) => all.map((t) => (t.id === id ? fn(t) : t)));
  return (
    <div className="flex w-full flex-col gap-3 md:flex-row">
      <div className="flex-1 space-y-2 text-sm">
        <label className="block text-xs font-medium text-muted-foreground" htmlFor="sel">
          Simulated editor selection
        </label>
        <input
          id="sel"
          value={selection}
          onChange={(e) => setSelection(e.target.value)}
          className="h-9 w-full rounded-control border border-input bg-background px-3 text-sm shadow-xs"
        />
        {active && <p className="text-muted-foreground">Focused anchor of thread {active}.</p>}
      </div>
      <CommentsPanel
        threads={threads}
        currentUserId="me"
        role="editor"
        selection={selection}
        activeThreadId={active}
        onFocusAnchor={(t) => setActive(t.id)}
        onCreateThread={(body, quote) =>
          setThreads((all) => [{ id: `t${Date.now()}`, quote, comments: [{ id: `c${Date.now()}`, author: me, body, createdAt: Date.now() }] }, ...all])
        }
        onReply={(id, body) =>
          update(id, (t) => ({ ...t, comments: [...t.comments, { id: `c${Date.now()}`, author: me, body, createdAt: Date.now() }] }))
        }
        onResolve={(id, resolved) => update(id, (t) => ({ ...t, resolved, resolvedBy: resolved ? "You" : undefined }))}
        onEdit={(id, cid, body) =>
          update(id, (t) => ({ ...t, comments: t.comments.map((c) => (c.id === cid ? { ...c, body, editedAt: Date.now() } : c)) }))
        }
        onDelete={(id, cid) =>
          setThreads((all) =>
            all.map((t) => (t.id === id ? { ...t, comments: t.comments.filter((c) => c.id !== cid) } : t)).filter((t) => t.comments.length > 0)
          )
        }
        onReact={(id, cid, emoji) =>
          update(id, (t) => ({
            ...t,
            comments: t.comments.map((c) => {
              if (c.id !== cid) return c;
              const list = c.reactions ?? [];
              const found = list.find((r) => r.emoji === emoji);
              const reactions = found
                ? list.map((r) => (r.emoji === emoji ? { ...r, count: r.count + (r.reacted ? -1 : 1), reacted: !r.reacted } : r))
                : [...list, { emoji, count: 1, reacted: true }];
              return { ...c, reactions };
            }),
          }))
        }
        className="h-[520px] w-full overflow-hidden rounded-box border border-border md:w-96"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function EditorPage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="Editor"
      description="Writing surfaces: CodeMirror markdown and TipTap rich text, toolbars, outline, autosave status, diffs, AI suggestions, version history and comments."
    >
      <Demo
        id="editor-workspace"
        title="Markdown workspace"
        description="EditorToolbar over a CodeEditor, live preview in a SplitPane (scroll-synced), DocumentOutline that follows the cursor, and an EditorStatusBar with simulated autosave."
        align="start"
        canvasClassName="p-0 sm:p-0"
      >
        <WorkspaceDemo />
      </Demo>
      <Demo id="code-editor" title="CodeEditor" description="CodeMirror 6 themed from Sutra tokens; options reconfigure without remounting." align="start">
        <CodeEditorDemo />
      </Demo>
      <Demo id="rich-text-editor" title="RichTextEditor" description="TipTap 3 with a fixed RichTextToolbar and a bubble toolbar on selection (⌘K for links)." align="start">
        <RichTextDemo />
      </Demo>
      <Demo id="editor-toolbar" title="EditorToolbar overflow" description="Roving tabindex; tools that don't fit collapse into a More menu." align="start">
        <ToolbarOverflowDemo />
      </Demo>
      <Demo id="save-status" title="SaveStatus" description="Saved (relative time), unsaved, saving, error with retry and conflict with actions.">
        <SaveStatusDemo />
      </Demo>
      <Demo id="diff-inline" title="DiffViewer, inline" description="Track-changes view with word-level detail, author colors, collapsed context. Focus it and press n / p." align="start">
        <DiffDemo initialMode="inline" />
      </Demo>
      <Demo id="diff-split" title="DiffViewer, split" description="Side-by-side with line numbers in one synchronized scroller." align="start">
        <DiffDemo initialMode="split" />
      </Demo>
      <Demo id="suggestion-diff" title="SuggestionDiff" description="Review an AI proposal: accept or reject each change, then apply." align="start">
        <SuggestionDemo />
      </Demo>
      <Demo id="version-history" title="VersionHistory" description="Grouped by day, named versions, Shift-click to compare a range, restore with confirmation." align="start">
        <VersionHistoryDemo />
      </Demo>
      <Demo id="comments-panel" title="CommentsPanel" description="Threads anchored to quotes, filters, reactions, replies and comment-on-selection." align="start">
        <CommentsDemo />
      </Demo>
    </PageIntro>
  );
}

export default EditorPage;
