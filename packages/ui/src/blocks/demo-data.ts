/*
 * Demo fixtures and mocks shared by the blocks and the registry. Not for production use.
 * Public home: `@sutra/ui/blocks/registry`, which re-exports this module plus the block-level demo
 * helpers (`marketingDemoData`, `createMockPairingAdapter`).
 *
 * Keep this module free of imports from the block files: the blocks import it for their defaults,
 * so importing a block from here would create a cycle.
 * Importing it has no side effects; mocks are only created when you call the factories.
 */

/** Demo user used as the default across blocks. */
export const demoUser = {
  name: "Maya Patel",
  email: "maya@sutra.app",
  avatarSrc: undefined as string | undefined,
};

export { createMockKunjiClient, type KunjiMockClientOptions, type KunjiMockOutcome } from "../kits/identity/kunji-client-mock";

/** Sample share-dialog state for demos: the item, its link, who has access and who is looking. The dialog itself has no defaults for these. */
export const demoShare = {
  itemName: "Q4 Launch Plan",
  link: "https://sutra.app/n/q4-launch-plan-8d2f",
  currentUserId: "p1",
  people: [
    { id: "p1", name: "Maya Patel", email: "maya@sutra.app", role: "owner", owner: true },
    { id: "p2", name: "Priya Shah", email: "priya@northwind.co", role: "editor" },
    { id: "p3", name: "Lena Okafor", email: "lena@northwind.co", role: "commenter" },
    { id: "p4", name: "Noah Kim", email: "noah@northwind.co", role: "viewer" },
  ] as Array<{ id: string; name: string; email: string; role: string; owner?: boolean }>,
};

/** Sample invite link for the invite-members demo. */
export const demoInviteLink = "https://sutra.app/join/northwind-7f3k2q";
