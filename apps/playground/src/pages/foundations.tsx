import * as React from "react";
import {
  breakpoints,
  chartColors,
  colors,
  grid,
  radii,
  shadows,
  spacing,
  typography,
  cn,
  useCopy,
  Badge,
  Button,
  Card,
  Container,
  Eyebrow,
  Grid,
  GridItem,
  Heading,
  InlineCode,
  Input,
  Kbd,
  Text,
} from "@sutra/ui";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Colors                                                              */
/* ------------------------------------------------------------------ */

const toKebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

function Swatch({ name, value, className }: { name: string; value: string; className?: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(value)}
      className={cn("group flex min-w-0 flex-col gap-2 text-left", className)}
      title={`Copy ${value}`}
    >
      <span
        className="block h-16 w-full rounded-box border border-border shadow-xs transition-transform group-hover:-translate-y-0.5"
        style={{ background: value }}
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block truncate font-mono text-2xs text-muted-foreground">{copied ? "Copied!" : value}</span>
      </span>
    </button>
  );
}

const semanticTokens = Object.entries(colors).filter(
  (entry): entry is [string, string] => typeof entry[1] === "string"
);

function Scale({ label, scale }: { label: string; scale: Record<string, string> }) {
  return (
    <div className="space-y-2">
      <DemoLabel>{label}</DemoLabel>
      <div className="grid grid-cols-4 gap-1 sm:grid-cols-6 md:grid-cols-12">
        {Object.entries(scale).map(([step, value]) => (
          <div key={step} className="space-y-1">
            <div className="h-12 rounded-sm border border-border/50" style={{ background: value }} />
            <p className="text-center font-mono text-2xs text-muted-foreground">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ColorsPage() {
  return (
    <PageIntro
      eyebrow="Foundations"
      title="Colors"
      description="Semantic tokens map onto a brand scale and a neutral scale. Switch brand, neutral and mode in the top bar — every swatch here follows. Click a swatch to copy its CSS variable."
    >
      <Demo title="Semantic tokens" description="Use these through Tailwind utilities such as bg-card, text-muted-foreground or border-border." align="start">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {semanticTokens.map(([name, value]) => (
            <Swatch key={name} name={toKebab(name)} value={value} />
          ))}
        </div>
      </Demo>
      <Demo title="Brand scale" description="Driven by data-brand. Available as brand-50 … brand-950 utilities." align="start">
        <Scale label="brand" scale={colors.brand} />
      </Demo>
      <Demo title="Neutral scale" description="Driven by data-neutral (zinc, slate, gray, stone)." align="start">
        <Scale label="neutral" scale={colors.neutral} />
      </Demo>
      <Demo title="Status" align="start">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {(["success", "warning", "destructive", "info"] as const).map((tone) => (
            <div key={tone} className="overflow-hidden rounded-box border border-border">
              <div className="h-14" style={{ background: colors[tone] }} />
              <div className="flex items-center justify-between p-3">
                <span className="text-sm font-medium capitalize">{tone}</span>
                <Badge color={tone}>{tone}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Demo>
      <Demo title="Chart palette" description="chartColors — a categorical palette for charts, avatars and tags." align="start">
        <div className="flex flex-wrap gap-3">
          {chartColors.map((c, i) => (
            <div key={c} className="flex items-center gap-2">
              <span className="size-8 rounded-sm" style={{ background: c }} />
              <span className="font-mono text-xs text-muted-foreground">
                {i + 1}. {c}
              </span>
            </div>
          ))}
        </div>
      </Demo>
    </PageIntro>
  );
}

/* ------------------------------------------------------------------ */
/* Typography                                                          */
/* ------------------------------------------------------------------ */

export function TypographyPage() {
  return (
    <PageIntro
      eyebrow="Foundations"
      title="Typography"
      description="Geist for UI and display, Geist Mono for code. The scale pairs each size with a line height and tracking."
    >
      <Demo title="Type scale" align="start" canvasClassName="gap-0 p-0 sm:p-0">
        {Object.entries(typography.scale).map(([name, t]) => (
          <div key={name} className="flex flex-col gap-1 border-b border-border px-6 py-4 last:border-0 md:flex-row md:items-baseline md:gap-6">
            <div className="w-36 shrink-0 space-y-0.5">
              <p className="font-mono text-xs font-medium">{name}</p>
              <p className="font-mono text-2xs text-muted-foreground">
                {t.size} / {t.lineHeight} / {t.tracking}
              </p>
            </div>
            <p
              className="min-w-0 truncate font-semibold"
              style={{ fontSize: t.size, lineHeight: t.lineHeight, letterSpacing: t.tracking }}
            >
              Thread every idea together
            </p>
          </div>
        ))}
      </Demo>
      <Demo title="Weights & families" align="start">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            {Object.entries(typography.weights).map(([name, w]) => (
              <p key={name} className="text-xl" style={{ fontWeight: w }}>
                {name} <span className="font-mono text-xs text-muted-foreground">{w}</span>
              </p>
            ))}
          </div>
          <div className="space-y-4">
            <div>
              <DemoLabel>Sans — {typography.fontSans}</DemoLabel>
              <p className="text-display-xs font-semibold tracking-tight">Aa Bb Cc 0123</p>
            </div>
            <div>
              <DemoLabel>Mono — {typography.fontMono}</DemoLabel>
              <p className="font-mono text-display-xs">Aa Bb Cc 0123</p>
            </div>
          </div>
        </div>
      </Demo>
      <Demo title="Text components" description="Heading, Text, Eyebrow, Kbd and InlineCode." align="start">
        <div className="max-w-xl space-y-3">
          <Eyebrow>Release notes</Eyebrow>
          <Heading size="display-sm">Sutra 1.0 is here</Heading>
          <Text tone="muted">
            Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to open the command menu, or import <InlineCode>{"{ Button }"}</InlineCode> from{" "}
            <InlineCode>@sutra/ui</InlineCode>.
          </Text>
          <div className="flex flex-wrap gap-4">
            {(["default", "muted", "primary", "success", "warning", "destructive"] as const).map((tone) => (
              <Text key={tone} size="sm" weight="medium" tone={tone}>
                {tone}
              </Text>
            ))}
          </div>
        </div>
      </Demo>
    </PageIntro>
  );
}

/* ------------------------------------------------------------------ */
/* Grid & layout                                                       */
/* ------------------------------------------------------------------ */

function Cell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-12 items-center justify-center rounded-sm border border-dashed border-primary/40 bg-primary-soft font-mono text-xs text-primary-soft-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}

export function GridPage() {
  return (
    <PageIntro
      eyebrow="Foundations"
      title="Grid & Layout"
      description="A responsive 4 → 8 → 12 column grid, a centered Container, and Stack primitives on the 4px spacing grid."
    >
      <Demo title="12-column grid" description="Resize the window: 4 columns on mobile, 8 on tablet, 12 on desktop." align="start">
        <Grid>
          {Array.from({ length: 12 }, (_, i) => (
            <GridItem key={i} span={1}>
              <Cell>{i + 1}</Cell>
            </GridItem>
          ))}
        </Grid>
      </Demo>
      <Demo title="GridItem spans" description="span (mobile, of 4), md (tablet, of 8) and lg (desktop, of 12)." align="start">
        <Grid gap="sm">
          <GridItem span={4} md={8} lg={12}><Cell>span 4 · md 8 · lg 12</Cell></GridItem>
          <GridItem span={4} md={4} lg={8}><Cell>lg 8</Cell></GridItem>
          <GridItem span={4} md={4} lg={4}><Cell>lg 4</Cell></GridItem>
          <GridItem span={2} md={4} lg={3}><Cell>lg 3</Cell></GridItem>
          <GridItem span={2} md={4} lg={3}><Cell>lg 3</Cell></GridItem>
          <GridItem span={4} md={8} lg={6}><Cell>lg 6</Cell></GridItem>
        </Grid>
      </Demo>
      <Demo title="Container" description="Centered max-width wrapper with responsive gutters." align="start" canvasClassName="gap-3 px-0 sm:px-0">
        {(["sm", "md", "lg"] as const).map((size) => (
          <Container key={size} size={size}>
            <Cell className="h-10">Container size="{size}"</Cell>
          </Container>
        ))}
      </Demo>
      <Demo title="Grid tokens" align="start">
        <div className="grid gap-4 md:grid-cols-3">
          {Object.entries(grid).map(([device, g]) => (
            <Card key={device} padded className="space-y-1 p-4">
              <p className="text-sm font-semibold capitalize">{device}</p>
              <p className="text-sm text-muted-foreground">
                {g.columns} columns · {g.gutter}px gutter · {g.margin}px margin
                {"maxWidth" in g ? ` · ${g.maxWidth}px max` : ""}
              </p>
            </Card>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(breakpoints).map(([bp, px]) => (
            <Badge key={bp} variant="outline">
              {bp} · {px}px
            </Badge>
          ))}
        </div>
      </Demo>
    </PageIntro>
  );
}

/* ------------------------------------------------------------------ */
/* Shadows & effects                                                   */
/* ------------------------------------------------------------------ */

export function ShadowsPage() {
  return (
    <PageIntro
      eyebrow="Foundations"
      title="Shadows & Effects"
      description="Layered, low-contrast shadows that deepen in dark mode, plus glass, dotted and grid surfaces."
    >
      <Demo title="Elevation" description="shadow-xs … shadow-3xl. Menus use shadow-lg, dialogs shadow-2xl." dots canvasClassName="grid grid-cols-2 gap-8 sm:grid-cols-4 md:grid-cols-7">
        {Object.entries(shadows).map(([name, value]) => (
          <div key={name} className="flex flex-col items-center gap-3">
            <div className="size-20 rounded-box border border-border/60 bg-card" style={{ boxShadow: value }} />
            <span className="font-mono text-xs text-muted-foreground">{name}</span>
          </div>
        ))}
      </Demo>
      <Demo title="Surfaces & effects" align="start">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="relative h-36 overflow-hidden rounded-box bg-gradient-to-br from-brand-400 to-brand-700 p-4">
            <div className="glass absolute inset-4 grid place-items-center rounded-box text-sm font-medium">glass</div>
          </div>
          <div className="grid h-36 place-items-center rounded-box border border-border bg-dots text-sm font-medium">bg-dots</div>
          <div className="grid h-36 place-items-center rounded-box border border-border bg-grid text-sm font-medium">bg-grid</div>
          <div className="grid h-36 place-items-center rounded-box bg-primary text-sm font-medium text-primary-foreground shadow-inner-highlight">
            shadow-inner-highlight
          </div>
          <div className="grid h-36 place-items-center rounded-box bg-inverse text-sm font-medium text-inverse-foreground">bg-inverse</div>
          <div className="grid h-36 place-items-center rounded-box border border-border">
            <span className="text-shimmer text-lg font-semibold">text-shimmer</span>
          </div>
        </div>
      </Demo>
    </PageIntro>
  );
}

/* ------------------------------------------------------------------ */
/* Corner radius                                                       */
/* ------------------------------------------------------------------ */

export function RadiusPage() {
  return (
    <PageIntro
      eyebrow="Foundations"
      title="Corner Radius"
      description="rounded-control (buttons, inputs, chips) and rounded-box (cards, popovers) follow the radius mode — try Rounded, Pill and Square in the top bar."
    >
      <Demo title="Radius scale" canvasClassName="grid grid-cols-3 gap-6 sm:grid-cols-5 md:grid-cols-9">
        {Object.entries(radii).map(([name, value]) => (
          <div key={name} className="flex flex-col items-center gap-2">
            <div className="size-16 border-2 border-primary bg-primary-soft" style={{ borderRadius: value }} />
            <span className="font-mono text-xs text-muted-foreground">{name}</span>
          </div>
        ))}
      </Demo>
      <Demo title="Theme-aware radius in components">
        <Card padded className="w-full max-w-sm space-y-3">
          <Text weight="semibold">rounded-box</Text>
          <Input placeholder="rounded-control input" />
          <div className="flex gap-2">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Badge>Badge</Badge>
          </div>
        </Card>
      </Demo>
    </PageIntro>
  );
}

/* ------------------------------------------------------------------ */
/* Spacing                                                             */
/* ------------------------------------------------------------------ */

export function SpacingPage() {
  return (
    <PageIntro
      eyebrow="Foundations"
      title="Spacing"
      description="A 4px base grid. Keys match Tailwind's spacing scale, so p-4 is 16px and gap-6 is 24px."
    >
      <Demo title="Spacing scale" align="start" canvasClassName="gap-2">
        {Object.entries(spacing)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([key, px]) => (
            <div key={key} className="flex items-center gap-4">
              <span className="w-10 shrink-0 font-mono text-xs font-medium">{key}</span>
              <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{px}</span>
              <span className="h-4 rounded-xs bg-primary" style={{ width: px }} />
            </div>
          ))}
      </Demo>
    </PageIntro>
  );
}
