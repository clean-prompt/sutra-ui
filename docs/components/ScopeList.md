# ScopeList

> Requested permissions as readable rows with icons, risk and optional toggles.

- Import: `import { ScopeList } from "@sutra/ui"` (or from `@sutra/ui/security`)
- Source: `packages/ui/src/kits/identity/consent` (kit `identity`)
- `data-slot`: `scope-list`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `scopes` (required) | `ScopeInput[]` |  | Requested scopes: id strings (`read:orders`) or objects with constraints. |
| `defaultValue` | `string[]` | `[]` | Initially granted optional ids when `value` is not controlled. |
| `definitions` | `Record<string, ScopeDefinition>` |  | Extra or overriding scope definitions (label, description, icon, risk), merged over the built-in set. |
| `disabled` | `boolean` |  | Disables every toggle. |
| `held` | `string[]` | `[]` | Ids already granted earlier; shown with an "Already granted" tag. |
| `labels` | `Record<string, string>` |  | Untrusted app-supplied labels by scope id, used only when no definition matches. |
| `onValueChange` | `(value: string[]) => void` |  | Called with the granted optional ids when the user toggles one. |
| `optional` | `string[]` | `[]` | Ids the user may toggle. Others are required (always granted). |
| `showId` | `boolean` | `true` | Show the raw scope id under each label. Default true. |
| `showRisk` | `boolean` | `true` | Show the risk badge on medium/high scopes. Default true. |
| `value` | `string[]` |  | Granted optional scope ids (controlled). |

## Example (live: `#/components/security/scope-list` in the playground)

```tsx
import { ScopeList, formatScope } from "@sutra/ui/security";

<div className="@container w-full">
  <div className="grid grid-cols-1 w-full gap-6 @2xl:grid-cols-2">
    <ScopeList
      scopes={["login", "profile", "read:contacts", "write:calendar", "delete:files", { id: "pay", max: "100EUR" }, "custom:export"]}
      optional={["profile", "write:calendar"]}
      held={["read:contacts"]}
      labels={{ "custom:export": "Export your data (app-supplied label)" }}
    />
    <ul className="grid content-start gap-1 font-mono text-xs text-muted-foreground">
      {["login", "read:orders", "write:notes", "admin:billing", "agent:summarise", "vc:age_over_18"].map((s) => {
        const f = formatScope(s);
        return (
          <li key={s}>
            {s} → <span className="text-foreground">{f.label}</span> · {f.risk}
            {f.locked ? " · locked" : ""}
          </li>
        );
      })}
    </ul>
  </div>
</div>
```
