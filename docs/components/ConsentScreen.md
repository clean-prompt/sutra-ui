# ConsentScreen

> Authorization/approval screen: who is asking, what they want, and an expiring Approve.

- Import: `import { ConsentScreen } from "@sutra/ui"` (or from `@sutra/ui/security`)
- Source: `packages/ui/src/kits/identity/consent` (kit `identity`)
- `data-slot`: `consent-screen`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `app` (required) | `ConsentApp` |  | The app asking for access (name, logo, publisher, verification). |
| `scopes` (required) | `ScopeInput[]` |  | Requested scopes: id strings (`read:orders`) or objects with constraints. |
| `approveLabel` | `React.ReactNode` | `"Approve"` | Label of the approve button. Default "Approve". |
| `credentialLabel` | `React.ReactNode` | `"Choose a credential to present"` | Label above the credential list. Default "Choose a credential to present". |
| `credentialRequired` | `boolean` |  | Require a credential choice before Approve. Default true when credentials are given. |
| `credentials` | `ConsentCredentialOption[]` |  | Credentials the user can present (radio list; none preselected). |
| `defaultOptionalGranted` | `string[]` | `[]` | Optional scope ids granted at first; none by default. |
| `defaultShareProfile` | `boolean` | `false` | Initial state of the share-profile switch. Default false. |
| `definitions` | `Record<string, ScopeDefinition>` |  | Extra or overriding scope definitions (label, description, icon, risk), merged over the built-in set. |
| `denyLabel` | `React.ReactNode` | `"Deny"` | Label of the deny button. Default "Deny". |
| `expiresAt` | `number \| Date` |  | When the request expires (ms or Date). |
| `heldScopes` | `string[]` |  | Scope ids the app already holds; tagged "Already granted". |
| `onApprove` | `(selection: ConsentSelection) => void \| Promise<void>` |  | May return a promise; buttons show progress until it settles. |
| `onDeny` | `() => void \| Promise<void>` |  | Called when the user denies the request; may return a promise, and the buttons show progress until it settles. |
| `onExpire` | `() => void` |  | Called once when the request reaches `expiresAt`. |
| `optionalScopes` | `string[]` | `[]` | Scope ids the user may decline. Default-deny: none are pre-granted unless in `defaultOptionalGranted`. |
| `profile` | `ConsentProfile` |  | Offer to share this profile (off by default). |
| `scopeLabels` | `Record<string, string>` |  | Untrusted app-supplied labels by scope id, used only when no definition matches. |
| `title` | `React.ReactNode` |  | Heading of the screen; defaults to a sentence naming the app. |

## Example (live: `#/components/security/consent-screen` in the playground)

```tsx
import * as React from "react";
import { Button } from "@sutra/ui/core";
import { RiShieldCheckLine, RiUserLine } from "@sutra/ui/icons";
import { ConsentScreen } from "@sutra/ui/security";

function ConsentDemo() {
  const [nonce, setNonce] = React.useState(0);
  const [result, setResult] = React.useState<string>("");
  const expiresAt = React.useMemo(() => Date.now() + 90_000, [nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ConsentScreen
        key={nonce}
        app={{ name: "Acme Shop", domain: "shop.acme.com", verified: true, firstTime: true }}
        scopes={["login", "read:orders", "email", { id: "pay", max: "50USD", maxUses: 3 }, "offline_access"]}
        optionalScopes={["email", "pay", "offline_access"]}
        profile={{ name: "Vyom Patel", detail: "vyom@sutra.app" }}
        credentials={[
          { id: "age", title: "Age over 18", description: "National ID · unlinkable proof", icon: <RiShieldCheckLine /> },
          { id: "emp", title: "Employee badge", description: "Sutra Labs · discloses name only", icon: <RiUserLine /> },
        ]}
        expiresAt={expiresAt}
        onApprove={async (sel: ConsentSelection) => {
          await new Promise((r) => setTimeout(r, 600));
          setResult(`Approved: ${sel.scopes.join(", ")}${sel.shareProfile ? " + profile" : ""} · credential ${sel.credentialId}`);
        }}
        onDeny={() => setResult("Denied")}
      />
      <div className="flex items-center gap-3">
        {/* {result || "Approve unlocks once a credential is picked. Expires in 90s."} */}
        <Button variant="ghost" size="xs" onClick={() => { setNonce((n) => n + 1); setResult(""); }}>
          New request
        </Button>
      </div>
    </div>
  );
}
```
