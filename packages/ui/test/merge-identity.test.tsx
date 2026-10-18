import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { colorForSeed } from "../src/lib/hash";
import { Avatar, seedColorStyle } from "../src/primitives/avatar";
import { Monogram, monogramInitials } from "../src/primitives/monogram";
import { ProviderLogo, providerMonogram } from "../src/kits/agent-admin/llm-providers";
import { CapabilityMonogram } from "../src/kits/agent-admin/capabilities";
import { ChatMessage, ChatMessageAvatar } from "../src/kits/ai/chat-message";
import { SidebarUserCard } from "../src/patterns/sidebar-navigation";
import { EmptyState } from "../src/primitives/empty-state";
import { ChatEmptyState } from "../src/kits/ai/chat-conversation";
import { TextLink } from "../src/primitives/text-link";
import { TextButton } from "../src/patterns/identity-mark";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "../src/primitives/dialog";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../src/primitives/drawer";
import { BlogContent, Prose } from "../src/patterns/blog-content";
import { ContentDivider, Separator } from "../src/primitives/separator";
import { FilterBarChip, FilterPill } from "../src/patterns/filter-bar";
import { ActivityFeed, SecurityActivityFeed } from "../src/kits/identity/connected-apps";
import {
  DeviceSessionList,
  DeviceSessionRow,
  SessionList,
  SessionRow,
  type DeviceSession,
  type Session,
} from "../src/kits/identity/device-sessions";
import { ChatHeader, MessengerHeader } from "../src/kits/social/messenger";
import { axeViolations } from "./a11y";

/** Browser-normalised form of a CSS colour, for comparing inline styles. */
function norm(color: string) {
  const el = document.createElement("div");
  el.style.backgroundColor = color;
  return el.style.backgroundColor;
}

/* ------------------------------------------------------------------ */
/* Avatar + Monogram base                                              */
/* ------------------------------------------------------------------ */

describe("Avatar base", () => {
  it("labels the fallback with alt or name and accepts initials options", () => {
    render(
      <div>
        <Avatar name="Maya" initialsOptions={{ singleWord: 2 }} />
        <Avatar alt="Robot" />
      </div>
    );
    expect(screen.getByRole("img", { name: "Maya" })).toHaveTextContent("MA");
    expect(screen.getByRole("img", { name: "Robot" })).toBeInTheDocument();
  });

  it("solid variant fills with the seed colour (or an explicit colour)", () => {
    render(
      <div>
        <Avatar name="Ada Lovelace" variant="solid" />
        <Avatar name="Grace Hopper" variant="solid" color="#123456" />
      </div>
    );
    expect(screen.getByRole("img", { name: "Ada Lovelace" }).style.backgroundColor).toBe(norm(colorForSeed("Ada Lovelace")));
    expect(screen.getByRole("img", { name: "Grace Hopper" }).style.backgroundColor).toBe(norm("#123456"));
    expect(seedColorStyle("#123456", "solid")).toEqual({ backgroundColor: "#123456", color: "#ffffff" });
  });
});

describe("Monogram", () => {
  it("derives letters with one algorithm", () => {
    expect(monogramInitials("Nimbus AI")).toBe("NA");
    expect(monogramInitials("corvid")).toBe("CO");
    expect(monogramInitials("github-mcp")).toBe("GM");
    expect(monogramInitials("")).toBe("?");
    expect(providerMonogram("Nimbus AI")).toBe(monogramInitials("Nimbus AI"));
  });

  it("is decorative by default, labelled with `label`, and coloured from the seed", () => {
    const { container } = render(
      <div>
        <Monogram name="Notes" data-testid="deco" />
        <Monogram name="Calendar" label="Calendar" variant="soft" />
        <Monogram name="Mail" letters="M" variant="brand" data-testid="brand" />
      </div>
    );
    const deco = screen.getByTestId("deco");
    expect(deco).toHaveAttribute("aria-hidden", "true");
    expect(deco).toHaveTextContent("NO");
    expect(deco.style.backgroundColor).toBe(norm(colorForSeed("Notes")));
    expect(screen.getByRole("img", { name: "Calendar" })).toHaveTextContent("CA");
    expect(screen.getByTestId("brand")).toHaveTextContent("M");
    expect(screen.getByTestId("brand").style.backgroundColor).toBe("");
    expect(container.querySelectorAll('[data-slot="monogram"]')).toHaveLength(3);
  });

  it("ProviderLogo and CapabilityMonogram are Monogram presets", () => {
    const { container } = render(
      <div>
        <ProviderLogo name="Nimbus AI" size="lg" />
        <ProviderLogo name="Corvid" monogram="Cv" color="#ff0000" />
        <CapabilityMonogram name="github-mcp" />
      </div>
    );
    const logos = container.querySelectorAll('[data-slot="provider-logo"]');
    expect(logos).toHaveLength(2);
    expect(logos[0]).toHaveTextContent("NA");
    expect(logos[0]).toHaveAttribute("aria-hidden", "true");
    expect(logos[0]).toHaveClass("size-10", "text-white");
    expect((logos[0] as HTMLElement).style.backgroundColor).toBe(norm(colorForSeed("Nimbus AI")));
    expect(logos[1]).toHaveTextContent("Cv");
    expect((logos[1] as HTMLElement).style.backgroundColor).toBe(norm("#ff0000"));
    const cap = container.querySelector('[data-slot="capability-monogram"]')!;
    expect(cap).toHaveTextContent("GM");
    expect(cap).toHaveClass("size-9", "rounded-box");
    expect(cap).toHaveAttribute("aria-hidden", "true");
  });
});

describe("ChatMessageAvatar and SidebarUserCard render Avatar", () => {
  it("ChatMessageAvatar: spark for the assistant, initials and seed colour for people", () => {
    const { container } = render(
      <div>
        <ChatMessage role="assistant">
          <ChatMessageAvatar />
        </ChatMessage>
        <ChatMessage role="user">
          <ChatMessageAvatar name="Maya" />
        </ChatMessage>
        <ChatMessage role="user">
          <ChatMessageAvatar />
        </ChatMessage>
      </div>
    );
    const spark = screen.getByRole("img", { name: "Assistant" });
    expect(spark.querySelector("svg")).toBeInTheDocument();
    const maya = screen.getByRole("img", { name: "Maya" });
    expect(maya).toHaveTextContent("MA");
    expect(maya.style.backgroundColor).toContain("color-mix");
    expect(screen.getByRole("img", { name: "User" })).toBeInTheDocument();
    expect(container.querySelectorAll(".size-8")).not.toHaveLength(0);
  });

  it("SidebarUserCard: decorative solid avatar, name announced once", () => {
    render(<SidebarUserCard name="Olivia Rhye" email="olivia@sutra.app" avatarColor="#615fff" />);
    const button = screen.getByRole("button");
    expect(button).toHaveAccessibleName("Olivia Rhye olivia@sutra.app");
    expect(screen.getByText("OR").style.backgroundColor).toBe(norm("#615fff"));
    expect(screen.getByText("OR").style.color).toBe("rgb(255, 255, 255)");
  });
});

/* ------------------------------------------------------------------ */
/* EmptyState welcome                                                  */
/* ------------------------------------------------------------------ */

describe("EmptyState variant=welcome / ChatEmptyState", () => {
  it("renders an h2 greeting, no default icon, and wraps children", () => {
    const { container } = render(
      <EmptyState variant="welcome" title="How can I help?" description="Ask anything">
        <button type="button">Suggestion</button>
      </EmptyState>
    );
    expect(screen.getByRole("heading", { level: 2, name: "How can I help?" })).toHaveClass("text-display-xs");
    expect(screen.getByRole("region", { name: "How can I help?" })).toHaveAttribute("data-variant", "welcome");
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getByRole("button", { name: "Suggestion" }).parentElement).toHaveClass("mt-2", "w-full");
  });

  it("ChatEmptyState is the welcome preset and works without a title", () => {
    const { container, rerender } = render(<ChatEmptyState icon={<svg data-testid="icon" />} title="Hi" />);
    expect(container.querySelector('[data-slot="empty-state"]')).toHaveAttribute("data-variant", "welcome");
    expect(screen.getByTestId("icon").parentElement).toHaveClass("size-12", "rounded-box");
    expect(screen.getByRole("heading", { level: 2, name: "Hi" })).toBeInTheDocument();
    rerender(<ChatEmptyState description="Only a line" />);
    expect(screen.queryByRole("heading")).toBeNull();
    expect(container.querySelector("section")).not.toHaveAttribute("aria-labelledby");
    expect(screen.getByText("Only a line")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* TextLink button mode / TextButton                                   */
/* ------------------------------------------------------------------ */

describe("TextLink button mode", () => {
  it("renders a button for onClick without href, or as='button'", () => {
    const onClick = vi.fn();
    render(
      <p>
        <TextLink onClick={onClick}>start over</TextLink>
        <TextLink as="button" type="submit" disabled>
          save
        </TextLink>
        <TextLink href="/docs" onClick={() => {}}>
          docs
        </TextLink>
        <TextLink href="https://example.com" target="_blank">
          ext
        </TextLink>
      </p>
    );
    const btn = screen.getByRole("button", { name: "start over" });
    expect(btn).toHaveAttribute("type", "button");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "save" })).toHaveAttribute("type", "submit");
    expect(screen.getByRole("button", { name: "save" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "docs" })).toHaveAttribute("href", "/docs");
    expect(screen.getByRole("link", { name: "ext" })).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("TextButton is a TextLink with tone mapped to variant", () => {
    render(
      <p>
        <TextButton tone="destructive" onClick={() => {}}>
          discard
        </TextButton>
        <TextButton href="/s" tone="muted">
          settings
        </TextButton>
        <TextButton>plain</TextButton>
      </p>
    );
    expect(screen.getByRole("button", { name: "discard" })).toHaveClass("text-destructive", "inline");
    expect(screen.getByRole("link", { name: "settings" })).toHaveClass("text-muted-foreground");
    expect(screen.getByRole("button", { name: "plain" })).toHaveAttribute("type", "button");
  });
});

/* ------------------------------------------------------------------ */
/* Sheet / Drawer share parts                                          */
/* ------------------------------------------------------------------ */

describe("Drawer reuses Sheet parts", () => {
  it("Trigger, Title and Description are the Sheet parts", () => {
    expect(DrawerTrigger).toBe(SheetTrigger);
    expect(DrawerTitle).toBe(SheetTitle);
    expect(DrawerDescription).toBe(SheetDescription);
  });

  it("Header, Body and Footer keep drawer spacing and slots", () => {
    render(
      <Drawer defaultOpen>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filters</DrawerTitle>
            <DrawerDescription>Narrow the list</DrawerDescription>
          </DrawerHeader>
          <DrawerBody>Body</DrawerBody>
          <DrawerFooter>Footer</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
    const dialog = screen.getByRole("dialog", { name: "Filters" });
    expect(dialog).toHaveAccessibleDescription("Narrow the list");
    const header = dialog.querySelector('[data-slot="drawer-header"]')!;
    expect(header).toHaveClass("px-5", "touch-none", "gap-1");
    expect(header).not.toHaveClass("pr-8");
    const body = dialog.querySelector('[data-slot="drawer-body"]')!;
    expect(body).toHaveClass("px-5", "mx-0", "overflow-y-auto");
    expect(body).not.toHaveClass("-mx-6");
    expect(dialog.querySelector('[data-slot="drawer-footer"]')).toHaveClass("border-t", "px-5");
  });

  it("Sheet still works with its own parts", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetTitle>Panel</SheetTitle>
          <SheetDescription>Details</SheetDescription>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByRole("dialog", { name: "Panel" })).toHaveAccessibleDescription("Details");
  });
});

/* ------------------------------------------------------------------ */
/* Deprecated aliases and better names                                 */
/* ------------------------------------------------------------------ */

describe("deprecated aliases", () => {
  it("old names point at the canonical components", () => {
    expect(Prose).toBe(BlogContent);
    expect(ContentDivider).toBe(Separator);
    expect(FilterPill).toBe(FilterBarChip);
    expect(ActivityFeed).toBe(SecurityActivityFeed);
    expect(SessionList).toBe(DeviceSessionList);
    expect(SessionRow).toBe(DeviceSessionRow);
    expect(ChatHeader).toBe(MessengerHeader);
    const legacy: Session = { id: "a", name: "Mac" };
    const modern: DeviceSession = legacy;
    expect(modern.id).toBe("a");
  });

  it("renamed components render", () => {
    render(
      <div>
        <DeviceSessionList sessions={[{ id: "s1", name: "Vyom's MacBook", current: true }]} now={0} />
        <MessengerHeader name="Ana Lima" presence="online" />
      </div>
    );
    expect(screen.getByText("Vyom's MacBook")).toBeInTheDocument();
    expect(screen.getByText("Ana Lima")).toBeInTheDocument();
  });
});

describe("identity gallery", () => {
  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <Avatar name="Ada Lovelace" variant="solid" />
        <Monogram name="Notes" />
        <Monogram name="Calendar" label="Calendar" />
        <ProviderLogo name="Nimbus AI" />
        <CapabilityMonogram name="github-mcp" />
        <ChatMessage role="assistant">
          <ChatMessageAvatar />
        </ChatMessage>
        <SidebarUserCard name="Olivia Rhye" email="olivia@sutra.app" />
        <ChatEmptyState title="How can I help?" description="Ask anything" />
        <p>
          Or <TextLink onClick={() => {}}>start over</TextLink>.
        </p>
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
