/** The `filled` look: a tinted surface with no visible border and no shadow (the border and surface come back on focus). */
export const filledShell = "border-transparent bg-muted shadow-none";

/**
 * The `filled` look for popover triggers (select, combobox, date pickers), for their own `variant` map: the filled shell,
 * no border on hover, and the plain surface back on keyboard focus and while the popover is open (the ring comes from the
 * trigger's own open styling).
 */
export const filledTrigger = [filledShell, "hover:border-transparent focus-visible:bg-background data-[state=open]:bg-background"];
