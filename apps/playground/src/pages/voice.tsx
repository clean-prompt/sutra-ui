import * as React from "react";
import {
  AudioLevelMeter,
  ConversationTurns,
  DETECT_LANGUAGE,
  DictionaryCard,
  LanguageBar,
  LanguagePicker,
  SourcePane,
  SpeakButton,
  TargetPane,
  TransliterationCandidates,
  TransliterationToggle,
  VoiceInput,
  getLanguage,
  type ConversationLiveState,
  type ConversationTurn,
} from "@sutra/ui";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/** Anchor ids of the demos on this page. */
export const voiceAnchors = [
  "translator",
  "language-picker",
  "transliteration",
  "dictionary",
  "conversation",
  "voice-input",
  "speak-button",
  "audio-level",
] as const;

export function VoicePage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="Voice & Translation"
      description="Speech in and out (Web Speech API, feature-detected) and the parts of a translator: language bar, source / target panes, an IME-style transliteration popup, dictionary entries and interpreter mode. Everything here is simulated locally — no network."
    >
      <TranslatorDemo />
      <LanguagePickerDemo />
      <TransliterationDemo />
      <DictionaryDemo />
      <ConversationDemo />
      <VoiceInputDemo />
      <SpeakButtonDemo />
      <AudioLevelDemo />
    </PageIntro>
  );
}

export default VoicePage;

/* ------------------------------------------------------------------ */
/* Simulated translation                                               */
/* ------------------------------------------------------------------ */

const enHi: Record<string, string> = {
  hello: "नमस्ते", hi: "नमस्ते", how: "कैसे", are: "हैं", you: "आप", i: "मैं", am: "हूँ", good: "अच्छा", fine: "ठीक",
  thank: "धन्यवाद", thanks: "धन्यवाद", water: "पानी", where: "कहाँ", is: "है", the: "", station: "स्टेशन", food: "खाना",
  please: "कृपया", friend: "दोस्त", today: "आज", weather: "मौसम", very: "बहुत", nice: "अच्छा", what: "क्या", name: "नाम",
  your: "आपका", my: "मेरा", love: "प्यार", book: "किताब", house: "घर", yes: "हाँ", no: "नहीं", tea: "चाय", time: "समय",
};
const hiEn: Record<string, string> = Object.fromEntries(Object.entries(enHi).filter(([, v]) => v).map(([k, v]) => [v, k]));
const roman: Record<string, string> = {
  नमस्ते: "namaste", कैसे: "kaise", हैं: "hain", आप: "aap", मैं: "main", हूँ: "hoon", अच्छा: "achchha", ठीक: "theek",
  धन्यवाद: "dhanyavaad", पानी: "paani", कहाँ: "kahaan", है: "hai", स्टेशन: "steshan", खाना: "khaana", कृपया: "kripaya",
  दोस्त: "dost", आज: "aaj", मौसम: "mausam", बहुत: "bahut", क्या: "kya", नाम: "naam", आपका: "aapka", मेरा: "mera",
  प्यार: "pyaar", किताब: "kitaab", घर: "ghar", हाँ: "haan", नहीं: "nahin", चाय: "chaay", समय: "samay",
};

function translate(text: string, from: string, to: string) {
  if (from === to) return text;
  const dict = from === "hi" && to === "en" ? hiEn : from === "en" && to === "hi" ? enHi : null;
  if (!dict) return `[${to}] ${text}`;
  return text
    .split(/(\s+|[.,!?])/)
    .map((tok) => {
      const k = tok.toLowerCase();
      return k in dict ? dict[k] : tok;
    })
    .join("")
    .replace(/\s{2,}/g, " ")
    .trim();
}
const romanize = (text: string) => text.split(/(\s+)/).map((w) => roman[w] ?? w).join("");
const detect = (text: string) => (/[ऀ-ॿ]/.test(text) ? "hi" : text.trim() ? "en" : undefined);
const corrections: Record<string, string> = { helo: "hello", thnak: "thank", wether: "weather", freind: "friend" };
const suggestFor = (text: string) => {
  let changed = false;
  const out = text.replace(/[A-Za-z]+/g, (w) => {
    const c = corrections[w.toLowerCase()];
    if (c) changed = true;
    return c ?? w;
  });
  return changed ? out : undefined;
};

/* ------------------------------------------------------------------ */

function TranslatorDemo() {
  const [source, setSource] = React.useState(DETECT_LANGUAGE);
  const [target, setTarget] = React.useState("hi");
  const [recentSources, setRecentSources] = React.useState(["en", "hi", "fr"]);
  const [recentTargets, setRecentTargets] = React.useState(["hi", "en", "es"]);
  const [text, setText] = React.useState("helo, how are you today");
  const [output, setOutput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [latency, setLatency] = React.useState<number | undefined>();
  const detected = source === DETECT_LANGUAGE ? detect(text) : undefined;
  const from = source === DETECT_LANGUAGE ? detected ?? "en" : source;

  React.useEffect(() => {
    if (!text.trim()) {
      setOutput("");
      setStreaming(false);
      return;
    }
    const full = translate(text, from, target);
    const t0 = performance.now();
    let i = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const debounce = setTimeout(() => {
      setStreaming(true);
      setOutput("");
      timer = setInterval(() => {
        i += 2;
        setOutput(full.slice(0, i));
        if (i >= full.length) {
          clearInterval(timer);
          setStreaming(false);
          setLatency(performance.now() - t0);
        }
      }, 35);
    }, 350);
    return () => {
      clearTimeout(debounce);
      if (timer) clearInterval(timer);
    };
  }, [text, from, target]);

  const pushRecent = (list: string[], code: string) => [code, ...list.filter((c) => c !== code)].slice(0, 3);
  const onSource = (c: string) => {
    setSource(c);
    if (c !== DETECT_LANGUAGE) setRecentSources((r) => pushRecent(r, c));
  };
  const onTarget = (c: string) => {
    setTarget(c);
    setRecentTargets((r) => pushRecent(r, c));
  };

  const single = !streaming && output && !/\s/.test(output) && target === "hi";
  return (
    <Demo
      id="translator"
      title="Mini translator"
      description="LanguageBar with recent chips, detect + swap (disabled until a language is detected), a source pane with a did-you-mean strip and a streaming target pane with romanization. Try “helo”, Hindi text, or a single word like “water”."
      align="start"
      canvasClassName="p-0 sm:p-0"
    >
      <div className="overflow-hidden">
        <LanguageBar
          source={source}
          target={target}
          detected={detected}
          recentSources={recentSources}
          recentTargets={recentTargets}
          onSourceChange={onSource}
          onTargetChange={onTarget}
        />
        <div className="grid md:grid-cols-2 md:divide-x divide-border">
          <SourcePane
            value={text}
            onValueChange={setText}
            lang={from}
            maxLength={500}
            suggestion={suggestFor(text)}
            onAcceptSuggestion={setText}
            voice={<VoiceInput lang={from === "hi" ? "hi-IN" : "en-US"} size="sm" onTranscript={(t, { done }) => !done && setText((v) => (v ? `${v} ${t}` : t))} />}
          />
          <TargetPane
            text={output}
            lang={target}
            streaming={streaming}
            romanization={target === "hi" && output ? romanize(output) : undefined}
            alternatives={single && output === "पानी" ? ["जल", "नीर"] : undefined}
            senses={single && output === "पानी" ? [{ partOfSpeech: "noun", terms: ["पानी", "जल", "नीर"] }, { partOfSpeech: "verb", terms: ["सींचना"] }] : undefined}
            latencyMs={latency}
            onShare={() => {}}
          />
        </div>
      </div>
    </Demo>
  );
}

function LanguagePickerDemo() {
  const [value, setValue] = React.useState("en");
  return (
    <Demo id="language-picker" title="Language picker" description="Search by English name, native name (“日本語”, “हिन्दी”) or code (“zh-tw”). Detect, recent and full list; ↑↓ Enter to pick.">
      <div className="w-80 overflow-hidden rounded-box border border-border bg-popover shadow-lg">
        <LanguagePicker value={value} onValueChange={setValue} recent={["hi", "es", "ja"]} allowDetect autoFocus={false} />
      </div>
      <DemoLabel>Selected: {getLanguage(value)?.name ?? value}</DemoLabel>
    </Demo>
  );
}

const hindiCandidates: Record<string, string[]> = {
  namaste: ["नमस्ते", "नमस्थे", "नामस्ते"],
  kaise: ["कैसे", "केसे", "कैसें"],
  ho: ["हो", "हों", "हौ"],
  aap: ["आप", "आपा", "अप"],
  main: ["मैं", "मैन", "में"],
  theek: ["ठीक", "थीक"],
  hoon: ["हूँ", "हूं", "हुन"],
  dhanyavaad: ["धन्यवाद", "धन्यवाद्"],
  pani: ["पानी", "पनी", "पाणि"],
  bharat: ["भारत", "भरत"],
  dost: ["दोस्त", "दोस्ट"],
  kya: ["क्या", "कया"],
  hai: ["है", "हैं", "हाई"],
};
const consonants: Record<string, string> = { k: "क", kh: "ख", g: "ग", ch: "च", j: "ज", t: "त", d: "द", n: "न", p: "प", b: "ब", m: "म", y: "य", r: "र", l: "ल", v: "व", w: "व", s: "स", sh: "श", h: "ह" };
const vowels: Record<string, [string, string]> = { aa: ["आ", "ा"], a: ["अ", ""], i: ["इ", "ि"], ee: ["ई", "ी"], u: ["उ", "ु"], oo: ["ऊ", "ू"], e: ["ए", "े"], ai: ["ऐ", "ै"], o: ["ओ", "ो"], au: ["औ", "ौ"] };
/** Tiny greedy romanization so unknown words still get one candidate. */
function naive(word: string) {
  let out = "";
  let i = 0;
  const w = word.toLowerCase();
  let afterConsonant = false;
  while (i < w.length) {
    const two = w.slice(i, i + 2);
    const one = w[i]!;
    if (vowels[two] || vowels[one]) {
      const v = vowels[two] ?? vowels[one]!;
      out += afterConsonant ? v[1] : v[0];
      i += vowels[two] ? 2 : 1;
      afterConsonant = false;
    } else if (consonants[two] || consonants[one]) {
      if (afterConsonant) out += "्";
      out += consonants[two] ?? consonants[one];
      i += consonants[two] ? 2 : 1;
      afterConsonant = true;
    } else {
      out += one;
      i++;
      afterConsonant = false;
    }
  }
  return out;
}
const getHindiCandidates = (word: string) => {
  const w = word.toLowerCase();
  const exact = hindiCandidates[w] ?? [];
  const prefix = Object.entries(hindiCandidates)
    .filter(([k]) => k !== w && k.startsWith(w))
    .map(([, v]) => v[0]!);
  const list = [...exact, ...prefix];
  const n = naive(w);
  if (!list.includes(n)) list.push(n);
  return list.slice(0, 5);
};

function TransliterationDemo() {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = React.useState("");
  const [ime, setIme] = React.useState(true);
  return (
    <Demo
      id="transliteration"
      title="Transliteration (IME)"
      description="Type Hindi with Latin letters: “namaste kaise ho”. Pick a candidate with 1–5, click, or ↑↓ + Enter; Space commits the highlighted one; Esc keeps what you typed. The अ button turns the IME off."
      align="start"
      canvasClassName="p-0 sm:p-0"
    >
      <SourcePane
        ref={ref}
        value={value}
        onValueChange={setValue}
        lang="hi"
        maxLength={500}
        minHeight={96}
        placeholder={ime ? "Type in Roman letters — converted to Hindi" : "Type"}
        tools={<TransliterationToggle pressed={ime} onPressedChange={setIme} languageName="Hindi" />}
      />
      <TransliterationCandidates anchorRef={ref} lang="hi" enabled={ime} getCandidates={getHindiCandidates} />
    </Demo>
  );
}

function DictionaryDemo() {
  return (
    <Demo id="dictionary" title="Dictionary card" description="Word, phonetic, a three-bar “how common” meter and senses grouped by part of speech with examples." align="start" canvasClassName="grid gap-4 md:grid-cols-2">
      <DictionaryCard
        word="bank"
        phonetic="/bæŋk/"
        lang="en"
        frequency={3}
        senses={[
          {
            partOfSpeech: "noun",
            definitions: [
              { text: "An organization that keeps money safe and lends it.", example: "She opened an account at the bank.", synonyms: ["lender", "treasury"] },
              { text: "The land along the side of a river.", example: "We had a picnic on the river bank." },
            ],
          },
          { partOfSpeech: "verb", definitions: [{ text: "To tilt an aircraft while turning.", example: "The plane banked to the left." }, { text: "To rely on something.", example: "Don't bank on it." }] },
        ]}
      />
      <DictionaryCard
        word="सुखद"
        phonetic="sukhad"
        lang="hi"
        frequency={1}
        senses={[{ partOfSpeech: "adjective", definitions: [{ text: "Pleasant; giving happiness.", example: "यह एक सुखद यात्रा थी।", synonyms: ["आनंददायक", "मनोहर"] }] }]}
      />
    </Demo>
  );
}

const script: Array<Omit<ConversationTurn, "id">> = [
  { speaker: "left", original: "Hello! Where is the train station?", translation: "नमस्ते! रेलवे स्टेशन कहाँ है?" },
  { speaker: "right", original: "सीधे जाइए, फिर बाएँ मुड़िए।", translation: "Go straight, then turn left." },
  { speaker: "left", original: "Is it far from here?", translation: "क्या यह यहाँ से दूर है?" },
  { speaker: "right", original: "नहीं, पाँच मिनट पैदल।", translation: "No, five minutes on foot." },
];

function ConversationDemo() {
  const [turns, setTurns] = React.useState<ConversationTurn[]>([]);
  const [live, setLive] = React.useState<{ speaker: "left" | "right"; state: ConversationLiveState; level?: number; text?: string } | null>(null);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);

  React.useEffect(() => {
    if (live?.state !== "hearing") return;
    const t = setInterval(() => setLive((l) => (l && l.state === "hearing" ? { ...l, level: 0.2 + Math.random() * 0.7 } : l)), 90);
    return () => clearInterval(t);
  }, [live?.state]);

  const press = (speaker: "left" | "right") => {
    if (live) return;
    const next = script.find((s, i) => i >= turns.length && s.speaker === speaker) ?? { speaker, original: speaker === "left" ? "Thank you!" : "धन्यवाद!", translation: speaker === "left" ? "धन्यवाद!" : "Thank you!" };
    setLive({ speaker, state: "hearing", level: 0.4, text: next.original.split(" ").slice(0, 2).join(" ") + "…" });
    timers.current.push(
      setTimeout(() => setLive({ speaker, state: "translating", text: next.original }), 1600),
      setTimeout(() => setLive({ speaker, state: "speaking", text: next.translation }), 2400),
      setTimeout(() => {
        setLive(null);
        setTurns((t) => [...t, { ...next, id: String(t.length + 1) }]);
      }, 3500)
    );
  };

  return (
    <Demo id="conversation" title="Conversation turns" description="Interpreter mode. Tap a mic: it hears (live level), translates, speaks, then logs the turn with original and translation." align="start">
      <ConversationTurns left={{ lang: "en" }} right={{ lang: "hi" }} turns={turns} live={live} onMicPress={press} />
      {turns.length ? (
        <div>
          <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setTurns([])}>
            Clear conversation
          </button>
        </div>
      ) : null}
    </Demo>
  );
}

function VoiceInputDemo() {
  const [text, setText] = React.useState("");
  return (
    <Demo id="voice-input" title="Voice input" description="Mic toggle with a ring and bars driven by the real input level, a timer with max-duration countdown and the interim transcript. Hidden when the browser has no speech recognition unless a fallback is provided." align="start">
      <div className="flex flex-wrap items-center gap-4">
        <VoiceInput
          lang="en-US"
          maxDuration={30}
          onTranscript={(t, { done }) => !done && setText((v) => (v ? `${v} ${t}` : t))}
          fallback={<span className="text-sm text-muted-foreground">Speech recognition isn't available in this browser.</span>}
        />
      </div>
      <DemoLabel>Transcript</DemoLabel>
      <p className="min-h-6 text-sm text-foreground">{text || "—"}</p>
    </Demo>
  );
}

function SpeakButtonDemo() {
  const samples = [
    { lang: "en", text: "Hello, how are you today?" },
    { lang: "hi", text: "नमस्ते, आप कैसे हैं?" },
    { lang: "ja", text: "こんにちは、お元気ですか？" },
    { lang: "fr", text: "Bonjour, comment ça va ?" },
  ];
  return (
    <Demo id="speak-button" title="Speak button" description="Reads text with a system voice for its language. The button hides itself when no voice exists for that language (so it never reads Devanagari with English phonemes)." align="start">
      <ul className="space-y-2">
        {samples.map((s) => (
          <li key={s.lang} className="flex items-center gap-2 text-sm">
            <span lang={s.lang} className="min-w-0 flex-1">
              {s.text}
            </span>
            <span className="w-16 text-xs text-muted-foreground">{getLanguage(s.lang)?.name}</span>
            <SpeakButton text={s.text} lang={s.lang} label={`Listen (${getLanguage(s.lang)?.name})`} />
          </li>
        ))}
      </ul>
    </Demo>
  );
}

function AudioLevelDemo() {
  const [level, setLevel] = React.useState(0.4);
  const [auto, setAuto] = React.useState(true);
  React.useEffect(() => {
    if (!auto) return;
    let t = 0;
    const id = setInterval(() => {
      t += 1;
      setLevel(Math.max(0, Math.min(1, 0.45 + Math.sin(t / 3) * 0.3 + (Math.random() - 0.5) * 0.3)));
    }, 80);
    return () => clearInterval(id);
  }, [auto]);
  return (
    <Demo id="audio-level" title="Audio level meter" description="Bars from a 0–1 level: equalizer-style horizontal, or a vertical stack.">
      <AudioLevelMeter level={level} size="sm" />
      <AudioLevelMeter level={level} />
      <AudioLevelMeter level={level} size="lg" bars={7} tone="success" />
      <AudioLevelMeter level={level} orientation="vertical" bars={8} className="h-16" />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Animate
      </label>
      <input type="range" min={0} max={1} step={0.01} value={level} aria-label="Level" onChange={(e) => { setAuto(false); setLevel(Number(e.target.value)); }} />
    </Demo>
  );
}
