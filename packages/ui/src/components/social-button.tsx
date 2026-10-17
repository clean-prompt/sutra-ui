import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import {
  RiAppleFill,
  RiDiscordFill,
  RiFacebookFill,
  RiFigmaFill,
  RiGithubFill,
  RiGitlabFill,
  RiLinkedinFill,
  RiSlackFill,
  RiTwitterXFill,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { Spinner } from "./spinner";

export type SocialProvider =
  | "google"
  | "apple"
  | "github"
  | "microsoft"
  | "x"
  | "facebook"
  | "linkedin"
  | "discord"
  | "slack"
  | "figma"
  | "gitlab";

function GoogleLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  );
}

function MicrosoftLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 23 23" aria-hidden {...props}>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" />
      <path fill="#FFB900" d="M12 12h10v10H12z" />
    </svg>
  );
}

export interface SocialProviderMeta {
  /** Display name, e.g. "GitHub". */
  name: string;
  /** Primary brand color (hex). */
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Icon color classes for the neutral variants (empty when the logo is multicolor or uses currentColor). */
  iconClassName: string;
  /** Fill classes for the `brand` variant. */
  brandClassName: string;
}

/** Name, colors and logo for every supported sign-in provider. */
export const socialProviders: Record<SocialProvider, SocialProviderMeta> = {
  google: {
    name: "Google",
    color: "#4285F4",
    icon: GoogleLogo,
    iconClassName: "",
    brandClassName: "border border-[#DADCE0] bg-white text-[#1F1F1F] hover:bg-[#F8F9FA]",
  },
  apple: {
    name: "Apple",
    color: "#000000",
    icon: RiAppleFill,
    iconClassName: "",
    brandClassName: "bg-black text-white hover:bg-[#1a1a1a]",
  },
  github: {
    name: "GitHub",
    color: "#24292F",
    icon: RiGithubFill,
    iconClassName: "",
    brandClassName: "bg-[#24292F] text-white hover:bg-[#32383F]",
  },
  microsoft: {
    name: "Microsoft",
    color: "#2F2F2F",
    icon: MicrosoftLogo,
    iconClassName: "",
    brandClassName: "bg-[#2F2F2F] text-white hover:bg-[#3B3B3B]",
  },
  x: {
    name: "X",
    color: "#000000",
    icon: RiTwitterXFill,
    iconClassName: "",
    brandClassName: "bg-black text-white hover:bg-[#1a1a1a]",
  },
  facebook: {
    name: "Facebook",
    color: "#1877F2",
    icon: RiFacebookFill,
    iconClassName: "text-[#1877F2]",
    brandClassName: "bg-[#1877F2] text-white hover:bg-[#166FE5]",
  },
  linkedin: {
    name: "LinkedIn",
    color: "#0A66C2",
    icon: RiLinkedinFill,
    iconClassName: "text-[#0A66C2]",
    brandClassName: "bg-[#0A66C2] text-white hover:bg-[#095BAD]",
  },
  discord: {
    name: "Discord",
    color: "#5865F2",
    icon: RiDiscordFill,
    iconClassName: "text-[#5865F2]",
    brandClassName: "bg-[#5865F2] text-white hover:bg-[#4752C4]",
  },
  slack: {
    name: "Slack",
    color: "#4A154B",
    icon: RiSlackFill,
    iconClassName: "text-[#E01E5A]",
    brandClassName: "bg-[#4A154B] text-white hover:bg-[#5C1D5D]",
  },
  figma: {
    name: "Figma",
    color: "#F24E1E",
    icon: RiFigmaFill,
    iconClassName: "text-[#F24E1E]",
    brandClassName: "bg-[#1E1E1E] text-white hover:bg-[#2C2C2C]",
  },
  gitlab: {
    name: "GitLab",
    color: "#FC6D26",
    icon: RiGitlabFill,
    iconClassName: "text-[#FC6D26]",
    brandClassName: "bg-[#E24329] text-white hover:bg-[#C9381F]",
  },
};

export const socialButtonVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2.5 whitespace-nowrap rounded-control font-medium",
    "transition-[color,background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    focusRing,
  ],
  {
    variants: {
      variant: {
        default: "border border-border bg-background text-foreground shadow-xs hover:bg-muted",
        brand: "shadow-xs shadow-inner-highlight",
        icon: "border border-border bg-background text-foreground shadow-xs hover:bg-muted",
      },
      size: {
        sm: "h-8 px-3 text-sm [&_svg]:size-4",
        md: "h-9 px-3.5 text-sm [&_svg]:size-[18px]",
        lg: "h-10 px-4 text-sm [&_svg]:size-5",
      },
      fullWidth: { true: "w-full" },
    },
    compoundVariants: [
      { variant: "icon", size: "sm", className: "w-8 px-0" },
      { variant: "icon", size: "md", className: "w-9 px-0" },
      { variant: "icon", size: "lg", className: "w-10 px-0" },
    ],
    defaultVariants: { variant: "default", size: "md" },
  }
);

export interface SocialButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof socialButtonVariants> {
  provider: SocialProvider;
  asChild?: boolean;
  loading?: boolean;
}

/** OAuth sign-in button with the provider's logo. Defaults to "Continue with {Provider}". */
export const SocialButton = React.forwardRef<HTMLButtonElement, SocialButtonProps>(
  (
    {
      className,
      provider,
      variant,
      size,
      fullWidth,
      asChild,
      loading,
      disabled,
      type,
      children,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    const meta = socialProviders[provider];
    const Icon = meta.icon;
    const isIcon = variant === "icon";
    const label = children ?? `Continue with ${meta.name}`;
    const classes = cn(
      socialButtonVariants({ variant, size, fullWidth: isIcon ? false : fullWidth }),
      variant === "brand" && meta.brandClassName,
      className
    );
    const icon = loading ? (
      <Spinner size="sm" className="text-current" />
    ) : (
      <Icon className={cn(variant !== "brand" && meta.iconClassName)} />
    );
    const a11yLabel = ariaLabel ?? (isIcon ? `Continue with ${meta.name}` : undefined);

    if (asChild) {
      return (
        <Slot.Root ref={ref} className={classes} aria-label={a11yLabel} data-provider={provider} {...props}>
          {icon}
          <Slot.Slottable>{children}</Slot.Slottable>
        </Slot.Root>
      );
    }
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-label={a11yLabel}
        data-provider={provider}
        {...props}
      >
        {icon}
        {!isIcon && label}
      </button>
    );
  }
);
SocialButton.displayName = "SocialButton";
