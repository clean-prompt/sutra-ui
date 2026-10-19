# QRCode

> Real QR code rendered to inline SVG, with rounded/dot modules, styled finders and an optional logo.

- Import: `import { QRCode } from "@sutra/ui"` (or from `@sutra/ui/identity`)
- Source: `packages/ui/src/kits/identity/qr-code` (kit `identity`)
- `data-slot`: `qr-code`, `qr-code-plate`
- Parts: [`QRCodeCard`](QRCodeCard.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` (required) | `string` |  | Text or URL to encode. |
| `background` | `string` | `"#ffffff"` | Background / quiet-zone color. Keep it light for scanners. |
| `ecc` | `QRCodeECC` | `"M"` | Error-correction level. Forced to `H` when a `logo` is shown. Data too long for the level falls back to a lower one (without the logo). |
| `finderStyle` | `QRCodeFinderStyle` |  | Shape of the three corner finder patterns: `square`, `rounded` or `circle`. |
| `foreground` | `string` | `"currentColor"` | Module color. Defaults to `currentColor` (near-black unless you set a text color). |
| `logo` | `React.ReactNode` |  | Centered logo: a React node or an image URL. Sits on a squircle plate that clears the modules behind it. |
| `logoSize` | `number` | `0.24` | Logo plate width as a fraction of the code (0.1 to 0.3). |
| `moduleStyle` | `QRCodeModuleStyle` | `"square"` | Shape of the data modules: `square`, `rounded` or `dots`. Default "square". |
| `quietZone` | `number` | `4` | Quiet zone width in modules. |
| `size` | `number` | `192` | Rendered width and height in pixels. |
| `svgClassName` | `string` |  | Extra classes for the SVG; `className` goes to the wrapper. |
| `title` | `string` | `"QR code"` | Accessible name. Defaults to "QR code". |

## Part props

### QRCodeCard

QR code in a card with a caption, copyable link and an optional expiry countdown.

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
import { SutraAppIcon, SutraMark } from "@sutra/ui/assets";
import { QRCode, QRCodeCard } from "@sutra/ui/identity";

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
