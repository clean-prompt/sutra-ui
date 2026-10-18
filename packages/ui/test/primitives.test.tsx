import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppStoreBadge } from "../src/primitives/app-store-badge";
import { AspectRatio } from "../src/primitives/aspect-ratio";
import { GlyphSpinner, glyphSpinnerFrames } from "../src/primitives/glyph-spinner";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "../src/primitives/input-group";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../src/primitives/input-otp";
import { Label } from "../src/primitives/label";
import { MeshGradient } from "../src/primitives/mesh-gradient";
import { ScrollArea } from "../src/primitives/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../src/primitives/select";
import { SocialButton } from "../src/primitives/social-button";
import { SplitButton } from "../src/primitives/split-button";
import { TabDropdown } from "../src/primitives/tab-dropdown";
import { axeViolations } from "./a11y";

/* Primitives that have no page-specific test file of their own. */

// input-otp probes document.elementFromPoint (password-manager badge detection); jsdom lacks it.
beforeAll(() => {
  if (!document.elementFromPoint) document.elementFromPoint = () => null;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const openMenu = (trigger: HTMLElement) => {
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
  if (trigger.getAttribute("aria-expanded") !== "true") fireEvent.keyDown(trigger, { key: "Enter" });
};

describe("Label", () => {
  it("names its control and focuses it on click", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Label htmlFor="email" required hint="(work)">
          Email
        </Label>
        <input id="email" />
      </>
    );
    const input = screen.getByRole("textbox", { name: /Email/ });
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden");
    expect(screen.getByText("(work)")).toBeInTheDocument();
    await user.click(screen.getByText("Email"));
    expect(input).toHaveFocus();
  });
});

describe("ScrollArea", () => {
  it("renders children inside the viewport and forwards viewportRef", async () => {
    const viewportRef = React.createRef<HTMLDivElement>();
    const { container } = render(
      <ScrollArea className="h-20" viewportRef={viewportRef} aria-label="Log">
        <p>Line one</p>
        <p>Line two</p>
      </ScrollArea>
    );
    expect(screen.getByText("Line two")).toBeInTheDocument();
    expect(viewportRef.current).toBeInstanceOf(HTMLDivElement);
    expect(viewportRef.current).toContainElement(screen.getByText("Line one"));
    expect(await axeViolations(container)).toEqual([]);
  });

  it("masks the edges that can still scroll when fadeEdges is on", () => {
    const viewportRef = React.createRef<HTMLDivElement>();
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(100);
    render(
      <ScrollArea fadeEdges="vertical" viewportRef={viewportRef}>
        <div style={{ height: 400 }}>Tall</div>
      </ScrollArea>
    );
    const vp = viewportRef.current!;
    // At the top: only the bottom edge fades.
    expect(vp.style.maskImage).toMatch(/^linear-gradient\(to bottom, #000.*transparent\)$/);
    vp.scrollTop = 300;
    fireEvent.scroll(vp);
    expect(vp.style.maskImage).toMatch(/^linear-gradient\(to bottom, transparent.*#000\)$/);
  });
});

describe("AspectRatio", () => {
  it("keeps the preset ratio as padding and renders its child", () => {
    render(
      <AspectRatio ratio="4/3" data-testid="box">
        <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="Poster" />
      </AspectRatio>
    );
    expect(screen.getByRole("img", { name: "Poster" })).toBeInTheDocument();
    // Radix renders a wrapper whose padding-bottom encodes height / width.
    const wrapper = screen.getByTestId("box").parentElement!;
    expect(wrapper.style.paddingBottom).toBe("75%");
  });

  it("accepts a numeric ratio", () => {
    render(<AspectRatio ratio={2} data-testid="box" />);
    expect(screen.getByTestId("box").parentElement!.style.paddingBottom).toBe("50%");
  });
});

describe("MeshGradient", () => {
  it("renders children above a decorative, hidden layer", async () => {
    const { container } = render(
      <MeshGradient colors={["red", "blue"]} animated={false} grain>
        <h2>Welcome</h2>
      </MeshGradient>
    );
    expect(screen.getByRole("heading", { name: "Welcome" })).toBeInTheDocument();
    const layer = container.querySelector("[aria-hidden]")!;
    const blobs = layer.querySelectorAll("span");
    // 5 blobs + the grain overlay; the palette repeats when fewer colors are given.
    expect(blobs).toHaveLength(6);
    expect((blobs[2] as HTMLElement).style.backgroundImage).toContain("red");
    expect((blobs[0] as HTMLElement).style.animationDuration).toBe("");
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("SocialButton", () => {
  it("defaults to 'Continue with {Provider}' and fires onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { container } = render(<SocialButton provider="github" onClick={onClick} />);
    const button = screen.getByRole("button", { name: "Continue with GitHub" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("data-provider", "github");
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("labels the icon-only variant and blocks clicks while loading", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<SocialButton provider="google" variant="icon" />);
    expect(screen.getByRole("button", { name: "Continue with Google" })).toHaveTextContent("");
    rerender(<SocialButton provider="google" loading onClick={onClick}>Sign in</SocialButton>);
    const button = screen.getByRole("button", { name: /Sign in/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("AppStoreBadge", () => {
  it("is a link named after the store", async () => {
    const { container } = render(<AppStoreBadge store="google-play" href="https://example.com/app" />);
    const link = screen.getByRole("link", { name: "GET IT ON Google Play" });
    expect(link).toHaveAttribute("href", "https://example.com/app");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("lets aria-label override the default name", () => {
    render(<AppStoreBadge store="apple" href="#" aria-label="Get Sutra for iPhone" />);
    expect(screen.getByRole("link", { name: "Get Sutra for iPhone" })).toBeInTheDocument();
  });
});

describe("Select (composed)", () => {
  it("groups options, shows descriptions and selects with the pointer", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger aria-label="Model">
          <SelectValue placeholder="Pick a model" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Local</SelectLabel>
            <SelectItem value="llama" description="8B, runs offline">Llama</SelectItem>
            <SelectItem value="qwen" disabled>Qwen</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );
    const trigger = screen.getByRole("combobox", { name: "Model" });
    expect(trigger).toHaveTextContent("Pick a model");
    await user.click(trigger);
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("Local")).toBeInTheDocument();
    expect(within(listbox).getByText("8B, runs offline")).toBeInTheDocument();
    expect(within(listbox).getByRole("option", { name: /Qwen/ })).toHaveAttribute("aria-disabled", "true");
    await user.click(within(listbox).getByRole("option", { name: /Llama/ }));
    expect(onValueChange).toHaveBeenCalledWith("llama");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(trigger).toHaveTextContent("Llama");
  });
});

describe("InputGroup", () => {
  it("focuses the input when a text addon is clicked and runs addon buttons", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const { container } = render(
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput aria-label="Domain" defaultValue="sutra.dev" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton onClick={onClear}>Clear</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    );
    const input = screen.getByRole("textbox", { name: "Domain" });
    expect(input).not.toHaveFocus();
    await user.click(screen.getByText("https://"));
    expect(input).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("InputOTP (composed)", () => {
  it("fills custom slots and reports the value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <InputOTP maxLength={3} aria-label="PIN" onChange={onChange}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
      </InputOTP>
    );
    const input = screen.getByLabelText("PIN");
    await user.click(input);
    await user.keyboard("74");
    expect(onChange).toHaveBeenLastCalledWith("74");
    const slots = Array.from(container.querySelectorAll('[data-slot="input-otp-slot"]'));
    expect(slots.map((s) => s.textContent)).toEqual(["7", "4", ""]);
  });
});

describe("SplitButton", () => {
  it("runs the primary action and opens the secondary menu", async () => {
    const onClick = vi.fn();
    const onDraft = vi.fn();
    const { container } = render(
      <SplitButton onClick={onClick} actions={[{ id: "draft", label: "Save as draft", onSelect: onDraft }]}>
        Publish
      </SplitButton>
    );
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(onClick).toHaveBeenCalled();
    openMenu(screen.getByRole("button", { name: "More options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Save as draft" }));
    expect(onDraft).toHaveBeenCalled();
  });
});

describe("TabDropdown", () => {
  it("collapses overflowing tabs into More", async () => {
    const desc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth")!;
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get(this: HTMLElement) {
        if (this.hasAttribute("data-tab-dropdown-root")) return 330;
        if (this.hasAttribute("data-tab-measure") || this.hasAttribute("data-tab-measure-more")) return 100;
        return 0;
      },
    });
    try {
      const onValueChange = vi.fn();
      const items = ["Overview", "Files", "Activity", "Settings", "Billing"].map((l) => ({ value: l.toLowerCase(), label: l }));
      const { container } = render(<TabDropdown items={items} label="Project" onValueChange={onValueChange} />);
      const list = screen.getByRole("tablist", { name: "Project" });
      expect(within(list).getAllByRole("tab").map((t) => t.textContent)).toEqual(["Overview", "Files"]);
      const more = screen.getByRole("button", { name: "More tabs" });
      expect(more).toHaveTextContent("3");
      expect(await axeViolations(container)).toEqual([]);
      openMenu(more);
      fireEvent.click(screen.getByRole("menuitemradio", { name: "Billing" }));
      expect(onValueChange).toHaveBeenCalledWith("billing");
      expect(screen.getByRole("button", { name: "More tabs, current: Billing" })).toHaveAttribute("data-state", "active");
      fireEvent.keyDown(within(list).getAllByRole("tab")[0], { key: "ArrowRight" });
      expect(onValueChange).toHaveBeenLastCalledWith("files");
    } finally {
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", desc);
    }
  });

  it("shows all tabs when they fit", () => {
    const items = ["A", "B"].map((l) => ({ value: l, label: l }));
    render(<TabDropdown items={items} />);
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /More/ })).toBeNull();
  });
});

describe("GlyphSpinner", () => {
  it("cycles frames with a status label", async () => {
    vi.useFakeTimers();
    const { container } = render(<GlyphSpinner variant="line" interval={100} label="Thinking" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Thinking");
    expect(status).toHaveTextContent(glyphSpinnerFrames.line[0]);
    act(() => vi.advanceTimersByTime(100));
    expect(status).toHaveAttribute("data-frame", "1");
    act(() => vi.advanceTimersByTime(300));
    expect(status).toHaveAttribute("data-frame", "0");
    vi.useRealTimers();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("holds still under reduced motion", () => {
    vi.useFakeTimers();
    vi.spyOn(window, "matchMedia").mockImplementation(
      (q: string) => ({ matches: q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList
    );
    render(<GlyphSpinner interval={50} />);
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole("status")).toHaveAttribute("data-frame", "0");
  });
});
