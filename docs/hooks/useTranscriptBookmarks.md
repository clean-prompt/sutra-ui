# useTranscriptBookmarks

> Bookmark state helper: list, membership and toggle.

- Import: `import { useTranscriptBookmarks } from "@sutra/ui/agent"`
- Source: `packages/ui/src/kits/agent/agent-transcript`

## Signature

```ts
useTranscriptBookmarks(initial?: TranscriptBookmark[]): { bookmarks: TranscriptBookmark[]; setBookmarks: Dispatch<SetStateAction<TranscriptBookmark[]>>; isBookmarked: (id: string) => boolean; toggle: (entry: TranscriptBookmark) => void; remove: (id: string) => void; }
```
