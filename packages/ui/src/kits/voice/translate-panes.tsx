import * as React from "react";
import { RiArrowDownSLine, RiCloseLine, RiShareLine } from "@remixicon/react";
import { cn, focusRing, hitArea } from "../../lib/cn";
import { formatDuration } from "../../lib/duration";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useIsoLayoutEffect } from "../../hooks/use-iso-layout-effect";
import { Button } from "../../primitives/button";
import { CopyButton } from "../../primitives/copy-button";
import { SpeakButton } from "./voice";
import { type Language, DETECT_LANGUAGE, languageDir } from "./translate-languages";

/* ------------------------------------------------------------------ */
/* SourcePane / TargetPane                                             */
/* ------------------------------------------------------------------ */


export interface SourcePaneProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange" | "defaultValue"> {
  /** Controlled text to translate. */
  value?: string;
  /** Initial text when uncontrolled. Default "". */
  defaultValue?: string;
  /** Called with the text on every edit. */
  onValueChange?: (value: string) => void;
  /** Language code of the text (drives `dir` and `lang`). */
  lang?: string;
  /** Character limit. Default 5000. */
  maxLength?: number;
  /** Placeholder of the text area. Default "Enter text". */
  placeholder?: string;
  /** "Did you mean" correction. */
  suggestion?: string;
  /** Called with the suggestion when the user accepts the "Did you mean" correction. */
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
    { value: valueProp, defaultValue = "", onValueChange: onValueChangeProp, lang, maxLength = 5000, placeholder = "Enter text", suggestion, onAcceptSuggestion, voice, speak, tools, textareaProps, minHeight = 128, className, children, ...props },
    ref
  ) => {
    const [value, onValueChange] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChangeProp });
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
            className={cn("block w-full resize-none bg-transparent px-4 pb-2 pt-4 pe-11 text-lg leading-relaxed text-foreground outline-none placeholder:text-muted-foreground", textareaProps?.className)}
          />
          {value ? (
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Clear text" onClick={() => {
              onValueChange("");
              inner.current?.focus();
            }} className="absolute end-2 top-3">
              <RiCloseLine aria-hidden />
            </Button>
          ) : null}
          {children}
        </div>
        {suggestion ? (
          <p className="px-4 pb-1 text-sm text-muted-foreground" data-slot="did-you-mean">
            Did you mean:{" "}
            <button type="button" onClick={() => onAcceptSuggestion?.(suggestion)} className={cn(hitArea, "rounded-sm font-medium italic text-primary underline-offset-2 hover:underline", focusRing)}>
              {suggestion}
            </button>
          </p>
        ) : null}
        <div className="flex items-center gap-1 px-2 pb-2">
          {voice}
          {speak ?? <SpeakButton text={value} lang={lang && lang !== DETECT_LANGUAGE ? lang : undefined} />}
          {tools}
          <span className={cn("ms-auto pe-2 text-xs tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
            <bdi dir="ltr">{value.length.toLocaleString("en-US")} / {maxLength.toLocaleString("en-US")}</bdi>
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
  /** The translated text. */
  text: string;
  /** Language code of `text`; sets `lang` and the text direction. */
  lang?: string;
  /** Output is still arriving: shows a blinking caret. */
  streaming?: boolean;
  /** Romanized reading of the output. */
  romanization?: string;
  /** Other phrasings of the translation, shown as chips. */
  alternatives?: string[];
  /** Called with the alternative when the user picks one. */
  onPickAlternative?: (alt: string) => void;
  /** Time to translate, in ms. */
  latencyMs?: number;
  /** Called with the text when the user presses Share; the button is hidden when unset. */
  onShare?: (text: string) => void;
  /** Override the speak button. */
  speak?: React.ReactNode;
  /** Other meanings of a single-word translation. */
  senses?: TranslationSense[];
  /** Text shown while `text` is empty. Default "Translation". */
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
            {streaming ? <span aria-hidden="true" data-slot="stream-caret" className="ms-0.5 inline-block h-[1.1em] w-0.5 translate-y-[0.15em] animate-caret-blink bg-primary" /> : null}
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
              <RiArrowDownSLine aria-hidden="true" className={cn("size-4 chevron-turn", showSenses && "rotate-180")} />
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
                  <RiShareLine aria-hidden />
                </Button>
              ) : null}
            </>
          ) : null}
          {latencyMs != null && !streaming && text ? (
            <span className="ms-auto pe-2 font-mono text-xs tabular-nums text-muted-foreground" data-slot="latency">
              {formatDuration(latencyMs, { ms: true, space: true, decimals: 1, decimalsBelow: 60_000, trimZeros: false })}
            </span>
          ) : null}
        </div>
      </section>
    );
  }
);
TargetPane.displayName = "TargetPane";
