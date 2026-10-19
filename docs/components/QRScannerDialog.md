# QRScannerDialog

> Full-screen dialog around `QRScanner`; the camera only runs while it is open.

- Import: `import { QRScannerDialog } from "@sutra/ui"` (or from `@sutra/ui/identity`)
- Source: `packages/ui/src/kits/identity/qr-scanner` (kit `identity`)
- Part of [`QRScanner`](QRScanner.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `onResult` (required) | `(text: string) => void` |  | Called once with the decoded text; scanning then pauses until "Scan again". |
| `allowUpload` | `boolean` |  | Offer "Upload image instead". Default true. |
| `closeOnResult` | `boolean` | `true` | Close the dialog after a successful scan. Default true. |
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is not controlled. |
| `description` | `React.ReactNode` |  | Helper text under the heading. |
| `detector` | `QRScannerDetector \| null` |  | Inject a detector (tests, custom engines). Otherwise BarcodeDetector, else jsQR. |
| `facingMode` | `"environment" \| "user"` |  | Initial camera. |
| `fps` | `number` |  | Decode attempts per second. |
| `hint` | `React.ReactNode` |  | Instruction under the viewfinder. |
| `onError` | `(error: unknown) => void` |  | Called with the error when the camera cannot start or decoding fails. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `open` | `boolean` |  | Controlled open state of the dialog. |
| `paused` | `boolean` |  | Pause the camera and decoding. |
| `title` | `React.ReactNode` | `"Scan QR code"` | Dialog heading. |
| `trigger` | `React.ReactNode` |  | Element that opens the scanner (wrapped with `asChild`). |
| `viewportClassName` | `string` |  | Extra classes for the camera viewport. |

## Example (live: `#/components/identity/qr-scanner` in the playground)

```tsx
import { Button } from "@sutra/ui/core";
import { RiQrScan2Line } from "@sutra/ui/icons";
import { KeyValue, KeyValueList, Note, QRScannerDialog } from "@sutra/ui/identity";

<div className="flex flex-col items-center gap-4">
  <QRScannerDialog
    description="Point at the code on your other device."
    onResult={setScanned}
    trigger={<Button leadingIcon={<RiQrScan2Line />}>Scan a pairing code</Button>}
  />
  {scanned ? (
    <KeyValueList className="w-80">
      <KeyValue label="Scanned" value={scanned} copyable mono />
    </KeyValueList>
  ) : (
    <Note>Nothing scanned yet. Scan the code above from your phone.</Note>
  )}
</div>
```
