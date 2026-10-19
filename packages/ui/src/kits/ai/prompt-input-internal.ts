/** PromptInput's shared context and the `usePromptInput` hook used by every composer part. */
import * as React from "react";

export interface PromptInputContextValue {
  value: string;
  setValue: (value: string) => void;
  /** A response is streaming. */
  loading: boolean;
  /** @deprecated Use `loading`. */
  isLoading: boolean;
  disabled: boolean;
  canSubmit: boolean;
  onStop?: () => void;
  addFiles: (files: File[]) => void;
  acceptsFiles: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Something droppable is being dragged over the composer. */
  dragging: boolean;
  /** Mounted PromptInputDropOverlay parts replace the built-in drop hint. */
  registerDropOverlay: () => () => void;
  /** Routes an oversized paste to an attachment; returns true when handled (only with `largePasteThreshold`). */
  onLargePaste?: (text: string, selection: readonly [number, number]) => boolean;
  /** @deprecated Use `onLargePaste`. */
  handleLargePaste?: (text: string, selection: readonly [number, number]) => boolean;
}

export const PromptInputContext = React.createContext<PromptInputContextValue | null>(null);

/** Access the enclosing PromptInput state. */
export function usePromptInput() {
  const ctx = React.useContext(PromptInputContext);
  if (!ctx) throw new Error("PromptInput parts must be used within <PromptInput>");
  return ctx;
}
