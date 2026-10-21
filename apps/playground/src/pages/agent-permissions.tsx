import * as React from "react";
import {
  Button,
  CheckpointMarker,
  DiffViewer,
  EffortSlider,
  PermissionModeSwitcher,
  PermissionPendingHint,
  PermissionPrompt,
  PlanReviewCard,
  QuestionCard,
  RewindButton,
  RewindDialog,
  type PermissionDecision,
  type QuestionAnswers,
  type QuestionItem,
  type RewindFileChange,
} from "@cleanprompt/sutra-ui";
import { RiArrowUpLine, RiAttachment2, RiRefreshLine } from "@cleanprompt/sutra-ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/** Anchor ids of the demos on this page. */
export const agentPermissionsAnchors = [
  "edit-permission",
  "bash-permission",
  "fetch-permission",
  "folded-permission",
  "pending-hint",
  "mode-switcher",
  "plan-review",
  "rewind",
  "multi-question",
] as const;

export function AgentPermissionsPage() {
  return (
    <PageIntro
      eyebrow="Agent"
      title="Agent: Permissions & Plans"
      description="Human-in-the-loop pieces for coding agents: numbered permission prompts with rule scopes, permission modes and effort, plan review with inline comments, rewind to checkpoints and multi-question clarifications."
    >
      <EditPermissionDemo />
      <BashPermissionDemo />
      <FetchPermissionDemo />
      <FoldedPermissionDemo />
      <PendingHintDemo />
      <ModeSwitcherDemo />
      <PlanReviewDemo />
      <RewindDemo />
      <MultiQuestionDemo />
    </PageIntro>
  );
}

export default AgentPermissionsPage;

/* ------------------------------------------------------------------ */

function DecisionLog({ decision, onReset }: { decision: PermissionDecision | null; onReset: () => void }) {
  if (!decision) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <code className="rounded-xs bg-muted px-1.5 py-0.5 font-mono">onDecision({JSON.stringify(decision)})</code>
      <Button size="xs" variant="ghost" leadingIcon={<RiRefreshLine />} onClick={onReset}>
        Reset
      </Button>
    </div>
  );
}

function useDecision() {
  const [decision, setDecision] = React.useState<PermissionDecision | null>(null);
  const [key, setKey] = React.useState(0);
  return {
    decision,
    key,
    onDecision: setDecision,
    reset: () => {
      setDecision(null);
      setKey((k) => k + 1);
    },
  };
}

const oldApp = `import { Router } from "./router";

export function App() {
  return <Router />;
}
`;

const newApp = `import { Router } from "./router";
import { ThemeProvider } from "./theme";

export function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <Router />
    </ThemeProvider>
  );
}
`;

function EditPermissionDemo() {
  const d = useDecision();
  return (
    <Demo
      id="edit-permission"
      title="Edit permission"
      description="Click an option or focus the card and press 1–3, or ↑ ↓ then Enter. Option 2 saves a rule; pick where it is stored from the destination link."
      align="start"
    >
      <PermissionPrompt
        key={d.key}
        tool="edit"
        target="src/app.tsx"
        onDecision={d.onDecision}
        onCancel={() => d.onDecision({ choice: "cancel" })}
        preview={<DiffViewer oldValue={oldApp} newValue={newApp} showHeader={false} lineNumbers maxHeight={220} />}
        className="max-w-2xl"
      />
      <DecisionLog decision={d.decision} onReset={d.reset} />
    </Demo>
  );
}

function BashPermissionDemo() {
  const d = useDecision();
  return (
    <Demo id="bash-permission" title="Command permission" description="Choose 3 to deny with instructions; Enter sends, Esc goes back." align="start">
      <PermissionPrompt
        key={d.key}
        tool="bash"
        ruleLabel={<code className="font-mono text-[0.92em]">pnpm test:*</code>}
        onDecision={d.onDecision}
        onCancel={() => d.onDecision({ choice: "cancel" })}
        preview={
          <div className="flex flex-col gap-1.5">
            <pre className="overflow-x-auto rounded-md border border-border bg-subtle px-3 py-2 font-mono text-xs leading-5">
              <span className="select-none text-muted-foreground">$ </span>pnpm test --filter @cleanprompt/sutra-ui -- --run
            </pre>
            <p className="text-xs text-muted-foreground">Run the UI package test suite once</p>
          </div>
        }
        className="max-w-2xl"
      />
      <DecisionLog decision={d.decision} onReset={d.reset} />
    </Demo>
  );
}

function FetchPermissionDemo() {
  const d = useDecision();
  return (
    <Demo id="fetch-permission" title="Web fetch permission" description="Custom scopes and a recorded decision." align="start">
      <PermissionPrompt
        key={d.key}
        tool="fetch"
        target="https://react.dev/reference/react/useActionState"
        ruleLabel={<code className="font-mono text-[0.92em]">react.dev</code>}
        scopes={[
          { value: "session", label: "this session" },
          { value: "projectLocal", label: "this project", description: "Stored in local settings" },
        ]}
        onDecision={d.onDecision}
        className="max-w-2xl"
      />
      <DecisionLog decision={d.decision} onReset={d.reset} />
      <DemoLabel>Already decided</DemoLabel>
      <PermissionPrompt
        tool="fetch"
        target="https://registry.npmjs.org/radix-ui"
        decision={{ choice: "always", scope: "projectLocal" }}
        className="max-w-2xl"
      />
    </Demo>
  );
}

function FoldedPermissionDemo() {
  return (
    <Demo id="folded-permission" title="Folded prompt" description="Collapsed to a one-line title bar; expand to choose." align="start">
      <PermissionPrompt
        tool="bash"
        target="git push --force-with-lease origin feature/theme"
        defaultFolded
        onDecision={() => {}}
        className="max-w-2xl"
      />
    </Demo>
  );
}

function PendingHintDemo() {
  const ref = React.useRef<HTMLDivElement>(null);
  return (
    <Demo
      id="pending-hint"
      title="Pending permission hint"
      description="Shown near the composer when the prompt has scrolled away; click to bring it back."
      align="start"
    >
      <div className="scrollbar-thin h-64 overflow-y-auto rounded-box border border-border bg-card p-4">
        <div className="space-y-3 text-sm text-muted-foreground">
          {Array.from({ length: 6 }, (_, i) => (
            <p key={i}>
              Transcript line {i + 1}: the agent read <code>src/components/button.tsx</code> and summarized the variants.
            </p>
          ))}
        </div>
        <PermissionPrompt ref={ref} tool="bash" target="rm -rf node_modules/.cache" onDecision={() => {}} className="mt-4" />
        <div className="h-40" />
      </div>
      <div className="flex justify-center">
        <PermissionPendingHint target={ref} />
      </div>
    </Demo>
  );
}

function ModeSwitcherDemo() {
  const [mode, setMode] = React.useState("manual");
  const [effort, setEffort] = React.useState("medium");
  const composerRef = React.useRef<HTMLDivElement>(null);
  return (
    <Demo
      id="mode-switcher"
      title="Permission mode & effort"
      description="Shift+Tab cycles modes while focus is in the composer (even in the text field). Bypass asks for confirmation. Drag or use ← → on the effort bars."
      align="start"
    >
      <div ref={composerRef} className="mx-auto w-full max-w-2xl rounded-box border border-border bg-card shadow-xs">
        <textarea
          aria-label="Message the agent"
          rows={2}
          placeholder="Ask the agent to change something…"
          className="block w-full resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-2.5 py-2">
          <Button size="icon-sm" variant="ghost" aria-label="Attach file">
            <RiAttachment2 />
          </Button>
          <PermissionModeSwitcher
            value={mode}
            onValueChange={setMode}
            cycleWhen={() => !!composerRef.current?.contains(document.activeElement)}
          />
          <EffortSlider density="compact" value={effort} onValueChange={setEffort} />
          <Button size="icon-sm" className="ml-auto" aria-label="Send">
            <RiArrowUpLine />
          </Button>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        mode=<code>{mode}</code> effort=<code>{effort}</code>
      </p>
      <DemoLabel>Full effort slider</DemoLabel>
      <EffortSlider value={effort} onValueChange={setEffort} />
    </Demo>
  );
}

const planMarkdown = `## Add dark mode to settings

**Goal:** let users pick Light, Dark or System from the settings page.

1. Add a \`ThemeProvider\` in \`src/theme.tsx\` that reads the saved preference and the OS media query.
2. Wrap \`<Router />\` in \`src/app.tsx\` with the provider.
3. Add an *Appearance* section to \`src/pages/settings.tsx\` with a segmented control.
4. Persist the choice to \`localStorage\` under \`app.theme\`.
5. Add tests for the provider and the settings control.

### Out of scope
- Per-page theme overrides
- High-contrast mode`;

function PlanReviewDemo() {
  const [key, setKey] = React.useState(0);
  const [log, setLog] = React.useState<string | null>(null);
  return (
    <Demo
      id="plan-review"
      title="Plan review"
      description="Select text in the plan to comment on it, then approve (choose the next mode) or keep planning to send your comments back."
      align="start"
    >
      <PlanReviewCard
        key={key}
        plan={planMarkdown}
        title="Plan: dark mode"
        className="max-w-2xl"
        defaultComments={[{ id: "seed", quote: "Persist the choice to localStorage under app.theme", body: "Use the existing useLocalStorage hook." }]}
        onApprove={(a) => setLog(`onApprove(${JSON.stringify({ mode: a.mode, comments: a.comments.length })})`)}
        onFeedback={(c, m) => setLog(`onFeedback(${c.length} comments, ${JSON.stringify(m)})`)}
      />
      {log && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <code className="rounded-xs bg-muted px-1.5 py-0.5 font-mono">{log}</code>
          <Button
            size="xs"
            variant="ghost"
            leadingIcon={<RiRefreshLine />}
            onClick={() => {
              setLog(null);
              setKey((k) => k + 1);
            }}
          >
            Reset
          </Button>
        </div>
      )}
    </Demo>
  );
}

const changedFiles: RewindFileChange[] = [
  { path: "src/theme.tsx", additions: 48, deletions: 0, status: "created" },
  { path: "src/app.tsx", additions: 5, deletions: 1 },
  { path: "src/pages/settings.tsx", additions: 31, deletions: 4 },
];

function RewindDemo() {
  const [open, setOpen] = React.useState(false);
  const [log, setLog] = React.useState<string | null>(null);
  return (
    <Demo id="rewind" title="Rewind & checkpoints" description="Checkpoint dividers in the transcript and a rewind dialog choosing what to restore." align="start">
      <div className="mx-auto w-full max-w-2xl space-y-3 rounded-box border border-border bg-card p-4">
        <div className="group flex items-start gap-2">
          <div className="ml-auto max-w-[80%] rounded-box bg-primary-soft px-3 py-2 text-sm text-primary-soft-foreground">
            Add dark mode to the settings page
          </div>
          <RewindButton
            message="Add dark mode to the settings page"
            timestamp={Date.now() - 1000 * 60 * 18}
            files={changedFiles}
            onRewind={(r) => setLog(`onRewind(${JSON.stringify(r)})`)}
          />
        </div>
        <p className="text-sm text-muted-foreground">Created ThemeProvider, wired it into the app and added an Appearance section.</p>
        <CheckpointMarker files={changedFiles} timestamp={Date.now() - 1000 * 60 * 12} onRewind={() => setOpen(true)} />
        <div className="ml-auto max-w-[80%] rounded-box bg-primary-soft px-3 py-2 text-sm text-primary-soft-foreground">Also add tests</div>
        <p className="text-sm text-muted-foreground">Added provider and settings tests.</p>
        <CheckpointMarker files={2} dialog={{ message: "Also add tests", onRewind: (r) => setLog(`onRewind(${JSON.stringify(r)})`) }} />
      </div>
      <RewindDialog
        open={open}
        onOpenChange={setOpen}
        message="Add dark mode to the settings page"
        timestamp={Date.now() - 1000 * 60 * 12}
        files={changedFiles}
        onRewind={(r) => setLog(`onRewind(${JSON.stringify(r)})`)}
      />
      {log && <code className="mx-auto rounded-xs bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{log}</code>}
    </Demo>
  );
}

const agentQuestions: QuestionItem[] = [
  {
    id: "storage",
    header: "Storage",
    question: "Where should the theme preference be stored?",
    options: [
      { value: "local", label: "localStorage", description: "Per browser, no backend changes" },
      { value: "profile", label: "User profile", description: "Synced across devices via the API" },
      { value: "cookie", label: "Cookie", description: "Readable during server rendering" },
    ],
  },
  {
    id: "themes",
    header: "Themes",
    question: "Which themes should be offered?",
    multiSelect: true,
    options: [
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" },
      { value: "system", label: "System" },
    ],
  },
  {
    id: "tests",
    header: "Tests",
    question: "How should this be tested?",
    allowOther: true,
    options: [
      { value: "unit", label: "Unit tests only" },
      { value: "e2e", label: "Unit + one end-to-end test" },
    ],
  },
];

function MultiQuestionDemo() {
  const [key, setKey] = React.useState(0);
  const [answers, setAnswers] = React.useState<QuestionAnswers | null>(null);
  return (
    <Demo
      id="multi-question"
      title="Multi-question clarification"
      description="Tabs show answered state; press 1–9 to pick, Enter to continue, then review and submit all at once."
      align="start"
    >
      <QuestionCard key={key} questions={agentQuestions} onSubmitAll={setAnswers} className="max-w-2xl" />
      {answers && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <code className="max-w-xl truncate rounded-xs bg-muted px-1.5 py-0.5 font-mono">onSubmitAll({JSON.stringify(answers)})</code>
          <Button
            size="xs"
            variant="ghost"
            leadingIcon={<RiRefreshLine />}
            onClick={() => {
              setAnswers(null);
              setKey((k) => k + 1);
            }}
          >
            Reset
          </Button>
        </div>
      )}
    </Demo>
  );
}
