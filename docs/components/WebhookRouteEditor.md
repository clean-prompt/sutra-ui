# WebhookRouteEditor

> Create or edit a webhook route: name, URL, show-once signing secret with regenerate, events, delivery, test send and recent deliveries.

- Import: `import { WebhookRouteEditor } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/webhooks` (kit `agent-admin`)
- `data-slot`: `webhook-secret-masked`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `events` (required) | `(string \| NameCheckboxOption)[]` |  | Events a sender can subscribe to. |
| `deliveryPlatforms` | `DeliveryPlatform[]` |  | Delivery targets to offer; defaults to the built-in platforms. |
| `deliveryStatus` | `Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>` |  | Delivery state per platform, shown beside the delivery targets. |
| `newSecret` | `string \| null` |  | Freshly issued signing secret: shown once, then masked. |
| `onCancel` | `() => void` |  | Called when the user presses Cancel; the button is hidden when unset. |
| `onConfigureChannels` | `() => void` |  | Called when the user presses Channels in the home-channel warning; the button is hidden when unset. |
| `onRedeliver` | `(delivery: WebhookDelivery) => void` |  | Called with a past delivery when the user presses Redeliver on it; the action is hidden when unset. |
| `onRegenerateSecret` | `() => string \| Promise<string>` |  | Issue a new secret (after confirmation); the result is shown once. |
| `onSave` | `(draft: WebhookRouteDraft) => void \| Promise<void>` |  | Called with the validated route draft; may return a promise, and the save button shows a spinner until it settles. |
| `onTestSend` | `() => WebhookTestResult \| Promise<WebhookTestResult>` |  | Sends a test event and resolves with its result; shows a "Send test" button when set. |
| `route` | `WebhookRoute` |  | Existing route; omit to create one. |

## Example (live: `#/components/automation/webhooks` in the playground)

```tsx
import * as React from "react";
import { WebhookRouteEditor, WebhookRouteList } from "@cleanprompt/sutra-ui/agent-admin";

function WebhooksDemo() {
  const [routes, setRoutes] = React.useState(INITIAL_ROUTES);
  const [selectedId, setSelectedId] = React.useState<string | "new">("gh");
  const [newSecret, setNewSecret] = React.useState<string | null>(null);
  const selected = selectedId === "new" ? undefined : routes.find((r) => r.id === selectedId);
  return (
    <div className="grid grid-cols-1 w-full gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <WebhookRouteList
        routes={routes}
        selectedId={selectedId === "new" ? null : selectedId}
        onSelect={(r) => {
          setSelectedId(r.id);
          setNewSecret(null);
        }}
        onToggleEnabled={(r, enabled) => setRoutes((rs) => rs.map((x) => (x.id === r.id ? { ...x, enabled } : x)))}
        onCreate={() => {
          setSelectedId("new");
          setNewSecret(null);
        }}
        deliveryStatus={DELIVERY_STATUS}
      />
      <WebhookRouteEditor
        key={selected?.id ?? "new"}
        className="rounded-box border border-border p-4"
        route={selected}
        events={EVENTS}
        newSecret={newSecret}
        deliveryStatus={DELIVERY_STATUS}
        onSave={(draft) => {
          if (draft.id) {
            setRoutes((rs) => rs.map((r) => (r.id === draft.id ? { ...r, ...draft } : r)));
            return;
          }
          const id = `wh-${Date.now()}`;
          const delivery: DeliveryTarget = draft.delivery;
          setRoutes((rs) => [...rs, { ...draft, delivery, id, url: `https://hooks.sutra.local/w/${id}`, secretHint: "c0de", deliveries: [] }]);
          setSelectedId(id);
          setNewSecret(`whsec_demo_${Math.random().toString(36).slice(2, 14)}c0de`);
        }}
        onRegenerateSecret={() => `whsec_demo_${Math.random().toString(36).slice(2, 14)}`}
        onTestSend={() => new Promise((resolve) => setTimeout(() => resolve({ ok: true, statusCode: 200, durationMs: 140 + Math.round(Math.random() * 120) }), 600))}
        onRedeliver={() => {}}
      />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): DELIVERY_STATUS, EVENTS, INITIAL_ROUTES.
