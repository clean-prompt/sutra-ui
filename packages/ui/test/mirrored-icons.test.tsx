import * as React from "react";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SecurityActivityFeed } from "../src/kits/identity/connected-apps";
import { ScopeIcon, ScopeList } from "../src/kits/identity/consent";

afterEach(cleanup);

const MIRROR = "rtl:-scale-x-100";

describe("login and logout glyphs mirror in right-to-left", () => {
  it("SecurityActivityFeed mirrors the sign-in and sign-out event icons only", () => {
    const events = [
      { id: "1", type: "sign_in", description: "Signed in", at: 1_700_000_000_000 },
      { id: "2", type: "sign_out", description: "Signed out", at: 1_700_000_000_000 },
      { id: "3", type: "approved", description: "Approved", at: 1_700_000_000_000 },
    ];
    const { container } = render(
      <div dir="rtl">
        <SecurityActivityFeed events={events} now={1_700_000_100_000} />
      </div>
    );
    const rows = [...container.querySelectorAll("li")];
    const svgOf = (text: string) => rows.find((r) => r.textContent?.includes(text))?.querySelector("svg");
    expect(svgOf("Signed in")?.getAttribute("class")).toContain(MIRROR);
    expect(svgOf("Signed out")?.getAttribute("class")).toContain(MIRROR);
    expect(svgOf("Approved")?.getAttribute("class") ?? "").not.toContain(MIRROR);
  });

  it("ScopeList and ScopeIcon mirror the login scope glyph only", () => {
    const { container } = render(
      <div dir="rtl">
        <ScopeList scopes={["login", "profile"]} />
        <ScopeIcon scope="login" />
        <ScopeIcon scope="profile" />
      </div>
    );
    const items = [...container.querySelectorAll("li[data-scope]")];
    const svg = (id: string) => items.find((i) => i.getAttribute("data-scope") === id)?.querySelector("svg");
    expect(svg("login")?.getAttribute("class")).toContain(MIRROR);
    expect(svg("profile")?.getAttribute("class") ?? "").not.toContain(MIRROR);
    const standalone = [...container.querySelectorAll("div[dir=rtl] > svg")];
    expect(standalone[0].getAttribute("class")).toContain(MIRROR);
    expect(standalone[1].getAttribute("class") ?? "").not.toContain(MIRROR);
  });
});

/** Every plain JSX use of these glyphs carries an `rtl:` partner (a class variable or a call is trusted: it is checked where it is defined). */
describe("directional glyphs keep their rtl: partner", () => {
  const SRC = path.resolve(__dirname, "../src");
  const DIRECTIONAL = /^Ri(ArrowRightSLine|ArrowLeftSLine|ArrowRightLine|ArrowLeftLine|LoginBoxLine|LogoutBoxRLine|ReplyLine|ShareForwardLine|LayoutLeftLine)$/;
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = path.join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith(".tsx") ? [p] : [];
    });

  it("no literal-class use of a directional icon is left without rtl:", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/<(Ri[A-Za-z]+)\b([^<>]*?)\/?>/g)) {
        if (!DIRECTIONAL.test(m[1])) continue;
        const attrs = m[2];
        if (/rtl:/.test(attrs)) continue;
        if (/className=\{(?!`|")/.test(attrs) || /className=\{[A-Za-z_]/.test(attrs)) continue;
        offenders.push(`${path.relative(SRC, file)}:${text.slice(0, m.index).split("\n").length} ${m[1]}`);
      }
    }
    expect(offenders, "add rtl:-scale-x-100 (and the opposite sign under rtl: for a rotation)").toEqual([]);
  });
});
