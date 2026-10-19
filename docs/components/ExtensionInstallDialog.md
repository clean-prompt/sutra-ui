# ExtensionInstallDialog

> Install a plugin from the catalog or a git URL: source verification warning, advanced details, progress log and result.

- Import: `import { ExtensionInstallDialog } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/extensions-catalog` (kit `agent-admin`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is not controlled. |
| `error` | `string` |  | Failure message shown when `status` is `error`. |
| `log` | `readonly LogLine[]` |  | Installer output lines streamed into the log view while installing. |
| `mode` | `"catalog" \| "git"` | `"catalog"` | "catalog" installs a known entry; "git" asks for a URL. |
| `name` | `string` |  | Name of the extension being installed (catalog mode). |
| `onDone` | `() => void` |  | Called by "Done" after success. |
| `onInstall` | `(source: string) => void` |  | Called with the source (catalog id or git URL) when the user confirms the install. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `open` | `boolean` |  | Controlled open state of the dialog. |
| `permissions` | `string[]` | `[]` | Permissions or capabilities requested. |
| `sha` | `string` |  | Commit sha / digest. |
| `source` | `string` | `""` | Source URL (prefill for git mode). |
| `status` | `ExtensionInstallStatus` | `"idle"` | Progress of the install (`idle`, `installing`, `success`, `error`); the dialog shows the log and the Done button once it leaves `idle`. |
| `trigger` | `React.ReactNode` |  | Element that opens the dialog when pressed. |
| `verified` | `boolean` | `false` | Source is a verified publisher. |

## Example (live: `#/components/capabilities/extension-install` in the playground)

```tsx
import * as React from "react";
import { ExtensionInstallDialog } from "@sutra/ui/agent-admin";
import { Button } from "@sutra/ui/core";

function InstallDialogDemo() {
  const [status, setStatus] = React.useState<ExtensionInstallStatus>("idle");
  const [log, setLog] = React.useState<LogLine[]>([]);
  const [verified, setVerified] = React.useState<boolean | null>(null);
  const run = (fail: boolean) => async () => {
    setStatus("installing");
    setLog([]);
    const lines = ["Cloning into 'plugin'…", "Resolving deltas: 100% (212/212)", "Verifying manifest sutra-plugin.json", "Installing 3 npm dependencies"];
    for (const l of lines) {
      await wait(400);
      setLog((x) => [...x, l]);
    }
    await wait(400);
    if (fail) {
      setLog((x) => [...x, "\x1b[31mnpm ERR! peer react@\"^18\" not satisfied\x1b[0m"]);
      setStatus("error");
    } else {
      setLog((x) => [...x, "\x1b[32mInstalled term-rec 2.1.0\x1b[0m"]);
      setStatus("success");
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      <ExtensionInstallDialog
        trigger={<Button variant="outline">Install verified (catalog)</Button>}
        name="Kanban Board"
        source="catalog://sutra/kanban@0.5.0"
        verified
        sha="9f3c2ab41e07d5c8"
        permissions={["ui.sidebar", "tasks.read", "tasks.write"]}
        status={verified === true ? status : "idle"}
        log={log}
        onInstall={() => {
          setVerified(true);
          void run(false)();
        }}
        onDone={() => setStatus("idle")}
      />
      <ExtensionInstallDialog
        trigger={<Button variant="outline">Install from git URL (fails)</Button>}
        mode="git"
        source="https://github.com/devtools-collective/term-rec.git"
        sha="c0ffee12d34db5ad"
        permissions={["shell.observe", "fs.write", "net.fetch"]}
        status={verified === false ? status : "idle"}
        log={log}
        error="peer dependency conflict"
        onInstall={() => {
          setVerified(false);
          void run(true)();
        }}
      />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): wait.
