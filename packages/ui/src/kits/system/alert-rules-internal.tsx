/* Private helpers shared by the alert-rules modules (metric icons, accent switch class). Not public. */

import {
  RiCpuLine,
  RiDownload2Line,
  RiGlobalLine,
  RiInstanceLine,
  RiLineChartLine,
  RiNotification3Line,
  RiRamLine,
  RiTempHotLine,
  RiUpload2Line,
  type RemixiconComponentType,
} from "@remixicon/react";
import { cn } from "../../lib/cn";
import { accentClasses } from "../../lib/accent";
import { type AlertMetric } from "../../lib/alert-rules";

export const METRIC_ICONS: Record<AlertMetric, RemixiconComponentType> = {
  cpu: RiCpuLine,
  memory: RiRamLine,
  "memory-growth": RiLineChartLine,
  "disk-read": RiDownload2Line,
  "disk-write": RiUpload2Line,
  network: RiGlobalLine,
  temperature: RiTempHotLine,
  gpu: RiInstanceLine,
};

export function MetricIcon({ metric, className }: { metric: AlertMetric; className?: string }) {
  const Icon = METRIC_ICONS[metric] ?? RiNotification3Line;
  return (
    <span aria-hidden className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", accentClasses.soft, className)}>
      <Icon aria-hidden />
    </span>
  );
}

export const accentSwitch = "data-[state=checked]:bg-[var(--sutra-accent,var(--primary))]";
