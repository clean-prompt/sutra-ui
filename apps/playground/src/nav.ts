/** Stability of a nav entry, shown as a badge in the sidebar, the search palette and the demo header. */
export type NavStatus = "new" | "beta" | "deprecated";

export interface NavItem {
  /** Anchor id of the Demo on the page. */
  id: string;
  label: string;
  /** Version or date the item first shipped in (the badge tooltip says when it arrived). */
  since?: string;
  /** "new" for what the latest releases added, "beta" while the API may still change, "deprecated" for what is on its way out. */
  status?: NavStatus;
}

export interface NavPage {
  id: string;
  label: string;
  /** Route section in the URL (`#/<route>/<id>`) when it differs from the group's. */
  route?: string;
  /** Components documented on the page; each maps to a `<Demo id>`. */
  items?: NavItem[];
  /** Same as on NavItem, for a whole page. A page whose items are new shows a dot on its own. */
  since?: string;
  status?: NavStatus;
}

/**
 * A sidebar group. Groups follow the package layers (foundations, primitives, patterns,
 * one per kit, blocks); `route` keeps the URL stable, so every component page still
 * lives at `#/components/<page>` whatever group it is listed under.
 */
export interface NavSection {
  id: string;
  label: string;
  /** Route section for the group's pages. Defaults to `id`. */
  route?: string;
  pages: NavPage[];
}

/** The marker for what the latest waves added: spread it into an item, or pass [label, fresh] to items(). */
const fresh = { since: "2026-10-20", status: "new" } as const satisfies Pick<NavItem, "since" | "status">;

/** Items from labels (the id is the slug of the label); [label, fresh] adds since and status. */
const items = (...labels: (string | [label: string, meta: Pick<NavItem, "since" | "status">])[]): NavItem[] =>
  labels.map((entry) => {
    const [label, meta] = typeof entry === "string" ? [entry, undefined] : entry;
    return { id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), label, ...meta };
  });

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
      {
        id: "motion",
        label: "Motion",
        items: [
          { id: "tokens", label: "Tokens", ...fresh },
          { id: "utilities", label: "Utilities", ...fresh },
          { id: "change", label: "Animate on Change", ...fresh },
          { id: "entrances", label: "Entrances", ...fresh },
          { id: "springs", label: "Springs", ...fresh },
          { id: "presence", label: "Presence", ...fresh },
          { id: "animated-list", label: "Animated List", ...fresh },
          { id: "text", label: "Stagger and Text", ...fresh },
          { id: "view-transitions", label: "View Transitions", ...fresh },
          { id: "scroll", label: "Scroll-driven", ...fresh },
          { id: "pointer", label: "Pointer Effects", ...fresh },
          { id: "reduced", label: "Reduced Motion", ...fresh },
        ],
      },
      { id: "paper", label: "Paper Showcase" },
      {
        id: "styling-hooks",
        label: "Styling Hooks",
        ...fresh,
        items: [
          { id: "usage", label: "How to use the hooks", ...fresh },
          { id: "reference", label: "data-slot by component", ...fresh },
          { id: "variables", label: "Theme and motion variables", ...fresh },
        ],
      },
      {
        id: "sizing",
        label: "Sizing",
        ...fresh,
        items: [
          { id: "reference", label: "Sizes by component", ...fresh },
          { id: "scale", label: "One scale, with exceptions", ...fresh },
        ],
      },
      {
        id: "form-recipes",
        label: "Form Recipes",
        ...fresh,
        items: [
          { id: "field-validation", label: "Field, validators and a submit action", ...fresh },
          { id: "async-states", label: "useAsyncAction states", ...fresh },
          { id: "mapping", label: "Props that map onto a form library", ...fresh },
          { id: "react-hook-form", label: "react-hook-form (snippet)", ...fresh },
          { id: "schema", label: "A schema library (snippet)", ...fresh },
        ],
      },
      {
        id: "assets",
        route: "components",
        label: "Assets",
        items: items(
          "Logo", "App Icons", "Placeholder Logos", "Featured Icon", "Icons", "Country Flags",
          "Emoji Reactions", "File Format Icons", "Empty State", "Device Frame", "Background Pattern"
        ),
      },
    ],
  },
  {
    id: "primitives",
    label: "Primitives",
    route: "components",
    pages: [
      {
        id: "buttons",
        label: "Buttons & Actions",
        items: items("Button", "Button Group", ["Toggle Group", fresh], "App Store Badge", "Close Button", "Text Link", "Social Button", "Floating Action Button", ["Slide To Confirm", fresh], ["Undo Action", fresh]),
      },
      {
        id: "forms",
        label: "Form Controls",
        items: items(
          "Input", "Password Input", "Search Input", "Input OTP", "Textarea", ["Filled Inputs", fresh], "Number Input", "Tag Input", ["Tag Input Options", fresh],
          "Checkbox", "Radio", "Switch", "Select", "Date Picker", "Date Range Picker", "Date Time Picker", "Time Picker", ["Wheel Picker", fresh], "Calendar",
          "Segmented Control", "Slider", "Rating", "File Upload", "Dropzone", "Combobox", ["Combobox Async", fresh],
          "Password Strength", "Field", "Input Group", "Label"
        ),
      },
      { id: "feedback", label: "Feedback", items: items("Inline Alert", "Toast", "Snackbar", "Alert Banner") },
      {
        id: "indicators",
        label: "Indicators",
        items: items("Chip", "Badge", "Status Badge", "Spinner", "Progress", ["Countdown Urgency", fresh], "Skeleton", "Steps"),
      },
      {
        id: "overlays",
        label: "Overlays",
        items: items(
          "Tooltip", "Info Tooltip", "Popover", "Hover Card", "Dialog", "Alert Dialog", "Sheet", ["Sheet Options", fresh],
          "Dropdown Menu", "Context Menu", "Command Dialog", "Promise Dialogs"
        ),
      },
      {
        id: "data-display",
        label: "Data Display",
        items: items("Avatar", "Avatar Group", "Separator", "Filter Bar", "Table", "Data Table", ["Card", fresh]),
      },
      {
        id: "utility",
        label: "Utility",
        items: [
          ...items("Aspect Ratio", "Scroll Area"),
          { id: "use-disclosure", label: "useDisclosure", ...fresh },
          { id: "use-debounced-value", label: "useDebouncedValue", ...fresh },
          { id: "use-previous", label: "usePrevious", ...fresh },
        ],
      },
    ],
  },
  {
    id: "patterns",
    label: "Patterns",
    route: "components",
    pages: [
      {
        id: "layout-patterns",
        label: "Grids & Search",
        items: [
          { id: "tool-grid", label: "Tool Grid" },
          { id: "grid-four-columns", label: "Four Columns" },
          { id: "grid-odd-count", label: "Odd Item Count" },
          { id: "grid-loading", label: "Grid Loading" },
          { id: "grid-empty", label: "Grid Empty" },
          { id: "grid-narrow", label: "Grid Narrow Width" },
          { id: "marquee-chips", label: "Marquee Chips" },
          { id: "marquee-logos", label: "Marquee Logos" },
          { id: "marquee-reverse", label: "Marquee Reverse" },
          { id: "marquee-pause", label: "Marquee Pause Control", ...fresh },
          { id: "item", label: "Item", ...fresh },
          { id: "frame", label: "Frame", ...fresh },
          { id: "search-trigger", label: "Search Trigger" },
          { id: "idle-motion", label: "Idle Motion" },
          { id: "flip-list", label: "Flip List", ...fresh },
          { id: "morph-pill", label: "Morph Pill", ...fresh },
        ],
      },
      {
        id: "showpieces",
        label: "Showpieces",
        since: "2026-10-20",
        status: "new",
        items: [
          { id: "check-burst", label: "Check Burst", ...fresh },
          { id: "check-burst-streak", label: "Check Burst Streak", ...fresh },
          { id: "check-burst-variants", label: "Check Burst Variants", ...fresh },
          { id: "swipe-deck", label: "Swipe Deck", ...fresh },
          { id: "swipe-deck-states", label: "Swipe Deck States", ...fresh },
          { id: "pan-surface", label: "Pan Surface", ...fresh },
          { id: "pan-surface-zoom", label: "Pan Surface Zoom", ...fresh },
          { id: "expand-card-calendar", label: "Expand Card Calendar", ...fresh },
          { id: "expand-card-files", label: "Expand Card Files", ...fresh },
          { id: "morph-dialog", label: "Morph Dialog", ...fresh },
        ],
      },
      {
        id: "statement-hero",
        label: "Statement Hero",
        items: [
          { id: "landing", label: "Landing Statement" },
          { id: "start-aligned", label: "Start-aligned" },
          { id: "dropzone", label: "With a Dropzone" },
          { id: "compact", label: "Compact" },
          { id: "motion", label: "Motion" },
        ],
      },
      {
        id: "navigation",
        label: "Navigation",
        items: items("Breadcrumbs", "Pagination", ["Pagination Status", fresh], "Tab Menu", "Tabs", "Header Nav", "Sidebar", "Section Header", ["Section Rail", fresh], "Tree View", ["Carousel", fresh], ["Step Wizard", fresh]),
      },
      { id: "content", label: "Content", items: items("Accordion", ["Collapse", fresh], ["Collapsible", fresh], "FAQ", "Blog Content", "Code Block", "Code Block Tabs") },
      {
        id: "dataviz",
        label: "Data Viz",
        items: [
          { id: "stat-card", label: "Stat Card" },
          { id: "area-chart", label: "Area Chart" },
          { id: "stacked-area", label: "Stacked Area" },
          { id: "time-axis", label: "Time Axis" },
          { id: "live-chart", label: "Live Chart" },
          { id: "bar-chart", label: "Bar Chart" },
          { id: "stacked-bar", label: "Stacked Bar" },
          { id: "line-chart", label: "Line Chart" },
          { id: "donut-chart", label: "Donut Chart" },
          { id: "funnel-chart", label: "Funnel Chart", ...fresh },
          { id: "waterfall-chart", label: "Waterfall Chart", ...fresh },
          { id: "scatter-chart", label: "Scatter Chart", ...fresh },
          { id: "radar-chart", label: "Radar Chart", ...fresh },
          { id: "meter", label: "Meter" },
          { id: "stacked-meter", label: "Stacked Meter" },
          { id: "gauge", label: "Gauge" },
          { id: "ring-meter", label: "Ring Meter" },
        ],
      },
      {
        id: "metrics",
        label: "Metrics Dashboard",
        items: [
          { id: "dashboard", label: "Live Dashboard" },
          { id: "animated-number", label: "Animated Number", ...fresh },
          { id: "bar-list", label: "Bar List" },
          { id: "loading", label: "Loading States" },
          { id: "breakdown", label: "Breakdown Legends" },
        ],
      },
      {
        id: "files",
        label: "Files & Capture",
        items: [
          { id: "image-cropper", label: "Image Cropper" },
          { id: "camera-capture", label: "Camera Capture" },
          { id: "selection-area", label: "Selection Area" },
          { id: "pdf-viewer", label: "PDF Viewer" },
        ],
      },
      { id: "more", label: "More", items: items("Sparkline", "Mesh Gradient", "Text Shimmer") },
      {
        id: "mobile",
        label: "Mobile & Viewers",
        items: [
          { id: "bottom-tab-bar", label: "Bottom Tab Bar" },
          { id: "adaptive-tabs", label: "Adaptive Tabs" },
          { id: "drawer", label: "Drawer" },
          { id: "swipe-row", label: "Swipe Row", ...fresh },
          { id: "lightbox", label: "Lightbox" },
          { id: "image-with-fallback", label: "Image With Fallback" },
          { id: "file-viewer", label: "File Viewer" },
          { id: "split-pane", label: "Split Pane" },
          { id: "presence", label: "Presence" },
          { id: "share-dialog", label: "Share Dialog" },
        ],
      },
      {
        id: "tiling",
        label: "Tiling Layout",
        items: [
          { id: "workspace", label: "Workspace" },
          { id: "layout-json", label: "Layout JSON" },
          { id: "preset-picker", label: "Preset Picker" },
          { id: "zone-editor", label: "Zone Editor" },
          { id: "floating-panes", label: "Floating Panes" },
        ],
      },
    ],
  },
  {
    id: "ai",
    label: "AI",
    route: "components",
    pages: [
      {
        id: "ai",
        label: "AI",
        items: items("Chat", "Chain of Thought", "Chat Tool", "Chat Source", "Chat Loader", "Prompt Input", "Prompt Suggestion"),
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
        id: "chat-extras",
        label: "Chat Extras",
        items: [
          { id: "embeds", label: "Embeds" },
          { id: "reactions", label: "Reactions" },
          { id: "queued-steer", label: "Queued Steer" },
          { id: "large-paste", label: "Large Paste" },
          { id: "restored-draft", label: "Restored Draft" },
          { id: "approval-stack", label: "Approval Stack" },
          { id: "split-button", label: "Split Button" },
          { id: "fan-menu", label: "Fan Menu" },
          { id: "decode-text", label: "Decode Text" },
          { id: "zoom-pan", label: "Zoom & Pan" },
          { id: "tab-dropdown", label: "Tab Dropdown" },
          { id: "glyph-spinner", label: "Glyph Spinner" },
          { id: "fade-text", label: "Fade Text" },
          { id: "clarify-settled", label: "Clarify Settled" },
        ],
      },
    ],
  },
  {
    id: "agent",
    label: "Agent",
    route: "components",
    pages: [
      {
        id: "agent-timeline",
        label: "Timeline & Diffs",
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
        label: "Permissions & Plans",
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
        label: "Composer",
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
        label: "Tasks & Sessions",
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
        id: "browser-review",
        label: "Browser, Artifacts & Review",
        items: [
          { id: "agent-browser", label: "Agent Browser" },
          { id: "browser-console", label: "Browser Console" },
          { id: "annotation-layer", label: "Annotations" },
          { id: "real-profile-consent", label: "Profile Consent" },
          { id: "artifact-cards", label: "Artifact Cards" },
          { id: "artifact-streaming", label: "Streaming Artifact" },
          { id: "artifact-viewer", label: "Artifact Viewer" },
          { id: "artifact-library", label: "Artifact Library" },
          { id: "changed-files", label: "Changed Files" },
          { id: "review-scope", label: "Review Scope" },
          { id: "ship-bar", label: "Ship Bar" },
          { id: "worktree-dialog", label: "Worktree Dialog" },
          { id: "branch-pill", label: "Branch Pill" },
        ],
      },
    ],
  },
  {
    id: "agent-admin",
    label: "Agent admin",
    route: "components",
    pages: [
      {
        id: "capabilities",
        label: "Capabilities",
        items: [
          { id: "capabilities-hub", label: "Capabilities Hub" },
          { id: "provenance-trust", label: "Provenance & Trust" },
          { id: "tool-toggle-list", label: "Tool Toggles" },
          { id: "toolset-cards", label: "Toolset Cards" },
          { id: "toolset-provider-drawer", label: "Toolset Provider" },
          { id: "mcp-servers", label: "MCP Servers" },
          { id: "mcp-server-form", label: "MCP Server Form" },
          { id: "key-value-rows", label: "Key/Value Rows" },
          { id: "connector-directory", label: "Connector Directory" },
          { id: "connection-method", label: "Connection Method" },
          { id: "connector-accounts", label: "Connector Accounts" },
          { id: "catalog-cards", label: "Catalog Cards" },
          { id: "installed-extensions", label: "Installed Extensions" },
          { id: "extension-install", label: "Extension Install" },
          { id: "security-scan", label: "Security Scan" },
          { id: "skills", label: "Skills" },
          { id: "sync-receipt", label: "Sync Receipt" },
          { id: "schema-form", label: "Schema Form" },
          { id: "slot-outlet", label: "Slot Outlet" },
        ],
      },
      {
        id: "automation",
        label: "Automation",
        items: [
          { id: "cron-manager", label: "Cron Manager" },
          { id: "job-form", label: "Job Form" },
          { id: "schedule-builder", label: "Schedule Builder" },
          { id: "job-state", label: "Job State" },
          { id: "delivery-target", label: "Delivery Target" },
          { id: "blueprint-gallery", label: "Blueprint Gallery" },
          { id: "status-stack", label: "Status Stack" },
          { id: "webhooks", label: "Webhooks" },
        ],
      },
      {
        id: "channels",
        label: "Channels & Multi-agent",
        items: [
          { id: "platform-connectors", label: "Platform Connectors" },
          { id: "platform-icons", label: "Platform Icons" },
          { id: "platform-config-form", label: "Config Form" },
          { id: "rotating-qr-pairing", label: "QR Pairing" },
          { id: "guided-setup", label: "Guided Setup" },
          { id: "access-requests", label: "Access Requests" },
          { id: "agent-room", label: "Agent Room" },
          { id: "agent-message-notice", label: "Agent Message Notice" },
          { id: "subagent-tree", label: "Subagent Tree" },
          { id: "delegate-tool", label: "Delegate Tool" },
          { id: "agent-avatar-builder", label: "Avatar Builder" },
          { id: "create-agent", label: "Create Agent" },
          { id: "persona-editor", label: "Persona Editor" },
          { id: "remote-screen", label: "Remote Screen" },
          { id: "permission-preflight", label: "Permission Preflight" },
        ],
      },
      {
        id: "providers",
        label: "Providers & Models",
        items: [
          { id: "provider-list", label: "Provider List" },
          { id: "provider-quota-chip", label: "Quota Chip" },
          { id: "provider-connect-dialog", label: "Connect Dialog" },
          { id: "custom-endpoint", label: "Custom Endpoint" },
          { id: "provider-keys", label: "Provider Keys" },
          { id: "provider-model-picker", label: "Model Picker" },
          { id: "model-visibility", label: "Model Visibility" },
          { id: "fallback-chain", label: "Fallback Chain" },
          { id: "task-model-assignment", label: "Task Models" },
          { id: "ensemble-builder", label: "Ensemble Builder" },
          { id: "model-info-card", label: "Model Info Card" },
          { id: "reasoning-pill", label: "Reasoning Pill" },
          { id: "backend-picker", label: "Backend Picker" },
          { id: "local-setup-hero", label: "Local Setup" },
          { id: "local-model-browser", label: "Local Model Browser" },
          { id: "hardware-fit", label: "Hardware Fit" },
          { id: "system-resources", label: "System Resources" },
        ],
      },
    ],
  },
  {
    id: "identity",
    label: "Identity & security",
    route: "components",
    pages: [
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
        id: "security",
        label: "Security",
        items: items(
          "Authenticator", "TOTP Code", "Secret Field", "Secret Reveal Once", "Recovery Key", "Recovery Key Input",
          "Consent Screen", "Scope List", "Scope Matrix", "API Keys", "Credential Card", "Credential Detail",
          "Payment Card", "Payment Card Input", "Connected Apps", "Activity Feed"
        ),
      },
      {
        id: "sign-in-map",
        label: "Sign-in Map",
        items: [
          { id: "overview", label: "Overview" },
          { id: "globe", label: "Globe" },
          { id: "no-alerts", label: "No Alerts" },
          { id: "loading", label: "Loading" },
          { id: "empty", label: "Empty" },
          { id: "narrow", label: "Narrow Width" },
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
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    route: "components",
    pages: [
      {
        id: "workspace",
        label: "Workspace & Shell",
        items: [
          { id: "workspace-switcher", label: "Workspace Switcher" },
          { id: "profile-scope-banner", label: "Profile Scope Banner" },
          { id: "connection-registry", label: "Connection Registry" },
          { id: "gateway-status", label: "Gateway Status" },
          { id: "notice-bar", label: "Notice Bar" },
          { id: "coachmarks", label: "Coachmark Tour" },
          { id: "tip-bubble", label: "Tip Bubble" },
          { id: "keybind-editor", label: "Keybind Editor" },
          { id: "timeline-rail", label: "Timeline Rail" },
        ],
      },
      {
        id: "kanban-memory",
        label: "Kanban & Memory Map",
        items: [
          { id: "kanban-board", label: "Kanban Board" },
          { id: "kanban-card", label: "Kanban Card" },
          { id: "task-detail-dialog", label: "Task Detail" },
          { id: "orchestration-panel", label: "Orchestration Panel" },
          { id: "memory-map", label: "Memory Map" },
          { id: "memory-map-outer", label: "Memory Map (newest centre)" },
          { id: "time-scrubber", label: "Time Scrubber" },
        ],
      },
      {
        id: "suite",
        label: "Suite",
        items: items(
          "Shortcuts", "Entity Chip", "Mention Input", "Backlinks", "Quick Capture", "Today Timeline", "Sync Status", "App Theming"
        ),
      },
    ],
  },
  {
    id: "system",
    label: "System",
    route: "components",
    pages: [
      {
        id: "system",
        label: "System Monitor",
        items: [
          { id: "volume-mixer", label: "Volume Mixer" },
          { id: "device-batteries", label: "Device Batteries" },
          { id: "dev-servers", label: "Dev Servers" },
          { id: "agents", label: "Agent Quotas & Sessions" },
          { id: "readouts", label: "Menu Bar Readouts" },
          { id: "thermals", label: "Temperatures & Fans" },
          { id: "alerts", label: "Alert Rules" },
          { id: "storage", label: "Storage Map" },
          { id: "apps", label: "Apps, Not Processes" },
          { id: "loading", label: "Loading States" },
          { id: "containers", label: "Containers" },
        ],
      },
    ],
  },
  {
    id: "ops",
    label: "Ops",
    route: "components",
    pages: [
      {
        id: "region-map",
        label: "Region Map",
        items: [
          { id: "fleet", label: "Global Fleet" },
          { id: "globe-view", label: "Globe View" },
          { id: "live", label: "Live Updates" },
          { id: "controlled", label: "Controlled" },
          { id: "loading", label: "Loading" },
          { id: "empty", label: "Empty" },
          { id: "narrow", label: "Narrow Width" },
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
    ],
  },
  {
    id: "geo",
    label: "Geo",
    route: "components",
    pages: [
      {
        id: "geo",
        label: "World Map",
        items: [
          { id: "traffic-by-country", label: "Traffic by Country" },
          { id: "live-visitors", label: "Live Visitors" },
          { id: "attack-origins", label: "Attack Origins" },
          { id: "projections", label: "Projections" },
          { id: "loading", label: "Loading" },
          { id: "narrow", label: "Narrow Width" },
        ],
      },
      {
        id: "globe",
        label: "Globe",
        items: [
          { id: "live-visitors-globe", label: "Live Visitors" },
          { id: "attack-globe", label: "Attack Origins" },
          { id: "choropleth-globe", label: "Choropleth" },
          { id: "controlled-globe", label: "Controlled" },
          { id: "loading-globe", label: "Loading" },
          { id: "narrow-globe", label: "Narrow Width" },
        ],
      },
      {
        id: "live-visitors",
        label: "Live Visitors",
        items: [
          { id: "live-screen", label: "Live Screen" },
          { id: "controlled-view", label: "Controlled" },
          { id: "loading-visitors", label: "Loading" },
          { id: "empty-visitors", label: "Empty" },
          { id: "narrow-visitors", label: "Narrow Width" },
        ],
      },
    ],
  },
  {
    id: "media",
    label: "Media",
    route: "components",
    pages: [
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
    ],
  },
  {
    id: "voice",
    label: "Voice",
    route: "components",
    pages: [
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
    ],
  },
  {
    id: "social",
    label: "Social",
    route: "components",
    pages: [
      {
        id: "social",
        label: "Apps & Social",
        items: items(
          "App Launcher", "Identity Mark", "Text Button", "Install Button", "Incoming Call", "Call Screen",
          "Messenger", "Group Info Panel", "Reorderable List", "Checklist", "Countdown", "Stopwatch",
          "Tally Counter", "Status Cycle", "Recurrence Picker", "Pinned Note"
        ),
      },
    ],
  },
  {
    id: "billing",
    label: "Billing",
    route: "components",
    pages: [
      {
        id: "billing-marketing",
        label: "Billing & Marketing",
        items: [
          { id: "billing-banners", label: "Billing Banners" },
          { id: "plan-picker", label: "Plan Picker" },
          { id: "plan-comparison", label: "Plan Comparison" },
          { id: "current-plan", label: "Current Plan" },
          { id: "credits", label: "Credits & Auto-reload" },
          { id: "invoices", label: "Invoices" },
          { id: "checkout-steps", label: "Checkout Steps" },
          { id: "marketplace", label: "Marketplace" },
          { id: "extension-detail", label: "Extension Detail" },
          { id: "author-shelf", label: "Author Shelf" },
          { id: "testimonial-wall", label: "Testimonial Wall" },
          { id: "feature-grid", label: "Feature Grid" },
          { id: "install-snippet", label: "Install Snippet" },
          { id: "comparison-table", label: "Comparison Table" },
        ],
      },
    ],
  },
  {
    id: "editor",
    label: "Editor",
    route: "components",
    pages: [
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
    ],
  },
  { id: "blocks", label: "Blocks", pages: [{ id: "gallery", label: "Block Gallery" }] },
];

/** The URL section a page is served under. */
export function routeOf(section: NavSection, page: NavPage) {
  return page.route ?? section.route ?? section.id;
}

/** Old `section/page` routes that moved, so existing links keep working. */
export const routeAliases: Record<string, string> = {
  "components/media": "components/content",
};

/** Finds the nav group and page for a route. */
export function findPage(section: string, page: string) {
  for (const s of nav) {
    const p = s.pages.find((candidate) => candidate.id === page && routeOf(s, candidate) === section);
    if (p) return { section: s, page: p };
  }
  return { section: undefined, page: undefined };
}
