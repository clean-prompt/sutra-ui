import * as React from "react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { RiArrowDownSLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useRootDirection } from "../hooks/use-direction";

export type AccordionVariant = "default" | "bordered" | "ghost" | "surface" | "separated";
export type AccordionIcon = "chevron" | "plus";

const AccordionContext = React.createContext<{ variant: AccordionVariant; icon: AccordionIcon; keepMounted: boolean }>({
  variant: "default",
  icon: "chevron",
  keepMounted: false,
});

export type AccordionProps = React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root> & {
  /**
   * default: divided list · bordered: separate bordered cards · ghost: no chrome ·
   * surface: one bordered panel with divided rows · separated: separate soft filled blocks
   */
  variant?: AccordionVariant;
  /** Keep every panel in the tree while closed (hidden), so form state and iframes survive; panels can override it. */
  keepMounted?: boolean;
  /** Trigger indicator: rotating chevron or plus that morphs into minus. */
  icon?: AccordionIcon;
};

/** Vertically stacked set of collapsible sections. */
export const Accordion = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Root>,
  AccordionProps
>(({ className, variant = "default", icon = "chevron", keepMounted = false, ...props }, ref) => {
  const { ref: rootRef, dir } = useRootDirection(ref);
  const ctx = React.useMemo(() => ({ variant, icon, keepMounted }), [variant, icon, keepMounted]);
  return (
    <AccordionContext.Provider value={ctx}>
      <AccordionPrimitive.Root
        ref={rootRef}
        dir={dir}
        className={cn(
          "w-full",
          variant === "bordered" && "flex flex-col gap-3",
          variant === "ghost" && "flex flex-col gap-1",
          variant === "separated" && "flex flex-col gap-2",
          variant === "surface" && "overflow-hidden rounded-box border border-border bg-card shadow-xs",
          className
        )}
        {...props}
      />
    </AccordionContext.Provider>
  );
});
Accordion.displayName = "Accordion";

export type AccordionItemProps = React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>;

/** A single collapsible section. */
export const AccordionItem = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Item>,
  AccordionItemProps
>(({ className, ...props }, ref) => {
  const { variant } = React.useContext(AccordionContext);
  return (
    <AccordionPrimitive.Item
      ref={ref}
      className={cn(
        (variant === "default" || variant === "surface") && "border-b border-border last:border-b-0",
        variant === "separated" && "overflow-hidden rounded-box bg-subtle transition-colors data-[state=open]:bg-muted",
        variant === "bordered" &&
          "overflow-hidden rounded-box border border-border bg-card shadow-xs transition-shadow data-[state=open]:shadow-sm",
        variant === "ghost" && "rounded-md transition-colors data-[state=open]:bg-subtle",
        className
      )}
      {...props}
    />
  );
});
AccordionItem.displayName = "AccordionItem";

function PlusMinus() {
  return (
    <span aria-hidden className="relative size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground">
      <span className="absolute start-0.5 end-0.5 top-1/2 h-[1.5px] -translate-y-1/2 rounded-full bg-current" />
      <span className="absolute bottom-0.5 start-1/2 top-0.5 w-[1.5px] -translate-x-1/2 rtl:translate-x-1/2 rounded-full bg-current chevron-turn group-data-[state=open]:rotate-90 group-data-[state=open]:scale-y-0" />
    </span>
  );
}

export interface AccordionTriggerProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {
  /** Icon shown before the title. */
  leadingIcon?: React.ReactNode;
  /** Override the indicator for this trigger, or `false` to hide it. */
  icon?: AccordionIcon | false;
}

/** Clickable header that toggles its section. */
export const AccordionTrigger = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Trigger>,
  AccordionTriggerProps
>(({ className, children, leadingIcon, icon: iconProp, ...props }, ref) => {
  const ctx = React.useContext(AccordionContext);
  const icon = iconProp === undefined ? ctx.icon : iconProp;
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn(
          "group flex flex-1 cursor-pointer items-center gap-3 rounded-md py-4 text-start text-sm font-medium text-foreground transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-50",
          ctx.variant === "default" && "hover:text-foreground/80",
          ctx.variant === "bordered" && "rounded-none px-5 hover:bg-subtle",
          ctx.variant === "surface" && "rounded-none px-5 hover:bg-subtle focus-visible:ring-inset",
          ctx.variant === "separated" && "rounded-none px-5 focus-visible:ring-inset",
          ctx.variant === "ghost" && "px-3 py-3 hover:bg-accent data-[state=open]:hover:bg-transparent",
          focusRing,
          className
        )}
        {...props}
      >
        {leadingIcon ? (
          <span className="flex shrink-0 text-muted-foreground transition-colors group-data-[state=open]:text-primary [&_svg]:size-[18px]">
            {leadingIcon}
          </span>
        ) : null}
        <span className="flex-1">{children}</span>
        {icon === "chevron" ? (
          <RiArrowDownSLine
            aria-hidden
            className="size-[18px] shrink-0 text-muted-foreground chevron-turn group-hover:text-foreground group-data-[state=open]:rotate-180"
          />
        ) : icon === "plus" ? (
          <PlusMinus />
        ) : null}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

export type AccordionContentProps = React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> & {
  /** Keep this panel in the tree while closed; overrides the `Accordion` setting. */
  keepMounted?: boolean;
};

/** Animated collapsible body. */
export const AccordionContent = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Content>,
  AccordionContentProps
>(({ className, children, keepMounted, forceMount, ...props }, ref) => {
  const { variant, keepMounted: keepAll } = React.useContext(AccordionContext);
  const keep = forceMount ?? ((keepMounted ?? keepAll) ? true : undefined);
  return (
    <AccordionPrimitive.Content
      ref={ref}
      forceMount={keep}
      className={cn(
        "overflow-hidden text-sm text-muted-foreground data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
        keep && "data-[state=closed]:hidden"
      )}
      {...props}
    >
      <div
        className={cn(
          "pb-4 leading-relaxed",
          (variant === "bordered" || variant === "surface" || variant === "separated") && "px-5",
          variant === "ghost" && "px-3 pb-3",
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
});
AccordionContent.displayName = "AccordionContent";

export interface FAQEntry {
  question: React.ReactNode;
  answer: React.ReactNode;
  value?: string;
  icon?: React.ReactNode;
}

export interface FAQProps {
  items: FAQEntry[];
  variant?: AccordionVariant;
  icon?: AccordionIcon;
  /** Allow several answers open at once. */
  multiple?: boolean;
  /** Value(s) open initially (item values default to their index as a string). */
  defaultValue?: string | string[];
  /** Controlled open value(s). A string for single mode, an array with `multiple`. */
  value?: string | string[];
  /** Called with the open value(s): a string (empty when collapsed) in single mode, an array with `multiple`. */
  onValueChange?: (value: string | string[]) => void;
  className?: string;
}

/** Data-driven FAQ list built on `Accordion`. */
export const FAQ = React.forwardRef<HTMLDivElement, FAQProps>(
  ({ items, variant = "default", icon = "plus", multiple, defaultValue, value, onValueChange, className }, ref) => {
    const toArray = (v: string | string[] | undefined) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);
    const toSingle = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : v);
    const content = items.map((item, i) => (
      <AccordionItem key={item.value ?? i} value={item.value ?? String(i)}>
        <AccordionTrigger leadingIcon={item.icon} className="text-base">
          {item.question}
        </AccordionTrigger>
        <AccordionContent>{item.answer}</AccordionContent>
      </AccordionItem>
    ));
    if (multiple) {
      return (
        <Accordion
          ref={ref}
          type="multiple"
          variant={variant}
          icon={icon}
          className={className}
          defaultValue={toArray(defaultValue)}
          {...(value !== undefined ? { value: toArray(value) } : {})}
          onValueChange={onValueChange}
        >
          {content}
        </Accordion>
      );
    }
    return (
      <Accordion
        ref={ref}
        type="single"
        collapsible
        variant={variant}
        icon={icon}
        className={className}
        defaultValue={toSingle(defaultValue)}
        {...(value !== undefined ? { value: toSingle(value) } : {})}
        onValueChange={onValueChange}
      >
        {content}
      </Accordion>
    );
  }
);
FAQ.displayName = "FAQ";
