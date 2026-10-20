import * as React from "react";
import {
  Avatar,
  Button,
  ChatMessage,
  ChatMessageBody,
  ChatMessageContent,
  ChatMessageHeader,
  SutraMascot,
  Text,
  mascotStateLabels,
  mascotStates,
  sutraAppMeta,
  sutraApps,
  type MascotState,
  type MascotShape,
} from "@sutra/ui";
import { RiPauseLine, RiPlayLine, RiRestartLine } from "@sutra/ui/icons";
import { Demo, DemoLabel } from "../components/demo";

const stateNames: Record<MascotState, string> = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking",
  working: "Working",
  speaking: "Speaking",
  happy: "Happy",
  sleeping: "Sleeping",
  error: "Error",
};

/** One mascot per state in a row that wraps, on whatever surface it is placed (page, pinned dark, paper). */
function StatesStrip({ size, shape }: { size: number; shape: MascotShape }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-3">
      {mascotStates.map((state) => (
        <div key={state} className="flex flex-col items-center gap-1">
          <SutraMascot state={state} shape={shape} size={size} title={mascotStateLabels[state]} />
          <span className="text-2xs text-muted-foreground">{stateNames[state]}</span>
        </div>
      ))}
    </div>
  );
}

function StatePicker() {
  const [state, setState] = React.useState<MascotState>("idle");
  const [paused, setPaused] = React.useState(false);
  const [replay, setReplay] = React.useState(0);
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <div className="flex w-44 shrink-0 flex-col items-center gap-2">
        <SutraMascot state={state} size={160} paused={paused} replayKey={replay} title />
        <p role="status" className="text-center text-sm font-medium">
          {mascotStateLabels[state]}
        </p>
      </div>
      <div className="min-w-0 space-y-3">
        <div role="group" aria-label="Mascot state" className="flex flex-wrap gap-2">
          {mascotStates.map((s) => (
            <Button key={s} size="sm" variant={s === state ? "primary" : "outline"} aria-pressed={s === state} onClick={() => setState(s)}>
              {stateNames[s]}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="soft" leadingIcon={<RiRestartLine />} onClick={() => setReplay((n) => n + 1)}>
            Replay
          </Button>
          <Button size="sm" variant="soft" leadingIcon={paused ? <RiPlayLine /> : <RiPauseLine />} aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
            {paused ? "Resume" : "Pause"}
          </Button>
        </div>
        <Text size="sm" className="text-muted-foreground">
          Happy and error are one-shot reactions: Replay plays them again while the state stays the same.
        </Text>
      </div>
    </div>
  );
}

export function MascotDemo() {
  return (
    <Demo
      id="mascot"
      title="Mascot"
      description="SutraMascot: the Bead on its thread as a friendly character. Eight states, each with its own face and extras so it reads without motion; flat ink on paper, round and squircle tiles for avatars, the app dye as an option."
      align="start"
      canvasClassName="gap-8"
    >
      <div className="space-y-3">
        <DemoLabel>Pick a state</DemoLabel>
        <StatePicker />
      </div>
      <div className="space-y-3">
        <DemoLabel>Every state</DemoLabel>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {mascotStates.map((state) => (
            <div key={state} className="flex flex-col items-center gap-2">
              <SutraMascot state={state} size={112} title={mascotStateLabels[state]} />
              <span className="text-xs text-muted-foreground">{stateNames[state]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <DemoLabel>Sizes, 24 to 160</DemoLabel>
        <div className="flex flex-wrap items-end gap-5">
          {[24, 32, 48, 64, 96, 160].map((px) => (
            <div key={px} className="flex flex-col items-center gap-1">
              <SutraMascot size={px} state="happy" title={`Sutra mascot, ${px}px`} />
              <span className="text-2xs text-muted-foreground">{px}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <DemoLabel>Avatar forms, next to Avatar</DemoLabel>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name="Ada Lovelace" size="md" />
          <SutraMascot shape="circle" size={40} state="idle" title="Sutra" />
          <SutraMascot shape="squircle" size={40} state="idle" title="Sutra" />
          <Avatar name="Grace Hopper" size="lg" />
          <SutraMascot shape="circle" size={48} state="listening" title="Sutra is listening" />
          <SutraMascot shape="squircle" size={48} state="thinking" title="Sutra is thinking" />
          <Avatar name="Alan Turing" size="2xl" />
          <SutraMascot shape="circle" size={64} state="happy" title="Sutra is happy" />
          <SutraMascot shape="squircle" size={64} state="sleeping" title="Sutra is asleep" />
        </div>
      </div>
      <div className="space-y-3">
        <DemoLabel>Tile forms, every state</DemoLabel>
        <StatesStrip size={56} shape="circle" />
        <StatesStrip size={56} shape="squircle" />
      </div>
      <div className="space-y-3">
        <DemoLabel>Dyed tone: the bead takes the dye of an app</DemoLabel>
        <div className="flex flex-wrap gap-x-4 gap-y-3">
          {sutraApps.map((app) => (
            <div key={app} className="flex flex-col items-center gap-1">
              <SutraMascot shape="circle" tone="dyed" app={app} size={56} state="idle" title={`Sutra mascot, ${sutraAppMeta[app].name} dye`} />
              <span className="text-2xs text-muted-foreground">{sutraAppMeta[app].name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <DemoLabel>Paused: the expression stays, the animation freezes</DemoLabel>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <SutraMascot state="working" size={80} title="Sutra is working" />
            <span className="text-2xs text-muted-foreground">moving</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <SutraMascot state="working" size={80} paused title="Sutra is working (paused)" />
            <span className="text-2xs text-muted-foreground">paused</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div data-theme="dark" className="min-w-0 space-y-3 rounded-box border border-border bg-background p-4 text-foreground">
          <p className="text-xs font-medium text-muted-foreground">Dark (pinned)</p>
          <StatesStrip size={48} shape="bare" />
          <StatesStrip size={48} shape="circle" />
        </div>
        <div data-style="paper" className="min-w-0 space-y-3 rounded-box border border-border bg-background p-4 text-foreground">
          <p className="text-xs font-medium text-muted-foreground">Paper (pinned)</p>
          <StatesStrip size={48} shape="bare" />
          <StatesStrip size={48} shape="circle" />
        </div>
      </div>
    </Demo>
  );
}

/** The script of one answer: the state of the mascot and how long it stays there (the last one stays). */
const script: [MascotState, number][] = [
  ["thinking", 1800],
  ["working", 2200],
  ["speaking", 2600],
  ["happy", 1700],
  ["idle", 0],
];

const statusText: Record<MascotState, string> = {
  idle: "Ready",
  listening: "Listening",
  thinking: "Thinking",
  working: "Looking through your calendar",
  speaking: "Answering",
  happy: "Done",
  sleeping: "Asleep",
  error: "Calendar unavailable",
};

export function MascotChatDemo() {
  const [step, setStep] = React.useState(script.length - 1);
  const [asked, setAsked] = React.useState(0);
  React.useEffect(() => {
    if (asked === 0) return; // the first answer is already on screen
    let index = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const next = () => {
      setStep(index);
      const wait = script[index]![1];
      index += 1;
      if (wait > 0 && index < script.length) timer = setTimeout(next, wait);
    };
    next();
    return () => clearTimeout(timer);
  }, [asked]);
  const state = script[step]![0];
  const answered = state === "happy" || state === "idle";
  return (
    <Demo
      id="mascot-in-chat"
      title="Mascot as an assistant avatar"
      description="The round tile in a chat row: its state follows what the assistant is doing, and the words next to it say the same thing, so the motion is never the only signal."
      align="start"
      canvasClassName="flex-col items-stretch gap-5"
    >
      <ChatMessage role="user">
        <ChatMessageBody>
          <ChatMessageContent>What is on my calendar tomorrow?</ChatMessageContent>
        </ChatMessageBody>
      </ChatMessage>
      <ChatMessage role="assistant" variant="flat">
        <SutraMascot shape="circle" size={36} state={state} className="mt-0.5" />
        <ChatMessageBody>
          <ChatMessageHeader name="Sutra" />
          <p role="status" className="text-xs text-muted-foreground">
            {statusText[state]}
          </p>
          <ChatMessageContent>
            {answered ? "Two meetings: design review at 10:00 and a call with Priya at 15:30. The rest of the day is free." : "…"}
          </ChatMessageContent>
        </ChatMessageBody>
      </ChatMessage>
      <ChatMessage role="assistant" variant="flat">
        <SutraMascot shape="circle" size={36} state="error" className="mt-0.5" />
        <ChatMessageBody>
          <ChatMessageHeader name="Sutra" />
          <ChatMessageContent>I could not reach the mail service. Nothing was sent.</ChatMessageContent>
        </ChatMessageBody>
      </ChatMessage>
      <div>
        <Button size="sm" variant="soft" onClick={() => setAsked((n) => n + 1)}>
          Ask again
        </Button>
      </div>
    </Demo>
  );
}
