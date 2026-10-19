/**
 * Motion for the workspace, identity, social, media, ops, system, billing and geo kits and for blocks/ (audit group G4,
 * items W1-W11, B1-B2): disclosure chevrons on the shared `chevron-turn`, the shared ease, skeletons on `Skeleton`,
 * transition lists that name the individual transform properties Tailwind v4 uses, entrances for the newest message
 * only, pops that play when a value changes and never on the first render, and the kanban drop animation. jsdom runs
 * no animations, so these tests assert the classes and keys the CSS acts on.
 */
import * as React from "react";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AlertGroup } from "../src/kits/ops/alert-group";
import { NodeCard } from "../src/kits/ops/node-card";
import { DeviceSessionList } from "../src/kits/identity/device-sessions";
import { ConnectedAppRow, type ConnectedApp } from "../src/kits/identity/connected-apps";
import { CredentialCard, type Credential } from "../src/kits/identity/credential-card";
import { SecretText } from "../src/kits/identity/secret";
import { MessageList, MessageStatusIcon, type MessengerMessage } from "../src/kits/social/messenger";
import { AppLauncher, type AppLauncherItem } from "../src/kits/workspace/app-launcher";
import { KanbanCard } from "../src/kits/workspace/kanban-card";
import { SyncStatus } from "../src/kits/workspace/sync-status";
import { PlanPicker, type BillingPlan } from "../src/kits/billing/billing-plans";
import { TemperatureReading } from "../src/kits/system/thermals";

const SRC = path.resolve(__dirname, "../src");
const FOLDERS = ["kits/workspace", "kits/identity", "kits/social", "kits/media", "kits/ops", "kits/system", "kits/billing", "kits/geo", "blocks"];

const read = (rel: string) => readFileSync(path.join(SRC, rel), "utf8");
const files = FOLDERS.flatMap((dir) =>
  readdirSync(path.join(SRC, dir))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => ({ rel: `${dir}/${f}`, text: read(`${dir}/${f}`) }))
);
const tokens = (el: Element | null | undefined) => (el?.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
const popped = (root: ParentNode) => root.querySelectorAll(".animate-pop");
const NOW = new Date(Date.UTC(2026, 0, 15, 12, 0, 0));

/* ------------------------------------------------------------------ */
/* W10: chevrons                                                       */
/* ------------------------------------------------------------------ */

/** Disclosure chevrons that turn with `chevron-turn`, per file (8 sites). */
const CHEVRONS: Record<string, number> = {
  "kits/ops/alert-group.tsx": 1,
  "kits/ops/process-table.tsx": 1,
  "kits/ops/request-inspector.tsx": 2,
  "kits/system/containers.tsx": 1,
  "kits/workspace/backlinks.tsx": 1,
  "kits/identity/connected-apps.tsx": 1,
  "blocks/sidebar-navigation-blocks.tsx": 1,
};

describe("W10: chevrons turn with chevron-turn", () => {
  it("every disclosure chevron of the group uses it, with no local transition or duration on that line", () => {
    for (const [rel, n] of Object.entries(CHEVRONS)) {
      const lines = read(rel)
        .split("\n")
        .filter((l) => /chevron-turn/.test(l));
      expect(lines, rel).toHaveLength(n);
      for (const line of lines) {
        expect(line, rel).not.toMatch(/transition-transform|duration-\d+|motion-reduce:transition-none/);
        expect(line, rel).toMatch(/rotate-(90|180)/);
      }
    }
  });

  it("an expanded AlertGroup turns its chevron", () => {
    const { container } = render(<AlertGroup alerts={[{ id: "a", severity: "warning", message: "Low space" }]} />);
    const chevron = container.querySelector("svg.chevron-turn");
    expect(chevron).not.toBeNull();
    const trigger = chevron!.closest("button")!;
    const before = tokens(chevron).includes("rotate-180");
    fireEvent.click(trigger);
    expect(tokens(container.querySelector("svg.chevron-turn")).includes("rotate-180")).toBe(!before);
  });
});

/* ------------------------------------------------------------------ */
/* Shared ease, transform properties                                   */
/* ------------------------------------------------------------------ */

describe("shared ease and Tailwind v4 transform properties", () => {
  it("no plain ease-out left in the group", () => {
    for (const { rel, text } of files) expect(text.replace(/ease-out-quart/g, ""), rel).not.toMatch(/(?<![\w-])ease-out(?![\w-])/);
    expect(read("kits/media/media-controls.tsx").match(/ease-out-quart/g)).toHaveLength(3);
    expect(read("kits/social/call-overlay.tsx")).toContain("transition-[top,left,right,bottom] duration-300 ease-out-quart");
  });

  it("transition lists name scale / rotate / translate, which v4 sets as separate properties, instead of `transform`", () => {
    // `scale-95`, `rotate-90` and `translate-x-1` set `scale`, `rotate` and `translate`; a list that only says
    // `transform` snaps them. (`transition-transform` is fine: Tailwind v4 expands it to all four.)
    const offenders: string[] = [];
    for (const { rel, text } of files) {
      for (const [i, line] of text.split("\n").entries()) {
        const list = /transition-\[([^\]]*)\]/.exec(line)?.[1]?.split(",") ?? [];
        if (list.includes("transform") && /(?<![\w-])(?:[\w-]+:)*-?(?:scale|rotate|translate-[xy])-/.test(line)) offenders.push(`${rel}:${i + 1}`);
      }
    }
    expect(offenders).toEqual([]);
    expect(read("kits/media/media-controls.tsx")).toContain("transition-[opacity,scale,rotate]");
    expect(read("kits/workspace/app-launcher.tsx")).toContain("transition-[background-color,scale]");
  });
});

/* ------------------------------------------------------------------ */
/* W7: skeletons                                                       */
/* ------------------------------------------------------------------ */

describe("W7: skeletons use Skeleton", () => {
  it("DeviceSessionList loading shows shimmer blocks, no raw pulse", () => {
    const { container } = render(<DeviceSessionList sessions={null} />);
    expect(container.querySelectorAll(".animate-shimmer")).toHaveLength(9);
    expect(container.querySelector(".animate-pulse")).toBeNull();
    expect(screen.getByRole("list", { hidden: true })).toHaveAttribute("aria-busy", "true");
  });

  it("NodeCard connecting shows one shimmer block per metric slot, no raw pulse", () => {
    const { container } = render(<NodeCard name="n2" status="connecting" cpu={null} ram={null} />);
    const slots = container.querySelector("[data-node-skeleton]")!;
    expect(slots.querySelectorAll(".animate-shimmer").length).toBeGreaterThanOrEqual(4);
    expect(container.querySelector(".animate-pulse")).toBeNull();
    expect(tokens(slots.querySelector(".animate-shimmer"))).toEqual(expect.arrayContaining(["h-[58px]", "rounded-md", "motion-reduce:animate-none"]));
  });
});

/* ------------------------------------------------------------------ */
/* W1, W2: messenger                                                   */
/* ------------------------------------------------------------------ */

describe("W1: the newest message bubble rises in", () => {
  const msg = (id: string, senderId: string, minutes: number): MessengerMessage => ({
    id,
    senderId,
    text: id,
    createdAt: new Date(NOW.getTime() + minutes * 60_000),
  });

  it("the list class targets the last bubble of the last group, motion-safe only", () => {
    render(<MessageList messages={[msg("m1", "b", 0)]} currentUserId="a" now={NOW} />);
    const log = screen.getByRole("log");
    expect(tokens(log)).toContain("motion-safe:[&>[data-group]:last-child>:last-child]:animate-fade-up");
  });

  it("that selector matches the newest bubble and nothing else, before and after a message arrives", () => {
    const first = [msg("m1", "b", 0), msg("m2", "b", 1), msg("m3", "a", 2)];
    const { rerender } = render(<MessageList messages={first} currentUserId="a" now={NOW} />);
    const log = screen.getByRole("log");
    const SELECTOR = ":scope > [data-group]:last-child > :last-child";
    const newest = () => log.querySelectorAll(SELECTOR);
    expect(newest()).toHaveLength(1);
    expect(newest()[0]).toHaveTextContent("m3");
    // Same sender again: the new bubble joins the group and becomes the match.
    rerender(<MessageList messages={[...first, msg("m4", "a", 3)]} currentUserId="a" now={NOW} />);
    expect(newest()).toHaveLength(1);
    expect(newest()[0]).toHaveTextContent("m4");
    // A reply from the other side starts a new group.
    rerender(<MessageList messages={[...first, msg("m4", "a", 3), msg("m5", "b", 4)]} currentUserId="a" now={NOW} />);
    expect(newest()[0]).toHaveTextContent("m5");
  });
});

describe("W2: delivery status glyph", () => {
  it("pops when the glyph changes, never on the first render, and fades the colour when only the tone changes", () => {
    const { container, rerender } = render(<MessageStatusIcon status="sending" />);
    expect(popped(container)).toHaveLength(0);
    rerender(<MessageStatusIcon status="sent" />);
    expect(popped(container)).toHaveLength(1);
    rerender(<MessageStatusIcon status="delivered" />);
    const double = container.querySelector("svg")!;
    expect(tokens(double)).toContain("animate-pop");
    // delivered -> read keeps the double tick: the same element, no replay, only a colour fade.
    rerender(<MessageStatusIcon status="read" />);
    expect(container.querySelector("svg")).toBe(double);
    expect(tokens(double)).toEqual(expect.arrayContaining(["transition-colors", "text-info"]));
  });
});

/* ------------------------------------------------------------------ */
/* W4: sync status                                                     */
/* ------------------------------------------------------------------ */

describe("W4: SyncStatus", () => {
  it("the synced check pops when a sync finishes, not on mount; the spinner never pops", () => {
    const { container, rerender } = render(<SyncStatus status="synced" />);
    expect(popped(container)).toHaveLength(0);
    rerender(<SyncStatus status="syncing" />);
    expect(popped(container)).toHaveLength(0);
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    rerender(<SyncStatus status="synced" />);
    expect(popped(container)).toHaveLength(1);
    expect(tokens(popped(container)[0])).toContain("text-success");
    rerender(<SyncStatus status="offline" />);
    expect(popped(container)).toHaveLength(0);
  });

  it("the status dot fades its colour", () => {
    const { container } = render(<SyncStatus status="synced" showLabel={false} />);
    const dot = [...container.querySelectorAll("span[aria-hidden]")].find((s) => tokens(s).includes("rounded-full"));
    expect(tokens(dot)).toContain("transition-colors");
  });
});

/* ------------------------------------------------------------------ */
/* W5: app launcher badge                                              */
/* ------------------------------------------------------------------ */

describe("W5: AppLauncher badge", () => {
  const items = (badge?: number): AppLauncherItem[] => [
    { id: "notes", label: "Notes", app: "notes", badge },
    { id: "tasks", label: "Tasks", app: "tasks", badge: 2 },
  ];

  it("pops when the count changes or shows up, never on the first render", () => {
    const { container, rerender } = render(<AppLauncher items={items(3)} />);
    expect(popped(container)).toHaveLength(0);
    rerender(<AppLauncher items={items(4)} />);
    const pops = popped(container);
    expect(pops).toHaveLength(1);
    expect(pops[0]).toHaveTextContent("4");
    // The other tile's badge did not change, so it does not replay; a rerender with the same data changes nothing.
    rerender(<AppLauncher items={items(4)} />);
    expect(popped(container)).toHaveLength(1);
    // A badge that was not there before pops in.
    rerender(<AppLauncher items={[{ id: "notes", label: "Notes", app: "notes" }, { id: "tasks", label: "Tasks", app: "tasks", badge: 2 }]} />);
    expect(popped(container)).toHaveLength(0);
    rerender(<AppLauncher items={items(1)} />);
    expect(popped(container)).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/* W6: row chevrons nudge                                              */
/* ------------------------------------------------------------------ */

describe("W6: row chevrons nudge on hover", () => {
  it("ConnectedAppRow", () => {
    const app: ConnectedApp = { id: "x", name: "Notes", scopes: ["read"] };
    render(<ConnectedAppRow app={app} now={0} />);
    const row = screen.getByRole("button");
    expect(tokens(row)).toContain("group/app-row");
    const chevron = row.querySelector("svg:last-of-type")!;
    expect(tokens(chevron)).toEqual(expect.arrayContaining(["transition-transform", "group-hover/app-row:translate-x-0.5"]));
  });

  it("an interactive CredentialCard row, but not a static one", () => {
    const cred: Credential = {
      id: "age",
      type: "Age over 18",
      kind: "age",
      issuer: { name: "Gov ID", domain: "id.gov.example" },
      issuedAt: Date.UTC(2025, 0, 1),
      expiresAt: Date.UTC(2030, 0, 1),
    };
    const { container, rerender } = render(<CredentialCard credential={cred} variant="row" onClick={() => {}} />);
    const row = screen.getByRole("button");
    expect(tokens(row)).toContain("group/credential");
    expect(container.querySelector("svg.group-hover\\/credential\\:translate-x-0\\.5")).not.toBeNull();
    rerender(<CredentialCard credential={cred} variant="row" />);
    expect(container.querySelector("svg.group-hover\\/credential\\:translate-x-0\\.5")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* W8: billing price                                                   */
/* ------------------------------------------------------------------ */

describe("W8: PlanPicker price", () => {
  const plans: BillingPlan[] = [
    { id: "free", name: "Free", priceMonthly: 0, features: [{ label: "1 agent" }] },
    { id: "pro", name: "Pro", priceMonthly: 2000, priceYearly: 19200, features: [{ label: "1 agent" }] },
  ];

  it("a price that changes with the billing interval ticks; first render and unchanged prices do not", () => {
    const { container } = render(<PlanPicker plans={plans} />);
    expect(container.querySelectorAll(".animate-tick")).toHaveLength(0);
    fireEvent.click(screen.getByRole("radio", { name: "Yearly" }));
    const pro = container.querySelector('[data-plan="pro"]') as HTMLElement;
    const free = container.querySelector('[data-plan="free"]') as HTMLElement;
    expect(within(pro).getByText("$16")).toHaveClass("animate-tick");
    expect(free.querySelector(".animate-tick")).toBeNull();
    // The price slot carries the same text as before: tabular numerals, same size.
    expect(tokens(within(pro).getByText("$16"))).toEqual(expect.arrayContaining(["text-display-xs", "tabular-nums"]));
  });
});

/* ------------------------------------------------------------------ */
/* W9: thermals                                                        */
/* ------------------------------------------------------------------ */

describe("W9: TemperatureReading level colour", () => {
  it("fades the level text for the meter and the gauge layouts", () => {
    const { container, rerender } = render(<TemperatureReading label="CPU" value={86} />);
    const meterText = [...container.querySelectorAll("span")].find((s) => tokens(s).includes("duration-300"));
    expect(tokens(meterText)).toEqual(expect.arrayContaining(["transition-colors", "text-warning-soft-foreground"]));
    rerender(<TemperatureReading label="CPU" value={86} variant="gauge" />);
    const status = container.querySelector('[data-slot="temperature-reading-status"]');
    expect(tokens(status)).toEqual(expect.arrayContaining(["transition-colors", "duration-300"]));
  });
});

/* ------------------------------------------------------------------ */
/* W11: secret eye                                                     */
/* ------------------------------------------------------------------ */

describe("W11: SecretText eye icon", () => {
  it("pops when the value is shown or hidden, not on mount", () => {
    const { container } = render(<SecretText value="hunter2" />);
    expect(popped(container)).toHaveLength(0);
    const toggle = screen.getByRole("button", { name: /^Show/ });
    fireEvent.click(toggle);
    expect(popped(container)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /^Hide/ }));
    expect(popped(container)).toHaveLength(1);
  });

  it("a secret that starts revealed does not pop on mount", () => {
    const { container } = render(<SecretText value="hunter2" defaultRevealed />);
    expect(popped(container)).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* W3: kanban                                                          */
/* ------------------------------------------------------------------ */

describe("W3: kanban drag", () => {
  const card = { id: "a", title: "Card A", columnId: "todo" };

  it("the drag overlay lifts in; a resting card does not animate", () => {
    const { container, rerender } = render(<KanbanCard card={card} overlay />);
    const root = container.querySelector("[data-kanban-card]")!;
    expect(tokens(root)).toEqual(expect.arrayContaining(["animate-in", "fade-in-0", "zoom-in-95", "duration-150", "shadow-xl"]));
    rerender(<KanbanCard card={card} />);
    expect(tokens(container.querySelector("[data-kanban-card]"))).not.toContain("animate-in");
  });

  it("the board lets a dropped card settle (200 ms) unless the user prefers reduced motion", () => {
    const text = read("kits/workspace/kanban-board.tsx");
    expect(text).toContain("usePrefersReducedMotion()");
    expect(text).toContain("<DragOverlay dropAnimation={reducedMotion ? null : { duration: 200 }}>");
    expect(text).not.toContain("dropAnimation={null}");
  });
});

/* ------------------------------------------------------------------ */
/* B1, B2: blocks                                                      */
/* ------------------------------------------------------------------ */

describe("B1: member rows and the copied check", () => {
  it("rows fade their hover background", () => {
    for (const rel of ["blocks/modal-dialog-blocks-invite.tsx", "blocks/modal-dialog-blocks-share.tsx"]) {
      expect(read(rel), rel).toContain("transition-colors hover:bg-accent/50");
      expect(read(rel), rel).not.toMatch(/"[^"]*(?<!transition-colors )hover:bg-accent\/50/);
    }
  });

  it("the copied check pops", () => {
    expect(read("blocks/modal-dialog-blocks-invite.tsx")).toContain('<RiCheckLine aria-hidden className="text-success animate-pop" />');
  });
});

describe("B2: call-to-action arrows nudge on hover", () => {
  it("header and section-header CTAs carry group/cta and a nudged arrow (no Button API change)", () => {
    const nudge = "transition-transform group-hover/cta:translate-x-0.5";
    const header = read("blocks/header-navigation-blocks.tsx");
    expect(header.match(new RegExp(nudge.replace(/[/.:]/g, "\\$&"), "g"))).toHaveLength(2);
    expect(header.match(/group\/cta/g)).toHaveLength(2);
    const section = read("blocks/section-header-blocks.tsx");
    expect(section.match(new RegExp(nudge.replace(/[/.:]/g, "\\$&"), "g"))).toHaveLength(2);
    expect(section.match(/className="group\/cta"/g)).toHaveLength(2);
  });
});
