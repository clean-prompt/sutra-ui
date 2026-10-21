import * as React from "react";
import { RiCalendarLine, RiFlag2Line, RiHashtag, RiMoneyDollarCircleLine, RiTimeLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { toneClasses } from "../../lib/tone";
import { addDays, calendarDayDiff, dateKey, formatClockTime, formatShortDate, pad2 } from "../../lib/time";
import { useAsyncAction } from "../../hooks/use-async-action";
import { useControllableState } from "../../hooks/use-controllable-state";
import { SutraAppIcon, sutraAppMeta, type SutraApp } from "../../assets/brand";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../primitives/dialog";
import { ShortcutKeys, useShortcut } from "../../patterns/shortcuts";

/* ------------------------------------------------------------------ */
/* Parser                                                              */
/* ------------------------------------------------------------------ */

export type CapturePriority = "low" | "medium" | "high" | "urgent";

export interface CaptureResult {
  app: SutraApp;
  title: string;
  /** Local date, `YYYY-MM-DD`. */
  date?: string;
  /** 24h local time, `HH:mm`. */
  time?: string;
  priority?: CapturePriority;
  tags: string[];
  /** Money amount, e.g. from "$12.50". */
  amount?: number;
  /** True when the text named the app ("task: …"). */
  explicitApp: boolean;
}

export interface ParseCaptureOptions {
  /** App used when nothing in the text implies one. Default "tasks". */
  defaultApp?: SutraApp;
}

const appPrefixes: Record<string, SutraApp> = {
  task: "tasks",
  tasks: "tasks",
  todo: "tasks",
  t: "tasks",
  note: "notes",
  notes: "notes",
  n: "notes",
  event: "calendar",
  meeting: "calendar",
  cal: "calendar",
  calendar: "calendar",
  e: "calendar",
  journal: "journal",
  j: "journal",
  mail: "mail",
  email: "mail",
  habit: "habits",
  habits: "habits",
  expense: "finance",
  finance: "finance",
  spent: "finance",
  file: "files",
  files: "files",
};

const priorityTokens: Record<string, CapturePriority> = {
  "!!!": "urgent",
  "!!": "high",
  urgent: "urgent",
  u: "urgent",
  p1: "urgent",
  "1": "urgent",
  high: "high",
  h: "high",
  p2: "high",
  "2": "high",
  medium: "medium",
  med: "medium",
  m: "medium",
  p3: "medium",
  "3": "medium",
  low: "low",
  l: "low",
  p4: "low",
  "4": "low",
};

const weekdays: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const WEEKDAY = "(?<wd>sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:s|nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)";
const WEEKDAY_FULL = "(?<wd>sunday|monday|tuesday|wednesday|thursday|friday|saturday)";
const PREP = "(?:(?:on|by|due|at|for)\\s+)?";
const END = "(?=[\\s,.;!?]|$)";

/** Pure intent parser for quick capture: app prefix, #tags, !priority, dates, times and amounts. */
export function parseCapture(text: string, now: Date = new Date(), options: ParseCaptureOptions = {}): CaptureResult {
  let rest = ` ${text} `;
  let app: SutraApp | undefined;
  let explicitApp = false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  /** Remove and return the first match of `re` that `accept` approves; text that doesn't parse stays in the title. */
  const take = (re: RegExp, accept?: (m: RegExpMatchArray) => boolean): RegExpMatchArray | null => {
    const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
    for (const m of rest.matchAll(new RegExp(re.source, flags))) {
      if (m.index == null || (accept && !accept(m))) continue;
      rest = `${rest.slice(0, m.index)} ${rest.slice(m.index + m[0].length)}`;
      return m;
    }
    return null;
  };
  const validDay = (y: number, month: number, day: number) =>
    month >= 0 && month < 12 && day >= 1 && day <= new Date(y, month + 1, 0).getDate();

  // App prefix: "task: …", or a bare "event …" / "todo …".
  const prefix = rest.match(/^\s*([a-z]+)\s*:\s*/i);
  if (prefix && appPrefixes[prefix[1].toLowerCase()]) {
    app = appPrefixes[prefix[1].toLowerCase()];
    explicitApp = true;
    rest = ` ${rest.slice(prefix[0].length)}`;
  } else {
    const bare = rest.match(/^\s*(task|todo|note|event)\s+(?=\S)/i);
    if (bare) {
      app = appPrefixes[bare[1].toLowerCase()];
      explicitApp = true;
      rest = ` ${rest.slice(bare[0].length)}`;
    }
  }

  // Tags.
  const tags: string[] = [];
  rest = rest.replace(/(\s)#([\p{L}\p{N}_\-/]+)/gu, (_, space: string, tag: string) => {
    if (!tags.includes(tag)) tags.push(tag);
    return space;
  });

  // Priority.
  let priority: CapturePriority | undefined;
  const pr = take(new RegExp(`\\s(!!!|!!|!(?:urgent|high|medium|med|low|p[1-4]|[1-4]|u|h|m|l))${END}`, "i"));
  if (pr) {
    const token = pr[1].toLowerCase();
    priority = priorityTokens[token.startsWith("!!") ? token : token.slice(1)];
  }

  // Amount.
  let amount: number | undefined;
  const am = take(/\s\$((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)(?=[\s;!?]|[,.](?!\d)|$)/);
  if (am) amount = parseFloat(am[1].replace(/,/g, ""));

  // Time.
  let time: string | undefined;
  const named = take(new RegExp(`\\s(?:at\\s+)?(noon|midnight)${END}`, "i"));
  if (named) time = named[1].toLowerCase() === "noon" ? "12:00" : "00:00";
  if (!time) {
    // "3pm", "3p", "3 pm", "3 p.m." — a spaced bare "a"/"p" needs an "m" or a period, so "chapter 3 a bit" is not a time.
    const ampm = take(
      new RegExp(`\\s(?:at\\s+)?(\\d{1,2})(?::([0-5]\\d))?(?:([ap])(?:\\.?m\\.?|\\.)?|\\s([ap])(?:\\.?m\\.?|\\.))${END}`, "i"),
      (m) => {
        const h = parseInt(m[1], 10);
        return h >= 1 && h <= 12;
      }
    );
    if (ampm) {
      let h = parseInt(ampm[1], 10);
      const pm = (ampm[3] ?? ampm[4]).toLowerCase() === "p";
      if (h === 12) h = pm ? 12 : 0;
      else if (pm) h += 12;
      time = `${pad2(h)}:${ampm[2] ?? "00"}`;
    }
  }
  if (!time) {
    const h24 = take(new RegExp(`\\s(?:at\\s+)?([01]?\\d|2[0-3]):([0-5]\\d)${END}`));
    if (h24) time = `${pad2(parseInt(h24[1], 10))}:${h24[2]}`;
  }

  // Date.
  let date: Date | undefined;
  const iso = take(new RegExp(`\\s${PREP}(\\d{4})-(\\d{2})-(\\d{2})${END}`, "i"), (m) => validDay(+m[1], +m[2] - 1, +m[3]));
  if (iso) date = new Date(+iso[1], +iso[2] - 1, +iso[3]);
  if (!date) {
    const rel = take(new RegExp(`\\s${PREP}(today|tonight|tomorrow|tmrw?|next week|next month|this weekend|weekend)${END}`, "i"));
    if (rel) {
      const word = rel[1].toLowerCase();
      if (word === "today" || word === "tonight") date = today;
      else if (word === "tomorrow" || word.startsWith("tmr")) date = addDays(today, 1);
      else if (word === "next week") date = addDays(today, ((8 - today.getDay()) % 7) || 7);
      else if (word === "next month") date = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      else date = addDays(today, (6 - today.getDay() + 7) % 7);
      if (word === "tonight" && !time) time = "20:00";
    }
  }
  if (!date) {
    const inN = take(new RegExp(`\\sin\\s+(\\d{1,3})\\s+(days?|weeks?)${END}`, "i"));
    if (inN) date = addDays(today, parseInt(inN[1], 10) * (inN[2].toLowerCase().startsWith("w") ? 7 : 1));
  }
  if (!date) {
    const monthDay = (word: string, day: string) => validDay(2024, months.indexOf(word.slice(0, 3).toLowerCase()), parseInt(day, 10));
    const md = take(new RegExp(`\\s${PREP}${MONTH}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?${END}`, "i"), (m) => monthDay(m[1], m[2]));
    const dm = md ? null : take(new RegExp(`\\s${PREP}(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH}${END}`, "i"), (m) => monthDay(m[2], m[1]));
    const monthWord = md?.[1] ?? dm?.[2];
    const dayNum = md?.[2] ?? dm?.[1];
    if (monthWord && dayNum) {
      const month = months.indexOf(monthWord.slice(0, 3).toLowerCase());
      let d = new Date(today.getFullYear(), month, parseInt(dayNum, 10));
      if (d < today) d = new Date(today.getFullYear() + 1, month, parseInt(dayNum, 10));
      date = d;
    }
  }
  if (!date) {
    // Weekdays need a cue ("on fri", "next tue", "due friday"), a full name, or to end the text ("Review PR fri"),
    // so words like "sun cream" or "I sat there" are left alone.
    const wd =
      take(new RegExp(`\\s(?:(?:on|by|due|until|till)\\s+)(?:(?<rel>next|this)\\s+)?${WEEKDAY}${END}`, "i")) ??
      take(new RegExp(`\\s(?<rel>next|this)\\s+${WEEKDAY}${END}`, "i")) ??
      take(new RegExp(`\\s${PREP}${WEEKDAY_FULL}${END}`, "i")) ??
      take(new RegExp(`\\s${PREP}${WEEKDAY}[\\s.!?]*$`, "i"));
    if (wd?.groups) {
      const target = weekdays[wd.groups.wd.toLowerCase()];
      const offset = (target - today.getDay() + 7) % 7;
      date = addDays(today, offset + (wd.groups.rel?.toLowerCase() === "next" ? 7 : 0));
    }
  }
  if (time && !date) date = today;

  // Intent.
  if (!app) {
    if (amount != null) app = "finance";
    else if (time) app = "calendar";
    else app = options.defaultApp ?? "tasks";
  }

  const title = rest
    .replace(/\s+/g, " ")
    .replace(/\s+(?:on|by|due|at|for)\s*$/i, "")
    .replace(/^[\s,;:\-–—]+|[\s,;:\-–—]+$/g, "")
    .trim();

  return {
    app,
    title,
    ...(date ? { date: dateKey(date) } : {}),
    ...(time ? { time } : {}),
    ...(priority ? { priority } : {}),
    tags,
    ...(amount != null ? { amount } : {}),
    explicitApp,
  };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export type QuickCaptureValue = Omit<CaptureResult, "explicitApp"> & { raw: string };

export interface QuickCaptureProps {
  /** Called on Enter with the parsed capture. May return a promise. */
  onCapture?: (value: QuickCaptureValue) => unknown;
  /** Target apps that Alt+↑ / Alt+↓ cycle through. */
  apps?: SutraApp[];
  /** App selected at first; defaults to the first of `apps`. */
  defaultApp?: SutraApp;
  /** "dialog" (default) opens on the shortcut; "inline" renders the bar in place. */
  variant?: "dialog" | "inline";
  /** Controlled open state of the dialog variant. */
  open?: boolean;
  /** Initial open state when `open` is not controlled. */
  defaultOpen?: boolean;
  /** Called when the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Toggle shortcut for the dialog. Default "mod+shift+space"; `null` disables. */
  shortcut?: string | null;
  /** Placeholder of the capture field; the default shows an example with a date and a tag. */
  placeholder?: string;
  /** Reference time for relative dates (defaults to the current time). */
  now?: Date;
  /** Extra classes for the inline bar or the dialog content. */
  className?: string;
}

const priorityStyle: Record<CapturePriority, string> = {
  urgent: toneClasses.soft.destructive,
  high: toneClasses.soft.warning,
  medium: toneClasses.soft.info,
  low: toneClasses.soft.neutral,
};

function formatCaptureDate(value: string, now: Date) {
  const diff = calendarDayDiff(value, now);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return formatShortDate(value, { weekday: true, year: "never", now });
}

function formatCaptureTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  return formatClockTime(new Date(2000, 0, 1, h, m));
}

const PreviewChip = ({ icon, children, className }: { icon?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <span className={cn("inline-flex h-5 items-center gap-1 rounded-control bg-muted px-1.5 text-xs font-medium text-foreground [&_svg]:size-3", className)}>
    {icon}
    {children}
  </span>
);

/** Global quick-capture bar: type naturally, see the parsed preview, Alt+↑/↓ to switch app, Enter to save. */
export function QuickCapture({
  onCapture,
  apps = ["tasks", "notes", "calendar", "journal"],
  defaultApp = "tasks",
  variant = "dialog",
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  shortcut = "mod+shift+space",
  placeholder = "Capture anything… try “event tomorrow 3pm Dentist #health”",
  now: nowProp,
  className,
}: QuickCaptureProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });

  const [text, setText] = React.useState("");
  const [override, setOverride] = React.useState<SutraApp | null>(null);
  const { run: capture, busy } = useAsyncAction(
    async (value: QuickCaptureValue, keepOpen: boolean) => {
      await onCapture?.(value);
      return keepOpen;
    },
    {
      onSuccess: (keepOpen) => {
        reset();
        if (variant === "dialog" && !keepOpen) setOpen(false);
      },
    }
  );
  const inputRef = React.useRef<HTMLInputElement>(null);
  const previewId = `${React.useId()}-preview`;
  const now = nowProp ?? new Date();
  const parsed = parseCapture(text, now, { defaultApp });
  const app = override ?? parsed.app;

  const hasModifier = shortcut ? /(^|\+)(mod|ctrl|control|cmd|command|meta|alt|opt|option)\+/i.test(shortcut) : false;
  useShortcut(variant === "dialog" ? shortcut : null, () => setOpen((o) => !o), {
    id: "sutra:quick-capture",
    label: "Quick capture",
    group: "Create",
    allowInInputs: hasModifier,
  });

  const reset = () => {
    setText("");
    setOverride(null);
  };

  const cycle = (dir: 1 | -1) => {
    const idx = apps.indexOf(app);
    const next = apps[(idx + dir + apps.length) % apps.length] ?? apps[0];
    setOverride(next);
  };

  const submit = (keepOpen: boolean) => {
    if (!parsed.title || busy) return;
    const { explicitApp: _explicit, ...rest } = parsed;
    const value: QuickCaptureValue = { ...rest, app, raw: text };
    void capture(value, keepOpen);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Tab is never intercepted (no keyboard trap); Alt+↑/↓ leave ⌥/Ctrl+←/→ word navigation intact.
    if (e.altKey && !e.metaKey && !e.ctrlKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      cycle(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit(e.shiftKey);
    }
  };

  const showPreview = text.trim().length > 0;
  const panel = (
    <div data-app={app} className={cn("flex flex-col", variant === "inline" && "overflow-hidden rounded-box border border-border bg-card shadow-sm", className)}>
      <div className="flex items-center gap-3 px-4 py-3">
        <SutraAppIcon app={app} size={24} shape="squircle" />
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (!e.target.value) setOverride(null);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Quick capture"
          aria-describedby={showPreview ? previewId : undefined}
          autoFocus={variant === "dialog"}
          readOnly={busy}
          aria-busy={busy || undefined}
          className="h-8 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground aria-busy:opacity-60"
        />
      </div>
      {showPreview && (
        <div
          id={previewId}
          aria-live="polite"
          className="flex flex-wrap items-center gap-1.5 border-t border-border px-4 py-2 text-sm"
        >
          <span className="text-xs font-medium text-primary-soft-foreground">New in {sutraAppMeta[app].name}:</span>
          <span className={cn("min-w-0 truncate font-medium text-foreground", !parsed.title && "text-muted-foreground")}>
            {parsed.title || "Untitled"}
          </span>
          {parsed.date && <PreviewChip icon={<RiCalendarLine aria-hidden />}>{formatCaptureDate(parsed.date, now)}</PreviewChip>}
          {parsed.time && <PreviewChip icon={<RiTimeLine aria-hidden />}>{formatCaptureTime(parsed.time)}</PreviewChip>}
          {parsed.priority && (
            <PreviewChip icon={<RiFlag2Line aria-hidden />} className={priorityStyle[parsed.priority]}>
              {parsed.priority.charAt(0).toUpperCase() + parsed.priority.slice(1)}
            </PreviewChip>
          )}
          {parsed.amount != null && (
            <PreviewChip icon={<RiMoneyDollarCircleLine aria-hidden />}>{parsed.amount.toFixed(2)}</PreviewChip>
          )}
          {parsed.tags.map((tag) => (
            <PreviewChip key={tag} icon={<RiHashtag aria-hidden />} className="bg-primary-soft text-primary-soft-foreground">
              {tag}
            </PreviewChip>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1 border-t border-border bg-subtle px-2 py-1.5">
        <div role="group" aria-label="Save to" className="flex flex-wrap items-center gap-1">
          {apps.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={a === app}
              onClick={() => {
                setOverride(a);
                inputRef.current?.focus();
              }}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-control px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                "aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs",
                focusRing
              )}
            >
              <SutraAppIcon app={a} size={14} shape="squircle" />
              {sutraAppMeta[a].name}
            </button>
          ))}
        </div>
        <span className="ms-auto hidden items-center gap-3 pe-1 text-xs text-muted-foreground sm:flex">
          <span className="inline-flex items-center gap-1">
            <ShortcutKeys keys="alt+up" />/<ShortcutKeys keys="alt+down" /> switch
          </span>
          <span className="inline-flex items-center gap-1">
            <ShortcutKeys keys="enter" /> save
          </span>
        </span>
      </div>
    </div>
  );

  if (variant === "inline") return panel;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogContent
        data-slot="quick-capture"
        showClose={false}
        className="gap-0 overflow-hidden p-0 sm:top-[18dvh] sm:max-w-xl sm:-translate-y-0 sm:pb-0"
      >
        <DialogTitle className="sr-only">Quick capture</DialogTitle>
        <DialogDescription className="sr-only">
          Type a task, note or event. Alt+Up and Alt+Down switch the target app, Enter saves.
        </DialogDescription>
        {panel}
      </DialogContent>
    </Dialog>
  );
}
QuickCapture.displayName = "QuickCapture";
