import * as React from "react";
import { cn } from "../lib/cn";
import { Heading } from "../primitives/typography";

type HeadingLevel = "h1" | "h2" | "h3" | "h4";

export type StatementHeroSize = "md" | "lg";

export interface StatementHeroProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A big mark or icon above the headline. */
  media?: React.ReactNode;
  /** Let the media bob gently (`animate-bob`; it stands still under reduced motion). */
  float?: boolean;
  /** The statement. Set in a big, tight, balanced display size that steps down on phones. */
  title: React.ReactNode;
  /** Heading element for the title. Default `h1`. */
  as?: HeadingLevel;
  /** One or two lines under the title (muted, large, balanced). */
  description?: React.ReactNode;
  /** The one action, e.g. a pill `Button size="xl"` or a `FileUploadTrigger`. */
  action?: React.ReactNode;
  /** A small muted line under the action. */
  hint?: React.ReactNode;
  /** Centre everything (default) or align it to the start edge. */
  align?: "center" | "start";
  /** `lg` is the landing-page statement (110px headline on desktop), `md` a compact section. */
  size?: StatementHeroSize;
  /** Stagger the parts in with `animate-fade-up` (off under reduced motion). Default true. */
  animated?: boolean;
}

const sizeStyles: Record<
  StatementHeroSize,
  { root: string; title: React.ComponentProps<typeof Heading>["size"]; description: string; media: string; action: string }
> = {
  lg: {
    root: "py-16 md:py-24",
    media: "mb-6 md:mb-8",
    title: "display-3xl",
    description: "max-w-xl text-lg md:text-xl",
    action: "mt-8 md:mt-10",
  },
  md: {
    root: "py-10 md:py-14",
    media: "mb-5",
    title: "display-xl",
    description: "max-w-lg text-base md:text-lg",
    action: "mt-6 md:mt-8",
  },
};

/** Stagger between the parts, in ms. */
const STEP = 70;

/** A centred statement section: big mark, headline, short subtitle, one action and a hint. */
export const StatementHero = React.forwardRef<HTMLElement, StatementHeroProps>(
  (
    {
      media,
      float = false,
      title,
      as = "h1",
      description,
      action,
      hint,
      align = "center",
      size = "lg",
      animated = true,
      className,
      ...props
    },
    ref
  ) => {
    const titleId = React.useId();
    const look = sizeStyles[size] ?? sizeStyles.lg;
    const centered = align === "center";
    // Parts that exist, in order, so the stagger has no gaps when a slot is empty.
    let step = 0;
    const part = (extra?: string) => {
      const style: React.CSSProperties | undefined = animated ? { animationDelay: `${step * STEP}ms` } : undefined;
      step += 1;
      return { className: cn(animated && "animate-fade-up", extra), style };
    };
    const mediaPart = media ? part(look.media) : null;
    const titlePart = part();
    const descriptionPart = description ? part(cn("text-balance text-muted-foreground", look.description)) : null;
    const actionPart = action ? part(look.action) : null;
    const hintPart = hint ? part("mt-4 text-sm text-muted-foreground") : null;

    return (
      <section
        ref={ref}
        data-slot="statement-hero"
        aria-labelledby={titleId}
        data-size={size}
        data-align={align}
        className={cn(
          "flex w-full flex-col",
          centered ? "items-center text-center" : "items-start text-start",
          look.root,
          className
        )}
        {...props}
      >
        {mediaPart ? (
          <div {...mediaPart}>
            <div className={cn(float && "animate-bob")}>{media}</div>
          </div>
        ) : null}
        <Heading
          id={titleId}
          as={as}
          size={look.title}
          className={cn("max-w-5xl", titlePart.className)}
          style={titlePart.style}
        >
          {title}
        </Heading>
        {descriptionPart ? (
          <p {...descriptionPart} className={cn("mt-5 md:mt-6", descriptionPart.className)}>
            {description}
          </p>
        ) : null}
        {actionPart ? (
          <div {...actionPart} className={cn("flex flex-wrap gap-3", centered && "justify-center", actionPart.className)}>
            {action}
          </div>
        ) : null}
        {hintPart ? <p {...hintPart}>{hint}</p> : null}
      </section>
    );
  }
);
StatementHero.displayName = "StatementHero";
