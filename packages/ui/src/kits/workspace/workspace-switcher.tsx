/** Workspace switcher: the WorkspaceProfileSwitcher and ProfileScopeBanner, plus re-exports of the ConnectionRegistry and GatewayStatusPopover, one module per family. */
import * as React from "react";
import {
  RiAddLine,
  RiArrowGoBackLine,
  RiArrowUpDownLine,
  RiCheckLine,
  RiCloudLine,
  RiComputerLine,
  RiSettings3Line,
  RiUserSettingsLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { InlineAlert } from "../../primitives/inline-alert";
import { Badge } from "../../primitives/badge";
import { AgentAvatar, randomAvatarSpec, type AgentAvatarSpec } from "../../patterns/agent-avatar";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../../patterns/command-menu";

export * from "./workspace-switcher-connections";
export * from "./workspace-switcher-status";

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

export type WorkspaceGatewayReachability = "reachable" | "unreachable" | "connecting";

const reachabilityMeta: Record<WorkspaceGatewayReachability, { label: string; dot: string }> = {
  reachable: { label: "Reachable", dot: "bg-success" },
  unreachable: { label: "Unreachable", dot: "bg-destructive" },
  connecting: { label: "Connecting", dot: "bg-warning motion-safe:animate-pulse" },
};

/** Small reachability dot with screen-reader text. */
function ReachabilityDot({ state, className }: { state: WorkspaceGatewayReachability; className?: string }) {
  const meta = reachabilityMeta[state];
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)} data-reachability={state}>
      <span aria-hidden className={cn("inline-flex size-full rounded-full", meta.dot)} />
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* WorkspaceProfileSwitcher                                            */
/* ------------------------------------------------------------------ */

export interface WorkspaceProfile {
  id: string;
  name: string;
  /** Agent avatar spec; generated from the id when omitted. */
  avatar?: AgentAvatarSpec;
  description?: string;
  isDefault?: boolean;
}

export interface WorkspaceGateway {
  id: string;
  name: string;
  kind: "local" | "remote";
  /** Host or URL shown under the name. */
  host?: string;
  reachability: WorkspaceGatewayReachability;
  /** Round-trip latency in ms. */
  latencyMs?: number;
  profiles: WorkspaceProfile[];
}

export interface WorkspaceSelection {
  gatewayId: string;
  profileId: string;
}

export interface WorkspaceProfileSwitcherProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "defaultValue" | "children" | "type"> {
  /**
   * Gateways and their profiles; unreachable gateways are listed but cannot be picked unless `allowUnreachable` is
   * set.
   */
  gateways: WorkspaceGateway[];
  /** Controlled selection: the gateway id and profile id. */
  value?: WorkspaceSelection;
  /** Initial selection when `value` is not controlled. */
  defaultValue?: WorkspaceSelection;
  /** Called with the new selection and the chosen gateway and profile when the user picks a profile. */
  onValueChange?: (value: WorkspaceSelection, detail: { gateway: WorkspaceGateway; profile: WorkspaceProfile }) => void;
  /** Called when the user presses Manage connections in the menu; the item is hidden when unset. */
  onManageConnections?: () => void;
  /** "New profile" action; receives the gateway of the current selection. */
  onNewProfile?: (gatewayId?: string) => void;
  /** Controlled open state of the menu. */
  open?: boolean;
  /** Initial open state when `open` is not controlled. */
  defaultOpen?: boolean;
  /** Called when the menu opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Allow picking profiles on unreachable gateways. Default false. */
  allowUnreachable?: boolean;
  /** Placeholder of the search field. Default "Search gateways and profiles…". */
  searchPlaceholder?: string;
  /** Disables the trigger. */
  disabled?: boolean;
  /** Extra classes for the trigger button. */
  className?: string;
  /** Extra classes for the menu content. */
  contentClassName?: string;
}

function findSelection(gateways: WorkspaceGateway[], sel?: WorkspaceSelection) {
  if (!sel) return null;
  const gateway = gateways.find((g) => g.id === sel.gatewayId);
  const profile = gateway?.profiles.find((p) => p.id === sel.profileId);
  return gateway && profile ? { gateway, profile } : null;
}

/** Two-level gateway → profile switcher with search, reachability and latency. */
export const WorkspaceProfileSwitcher = React.forwardRef<HTMLButtonElement, WorkspaceProfileSwitcherProps>(
  (
    {
      gateways,
      value: valueProp,
      defaultValue,
      onValueChange,
      onManageConnections,
      onNewProfile,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      allowUnreachable = false,
      searchPlaceholder = "Search gateways and profiles…",
      disabled,
      className,
      contentClassName,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
    const [internal, setInternal] = React.useState<WorkspaceSelection | undefined>(defaultValue);
    const value = valueProp ?? internal;
    const current = findSelection(gateways, value);

    const select = (gateway: WorkspaceGateway, profile: WorkspaceProfile) => {
      const next = { gatewayId: gateway.id, profileId: profile.id };
      if (valueProp === undefined) setInternal(next);
      onValueChange?.(next, { gateway, profile });
      setOpen(false);
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            aria-label={current ? `Switch profile (current: ${current.profile.name} on ${current.gateway.name})` : "Switch profile"}
            className={cn(
              "inline-flex h-11 w-full min-w-56 items-center gap-2.5 rounded-control border border-border bg-background px-2.5 text-start shadow-xs transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
              focusRing,
              className
            )}
            data-slot="workspace-profile-switcher"
            {...props}
          >
            {current ? (
              <>
                <AgentAvatar spec={current.profile.avatar ?? randomAvatarSpec(current.profile.id)} size={28} label="" />
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-sm font-medium text-foreground">{current.profile.name}</span>
                  <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <ReachabilityDot state={current.gateway.reachability} className="size-1.5" />
                    {current.gateway.name}
                  </span>
                </span>
              </>
            ) : (
              <span className="flex-1 truncate text-sm text-muted-foreground">Select a profile</span>
            )}
            <RiArrowUpDownLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          size="auto"
          padded={false}
          aria-label="Switch profile"
          className={cn("w-80 overflow-hidden", contentClassName)}
        >
          <Command loop label="Switch profile">
            <CommandInput placeholder={searchPlaceholder} aria-label="Search gateways and profiles" />
            <CommandList>
              <CommandEmpty>No matching profiles</CommandEmpty>
              {gateways.map((gateway) => {
                const blocked = gateway.reachability === "unreachable" && !allowUnreachable;
                return (
                  <CommandGroup
                    key={gateway.id}
                    data-gateway={gateway.id}
                    heading={
                      <span className="flex items-center gap-2">
                        {gateway.kind === "local" ? (
                          <RiComputerLine aria-hidden className="size-3.5" />
                        ) : (
                          <RiCloudLine aria-hidden className="size-3.5" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{gateway.name}</span>
                        <ReachabilityDot state={gateway.reachability} />
                        <span className="tabular-nums">
                          {gateway.reachability === "unreachable"
                            ? "Unreachable"
                            : gateway.reachability === "connecting"
                              ? "Connecting…"
                              : gateway.latencyMs != null
                                ? `${Math.round(gateway.latencyMs)} ms`
                                : null}
                        </span>
                      </span>
                    }
                  >
                    {gateway.profiles.length === 0 && (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">No profiles</p>
                    )}
                    {gateway.profiles.map((profile) => {
                      const selected = value?.gatewayId === gateway.id && value.profileId === profile.id;
                      return (
                        <CommandItem
                          key={profile.id}
                          value={`${gateway.id}/${profile.id}`}
                          keywords={[profile.name, gateway.name, gateway.host ?? ""]}
                          disabled={blocked}
                          onSelect={() => select(gateway, profile)}
                          aria-current={selected ? "true" : undefined}
                          data-profile={profile.id}
                          icon={<AgentAvatar spec={profile.avatar ?? randomAvatarSpec(profile.id)} size={22} label="" />}
                          description={profile.description}
                        >
                          <span className="truncate">{profile.name}</span>
                          {profile.isDefault && (
                            <Badge size="sm" color="neutral">
                              Default
                            </Badge>
                          )}
                          {selected && <RiCheckLine aria-label="Selected" className="ms-auto text-primary!" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                );
              })}
              {(onNewProfile || onManageConnections) && (
                <>
                  <CommandGroup className="border-t border-border">
                    {onNewProfile && (
                      <CommandItem
                        value="__new-profile"
                        keywords={["new", "profile", "create"]}
                        icon={<RiAddLine aria-hidden />}
                        onSelect={() => {
                          setOpen(false);
                          onNewProfile(value?.gatewayId);
                        }}
                      >
                        New profile
                      </CommandItem>
                    )}
                    {onManageConnections && (
                      <CommandItem
                        value="__manage-connections"
                        keywords={["manage", "connections", "gateways"]}
                        icon={<RiSettings3Line aria-hidden />}
                        onSelect={() => {
                          setOpen(false);
                          onManageConnections();
                        }}
                      >
                        Manage connections
                      </CommandItem>
                    )}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);
WorkspaceProfileSwitcher.displayName = "WorkspaceProfileSwitcher";

/* ------------------------------------------------------------------ */
/* ProfileScopeBanner                                                  */
/* ------------------------------------------------------------------ */

export interface ProfileScopeBannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Profile currently being acted on. */
  profileName: React.ReactNode;
  /** Optional gateway name appended to the message. */
  gatewayName?: React.ReactNode;
  /** Custom message; replaces the default sentence. */
  message?: React.ReactNode;
  /** Called when the user presses the switch-back button; the button is hidden when unset. */
  onSwitchBack?: () => void;
  /** Label of the switch-back button. Default "Switch back". */
  switchBackLabel?: React.ReactNode;
  /** Stick to the top of the scroll container. Default true. */
  sticky?: boolean;
}

/** App-wide amber banner warning that actions apply to a non-default profile. A preset over `InlineAlert layout="strip"`. */
export const ProfileScopeBanner = React.forwardRef<HTMLDivElement, ProfileScopeBannerProps>(
  (
    { profileName, gatewayName, message, onSwitchBack, switchBackLabel = "Switch back", sticky = true, className, ...props },
    ref
  ) => (
    <InlineAlert
      ref={ref}
      tone="warning"
      layout="strip"
      role="region"
      aria-label="Profile scope"
      icon={<RiUserSettingsLine />}
      action={
        onSwitchBack && (
          <Button
            size="xs"
            variant="outline"
            leadingIcon={<RiArrowGoBackLine aria-hidden />}
            onClick={onSwitchBack}
            className="border-warning/40 bg-transparent text-current hover:bg-warning/15"
          >
            {switchBackLabel}
          </Button>
        )
      }
      className={cn("z-40", sticky && "sticky top-0", className)}
      data-slot="profile-scope-banner"
      {...props}
    >
      <p className="min-w-0">
        {message ?? (
          <>
            You&apos;re acting on profile <strong className="font-semibold">{profileName}</strong>
            {gatewayName ? (
              <>
                {" "}
                on <strong className="font-semibold">{gatewayName}</strong>
              </>
            ) : null}{" "}
            — changes apply there.
          </>
        )}
      </p>
    </InlineAlert>
  )
);
ProfileScopeBanner.displayName = "ProfileScopeBanner";
