export interface NavItem {
  /** Anchor id of the Demo on the page. */
  id: string;
  label: string;
}

export interface NavPage {
  id: string;
  label: string;
  /** Components documented on the page; each maps to a `<Demo id>`. */
  items?: NavItem[];
}

export interface NavSection {
  id: string;
  label: string;
  pages: NavPage[];
}

const items = (...labels: string[]): NavItem[] =>
  labels.map((label) => ({ id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), label }));

export const nav: NavSection[] = [
  {
    id: "foundations",
    label: "Foundations",
    pages: [
      { id: "colors", label: "Colors" },
      { id: "typography", label: "Typography" },
      { id: "grid", label: "Grid & Layout" },
      { id: "shadows", label: "Shadows & Effects" },
      { id: "radius", label: "Corner Radius" },
      { id: "spacing", label: "Spacing" },
    ],
  },
  {
    id: "components",
    label: "Components",
    pages: [
      {
        id: "buttons",
        label: "Buttons & Actions",
        items: items("Button", "Button Group", "App Store Badge", "Close Button", "Text Link", "Social Button", "Floating Action Button"),
      },
      { id: "feedback", label: "Feedback", items: items("Inline Alert", "Toast", "Snackbar", "Alert Banner") },
      { id: "utility", label: "Utility", items: items("Aspect Ratio", "Scroll Area") },
      { id: "media", label: "Media", items: items("Accordion", "FAQ", "Blog Content", "Code Block", "Code Block Tabs") },
      {
        id: "data-display",
        label: "Data Display",
        items: items("Avatar", "Avatar Group", "Separator", "Filter Bar", "Table", "Data Table"),
      },
      {
        id: "forms",
        label: "Form Controls",
        items: items(
          "Input", "Password Input", "Search Input", "Input OTP", "Textarea", "Number Input", "Tag Input",
          "Checkbox", "Radio", "Switch", "Select", "Date Picker", "Date Range Picker", "Calendar",
          "Segmented Control", "Slider", "Rating", "File Upload", "Dropzone", "Combobox",
          "Password Strength", "Field", "Input Group", "Label"
        ),
      },
      {
        id: "indicators",
        label: "Indicators",
        items: items("Chip", "Badge", "Status Badge", "Spinner", "Progress", "Skeleton", "Steps"),
      },
      {
        id: "navigation",
        label: "Navigation",
        items: items("Breadcrumbs", "Pagination", "Tab Menu", "Tabs", "Header Nav", "Sidebar", "Section Header", "Tree View"),
      },
      {
        id: "overlays",
        label: "Overlays",
        items: items(
          "Tooltip", "Info Tooltip", "Popover", "Hover Card", "Dialog", "Alert Dialog", "Sheet",
          "Dropdown Menu", "Context Menu", "Command Dialog"
        ),
      },
      {
        id: "ai",
        label: "AI",
        items: items("Chat", "Chain of Thought", "Chat Tool", "Chat Source", "Chat Loader", "Prompt Input", "Prompt Suggestion"),
      },
      {
        id: "agent-timeline",
        label: "Agent: Timeline & Diffs",
        items: [
          { id: "agent-turn", label: "Agent Turn" },
          { id: "tool-timeline", label: "Tool Timeline" },
          { id: "tool-group", label: "Tool Group" },
          { id: "bash-tool-body", label: "Bash Tool Body" },
          { id: "diff-card", label: "Diff Card" },
          { id: "diff-stat", label: "Diff Stat" },
          { id: "tool-bodies", label: "Tool Bodies" },
          { id: "expandable-content", label: "Expandable Content" },
          { id: "agent-status-line", label: "Agent Status Line" },
          { id: "thinking", label: "Thinking" },
        ],
      },
      {
        id: "agent-permissions",
        label: "Agent: Permissions & Plans",
        items: [
          { id: "edit-permission", label: "Edit Permission" },
          { id: "bash-permission", label: "Bash Permission" },
          { id: "fetch-permission", label: "Fetch Permission" },
          { id: "folded-permission", label: "Folded Permission" },
          { id: "pending-hint", label: "Pending Hint" },
          { id: "mode-switcher", label: "Mode Switcher & Effort" },
          { id: "plan-review", label: "Plan Review" },
          { id: "rewind", label: "Rewind" },
          { id: "multi-question", label: "Multi-question" },
        ],
      },
      {
        id: "agent-composer",
        label: "Agent: Composer",
        items: [
          { id: "full-composer", label: "Full Composer" },
          { id: "mention-highlight", label: "Mention Highlight" },
          { id: "drop-overlay", label: "Drop Overlay" },
          { id: "context-chip", label: "Context Chip" },
          { id: "add-context", label: "Add Context" },
          { id: "model-pill", label: "Model Pill" },
          { id: "queued-messages", label: "Queued Messages" },
          { id: "side-thread", label: "Side Thread" },
          { id: "composer-toolbar", label: "Composer Toolbar" },
          { id: "attachment-thumbnails", label: "Attachment Thumbnails" },
          { id: "composer-history", label: "Composer History" },
        ],
      },
      {
        id: "agent-sessions",
        label: "Agent: Tasks & Sessions",
        items: [
          { id: "agent-session-list", label: "Session List" },
          { id: "agent-status-dot", label: "Status Dot" },
          { id: "agent-transcript", label: "Transcript" },
          { id: "transcript-system-rows", label: "System Rows" },
          { id: "agent-todo-list", label: "Todo List" },
          { id: "agent-roster", label: "Agent Roster" },
          { id: "background-task", label: "Background Task" },
          { id: "spinner-verbs", label: "Spinner Verbs" },
          { id: "context-banner", label: "Context Banner" },
          { id: "response-rating", label: "Response Rating" },
          { id: "context-usage", label: "Context Usage" },
          { id: "usage-limits", label: "Usage Limits" },
          { id: "session-stats", label: "Session Stats" },
          { id: "onboarding-checklist", label: "Onboarding Checklist" },
          { id: "connection-state", label: "Connection State" },
          { id: "paste-code-auth", label: "Paste-code Auth" },
        ],
      },
      {
        id: "ai-extras",
        label: "AI Extras",
        items: [
          { id: "context-meter", label: "Context Meter" },
          { id: "status-strip", label: "Status Strip" },
          { id: "job-banner", label: "Job Banner" },
          { id: "question-card", label: "Question Card" },
          { id: "slash-menu", label: "Slash Menu" },
          { id: "model-picker", label: "Model Picker" },
          { id: "usage-summary", label: "Usage Summary" },
          { id: "conversation-sidebar", label: "Conversation Sidebar" },
        ],
      },
      {
        id: "voice",
        label: "Voice & Translation",
        items: [
          { id: "translator", label: "Translator" },
          { id: "language-picker", label: "Language Picker" },
          { id: "transliteration", label: "Transliteration" },
          { id: "dictionary", label: "Dictionary" },
          { id: "conversation", label: "Conversation" },
          { id: "voice-input", label: "Voice Input" },
          { id: "speak-button", label: "Speak Button" },
          { id: "audio-level", label: "Audio Level" },
        ],
      },
      { id: "more", label: "More", items: items("Sparkline", "Mesh Gradient", "Text Shimmer") },
      {
        id: "dataviz",
        label: "Data Viz",
        items: [
          { id: "stat-card", label: "Stat Card" },
          { id: "area-chart", label: "Area Chart" },
          { id: "stacked-area", label: "Stacked Area" },
          { id: "live-chart", label: "Live Chart" },
          { id: "bar-chart", label: "Bar Chart" },
          { id: "stacked-bar", label: "Stacked Bar" },
          { id: "line-chart", label: "Line Chart" },
          { id: "donut-chart", label: "Donut Chart" },
          { id: "meter", label: "Meter" },
          { id: "stacked-meter", label: "Stacked Meter" },
          { id: "gauge", label: "Gauge" },
          { id: "ring-meter", label: "Ring Meter" },
        ],
      },
      {
        id: "identity",
        label: "Identity & Settings",
        items: [
          { id: "qr-code", label: "QR Code" },
          { id: "qr-scanner", label: "QR Scanner" },
          { id: "settings-shell", label: "Settings Shell" },
          { id: "key-value", label: "Key Value" },
          { id: "empty-state", label: "Empty State" },
          { id: "note", label: "Note" },
          { id: "boot-screen", label: "Boot Screen" },
          { id: "lock-screen", label: "Lock Screen" },
          { id: "sessions", label: "Sessions" },
          { id: "account-panel", label: "Account Panel" },
          { id: "theme-toggle", label: "Theme Toggle" },
        ],
      },
      {
        id: "ops",
        label: "Ops & Data",
        items: [
          { id: "log-viewer", label: "Log Viewer" },
          { id: "log-viewer-large", label: "Log Viewer (20k lines)" },
          { id: "transfer-list", label: "Transfer List" },
          { id: "transfer-tray", label: "Transfer Tray" },
          { id: "progress-dialog", label: "Progress Dialog" },
          { id: "markdown-math", label: "Markdown Math" },
        ],
      },
      {
        id: "media-player",
        label: "Media Player",
        items: [
          { id: "video-player", label: "Video Player" },
          { id: "mini-player", label: "Mini Player" },
          { id: "now-playing", label: "Now Playing" },
          { id: "queue-list", label: "Queue List" },
          { id: "track-row", label: "Track Row" },
          { id: "poster-card", label: "Poster Card" },
          { id: "episode-card", label: "Episode Card" },
          { id: "media-shelf", label: "Media Shelf" },
          { id: "media-hero", label: "Media Hero" },
          { id: "album-card", label: "Album Card" },
          { id: "cast-picker", label: "Cast Picker" },
          { id: "media-controls", label: "Media Controls" },
        ],
      },
      {
        id: "monitoring",
        label: "Monitoring",
        items: [
          { id: "resource-hero", label: "Resource Hero" },
          { id: "node-grid", label: "Node Cards" },
          { id: "gpu-cards", label: "GPU Cards" },
          { id: "alert-group", label: "Alert Group" },
          { id: "process-table", label: "Process Table" },
          { id: "timeline-bar", label: "Timeline Bar" },
          { id: "uptime-bar", label: "Uptime Bar" },
          { id: "calendar-heatmap", label: "Calendar Heatmap" },
          { id: "json-viewer", label: "JSON Viewer" },
          { id: "request-inspector", label: "Request Inspector" },
          { id: "request-log-table", label: "Request Log Table" },
          { id: "model-table", label: "Model Table" },
          { id: "terminal", label: "Terminal" },
        ],
      },
      {
        id: "mobile",
        label: "Mobile & Viewers",
        items: [
          { id: "bottom-tab-bar", label: "Bottom Tab Bar" },
          { id: "adaptive-tabs", label: "Adaptive Tabs" },
          { id: "drawer", label: "Drawer" },
          { id: "lightbox", label: "Lightbox" },
          { id: "image-with-fallback", label: "Image With Fallback" },
          { id: "file-viewer", label: "File Viewer" },
          { id: "split-pane", label: "Split Pane" },
          { id: "presence", label: "Presence" },
          { id: "share-dialog", label: "Share Dialog" },
        ],
      },
      {
        id: "kunji",
        label: "kunji Sign-in",
        items: [
          { id: "kunji-sign-in", label: "Sign-in (live)" },
          { id: "kunji-variants", label: "Variants" },
          { id: "kunji-states", label: "States" },
          { id: "kunji-button", label: "kunji Button" },
          { id: "kunji-link", label: "Link kunji" },
          { id: "kunji-sign-in-page", label: "Sign-in Page" },
          { id: "sign-in-methods", label: "Sign-in Methods" },
          { id: "register-with-kunji", label: "Register" },
          { id: "awaiting-approval", label: "Awaiting Approval" },
          { id: "signed-in-panel", label: "Signed-in Panel" },
          { id: "device-pairing", label: "Device Pairing" },
          { id: "access-gate", label: "Access Gate" },
          { id: "auth-problem", label: "Auth Problems" },
        ],
      },
      {
        id: "editor",
        label: "Editor",
        items: [
          { id: "editor-workspace", label: "Workspace" },
          { id: "code-editor", label: "Code Editor" },
          { id: "rich-text-editor", label: "Rich Text Editor" },
          { id: "editor-toolbar", label: "Editor Toolbar" },
          { id: "save-status", label: "Save Status" },
          { id: "diff-inline", label: "Diff (inline)" },
          { id: "diff-split", label: "Diff (split)" },
          { id: "suggestion-diff", label: "Suggestion Diff" },
          { id: "version-history", label: "Version History" },
          { id: "comments-panel", label: "Comments Panel" },
        ],
      },
      {
        id: "security",
        label: "Security",
        items: items(
          "Authenticator", "TOTP Code", "Secret Field", "Secret Reveal Once", "Recovery Key", "Recovery Key Input",
          "Consent Screen", "Scope List", "Scope Matrix", "API Keys", "Credential Card", "Credential Detail",
          "Payment Card", "Payment Card Input", "Connected Apps", "Activity Feed"
        ),
      },
      {
        id: "social",
        label: "Apps & Social",
        items: items(
          "App Launcher", "Identity Mark", "Text Button", "Install Button", "Incoming Call", "Call Screen",
          "Messenger", "Group Info Panel", "Reorderable List", "Checklist", "Countdown", "Stopwatch",
          "Tally Counter", "Status Cycle", "Recurrence Picker", "Pinned Note"
        ),
      },
      {
        id: "suite",
        label: "Suite",
        items: items(
          "Shortcuts", "Entity Chip", "Mention Input", "Backlinks", "Quick Capture", "Today Timeline", "Sync Status", "App Theming"
        ),
      },
      {
        id: "assets",
        label: "Assets",
        items: items(
          "Logo", "App Icons", "Placeholder Logos", "Featured Icon", "Icons", "Country Flags",
          "Emoji Reactions", "File Format Icons", "Empty State", "Device Frame", "Background Pattern"
        ),
      },
    ],
  },
  { id: "blocks", label: "Blocks", pages: [{ id: "gallery", label: "Block Gallery" }] },
];

export function findPage(section: string, page: string) {
  const s = nav.find((n) => n.id === section);
  return { section: s, page: s?.pages.find((p) => p.id === page) };
}
