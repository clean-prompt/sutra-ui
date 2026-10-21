import { render, screen } from "@testing-library/react";
/* This file is the one place tests load the root barrel; other tests import per-module. */
import * as root from "../src";
import { Button } from "../src";
import * as tokensEntry from "../src/entries/tokens";
import { splitDuration } from "../src/lib/duration";
import { formatBytes } from "../src/lib/format";
import { base32Decode } from "../src/lib/encoding";
import { base32Decode as totpBase32Decode } from "../src/kits/identity/totp";
import { splitDuration as countdownSplitDuration } from "../src/patterns/countdown";
import { axeViolations } from "./helpers/a11y";

describe("test harness", () => {
  it("renders and runs axe", async () => {
    const { container } = render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("barrels", () => {
  it("exports the shared helpers from the root and @sutra/ui/tokens", () => {
    for (const name of ["formatRelative", "formatDuration", "formatCompact", "hashString", "initials", "isSafeHref", "clamp", "base64UrlEncode", "useNow", "useMediaQuery", "useAsyncAction", "useSafeId", "CopyButton", "CopyField", "toValidDate"]) {
      expect(root).toHaveProperty(name);
    }
    expect(tokensEntry.formatBytes).toBe(formatBytes);
    expect(tokensEntry.splitDuration).toBe(splitDuration);
    expect(tokensEntry.base32Decode).toBe(base32Decode);
    // Root keeps the older component bindings for these names.
    expect(root.base32Decode).toBe(totpBase32Decode);
    expect(root.splitDuration).toBe(countdownSplitDuration);
  });
});
