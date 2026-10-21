/* Blocks barrel: composed sections and pages. No side effects at import time. */
import * as registry from "./registry";

export * from "./auth-blocks";
export * from "./auth-pages";
export * from "./dropdown-menu-blocks";
export * from "./header-navigation-blocks";
export * from "./sidebar-navigation-blocks";
export * from "./section-header-blocks";
export * from "./modal-dialog-blocks";
export * from "./kunji-blocks";
export * from "./marketing-blocks";
export type { BlockLinkRenderer } from "./block-utils";

/*
 * Deprecated re-exports, kept so existing imports from `@cleanprompt/sutra-ui` and `@cleanprompt/sutra-ui/blocks` keep working.
 * The registry and demo fixtures now live in `@cleanprompt/sutra-ui/blocks/registry` (src/blocks/registry.tsx; fixtures in demo-data.ts).
 * These local declarations take precedence over the `export *` lines above.
 */

/** @deprecated Import from `@cleanprompt/sutra-ui/blocks/registry`. */
export type BlockCategory = registry.BlockCategory;
/** @deprecated Import from `@cleanprompt/sutra-ui/blocks/registry`. */
export type BlockRegistryEntry = registry.BlockRegistryEntry;
/** @deprecated Import from `@cleanprompt/sutra-ui/blocks/registry`. */
export const blockCategoryLabels = registry.blockCategoryLabels;
/** @deprecated Import from `@cleanprompt/sutra-ui/blocks/registry`. */
export const blockRegistry = registry.blockRegistry;
/** @deprecated Demo fixture. Import from `@cleanprompt/sutra-ui/blocks/registry`. */
export const marketingDemoData = registry.marketingDemoData;
/** @deprecated Demo mock. Import from `@cleanprompt/sutra-ui/blocks/registry`. */
export const createMockPairingAdapter = registry.createMockPairingAdapter;
