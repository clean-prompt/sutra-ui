# QRCodeCard

> QR code in a card with a caption, copyable link and an optional expiry countdown.

- Import: `import { QRCodeCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/identity`)
- Source: `packages/ui/src/kits/identity/qr-code` (kit `identity`)
- `data-slot`: `qr-code-card`, `qr-code-card-frame`
- Part of [`QRCode`](QRCode.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` (required) | `string` |  | Text or URL to encode. |
| `caption` | `React.ReactNode` |  | Short instruction under the code. |
| `children` | `React.ReactNode` |  | Extra content at the bottom of the card. |
| `code` | `React.ReactNode` |  | Replaces the inner `QRCode` inside the white frame (e.g. a crossfading stack, a spinner or a status). The frame keeps its size, and the expired blur and overlay still apply. |
| `expired` | `boolean` |  | Forces the expired state on or off (otherwise it follows `expiresAt`). |
| `expiredLabel` | `React.ReactNode` | `"Code expired"` | Heading of the expired overlay. Default "Code expired". |
| `expiresAt` | `TimeInput` |  | When the code stops being valid. Shows "Expires in m:ss". |
| `frameClassName` | `string` |  | Extra classes for the frame around the code (e.g. a card-coloured surface when `code` is not a QR code). |
| `logo` | `React.ReactNode` |  | Centered logo for the QR code: a React node or an image URL. |
| `onExpire` | `() => void` |  | Called once when the countdown reaches zero. |
| `onRefresh` | `() => void` |  | Shows a refresh button on the expired overlay. |
| `qrProps` | `Partial<Omit<QRCodeProps, "value">>` |  | Extra props for the inner `QRCode`. |
| `refreshLabel` | `React.ReactNode` | `"Refresh code"` | Label of the refresh button on the expired overlay. Default "Refresh code". |
| `size` | `number` | `200` | QR code width and height in px. Default 200. |
| `title` | `React.ReactNode` |  | Heading above the code, e.g. "Link a device". |
| `url` | `string \| false` |  | URL shown in the copy row. Defaults to `value`; pass `false` to hide the row. |

## Example (live: `#/components/identity/qr-code` in the playground)

```tsx
import { SutraAppIcon, SutraMark } from "@cleanprompt/sutra-ui/assets";
import { QRCode, QRCodeCard } from "@cleanprompt/sutra-ui/identity";

<div className="flex flex-wrap items-start gap-8">
  <QRCodeCard
    title="Link a device"
    value={pairing.url}
    expiresAt={pairing.expiresAt}
    onRefresh={refreshPairing}
    caption="Open Sutra on your phone and scan this code."
    logo={<SutraMark size={48} />}
    qrProps={{ moduleStyle: "rounded" }}
  />
  <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-6">
    {(["square", "rounded", "dots"] as const).map((style) => (
      <div key={style} className="space-y-2">
        {/* {style} */}
        <QRCode value="https://sutra.app" moduleStyle={style} size={120} quietZone={2} className="rounded-lg ring-1 ring-border" />
      </div>
    ))}
    <div className="space-y-2">
      {/* Circle finders · brand */}
      <QRCode value="https://sutra.app" moduleStyle="dots" finderStyle="circle" size={120} quietZone={2} className="rounded-lg text-primary ring-1 ring-border" />
    </div>
    <div className="space-y-2">
      {/* App logo */}
      <QRCode value="https://notes.sutra.app/share/9c1f" moduleStyle="rounded" size={120} quietZone={2} logo={<SutraAppIcon app="notes" size={28} />} className="rounded-lg ring-1 ring-border" />
    </div>
    <div className="space-y-2">
      {/* ECC L (smallest) */}
      <QRCode value="https://sutra.app" ecc="L" size={120} quietZone={2} className="rounded-lg ring-1 ring-border" />
    </div>
  </div>
</div>
```
