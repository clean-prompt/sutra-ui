import * as React from "react";
import { RiNotificationOffLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { accentStyle, type Accent } from "../../lib/accent";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Monogram } from "../../primitives/monogram";

/* ------------------------------------------------------------------------------------------------
 * MutedAppsList
 * ----------------------------------------------------------------------------------------------*/

export interface MutedAppsListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** Muted app names. */
  value?: string[];
  /** Initially muted app names when `value` is not controlled. */
  defaultValue?: string[];
  /** Called with the remaining muted apps when the user unmutes one. */
  onValueChange?: (apps: string[]) => void;
  /** Called with the app that was unmuted (in addition to `onValueChange`). */
  onUnmute?: (app: string) => void;
  /** App icons by name. Default: a `Monogram` of the name. */
  appIcons?: Record<string, React.ReactNode>;
  /** Accessible name of the list. Default "Muted apps". */
  label?: string;
  /** Default "No muted apps". */
  emptyState?: React.ReactNode;
  /** Categorical colour. Default "red". */
  accent?: Accent;
}

/** Apps an alert ignores, each with an Unmute button. */
export const MutedAppsList = React.forwardRef<HTMLDivElement, MutedAppsListProps>(
  (
    { value, defaultValue, onValueChange, onUnmute, appIcons, label = "Muted apps", emptyState, accent = "red", className, style, ...props },
    ref
  ) => {
    const [apps, setApps] = useControllableState<string[]>({ value, defaultValue: defaultValue ?? [], onChange: onValueChange });
    const unmute = (app: string) => {
      setApps(apps.filter((a) => a !== app));
      onUnmute?.(app);
    };
    return (
      <div ref={ref} data-slot="muted-apps-list" style={accentStyle(accent, style)} className={cn("flex flex-col text-sm", className)} {...props}>
        {apps.length === 0 ? (
          <div data-slot="muted-apps-empty" className="px-3 py-4 text-center text-muted-foreground">
            {emptyState ?? "No muted apps"}
          </div>
        ) : (
          <ul role="list" aria-label={label} className="m-0 flex list-none flex-col p-0">
            {apps.map((app) => (
              <li key={app} data-slot="muted-app" className="flex items-center gap-3 rounded-box px-3 py-2 hover:bg-muted/50">
                <span aria-hidden className="inline-flex shrink-0">
                  {appIcons?.[app] ?? <Monogram name={app} size="sm" />}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">{app}</span>
                <RiNotificationOffLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <Button variant="ghost" size="xs" onClick={() => unmute(app)} aria-label={`Unmute ${app}`}>
                  Unmute
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);
MutedAppsList.displayName = "MutedAppsList";
