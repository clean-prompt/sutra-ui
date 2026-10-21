# BlogContent

> Typographic container that styles raw HTML or Markdown output.

- Import: `import { BlogContent } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/navigation`)
- Source: `packages/ui/src/patterns/blog-content` (patterns)
- `data-slot`: `blog-content`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `as` | `"div" \| "article" \| "section"` | `"div"` | Element to render. |
| `fullWidth` | `boolean` |  | Remove the readable max width. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Body text size, which sets the reading scale. |

## Example (live: `#/components/content/blog-content` in the playground)

```tsx
import { BlogContent, BlogPostHeader } from "@cleanprompt/sutra-ui/navigation";

        <article className="w-full max-w-[68ch] space-y-10">
          <BlogPostHeader
            category="Engineering"
            title="Designing a component library that scales"
            subtitle="What we learned building forty components on top of Radix and Tailwind v4."
            author="Priya Raman"
            date="2026-09-24"
            readTime={7}
          />
          <BlogContent as="div">
            <p>
              Every design system starts with a button. The hard part comes later, when the fortieth component
              needs to feel like it was made by the same hands as the first. Consistency is less about rules and
              more about <strong>shared building blocks</strong>.
            </p>
            <h2>Start with tokens, not components</h2>
            <p>
              Before writing any JSX we defined semantic tokens such as <code>bg-card</code>,{" "}
              <code>text-muted-foreground</code> and <code>rounded-control</code>. Components only reference
              tokens, so a theme switch is a <a href="#blog-content">single CSS change</a>.
            </p>
            <ul>
              <li>Surfaces describe intent: background, card, popover.</li>
              <li>Status colors come in solid and soft pairs.</li>
              <li>
                Radius is split into <em>control</em> and <em>box</em> so pills and cards can change independently.
              </li>
            </ul>
            <blockquote>
              <p>A design system is a product with developers as its customers.</p>
              <cite>Nathan Curtis</cite>
            </blockquote>
            <h3>Composition over configuration</h3>
            <p>
              Compound components keep props small. Instead of a single accordion with a dozen props, we ship{" "}
              <code>Accordion</code>, <code>AccordionItem</code>, <code>AccordionTrigger</code> and{" "}
              <code>AccordionContent</code>, plus a data-driven <code>FAQ</code> wrapper for the common case.
            </p>
            <pre>
              <code>{`<Accordion type="single" collapsible>
  <AccordionItem value="a">…</AccordionItem>
</Accordion>`}</code>
            </pre>
            <h2>Measuring adoption</h2>
            <table>
              <thead>
                <tr>
                  <th>Quarter</th>
                  <th>Teams</th>
                  <th>Components used</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Q1</td>
                  <td>4</td>
                  <td>18</td>
                </tr>
                <tr>
                  <td>Q2</td>
                  <td>11</td>
                  <td>31</td>
                </tr>
                <tr>
                  <td>Q3</td>
                  <td>23</td>
                  <td>42</td>
                </tr>
              </tbody>
            </table>
            <p>
              Press <kbd>⌘</kbd> <kbd>K</kbd> anywhere in the docs to search. <mark>Next up:</mark> charts and data
              grids.
            </p>
            <hr />
            <p>Thanks to everyone who filed issues and reviewed pull requests along the way.</p>
          </BlogContent>
        </article>
```
