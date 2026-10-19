import { describe, expect, it } from "vitest";
import * as kunji from "../src/kits/identity/kunji";
import * as memoryMap from "../src/kits/workspace/memory-map";

describe("split identity-workspace: public surface unchanged", () => {
  it("kunji", () => {
    expect(Object.keys(kunji).sort()).toMatchInlineSnapshot(`
      [
        "AccessGate",
        "AuthProblem",
        "KUNJI_SLOW_TEXT",
        "KunjiButton",
        "KunjiLink",
        "KunjiLinkedBadge",
        "KunjiMark",
        "KunjiRpSignIn",
        "KunjiSignIn",
        "KunjiSignInView",
        "kunjiButtonVariants",
        "kunjiStatusText",
        "useKunjiSignIn",
      ]
    `);
  });
  it("memory-map", () => {
    expect(Object.keys(memoryMap).sort()).toMatchInlineSnapshot(`
      [
        "MemoryGlyphIcon",
        "MemoryMap",
        "MemoryMapLegend",
        "ShareCodeControls",
        "TimeScrubber",
        "bucketByTime",
        "decodeMemoryShareCode",
        "encodeMemoryShareCode",
        "layoutMemoryGraph",
        "memoryMapLegend",
        "memoryTime",
      ]
    `);
  });
});
