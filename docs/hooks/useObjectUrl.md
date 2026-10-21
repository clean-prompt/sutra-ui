# useObjectUrl

> An object URL for a Blob or File, revoked when the source changes or the component unmounts. Returns undefined for no source, until the URL is created, and during the first render on the server. See `useObjectUrlState`.

- Import: `import { useObjectUrl } from "@cleanprompt/sutra-ui/tokens"`
- Source: `packages/ui/src/hooks/use-object-url`

## Signature

```ts
useObjectUrl(source: Blob | null | undefined): string | undefined
```
