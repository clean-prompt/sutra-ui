# Combobox

> Searchable select built on Popover + cmdk, with multi-select chips and creatable options.

- Import: `import { Combobox } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/combobox` (primitives)
- `data-slot`: `combobox-announcer`, `combobox-clear`, `combobox-empty`, `combobox-loading`

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `options` (required) | `ComboboxOption[]` |  | Options to choose from; each has a `value`, a `label` and optional description, icon, group and disabled flag. |
| `aria-describedby` | `string` |  | Id(s) of the element(s) that describe the trigger (hint, error text). |
| `aria-invalid` | `boolean` |  | Overrides the invalid state announced to assistive technology; normally set `invalid` instead. |
| `aria-label` | `string` |  | Accessible name of the trigger when there is no visible label. |
| `aria-labelledby` | `string` |  | Id(s) of the element(s) that label the trigger. |
| `className` | `string` |  | Classes for the trigger button. |
| `clearable` | `boolean` | `false` | Show a clear button while something is selected; Delete also clears (Backspace too, when single). |
| `clearLabel` | `string` | `"Clear"` | Accessible name of the clear button. Default "Clear". |
| `confirmBackspace` | `boolean` | `false` | Multiple only: Backspace on the focused field first marks the last chip (announced politely) and a second press removes it, so a held key cannot empty the field. Default false: Backspace removes the last chip at once. |
| `contentClassName` | `string` |  | Classes for the popover list. |
| `creatable` | `boolean` | `false` | Offer "Create …" when the query matches no option. |
| `createLabel` | `(query: string) => React.ReactNode` | `(q) => ( <> Create <span className="font-medium text-foreground">“{q}”</span> </> )` | Builds the "Create …" row label from the current query; the default reads `Create "query"`. |
| `defaultInputValue` | `string` | `""` | Initial search text when uncontrolled. |
| `defaultOpen` | `boolean` | `false` | Initial open state when uncontrolled. |
| `defaultValue` | `string \| string[]` |  | Initially selected value when uncontrolled. |
| `disabled` | `boolean` |  | Disables the trigger so the list cannot be opened. |
| `emptyState` | `React.ReactNode` |  | Shown when the query matches nothing. Default "No results". |
| `emptyText` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Legacy name of `emptyState`. |
| `filter` | `false \| ((option: ComboboxOption, query: string) => boolean)` |  | How options are matched against the search text. Omit for the built-in fuzzy match. `false` shows `options` exactly as given (server-side search: pass the results for the current `inputValue`). A function keeps the options it accepts. |
| `id` | `string` |  | `id` of the trigger, so a `<label htmlFor>` or `Field` can point at it. |
| `inputValue` | `string` |  | The search text, to control it (for async search). Cleared to "" when the list closes. |
| `invalid` | `boolean` |  | Marks the combobox invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `loading` | `boolean` | `false` | Options are being fetched: shows a loading row (or a spinner beside the search text while options are on screen). |
| `loadingState` | `React.ReactNode` |  | Text of the loading row. Default "Loading…". |
| `maxChips` | `number` | `3` | Max chips shown in the trigger before collapsing into "+N" (multiple only). |
| `multiple` | `false \| true` | `false` | Single-select mode (the default); `value` and `onValueChange` then work with one string. |
| `onCreate` | `(query: string) => string \| void` |  | Called with the query when the user picks "Create …". The new value is selected automatically: return a different string (e.g. a generated id) to select that instead. |
| `onInputValueChange` | `(value: string) => void` |  | Called as the search text changes. Debounce the fetch on your side (see `useDebouncedValue`). |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the list opens or closes (selection, Escape, outside click). |
| `onValueChange` | `((value: string) => void) \| ((value: string[]) => void)` |  | Called with the option `value` the user picked (or the created value). |
| `open` | `boolean` |  | Controlled open state of the list. Use with `onOpenChange`. |
| `openOnFocus` | `boolean` | `false` | Open the list when the field gets keyboard focus (pointer clicks keep their normal toggle). |
| `placeholder` | `string` | `"Select…"` | Trigger text while nothing is selected. |
| `required` | `boolean` |  | Marks the combobox required. Inherited from a surrounding `Field` when omitted. |
| `searchable` | `boolean` | `true` | Hide the search input. |
| `searchPlaceholder` | `string` | `"Search…"` | Placeholder of the search input inside the list. |
| `size` | `Size` | `"md"` | Control height and text size; match the neighbouring inputs. |
| `value` | `string \| string[]` |  | Controlled selected value (an option `value`); an empty string means nothing selected. |
| `variant` | `"outline" \| "filled"` | `"outline"` | `outline` (default) is the bordered box; `filled` is a tinted surface with a hidden border. |

## Variants

- `size`: `sm`, `md`, `lg` (default "md")
- `multiple`: `true`, `false` (default false)
- `variant`: `outline`, `filled` (default "outline")

## Notes

**When to use:** A searchable select for long lists: an input-like trigger and a popover with a search box. Single or `multiple` (chips), `creatable`, async through `filter`, `inputValue` and `loading`.

**Use instead when:**
- `Select`: a short list that needs no search
- `RadioGroup`: every option should stay visible
- `TagInput`: free-form tags with no fixed list
- `SegmentedControl`: two to four options that switch a view

### Keyboard

| Key | Action |
|---|---|
| Enter, Space, ArrowDown | On the trigger: open the list and focus the search box |
| ArrowDown, ArrowUp | In the list: move the highlighted option, looping at the ends. Ctrl+N, J, P and K do the same |
| Home, End | Highlight the first or last option |
| Enter | Pick the highlighted option (or the "Create" row). Single mode closes; `multiple` stays open and toggles |
| Escape | Close and return focus to the trigger |
| Backspace | On the trigger, `multiple`: remove the last chip. With `confirmBackspace` the first press marks it and the second removes it; a held key never confirms. With `clearable` and single mode it clears the value |
| Delete | On the trigger with `clearable`: clear every selection |
| Tab | Leaves the trigger; the chip remove buttons and the clear button are not tab stops (`tabIndex` -1) |

`openOnFocus` also opens the list on keyboard focus, not on a pointer press or when focus returns. The list is vertical, so RTL swaps no keys.

### Screen readers

- The trigger is a `div role="combobox"` with `aria-haspopup="listbox"`, `aria-expanded`, and `aria-required`, `aria-invalid` and `aria-disabled` when set. It is named by `aria-label`, `aria-labelledby` or a surrounding `FieldLabel` (a `<label htmlFor>` cannot name a div, so the wrapper points at the label id). The selected labels are its text.
- The popover is a `role="dialog"` with the same name, or the `placeholder` as a fallback. Inside, the search box is a combobox with `aria-activedescendant`, the list is a `listbox` (`aria-multiselectable` when `multiple`, `aria-busy` while `loading`) and each row is an `option`.
- Chosen options carry `aria-checked="true"` (and `data-checked`, for styling): in `multiple` mode every option is `true` or `false`, in single mode only the chosen one has it. The check icon is decoration. In cmdk `aria-selected` means highlighted, not chosen.
- The empty message sits in a polite live region next to a hidden listbox. The `confirmBackspace` prompt ("Press Backspace again to remove ...") is a polite live region on the trigger. The loading text is not a live region.
- Chip remove buttons are named "Remove" plus the label; the clear button uses `clearLabel`.

### Reduced motion

The popover fades and zooms in with `animate-in`; the net removes the movement. A chip you just added eases in only under `motion-safe:`, so it appears at once with reduced motion. The loading spinner keeps turning.

### Server rendering

Server render: same markup as the client. The trigger renders on the server with its selected labels or placeholder (labels come from `options`). The popover is portalled, so with `open` or `defaultOpen` the list appears after hydration.

### Slots

- `combobox-clear`: the clear button
- `combobox-empty`: the polite region that holds the empty message
- `combobox-loading`: the loading row shown while `loading` and no option is visible
- `combobox-announcer`: the screen reader prompt, rendered only with `confirmBackspace`

### Gotchas

- Single mode: `value` is a string and `""` means nothing selected; `multiple` takes and returns `string[]`. Picking the selected option again does not unselect it (and does not call `onValueChange`); use `clearable`.
- There is no `name` prop and no hidden input, so the value does not post with a native form: read it from `onValueChange`.
- `filter={false}` shows `options` exactly as given, for server search: drive it with `inputValue` and `onInputValueChange` (the text clears when the list closes) and debounce the fetch yourself. A selected value keeps its label after it leaves the results.
- `creatable` adds a "Create" row only when the query matches no label (case-insensitive) and `loading` is off; the string `onCreate` returns is selected instead of the typed text. `emptyText` is a deprecated alias of `emptyState`.

## Example

```tsx
import * as React from "react";
import { Combobox, Field, FieldLabel } from "@sutra/ui";

const countries = [
  { value: "de", label: "Germany" },
  { value: "jp", label: "Japan" },
  { value: "kr", label: "South Korea" },
  { value: "us", label: "United States" },
];

export function Example() {
  const [country, setCountry] = React.useState("");
  return (
    <Field>
      <FieldLabel>Country</FieldLabel>
      <Combobox
        options={countries}
        value={country}
        onValueChange={setCountry}
        placeholder="Select a country"
        searchPlaceholder="Search countries"
        emptyState="No country found"
        clearable
      />
    </Field>
  );
}
```
