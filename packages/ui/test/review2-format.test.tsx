/**
 * Review 2, group "format": one implementation of each time, duration and byte format in src/lib.
 * - Every component wrapper keeps its old output (BASELINE was recorded from the pre-refactor code over these inputs).
 * - The new lib options are unit-tested.
 * - The three root overrides (formatBytes, splitDuration, base32Decode) stay, because the lib versions differ for
 *   some legacy inputs; the tests pin those differences.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import * as root from "../src/index";
import { formatAgentRelativeTime } from "../src/kits/agent/agent-sessions";
import { formatAgentElapsed } from "../src/kits/agent/agent-tasks";
import { formatTranscriptDay } from "../src/kits/agent/agent-transcript";
import { formatChannelAgo } from "../src/kits/agent-admin/channels";
import { formatAgentDuration } from "../src/kits/ai/agent-usage";
import { formatAttachmentSize } from "../src/kits/ai/chat-attachment";
import { formatMessageRelativeTime } from "../src/kits/ai/chat-message-actions";
import { formatSubagentElapsed } from "../src/kits/agent-admin/subagents";
import { formatSavedAgo } from "../src/kits/editor/editor-status";
import { formatProcessBytes } from "../src/kits/ops/process-table";
import { formatRelativeDate } from "../src/kits/identity/api-keys";
import { formatVersionDay } from "../src/kits/editor/version-history";
import { formatSessionLastActive } from "../src/kits/identity/device-sessions";
import { formatMessageDay, formatLastSeen } from "../src/kits/social/messenger";
import { formatCallDuration } from "../src/kits/social/call-overlay";
import { formatKanbanDuration } from "../src/kits/workspace/kanban-model";
import { formatTimelineDuration } from "../src/patterns/timeline-bar";
import { Countdown, formatCompactDuration, splitDuration } from "../src/patterns/countdown";
import { formatStopwatch } from "../src/patterns/stopwatch";
import { formatBytes } from "../src/patterns/file-upload";
import { formatFileSize } from "../src/patterns/file-viewer";
import { base32Decode } from "../src/kits/identity/totp";
import { formatMediaTime } from "../src/kits/media/media-controls";
import { UsageSummary } from "../src/kits/ai/usage-summary";
import { formatRelativeTime } from "../src/lib/relative-time";
import { formatMemory, formatRate, formatSpan } from "../src/lib/system-monitor";
import { formatDayLabel, formatRelative } from "../src/lib/time";
import { formatClock, formatDuration, splitDuration as splitDurationLib } from "../src/lib/duration";
import { formatBytes as formatBytesLib } from "../src/lib/format";
import { base32Decode as base32DecodeLib } from "../src/lib/encoding";
import { axeViolations } from "./a11y";

const NOW = new Date(2026, 2, 10, 12, 0, 0).getTime();
const S = 1000, M = 60 * S, H = 60 * M, D = 24 * H;
const AGO = [0, 10 * S, 30 * S, 44 * S, 45 * S, 59 * S, 60 * S, 89 * S, 90 * S, 119 * S, 120 * S, 150 * S, 5 * M, 59 * M + 29 * S, 59 * M + 31 * S, 60 * M, 89 * M, 90 * M, 3 * H, 23 * H + 29 * M, 23 * H + 31 * M, 24 * H, 30 * H, 36 * H, 47 * H + 59 * M, 48 * H, 3 * D, 6 * D, 6.6 * D, 7 * D, 13 * D, 29 * D, 29.6 * D, 30 * D, 45 * D, 60 * D, 200 * D, 364 * D, 400 * D, 800 * D, -10 * S, -59 * S, -61 * S, -5 * M, -3 * H, -1 * D, -3 * D, -60 * D, -400 * D];
const TIMES: unknown[] = [...AGO.map((a) => NOW - a), "nope", NaN, undefined, null, "", new Date(NOW - 5 * M), new Date(NOW - 3 * D).toISOString(), "2026-03-09"];
const DAY_DATES = [0, 1, -1, 2, 3, 4, 5, 6, 7, 8, 30, 365, 400].flatMap((d) => [new Date(2026, 2, 10 - d, 0, 0), new Date(2026, 2, 10 - d, 23, 59)]);
const DST_DATES = [new Date(2026, 2, 8, 1), new Date(2026, 2, 7, 23), new Date(2026, 10, 1, 1), new Date(2026, 9, 31, 23)];
const MS = [0, -0, -1, -1000, 1, 499, 500, 849.6, 850, 999, 999.4, 999.5, 1000, 1499, 1500, 1999, 4321, 9999, 10000, 45000, 59400, 59500, 59600, 59999, 60000, 61000, 65000, 90400, 119600, 119999, 3599000, 3599600, 3600000, 3661000, 3725000, 5424000, 86399000, 86400000, 90061000, 3 * D + 4 * H + 123, 30 * D, 400 * D, 360000000, NaN, Infinity, -Infinity];
const SECS = [0, -0, -5, 0.4, 0.999, 59.9, 65, 200.9, 599.99, 3599, 3599.999, 3600, 3725, 36000, 360000, NaN, Infinity, -Infinity];
const K = 1024;
const BYTES: unknown[] = [0, -0, -1, -1536, 0.4, 1, 512, 999, 1000, 1023, 1023.4, 1023.99, 1024, 1536, 2048, 10 * K, 10239, 10240, 102400, 1023 * K, K ** 2, 1.5 * K ** 2, K ** 2 * 9.99, K ** 2 * 99.95, K ** 2 * 1023.96, 1e9, 1.18e9, K ** 3, 2.5 * K ** 3, K ** 4 - 1, K ** 4, 1.5 * K ** 4, K ** 5, 3 * K ** 6, 1e30, 1e40, NaN, Infinity, -Infinity, null, undefined];
const B32 = ["", "MZXW6YTBOI", "mzxw6ytboi", "MZXW 6YTB-OI======", "JBSWY3DPEHPK3PXP", "MZXW6YTBO1", "!!", "a"];

/** The lib calls that replaced two private helpers (usage-summary latency, countdown's spoken text). */
const usageLatency = (ms: number) => formatDuration(ms, { style: "decimal", ms: true, maxUnit: "h" });
const countdownSpoken = (ms: number) =>
  formatDuration(Math.ceil(ms / 1000) * 1000, { style: "long", units: 3, keepZeros: false, round: "floor", invalid: "0 seconds" });

const safe = (f: () => unknown) => {
  try {
    const v = f();
    return v instanceof Uint8Array ? Array.from(v).join(",") : v === undefined ? "<undefined>" : v;
  } catch (e) {
    return `THROWS ${(e as Error).message}`;
  }
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type F = (x: any) => unknown;
const GROUPS: Record<string, [unknown[], F]> = {
  formatAgentRelativeTime: [TIMES, (t) => formatAgentRelativeTime(t, NOW)],
  formatChannelAgo: [TIMES, (t) => formatChannelAgo(t, NOW)],
  formatMessageRelativeTime: [TIMES, (t) => formatMessageRelativeTime(t, NOW)],
  formatSavedAgo: [TIMES, (t) => formatSavedAgo(t, NOW)],
  formatRelativeDate: [TIMES, (t) => formatRelativeDate(t, NOW)],
  formatSessionLastActive: [TIMES, (t) => formatSessionLastActive(t, NOW)],
  formatLastSeen: [TIMES, (t) => formatLastSeen(t, new Date(NOW))],
  formatRelativeTime: [TIMES, (t) => formatRelativeTime(t, NOW)],
  formatSpan: [TIMES, (t) => formatSpan(t, NOW)],
  formatTranscriptDay: [[...TIMES, ...DAY_DATES], (t) => formatTranscriptDay(t, NOW)],
  formatVersionDay: [[...TIMES, ...DAY_DATES], (t) => formatVersionDay(t, NOW)],
  formatMessageDay: [[...DAY_DATES, new Date(NaN)], (t) => formatMessageDay(t, new Date(NOW))],
  formatMessageDayDst: [DST_DATES, (t) => formatMessageDay(t, new Date(2026, 2, 10, 12))],
  formatAgentElapsed: [MS, formatAgentElapsed],
  formatAgentDuration: [MS, formatAgentDuration],
  formatSubagentElapsed: [MS, formatSubagentElapsed],
  formatKanbanDuration: [MS, formatKanbanDuration],
  formatTimelineDuration: [MS, formatTimelineDuration],
  formatCompactDuration: [MS, formatCompactDuration],
  formatStopwatch: [MS, formatStopwatch],
  usageSummaryDuration: [MS, usageLatency],
  countdownSpoken: [MS, countdownSpoken],
  splitDuration: [MS, (m) => JSON.stringify(splitDuration(m))],
  formatCallDuration: [SECS, formatCallDuration],
  formatMediaTime: [SECS, (s) => formatMediaTime(s)],
  formatMediaTimeHours: [SECS, (s) => formatMediaTime(s, { forceHours: true })],
  formatMediaTimeNegative: [SECS, (s) => formatMediaTime(s, { negative: true })],
  formatAttachmentSize: [BYTES, formatAttachmentSize],
  formatProcessBytes: [BYTES, formatProcessBytes],
  formatFileSize: [BYTES, formatFileSize],
  formatMemory: [BYTES, formatMemory],
  formatRate: [BYTES, formatRate],
  fileUploadFormatBytes: [BYTES, (b) => formatBytes(b)],
  fileUploadFormatBytes0: [BYTES, (b) => formatBytes(b, 0)],
  fileUploadFormatBytes2: [BYTES, (b) => formatBytes(b, 2)],
  fileUploadFormatBytes3: [BYTES, (b) => formatBytes(b, 3)],
  totpBase32Decode: [B32, base32Decode],
};

/* Outputs of the pre-refactor wrappers (and of the two private helpers) over the inputs above. */
const BASELINE: Record<string, unknown[]> = {
  formatAgentRelativeTime: ["now","now","now","now","now","now","1m","1m","2m","2m","2m","3m","5m","59m","1h","1h","1h","2h","3h","23h","1d","1d","1d","2d","2d","2d","3d","6d","Mar 3","Mar 3","Feb 25","Feb 9","Feb 8","Feb 8","Jan 24","Jan 9","Aug 22, 2025","Mar 11, 2025","Feb 3, 2025","Dec 31, 2023","now","now","now","now","now","now","now","now","now","","","","","","5m","3d","2d"],
  formatChannelAgo: ["just now","just now","just now","just now","1m ago","1m ago","1m ago","1m ago","2m ago","2m ago","2m ago","3m ago","5m ago","59m ago","1h ago","1h ago","1h ago","2h ago","3h ago","23h ago","1d ago","1d ago","1d ago","2d ago","2d ago","2d ago","3d ago","6d ago","7d ago","7d ago","13d ago","29d ago","1mo ago","1mo ago","2mo ago","2mo ago","7mo ago","1y ago","1y ago","2y ago","just now","just now","just now","just now","just now","just now","just now","just now","just now","—","—","—","—","—","5m ago","3d ago","2d ago"],
  formatMessageRelativeTime: ["just now","just now","just now","just now","1m ago","1m ago","1m ago","1m ago","2m ago","2m ago","2m ago","3m ago","5m ago","59m ago","1h ago","1h ago","1h ago","2h ago","3h ago","23h ago","Yesterday","Yesterday","Yesterday","2d ago","2d ago","2d ago","3d ago","6d ago","Mar 3","Mar 3","Feb 25","Feb 9","Feb 8","Feb 8","Jan 24","Jan 9","Aug 22, 2025","Mar 11, 2025","Feb 3, 2025","Dec 31, 2023","just now","just now","just now","just now","just now","just now","just now","just now","just now","—","—","—","—","—","5m ago","3d ago","2d ago"],
  formatSavedAgo: ["Saved just now","Saved just now","Saved just now","Saved just now","Saved 1m ago","Saved 1m ago","Saved 1m ago","Saved 1m ago","Saved 2m ago","Saved 2m ago","Saved 2m ago","Saved 3m ago","Saved 5m ago","Saved 59m ago","Saved 1h ago","Saved 1h ago","Saved 1h ago","Saved 2h ago","Saved 3h ago","Saved 23h ago","Saved yesterday","Saved yesterday","Saved yesterday","Saved yesterday","Saved yesterday","Saved Mar 8","Saved Mar 7","Saved Mar 4","Saved Mar 3","Saved Mar 3","Saved Feb 25","Saved Feb 9","Saved Feb 8","Saved Feb 8","Saved Jan 24","Saved Jan 9","Saved Aug 22, 2025","Saved Mar 11, 2025","Saved Feb 3, 2025","Saved Dec 31, 2023","Saved just now","Saved just now","Saved just now","Saved just now","Saved just now","Saved just now","Saved just now","Saved just now","Saved just now","Saved —","Saved —","Saved —","Saved —","Saved —","Saved 5m ago","Saved Mar 7","Saved yesterday"],
  formatRelativeDate: ["just now","just now","just now","just now","just now","just now","1 min ago","1 min ago","2 min ago","2 min ago","2 min ago","3 min ago","5 min ago","59 min ago","1h ago","1h ago","1h ago","2h ago","3h ago","23h ago","yesterday","yesterday","yesterday","2 days ago","2 days ago","2 days ago","3 days ago","6 days ago","7 days ago","7 days ago","13 days ago","29 days ago","1 mo ago","1 mo ago","2 mo ago","2 mo ago","7 mo ago","1y ago","1y ago","2y ago","in under a minute","in under a minute","in 1 min","in 5 min","in 3h","tomorrow","in 3 days","in 2 mo","in 1y","—","—","—","—","—","5 min ago","3 days ago","2 days ago"],
  formatSessionLastActive: ["Active now","Active now","Active now","Active now","Active now","Active now","Active now","Active now","Active now","Active now","2 min ago","2 min ago","5 min ago","59 min ago","59 min ago","1h ago","1h ago","1h ago","3h ago","23h ago","23h ago","Yesterday","Yesterday","Yesterday","Yesterday","2 days ago","3 days ago","6 days ago","6 days ago","7 days ago","13 days ago","29 days ago","29 days ago","Feb 8, 2026","Jan 24, 2026","Jan 9, 2026","Aug 22, 2025","Mar 11, 2025","Feb 3, 2025","Dec 31, 2023","Active now","Active now","Active now","Active now","Active now","Active now","Active now","Active now","Active now","Unknown","Unknown","Unknown","Unknown","Unknown","5 min ago","3 days ago","Yesterday"],
  formatLastSeen: ["last seen just now","last seen just now","last seen just now","last seen just now","last seen just now","last seen just now","last seen 1m ago","last seen 1m ago","last seen 2m ago","last seen 2m ago","last seen 2m ago","last seen 3m ago","last seen 5m ago","last seen 59m ago","last seen 1h ago","last seen 1h ago","last seen 1h ago","last seen 2h ago","last seen 3h ago","last seen 23h ago","last seen yesterday","last seen yesterday","last seen yesterday","last seen yesterday","last seen Sunday","last seen Sunday","last seen Saturday","last seen Wednesday","last seen Mar 3","last seen Mar 3","last seen Feb 25","last seen Feb 9","last seen Feb 8","last seen Feb 8","last seen Jan 24","last seen Jan 9","last seen Aug 22, 2025","last seen Mar 11, 2025","last seen Feb 3, 2025","last seen Dec 31, 2023","last seen just now","last seen just now","last seen just now","last seen just now","last seen just now","last seen just now","last seen just now","last seen just now","last seen just now","last seen recently","last seen recently","last seen recently","last seen recently","last seen recently","last seen 5m ago","last seen Saturday","last seen yesterday"],
  formatRelativeTime: ["just now","just now","just now","just now","1 min ago","1 min ago","1 min ago","1 min ago","2 min ago","2 min ago","2 min ago","3 min ago","5 min ago","59 min ago","1 h ago","1 h ago","1 h ago","2 h ago","3 h ago","23 h ago","yesterday","yesterday","yesterday","2 days ago","2 days ago","2 days ago","3 days ago","6 days ago","7 days ago","7 days ago","13 days ago","29 days ago","Feb 8","Feb 8","Jan 24","Jan 9","Aug 22, 2025","Mar 11, 2025","Feb 3, 2025","Dec 31, 2023","just now","just now","just now","just now","just now","just now","just now","just now","just now","—","—","—","—","—","5 min ago","3 days ago","2 days ago"],
  formatSpan: ["under a minute","under a minute","1 min","1 min","1 min","1 min","1 min","1 min","2 min","2 min","2 min","3 min","5 min","59 min","1 hour","1 hour","1 hour","2 hours","3 hours","23 hours","1 day","1 day","1 day","2 days","2 days","2 days","3 days","6 days","7 days","7 days","13 days","29 days","1 month","1 month","2 months","2 months","7 months","1 year","1 year","2 years","under a minute","under a minute","under a minute","under a minute","under a minute","under a minute","under a minute","under a minute","under a minute","<undefined>","<undefined>","<undefined>","<undefined>","<undefined>","5 min","3 days","2 days"],
  formatTranscriptDay: ["Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Yesterday","Yesterday","Yesterday","Yesterday","Yesterday","Sun, Mar 8","Sun, Mar 8","Sat, Mar 7","Wed, Mar 4","Tue, Mar 3","Tue, Mar 3","Wed, Feb 25","Mon, Feb 9","Sun, Feb 8","Sun, Feb 8","Sat, Jan 24","Fri, Jan 9","Fri, Aug 22, 2025","Tue, Mar 11, 2025","Mon, Feb 3, 2025","Sun, Dec 31, 2023","Today","Today","Today","Today","Today","Wed, Mar 11","Fri, Mar 13","Sat, May 9","Wed, Apr 14, 2027","Today","Today","Today","Today","Today","Today","Sat, Mar 7","Yesterday","Today","Today","Yesterday","Yesterday","Wed, Mar 11","Wed, Mar 11","Sun, Mar 8","Sun, Mar 8","Sat, Mar 7","Sat, Mar 7","Fri, Mar 6","Fri, Mar 6","Thu, Mar 5","Thu, Mar 5","Wed, Mar 4","Wed, Mar 4","Tue, Mar 3","Tue, Mar 3","Mon, Mar 2","Mon, Mar 2","Sun, Feb 8","Sun, Feb 8","Mon, Mar 10, 2025","Mon, Mar 10, 2025","Mon, Feb 3, 2025","Mon, Feb 3, 2025"],
  formatVersionDay: ["Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Today","Yesterday","Yesterday","Yesterday","Yesterday","Yesterday","Sun, Mar 8","Sun, Mar 8","Sat, Mar 7","Wed, Mar 4","Tue, Mar 3","Tue, Mar 3","Wed, Feb 25","Mon, Feb 9","Sun, Feb 8","Sun, Feb 8","Sat, Jan 24","Fri, Jan 9","Fri, Aug 22, 2025","Tue, Mar 11, 2025","Mon, Feb 3, 2025","Sun, Dec 31, 2023","Today","Today","Today","Today","Today","Wed, Mar 11","Fri, Mar 13","Sat, May 9","Wed, Apr 14, 2027","—","—","—","—","—","Today","Sat, Mar 7","Yesterday","Today","Today","Yesterday","Yesterday","Wed, Mar 11","Wed, Mar 11","Sun, Mar 8","Sun, Mar 8","Sat, Mar 7","Sat, Mar 7","Fri, Mar 6","Fri, Mar 6","Thu, Mar 5","Thu, Mar 5","Wed, Mar 4","Wed, Mar 4","Tue, Mar 3","Tue, Mar 3","Mon, Mar 2","Mon, Mar 2","Sun, Feb 8","Sun, Feb 8","Mon, Mar 10, 2025","Mon, Mar 10, 2025","Mon, Feb 3, 2025","Mon, Feb 3, 2025"],
  formatMessageDay: ["Today","Today","Yesterday","Yesterday","Mar 11","Mar 11","Sunday","Sunday","Saturday","Saturday","Friday","Friday","Thursday","Thursday","Wednesday","Wednesday","Mar 3","Mar 3","Mar 2","Mar 2","Feb 8","Feb 8","Mar 10, 2025","Mar 10, 2025","Feb 3, 2025","Feb 3, 2025","—"],
  formatMessageDayDst: ["Sunday","Saturday","Nov 1","Oct 31"],
  formatAgentElapsed: ["0s","0s","0s","0s","0s","0s","0s","0s","0s","0s","0s","0s","1s","1s","1s","1s","4s","9s","10s","45s","59s","59s","59s","59s","1m 00s","1m 01s","1m 05s","1m 30s","1m 59s","1m 59s","59m 59s","59m 59s","1h 00m","1h 01m","1h 02m","1h 30m","23h 59m","1d 00h","1d 01h","3d 04h","30d 00h","400d 00h","4d 04h","0s","0s","0s"],
  formatAgentDuration: ["0ms","0ms","0ms","0ms","1ms","499ms","500ms","850ms","850ms","999ms","999ms","1s","1s","1s","2s","2s","4s","10s","10s","45s","59s","1m 00s","1m 00s","1m 00s","1m 00s","1m 01s","1m 05s","1m 30s","2m 00s","2m 00s","59m 59s","1h 00m","1h 00m","1h 01m","1h 02m","1h 30m","1d 00h","1d 00h","1d 01h","3d 04h","30d 00h","400d 00h","4d 04h","—","—","—"],
  formatSubagentElapsed: ["0s","0s","0s","0s","0s","0s","0s","0s","0s","0s","0s","0s","1s","1s","1s","1s","4s","9s","10s","45s","59s","59s","59s","59s","1m 00s","1m 01s","1m 05s","1m 30s","1m 59s","1m 59s","59m 59s","59m 59s","1h 00m","1h 01m","1h 02m","1h 30m","23h 59m","1d 00h","1d 01h","3d 04h","30d 00h","400d 00h","4d 04h","—","—","—"],
  formatKanbanDuration: ["0s","0s","—","—","0s","0s","1s","1s","1s","1s","1s","1s","1s","1s","2s","2s","4s","10s","10s","45s","59s","1m 0s","1m 0s","1m 0s","1m 0s","1m 1s","1m 5s","1m 30s","2m 0s","2m 0s","59m 59s","1h 0m","1h 0m","1h 1m","1h 2m","1h 30m","24h 0m","24h 0m","25h 1m","76h 0m","720h 0m","9600h 0m","100h 0m","—","—","—"],
  formatTimelineDuration: ["0s","0s","0s","0s","0s","0s","1s","1s","1s","1s","1s","1s","1s","1s","2s","2s","4s","10s","10s","45s","59s","1m","1m","1m","1m","1m","1m","1m","2m","2m","59m","1h","1h","1h 1m","1h 2m","1h 30m","23h 59m","1d","1d 1h","3d 4h","30d","400d","4d 4h","—","—","—"],
  formatCompactDuration: ["0s","0s","0s","0s","1s","1s","1s","1s","1s","1s","1s","1s","1s","2s","2s","2s","5s","10s","10s","45s","1m 0s","1m 0s","1m 0s","1m 0s","1m 0s","1m 1s","1m 5s","1m 31s","2m 0s","2m 0s","59m 59s","1h 0m","1h 0m","1h 1m","1h 2m","1h 30m","23h 59m","1d 0h","1d 1h","3d 4h","30d 0h","400d 0h","4d 4h","0s","0s","0s"],
  formatStopwatch: ["00:00.00","00:00.00","00:00.00","00:00.00","00:00.00","00:00.49","00:00.50","00:00.84","00:00.85","00:00.99","00:00.99","00:00.99","00:01.00","00:01.49","00:01.50","00:01.99","00:04.32","00:09.99","00:10.00","00:45.00","00:59.40","00:59.50","00:59.60","00:59.99","01:00.00","01:01.00","01:05.00","01:30.40","01:59.60","01:59.99","59:59.00","59:59.60","1:00:00.00","1:01:01.00","1:02:05.00","1:30:24.00","23:59:59.00","24:00:00.00","25:01:01.00","76:00:00.12","720:00:00.00","9600:00:00.00","100:00:00.00","00:00.00","00:00.00","00:00.00"],
  usageSummaryDuration: ["0ms","0ms","-1ms","-1000ms","1ms","499ms","500ms","850ms","850ms","999ms","999ms","1s","1s","1.5s","1.5s","2s","4.3s","10s","10s","45s","59.4s","59.5s","59.6s","1m","1m","1m","1.1m","1.5m","2m","2m","1h","1h","1h","1h","1h","1.5h","24h","24h","25h","76h","720h","9600h","100h","NaNh","Infinityh","-Infinityms"],
  countdownSpoken: ["0 seconds","0 seconds","0 seconds","0 seconds","1 second","1 second","1 second","1 second","1 second","1 second","1 second","1 second","1 second","2 seconds","2 seconds","2 seconds","5 seconds","10 seconds","10 seconds","45 seconds","1 minute","1 minute","1 minute","1 minute","1 minute","1 minute 1 second","1 minute 5 seconds","1 minute 31 seconds","2 minutes","2 minutes","59 minutes 59 seconds","1 hour","1 hour","1 hour 1 minute 1 second","1 hour 2 minutes 5 seconds","1 hour 30 minutes 24 seconds","23 hours 59 minutes 59 seconds","1 day","1 day 1 hour 1 minute","3 days 4 hours","30 days","400 days","4 days 4 hours","0 seconds","0 seconds","0 seconds"],
  splitDuration: ["{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":0}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":0}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":0}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":0}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":1}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":1}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":1}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":1}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":1}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":1}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":1}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":1}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":1}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":2}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":2}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":2}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":5}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":10}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":10}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":45}","{\"days\":0,\"hours\":0,\"minutes\":1,\"seconds\":0}","{\"days\":0,\"hours\":0,\"minutes\":1,\"seconds\":0}","{\"days\":0,\"hours\":0,\"minutes\":1,\"seconds\":0}","{\"days\":0,\"hours\":0,\"minutes\":1,\"seconds\":0}","{\"days\":0,\"hours\":0,\"minutes\":1,\"seconds\":0}","{\"days\":0,\"hours\":0,\"minutes\":1,\"seconds\":1}","{\"days\":0,\"hours\":0,\"minutes\":1,\"seconds\":5}","{\"days\":0,\"hours\":0,\"minutes\":1,\"seconds\":31}","{\"days\":0,\"hours\":0,\"minutes\":2,\"seconds\":0}","{\"days\":0,\"hours\":0,\"minutes\":2,\"seconds\":0}","{\"days\":0,\"hours\":0,\"minutes\":59,\"seconds\":59}","{\"days\":0,\"hours\":1,\"minutes\":0,\"seconds\":0}","{\"days\":0,\"hours\":1,\"minutes\":0,\"seconds\":0}","{\"days\":0,\"hours\":1,\"minutes\":1,\"seconds\":1}","{\"days\":0,\"hours\":1,\"minutes\":2,\"seconds\":5}","{\"days\":0,\"hours\":1,\"minutes\":30,\"seconds\":24}","{\"days\":0,\"hours\":23,\"minutes\":59,\"seconds\":59}","{\"days\":1,\"hours\":0,\"minutes\":0,\"seconds\":0}","{\"days\":1,\"hours\":1,\"minutes\":1,\"seconds\":1}","{\"days\":3,\"hours\":4,\"minutes\":0,\"seconds\":1}","{\"days\":30,\"hours\":0,\"minutes\":0,\"seconds\":0}","{\"days\":400,\"hours\":0,\"minutes\":0,\"seconds\":0}","{\"days\":4,\"hours\":4,\"minutes\":0,\"seconds\":0}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":0}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":0}","{\"days\":0,\"hours\":0,\"minutes\":0,\"seconds\":0}"],
  formatCallDuration: ["00:00","00:00","00:00","00:00","00:00","00:59","01:05","03:20","09:59","59:59","59:59","1:00:00","1:02:05","10:00:00","100:00:00","00:00","00:00","00:00"],
  formatMediaTime: ["0:00","0:00","0:00","0:00","0:00","0:59","1:05","3:20","9:59","59:59","59:59","1:00:00","1:02:05","10:00:00","100:00:00","0:00","0:00","0:00"],
  formatMediaTimeHours: ["0:00:00","0:00:00","0:00:00","0:00:00","0:00:00","0:00:59","0:01:05","0:03:20","0:09:59","0:59:59","0:59:59","1:00:00","1:02:05","10:00:00","100:00:00","0:00:00","0:00:00","0:00:00"],
  formatMediaTimeNegative: ["-0:00","-0:00","-0:00","-0:00","-0:00","-0:59","-1:05","-3:20","-9:59","-59:59","-59:59","-1:00:00","-1:02:05","-10:00:00","-100:00:00","-0:00","-0:00","-0:00"],
  formatAttachmentSize: ["0 B","0 B","","","0 B","1 B","512 B","999 B","1000 B","1023 B","1023 B","1.0 KB","1.0 KB","1.5 KB","2.0 KB","10 KB","10.0 KB","10 KB","100 KB","1023 KB","1.0 MB","1.5 MB","10.0 MB","100 MB","1.0 GB","954 MB","1.1 GB","1.0 GB","2.5 GB","1.0 TB","1.0 TB","1.5 TB","1.0 PB","3.0 EB","867361737988 EB","8.673617379884036e+21 EB","","","","",""],
  formatProcessBytes: ["0 B","0 B","-1 B","-1.5 KB","0 B","1 B","512 B","999 B","1000 B","1023 B","1023 B","1 KB","1 KB","1.5 KB","2 KB","10 KB","10 KB","10 KB","100 KB","1023 KB","1 MB","1.5 MB","10 MB","100 MB","1 GB","954 MB","1.1 GB","1 GB","2.5 GB","1 TB","1 TB","1.5 TB","1 PB","3 EB","867361737988 EB","8.673617379884036e+21 EB","—","—","—","—","—"],
  formatFileSize: ["0 B","0 B","-1 B","-1.5 KB","0 B","1 B","512 B","999 B","1000 B","1023 B","1023 B","1.0 KB","1.0 KB","1.5 KB","2.0 KB","10 KB","10.0 KB","10 KB","100 KB","1023 KB","1.0 MB","1.5 MB","10.0 MB","100 MB","1.0 GB","954 MB","1.1 GB","1.0 GB","2.5 GB","1.0 TB","1.0 TB","1.5 TB","1.0 PB","3.0 EB","867361737988 EB","8.673617379884036e+21 EB","","","","",""],
  formatMemory: ["0 B","0 B","-1 B","-1.5 KB","0 B","1 B","512 B","999 B","1 KB","1 KB","1 KB","1 KB","1 KB","1.5 KB","2 KB","10 KB","10 KB","10 KB","102 KB","1 MB","1 MB","1.6 MB","10 MB","105 MB","1.07 GB","1 GB","1.18 GB","1.07 GB","2.68 GB","1.1 TB","1.1 TB","1.65 TB","1.13 PB","3.46 EB","1000000000000 EB","1e+22 EB","—","—","—","—","—"],
  formatRate: ["0 B/s","0 B/s","-1 B/s","-1.5 kB/s","0 B/s","1 B/s","512 B/s","999 B/s","1 kB/s","1 kB/s","1 kB/s","1 kB/s","1 kB/s","1.5 kB/s","2 kB/s","10 kB/s","10 kB/s","10 kB/s","102 kB/s","1 MB/s","1 MB/s","1.6 MB/s","10 MB/s","105 MB/s","1.1 GB/s","1 GB/s","1.2 GB/s","1.1 GB/s","2.7 GB/s","1.1 TB/s","1.1 TB/s","1.6 TB/s","1.1 PB/s","3.5 EB/s","1000000000000 EB/s","1e+22 EB/s","—","—","—","—","—"],
  fileUploadFormatBytes: ["0 B","0 B","0 B","0 B","0 B","1 B","512 B","999 B","1000 B","1023 B","1023 B","1 KB","1 KB","1.5 KB","2 KB","10 KB","10 KB","10 KB","100 KB","1023 KB","1 MB","1.5 MB","10 MB","100 MB","1 GB","953.7 MB","1.1 GB","1 GB","2.5 GB","1 TB","1 TB","1.5 TB","1024 TB","3145728 TB","909494701772928256 TB","9.094947017729283e+27 TB","0 B","0 B","0 B","0 B","0 B"],
  fileUploadFormatBytes0: ["0 B","0 B","0 B","0 B","0 B","1 B","512 B","999 B","1000 B","1023 B","1023 B","1 KB","1 KB","2 KB","2 KB","10 KB","10 KB","10 KB","100 KB","1023 KB","1 MB","2 MB","10 MB","100 MB","1 GB","954 MB","1 GB","1 GB","3 GB","1 TB","1 TB","2 TB","1024 TB","3145728 TB","909494701772928256 TB","9.094947017729283e+27 TB","0 B","0 B","0 B","0 B","0 B"],
  fileUploadFormatBytes2: ["0 B","0 B","0 B","0 B","0 B","1 B","512 B","999 B","1000 B","1023 B","1023 B","1 KB","1 KB","1.50 KB","2 KB","10 KB","10 KB","10 KB","100 KB","1023 KB","1 MB","1.50 MB","9.99 MB","99.95 MB","1023.96 MB","953.67 MB","1.10 GB","1 GB","2.50 GB","1 TB","1 TB","1.50 TB","1024 TB","3145728 TB","909494701772928256 TB","9.094947017729283e+27 TB","0 B","0 B","0 B","0 B","0 B"],
  fileUploadFormatBytes3: ["0 B","0 B","0 B","0 B","0 B","1 B","512 B","999 B","1000 B","1023 B","1023 B","1 KB","1 KB","1.500 KB","2 KB","10 KB","9.999 KB","10 KB","100 KB","1023 KB","1 MB","1.500 MB","9.990 MB","99.950 MB","1023.960 MB","953.674 MB","1.099 GB","1 GB","2.500 GB","1 TB","1 TB","1.500 TB","1024 TB","3145728 TB","909494701772928256 TB","9.094947017729283e+27 TB","0 B","0 B","0 B","0 B","0 B"],
  totpBase32Decode: ["","102,111,111,98,97,114","102,111,111,98,97,114","102,111,111,98,97,114","72,101,108,108,111,33,222,173,190,239","THROWS Invalid base32 string","THROWS Invalid base32 string",""],
};

/**
 * The old private usage-summary helper printed garbage for impossible latencies; lib clamps and uses its placeholder.
 * Only these inputs change (index in MS → new text).
 */
const INTENDED_CHANGES: Record<string, Record<number, string>> = {
  usageSummaryDuration: { 2: "0ms", 3: "0ms", 43: "—", 44: "—", 45: "—" }, // -1, -1000, NaN, Infinity, -Infinity
};

describe("wrapper outputs are unchanged", () => {
  for (const [name, [inputs, f]] of Object.entries(GROUPS)) {
    it(name, () => {
      const expected = BASELINE[name]!.map((v, i) => INTENDED_CHANGES[name]?.[i] ?? v);
      expect(inputs.map((x) => safe(() => f(x)))).toEqual(expected);
    });
  }
});

describe("deprecated wrappers equal their documented replacement", () => {
  it("relative-time wrappers", () => {
    for (const t of TIMES as number[]) {
      expect(formatAgentRelativeTime(t, NOW)).toBe(formatRelative(t, { now: NOW, style: "narrow", justNowMs: 60_000, maxRelativeDays: 6, invalid: "" }));
      expect(formatChannelAgo(t, NOW)).toBe(formatRelative(t, { now: NOW }));
      expect(formatMessageRelativeTime(t, NOW)).toBe(formatRelative(t, { now: NOW, yesterday: "Yesterday", maxRelativeDays: 6 }));
      expect(formatSessionLastActive(t, NOW)).toBe(
        formatRelative(t, { now: NOW, style: "long", round: "floor", justNowMs: 120_000, justNow: "Active now", yesterday: "Yesterday", unitLabels: { hour: "h" }, maxRelativeDays: 29, dateYear: "always", invalid: "Unknown" })
      );
      expect(formatVersionDay(t, NOW)).toBe(formatDayLabel(t, { now: NOW, weekdayWithinWeek: false, tomorrow: false, weekday: true }));
    }
    for (const d of DAY_DATES) {
      expect(formatMessageDay(d, new Date(NOW))).toBe(formatDayLabel(d, { now: NOW, weekdayWithinWeek: "long", tomorrow: false, locale: "en-US" }));
    }
  });

  it("duration and size wrappers", () => {
    for (const ms of MS) {
      expect(formatAgentDuration(ms)).toBe(formatDuration(ms, { ms: true, pad: true }));
      expect(formatSubagentElapsed(ms)).toBe(formatDuration(ms, { pad: true, round: "floor" }));
      expect(formatStopwatch(ms)).toBe(formatClock(ms / 1000, { padMinutes: true, fractionDigits: 2 }));
    }
    for (const s of SECS) expect(formatCallDuration(s)).toBe(formatClock(s, { padMinutes: true }));
    for (const b of BYTES as number[]) {
      expect(formatProcessBytes(b)).toBe(formatBytesLib(b, { decimals: 1, wholeAbove: 100 }));
      expect(formatFileSize(b)).toBe(formatBytesLib(b, { trimZeros: false, wholeAbove: 10, invalid: "" }));
    }
  });
});

describe("lib/time formatRelative options", () => {
  const ago = (ms: number, options = {}) => formatRelative(NOW - ms, { now: NOW, ...options });

  it("justNow replaces the just-now text, optionally per direction", () => {
    expect(ago(10 * S, { justNow: "Active now" })).toBe("Active now");
    const split = { future: true, justNowMs: M, justNow: { past: "just now", future: "in under a minute" } };
    expect(ago(10 * S, split)).toBe("just now");
    expect(ago(-10 * S, split)).toBe("in under a minute");
    expect(ago(0, { justNow: "now!" })).toBe("now!");
  });

  it("unitLabels relabels units (string or [singular, plural])", () => {
    expect(ago(3 * H, { style: "long", unitLabels: { hour: "h" } })).toBe("3h ago");
    expect(ago(2 * H, { style: "long", unitLabels: { hour: " h" } })).toBe("2 h ago");
    expect(ago(60 * D, { style: "long", unitLabels: { month: " mo" } })).toBe("2 mo ago");
    expect(ago(400 * D, { unitLabels: { year: [" yr", " yrs"] } })).toBe("1 yr ago");
    expect(ago(800 * D, { unitLabels: { year: [" yr", " yrs"] } })).toBe("2 yrs ago");
    expect(ago(5 * M, { style: "long" })).toBe("5 min ago");
  });

  it("suffix toggles ' ago'", () => {
    expect(ago(3 * D, { style: "long", suffix: false })).toBe("3 days");
    expect(ago(5 * M, { style: "narrow", suffix: true })).toBe("5m ago");
    expect(ago(5 * M, { style: "narrow" })).toBe("5m");
    expect(formatRelative(NOW + 5 * M, { now: NOW, future: true, suffix: false })).toBe("in 5m");
  });

  it("yesterday accepts a label", () => {
    expect(ago(D, { yesterday: "Yesterday" })).toBe("Yesterday");
    expect(ago(D, { yesterday: true })).toBe("yesterday");
    expect(ago(D)).toBe("1d ago");
    expect(formatRelative(NOW + D, { now: NOW, future: true, yesterday: "Yesterday" })).toBe("tomorrow");
  });

  it("round sets the rounding per unit or for all units, including the maxRelativeDays count", () => {
    expect(ago(59 * M + 40 * S)).toBe("1h ago");
    expect(ago(59 * M + 40 * S, { round: "floor" })).toBe("59m ago");
    expect(ago(150 * S, { round: { day: "floor" } })).toBe("3m ago");
    expect(ago(36 * H, { round: { day: "floor" }, yesterday: true })).toBe("yesterday");
    expect(ago(36 * H, { yesterday: true })).toBe("2d ago");
    expect(ago(47 * H, { round: { day: "floor" }, maxRelativeDays: 1 })).toBe("1d ago");
    expect(ago(48 * H, { round: { day: "floor" }, maxRelativeDays: 1 })).not.toMatch(/ago$/);
  });

  it("dateYear sets the year of the absolute date", () => {
    expect(ago(30 * D, { maxRelativeDays: 7, dateYear: "always" })).toMatch(/2026/);
    expect(ago(30 * D, { maxRelativeDays: 7 })).not.toMatch(/2026/);
    expect(ago(400 * D, { maxRelativeDays: 7, dateYear: "never" })).not.toMatch(/20\d\d/);
  });

  it("non-English locales still use Intl and ignore the English-only labels", () => {
    expect(ago(3 * H, { locale: "de", style: "long", unitLabels: { hour: "h" } })).toBe("vor 3 Stunden");
  });
});

describe("lib/time formatDayLabel weekdayWithinWeek", () => {
  it('"long" gives the full weekday, true/"short" the short one', () => {
    const d = new Date(2026, 2, 6, 9); // Friday, 4 days before NOW
    expect(formatDayLabel(d, { now: NOW, weekdayWithinWeek: "long", locale: "en-US" })).toBe("Friday");
    expect(formatDayLabel(d, { now: NOW, weekdayWithinWeek: "short", locale: "en-US" })).toBe("Fri");
    expect(formatDayLabel(d, { now: NOW, locale: "en-US" })).toBe("Fri");
    expect(formatDayLabel(d, { now: NOW, weekdayWithinWeek: false, locale: "en-US" })).toBe("Mar 6");
  });
});

describe("lib/duration options", () => {
  it('style "long" spells units out', () => {
    expect(formatDuration(3_900_000, { style: "long" })).toBe("1 hour 5 minutes");
    expect(formatDuration(61_000, { style: "long" })).toBe("1 minute 1 second");
    expect(formatDuration(0, { style: "long" })).toBe("0 seconds");
    expect(formatDuration(850, { style: "long", ms: true })).toBe("850 milliseconds");
    expect(formatDuration(1500, { style: "long", decimals: 1 })).toBe("1.5 seconds");
    expect(formatDuration(2 * D + 5 * M, { style: "long", units: 3, keepZeros: false })).toBe("2 days 5 minutes");
  });

  it('style "decimal" shows only the largest unit with decimals', () => {
    expect(formatDuration(1500, { style: "decimal" })).toBe("1.5s");
    expect(formatDuration(138_000, { style: "decimal" })).toBe("2.3m");
    expect(formatDuration(59_960, { style: "decimal" })).toBe("1m");
    expect(formatDuration(4_320_000, { style: "decimal", maxUnit: "h" })).toBe("1.2h");
    expect(formatDuration(36 * H, { style: "decimal" })).toBe("1.5d");
    expect(formatDuration(36 * H, { style: "decimal", maxUnit: "h" })).toBe("36h");
    expect(formatDuration(850, { style: "decimal", ms: true })).toBe("850ms");
    expect(formatDuration(1234, { style: "decimal", decimals: 2, trimZeros: false })).toBe("1.23s");
    expect(formatDuration(0, { style: "decimal", zero: "—" })).toBe("—");
    expect(formatDuration(-1500, { style: "decimal", negative: "sign" })).toBe("-1.5s");
  });

  it("negative chooses clamp, sign or invalid", () => {
    expect(formatDuration(-65_000)).toBe("0s");
    expect(formatDuration(-65_000, { negative: "sign" })).toBe("-1m 5s");
    expect(formatDuration(-65_000, { signed: true })).toBe("-1m 5s");
    expect(formatDuration(-65_000, { negative: "invalid" })).toBe("—");
    expect(formatDuration(-65_000, { negative: "invalid", invalid: "n/a" })).toBe("n/a");
    expect(formatDuration(-0, { negative: "invalid" })).toBe("0s");
  });

  it("formatClock minus always prefixes a minus sign", () => {
    expect(formatClock(65, { minus: true })).toBe("-1:05");
    expect(formatClock(0, { minus: true })).toBe("-0:00");
    expect(formatClock(-65, { minus: true, signed: true })).toBe("-1:05");
  });
});

describe("lib/format formatBytes options", () => {
  it('trimZeros "whole" drops only an all-zero fraction', () => {
    expect(formatBytesLib(2048, { decimals: 2, trimZeros: "whole" })).toBe("2 KB");
    expect(formatBytesLib(1.5 * K * K, { decimals: 2, trimZeros: "whole" })).toBe("1.50 MB");
    expect(formatBytesLib(1.5 * K * K, { decimals: 2 })).toBe("1.5 MB");
    expect(formatBytesLib(1.5 * K * K, { decimals: 2, trimZeros: "whole", locale: "de" })).toBe("1,50 MB");
    expect(formatBytesLib(2048, { decimals: 2, trimZeros: "whole", locale: "de" })).toBe("2 KB");
  });

  it("units relabels and caps the units", () => {
    expect(formatBytesLib(6000, { base: 1000, units: ["B", "kB", "MB"] })).toBe("6 kB");
    expect(formatBytesLib(K ** 5, { units: ["B", "KB", "MB", "GB", "TB"] })).toBe("1024 TB");
    expect(formatBytesLib(K ** 5)).toBe("1 PB");
    expect(formatBytesLib(0, { units: ["o", "Ko"] })).toBe("0 o");
  });

  it("negative chooses sign, zero or invalid", () => {
    expect(formatBytesLib(-1536)).toBe("-1.5 KB");
    expect(formatBytesLib(-1536, { negative: "zero" })).toBe("0 B");
    expect(formatBytesLib(-1536, { negative: "invalid" })).toBe("—");
  });
});

describe("root overrides (kept: the lib versions differ for legacy inputs)", () => {
  it("the root exports the component versions", () => {
    expect(root.formatBytes).toBe(formatBytes);
    expect(root.splitDuration).toBe(splitDuration);
    expect(root.base32Decode).toBe(base32Decode);
  });

  it("formatBytes: same as lib for ordinary sizes, different for negative, non-numeric and ≥ 1024 TB input", () => {
    for (const b of [0, 1, 512, 1536, 2048, 10 * K, 1.5 * K * K, K ** 3, 1.5 * K ** 4]) expect(formatBytes(b)).toBe(formatBytesLib(b));
    expect([formatBytes(-1), formatBytesLib(-1)]).toEqual(["0 B", "-1 B"]);
    expect([formatBytes(NaN), formatBytesLib(NaN)]).toEqual(["0 B", "—"]);
    expect([formatBytes(K ** 5), formatBytesLib(K ** 5)]).toEqual(["1024 TB", "1 PB"]);
    expect([formatBytes(1.5 * K * K, 2), formatBytesLib(1.5 * K * K, { decimals: 2 })]).toEqual(["1.50 MB", "1.5 MB"]);
  });

  it("splitDuration: the component version rounds up to whole seconds and has no ms field", () => {
    expect(splitDuration(1500)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 2 });
    expect(splitDurationLib(1500)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 1, ms: 500 });
    const { ms: _ms, ...rest } = splitDurationLib(1500, { round: "ceil" });
    expect(splitDuration(1500)).toEqual(rest);
  });

  it("base32Decode: the component version throws where lib returns null", () => {
    expect(base32Decode("MZXW6YTBOI")).toEqual(base32DecodeLib("MZXW6YTBOI"));
    expect(() => base32Decode("!!")).toThrow("Invalid base32 string");
    expect(base32DecodeLib("!!")).toBeNull();
  });
});

describe("components that now call lib directly", () => {
  it("Countdown's spoken label", async () => {
    const { container } = render(<Countdown target={Date.now() + 2 * D + 3 * H + 5 * M + 30 * S} />);
    expect(screen.getByRole("timer")).toHaveAttribute("aria-label", expect.stringMatching(/^Time remaining: 2 days 3 hours 5 minutes$/));
    expect(await axeViolations(container)).toEqual([]);
  });

  it("UsageSummary latency", async () => {
    const { container } = render(<UsageSummary days={[{ date: "2026-03-09", requests: 2, waitMs: 2000, generateMs: 1000 }]} />);
    expect(document.querySelector('[data-stat="latency"]')).toHaveTextContent("1.5s");
    expect(await axeViolations(container)).toEqual([]);
  });
});
