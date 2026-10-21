import * as React from "react";
import {
  Avatar,
  Button,
  ChatMessage,
  ChatMessageBody,
  ChatMessageContent,
  ChatMessageHeader,
  RadioCard,
  RadioGroup,
  Slider,
  SutraMascot,
  Text,
  mascotCharacterLabels,
  mascotCharacters,
  mascotStateLabels,
  mascotStates,
  sutraAppMeta,
  sutraApps,
  type MascotCharacter,
  type MascotState,
  type MascotShape,
} from "@sutra/ui";
import { RiPauseLine, RiPlayLine, RiRestartLine } from "@sutra/ui/icons";
import { SutradharSting } from "@sutra/ui/assets/sutradhar-sting";
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
  const [character, setCharacter] = React.useState<MascotCharacter>("bead");
  const [state, setState] = React.useState<MascotState>("idle");
  const [paused, setPaused] = React.useState(false);
  const [replay, setReplay] = React.useState(0);
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <div className="flex w-44 shrink-0 flex-col items-center gap-2">
        <SutraMascot character={character} state={state} size={160} paused={paused} replayKey={replay} title />
        <p role="status" className="text-center text-sm font-medium">
          {mascotStateLabels[state]}
        </p>
      </div>
      <div className="min-w-0 space-y-3">
        {/* switching state blends the pose into the next one with a blink; try it on every character */}
        <div role="group" aria-label="Character" className="flex flex-wrap gap-2">
          {mascotCharacters.map((c) => (
            <Button key={c} size="sm" variant={c === character ? "primary" : "ghost"} aria-pressed={c === character} onClick={() => setCharacter(c)}>
              {mascotCharacterLabels[c]}
            </Button>
          ))}
        </div>
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
          A change of state blends into the next pose with a blink. Happy and error are one-shot reactions: Replay plays them again
          while the state stays the same.
        </Text>
      </div>
    </div>
  );
}

export function MascotDemo() {
  return (
    <>
      <MascotBeadDemo />
      <MascotPickerDemo />
      <MascotCharactersDemo />
      <SutradharStingDemo />
      <EndlessAstraDemo />
    </>
  );
}

/** The bead buddy, the original character, in depth. */
function MascotBeadDemo() {
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

/** "Choose your Sutra": the characters as a radio group (arrow keys move the choice), previewed in a chat row and a status line. */
export function MascotPickerDemo() {
  const [character, setCharacter] = React.useState<MascotCharacter>("bead");
  return (
    <Demo
      id="mascot-picker"
      title="Choose your Sutra"
      description="Every user picks their own Sutra. The choice is a radio group of circle tiles; the preview shows the pick where it lives: as the avatar of a reply and in a status line."
      align="start"
      canvasClassName="@container flex-col items-stretch gap-6"
    >
      <RadioGroup
        aria-label="Your Sutra"
        value={character}
        onValueChange={(value) => setCharacter(value as MascotCharacter)}
        className="grid grid-cols-2 gap-2 @3xl:grid-cols-4"
      >
        {mascotCharacters.map((c) => (
          <RadioCard
            key={c}
            value={c}
            className="items-center"
            label={
              <span className="flex flex-col items-start gap-2 @sm:flex-row @sm:items-center @sm:gap-3">
                <SutraMascot character={c} shape="circle" size={40} />
                {mascotCharacterLabels[c]}
              </span>
            }
          />
        ))}
      </RadioGroup>
      <div className="space-y-4 rounded-lg border p-4">
        <ChatMessage role="assistant" variant="flat">
          <SutraMascot character={character} shape="circle" size={36} className="mt-0.5" />
          <ChatMessageBody>
            <ChatMessageHeader name="Sutra" />
            <ChatMessageContent>Your 3 pm is now on Thursday. I let Maya know.</ChatMessageContent>
          </ChatMessageBody>
        </ChatMessage>
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <SutraMascot character={character} state="thinking" size={20} />
          Sutra is thinking…
        </p>
      </div>
    </Demo>
  );
}

/** Every character in every state, bare and as a tile. */
export function MascotCharactersDemo() {
  const [shape, setShape] = React.useState<MascotShape>("bare");
  return (
    <Demo
      id="mascot-characters"
      title="Mascot characters"
      description="Eight characters, eight states each. The bead moves with CSS keyframes; the others are drawn frame by frame while motion is allowed and stand in their still pose under reduced motion."
      align="start"
      canvasClassName="flex-col items-stretch gap-6"
    >
      <div className="flex flex-wrap gap-2">
        {(["bare", "circle", "squircle"] as const).map((s) => (
          <Button key={s} size="sm" variant={shape === s ? "primary" : "soft"} aria-pressed={shape === s} onClick={() => setShape(s)}>
            {s}
          </Button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="text-xs text-muted-foreground">
          <thead>
            <tr>
              <th className="p-1 text-start font-medium">Character</th>
              {mascotStates.map((state) => (
                <th key={state} className="p-1 font-medium">
                  {stateNames[state]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mascotCharacters.map((c) => (
              <tr key={c}>
                <th scope="row" className="p-1 text-start font-medium text-foreground">
                  {mascotCharacterLabels[c]}
                </th>
                {mascotStates.map((state) => (
                  <td key={state} className="p-1 text-foreground">
                    <SutraMascot character={c} state={state} shape={shape} size={64} title={`${mascotCharacterLabels[c]}: ${mascotStateLabels[state]}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Demo>
  );
}

/** The two stings with Sutradhar and the Sutra mark: replay, loop and (for the astra) the aim. */
export function SutradharStingDemo() {
  const [replay, setReplay] = React.useState(0);
  const [loop, setLoop] = React.useState(false);
  const [aim, setAim] = React.useState(150);
  const [done, setDone] = React.useState<Record<"mark" | "astra", number>>({ mark: 0, astra: 0 });
  return (
    <Demo
      id="sutradhar-sting"
      title="Sutradhar sting"
      description="A short logo sting that ends on a still lockup: Sutradhar forms the crescent mark on its thread, or wields it as a hand astra crackling with ink lightning and fires an ink wave into empty space. It plays once on screen, pauses off screen, and shows only the lockup under reduced motion."
      align="start"
      canvasClassName="flex-col items-stretch gap-6"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="soft" onClick={() => setReplay((n) => n + 1)}>
          <RiRestartLine aria-hidden /> Replay
        </Button>
        <Button size="sm" variant={loop ? "primary" : "soft"} aria-pressed={loop} onClick={() => setLoop((v) => !v)}>
          Loop
        </Button>
        <div className="flex min-w-56 items-center gap-3 text-sm text-muted-foreground">
          <span id="sting-aim">Aim</span>
          <Slider
            aria-labelledby="sting-aim"
            min={30}
            max={330}
            step={1}
            value={[aim]}
            onValueChange={(v) => setAim(v[0] ?? 150)}
            getValueText={(v) => v + " degrees: 90 is straight up, 180 is level to the left, 270 is straight down"}
            className="w-40"
          />
          <span className="tabular-nums">{aim}°</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {(["mark", "astra"] as const).map((variant) => (
          <figure key={variant} className="m-0 space-y-2">
            <div className="grid place-items-center rounded-lg border p-4">
              <SutradharSting
                variant={variant}
                aim={aim}
                loop={loop}
                replayKey={replay}
                size={200}
                title={variant === "mark" ? "Sutradhar plants the Sutra mark" : "Sutradhar fires the astra"}
                onComplete={() => setDone((d) => ({ ...d, [variant]: d[variant] + 1 }))}
                className="max-w-full"
              />
            </div>
            <figcaption className="text-xs text-muted-foreground">
              {variant === "mark" ? "mark" : "astra"}: played to the lockup {done[variant]} {done[variant] === 1 ? "time" : "times"}
            </figcaption>
          </figure>
        ))}
      </div>
    </Demo>
  );
}

/** The endless astra: once fired the stream never stops; replay it and set its aim (30 to 330). */
export function EndlessAstraDemo() {
  const [replay, setReplay] = React.useState(0);
  const [aim, setAim] = React.useState(172);
  const [streaming, setStreaming] = React.useState(0);
  return (
    <Demo
      id="endless-astra"
      title="Endless astra"
      description="The astra on a wide stage that never stops once fired: lightning keeps crackling round the bead, arcs and beads flow out along the ink wave, and the wave streams on across the whole stage and thins away at its far end. It runs while on screen, pauses off screen, and holds the stream still under reduced motion."
      align="start"
      canvasClassName="flex-col items-stretch gap-6"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="soft" onClick={() => setReplay((n) => n + 1)}>
          <RiRestartLine aria-hidden /> Replay
        </Button>
        <div className="flex min-w-56 items-center gap-3 text-sm text-muted-foreground">
          <span id="endless-aim">Aim</span>
          <Slider
            aria-labelledby="endless-aim"
            min={30}
            max={330}
            step={1}
            value={[aim]}
            onValueChange={(v) => setAim(v[0] ?? 172)}
            getValueText={(v) => v + " degrees: 90 is straight up, 180 is level to the left, 270 is straight down"}
            className="w-40"
          />
          <span className="tabular-nums">{aim}°</span>
        </div>
      </div>
      <figure className="m-0 space-y-2">
        <div className="grid place-items-center rounded-lg border p-4">
          <SutradharSting
            variant="astra-endless"
            aim={aim}
            replayKey={replay}
            size={180}
            title="Sutradhar holds an endless stream from the astra"
            onComplete={() => setStreaming((n) => n + 1)}
            className="h-auto max-w-full"
          />
        </div>
        <figcaption className="text-xs text-muted-foreground">
          The stream reached full length {streaming} {streaming === 1 ? "time" : "times"} and keeps flowing.
        </figcaption>
      </figure>
    </Demo>
  );
}
