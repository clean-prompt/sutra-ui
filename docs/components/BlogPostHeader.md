# BlogPostHeader

> Article heading: category, title, subtitle and meta row.

- Import: `import { BlogPostHeader } from "@sutra/ui"` (or from `@sutra/ui/navigation`)
- Source: `packages/ui/src/patterns/blog-content` (patterns)
- `data-slot`: `blog-post-header`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `React.ReactNode` |  | Post title, rendered as the page heading. |
| `align` | `"left" \| "center"` | `"left"` | Alignment of the header text. |
| `author` | `React.ReactNode` |  | Author name or element. |
| `category` | `React.ReactNode` |  | Small label above the title (e.g. the post category). |
| `date` | `string \| Date` |  | Publication date; a string is shown as given, a `Date` is formatted. |
| `readTime` | `number \| string` |  | Minutes (number) or a preformatted string. |
| `subtitle` | `React.ReactNode` |  | Standfirst under the title. |
