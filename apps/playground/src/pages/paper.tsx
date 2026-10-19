import * as React from "react";
import {
  AreaChart,
  Badge,
  Button,
  ChipGroup,
  Chip,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  DividedGrid,
  DonutChart,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Dropzone,
  FileUpload,
  FileUploadTrigger,
  Heading,
  Marquee,
  SearchTrigger,
  StatementHero,
  SutraLogo,
  SutraMark,
  TextLink,
  ThemeToggle,
  Toaster,
  chartColorVars,
  cn,
  formatBytes,
  toast,
  type DividedGridItemData,
  type ThemeToggleMode,
} from "@sutra/ui";
import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiAspectRatioLine,
  RiContractLeftRightLine,
  RiCropLine,
  RiEraserLine,
  RiExchangeLine,
  RiFileGifLine,
  RiFileZipLine,
  RiFolderOpenLine,
  RiHeartLine,
  RiImageAddLine,
  RiImageEditLine,
  RiMusicLine,
  RiScanLine,
  RiScissorsCutLine,
  RiSettings3Line,
  RiVoiceprintLine,
} from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";
import { href } from "../router";

/*
 * The paper style end to end: a quiet, minimal file-tool site ("Sutra Files") built only from Sutra components.
 * The whole page sits in a `data-style="paper"` subtree, so it renders in paper whatever the playground's own style switch
 * says, and follows light and dark. Everything here is tokens and library parts; the few local helpers below are glue
 * (links between the demos, the dark-mode bridge, a page-wide drop).
 */

/* ------------------------------------------------------------------ */
/* Glue                                                                */
/* ------------------------------------------------------------------ */

/** Link to a demo (or a part of one) on this page. The playground router scrolls to the anchor. */
const to = (anchor: string) => href("foundations", "paper", anchor);

function subscribeDark(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const readDark = () => document.documentElement.classList.contains("dark");

/**
 * The light and dark toggle of the mock site. The playground owns the theme (its top bar switch drives `<html class="dark">`),
 * so this reads that class and asks the playground's own toggle to flip it, which keeps both in step.
 */
function ModeToggle() {
  const dark = React.useSyncExternalStore(subscribeDark, readDark, () => false);
  return (
    <ThemeToggle
      modes={["light", "dark"]}
      value={dark ? "dark" : "light"}
      applyToDocument={false}
      storageKey={null}
      onValueChange={(mode: ThemeToggleMode) => {
        if ((mode === "dark") === dark) return;
        const playgroundToggle = document.querySelector<HTMLButtonElement>('button[aria-label="Toggle dark mode"]');
        if (playgroundToggle) playgroundToggle.click();
        else document.documentElement.classList.toggle("dark", mode === "dark");
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

interface Tool {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const tools: Tool[] = [
  { title: "Image converter", description: "Convert to and from JPG, PNG, WEBP, AVIF, GIF, HEIC and more.", icon: <RiExchangeLine /> },
  { title: "Compress", description: "Shrink photos and videos while keeping them sharp.", icon: <RiContractLeftRightLine /> },
  { title: "Resize", description: "Set exact pixel dimensions or scale by a percentage, in bulk.", icon: <RiAspectRatioLine /> },
  { title: "Strip metadata", description: "Remove location, camera and author details before you share.", icon: <RiEraserLine /> },
  { title: "Trim video", description: "Cut a clip down to the part you want, without re-encoding.", icon: <RiScissorsCutLine /> },
  { title: "Extract audio", description: "Pull the soundtrack out of any video as MP3, WAV or FLAC.", icon: <RiMusicLine /> },
  { title: "HEIC to JPG", description: "Turn iPhone photos into files every app can open.", icon: <RiImageEditLine /> },
  { title: "Video to GIF", description: "Make a short looping animation from any clip.", icon: <RiFileGifLine /> },
  { title: "Zip and unzip", description: "Bundle files into one archive, or open an archive you were sent.", icon: <RiFileZipLine /> },
  { title: "Crop", description: "Cut a picture to a square, a story or any ratio you like.", icon: <RiCropLine /> },
  { title: "Audio to text", description: "Turn a recording into a transcript, entirely on your device.", icon: <RiVoiceprintLine /> },
  { title: "Scan to text", description: "Read the words out of a screenshot or a photo of a page.", icon: <RiScanLine /> },
];

const formatsMarquee = [
  "JPG", "PNG", "WEBP", "AVIF", "HEIC", "TIFF", "BMP", "ICO", "SVG", "GIF",
  "MP4", "MOV", "WEBM", "MKV", "MP3", "WAV", "FLAC", "M4A", "OGG", "PDF",
];

/** Output formats of the image converter. */
const outputFormats = ["PNG", "JPG", "WEBP", "AVIF", "GIF"];

const footerColumns: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Convert",
    links: [
      { label: "Tools", to: "tools" },
      { label: "Conversions", to: "tool" },
      { label: "Formats", to: "formats" },
      { label: "Compress", to: "tool" },
      { label: "Limits", to: "details" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "Guides", to: "tools" },
      { label: "Comparisons", to: "formats" },
      { label: "About", to: "landing" },
      { label: "Offline", to: "details" },
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "No upload", to: "landing" },
      { label: "Is it safe?", to: "landing" },
      { label: "Privacy", to: "details" },
      { label: "Licences", to: "details" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Dialog and header                                                   */
/* ------------------------------------------------------------------ */

const amounts = ["3", "5", "10"];

/** The "Chip in" dialog: the card-surface dialog of the paper style. */
function ChipInDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState<string | null>("5");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      {/* Dialogs render in a portal, outside this page's data-style subtree, so the content carries the style itself. */}
      <DialogContent data-style="paper" size="sm">
        <DialogHeader>
          <DialogTitle>Chip in</DialogTitle>
          <DialogDescription>
            Sutra Files is free, has no ads and never will. If it saved you a job, you can say thanks.
          </DialogDescription>
        </DialogHeader>
        <ChipGroup
          aria-label="Amount"
          variant="solid"
          size="lg"
          allowDeselect={false}
          value={amount}
          onValueChange={setAmount}
          className="flex flex-wrap gap-2"
        >
          {amounts.map((a) => (
            <Chip key={a} value={a}>
              {`$${a}`}
            </Chip>
          ))}
        </ChipGroup>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Not now</Button>
          </DialogClose>
          <Button
            leadingIcon={<RiHeartLine aria-hidden />}
            onClick={() => {
              setOpen(false);
              toast.success("Thank you", { description: "This is a demo, so nothing was charged." });
            }}
          >
            {amount ? `Chip in $${amount}` : "Chip in"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SiteHeader() {
  const [searching, setSearching] = React.useState(false);
  const opener = React.useRef<HTMLElement | null>(null);
  const setOpen = (open: boolean) => {
    if (open) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSearching(open);
    // CommandDialog has no trigger element to hand focus back to, so without this focus drops to <body> on close.
    if (!open) requestAnimationFrame(() => opener.current?.focus());
  };
  const go = (anchor: string) => {
    opener.current = null; // heading elsewhere: nothing to hand focus back to
    setOpen(false);
    window.location.hash = to(anchor);
  };
  return (
    <header className="flex h-14 items-center gap-2 border-b border-border px-4 md:px-6">
      <a
        href={to("landing")}
        className="inline-flex shrink-0 items-center rounded-control outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
      >
        <SutraLogo markVariant="badge" size="sm" product="files" />
      </a>
      <div className="ml-auto flex min-w-0 items-center gap-1 @2xl:gap-1.5">
        {/* "/" opens the search; the playground already owns Cmd+K. */}
        <SearchTrigger
          placeholder="Search tools…"
          shortcut="/"
          hotkey
          collapseBelow="sm"
          onTrigger={() => setOpen(true)}
          className="mr-1 min-w-0 max-w-56 flex-1"
        />
        <nav aria-label="Site" className="hidden items-center @2xl:flex">
          {[
            ["Tools", "tools"],
            ["Convert", "tool"],
            ["Formats", "formats"],
          ].map(([label, anchor]) => (
            <Button key={label} variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <a href={to(anchor!)}>{label}</a>
            </Button>
          ))}
        </nav>
        <ModeToggle />
        <ChipInDialog>
          <Button variant="ghost" size="sm" leadingIcon={<RiHeartLine aria-hidden />}>
            Chip in
          </Button>
        </ChipInDialog>
      </div>
      <CommandDialog
        open={searching}
        onOpenChange={setOpen}
        title="Search tools"
        description="Find a tool or a format"
        // The palette is portaled out of the data-style subtree too, and takes no props on its content: style its Command root.
        commandProps={{ "data-style": "paper" } as React.ComponentProps<typeof CommandDialog>["commandProps"]}
      >
        <CommandInput placeholder="Search tools and formats…" aria-label="Search tools and formats" />
        <CommandList>
          <CommandEmpty>No tool matches that.</CommandEmpty>
          <CommandGroup heading="Tools">
            {tools.map((tool) => (
              <CommandItem key={tool.title} value={tool.title} icon={tool.icon} onSelect={() => go("tool")}>
                {tool.title}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Go to">
            <CommandItem value="Every tool" onSelect={() => go("tools")}>
              Every tool
            </CommandItem>
            <CommandItem value="Supported formats" onSelect={() => go("formats")}>
              Supported formats
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Landing                                                          */
/* ------------------------------------------------------------------ */

function SiteFooter() {
  return (
    <footer className="border-t border-border px-4 py-16 md:px-6 md:py-20">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <SutraMark variant="badge" size={36} className="text-foreground" />
        <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">Sutra Files</p>
        <p className="mt-1 max-w-sm text-balance text-sm text-muted-foreground">
          Images, video and audio, converted on your own machine.
        </p>

        <p className="mt-12 text-display-lg font-semibold text-foreground md:text-display-2xl">0 bytes</p>
        <p className="mt-3 max-w-md text-balance text-sm text-muted-foreground">
          of your files uploaded. Open the network panel while one converts and count them.
        </p>

        <nav aria-label="Footer" className="mt-14 grid w-full max-w-md grid-cols-3 gap-x-4 gap-y-8 text-left">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-medium text-foreground">{column.title}</h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <TextLink href={to(link.to)} variant="muted" size="sm" underline="hover" className="font-normal">
                      {link.label}
                    </TextLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <p className="mt-14 max-w-sm text-balance border-t border-border pt-6 text-xs text-muted-foreground">
          Runs in your browser, compiled to WebAssembly. Free, with no ads, and it will stay that way. If it saved you a
          job, you can <ChipInDialog><TextLink as="button" variant="subtle" underline="always" className="font-medium">chip in</TextLink></ChipInDialog>.
        </p>
      </div>
    </footer>
  );
}

function LandingDemo() {
  const [dragging, setDragging] = React.useState(false);
  const depth = React.useRef(0);

  /** A file arrived, by the button or by a drop anywhere on the page: say so and point at the converter. */
  const received = (files: File[]) => {
    if (!files.length) return;
    const size = files.reduce((sum, file) => sum + file.size, 0);
    toast(files.length === 1 ? files[0]!.name : `${files.length} files`, {
      description: `${formatBytes(size)}, still on your device.`,
      action: { label: "Open the converter", onClick: () => (window.location.hash = to("tool")) },
    });
  };

  return (
    <Demo
      id="landing"
      title="Home"
      description="A top bar, one statement, a strip of formats, a numbered grid of tools and a calm footer. Press / for the search, or drop a file anywhere on the page."
      align="start"
      canvasClassName="gap-0 p-0 sm:p-0"
    >
      <div
        data-dragging={dragging || undefined}
        className="@container relative transition-shadow duration-200 data-[dragging]:shadow-[inset_0_0_0_2px_var(--ring)]"
        onDragEnter={(e) => {
          e.preventDefault();
          depth.current += 1;
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          depth.current = 0;
          setDragging(false);
          received(Array.from(e.dataTransfer.files));
        }}
      >
        <SiteHeader />

        <StatementHero
          as="h2"
          float
          className="px-4 pb-14 pt-14 md:pb-20 md:pt-24"
          media={<SutraMark variant="badge" size={112} className="text-foreground" />}
          title="Drop a file in."
          description={
            <>
              Get back whatever you need.
              <br />
              Done on your device, never uploaded.
            </>
          }
          action={
            <FileUpload className="contents" onFilesAdded={(added) => received(added.map((item) => item.file))}>
              <FileUploadTrigger variant="primary" size="xl" leadingIcon={<RiAddLine aria-hidden />}>
                Choose a file
              </FileUploadTrigger>
            </FileUpload>
          }
          hint={dragging ? "Let go to add it" : "or drop it anywhere on the page"}
        />

        <section id="formats" aria-label="Supported formats" className="scroll-mt-20 border-y border-border py-5">
          <Marquee label="Supported formats" duration={50} gap={10}>
            {formatsMarquee.map((format) => (
              <Badge
                key={format}
                variant="outline"
                size="lg"
                className="h-9 bg-card px-3.5 text-sm font-medium tracking-[0.12em]"
              >
                {format}
              </Badge>
            ))}
          </Marquee>
        </section>

        <section id="tools" aria-labelledby="tools-title" className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-16 md:px-6 md:py-24">
          <Heading id="tools-title" as="h2" size="display-md">
            Every file, handled.
          </Heading>
          <p className="mt-3 max-w-xl text-pretty text-base text-muted-foreground">
            Convert, compress, resize and trim photos, video and audio. One file or a hundred at a time, all on your own
            machine.
          </p>
          <DividedGrid
            label="Tools"
            className="mt-8"
            columns={4}
            query="container"
            numbered
            items={tools.map<DividedGridItemData>((tool) => ({ ...tool, id: tool.title, href: to("tool") }))}
          />
          <div className="mt-8 flex justify-center">
            <Button variant="ghost" asChild trailingIcon={<RiArrowRightLine aria-hidden />}>
              <a href={to("tools")}>Every tool</a>
            </Button>
          </div>
        </section>

        <SiteFooter />
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Tool page                                                        */
/* ------------------------------------------------------------------ */

const panel = "relative min-h-60 rounded-box border";

function ToolPageDemo() {
  const [format, setFormat] = React.useState<string | null>("PNG");
  const [files, setFiles] = React.useState<File[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const total = files.reduce((sum, file) => sum + file.size, 0);
  const want = format ?? "PNG";
  const summary = files.length ? `${files.length === 1 ? "1 file" : `${files.length} files`} ready, ${formatBytes(total)} in all.` : "";

  return (
    <Demo
      id="tool"
      title="Tool page"
      description="I have, I want: a dashed dropzone, a big output format and one ink button. Choose or drop images, then change the format."
      align="start"
      canvasClassName="gap-0 p-0 sm:p-0"
    >
      <div className="@container px-4 pb-14 pt-8 md:px-6 md:pb-20">
        <div className="flex justify-center">
          <TextLink href={to("tools")} variant="muted" size="sm" underline="hover" className="gap-1.5 font-normal">
            <RiArrowLeftLine aria-hidden />
            All tools
          </TextLink>
        </div>
        <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center text-center">
          <Heading as="h2" size="display-xl">
            Image converter
          </Heading>
          <p className="mt-5 max-w-xl text-balance text-base text-muted-foreground md:text-lg">
            Convert to and from JPG, PNG, WEBP, AVIF, GIF, TIFF, BMP, ICO, HEIC and more.
          </p>
        </div>

        <div className="mx-auto mt-10 w-full max-w-3xl rounded-box border border-border bg-card p-2.5 sm:p-3 md:mt-14">
          <div className="grid grid-cols-1 gap-3 @xl:grid-cols-[1fr_auto_1fr] @xl:items-stretch">
            <Dropzone
              inputRef={inputRef}
              accept="image/*,.heic,.heif"
              className="min-h-60 justify-center rounded-box"
              icon={<RiImageAddLine aria-hidden />}
              title={
                <span className="text-base font-medium text-foreground">
                  {files.length ? summary : "Choose files"}
                </span>
              }
              hint={
                files.length
                  ? "Drop or choose more to add them."
                  : "or drop them here. PNG, JPG, HEIC, WEBP and 30 more formats."
              }
              onDrop={(accepted, rejections) => {
                if (accepted.length) setFiles((current) => [...current, ...accepted]);
                if (rejections.length) {
                  toast.error(
                    rejections.length === 1 ? "One file is not an image" : `${rejections.length} files are not images`,
                    { description: "Images only on this tool." }
                  );
                }
              }}
            >
              <span aria-hidden className="absolute left-4 top-3.5 text-xs text-muted-foreground">
                I have
              </span>
              {files.length > 0 ? (
                <ul aria-hidden className="mt-1 w-full max-w-60 space-y-1 text-left text-xs">
                  {files.slice(0, 3).map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-foreground">{file.name}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{formatBytes(file.size)}</span>
                    </li>
                  ))}
                  {files.length > 3 ? <li className="text-muted-foreground">{`and ${files.length - 3} more`}</li> : null}
                </ul>
              ) : null}
            </Dropzone>

            <div aria-hidden className="flex items-center justify-center text-muted-foreground">
              <RiArrowRightLine className="hidden size-5 @xl:block" />
              <RiArrowDownLine className="size-5 @xl:hidden" />
            </div>

            <div role="group" aria-label="I want" className={cn(panel, "flex flex-col items-center justify-center gap-7 border-border bg-background px-4 py-10")}>
              <span aria-hidden className="absolute left-4 top-3.5 text-xs text-muted-foreground">
                I want
              </span>
              <span
                aria-hidden
                className="inline-flex h-14 min-w-22 items-center justify-center rounded-xl border border-border-strong bg-card px-5 text-2xl font-semibold tracking-[0.2em] text-foreground"
              >
                {want}
              </span>
              <ChipGroup
                aria-label="Output format"
                variant="solid"
                allowDeselect={false}
                value={format}
                onValueChange={setFormat}
                className="flex flex-wrap justify-center gap-1.5"
              >
                {outputFormats.map((f) => (
                  <Chip key={f} value={f} size="sm" showCheck={false}>
                    {f}
                  </Chip>
                ))}
              </ChipGroup>
            </div>
          </div>

          <div className="mt-5 flex justify-center">
            <TextLink
              as="button"
              variant="muted"
              underline="always"
              size="sm"
              className="gap-1.5 font-normal"
              onClick={() => toast("Watching a folder needs the desktop app", { description: "Pick a folder and whatever lands in it is converted." })}
            >
              <RiFolderOpenLine aria-hidden />
              Or watch a folder
            </TextLink>
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <RiSettings3Line aria-hidden className="size-4 shrink-0" />
            {files.length ? `Converting to ${want}. Quality and size are in the settings.` : "Settings appear once you add a file."}
          </p>
          <p role="status" className="sr-only">
            {summary}
          </p>

          <Button
            fullWidth
            size="lg"
            className="mt-4 h-12 rounded-control text-base [&_svg]:size-5"
            leadingIcon={files.length ? <RiExchangeLine aria-hidden /> : <RiAddLine aria-hidden />}
            onClick={() => {
              if (!files.length) {
                inputRef.current?.click();
                return;
              }
              toast.success(`${files.length === 1 ? "1 file" : `${files.length} files`} converted to ${want}`, {
                description: "This is a demo: nothing was converted, and nothing was uploaded.",
              });
              setFiles([]);
            }}
          >
            {files.length ? `Convert ${files.length === 1 ? "1 file" : `${files.length} files`} to ${want}` : "Choose files"}
          </Button>
        </div>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Details                                                          */
/* ------------------------------------------------------------------ */

const week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => ({
  day,
  images: [42, 51, 38, 64, 58, 30, 26][i]!,
  video: [12, 18, 15, 22, 27, 34, 29][i]!,
  audio: [6, 9, 8, 7, 12, 15, 11][i]!,
}));

const byFormat = [
  { format: "JPG", files: 38 },
  { format: "PNG", files: 24 },
  { format: "WEBP", files: 16 },
  { format: "MP4", files: 12 },
  { format: "MP3", files: 10 },
];

const recent = [
  { name: "IMG_2041.heic", result: "JPG, 1.2 MB" },
  { name: "interview.mov", result: "MP3, 8.4 MB" },
  { name: "logo.svg", result: "PNG, 42 KB" },
];

function DetailsDemo() {
  const [run, setRun] = React.useState(0);
  return (
    <Demo
      id="details"
      title="Details"
      description="The small things of the style on their own: the pill action beside regular buttons, the card-surface dialog, a toast, the chart palette and the entrance."
      align="start"
      canvasClassName="gap-10"
    >
      <div className="space-y-3">
        <DemoLabel>Buttons: the pill is for the one big action</DemoLabel>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="xl" leadingIcon={<RiAddLine aria-hidden />}>
            Choose a file
          </Button>
          <Button>Convert</Button>
          <Button variant="secondary">Compress</Button>
          <Button variant="ghost">Cancel</Button>
        </div>
      </div>

      <div className="space-y-3">
        <DemoLabel>Dialog and toast</DemoLabel>
        <div className="flex flex-wrap items-center gap-3">
          <ChipInDialog>
            <Button variant="secondary" leadingIcon={<RiHeartLine aria-hidden />}>
              Open the dialog
            </Button>
          </ChipInDialog>
          <Button
            variant="secondary"
            onClick={() => toast("Saved as photo.png", { description: "1.2 MB became 640 KB. Nothing left your device." })}
          >
            Show a toast
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <DemoLabel>Chart palette: ink first, then muted earth tones</DemoLabel>
        <div aria-hidden className="flex items-center gap-2">
          {chartColorVars.map((color, i) => (
            <span key={i} className="size-5 rounded-full border border-border" style={{ backgroundColor: color }} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-8 @container lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <AreaChart
            data={week}
            index="day"
            stacked
            series={[
              { key: "images", label: "Images" },
              { key: "video", label: "Video" },
              { key: "audio", label: "Audio" },
            ]}
            height={200}
            label="Files converted per day, by kind"
          />
          <DonutChart
            data={byFormat}
            index="format"
            valueKey="files"
            size={160}
            centerLabel="files"
            legend="bottom"
            label="Files converted by format"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <DemoLabel>Entrance: animate-fade-up, staggered, still under reduced motion</DemoLabel>
          <Button size="xs" variant="secondary" onClick={() => setRun((n) => n + 1)}>
            Replay
          </Button>
        </div>
        <ul key={run} className="grid grid-cols-1 gap-2 lg:grid-cols-3">
          {recent.map((item, i) => (
            <li
              key={item.name}
              style={{ animationDelay: `${i * 80}ms` }}
              className="animate-fade-up rounded-box border border-border bg-card px-4 py-3 [animation-fill-mode:backwards]"
            >
              <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{`became ${item.result}`}</p>
            </li>
          ))}
        </ul>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function PaperPage() {
  return (
    <div data-style="paper" className="flex-1 bg-background text-foreground">
      {/* Toasts render in place (not in a portal), so this one takes the paper tokens from the wrapper. */}
      <Toaster />
      <PageIntro
        eyebrow="Foundations"
        title="Paper Showcase"
        description="The paper style end to end: a quiet file-tool site (Sutra Files) built only from Sutra components. This page always renders in paper, whatever the playground's style switch says, and follows light and dark."
      >
        <LandingDemo />
        <ToolPageDemo />
        <DetailsDemo />
      </PageIntro>
    </div>
  );
}
