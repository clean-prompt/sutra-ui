# LinkPreviewCard

> Link card with title, description, domain and an optional image slot. Data comes from the app; nothing is fetched.

- Import: `import { LinkPreviewCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/embeds` (kit `ai`)
- `data-slot`: `link-preview-card`
- Also accepts the props of HTMLAttributes, AnchorHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `href` (required) | `string` |  | Address the card links to; unsafe schemes are not linked. |
| `description` | `React.ReactNode` |  | Short excerpt of the page. |
| `domain` | `string` |  | Overrides the domain derived from `href`. |
| `icon` | `React.ReactNode` |  | Site icon; defaults to a local Favicon monogram. |
| `image` | `React.ReactNode` |  | Image slot (app-provided element; Sutra never fetches previews). |
| `layout` | `"horizontal" \| "vertical"` | `"horizontal"` | `horizontal` puts the image beside the text, `vertical` stacks it above. |
| `title` | `React.ReactNode` |  | Page title; the domain is used when unset. |

## Example (live: `#/components/chat-extras/embeds` in the playground)

```tsx
import * as React from "react";
import {
  EmbedConsentProvider,
  LinkPreviewCard,
  RichEmbed,
  SvgEmbed,
} from "@cleanprompt/sutra-ui/ai";
import { Button } from "@cleanprompt/sutra-ui/core";

function EmbedsDemo() {
  const [allowed, setAllowed] = React.useState<string[]>([]);
  return (
    <>
      <EmbedConsentProvider allowed={allowed} onAllowedChange={setAllowed}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Always allowed: {allowed.length ? allowed.join(", ") : "none"}
          {allowed.length > 0 && (
            <Button size="xs" variant="ghost" onClick={() => setAllowed([])}>
              Reset
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RichEmbed url="https://www.youtube.com/watch?v=aqz-KE-bpKQ" title="Big Buck Bunny" />
          <RichEmbed url="https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" title="A track" />
          <RichEmbed url="https://gist.github.com/octocat/6cad326836d38bd3a7ae" title="octocat / hello.js" />
          <RichEmbed url="https://www.figma.com/file/abc123/Design-System" title="Design System" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LinkPreviewCard
            href="https://example.com/blog/local-first"
            title="Local-first software"
            description="You own your data, in spite of the cloud. Previews are provided by the app — Sutra never fetches them."
            image={<div className="size-full bg-gradient-to-br from-brand-200 to-brand-500" />}
          />
          <SvgEmbed svg={sampleSvg} title="A user-supplied SVG" caption="Rendered via an <img> data URL — scripts never run" />
        </div>
      </EmbedConsentProvider>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): sampleSvg.
