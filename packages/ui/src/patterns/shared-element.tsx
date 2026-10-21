import * as React from "react";
import { viewTransitionName } from "../hooks/use-view-transition";

export interface SharedElementProps extends React.HTMLAttributes<HTMLElement> {
  /** The entity id (a note id, a photo id). The same name on the old and the new screen is what morphs; it must be unique on screen at any one time. */
  name: string | number;
  /** Set false to leave the element unnamed (name only the row that is about to transition, so a long list is not snapshotted whole). Default true. */
  active?: boolean;
  /** `view-transition-class` for the group, so one CSS rule styles every shared element. Default `sutra-shared` (see sutra.css). */
  group?: string;
  /** Element to render. Default `div`. */
  as?: "div" | "span" | "section" | "article" | "figure" | "li" | "header";
}

/**
 * An element that flies between two screens when the change is applied with `useViewTransition`: render it with the same
 * `name` in the list and in the detail view. It is a plain box with a `view-transition-name` (`data-shared-element`
 * carries the name for tests and debugging); without browser support, or under reduced motion, nothing animates.
 */
export const SharedElement = React.forwardRef<HTMLElement, SharedElementProps>(
  ({ name, active = true, group = "sutra-shared", as, className, style, ...props }, ref) => {
    const Comp = (as ?? "div") as React.ElementType;
    return (
      <Comp
        ref={ref}
        data-slot="shared-element"
        data-shared-element={active ? String(name) : undefined}
        {...props}
        className={className}
        style={{ ...style, ...(active ? viewTransitionName(name, group) : null) }}
      />
    );
  }
);
SharedElement.displayName = "SharedElement";
