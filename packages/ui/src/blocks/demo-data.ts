/*
 * Demo fixtures and mocks shared by the blocks and the registry. Not for production use.
 * Public home: `@sutra/ui/blocks/registry`, which re-exports this module plus the block-level demo
 * helpers (`marketingDemoData`, `createMockPairingAdapter`).
 *
 * Keep this module free of imports from the block files: `block-utils.tsx` re-exports `demoUser`
 * from here, and the blocks import `block-utils`, so importing a block from here would create a cycle.
 * Importing it has no side effects; mocks are only created when you call the factories.
 */

/** Demo user used as the default across blocks. */
export const demoUser = {
  name: "Maya Patel",
  email: "maya@sutra.app",
  avatarSrc: undefined as string | undefined,
};

export { createMockKunjiClient, type KunjiMockClientOptions, type KunjiMockOutcome } from "../components/kunji-client";
