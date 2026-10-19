import * as React from "react";
import { Button, InlineCode, MorphPill, Text, formatClock, useCountdown } from "@sutra/ui";
import { RiCheckLine, RiCloseLine, RiPauseLine, RiPlayLine, RiTimerLine } from "@sutra/ui/icons";
import { Demo, DemoLabel } from "../components/demo";

type Mode = "idle" | "picker" | "timer" | "status";
/** Seconds: a 10 s one so the whole run (timer, then status) can be seen at once. */
const lengths = [10, 300, 900, 1500];
const nameOf = (s: number) => (s < 60 ? `${s} s` : `${s / 60} min`);

function Timer({ seconds, onDone, onCancel }: { seconds: number; onDone: () => void; onCancel: () => void }) {
  const [deadline] = React.useState(() => Date.now() + seconds * 1000);
  const { remainingMs } = useCountdown(deadline, { onExpire: onDone, interval: 1000 });
  return (
    <div className="flex items-center gap-3 py-2 ps-4 pe-2 text-sm">
      <RiTimerLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="font-mono tabular-nums">{formatClock(Math.ceil(remainingMs / 1000))}</span>
      <Button size="icon-xs" variant="ghost" aria-label="Stop timer" onClick={onCancel}>
        <RiCloseLine />
      </Button>
    </div>
  );
}

function FocusPill({ spring }: { spring?: "gentle" | "snappy" | "bouncy" }) {
  const [mode, setMode] = React.useState<Mode>("idle");
  const [seconds, setSeconds] = React.useState(10);
  return (
    <MorphPill<Mode>
      spring={spring}
      label="Focus timer"
      state={mode}
      onStateChange={setMode}
      announcement={mode === "timer" ? `Focus timer running, ${nameOf(seconds)}` : mode === "status" ? "Focus session saved" : ""}
      states={{
        idle: ({ setState }) => (
          <Button variant="ghost" className="m-1" leadingIcon={<RiPlayLine />} onClick={() => setState("picker")}>
            Focus
          </Button>
        ),
        picker: ({ setState }) => (
          <div className="space-y-2 p-3">
            <p className="text-xs font-medium text-muted-foreground">How long?</p>
            <div className="flex flex-wrap gap-1.5">
              {lengths.map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={m === seconds ? "primary" : "outline"}
                  aria-pressed={m === seconds}
                  onClick={() => setSeconds(m)}
                >
                  {nameOf(m)}
                </Button>
              ))}
            </div>
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setState("idle")}>
                Cancel
              </Button>
              <Button size="sm" leadingIcon={<RiPauseLine />} onClick={() => setState("timer")}>
                Start
              </Button>
            </div>
          </div>
        ),
        timer: ({ setState }) => <Timer seconds={seconds} onDone={() => setState("status")} onCancel={() => setState("idle")} />,
        status: ({ setState }) => (
          <div className="flex items-center gap-2 py-2 ps-4 pe-2 text-sm">
            <RiCheckLine aria-hidden className="size-4 shrink-0 text-success" />
            <span>Session saved</span>
            <Button size="xs" variant="ghost" onClick={() => setState("idle")}>
              Done
            </Button>
          </div>
        ),
      }}
    />
  );
}

/** MorphPill: one surface through idle, picker, timer and status. */
export function MorphPillDemo() {
  return (
    <Demo
      id="morph-pill"
      title="Morph Pill"
      description={
        <>
          One surface that changes size between states: its width and height follow the measured content on a spring token (<InlineCode>spring</InlineCode>{" "}
          snappy, gentle or bouncy) and the new content fades in. Controlled with <InlineCode>state</InlineCode> here; a state's content can also be a function
          with <InlineCode>setState</InlineCode>. Reduced motion: the pill and its content swap at once. Keyboard: every state is real buttons, in order.
        </>
      }
      align="start"
      canvasClassName="@container"
    >
      <div className="grid grid-cols-1 gap-8 @2xl:grid-cols-3">
        <div className="min-w-0 space-y-2">
          <DemoLabel>Focus timer (snappy): Focus, pick a length, Start</DemoLabel>
          <FocusPill />
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>spring="bouncy"</DemoLabel>
          <FocusPill spring="bouncy" />
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>spring="gentle", narrow container</DemoLabel>
          <div className="w-40 max-w-full">
            <FocusPill spring="gentle" />
          </div>
          <Text size="sm" tone="neutral">
            A narrow container clips the pill instead of overflowing.
          </Text>
        </div>
      </div>
    </Demo>
  );
}
