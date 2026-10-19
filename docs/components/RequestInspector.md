# RequestInspector

> LLM / API request record: header, param chips and Messages | Request | Response | Raw tabs.

- Import: `import { RequestInspector } from "@sutra/ui"` (or from `@sutra/ui/ops`)
- Source: `packages/ui/src/kits/ops/request-inspector` (kit `ops`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `record` (required) | `RequestLogRecord` |  | The request to inspect (messages, request and response bodies, timing, tokens). |
| `defaultTab` | `RequestInspectorTab` | `"messages"` | Initially active tab when `tab` is not controlled. |
| `hideHeader` | `boolean` |  | Hide the header (when rendered under a table row that already shows it). |
| `locale` | `string` |  | BCP 47 locale used to format numbers and times. |
| `onTabChange` | `(tab: RequestInspectorTab) => void` |  | Called with the tab when the user switches tabs. |
| `tab` | `RequestInspectorTab` |  | Controlled active tab: `messages`, `request`, `response` or `raw`. |

## Example (live: `#/components/monitoring/request-inspector` in the playground)

```tsx
import { RequestInspector } from "@sutra/ui/ops";

<RequestInspector record={fakeRecords[1]} />
```

Playground helpers in this snippet (not part of the library): fakeRecords.
