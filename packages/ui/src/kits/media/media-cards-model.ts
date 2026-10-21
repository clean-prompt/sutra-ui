import * as React from "react";
import type { Tone } from "../../lib/tone";

/** Canonical `Tone`; `brand` is a deprecated alias of `primary`. */
export type MediaStatusTone = Tone | "brand";

export interface MediaStatus {
  label: string;
  icon?: React.ReactNode;
  tone?: MediaStatusTone;
  /** Gentle pulse for in-progress states (e.g. "Transcoding"). */
  pulse?: boolean;
}

export interface MediaCardAction {
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  /** Only destructive actions turn red on hover. */
  destructive?: boolean;
  /** Pressed state (e.g. "In vault"). */
  active?: boolean;
  disabled?: boolean;
}

export interface MediaBusyState {
  /** Default "Working…". */
  label?: string;
  /** 0–100; omit for indeterminate. */
  progress?: number;
}
