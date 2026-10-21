# AgentBrowserPane

> Agent-driven browser surface: address bar, lease banner, loading bar and an app-provided viewport.

- Import: `import { AgentBrowserPane } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-browser` (kit `agent`)
- `data-slot`: `agent-browser`, `agent-driving-pill`, `browser-lease`, `browser-viewport`, `browser-agent-shield`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `agentActivity` | `React.ReactNode` |  | What the agent is doing right now, e.g. "Clicking “Sign in”". |
| `agentName` | `string` | `"Agent"` | Name used in the control banner ("<name> is driving"). Default "The agent". |
| `canGoBack` | `boolean` | `false` | Enables the back button. |
| `canGoForward` | `boolean` | `false` | Enables the forward button. |
| `children` | `React.ReactNode` |  | The viewport (iframe, screenshot, canvas…) supplied by the app. |
| `controller` | `BrowserController` |  | Who holds the control lease. |
| `defaultController` | `BrowserController` | `"user"` | Initial controlling party (`agent` or `user`) when `controller` is not controlled. |
| `footer` | `React.ReactNode` |  | Rendered under the viewport, e.g. a `BrowserConsole`. |
| `loading` | `boolean` | `false` | Shows the page as loading: the reload button becomes Stop and the progress bar appears. |
| `onBack` | `() => void` |  | Called when the user presses Back. |
| `onControllerChange` | `(controller: BrowserController) => void` |  | Called with the new controller when the user takes over or hands control back. |
| `onForward` | `() => void` |  | Called when the user presses Forward. |
| `onNavigate` | `(url: string) => void` |  | Called with the normalized URL when the user submits the address bar. |
| `onReload` | `() => void` |  | Called when the user presses Reload. |
| `onStop` | `() => void` |  | Called when the user presses Stop while `loading`. |
| `pageTitle` | `string` |  | Page title, shown as a tooltip on the URL field. |
| `progress` | `number` |  | 0–100. Indeterminate while `loading` and unset. |
| `security` | `BrowserSecurity` |  | Override the inferred security indicator. |
| `toolbarExtra` | `React.ReactNode` |  | Extra toolbar content after the URL field. |
| `url` | `string` | `""` | Current URL. Display state only: the pane never loads it. |
| `viewportClassName` | `string` |  | Extra classes for the viewport that wraps `children`. |

## Example (live: `#/components/browser-review/agent-browser` in the playground)

```tsx
import * as React from "react";
import { AgentBrowserPane, BrowserConsole } from "@cleanprompt/sutra-ui/agent";

function BrowserDemo() {
  const [history, setHistory] = React.useState({ stack: [pages[0]!], index: 0 });
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState<number | undefined>(undefined);
  const [controller, setController] = React.useState<BrowserController>("agent");
  const [entries, setEntries] = React.useState(initialConsole);
  const url = history.stack[history.index]!;

  const fakeLoad = () => {
    setLoading(true);
    setProgress(20);
    window.setTimeout(() => setProgress(70), 250);
    window.setTimeout(() => {
      setLoading(false);
      setProgress(undefined);
    }, 600);
  };

  return (
    <AgentBrowserPane
      className="h-[460px] w-full"
      url={url}
      pageTitle="Acme Notes"
      loading={loading}
      progress={progress}
      canGoBack={history.index > 0}
      canGoForward={history.index < history.stack.length - 1}
      onBack={() => setHistory((h) => ({ ...h, index: h.index - 1 }))}
      onForward={() => setHistory((h) => ({ ...h, index: h.index + 1 }))}
      onReload={fakeLoad}
      onStop={() => setLoading(false)}
      onNavigate={(next) => {
        setHistory((h) => ({ stack: [...h.stack.slice(0, h.index + 1), next], index: h.index + 1 }));
        fakeLoad();
      }}
      controller={controller}
      onControllerChange={setController}
      agentName="Sutra"
      agentActivity="Checking the pricing table"
      footer={<BrowserConsole entries={entries} defaultOpen onClear={() => setEntries([])} />}
    >
      <MockPage path={url} />
    </AgentBrowserPane>
  );
}
```

Playground helpers in this snippet (not part of the library): MockPage, initialConsole, pages.
