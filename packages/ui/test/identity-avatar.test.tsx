/**
 * IdentityAvatar (patterns/identity-avatar): people (photo or drawn initials), agents and machines (a Sutra mascot head), apps
 * (the Bead tiles); presence as a shaped mark or a bead on a thread. The colours live in sutra.css, so these tests check the
 * markup: the parts, the names, the fallbacks and the geometry that tells the states apart.
 */
import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { colorForSeed } from "../src/lib/hash";
import { DirectionProvider } from "../src/primitives/direction-provider";
import {
  IdentityAvatar,
  identityAvatarCharacter,
  identityAvatarPresenceLabels,
  identityAvatarSizes,
  type IdentityAvatarPresence,
} from "../src/patterns/identity-avatar";
import { MONOGRAM_GLYPHS, canDrawMonogram, layoutMonogram } from "../src/patterns/identity-avatar-glyphs-internal";
import { axeViolations } from "./a11y";

const root = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-slot="identity-avatar"]')!;
const presences: IdentityAvatarPresence[] = ["online", "busy", "away", "offline"];

describe("IdentityAvatar: people", () => {
  it("draws the initials in monoline strokes, named by the name", () => {
    const { container } = render(<IdentityAvatar name="Asha Rao" />);
    const el = screen.getByRole("img", { name: "Asha Rao" });
    expect(el).toHaveAttribute("data-slot", "identity-avatar");
    expect(el).toHaveAttribute("data-kind", "person");
    const mono = container.querySelector('[data-part="monogram"]')!;
    expect(mono).toHaveAttribute("data-monogram", "drawn");
    expect(mono.querySelectorAll("path")).toHaveLength(2);
    expect(container.querySelector('[data-part="disc"]')).toBeInTheDocument();
    expect(container.querySelector('[data-part="hairline"]')).toBeInTheDocument();
    expect(container.querySelector("text")).toBeNull();
  });

  it("keeps one initial under 32 px", () => {
    const { container, rerender } = render(<IdentityAvatar name="Asha Rao" size="sm" />);
    expect(container.querySelectorAll('[data-part="monogram"] path')).toHaveLength(1);
    rerender(<IdentityAvatar name="Asha Rao" size="md" />);
    expect(container.querySelectorAll('[data-part="monogram"] path')).toHaveLength(2);
  });

  it("sets the initials as text on request, for other scripts and for letters it has no drawing for", () => {
    const { container, rerender } = render(<IdentityAvatar name="Jonas Weber" monogram="text" />);
    expect(container.querySelector("text")).toHaveTextContent("JW");
    expect(container.querySelector('[data-part="monogram"]')).toHaveAttribute("data-monogram", "text");
    rerender(<IdentityAvatar name="अनन्या शर्मा" />);
    expect(container.querySelector('[data-part="monogram"]')).toHaveAttribute("data-monogram", "text");
    rerender(<IdentityAvatar name="Zoë Åberg" />);
    expect(container.querySelector('[data-part="monogram"]')).toHaveAttribute("data-monogram", "drawn");
  });

  it("shows a photo inside a hairline and falls back to the initials when it fails, retrying a new URL", () => {
    const { container, rerender } = render(<IdentityAvatar name="Mei Chen" src="/missing.png" />);
    expect(root(container)).toHaveAttribute("data-photo");
    const img = container.querySelector('image[data-part="photo"]')!;
    expect(img).toHaveAttribute("href", "/missing.png");
    expect(container.querySelector('[data-part="monogram"]')).toBeNull();
    fireEvent.error(img);
    expect(container.querySelector("image")).toBeNull();
    expect(root(container)).not.toHaveAttribute("data-photo");
    expect(container.querySelector('[data-part="monogram"]')).toBeInTheDocument();
    rerender(<IdentityAvatar name="Mei Chen" src="/other.png" />);
    expect(container.querySelector("image")).toHaveAttribute("href", "/other.png");
  });

  it("ignores unsafe photo URLs and accepts data and blob images", () => {
    const { container, rerender } = render(<IdentityAvatar name="Eve" src="javascript:alert(1)" />);
    expect(container.querySelector("image")).toBeNull();
    rerender(<IdentityAvatar name="Eve" src="data:image/png;base64,AAAA" />);
    expect(container.querySelector("image")).toHaveAttribute("href", "data:image/png;base64,AAAA");
    rerender(<IdentityAvatar name="Eve" src="blob:https://example.com/1" />);
    expect(container.querySelector("image")).toHaveAttribute("href", "blob:https://example.com/1");
    rerender(<IdentityAvatar name="Eve" src={null} />);
    expect(container.querySelector("image")).toBeNull();
  });
});

describe("IdentityAvatar: agents, machines, apps", () => {
  it("draws an agent as a Sutra mascot head picked by the seed, or the chosen character", () => {
    const { container, rerender } = render(<IdentityAvatar kind="agent" name="Ada" seed="agent:ada" />);
    const pick = identityAvatarCharacter("agent:ada");
    expect(root(container)).toHaveAttribute("data-character", pick);
    const mascot = container.querySelector('[data-part="mascot"] svg[data-slot="sutra-mascot"]')!;
    expect(mascot).toHaveAttribute("data-character", pick);
    expect(mascot).toHaveAttribute("data-state", "idle");
    expect(mascot).toHaveAttribute("data-paused", "true");
    expect(screen.getByRole("img", { name: "Ada, agent" })).toBeInTheDocument();
    rerender(<IdentityAvatar kind="agent" name="Ada" character="bow" animated />);
    expect(container.querySelector('svg[data-slot="sutra-mascot"]')).toHaveAttribute("data-character", "bow");
    expect(container.querySelector('svg[data-slot="sutra-mascot"]')).not.toHaveAttribute("data-paused");
  });

  it("shows the presence on the face: awake, at work, asleep", () => {
    const states: Record<IdentityAvatarPresence, string> = { online: "idle", busy: "working", away: "sleeping", offline: "sleeping" };
    const { container, rerender } = render(<IdentityAvatar kind="agent" name="Ada" character="bead" />);
    for (const p of presences) {
      rerender(<IdentityAvatar kind="agent" name="Ada" character="bead" presence={p} />);
      expect(container.querySelector('svg[data-slot="sutra-mascot"]')).toHaveAttribute("data-state", states[p]);
      expect(screen.getByRole("img", { name: `Ada, agent, ${identityAvatarPresenceLabels[p]}` })).toBeInTheDocument();
    }
  });

  it("lets every seed land on a character other than the Sutradhar", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(identityAvatarCharacter(`agent:${i}`));
    expect(seen.has("sutradhar")).toBe(false);
    expect(seen.size).toBe(7);
    expect(identityAvatarCharacter("agent:ada")).toBe(identityAvatarCharacter("agent:ada"));
  });

  it("draws a machine in a rounded square", () => {
    const { container } = render(<IdentityAvatar kind="machine" name="pi-kitchen" />);
    expect(root(container)).toHaveAttribute("data-kind", "machine");
    expect(container.querySelector('[data-part="frame"]')!.getAttribute("d")).toContain("A");
    expect(container.querySelector('svg[data-slot="sutra-mascot"]')).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "pi-kitchen, machine" })).toBeInTheDocument();
  });

  it("draws a Sutra app with its tile, named after the app; other apps get a tile with initials", () => {
    const { container, rerender } = render(<IdentityAvatar kind="app" app="notes" />);
    expect(container.querySelector('[data-part="app"] svg')).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Notes, app" })).toBeInTheDocument();
    rerender(<IdentityAvatar kind="app" name="Linear" />);
    expect(container.querySelector('[data-part="app"]')).toBeNull();
    expect(container.querySelector('[data-part="frame"]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-part="monogram"] path')).toHaveLength(2);
  });
});

describe("IdentityAvatar: presence", () => {
  it("draws a shaped mark in the corner and cuts a gap for it", () => {
    const { container, rerender } = render(<IdentityAvatar name="Asha Rao" presence="online" />);
    expect(root(container)).toHaveAttribute("data-presence", "online");
    expect(root(container)).toHaveAttribute("data-presence-style", "mark");
    expect(container.querySelector("mask circle[fill='black']")).toBeInTheDocument();
    const mark = () => container.querySelector('[data-part="presence"]')!;
    expect(mark().querySelector("circle")).toHaveAttribute("fill", "currentColor");
    rerender(<IdentityAvatar name="Asha Rao" presence="busy" />);
    expect(mark().querySelector("path")).toHaveAttribute("fill-rule", "evenodd");
    rerender(<IdentityAvatar name="Asha Rao" presence="away" />);
    expect(mark().querySelector("circle")).toHaveAttribute("fill", "none");
    expect(mark().querySelector("path")).toBeInTheDocument();
    rerender(<IdentityAvatar name="Asha Rao" presence="offline" />);
    expect(mark().querySelector("circle")).toHaveAttribute("fill", "none");
    expect(mark().querySelector("path")).toBeNull();
    rerender(<IdentityAvatar name="Asha Rao" />);
    expect(mark()).toBeNull();
    expect(container.querySelector("mask")).toBeNull();
    expect(root(container)).not.toHaveAttribute("data-presence");
  });

  it("strings the face on a thread with the presence bead on it", () => {
    const { container, rerender } = render(<IdentityAvatar name="Asha Rao" presence="online" presenceStyle="bead" />);
    expect(root(container)).toHaveAttribute("data-presence-style", "bead");
    const thread = () => container.querySelector('[data-part="thread"] > *')!;
    expect(thread()).not.toHaveAttribute("stroke-dasharray");
    expect(container.querySelector('[data-part="bead"] circle')).toHaveAttribute("fill", "currentColor");
    rerender(<IdentityAvatar name="Asha Rao" presence="busy" presenceStyle="bead" />);
    expect(container.querySelector('[data-part="bead"] path')).toHaveAttribute("fill-rule", "evenodd");
    rerender(<IdentityAvatar name="Asha Rao" presence="away" presenceStyle="bead" />);
    const half = thread().getAttribute("stroke-dasharray")!.split(" ").map(Number);
    expect(half[0]).toBeCloseTo(half[1]!, 1);
    rerender(<IdentityAvatar name="Asha Rao" presence="offline" presenceStyle="bead" />);
    expect(thread().getAttribute("stroke-dasharray")!.split(" ").map(Number)[0]).toBeLessThan(half[0]! / 3);
    expect(container.querySelector('[data-part="bead"] circle')).toHaveAttribute("fill", "none");
    rerender(<IdentityAvatar name="Asha Rao" presenceStyle="bead" />);
    expect(container.querySelector('[data-part="thread"]')).toBeNull();
  });

  it("keeps the mark for apps, and follows a machine's square with the thread", () => {
    const { container, rerender } = render(<IdentityAvatar kind="app" app="mail" presence="busy" presenceStyle="bead" />);
    expect(root(container)).toHaveAttribute("data-presence-style", "mark");
    expect(container.querySelector('[data-part="thread"]')).toBeNull();
    rerender(<IdentityAvatar kind="machine" name="nas" presence="online" presenceStyle="bead" />);
    expect(container.querySelector('[data-part="thread"] rect')).toBeInTheDocument();
  });

  it("slides a busy agent's bead only when animated", () => {
    const { container, rerender } = render(<IdentityAvatar kind="agent" name="Ada" presence="busy" presenceStyle="bead" />);
    expect(container.querySelector("[data-slide]")).toBeNull();
    rerender(<IdentityAvatar kind="agent" name="Ada" presence="busy" presenceStyle="bead" animated />);
    const sliding = container.querySelectorAll<SVGGElement>("[data-slide]");
    expect(sliding).toHaveLength(2); /* the bead and the gap it cuts */
    expect(sliding[0]!.style.transformOrigin).toBe("16px 16px");
    rerender(<IdentityAvatar name="Asha Rao" presence="busy" presenceStyle="bead" animated />);
    expect(container.querySelector("[data-slide]")).toBeNull();
  });

  it("moves the presence to the start corner in right-to-left", () => {
    const { container } = render(
      <DirectionProvider dir="rtl">
        <IdentityAvatar name="Asha Rao" presence="online" size="lg" />
      </DirectionProvider>
    );
    const cx = Number(container.querySelector('[data-part="presence"] circle')!.getAttribute("cx"));
    expect(cx).toBeLessThan(identityAvatarSizes.lg / 2);
  });
});

describe("IdentityAvatar: size, colour, name", () => {
  it("takes a size step or a number of pixels", () => {
    const { container, rerender } = render(<IdentityAvatar name="Asha Rao" size="xs" />);
    for (const [step, px] of Object.entries(identityAvatarSizes)) {
      rerender(<IdentityAvatar name="Asha Rao" size={step as keyof typeof identityAvatarSizes} />);
      expect(root(container).style.width).toBe(`${px}px`);
      expect(container.querySelector("svg")).toHaveAttribute("viewBox", `0 0 ${px} ${px}`);
    }
    rerender(<IdentityAvatar name="Asha Rao" size={40} />);
    expect(root(container).style.width).toBe("40px");
  });

  it("carries the seed colour (or the override) for the stock style", () => {
    const { container, rerender } = render(<IdentityAvatar name="Asha Rao" />);
    expect(root(container).style.getPropertyValue("--sutra-ia-seed")).toBe(colorForSeed("Asha Rao"));
    rerender(<IdentityAvatar name="Asha Rao" seed="user:asha" />);
    expect(root(container).style.getPropertyValue("--sutra-ia-seed")).toBe(colorForSeed("user:asha"));
    rerender(<IdentityAvatar name="Asha Rao" color="#123456" />);
    expect(root(container).style.getPropertyValue("--sutra-ia-seed")).toBe("#123456");
  });

  it("is decorative without a name or when asked, and takes a label", () => {
    const { container, rerender } = render(<IdentityAvatar />);
    expect(root(container)).toHaveAttribute("aria-hidden", "true");
    expect(root(container)).not.toHaveAttribute("role");
    rerender(<IdentityAvatar name="Asha Rao" decorative />);
    expect(root(container)).toHaveAttribute("aria-hidden", "true");
    rerender(<IdentityAvatar name="Asha Rao" presence="away" label="Asha (away since 10:00)" />);
    expect(screen.getByRole("img", { name: "Asha (away since 10:00)" })).toBeInTheDocument();
  });

  it("forwards the ref and lets the consumer's props through", () => {
    const ref = React.createRef<HTMLSpanElement>();
    const { container } = render(<IdentityAvatar ref={ref} name="Asha Rao" className="ring-2" data-testid="me" style={{ margin: 2 }} />);
    expect(ref.current).toBe(root(container));
    expect(ref.current).toHaveClass("ring-2", "inline-flex");
    expect(ref.current).toHaveAttribute("data-testid", "me");
    expect(ref.current!.style.margin).toBe("2px");
  });

  it("uses unique mask and clip ids per avatar", () => {
    const { container } = render(
      <div>
        <IdentityAvatar name="A B" presence="online" />
        <IdentityAvatar name="A B" presence="online" />
      </div>
    );
    const ids = [...container.querySelectorAll("[id]")].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no axe violations across kinds and presence styles", async () => {
    const { container } = render(
      <div>
        <IdentityAvatar name="Asha Rao" presence="online" />
        <IdentityAvatar name="Mei Chen" src="/a.png" presence="away" presenceStyle="bead" />
        <IdentityAvatar kind="agent" name="Ada" presence="busy" />
        <IdentityAvatar kind="machine" name="gpu-01" presence="offline" presenceStyle="bead" />
        <IdentityAvatar kind="app" app="calendar" />
        <IdentityAvatar name="Decor" decorative />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("drawn monogram glyphs", () => {
  it("covers A to Z and the digits, and folds accents", () => {
    for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") expect(MONOGRAM_GLYPHS[c]).toBeDefined();
    expect(canDrawMonogram("ÉÅ")).toBe(true);
    expect(canDrawMonogram("Ж")).toBe(false);
    expect(canDrawMonogram("")).toBe(false);
  });

  it("fits a wide pair into the box and keeps the pixel stroke weight", () => {
    const m = layoutMonogram("MW", 48, { cx: 24, cy: 24, capPx: 14.4, maxWidth: 30 });
    const width = (18 + 6.4 + 22) * m.scale;
    expect(width).toBeLessThanOrEqual(30.01);
    expect(m.strokeWidth * m.scale).toBeCloseTo(0.028 * 48 + 1, 5);
    expect(m.glyphs.map((g) => g.x)).toEqual([0, 24.4]);
  });
});
