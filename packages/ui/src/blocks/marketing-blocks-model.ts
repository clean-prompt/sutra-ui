/** Marketplace types shared by the marketing blocks: tier, author, screenshot and extension. */
import type * as React from "react";

export type MarketplaceTier = "official" | "verified" | "community";

export interface MarketplaceAuthor {
  name: string;
  handle: string;
  bio?: string;
  avatarSrc?: string;
}

export interface MarketplaceScreenshot {
  id: string;
  caption: string;
  /** Optional image src (no network by default: a generated placeholder renders instead). */
  src?: string;
}

export interface MarketplaceExtension {
  id: string;
  name: string;
  author: MarketplaceAuthor;
  description: string;
  category: string;
  tier: MarketplaceTier;
  stars: number;
  version: string;
  /** ISO dates. */
  addedAt: string;
  updatedAt: string;
  capabilities?: string[];
  platforms?: string[];
  /** Icon node; defaults to a monogram on the generated gradient. */
  icon?: React.ReactNode;
  /** Banner node or image src; defaults to a generated gradient. */
  banner?: React.ReactNode | string;
  sha?: string;
  license?: string;
  installCommand?: string;
  provides?: { tools?: string[]; hooks?: string[]; middleware?: string[] };
  requiresEnv?: string[];
  security?: string;
  screenshots?: MarketplaceScreenshot[];
  readme?: string;
}
