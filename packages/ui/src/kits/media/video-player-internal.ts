export type WebkitVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
  webkitShowPlaybackTargetPicker?: () => void;
  audioTracks?: ArrayLike<{ id: string; label: string; language: string; enabled: boolean }>;
};

export type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
  webkitFullscreenEnabled?: boolean;
};

export type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => void };

export const INTERACTIVE = 'button, a[href], input, select, textarea, [role="slider"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]';
