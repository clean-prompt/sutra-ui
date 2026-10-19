---
component: Combobox
module: primitives/combobox
use: A searchable select for long lists: an input-like trigger and a popover with a search box. Single or `multiple` (chips), `creatable`, async through `filter`, `inputValue` and `loading`.
instead: Select = a short list that needs no search; RadioGroup = every option should stay visible; TagInput = free-form tags with no fixed list; SegmentedControl = two to four options that switch a view
server: ssr-safe
---

## Keyboard
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

## Screen readers
- The trigger is a `div role="combobox"` with `aria-haspopup="listbox"`, `aria-expanded`, and `aria-required`, `aria-invalid` and `aria-disabled` when set. It is named by `aria-label`, `aria-labelledby` or a surrounding `FieldLabel` (a `<label htmlFor>` cannot name a div, so the wrapper points at the label id). The selected labels are its text.
- The popover is a `role="dialog"` with the same name, or the `placeholder` as a fallback. Inside, the search box is a combobox with `aria-activedescendant`, the list is a `listbox` (`aria-multiselectable` when `multiple`, `aria-busy` while `loading`) and each row is an `option`.
- Chosen options carry `aria-checked="true"` (and `data-checked`, for styling): in `multiple` mode every option is `true` or `false`, in single mode only the chosen one has it. The check icon is decoration. In cmdk `aria-selected` means highlighted, not chosen.
- The empty message sits in a polite live region next to a hidden listbox. The `confirmBackspace` prompt ("Press Backspace again to remove ...") is a polite live region on the trigger. The loading text is not a live region.
- Chip remove buttons are named "Remove" plus the label; the clear button uses `clearLabel`.

## Reduced motion
The popover fades and zooms in with `animate-in`; the net removes the movement. A chip you just added eases in only under `motion-safe:`, so it appears at once with reduced motion. The loading spinner keeps turning.

## Server rendering
The trigger renders on the server with its selected labels or placeholder (labels come from `options`). The popover is portalled, so with `open` or `defaultOpen` the list appears after hydration.

## Slots
- `combobox-clear`: the clear button
- `combobox-empty`: the polite region that holds the empty message
- `combobox-loading`: the loading row shown while `loading` and no option is visible
- `combobox-announcer`: the screen reader prompt, rendered only with `confirmBackspace`

## Gotchas
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
