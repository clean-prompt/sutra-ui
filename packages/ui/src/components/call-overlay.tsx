import * as React from "react";
import {
  RiComputerLine,
  RiMessage2Line,
  RiMicLine,
  RiMicOffLine,
  RiPhoneFill,
  RiVideoOffLine,
  RiVideoOnFill,
  RiVideoOnLine,
  RiVolumeMuteLine,
  RiVolumeUpLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { toneClasses } from "../lib/tone";
import { useControllableState } from "../hooks/use-controllable-state";
import { useIsoLayoutEffect } from "../hooks/use-iso-layout-effect";
import { useNow } from "../hooks/use-now";
import { formatClock } from "../lib/duration";
import { toMs } from "../lib/time";
import { Avatar } from "./avatar";

export type CallType = "video" | "audio";

/** `mm:ss`, or `h:mm:ss` past an hour. */
export function formatCallDuration(totalSeconds: number) {
  return formatClock(totalSeconds, { padMinutes: true });
}

/* ------------------------------------------------------------------ */
/* IncomingCall                                                        */
/* ------------------------------------------------------------------ */

export interface IncomingCallProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Caller display name. */
  name: string;
  avatarSrc?: string;
  /** Custom avatar node (overrides `avatarSrc`). */
  avatar?: React.ReactNode;
  type?: CallType;
  /** Extra line under the call type, e.g. "Sutra Mail · work". */
  subtitle?: React.ReactNode;
  onAccept?: () => void;
  onDecline?: () => void;
  /** Shows a "Message" quick-reply action. */
  onMessage?: () => void;
  /** Auto-dismiss after this many ms (calls `onTimeout`, else `onDecline`). `0` disables. Default 30000. */
  ringFor?: number;
  onTimeout?: () => void;
  /** `card` renders inline; `overlay` covers the viewport with a scrim. */
  variant?: "card" | "overlay";
}

/** Ringing incoming call card with pulsing avatar rings and Accept / Decline / Message actions. */
export const IncomingCall = React.forwardRef<HTMLDivElement, IncomingCallProps>(
  (
    {
      name,
      avatarSrc,
      avatar,
      type = "audio",
      subtitle,
      onAccept,
      onDecline,
      onMessage,
      ringFor = 30000,
      onTimeout,
      variant = "card",
      className,
      ...props
    },
    ref
  ) => {
    const titleId = React.useId();
    const descId = React.useId();
    const timeoutRef = React.useRef(onTimeout ?? onDecline);
    timeoutRef.current = onTimeout ?? onDecline;
    const acceptRef = React.useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
      if (!ringFor) return;
      const t = setTimeout(() => timeoutRef.current?.(), ringFor);
      return () => clearTimeout(t);
    }, [ringFor]);

    React.useEffect(() => {
      if (variant === "overlay") acceptRef.current?.focus();
    }, [variant]);

    const card = (
      <div
        ref={variant === "card" ? ref : undefined}
        role="alertdialog"
        aria-labelledby={titleId}
        aria-describedby={descId}
        aria-modal={variant === "overlay" || undefined}
        onKeyDown={(e) => {
          if (e.key === "Escape") onDecline?.();
        }}
        className={cn(
          "relative flex w-full max-w-xs flex-col items-center gap-5 overflow-hidden rounded-box border border-border bg-card p-6 text-card-foreground shadow-2xl",
          variant === "overlay" && "animate-in fade-in-0 zoom-in-95",
          variant === "card" && className
        )}
        {...(variant === "card" ? props : {})}
      >
        <div className="relative mt-2 flex size-24 items-center justify-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden
              className="absolute inset-0 rounded-full border-2 border-success/50 motion-safe:animate-ping motion-reduce:hidden"
              style={{ animationDuration: "2.4s", animationDelay: `${i * 0.8}s` }}
            />
          ))}
          <span aria-hidden className="absolute -inset-2 rounded-full bg-success/10" />
          {avatar ?? <Avatar size="2xl" name={name} src={avatarSrc} className="size-24 text-2xl" />}
        </div>
        <div className="space-y-1 text-center">
          <p id={titleId} className="text-lg font-semibold text-foreground">
            {name}
          </p>
          <p id={descId} className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            {type === "video" ? <RiVideoOnFill aria-hidden className="size-4" /> : <RiPhoneFill aria-hidden className="size-4" />}
            {type === "video" ? "Incoming video call" : "Incoming audio call"}
          </p>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex w-full items-start justify-around gap-4">
          <CallRoundAction label="Decline" tone="destructive" onClick={onDecline}>
            <RiPhoneFill aria-hidden className="rotate-[135deg]" />
          </CallRoundAction>
          {onMessage ? (
            <CallRoundAction label="Message" tone="neutral" onClick={onMessage}>
              <RiMessage2Line aria-hidden />
            </CallRoundAction>
          ) : null}
          <CallRoundAction ref={acceptRef} label="Accept" tone="success" onClick={onAccept} className="motion-safe:animate-bounce [animation-duration:1.6s]">
            {type === "video" ? <RiVideoOnFill aria-hidden /> : <RiPhoneFill aria-hidden />}
          </CallRoundAction>
        </div>
      </div>
    );

    if (variant === "card") return card;
    return (
      <div ref={ref} className={cn("fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-sm", className)} {...props}>
        {card}
      </div>
    );
  }
);
IncomingCall.displayName = "IncomingCall";

const roundTone = {
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive-hover",
  success: "bg-success text-success-foreground hover:bg-success/90",
  neutral: "bg-muted text-foreground hover:bg-border",
};

const CallRoundAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone: keyof typeof roundTone }
>(({ label, tone, className, children, ...props }, ref) => (
  <div className="flex flex-col items-center gap-1.5">
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        "flex size-14 items-center justify-center rounded-full shadow-md transition-[background-color,transform] active:scale-95 [&_svg]:size-6",
        roundTone[tone],
        focusRing,
        className
      )}
      {...props}
    >
      {children}
    </button>
    <span aria-hidden className="text-xs text-muted-foreground">
      {label}
    </span>
  </div>
));
CallRoundAction.displayName = "CallRoundAction";

/* ------------------------------------------------------------------ */
/* CallScreen                                                          */
/* ------------------------------------------------------------------ */

export type CallQuality = "excellent" | "good" | "poor" | "offline";
export type CallPipCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const qualityBars: Record<CallQuality, number> = { excellent: 4, good: 3, poor: 1, offline: 0 };
const qualityColor: Record<CallQuality, string> = {
  excellent: toneClasses.dot.success,
  good: toneClasses.dot.success,
  poor: toneClasses.dot.warning,
  offline: toneClasses.dot.destructive,
};

export interface CallQualityIndicatorProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  quality: CallQuality;
}

/** Four-bar connection quality indicator. */
export const CallQualityIndicator = React.forwardRef<HTMLSpanElement, CallQualityIndicatorProps>(function CallQualityIndicator(
  { quality, className, ...props },
  ref
) {
  const bars = qualityBars[quality];
  return (
    <span ref={ref} role="img" aria-label={`Connection ${quality}`} data-quality={quality} className={cn("inline-flex h-3.5 items-end gap-0.5", className)} {...props}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-full", i <= bars ? qualityColor[quality] : "bg-white/30")}
          style={{ height: `${i * 25}%` }}
        />
      ))}
    </span>
  );
});
CallQualityIndicator.displayName = "CallQualityIndicator";

/** Callback ref that keeps `srcObject` in sync with the current `<video>` node and stream (survives remounts of the element). */
function useStreamVideo(stream: MediaStream | null | undefined) {
  const [video, setVideo] = React.useState<HTMLVideoElement | null>(null);
  useIsoLayoutEffect(() => {
    if (video && video.srcObject !== (stream ?? null)) video.srcObject = stream ?? null;
  }, [video, stream]);
  useIsoLayoutEffect(() => {
    if (!video) return;
    return () => {
      video.srcObject = null;
    };
  }, [video]);
  return setVideo;
}

const pipCornerClass: Record<CallPipCorner, string> = {
  "top-left": "top-4 left-4",
  "top-right": "top-4 right-4",
  "bottom-left": "bottom-24 left-4",
  "bottom-right": "bottom-24 right-4",
};

export interface CallScreenProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Remote participant name. */
  name: string;
  avatarSrc?: string;
  type?: CallType;
  /** Remote video as a node (e.g. your own `<video>` or a placeholder). */
  remote?: React.ReactNode;
  /** Remote stream piped into a `<video>` (the component never creates streams). */
  remoteStream?: MediaStream | null;
  /** Local preview node. */
  local?: React.ReactNode;
  localStream?: MediaStream | null;
  /** Mirror the local preview. Default true. */
  mirrorLocal?: boolean;
  /** Call start time; duration counts from mount when omitted. */
  startedAt?: Date | number;
  /** Status text instead of the timer, e.g. "Connecting…". */
  status?: React.ReactNode;
  quality?: CallQuality;
  muted?: boolean;
  defaultMuted?: boolean;
  onMutedChange?: (muted: boolean) => void;
  cameraOff?: boolean;
  defaultCameraOff?: boolean;
  onCameraOffChange?: (off: boolean) => void;
  screenSharing?: boolean;
  defaultScreenSharing?: boolean;
  onScreenSharingChange?: (sharing: boolean) => void;
  speakerOn?: boolean;
  defaultSpeakerOn?: boolean;
  onSpeakerOnChange?: (on: boolean) => void;
  /** Hide the screen share control. */
  hideScreenShare?: boolean;
  onEndCall?: () => void;
  pipCorner?: CallPipCorner;
  defaultPipCorner?: CallPipCorner;
  onPipCornerChange?: (corner: CallPipCorner) => void;
}

/** In-call layout: remote video, draggable mirrored self-view, timer, quality and a control bar. */
export const CallScreen = React.forwardRef<HTMLDivElement, CallScreenProps>(
  (
    {
      name,
      avatarSrc,
      type = "video",
      remote,
      remoteStream,
      local,
      localStream,
      mirrorLocal = true,
      startedAt,
      status,
      quality = "good",
      muted: mutedProp,
      defaultMuted = false,
      onMutedChange,
      cameraOff: cameraOffProp,
      defaultCameraOff = type === "audio",
      onCameraOffChange,
      screenSharing: sharingProp,
      defaultScreenSharing = false,
      onScreenSharingChange,
      speakerOn: speakerProp,
      defaultSpeakerOn = true,
      onSpeakerOnChange,
      hideScreenShare,
      onEndCall,
      pipCorner: cornerProp,
      defaultPipCorner = "bottom-right",
      onPipCornerChange,
      className,
      ...props
    },
    ref
  ) => {
    const [muted, setMuted] = useControllableState({ value: mutedProp, defaultValue: defaultMuted, onChange: onMutedChange });
    const [cameraOff, setCameraOff] = useControllableState({ value: cameraOffProp, defaultValue: defaultCameraOff, onChange: onCameraOffChange });
    const [sharing, setSharing] = useControllableState({ value: sharingProp, defaultValue: defaultScreenSharing, onChange: onScreenSharingChange });
    const [speaker, setSpeaker] = useControllableState({ value: speakerProp, defaultValue: defaultSpeakerOn, onChange: onSpeakerOnChange });
    const [corner, setCorner] = useControllableState({ value: cornerProp, defaultValue: defaultPipCorner, onChange: onPipCornerChange });

    const [mountedAt] = React.useState(() => Date.now());
    const start = (startedAt === undefined ? undefined : toMs(startedAt)) ?? mountedAt;
    const now = useNow();
    const seconds = Math.max(0, Math.floor((now - start) / 1000));

    const remoteRef = useStreamVideo(remoteStream);
    const localRef = useStreamVideo(localStream);

    const stageRef = React.useRef<HTMLDivElement>(null);
    const [drag, setDrag] = React.useState<{ x: number; y: number; dx: number; dy: number } | null>(null);

    const onPipPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setDrag({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
    };
    const onPipPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag) return;
      setDrag({ ...drag, dx: e.clientX - drag.x, dy: e.clientY - drag.y });
    };
    const onPipPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag) return;
      const rect = stageRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0 && (Math.abs(drag.dx) > 4 || Math.abs(drag.dy) > 4)) {
        const left = e.clientX - rect.left < rect.width / 2;
        const top = e.clientY - rect.top < rect.height / 2;
        setCorner(`${top ? "top" : "bottom"}-${left ? "left" : "right"}` as CallPipCorner);
      }
      setDrag(null);
    };
    const onPipKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const [v, h] = corner.split("-") as ["top" | "bottom", "left" | "right"];
      const next =
        e.key === "ArrowUp" ? `top-${h}` : e.key === "ArrowDown" ? `bottom-${h}` : e.key === "ArrowLeft" ? `${v}-left` : e.key === "ArrowRight" ? `${v}-right` : null;
      if (!next) return;
      e.preventDefault();
      setCorner(next as CallPipCorner);
    };

    const showRemoteVideo = remote !== undefined || remoteStream;

    return (
      <div
        ref={ref}
        role="region"
        aria-label={`Call with ${name}`}
        className={cn("relative isolate flex min-h-96 w-full flex-col overflow-hidden rounded-box bg-neutral-950 text-white", className)}
        {...props}
      >
        <div ref={stageRef} className="absolute inset-0 -z-10">
          {remote !== undefined ? (
            remote
          ) : remoteStream ? (
            <video ref={remoteRef} autoPlay playsInline className="size-full object-cover" aria-label={`${name}'s video`} />
          ) : null}
          {!showRemoteVideo ? (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950">
              <Avatar size="2xl" name={name} src={avatarSrc} className="size-28 text-3xl" />
            </div>
          ) : null}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />
        </div>

        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{name}</p>
            <p className="flex items-center gap-2 text-sm text-white/75">
              {status ?? (
                <span role="timer" aria-label={`Call duration ${formatCallDuration(seconds)}`} className="tabular-nums">
                  {formatCallDuration(seconds)}
                </span>
              )}
            </p>
          </div>
          <CallQualityIndicator quality={quality} className="mt-1.5" />
        </div>

        {type === "video" ? (
          <div
            role="group"
            tabIndex={0}
            aria-label={`Your video, ${corner.replace("-", " ")}. Drag or use arrow keys to move.`}
            data-corner={corner}
            onPointerDown={onPipPointerDown}
            onPointerMove={onPipPointerMove}
            onPointerUp={onPipPointerUp}
            onPointerCancel={() => setDrag(null)}
            onKeyDown={onPipKeyDown}
            className={cn(
              "absolute z-10 aspect-[3/4] w-24 cursor-grab touch-none overflow-hidden rounded-xl border border-white/20 bg-neutral-800 shadow-xl sm:w-32",
              "transition-[top,left,right,bottom] duration-300 ease-out",
              drag && "cursor-grabbing transition-none",
              pipCornerClass[corner],
              focusRing
            )}
            style={drag ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}
          >
            {cameraOff ? (
              <div className="flex size-full items-center justify-center text-white/70">
                <RiVideoOffLine aria-hidden className="size-6" />
              </div>
            ) : local !== undefined ? (
              <div className={cn("size-full", mirrorLocal && "-scale-x-100")}>{local}</div>
            ) : (
              <video
                ref={localRef}
                autoPlay
                playsInline
                muted
                aria-hidden
                className={cn("size-full object-cover", mirrorLocal && "-scale-x-100")}
              />
            )}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-center gap-3 p-4">
          <CallControl label="Mute" pressed={muted} onClick={() => setMuted(!muted)}>
            {muted ? <RiMicOffLine aria-hidden /> : <RiMicLine aria-hidden />}
          </CallControl>
          <CallControl label="Camera off" pressed={cameraOff} onClick={() => setCameraOff(!cameraOff)}>
            {cameraOff ? <RiVideoOffLine aria-hidden /> : <RiVideoOnLine aria-hidden />}
          </CallControl>
          {hideScreenShare ? null : (
            <CallControl label="Share screen" pressed={sharing} onClick={() => setSharing(!sharing)}>
              <RiComputerLine aria-hidden />
            </CallControl>
          )}
          <CallControl label="Speaker" pressed={speaker} onClick={() => setSpeaker(!speaker)}>
            {speaker ? <RiVolumeUpLine aria-hidden /> : <RiVolumeMuteLine aria-hidden />}
          </CallControl>
          <button
            type="button"
            aria-label="End call"
            onClick={onEndCall}
            className={cn(
              "flex h-12 w-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition-[background-color,transform] hover:bg-destructive-hover active:scale-95 [&_svg]:size-6",
              focusRing
            )}
          >
            <RiPhoneFill aria-hidden className="rotate-[135deg]" />
          </button>
        </div>
      </div>
    );
  }
);
CallScreen.displayName = "CallScreen";

function CallControl({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "flex size-12 items-center justify-center rounded-full backdrop-blur-md transition-[background-color,transform] active:scale-95 [&_svg]:size-5",
        pressed ? "bg-white text-neutral-900 hover:bg-white/90" : "bg-white/15 text-white hover:bg-white/25",
        focusRing
      )}
    >
      {children}
    </button>
  );
}
