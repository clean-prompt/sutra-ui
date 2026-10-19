import * as React from "react";
import {
  Button,
  ChatCopyAction,
  ChatMessage,
  ChatMessageAvatar,
  ChatMessageBody,
  ChatMessageContent,
  ChatMessageFooter,
  ChatMessageActions,
  ChatReactions,
  MessageTimestampHover,
  PermissionPrompt,
  PromptInput,
  PromptInputAttachments,
  PromptInputRestoredDraft,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  QueuedMessages,
  type EmojiReactionItem,
  type PermissionToolKind,
  type QueuedMessage,
} from "@sutra/ui";
// New families: import per file until they are added to the root barrel.
import { EmbedConsentProvider, LinkPreviewCard, RichEmbed, SvgEmbed } from "@sutra/ui/kits/ai/embeds";
import { ApprovalStack } from "@sutra/ui/kits/ai/approval-stack";
import {
  ClarifySettled,
  DecodeText,
  FadeText,
  FanMenu,
  GlyphSpinner,
  SplitButton,
  TabDropdown,
  UndeliveredNotice,
  ZoomPan,
  glyphSpinnerFrames,
  type GlyphSpinnerVariant,
} from "@sutra/ui";
import {
  RiChatVoiceLine,
  RiCloseLine,
  RiDraftLine,
  RiFileTextLine,
  RiHeadphoneLine,
  RiMicLine,
  RiSendPlaneLine,
  RiTimeLine,
  RiTranslate2,
  RiVoiceprintLine,
} from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/** Anchor ids of the demos on this page. */
export const chatExtrasAnchors = [
  "embeds",
  "reactions",
  "queued-steer",
  "large-paste",
  "restored-draft",
  "approval-stack",
  "split-button",
  "fan-menu",
  "decode-text",
  "zoom-pan",
  "tab-dropdown",
  "glyph-spinner",
  "fade-text",
  "clarify-settled",
] as const;

export function ChatExtrasPage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="Chat Extras & Primitives"
      description="Privacy-gated embeds, reactions, steering queued messages, large-paste handling, restored drafts, an approval stack and a handful of small primitives."
    >
      <EmbedsDemo />
      <ReactionsDemo />
      <QueuedSteerDemo />
      <LargePasteDemo />
      <RestoredDraftDemo />
      <ApprovalStackDemo />
      <SplitButtonDemo />
      <FanMenuDemo />
      <DecodeTextDemo />
      <ZoomPanDemo />
      <TabDropdownDemo />
      <GlyphSpinnerDemo />
      <FadeTextDemo />
      <ClarifySettledDemo />
    </PageIntro>
  );
}

export default ChatExtrasPage;

/* ------------------------------------------------------------------ */

const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><rect width="120" height="60" rx="8" fill="#eef2ff"/><circle cx="30" cy="30" r="14" fill="#6366f1"/><rect x="54" y="20" width="50" height="8" rx="4" fill="#a5b4fc"/><rect x="54" y="34" width="34" height="8" rx="4" fill="#c7d2fe"/><script>alert('never runs')</script></svg>`;

function EmbedsDemo() {
  const [allowed, setAllowed] = React.useState<string[]>([]);
  return (
    <Demo
      id="embeds"
      title="Embeds"
      description="Third-party embeds stay behind a consent gate: nothing loads until Load is clicked. “Always allow” is remembered by EmbedConsentProvider (persist it yourself). Before consent only a local preview renders."
      align="start"
      canvasClassName="flex-col items-stretch gap-4"
    >
      <EmbedConsentProvider allowed={allowed} onAllowedChange={setAllowed}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Always allowed: {allowed.length ? allowed.join(", ") : "none"}
          {allowed.length > 0 && (
            <Button size="xs" variant="ghost" onClick={() => setAllowed([])}>
              Reset
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RichEmbed url="https://www.youtube.com/watch?v=aqz-KE-bpKQ" title="Big Buck Bunny" />
          <RichEmbed url="https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" title="A track" />
          <RichEmbed url="https://gist.github.com/octocat/6cad326836d38bd3a7ae" title="octocat / hello.js" />
          <RichEmbed url="https://www.figma.com/file/abc123/Design-System" title="Design System" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LinkPreviewCard
            href="https://example.com/blog/local-first"
            title="Local-first software"
            description="You own your data, in spite of the cloud. Previews are provided by the app — Sutra never fetches them."
            image={<div className="size-full bg-gradient-to-br from-brand-200 to-brand-500" />}
          />
          <SvgEmbed svg={sampleSvg} title="A user-supplied SVG" caption="Rendered via an <img> data URL — scripts never run" />
        </div>
      </EmbedConsentProvider>
    </Demo>
  );
}

function ReactionsDemo() {
  const [reactions, setReactions] = React.useState<EmojiReactionItem[]>([
    { emoji: "👍", count: 3, reacted: true },
    { emoji: "🎉", count: 1 },
  ]);
  const now = React.useMemo(() => Date.now(), []);
  return (
    <Demo id="reactions" title="Reactions & timestamps" description="ChatReactions under a message, opt-in reactions on ChatMessageActions, and MessageTimestampHover (hover a message)." align="start" canvasClassName="flex-col items-stretch gap-6">
      <ChatMessage role="assistant" variant="flat">
        <ChatMessageAvatar />
        <ChatMessageBody>
          <div className="flex items-center gap-2 text-sm font-medium">
            Sutra <MessageTimestampHover date={now - 4 * 60_000} />
          </div>
          <ChatMessageContent>The migration finished: 12 tables updated, no data loss.</ChatMessageContent>
          <ChatReactions reactions={reactions} onReactionsChange={setReactions} />
          <ChatMessageFooter>
            <ChatMessageActions>
              <ChatCopyAction text="The migration finished" />
            </ChatMessageActions>
          </ChatMessageFooter>
        </ChatMessageBody>
      </ChatMessage>
      <ChatMessage role="assistant" variant="flat">
        <ChatMessageAvatar />
        <ChatMessageBody>
          <div className="flex items-center gap-2 text-sm font-medium">
            Sutra <MessageTimestampHover date={now - 26 * 3600_000} alwaysVisible />
          </div>
          <ChatMessageContent>Reactions built into the actions row (opt-in via `defaultReactions`).</ChatMessageContent>
          <ChatMessageFooter>
            <ChatMessageActions defaultReactions={[{ emoji: "🔥", count: 2 }]}>
              <ChatCopyAction text="Reactions built in" />
            </ChatMessageActions>
          </ChatMessageFooter>
        </ChatMessageBody>
      </ChatMessage>
    </Demo>
  );
}

function QueuedSteerDemo() {
  const [items, setItems] = React.useState<QueuedMessage[]>([
    { id: "1", text: "Actually use pnpm, not npm" },
    { id: "2", text: "And add a changelog entry when you're done", attachments: 1 },
  ]);
  const [log, setLog] = React.useState<string[]>([]);
  const take = (id: string, how: string) => {
    const item = items.find((i) => i.id === id);
    setItems((xs) => xs.filter((x) => x.id !== id));
    if (item) setLog((l) => [`${how}: ${item.text}`, ...l].slice(0, 4));
  };
  return (
    <Demo id="queued-steer" title="Queued messages with Steer" description="Steer injects the message into the live turn; Send now interrupts. Hover Steer for the difference." align="start" canvasClassName="flex-col items-stretch gap-3">
      <QueuedMessages
        items={items}
        onSteer={(id) => take(id, "Steered")}
        onSendNow={(id) => take(id, "Sent now")}
        onRemove={(id) => setItems((xs) => xs.filter((x) => x.id !== id))}
        onEdit={(id, text) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, text } : x)))}
      />
      {items.length === 0 && (
        <Button size="sm" variant="secondary" className="w-fit" onClick={() => setItems([{ id: String(Date.now()), text: "Also run the linter" }])}>
          Queue another
        </Button>
      )}
      {log.length > 0 && (
        <ul className="text-xs text-muted-foreground">
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
    </Demo>
  );
}

function LargePasteDemo() {
  const [files, setFiles] = React.useState<File[]>([]);
  const copyBig = () => {
    const text = Array.from({ length: 120 }, (_, i) => `Line ${i + 1}: lorem ipsum dolor sit amet, consectetur adipiscing elit.`).join("\n");
    void navigator.clipboard?.writeText(text);
  };
  return (
    <Demo id="large-paste" title="Large paste → attachment" description="With largePasteThreshold={3000}, big pastes become a .txt attachment with an inline “Paste inline” undo." align="start" canvasClassName="flex-col items-stretch gap-3">
      <Button size="sm" variant="secondary" className="h-auto min-h-8 w-fit max-w-full whitespace-normal py-1.5 text-left" leadingIcon={<RiFileTextLine />} onClick={copyBig}>
        Copy ~8,000 characters, then paste below
      </Button>
      <PromptInput
        largePasteThreshold={3000}
        onFilesAdded={(f) => setFiles((xs) => [...xs, ...f])}
        onLargePasteUndo={(_, file) => setFiles((xs) => xs.filter((x) => x !== file))}
      >
        <PromptInputAttachments>
          {files.map((f, i) => (
            <span key={i} className="inline-flex h-7 items-center gap-1.5 rounded-control border border-border bg-subtle pl-2 pr-1 text-xs">
              <RiFileTextLine className="size-3.5" />
              {f.name} · {(f.size / 1024).toFixed(1)} KB
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((xs) => xs.filter((x) => x !== f))} className="inline-flex size-5 items-center justify-center rounded-xs hover:bg-accent">
                <RiCloseLine className="size-3.5" />
              </button>
            </span>
          ))}
        </PromptInputAttachments>
        <PromptInputTextarea placeholder="Paste something long…" />
        <PromptInputToolbar>
          <PromptInputTools />
          <PromptInputSubmit />
        </PromptInputToolbar>
      </PromptInput>
    </Demo>
  );
}

function RestoredDraftDemo() {
  const [key, setKey] = React.useState(0);
  return (
    <Demo id="restored-draft" title="Restored draft" description="PromptInputRestoredDraft inside a composer: Discard clears it, Keep dismisses the notice." align="start" canvasClassName="flex-col items-stretch gap-3">
      <PromptInput key={key} defaultValue="Can you refactor the auth middleware so that">
        <PromptInputRestoredDraft savedAt="2h ago" />
        <PromptInputTextarea />
        <PromptInputToolbar>
          <PromptInputTools />
          <PromptInputSubmit />
        </PromptInputToolbar>
      </PromptInput>
      <Button size="xs" variant="ghost" className="w-fit" leadingIcon={<RiDraftLine />} onClick={() => setKey((k) => k + 1)}>
        Simulate reload
      </Button>
    </Demo>
  );
}

interface Pending {
  id: string;
  tool: PermissionToolKind;
  target: string;
  preview: string;
}

const initialApprovals: Pending[] = [
  { id: "a", tool: "bash", target: "npm test -- --watch=false", preview: "$ npm test -- --watch=false" },
  { id: "b", tool: "edit", target: "src/auth/middleware.ts", preview: "- if (!token) return next()\n+ if (!token) return res.status(401).end()" },
  { id: "c", tool: "fetch", target: "https://registry.npmjs.org/zod", preview: "GET registry.npmjs.org/zod" },
  { id: "d", tool: "read", target: "~/.ssh/config", preview: "Read ~/.ssh/config" },
];

function ApprovalStackDemo() {
  const [items, setItems] = React.useState(initialApprovals);
  const [index, setIndex] = React.useState(0);
  const resolve = (id: string) => setItems((xs) => xs.filter((x) => x.id !== id));
  return (
    <Demo id="approval-stack" title="Approval stack" description="Pending approvals stacked with depth; the top card is live. ←/→ navigate when the stack has focus." align="start" canvasClassName="flex-col items-stretch gap-3">
      <ApprovalStack
        items={items}
        index={index}
        onIndexChange={setIndex}
        getKey={(it) => it.id}
        onApproveAll={() => setItems([])}
        onDenyAll={() => setItems([])}
        empty={
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            All approvals handled.
            <Button size="xs" variant="secondary" onClick={() => setItems(initialApprovals)}>
              Reset
            </Button>
          </div>
        }
        renderItem={(it) => (
          <PermissionPrompt
            tool={it.tool}
            target={it.target}
            preview={<pre className="overflow-x-auto font-mono text-xs">{it.preview}</pre>}
            showHints={false}
            onDecision={() => resolve(it.id)}
          />
        )}
      />
    </Demo>
  );
}

function SplitButtonDemo() {
  const [last, setLast] = React.useState("—");
  return (
    <Demo id="split-button" title="Split button" description="Primary action plus a chevron menu; variants and sizes follow Button.">
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <SplitButton
            leadingIcon={<RiSendPlaneLine />}
            onClick={() => setLast("Send")}
            actions={[
              { id: "schedule", label: "Schedule send", icon: <RiTimeLine />, onSelect: () => setLast("Schedule") },
              { id: "draft", label: "Save as draft", icon: <RiDraftLine />, onSelect: () => setLast("Draft") },
            ]}
          >
            Send
          </SplitButton>
          <SplitButton variant="secondary" size="sm" onClick={() => setLast("Merge")} actions={[{ id: "squash", label: "Squash and merge", onSelect: () => setLast("Squash") }, { id: "rebase", label: "Rebase and merge", onSelect: () => setLast("Rebase") }]}>
            Merge
          </SplitButton>
          <SplitButton variant="destructive" size="xs" onClick={() => setLast("Delete")} actions={[{ id: "archive", label: "Archive instead", onSelect: () => setLast("Archive") }]}>
            Delete
          </SplitButton>
        </div>
        <DemoLabel>Last action: {last}</DemoLabel>
      </div>
    </Demo>
  );
}

function FanMenuDemo() {
  const [mode, setMode] = React.useState("dictate");
  const items = [
    { id: "dictate", label: "Dictate", icon: <RiMicLine /> },
    { id: "talk", label: "Talk", icon: <RiChatVoiceLine /> },
    { id: "translate", label: "Translate", icon: <RiTranslate2 /> },
    { id: "listen", label: "Listen", icon: <RiHeadphoneLine /> },
  ].map((it) => ({ ...it, active: it.id === mode }));
  return (
    <Demo id="fan-menu" title="Fan menu" description="Voice modes fan out from the hub. Arrow keys move between discs, Esc closes. Reduced-motion users get no animation." canvasClassName="min-h-56 flex-col justify-end gap-3 pb-6">
      <FanMenu items={items} icon={<RiVoiceprintLine />} label="Voice mode" onSelect={setMode} />
      <DemoLabel>Mode: {mode}</DemoLabel>
    </Demo>
  );
}

function DecodeTextDemo() {
  const [run, setRun] = React.useState(0);
  return (
    <Demo id="decode-text" title="Decode text" description="Scramble reveal on mount, hover, or manual replay. Screen readers get the final text.">
      <div className="flex flex-col items-center gap-3">
        <DecodeText text="AGENT ONLINE" className="font-mono text-2xl font-semibold tracking-widest" trigger="manual" play={run} />
        <DecodeText text="Hover to decode me" trigger="hover" className="text-sm text-muted-foreground" />
        <Button size="xs" variant="secondary" onClick={() => setRun((r) => r + 1)}>
          Replay
        </Button>
      </div>
    </Demo>
  );
}

function ZoomPanDemo() {
  return (
    <Demo id="zoom-pan" title="Zoom & pan" description="Wheel or pinch to zoom, drag to pan, double-click or 0 to reset, +/− keys when focused." align="start" canvasClassName="items-stretch">
      <ZoomPan label="Architecture diagram" className="h-72 w-full">
        <svg viewBox="0 0 360 200" className="h-56 w-auto" role="img" aria-label="Client, gateway and model boxes connected by arrows">
          <defs>
            <marker id="zp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
            </marker>
          </defs>
          {[
            { x: 10, label: "Client" },
            { x: 135, label: "Gateway" },
            { x: 260, label: "Model" },
          ].map((b) => (
            <g key={b.label}>
              <rect x={b.x} y={70} width={90} height={60} rx={10} className="fill-card stroke-border" strokeWidth={2} />
              <text x={b.x + 45} y={105} textAnchor="middle" className="fill-foreground text-[13px] font-medium">
                {b.label}
              </text>
            </g>
          ))}
          <g className="text-muted-foreground" stroke="currentColor" strokeWidth={2}>
            <line x1={100} y1={100} x2={133} y2={100} markerEnd="url(#zp-arrow)" />
            <line x1={225} y1={100} x2={258} y2={100} markerEnd="url(#zp-arrow)" />
          </g>
        </svg>
      </ZoomPan>
    </Demo>
  );
}

function TabDropdownDemo() {
  const [width, setWidth] = React.useState(100);
  const [value, setValue] = React.useState("overview");
  const items = ["Overview", "Files", "Activity", "Pull requests", "Issues", "Settings", "Billing"].map((l) => ({ value: l.toLowerCase().replace(/\s/g, "-"), label: l }));
  return (
    <Demo id="tab-dropdown" title="Tab dropdown" description="Tabs that don't fit collapse into a More menu (ResizeObserver). Drag the slider to resize." align="start" canvasClassName="flex-col items-stretch gap-3">
      <input type="range" min={30} max={100} value={width} onChange={(e) => setWidth(Number(e.target.value))} aria-label="Container width" className="w-48" />
      <div style={{ width: `${width}%` }} className="rounded-box border border-dashed border-border p-2">
        <TabDropdown items={items} value={value} onValueChange={setValue} label="Repository" />
      </div>
      <DemoLabel>Selected: {value}</DemoLabel>
    </Demo>
  );
}

function GlyphSpinnerDemo() {
  return (
    <Demo id="glyph-spinner" title="Glyph spinner" description="Text-glyph spinners for terminals and agent status lines. Static under reduced motion.">
      <div className="flex flex-wrap items-center gap-6 text-lg">
        {(Object.keys(glyphSpinnerFrames) as GlyphSpinnerVariant[]).map((v) => (
          <span key={v} className="flex flex-col items-center gap-1">
            <GlyphSpinner variant={v} interval={v === "line" ? 120 : 80} className="text-primary" />
            <span className="text-2xs text-muted-foreground">{v}</span>
          </span>
        ))}
        <span className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
          <GlyphSpinner /> Thinking…
        </span>
      </div>
    </Demo>
  );
}

function FadeTextDemo() {
  return (
    <Demo id="fade-text" title="Fade text" description="Truncates with a gradient fade instead of an ellipsis; the fade only shows when the text overflows." align="start" canvasClassName="flex-col items-stretch gap-3">
      <div className="w-64 rounded-box border border-border p-2 text-sm">
        <FadeText>Refactor the authentication middleware to support rotating refresh tokens</FadeText>
      </div>
      <div className="w-64 rounded-box border border-border p-2 text-sm">
        <FadeText>Short title</FadeText>
      </div>
      <div className="w-64 rounded-box border border-border p-2 text-sm">
        <FadeText lines={2} fade="1.25rem">
          Multi-line fade: the last visible line dissolves when the paragraph is longer than two lines, which keeps cards tidy without hard cuts.
        </FadeText>
      </div>
    </Demo>
  );
}

function ClarifySettledDemo() {
  const [retrying, setRetrying] = React.useState(false);
  const [delivered, setDelivered] = React.useState(false);
  return (
    <Demo id="clarify-settled" title="Clarify settled & undelivered" description="Summary of answered clarifying questions, and a notice when an answer couldn't be delivered." align="start" canvasClassName="flex-col items-stretch gap-3">
      <ClarifySettled
        items={[
          { id: "db", question: "Which database should I target?", answer: "Postgres 16" },
          { id: "tests", question: "Should I add integration tests?", answer: "Yes, for the auth flow" },
          { id: "ci", question: "Update the CI config?", answer: "", skipped: true },
        ]}
      />
      {delivered ? (
        <DemoLabel>Delivered ✓</DemoLabel>
      ) : (
        <UndeliveredNotice
          description="The agent session ended before your answer arrived."
          retrying={retrying}
          onRetry={() => {
            setRetrying(true);
            setTimeout(() => {
              setRetrying(false);
              setDelivered(true);
            }, 900);
          }}
        />
      )}
    </Demo>
  );
}
