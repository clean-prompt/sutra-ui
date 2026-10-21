import * as React from "react";
import { cn } from "../../lib/cn";
import { SpeakButton } from "./voice";

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
  /** The headword. */
  word: string;
  /** Pronunciation text shown under the word (for example IPA). */
  phonetic?: string;
  /** Language code of the word; sets `lang` and adds a speak button. */
  lang?: string;
  /** Meanings grouped by part of speech, each with a definition and examples. */
  senses: DictionarySense[];
  /** How common the word is, from 0 (rare) to 3 (very common); drawn as a three-bar meter. */
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
          <ol className="list-decimal space-y-2 ps-5 text-sm marker:text-muted-foreground">
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
