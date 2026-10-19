# SettingsShell

> Responsive settings layout: two panes with section nav, or a drill-in list on narrow containers.

- Import: `import { SettingsShell } from "@sutra/ui"` (or from `@sutra/ui/identity`)
- Source: `packages/ui/src/patterns/settings` (patterns)
- `data-slot`: `settings-shell`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `sections` (required) | `SettingsShellSection[]` |  | Sections of the settings area, in order; each has an `id`, a `label` and optional icon. |
| `breakpoint` | `number` | `640` | Container width in px below which `layout="auto"` switches to the drill-in list. |
| `children` | `React.ReactNode \| ((section: string) => React.ReactNode)` |  | Section body: a node, or a render function receiving the open section id. |
| `closeOnEscape` | `boolean` | `true` | Listen for Escape when `onClose` is set. Default true. |
| `defaultSection` | `string \| null` | `null` | Initially open section id when uncontrolled; `null` shows the section list in the stacked layout. |
| `layout` | `SettingsShellLayout` | `"auto"` | `auto` switches to the drill-in list when the container is narrower than `breakpoint`. |
| `navFooter` | `React.ReactNode` |  | Content pinned to the bottom of the desktop nav. |
| `onClose` | `() => void` |  | Shows a close button and closes on Escape (unless a nested layer handled it). |
| `onSectionChange` | `(section: string \| null) => void` |  | Called with the section id the user opened, or `null` when they go back to the list. |
| `section` | `string \| null` |  | Open section id. In the stacked layout `null` shows the section list. |
| `title` | `React.ReactNode` | `"Settings"` | Heading shown above the section list (and as the stacked header). |

## Example (live: `#/components/identity/settings-shell` in the playground)

```tsx
import { Button } from "@sutra/ui/core";
import { RiSettings3Line } from "@sutra/ui/icons";
import { SettingsDialog, SettingsShell } from "@sutra/ui/identity";

<div className="flex justify-end">
  <SettingsDialog
    sections={settingsSections}
    trigger={<Button variant="secondary" leadingIcon={<RiSettings3Line />}>Open in a dialog</Button>}
  >
    {(id) => <SutraSettingsBody section={id} />}
  </SettingsDialog>
</div>
<div className="h-[560px] overflow-hidden rounded-box border border-border">
  <SettingsShell title="Sutra settings" sections={settingsSections} section={section} onSectionChange={setSection} layout="auto">
    {(id) => <SutraSettingsBody section={id} />}
  </SettingsShell>
</div>
{/* Narrow container (drill-in) */}
<div className="mx-auto h-[560px] w-[375px] max-w-full overflow-hidden rounded-[2rem] border-4 border-border-strong">
  <SettingsShell title="Settings" sections={settingsSections} section={mobileSection} onSectionChange={setMobileSection}>
    {(id) => <SutraSettingsBody section={id} />}
  </SettingsShell>
</div>
```

Playground helpers in this snippet (not part of the library): SutraSettingsBody, settingsSections.
