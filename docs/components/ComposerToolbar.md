# ComposerToolbar

> Composer footer layout: add context, mode and effort on the left; model, voice and send on the right; narrow widths collapse extras into an overflow popover. This is the slot-based, agent-specific layout; `PromptInputToolbar` (prompt-input) is the plain flex row for a basic `PromptInput`. Use `ComposerToolbar` when you need the named slots or overflow collapse, `PromptInputToolbar` otherwise.

- Import: `import { ComposerToolbar } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-composer` (kit `agent`)
- `data-slot`: `composer-toolbar`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `addContext` | `React.ReactNode` |  | Add-context control (always visible). |
| `collapse` | `boolean \| "auto"` | `"auto"` | Move collapsible slots into an overflow popover: "auto" measures the toolbar width. Default "auto". |
| `collapseBelow` | `number` | `440` | Width in px below which "auto" collapses. Default 440. |
| `effort` | `React.ReactNode` |  | Effort slot (collapses). |
| `meta` | `React.ReactNode` |  | Right-hand meta such as a context meter (collapses). |
| `mode` | `React.ReactNode` |  | Mode switcher slot (collapses). |
| `model` | `React.ReactNode` |  | Model pill (always visible). |
| `overflowLabel` | `string` | `"More options"` | Accessible name of the overflow button. Default "More options". |
| `submit` | `React.ReactNode` |  | Send / stop button (always visible). |
| `tools` | `React.ReactNode` |  | Extra left-hand tools (collapse). |
| `voice` | `React.ReactNode` |  | Voice button (always visible). |

## Example (live: `#/components/agent-composer/composer-toolbar` in the playground)

```tsx
import { ComposerToolbar } from "@sutra/ui/agent";
import {
  PromptInput,
  PromptInputAddContextMenu,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@sutra/ui/ai";
import { RiBrainLine, RiShieldCheckLine } from "@sutra/ui/icons";

function ComposerToolbarDemo() {
  const toolbar = (
    <ComposerToolbar
      addContext={<PromptInputAddContextMenu />}
      mode={<PromptInputButton><RiShieldCheckLine />Ask before edits</PromptInputButton>}
      effort={<PromptInputButton><RiBrainLine />High</PromptInputButton>}
      model={<PromptInputModelSelect models={models} align="end" fast="on" />}
      submit={<PromptInputSubmit />}
    />
  );
  return (
    <>
      <div className="flex flex-col gap-2">
        {/* Wide */}
        <PromptInput>
          <PromptInputTextarea placeholder="Wide toolbar" />
          {toolbar}
        </PromptInput>
      </div>
      <div className="flex flex-col gap-2">
        {/* Narrow (auto-collapsed) */}
        <PromptInput>
          <PromptInputTextarea placeholder="Narrow toolbar" />
          {toolbar}
        </PromptInput>
      </div>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): models.
