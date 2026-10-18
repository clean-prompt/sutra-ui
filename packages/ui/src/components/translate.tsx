import * as React from "react";
import { createPortal } from "react-dom";
import {
  RiArrowDownSLine,
  RiArrowLeftRightLine,
  RiCheckLine,
  RiCloseLine,
  RiMicLine,
  RiSearchLine,
  RiShareLine,
  RiSparkling2Line,
  RiTranslate2,
  RiVolumeUpLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { formatDuration } from "../lib/duration";
import { useIsoLayoutEffect } from "../hooks/use-iso-layout-effect";
import { Button } from "./button";
import { CopyButton } from "./copy-button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { AudioLevelMeter, SpeakButton } from "./voice";
import { replaceTextRange, useCaretAnchor } from "./ai-extras";

/* ------------------------------------------------------------------ */
/* Languages                                                           */
/* ------------------------------------------------------------------ */

export interface Language {
  /** BCP-47 code, e.g. "hi", "zh-CN". */
  code: string;
  /** English name. */
  name: string;
  /** Endonym. */
  nativeName: string;
  rtl?: boolean;
}

/** Pseudo language code for automatic detection. */
export const DETECT_LANGUAGE = "auto";

const L = (code: string, name: string, nativeName: string, rtl?: boolean): Language => (rtl ? { code, name, nativeName, rtl } : { code, name, nativeName });

/** ~100 common languages with English and native names. */
export const languages: Language[] = [
  L("af", "Afrikaans", "Afrikaans"),
  L("sq", "Albanian", "Shqip"),
  L("am", "Amharic", "አማርኛ"),
  L("ar", "Arabic", "العربية", true),
  L("hy", "Armenian", "Հայերեն"),
  L("as", "Assamese", "অসমীয়া"),
  L("az", "Azerbaijani", "Azərbaycan"),
  L("eu", "Basque", "Euskara"),
  L("be", "Belarusian", "Беларуская"),
  L("bn", "Bengali", "বাংলা"),
  L("bs", "Bosnian", "Bosanski"),
  L("bg", "Bulgarian", "Български"),
  L("my", "Burmese", "မြန်မာ"),
  L("ca", "Catalan", "Català"),
  L("ceb", "Cebuano", "Cebuano"),
  L("zh-CN", "Chinese (Simplified)", "简体中文"),
  L("zh-TW", "Chinese (Traditional)", "繁體中文"),
  L("co", "Corsican", "Corsu"),
  L("hr", "Croatian", "Hrvatski"),
  L("cs", "Czech", "Čeština"),
  L("da", "Danish", "Dansk"),
  L("dv", "Dhivehi", "ދިވެހި", true),
  L("nl", "Dutch", "Nederlands"),
  L("en", "English", "English"),
  L("eo", "Esperanto", "Esperanto"),
  L("et", "Estonian", "Eesti"),
  L("fil", "Filipino", "Filipino"),
  L("fi", "Finnish", "Suomi"),
  L("fr", "French", "Français"),
  L("gl", "Galician", "Galego"),
  L("ka", "Georgian", "ქართული"),
  L("de", "German", "Deutsch"),
  L("el", "Greek", "Ελληνικά"),
  L("gu", "Gujarati", "ગુજરાતી"),
  L("ht", "Haitian Creole", "Kreyòl ayisyen"),
  L("ha", "Hausa", "Hausa"),
  L("haw", "Hawaiian", "ʻŌlelo Hawaiʻi"),
  L("he", "Hebrew", "עברית", true),
  L("hi", "Hindi", "हिन्दी"),
  L("hmn", "Hmong", "Hmoob"),
  L("hu", "Hungarian", "Magyar"),
  L("is", "Icelandic", "Íslenska"),
  L("ig", "Igbo", "Igbo"),
  L("id", "Indonesian", "Bahasa Indonesia"),
  L("ga", "Irish", "Gaeilge"),
  L("it", "Italian", "Italiano"),
  L("ja", "Japanese", "日本語"),
  L("jv", "Javanese", "Basa Jawa"),
  L("kn", "Kannada", "ಕನ್ನಡ"),
  L("kk", "Kazakh", "Қазақ"),
  L("km", "Khmer", "ខ្មែរ"),
  L("rw", "Kinyarwanda", "Kinyarwanda"),
  L("ko", "Korean", "한국어"),
  L("ku", "Kurdish", "Kurdî"),
  L("ky", "Kyrgyz", "Кыргызча"),
  L("lo", "Lao", "ລາວ"),
  L("la", "Latin", "Latina"),
  L("lv", "Latvian", "Latviešu"),
  L("lt", "Lithuanian", "Lietuvių"),
  L("lb", "Luxembourgish", "Lëtzebuergesch"),
  L("mk", "Macedonian", "Македонски"),
  L("mai", "Maithili", "मैथिली"),
  L("mg", "Malagasy", "Malagasy"),
  L("ms", "Malay", "Bahasa Melayu"),
  L("ml", "Malayalam", "മലയാളം"),
  L("mt", "Maltese", "Malti"),
  L("mi", "Maori", "Māori"),
  L("mr", "Marathi", "मराठी"),
  L("mn", "Mongolian", "Монгол"),
  L("ne", "Nepali", "नेपाली"),
  L("no", "Norwegian", "Norsk"),
  L("ny", "Nyanja", "Chichewa"),
  L("or", "Odia", "ଓଡ଼ିଆ"),
  L("ps", "Pashto", "پښتو", true),
  L("fa", "Persian", "فارسی", true),
  L("pl", "Polish", "Polski"),
  L("pt", "Portuguese", "Português"),
  L("pa", "Punjabi", "ਪੰਜਾਬੀ"),
  L("ro", "Romanian", "Română"),
  L("ru", "Russian", "Русский"),
  L("sm", "Samoan", "Gagana Sāmoa"),
  L("sa", "Sanskrit", "संस्कृतम्"),
  L("gd", "Scots Gaelic", "Gàidhlig"),
  L("sr", "Serbian", "Српски"),
  L("st", "Sesotho", "Sesotho"),
  L("sn", "Shona", "chiShona"),
  L("sd", "Sindhi", "سنڌي", true),
  L("si", "Sinhala", "සිංහල"),
  L("sk", "Slovak", "Slovenčina"),
  L("sl", "Slovenian", "Slovenščina"),
  L("so", "Somali", "Soomaali"),
  L("es", "Spanish", "Español"),
  L("su", "Sundanese", "Basa Sunda"),
  L("sw", "Swahili", "Kiswahili"),
  L("sv", "Swedish", "Svenska"),
  L("tg", "Tajik", "Тоҷикӣ"),
  L("ta", "Tamil", "தமிழ்"),
  L("tt", "Tatar", "Татар"),
  L("te", "Telugu", "తెలుగు"),
  L("th", "Thai", "ไทย"),
  L("tr", "Turkish", "Türkçe"),
  L("tk", "Turkmen", "Türkmen"),
  L("uk", "Ukrainian", "Українська"),
  L("ur", "Urdu", "اردو", true),
  L("ug", "Uyghur", "ئۇيغۇرچە", true),
  L("uz", "Uzbek", "Oʻzbek"),
  L("vi", "Vietnamese", "Tiếng Việt"),
  L("cy", "Welsh", "Cymraeg"),
  L("xh", "Xhosa", "isiXhosa"),
  L("yi", "Yiddish", "ייִדיש", true),
  L("yo", "Yoruba", "Yorùbá"),
  L("zu", "Zulu", "isiZulu"),
];

/** Look up a language by code (case-insensitive, falls back to the base subtag). */
export function getLanguage(code: string | undefined, list: Language[] = languages): Language | undefined {
  if (!code) return undefined;
  const c = code.toLowerCase();
  return list.find((l) => l.code.toLowerCase() === c) ?? list.find((l) => l.code.toLowerCase() === c.split("-")[0]);
}

/** "rtl" for right-to-left languages, else "ltr". */
export function languageDir(code: string | undefined, list: Language[] = languages): "rtl" | "ltr" {
  return getLanguage(code, list)?.rtl ? "rtl" : "ltr";
}

/** Filter + rank languages by English name, native name or code. */
export function searchLanguages(query: string, list: Language[] = languages) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  const scored: Array<[number, Language]> = [];
  for (const l of list) {
    const code = l.code.toLowerCase();
    const name = l.name.toLowerCase();
    const native = l.nativeName.toLowerCase();
    let s = -1;
    if (code === q) s = 0;
    else if (name.startsWith(q) || native.startsWith(q)) s = 1;
    else if (code.startsWith(q)) s = 2;
    else if (name.includes(q) || native.includes(q)) s = 3;
    if (s >= 0) scored.push([s, l]);
  }
  return scored.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name)).map(([, l]) => l);
}

/* ------------------------------------------------------------------ */
/* LanguagePicker                                                      */
/* ------------------------------------------------------------------ */

export interface LanguagePickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: string;
  onValueChange?: (code: string) => void;
  languages?: Language[];
  /** Recently used codes, most recent first. */
  recent?: string[];
  /** Offer the "Detect language" pseudo-option. */
  allowDetect?: boolean;
  /** Language detected while on "Detect". */
  detected?: string;
  autoFocus?: boolean;
  /** Accessible name for the list. Default "Languages". */
  label?: string;
}

interface PickerRow {
  key: string;
  code: string;
  label: string;
  sub?: string;
  group: string;
}

/** Searchable language list (English/native name/code) with Detect, Recent and keyboard navigation. */
export const LanguagePicker = React.forwardRef<HTMLDivElement, LanguagePickerProps>(
  ({ value, onValueChange, languages: list = languages, recent = [], allowDetect = false, detected, autoFocus = true, label = "Languages", className, ...props }, ref) => {
    const [query, setQuery] = React.useState("");
    const [active, setActive] = React.useState(0);
    const uid = React.useId();
    const listRef = React.useRef<HTMLDivElement>(null);
    const q = query.trim();

    const rows = React.useMemo<PickerRow[]>(() => {
      const out: PickerRow[] = [];
      const detectedName = detected ? getLanguage(detected, list)?.name : undefined;
      if (allowDetect && (!q || "detect language".includes(q.toLowerCase()))) {
        out.push({ key: DETECT_LANGUAGE, code: DETECT_LANGUAGE, label: "Detect language", sub: detectedName ? `${detectedName} detected` : undefined, group: "" });
      }
      if (q) {
        for (const l of searchLanguages(q, list)) out.push({ key: l.code, code: l.code, label: l.name, sub: l.nativeName, group: "Results" });
        return out;
      }
      for (const c of recent) {
        const l = getLanguage(c, list);
        if (l && !out.some((r) => r.key === `recent-${l.code}`)) out.push({ key: `recent-${l.code}`, code: l.code, label: l.name, sub: l.nativeName, group: "Recent" });
      }
      for (const l of [...list].sort((a, b) => a.name.localeCompare(b.name))) out.push({ key: l.code, code: l.code, label: l.name, sub: l.nativeName, group: "All languages" });
      return out;
    }, [q, list, recent, allowDetect, detected]);

    React.useEffect(() => {
      if (q) setActive(0);
      else {
        const i = rows.findIndex((r) => r.code === value);
        setActive(i < 0 ? 0 : i);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    React.useEffect(() => {
      listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
    }, [active]);

    const optId = (i: number) => `${uid}-o-${i}`;
    const choose = (r: PickerRow | undefined) => r && onValueChange?.(r.code);

    const onKeyDown = (e: React.KeyboardEvent) => {
      const n = rows.length;
      if (!n) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => (i + 1) % n);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => (i - 1 + n) % n);
      } else if (e.key === "Home") {
        e.preventDefault();
        setActive(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActive(n - 1);
      } else if (e.key === "PageDown") {
        e.preventDefault();
        setActive((i) => Math.min(n - 1, i + 8));
      } else if (e.key === "PageUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 8));
      } else if (e.key === "Enter") {
        e.preventDefault();
        choose(rows[active]);
      }
    };

    let lastGroup: string | null = null;
    return (
      <div ref={ref} className={cn("flex w-full flex-col", className)} {...props}>
        <div className="relative border-b border-border p-2">
          <RiSearchLine aria-hidden="true" className="pointer-events-none absolute left-4.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            role="combobox"
            aria-expanded="true"
            aria-controls={`${uid}-list`}
            aria-activedescendant={rows[active] ? optId(active) : undefined}
            aria-autocomplete="list"
            aria-label="Search languages"
            autoFocus={autoFocus}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search languages"
            className={cn("h-8 w-full rounded-control border border-input bg-background pl-8 pr-2 text-sm placeholder:text-muted-foreground", focusRing)}
          />
        </div>
        <div ref={listRef} id={`${uid}-list`} role="listbox" aria-label={label} className="max-h-72 overflow-y-auto p-1 scrollbar-thin">
          {rows.length === 0 ? <div className="px-3 py-6 text-center text-sm text-muted-foreground">No languages match “{q}”</div> : null}
          {rows.map((r, i) => {
            const header = r.group && r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            const selected = r.code === value;
            return (
              <React.Fragment key={r.key}>
                {header ? (
                  <div role="presentation" className="px-2 pb-1 pt-2 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                    {header}
                  </div>
                ) : null}
                <div
                  id={optId(i)}
                  role="option"
                  data-index={i}
                  data-code={r.code}
                  aria-selected={selected}
                  data-active={i === active ? "" : undefined}
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(r)}
                  className={cn("flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm", i === active && "bg-accent text-accent-foreground")}
                >
                  {r.code === DETECT_LANGUAGE ? <RiSparkling2Line aria-hidden="true" className="size-4 text-primary" /> : null}
                  <span className="min-w-0 flex-1 truncate">
                    {r.label}
                    {r.sub && r.sub !== r.label ? <span className="ml-2 text-xs text-muted-foreground">{r.sub}</span> : null}
                  </span>
                  {selected ? <RiCheckLine aria-hidden="true" className="size-4 text-primary" /> : null}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }
);
LanguagePicker.displayName = "LanguagePicker";

/* ------------------------------------------------------------------ */
/* SwapButton + LanguageBar                                            */
/* ------------------------------------------------------------------ */

export interface SwapButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  onSwap?: () => void;
}

/** Swap source/target languages with a half-turn animation. */
export const SwapButton = React.forwardRef<HTMLButtonElement, SwapButtonProps>(({ onSwap, onClick, disabled, className, ...props }, ref) => {
  const [turns, setTurns] = React.useState(0);
  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Swap languages"
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        setTurns((t) => t + 1);
        onSwap?.();
      }}
      className={cn("shrink-0 rounded-full", className)}
      {...props}
    >
      <RiArrowLeftRightLine
        aria-hidden="true"
        className="transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: `rotate(${turns * 180}deg)` }}
      />
    </Button>
  );
});
SwapButton.displayName = "SwapButton";

export interface LanguageBarProps extends React.HTMLAttributes<HTMLDivElement> {
  source: string;
  target: string;
  onSourceChange?: (code: string) => void;
  onTargetChange?: (code: string) => void;
  /** Custom swap; default swaps (using the detected language when source is "auto"). */
  onSwap?: () => void;
  recentSources?: string[];
  recentTargets?: string[];
  /** Language detected while source is "auto". */
  detected?: string;
  languages?: Language[];
}

interface LanguageSideProps {
  side: "source" | "target";
  value: string;
  onChange?: (code: string) => void;
  recent: string[];
  list: Language[];
  detected?: string;
}

function LanguageSide({ side, value, onChange, recent, list, detected }: LanguageSideProps) {
  const [open, setOpen] = React.useState(false);
  const isSource = side === "source";
  let chips = recent.filter((c) => c !== DETECT_LANGUAGE && getLanguage(c, list)).slice(0, 3);
  if (value !== DETECT_LANGUAGE && !chips.includes(value)) chips = [value, ...chips].slice(0, 3);
  const detectedName = detected ? getLanguage(detected, list)?.name : undefined;
  const chip = (code: string, text: React.ReactNode, key: string) => (
    <button
      key={key}
      type="button"
      aria-pressed={value === code}
      onClick={() => onChange?.(code)}
      className={cn(
        "h-8 shrink-0 whitespace-nowrap rounded-control px-3 text-sm font-medium transition-colors",
        value === code ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
        focusRing
      )}
    >
      {text}
    </button>
  );
  return (
    <div role="group" aria-label={isSource ? "Source language" : "Target language"} className={cn("flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-none", !isSource && "sm:justify-end")}>
      {isSource ? chip(DETECT_LANGUAGE, detectedName && value === DETECT_LANGUAGE ? `${detectedName} — detected` : "Detect language", "auto") : null}
      {chips.map((c) => chip(c, getLanguage(c, list)?.name ?? c, c))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={isSource ? "More source languages" : "More target languages"} className="shrink-0">
            <RiArrowDownSLine className={cn("transition-transform", open && "rotate-180")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent padded={false} size="md" align={isSource ? "start" : "end"} aria-label={isSource ? "Source language" : "Target language"}>
          <LanguagePicker
            value={value}
            languages={list}
            recent={recent}
            allowDetect={isSource}
            detected={detected}
            onValueChange={(c) => {
              onChange?.(c);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Source/target language row: recent chips, full picker and a swap button. */
export const LanguageBar = React.forwardRef<HTMLDivElement, LanguageBarProps>(
  ({ source, target, onSourceChange, onTargetChange, onSwap, recentSources = [], recentTargets = [], detected, languages: list = languages, className, ...props }, ref) => {
    const canSwap = source !== DETECT_LANGUAGE || !!detected;
    const swap = () => {
      if (onSwap) return onSwap();
      const from = source === DETECT_LANGUAGE ? detected : source;
      if (!from) return;
      onSourceChange?.(target);
      onTargetChange?.(from);
    };
    return (
      <div ref={ref} className={cn("flex items-center gap-2 border-b border-border px-2 py-1.5", className)} {...props}>
        <LanguageSide side="source" value={source} onChange={onSourceChange} recent={recentSources} list={list} detected={detected} />
        <SwapButton onSwap={swap} disabled={!canSwap} title={canSwap ? undefined : "Waiting for the language to be detected"} />
        <LanguageSide side="target" value={target} onChange={onTargetChange} recent={recentTargets} list={list} />
      </div>
    );
  }
);
LanguageBar.displayName = "LanguageBar";

/* ------------------------------------------------------------------ */
/* SourcePane / TargetPane                                             */
/* ------------------------------------------------------------------ */


export interface SourcePaneProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  /** Language code of the text (drives `dir` and `lang`). */
  lang?: string;
  /** Character limit. Default 5000. */
  maxLength?: number;
  placeholder?: string;
  /** "Did you mean" correction. */
  suggestion?: string;
  onAcceptSuggestion?: (suggestion: string) => void;
  /** Slot for a VoiceInput. */
  voice?: React.ReactNode;
  /** Slot for a SpeakButton (default renders one for `lang` when text is present). */
  speak?: React.ReactNode;
  /** Extra footer tools (e.g. a TransliterationToggle). */
  tools?: React.ReactNode;
  /** Props passed to the textarea. */
  textareaProps?: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
  /** Minimum textarea height in px. Default 128. */
  minHeight?: number;
}

/** Source text pane: auto-growing textarea, counter, clear, did-you-mean strip, voice/speak slots, RTL. */
export const SourcePane = React.forwardRef<HTMLTextAreaElement, SourcePaneProps>(
  (
    { value, onValueChange, lang, maxLength = 5000, placeholder = "Enter text", suggestion, onAcceptSuggestion, voice, speak, tools, textareaProps, minHeight = 128, className, children, ...props },
    ref
  ) => {
    const inner = React.useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement);
    const dir = lang && lang !== DETECT_LANGUAGE ? languageDir(lang) : "auto";
    const over = value.length > maxLength;

    useIsoLayoutEffect(() => {
      const el = inner.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
    }, [value, minHeight]);

    return (
      <section aria-label="Source text" className={cn("relative flex min-w-0 flex-col", className)} {...props}>
        <div className="relative">
          <textarea
            ref={inner}
            aria-label="Text to translate"
            {...textareaProps}
            value={value}
            lang={lang && lang !== DETECT_LANGUAGE ? lang : undefined}
            dir={dir}
            placeholder={placeholder}
            spellCheck={false}
            onChange={(e) => {
              textareaProps?.onChange?.(e);
              onValueChange(e.target.value);
            }}
            onKeyDown={(e) => {
              textareaProps?.onKeyDown?.(e);
              if (!e.defaultPrevented && e.key === "Escape" && value) {
                e.preventDefault();
                onValueChange("");
              }
            }}
            style={{ minHeight }}
            className={cn("block w-full resize-none bg-transparent px-4 pb-2 pt-4 pr-11 text-lg leading-relaxed text-foreground outline-none placeholder:text-muted-foreground", textareaProps?.className)}
          />
          {value ? (
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Clear text" onClick={() => {
              onValueChange("");
              inner.current?.focus();
            }} className="absolute right-2 top-3">
              <RiCloseLine />
            </Button>
          ) : null}
          {children}
        </div>
        {suggestion ? (
          <p className="px-4 pb-1 text-sm text-muted-foreground" data-slot="did-you-mean">
            Did you mean:{" "}
            <button type="button" onClick={() => onAcceptSuggestion?.(suggestion)} className={cn("rounded-sm font-medium italic text-primary underline-offset-2 hover:underline", focusRing)}>
              {suggestion}
            </button>
          </p>
        ) : null}
        <div className="flex items-center gap-1 px-2 pb-2">
          {voice}
          {speak ?? <SpeakButton text={value} lang={lang && lang !== DETECT_LANGUAGE ? lang : undefined} />}
          {tools}
          <span className={cn("ml-auto pr-2 text-xs tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
            {value.length.toLocaleString("en-US")} / {maxLength.toLocaleString("en-US")}
            <span className="sr-only"> characters</span>
          </span>
        </div>
      </section>
    );
  }
);
SourcePane.displayName = "SourcePane";

export interface TranslationSense {
  partOfSpeech: string;
  terms: string[];
}

export interface TargetPaneProps extends React.HTMLAttributes<HTMLElement> {
  text: string;
  lang?: string;
  /** Output is still arriving: shows a blinking caret. */
  streaming?: boolean;
  /** Romanized reading of the output. */
  romanization?: string;
  alternatives?: string[];
  onPickAlternative?: (alt: string) => void;
  /** Time to translate, in ms. */
  latencyMs?: number;
  onShare?: (text: string) => void;
  /** Override the speak button. */
  speak?: React.ReactNode;
  /** Other meanings of a single-word translation. */
  senses?: TranslationSense[];
  placeholder?: string;
}

/** Translation output: streaming caret, romanization, alternatives, senses, copy/share/speak and latency. */
export const TargetPane = React.forwardRef<HTMLElement, TargetPaneProps>(
  ({ text, lang, streaming = false, romanization, alternatives = [], onPickAlternative, latencyMs, onShare, speak, senses = [], placeholder = "Translation", className, ...props }, ref) => {
    const [showSenses, setShowSenses] = React.useState(false);
    const sensesId = React.useId();
    const dir = languageDir(lang);
    const empty = !text && !streaming;
    return (
      <section ref={ref} aria-label="Translation" aria-busy={streaming || undefined} className={cn("flex min-w-0 flex-col bg-subtle/60", className)} {...props}>
        <div className="min-h-32 px-4 pb-2 pt-4">
          <p lang={lang} dir={dir} data-slot="translation" className={cn("whitespace-pre-wrap text-lg leading-relaxed", empty ? "text-muted-foreground" : "text-foreground")}>
            {empty ? placeholder : text}
            {streaming ? <span aria-hidden="true" data-slot="stream-caret" className="ml-0.5 inline-block h-[1.1em] w-0.5 translate-y-[0.15em] animate-caret-blink bg-primary" /> : null}
          </p>
          {romanization && !streaming ? <p className="mt-1.5 text-sm text-muted-foreground" data-slot="romanization">{romanization}</p> : null}
        </div>
        {alternatives.length && !streaming ? (
          <div className="px-4 pb-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Alternatives</p>
            <ul className="flex flex-wrap gap-1.5">
              {alternatives.map((a) => (
                <li key={a}>
                  <button type="button" lang={lang} dir={dir} onClick={() => onPickAlternative?.(a)} className={cn("rounded-control border border-border bg-background px-2.5 py-1 text-sm hover:bg-accent", focusRing)}>
                    {a}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {senses.length && !streaming ? (
          <div className="px-4 pb-2">
            <button type="button" aria-expanded={showSenses} aria-controls={sensesId} onClick={() => setShowSenses((s) => !s)} className={cn("inline-flex items-center gap-1 rounded-sm text-xs font-medium text-primary", focusRing)}>
              <RiArrowDownSLine aria-hidden="true" className={cn("size-4 transition-transform", showSenses && "rotate-180")} />
              {showSenses ? "Hide meanings" : `Show ${senses.reduce((n, s) => n + s.terms.length, 0)} meanings`}
            </button>
            {showSenses ? (
              <dl id={sensesId} className="mt-2 space-y-2 text-sm">
                {senses.map((s) => (
                  <div key={s.partOfSpeech}>
                    <dt className="text-xs italic text-muted-foreground">{s.partOfSpeech}</dt>
                    <dd lang={lang} dir={dir} className="text-foreground">{s.terms.join(", ")}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        ) : null}
        <div className="mt-auto flex items-center gap-1 px-2 pb-2">
          {speak ?? <SpeakButton text={streaming ? "" : text} lang={lang} />}
          {text && !streaming ? (
            <>
              <CopyButton value={text} label="Copy translation" size="md" />
              {onShare ? (
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Share translation" onClick={() => onShare(text)}>
                  <RiShareLine />
                </Button>
              ) : null}
            </>
          ) : null}
          {latencyMs != null && !streaming && text ? (
            <span className="ml-auto pr-2 font-mono text-xs tabular-nums text-muted-foreground" data-slot="latency">
              {formatDuration(latencyMs, { ms: true, space: true, decimals: 1, decimalsBelow: 60_000, trimZeros: false })}
            </span>
          ) : null}
        </div>
      </section>
    );
  }
);
TargetPane.displayName = "TargetPane";

/* ------------------------------------------------------------------ */
/* TransliterationCandidates                                           */
/* ------------------------------------------------------------------ */

const LATIN = /[A-Za-z]/;

/** The run of Latin letters touching `caret`, or null. */
export function latinWordAt(value: string, caret: number) {
  let start = caret;
  while (start > 0 && LATIN.test(value[start - 1]!)) start--;
  let end = caret;
  while (end < value.length && LATIN.test(value[end]!)) end++;
  if (start === end) return null;
  return { start, end, text: value.slice(start, end) };
}

export interface TransliterationCandidatesProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** The textarea / input being typed in. */
  anchorRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  /** Return candidates for a romanized word. May be async. */
  getCandidates: (word: string, lang: string) => string[] | Promise<string[]>;
  lang: string;
  /** IME on/off. Default true. */
  enabled?: boolean;
  /** Max candidates shown (and number keys honored). Default 5. */
  max?: number;
  onSelect?: (candidate: string, word: string) => void;
}

/** IME-style candidate popup under the caret: pick by number, click, or arrows + Enter/Space; Esc keeps the raw text. */
export const TransliterationCandidates = React.forwardRef<HTMLDivElement, TransliterationCandidatesProps>(
  ({ anchorRef, getCandidates, lang, enabled = true, max = 5, onSelect, className, style, ...props }, ref) => {
    const [word, setWord] = React.useState<{ start: number; end: number; text: string } | null>(null);
    const [items, setItems] = React.useState<string[]>([]);
    const [active, setActive] = React.useState(0);
    const [dismissed, setDismissed] = React.useState<string | null>(null);
    const seq = React.useRef(0);
    const uid = React.useId();
    const getRef = React.useRef(getCandidates);
    getRef.current = getCandidates;

    const sig = word ? `${word.start}:${word.text}` : null;
    const open = enabled && !!word && items.length > 0 && sig !== dismissed;
    const caret = useCaretAnchor(anchorRef, word?.start ?? null, open);

    const sync = React.useCallback(() => {
      const el = anchorRef.current;
      if (!el || !enabled) {
        setWord(null);
        return;
      }
      const pos = el.selectionStart ?? el.value.length;
      const w = el.selectionEnd != null && el.selectionEnd !== pos ? null : latinWordAt(el.value, pos);
      setWord((prev) => (prev && w && prev.start === w.start && prev.end === w.end && prev.text === w.text ? prev : w));
    }, [anchorRef, enabled]);

    React.useEffect(() => {
      if (dismissed !== null && sig !== dismissed) setDismissed(null);
    }, [sig, dismissed]);

    React.useEffect(() => {
      if (!word || !enabled) {
        setItems([]);
        return;
      }
      const id = ++seq.current;
      const apply = (list: string[]) => {
        if (id !== seq.current) return;
        setItems(list.slice(0, max));
        setActive(0);
      };
      const result = getRef.current(word.text, lang);
      if (Array.isArray(result)) apply(result);
      else result.then(apply, () => apply([]));
    }, [word, lang, enabled, max]);

    React.useEffect(() => {
      const el = anchorRef.current as HTMLElement | null;
      if (!el) return;
      const events = ["input", "change", "click", "keyup", "select"] as const;
      events.forEach((e) => el.addEventListener(e, sync));
      const blur = () => setWord(null);
      el.addEventListener("blur", blur);
      return () => {
        events.forEach((e) => el.removeEventListener(e, sync));
        el.removeEventListener("blur", blur);
      };
    }, [anchorRef, sync]);

    React.useEffect(() => {
      if (!enabled) setWord(null);
    }, [enabled]);

    const commit = React.useCallback(
      (candidate: string | undefined, suffix = "") => {
        const el = anchorRef.current;
        if (!el || !word || candidate == null) return;
        const w = word;
        setWord(null);
        setItems([]);
        replaceTextRange(el, w.start, w.end, candidate + suffix);
        onSelect?.(candidate, w.text);
      },
      [anchorRef, word, onSelect]
    );

    React.useEffect(() => {
      const el = anchorRef.current as HTMLElement | null;
      if (!el || !open) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return;
        const n = items.length;
        if (/^[1-9]$/.test(e.key)) {
          const i = Number(e.key) - 1;
          if (i < n) {
            e.preventDefault();
            commit(items[i]);
          }
        } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          setActive((i) => (i + 1) % n);
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          setActive((i) => (i - 1 + n) % n);
        } else if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          commit(items[active]);
        } else if (e.key === " ") {
          e.preventDefault();
          commit(items[active], " ");
        } else if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          setDismissed(sig);
        }
      };
      el.addEventListener("keydown", onKey, true);
      return () => el.removeEventListener("keydown", onKey, true);
    }, [anchorRef, open, items, active, commit, sig]);

    React.useEffect(() => {
      const el = anchorRef.current;
      if (!el) return;
      if (open) {
        el.setAttribute("aria-controls", `${uid}-list`);
        el.setAttribute("aria-activedescendant", `${uid}-c-${active}`);
      } else {
        el.removeAttribute("aria-activedescendant");
        if (el.getAttribute("aria-controls") === `${uid}-list`) el.removeAttribute("aria-controls");
      }
    });

    if (!open || typeof document === "undefined") return null;
    const rect = anchorRef.current?.getBoundingClientRect();
    return createPortal(
      <div
        ref={ref}
        data-slot="transliteration-candidates"
        onMouseDown={(e) => e.preventDefault()}
        className={cn("fixed z-50 min-w-40 overflow-hidden rounded-box border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0", className)}
        style={{ top: (caret?.top ?? rect?.top ?? 0) + (caret?.height ?? 20) + 4, left: caret?.left ?? rect?.left ?? 0, ...style }}
        {...props}
      >
        <div id={`${uid}-list`} role="listbox" aria-label={`Candidates for ${word!.text}`} className="p-1">
          {items.map((c, i) => (
            <div
              key={`${c}-${i}`}
              id={`${uid}-c-${i}`}
              role="option"
              aria-selected={i === active}
              lang={lang}
              onMouseMove={() => setActive(i)}
              onClick={() => commit(c)}
              className={cn("flex cursor-default items-center gap-2 rounded-sm px-2 py-1 text-base", i === active && "bg-accent text-accent-foreground")}
            >
              <span aria-hidden="true" className="w-3 font-mono text-xs text-muted-foreground">
                {i + 1}
              </span>
              {c}
            </div>
          ))}
        </div>
        <div className="border-t border-border px-2 py-1 text-2xs text-muted-foreground">
          <span className="font-mono">{word!.text}</span> · 1–{items.length} pick · esc keep
        </div>
      </div>,
      document.body
    );
  }
);
TransliterationCandidates.displayName = "TransliterationCandidates";

export interface TransliterationToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  /** Script sample shown on the button. Default "अ". */
  glyph?: React.ReactNode;
  /** Language name for the label, e.g. "Hindi". */
  languageName?: string;
}

/** IME on/off toggle for transliteration input. */
export const TransliterationToggle = React.forwardRef<HTMLButtonElement, TransliterationToggleProps>(
  ({ pressed, onPressedChange, glyph = "अ", languageName, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed}
      aria-label={languageName ? `Type in ${languageName} script` : "Transliteration"}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-control px-2 text-sm font-medium transition-colors",
        pressed ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
        focusRing,
        className
      )}
      {...props}
    >
      <span aria-hidden="true" className="text-base leading-none">
        {glyph}
      </span>
      <RiTranslate2 aria-hidden="true" className="size-3.5" />
    </button>
  )
);
TransliterationToggle.displayName = "TransliterationToggle";

/* ------------------------------------------------------------------ */
/* DictionaryCard + FrequencyMeter                                     */
/* ------------------------------------------------------------------ */

export interface FrequencyMeterProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** 0 (rare) … 3 (very common). */
  level: 0 | 1 | 2 | 3;
}

const frequencyWords = ["Rare", "Uncommon", "Common", "Very common"] as const;

/** Three-bar "how common is this word" indicator. */
export const FrequencyMeter = React.forwardRef<HTMLSpanElement, FrequencyMeterProps>(({ level, className, ...props }, ref) => (
  <span
    ref={ref}
    role="meter"
    aria-label="How common"
    aria-valuemin={0}
    aria-valuemax={3}
    aria-valuenow={level}
    aria-valuetext={frequencyWords[level]}
    title={frequencyWords[level]}
    className={cn("inline-flex items-end gap-0.5", className)}
    {...props}
  >
    {[1, 2, 3].map((b) => (
      <span key={b} data-lit={b <= level ? "" : undefined} className={cn("block w-1 rounded-[1px]", b <= level ? "bg-primary" : "bg-muted-foreground/25")} style={{ height: 4 + b * 3 }} />
    ))}
  </span>
));
FrequencyMeter.displayName = "FrequencyMeter";

export interface DictionaryDefinition {
  text: string;
  example?: string;
  synonyms?: string[];
}
export interface DictionarySense {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
}

export interface DictionaryCardProps extends React.HTMLAttributes<HTMLElement> {
  word: string;
  phonetic?: string;
  lang?: string;
  senses: DictionarySense[];
  frequency?: 0 | 1 | 2 | 3;
  /** Extra header actions (a SpeakButton is added for `lang` automatically). */
  actions?: React.ReactNode;
}

/** Dictionary entry: word, phonetic, frequency and senses grouped by part of speech with examples. */
export const DictionaryCard = React.forwardRef<HTMLElement, DictionaryCardProps>(({ word, phonetic, lang, senses, frequency, actions, className, ...props }, ref) => {
  const headingId = React.useId();
  return (
    <article ref={ref} aria-labelledby={headingId} className={cn("space-y-4 rounded-box border border-border bg-card p-4 shadow-xs", className)} {...props}>
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 id={headingId} lang={lang} className="text-xl font-semibold text-foreground">
            {word}
          </h3>
          {phonetic ? <p className="font-mono text-sm text-muted-foreground">{phonetic}</p> : null}
        </div>
        {frequency != null ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FrequencyMeter level={frequency} />
            <span aria-hidden="true">{frequencyWords[frequency]}</span>
          </span>
        ) : null}
        <SpeakButton text={word} lang={lang} label={`Pronounce ${word}`} />
        {actions}
      </header>
      {senses.map((s) => (
        <section key={s.partOfSpeech} aria-label={s.partOfSpeech}>
          <h4 className="mb-1.5 text-xs font-medium italic text-primary">{s.partOfSpeech}</h4>
          <ol className="list-decimal space-y-2 pl-5 text-sm marker:text-muted-foreground">
            {s.definitions.map((d, i) => (
              <li key={i}>
                <p className="text-foreground">{d.text}</p>
                {d.example ? <p className="mt-0.5 text-muted-foreground">“{d.example}”</p> : null}
                {d.synonyms?.length ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Similar: <span className="text-foreground">{d.synonyms.join(", ")}</span>
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </article>
  );
});
DictionaryCard.displayName = "DictionaryCard";

/* ------------------------------------------------------------------ */
/* ConversationTurns                                                   */
/* ------------------------------------------------------------------ */

export interface ConversationSpeaker {
  lang: string;
  /** Display name. Defaults to the language name. */
  label?: string;
}

export interface ConversationTurn {
  id: string;
  speaker: "left" | "right";
  original: string;
  translation: string;
}

export type ConversationLiveState = "idle" | "hearing" | "translating" | "speaking";

export interface ConversationTurnsProps extends React.HTMLAttributes<HTMLDivElement> {
  left: ConversationSpeaker;
  right: ConversationSpeaker;
  turns: ConversationTurn[];
  /** Who is active and what is happening. */
  live?: { speaker: "left" | "right"; state: ConversationLiveState; level?: number; text?: string } | null;
  onMicPress?: (speaker: "left" | "right") => void;
  emptyState?: React.ReactNode;
}

const liveWords: Record<ConversationLiveState, string> = { idle: "Tap to speak", hearing: "Listening…", translating: "Translating…", speaking: "Speaking…" };

/** Interpreter mode: two speakers left/right with live state, and a log of original + translated turns. */
export const ConversationTurns = React.forwardRef<HTMLDivElement, ConversationTurnsProps>(
  ({ left, right, turns, live, onMicPress, emptyState, className, ...props }, ref) => {
    const logRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
      const el = logRef.current;
      if (el && typeof el.scrollTo === "function") el.scrollTo({ top: el.scrollHeight });
    }, [turns.length]);
    const speakers = { left, right };
    const nameOf = (s: ConversationSpeaker) => s.label ?? getLanguage(s.lang)?.name ?? s.lang;
    const panel = (side: "left" | "right") => {
      const sp = speakers[side];
      const state: ConversationLiveState = live?.speaker === side ? live.state : "idle";
      const activeMic = state === "hearing";
      return (
        <div data-side={side} data-state={state} className={cn("flex flex-1 items-center gap-3 rounded-box border border-border bg-card p-3", side === "right" && "flex-row-reverse text-right", state !== "idle" && "border-primary/50 ring-1 ring-primary/30")}>
          <Button
            type="button"
            size="icon-lg"
            variant={activeMic ? "destructive" : "secondary"}
            aria-pressed={activeMic}
            aria-label={activeMic ? `Stop listening (${nameOf(sp)})` : `Speak ${nameOf(sp)}`}
            onClick={() => onMicPress?.(side)}
            className="rounded-full"
          >
            {state === "speaking" ? <RiVolumeUpLine /> : <RiMicLine />}
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{nameOf(sp)}</p>
            <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", side === "right" && "justify-end")}>
              <span aria-live="polite">{liveWords[state]}</span>
              {state === "hearing" ? <AudioLevelMeter level={live?.level ?? 0} size="sm" tone="destructive" label={`${nameOf(sp)} input level`} /> : null}
            </div>
            {live?.speaker === side && live.text && state !== "idle" ? (
              <p lang={sp.lang} dir={languageDir(sp.lang)} className="mt-1 truncate text-sm italic text-muted-foreground">
                {live.text}
              </p>
            ) : null}
          </div>
        </div>
      );
    };
    return (
      <div ref={ref} className={cn("flex flex-col gap-3", className)} {...props}>
        {turns.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-box border border-dashed border-border p-6 text-center">
            <RiMicLine aria-hidden="true" className="size-6 text-muted-foreground" />
            {emptyState ?? (
              <>
                <p className="text-sm font-medium text-foreground">No conversation yet</p>
                <p className="text-sm text-muted-foreground">Tap a microphone and start speaking. Each turn is translated for the other person.</p>
              </>
            )}
          </div>
        ) : (
          <div ref={logRef} role="log" aria-label="Conversation" className="max-h-96 overflow-y-auto scrollbar-thin">
          <ol className="flex flex-col gap-2">
            {turns.map((t) => {
              const from = speakers[t.speaker];
              const to = speakers[t.speaker === "left" ? "right" : "left"];
              return (
                <li key={t.id} data-speaker={t.speaker} className={cn("flex", t.speaker === "right" && "justify-end")}>
                  <div className={cn("max-w-[80%] rounded-box px-3 py-2", t.speaker === "left" ? "rounded-bl-sm bg-muted" : "rounded-br-sm bg-primary-soft text-primary-soft-foreground")}>
                    <p className="sr-only">{nameOf(from)}:</p>
                    <p lang={from.lang} dir={languageDir(from.lang)} className="text-xs opacity-70">
                      {t.original}
                    </p>
                    <p lang={to.lang} dir={languageDir(to.lang)} className="text-base">
                      {t.translation}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          {panel("left")}
          {panel("right")}
        </div>
      </div>
    );
  }
);
ConversationTurns.displayName = "ConversationTurns";
