# usePointerVars

> Publishes the pointer over an element as CSS variables, for the `spotlight`, `tilt` and `magnetic` utilities. Pass the returned ref to a box that does not itself move (tilt and magnetic go on a child, or the box would shift under the pointer). While a mouse or pen is over it, or inside its magnetic `radius`, it sets `data-pointer="active"` and `--px --py` (px), `--tx --ty` (-1..1) and `--pull-x --pull-y` (px), once per frame; on leave it removes them all, and the CSS transition settles back. Touch, a primary pointer that cannot hover, and reduced motion get the resting state: no listeners, nothing written. The effect is decoration and must not carry information.

- Import: `import { usePointerVars } from "@cleanprompt/sutra-ui/tokens"`
- Source: `packages/ui/src/hooks/use-pointer-vars`

## Signature

```ts
usePointerVars<T extends HTMLElement = HTMLElement>({ radius, strength, enabled }?: UsePointerVarsOptions): RefObject<T | null>
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Turn the hook off. Default true. |
| `radius` | `number` | `0` | Magnetic reach in px beyond the box. 0 (default): only while the pointer is over the element. |
| `strength` | `number` | `0.35` | How much of the pointer's offset from the centre the magnetic pull follows (0..1). Default 0.35. |
