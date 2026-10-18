import * as React from "react";
import { RiMicLine, RiStopFill, RiVolumeUpLine, RiStopCircleLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { normalizeTone, toneClasses, type ToneInput } from "../lib/tone";
import { formatClock } from "../lib/duration";
import { useNow } from "../hooks/use-now";
import { Button, type ButtonProps } from "./button";

/* ------------------------------------------------------------------ */
/* Web Speech API typings (not in lib.dom)                             */
/* ------------------------------------------------------------------ */

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence?: number;
}
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionErrorEventLike {
  readonly error: string;
  readonly message?: string;
}
/** Minimal shape of a browser SpeechRecognition instance. */
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart?: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/* ------------------------------------------------------------------ */
/* useSpeechRecognition                                                */
/* ------------------------------------------------------------------ */

export interface UseSpeechRecognitionOptions {
  /** BCP-47 language, e.g. "hi-IN". Default the document language. */
  lang?: string;
  /** Keep listening across pauses. Default true. */
  continuous?: boolean;
  /** Report partial results. Default true. */
  interimResults?: boolean;
  /** Called with each finalized chunk. */
  onFinal?: (text: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export interface SpeechRecognitionState {
  supported: boolean;
  listening: boolean;
  /** Partial text of the current utterance. */
  interim: string;
  /** All finalized text since the last start/reset. */
  transcript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
  reset: () => void;
}

/** Web Speech API wrapper with interim/final transcript; inert (supported=false) where unavailable. */
export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}): SpeechRecognitionState {
  const { lang, continuous = true, interimResults = true } = options;
  const [supported, setSupported] = React.useState(() => getRecognitionCtor() != null);
  const [listening, setListening] = React.useState(false);
  const [interim, setInterim] = React.useState("");
  const [transcript, setTranscript] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const recRef = React.useRef<SpeechRecognitionLike | null>(null);
  const optsRef = React.useRef(options);
  optsRef.current = options;

  React.useEffect(() => setSupported(getRecognitionCtor() != null), []);
  React.useEffect(
    () => () => {
      // Detach first so the aborted recognizer's late onend/onerror are ignored.
      const rec = recRef.current;
      recRef.current = null;
      rec?.abort();
    },
    []
  );

  const start = React.useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("not-supported");
      return;
    }
    recRef.current?.abort();
    const rec = new Ctor();
    rec.lang = lang ?? (typeof document !== "undefined" ? document.documentElement.lang : "") ?? "";
    rec.continuous = continuous;
    rec.interimResults = interimResults;
    // Every handler checks it still belongs to the current recognizer: after a restart the old
    // one's late events (onend especially) must not flip the new session's state.
    rec.onresult = (e) => {
      if (recRef.current !== rec) return;
      let partial = "";
      let finalChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]!;
        const text = r[0]?.transcript ?? "";
        if (r.isFinal) finalChunk += text;
        else partial += text;
      }
      setInterim(partial);
      if (finalChunk) {
        setTranscript((t) => (t ? `${t} ${finalChunk.trim()}` : finalChunk.trim()));
        optsRef.current.onFinal?.(finalChunk.trim());
      }
    };
    rec.onerror = (e) => {
      if (recRef.current !== rec) return;
      setError(e.error);
      optsRef.current.onError?.(e.error);
    };
    rec.onend = () => {
      if (recRef.current !== rec) return;
      recRef.current = null;
      setListening(false);
      setInterim("");
      optsRef.current.onEnd?.();
    };
    recRef.current = rec;
    setError(null);
    setInterim("");
    setTranscript("");
    try {
      rec.start();
      setListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "start-failed");
      setListening(false);
    }
  }, [lang, continuous, interimResults]);

  const stop = React.useCallback(() => recRef.current?.stop(), []);
  const abort = React.useCallback(() => {
    recRef.current?.abort();
    setListening(false);
    setInterim("");
  }, []);
  const reset = React.useCallback(() => {
    setTranscript("");
    setInterim("");
    setError(null);
  }, []);

  return { supported, listening, interim, transcript, error, start, stop, abort, reset };
}

/* ------------------------------------------------------------------ */
/* useAudioLevel                                                       */
/* ------------------------------------------------------------------ */

/** Live RMS input level (0..1) of a MediaStream, sampled each animation frame. Returns 0 without a stream. */
export function useAudioLevel(stream: MediaStream | null | undefined, { smoothing = 0.6, gain = 3 }: { smoothing?: number; gain?: number } = {}) {
  const [level, setLevel] = React.useState(0);
  React.useEffect(() => {
    if (!stream || typeof window === "undefined") {
      setLevel(0);
      return;
    }
    const AC =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    let ctx: AudioContext;
    try {
      ctx = new AC();
    } catch {
      return;
    }
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    let raf = 0;
    let smoothed = 0;
    const loop = () => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i]! * buf[i]!;
      const rms = Math.sqrt(sum / buf.length);
      smoothed = smoothed * smoothing + Math.min(1, rms * gain) * (1 - smoothing);
      setLevel((prev) => (Math.abs(prev - smoothed) < 0.01 ? prev : smoothed));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      void ctx.close().catch(() => {});
      setLevel(0);
    };
  }, [stream, smoothing, gain]);
  return level;
}

/* ------------------------------------------------------------------ */
/* AudioLevelMeter                                                     */
/* ------------------------------------------------------------------ */

export interface AudioLevelMeterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0..1 */
  level: number;
  bars?: number;
  orientation?: "horizontal" | "vertical";
  size?: "sm" | "md" | "lg";
  /** Accessible name. Default "Input level". */
  label?: string;
  /** Bar colour. Canonical `Tone`; legacy `"muted"` maps to `neutral`. Default `primary`. */
  tone?: ToneInput;
}

const meterBox = {
  horizontal: { sm: "h-3 gap-0.5", md: "h-4 gap-0.5", lg: "h-6 gap-1" },
  vertical: { sm: "w-3 gap-0.5", md: "w-4 gap-0.5", lg: "w-6 gap-1" },
} as const;

/** Bars that light up with an audio level (0..1). Horizontal bars stand up like an equalizer. */
export const AudioLevelMeter = React.forwardRef<HTMLDivElement, AudioLevelMeterProps>(
  ({ level, bars = 5, orientation = "horizontal", size = "md", label = "Input level", tone, className, ...props }, ref) => {
    const bar = toneClasses.dot[normalizeTone(tone, "primary")];
    const v = Math.max(0, Math.min(1, Number.isFinite(level) ? level : 0));
    const horizontal = orientation === "horizontal";
    return (
      <div
        ref={ref}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(v * 100)}
        className={cn("inline-flex shrink-0", horizontal ? "flex-row items-center" : "flex-col-reverse items-center", meterBox[orientation][size], className)}
        {...props}
      >
        {Array.from({ length: bars }, (_, i) => {
          const center = 1 - Math.abs(i - (bars - 1) / 2) / ((bars + 1) / 2);
          const lit = horizontal ? Math.max(0.15, Math.min(1, v * (0.6 + center * 0.9))) : v > i / bars ? 1 : 0;
          return (
            <span
              key={i}
              data-slot="level-bar"
              data-lit={horizontal ? (v > 0.02 ? "" : undefined) : lit ? "" : undefined}
              className={cn(
                "block rounded-full transition-[height,width,opacity] duration-75 motion-reduce:transition-none",
                horizontal ? "w-1" : "h-1 w-full",
                horizontal ? (v > 0.02 ? bar : "bg-muted-foreground/30") : lit ? bar : "bg-muted-foreground/25"
              )}
              style={horizontal ? { height: `${lit * 100}%` } : undefined}
            />
          );
        })}
      </div>
    );
  }
);
AudioLevelMeter.displayName = "AudioLevelMeter";

/* ------------------------------------------------------------------ */
/* VoiceInput                                                          */
/* ------------------------------------------------------------------ */

export interface VoiceInputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onError"> {
  lang?: string;
  /** Called with each finalized phrase (`done: false`) and with the whole transcript when dictation stops (`done: true`). */
  onTranscript?: (text: string, info: { done: boolean }) => void;
  onError?: (error: string) => void;
  /** Auto-stop after this many seconds. Default 60. */
  maxDuration?: number;
  /** Rendered instead of nothing when speech recognition is unavailable. */
  fallback?: React.ReactNode;
  /** Show the interim transcript preview. Default true. */
  showTranscript?: boolean;
  /** Capture the mic for the level meter. Default true. */
  meter?: boolean;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

const micSize = { sm: "icon-sm", md: "icon", lg: "icon-lg" } as const;

function stopTracks(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Mic toggle with a live input-level ring, timer + max-duration countdown and interim transcript preview. */
export const VoiceInput = React.forwardRef<HTMLDivElement, VoiceInputProps>(
  ({ lang, onTranscript, onError, maxDuration = 60, fallback = null, showTranscript = true, meter = true, size = "md", disabled, className, ...props }, ref) => {
    const cbRef = React.useRef(onTranscript);
    cbRef.current = onTranscript;
    const sr = useSpeechRecognition({
      lang,
      onFinal: (t) => cbRef.current?.(t, { done: false }),
      onError,
    });
    const [stream, setStream] = React.useState<MediaStream | null>(null);
    // The live mic stream, owned here (not in state) so cleanup can always stop its tracks.
    const streamRef = React.useRef<MediaStream | null>(null);
    // Bumped on every start and every release: a getUserMedia result for an older token is stale.
    const startToken = React.useRef(0);
    const alive = React.useRef(true);
    const level = useAudioLevel(stream);
    const [startedAt, setStartedAt] = React.useState<number | null>(null);
    const now = useNow({ active: sr.listening, interval: 250 });
    const transcriptRef = React.useRef("");
    transcriptRef.current = sr.transcript;
    const wasListening = React.useRef(false);

    const releaseStream = React.useCallback(() => {
      startToken.current++;
      const s = streamRef.current;
      streamRef.current = null;
      stopTracks(s);
      setStream(null);
    }, []);

    React.useEffect(() => {
      if (wasListening.current && !sr.listening) {
        setStartedAt(null);
        releaseStream();
        if (transcriptRef.current) cbRef.current?.(transcriptRef.current, { done: true });
      }
      wasListening.current = sr.listening;
    }, [sr.listening, releaseStream]);

    // A failed start (error without ever listening) must not leave a pending mic request behind.
    React.useEffect(() => {
      if (sr.error && !sr.listening) releaseStream();
    }, [sr.error, sr.listening, releaseStream]);

    React.useEffect(() => {
      alive.current = true;
      return () => {
        alive.current = false;
        startToken.current++;
        const s = streamRef.current;
        streamRef.current = null;
        stopTracks(s);
      };
    }, []);

    const elapsed = startedAt != null ? Math.max(0, now - startedAt) / 1000 : 0;
    const left = Math.max(0, maxDuration - elapsed);
    React.useEffect(() => {
      if (sr.listening && startedAt != null && left <= 0) sr.stop();
    }, [sr, startedAt, left]);

    if (!sr.supported) return <>{fallback}</>;

    const start = () => {
      releaseStream();
      sr.start();
      setStartedAt(Date.now());
      if (meter && typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const token = ++startToken.current;
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((s) => {
            // Dictation stopped, restarted or the component unmounted while we waited: drop the stream.
            if (!alive.current || token !== startToken.current) {
              stopTracks(s);
              return;
            }
            streamRef.current = s;
            setStream(s);
          })
          .catch(() => {});
      }
    };
    const toggle = () => {
      if (sr.listening) {
        sr.stop();
        releaseStream();
      } else start();
    };
    const listening = sr.listening;
    const nearEnd = listening && left <= 10;

    return (
      <div ref={ref} data-listening={listening ? "" : undefined} className={cn("inline-flex min-w-0 items-center gap-2", className)} {...props}>
        <span className="relative inline-flex">
          {listening ? (
            <span
              aria-hidden="true"
              data-slot="level-ring"
              className="pointer-events-none absolute inset-0 rounded-full bg-destructive/25 transition-transform duration-75 motion-reduce:transition-none"
              style={{ transform: `scale(${1 + level * 0.6})` }}
            />
          ) : null}
          <Button
            type="button"
            size={micSize[size] as ButtonProps["size"]}
            variant={listening ? "destructive" : "ghost"}
            aria-pressed={listening}
            aria-label={listening ? "Stop dictation" : "Start dictation"}
            disabled={disabled}
            onClick={toggle}
            className="relative rounded-full"
          >
            {listening ? <RiStopFill aria-hidden /> : <RiMicLine aria-hidden />}
          </Button>
        </span>
        {listening ? (
          <>
            {meter ? <AudioLevelMeter level={level} bars={5} size="sm" tone="destructive" /> : null}
            <span className={cn("font-mono text-xs tabular-nums", nearEnd ? "text-destructive" : "text-muted-foreground")} data-slot="voice-timer">
              {formatClock(elapsed)}
              <span className="text-muted-foreground/60"> / {formatClock(maxDuration)}</span>
            </span>
            {nearEnd ? (
              <span className="text-xs text-destructive" role="status">
                Stops in {Math.ceil(left)}s
              </span>
            ) : null}
          </>
        ) : null}
        {showTranscript && listening && (sr.interim || sr.transcript) ? (
          <span data-slot="voice-interim" aria-live="polite" className="min-w-0 truncate text-sm text-muted-foreground">
            {sr.transcript}
            {sr.transcript && sr.interim ? " " : null}
            <span className="italic opacity-70">{sr.interim}</span>
          </span>
        ) : null}
        {sr.error && sr.error !== "aborted" && sr.error !== "no-speech" ? (
          <span role="alert" className="text-xs text-destructive">
            {sr.error === "not-allowed" ? "Microphone permission denied" : `Dictation error: ${sr.error}`}
          </span>
        ) : null}
      </div>
    );
  }
);
VoiceInput.displayName = "VoiceInput";

/* ------------------------------------------------------------------ */
/* useSpeechSynthesis + SpeakButton                                    */
/* ------------------------------------------------------------------ */

export interface SpeechSynthesisState {
  supported: boolean;
  voices: SpeechSynthesisVoice[];
  /** Best voice for `lang` (exact match first, then same base language). */
  voice: SpeechSynthesisVoice | null;
  speaking: boolean;
  speak: (text: string, opts?: { rate?: number; pitch?: number }) => void;
  cancel: () => void;
}

/** Find a voice for a BCP-47 tag: exact, then same base language. */
export function findVoiceForLang(voices: readonly SpeechSynthesisVoice[], lang: string | undefined) {
  if (!lang) return voices.find((v) => v.default) ?? voices[0] ?? null;
  const l = lang.toLowerCase();
  const base = l.split("-")[0];
  return (
    voices.find((v) => v.lang?.toLowerCase() === l) ??
    voices.find((v) => v.lang?.toLowerCase().replace("_", "-").split("-")[0] === base) ??
    null
  );
}

/** speechSynthesis wrapper: voices (async-loaded), voice for `lang`, speaking state, speak/cancel. */
export function useSpeechSynthesis(lang?: string): SpeechSynthesisState {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>(() => synth?.getVoices?.() ?? []);
  const [speaking, setSpeaking] = React.useState(false);
  const current = React.useRef<SpeechSynthesisUtterance | null>(null);

  React.useEffect(() => {
    if (!synth) return;
    const update = () => setVoices(synth.getVoices?.() ?? []);
    update();
    synth.addEventListener?.("voiceschanged", update);
    return () => synth.removeEventListener?.("voiceschanged", update);
  }, [synth]);

  React.useEffect(
    () => () => {
      if (current.current) synth?.cancel();
    },
    [synth]
  );

  const voice = React.useMemo(() => findVoiceForLang(voices, lang), [voices, lang]);

  const cancel = React.useCallback(() => {
    synth?.cancel();
    current.current = null;
    setSpeaking(false);
  }, [synth]);

  const speak = React.useCallback(
    (text: string, opts: { rate?: number; pitch?: number } = {}) => {
      if (!synth || typeof SpeechSynthesisUtterance === "undefined" || !text) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else if (lang) u.lang = lang;
      if (opts.rate) u.rate = opts.rate;
      if (opts.pitch) u.pitch = opts.pitch;
      const done = () => {
        if (current.current === u) {
          current.current = null;
          setSpeaking(false);
        }
      };
      u.onend = done;
      u.onerror = done;
      current.current = u;
      setSpeaking(true);
      synth.speak(u);
    },
    [synth, voice, lang]
  );

  return { supported: !!synth, voices, voice, speaking, speak, cancel };
}

export interface SpeakButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  text: string;
  /** BCP-47 language of `text`. */
  lang?: string;
  /** Accessible label while idle. Default "Listen". */
  label?: string;
  rate?: number;
}

/** Reads text aloud with the system voice for `lang`; hidden when no such voice exists. */
export const SpeakButton = React.forwardRef<HTMLButtonElement, SpeakButtonProps>(
  ({ text, lang, label = "Listen", rate, size = "icon-sm", variant = "ghost", className, ...props }, ref) => {
    const tts = useSpeechSynthesis(lang);
    if (!tts.supported || !tts.voice || !text) return null;
    return (
      <Button
        ref={ref}
        type="button"
        size={size}
        variant={variant}
        aria-label={tts.speaking ? "Stop speaking" : label}
        aria-pressed={tts.speaking}
        data-speaking={tts.speaking ? "" : undefined}
        onClick={() => (tts.speaking ? tts.cancel() : tts.speak(text, { rate }))}
        className={cn(tts.speaking && "text-primary", className)}
        {...props}
      >
        {tts.speaking ? <RiStopCircleLine aria-hidden /> : <RiVolumeUpLine aria-hidden />}
      </Button>
    );
  }
);
SpeakButton.displayName = "SpeakButton";
