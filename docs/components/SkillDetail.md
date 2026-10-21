# SkillDetail

> Skill detail: header with actions, SKILL.md preview, frontmatter and security scan tabs.

- Import: `import { SkillDetail } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/extensions-catalog-skill` (kit `agent-admin`)
- `data-slot`: `skill-detail`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `skill` (required) | `SkillSummary` |  | The skill to show (name, description, source, enabled state). |
| `defaultTab` | `"preview" \| "frontmatter" \| "security"` | `"preview"` | Initially active tab when `tab` is not controlled. |
| `frontmatter` | `Record<string, unknown>` |  | Parsed SKILL.md frontmatter, shown as key/value rows on the Frontmatter tab. |
| `markdown` | `string` |  | SKILL.md body (markdown). |
| `onArchive` | `() => void \| Promise<void>` |  | Called after the user confirms archiving the skill; the button is hidden when unset. |
| `onClose` | `() => void` |  | Called when the user closes the detail view; the close button is hidden when unset. |
| `onEdit` | `() => void` |  | Called when the user presses Edit; the button is hidden when unset. |
| `onEnabledChange` | `(enabled: boolean) => void` |  | Called with the new state when the user flips the enable switch. |
| `onTabChange` | `(tab: string) => void` |  | Called with the tab id when the user switches tabs. |
| `scan` | `SecurityScanVerdictProps` |  | Security scan result for the skill; props of `SecurityScanVerdict`, shown on the Security tab. |
| `tab` | `string` |  | Controlled active tab (`preview`, `frontmatter` or `security`). |

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
