import * as React from "react";
import type { MediaTrackOption } from "./media-controls-menus";
import type { MediaChapter } from "./media-controls-seek";

export interface VideoTextTrack {
  id: string;
  label: string;
  /** Language code, e.g. "en". */
  srcLang?: string;
  /** WebVTT URL. */
  src: string;
  kind?: "subtitles" | "captions";
}

export interface VideoUpNext {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  image?: string;
}

export interface VideoPlayerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "onError"> {
  /** Address of the video file or stream. */
  src?: string;
  /** Image shown before playback starts. */
  poster?: string;
  /** Title shown in the top bar. */
  title?: React.ReactNode;
  /** Line under the title, for example the episode name. */
  subtitle?: React.ReactNode;
  /** Try to start playing; falls back to muted playback and shows a "tap to unmute" pill. */
  autoPlay?: boolean;
  /** Start muted. */
  muted?: boolean;
  /** Restarts the video when it ends. */
  loop?: boolean;
  /** CORS mode of the video element; needed for side-loaded WebVTT tracks from another origin. */
  crossOrigin?: "anonymous" | "use-credentials";
  /** Side-loaded WebVTT tracks. Without this, the element's own text tracks are offered. */
  tracks?: VideoTextTrack[];
  /** Controlled id of the shown subtitle track; `null` for off. */
  subtitleTrack?: string | null;
  /** Initial subtitle track when `subtitleTrack` is not controlled. Default none. */
  defaultSubtitleTrack?: string | null;
  /** Called with the track id (or `null`) when the user changes subtitles. */
  onSubtitleTrackChange?: (id: string | null) => void;
  /** Server-side audio tracks (you reload the stream in `onAudioTrackChange`). Without this, native `audioTracks` are used. */
  audioTracks?: MediaTrackOption[];
  /** Controlled id of the selected audio track. */
  audioTrack?: string;
  /** Initial audio track when `audioTrack` is not controlled. */
  defaultAudioTrack?: string;
  /** Called with the track id when the user picks another audio track. */
  onAudioTrackChange?: (id: string) => void;
  /** Chapter markers drawn on the seek bar, each with a start time and title. */
  chapters?: MediaChapter[];
  /** Returns a preview image URL for a time, shown in the seek bar's hover bubble. */
  thumbnails?: (time: number) => string | null | undefined;
  /** Shows a back button in the top bar (also fired by Escape). */
  onBack?: () => void;
  /** Accessible name of the back button. Default "Back". */
  backLabel?: string;
  /** Shows a "next" button and enables the up-next countdown. */
  onNext?: () => void;
  /** Accessible name of the next button. Default "Next episode". */
  nextLabel?: string;
  /** When set (with `onNext`), ending playback shows an "Up next in 5…" card. */
  upNext?: VideoUpNext;
  /** Countdown seconds for the up-next card. Default 5. */
  upNextCountdown?: number;
  /** Called when playback reaches the end. */
  onEnded?: () => void;
  /** Offer to resume from this position (seconds). Ignored under 5s. */
  resumeAt?: number;
  /** Called with the position in seconds when the user accepts the resume offer from `resumeAt`. */
  onResume?: (time: number) => void;
  /** Hide the chrome after this much inactivity while playing. Default 3000ms. */
  autoHideMs?: number;
  /** Skip button distance. Default 10s. */
  skipSeconds?: number;
  /** Speeds offered in the playback rate menu; defaults to the built-in set. */
  rates?: number[];
  /** Called with the media error code and message when the video fails to load or play. */
  onError?: (error: { code: number; message?: string }) => void;
  /** Text shown in the error overlay. Default "This video can't be played right now.". */
  errorMessage?: React.ReactNode;
  /** Extra controls in the top bar (e.g. a CastPicker). */
  topActions?: React.ReactNode;
  /** How the video fills the frame: `contain` (letterbox) or `cover` (crop). Default "contain". */
  fit?: "contain" | "cover";
  /** Ref to the underlying `<video>` element; `ref` stays on the root. */
  videoRef?: React.Ref<HTMLVideoElement>;
  /** Extra classes for the `<video>` element. */
  videoClassName?: string;
}
