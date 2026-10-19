# useAudioLevel

> Live RMS input level (0..1) of a MediaStream, sampled each animation frame. Returns 0 without a stream.

- Import: `import { useAudioLevel } from "@sutra/ui/voice"`
- Source: `packages/ui/src/kits/voice/voice`

## Signature

```ts
useAudioLevel(stream: MediaStream | null | undefined, { smoothing, gain }?: { smoothing?: number | undefined; gain?: number | undefined; }): number
```

## Example (live: `#/components/voice/audio-level` in the playground)

```tsx
import * as React from "react";
import { AudioLevelMeter } from "@sutra/ui/voice";

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
    <>
      <AudioLevelMeter level={level} size="sm" />
      <AudioLevelMeter level={level} />
      <AudioLevelMeter level={level} size="lg" bars={7} tone="success" />
      <AudioLevelMeter level={level} orientation="vertical" bars={8} className="h-16" />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Animate
      </label>
      <input type="range" min={0} max={1} step={0.01} value={level} aria-label="Level" onChange={(e) => { setAuto(false); setLevel(Number(e.target.value)); }} />
    </>
  );
}
```
