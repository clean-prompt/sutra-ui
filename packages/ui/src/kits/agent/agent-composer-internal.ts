/* Private helpers shared by the agent-composer modules. Not public. */

import { cn, focusRing } from "../../lib/cn";

export const iconAction = cn(
  "inline-flex size-6 shrink-0 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5",
  focusRing
);
