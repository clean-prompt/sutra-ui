# useField

> Wires a form control to the nearest `Field`: id, aria-describedby, aria-invalid, disabled and required. Explicit props always win over the field context.

- Import: `import { useField } from "@cleanprompt/sutra-ui/forms"`
- Source: `packages/ui/src/primitives/field`

## Signature

```ts
useField(props?: UseFieldProps): UseFieldReturn
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `aria-describedby` | `string` |  | Extra description id(s), joined with the ids of the surrounding `Field` (description, hint, error). |
| `aria-invalid` | `React.AriaAttributes["aria-invalid"]` |  | Explicit `aria-invalid`; a true value marks the control invalid. |
| `disabled` | `boolean` |  | Disables the control; an explicit value wins over the surrounding `Field`. |
| `id` | `string` |  | Control id; defaults to the id of the surrounding `Field`. |
| `invalid` | `boolean` |  | Marks the control invalid; an explicit value (or a true `aria-invalid`) wins over the surrounding `Field`. |
| `required` | `boolean` |  | Marks the control required; an explicit value wins over the surrounding `Field`. |
