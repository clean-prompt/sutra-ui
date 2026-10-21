import * as React from "react";
import {
  Badge,
  Button,
  Frame,
  FrameAction,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
  Switch,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  DividedGrid,
  DividedGridItem,
  InlineCode,
  LogoCloud,
  Marquee,
  SearchTrigger,
  Text,
  placeholderLogos,
} from "@sutra/ui";
import {
  RiArrowUpDownLine,
  RiFileCopy2Line,
  RiFileLockLine,
  RiFileTextLine,
  RiFileTransferLine,
  RiImageLine,
  RiLoopLeftLine,
  RiMailLine,
  RiQrCodeLine,
  RiScissorsCutLine,
  RiSettings4Line,
} from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";
import { href } from "../router";
import { FlipListDemo } from "../demos/flip-demos";
import { MorphPillDemo } from "../demos/morph-demos";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const here = (anchor: string) => href("components", "layout-patterns", anchor);

const tools = [
  { title: "Merge files", description: "Combine several PDFs into one document, in the order you choose.", icon: <RiFileCopy2Line />, meta: "Up to 20 files", href: here("tool-grid") },
  { title: "Split pages", description: "Pull out a page range or save every page as its own file.", icon: <RiScissorsCutLine />, meta: "Any page count", href: here("tool-grid") },
  { title: "Compress", description: "Make a file smaller without a visible drop in quality. Pick a target size or let it decide.", icon: <RiArrowUpDownLine />, badge: "Popular", meta: "Up to 100 MB", href: here("tool-grid") },
  { title: "Convert images", description: "Switch between PNG, JPG and WebP, and resize on the way.", icon: <RiImageLine />, meta: "Batch of 50", href: here("tool-grid") },
  { title: "Extract text", description: "Read the text out of a scan or a photo of a page. A very long description is cut after three lines so that every cell in the row keeps the same height as its neighbours.", icon: <RiFileTextLine />, badge: "New", meta: "12 languages", href: here("tool-grid") },
  { title: "Protect", description: "Add or remove a password.", icon: <RiFileLockLine />, meta: "AES-256", href: here("tool-grid") },
  { title: "Rotate", description: "Turn pages the right way up.", icon: <RiLoopLeftLine />, href: here("tool-grid") },
  { title: "Scan a code", description: "Open a link from a QR code in a photo.", icon: <RiQrCodeLine />, disabled: true, meta: "Coming soon" },
  { title: "Send a copy", description: "Hand a finished file to someone else.", icon: <RiFileTransferLine />, href: here("tool-grid") },
];

const formats = ["PDF", "DOCX", "XLSX", "PNG", "JPG", "WebP", "SVG", "MP4", "MP3", "ZIP", "CSV", "JSON", "Markdown", "EPUB"];

const chipClass =
  "inline-flex h-9 items-center whitespace-nowrap rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground";

/* ------------------------------------------------------------------ */
/* Divided grid demos                                                  */
/* ------------------------------------------------------------------ */

function ToolGridDemo() {
  const [picked, setPicked] = React.useState<string | null>(null);
  return (
    <Demo
      id="tool-grid"
      title="Tool grid"
      description="One bordered box with hairlines between the cells, not a stack of cards. Numbered, with icon tiles, a badge, a meta line and links; the description stops after three lines. A hovered cell fills in; Tab shows an inset focus ring. One cell is disabled, one is a button."
      align="start"
    >
      <DividedGrid label="File tools" numbered columns={3} query="container">
        {tools.slice(0, 8).map((tool) => (
          <DividedGridItem key={tool.title} {...tool} />
        ))}
        <DividedGridItem
          title="Settings"
          description="Choose defaults for every tool. This cell is a button: it reports the pick below instead of opening a page."
          icon={<RiSettings4Line />}
          meta="Button cell"
          onSelect={() => setPicked("Settings")}
        />
      </DividedGrid>
      <Text size="sm" tone="neutral" aria-live="polite">
        {picked ? `${picked} picked.` : "Pick the Settings cell to see the button behaviour."}
      </Text>
    </Demo>
  );
}

function FourColumnsDemo() {
  return (
    <Demo
      id="grid-four-columns"
      title="Four columns"
      description="columns={4} steps 1 → 2 → 4 as the space grows. The same grid without numbers or links is a plain feature list."
      align="start"
    >
      <DividedGrid label="Highlights" columns={4} query="container">
        {tools.slice(0, 8).map(({ title, description, icon }) => (
          <DividedGridItem key={title} title={title} description={description} icon={icon} />
        ))}
      </DividedGrid>
    </Demo>
  );
}

function OddCountDemo() {
  return (
    <Demo
      id="grid-odd-count"
      title="Odd item count"
      description="A short last row leaves no stray divider and no filled gap: the box clips the last column's and row's lines. Seven items in three columns, then five in four."
      align="start"
    >
      <DividedGrid label="Seven tools" columns={3} query="container">
        {tools.slice(0, 7).map((tool) => (
          <DividedGridItem key={tool.title} {...tool} />
        ))}
      </DividedGrid>
      <DividedGrid label="Five tools" columns={4} query="container" numbered>
        {tools.slice(0, 5).map((tool) => (
          <DividedGridItem key={tool.title} {...tool} />
        ))}
      </DividedGrid>
    </Demo>
  );
}

function GridLoadingDemo() {
  const [loaded, setLoaded] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  React.useEffect(() => {
    if (!refreshing) return;
    const timer = window.setTimeout(() => setRefreshing(false), 1500);
    return () => window.clearTimeout(timer);
  }, [refreshing]);
  return (
    <Demo
      id="grid-loading"
      title="Loading"
      description="With no cells yet, placeholder cells fill the same layout. A refresh keeps the cells on screen and only marks the grid busy."
      align="start"
    >
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setLoaded((v) => !v)}>
          {loaded ? "Clear data" : "Load data"}
        </Button>
        <Button size="sm" variant="outline" disabled={!loaded} loading={refreshing} onClick={() => setRefreshing(true)}>
          Refresh
        </Button>
      </div>
      <DividedGrid label="File tools" columns={3} query="container" loading={!loaded || refreshing} loadingCells={6} numbered>
        {loaded ? tools.slice(0, 6).map((tool) => <DividedGridItem key={tool.title} {...tool} />) : null}
      </DividedGrid>
    </Demo>
  );
}

function GridEmptyDemo() {
  return (
    <Demo id="grid-empty" title="Empty" description="With no cells and nothing loading, the box shows its empty state." align="start">
      <DividedGrid label="File tools" columns={3} query="container" emptyState="No tools match your filter" />
    </Demo>
  );
}

function GridNarrowDemo() {
  return (
    <Demo
      id="grid-narrow"
      title="Narrow width"
      description={<><InlineCode>query="container"</InlineCode> measures the grid itself, not the viewport, so a grid in a narrow column collapses to one column (358 px) or two (560 px) at any screen size.</>}
      align="start"
    >
      <div className="flex flex-wrap items-start gap-6">
        <div className="w-full max-w-[358px] space-y-2">
          <DemoLabel>358 px</DemoLabel>
          <DividedGrid label="File tools (narrow)" columns={4} query="container" numbered>
            {tools.slice(0, 3).map((tool) => (
              <DividedGridItem key={tool.title} {...tool} />
            ))}
          </DividedGrid>
        </div>
        <div className="w-full max-w-[560px] space-y-2">
          <DemoLabel>560 px</DemoLabel>
          <DividedGrid label="File tools (medium)" columns={4} query="container">
            {tools.slice(0, 5).map((tool) => (
              <DividedGridItem key={tool.title} {...tool} />
            ))}
          </DividedGrid>
        </div>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Marquee demos                                                       */
/* ------------------------------------------------------------------ */

function MarqueeChipsDemo() {
  return (
    <Demo
      id="marquee-chips"
      title="Marquee: chips"
      description="Any items, scrolling endlessly. The row repeats its items as often as the width needs, so a short list still fills a wide screen. The repeats are hidden from assistive tech. With reduced motion on, the chips stand still and wrap."
      align="start"
    >
      <Marquee label="Supported formats" duration={36} gap={12}>
        {formats.map((format) => (
          <span key={format} className={chipClass}>
            {format}
          </span>
        ))}
      </Marquee>
    </Demo>
  );
}

function MarqueeLogosDemo() {
  return (
    <Demo
      id="marquee-logos"
      title="Marquee: logos"
      description="The same component carries a LogoCloud's marquee mode and any row of marks you pass in."
      align="start"
    >
      <LogoCloud marquee limit={10} duration={40} title="LogoCloud, marquee mode" />
      <Marquee label="Customers" duration={32} gap="4rem" itemClassName="text-muted-foreground">
        {placeholderLogos.slice(4, 12).map(({ name, Logo }) => (
          <Logo key={name} />
        ))}
      </Marquee>
    </Demo>
  );
}

function MarqueeReverseDemo() {
  return (
    <Demo
      id="marquee-reverse"
      title="Marquee: reverse and pause on hover"
      description={<><InlineCode>reverse</InlineCode> scrolls the other way, so two rows can drift in opposite directions. Hover a row, or move keyboard focus into it, and it pauses. The edge fade is on by default; <InlineCode>fade={false}</InlineCode> turns it off.</>}
      align="start"
    >
      <div className="space-y-4">
        <Marquee label="Formats, forward" duration={28} gap={12}>
          {formats.map((format) => (
            <span key={format} className={chipClass}>
              {format}
            </span>
          ))}
        </Marquee>
        <Marquee label="Formats, reverse" duration={34} gap={12} reverse>
          {[...formats].reverse().map((format) => (
            <span key={format} className={chipClass}>
              {format}
            </span>
          ))}
        </Marquee>
        <DemoLabel>No fade, no pause</DemoLabel>
        <Marquee label="Formats, steady" duration={30} gap={12} fade={false} pauseOnHover={false}>
          {formats.slice(0, 8).map((format) => (
            <span key={format} className={chipClass}>
              {format}
            </span>
          ))}
        </Marquee>
      </div>
    </Demo>
  );
}

function MarqueePauseDemo() {
  const [paused, setPaused] = React.useState(false);
  return (
    <Demo
      id="marquee-pause"
      title="Marquee: pause control"
      description={<><InlineCode>pausable</InlineCode> adds a pause and play button at the end of the row, so touch and keyboard users can stop moving content for as long as they like (WCAG 2.2.2). Hover and focus still pause it too. The button hides under reduced motion, where the row is already still. Control it with <InlineCode>paused</InlineCode> and <InlineCode>onPausedChange</InlineCode>.</>}
      align="start"
    >
      <div className="space-y-4">
        <Marquee pausable label="Formats, pausable" duration={28} gap={12}>
          {formats.map((format) => (
            <span key={format} className={chipClass}>
              {format}
            </span>
          ))}
        </Marquee>
        <Marquee pausable paused={paused} onPausedChange={setPaused} pauseLabel="Pause the customer logos" label="Customers" duration={32} gap="4rem" itemClassName="text-muted-foreground">
          {placeholderLogos.slice(4, 12).map(({ name, Logo }) => (
            <Logo key={name} />
          ))}
        </Marquee>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Logos are {paused ? "paused" : "moving"}.
        </p>
        <div className="max-w-xs">
          <DemoLabel className="mb-2">Narrow container</DemoLabel>
          <LogoCloud marquee pausable limit={8} duration={30} />
        </div>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Item and Frame                                                      */
/* ------------------------------------------------------------------ */

const itemRows = [
  { id: "mail", icon: <RiMailLine />, title: "Mail notifications", description: "Digest every morning at 8:00, and a message when someone replies to you." },
  { id: "files", icon: <RiFileTextLine />, title: "A file name that is long enough to need truncating in a narrow column.pdf", description: "Shared with 4 people" },
  { id: "images", icon: <RiImageLine />, title: "Images", description: "Compress on upload" },
];

function ItemDemo() {
  const [on, setOn] = React.useState(true);
  return (
    <Demo
      id="item"
      title="Item"
      description="One row: media, a title with a description, actions. Static, or a link or button (with an optional chevron). Sizes default, sm and xs; variants plain, outline and muted. ItemGroup lists rows with real list semantics."
      align="start"
    >
      <div className="@container grid grid-cols-1 w-full gap-8 @2xl:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <DemoLabel>ItemGroup outline, divided: static, switch, link and button rows</DemoLabel>
          <ItemGroup variant="outline" divided aria-label="Row examples">
            <Item>
              <ItemMedia variant="icon"><RiMailLine /></ItemMedia>
              <ItemContent>
                <ItemTitle>Mail notifications</ItemTitle>
                <ItemDescription>Digest every morning at 8:00</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Switch checked={on} onCheckedChange={setOn} aria-label="Mail notifications" />
              </ItemActions>
            </Item>
            <Item href="#/components/layout-patterns/item" chevron>
              <ItemMedia variant="icon"><RiFileTextLine /></ItemMedia>
              <ItemContent>
                <ItemTitle>Link row</ItemTitle>
                <ItemDescription>The whole row is one link</ItemDescription>
              </ItemContent>
            </Item>
            <Item onClick={() => setOn((v) => !v)} chevron>
              <ItemMedia variant="icon"><RiImageLine /></ItemMedia>
              <ItemContent>
                <ItemTitle>Button row</ItemTitle>
                <ItemDescription>Toggles the switch above</ItemDescription>
              </ItemContent>
            </Item>
            <Item>
              <ItemMedia variant="avatar"><span className="text-xs font-medium">AL</span></ItemMedia>
              <ItemContent>
                <ItemTitle>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">Ada Lovelace</span>
                    <Badge color="success" size="sm" className="shrink-0">Owner</Badge>
                  </span>
                </ItemTitle>
                <ItemDescription lines={2}>Two lines of description are kept, the rest is clipped after the second line of text.</ItemDescription>
              </ItemContent>
              <ItemActions><Button size="xs" variant="outline">Edit</Button></ItemActions>
            </Item>
          </ItemGroup>
        </div>
        <div className="min-w-0 space-y-4">
          <DemoLabel>Sizes and variants</DemoLabel>
          <Item variant="outline"><ItemMedia variant="icon"><RiMailLine /></ItemMedia><ItemContent><ItemTitle>default · outline</ItemTitle><ItemDescription>gap-3, px-4 py-3</ItemDescription></ItemContent></Item>
          <Item size="sm" variant="muted"><ItemMedia><RiMailLine /></ItemMedia><ItemContent><ItemTitle>sm · muted</ItemTitle><ItemDescription>A bare icon as media</ItemDescription></ItemContent></Item>
          <Item size="xs" variant="outline"><ItemContent><ItemTitle>xs · outline, no media</ItemTitle></ItemContent><ItemActions><Badge size="sm">3</Badge></ItemActions></Item>
          <Item orientation="vertical" variant="outline"><ItemMedia variant="icon"><RiImageLine /></ItemMedia><ItemContent><ItemTitle>vertical</ItemTitle><ItemDescription>Media on top, text below</ItemDescription></ItemContent></Item>
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Truncation: long titles keep a title tooltip</DemoLabel>
          <ItemGroup variant="outline" divided aria-label="Long titles">
            {itemRows.map((r) => (
              <Item key={r.id} size="sm">
                <ItemMedia variant="icon">{r.icon}</ItemMedia>
                <ItemContent>
                  <ItemTitle>{r.title}</ItemTitle>
                  <ItemDescription>{r.description}</ItemDescription>
                </ItemContent>
                <ItemActions><Badge size="sm">PDF</Badge></ItemActions>
              </Item>
            ))}
          </ItemGroup>
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Loading, empty, and ItemSeparator</DemoLabel>
          <ItemGroup variant="outline" loading loadingRows={2} aria-label="Loading rows" />
          <ItemGroup variant="outline" emptyState="No rows yet" aria-label="Empty rows" />
          <ItemGroup variant="muted" aria-label="Separated rows">
            <Item size="sm"><ItemContent><ItemTitle>First</ItemTitle></ItemContent></Item>
            <ItemSeparator />
            <Item size="sm"><ItemContent><ItemTitle>Second</ItemTitle></ItemContent></Item>
          </ItemGroup>
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Narrow container</DemoLabel>
          <div className="max-w-56">
            <ItemGroup variant="outline" divided aria-label="Narrow rows">
              <Item size="sm">
                <ItemMedia variant="icon"><RiMailLine /></ItemMedia>
                <ItemContent>
                  <ItemTitle>Mail notifications for the whole team</ItemTitle>
                  <ItemDescription>Digest every morning</ItemDescription>
                </ItemContent>
                <ItemActions><Switch size="sm" defaultChecked aria-label="Narrow switch" /></ItemActions>
              </Item>
            </ItemGroup>
          </div>
        </div>
      </div>
    </Demo>
  );
}

function FrameDemo() {
  const rows = (
    <>
      <Item size="sm">
        <ItemMedia variant="icon"><RiMailLine /></ItemMedia>
        <ItemContent><ItemTitle>Mail</ItemTitle><ItemDescription>Digest at 8:00</ItemDescription></ItemContent>
        <ItemActions><Badge size="sm" color="success">On</Badge></ItemActions>
      </Item>
      <Item size="sm" href="#/components/layout-patterns/frame" chevron>
        <ItemMedia variant="icon"><RiFileTextLine /></ItemMedia>
        <ItemContent><ItemTitle>Documents</ItemTitle><ItemDescription>Shared with 4 people</ItemDescription></ItemContent>
      </Item>
      <Item size="sm">
        <ItemMedia variant="icon"><RiImageLine /></ItemMedia>
        <ItemContent><ItemTitle>Images</ItemTitle><ItemDescription>Compress on upload</ItemDescription></ItemContent>
        <ItemActions><Badge size="sm">Off</Badge></ItemActions>
      </Item>
    </>
  );
  return (
    <Demo
      id="frame"
      title="Frame"
      description="A titled tray that holds a panel of rows. Variants default (a tray with a raised panel, corners concentric), band, inset and plain. The panel takes loading and an empty state."
      align="start"
    >
      <div className="@container grid grid-cols-1 w-full gap-8 @2xl:grid-cols-2">
        {(["default", "band", "inset", "plain"] as const).map((variant) => (
          <div key={variant} className="min-w-0 space-y-2">
            <DemoLabel>variant="{variant}"</DemoLabel>
            <Frame variant={variant}>
              <FrameHeader>
                <FrameTitle>Notifications</FrameTitle>
                <FrameAction><Button size="xs" variant="outline">Manage</Button></FrameAction>
                <FrameDescription>Where and when you hear from us</FrameDescription>
              </FrameHeader>
              <FramePanel aria-label={`${variant} notifications`}>{rows}</FramePanel>
              <FrameFooter><span>3 channels</span><span>Updated today</span></FrameFooter>
            </Frame>
          </div>
        ))}
        <div className="min-w-0 space-y-2">
          <DemoLabel>Loading</DemoLabel>
          <Frame>
            <FrameHeader><FrameTitle>Devices</FrameTitle></FrameHeader>
            <FramePanel loading loadingRows={2} aria-label="Loading devices" />
          </Frame>
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Empty</DemoLabel>
          <Frame>
            <FrameHeader><FrameTitle>Devices</FrameTitle></FrameHeader>
            <FramePanel emptyState="No devices yet" aria-label="Empty devices" />
          </Frame>
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Narrow container</DemoLabel>
          <div className="max-w-56">
            <Frame variant="band">
              <FrameHeader><FrameTitle>A long frame title that must truncate</FrameTitle><FrameAction><Button size="xs" variant="outline">Add</Button></FrameAction></FrameHeader>
              <FramePanel aria-label="Narrow frame">{rows}</FramePanel>
              <FrameFooter>3 channels</FrameFooter>
            </Frame>
          </div>
        </div>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Search trigger                                                      */
/* ------------------------------------------------------------------ */

function SearchTriggerDemo() {
  const [open, setOpen] = React.useState(false);
  const [last, setLast] = React.useState<string | null>(null);
  const run = (name: string) => () => {
    setLast(name);
    setOpen(false);
  };
  return (
    <Demo
      id="search-trigger"
      title="Search trigger"
      description={<>A button that looks like a search field and opens a command palette. The hint follows the platform (⌘ K on macOS, Ctrl K elsewhere). With <InlineCode>hotkey</InlineCode> the shortcut works anywhere on the page; a plain key such as <InlineCode>/</InlineCode> is ignored while you type in a field, a ⌘ or Ctrl chord is not.</>}
      align="start"
    >
      <div className="flex flex-wrap items-center gap-3">
        <SearchTrigger hotkey onTrigger={() => setOpen(true)} placeholder="Search tools…" className="w-72" />
        <Text size="sm" tone="neutral" aria-live="polite">
          {last ? `Picked: ${last}` : "Click it or press the shortcut."}
        </Text>
      </div>
      <div className="grid max-w-md gap-3">
        <DemoLabel>Sizes</DemoLabel>
        <SearchTrigger size="sm" onTrigger={() => setOpen(true)} placeholder="Small" />
        <SearchTrigger size="md" onTrigger={() => setOpen(true)} placeholder="Medium (default)" />
        <SearchTrigger size="lg" onTrigger={() => setOpen(true)} placeholder="Large" />
        <DemoLabel>Other shortcut, collapsing to an icon below 640 px</DemoLabel>
        <div className="flex items-center gap-2">
          <SearchTrigger hotkey shortcut="/" collapseBelow="sm" onTrigger={() => setOpen(true)} placeholder="Press / to search" />
        </div>
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search tools…" />
        <CommandList>
          <CommandEmpty>No tools found</CommandEmpty>
          <CommandGroup heading="Tools">
            {tools.slice(0, 6).map((tool) => (
              <CommandItem key={tool.title} icon={tool.icon} onSelect={run(tool.title)}>
                {tool.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Idle motion                                                         */
/* ------------------------------------------------------------------ */

function IdleMotionDemo() {
  return (
    <Demo
      id="idle-motion"
      title="Idle motion"
      description={<><InlineCode>animate-bob</InlineCode> floats an icon tile, <InlineCode>animate-ring</InlineCode> pulses a ring around a live dot. Both stand still when reduced motion is on.</>}
      canvasClassName="gap-10"
    >
      <div className="flex flex-col items-center gap-3">
        <span className="animate-bob inline-flex size-14 items-center justify-center rounded-box border border-border bg-card text-foreground shadow-sm [&_svg]:size-6">
          <RiFileCopy2Line aria-hidden />
        </span>
        <DemoLabel>animate-bob</DemoLabel>
      </div>
      <div className="flex flex-col items-center gap-3">
        <span className="relative inline-flex size-3">
          <span aria-hidden className="animate-ring absolute inset-0 rounded-full bg-success" />
          <span className="relative size-3 rounded-full bg-success" />
        </span>
        <DemoLabel>animate-ring</DemoLabel>
      </div>
      <div className="flex flex-col items-center gap-3">
        <Badge variant="soft" tone="success" className="gap-2">
          <span className="relative inline-flex size-2">
            <span aria-hidden className="animate-ring absolute inset-0 rounded-full bg-success" />
            <span className="relative size-2 rounded-full bg-success" />
          </span>
          Live
        </Badge>
        <DemoLabel>In a badge</DemoLabel>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function LayoutPatternsPage() {
  return (
    <PageIntro
      eyebrow="Patterns"
      title="Grids & Search"
      description="Layout pieces for a quiet tool site: a hairline-divided grid of cells, an endless marquee row, a search field that opens a command palette, and two idle motions."
    >
      <ToolGridDemo />
      <FourColumnsDemo />
      <OddCountDemo />
      <GridLoadingDemo />
      <GridEmptyDemo />
      <GridNarrowDemo />
      <MarqueeChipsDemo />
      <MarqueeLogosDemo />
      <MarqueeReverseDemo />
      <MarqueePauseDemo />
      <ItemDemo />
      <FrameDemo />
      <SearchTriggerDemo />
      <IdleMotionDemo />
      <FlipListDemo />
      <MorphPillDemo />
    </PageIntro>
  );
}
