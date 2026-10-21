# WebhookRouteList

> Webhook routes: name, copyable URL, events, delivery target, last delivery and an enabled switch.

- Import: `import { WebhookRouteList } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/webhooks` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `routes` (required) | `WebhookRoute[]` |  | Webhook routes to list, one row each. |
| `deliveryStatus` | `Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>` |  | Delivery state per platform, shown beside each route's delivery target. |
| `empty` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Content shown when there is nothing to list. |
| `emptyState` | `React.ReactNode` |  | Shown when there are no routes. Default "No webhook routes yet". |
| `onCreate` | `() => void` |  | Shows a "New route" button. |
| `onSelect` | `(route: WebhookRoute) => void` |  | Called with the route when its row is pressed. |
| `onToggleEnabled` | `(route: WebhookRoute, enabled: boolean) => void` |  | Called with the route and its new state when the user flips a row's switch; the switch is hidden when unset. |
| `selectedId` | `string \| null` |  | Id of the selected route; `null` or unset selects none. |

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
