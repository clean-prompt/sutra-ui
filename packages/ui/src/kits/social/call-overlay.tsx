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
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { cn, focusRing } from "../../lib/cn";
import { toneClasses } from "../../lib/tone";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useDrag } from "../../hooks/use-drag";
import { useMergedRefs } from "../../hooks/use-merged-refs";
import { useIsoLayoutEffect, useLatestRef } from "../../hooks/use-iso-layout-effect";
import { useNow } from "../../hooks/use-now";
import { formatClock } from "../../lib/duration";
import { toMs } from "../../lib/time";
import { Avatar } from "../../primitives/avatar";

export type CallType = "video" | "audio";

/**
 * `mm:ss`, or `h:mm:ss` past an hour.
 * @deprecated Use `formatClock(totalSeconds, { padMinutes: true })`.
 */
export function formatCallDuration(totalSeconds: number) {
  return formatClock(totalSeconds, { padMinutes: true });
}

/* ------------------------------------------------------------------ */
/* IncomingCall                                                        */
/* ------------------------------------------------------------------ */

export interface IncomingCallProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Caller display name. */
  name: string;
  /** Caller avatar image URL; initials are shown when unset. */
  avatarSrc?: string;
  /** Custom avatar node (overrides `avatarSrc`). */
  avatar?: React.ReactNode;
  /** `audio` or `video`; sets the call type line and the accept icon. Default "audio". */
  type?: CallType;
  /** Extra line under the call type, e.g. "Sutra Mail · work". */
  subtitle?: React.ReactNode;
  /** Called when the user accepts the call. */
  onAccept?: () => void;
  /** Called when the user declines the call, or when it rings out without `onTimeout`. */
  onDecline?: () => void;
  /** Shows a "Message" quick-reply action. */
  onMessage?: () => void;
  /** Auto-dismiss after this many ms (calls `onTimeout`, else `onDecline`). `0` disables. Default 30000. */
  ringFor?: number;
  /** Called when `ringFor` elapses; `onDecline` is called instead when unset. */
  onTimeout?: () => void;
  /**
   * `card` renders inline as a non-modal dialog (focus stays where it is; Escape inside it declines).
   * `overlay` is a modal alert dialog over a scrim: it focuses Accept, traps focus, hides the page
   * from assistive tech, declines on Escape and returns focus when it unmounts.
   */
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
    const timeoutRef = useLatestRef(onTimeout ?? onDecline);
    const acceptRef = React.useRef<HTMLButtonElement>(null);
    const modal = variant === "overlay";
    // Where focus was before the overlay opened (kept across StrictMode's simulated remount), restored on unmount.
    const returnFocus = React.useRef<HTMLElement | null>(null);
    useIsoLayoutEffect(() => {
      if (modal && !returnFocus.current && document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement;
    }, [modal]);

    React.useEffect(() => {
      if (!ringFor) return;
      const t = setTimeout(() => timeoutRef.current?.(), ringFor);
      return () => clearTimeout(t);
    }, [ringFor, timeoutRef]);

    const title = (
      <p {...(modal ? {} : { id: titleId })} className="text-lg font-semibold text-foreground">
        {name}
      </p>
    );
    const description = (
      <p {...(modal ? {} : { id: descId })} className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
        {type === "video" ? <RiVideoOnFill aria-hidden className="size-4" /> : <RiPhoneFill aria-hidden className="size-4" />}
        {type === "video" ? "Incoming video call" : "Incoming audio call"}
      </p>
    );

    const content = (
      <>
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
          {modal ? <AlertDialogPrimitive.Title asChild>{title}</AlertDialogPrimitive.Title> : title}
          {modal ? <AlertDialogPrimitive.Description asChild>{description}</AlertDialogPrimitive.Description> : description}
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
      </>
    );

    const cardClass = "relative flex w-full max-w-xs flex-col items-center gap-5 overflow-hidden rounded-box border border-border bg-card p-6 text-card-foreground shadow-2xl";

    if (!modal) {
      return (
        <div
          ref={ref}
          role="dialog"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className={cn(cardClass, className)}
          data-slot="incoming-call"
          {...props}
          onKeyDown={(e) => {
            props.onKeyDown?.(e);
            if (!e.defaultPrevented && e.key === "Escape") onDecline?.();
          }}
        >
          {content}
        </div>
      );
    }

    // Always open while mounted: the app unmounts it when the call is answered, declined or missed.
    return (
      <AlertDialogPrimitive.Root
        open
        onOpenChange={(open) => {
          if (!open) onDecline?.();
        }}
      >
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay
            ref={ref}
            className={cn("fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-sm", className)}
            data-slot="incoming-call"
            {...props}
          >
            <AlertDialogPrimitive.Content
              asChild
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                acceptRef.current?.focus();
              }}
              onCloseAutoFocus={(e) => {
                // There is no Radix trigger to go back to, so return focus to where it was.
                e.preventDefault();
                const el = returnFocus.current;
                if (el?.isConnected) el.focus();
              }}
            >
              <div className={cn(cardClass, "animate-in fade-in-0 zoom-in-95")}>{content}</div>
            </AlertDialogPrimitive.Content>
          </AlertDialogPrimitive.Overlay>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
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
        "flex size-14 items-center justify-center rounded-full shadow-md transition-[background-color,scale] active:scale-95 [&_svg]:size-6",
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
  /** Connection quality (`excellent`, `good`, `poor` or `offline`); sets the bars and tone. */
  quality: CallQuality;
}

/** Four-bar connection quality indicator. */
export const CallQualityIndicator = React.forwardRef<HTMLSpanElement, CallQualityIndicatorProps>(function CallQualityIndicator(
  { quality, className, ...props },
  ref
) {
  const bars = qualityBars[quality];
  return (
    <span ref={ref} role="img" aria-label={`Connection ${quality}`} data-quality={quality} className={cn("inline-flex h-3.5 items-end gap-0.5", className)} data-slot="call-quality-indicator" {...props}>
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
  // rtl-physical x4: PiP corners are named and snapped by physical position
  "top-left": "top-4 left-4",
  "top-right": "top-4 right-4",
  "bottom-left": "bottom-24 left-4",
  "bottom-right": "bottom-24 right-4",
};

export interface CallScreenProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Remote participant name. */
  name: string;
  /** Remote participant's avatar image URL, shown when there is no video. */
  avatarSrc?: string;
  /** `audio` or `video`; video calls show the video stage and camera controls. Default "video". */
  type?: CallType;
  /** Remote video as a node (e.g. your own `<video>` or a placeholder). */
  remote?: React.ReactNode;
  /** Remote stream piped into a `<video>` (the component never creates streams). */
  remoteStream?: MediaStream | null;
  /** Local preview node. */
  local?: React.ReactNode;
  /** Local camera stream piped into the preview `<video>`; the component never creates streams. */
  localStream?: MediaStream | null;
  /** Mirror the local preview. Default true. */
  mirrorLocal?: boolean;
  /** Call start time; duration counts from mount when omitted. */
  startedAt?: Date | number;
  /** Status text instead of the timer, e.g. "Connecting…". */
  status?: React.ReactNode;
  /** Connection quality shown as a quality indicator in the header. */
  quality?: CallQuality;
  /** Controlled microphone-muted state. */
  muted?: boolean;
  /** Initial muted state when `muted` is not controlled. */
  defaultMuted?: boolean;
  /** Called with the new state when the user toggles the microphone. */
  onMutedChange?: (muted: boolean) => void;
  /** Controlled camera-off state. */
  cameraOff?: boolean;
  /** Initial camera-off state when `cameraOff` is not controlled. */
  defaultCameraOff?: boolean;
  /** Called with the new state when the user toggles the camera. */
  onCameraOffChange?: (off: boolean) => void;
  /** Controlled screen-sharing state. */
  screenSharing?: boolean;
  /** Initial screen-sharing state when `screenSharing` is not controlled. */
  defaultScreenSharing?: boolean;
  /** Called with the new state when the user toggles screen sharing. */
  onScreenSharingChange?: (sharing: boolean) => void;
  /** Controlled speaker state. */
  speakerOn?: boolean;
  /** Initial speaker state when `speakerOn` is not controlled. */
  defaultSpeakerOn?: boolean;
  /** Called with the new state when the user toggles the speaker. */
  onSpeakerOnChange?: (on: boolean) => void;
  /** Hide the screen share control. */
  hideScreenShare?: boolean;
  /** Called when the user presses the end call button. */
  onEndCall?: () => void;
  /** Controlled corner of the local preview: `top-left`, `top-right`, `bottom-left` or `bottom-right`. */
  pipCorner?: CallPipCorner;
  /** Initial corner of the local preview when `pipCorner` is not controlled. */
  defaultPipCorner?: CallPipCorner;
  /** Called with the corner when the user drags the local preview to another corner. */
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
    // `useDrag` writes the offset to the element as `--sutra-drag-x/-y` (no React state per pointer move) and ends the drag on release,
    // `pointercancel` and a lost capture; `dragging` flips only when a drag starts or ends, for the cursor and the transition.
    // The pip holds a live video, so the pointer is captured on the press (as before) and a drag counts after 4 px.
    const pipRef = React.useRef<HTMLDivElement | null>(null);
    const pipDrag = useDrag({
      captureOnPress: true,
      onEnd: (info, cancelled) => {
        // Drop into the nearest corner of the stage, then clear the offset (the corner classes take over).
        const rect = stageRef.current?.getBoundingClientRect();
        if (!cancelled && rect && rect.width > 0) {
          const left = info.startX + info.dx - rect.left < rect.width / 2;
          const top = info.startY + info.dy - rect.top < rect.height / 2;
          setCorner(`${top ? "top" : "bottom"}-${left ? "left" : "right"}` as CallPipCorner);
        }
        pipDrag.set(0, 0);
        pipRef.current?.style.removeProperty("--sutra-drag-x");
        pipRef.current?.style.removeProperty("--sutra-drag-y");
      },
    });
    const dragging = pipDrag.dragging;
    const setPipRef = useMergedRefs<HTMLDivElement>(pipRef, pipDrag.ref as React.Ref<HTMLDivElement>);
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
        className={cn("relative isolate flex min-h-96 w-full flex-col overflow-hidden rounded-box bg-code text-white", className)}
        data-slot="call-screen"
        {...props}
      >
        <div ref={stageRef} className="absolute inset-0 -z-10">
          {remote !== undefined ? (
            remote
          ) : remoteStream ? (
            <video ref={remoteRef} autoPlay playsInline className="size-full object-cover" aria-label={`${name}'s video`} />
          ) : null}
          {!showRemoteVideo ? (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-code-border to-code">
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
                <span role="timer" aria-label={`Call duration ${formatClock(seconds, { padMinutes: true })}`} className="tabular-nums">
                  {formatClock(seconds, { padMinutes: true })}
                </span>
              )}
            </p>
          </div>
          <CallQualityIndicator quality={quality} className="mt-1.5" />
        </div>

        {type === "video" ? (
          <div
            ref={setPipRef}
            role="group"
            tabIndex={0}
            aria-label={`Your video, ${corner.replace("-", " ")}. Drag or use arrow keys to move.`}
            data-corner={corner}
            {...pipDrag.handlers}
            onKeyDown={onPipKeyDown}
            className={cn(
              "absolute z-10 aspect-[3/4] w-24 cursor-grab touch-none overflow-hidden rounded-xl border border-white/20 bg-code-border shadow-xl sm:w-32",
              "transition-[top,left,right,bottom] duration-300 ease-out-quart",
              dragging && "cursor-grabbing transition-none",
              pipCornerClass[corner],
              focusRing
            )}
            style={{ transform: "translate(var(--sutra-drag-x, 0px), var(--sutra-drag-y, 0px))" }}
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
              "flex h-12 w-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition-[background-color,scale] hover:bg-destructive-hover active:scale-95 [&_svg]:size-6",
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
        "flex size-12 items-center justify-center rounded-full backdrop-blur-md transition-[background-color,scale] active:scale-95 [&_svg]:size-5",
        pressed ? "bg-white text-code hover:bg-white/90" : "bg-white/15 text-white hover:bg-white/25",
        focusRing
      )}
    >
      {children}
    </button>
  );
}
