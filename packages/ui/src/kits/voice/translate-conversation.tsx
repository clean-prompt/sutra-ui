import * as React from "react";
import { RiMicLine, RiVolumeUpLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { Button } from "../../primitives/button";
import { AudioLevelMeter } from "./voice";
import { languageDir, getLanguage } from "./translate-languages";

/* ------------------------------------------------------------------ */
/* ConversationTurns                                                   */
/* ------------------------------------------------------------------ */

export interface ConversationSpeaker {
  lang: string;
  /** Display name. Defaults to the language name. */
  label?: string;
}

export interface ConversationTurn {
  id: string;
  speaker: "left" | "right";
  original: string;
  translation: string;
}

export type ConversationLiveState = "idle" | "hearing" | "translating" | "speaking";

export interface ConversationTurnsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The speaker on the left (name, language and avatar). */
  left: ConversationSpeaker;
  /** The speaker on the right (name, language and avatar). */
  right: ConversationSpeaker;
  /** Finished turns in order, each with a speaker, original text and translation. */
  turns: ConversationTurn[];
  /** Who is active and what is happening. */
  live?: { speaker: "left" | "right"; state: ConversationLiveState; level?: number; text?: string } | null;
  /** Called with `left` or `right` when the user presses a speaker's microphone button. */
  onMicPress?: (speaker: "left" | "right") => void;
  /** Shown when there are no turns and nothing is live. */
  emptyState?: React.ReactNode;
}

const liveWords: Record<ConversationLiveState, string> = { idle: "Tap to speak", hearing: "Listening…", translating: "Translating…", speaking: "Speaking…" };

/** Interpreter mode: two speakers left/right with live state, and a log of original + translated turns. */
export const ConversationTurns = React.forwardRef<HTMLDivElement, ConversationTurnsProps>(
  ({ left, right, turns, live, onMicPress, emptyState, className, ...props }, ref) => {
    const logRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
      const el = logRef.current;
      if (el && typeof el.scrollTo === "function") el.scrollTo({ top: el.scrollHeight });
    }, [turns.length]);
    const speakers = { left, right };
    const nameOf = (s: ConversationSpeaker) => s.label ?? getLanguage(s.lang)?.name ?? s.lang;
    const panel = (side: "left" | "right") => {
      const sp = speakers[side];
      const state: ConversationLiveState = live?.speaker === side ? live.state : "idle";
      const activeMic = state === "hearing";
      return (
        // rtl-physical x1: speaker panels are named left and right (the conversation root is dir=ltr)
        <div data-side={side} data-state={state} className={cn("flex flex-1 items-center gap-3 rounded-box border border-border bg-card p-3", side === "right" && "flex-row-reverse text-right", state !== "idle" && "border-primary/50 ring-1 ring-primary/30")}>
          <Button
            type="button"
            size="icon-lg"
            variant={activeMic ? "destructive" : "secondary"}
            aria-pressed={activeMic}
            aria-label={activeMic ? `Stop listening (${nameOf(sp)})` : `Speak ${nameOf(sp)}`}
            onClick={() => onMicPress?.(side)}
            className="rounded-full"
          >
            {state === "speaking" ? <RiVolumeUpLine aria-hidden /> : <RiMicLine aria-hidden />}
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{nameOf(sp)}</p>
            <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", side === "right" && "justify-end")}>
              <span aria-live="polite">{liveWords[state]}</span>
              {state === "hearing" ? <AudioLevelMeter level={live?.level ?? 0} size="sm" tone="destructive" label={`${nameOf(sp)} input level`} /> : null}
            </div>
            {live?.speaker === side && live.text && state !== "idle" ? (
              <p lang={sp.lang} dir={languageDir(sp.lang)} className="mt-1 truncate text-sm italic text-muted-foreground">
                {live.text}
              </p>
            ) : null}
          </div>
        </div>
      );
    };
    return (
      <div ref={ref} dir="ltr" className={cn("flex flex-col gap-3", className)} {...props}>
        {turns.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-box border border-dashed border-border p-6 text-center">
            <RiMicLine aria-hidden="true" className="size-6 text-muted-foreground" />
            {emptyState ?? (
              <>
                <p className="text-sm font-medium text-foreground">No conversation yet</p>
                <p className="text-sm text-muted-foreground">Tap a microphone and start speaking. Each turn is translated for the other person.</p>
              </>
            )}
          </div>
        ) : (
          <div ref={logRef} role="log" aria-label="Conversation" className="max-h-96 overflow-y-auto scrollbar-thin">
          <ol className="flex flex-col gap-2">
            {turns.map((t) => {
              const from = speakers[t.speaker];
              const to = speakers[t.speaker === "left" ? "right" : "left"];
              return (
                <li key={t.id} data-speaker={t.speaker} className={cn("flex", t.speaker === "right" && "justify-end")}>
                  {/* rtl-physical x1: speaker bubbles are named left and right (the conversation root is dir=ltr) */}
                  <div className={cn("max-w-[80%] rounded-box px-3 py-2", t.speaker === "left" ? "rounded-bl-sm bg-muted" : "rounded-br-sm bg-primary-soft text-primary-soft-foreground")}>
                    <p className="sr-only">{nameOf(from)}:</p>
                    <p lang={from.lang} dir={languageDir(from.lang)} className="text-xs opacity-70">
                      {t.original}
                    </p>
                    <p lang={to.lang} dir={languageDir(to.lang)} className="text-base">
                      {t.translation}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          {panel("left")}
          {panel("right")}
        </div>
      </div>
    );
  }
);
ConversationTurns.displayName = "ConversationTurns";
