# SectionHeader

> Section heading with eyebrow, title, description, actions and an optional tabs slot.

- Import: `import { SectionHeader } from "@sutra/ui"` (or from `@sutra/ui/navigation`)
- Source: `packages/ui/src/patterns/section-header` (patterns)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `React.ReactNode` |  | Section heading. |
| `actions` | `React.ReactNode` |  | Buttons on the right; wrap below the text on mobile. |
| `align` | `"start" \| "center"` | `"start"` | Alignment of the heading text. |
| `as` | `HeadingLevel` | `"h2"` | Heading element. Default h2. |
| `description` | `React.ReactNode` |  | Supporting text under the heading. |
| `divider` | `boolean` |  | Bottom border under the header. |
| `eyebrow` | `React.ReactNode` |  | Small label above the title (a section or category name). |
| `leading` | `React.ReactNode` |  | Leading element before the text (icon, avatar). |
| `size` | `Size` | `"md"` | Heading size and spacing. |
| `tabs` | `React.ReactNode` |  | Tabs or filters rendered under the heading row. `children` render there too. |

## Example (live: `#/components/navigation/section-header` in the playground)

```tsx
import { Button } from "@sutra/ui/core";
import { RiAddLine, RiDownloadLine, RiUploadCloud2Line } from "@sutra/ui/icons";
import { Breadcrumbs, PageHeader, SectionHeader, TabMenu } from "@sutra/ui/navigation";

<div className="space-y-10">
  <div className="space-y-3">
    {/* PageHeader · breadcrumbs, back button, actions, tabs */}
    <PageHeader
      breadcrumbs={<Breadcrumbs items={crumbs.slice(1, 4)} size="sm" />}
      onBack={() => {}}
      title="Sutra UI"
      description="Component library for the Sutra apps. 84 components, 12 contributors."
      actions={
        <>
          <Button variant="secondary" leadingIcon={<RiDownloadLine />}>
            Export
          </Button>
          <Button leadingIcon={<RiAddLine />}>New component</Button>
        </>
      }
      tabs={<TabMenu items={projectTabs.slice(0, 4)} bordered={false} />}
      divider
    />
  </div>
  <div className="space-y-3">
    {/* SectionHeader · eyebrow, actions, divider */}
    <SectionHeader
      eyebrow="Settings"
      title="Team members"
      description="Invite colleagues and manage their roles."
      actions={
        <Button size="sm" leadingIcon={<RiAddLine />}>
          Invite
        </Button>
      }
      divider
    />
  </div>
  <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
    <div className="space-y-3">
      {/* size="sm" · leading icon */}
      <SectionHeader
        size="sm"
        as="h3"
        leading={
          <span className="flex size-9 items-center justify-center rounded-md bg-primary-soft text-primary">
            <RiUploadCloud2Line className="size-5" />
          </span>
        }
        title="Uploads"
        description="Files you shared in the last 30 days."
      />
    </div>
    <div className="space-y-3">
      {/* align="center" · size="lg" */}
      <SectionHeader
        align="center"
        size="lg"
        eyebrow="Pricing"
        title="Plans for every team"
        description="Start free, upgrade when you grow."
      />
    </div>
  </div>
</div>
```

Playground helpers in this snippet (not part of the library): crumbs, projectTabs.
