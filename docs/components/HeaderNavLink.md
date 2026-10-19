# HeaderNavLink

> Simple navigation link (top level or inside a panel). Use `asChild` for router links.

- Import: `import { HeaderNavLink } from "@sutra/ui"` (or from `@sutra/ui/navigation`)
- Source: `packages/ui/src/patterns/header-navigation` (patterns)
- Part of [`HeaderNav`](HeaderNav.md)
- Also accepts the props of HTMLAttributes, AnchorHTMLAttributes, NavigationMenuLinkProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `"top" \| "panel"` | `"top"` | Render as a plain top-level nav link (default) or a compact row inside a panel. |

## Example (live: `#/components/navigation/header-nav` in the playground)

```tsx
import { SutraLogo } from "@sutra/ui/assets";
import { Button } from "@sutra/ui/core";
import {
  RiBookOpenLine,
  RiCalendarLine,
  RiCodeSSlashLine,
  RiDashboardLine,
  RiInboxLine,
  RiLifebuoyLine,
  RiPlugLine,
} from "@sutra/ui/icons";
import {
  HeaderNav,
  HeaderNavActions,
  HeaderNavBrand,
  HeaderNavContent,
  HeaderNavFeatureLink,
  HeaderNavItem,
  HeaderNavLink,
  HeaderNavMenu,
  HeaderNavMobile,
  HeaderNavTrigger,
} from "@sutra/ui/navigation";

<HeaderNav sticky={false} border="always" containerSize="full">
  <HeaderNavBrand href="#header-nav">
    <SutraLogo size="sm" />
  </HeaderNavBrand>
  <HeaderNavMenu>
    <HeaderNavItem>
      <HeaderNavTrigger>Product</HeaderNavTrigger>
      <HeaderNavContent>
        <div className="grid w-[520px] grid-cols-2 gap-1">
          <HeaderNavFeatureLink href="#header-nav" icon={<RiDashboardLine />} title="Dashboards" description="Live metrics for every team." />
          <HeaderNavFeatureLink href="#header-nav" icon={<RiInboxLine />} title="Inbox" description="Triage requests in one place." badge="New" />
          <HeaderNavFeatureLink href="#header-nav" icon={<RiCalendarLine />} title="Calendar" description="Plan launches and sprints." />
          <HeaderNavFeatureLink href="#header-nav" icon={<RiPlugLine />} title="Integrations" description="Connect 120+ tools." />
        </div>
      </HeaderNavContent>
    </HeaderNavItem>
    <HeaderNavItem>
      <HeaderNavTrigger>Resources</HeaderNavTrigger>
      <HeaderNavContent>
        <div className="flex w-56 flex-col">
          <HeaderNavLink variant="panel" href="#header-nav">
            <RiBookOpenLine /> Documentation
          </HeaderNavLink>
          <HeaderNavLink variant="panel" href="#header-nav">
            <RiCodeSSlashLine /> API reference
          </HeaderNavLink>
          <HeaderNavLink variant="panel" href="#header-nav">
            <RiLifebuoyLine /> Help center
          </HeaderNavLink>
        </div>
      </HeaderNavContent>
    </HeaderNavItem>
    <HeaderNavItem>
      <HeaderNavLink href="#header-nav">Pricing</HeaderNavLink>
    </HeaderNavItem>
    <HeaderNavItem>
      <HeaderNavLink href="#header-nav">Changelog</HeaderNavLink>
    </HeaderNavItem>
  </HeaderNavMenu>
  <HeaderNavActions>
    <Button variant="ghost" size="sm" className="max-md:hidden">
      Sign in
    </Button>
    <Button size="sm">Get started</Button>
    <HeaderNavMobile
      brand={<SutraLogo size="sm" />}
      items={[
        {
          label: "Product",
          children: [
            { label: "Dashboards", href: "#header-nav", icon: <RiDashboardLine /> },
            { label: "Inbox", href: "#header-nav", icon: <RiInboxLine /> },
            { label: "Calendar", href: "#header-nav", icon: <RiCalendarLine /> },
          ],
        },
        { label: "Pricing", href: "#header-nav" },
        { label: "Changelog", href: "#header-nav" },
      ]}
    >
      <Button variant="secondary">Sign in</Button>
      <Button>Get started</Button>
    </HeaderNavMobile>
  </HeaderNavActions>
</HeaderNav>
<div className="px-6 py-10 text-sm text-muted-foreground">Hover “Product” or “Resources” to open the mega-menu.</div>
```
