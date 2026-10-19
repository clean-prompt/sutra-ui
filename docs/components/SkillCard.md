# SkillCard

> Skill list card: name, description, provenance, category, toolset icons and an enable switch.

- Import: `import { SkillCard } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/extensions-catalog` (kit `agent-admin`)
- `data-slot`: `skill-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `skill` (required) | `SkillSummary` |  | The skill to show (name, description, source, enabled state). |
| `onEnabledChange` | `(enabled: boolean) => void` |  | Called with the new state when the user flips the enable switch. |
| `onSelect` | `() => void` |  | Called when the card is pressed. |
| `selected` | `boolean` |  | Marks the card as the selected one in a list. |

## Example (live: `#/components/capabilities/skills` in the playground)

```tsx
import { SkillCard, SkillDetail } from "@sutra/ui/agent-admin";

<div className="grid content-start gap-2">
  {SKILLS.map((s) => (
    <SkillCard key={s.id} skill={s} onEnabledChange={() => {}} />
  ))}
</div>
<SkillDetail
  className="rounded-box border border-border p-4"
  skill={SKILLS[3]!}
  markdown={SKILLS[3]!.markdown}
  frontmatter={SKILLS[3]!.frontmatter}
  scan={{ verdict: "dangerous", policy: "Blocked by policy", policyTone: "block", findings: SCAN_FINDINGS }}
  defaultTab="security"
  onEnabledChange={() => {}}
  onArchive={() => wait(400)}
  onEdit={() => {}}
/>
```

Playground helpers in this snippet (not part of the library): SCAN_FINDINGS, SKILLS, wait.
