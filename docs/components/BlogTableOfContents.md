# BlogTableOfContents

> "On this page" navigation that highlights the heading in view: a `SectionRail` fed with the post's headings.

- Import: `import { BlogTableOfContents } from "@sutra/ui"`
- Source: `packages/ui/src/patterns/blog-content` (patterns)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `headings` (required) | `BlogTocHeading[]` |  | Headings to list; each has an `id` (the anchor), a `title` and an optional `level`. |
| `activeId` | `string` |  | Controlled active id; otherwise tracked with IntersectionObserver. |
| `rootMargin` | `string` |  | Root margin for the observer. |
| `smoothScroll` | `boolean` |  | Smooth-scroll to headings on click. Default true. |
| `title` | `React.ReactNode` |  | Heading above the list. |
