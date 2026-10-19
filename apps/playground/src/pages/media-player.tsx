import * as React from "react";
import { Button, SegmentedControl } from "@sutra/ui";
import {
  NowPlayingBars,
  PlayPauseButton,
  PlaybackRateMenu,
  RepeatButton,
  SeekBar,
  ShuffleButton,
  SkipButton,
  TrackCycleChip,
  VolumeControl,
  useMediaElement,
  type RepeatMode,
} from "@sutra/ui/kits/media/media-controls";
import { VideoPlayer } from "@sutra/ui/kits/media/video-player";
import { MiniPlayer, NowPlaying, QueueList, TrackRow, usePlayerQueue, type PlayerTrack } from "@sutra/ui/kits/media/audio-player";
import { AlbumCard, EpisodeCard, MediaHero, MediaShelf, PlaylistCard, PosterCard } from "@sutra/ui/kits/media/media-cards";
import { CastPicker, DeviceIcon, type CastDevice } from "@sutra/ui/kits/media/cast-picker";
import {
  RiArchiveLine,
  RiCastLine,
  RiDeleteBinLine,
  RiHardDriveLine,
  RiInformationLine,
  RiLockLine,
  RiMore2Fill,
  RiShareLine,
  RiTimeLine,
  RiWifiOffLine,
} from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Offline demo media: SVG gradients + generated WAV tones              */
/* ------------------------------------------------------------------ */

function art(a: string, b: string, label: string, w = 600, h = 600) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w * 0.72}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.18}" fill="white" fill-opacity="0.22"/><path d="M0 ${h * 0.78} Q${w * 0.35} ${h * 0.55} ${w * 0.6} ${h * 0.74} T${w} ${h * 0.7} V${h} H0Z" fill="black" fill-opacity="0.2"/><text x="${w * 0.07}" y="${h * 0.9}" font-family="system-ui, sans-serif" font-size="${Math.round(Math.min(w, h) * 0.085)}" font-weight="700" fill="white">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const palette: [string, string][] = [
  ["#615fff", "#00b8db"],
  ["#ff6900", "#ff2056"],
  ["#00c950", "#00b8db"],
  ["#8e51ff", "#ff2056"],
  ["#f0b100", "#ff6900"],
  ["#62748e", "#0b0b0d"],
  ["#00bba7", "#615fff"],
  ["#e12afb", "#ff6900"],
];

const NOTE = (n: number) => 220 * Math.pow(2, n / 12);

/** Build a small 8 kHz / 8-bit mono WAV of a looping arpeggio and return a blob URL. */
function toneWav(seconds: number, root: number, pattern: number[]): string {
  const rate = 8000;
  const n = Math.floor(seconds * rate);
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + n, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  str(36, "data");
  v.setUint32(40, n, true);
  const noteLen = Math.floor(rate * 0.3);
  for (let i = 0; i < n; i++) {
    const k = Math.floor(i / noteLen);
    const t = (i % noteLen) / rate;
    const f = NOTE(root + pattern[k % pattern.length]);
    const env = Math.min(1, t * 40) * Math.exp(-t * 5);
    const fade = Math.min(1, (n - i) / (rate * 0.5));
    const s = (Math.sin(2 * Math.PI * f * (i / rate)) * 0.7 + Math.sin(4 * Math.PI * f * (i / rate)) * 0.15) * env * fade;
    v.setUint8(44 + i, Math.max(0, Math.min(255, Math.round(128 + s * 90))));
  }
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

const wavCache = new Map<string, string>();
function wavFor(id: string, seconds: number, root: number, pattern: number[]) {
  if (!wavCache.has(id)) wavCache.set(id, toneWav(seconds, root, pattern));
  return wavCache.get(id)!;
}

function vttUrl(lines: [number, number, string][]) {
  const ts = (s: number) => `00:${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}.000`;
  const body = "WEBVTT\n\n" + lines.map(([a, b, t]) => `${ts(a)} --> ${ts(b)}\n${t}`).join("\n\n");
  return URL.createObjectURL(new Blob([body], { type: "text/vtt" }));
}

const patterns = [
  [0, 4, 7, 12, 7, 4],
  [0, 3, 7, 10, 7, 3],
  [0, 5, 9, 12, 9, 5],
  [0, 7, 12, 16, 12, 7],
  [0, 4, 9, 11, 9, 4],
  [0, 2, 4, 7, 9, 7, 4, 2],
  [0, 3, 5, 7, 10, 7, 5, 3],
  [0, 12, 7, 4, 7, 12],
];

interface DemoTrack extends PlayerTrack {
  seconds: number;
  root: number;
  pattern: number[];
}

const demoTracks: DemoTrack[] = [
  ["Harbor Lights", "Nadia Vale", "Tidal"],
  ["Paper Planes", "The Low Hum", "Altitude"],
  ["Evergreen", "Mossline", "Canopy"],
  ["Neon Rain", "Kaito Sato", "City Sleep"],
  ["Golden Hour", "Ana Ribeiro", "Late Sun"],
  ["Night Drive", "Mossline", "Canopy"],
  ["Static Bloom", "Echo Park", "Signals"],
  ["Last Light", "Nadia Vale", "Tidal"],
].map(([title, artist, album], i) => ({
  id: `t${i + 1}`,
  title,
  artist,
  album,
  artwork: art(palette[i][0], palette[i][1], title),
  seconds: 24 + (i % 4) * 6,
  duration: 24 + (i % 4) * 6,
  root: [0, 3, 5, 7, 2, 10, 8, 12][i],
  pattern: patterns[i],
  explicit: i === 3,
}));

/* ------------------------------------------------------------------ */
/* Shared demo player (real <audio> + useMediaElement + usePlayerQueue) */
/* ------------------------------------------------------------------ */

function useDemoPlayer() {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const queue = usePlayerQueue<DemoTrack>({ items: demoTracks });
  const current = queue.current;
  const src = current ? wavFor(current.id, current.seconds, current.root, current.pattern) : undefined;
  const media = useMediaElement(audioRef, { src });
  const wantPlay = React.useRef(false);
  const [favorites, setFavorites] = React.useState<Set<string>>(() => new Set(["t2"]));
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    if (wantPlay.current) void media.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const playIndex = (id: string) => {
    wantPlay.current = true;
    if (queue.currentId === id) void media.play();
    else queue.jumpTo(id);
  };

  const onEnded = () => {
    const before = queue.currentId;
    const next = queue.next({ auto: true });
    if (!next) {
      wantPlay.current = false;
      return;
    }
    if (next.id === before) {
      media.seek(0);
      void media.play();
    }
  };

  const transport = {
    track: current,
    playing: media.playing,
    buffering: media.waiting,
    currentTime: media.currentTime,
    duration: media.duration || current?.duration || 0,
    buffered: media.buffered,
    onSeek: media.seek,
    onPlayPause: () => {
      wantPlay.current = !media.playing;
      media.toggle();
    },
    onNext: () => {
      wantPlay.current = media.playing || wantPlay.current;
      queue.next();
    },
    onPrevious: () => {
      const item = queue.previous({ currentTime: media.currentTime });
      if (item && item.id === current?.id) media.seek(0);
    },
    hasNext: queue.hasNext,
    hasPrevious: true,
    shuffle: queue.shuffle,
    onShuffleChange: (on: boolean) => void queue.setShuffle(on),
    repeat: queue.repeat,
    onRepeatChange: (r: RepeatMode) => void queue.setRepeat(r),
    volume: media.volume,
    muted: media.muted,
    onVolumeChange: media.setVolume,
    onMutedChange: media.setMuted,
    favorite: current ? favorites.has(current.id) : false,
    onFavoriteChange: (on: boolean) =>
      current &&
      setFavorites((s) => {
        const n = new Set(s);
        if (on) n.add(current.id);
        else n.delete(current.id);
        return n;
      }),
    queuePosition: { index: Math.max(0, queue.position), total: queue.ordered.length },
  };

  const queueList = (
    <QueueList
      items={queue.ordered}
      currentId={queue.currentId}
      playing={media.playing}
      onSelect={(item) => playIndex(item.id)}
      onRemove={(item) => queue.remove(item.id)}
      onReorder={(from, to) => queue.move(from, to)}
    />
  );

  const audio = <audio ref={audioRef} src={src} preload="auto" onEnded={onEnded} />;
  return { queue, media, transport, queueList, audio, expanded, setExpanded, playIndex, favorites };
}

type DemoPlayer = ReturnType<typeof useDemoPlayer>;

/* ------------------------------------------------------------------ */
/* Demos                                                               */
/* ------------------------------------------------------------------ */

const episodes = [
  { id: "e1", title: "The Lighthouse", n: 1, seconds: 60, root: 0, pattern: patterns[0], colors: palette[0] },
  { id: "e2", title: "Undertow", n: 2, seconds: 45, root: 5, pattern: patterns[2], colors: palette[3] },
  { id: "e3", title: "High Tide", n: 3, seconds: 45, root: 7, pattern: patterns[4], colors: palette[6] },
];

function VideoPlayerDemo() {
  const [index, setIndex] = React.useState(0);
  const [broken, setBroken] = React.useState(false);
  const ep = episodes[index];
  const next = episodes[index + 1];
  const subs = React.useMemo(
    () => [
      { id: "en", label: "English", srcLang: "en", src: vttUrl([[1, 6, "The tide is coming in."], [8, 14, "Keep the light burning."], [16, 22, "Someone is out there."]]) },
      { id: "es", label: "Español", srcLang: "es", src: vttUrl([[1, 6, "La marea está subiendo."], [8, 14, "Mantén la luz encendida."], [16, 22, "Hay alguien ahí fuera."]]) },
    ],
    []
  );
  const [audioTrack, setAudioTrack] = React.useState("en");
  const thumbCache = React.useRef(new Map<number, string>());
  const thumbnails = (t: number) => {
    const bucket = Math.floor(t / 5) * 5;
    if (!thumbCache.current.has(bucket)) {
      const mm = `${Math.floor(bucket / 60)}:${String(bucket % 60).padStart(2, "0")}`;
      thumbCache.current.set(bucket, art(ep.colors[0], ep.colors[1], mm, 320, 180));
    }
    return thumbCache.current.get(bucket);
  };
  React.useEffect(() => thumbCache.current.clear(), [index]);

  return (
    <div className="flex w-full flex-col gap-3">
      <VideoPlayer
        className="aspect-[4/3] sm:aspect-video"
        key={ep.id}
        src={broken ? "data:video/mp4;base64,AAAA" : wavFor(ep.id, ep.seconds, ep.root, ep.pattern)}
        poster={art(ep.colors[0], ep.colors[1], `E${ep.n} · ${ep.title}`, 1280, 720)}
        title={ep.title}
        subtitle={`Tidewater · Season 1, Episode ${ep.n}`}
        tracks={subs}
        audioTracks={[
          { id: "en", label: "English 5.1", language: "en" },
          { id: "ja", label: "Japanese", language: "ja" },
        ]}
        audioTrack={audioTrack}
        onAudioTrackChange={setAudioTrack}
        chapters={[{ start: 0, title: "Cold open" }, { start: ep.seconds * 0.35, title: "Act one" }, { start: ep.seconds * 0.7, title: "Act two" }]}
        thumbnails={thumbnails}
        resumeAt={index === 0 ? 12 : undefined}
        onNext={next ? () => setIndex((i) => i + 1) : undefined}
        upNext={next ? { title: `E${next.n} · ${next.title}`, subtitle: "Tidewater", image: art(next.colors[0], next.colors[1], `E${next.n}`, 320, 180) } : undefined}
        onBack={index > 0 ? () => setIndex(0) : undefined}
        topActions={<CastPicker devices={castDevices} onSelect={() => {}} triggerTone="overlay" variant="popover" description={ep.title} />}
      />
      <div className="flex flex-wrap items-center gap-2">
        <DemoLabel className="mr-auto">
          Audio-only demo source (generated WAV) with poster, side-loaded VTT subtitles, chapters, hover thumbnails, resume offer and an up-next countdown. Click the player and try space, ←/→, ↑/↓, m, c, f.
        </DemoLabel>
        <Button size="sm" variant="secondary" onClick={() => setBroken((b) => !b)}>
          {broken ? "Restore source" : "Break source"}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setIndex(0)} disabled={index === 0}>
          Episode 1
        </Button>
      </div>
    </div>
  );
}

function MiniPlayerDemo({ player }: { player: DemoPlayer }) {
  const [layout, setLayout] = React.useState<"auto" | "compact" | "full">("full");
  return (
    <div className="flex w-full flex-col gap-4">
      <SegmentedControl
        size="sm"
        value={layout}
        onValueChange={(v) => setLayout(v as typeof layout)}
        options={[
          { value: "full", label: "Desktop" },
          { value: "compact", label: "Phone" },
          { value: "auto", label: "Auto (by breakpoint)" },
        ]}
        className="max-w-full self-start overflow-x-auto"
      />
      <div className={layout === "compact" ? "w-full max-w-sm overflow-hidden rounded-box border border-border" : "w-full overflow-hidden rounded-box border border-border"}>
        <MiniPlayer
          {...player.transport}
          layout={layout}
          onExpand={() => player.setExpanded(true)}
          onClose={() => {
            player.media.pause();
          }}
          context="Daily mix"
        />
      </div>
      <DemoLabel>Plays real generated tones. On the phone layout, tap the row or swipe up to open the full player.</DemoLabel>
    </div>
  );
}

function ControlsDemo() {
  const [time, setTime] = React.useState(65);
  const [volume, setVolume] = React.useState(0.7);
  const [muted, setMuted] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const [rate, setRate] = React.useState(1);
  const [sub, setSub] = React.useState<string | null>(null);
  const [audioLang, setAudioLang] = React.useState<string | null>("en");
  const [repeat, setRepeat] = React.useState<RepeatMode>("off");
  const langs = [
    { id: "en", label: "English", language: "en" },
    { id: "es", label: "Spanish", language: "es" },
    { id: "fr", label: "French", language: "fr" },
    { id: "de", label: "German", language: "de" },
  ];
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="space-y-2">
        <DemoLabel>SeekBar: buffered layer, chapters, hover preview, click the total to toggle remaining</DemoLabel>
        <SeekBar
          value={time}
          duration={200}
          buffered={[{ start: 0, end: 130 }]}
          onSeek={setTime}
          chapters={[{ start: 0, title: "Intro" }, { start: 50, title: "Verse" }, { start: 120, title: "Chorus" }]}
        />
        <SeekBar value={time} duration={200} onSeek={setTime} showTimes="below" size="sm" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <PlayPauseButton playing={playing} onClick={() => setPlaying((p) => !p)} />
        <PlayPauseButton playing={playing} onClick={() => setPlaying((p) => !p)} variant="primary" size="lg" />
        <SkipButton direction="back" onSkip={(d) => setTime((t) => Math.max(0, t + d))} />
        <SkipButton direction="forward" onSkip={(d) => setTime((t) => Math.min(200, t + d))} />
        <SkipButton direction="forward" seconds={30} onSkip={(d) => setTime((t) => Math.min(200, t + d))} />
        <ShuffleButton />
        <RepeatButton value={repeat} onValueChange={setRepeat} />
        <span className="text-xs text-muted-foreground">repeat: {repeat}</span>
        <NowPlayingBars playing={playing} size="md" />
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <VolumeControl volume={volume} muted={muted} onVolumeChange={setVolume} onMutedChange={setMuted} />
        <VolumeControl volume={volume} muted={muted} onVolumeChange={setVolume} onMutedChange={setMuted} expand="always" />
        <VolumeControl volume={volume} muted={muted} onVolumeChange={setVolume} onMutedChange={setMuted} orientation="vertical" />
        <PlaybackRateMenu rate={rate} onRateChange={setRate} />
        <TrackCycleChip kind="subtitles" tracks={langs.slice(0, 2)} value={sub} onValueChange={setSub} />
        <TrackCycleChip kind="audio" tracks={langs} value={audioLang} onValueChange={setAudioLang} mode="menu" />
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-box bg-black p-3">
        <PlayPauseButton playing={playing} onClick={() => setPlaying((p) => !p)} variant="overlay-ghost" />
        <SkipButton tone="overlay" direction="back" />
        <SkipButton tone="overlay" />
        <VolumeControl tone="overlay" volume={volume} muted={muted} onVolumeChange={setVolume} onMutedChange={setMuted} />
        <div className="flex-1" />
        <TrackCycleChip tone="overlay" kind="subtitles" tracks={langs.slice(0, 2)} value={sub} onValueChange={setSub} />
        <PlaybackRateMenu tone="overlay" rate={rate} onRateChange={setRate} />
      </div>
    </div>
  );
}

const movies = [
  { title: "Arrival", year: 2016, meta: "1h 56m", progress: 64, languages: ["en", "fr"] },
  { title: "Dune", year: 2021, meta: "2h 35m", status: { label: "Transcoding", tone: "warning" as const, pulse: true, icon: <RiTimeLine /> } },
  { title: "Her", year: 2013, meta: "2h 6m", status: { label: "Vault", tone: "primary" as const, icon: <RiLockLine aria-hidden /> } },
  { title: "Moon", year: 2009, meta: "1h 37m", busy: { label: "Moving…", progress: 42 } },
  { title: "Coherence", year: 2013, meta: "1h 29m", disabled: true, status: { label: "NAS-2 offline", tone: "warning" as const, icon: <RiWifiOffLine /> } },
  { title: "Primer", year: 2004, meta: "1h 17m", noImage: true, status: { label: "Archived", tone: "info" as const, icon: <RiArchiveLine /> } },
];

function posterActions(title: string) {
  return [
    { label: "Media info", icon: <RiInformationLine />, onSelect: () => console.info("info", title) },
    { label: "Move to…", icon: <RiHardDriveLine />, onSelect: () => console.info("move", title) },
    { label: "Share", icon: <RiShareLine />, onSelect: () => console.info("share", title) },
    { label: "Delete from disk", icon: <RiDeleteBinLine />, onSelect: () => console.info("delete", title), destructive: true },
  ];
}

function PosterGrid() {
  return (
    <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {movies.map((m, i) => (
        <PosterCard
          key={m.title}
          title={m.title}
          year={m.year}
          meta={m.meta}
          image={m.noImage ? undefined : art(palette[i][0], palette[i][1], m.title, 400, 600)}
          progress={m.progress}
          languages={m.languages}
          status={m.status}
          busy={m.busy}
          disabled={m.disabled}
          disabledReason="Storage node is offline"
          actions={posterActions(m.title)}
          onPlay={() => console.info("play", m.title)}
        />
      ))}
    </div>
  );
}

const castDevices: CastDevice[] = [
  { id: "me", name: "This MacBook", type: "laptop", current: true, description: "Chrome on macOS" },
  { id: "tv", name: "Living room TV", type: "tv", description: "Apple TV 4K" },
  { id: "phone", name: "Vyom's iPhone", type: "phone", description: "Safari on iOS" },
  { id: "spk", name: "Kitchen speaker", type: "speaker", status: "busy", description: "Playing Daily mix" },
  { id: "web", name: "Office browser", type: "browser", description: "Firefox on Linux" },
];

function CastDemo() {
  const [devices, setDevices] = React.useState(castDevices);
  const select = (d: CastDevice) => {
    setDevices((list) => list.map((x) => (x.id === d.id ? { ...x, status: "connecting" } : x.status === "connected" ? { ...x, status: "available" } : x)));
    setTimeout(() => setDevices((list) => list.map((x) => (x.id === d.id ? { ...x, status: "connected" } : x))), 1500);
  };
  const disconnect = (d: CastDevice) => setDevices((list) => list.map((x) => (x.id === d.id ? { ...x, status: "available" } : x)));
  return (
    <div className="flex flex-wrap items-center gap-6">
      <CastPicker devices={devices} onSelect={select} onDisconnect={disconnect} description="Arrival (2016)" trigger={<Button leadingIcon={<RiCastLine />}>Play on…</Button>} />
      <CastPicker variant="popover" devices={devices} onSelect={select} onDisconnect={disconnect} description="Harbor Lights" />
      <CastPicker devices={[]} trigger={<Button variant="secondary">No devices</Button>} />
      <CastPicker devices={[]} loading trigger={<Button variant="secondary">Loading</Button>} />
      <div className="flex items-center gap-3 text-muted-foreground">
        {["tv", "phone", "tablet", "laptop", "desktop", "speaker", "browser", "cast"].map((t) => (
          <DeviceIcon key={t} type={t} label={t} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function MediaPlayerPage() {
  const player = useDemoPlayer();
  const { queue, media } = player;
  return (
    <PageIntro
      eyebrow="Components"
      title="Media"
      description="Players, queues and media cards for a home media server: a custom video player, a persistent mini player with an expanded now-playing sheet, posters, shelves and a cast picker. All demo media is generated locally."
    >
      {player.audio}
      <Demo id="video-player" title="Video player" description="Auto-hiding chrome (3s), big play overlay, buffering, muted-autoplay pill, subtitles/audio chips, speed, PiP/AirPlay/fullscreen when supported, scoped shortcuts, resume and up-next." align="start">
        <VideoPlayerDemo />
      </Demo>

      <Demo id="mini-player" title="Mini player" description="Phone: artwork, title, play/pause and a thin click-to-seek line; tap or swipe up to expand. Desktop: shuffle/prev/play/next/repeat, seek bar, “3 of 12”, volume, favorite, expand and close." align="start">
        <MiniPlayerDemo player={player} />
      </Demo>

      <Demo id="now-playing" title="Now playing" description="Full-screen sheet that slides up; swipe down from the top of its scroll (never from a slider) or press Esc to dismiss. Up Next is a reorderable queue.">
        <Button onClick={() => player.setExpanded(true)}>Open now playing</Button>
        <NowPlaying
          open={player.expanded}
          onOpenChange={player.setExpanded}
          {...player.transport}
          header="Playing from Daily mix"
          onAddToPlaylist={() => console.info("add to playlist")}
          actions={
            <button type="button" aria-label="More" className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
              <RiMore2Fill className="size-[18px]" />
            </button>
          }
          queue={player.queueList}
        />
      </Demo>

      <Demo id="queue-list" title="Queue list" description="Current row marked with equalizer bars; tap to jump, X to remove, drag the handle or press Alt+↑/↓ (announced to screen readers)." align="start">
        <div className="w-full max-w-lg">{player.queueList}</div>
      </Demo>

      <Demo id="track-row" title="Track row" description="Number swaps to a play button on hover; the current row shows bars. Explicit and unavailable states, album column from md, menu slot." align="start">
        <div className="w-full">
          {queue.items.map((t, i) => (
            <TrackRow
              key={t.id}
              track={t}
              index={i + 1}
              current={t.id === queue.currentId}
              playing={t.id === queue.currentId && media.playing}
              onPlay={(track) => player.playIndex(track.id)}
              onPause={() => media.pause()}
              favorite={player.favorites.has(t.id)}
              onFavoriteChange={() => {}}
              menu={
                <button type="button" aria-label={`More options for ${t.title}`} className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent">
                  <RiMore2Fill className="size-4" />
                </button>
              }
            />
          ))}
          <TrackRow track={{ id: "gone", title: "Removed upload", unavailable: true }} index={9} onPlay={() => {}} />
        </div>
      </Demo>

      <Demo id="poster-card" title="Poster card" description="2:3 poster with fallback, hover scrim + play, quiet hover actions (only delete turns red), one status badge, languages, watch progress, blocking “Moving… 42%” and an offline state." align="start">
        <PosterGrid />
      </Demo>

      <Demo id="episode-card" title="Episode card" description="Landscape thumbnail with runtime, episode number, two-line description and progress; stacked or side-by-side." align="start">
        <div className="@container w-full">
          <div className="grid grid-cols-1 w-full gap-6 @2xl:grid-cols-[1fr_1.4fr]">
            <EpisodeCard
              title="The Lighthouse"
              season={1}
              episode={1}
              runtime={3120}
              progress={72}
              description="A storm cuts the island off from the mainland, and the keeper's logbook starts writing itself."
              image={art(palette[0][0], palette[0][1], "E1", 640, 360)}
              actions={posterActions("The Lighthouse").slice(0, 2)}
              onPlay={() => {}}
            />
            <div className="flex flex-col gap-4">
              {episodes.slice(1).map((e, i) => (
                <EpisodeCard
                  key={e.id}
                  orientation="horizontal"
                  title={e.title}
                  season={1}
                  episode={e.n}
                  runtime={2700 + i * 300}
                  description="The crew follows a signal to the old pier, where the water is far too warm for October."
                  image={art(e.colors[0], e.colors[1], `E${e.n}`, 640, 360)}
                  status={i === 1 ? { label: "Queued", icon: <RiTimeLine /> } : undefined}
                  onPlay={() => {}}
                />
              ))}
            </div>
          </div>
        </div>
      </Demo>

      <Demo id="media-shelf" title="Media shelf" description="Scroll-snap row with edge fades, prev/next on hover-capable screens and arrow-key focus movement; the second shelf becomes a grid from lg." align="start">
        <MediaShelf title="Continue watching" description="Pick up where you left off" onSeeAll={() => {}}>
          {Array.from({ length: 12 }, (_, i) => (
            <PosterCard
              key={i}
              title={["Arrival", "Dune", "Her", "Moon", "Primer", "Sunshine"][i % 6] + (i >= 6 ? " II" : "")}
              year={2000 + i}
              image={art(palette[i % 8][0], palette[i % 8][1], `#${i + 1}`, 400, 600)}
              progress={(i * 17) % 90}
              onPlay={() => {}}
            />
          ))}
        </MediaShelf>
        <MediaShelf title="Albums" gridAbove="lg" itemClassName="w-36 sm:w-40">
          {demoTracks.slice(0, 6).map((t) => (
            <AlbumCard key={t.id} title={t.album!} subtitle={t.artist} image={t.artwork} onOpen={() => {}} onPlay={() => player.playIndex(t.id)} />
          ))}
        </MediaShelf>
      </Demo>

      <Demo id="media-hero" title="Media hero" description="Featured banner with backdrop gradients, meta chips, a clamped synopsis and Play / More info." align="start">
        <MediaHero
          eyebrow="Featured"
          title="Tidewater"
          backdrop={art("#0b3b5a", "#00b8db", "", 1600, 700)}
          meta={["2026", "TV-14", "1 season", "Mystery"]}
          synopsis="On a fog-bound island, a lighthouse keeper's apprentice discovers that the tide tables have been predicting more than the water. Each low tide reveals another piece of a ship that sank a hundred years before it was built."
          onPlay={() => {}}
          onMoreInfo={() => {}}
          progress={38}
          progressLabel="E2 · 31 min left"
        />
      </Demo>

      <Demo id="album-card" title="Album & playlist cards" description="Square art with a hover play FAB (always visible on touch and while playing), playlist 2×2 mosaic, artist circle." align="start">
        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <AlbumCard title="Tidal" subtitle="Nadia Vale · 2025" image={demoTracks[0].artwork} onOpen={() => {}} onPlay={() => player.playIndex("t1")} playing={queue.currentId === "t1" && media.playing} />
          <AlbumCard title="Canopy" subtitle="Mossline · 2024" image={demoTracks[2].artwork} onOpen={() => {}} onPlay={() => player.playIndex("t3")} />
          <PlaylistCard title="Daily mix" count={8} artworks={demoTracks.slice(0, 4).map((t) => t.artwork!)} onOpen={() => {}} onPlay={() => player.playIndex("t1")} />
          <PlaylistCard title="Empty playlist" count={0} onOpen={() => {}} />
          <AlbumCard title="Mossline" subtitle="Artist" shape="circle" image={demoTracks[5].artwork} onOpen={() => {}} onPlay={() => player.playIndex("t6")} />
        </div>
      </Demo>

      <Demo id="cast-picker" title="Cast picker" description="Dialog (sheet on phones) or popover listing devices with icons by type, a this-device marker and connecting → connected states.">
        <CastDemo />
      </Demo>

      <Demo id="media-controls" title="Controls" description="Building blocks that work with any HTMLMediaElement via useMediaElement." align="start">
        <ControlsDemo />
      </Demo>
    </PageIntro>
  );
}

export default MediaPlayerPage;
