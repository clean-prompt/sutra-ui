import { describe, expect, it } from "vitest";
import { NEW_FOR_DAYS, activeStatus, nav } from "../../../apps/playground/src/nav";

describe("playground nav status", () => {
  const day = (iso: string) => new Date(`${iso}T12:00:00Z`);

  it("keeps `new` for NEW_FOR_DAYS after `since`, then drops it", () => {
    expect(activeStatus("new", "2026-10-20", day("2026-10-20"))).toBe("new");
    expect(activeStatus("new", "2026-10-20", day("2026-11-09"))).toBe("new"); // 20 days
    expect(activeStatus("new", "2026-10-20", day("2026-11-20"))).toBeUndefined();
    expect(NEW_FOR_DAYS).toBeGreaterThan(0);
  });

  it("never ages out beta, deprecated, or a `since` that is not a date", () => {
    expect(activeStatus("beta", "2020-01-01", day("2026-10-21"))).toBe("beta");
    expect(activeStatus("deprecated", "2020-01-01", day("2026-10-21"))).toBe("deprecated");
    expect(activeStatus("new", "0.2.0", day("2030-01-01"))).toBe("new");
    expect(activeStatus("new", undefined, day("2030-01-01"))).toBe("new");
    expect(activeStatus(undefined, "2026-10-20", day("2026-10-21"))).toBeUndefined();
  });

  it("dates every new item, and none lies in the future or before the first commit", () => {
    const entries = nav.flatMap((s) => s.pages.flatMap((p) => [p, ...(p.items ?? [])]));
    const flagged = entries.filter((e) => e.status === "new");
    expect(flagged.length).toBeGreaterThan(30);
    for (const e of flagged) expect(e.since, "since is an ISO date").toMatch(/^2026-10-(1[89]|2\d|3[01])$/);
  });

  it("dates what shipped on 2026-10-21 as 2026-10-21", () => {
    const items = new Map(nav.flatMap((s) => s.pages.flatMap((p) => (p.items ?? []).map((i) => [i.label, i] as const))));
    for (const label of ["Logo Intro", "Sutradhar Sting", "Endless Astra", "Identity Avatar"]) {
      expect(items.get(label), label).toMatchObject({ status: "new", since: "2026-10-21" });
    }
  });
});
