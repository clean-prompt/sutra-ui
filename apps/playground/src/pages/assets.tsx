import * as React from "react";
import {
  BackgroundPattern,
  Button,
  CountryFlag,
  DeviceFrame,
  EmojiPicker,
  EmojiReactionBar,
  EmptyStateIllustration,
  FeaturedIcon,
  FileFormatIcon,
  Heading,
  Icon,
  LogoCloud,
  SutraAppIcon,
  SutraLogo,
  SutraMark,
  SutraWordmark,
  Text,
  countries,
  fileFormatColors,
  getFileCategory,
  placeholderLogos,
  sutraAppMeta,
  sutraApps,
  useCopy,
  type BackgroundPatternVariant,
  type EmojiReactionItem,
  type EmptyStateIllustrationVariant,
  type Tone,
  type FeaturedIconVariant,
  type IconComponent,
  type SutraLogoSize,
  type SutraMarkVariant,
} from "@sutra/ui";
import {
  RiAddLine,
  RiAlarmLine,
  RiArchiveLine,
  RiArrowRightLine,
  RiAttachmentLine,
  RiBankCardLine,
  RiBarChartBoxLine,
  RiBookmarkLine,
  RiCalendarLine,
  RiChat3Line,
  RiCheckLine,
  RiCheckboxCircleLine,
  RiCloseLine,
  RiCloudLine,
  RiCodeSSlashLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiEditLine,
  RiErrorWarningLine,
  RiEyeLine,
  RiFileTextLine,
  RiFilterLine,
  RiFlashlightLine,
  RiFolderLine,
  RiGlobalLine,
  RiHeartLine,
  RiHome4Line,
  RiImageLine,
  RiInformationLine,
  RiLinkM,
  RiLockLine,
  RiLogoutBoxRLine,
  RiMailLine,
  RiMapPinLine,
  RiMenuLine,
  RiMoreLine,
  RiNotification3Line,
  RiPhoneLine,
  RiRefreshLine,
  RiSearchLine,
  RiSendPlaneLine,
  RiSettings3Line,
  RiShareLine,
  RiShieldCheckLine,
  RiStarLine,
  RiTeamLine,
  RiTimeLine,
  RiUploadLine,
  RiUserLine,
  RiSparklingLine,
} from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Brand                                                               */
/* ------------------------------------------------------------------ */

const logoSizes: SutraLogoSize[] = ["xs", "sm", "md", "lg", "xl"];
const markVariants: SutraMarkVariant[] = ["tile", "glyph", "outline", "solid", "badge"];
const markSizes = [16, 32, 96, 160];

/** Every mark variant at 16, 32, 96 and 160 px, on the page theme or on a panel pinned to dark. */
function MarkSizesPanel({ mode }: { mode: "page" | "dark" }) {
  return (
    <div data-theme={mode === "dark" ? "dark" : undefined} className="space-y-4 overflow-x-auto rounded-box border border-border bg-background p-4 text-foreground">
      <p className="text-xs font-medium text-muted-foreground">{mode === "dark" ? "Dark (pinned)" : "Page theme"}</p>
      {markVariants.map((variant) => (
        <div key={variant} className="flex min-w-max items-end gap-5">
          <span className="w-14 shrink-0 pb-1 text-xs text-muted-foreground">{variant}</span>
          {markSizes.map((px) => (
            <SutraMark key={px} variant={variant} size={px} title={`Sutra mark (${variant}, ${px}px, ${mode})`} />
          ))}
        </div>
      ))}
    </div>
  );
}

function LogoDemo() {
  return (
    <Demo
      id="logo"
      title="Logo"
      description="SutraLogo pairs the thread mark with the wordmark. SutraMark and SutraWordmark are also available on their own."
      align="start"
      canvasClassName="gap-8"
    >
      <div className="space-y-3">
        <DemoLabel>Sizes</DemoLabel>
        <div className="flex flex-wrap items-end gap-8">
          {logoSizes.map((size) => (
            <SutraLogo key={size} size={size} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <DemoLabel>Layouts and mark variants</DemoLabel>
        <div className="flex flex-wrap items-center gap-10">
          <SutraLogo layout="horizontal" size="lg" />
          <SutraLogo layout="stacked" size="md" />
          {markVariants.map((variant) => (
            <SutraLogo key={variant} size="lg" markVariant={variant} />
          ))}
          <SutraLogo size="lg" markOnly />
        </div>
      </div>

      <div className="space-y-3">
        <DemoLabel>Product suffix</DemoLabel>
        <div className="flex flex-wrap items-center gap-8">
          <SutraLogo size="md" product="notes" />
          <SutraLogo size="md" product="tasks" markVariant="outline" />
          <SutraLogo size="md" product="calendar" markVariant="glyph" />
          <SutraLogo size="md" product="files" markVariant="solid" />
          <SutraLogo size="md" product="vault" markVariant="badge" />
        </div>
      </div>

      <div className="space-y-3">
        <DemoLabel>SutraMark variants</DemoLabel>
        <div className="flex flex-wrap items-center gap-6">
          {markVariants.map((variant) => (
            <div key={variant} className="flex flex-col items-center gap-2">
              <SutraMark variant={variant} size={48} title={`Sutra mark (${variant})`} />
              <span className="text-xs text-muted-foreground">{variant}</span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-2">
            <SutraMark variant="glyph" size={48} className="text-primary" />
            <span className="text-xs text-muted-foreground">glyph, tinted</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <SutraMark variant="badge" size={48} className="text-primary" />
            <span className="text-xs text-muted-foreground">badge, tinted</span>
          </div>
        </div>
        <p className="max-w-2xl text-xs text-muted-foreground">
          solid reads --primary and --primary-foreground (brand colour in the stock theme, ink on paper in paper light, white in
          paper dark). badge is a heavy frame in currentColor, so it takes any text colour.
        </p>
      </div>

      <div className="space-y-3">
        <DemoLabel>Sizes and colour modes</DemoLabel>
        <div className="grid gap-4">
          <MarkSizesPanel mode="page" />
          <MarkSizesPanel mode="dark" />
        </div>
      </div>

      <div className="space-y-3">
        <DemoLabel>SutraWordmark</DemoLabel>
        <div className="flex flex-wrap items-baseline gap-8">
          <SutraWordmark size="lg" />
          <SutraWordmark size="xl" gradient />
          <span className="rounded-box bg-inverse px-4 py-3 text-inverse-foreground">
            <SutraWordmark size="lg" />
          </span>
        </div>
      </div>
    </Demo>
  );
}

const appShapes = ["rounded", "squircle", "circle"] as const;

function AppIconsDemo() {
  return (
    <Demo
      id="app-icons"
      title="App icons"
      description="A gradient tile per suite app, from sutraApps and sutraAppMeta, in three corner shapes."
      align="start"
      canvasClassName="gap-8"
    >
      {appShapes.map((shape) => (
        <div key={shape} className="space-y-3">
          <DemoLabel>{shape}</DemoLabel>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-6">
            {sutraApps.map((app) => (
              <div key={app} className="flex flex-col items-center gap-2">
                <SutraAppIcon app={app} shape={shape} size={52} title={sutraAppMeta[app].name} />
                <span className="text-xs text-muted-foreground">{sutraAppMeta[app].name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="space-y-3">
        <DemoLabel>Sizes</DemoLabel>
        <div className="flex flex-wrap items-end gap-4">
          {[24, 32, 40, 56, 72].map((size) => (
            <SutraAppIcon key={size} app="tasks" shape="squircle" size={size} />
          ))}
        </div>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Placeholder logos                                                   */
/* ------------------------------------------------------------------ */

function PlaceholderLogosDemo() {
  return (
    <Demo
      id="placeholder-logos"
      title="Placeholder logos"
      description="Fictional company logos for logo clouds, testimonials and mockups. LogoCloud lays them out as a grid or a marquee."
      align="start"
      canvasClassName="gap-10"
    >
      <div className="space-y-3">
        <DemoLabel>All logos</DemoLabel>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-x-6 gap-y-6">
          {placeholderLogos.map(({ name, Logo }) => (
            <div key={name} className="flex items-center text-foreground">
              <Logo size="md" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <DemoLabel>Sizes and mark only</DemoLabel>
        <div className="flex flex-wrap items-center gap-8 text-foreground">
          {placeholderLogos.slice(0, 3).map(({ name, Logo }, i) => (
            <Logo key={name} size={(["sm", "md", "lg"] as const)[i]} />
          ))}
          {placeholderLogos.slice(3, 8).map(({ name, Logo }) => (
            <Logo key={name} size="lg" markOnly />
          ))}
        </div>
      </div>

      <LogoCloud title="Trusted by teams at" limit={6} columns={6} />

      <LogoCloud title="Marquee" marquee logos={placeholderLogos} duration={40} />
      <LogoCloud marquee reverse logos={placeholderLogos.slice(4)} logoSize="sm" duration={30} />
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Featured icon                                                       */
/* ------------------------------------------------------------------ */

const featuredVariants: FeaturedIconVariant[] = ["soft", "solid", "outline-ring", "glass"];
const featuredTones: Tone[] = ["primary", "neutral", "success", "warning", "destructive", "info"];
const featuredToneIcons: Record<Tone, IconComponent> = {
  primary: RiSparklingLine,
  neutral: RiSettings3Line,
  success: RiCheckboxCircleLine,
  warning: RiErrorWarningLine,
  destructive: RiDeleteBinLine,
  info: RiInformationLine,
};

function FeaturedIconDemo() {
  return (
    <Demo
      id="featured-icon"
      title="Featured icon"
      description="An icon in a tinted tile, in soft, solid, outline-ring and glass styles, six colors and four sizes."
      align="start"
      canvasClassName="gap-8"
    >
      {featuredVariants.map((variant) => (
        <div key={variant} className="space-y-3">
          <DemoLabel>{variant}</DemoLabel>
          <div
            className={
              variant === "glass"
                ? "flex flex-wrap items-center gap-4 rounded-box bg-gradient-to-br from-primary/30 via-info/20 to-success/30 p-4"
                : "flex flex-wrap items-center gap-4"
            }
          >
            {featuredTones.map((tone) => (
              <FeaturedIcon key={tone} variant={variant} tone={tone} icon={featuredToneIcons[tone]} label={tone} />
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-3">
        <DemoLabel>Sizes and shapes</DemoLabel>
        <div className="flex flex-wrap items-center gap-4">
          {(["sm", "md", "lg", "xl"] as const).map((size) => (
            <FeaturedIcon key={size} size={size} icon={RiMailLine} />
          ))}
          {(["sm", "md", "lg", "xl"] as const).map((size) => (
            <FeaturedIcon key={`sq-${size}`} size={size} shape="square" variant="solid" icon={RiFlashlightLine} />
          ))}
          {(["sm", "md", "lg", "xl"] as const).map((size) => (
            <FeaturedIcon key={`ring-${size}`} size={size} variant="outline-ring" tone="success" icon={RiShieldCheckLine} />
          ))}
        </div>
      </div>

      <div className="flex max-w-sm gap-4 rounded-box border border-border bg-card p-4">
        <FeaturedIcon variant="outline-ring" tone="primary" icon={RiTeamLine} />
        <div className="space-y-1">
          <Heading as="h4" size="sm">
            Invite your team
          </Heading>
          <Text size="sm" tone="neutral">
            Share projects and track progress together. Seats are free until March.
          </Text>
        </div>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const popularIcons: [string, IconComponent][] = [
  ["RiHome4Line", RiHome4Line],
  ["RiSearchLine", RiSearchLine],
  ["RiSettings3Line", RiSettings3Line],
  ["RiUserLine", RiUserLine],
  ["RiTeamLine", RiTeamLine],
  ["RiNotification3Line", RiNotification3Line],
  ["RiMailLine", RiMailLine],
  ["RiChat3Line", RiChat3Line],
  ["RiCalendarLine", RiCalendarLine],
  ["RiTimeLine", RiTimeLine],
  ["RiAlarmLine", RiAlarmLine],
  ["RiStarLine", RiStarLine],
  ["RiHeartLine", RiHeartLine],
  ["RiBookmarkLine", RiBookmarkLine],
  ["RiShareLine", RiShareLine],
  ["RiLinkM", RiLinkM],
  ["RiAddLine", RiAddLine],
  ["RiCloseLine", RiCloseLine],
  ["RiCheckLine", RiCheckLine],
  ["RiEditLine", RiEditLine],
  ["RiDeleteBinLine", RiDeleteBinLine],
  ["RiMoreLine", RiMoreLine],
  ["RiMenuLine", RiMenuLine],
  ["RiFilterLine", RiFilterLine],
  ["RiArrowRightLine", RiArrowRightLine],
  ["RiRefreshLine", RiRefreshLine],
  ["RiDownloadLine", RiDownloadLine],
  ["RiUploadLine", RiUploadLine],
  ["RiAttachmentLine", RiAttachmentLine],
  ["RiFileTextLine", RiFileTextLine],
  ["RiFolderLine", RiFolderLine],
  ["RiArchiveLine", RiArchiveLine],
  ["RiImageLine", RiImageLine],
  ["RiCloudLine", RiCloudLine],
  ["RiCodeSSlashLine", RiCodeSSlashLine],
  ["RiGlobalLine", RiGlobalLine],
  ["RiMapPinLine", RiMapPinLine],
  ["RiPhoneLine", RiPhoneLine],
  ["RiSendPlaneLine", RiSendPlaneLine],
  ["RiEyeLine", RiEyeLine],
  ["RiLockLine", RiLockLine],
  ["RiShieldCheckLine", RiShieldCheckLine],
  ["RiInformationLine", RiInformationLine],
  ["RiErrorWarningLine", RiErrorWarningLine],
  ["RiBarChartBoxLine", RiBarChartBoxLine],
  ["RiBankCardLine", RiBankCardLine],
  ["RiSparklingLine", RiSparklingLine],
  ["RiLogoutBoxRLine", RiLogoutBoxRLine],
];

function IconsDemo() {
  const { copied, copy } = useCopy();
  const [lastCopied, setLastCopied] = React.useState<string | null>(null);

  return (
    <Demo
      id="icons"
      title="Icons"
      description="Every Remix icon is re-exported from @sutra/ui/icons. Wrap one in Icon for token sizes and tones. Click a tile to copy its name."
      align="start"
      canvasClassName="gap-6"
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2">
        {popularIcons.map(([name, Comp]) => (
          <button
            key={name}
            type="button"
            onClick={async () => {
              if (await copy(name)) setLastCopied(name);
            }}
            className="flex flex-col items-center gap-2 rounded-control border border-transparent px-1 py-3 text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Icon as={Comp} size="lg" />
            <span className="w-full truncate text-center text-[10px]">
              {copied && lastCopied === name ? "Copied" : name.slice(2)}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <DemoLabel>Icon sizes and tones</DemoLabel>
        <div className="flex flex-wrap items-center gap-4">
          {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
            <Icon key={size} as={RiStarLine} size={size} />
          ))}
          <span className="mx-2 h-6 w-px bg-border" />
          {(["default", "muted", "primary", "success", "warning", "destructive", "info"] as const).map((tone) => (
            <Icon key={tone} as={RiHeartLine} size="lg" tone={tone} label={tone} />
          ))}
        </div>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Country flags                                                       */
/* ------------------------------------------------------------------ */

function CountryFlagsDemo() {
  return (
    <Demo
      id="country-flags"
      title="Country flags"
      description="Inline SVG flags for 40 countries, with an emoji fallback for any other ISO code."
      align="start"
      canvasClassName="gap-8"
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-x-6 gap-y-3">
        {countries.map((country) => (
          <div key={country.code} className="flex min-w-0 items-center gap-2.5">
            <CountryFlag code={country.code} size="md" />
            <span className="truncate text-sm text-foreground">{country.name}</span>
            <span className="ml-auto font-mono text-xs text-muted-foreground">{country.code}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <DemoLabel>Shapes and sizes</DemoLabel>
        <div className="flex flex-wrap items-center gap-4">
          {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
            <CountryFlag key={size} code="KR" size={size} />
          ))}
          <span className="mx-2 h-6 w-px bg-border" />
          {(["US", "JP", "BR", "IN", "DE"] as const).map((code) => (
            <CountryFlag key={code} code={code} shape="circle" size="xl" />
          ))}
          {(["SE", "CH", "CA"] as const).map((code) => (
            <CountryFlag key={code} code={code} shape="square" size="xl" />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <DemoLabel>Emoji fallback for unlisted codes</DemoLabel>
        <div className="flex flex-wrap items-center gap-3">
          {["GR", "KE", "CL", "IS"].map((code) => (
            <CountryFlag key={code} code={code} size="lg" />
          ))}
        </div>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Emoji reactions                                                     */
/* ------------------------------------------------------------------ */

function EmojiReactionsDemo() {
  const [reactions, setReactions] = React.useState<EmojiReactionItem[]>([
    { emoji: "👍", count: 12, reacted: true },
    { emoji: "🎉", count: 5 },
    { emoji: "👀", count: 3 },
    { emoji: "❤️", count: 1 },
  ]);
  const [picked, setPicked] = React.useState<string | null>(null);

  return (
    <Demo
      id="emoji-reactions"
      title="Emoji reactions"
      description="A reaction bar with a picker for adding new reactions, and the standalone EmojiPicker."
      align="start"
      canvasClassName="gap-8"
    >
      <div className="max-w-md space-y-3 rounded-box border border-border bg-card p-4">
        <div className="space-y-1">
          <Text size="sm" weight="semibold">
            Priya Raman
          </Text>
          <Text size="sm" tone="neutral">
            The new onboarding flow shipped to everyone this morning. Activation is up 18% in the first cohort.
          </Text>
        </div>
        <EmojiReactionBar reactions={reactions} onReactionsChange={setReactions} />
      </div>

      <div className="space-y-3">
        <DemoLabel>Small, read-only</DemoLabel>
        <EmojiReactionBar
          size="sm"
          readOnly
          defaultReactions={[
            { emoji: "🔥", count: 24 },
            { emoji: "😂", count: 9 },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <EmojiPicker onSelect={(emoji) => setPicked(emoji)} />
        <Text size="sm" tone="neutral">
          {picked ? (
            <>
              Selected <span className="text-2xl">{picked}</span>
            </>
          ) : (
            "Pick an emoji"
          )}
        </Text>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* File format icons                                                   */
/* ------------------------------------------------------------------ */

const allFormats = Object.keys(fileFormatColors);

function FileFormatIconsDemo() {
  return (
    <Demo
      id="file-format-icons"
      title="File format icons"
      description={`Document icons for ${allFormats.length} extensions, colored by format. Pass a filename or a bare extension.`}
      align="start"
      canvasClassName="gap-8"
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-x-4 gap-y-5">
        {allFormats.map((ext) => (
          <div key={ext} className="flex flex-col items-center gap-1.5" title={getFileCategory(ext)}>
            <FileFormatIcon ext={ext} size="md" />
            <span className="font-mono text-[10px] text-muted-foreground">.{ext}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <DemoLabel>Variants and sizes</DemoLabel>
        <div className="flex flex-wrap items-end gap-4">
          {(["default", "solid", "minimal"] as const).map((variant) => (
            <FileFormatIcon key={variant} ext="Q3 report.pdf" variant={variant} size="xl" />
          ))}
          <span className="mx-2 h-10 w-px bg-border" />
          {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
            <FileFormatIcon key={size} ext="xlsx" variant="solid" size={size} />
          ))}
          <FileFormatIcon ext="brief.unknown" size="xl" label="file" />
        </div>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

const emptyStates: { variant: EmptyStateIllustrationVariant; title: string; caption: string }[] = [
  { variant: "search", title: "No results found", caption: "Try a different keyword or clear your filters." },
  { variant: "inbox", title: "Inbox zero", caption: "You're all caught up. New messages will appear here." },
  { variant: "files", title: "No files yet", caption: "Upload a document or drag files here to get started." },
  { variant: "error", title: "Something went wrong", caption: "We couldn't load this page. Please try again." },
  { variant: "success", title: "All done", caption: "Your changes were saved and synced." },
  { variant: "cloud", title: "You're offline", caption: "We'll sync your work once you reconnect." },
];

function EmptyStateDemo() {
  return (
    <Demo
      id="empty-state"
      title="Empty state illustrations"
      description="Theme-aware spot illustrations for empty, error and success states."
      align="start"
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4">
        {emptyStates.map(({ variant, title, caption }) => (
          <div key={variant} className="flex flex-col items-center gap-3 rounded-box border border-border bg-card p-6 text-center">
            <EmptyStateIllustration variant={variant} size={140} />
            <div className="space-y-1">
              <Heading as="h4" size="sm">
                {title}
              </Heading>
              <Text size="sm" tone="neutral">
                {caption}
              </Text>
            </div>
            {variant === "error" ? (
              <Button size="sm" variant="secondary" leadingIcon={<RiRefreshLine />}>
                Retry
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Device frame                                                        */
/* ------------------------------------------------------------------ */

function SampleScreen({ compact }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-3 p-4" : "space-y-4 p-6"}>
      <div className="flex items-center justify-between">
        <SutraLogo size="sm" product="tasks" />
        <Icon as={RiNotification3Line} tone="neutral" />
      </div>
      <Heading as="h4" size={compact ? "md" : "lg"}>
        Today
      </Heading>
      <ul className="space-y-2">
        {["Review Q3 roadmap", "Reply to design feedback", "Book flights to Seoul", "Ship onboarding v2"].map((task, i) => (
          <li key={task} className="flex items-center gap-2 rounded-control border border-border bg-card px-3 py-2 text-sm">
            <Icon as={i === 0 ? RiCheckboxCircleLine : RiCheckLine} tone={i === 0 ? "success" : "muted"} />
            <span className={i === 0 ? "text-muted-foreground line-through" : "text-foreground"}>{task}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeviceFrameDemo() {
  return (
    <Demo
      id="device-frame"
      title="Device frame"
      description="Browser chrome and phone or tablet bezels for screenshots and product mockups."
      align="start"
      canvasClassName="gap-10"
    >
      <div className="space-y-3">
        <DemoLabel>Browser</DemoLabel>
        <DeviceFrame variant="browser" url="app.sutra.dev/tasks" className="max-w-2xl">
          <SampleScreen />
        </DeviceFrame>
        <DeviceFrame variant="browser" url="sutra.app/pricing" trafficLights={false} className="max-w-md">
          <div className="flex h-32 items-center justify-center bg-muted">
            <Text size="sm" tone="neutral">
              Neutral window controls
            </Text>
          </div>
        </DeviceFrame>
      </div>

      <div className="flex flex-wrap items-start gap-10 overflow-x-auto pb-2">
        <div className="space-y-3">
          <DemoLabel>Phone</DemoLabel>
          <DeviceFrame variant="phone">
            <SampleScreen compact />
          </DeviceFrame>
        </div>
        <div className="space-y-3">
          <DemoLabel>Tablet</DemoLabel>
          <DeviceFrame variant="tablet">
            <SampleScreen />
          </DeviceFrame>
        </div>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Background pattern                                                  */
/* ------------------------------------------------------------------ */

const patternVariants: BackgroundPatternVariant[] = ["grid", "dots", "circles", "lines"];

function BackgroundPatternDemo() {
  return (
    <Demo
      id="background-pattern"
      title="Background pattern"
      description="Absolutely positioned decorative patterns with a fade mask. Place inside a relative container."
      align="start"
      canvasClassName="gap-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {patternVariants.map((variant) => (
          <div
            key={variant}
            className="relative flex h-44 items-center justify-center overflow-hidden rounded-box border border-border bg-card"
          >
            <BackgroundPattern variant={variant} />
            <div className="relative text-center">
              <Text weight="semibold">{variant}</Text>
              <Text size="xs" tone="neutral">
                fade="radial"
              </Text>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(["top", "bottom", "edges"] as const).map((fade) => (
          <div
            key={fade}
            className="relative flex h-32 items-center justify-center overflow-hidden rounded-box border border-border bg-card"
          >
            <BackgroundPattern variant="grid" cellSize={20} fade={fade} />
            <Text size="sm" tone="neutral" className="relative">
              fade="{fade}"
            </Text>
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-box border border-border bg-card px-6 py-14 text-center">
        <BackgroundPattern variant="dots" color="var(--primary)" cellSize={20} />
        <div className="relative mx-auto max-w-md space-y-4">
          <SutraMark size={44} className="mx-auto" />
          <Heading as="h4" size="display-xs">
            Your work, tied together
          </Heading>
          <Text tone="neutral">Notes, tasks and calendar in one calm workspace.</Text>
          <Button trailingIcon={<RiArrowRightLine />}>Get started</Button>
        </div>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function AssetsPage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="Assets"
      description="Brand marks, app icons, placeholder logos, icons, flags, emoji, file formats and decorative illustrations."
    >
      <LogoDemo />
      <AppIconsDemo />
      <PlaceholderLogosDemo />
      <FeaturedIconDemo />
      <IconsDemo />
      <CountryFlagsDemo />
      <EmojiReactionsDemo />
      <FileFormatIconsDemo />
      <EmptyStateDemo />
      <DeviceFrameDemo />
      <BackgroundPatternDemo />
    </PageIntro>
  );
}
