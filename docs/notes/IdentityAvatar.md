---
component: IdentityAvatar
module: patterns/identity-avatar
use: Anyone in a Sutra room drawn as one family: people as a photo or drawn initials, agents and machines as a Sutra mascot head whose face follows their presence, apps as their Bead tile. Presence is a shaped mark in the corner or a bead on a thread round the face; ink in the paper style, the seed tint in the stock style.
instead: Avatar = a plain person picture with a coloured status dot and a verified badge; AgentAvatar = the persona builder's generated faces (shapes, visors, uploads); SutraMascot = the assistant itself at any size, with all eight states and its motion; SutraAppIcon = an app icon on its own, outside a list of people
server: mixed
---

## Keyboard
Not focusable: no keyboard interaction. Wrap it in a `Button` or a link when it should open a profile.

## Screen readers
- With a `name` the avatar is `role="img"` named from the name, the kind and the presence: "Asha Rao, online", "Ada, agent, busy", "Notes, app". `label` replaces that name. Without a name, or with `decorative`, it is `aria-hidden`; use `decorative` when the name is printed next to it (member lists, chat rows), so it is heard once.
- The drawing inside (the svg, the mascot, the app tile) is always hidden; the presence is part of the name, never colour or shape alone.

## Reduced motion
Avatars hold still by default: an agent's mascot is paused at its expression for the presence. With `animated` the mascot moves and a busy agent's bead slides along its thread; `prefersReducedMotion()` (system setting or `<html data-motion>`) keeps the mascot still and the twin blocks in `sutra.css` stop the slide, so the bead stays at its place.

## Server rendering
The markup is the same on the server and the client, photo included (an SVG `<image>`, so the initials do not flash). The server assumes left-to-right, so on a right-to-left page the presence moves to the start corner after hydration. A photo that fails to load is swapped for the initials on the client.

## Slots
- `identity-avatar`: the root (`data-kind`, `data-presence`, `data-presence-style`, `data-character`, `data-photo`); its parts carry `data-part` (`disc`, `hairline`, `monogram`, `photo`, `frame`, `mascot`, `app`, `presence`, `thread`, `bead`), each painted in `currentColor` and coloured by the "Identity avatar" section of `sutra.css`.

## Gotchas
- Kinds: `person` (default) draws `src` or the initials; `agent` draws a mascot head in a circle and `machine` the same in a rounded square, with the face following the presence (online awake, busy at work, away asleep, offline asleep and dimmed); `app` draws `SutraAppIcon` for a Sutra `app`, or a tile with the initials of `name` for any other app, always with the mark presence. `seed` (a stable id, defaulting to `name`) picks the stock colour and an agent's mascot (`identityAvatarCharacter(seed)`, any character but the Sutradhar, whose head and shoulders reads as a person without a photo); `character` chooses one, the Sutradhar included, and `color` overrides the seed colour (the paper style draws everything in one ink regardless).
- `monogram="drawn"` (default) draws the initials as monoline strokes, A to Z and 0 to 9, with accents folded ("Zoë Åberg" is ZA); any other letter or script falls back to the UI font, as does `monogram="text"`. Under 32 px one initial is shown.
- `presenceStyle="mark"` (default) cuts a transparent gap and draws a solid (online), barred (busy), half (away) or hollow (offline) mark at the logical end corner, so it sits on any surface. `presenceStyle="bead"` threads the face (a full thread online, a barred bead busy, half a thread away, a dashed thread and hollow bead offline); the thread follows a machine's square and is left out when there is no presence, so chat rows stay plain.
- Sizes are steps from `xs` (20 px) to `xl` (64 px) or any number of pixels; the drawing is in pixel units, so strokes, marks and the mascot's features are tuned for the size rather than scaled. To overlap a group, use negative spacing and a `ring-2 ring-background` (`rounded-full`) on each avatar, as `AvatarGroup` does for `Avatar`.

## Example
```tsx
import { IdentityAvatar } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <ul className="flex flex-col gap-2">
      <li className="flex items-center gap-2">
        <IdentityAvatar name="Asha Rao" src="/avatars/asha.jpg" presence="online" size="sm" decorative />
        <span className="text-sm">Asha Rao</span>
      </li>
      <li className="flex items-center gap-2">
        <IdentityAvatar kind="agent" name="Ada" seed="agent:ada" presence="busy" presenceStyle="bead" size="sm" decorative />
        <span className="text-sm">Ada, planner</span>
      </li>
      <li className="flex items-center gap-2">
        <IdentityAvatar kind="app" app="calendar" size="sm" decorative />
        <span className="text-sm">Calendar</span>
      </li>
    </ul>
  );
}
```
