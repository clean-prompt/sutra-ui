# SignInMap

> Where sign-ins come from: outcome-toned markers (clustered) on a flat map or globe, impossible-travel arcs, new-country flags, a summary row and a list of flagged sign-ins with review and revoke actions.

- Import: `import { SignInMap } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/identity`)
- Source: `packages/ui/src/kits/identity/sign-in-map` (kit `identity`)
- `data-slot`: `sign-in-map`, `sign-in-map-empty`, `sign-in-map-canvas`, `sign-in-map-flagged`, `sign-in-map-legend`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultSelectedId` | `string \| null` | `null` | Initially selected event id when `selectedId` is not controlled. |
| `defaultView` | `SignInMapView` | `"map"` | Default `map`. |
| `emptyState` | `React.ReactNode` |  | Replaces the default "No sign-ins" view. |
| `events` | `readonly SignInEvent[] \| null` |  | Sign-in attempts in any order. Events without a valid point or time are left out. |
| `knownCountries` | `readonly string[]` |  | Countries each account already signs in from (alpha-2). A first successful sign-in from any other country is a new location. Omitted: the country of each account's earliest successful sign-in is its baseline. |
| `loading` | `boolean` |  | Data is on its way: skeletons with no events yet, otherwise the events stay on screen (a refresh). |
| `locale` | `string` |  | Locale for country names, dates and numbers. |
| `maxKmh` | `number` |  | Fastest plausible travel in km/h; faster pairs are flagged. Default 900 (a passenger jet). |
| `minDistanceKm` | `number` |  | Pairs closer than this are never flagged, since IP geolocation is only city-accurate (a phone on mobile data can appear a region away). Default 100. |
| `now` | `TimeInput` |  | Reference time for relative times (tests, stories). Default: the clock, updated every 30 s. |
| `onReview` | `(event: SignInEvent, flags: SignInFlag[]) => void` |  | Shows a "Review" action on flagged events and the selected event's details. |
| `onRevoke` | `(event: SignInEvent) => void \| Promise<void>` |  | Shows "Revoke" on successful sign-ins other than the current one. May return a promise (the button spins until it settles). |
| `onSelectedIdChange` | `(id: string \| null, event: SignInEvent \| undefined) => void` |  | Called with the selected event id (or `null`) and the event when the user selects or clears one. |
| `onViewChange` | `(view: SignInMapView) => void` |  | Called with the view when the user flips the map and globe switch. |
| `reviewLabel` | `string` |  | Default "Review". |
| `revokeLabel` | `string` |  | Default "Revoke". |
| `selectedId` | `string \| null` |  | Selected event id: highlighted on the map, in the flagged list and shown in the detail panel. |
| `title` | `React.ReactNode` | `"Sign-in activity"` | Heading. Default "Sign-in activity". |
| `view` | `SignInMapView` |  | Controlled view: `map` or `globe`. |
| `viewToggle` | `boolean` | `true` | Show the map / globe switch. Default true. |
| `windowLabel` | `React.ReactNode` |  | The period the events cover, next to the title ("Last 7 days"). |

## Example (live: `#/components/sign-in-map/empty` in the playground)

```tsx
import { SignInMap } from "@cleanprompt/sutra-ui/identity";

function EmptyDemo() {
  return <SignInMap events={[]} windowLabel="Last 24 hours" />;
}
```
