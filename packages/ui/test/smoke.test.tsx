import { render, screen } from "@testing-library/react";
/* This file is the one place tests load the root barrel; other tests import per-module. */
import * as root from "../src";
import { Button } from "../src";
import * as tokensEntry from "../src/entries/tokens";
import { base32Decode as totpBase32Decode } from "../src/kits/identity/totp";
import { splitDuration as countdownSplitDuration } from "../src/patterns/countdown";
import { formatBytes as uploadFormatBytes } from "../src/patterns/file-upload";
import { axeViolations } from "./helpers/a11y";

describe("test harness", () => {
  it("renders and runs axe", async () => {
    const { container } = render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("barrels", () => {
  it("exports the documented helpers from the root and @cleanprompt/sutra-ui/tokens", () => {
    for (const name of ["cn", "colorForSeed", "initials", "isSafeHref", "isEmail", "useNow", "useMediaQuery", "useAsyncAction", "useSafeId", "CopyButton", "CopyField"]) {
      expect(root).toHaveProperty(name);
    }
    for (const name of ["cn", "colorForSeed", "initials", "isSafeHref", "useNow", "useAsyncAction"]) expect(tokensEntry).toHaveProperty(name);
  });

  it("keeps the generic lib plumbing off the root and @cleanprompt/sutra-ui/tokens", () => {
    for (const name of ["clamp", "pad2", "toMs", "hashString", "formatRelative", "formatDuration", "formatCompact", "base64UrlEncode", "toValidDate", "useLatestRef", "useIsoLayoutEffect", "useMountedRef", "errorMessage", "getPaginationRange"]) {
      expect(root).not.toHaveProperty(name);
      expect(tokensEntry).not.toHaveProperty(name);
    }
  });

  it("the root names with a component and a lib version are the component versions (the lib ones are not exported)", () => {
    expect(root.base32Decode).toBe(totpBase32Decode);
    expect(root.splitDuration).toBe(countdownSplitDuration);
    expect(root.formatBytes).toBe(uploadFormatBytes);
    for (const name of ["formatBytes", "splitDuration", "base32Decode"]) expect(tokensEntry).not.toHaveProperty(name);
  });
});
