/** Private helpers shared by the auth cards: social buttons, the back link and the link class. */
import * as React from "react";
import { RiArrowLeftLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { useAsyncAction } from "../hooks/use-async-action";
import { SocialButton, socialProviders, type SocialProvider } from "../primitives/social-button";
import { textLinkVariants } from "../primitives/text-link";
import { BlockLink, type BlockLinkRenderer } from "./block-utils";

export const linkClass = textLinkVariants({ variant: "default", underline: "hover" });

export interface AuthSocialButtonsProps {
  providers: SocialProvider[];
  layout: "grid" | "stack";
  pending: SocialProvider | null;
  disabled?: boolean;
  onSelect: (provider: SocialProvider) => void;
}

export function AuthSocialButtons({ providers, layout, pending, disabled, onSelect }: AuthSocialButtonsProps) {
  if (providers.length === 0) return null;
  const grid = layout === "grid" && providers.length > 1 && providers.length <= 3;
  return (
    <div className={cn(grid ? cn("grid gap-2", providers.length === 2 ? "grid-cols-2" : "grid-cols-3") : "flex flex-col gap-2.5")}>
      {providers.map((p) => (
        <SocialButton
          key={p}
          provider={p}
          fullWidth
          size="lg"
          loading={pending === p}
          disabled={disabled || (pending != null && pending !== p)}
          onClick={() => onSelect(p)}
          aria-label={grid ? `Continue with ${socialProviders[p].name}` : undefined}
        >
          {grid ? <span className="hidden min-[400px]:inline">{socialProviders[p].name}</span> : undefined}
        </SocialButton>
      ))}
    </div>
  );
}

export function useSocial(onSocial?: (provider: SocialProvider) => unknown) {
  const [provider, setProvider] = React.useState<SocialProvider | null>(null);
  const action = useAsyncAction((p: SocialProvider) => onSocial?.(p));
  const select = (p: SocialProvider) => {
    if (!onSocial) return;
    setProvider(p);
    void action.run(p);
  };
  return { pending: action.busy ? provider : null, error: action.error, select };
}

export function BackLink({ href, label, renderLink }: { href: string; label: React.ReactNode; renderLink?: BlockLinkRenderer }) {
  return (
    <BlockLink
      href={href}
      renderLink={renderLink}
      className={cn(textLinkVariants({ variant: "muted", underline: "none" }), "gap-1.5 text-sm")}
    >
      <RiArrowLeftLine className="size-4 rtl:-scale-x-100" aria-hidden />
      {label}
    </BlockLink>
  );
}
