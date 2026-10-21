# PasswordStrength

> Segmented strength meter with a label and live requirement checklist.

- Import: `import { PasswordStrength } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/patterns/password-strength` (patterns)
- `data-slot`: `password-strength`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `password` (required) | `string` |  | The password to rate; it is scored locally and never sent anywhere. |
| `labels` | `[string, string, string, string]` |  | Custom labels for scores 1–4. |
| `requirements` | `PasswordRequirement[]` | `defaultPasswordRequirements` | Checklist items; pass `[]` to hide the checklist. |
| `score` | `0 \| 1 \| 2 \| 3 \| 4` |  | Override the computed score (0–4). |
| `showLabel` | `boolean` | `true` | Shows the strength word (Weak, Fair, ...) beside the meter. |

## Example (live: `#/components/forms/password-strength` in the playground)

```tsx
import * as React from "react";
import { Field, FieldLabel, PasswordInput, PasswordStrength } from "@sutra/ui/forms";

function PasswordStrengthDemo() {
  const [password, setPassword] = React.useState("Sutra");
  return (
    <div className="w-full max-w-sm">
      <Field>
        <FieldLabel>New password</FieldLabel>
        <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <PasswordStrength password={password} />
      </Field>
    </div>
  );
}
```
