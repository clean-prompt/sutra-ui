import * as React from "react";
import {
  RiCheckLine,
  RiCloseLine,
  RiCpuLine,
  RiDownloadLine,
  RiErrorWarningLine,
  RiHeartLine,
  RiRefreshLine,
  RiSearchLine,
} from "@remixicon/react";
import { cn } from "../lib/cn";
import { Button } from "./button";
import { Badge, type BadgeColor } from "./badge";
import { Input } from "./input";
import { SimpleSelect } from "./select";
import { Progress } from "./progress";
import { Spinner } from "./spinner";
import { SimpleTooltip } from "./tooltip";
import { formatBytes } from "./file-upload";
import { formatEta, formatSpeed } from "./transfer-list";
import { meterLevel, type MeterThresholds } from "./meter";

/* ------------------------------------------------------------------ */
/* estimateModelFit                                                    */
/* ------------------------------------------------------------------ */

export interface HardwareProfile {
  /** Total GPU memory; defaults to the sum of `gpus[].vramGB`. */
  vramGB?: number;
  ramGB: number;
  gpus?: { name: string; vramGB: number }[];
}

export interface ModelFootprint {
  /** Weights size on disk in GB (takes precedence over params × bits). */
  sizeGB?: number;
  /** Parameter count in billions. */
  paramsB?: number;
  /** Quantization label: "Q4_K_M", "Q8_0", "F16", … */
  quant?: string;
}

export type ModelFitLevel = "gpu" | "partial" | "cpu" | "none";

export interface ModelFitEstimate {
  fit: ModelFitLevel;
  /** Estimated memory needed at runtime, GB (weights + ~20% for KV cache and buffers). */
  requiredGB: number;
  /** Share of the model that fits in VRAM, 0–1. */
  gpuFraction: number;
  label: string;
  explanation: string;
}

/** Approximate bits per weight for a quantization label (GGUF-style), default 16. */
export function quantizationBits(quant: string | undefined): number {
  if (!quant) return 16;
  const q = quant.toUpperCase();
  if (/F32|FP32/.test(q)) return 32;
  if (/BF16|F16|FP16/.test(q)) return 16;
  const m = q.match(/(?:Q|IQ|INT|W)(\d)/);
  if (m) {
    const bits = Number(m[1]);
    return ({ 1: 1.8, 2: 2.7, 3: 3.5, 4: 4.6, 5: 5.5, 6: 6.6, 8: 8.5 } as Record<number, number>)[bits] ?? bits + 0.5;
  }
  if (/FP8|E4M3|E5M2/.test(q)) return 8;
  return 16;
}

const USABLE_VRAM = 0.9;
const USABLE_RAM = 0.7;
const OVERHEAD = 1.2;
const fmtGB = (n: number) => `${n < 10 ? n.toFixed(1) : Math.round(n)} GB`;

/** Estimate whether a model fits fully on GPU, needs partial CPU offload, runs on CPU only, or won't fit. */
export function estimateModelFit(model: ModelFootprint, hardware: HardwareProfile): ModelFitEstimate {
  const weights = model.sizeGB ?? ((model.paramsB ?? 0) * quantizationBits(model.quant)) / 8;
  const requiredGB = Math.round(weights * OVERHEAD * 10) / 10;
  const vram = hardware.vramGB ?? (hardware.gpus ?? []).reduce((s, g) => s + g.vramGB, 0);
  const usableVram = vram * USABLE_VRAM;
  const usableRam = hardware.ramGB * USABLE_RAM;

  if (vram > 0 && requiredGB <= usableVram) {
    return {
      fit: "gpu",
      requiredGB,
      gpuFraction: 1,
      label: "Fits on GPU",
      explanation: `Needs about ${fmtGB(requiredGB)}; your GPU has ${fmtGB(vram)} of VRAM, so it runs fully on the GPU.`,
    };
  }
  if (vram > 0 && requiredGB <= usableVram + usableRam) {
    const gpuFraction = Math.max(0, Math.min(1, usableVram / requiredGB));
    return {
      fit: "partial",
      requiredGB,
      gpuFraction,
      label: "Partial offload",
      explanation: `Needs about ${fmtGB(requiredGB)}; about ${Math.round(gpuFraction * 100)}% fits in ${fmtGB(vram)} of VRAM and the rest runs from system RAM. Expect slower generation.`,
    };
  }
  if (requiredGB <= usableRam) {
    return {
      fit: "cpu",
      requiredGB,
      gpuFraction: 0,
      label: "CPU only",
      explanation: `Needs about ${fmtGB(requiredGB)}; ${vram > 0 ? "it's too large for VRAM but" : "no GPU memory was found, but"} it fits in ${fmtGB(hardware.ramGB)} of RAM. Generation will be slow.`,
    };
  }
  return {
    fit: "none",
    requiredGB,
    gpuFraction: 0,
    label: "Won't fit",
    explanation: `Needs about ${fmtGB(requiredGB)}, more than your ${vram > 0 ? `${fmtGB(vram)} VRAM + ` : ""}${fmtGB(hardware.ramGB)} RAM can hold. Try a smaller quantization.`,
  };
}

/* ------------------------------------------------------------------ */
/* HardwareFitHint                                                     */
/* ------------------------------------------------------------------ */

const fitColor: Record<ModelFitLevel, BadgeColor> = { gpu: "success", partial: "warning", cpu: "info", none: "destructive" };

export interface HardwareFitHintProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  model: ModelFootprint;
  hardware: HardwareProfile;
  /** `compact` renders only the badge, with the explanation in a tooltip. */
  variant?: "default" | "compact";
}

/** Badge + explanation of how a model fits the given hardware. */
export const HardwareFitHint = React.forwardRef<HTMLDivElement, HardwareFitHintProps>(({ model, hardware, variant = "default", className, ...props }, ref) => {
  const est = estimateModelFit(model, hardware);
  const badge = (
    <Badge size="sm" color={fitColor[est.fit]} data-fit={est.fit} tabIndex={variant === "compact" ? 0 : undefined}>
      {est.fit === "gpu" ? <RiCheckLine /> : est.fit === "none" ? <RiCloseLine /> : <RiCpuLine />}
      {est.label}
    </Badge>
  );
  if (variant === "compact") {
    return (
      <div ref={ref} data-slot="hardware-fit-hint" data-fit={est.fit} className={cn("inline-flex", className)} {...props}>
        <SimpleTooltip content={est.explanation}>{badge}</SimpleTooltip>
        <span className="sr-only">{est.explanation}</span>
      </div>
    );
  }
  return (
    <div ref={ref} data-slot="hardware-fit-hint" data-fit={est.fit} className={cn("grid gap-1.5", className)} {...props}>
      <div className="flex items-center gap-2">
        {badge}
        <span className="font-mono text-2xs tabular-nums text-muted-foreground">~{fmtGB(est.requiredGB)}</span>
      </div>
      {est.fit === "partial" && (
        <div aria-hidden className="flex h-1.5 w-full max-w-60 overflow-hidden rounded-full bg-muted">
          <span className="bg-success" style={{ width: `${est.gpuFraction * 100}%` }} />
          <span className="bg-warning" style={{ width: `${(1 - est.gpuFraction) * 100}%` }} />
        </div>
      )}
      <p className="text-xs text-muted-foreground">{est.explanation}</p>
    </div>
  );
});
HardwareFitHint.displayName = "HardwareFitHint";

/* ------------------------------------------------------------------ */
/* StagedSetupHero                                                     */
/* ------------------------------------------------------------------ */

export type SetupStageStatus = "pending" | "active" | "done" | "error";

export interface SetupStage {
  id: string;
  label: string;
  description?: React.ReactNode;
  status: SetupStageStatus;
  /** Primary CTA shown while this stage is the current one. */
  actionLabel?: string;
  error?: string;
}

export interface SetupDownloadProgress {
  receivedBytes: number;
  totalBytes: number;
  bytesPerSecond?: number;
  /** File or model name. */
  label?: string;
}

export interface StagedSetupHeroProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  stages: SetupStage[];
  title?: React.ReactNode;
  description?: React.ReactNode;
  onAction?: (stageId: string) => void;
  onRetry?: (stageId: string) => void;
  onCancelDownload?: () => void;
  /** Progress for the stage with id `download` (or `downloadStageId`). */
  download?: SetupDownloadProgress;
  downloadStageId?: string;
  /** Content shown once every stage is done. */
  readyContent?: React.ReactNode;
}

export const defaultSetupStages: SetupStage[] = [
  { id: "engine", label: "Engine", description: "Install the local inference runtime", status: "active", actionLabel: "Install engine" },
  { id: "model", label: "Model", description: "Pick a model that fits this machine", status: "pending", actionLabel: "Choose model" },
  { id: "download", label: "Download", description: "Fetch the model weights", status: "pending", actionLabel: "Start download" },
  { id: "ready", label: "Ready", description: "Start chatting locally", status: "pending", actionLabel: "Open chat" },
];

/** One-click local-model quickstart: stage rail with statuses, per-stage CTA, download progress and retry. */
export const StagedSetupHero = React.forwardRef<HTMLDivElement, StagedSetupHeroProps>(
  (
    {
      stages,
      title = "Run models on this machine",
      description = "Private, offline and free. We'll set everything up in a few steps.",
      onAction,
      onRetry,
      onCancelDownload,
      download,
      downloadStageId = "download",
      readyContent,
      className,
      ...props
    },
    ref
  ) => {
    const current = stages.find((s) => s.status === "error") ?? stages.find((s) => s.status === "active") ?? stages.find((s) => s.status === "pending");
    const allDone = stages.every((s) => s.status === "done");
    const doneCount = stages.filter((s) => s.status === "done").length;
    const pct = download && download.totalBytes > 0 ? Math.min(100, (download.receivedBytes / download.totalBytes) * 100) : 0;
    const eta = download && download.bytesPerSecond ? (download.totalBytes - download.receivedBytes) / download.bytesPerSecond : null;
    return (
      <div ref={ref} data-slot="staged-setup-hero" className={cn("w-full overflow-hidden rounded-box border border-border bg-card shadow-xs", className)} {...props}>
        <div className="bg-gradient-to-br from-brand-50 to-transparent px-5 pb-4 pt-5 dark:from-brand-950/40">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <ol aria-label={`Setup progress, ${doneCount} of ${stages.length} done`} className="flex items-start gap-0 px-5 pt-2">
          {stages.map((s, i) => (
            <li
              key={s.id}
              data-stage={s.id}
              data-status={s.status}
              aria-current={s === current ? "step" : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"
            >
              {i > 0 && (
                <span aria-hidden className={cn("absolute right-1/2 top-3.5 h-0.5 w-full -translate-x-3.5", stages[i - 1]!.status === "done" ? "bg-primary" : "bg-border")} />
              )}
              <span
                className={cn(
                  "relative z-10 flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold",
                  s.status === "done" && "border-primary bg-primary text-primary-foreground",
                  s.status === "active" && "border-primary bg-background text-primary",
                  s.status === "pending" && "border-border bg-background text-muted-foreground",
                  s.status === "error" && "border-destructive bg-destructive-soft text-destructive"
                )}
              >
                {s.status === "done" ? (
                  <RiCheckLine aria-hidden className="size-4" />
                ) : s.status === "error" ? (
                  <RiErrorWarningLine aria-hidden className="size-4" />
                ) : s.status === "active" && s.id === downloadStageId && download ? (
                  <Spinner size="xs" label="" aria-hidden className="text-current" />
                ) : (
                  i + 1
                )}
              </span>
              <span className={cn("truncate text-xs font-medium", s.status === "pending" ? "text-muted-foreground" : "text-foreground")}>{s.label}</span>
              <span className="sr-only">
                {" "}
                {s.status === "done" ? "done" : s.status === "error" ? "failed" : s.status === "active" ? "in progress" : "not started"}
              </span>
            </li>
          ))}
        </ol>
        <div className="px-5 pb-5 pt-4">
          {allDone ? (
            readyContent ?? (
              <p role="status" className="flex items-center gap-2 text-sm font-medium text-success">
                <RiCheckLine aria-hidden className="size-4" /> Local model ready.
              </p>
            )
          ) : current ? (
            <div className="grid gap-3 rounded-box border border-border bg-subtle p-4" data-slot="setup-current-stage">
              <div>
                <p className="text-sm font-medium text-foreground">{current.label}</p>
                {current.description && <p className="text-xs text-muted-foreground">{current.description}</p>}
              </div>
              {current.status === "error" ? (
                <div role="alert" className="flex flex-wrap items-center gap-3">
                  <p className="flex-1 text-sm text-destructive">{current.error ?? "Something went wrong."}</p>
                  <Button size="sm" variant="secondary" leadingIcon={<RiRefreshLine />} onClick={() => onRetry?.(current.id)}>
                    Retry
                  </Button>
                </div>
              ) : current.id === downloadStageId && current.status === "active" && download ? (
                <div className="grid gap-1.5" data-slot="setup-download">
                  <Progress value={pct} size="sm" aria-label={`Downloading ${download.label ?? "model"}`} />
                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-2xs tabular-nums text-muted-foreground">
                    <span>
                      {formatBytes(download.receivedBytes)} / {formatBytes(download.totalBytes)}
                    </span>
                    <span>
                      {formatSpeed(download.bytesPerSecond)} · {formatEta(eta)} left
                    </span>
                  </div>
                  {onCancelDownload && (
                    <div>
                      <Button size="xs" variant="ghost" onClick={onCancelDownload}>
                        Cancel download
                      </Button>
                    </div>
                  )}
                </div>
              ) : current.actionLabel ? (
                <div>
                  <Button size="sm" onClick={() => onAction?.(current.id)}>
                    {current.actionLabel}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }
);
StagedSetupHero.displayName = "StagedSetupHero";

/* ------------------------------------------------------------------ */
/* LocalModelBrowser                                                   */
/* ------------------------------------------------------------------ */

export interface LocalModelVariant {
  quant: string;
  sizeGB: number;
}

export interface LocalModelListing {
  id: string;
  name: string;
  author?: string;
  /** Billions of parameters. */
  paramsB: number;
  variants: LocalModelVariant[];
  downloads?: number;
  likes?: number;
  description?: string;
  tags?: string[];
}

export interface LocalModelDownloadState {
  status: "downloading" | "done" | "failed";
  receivedBytes?: number;
  totalBytes?: number;
  bytesPerSecond?: number;
  quant?: string;
  error?: string;
}

export interface LocalModelBrowserProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDownload"> {
  models: LocalModelListing[];
  hardware?: HardwareProfile;
  /** Per-model download state, keyed by model id. */
  downloads?: Record<string, LocalModelDownloadState>;
  onDownload?: (modelId: string, quant: string) => void;
  onCancelDownload?: (modelId: string) => void;
  query?: string;
  onQueryChange?: (q: string) => void;
}

const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

function defaultVariant(m: LocalModelListing, hw?: HardwareProfile) {
  if (!hw) return m.variants[0]?.quant ?? "";
  const rank: Record<ModelFitLevel, number> = { gpu: 0, partial: 1, cpu: 2, none: 3 };
  const scored = m.variants.map((v) => ({ v, r: rank[estimateModelFit({ sizeGB: v.sizeGB }, hw).fit] }));
  const best = Math.min(...scored.map((s) => s.r));
  const candidates = scored.filter((s) => s.r === best).sort((a, b) => b.v.sizeGB - a.v.sizeGB);
  return candidates[0]?.v.quant ?? m.variants[0]?.quant ?? "";
}

function LocalModelItem({
  model: m,
  hardware,
  download,
  onDownload,
  onCancel,
}: {
  model: LocalModelListing;
  hardware?: HardwareProfile;
  download?: LocalModelDownloadState;
  onDownload?: (modelId: string, quant: string) => void;
  onCancel?: (modelId: string) => void;
}) {
  const [quant, setQuant] = React.useState(() => defaultVariant(m, hardware));
  const variant = m.variants.find((v) => v.quant === quant) ?? m.variants[0];
  const labelId = React.useId();
  const active = download?.status === "downloading";
  const pct = active && download.totalBytes ? Math.min(100, ((download.receivedBytes ?? 0) / download.totalBytes) * 100) : 0;
  const eta = active && download.bytesPerSecond && download.totalBytes ? (download.totalBytes - (download.receivedBytes ?? 0)) / download.bytesPerSecond : null;
  return (
    <li data-slot="local-model-item" data-model={m.id} className="grid gap-2 px-4 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p id={labelId} className="truncate text-sm font-medium text-foreground">
            {m.name}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {m.author && <span>{m.author}</span>}
            <span>{m.paramsB}B params</span>
            {m.downloads != null && (
              <span className="inline-flex items-center gap-0.5">
                <RiDownloadLine aria-hidden className="size-3" />
                <span className="sr-only">Downloads:</span>
                {compact(m.downloads)}
              </span>
            )}
            {m.likes != null && (
              <span className="inline-flex items-center gap-0.5">
                <RiHeartLine aria-hidden className="size-3" />
                <span className="sr-only">Likes:</span>
                {compact(m.likes)}
              </span>
            )}
          </p>
          {m.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{m.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {m.variants.length > 1 ? (
            <SimpleSelect
              size="sm"
              aria-label={`${m.name} quantization`}
              value={quant}
              onValueChange={setQuant}
              disabled={active}
              options={m.variants.map((v) => ({ value: v.quant, label: `${v.quant} · ${v.sizeGB} GB` }))}
              className="w-40"
            />
          ) : (
            variant && (
              <span className="font-mono text-xs text-muted-foreground">
                {variant.quant} · {variant.sizeGB} GB
              </span>
            )
          )}
          {download?.status === "done" ? (
            <Badge color="success" size="md">
              <RiCheckLine /> Downloaded
            </Badge>
          ) : active ? (
            <Button size="sm" variant="ghost" aria-label={`Cancel ${m.name} download`} onClick={() => onCancel?.(m.id)}>
              Cancel
            </Button>
          ) : (
            <Button
              size="sm"
              variant={download?.status === "failed" ? "secondary" : "primary"}
              leadingIcon={download?.status === "failed" ? <RiRefreshLine /> : <RiDownloadLine />}
              aria-label={`${download?.status === "failed" ? "Retry" : "Download"} ${m.name}`}
              disabled={!variant}
              onClick={() => variant && onDownload?.(m.id, variant.quant)}
            >
              {download?.status === "failed" ? "Retry" : "Download"}
            </Button>
          )}
        </div>
      </div>
      {hardware && variant && !active && <HardwareFitHint variant="compact" model={{ sizeGB: variant.sizeGB }} hardware={hardware} />}
      {active && (
        <div className="grid gap-1" data-slot="local-model-progress">
          <Progress value={pct} size="sm" aria-label={`Downloading ${m.name}`} />
          <div className="flex justify-between font-mono text-2xs tabular-nums text-muted-foreground">
            <span>
              {formatBytes(download.receivedBytes ?? 0)}
              {download.totalBytes ? ` / ${formatBytes(download.totalBytes)}` : ""} · {Math.round(pct)}%
            </span>
            <span>
              {formatSpeed(download.bytesPerSecond)} · {formatEta(eta)} left
            </span>
          </div>
        </div>
      )}
      {download?.status === "failed" && download.error && <p className="text-xs text-destructive">{download.error}</p>}
    </li>
  );
}

/** Searchable list of downloadable local models with quant variants, fit hints and download progress. */
export const LocalModelBrowser = React.forwardRef<HTMLDivElement, LocalModelBrowserProps>(
  ({ models, hardware, downloads = {}, onDownload, onCancelDownload, query: queryProp, onQueryChange, className, ...props }, ref) => {
    const [internal, setInternal] = React.useState("");
    const query = queryProp ?? internal;
    const q = query.trim().toLowerCase();
    const shown = models.filter(
      (m) => !q || m.name.toLowerCase().includes(q) || m.author?.toLowerCase().includes(q) || m.tags?.some((t) => t.toLowerCase().includes(q))
    );
    return (
      <div ref={ref} data-slot="local-model-browser" className={cn("w-full overflow-hidden rounded-box border border-border bg-card", className)} {...props}>
        <div className="border-b border-border p-2">
          <Input
            size="sm"
            leadingIcon={<RiSearchLine />}
            aria-label="Search models"
            placeholder="Search models"
            value={query}
            onChange={(e) => {
              if (queryProp === undefined) setInternal(e.target.value);
              onQueryChange?.(e.target.value);
            }}
            className="border-transparent shadow-none"
          />
        </div>
        {shown.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No models match “{query}”.</p>
        ) : (
          <ul aria-label="Downloadable models" className="max-h-[28rem] divide-y divide-border overflow-y-auto scrollbar-thin">
            {shown.map((m) => (
              <LocalModelItem key={m.id} model={m} hardware={hardware} download={downloads[m.id]} onDownload={onDownload} onCancel={onCancelDownload} />
            ))}
          </ul>
        )}
      </div>
    );
  }
);
LocalModelBrowser.displayName = "LocalModelBrowser";

/* ------------------------------------------------------------------ */
/* SystemResourcesBar                                                  */
/* ------------------------------------------------------------------ */

export interface SystemResourceReading {
  id: string;
  label: string;
  value: number;
  max: number;
  /** Shown as "12.4 / 32 GB"; omitted → percent. */
  unit?: string;
}

export interface SystemResourcesBarProps extends React.HTMLAttributes<HTMLDivElement> {
  cpuPercent?: number;
  ram?: { usedGB: number; totalGB: number };
  gpuPercent?: number;
  vram?: { usedGB: number; totalGB: number };
  /** Extra or custom readings appended after the built-ins. */
  readings?: SystemResourceReading[];
  thresholds?: MeterThresholds;
}

const levelBar = { ok: "bg-primary", warn: "bg-warning", danger: "bg-destructive" } as const;

/** Compact status-bar meters for CPU, RAM, GPU and VRAM. */
export const SystemResourcesBar = React.forwardRef<HTMLDivElement, SystemResourcesBarProps>(
  ({ cpuPercent, ram, gpuPercent, vram, readings = [], thresholds = { warn: 75, danger: 90 }, className, ...props }, ref) => {
    const items: SystemResourceReading[] = [
      ...(cpuPercent != null ? [{ id: "cpu", label: "CPU", value: cpuPercent, max: 100 }] : []),
      ...(ram ? [{ id: "ram", label: "RAM", value: ram.usedGB, max: ram.totalGB, unit: "GB" }] : []),
      ...(gpuPercent != null ? [{ id: "gpu", label: "GPU", value: gpuPercent, max: 100 }] : []),
      ...(vram ? [{ id: "vram", label: "VRAM", value: vram.usedGB, max: vram.totalGB, unit: "GB" }] : []),
      ...readings,
    ];
    const trim = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(1));
    return (
      <div ref={ref} role="group" aria-label="System resources" data-slot="system-resources-bar" className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs", className)} {...props}>
        {items.map((r) => {
          const pct = r.max > 0 ? Math.max(0, Math.min(100, (r.value / r.max) * 100)) : 0;
          const level = meterLevel(pct, thresholds);
          const text = r.unit ? `${trim(r.value)} / ${trim(r.max)} ${r.unit}` : `${Math.round(pct)}%`;
          return (
            <div
              key={r.id}
              role="meter"
              aria-label={r.label}
              aria-valuemin={0}
              aria-valuemax={r.max}
              aria-valuenow={r.value}
              aria-valuetext={text}
              data-level={level}
              data-resource={r.id}
              className="flex items-center gap-1.5"
            >
              <span className="font-medium text-muted-foreground">{r.label}</span>
              <span aria-hidden className="relative h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                <span className={cn("absolute inset-y-0 left-0 rounded-full transition-[width]", levelBar[level])} style={{ width: `${pct}%` }} />
              </span>
              <span className={cn("font-mono tabular-nums", level === "danger" ? "text-destructive" : level === "warn" ? "text-warning-soft-foreground" : "text-foreground")}>{text}</span>
            </div>
          );
        })}
      </div>
    );
  }
);
SystemResourcesBar.displayName = "SystemResourcesBar";
