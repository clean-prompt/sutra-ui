# useDrag

> Tracks a pointer drag: the offset follows the finger through CSS variables (no React state per move), with an axis lock, bounds with elastic, a release velocity from a 100 ms window, `settle` with the spring maths and a click guard after a drag. Spread `handlers` on an element, pass `ref` to it. A press that never passes `threshold` is a plain click. The pointer is captured only once the drag starts; `pointercancel`, a lost capture and a disabled hook end it. The hook sets `touch-action` on the element (`pan-y` for horizontal drags, `pan-x` for vertical ones, `none` for both).

- Import: `import { useDrag } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-drag`

## Signature

```ts
useDrag(options?: UseDragOptions): DragBinding
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `allow` | `(event: React.PointerEvent<HTMLElement>) => boolean` |  | Asked on press; return false to ignore the whole gesture (a slider, a text field, a scrolled area). |
| `axis` | `DragAxis` | `"both"` | Axis that follows the finger; the other is left to native scrolling (the hook sets `touch-action`). Default "both". |
| `bounds` | `DragBounds` |  | Limits of the offset. A single-axis drag whose cross axis wins at the start is handed back to the page. |
| `captureOnPress` | `boolean` |  | Relative mode: capture the pointer on the press instead of when the drag starts, and trust that the release will arrive (no `buttons` check). For handles with nothing clickable inside, where a press is never a click (a window title bar, a resize grip). |
| `elastic` | `Elastic` |  | Resistance beyond `bounds`: a 0..1 factor of the overshoot (0 = hard stop) or a curve. Default 0. |
| `enabled` | `boolean` | `true` |  |
| `lockAxis` | `boolean` |  | With `axis="both"`: decide the axis after `lockDistance` px and follow it only. Needs `touch-action: none`. |
| `lockDistance` | `number` |  | Distance used by `lockAxis`. Default 8. |
| `mode` | `"relative" \| "absolute"` |  | "relative" (default): the offset is the press offset plus the pointer travel. "absolute": the offset IS the pointer position in the track (a seek bar, a slider rail): the press itself is the first position (`onStart` then `onMove` run on it), the pointer is captured at once, there is no threshold, axis lock, bounds or buttons check, and `touch-action` is `none`. |
| `mouse` | `boolean` |  | Also drag with the mouse (touch and pen always count). Default true. |
| `onDown` | `(event: React.PointerEvent<HTMLElement>) => void` |  | Called on every accepted press, before any travel (stop an inertia loop here). |
| `onEnd` | `(info: DragInfo, cancelled: boolean) => void` |  | Release (or `cancelled` for `pointercancel` and a lost capture): decide to commit or call `settle`. |
| `onMove` | `(info: DragInfo) => void` |  | Runs on every pointer move (pointer events are frame-aligned by the browser, so it is already once per frame). |
| `onPosition` | `(x: number, y: number) => void` |  | Runs whenever the offset changes (drag, settle frame, `set`), for consumers that write a style of their own. |
| `onStart` | `(info: DragInfo) => void` |  |  |
| `rtl` | `boolean` |  | Absolute mode: measure `fx` from the right edge (pass `useDirection() === "rtl"`). |
| `scale` | `number` |  | Relative mode: the dragged layer sits inside a parent scaled by this factor (a zoomed image), so the offset is travel / scale. Default 1. |
| `shouldStart` | `(info: DragInfo, event: React.PointerEvent<HTMLElement>) => boolean` |  | Asked once when the travel passes the threshold; return false to hand the gesture back. |
| `threshold` | `number` |  | Pointer travel (px) before a press becomes a drag; below it taps and clicks go through. Default 4. |
| `trackRef` | `React.RefObject<HTMLElement \| null>` |  | Absolute mode: the element whose rectangle is the track. Default: the element the hook is bound to. |
