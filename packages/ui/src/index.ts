/* Sutra UI — public API */

/* Foundations */
export * from "./lib/cn";
export * from "./lib/tokens";
export * from "./hooks/use-controllable-state";
export * from "./hooks/use-copy";
export * from "./hooks/use-theme";
export * from "./lib/time";
export * from "./lib/duration";
export * from "./lib/format";
export * from "./lib/hash";
export * from "./lib/text";
export * from "./lib/validate";
export * from "./lib/math";
export * from "./lib/encoding";
export * from "./lib/tone";
export * from "./lib/status";
export * from "./hooks/use-now";
export * from "./hooks/use-media-query";
export * from "./hooks/use-resize-observer";
export * from "./hooks/use-iso-layout-effect";
export * from "./hooks/use-async-action";
export * from "./hooks/use-safe-id";
export * from "./hooks/use-active-indicator";
export * from "./hooks/use-scroll-edges";
// Older component exports keep these root names (different defaults); the lib versions are in @sutra/ui/tokens.
export { formatBytes } from "./patterns/file-upload";
export { splitDuration } from "./patterns/counters";
export { base32Decode } from "./kits/identity/totp";
export * from "./primitives/typography";
export * from "./primitives/layout";

/* Button & actions */
export * from "./primitives/button";
export * from "./primitives/button-group";
export * from "./primitives/copy-button";
export * from "./primitives/app-store-badge";
export * from "./primitives/close-button";
export * from "./primitives/text-link";
export * from "./primitives/social-button";
export * from "./primitives/fab";

/* Feedback */
export * from "./primitives/inline-alert";
export * from "./primitives/toast";
export * from "./primitives/alert-banner";

/* Utility */
export * from "./primitives/aspect-ratio";
export * from "./primitives/scroll-area";

/* Media & rich content */
export * from "./primitives/accordion";
export * from "./patterns/blog-content";
export * from "./patterns/code-block";

/* Data display */
export * from "./primitives/avatar";
export * from "./primitives/monogram";
export * from "./primitives/avatar-group";
export * from "./primitives/separator";
export * from "./patterns/filter-bar";
export * from "./primitives/table";

/* Form controls */
export * from "./primitives/label";
export * from "./primitives/field";
export * from "./primitives/input";
export * from "./primitives/input-group";
export * from "./primitives/input-otp";
export * from "./primitives/textarea";
export * from "./primitives/number-input";
export * from "./primitives/tag-input";
export * from "./primitives/checkbox";
export * from "./primitives/radio";
export * from "./primitives/switch";
export * from "./primitives/select";
export * from "./primitives/calendar";
export * from "./primitives/date-picker";
export * from "./primitives/segmented-control";
export * from "./primitives/slider";
export * from "./primitives/rating";
export * from "./patterns/file-upload";
export * from "./primitives/dropzone";
export * from "./primitives/combobox";
export * from "./patterns/password-strength";

/* Indicators */
export * from "./primitives/chip";
export * from "./primitives/badge";
export * from "./primitives/status-badge";
export * from "./primitives/spinner";
export * from "./primitives/progress";
export * from "./primitives/step-indicator";

/* Navigation */
export * from "./primitives/breadcrumbs";
export * from "./primitives/pagination";
export * from "./patterns/tab-menu";
export * from "./primitives/tabs";
export * from "./patterns/header-navigation";
export * from "./patterns/sidebar-navigation";
export * from "./patterns/section-header";
export * from "./patterns/tree-view";

/* Overlays */
export * from "./primitives/tooltip";
export * from "./primitives/info-tooltip";
export * from "./primitives/popover";
export * from "./primitives/dialog";
export * from "./primitives/dropdown-menu";
export * from "./primitives/context-menu";
export * from "./patterns/command-menu";

/* AI */
export * from "./primitives/text-shimmer";
export * from "./patterns/markdown";
export * from "./kits/ai/chain-of-thought";
export * from "./kits/ai/chat-attachment";
export * from "./kits/ai/chat-conversation";
export * from "./kits/ai/chat-list-view";
export * from "./kits/ai/conversation-list";
export * from "./primitives/inline-edit-text";
export * from "./kits/ai/chat-loader";
export * from "./kits/ai/chat-message";
export * from "./kits/ai/chat-message-actions";
export * from "./primitives/favicon";
export * from "./kits/ai/chat-source";
export * from "./kits/ai/chat-tool";
export * from "./kits/ai/prompt-input";
export * from "./kits/ai/prompt-suggestion";

/* More */
export * from "./patterns/sparkline";
export * from "./primitives/mesh-gradient";

/* Assets */
export * from "./assets/brand";
export * from "./assets/placeholder-logos";
export * from "./assets/icons";
export * from "./assets/country-flags";
export * from "./assets/emoji-reactions";
export * from "./assets/file-format";
export * from "./assets/misc";

/* Blocks */
export * from "./blocks";

/* Suite */
export * from "./patterns/shortcuts";
export * from "./kits/workspace/entity-mention";
export * from "./kits/workspace/backlinks";
export * from "./kits/workspace/quick-capture";
export * from "./kits/workspace/today-timeline";
export * from "./kits/workspace/sync-status";

/* Data viz */
export * from "./patterns/chart";
export * from "./patterns/stat-card";
export * from "./primitives/meter";
export * from "./patterns/gauge";

/* Identity & settings */
export * from "./kits/identity/qr-code";
export * from "./kits/identity/qr-scanner";
export * from "./patterns/settings";
export * from "./primitives/key-value";
export * from "./primitives/empty-state";
export * from "./patterns/loading-screen";
export * from "./kits/identity/device-sessions";
export * from "./patterns/theme-toggle";

/* Ops & data */
export * from "./patterns/log-viewer";
export * from "./patterns/transfer-list";
export * from "./kits/ops/progress-dialog";

/* Mobile & viewers */
export * from "./patterns/bottom-tab-bar";
export * from "./primitives/drawer";
export * from "./patterns/lightbox";
export * from "./patterns/file-viewer";
export * from "./patterns/split-pane";
export * from "./kits/social/presence";

/* Apps & social */
export * from "./kits/workspace/app-launcher";
export * from "./patterns/identity-mark";
export * from "./kits/workspace/install-prompt";
export * from "./kits/social/call-overlay";
export * from "./kits/social/messenger";
export * from "./patterns/reorderable-list";
export * from "./patterns/counters";
export * from "./patterns/status-cycle";

/* AI extras, voice & translation */
export * from "./kits/ai/ai-extras";
export * from "./kits/ai/model-state";
export * from "./kits/ai/model-select";
export * from "./kits/voice/voice";
export * from "./kits/voice/translate";

/* Security */
export * from "./kits/identity/totp";
export * from "./kits/identity/secret";
export * from "./kits/identity/recovery-key";
export * from "./kits/identity/consent";
export * from "./kits/identity/api-keys";
export * from "./kits/identity/credential-card";
export * from "./kits/billing/payment-card";
export * from "./kits/identity/connected-apps";

/* Editor (root-safe parts; CodeEditor and RichTextEditor live in @sutra/ui/editor) */
export * from "./kits/editor/editor-toolbar";
export * from "./kits/editor/document-outline";
export * from "./kits/editor/editor-status";
export * from "./patterns/diff-viewer";
export * from "./kits/editor/version-history";
export * from "./patterns/comments";

/* kunji sign-in */
export * from "./kits/identity/kunji-client";
export * from "./kits/identity/kunji";

/* Monitoring (Terminal lives in @sutra/ui/terminal; it needs the optional @xterm/* peers) */
export * from "./patterns/heatmap";
export * from "./patterns/timeline-bar";
export * from "./kits/ops/node-card";
export * from "./kits/ops/process-table";
export * from "./kits/ops/alert-group";
export * from "./patterns/json-viewer";
export * from "./kits/ops/request-inspector";
export * from "./kits/ops/model-row";

/* Media */
export * from "./kits/media/media-controls";
export * from "./kits/media/video-player";
export * from "./kits/media/audio-player";
export * from "./kits/media/media-cards";
export * from "./kits/media/cast-picker";

/* Agent (coding-assistant UI) */
export * from "./kits/agent/tool-timeline";
export * from "./kits/ai/permission-prompt";
export * from "./kits/agent/agent-mode";
export * from "./kits/agent/plan-review";
export * from "./kits/agent/rewind";
export * from "./kits/agent/agent-composer";
export * from "./kits/agent/agent-tasks";
export * from "./kits/agent/agent-sessions";
export * from "./kits/agent/agent-transcript";
export * from "./kits/ai/agent-usage";
export * from "./kits/agent/agent-onboarding";

/* Agent admin: providers & models */
export * from "./kits/agent-admin/llm-providers";
export * from "./kits/agent-admin/model-routing";
export * from "./kits/agent-admin/backends";
export * from "./kits/agent-admin/local-models";

/* Agent admin: channels & multi-agent */
export * from "./kits/agent-admin/channels";
export * from "./kits/agent-admin/agent-room";
export * from "./kits/agent-admin/subagents";
export * from "./kits/agent-admin/agent-persona";
export * from "./kits/agent-admin/remote-screen";

/* Agent admin: automation */
export * from "./patterns/cron";
export * from "./kits/agent-admin/agent-jobs";
export * from "./kits/agent-admin/status-stack";
export * from "./kits/agent-admin/webhooks";

/* Agent admin: capabilities */
export * from "./kits/agent-admin/capabilities";
export * from "./kits/agent-admin/tool-toggles";
export * from "./kits/agent-admin/mcp";
export * from "./kits/agent-admin/extensions-catalog";
export * from "./patterns/schema-form";
export * from "./kits/agent-admin/slot-outlet";

/* Agent: browser, artifacts & git review */
export * from "./kits/agent/agent-browser";
export * from "./kits/agent/artifacts";
export * from "./kits/agent/git-review";

/* Billing */
export * from "./kits/billing/billing";

/* Workspace & shell */
export * from "./kits/workspace/workspace-switcher";
export * from "./patterns/notice-bar";
export * from "./patterns/coachmarks";
export * from "./patterns/keybind-editor";
export * from "./kits/workspace/timeline-rail";

/* Chat extras & primitives */
export * from "./kits/ai/embeds";
export * from "./kits/ai/approval-stack";
export * from "./kits/ai/primitives-extra";
export * from "./patterns/tiling-layout";
export * from "./kits/workspace/kanban";
export * from "./kits/workspace/memory-map";
