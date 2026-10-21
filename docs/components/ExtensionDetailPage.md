# ExtensionDetailPage

> Extension detail: breadcrumbs, hero, copyable install command, facts sidebar, capabilities, security note, screenshots, README and more from the author.

- Import: `import { ExtensionDetailPage } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/marketing-blocks-detail` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `extension` (required) | `MarketplaceExtension` |  | The extension to describe: name, author, tier, versions, capabilities, readme and links. |
| `breadcrumbs` | `{ label: string; href?: string }[]` |  | Breadcrumb trail above the header; each crumb has a `label` and an optional `href`. |
| `moreFromAuthor` | `MarketplaceExtension[]` | `[]` | Other extensions by the same author. |
| `onOpenExtension` | `(extension: MarketplaceExtension) => void` |  | Called with the extension when a card in "More from author" is opened. |
| `onOpenScreenshot` | `(index: number) => void` |  | Called with the screenshot index; wire it to a Lightbox. |
| `renderLink` | `BreadcrumbRenderLink` |  | Renders breadcrumb links in place of the default `<a>`, e.g. to use your router's Link. |
| `shaHref` | `string` |  | Link for the short sha (relative path or anchor); rendered as text when omitted. |

## Example (live: `#/components/billing-marketing/extension-detail` in the playground)

```tsx
import { Button } from "@sutra/ui/core";
import { RiArrowLeftLine } from "@sutra/ui/icons";

<div className="flex flex-col gap-3">
  {selected !== "deep-search" && (
    <Button variant="ghost" size="sm" leadingIcon={<RiArrowLeftLine />} className="self-start" onClick={() => setSelected("deep-search")}>
      Back to Deep Search
    </Button>
  )}
  <ViewportFrame>
    <DetailDemo extension={extension} onOpen={open} />
  </ViewportFrame>
</div>
```

Playground helpers in this snippet (not part of the library): DetailDemo, ViewportFrame.
