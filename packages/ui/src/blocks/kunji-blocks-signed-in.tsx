/** `SignedInPanel`: the account panel plus kunji linking. */
import * as React from "react";
import { AccountPanel, type AccountPanelProps } from "../kits/identity/device-sessions";
import { KunjiLink, KunjiLinkedBadge } from "../kits/identity/kunji-link";
import type { KunjiClient, KunjiPollResult } from "../kits/identity/kunji-client";

/* ------------------------------------------------------------------ */
/* SignedInPanel                                                       */
/* ------------------------------------------------------------------ */

export interface SignedInPanelProps extends AccountPanelProps {
  /** Enables "Link kunji" when given. */
  client?: KunjiClient;
  /** Controlled linked state of the kunji identity. Use with `onLinkKunji` and `onUnlinkKunji`. */
  kunjiLinked?: boolean;
  /** Initial linked state when uncontrolled. */
  defaultKunjiLinked?: boolean;
  /** The linked kunji subject id, shown once linked. */
  kunjiSub?: string;
  /** Called with the poll result when the user links their kunji identity. */
  onLinkKunji?: (result: KunjiPollResult) => unknown;
  /** Called when the user unlinks their kunji identity. */
  onUnlinkKunji?: () => unknown;
}

/** Signed-in summary: `AccountPanel` plus kunji linking, sign out and sign out everywhere. */
export const SignedInPanel = React.forwardRef<HTMLDivElement, SignedInPanelProps>(
  ({ client, kunjiLinked, defaultKunjiLinked, kunjiSub, onLinkKunji, onUnlinkKunji, children, ...props }, ref) => (
    <AccountPanel ref={ref} data-block="signed-in-panel" {...props}>
      {client ? (
        <KunjiLink
          client={client}
          linked={kunjiLinked}
          defaultLinked={defaultKunjiLinked}
          sub={kunjiSub}
          onLink={onLinkKunji}
          onUnlink={onUnlinkKunji}
          className="bg-subtle shadow-none"
        />
      ) : kunjiLinked != null ? (
        <KunjiLinkedBadge linked={kunjiLinked} sub={kunjiSub} className="self-start" />
      ) : null}
      {children}
    </AccountPanel>
  )
);
SignedInPanel.displayName = "SignedInPanel";
