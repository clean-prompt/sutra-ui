import * as React from "react";
import {
  AgentStatusLine,
  BashToolBody,
  Button,
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  DiffCard,
  DiffStat,
  EditToolBody,
  ExpandableContent,
  Kbd,
  ReadToolBody,
  SearchToolBody,
  SegmentedControl,
  ThinkingExpandAllProvider,
  ThinkingToggle,
  ToolGroup,
  ToolKeyValueBody,
  ToolTimeline,
  ToolTimelineItem,
  ToolTimelineText,
  WebToolBody,
  type AgentStatusState,
} from "@sutra/ui";
import { RiRefreshLine } from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

export function AgentTimelinePage() {
  return (
    <PageIntro
      eyebrow="Agent"
      title="Agent: Timeline & Diffs"
      description="Building blocks for agentic coding transcripts: a status rail of tool calls, folded exploration groups, per-tool bodies for shell, edits, reads, searches and web fetches, compact diff cards and a live status line."
    >
      <AgentTurnDemo />
      <TimelineDemo />
      <ToolGroupDemo />
      <BashDemo />
      <DiffCardDemo />
      <DiffStatDemo />
      <BodiesDemo />
      <ExpandableDemo />
      <StatusLineDemo />
      <ThinkingDemo />
    </PageIntro>
  );
}

export default AgentTimelinePage;

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const counterBefore = `import * as React from "react";

export function useCounter(initial = 0, max = 10) {
  const [count, setCount] = React.useState(initial);
  const increment = () => setCount((c) => (c < max - 1 ? c + 1 : c));
  const decrement = () => setCount((c) => Math.max(0, c - 1));
  const reset = () => setCount(initial);
  return { count, increment, decrement, reset };
}
`;

const counterAfter = `import * as React from "react";

export function useCounter(initial = 0, max = 10) {
  const [count, setCount] = React.useState(initial);
  const increment = () => setCount((c) => Math.min(max, c + 1));
  const decrement = () => setCount((c) => Math.max(0, c - 1));
  const reset = React.useCallback(() => setCount(initial), [initial]);
  return { count, increment, decrement, reset };
}
`;

const longBefore = Array.from({ length: 40 }, (_, i) => `export const token${i + 1} = "value-${i + 1}";`).join("\n") + "\n";
const longAfter = longBefore
  .replace(`token3 = "value-3"`, `token3 = "value-three"`)
  .replace(`export const token20 = "value-20";\n`, "")
  .replace(`token36 = "value-36";`, `token36 = "value-36";\nexport const token36b = "value-36b";`);

const testLines = [
  "\x1b[2m> sutra@0.1.0 test\x1b[0m",
  "\x1b[2m> vitest run\x1b[0m",
  "",
  " \x1b[32m✓\x1b[0m test/counter.test.ts \x1b[2m(6 tests)\x1b[0m 12ms",
  " \x1b[32m✓\x1b[0m test/format.test.ts \x1b[2m(14 tests)\x1b[0m 9ms",
  " \x1b[32m✓\x1b[0m test/timeline.test.tsx \x1b[2m(22 tests)\x1b[0m 180ms",
  "",
  " \x1b[1mTest Files\x1b[0m  \x1b[32m3 passed\x1b[0m (3)",
  " \x1b[1m     Tests\x1b[0m  \x1b[32m42 passed\x1b[0m (42)",
];

const lintStdout = "\x1b[2m> eslint src --max-warnings 0\x1b[0m\n\n\x1b[4msrc/hooks/use-counter.ts\x1b[0m\n  7:9  \x1b[33mwarning\x1b[0m  'reset' is assigned but only used in a return  \x1b[2mno-unused-vars\x1b[0m";
const lintStderr = "ESLint found too many warnings (maximum: 0).\n ELIFECYCLE  Command failed with exit code 1.";

const longLog = Array.from({ length: 40 }, (_, i) =>
  i % 9 === 4
    ? `\x1b[33mwarn\x1b[0m  chunk ${i} is larger than 500 kB`
    : `\x1b[36minfo\x1b[0m  transformed module ${i + 1}/40 \x1b[2m(${(i * 7) % 97}ms)\x1b[0m`
).join("\n");

/* ------------------------------------------------------------------ */
/* Simulated agent turn                                                */
/* ------------------------------------------------------------------ */

const LAST_STEP = 27;

function itemStatus(step: number, at: number) {
  return step === at ? "running" : "succeeded";
}

function AgentTurnDemo() {
  const [step, setStep] = React.useState(0);
  const [running, setRunning] = React.useState(true);

  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setStep((s) => Math.min(LAST_STEP, s + 1));
    }, 650);
    return () => clearInterval(id);
  }, [running]);

  React.useEffect(() => {
    if (step >= LAST_STEP) setRunning(false);
  }, [step]);

  const replay = () => {
    setStep(0);
    setRunning(true);
  };

  const testShown = Math.max(0, Math.min(testLines.length, (step - 9) * 2));
  const thinking = step >= 19 && step < 25;
  const tokens = Math.max(0, Math.min(6, step - 18)) * 412;

  let status: AgentStatusState = "idle";
  let tool: string | undefined;
  if (step < LAST_STEP) {
    status = "thinking";
    if (step >= 2 && step <= 5) [status, tool] = ["running", step === 5 ? "Grep" : "Read"];
    else if (step === 7) [status, tool] = ["running", "Edit"];
    else if (step >= 9 && step <= 15) [status, tool] = ["running", "Bash"];
    else if (step === 17) [status, tool] = ["running", "Bash"];
  }

  return (
    <Demo
      id="agent-turn"
      title="Simulated agent turn"
      description="A whole turn streaming in: narration, a folded exploration group that auto-collapses, an edit with a diff card, a passing test run with live output, a failing lint with stderr and a thinking panel with a token counter."
      align="start"
    >
      <ThinkingExpandAllProvider>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DemoLabel>Fix the counter overflow bug</DemoLabel>
          <div className="flex flex-wrap items-center gap-1">
            <ThinkingToggle />
            <Button size="xs" variant="secondary" leadingIcon={<RiRefreshLine />} onClick={replay} disabled={running}>
              Replay
            </Button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-2xl">
          <ToolTimeline>
            {step >= 1 && (
              <ToolTimelineText>
                I'll start by finding where the counter hook lives and how it's tested.
              </ToolTimelineText>
            )}
            {step >= 2 && (
              <ToolGroup>
                <ToolTimelineItem name="Read" arg="src/hooks/use-counter.ts" status={itemStatus(step, 2)}>
                  <ReadToolBody path="src/hooks/use-counter.ts" startLine={1} endLine={9} totalLines={9} snippet={counterBefore} language="ts" />
                </ToolTimelineItem>
                {step >= 3 && <ToolTimelineItem name="Read" arg="src/components/counter.tsx" status={itemStatus(step, 3)} />}
                {step >= 4 && <ToolTimelineItem name="Read" arg="test/counter.test.ts" status={itemStatus(step, 4)} />}
                {step >= 5 && (
                  <ToolTimelineItem name="Grep" arg="useCounter(" status={itemStatus(step, 5)}>
                    <SearchToolBody
                      pattern="useCounter("
                      scope="src"
                      matches={[
                        { file: "src/components/counter.tsx", line: 8, text: "const { count, increment } = useCounter(0, 10);" },
                        { file: "src/pages/cart.tsx", line: 21, text: "const qty = useCounter(1, 99);" },
                      ]}
                    />
                  </ToolTimelineItem>
                )}
              </ToolGroup>
            )}
            {step >= 6 && (
              <ToolTimelineText>
                <code className="font-mono text-[0.9em]">increment</code> stops one short of <code className="font-mono text-[0.9em]">max</code>, and{" "}
                <code className="font-mono text-[0.9em]">reset</code> isn't memoized. Fixing both.
              </ToolTimelineText>
            )}
            {step >= 7 && (
              <ToolTimelineItem
                name="Edit"
                arg="src/hooks/use-counter.ts"
                status={itemStatus(step, 7)}
                diffStat={step > 7 ? { additions: 2, deletions: 2 } : undefined}
                defaultOpen
              >
                <EditToolBody path="src/hooks/use-counter.ts" oldValue={counterBefore} newValue={counterAfter} />
              </ToolTimelineItem>
            )}
            {step >= 9 && (
              <ToolTimelineItem
                name="Bash"
                arg="pnpm test"
                status={step <= 15 ? "progress" : "success"}
                exitCode={step > 15 ? 0 : undefined}
                duration={step > 15 ? 4200 : undefined}
                defaultOpen
              >
                <BashToolBody
                  command="pnpm test"
                  output={testLines.slice(0, testShown).join("\n")}
                  streaming={step <= 15}
                  exitCode={step > 15 ? 0 : undefined}
                />
              </ToolTimelineItem>
            )}
            {step >= 17 && (
              <ToolTimelineItem
                name="Bash"
                arg="pnpm lint"
                status={step === 17 ? "progress" : "failure"}
                exitCode={step > 17 ? 1 : undefined}
                duration={step > 17 ? 1800 : undefined}
              >
                <BashToolBody
                  command="pnpm lint"
                  output={step > 17 ? lintStdout : undefined}
                  stderr={step > 17 ? lintStderr : undefined}
                  exitCode={step > 17 ? 1 : undefined}
                  streaming={step === 17}
                />
              </ToolTimelineItem>
            )}
            {step >= 19 && (
              <ToolTimelineText>
                <ChainOfThought
                  streaming={thinking}
                  tokenCount={tokens}
                  summary="The warning is a false positive from an outdated rule config"
                >
                  <ChainOfThoughtContent>
                    <ChainOfThoughtStep label="The lint failure is a warning, not an error, but CI uses --max-warnings 0." />
                    <ChainOfThoughtStep label="reset is returned from the hook, so it is used. The rule is misconfigured for returned object shorthand." />
                    <ChainOfThoughtStep
                      label="Suggest updating the rule rather than suppressing it inline."
                      status={thinking ? "active" : "complete"}
                    />
                  </ChainOfThoughtContent>
                </ChainOfThought>
              </ToolTimelineText>
            )}
            {step >= 26 && (
              <ToolTimelineText>
                The overflow fix is in and all 42 tests pass. Lint fails on a pre-existing rule misconfiguration
                (<code className="font-mono text-[0.9em]">no-unused-vars</code> doesn't see returned shorthand); want me to switch it to the
                TypeScript-aware rule?
              </ToolTimelineText>
            )}
          </ToolTimeline>
          <div className="mt-4 border-t border-border pt-2">
            {status === "idle" ? (
              <p className="px-1 py-1 text-sm text-muted-foreground">Turn complete.</p>
            ) : (
              <AgentStatusLine state={status} tool={tool} tokens={thinking ? tokens : undefined} hint={<><Kbd>Esc</Kbd> to interrupt</>} />
            )}
          </div>
        </div>
      </ThinkingExpandAllProvider>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Isolated demos                                                      */
/* ------------------------------------------------------------------ */

function TimelineDemo() {
  return (
    <Demo
      id="tool-timeline"
      title="Tool timeline"
      description="A rail of compact one-line rows. Status drives the dot: success, failure, progress (pulsing), warning and pending. Click or press Enter on a row to reveal its body."
      align="start"
    >
      <ToolTimeline className="mx-auto w-full max-w-2xl">
        <ToolTimelineText>Narration sits on the rail between calls with a neutral dot.</ToolTimelineText>
        <ToolTimelineItem name="Read" arg="src/app.tsx" duration={38}>
          <ReadToolBody path="src/app.tsx" startLine={1} endLine={3} snippet={'import { App } from "./app";\n\ncreateRoot(root).render(<App />);'} language="tsx" />
        </ToolTimelineItem>
        <ToolTimelineItem name="Edit" arg="src/app.tsx" diffStat={{ additions: 12, deletions: 3 }} duration={210} />
        <ToolTimelineItem name="Bash" arg="pnpm build" status="failed" exitCode={2} duration={8300} />
        <ToolTimelineItem name="WebFetch" arg="https://react.dev/reference/react/useCallback" status="warning" meta="redirected" />
        <ToolTimelineItem name="Bash" arg="pnpm test --watch=false" status="running" />
        <ToolTimelineItem name="Write" arg="CHANGELOG.md" status="pending" />
      </ToolTimeline>
    </Demo>
  );
}

function ToolGroupDemo() {
  const [done, setDone] = React.useState(false);
  return (
    <Demo
      id="tool-group"
      title="Tool group"
      description="Consecutive low-signal calls fold into one row with a count. Open while running, collapsed automatically when complete. Labels are customizable."
      align="start"
    >
      <div className="flex justify-end">
        <Button size="xs" variant="secondary" onClick={() => setDone((d) => !d)}>
          {done ? "Restart" : "Finish"}
        </Button>
      </div>
      <ToolTimeline className="mx-auto w-full max-w-2xl">
        <ToolGroup>
          <ToolTimelineItem name="Read" arg="package.json" />
          <ToolTimelineItem name="Read" arg="tsconfig.json" />
          <ToolTimelineItem name="Glob" arg="src/**/*.test.ts" />
          <ToolTimelineItem name="Read" arg="vitest.config.ts" status={done ? "succeeded" : "running"} />
        </ToolGroup>
        <ToolGroup verb="Searched" runningVerb="Searching" noun="pattern">
          <ToolTimelineItem name="Grep" arg="TODO" />
          <ToolTimelineItem name="Grep" arg="console\.log" />
          <ToolTimelineItem name="Grep" arg="@deprecated" />
        </ToolGroup>
        <ToolGroup label={({ count }) => `Fetched ${count} pages`}>
          <ToolTimelineItem name="WebFetch" arg="https://tailwindcss.com/docs" />
          <ToolTimelineItem name="WebFetch" arg="https://www.radix-ui.com" />
        </ToolGroup>
      </ToolTimeline>
    </Demo>
  );
}

function BashDemo() {
  return (
    <Demo
      id="bash-tool-body"
      title="Bash tool body"
      description="A $ prompt with copy, ANSI-colored output on a code surface, separate error output, an exit-code chip and truncation with a fade."
      align="start"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <DemoLabel>Success</DemoLabel>
          <BashToolBody command="pnpm test" output={testLines.join("\n")} exitCode={0} />
        </div>
        <div className="space-y-2">
          <DemoLabel>Failure with stderr</DemoLabel>
          <BashToolBody command="pnpm lint" output={lintStdout} stderr={lintStderr} exitCode={1} />
        </div>
        <div className="space-y-2 lg:col-span-2">
          <DemoLabel>Long output (truncated at 8 lines)</DemoLabel>
          <BashToolBody command="pnpm build --verbose" output={longLog} maxLines={8} exitCode={0} />
        </div>
      </div>
    </Demo>
  );
}

function DiffCardDemo() {
  const [decision, setDecision] = React.useState<string | null>(null);
  return (
    <Demo
      id="diff-card"
      title="Diff card"
      description="Compact diff preview: file header with stats, a capped unified diff with line numbers and a fade, “Click to expand”, optional accept / reject, and new / deleted file states."
      align="start"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <DemoLabel>Edit with accept / reject{decision ? ` · ${decision}` : ""}</DemoLabel>
          <EditToolBody
            path="src/hooks/use-counter.ts"
            oldValue={counterBefore}
            newValue={counterAfter}
            onAccept={() => setDecision("accepted")}
            onReject={() => setDecision("rejected")}
          />
        </div>
        <div className="space-y-2">
          <DemoLabel>Long file (expands inline)</DemoLabel>
          <DiffCard path="src/tokens/generated.ts" oldValue={longBefore} newValue={longAfter} collapsedLines={8} context={2} />
        </div>
        <div className="space-y-2">
          <DemoLabel>New file</DemoLabel>
          <DiffCard path="src/lib/clamp.ts" newValue={"export const clamp = (n: number, min: number, max: number) =>\n  Math.min(max, Math.max(min, n));\n"} />
        </div>
        <div className="space-y-2">
          <DemoLabel>Deleted file</DemoLabel>
          <DiffCard path="src/legacy/counter.js" oldValue={"module.exports = function counter() {\n  return 0;\n};\n"} />
        </div>
      </div>
    </Demo>
  );
}

function DiffStatDemo() {
  return (
    <Demo id="diff-stat" title="Diff stat" description="“+12 −3” with a five-block proportional bar and an accessible label.">
      <DiffStat additions={12} deletions={3} />
      <DiffStat additions={1} deletions={48} />
      <DiffStat additions={120} deletions={0} />
      <DiffStat additions={7} deletions={7} />
      <DiffStat additions={0} deletions={0} />
      <DiffStat additions={5} deletions={2} showBar={false} />
    </Demo>
  );
}

function BodiesDemo() {
  return (
    <Demo
      id="tool-bodies"
      title="Tool bodies"
      description="Read (path, range, snippet), Search (pattern and file:line matches), Web (domain and title) and a generic key / value grid."
      align="start"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <DemoLabel>Read</DemoLabel>
          <ReadToolBody path="src/hooks/use-counter.ts" startLine={3} endLine={6} totalLines={9} language="ts" snippet={counterBefore.split("\n").slice(2, 6).join("\n")} />
        </div>
        <div className="space-y-2">
          <DemoLabel>Search</DemoLabel>
          <SearchToolBody
            pattern="useState\("
            scope="src/**/*.tsx"
            onOpenMatch={() => {}}
            matches={[
              { file: "src/app.tsx", line: 12, text: "const [open, setOpen] = useState(false);" },
              { file: "src/hooks/use-counter.ts", line: 4, text: "const [count, setCount] = React.useState(initial);" },
              { file: "src/components/menu.tsx", line: 31, text: "const [active, setActive] = useState<string>();" },
            ]}
          />
        </div>
        <div className="space-y-2">
          <DemoLabel>Web</DemoLabel>
          <WebToolBody
            url="https://react.dev/reference/react/useCallback"
            title="useCallback – React"
            snippet="useCallback is a React Hook that lets you cache a function definition between re-renders."
          />
        </div>
        <div className="space-y-2">
          <DemoLabel>Key / value</DemoLabel>
          <ToolKeyValueBody
            rows={[
              { label: "subagent", value: "code-reviewer" },
              { label: "prompt", value: "Review the counter hook change for edge cases around max and negative values. Check the tests cover reset after increments, and that the memoized reset updates when the initial value changes. Report only real bugs." },
              { label: "timeout", value: "120s" },
            ]}
          />
        </div>
      </div>
    </Demo>
  );
}

function ExpandableDemo() {
  return (
    <Demo
      id="expandable-content"
      title="Expandable content"
      description="A reusable height-capped container with a bottom fade and Show more / Show less. The toggle only appears when the content overflows."
      align="start"
    >
      <ExpandableContent collapsedHeight={96} className="mx-auto max-w-xl text-sm text-muted-foreground">
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <p key={i}>
              Paragraph {i + 1}. Tool results can be long: file listings, JSON payloads and logs. Capping them keeps the
              transcript scannable while leaving everything one click away.
            </p>
          ))}
        </div>
      </ExpandableContent>
    </Demo>
  );
}

function StatusLineDemo() {
  const [state, setState] = React.useState<AgentStatusState>("thinking");
  return (
    <Demo
      id="agent-status-line"
      title="Agent status line"
      description="Live status above the composer with elapsed seconds and an optional token count. The elapsed timer restarts when the state changes."
      align="start"
    >
      <SegmentedControl
        size="sm"
        className="max-w-full overflow-x-auto scrollbar-none"
        aria-label="Agent state"
        value={state}
        onValueChange={(v) => v && setState(v as AgentStatusState)}
        options={[
          { value: "thinking", label: "Thinking" },
          { value: "running", label: "Running" },
          { value: "permission", label: "Permission" },
          { value: "question", label: "Question" },
          { value: "idle", label: "Idle" },
        ]}
      />
      <div className="mx-auto w-full max-w-xl rounded-box border border-border bg-card px-3 py-2">
        <AgentStatusLine
          state={state}
          tool="Bash"
          tokens={state === "thinking" ? 3420 : undefined}
          hint={<><Kbd>Esc</Kbd> to interrupt</>}
        />
        {state === "idle" && <p className="px-1 py-1 text-sm text-muted-foreground">Idle renders nothing.</p>}
        <div className="mt-2 h-16 rounded-control border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
          Ask the agent…
        </div>
      </div>
    </Demo>
  );
}

function ThinkingDemo() {
  const [streaming, setStreaming] = React.useState(true);
  const [tokens, setTokens] = React.useState(0);
  React.useEffect(() => {
    if (!streaming) return;
    const id = setInterval(() => setTokens((t) => t + 137), 300);
    const stop = setTimeout(() => setStreaming(false), 6000);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, [streaming]);

  return (
    <Demo
      id="thinking"
      title="Thinking panels"
      description="ChainOfThought with a live elapsed timer and token counter, a faint summary when collapsed, and a transcript-wide expand-all toggle."
      align="start"
    >
      <ThinkingExpandAllProvider>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DemoLabel>Transcript</DemoLabel>
          <div className="flex flex-wrap items-center gap-1">
            <ThinkingToggle />
            <Button
              size="xs"
              variant="secondary"
              disabled={streaming}
              onClick={() => {
                setTokens(0);
                setStreaming(true);
              }}
            >
              Replay
            </Button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-xl space-y-4">
          <ChainOfThought duration={8} tokenCount={940} summary="Compared a reducer and two useState calls; picked useState">
            <ChainOfThoughtContent>
              <ChainOfThoughtStep label="Two independent values, so a reducer adds ceremony without benefit." />
              <ChainOfThoughtStep label="useState keeps the hook easy to read." />
            </ChainOfThoughtContent>
          </ChainOfThought>
          <ChainOfThought streaming={streaming} tokenCount={tokens} summary="Traced the off-by-one to the increment guard">
            <ChainOfThoughtContent>
              <ChainOfThoughtStep label="The guard compares c < max - 1, so max is never reached." />
              <ChainOfThoughtStep label="Math.min(max, c + 1) states the intent directly." status={streaming ? "running" : "succeeded"} />
            </ChainOfThoughtContent>
          </ChainOfThought>
        </div>
      </ThinkingExpandAllProvider>
    </Demo>
  );
}
