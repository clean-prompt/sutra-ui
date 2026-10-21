# useNoticeQueue

> Queue state for `RotatingNoticeBar`: dedupe by id, priority sort and a dismissed set.

- Import: `import { useNoticeQueue } from "@cleanprompt/sutra-ui/workspace"`
- Source: `packages/ui/src/patterns/notice-bar`

## Signature

```ts
useNoticeQueue(source?: NoticeItem[], { initialDismissed, onDismiss }?: UseNoticeQueueOptions): NoticeQueue
```
