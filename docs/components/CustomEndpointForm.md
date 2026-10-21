# CustomEndpointForm

> Form for an OpenAI/Anthropic-compatible endpoint with headers, key and a "Test connection" probe.

- Import: `import { CustomEndpointForm } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/llm-providers-endpoint` (kit `agent-admin`)
- `data-slot`: `custom-endpoint-form`, `endpoint-test-result`
- Also accepts the props of HTMLAttributes, FormHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValues` | `Partial<CustomEndpointValues>` |  | Initial field values (base URL, key, model id and so on). |
| `onCancel` | `() => void` |  | Called when the user presses Cancel; the button is hidden when unset. |
| `onSave` | `(values: CustomEndpointValues) => void` |  | Called with the valid values when the user submits the form. |
| `onTest` | `(values: CustomEndpointValues) => Promise<CustomEndpointTestResult>` |  | Tests the endpoint with the current values and resolves with the result; shows a Test button when set. |
| `submitLabel` | `string` | `"Save endpoint"` | Label of the submit button. |

## Example (live: `#/components/providers/custom-endpoint` in the playground)

```tsx
import * as React from "react";
import { CustomEndpointForm } from "@sutra/ui/agent-admin";

function CustomEndpointDemo() {
  const [saved, setSaved] = React.useState<string | null>(null);
  return (
    <div className="w-full max-w-xl space-y-2">
      <CustomEndpointForm
        defaultValues={{ name: "Team Gateway", baseUrl: "https://llm.example.internal/v1", headers: [{ key: "X-Team", value: "platform" }] }}
        onTest={async (v) => {
          await sleep(900);
          if (v.baseUrl.includes("fail")) return { ok: false, error: "ECONNREFUSED: nothing is listening on that port." };
          return { ok: true, latencyMs: 120 + Math.random() * 120, models: ["gw-large", "gw-small", "gw-embed", "gw-vision", "gw-code"] };
        }}
        onSave={(v) => setSaved(`${v.name} → ${v.baseUrl} (${v.apiMode})`)}
      />
      {/* {saved ? `Saved: ${saved}` : "Put “fail” in the URL to see an error."} */}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): sleep.
