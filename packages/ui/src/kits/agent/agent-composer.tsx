/**
 * The pieces that sit around an agent composer, one module per family. Despite the name there is no `AgentComposer`
 * component here: `QueuedMessages` (`-queue`), `SideThread` (`-side-thread`), `ComposerToolbar` (`-toolbar`),
 * `AttachmentThumbnails` (`-attachments`) and the generic `useComposerHistory` hook (`hooks/use-composer-history`).
 * This path re-exports every public name; inside the package import the per-part modules.
 */
export * from "./agent-composer-queue";
export * from "./agent-composer-side-thread";
export * from "./agent-composer-toolbar";
export * from "./agent-composer-attachments";
export { useComposerHistory, type UseComposerHistoryOptions, type ComposerHistory } from "../../hooks/use-composer-history";
