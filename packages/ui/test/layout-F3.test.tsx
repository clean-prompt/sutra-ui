import * as React from "react";
import fs from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import { PaymentCard } from "../src/kits/billing/payment-card";
import { WorldMap } from "../src/kits/geo/world-map";
import { SignInMap } from "../src/kits/identity/sign-in-map";
import { KunjiLink } from "../src/kits/identity/kunji-link";
import { MiniPlayer } from "../src/kits/media/audio-player";
import { ContainerList, ContainerSummary, type ContainerInfo } from "../src/kits/system/containers";
import { DevServerList, type DevServerProject } from "../src/kits/system/dev-servers";
import { LoginCard } from "../src/blocks/auth-blocks";
import { createMockKunjiClient } from "../src/kits/identity/kunji-client";

// jsdom cannot lay anything out: these checks pin the classes and structure that make the layouts follow the
// width a component is given (container queries, wrapping, min-w-0), not the viewport. The audit re-run in a
// real browser is the check that the layout itself holds.

const SRC = path.resolve(__dirname, "../src");
const F3_DIRS = ["blocks", "kits/workspace", "kits/identity", "kits/social", "kits/media", "kits/ops", "kits/system", "kits/billing", "kits/geo"];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(path.join(SRC, dir), { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".tsx")) out.push(path.join(SRC, dir, entry.name));
  }
  return out;
}

describe("layout: grids that start as one column", () => {
  it("every grid with only breakpoint columns names its single column (grid-cols-1)", () => {
    // A bare `grid` has one implicit `auto` column, which grows to its widest child instead of the container.
    const offenders: string[] = [];
    for (const dir of F3_DIRS) {
      for (const file of sourceFiles(dir)) {
        fs.readFileSync(file, "utf8")
          .split("\n")
          .forEach((line, i) => {
            if (!/(^|[" `])grid([" `]|$)/.test(line)) return;
            if (!/(sm|md|lg|xl|@[a-z0-9]+):grid-cols/.test(line)) return;
            if (/(^|[ "`])grid-cols-[0-9[]/.test(line)) return;
            offenders.push(`${path.relative(SRC, file)}:${i + 1}`);
          });
      }
    }
    // header-navigation-blocks: the mega-menu panel has a fixed width and its own 2-column template.
    expect(offenders.filter((o) => !o.startsWith("blocks/header-navigation-blocks.tsx"))).toEqual([]);
  });
});

describe("layout: system kit rows follow their container", () => {
  const NOW = Date.UTC(2026, 9, 19, 12, 0, 0);

  it("DevServerList is a size container and its rows wrap name/memory above ports and activity", () => {
    const projects: DevServerProject[] = [
      { id: "web", name: "web-app", runtime: "node", ports: [3000], memoryBytes: 450e6, state: "running", idleSince: NOW - 3 * 3600_000 },
    ];
    const { container } = render(<DevServerList projects={projects} now={NOW} onStop={() => {}} />);
    expect(container.querySelector('[data-slot="dev-server-list"]')).toHaveClass("@container");
    const row = container.querySelector('[data-slot="dev-server-row"]')!;
    expect(row).toHaveClass("flex-wrap");
    expect(row.className).not.toMatch(/(^|\s)(sm|md|lg):/);
    expect(container.querySelector('[data-slot="dev-server-memory"]')).toHaveClass("order-3");
  });

  it("ContainerList rows and group headers wrap, and the CPU label stays for screen readers", () => {
    const containers: ContainerInfo[] = [
      { id: "db", name: "postgres", image: "postgres:16", group: "shop", state: "running", startedAt: NOW - 3600_000, ports: [5432], cpu: 2, memoryBytes: 120e6 },
    ];
    const { container } = render(<ContainerList containers={containers} now={NOW} onStop={() => {}} />);
    expect(container.querySelector('[data-slot="container-list"]')).toHaveClass("@container");
    expect(container.querySelector('[data-slot="container-row"]')).toHaveClass("flex-wrap");
    expect(container.querySelector('[data-slot="container-group-header"]')).toHaveClass("flex-wrap");
    expect(container.querySelector('[data-slot="container-cpu"]')).toHaveTextContent("CPU");
  });

  it("ContainerSummary stacks its panels by container width, not window width", () => {
    const { container } = render(<ContainerSummary containers={[]} />);
    const root = container.querySelector('[data-slot="container-summary"]')!;
    expect(root).toHaveClass("@container");
    expect(root.innerHTML).not.toContain("md:flex-row");
  });
});

describe("layout: cards and maps scale or stack with their container", () => {
  it("PaymentCard never exceeds its column and scales its content with it", () => {
    const { container } = render(<PaymentCard number="4242424242424242" holder="Maya Patel" expiry="08/29" />);
    const card = container.querySelector<HTMLElement>('[data-slot="payment-card"]')!;
    expect(card).toHaveClass("@container", "max-w-full", "w-80");
    expect(card.style.getPropertyValue("--pc-u")).toContain("cqw");
    expect(card.innerHTML).toContain("var(--pc-u)");
  });

  it("SignInMap switches to two columns from its own width", () => {
    const { container } = render(<SignInMap events={[]} />);
    const root = container.querySelector('[data-slot="sign-in-map"]') ?? container.firstElementChild!;
    expect(root).toHaveClass("@container");
    expect(root.innerHTML).not.toMatch(/(^|[\s"])lg:grid-cols/);
  });

  it("the world map keeps its screen-reader tables inside a clipping wrapper", () => {
    const { container } = render(
      <WorldMap data={[{ code: "US", value: 3 }]} markers={[{ id: "a", label: "A", point: [0, 0] }]} arcs={[{ id: "x", label: "X", from: [0, 0], to: [10, 10] }]} />
    );
    for (const slot of ["geo-table-countries", "geo-table-markers", "geo-table-arcs"]) {
      const table = container.querySelector(`[data-slot="${slot}"]`)!;
      expect(table).not.toHaveClass("sr-only");
      expect(table.parentElement).toHaveClass("sr-only");
    }
  });

  it("MiniPlayer picks compact or full from its container and wraps the full bar when narrow", () => {
    const track = { id: "t", title: "Harbor Lights", artist: "Nadia", src: "" };
    const { container } = render(<MiniPlayer track={track} playing currentTime={5} duration={100} />);
    expect(container.firstElementChild).toHaveClass("@container");
    const full = container.querySelector('[data-layout="full"]')!;
    expect(full.className).toContain("grid-cols-[minmax(0,1fr)_auto]");
    expect(full.className).toContain("@2xl:grid-cols-");
    expect(full.className).not.toMatch(/(^|\s)max-md:hidden/);
  });
});

describe("layout: blocks wrap instead of overflowing", () => {
  it("LoginCard lets 'Remember me' and 'Forgot password?' wrap onto two lines", () => {
    const { container } = render(<LoginCard />);
    const link = Array.from(container.querySelectorAll("a")).find((a) => a.textContent?.includes("Forgot password"))!;
    expect(link.parentElement).toHaveClass("flex-wrap");
  });

  it("KunjiLink drops its badge under the text instead of squeezing the title", () => {
    const { container } = render(<KunjiLink client={createMockKunjiClient({ appName: "Sutra", audience: "id.sutra.app" })} />);
    const header = container.querySelector('[data-slot="kunji-linked-badge"]')!.parentElement!;
    expect(header).toHaveClass("flex-wrap");
    expect(header.children[1]).toHaveClass("basis-40", "min-w-0");
  });
});

describe("layout: source rules for the video player and the gallery", () => {
  const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8");

  it("VideoPlayer hides secondary controls by its own width", () => {
    const src = read("kits/media/video-player.tsx");
    expect(src).toContain("group/player @container");
    expect(src).not.toMatch(/(^|[\s"])max-sm:hidden/);
  });

  it("the kunji sign-in widget lays its compact row out from container width", () => {
    const src = read("kits/identity/kunji-sign-in.tsx");
    expect(src).toContain('"@container flex flex-col gap-5');
    expect(src).not.toContain('"sm:flex-row sm:items-start"');
  });

  it("gallery wrappers do not double the frame padding on phones", () => {
    const src = read("blocks/registry.tsx");
    expect(src).not.toMatch(/className: "p-6"/);
    expect(src).not.toMatch(/justify-center p-6"/);
  });
});
