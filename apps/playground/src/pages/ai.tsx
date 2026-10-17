import * as React from "react";
import {
  Button,
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
  ChatAttachment,
  ChatAttachmentList,
  ChatConversation,
  ChatConversationContent,
  ChatCopyAction,
  ChatEditAction,
  ChatEmptyState,
  ChatFeedbackActions,
  ChatInlineCitation,
  ChatLoader,
  ChatMessage,
  ChatMessageActions,
  ChatMessageAvatar,
  ChatMessageBody,
  ChatMessageContent,
  ChatMessageFooter,
  ChatMessageHeader,
  ChatRegenerateAction,
  ChatScrollButton,
  ChatSource,
  ChatSourceList,
  ChatTool,
  ChatToolApproval,
  Input,
  PromptInput,
  PromptInputAttachButton,
  PromptInputAttachments,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptSuggestion,
  PromptSuggestionGroup,
  type ChatSourceData,
  type ChatToolApprovalStatus,
  type ChatToolState,
  type PromptInputModel,
} from "@sutra/ui";
import {
  RiBookOpenLine,
  RiCodeSSlashLine,
  RiDeleteBinLine,
  RiFlashlightLine,
  RiGlobalLine,
  RiLightbulbLine,
  RiMicLine,
  RiPlaneLine,
  RiSearchLine,
  RiSparklingLine,
  RiTerminalBoxLine,
} from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

export function AiPage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="AI"
      description="Building blocks for conversational interfaces: a stick-to-bottom conversation, messages with markdown, reasoning, tool calls, citations, loaders and a full-featured composer."
    >
      <Demo
        id="chat"
        title="Chat"
        description="A fully working mock assistant. Send a message (or pick a suggestion) to watch it think, call a tool and stream a markdown reply. Attach files with the paperclip, by pasting, or by dropping them on the composer."
        align="start"
        canvasClassName="p-0 sm:p-0"
      >
        <MockChat />
      </Demo>
      <ChainOfThoughtDemo />
      <ChatToolDemo />
      <ChatSourceDemo />
      <ChatLoaderDemo />
      <PromptInputDemo />
      <AttachmentDemo />
      <PromptSuggestionDemo />
    </PageIntro>
  );
}

/* ------------------------------------------------------------------ */
/* Mock chat                                                           */
/* ------------------------------------------------------------------ */

const models: PromptInputModel[] = [
  { id: "sutra-pro", name: "Sutra Pro", description: "Best for complex reasoning and code", icon: <RiSparklingLine />, badge: "New" },
  { id: "sutra-fast", name: "Sutra Fast", description: "Quick answers for everyday tasks", icon: <RiFlashlightLine /> },
  { id: "sutra-research", name: "Sutra Research", description: "Searches the web and cites sources", icon: <RiBookOpenLine /> },
];

const suggestions = [
  { icon: <RiCodeSSlashLine />, text: "Write a React hook that debounces a value" },
  { icon: <RiPlaneLine />, text: "Plan a 3-day trip to Kyoto in autumn" },
  { icon: <RiLightbulbLine />, text: "Explain how vector databases work" },
];

interface CannedReply {
  steps: { label: string; description?: string }[];
  searchResults?: { href: string; title?: string }[];
  tool: { name: string; input: unknown; output: unknown; duration: number };
  sources: ChatSourceData[];
  markdown: string;
}

const replies: Record<"code" | "travel" | "general", CannedReply> = {
  code: {
    steps: [
      { label: "Understanding the request", description: "A hook that delays updates until the value stops changing." },
      { label: "Checking React docs for effect cleanup" },
      { label: "Drafting a typed, reusable implementation" },
    ],
    searchResults: [
      { href: "https://react.dev/reference/react/useEffect", title: "useEffect" },
      { href: "https://developer.mozilla.org/en-US/docs/Web/API/setTimeout", title: "setTimeout" },
    ],
    tool: {
      name: "search_docs",
      input: { query: "useEffect cleanup timers", site: "react.dev" },
      output: { results: 2, top: "Cleaning up an effect — react.dev/reference/react/useEffect" },
      duration: 640,
    },
    sources: [
      { href: "https://react.dev/reference/react/useEffect", title: "useEffect – React", snippet: "useEffect is a React Hook that lets you synchronize a component with an external system." },
      { href: "https://developer.mozilla.org/en-US/docs/Web/API/setTimeout", title: "setTimeout() global function – MDN", snippet: "The global setTimeout() method sets a timer which executes a function once the timer expires." },
    ],
    markdown: `Here's a small, fully typed hook. It stores the latest value and only commits it after \`delay\` ms of quiet:

\`\`\`tsx
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
\`\`\`

### How it works

1. Every change to \`value\` schedules a new timeout.
2. The **cleanup function** cancels the previous timeout, so only the last change wins.
3. Changing \`delay\` restarts the timer with the new duration.

> Tip: pair it with a search input so you only hit your API once the user stops typing.`,
  },
  travel: {
    steps: [
      { label: "Checking peak foliage dates", description: "Autumn colours in Kyoto usually peak mid to late November." },
      { label: "Grouping sights by neighbourhood" },
      { label: "Balancing temples, food and downtime" },
    ],
    searchResults: [
      { href: "https://www.japan-guide.com/e/e3950.html", title: "Kyoto autumn colors" },
      { href: "https://kyoto.travel/en/", title: "Kyoto City Official Travel Guide" },
    ],
    tool: {
      name: "web_search",
      input: { query: "Kyoto autumn leaves 2026 forecast" },
      output: { peak: "Nov 18 – Dec 2", bestSpots: ["Eikando", "Tofukuji", "Arashiyama"] },
      duration: 1240,
    },
    sources: [
      { href: "https://www.japan-guide.com/e/e3950.html", title: "Autumn Colors in Kyoto – japan-guide.com", snippet: "The autumn color season in Kyoto typically peaks in the second half of November." },
      { href: "https://kyoto.travel/en/", title: "Kyoto City Official Travel Guide", snippet: "Seasonal highlights, events and neighbourhood guides from the City of Kyoto." },
      { href: "https://en.wikipedia.org/wiki/Arashiyama", title: "Arashiyama – Wikipedia", snippet: "Arashiyama is a district on the western outskirts of Kyoto, known for its bamboo grove." },
    ],
    markdown: `Late November is ideal: the maples peak and the weather is crisp but mild. Here's a relaxed plan:

### Day 1 · Eastern Kyoto
- **Morning:** Kiyomizu-dera before 8am to beat the crowds
- **Afternoon:** Walk Ninenzaka and Sannenzaka down to Gion
- **Evening:** Eikando's illuminated garden *(book ahead)*

### Day 2 · Arashiyama
- Bamboo grove at sunrise, then Tenryu-ji
- Lunch: yudofu (simmered tofu) near the temple
- Optional: the Sagano scenic railway

### Day 3 · South & Central
| Time | Stop | Why |
| --- | --- | --- |
| 08:00 | Fushimi Inari | Thousands of torii gates |
| 11:30 | Tofukuji | The best maple bridge view |
| 15:00 | Nishiki Market | Street food and souvenirs |

Pack layers, and get an **ICOCA card** for buses and trains.`,
  },
  general: {
    steps: [
      { label: "Breaking the topic into core ideas" },
      { label: "Choosing an approachable analogy" },
      { label: "Adding a concrete example" },
    ],
    tool: {
      name: "knowledge_lookup",
      input: { topic: "vector databases", depth: "intro" },
      output: { concepts: ["embeddings", "similarity search", "ANN indexes"] },
      duration: 420,
    },
    sources: [
      { href: "https://en.wikipedia.org/wiki/Vector_database", title: "Vector database – Wikipedia", snippet: "A vector database stores and queries high-dimensional vectors, typically embeddings." },
      { href: "https://github.com/facebookresearch/faiss", title: "Faiss – similarity search library", snippet: "A library for efficient similarity search and clustering of dense vectors." },
    ],
    markdown: `A **vector database** stores data as lists of numbers (*embeddings*) and finds items that are *close* to each other, rather than items that match exactly.

### The three ideas

1. **Embeddings.** A model turns text, images or audio into a vector, e.g. \`[0.12, -0.48, 0.91, …]\`. Similar meanings land near each other.
2. **Similarity search.** A query is embedded the same way, then compared with cosine similarity or dot product.
3. **ANN indexes.** Comparing against millions of vectors is slow, so indexes like *HNSW* trade a tiny bit of accuracy for huge speed-ups.

### A quick example

Searching a help centre for *"I can't log in"* also surfaces an article titled *"Resetting your password"*, even though they share no keywords.

That's why vector databases power semantic search and retrieval-augmented generation (RAG).`,
  },
};

function pickReply(prompt: string): CannedReply {
  const p = prompt.toLowerCase();
  if (/(react|hook|code|debounce|function|typescript)/.test(p)) return replies.code;
  if (/(trip|travel|kyoto|plan|itinerary)/.test(p)) return replies.travel;
  return replies.general;
}

type Phase = "thinking" | "tool" | "streaming" | "done";

interface PendingFile {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

type Message =
  | { id: string; role: "user"; content: string; files: PendingFile[]; createdAt: Date }
  | {
      id: string;
      role: "assistant";
      prompt: string;
      reply: CannedReply;
      content: string;
      phase: Phase;
      /** The tool call started (stays false if the user stops while thinking). */
      toolStarted: boolean;
      model: string;
      createdAt: Date;
    };

let idCounter = 0;
const nextId = () => `m${++idCounter}`;

function MockChat() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [files, setFiles] = React.useState<PendingFile[]>([]);
  const [model, setModel] = React.useState(models[0].id);
  const [webSearch, setWebSearch] = React.useState(true);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const timeouts = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const interval = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const objectUrls = React.useRef<string[]>([]);

  const clearTimers = React.useCallback(() => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
  }, []);

  React.useEffect(
    () => () => {
      clearTimers();
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [clearTimers]
  );

  const updateAssistant = (id: string, patch: (m: Extract<Message, { role: "assistant" }>) => Partial<Message>) =>
    setMessages((prev) =>
      prev.map((m) => (m.id === id && m.role === "assistant" ? ({ ...m, ...patch(m) } as Message) : m))
    );

  const runReply = (id: string, reply: CannedReply) => {
    clearTimers();
    setActiveId(id);
    const later = (ms: number, fn: () => void) => timeouts.current.push(setTimeout(fn, ms));

    later(800, () => {
      updateAssistant(id, () => ({ phase: "tool", toolStarted: true }));
      later(700, () => {
        updateAssistant(id, () => ({ phase: "streaming" }));
        const tokens = reply.markdown.split(/(\s+)/);
        let i = 0;
        interval.current = setInterval(() => {
          i = Math.min(i + 3, tokens.length);
          const content = tokens.slice(0, i).join("");
          const finished = i >= tokens.length;
          updateAssistant(id, () => ({ content, phase: finished ? "done" : "streaming" }));
          if (finished) {
            clearTimers();
            setActiveId(null);
          }
        }, 40);
      });
    });
  };

  const send = (text: string) => {
    const prompt = text.trim();
    if (!prompt && files.length === 0) return;
    const reply = pickReply(prompt);
    const assistantId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", content: prompt, files, createdAt: new Date() },
      { id: assistantId, role: "assistant", prompt, reply, content: "", phase: "thinking", toolStarted: false, model, createdAt: new Date() },
    ]);
    setInput("");
    setFiles([]);
    runReply(assistantId, reply);
  };

  const stop = () => {
    clearTimers();
    if (activeId) updateAssistant(activeId, () => ({ phase: "done" }));
    setActiveId(null);
  };

  const regenerate = (id: string) => {
    const msg = messages.find((m) => m.id === id);
    if (!msg || msg.role !== "assistant") return;
    updateAssistant(id, () => ({ content: "", phase: "thinking", toolStarted: false, createdAt: new Date() }));
    runReply(id, msg.reply);
  };

  const reset = () => {
    clearTimers();
    setActiveId(null);
    setMessages([]);
    setInput("");
    setFiles([]);
  };

  const addFiles = (added: File[]) => {
    const next = added.map((file) => {
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      if (previewUrl) objectUrls.current.push(previewUrl);
      return { id: nextId(), name: file.name, size: file.size, type: file.type, previewUrl };
    });
    setFiles((prev) => [...prev, ...next]);
  };

  const isBusy = activeId !== null;

  return (
    <div className="flex h-[640px] flex-col bg-card">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <RiSparklingLine className="size-4 text-primary" />
          Sutra Assistant
        </div>
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={<RiDeleteBinLine />}
          onClick={reset}
          disabled={messages.length === 0}
        >
          Clear chat
        </Button>
      </div>

      <ChatConversation>
        <ChatConversationContent className={messages.length === 0 ? "min-h-full justify-center" : undefined}>
          {messages.length === 0 ? (
            <ChatEmptyState
              icon={<RiSparklingLine />}
              title="How can I help today?"
              description="Ask about code, travel plans or tricky concepts. Replies are simulated."
            >
              <PromptSuggestionGroup>
                {suggestions.map((s) => (
                  <PromptSuggestion key={s.text} icon={s.icon} onClick={() => send(s.text)}>
                    {s.text}
                  </PromptSuggestion>
                ))}
              </PromptSuggestionGroup>
            </ChatEmptyState>
          ) : (
            messages.map((m) =>
              m.role === "user" ? (
                <UserMessage
                  key={m.id}
                  message={m}
                  onEdit={() => {
                    setInput(m.content);
                  }}
                />
              ) : (
                <AssistantMessage key={m.id} message={m} onRegenerate={() => regenerate(m.id)} busy={isBusy} />
              )
            )
          )}
        </ChatConversationContent>
        <ChatScrollButton />
      </ChatConversation>

      <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-4 pt-2">
        <PromptInput
          value={input}
          onValueChange={setInput}
          onSubmit={send}
          isLoading={isBusy}
          onStop={stop}
          canSubmit={input.trim().length > 0 || files.length > 0}
          onFilesAdded={addFiles}
        >
          <PromptInputAttachments>
            {files.map((f) => (
              <ChatAttachment
                key={f.id}
                name={f.name}
                fileSize={f.size}
                mimeType={f.type}
                previewUrl={f.previewUrl}
                variant={f.previewUrl ? "image" : "card"}
                onRemove={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
              />
            ))}
          </PromptInputAttachments>
          <PromptInputTextarea placeholder="Message Sutra…" />
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputAttachButton />
              <PromptInputButton pressed={webSearch} onClick={() => setWebSearch((v) => !v)}>
                <RiGlobalLine />
                Search
              </PromptInputButton>
              <PromptInputModelSelect models={models} value={model} onValueChange={setModel} />
            </PromptInputTools>
            <PromptInputSubmit />
          </PromptInputToolbar>
        </PromptInput>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Sutra is a demo and its answers are canned. Press Enter to send, Shift+Enter for a new line.
        </p>
      </div>
    </div>
  );
}

function UserMessage({
  message,
  onEdit,
}: {
  message: Extract<Message, { role: "user" }>;
  onEdit: () => void;
}) {
  return (
    <ChatMessage role="user">
      <ChatMessageBody>
        {message.files.length > 0 && (
          <ChatAttachmentList className="justify-end">
            {message.files.map((f) => (
              <ChatAttachment
                key={f.id}
                name={f.name}
                fileSize={f.size}
                mimeType={f.type}
                previewUrl={f.previewUrl}
                variant={f.previewUrl ? "image" : "chip"}
              />
            ))}
          </ChatAttachmentList>
        )}
        {message.content && <ChatMessageContent>{message.content}</ChatMessageContent>}
        <ChatMessageFooter>
          <ChatMessageActions>
            <ChatCopyAction text={message.content} />
            <ChatEditAction onClick={onEdit} />
          </ChatMessageActions>
        </ChatMessageFooter>
      </ChatMessageBody>
    </ChatMessage>
  );
}

function AssistantMessage({
  message,
  onRegenerate,
  busy,
}: {
  message: Extract<Message, { role: "assistant" }>;
  onRegenerate: () => void;
  busy: boolean;
}) {
  const { reply, phase, content } = message;
  const thinking = phase === "thinking";
  const toolState: ChatToolState = phase === "thinking" ? "pending" : phase === "tool" ? "running" : "completed";
  const modelName = models.find((m) => m.id === message.model)?.name ?? "Sutra";

  return (
    <ChatMessage role="assistant" streaming={phase === "streaming"}>
      <ChatMessageAvatar />
      <ChatMessageBody className="gap-3">
        <ChatMessageHeader name={modelName} timestamp={message.createdAt} />
        <ChainOfThought streaming={thinking}>
          <ChainOfThoughtContent>
            {reply.steps.map((step, i) => (
              <ChainOfThoughtStep
                key={step.label}
                label={step.label}
                description={step.description}
                status={!thinking || i < 1 ? "complete" : i === 1 ? "active" : "pending"}
              >
                {i === 1 && reply.searchResults && <ChainOfThoughtSearchResults results={reply.searchResults} />}
              </ChainOfThoughtStep>
            ))}
          </ChainOfThoughtContent>
        </ChainOfThought>
        {message.toolStarted && (
          <ChatTool
            name={reply.tool.name}
            state={toolState}
            icon={<RiSearchLine />}
            duration={reply.tool.duration}
            input={reply.tool.input}
            output={toolState === "completed" ? reply.tool.output : undefined}
          />
        )}
        {thinking && <ChatLoader variant="dots" />}
        {content && <ChatMessageContent markdown>{content}</ChatMessageContent>}
        {phase === "done" && (
          <>
            {content && <ChatSourceList sources={reply.sources} />}
            <ChatMessageFooter>
              <ChatMessageActions>
                <ChatCopyAction text={content} />
                <ChatFeedbackActions />
                <ChatRegenerateAction onClick={onRegenerate} disabled={busy} />
              </ChatMessageActions>
            </ChatMessageFooter>
          </>
        )}
      </ChatMessageBody>
    </ChatMessage>
  );
}

/* ------------------------------------------------------------------ */
/* Chain of thought                                                    */
/* ------------------------------------------------------------------ */

function ChainOfThoughtDemo() {
  const [streaming, setStreaming] = React.useState(true);
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (!streaming) return;
    const id = setInterval(() => setStep((s) => s + 1), 1400);
    return () => clearInterval(id);
  }, [streaming]);

  React.useEffect(() => {
    if (step >= 3) setStreaming(false);
  }, [step]);

  const restart = () => {
    setStep(0);
    setStreaming(true);
  };

  const steps = [
    { label: "Reading the uploaded quarterly report", description: "Found revenue, churn and headcount tables on pages 3–5." },
    { label: "Searching for industry benchmarks" },
    { label: "Comparing growth against peers" },
  ];

  return (
    <Demo
      id="chain-of-thought"
      title="Chain of thought"
      description="Collapsible reasoning with a live “Thinking…” header that becomes “Thought for Ns” and auto-collapses."
      align="start"
    >
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <DemoLabel>Live (auto-measured)</DemoLabel>
            <Button size="xs" variant="secondary" onClick={restart} disabled={streaming}>
              Replay
            </Button>
          </div>
          <ChainOfThought streaming={streaming}>
            <ChainOfThoughtContent>
              {steps.map((s, i) => (
                <ChainOfThoughtStep
                  key={s.label}
                  label={s.label}
                  description={s.description}
                  status={i < step ? "complete" : i === step ? "active" : "pending"}
                >
                  {i === 1 && step > 1 && (
                    <ChainOfThoughtSearchResults
                      results={[
                        { href: "https://www.gartner.com", title: "Gartner" },
                        { href: "https://www.statista.com", title: "Statista" },
                        { href: "https://en.wikipedia.org" },
                      ]}
                    />
                  )}
                </ChainOfThoughtStep>
              ))}
            </ChainOfThoughtContent>
          </ChainOfThought>
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <DemoLabel>Completed, fixed duration, open</DemoLabel>
            <ChainOfThought duration={14} defaultOpen>
              <ChainOfThoughtContent>
                <ChainOfThoughtStep label="Parsed the SQL schema" />
                <ChainOfThoughtStep
                  label="Spotted a missing index"
                  icon={<RiTerminalBoxLine />}
                  description="orders.customer_id is used in every join but isn't indexed."
                />
                <ChainOfThoughtStep label="Estimated the speed-up" description="Roughly 40× fewer rows scanned." />
              </ChainOfThoughtContent>
            </ChainOfThought>
          </div>
          <div className="space-y-3">
            <DemoLabel>Custom title & icon</DemoLabel>
            <ChainOfThought title="Searched 6 sites" icon={<RiGlobalLine />}>
              <ChainOfThoughtContent>
                <ChainOfThoughtStep label="Searched the web">
                  <ChainOfThoughtSearchResults
                    results={[
                      { href: "https://developer.mozilla.org" },
                      { href: "https://web.dev" },
                      { href: "https://caniuse.com" },
                    ]}
                  />
                </ChainOfThoughtStep>
              </ChainOfThoughtContent>
            </ChainOfThought>
          </div>
        </div>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Chat tool                                                           */
/* ------------------------------------------------------------------ */

function ChatToolDemo() {
  const [approval, setApproval] = React.useState<ChatToolApprovalStatus>("pending");

  return (
    <Demo
      id="chat-tool"
      title="Chat tool"
      description="Tool-call cards with a state badge, duration and collapsible JSON input / output, plus a human-in-the-loop approval prompt."
      align="start"
    >
      <div className="grid gap-3">
        <ChatTool name="get_weather" state="pending" input={{ city: "Lisbon", units: "metric" }} />
        <ChatTool name="web_search" state="running" icon={<RiSearchLine />} input={{ query: "best espresso machines 2026" }} />
        <ChatTool
          name="run_sql"
          state="completed"
          icon={<RiTerminalBoxLine />}
          duration={182}
          defaultOpen
          input={{ query: "SELECT plan, COUNT(*) FROM accounts GROUP BY plan" }}
          output={[
            { plan: "free", count: 8421 },
            { plan: "pro", count: 1290 },
            { plan: "enterprise", count: 64 },
          ]}
        />
        <ChatTool
          name="send_email"
          state="error"
          duration={2400}
          input={{ to: "team@acme.co", subject: "Weekly report" }}
          errorText="SMTP server rejected the message: daily sending limit reached."
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <DemoLabel>Approval</DemoLabel>
          {approval !== "pending" && (
            <Button size="xs" variant="ghost" onClick={() => setApproval("pending")}>
              Reset
            </Button>
          )}
        </div>
        <ChatToolApproval
          name="delete_files"
          status={approval}
          description="The assistant wants to permanently delete 3 files from your Drive."
          input={{ paths: ["/drafts/old-logo.png", "/drafts/notes.txt", "/tmp/export.csv"] }}
          onApprove={() => setApproval("approved")}
          onDeny={() => setApproval("denied")}
        />
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Chat source                                                         */
/* ------------------------------------------------------------------ */

const sampleSources: ChatSourceData[] = [
  { href: "https://www.nature.com/articles/d41586-023-00340-6", title: "What ChatGPT and generative AI mean for science", snippet: "Researchers are excited but apprehensive about the latest advances in AI." },
  { href: "https://arxiv.org/abs/1706.03762", title: "Attention Is All You Need", snippet: "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms." },
  { href: "https://en.wikipedia.org/wiki/Large_language_model", title: "Large language model – Wikipedia", snippet: "A large language model is a language model trained with self-supervised learning on vast amounts of text." },
  { href: "https://openreview.net/forum?id=rygGQyrFvH", title: "The Curious Case of Neural Text Degeneration" },
  { href: "https://github.com/karpathy/nanoGPT", title: "karpathy/nanoGPT", snippet: "The simplest, fastest repository for training/finetuning medium-sized GPTs." },
];

function ChatSourceDemo() {
  return (
    <Demo
      id="chat-source"
      title="Chat source"
      description="Citation chips with hover previews, inline numbered citations and a collapsible source list."
      align="start"
    >
      <div className="space-y-2">
        <DemoLabel>Favicon chips</DemoLabel>
        <div className="flex flex-wrap gap-2">
          {sampleSources.slice(0, 3).map((s) => (
            <ChatSource key={s.href} {...s} />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <DemoLabel>Numbered, custom label, no preview</DemoLabel>
        <div className="flex flex-wrap gap-2">
          {sampleSources.slice(0, 3).map((s, i) => (
            <ChatSource key={s.href} {...s} index={i + 1} />
          ))}
          <ChatSource href="https://github.com/karpathy/nanoGPT" disablePreview>
            nanoGPT repo
          </ChatSource>
        </div>
      </div>
      <div className="space-y-2">
        <DemoLabel>Inline citations</DemoLabel>
        <p className="max-w-2xl text-[15px] leading-7 text-foreground">
          The Transformer replaced recurrence with self-attention
          <ChatInlineCitation index={1} {...sampleSources[1]} />, which made it practical to train language models on
          vast amounts of text
          <ChatInlineCitation index={2} {...sampleSources[2]} />. How a model samples its output matters as much as the
          model itself
          <ChatInlineCitation index={3} />.
        </p>
      </div>
      <div className="max-w-xl space-y-2">
        <DemoLabel>Source list</DemoLabel>
        <ChatSourceList sources={sampleSources} />
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Chat loader                                                         */
/* ------------------------------------------------------------------ */

function ChatLoaderDemo() {
  const variants = ["dots", "shimmer", "pulse", "spinner", "wave"] as const;
  return (
    <Demo id="chat-loader" title="Chat loader" description="Indicators for the reply slot while the assistant works." align="start">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {variants.map((v) => (
          <div key={v} className="flex flex-col gap-3 rounded-box border border-border bg-card p-4">
            <DemoLabel className="capitalize">{v}</DemoLabel>
            <ChatLoader variant={v} size="sm" />
            <ChatLoader variant={v} />
            <ChatLoader variant={v} size="lg" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <DemoLabel>With labels</DemoLabel>
        <div className="flex flex-wrap items-center gap-6">
          <ChatLoader variant="dots" label="Sutra is typing" />
          <ChatLoader variant="shimmer" label="Searching the web…" />
          <ChatLoader variant="spinner" label="Running code" />
          <ChatLoader variant="wave" label="Listening" />
        </div>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Prompt input                                                        */
/* ------------------------------------------------------------------ */

function PromptInputDemo() {
  const [sent, setSent] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [deepThink, setDeepThink] = React.useState(false);

  return (
    <Demo
      id="prompt-input"
      title="Prompt input"
      description="Composable chat composer: auto-growing textarea, toolbar buttons, model picker, attachments and a send / stop button."
      align="start"
    >
      <div className="space-y-2">
        <DemoLabel>Minimal</DemoLabel>
        <PromptInput onSubmit={(value) => setSent(value)}>
          <div className="flex items-end gap-2 pr-2.5 pb-2.5">
            <PromptInputTextarea placeholder="Ask a quick question…" className="pb-1" />
            <PromptInputSubmit />
          </div>
        </PromptInput>
        {sent && (
          <p className="text-xs text-muted-foreground">
            Submitted: <span className="text-foreground">{sent}</span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <DemoLabel>Full toolbar with attachments</DemoLabel>
        <PromptInput defaultValue="Summarise these files into a one-page brief" onFilesAdded={() => {}}>
          <PromptInputAttachments>
            <ChatAttachment name="Q3-board-deck.pdf" fileSize={4_820_000} onRemove={() => {}} />
            <ChatAttachment name="metrics.csv" fileSize={92_400} progress={64} onRemove={() => {}} />
            <ChatAttachment name="whiteboard.png" variant="image" previewUrl={samplePreview} onRemove={() => {}} />
          </PromptInputAttachments>
          <PromptInputTextarea />
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputAttachButton accept="image/*,.pdf,.csv" />
              <PromptInputButton pressed={deepThink} onClick={() => setDeepThink((v) => !v)}>
                <RiLightbulbLine />
                Think
              </PromptInputButton>
              <PromptInputButton label="Voice input">
                <RiMicLine />
              </PromptInputButton>
              <PromptInputModelSelect models={models} defaultValue="sutra-research" />
            </PromptInputTools>
            <PromptInputSubmit />
          </PromptInputToolbar>
        </PromptInput>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <DemoLabel>Loading with stop</DemoLabel>
            {!loading && (
              <Button size="xs" variant="ghost" onClick={() => setLoading(true)}>
                Restart
              </Button>
            )}
          </div>
          <PromptInput isLoading={loading} onStop={() => setLoading(false)}>
            <PromptInputTextarea placeholder={loading ? "Generating a reply…" : "Ask anything…"} />
            <PromptInputToolbar>
              <PromptInputTools>
                <PromptInputButton label="Search the web">
                  <RiGlobalLine />
                </PromptInputButton>
              </PromptInputTools>
              <PromptInputSubmit />
            </PromptInputToolbar>
          </PromptInput>
        </div>
        <div className="space-y-2">
          <DemoLabel>Disabled</DemoLabel>
          <PromptInput disabled>
            <PromptInputTextarea placeholder="You've reached today's message limit" />
            <PromptInputToolbar>
              <PromptInputTools>
                <PromptInputAttachButton />
              </PromptInputTools>
              <PromptInputSubmit />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </Demo>
  );
}

const samplePreview =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#818cf8"/><stop offset="1" stop-color="#f472b6"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="20" cy="22" r="7" fill="#fff" fill-opacity=".8"/><path d="M0 52 22 34l14 12 10-8 18 14v10H0z" fill="#fff" fill-opacity=".6"/></svg>`
  );

function AttachmentDemo() {
  return (
    <Demo
      title="Chat attachment"
      description="File previews in card, chip and image variants, with upload progress and error states."
      align="start"
    >
      <div className="space-y-2">
        <DemoLabel>Card</DemoLabel>
        <ChatAttachmentList>
          <ChatAttachment name="Product-spec.docx" fileSize={248_000} onRemove={() => {}} />
          <ChatAttachment name="analytics.xlsx" fileSize={1_240_000} progress={38} />
          <ChatAttachment name="recording.mp3" error="File exceeds 25 MB" onRemove={() => {}} />
        </ChatAttachmentList>
      </div>
      <div className="space-y-2">
        <DemoLabel>Chip</DemoLabel>
        <ChatAttachmentList>
          <ChatAttachment variant="chip" name="index.tsx" onRemove={() => {}} />
          <ChatAttachment variant="chip" name="release-notes.md" />
          <ChatAttachment variant="chip" name="archive.zip" onRemove={() => {}} />
        </ChatAttachmentList>
      </div>
      <div className="space-y-2">
        <DemoLabel>Image</DemoLabel>
        <ChatAttachmentList>
          <ChatAttachment variant="image" name="moodboard.png" previewUrl={samplePreview} onRemove={() => {}} />
          <ChatAttachment variant="image" name="screenshot.png" previewUrl={samplePreview} progress={72} />
          <ChatAttachment variant="image" name="photo.heic" error />
        </ChatAttachmentList>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Prompt suggestion                                                   */
/* ------------------------------------------------------------------ */

const autocompleteItems = [
  "How do I center a div with flexbox?",
  "How do I deploy a Vite app to Netlify?",
  "How does React Server Components streaming work?",
  "What is the difference between flexbox and grid?",
  "Write a regex for validating email addresses",
];

function PromptSuggestionDemo() {
  const [query, setQuery] = React.useState("how do");
  const [picked, setPicked] = React.useState<string | null>(null);
  const matches = autocompleteItems.filter((item) => item.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Demo
      id="prompt-suggestion"
      title="Prompt suggestion"
      description="Starter prompts as chips or a list, plus an autocomplete mode that highlights the typed text."
      align="start"
    >
      <div className="space-y-2">
        <DemoLabel>Chips</DemoLabel>
        <PromptSuggestionGroup>
          {suggestions.map((s) => (
            <PromptSuggestion key={s.text} icon={s.icon} onClick={() => setPicked(s.text)}>
              {s.text}
            </PromptSuggestion>
          ))}
          <PromptSuggestion disabled>Generate an image</PromptSuggestion>
        </PromptSuggestionGroup>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <DemoLabel>List</DemoLabel>
          <PromptSuggestionGroup variant="list" className="rounded-box border border-border bg-card p-1">
            <PromptSuggestion icon={<RiCodeSSlashLine />} onClick={() => setPicked("Refactor this function")}>
              Refactor this function for readability
            </PromptSuggestion>
            <PromptSuggestion icon={<RiBookOpenLine />} onClick={() => setPicked("Summarise this article")}>
              Summarise this article in five bullets
            </PromptSuggestion>
            <PromptSuggestion icon={<RiPlaneLine />} onClick={() => setPicked("Packing list")}>
              Make a packing list for a rainy weekend
            </PromptSuggestion>
          </PromptSuggestionGroup>
        </div>
        <div className="space-y-2">
          <DemoLabel>Autocomplete</DemoLabel>
          <div className="rounded-box border border-border bg-card p-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              leadingIcon={<RiSearchLine />}
              placeholder="Start typing…"
              aria-label="Search prompts"
            />
            <div className="mt-1.5 flex flex-col">
              {matches.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">No matching prompts.</p>
              ) : (
                matches.map((item) => (
                  <PromptSuggestion
                    key={item}
                    highlight={query}
                    icon={<RiSearchLine />}
                    onClick={() => setPicked(item)}
                  >
                    {item}
                  </PromptSuggestion>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      {picked && (
        <p className="text-xs text-muted-foreground">
          Picked: <span className="text-foreground">{picked}</span>
        </p>
      )}
    </Demo>
  );
}
