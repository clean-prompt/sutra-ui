import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { RiArrowLeftLine, RiArrowRightSLine, RiCloseLine, RiLockLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { useElementWidth } from "../hooks/use-resize-observer";
import { Button } from "../primitives/button";
import { Switch } from "../primitives/switch";

/* ------------------------------------------------------------------ */
/* SettingsShell                                                       */
/* ------------------------------------------------------------------ */

export interface SettingsShellSection {
  id: string;
  label: string;
  /** One-line blurb shown in the narrow drill-in list. */
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Section body. Alternatively render it from the `children` function. */
  content?: React.ReactNode;
}

export type SettingsShellLayout = "auto" | "split" | "stacked";

export interface SettingsShellProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  sections: SettingsShellSection[];
  /** Open section id. In the stacked layout `null` shows the section list. */
  section?: string | null;
  defaultSection?: string | null;
  onSectionChange?: (section: string | null) => void;
  /** Section body: a node, or a render function receiving the open section id. */
  children?: React.ReactNode | ((section: string) => React.ReactNode);
  title?: React.ReactNode;
  /** `auto` switches to the drill-in list when the container is narrower than `breakpoint`. */
  layout?: SettingsShellLayout;
  breakpoint?: number;
  /** Shows a close button and closes on Escape (unless a nested layer handled it). */
  onClose?: () => void;
  /** Listen for Escape when `onClose` is set. Default true. */
  closeOnEscape?: boolean;
  /** Content pinned to the bottom of the desktop nav. */
  navFooter?: React.ReactNode;
}

function useContainerNarrow(ref: React.RefObject<HTMLElement | null>, breakpoint: number, enabled: boolean) {
  const width = useElementWidth(enabled ? ref : null);
  return width > 0 && width < breakpoint;
}

const navItemClass = cn(
  "flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-sm font-medium text-muted-foreground transition-colors",
  "hover:bg-accent hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground",
  "[&_svg]:size-4 [&_svg]:shrink-0",
  focusRing
);

/** Responsive settings layout: two panes with section nav, or a drill-in list on narrow containers. */
export const SettingsShell = React.forwardRef<HTMLDivElement, SettingsShellProps>(
  (
    {
      sections,
      section: sectionProp,
      defaultSection = null,
      onSectionChange,
      children,
      title = "Settings",
      layout = "auto",
      breakpoint = 640,
      onClose,
      closeOnEscape = true,
      navFooter,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const rootRef = React.useRef<HTMLDivElement>(null);
    React.useImperativeHandle(forwardedRef, () => rootRef.current as HTMLDivElement);
    const measuredNarrow = useContainerNarrow(rootRef, breakpoint, layout === "auto");
    const stacked = layout === "stacked" || (layout === "auto" && measuredNarrow);
    const [section, setSection] = useControllableState<string | null>({
      value: sectionProp,
      defaultValue: defaultSection,
      onChange: onSectionChange,
    });
    const headingId = React.useId();

    const valid = sections.find((s) => s.id === section);
    const current = valid ?? (stacked ? undefined : sections[0]);
    const showingList = stacked && !current;

    React.useEffect(() => {
      if (!onClose || !closeOnEscape) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key !== "Escape" || e.defaultPrevented) return;
        // A menu, popover or nested dialog is open: let it close first.
        if (document.querySelector("[data-radix-popper-content-wrapper], [role=dialog][data-state=open]:not([data-settings-dialog])")) return;
        onClose();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [onClose, closeOnEscape]);

    const body = current
      ? (current.content ?? (typeof children === "function" ? children(current.id) : children))
      : null;

    const closeButton = onClose ? (
      <Button variant="ghost" size="icon-sm" aria-label="Close settings" onClick={onClose} className="text-muted-foreground">
        <RiCloseLine aria-hidden />
      </Button>
    ) : null;

    return (
      <div
        ref={rootRef}
        data-slot="settings-shell"
        data-layout={stacked ? "stacked" : "split"}
        className={cn("flex h-full min-h-0 w-full bg-background text-foreground", className)}
        {...props}
      >
        {!stacked && (
          <nav
            aria-label="Settings sections"
            className="flex w-56 shrink-0 flex-col gap-0.5 border-r border-border bg-subtle p-3"
          >
            <div className="px-2.5 pb-3 pt-1 text-sm font-semibold text-foreground">{title}</div>
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-current={current?.id === s.id ? "page" : undefined}
                onClick={() => setSection(s.id)}
                className={navItemClass}
              >
                {s.icon}
                <span className="truncate">{s.label}</span>
              </button>
            ))}
            {navFooter && <div className="mt-auto pt-3">{navFooter}</div>}
          </nav>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
            {stacked && current && (
              <Button variant="ghost" size="icon-sm" aria-label="Back to settings" onClick={() => setSection(null)} className="-ml-1.5">
                <RiArrowLeftLine aria-hidden />
              </Button>
            )}
            <h2 id={headingId} className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">
              {showingList ? title : current?.label}
            </h2>
            {closeButton}
          </div>
          {showingList ? (
            <nav aria-label="Settings sections" className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-thin">
              <ul className="flex flex-col">
                {sections.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSection(s.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-box px-3 py-3 text-left transition-colors hover:bg-accent",
                        focusRing
                      )}
                    >
                      {s.icon && (
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">
                          {s.icon}
                        </span>
                      )}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-medium text-foreground">{s.label}</span>
                        {s.description != null && (
                          <span className="truncate text-xs text-muted-foreground">{s.description}</span>
                        )}
                      </span>
                      <RiArrowRightSLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          ) : (
            <div
              role="region"
              aria-labelledby={headingId}
              className="min-h-0 flex-1 overflow-y-auto px-4 py-5 scrollbar-thin sm:px-6"
            >
              {body}
            </div>
          )}
        </div>
      </div>
    );
  }
);
SettingsShell.displayName = "SettingsShell";

/* ------------------------------------------------------------------ */
/* SettingsDialog                                                      */
/* ------------------------------------------------------------------ */

export interface SettingsDialogProps extends Omit<SettingsShellProps, "onClose" | "closeOnEscape"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog (wrapped with `asChild`). */
  trigger?: React.ReactNode;
  contentClassName?: string;
}

/** `SettingsShell` inside a modal dialog. Escape closes only the topmost layer. */
export function SettingsDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger,
  title = "Settings",
  contentClassName,
  ...shellProps
}: SettingsDialogProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          data-settings-dialog=""
          aria-describedby={undefined}
          className={cn(
            "fixed z-50 flex overflow-hidden border border-border bg-background shadow-2xl outline-none",
            "inset-x-0 bottom-0 h-[92dvh] rounded-t-2xl",
            "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[min(640px,calc(100dvh-2rem))] sm:w-[min(880px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "max-sm:data-[state=open]:slide-in-from-bottom sm:data-[state=open]:zoom-in-95",
            contentClassName
          )}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <SettingsShell {...shellProps} title={title} closeOnEscape={false} onClose={() => setOpen(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
SettingsDialog.displayName = "SettingsDialog";

/* ------------------------------------------------------------------ */
/* SettingsSection / SettingsGroup                                     */
/* ------------------------------------------------------------------ */

export interface SettingsSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned header content (e.g. a "Reset" button). */
  actions?: React.ReactNode;
}

/** A titled block of settings groups. */
export const SettingsSection = React.forwardRef<HTMLElement, SettingsSectionProps>(
  ({ title, description, actions, className, children, ...props }, ref) => {
    const id = React.useId();
    return (
      <section
        ref={ref}
        aria-labelledby={title != null ? id : undefined}
        className={cn("flex flex-col gap-5 [&+&]:mt-8", className)}
        {...props}
      >
        {(title != null || description != null || actions) && (
          <header className="flex items-start gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              {title != null && (
                <h3 id={id} className="text-base font-semibold tracking-tight text-foreground">
                  {title}
                </h3>
              )}
              {description != null && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions}
          </header>
        )}
        {children}
      </section>
    );
  }
);
SettingsSection.displayName = "SettingsSection";

export interface SettingsGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  /** Muted note under the group. */
  footer?: React.ReactNode;
}

/** Inset rounded list of rows separated by hairlines. */
export const SettingsGroup = React.forwardRef<HTMLDivElement, SettingsGroupProps>(
  ({ title, footer, className, children, ...props }, ref) => {
    const id = React.useId();
    return (
      <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props}>
        {title != null && (
          <h4 id={id} className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </h4>
        )}
        <div
          role="group"
          aria-labelledby={title != null ? id : undefined}
          className="overflow-hidden rounded-box border border-border bg-card shadow-xs divide-y divide-border"
        >
          {children}
        </div>
        {footer != null && <p className="px-1 text-xs text-muted-foreground">{footer}</p>}
      </div>
    );
  }
);
SettingsGroup.displayName = "SettingsGroup";

/* ------------------------------------------------------------------ */
/* SettingsRow                                                         */
/* ------------------------------------------------------------------ */

interface SettingsRowCommon {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Why the setting can't be changed; disables the row and shows a muted note. */
  disabledReason?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface SettingsToggleRowProps extends SettingsRowCommon {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export interface SettingsNavRowProps extends SettingsRowCommon {
  /** Current value shown before the chevron, e.g. "System" or "3". */
  value?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  href?: string;
}

export interface SettingsStaticRowProps extends SettingsRowCommon {
  /** Control rendered on the right (select, button, badge…). */
  children?: React.ReactNode;
}

export type SettingsRowProps =
  | ({ type: "toggle" } & SettingsToggleRowProps)
  | ({ type: "nav" } & SettingsNavRowProps)
  | ({ type?: "static" } & SettingsStaticRowProps);

const rowBase = "flex w-full items-center gap-3 px-4 py-3 text-left";

function RowText({
  icon,
  title,
  description,
  disabledReason,
  titleId,
  descriptionId,
}: SettingsRowCommon & { titleId?: string; descriptionId?: string }) {
  return (
    <>
      {icon && (
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center self-start rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span id={titleId} className="text-sm font-medium text-foreground">
          {title}
        </span>
        {(description != null || disabledReason != null) && (
          <span id={descriptionId} className="flex flex-col gap-0.5">
            {description != null && <span className="text-xs leading-snug text-muted-foreground">{description}</span>}
            {disabledReason != null && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/80">
                <RiLockLine aria-hidden className="size-3 shrink-0" />
                {disabledReason}
              </span>
            )}
          </span>
        )}
      </span>
    </>
  );
}

/**
 * A settings row: static with a control slot, a toggle row (whole row clickable) or a nav row with value + chevron.
 * Use `type="toggle"` inside a `SettingsGroup` (icon slot, `disabledReason`, full-row hover and click target);
 * use `SwitchField` / `SwitchGroup` for switches inside ordinary forms.
 */
export const SettingsRow = React.forwardRef<HTMLElement, SettingsRowProps>(function SettingsRow(props, ref) {
  const id = React.useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-desc`;
  const hasDesc = props.description != null || props.disabledReason != null;
  const disabled = Boolean(props.disabled || props.disabledReason != null);
  const text = (
    <RowText
      icon={props.icon}
      title={props.title}
      description={props.description}
      disabledReason={props.disabledReason}
      titleId={titleId}
      descriptionId={hasDesc ? descriptionId : undefined}
    />
  );

  if (props.type === "toggle") {
    return (
      <SettingsToggleRow
        {...props}
        rowRef={ref as React.Ref<HTMLLabelElement>}
        disabled={disabled}
        text={text}
        titleId={titleId}
        descriptionId={hasDesc ? descriptionId : undefined}
      />
    );
  }

  if (props.type === "nav") {
    const { value, onClick, href, className } = props;
    const inner = (
      <>
        {text}
        {value != null && <span className="max-w-[40%] shrink-0 truncate text-sm text-muted-foreground">{value}</span>}
        <RiArrowRightSLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </>
    );
    const cls = cn(
      rowBase,
      "transition-colors hover:bg-accent",
      disabled && "pointer-events-none opacity-60",
      focusRing,
      "focus-visible:ring-inset",
      className
    );
    if (href && !disabled) {
      return (
        <a ref={ref as React.Ref<HTMLAnchorElement>} href={href} onClick={onClick} className={cls} data-slot="settings-row">
          {inner}
        </a>
      );
    }
    return (
      <button ref={ref as React.Ref<HTMLButtonElement>} type="button" onClick={onClick} disabled={disabled} className={cls} data-slot="settings-row">
        {inner}
      </button>
    );
  }

  const { children, className } = props as SettingsStaticRowProps;
  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      role="group"
      aria-labelledby={titleId}
      aria-describedby={hasDesc ? descriptionId : undefined}
      aria-disabled={disabled || undefined}
      data-slot="settings-row"
      className={cn(rowBase, disabled && "[&>*:last-child]:opacity-60", className)}
    >
      {text}
      {children != null && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
});
SettingsRow.displayName = "SettingsRow";

function SettingsToggleRow({
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  className,
  text,
  titleId,
  descriptionId,
  rowRef,
}: SettingsToggleRowProps & { text: React.ReactNode; titleId: string; descriptionId?: string; rowRef?: React.Ref<HTMLLabelElement> }) {
  const [on, setOn] = useControllableState({ value: checked, defaultValue: defaultChecked, onChange: onCheckedChange });
  const switchId = React.useId();
  return (
    <label
      ref={rowRef}
      htmlFor={switchId}
      data-slot="settings-row"
      data-disabled={disabled || undefined}
      className={cn(
        rowBase,
        "cursor-pointer select-none transition-colors hover:bg-accent",
        disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
        className
      )}
    >
      {text}
      <Switch
        id={switchId}
        checked={on}
        onCheckedChange={setOn}
        disabled={disabled}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* SettingsDangerZone                                                  */
/* ------------------------------------------------------------------ */

export interface SettingsDangerZoneProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
}

/** Destructive settings, fenced off in a red-bordered group. */
export const SettingsDangerZone = React.forwardRef<HTMLElement, SettingsDangerZoneProps>(
  ({ title = "Danger zone", description, className, children, ...props }, ref) => {
    const id = React.useId();
    return (
      <section ref={ref} aria-labelledby={id} className={cn("flex flex-col gap-2", className)} {...props}>
        <div className="space-y-0.5 px-1">
          <h4 id={id} className="text-xs font-medium uppercase tracking-wide text-destructive">
            {title}
          </h4>
          {description != null && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="overflow-hidden rounded-box border border-destructive/40 bg-destructive-soft/30 divide-y divide-destructive/20">
          {children}
        </div>
      </section>
    );
  }
);
SettingsDangerZone.displayName = "SettingsDangerZone";
