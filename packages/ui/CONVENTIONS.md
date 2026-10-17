# Sutra UI — component conventions

Stack: **React 19 + TypeScript (strict) + Tailwind CSS v4 + Radix UI** (`radix-ui` unified package), `class-variance-authority`, `@remixicon/react` icons. Built with tsup; there is no path alias at build time, so **use relative imports**.

## Files
- One component family per file in `src/components/<kebab-name>.tsx` (blocks in `src/blocks/`, assets in `src/assets/`).
- Named exports only, no default exports. Export prop types (`export interface XProps`).
- Never create or edit `src/index.ts`. It is assembled from the files.
- Export names must be globally unique across the package. Prefix generic sub-parts with the family (`TableRow`, `ChatMessageAvatar`).

## Shared building blocks (import, do not re-implement)
- `cn`, `focusRing`, `invalidRing`, `type Size` from `../lib/cn`
- `Button`, `buttonVariants` from `./button` (variants: primary, secondary, tertiary, soft, ghost, outline, destructive, destructive-soft, inverse, link; sizes: xs, sm, md, lg, xl, icon-xs, icon-sm, icon, icon-lg, icon-xl; props `loading`, `leadingIcon`, `trailingIcon`, `asChild`)
- `Spinner` from `./spinner` (variants ring | dots | bars | pulse; sizes xs–xl)
- `Label` from `./label` (`required`, `hint`)
- `Heading`, `Text`, `Eyebrow`, `Kbd`, `InlineCode` from `./typography`
- `Container`, `Grid`, `GridItem`, `Stack`, `HStack`, `Card` from `./layout`
- `useControllableState` from `../hooks/use-controllable-state`; `useCopy` from `../hooks/use-copy`
- Radix: `import { Dialog as DialogPrimitive } from "radix-ui"` (the namespaces are Accordion, AlertDialog, AspectRatio, Avatar, Checkbox, Collapsible, ContextMenu, Dialog, DropdownMenu, HoverCard, Label, NavigationMenu, Popover, Progress, RadioGroup, ScrollArea, Select, Separator, Slider, Slot (`Slot.Root`), Switch, Tabs, Toast, Toggle, ToggleGroup, Tooltip, VisuallyHidden …)
- Icons: `import { RiCloseLine } from "@remixicon/react"`. Icons inherit `currentColor`; size them with `size-4` etc.

## Styling tokens (Tailwind utilities from `src/styles/sutra.css`)
- Surfaces: `bg-background`, `bg-card`, `bg-popover`, `bg-subtle`, `bg-muted`, `bg-accent` (hover rows), `bg-secondary`, `bg-inverse text-inverse-foreground`, `bg-overlay` (modal scrim), `glass`
- Text: `text-foreground`, `text-muted-foreground`, `text-primary`, `*-foreground` pairs
- Borders: `border-border`, `border-border-strong`, `border-input`, `ring-ring`
- Brand: `bg-primary`, `hover:bg-primary-hover`, `text-primary-foreground`, `bg-primary-soft text-primary-soft-foreground`, plus `brand-50…950` for gradients
- Status: `success | warning | destructive | info`, each with `-foreground`, `-soft`, `-soft-foreground`
- Radius: `rounded-control` for buttons, inputs, chips and toggles (follows the pill/square theme switch), `rounded-box` for cards, panels and popovers, plus `rounded-xs … rounded-2xl`. Use `rounded-full` only for things that are always circular (avatars, dots, switch thumbs).
- Shadows: `shadow-xs … shadow-3xl`, `shadow-inner-highlight`. Popovers/menus: `shadow-lg`, dialogs `shadow-2xl`.
- Type: `text-display-xs … text-display-2xl`, `text-2xs`, `font-mono`.
- Animations: `tw-animate-css` is loaded (`data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 zoom-in-95 slide-in-from-top-2` …), plus `animate-accordion-down/up`, `animate-collapsible-down/up`, `animate-shimmer`, `animate-dot-bounce`, `animate-bar-scale`, `animate-indeterminate`, `animate-mesh`, `animate-caret-blink`, and the utilities `text-shimmer`, `scrollbar-thin`, `scrollbar-none`, `bg-dots`, `bg-grid`.
- Dark mode is handled by the tokens. Avoid `dark:` overrides unless necessary.

## API shape
- `React.forwardRef` + `displayName` for DOM-rendering components; spread `...props` onto the root; accept `className` and merge it last with `cn()`.
- Variants through `cva`; export the `xxxVariants` when they are useful elsewhere.
- Sizes are `"sm" | "md" | "lg"` (default `md`). Control heights: sm h-8, md h-9, lg h-10.
- Controlled + uncontrolled support (`value`/`defaultValue`/`onValueChange`), following Radix naming.
- Inputs: `border border-input bg-background shadow-xs rounded-control`, `focusRing`, `invalidRing`, `disabled:opacity-50 disabled:cursor-not-allowed`, placeholder `placeholder:text-muted-foreground`.
- Accessibility: correct roles and aria attributes, keyboard support, `aria-label` on icon-only buttons, and `sr-only` text where needed.
- Floating content goes through a Portal with `z-50`. Use `sideOffset={6}` by default.
- Compound components (`Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`) are preferred over giant prop objects. A convenience "data-driven" wrapper is welcome when it helps (e.g. `items` prop).
- Comment density: a one-line JSDoc on each exported component; no noisy inline comments.
