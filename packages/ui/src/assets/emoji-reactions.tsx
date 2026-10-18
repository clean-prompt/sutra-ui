import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { RiEmotionLine, RiSearchLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { clamp } from "../lib/math";
import { useControllableState } from "../hooks/use-controllable-state";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

export interface EmojiEntry {
  emoji: string;
  /** Lowercase name plus search keywords. */
  name: string;
}

export interface EmojiCategory {
  id: string;
  label: string;
  /** Emoji used as the category tab icon. */
  icon: string;
  emojis: EmojiEntry[];
}

const e = (emoji: string, name: string): EmojiEntry => ({ emoji, name });

/** Default quick reactions. */
export const reactionPresets = ["👍", "❤️", "😂", "🎉", "😮", "😢", "🔥", "👀"] as const;

/** Built-in emoji set used by `EmojiPicker`. */
export const emojiCategories: EmojiCategory[] = [
  {
    id: "smileys",
    label: "Smileys",
    icon: "😀",
    emojis: [
      e("😀", "grinning face smile happy"), e("😃", "smiley face happy joy"), e("😄", "smile grin happy"),
      e("😁", "beaming grin teeth"), e("😆", "laughing squint lol"), e("😅", "sweat smile relief"),
      e("😂", "joy tears laugh lol"), e("🤣", "rofl rolling laugh"), e("🙂", "slight smile"),
      e("😉", "wink"), e("😊", "blush smile happy"), e("😇", "innocent halo angel"),
      e("🥰", "love hearts adore"), e("😍", "heart eyes love"), e("🤩", "star struck wow"),
      e("😘", "kiss blow"), e("😋", "yum tasty delicious"), e("😜", "wink tongue silly"),
      e("🤔", "thinking hmm"), e("🤨", "raised eyebrow skeptical"), e("😐", "neutral meh"),
      e("😴", "sleeping tired zzz"), e("😮", "open mouth wow surprised"), e("😢", "cry sad tear"),
      e("😭", "sob crying loud"), e("😡", "angry mad rage"), e("🥳", "party celebrate"),
      e("😎", "cool sunglasses"),
    ],
  },
  {
    id: "people",
    label: "People",
    icon: "🧑",
    emojis: [
      e("👍", "thumbs up like yes approve +1"), e("👎", "thumbs down dislike no -1"), e("👏", "clap applause"),
      e("🙌", "raised hands celebrate hooray"), e("🙏", "pray thanks please"), e("🤝", "handshake deal agree"),
      e("👋", "wave hello bye"), e("✌️", "victory peace"), e("🤞", "fingers crossed luck"),
      e("👌", "ok perfect"), e("🤙", "call me shaka"), e("💪", "muscle strong flex"),
      e("👀", "eyes look see watching"), e("🧠", "brain smart"), e("👉", "point right"),
      e("👆", "point up"), e("✋", "raised hand stop high five"), e("🫶", "heart hands love"),
      e("🧑‍💻", "technologist developer coder laptop"), e("🧑‍🎨", "artist designer"), e("🧑‍🚀", "astronaut space"),
      e("🕺", "dance man"), e("💃", "dance woman"), e("🤷", "shrug dunno"),
    ],
  },
  {
    id: "nature",
    label: "Nature",
    icon: "🌿",
    emojis: [
      e("🐶", "dog puppy"), e("🐱", "cat kitten"), e("🦊", "fox"), e("🐻", "bear"),
      e("🐼", "panda"), e("🐨", "koala"), e("🦁", "lion"), e("🐸", "frog"),
      e("🐵", "monkey"), e("🦄", "unicorn"), e("🐝", "bee honey"), e("🦋", "butterfly"),
      e("🐢", "turtle slow"), e("🐙", "octopus"), e("🐳", "whale"), e("🌵", "cactus"),
      e("🌲", "tree evergreen"), e("🌿", "herb leaf plant"), e("🍀", "clover luck"), e("🌸", "cherry blossom flower"),
      e("🌻", "sunflower"), e("🌈", "rainbow"), e("☀️", "sun sunny"), e("⭐", "star"),
      e("🌙", "moon night"), e("❄️", "snowflake cold winter"),
    ],
  },
  {
    id: "food",
    label: "Food",
    icon: "🍔",
    emojis: [
      e("🍎", "apple red fruit"), e("🍌", "banana"), e("🍉", "watermelon"), e("🍓", "strawberry"),
      e("🍑", "peach"), e("🥑", "avocado"), e("🥕", "carrot"), e("🌽", "corn"),
      e("🍞", "bread"), e("🧀", "cheese"), e("🍔", "burger hamburger"), e("🍕", "pizza"),
      e("🌮", "taco"), e("🍣", "sushi"), e("🍜", "ramen noodles"), e("🍛", "curry rice"),
      e("🍩", "donut doughnut"), e("🍪", "cookie"), e("🎂", "birthday cake"), e("🍫", "chocolate"),
      e("🍿", "popcorn"), e("☕", "coffee tea hot"), e("🍵", "tea matcha"), e("🍺", "beer cheers"),
    ],
  },
  {
    id: "activities",
    label: "Activities",
    icon: "⚽",
    emojis: [
      e("⚽", "soccer football"), e("🏀", "basketball"), e("🏈", "american football"), e("⚾", "baseball"),
      e("🎾", "tennis"), e("🏐", "volleyball"), e("🏓", "ping pong table tennis"), e("🏸", "badminton"),
      e("🏏", "cricket"), e("⛳", "golf"), e("🏊", "swim"), e("🚴", "bike cycling"),
      e("🧘", "yoga meditate"), e("🏋️", "weight lifting gym"), e("🎯", "target bullseye goal"), e("🎮", "video game controller"),
      e("🎲", "dice game"), e("🧩", "puzzle"), e("🎨", "art palette paint"), e("🎸", "guitar music"),
      e("🎧", "headphones music"), e("🎬", "movie clapper film"), e("🏆", "trophy win"), e("🥇", "gold medal first"),
    ],
  },
  {
    id: "travel",
    label: "Travel",
    icon: "✈️",
    emojis: [
      e("🚗", "car"), e("🚕", "taxi"), e("🚌", "bus"), e("🚲", "bicycle"),
      e("🛵", "scooter"), e("🚆", "train"), e("🚇", "metro subway"), e("✈️", "airplane flight travel"),
      e("🚀", "rocket launch ship"), e("🛸", "ufo"), e("⛵", "sailboat"), e("🚢", "ship"),
      e("🗺️", "map world"), e("🧭", "compass"), e("🏔️", "mountain snow"), e("🏖️", "beach"),
      e("🏝️", "island"), e("🏕️", "camping tent"), e("🏙️", "city skyline"), e("🗼", "tower tokyo"),
      e("🗽", "statue of liberty"), e("🏠", "house home"), e("🏢", "office building"), e("🌋", "volcano"),
    ],
  },
  {
    id: "objects",
    label: "Objects",
    icon: "💡",
    emojis: [
      e("💡", "idea light bulb"), e("📌", "pin pushpin"), e("📎", "paperclip attach"), e("📝", "memo note write"),
      e("📅", "calendar date"), e("📚", "books study"), e("📖", "book open read"), e("✏️", "pencil edit"),
      e("💻", "laptop computer"), e("🖥️", "desktop computer"), e("📱", "phone mobile"), e("⌨️", "keyboard"),
      e("📷", "camera photo"), e("🔒", "lock secure"), e("🔑", "key"), e("🛠️", "tools build"),
      e("⚙️", "gear settings"), e("📦", "package box ship"), e("✉️", "envelope mail"), e("📈", "chart up growth"),
      e("💰", "money bag"), e("💳", "credit card"), e("⏰", "alarm clock time"), e("🎁", "gift present"),
    ],
  },
  {
    id: "symbols",
    label: "Symbols",
    icon: "❤️",
    emojis: [
      e("❤️", "red heart love"), e("🧡", "orange heart"), e("💛", "yellow heart"), e("💚", "green heart"),
      e("💙", "blue heart"), e("💜", "purple heart"), e("🖤", "black heart"), e("💯", "hundred perfect 100"),
      e("🔥", "fire lit hot"), e("✨", "sparkles magic new"), e("🎉", "tada party celebrate"), e("💥", "boom collision"),
      e("✅", "check done yes"), e("❌", "cross no wrong"), e("⚠️", "warning caution"), e("❓", "question"),
      e("❗", "exclamation important"), e("➕", "plus add"), e("🔔", "bell notification"), e("💤", "zzz sleep"),
      e("♻️", "recycle"), e("🚫", "prohibited no"), e("🆕", "new"), e("🔁", "repeat loop"),
    ],
  },
];

const emojiIndex = new Map<string, EmojiEntry>();
for (const category of emojiCategories) for (const entry of category.emojis) emojiIndex.set(entry.emoji, entry);

/* ------------------------------------------------------------------ */
/* EmojiReaction                                                       */
/* ------------------------------------------------------------------ */

export interface EmojiReactionProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onToggle" | "children"> {
  emoji: string;
  count?: number;
  /** Whether the current user has reacted (controlled). */
  reacted?: boolean;
  defaultReacted?: boolean;
  onToggle?: (reacted: boolean) => void;
  size?: "sm" | "md";
}

/** A reaction pill showing an emoji and its count; highlighted when the user has reacted. */
export const EmojiReaction = React.forwardRef<HTMLButtonElement, EmojiReactionProps>(
  (
    { emoji, count = 0, reacted: reactedProp, defaultReacted = false, onToggle, size = "md", className, onClick, ...props },
    ref
  ) => {
    const [reacted, setReacted] = useControllableState<boolean>({
      value: reactedProp,
      defaultValue: defaultReacted,
      onChange: onToggle,
    });
    const [popKey, setPopKey] = React.useState(0);
    const isControlled = reactedProp !== undefined;
    const shownCount = isControlled ? count : count + (reacted ? 1 : 0) - (defaultReacted ? 1 : 0);
    const name = emojiIndex.get(emoji)?.name.split(" ")[0] ?? emoji;

    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={reacted}
        aria-label={`${name} reaction, ${shownCount} ${shownCount === 1 ? "person" : "people"}${reacted ? ", including you" : ""}`}
        data-state={reacted ? "on" : "off"}
        className={cn(
          "inline-flex shrink-0 select-none items-center gap-1 rounded-full border font-medium tabular-nums",
          "transition-[background-color,border-color,color,transform] duration-150 active:scale-95",
          "disabled:pointer-events-none disabled:opacity-50",
          size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-xs",
          reacted
            ? "border-primary/40 bg-primary-soft text-primary-soft-foreground hover:border-primary/60"
            : "border-border bg-background text-muted-foreground hover:border-border-strong hover:bg-muted hover:text-foreground",
          focusRing,
          className
        )}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          setReacted(!reacted);
          if (!reacted) setPopKey((k) => k + 1);
        }}
        {...props}
      >
        <span
          key={popKey}
          aria-hidden
          className={cn(
            "inline-block leading-none",
            size === "sm" ? "text-sm" : "text-base",
            popKey > 0 && "animate-in zoom-in-50 duration-300 ease-[var(--ease-spring)]"
          )}
        >
          {emoji}
        </span>
        {shownCount > 0 ? <span aria-hidden>{shownCount}</span> : null}
      </button>
    );
  }
);
EmojiReaction.displayName = "EmojiReaction";

/* ------------------------------------------------------------------ */
/* EmojiPicker                                                         */
/* ------------------------------------------------------------------ */

export interface EmojiPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  onSelect?: (emoji: string, entry: EmojiEntry) => void;
  /** Emoji shown as a quick-pick row above the search field. */
  quickPicks?: readonly string[];
  /** Recently used emoji (controlled). */
  recent?: string[];
  defaultRecent?: string[];
  onRecentChange?: (recent: string[]) => void;
  maxRecent?: number;
  /** Number of grid columns. */
  columns?: number;
  searchPlaceholder?: string;
  autoFocus?: boolean;
  categories?: EmojiCategory[];
  /** Drop the card surface (background, border, radius, shadow), e.g. when inside a popover. */
  bare?: boolean;
}

/** A compact emoji picker with categories, keyword search and recently used emoji. */
export const EmojiPicker = React.forwardRef<HTMLDivElement, EmojiPickerProps>(
  (
    {
      onSelect,
      quickPicks,
      recent: recentProp,
      defaultRecent = [],
      onRecentChange,
      maxRecent = 16,
      columns = 8,
      searchPlaceholder = "Search emoji",
      autoFocus = false,
      categories = emojiCategories,
      bare = false,
      className,
      ...props
    },
    ref
  ) => {
    const [query, setQuery] = React.useState("");
    const [recent, setRecent] = useControllableState<string[]>({
      value: recentProp,
      defaultValue: defaultRecent,
      onChange: onRecentChange,
    });
    const [hovered, setHovered] = React.useState<EmojiEntry | null>(null);
    const [activeCategory, setActiveCategory] = React.useState<string>(categories[0]?.id ?? "");
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const sectionRefs = React.useRef<Record<string, HTMLElement | null>>({});
    const searchId = React.useId();

    const lookup = React.useCallback(
      (emoji: string): EmojiEntry => {
        for (const c of categories) {
          const found = c.emojis.find((x) => x.emoji === emoji);
          if (found) return found;
        }
        return emojiIndex.get(emoji) ?? { emoji, name: emoji };
      },
      [categories]
    );

    const select = (entry: EmojiEntry) => {
      setRecent([entry.emoji, ...recent.filter((x) => x !== entry.emoji)].slice(0, maxRecent));
      onSelect?.(entry.emoji, entry);
    };

    const q = query.trim().toLowerCase();
    const results = React.useMemo(() => {
      if (!q) return null;
      const terms = q.split(/\s+/);
      const seen = new Set<string>();
      const out: EmojiEntry[] = [];
      for (const c of categories) {
        for (const entry of c.emojis) {
          if (seen.has(entry.emoji)) continue;
          if (terms.every((t) => entry.name.includes(t) || entry.emoji === t)) {
            seen.add(entry.emoji);
            out.push(entry);
          }
        }
      }
      return out;
    }, [q, categories]);

    const sections: { id: string; label: string; emojis: EmojiEntry[] }[] = results
      ? [{ id: "results", label: "Search results", emojis: results }]
      : [
          ...(recent.length ? [{ id: "recent", label: "Recently used", emojis: recent.map(lookup) }] : []),
          ...categories,
        ];

    const scrollToCategory = (id: string) => {
      const container = scrollRef.current;
      const section = sectionRefs.current[id];
      if (!container || !section) return;
      container.scrollTo({ top: section.offsetTop - container.offsetTop, behavior: "smooth" });
      setActiveCategory(id);
    };

    const onScroll = () => {
      const container = scrollRef.current;
      if (!container || results) return;
      const top = container.scrollTop + container.offsetTop + 8;
      let current = categories[0]?.id ?? "";
      for (const c of categories) {
        const el = sectionRefs.current[c.id];
        if (el && el.offsetTop <= top) current = c.id;
      }
      if (current !== activeCategory) setActiveCategory(current);
    };

    const onGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      const keys: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns };
      const delta = keys[event.key];
      if (delta === undefined) return;
      const cells = Array.from(
        event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-emoji-cell]")
      );
      const index = cells.indexOf(document.activeElement as HTMLButtonElement);
      if (index === -1) return;
      event.preventDefault();
      const next = cells[clamp(index + delta, 0, cells.length - 1)];
      next?.focus();
    };

    const preview = hovered ?? null;

    return (
      <div
        ref={ref}
        data-slot="emoji-picker"
        className={cn(
          "flex w-[19rem] max-w-full flex-col overflow-hidden text-popover-foreground",
          !bare && "rounded-box border border-border bg-popover shadow-lg",
          className
        )}
        {...props}
      >
        {quickPicks?.length ? (
          <div className="flex items-center justify-between gap-0.5 border-b border-border px-2 py-1.5">
            {quickPicks.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={lookup(emoji).name.split(" ")[0]}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md text-xl leading-none transition-transform hover:scale-110 hover:bg-accent",
                  focusRing
                )}
                onClick={() => select(lookup(emoji))}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}

        <div className="p-2 pb-1">
          <label htmlFor={searchId} className="sr-only">
            {searchPlaceholder}
          </label>
          <div className="relative">
            <RiSearchLine aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id={searchId}
              type="search"
              autoFocus={autoFocus}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              autoComplete="off"
              className={cn(
                "h-8 w-full rounded-control border border-input bg-background pr-2.5 pl-8 text-sm shadow-xs placeholder:text-muted-foreground",
                focusRing
              )}
            />
          </div>
        </div>

        {!results ? (
          <div role="tablist" aria-label="Emoji categories" className="flex items-center justify-between gap-0.5 px-2 pb-1">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={activeCategory === c.id}
                aria-label={c.label}
                title={c.label}
                onClick={() => scrollToCategory(c.id)}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md text-base leading-none grayscale transition-[filter,background-color,opacity] hover:bg-accent hover:grayscale-0",
                  activeCategory === c.id ? "bg-accent opacity-100 grayscale-0" : "opacity-70",
                  focusRing
                )}
              >
                {c.icon}
              </button>
            ))}
          </div>
        ) : null}

        <div
          ref={scrollRef}
          onScroll={onScroll}
          onKeyDown={onGridKeyDown}
          className="relative h-64 overflow-y-auto scrollbar-thin px-2 pb-2"
        >
          {sections.map((section) => (
            <section
              key={section.id}
              ref={(el) => {
                sectionRefs.current[section.id] = el;
              }}
              aria-label={section.label}
            >
              <h3 className="sticky top-0 z-10 bg-popover/95 py-1.5 text-2xs font-medium tracking-wide text-muted-foreground uppercase backdrop-blur-sm">
                {section.label}
              </h3>
              <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {section.emojis.map((entry) => (
                  <button
                    key={`${section.id}-${entry.emoji}`}
                    type="button"
                    data-emoji-cell=""
                    aria-label={entry.name.split(" ").slice(0, 2).join(" ")}
                    onClick={() => select(entry)}
                    onMouseEnter={() => setHovered(entry)}
                    onFocus={() => setHovered(entry)}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-md text-xl leading-none transition-transform hover:scale-110 hover:bg-accent",
                      focusRing
                    )}
                  >
                    {entry.emoji}
                  </button>
                ))}
              </div>
            </section>
          ))}
          {results && results.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-1 text-center">
              <span className="text-2xl" aria-hidden>
                🔍
              </span>
              <p className="text-sm text-muted-foreground">No emoji found</p>
            </div>
          ) : null}
        </div>

        <div className="flex h-10 items-center gap-2 border-t border-border bg-subtle px-3 text-sm">
          {preview ? (
            <>
              <span className="text-xl leading-none" aria-hidden>
                {preview.emoji}
              </span>
              <span className="truncate text-muted-foreground">:{preview.name.split(" ").slice(0, 2).join("_")}:</span>
            </>
          ) : (
            <span className="text-muted-foreground">Pick an emoji…</span>
          )}
        </div>
      </div>
    );
  }
);
EmojiPicker.displayName = "EmojiPicker";

/* ------------------------------------------------------------------ */
/* EmojiReactionBar                                                    */
/* ------------------------------------------------------------------ */

export interface EmojiReactionItem {
  emoji: string;
  count: number;
  reacted?: boolean;
}

export interface EmojiReactionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Reactions (controlled). */
  reactions?: EmojiReactionItem[];
  defaultReactions?: EmojiReactionItem[];
  onReactionsChange?: (reactions: EmojiReactionItem[]) => void;
  /** Fired whenever the current user adds or removes a reaction. */
  onReact?: (emoji: string, reacted: boolean) => void;
  /** Quick picks shown at the top of the picker. */
  presets?: readonly string[];
  size?: "sm" | "md";
  /** Hide the add-reaction button. */
  readOnly?: boolean;
  addLabel?: string;
}

/** A row of reaction pills with an add-reaction button that opens an emoji picker. */
export const EmojiReactionBar = React.forwardRef<HTMLDivElement, EmojiReactionBarProps>(
  (
    {
      reactions: reactionsProp,
      defaultReactions = [],
      onReactionsChange,
      onReact,
      presets = reactionPresets,
      size = "md",
      readOnly = false,
      addLabel = "Add reaction",
      className,
      ...props
    },
    ref
  ) => {
    const [reactions, setReactions] = useControllableState<EmojiReactionItem[]>({
      value: reactionsProp,
      defaultValue: defaultReactions,
      onChange: onReactionsChange,
    });
    const [open, setOpen] = React.useState(false);

    const toggle = (emoji: string, nextReacted?: boolean) => {
      const existing = reactions.find((r) => r.emoji === emoji);
      const target = nextReacted ?? !existing?.reacted;
      if (existing && Boolean(existing.reacted) === target) return;
      let next: EmojiReactionItem[];
      if (!existing) {
        next = [...reactions, { emoji, count: 1, reacted: true }];
      } else {
        next = reactions
          .map((r) =>
            r.emoji === emoji ? { ...r, reacted: target, count: Math.max(0, r.count + (target ? 1 : -1)) } : r
          )
          .filter((r) => r.count > 0);
      }
      setReactions(next);
      onReact?.(emoji, target);
    };

    return (
      <div ref={ref} role="group" aria-label="Reactions" className={cn("flex flex-wrap items-center gap-1.5", className)} {...props}>
        {reactions.map((r) => (
          <EmojiReaction
            key={r.emoji}
            emoji={r.emoji}
            count={r.count}
            reacted={Boolean(r.reacted)}
            size={size}
            onToggle={() => toggle(r.emoji)}
          />
        ))}
        {readOnly ? null : (
          <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
            <PopoverPrimitive.Trigger asChild>
              <button
                type="button"
                aria-label={addLabel}
                title={addLabel}
                className={cn(
                  "inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong text-muted-foreground transition-colors hover:border-solid hover:bg-muted hover:text-foreground data-[state=open]:border-solid data-[state=open]:bg-muted data-[state=open]:text-foreground",
                  size === "sm" ? "h-6 w-8" : "h-7 w-9",
                  focusRing
                )}
              >
                <RiEmotionLine aria-hidden className="size-4" />
                <span aria-hidden className="-ml-0.5 text-xs leading-none font-semibold">+</span>
              </button>
            </PopoverPrimitive.Trigger>
            <PopoverPrimitive.Portal>
              <PopoverPrimitive.Content
                sideOffset={6}
                align="start"
                collisionPadding={8}
                className={cn(
                  "z-50 overflow-hidden rounded-box border border-border bg-popover shadow-lg outline-none",
                  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                  "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2"
                )}
              >
                <EmojiPicker
                  bare
                  autoFocus
                  quickPicks={presets}
                  onSelect={(emoji) => {
                    toggle(emoji, true);
                    setOpen(false);
                  }}
                />
              </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
          </PopoverPrimitive.Root>
        )}
      </div>
    );
  }
);
EmojiReactionBar.displayName = "EmojiReactionBar";
