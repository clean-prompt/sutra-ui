# useZoomPan

> Zoom/pan state + handlers: wheel and pinch zoom around the pointer, drag to pan, double-click reset, keyboard +/−/0/arrows. A one-pointer pan runs on `useDrag`: the offset follows the finger through `--sutra-zoom-x/-y` on the viewport (`contentStyle` reads them; the names are the hook's own so a nested ZoomPan or a Drawer around it never leaks an offset in), so a pan re-renders nothing; `onValueChange` still fires on every move and `state` catches up when the pan ends (`getState()` is always live). A pinch zooms through React state as before.

- Import: `import { useZoomPan } from "@cleanprompt/sutra-ui/mobile"`
- Source: `packages/ui/src/hooks/use-zoom-pan`

## Signature

```ts
useZoomPan({ minScale, maxScale, defaultScale, step, wheelRequiresModifier, panStep, onValueChange, onChange, }?: UseZoomPanOptions): { state: ZoomPanState; dragging: boolean; minScale: number; maxScale: number; setState: (next: ZoomPanState | ((s: ZoomPanState) => ZoomPanState)) => void; zoomTo: (scale: number, cx?: number, cy?: number) => void; zoomIn: () => void; zoomOut: () => void; reset: () => void; …
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultScale` | `number` | `1` | Initial zoom factor. |
| `maxScale` | `number` | `4` | Largest zoom factor. |
| `minScale` | `number` | `0.5` | Smallest zoom factor. |
| `onChange` | `(state: ZoomPanState) => void` |  | **Deprecated.** Use `onValueChange`. Legacy name of `onValueChange`. |
| `onValueChange` | `(state: ZoomPanState) => void` |  | Called with the new scale and offset after every zoom or pan. |
| `panStep` | `number` | `40` | Pixels per arrow-key pan. Default 40. |
| `step` | `number` | `1.25` | Multiplier per zoom step (buttons / keys). Default 1.25. |
| `wheelRequiresModifier` | `boolean` | `false` | Require Ctrl/⌘ for wheel zoom (so the page can still scroll). Default false. |
