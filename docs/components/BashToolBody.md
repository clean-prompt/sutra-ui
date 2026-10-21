# BashToolBody

> Shell call body: `$ command` with copy, ANSI output, separate stderr and an exit code chip.

- Import: `import { BashToolBody } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/tool-timeline-bodies` (kit `agent`)
- `data-slot`: `bash-tool-body`, `bash-exit-code`, `bash-stderr`, `bash-output`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `command` (required) | `string` |  | The command that ran, shown in mono with a prompt. |
| `exitCode` | `number` |  | Exit code, shown as an "exit N" badge; non-zero turns it red. |
| `maxLines` | `number` | `12` | Visible lines before "Show N more lines". Default 12. |
| `output` | `string` |  | stdout (ANSI colors supported). |
| `stderr` | `string` |  | stderr, shown separately as "Error output". |
| `streaming` | `boolean` |  | Shows a blinking caret after the output. |

## Example (live: `#/components/agent-timeline/bash-tool-body` in the playground)

```tsx
import { BashToolBody } from "@cleanprompt/sutra-ui/agent";

function BashDemo() {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          {/* Success */}
          <BashToolBody command="pnpm test" output={testLines.join("\n")} exitCode={0} />
        </div>
        <div className="space-y-2">
          {/* Failure with stderr */}
          <BashToolBody command="pnpm lint" output={lintStdout} stderr={lintStderr} exitCode={1} />
        </div>
        <div className="space-y-2 lg:col-span-2">
          {/* Long output (truncated at 8 lines) */}
          <BashToolBody command="pnpm build --verbose" output={longLog} maxLines={8} exitCode={0} />
        </div>
      </div>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): lintStderr, lintStdout, longLog, testLines.
