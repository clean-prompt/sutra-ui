/**
 * The accessible-name contract of the decorative-by-default SVG assets (internal): SutraMascot, SutradharSting, InkEmoji and
 * the brand marks all read `title` the same way. A string names the graphic, `true` uses the component's own label, and
 * leaving it out (or an empty string) makes the graphic decorative (hidden from assistive technology).
 */

/** The accessible name for a `title` prop, or undefined when the graphic is decorative. */
export function accessibleName(title: string | boolean | undefined, label: string | undefined): string | undefined {
  const name = typeof title === "string" ? title : title === true ? label : undefined;
  return name || undefined;
}

/** The root attributes of a named (`role="img"`, labelled by its `<title id>`) or decorative (`aria-hidden`) svg. */
export function svgA11y(name: string | undefined, titleId: string) {
  return name
    ? ({ role: "img", "aria-labelledby": titleId } as const)
    : ({ "aria-hidden": true, focusable: "false" } as const);
}
