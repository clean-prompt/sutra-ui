import {
  Badge,
  Button,
  Card,
  MeshGradient,
  SparkBar,
  Sparkline,
  TextShimmer,
  type SparklineColor,
} from "@cleanprompt/sutra-ui";
import { RiArrowRightDownLine, RiArrowRightUpLine, RiSparkling2Line } from "@cleanprompt/sutra-ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

const revenue = [12, 14, 13, 17, 16, 19, 22, 21, 25, 24, 28, 31];
const churn = [4.8, 4.6, 4.9, 4.4, 4.1, 4.3, 3.9, 3.7, 3.8, 3.4, 3.2, 3.1];
const latency = [220, 180, 240, 210, 260, 190, 300, 280, 230, 250, 340, 310];
const signups = [32, 41, 38, 52, 47, 60, 58, 71, 66, 80, 77, 92];
const pnl = [3, -2, 5, 4, -3, 6, 2, -1, 7, 5, -4, 8];

const colors: SparklineColor[] = ["primary", "success", "warning", "destructive", "info", "muted", "#8e51ff"];

const kpis = [
  { label: "Monthly revenue", value: "$31.2k", delta: "+12.4%", up: true, data: revenue, type: "area" as const },
  { label: "Churn rate", value: "3.1%", delta: "-0.6 pts", up: true, data: churn, type: "line" as const, color: "success" as const },
  { label: "p95 latency", value: "310 ms", delta: "+24%", up: false, data: latency, type: "line" as const, color: "destructive" as const },
  { label: "New sign-ups", value: "92", delta: "+19%", up: true, data: signups, type: "bar" as const },
];

export function MorePage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="More"
      description="Small finishing touches: inline trend charts, animated gradient backgrounds and shimmering status text."
    >
      <Demo
        id="sparkline"
        title="Sparkline"
        description="Tiny line, area and bar charts. Color by token or any CSS color, or let trend pick green/red."
        align="start"
        canvasClassName="gap-8"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-medium ${kpi.up ? "text-success" : "text-destructive"}`}
                >
                  {kpi.up ? <RiArrowRightUpLine className="size-3.5" /> : <RiArrowRightDownLine className="size-3.5" />}
                  {kpi.delta}
                </span>
              </div>
              <p className="text-display-xs font-semibold tracking-tight text-foreground">{kpi.value}</p>
              <Sparkline
                data={kpi.data}
                type={kpi.type}
                color={kpi.color}
                responsive
                height={40}
                highlightLast={kpi.type !== "bar"}
                label={`${kpi.label}, last 12 months`}
              />
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-2">
            <DemoLabel>Line</DemoLabel>
            <Sparkline data={revenue} width={160} height={40} />
          </div>
          <div className="space-y-2">
            <DemoLabel>Area · highlight last</DemoLabel>
            <Sparkline data={revenue} type="area" width={160} height={40} highlightLast />
          </div>
          <div className="space-y-2">
            <DemoLabel>Bar · highlight last</DemoLabel>
            <Sparkline data={signups} type="bar" width={160} height={40} highlightLast />
          </div>
          <div className="space-y-2">
            <DemoLabel>Straight segments</DemoLabel>
            <Sparkline data={latency} smooth={false} tone="warning" width={160} height={40} />
          </div>
          <div className="space-y-2">
            <DemoLabel>Trend (auto green / red)</DemoLabel>
            <div className="flex items-center gap-4">
              <Sparkline data={signups} trend width={72} height={28} />
              <Sparkline data={[...signups].reverse()} trend width={72} height={28} />
            </div>
          </div>
          <div className="space-y-2">
            <DemoLabel>SparkBar · negative values</DemoLabel>
            <SparkBar data={pnl} tone="info" width={160} height={40} gap={3} />
          </div>
        </div>

        <div className="space-y-2">
          <DemoLabel>Colors</DemoLabel>
          <div className="flex flex-wrap items-center gap-6">
            {colors.map((color) => (
              <div key={color} className="flex items-center gap-2">
                <Sparkline data={revenue} type="area" color={color} width={88} height={28} />
                <span className="font-mono text-xs text-muted-foreground">{color}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <DemoLabel>Inline in text</DemoLabel>
          <p className="text-sm text-foreground">
            Revenue grew <Sparkline data={revenue} width={56} height={16} tone="success" className="mx-1" /> 12.4% this
            quarter while churn fell <Sparkline data={churn} width={56} height={16} tone="success" className="mx-1" /> to
            3.1%.
          </p>
        </div>
      </Demo>

      <Demo
        id="mesh-gradient"
        title="Mesh gradient"
        description="Decorative animated blobs behind any content. Tune colors, blur, speed, intensity and grain."
        align="start"
        canvasClassName="gap-6"
      >
        <MeshGradient className="rounded-box border border-border" grain>
          <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
            <Badge variant="dot" tone="primary">New in 2.0</Badge>
            <h3 className="max-w-xl text-balance text-display-sm font-semibold tracking-tight text-foreground">
              Build beautiful interfaces, faster
            </h3>
            <p className="max-w-md text-muted-foreground">
              Forty accessible components, themeable tokens and ready-made blocks.
            </p>
            <Button size="lg">Get started</Button>
          </div>
        </MeshGradient>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <DemoLabel>Sunset · fast</DemoLabel>
            <MeshGradient
              colors={["#ff8a4c", "#ff4f8b", "#ffc94d", "#8e51ff"]}
              speed={2}
              className="h-40 rounded-box"
            >
              <div className="flex h-full items-end p-4 text-sm font-semibold text-foreground">Sunset</div>
            </MeshGradient>
          </div>
          <div className="space-y-2">
            <DemoLabel>Ocean · soft blur</DemoLabel>
            <MeshGradient
              colors={["#00b8db", "#0ea5e9", "#22c55e", "#6366f1"]}
              blur={96}
              intensity={0.5}
              className="h-40 rounded-box bg-card"
            >
              <div className="flex h-full items-end p-4 text-sm font-semibold text-foreground">Ocean</div>
            </MeshGradient>
          </div>
          <div className="space-y-2">
            <DemoLabel>Static · grain</DemoLabel>
            <MeshGradient
              animated={false}
              grain
              grainOpacity={0.3}
              intensity={0.9}
              blur={40}
              className="h-40 rounded-box bg-inverse"
            >
              <div className="flex h-full items-end p-4 text-sm font-semibold text-inverse-foreground">Static</div>
            </MeshGradient>
          </div>
        </div>
      </Demo>

      <Demo
        id="text-shimmer"
        title="Text shimmer"
        description="Animated light sweep for in-progress status lines such as AI reasoning."
        align="start"
        canvasClassName="gap-6"
      >
        <div className="flex items-center gap-2 text-sm">
          <RiSparkling2Line className="size-4 text-primary" />
          <TextShimmer>Thinking…</TextShimmer>
        </div>
        <div className="space-y-2">
          <DemoLabel>Duration & spread</DemoLabel>
          <div className="flex flex-col gap-2 text-sm">
            <TextShimmer duration={1}>Searching 24 sources (fast, 1s)</TextShimmer>
            <TextShimmer duration={3} spread={30}>Reading documentation (slow, wide band)</TextShimmer>
          </div>
        </div>
        <div className="space-y-2">
          <DemoLabel>As heading</DemoLabel>
          <TextShimmer as="h3" className="text-display-xs font-semibold tracking-tight">
            Generating your report
          </TextShimmer>
        </div>
      </Demo>
    </PageIntro>
  );
}
