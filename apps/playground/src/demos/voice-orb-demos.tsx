import * as React from "react";
import {
  AssistantOrb,
  Button,
  RadioCard,
  RadioGroup,
  SegmentedControl,
  Slider,
  Switch,
  assistantOrbLabels,
  assistantOrbStates,
  assistantOrbVariantLabels,
  assistantOrbVariants,
  cn,
  useAssistantOrbState,
  useAudioLevel,
  type AssistantOrbState,
  type AssistantOrbVariant,
} from "@cleanprompt/sutra-ui";
import { RiArrowUpLine, RiMicLine, RiMicOffLine, RiStopFill } from "@cleanprompt/sutra-ui/icons";
import { Demo, DemoLabel } from "../components/demo";

const FOUR = ["idle", "listening", "thinking", "speaking"] as const satisfies readonly AssistantOrbState[];
const captions: Record<AssistantOrbState, string> = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  error: "Error",
  muted: "Muted",
};

/* ------------------------------------------------------------------ */
/* Simulated drivers                                                   */
/* ------------------------------------------------------------------ */

/** A speech-like fake level for a state: bursts while listening, a steady syllable beat while speaking, 0 otherwise. */
function useFakeLevel(state: AssistantOrbState, active = true): number {
  const [level, setLevel] = React.useState(0);
  React.useEffect(() => {
    if (!active || (state !== "listening" && state !== "speaking")) {
      setLevel(0);
      return;
    }
    const started = performance.now();
    const id = window.setInterval(() => {
      const t = (performance.now() - started) / 1000;
      const syllable = Math.abs(Math.sin(t * (state === "speaking" ? 9 : 5.5)));
      const phrase = 0.5 + 0.5 * Math.sin(t * 1.3);
      const v = state === "speaking" ? 0.25 + 0.65 * syllable * (0.6 + 0.4 * phrase) : phrase > 0.35 ? 0.15 + 0.8 * syllable * phrase : 0.06;
      setLevel(Math.max(0, Math.min(1, v + (Math.random() - 0.5) * 0.12)));
    }, 50);
    return () => window.clearInterval(id);
  }, [state, active]);
  return level;
}

/** Idle, listening, thinking, speaking in turn, for as long as `enabled`. */
const CYCLE: readonly { state: AssistantOrbState; ms: number }[] = [
  { state: "idle", ms: 1800 },
  { state: "listening", ms: 3400 },
  { state: "thinking", ms: 2400 },
  { state: "speaking", ms: 3800 },
];

function useAutoCycle(enabled: boolean, onState: (state: AssistantOrbState) => void) {
  const report = React.useRef(onState);
  report.current = onState;
  React.useEffect(() => {
    if (!enabled) return;
    let i = 0;
    let timer = 0;
    const next = () => {
      const step = CYCLE[i % CYCLE.length]!;
      report.current(step.state);
      i += 1;
      timer = window.setTimeout(next, step.ms);
    };
    next();
    return () => window.clearTimeout(timer);
  }, [enabled]);
}

/* ------------------------------------------------------------------ */
/* State picker + grid                                                 */
/* ------------------------------------------------------------------ */

export function AssistantOrbDemo() {
  const [state, setState] = React.useState<AssistantOrbState>("listening");
  const [manual, setManual] = React.useState(0.5);
  const [auto, setAuto] = React.useState(false);
  const [simulate, setSimulate] = React.useState(true);
  const [paused, setPaused] = React.useState(false);
  useAutoCycle(auto, setState);
  const fake = useFakeLevel(state, simulate || auto);
  const level = auto || simulate ? fake : manual;
  return (
    <Demo
      id="assistant-orb"
      title="Assistant orb"
      description="The voice assistant's face in two looks, a glass orb and a layered waveform, with a state (idle, listening, thinking, speaking) and a live level. Each state differs in shape as well as motion."
      align="start"
      canvasClassName="space-y-8"
    >
      <div className="grid grid-cols-1 gap-6 @container">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <SegmentedControl
            size="sm"
            aria-label="State"
            value={state}
            onValueChange={(v) => {
              setAuto(false);
              setState(v as AssistantOrbState);
            }}
            options={assistantOrbStates.map((s) => ({ value: s, label: captions[s] }))}
          />
          <label className="flex min-h-6 items-center gap-2 text-xs text-muted-foreground">
            <Switch size="sm" checked={auto} onCheckedChange={setAuto} aria-label="Auto cycle" /> Auto cycle
          </label>
          <label className="flex min-h-6 items-center gap-2 text-xs text-muted-foreground">
            <Switch size="sm" checked={simulate} onCheckedChange={setSimulate} disabled={auto} aria-label="Simulate speech" /> Simulate speech
          </label>
          <label className="flex min-h-6 items-center gap-2 text-xs text-muted-foreground">
            <Switch size="sm" checked={paused} onCheckedChange={setPaused} aria-label="Paused" /> Paused
          </label>
        </div>
        <div className="flex max-w-sm items-center gap-3">
          <DemoLabel className="w-12 shrink-0">Level</DemoLabel>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[auto || simulate ? level : manual]}
            disabled={auto || simulate}
            onValueChange={([v]) => setManual(v ?? 0)}
            aria-label="Level"
            thumbLabels={["Level"]}
            getValueText={(v) => `${Math.round(v * 100)}%`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
          <AssistantOrb state={state} level={level} size={200} paused={paused} />
          <AssistantOrb variant="waveform" state={state} level={level} size={96} paused={paused} />
        </div>
        <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {assistantOrbLabels[state]}
        </p>
      </div>

      <div className="space-y-3">
        <DemoLabel>Both looks in every state (the level plays along for listening and speaking)</DemoLabel>
        <StateGrid />
      </div>
    </Demo>
  );
}

function StateGrid() {
  const listening = useFakeLevel("listening");
  const speaking = useFakeLevel("speaking");
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 @container sm:grid-cols-4">
      {FOUR.map((s) => {
        const level = s === "listening" ? listening : s === "speaking" ? speaking : 0;
        return (
          <figure key={s} className="m-0 flex min-w-0 flex-col items-center gap-3">
            <AssistantOrb state={s} level={level} size={112} />
            <AssistantOrb variant="waveform" state={s} level={level} size={44} className="max-w-full" />
            <figcaption className="text-xs text-muted-foreground">{captions[s]}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sizes                                                               */
/* ------------------------------------------------------------------ */

const SIZES = [48, 72, 112, 160, 280] as const;

export function AssistantOrbSizesDemo() {
  const level = useFakeLevel("speaking");
  const listening = useFakeLevel("listening");
  return (
    <Demo
      id="assistant-orb-sizes"
      title="Orb sizes"
      description="From a 48 px chip to a 280 px hero. The orb scales as one piece; the waveform's size is its height and its width is three times that (or the width of its box with className)."
      align="start"
      canvasClassName="space-y-6"
    >
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        {SIZES.map((n) => (
          <figure key={n} className="m-0 flex min-w-0 max-w-full flex-col items-center gap-2">
            <AssistantOrb state="speaking" level={level} size={n} />
            <figcaption className="text-xs text-muted-foreground tabular-nums">{n}</figcaption>
          </figure>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        {[24, 40, 64, 96].map((n) => (
          <figure key={n} className="m-0 flex min-w-0 max-w-full flex-col items-center gap-2">
            <AssistantOrb variant="waveform" state="speaking" level={level} size={n} />
            <figcaption className="text-xs text-muted-foreground tabular-nums">{n}</figcaption>
          </figure>
        ))}
      </div>
      <AssistantOrb variant="waveform" state="listening" level={listening} size={72} className="w-full" />
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Real microphone                                                     */
/* ------------------------------------------------------------------ */

function micErrorText(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Microphone access was denied. Allow it in the browser's site settings and try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No microphone was found on this device.";
  if (name === "NotReadableError") return "The microphone is in use by another app.";
  return "The microphone could not be opened.";
}

export function AssistantOrbMicDemo() {
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [asking, setAsking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [thinking, setThinking] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const alive = React.useRef(true);
  const supported = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  // Release the microphone when the stream is replaced and on unmount.
  React.useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  const start = async () => {
    setError(null);
    setAsking(true);
    try {
      const next = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) {
        next.getTracks().forEach((t) => t.stop());
        return;
      }
      setStream(next);
    } catch (e) {
      if (alive.current) setError(micErrorText(e));
    } finally {
      if (alive.current) setAsking(false);
    }
  };

  const state = useAssistantOrbState({ listening: Boolean(stream), thinking, speaking });
  const mic = useAudioLevel(stream);
  const fake = useFakeLevel(state, state === "speaking");
  const level = state === "speaking" ? fake : mic;

  return (
    <Demo
      id="assistant-orb-mic"
      title="With the real microphone"
      description="useAudioLevel feeds the orb from the microphone and useAssistantOrbState turns the session's flags into one state (speaking outranks thinking, thinking outranks listening). Nothing is recorded or sent anywhere. Speaking has no output level to read here, so it plays a simulated one."
      align="start"
      canvasClassName="space-y-5"
    >
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <AssistantOrb state={state} level={level} size={160} />
        <AssistantOrb variant="waveform" state={state} level={level} size={72} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {stream ? (
          <Button size="sm" variant="outline" leadingIcon={<RiStopFill />} onClick={() => setStream(null)}>
            Stop microphone
          </Button>
        ) : (
          <Button size="sm" leadingIcon={<RiMicLine />} loading={asking} disabled={!supported} onClick={start}>
            Use microphone
          </Button>
        )}
        <label className="flex min-h-6 items-center gap-2 text-xs text-muted-foreground">
          <Switch size="sm" checked={thinking} onCheckedChange={setThinking} aria-label="Thinking" /> Thinking
        </label>
        <label className="flex min-h-6 items-center gap-2 text-xs text-muted-foreground">
          <Switch size="sm" checked={speaking} onCheckedChange={setSpeaking} aria-label="Speaking" /> Speaking
        </label>
      </div>
      <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
        State: <strong className="font-medium text-foreground">{captions[state]}</strong>
        {!supported ? " (this browser has no microphone API)" : stream ? " (microphone open, say something)" : ""}
      </p>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Dark and paper                                                      */
/* ------------------------------------------------------------------ */

const themes = [
  { id: "stock", label: "Stock, light", wrap: "" },
  { id: "dark", label: "Stock, dark", wrap: "dark" },
  { id: "paper", label: "Paper", wrap: "paper" },
  { id: "paper-dark", label: "Paper, dark", wrap: "paper dark" },
] as const;

export function AssistantOrbThemesDemo() {
  const listening = useFakeLevel("listening");
  const speaking = useFakeLevel("speaking");
  return (
    <Demo
      id="assistant-orb-themes"
      title="Dark and paper"
      description="Colours come from the theme tokens: primary and chart hues in the stock look, one ink in the paper style, light added to dark glass in dark mode. Each panel carries its own theme."
      align="start"
      canvasClassName="grid grid-cols-1 gap-4 @container lg:grid-cols-2"
    >
      {themes.map((t) => (
        <div
          key={t.id}
          data-style={t.wrap.includes("paper") ? "paper" : undefined}
          className={cn("min-w-0 space-y-4 rounded-box border border-border bg-background p-4 text-foreground", t.wrap.includes("dark") && "dark")}
        >
          <p className="text-xs text-muted-foreground">{t.label}</p>
          <div className="grid grid-cols-4 gap-2">
            {FOUR.map((s) => (
              <div key={s} className="flex min-w-0 flex-col items-center gap-1">
                <AssistantOrb state={s} level={s === "listening" ? listening : s === "speaking" ? speaking : 0} size={72} />
                <span className="text-2xs text-muted-foreground">{captions[s]}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {FOUR.map((s) => (
              <AssistantOrb
                key={s}
                variant="waveform"
                state={s}
                level={s === "listening" ? listening : s === "speaking" ? speaking : 0}
                size={36}
                label={`${captions[s]} waveform`}
                className="w-full"
              />
            ))}
          </div>
        </div>
      ))}
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Assistant bar                                                       */
/* ------------------------------------------------------------------ */

const barCaption: Record<AssistantOrbState, string> = {
  idle: "Ask Sutra anything",
  listening: "Listening...",
  thinking: "Thinking it over...",
  speaking: "Here is what I found",
  error: "Something went wrong",
  muted: "Microphone is muted",
};

export function AssistantBarDemo() {
  const [state, setState] = React.useState<AssistantOrbState>("idle");
  const timers = React.useRef<number[]>([]);
  const level = useFakeLevel(state);
  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  React.useEffect(() => clear, []);
  const toggle = () => {
    clear();
    if (state !== "idle") {
      setState("idle");
      return;
    }
    setState("listening");
    timers.current.push(
      window.setTimeout(() => setState("thinking"), 3200),
      window.setTimeout(() => setState("speaking"), 5000),
      window.setTimeout(() => setState("idle"), 9000)
    );
  };
  return (
    <Demo
      id="assistant-orb-bar"
      title="Assistant bar"
      description="A compact composition at phone width: the orb, a caption that says what is happening (the status text is the app's job, the orb only has a name) and the microphone button."
      align="start"
    >
      <div className="w-full max-w-90 rounded-box border border-border bg-card p-3 shadow-xs">
        <div className="flex items-center gap-3">
          <AssistantOrb state={state} level={level} size={56} label="" />
          <p className="min-w-0 flex-1 truncate text-sm text-foreground" role="status" aria-live="polite">
            {barCaption[state]}
          </p>
          <Button
            size="icon"
            variant={state === "idle" ? "secondary" : "outline"}
            aria-label={state === "idle" ? "Start listening" : "Stop"}
            aria-pressed={state !== "idle"}
            onClick={toggle}
          >
            {state === "idle" ? <RiMicLine /> : <RiMicOffLine />}
          </Button>
        </div>
        <AssistantOrb variant="waveform" state={state} level={level} size={28} label="" className="mt-2 w-full" />
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Choose your orb: every look as a user setting                       */
/* ------------------------------------------------------------------ */

/** A look in a small slot: the round looks at `size`, the bars (waveform, string) as a short 3:1 bar of the same width. */
function OrbSwatch({ variant, state, level, size }: { variant: AssistantOrbVariant; state: AssistantOrbState; level: number; size: number }) {
  if (variant === "waveform" || variant === "string") {
    return <AssistantOrb variant={variant} state={state} level={level} size={Math.round(size * 0.55)} style={{ width: Math.round(size * 1.65) }} label="" />;
  }
  return <AssistantOrb variant={variant} state={state} level={level} size={size} label="" />;
}

const voiceCopy: Record<AssistantOrbState, { bar: string; line: string }> = {
  idle: { bar: "Ask Sutra anything", line: "Start talking, or tap to type." },
  listening: { bar: "Listening…", line: "“Move my three o’clock with Asha to tomorrow”" },
  thinking: { bar: "Thinking…", line: "Looking at both calendars" },
  speaking: { bar: "Speaking…", line: "Ten tomorrow works for both of you." },
  error: { bar: "Could not reach Sutra", line: "Check the network, then try again." },
  muted: { bar: "Microphone is off", line: "Unmute to keep talking." },
};

/** A voice mode card and a composer bar with the chosen look: 160 px (the string as a bar) and 28 px inline. */
function VoicePreview({ variant, state, level }: { variant: AssistantOrbVariant; state: AssistantOrbState; level: number }) {
  const bar = variant === "waveform" || variant === "string";
  return (
    <div className="space-y-3">
      <div className="grid justify-items-center gap-3 rounded-box border border-border bg-card px-4 py-5 text-center text-card-foreground">
        <div className="grid h-44 w-full place-items-center">
          {bar ? (
            <AssistantOrb variant={variant} state={state} level={level} size={72} className="max-w-full" label="" />
          ) : (
            <AssistantOrb variant={variant} state={state} level={level} size={160} label="" />
          )}
        </div>
        <p className="text-sm font-semibold">{captions[state]}</p>
        <p className="min-h-10 max-w-[30ch] text-sm text-muted-foreground">{voiceCopy[state].line}</p>
        <div className="flex items-center gap-2">
          <Button size="icon-sm" variant="outline" aria-label={state === "muted" ? "Unmute" : "Mute"}>
            {state === "muted" ? <RiMicOffLine /> : <RiMicLine />}
          </Button>
          <Button size="sm" variant="secondary" leadingIcon={<RiStopFill />}>
            Stop
          </Button>
        </div>
      </div>
      <div className="flex min-h-12 items-center gap-3 rounded-full border border-border bg-card ps-3 pe-1.5 text-card-foreground">
        <AssistantOrb variant={variant === "waveform" ? "orb" : variant} state={state} level={level} size={28} label="" />
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground" role="status">
          {voiceCopy[state].bar}
        </span>
        <Button size="icon-sm" aria-label="Send" className="rounded-full">
          <RiArrowUpLine />
        </Button>
      </div>
    </div>
  );
}

const looks = [
  { id: "stock", label: "Colour" },
  { id: "paper", label: "Paper" },
] as const;

export function AssistantOrbPickerDemo() {
  const [variant, setVariant] = React.useState<AssistantOrbVariant>("string");
  const [state, setState] = React.useState<AssistantOrbState>("listening");
  const level = useFakeLevel(state);
  const swatchLevel = useFakeLevel("listening");
  return (
    <Demo
      id="assistant-orb-picker"
      title="Choose your orb"
      description="Every look as a user setting. Pick one and the voice card and the composer switch to it; the arrow keys move through the styles. Every look takes the same props (state, level, size, label, paused). The waveform shows as the glass orb in the 28 px composer."
      align="start"
      canvasClassName="@container space-y-6"
    >
      <RadioGroup
        aria-label="Orb style"
        orientation="horizontal"
        value={variant}
        onValueChange={(v) => setVariant(v as AssistantOrbVariant)}
        className="grid grid-cols-2 gap-3 @xl:grid-cols-4"
      >
        {assistantOrbVariants.map((v) => (
          <RadioCard
            key={v}
            value={v}
            className="p-3"
            label={
              <span className="grid justify-items-center gap-2 text-center">
                <span className="grid h-14 place-items-center" aria-hidden="true">
                  <OrbSwatch variant={v} state="listening" level={swatchLevel} size={48} />
                </span>
                {assistantOrbVariantLabels[v]}
              </span>
            }
          />
        ))}
      </RadioGroup>
      <SegmentedControl
        size="sm"
        aria-label="State"
        value={state}
        onValueChange={(v) => setState(v as AssistantOrbState)}
        options={assistantOrbStates.map((x) => ({ value: x, label: captions[x] }))}
      />
      <div className="grid grid-cols-1 gap-4 @container lg:grid-cols-2">
        {looks.map((look) => (
          <div
            key={look.id}
            data-style={look.id === "paper" ? "paper" : undefined}
            className="min-w-0 space-y-3 rounded-box border border-border bg-background p-4 text-foreground"
          >
            <DemoLabel>{look.label}</DemoLabel>
            <VoicePreview variant={variant} state={state} level={level} />
          </div>
        ))}
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Every look in every state                                           */
/* ------------------------------------------------------------------ */

export function AssistantOrbLooksDemo() {
  const [look, setLook] = React.useState<"stock" | "paper">("paper");
  const listening = useFakeLevel("listening");
  const speaking = useFakeLevel("speaking");
  return (
    <Demo
      id="assistant-orb-looks"
      title="Every look in every state"
      description="Each state has its own shape in every look, so it reads without motion and at a glance: compare a row. Error and muted are still poses. The level plays along for listening and speaking."
      align="start"
      canvasClassName="space-y-4"
    >
      <SegmentedControl
        size="sm"
        aria-label="Look"
        value={look}
        onValueChange={(v) => setLook(v as "stock" | "paper")}
        options={looks.map((l) => ({ value: l.id, label: l.label }))}
      />
      <div data-style={look === "paper" ? "paper" : undefined} className="overflow-x-auto rounded-box border border-border bg-background p-4 text-foreground">
        <table className="w-full min-w-[640px] border-collapse text-xs">
          <thead>
            <tr>
              <th scope="col" className="pb-3 text-start font-medium text-muted-foreground">
                Look
              </th>
              {assistantOrbStates.map((x) => (
                <th key={x} scope="col" className="pb-3 font-medium text-muted-foreground">
                  {captions[x]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assistantOrbVariants.map((v) => (
              <tr key={v} className="border-t border-border">
                <th scope="row" className="py-3 pe-3 text-start font-medium">
                  {assistantOrbVariantLabels[v]}
                </th>
                {assistantOrbStates.map((x) => (
                  <td key={x} className="py-3 text-center">
                    <span className="inline-grid h-16 place-items-center">
                      <OrbSwatch variant={v} state={x} level={x === "listening" ? listening : x === "speaking" ? speaking : 0} size={56} />
                    </span>
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

/* ------------------------------------------------------------------ */
/* Sizes 32 to 240, paper and colour                                   */
/* ------------------------------------------------------------------ */

const LOOK_SIZES = [32, 48, 64, 96, 160, 240] as const;
/** The bars take their height as the size (three times as wide), so they stop at 96. */
const BAR_SIZES = [24, 32, 48, 64, 96] as const;

export function AssistantOrbLookSizesDemo() {
  const [variant, setVariant] = React.useState<AssistantOrbVariant>("string");
  const [state, setState] = React.useState<AssistantOrbState>("listening");
  const level = useFakeLevel(state);
  return (
    <Demo
      id="assistant-orb-look-sizes"
      title="Every look from 32 to 240 px"
      description="The ink looks keep their state shapes at 32 px: the mala drops to eight larger beads, the rings to two loops, the halftone to a coarse screen, and the string turns into the square logo below 48 px. The bars (waveform, string) take the size as their height, so they stop at 96."
      align="start"
      canvasClassName="space-y-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          size="sm"
          aria-label="Look"
          value={variant}
          onValueChange={(v) => setVariant(v as AssistantOrbVariant)}
          options={assistantOrbVariants.map((v) => ({ value: v, label: assistantOrbVariantLabels[v] }))}
        />
        <SegmentedControl
          size="sm"
          aria-label="State"
          value={state}
          onValueChange={(v) => setState(v as AssistantOrbState)}
          options={assistantOrbStates.map((x) => ({ value: x, label: captions[x] }))}
        />
      </div>
      <div className="grid grid-cols-1 gap-4">
        {looks.map((look) => (
          <div
            key={look.id}
            data-style={look.id === "paper" ? "paper" : undefined}
            className="min-w-0 space-y-3 overflow-x-auto rounded-box border border-border bg-background p-4 text-foreground"
          >
            <DemoLabel>{look.label}</DemoLabel>
            <div className="flex items-end gap-6">
              {(variant === "waveform" || variant === "string" ? BAR_SIZES : LOOK_SIZES).map((size) => (
                <figure key={size} className="m-0 grid shrink-0 justify-items-center gap-2">
                  <AssistantOrb variant={variant} state={state} level={level} size={size} />
                  <figcaption className="font-mono text-xs text-muted-foreground">{size}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Demo>
  );
}
