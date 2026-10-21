import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordCard, LoginCard, OTPVerifyCard, TwoFactorSetupCard, buildOtpauthUri } from "../src/blocks/auth-blocks";
import { DocsHeader } from "../src/blocks/header-navigation-blocks";
import { AwaitingApproval } from "../src/blocks/kunji-blocks";
import { FeedbackDialog, ShareDialog } from "../src/blocks/modal-dialog-blocks";
import { PageHeaderWithStats } from "../src/blocks/section-header-blocks";
import { useBlockAction } from "../src/blocks/block-utils";
import { demoShare } from "../src/blocks/registry";
import { Input, SearchInput } from "../src/primitives/input";
import { FloatingActionButton } from "../src/primitives/fab";
import { NumberInput } from "../src/primitives/number-input";
import { Pagination } from "../src/primitives/pagination";
import { Rating } from "../src/primitives/rating";
import { getDroppedFiles } from "../src/primitives/dropzone";
import * as fileSystem from "../src/lib/file-system";
import { renderHook } from "@testing-library/react";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("blocks: stale async completions", () => {
  it("useBlockAction resolves false for a run cancelled by reset", async () => {
    const { result } = renderHook(() => useBlockAction());
    let release!: () => void;
    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.run(() => new Promise<void>((r) => (release = r)));
    });
    act(() => result.current.reset());
    release();
    await expect(pending).resolves.toBe(false);
  });

  it("FeedbackDialog: a submit still pending at close does not show 'Thanks' on the next open", async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const onSubmit = vi.fn(() => new Promise<void>((r) => (release = r)));
    const { rerender } = render(<FeedbackDialog open onOpenChange={() => {}} onSubmit={onSubmit} />);
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByRole("textbox"), "Great");
    await user.click(within(dialog).getByRole("button", { name: /send|submit/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    rerender(<FeedbackDialog open={false} onOpenChange={() => {}} onSubmit={onSubmit} />);
    await act(async () => {
      release();
    });
    rerender(<FeedbackDialog open onOpenChange={() => {}} onSubmit={onSubmit} />);
    expect(screen.queryByText("Thanks for the feedback!")).not.toBeInTheDocument();
  });
});

describe("ShareDialog without demo defaults", () => {
  it("has no people, link or item name of its own, and invites build on the latest list", async () => {
    const user = userEvent.setup();
    render(<ShareDialog defaultOpen />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Share" })).toBeInTheDocument();
    expect(within(dialog).queryByText("Maya Patel")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /copy link/i })).not.toBeInTheDocument();
    await user.type(within(dialog).getByRole("textbox", { name: "Email address" }), "sam@x.co");
    await user.click(within(dialog).getByRole("button", { name: "Invite" }));
    expect(await within(dialog).findByText("sam@x.co")).toBeInTheDocument();
    // inviting the same address again does not add a second row
    await user.type(within(dialog).getByRole("textbox", { name: "Email address" }), "SAM@x.co");
    await user.click(within(dialog).getByRole("button", { name: "Invite" }));
    expect(within(dialog).getAllByText(/sam@x\.co/i)).toHaveLength(1);
  });

  it("the demo fixture still fills it in", () => {
    render(<ShareDialog {...demoShare} defaultOpen />);
    expect(screen.getByRole("heading", { name: /Q4 Launch Plan/ })).toBeInTheDocument();
    expect(screen.getByText("Priya Shah")).toBeInTheDocument();
  });
});

describe("other block defaults", () => {
  it("OTPVerifyCard names no address unless given one", () => {
    const { rerender } = render(<OTPVerifyCard autoFocus={false} />);
    expect(screen.getByText("your email")).toBeInTheDocument();
    rerender(<OTPVerifyCard autoFocus={false} email="a@b.dev" />);
    expect(screen.getByText("a@b.dev")).toBeInTheDocument();
  });

  it("TwoFactorSetupCard drops an empty account from the label and the URI", () => {
    render(<TwoFactorSetupCard />);
    expect(screen.getByText("Sutra")).toBeInTheDocument();
    expect(buildOtpauthUri({ issuer: "Sutra", account: "", secret: "abc def" })).toBe("otpauth://totp/Sutra?secret=ABCDEF&issuer=Sutra");
  });

  it("PageHeaderWithStats has a neutral title", () => {
    render(<PageHeaderWithStats />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Overview");
  });
});

describe("auth cards", () => {
  it("`error` marks the fields invalid, not only the alert", () => {
    const { rerender } = render(<LoginCard providers={[]} />);
    const email = screen.getByLabelText("Email");
    expect(email).not.toHaveAttribute("aria-invalid", "true");
    rerender(<LoginCard providers={[]} error="Wrong password" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Wrong password");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
  });

  it("the ref and the other props sit on the same root element", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ForgotPasswordCard ref={ref} data-testid="card" />);
    expect(ref.current).toBe(screen.getByTestId("card"));
    expect(ref.current?.tagName).toBe("DIV");
  });

  it("headingLevel changes the title element; the default stays h1", () => {
    const { rerender } = render(<LoginCard providers={[]} />);
    expect(screen.getByRole("heading", { level: 1, name: "Welcome back" })).toBeInTheDocument();
    rerender(<LoginCard providers={[]} headingLevel={2} />);
    expect(screen.getByRole("heading", { level: 2, name: "Welcome back" })).toBeInTheDocument();
    rerender(<AwaitingApproval headingLevel={3} />);
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });
});

describe("AwaitingApproval polling", () => {
  it("an inline onCheck does not restart the interval on every render", async () => {
    vi.useFakeTimers();
    const calls: number[] = [];
    const Host = () => {
      const [, setN] = React.useState(0);
      return (
        <>
          <button onClick={() => setN((n) => n + 1)}>rerender</button>
          <AwaitingApproval pollInterval={1000} onCheck={() => (calls.push(Date.now()), false)} />
        </>
      );
    };
    render(<Host />);
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });
      fireEvent.click(screen.getByText("rerender"));
    }
    // 1600 ms elapsed with re-renders every 400 ms: a restarting interval would never have fired.
    expect(calls.length).toBe(1);
  });
});

describe("DocsHeader search", () => {
  it("follows a result's href through renderLink instead of assigning the location", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((e: React.MouseEvent) => e.preventDefault());
    render(
      <DocsHeader
        sticky={false}
        searchItems={[{ value: "install", label: "Installation", href: "/docs/install" }]}
        renderLink={({ href, className, children }) => (
          <a href={href} className={className} data-router onClick={onClick}>
            {children}
          </a>
        )}
      />
    );
    await user.click(document.querySelector('[data-slot="search-trigger"]') as HTMLElement);
    await user.click(await screen.findByRole("option", { name: /Installation/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("onSearchSelect keeps priority and follows no link", async () => {
    const user = userEvent.setup();
    const onSearchSelect = vi.fn();
    const onClick = vi.fn((e: React.MouseEvent) => e.preventDefault());
    render(
      <DocsHeader
        sticky={false}
        onSearchSelect={onSearchSelect}
        searchItems={[{ value: "install", label: "Installation", href: "/docs/install" }]}
        renderLink={({ href, children }) => (
          <a href={href} onClick={onClick}>
            {children}
          </a>
        )}
      />
    );
    await user.click(document.querySelector('[data-slot="search-trigger"]') as HTMLElement);
    await user.click(await screen.findByRole("option", { name: /Installation/ }));
    expect(onSearchSelect).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("the theme button toggles the .dark class on <html> through useTheme", async () => {
    const user = userEvent.setup();
    document.documentElement.classList.remove("dark");
    render(<DocsHeader sticky={false} />);
    await user.click(screen.getByRole("button", { name: "Switch to dark mode" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    await user.click(screen.getByRole("button", { name: "Switch to light mode" }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("primitives", () => {
  it("SearchInput: aria-keyshortcuts follows the platform after mount; Input takes clearLabel", () => {
    vi.spyOn(window.navigator, "platform", "get").mockReturnValue("MacIntel");
    render(<SearchInput aria-label="s" hotkey="mod+k" />);
    expect(screen.getByLabelText("s")).toHaveAttribute("aria-keyshortcuts", "Meta+k");
    render(<Input aria-label="name" clearable defaultValue="x" clearLabel="Réinitialiser" />);
    expect(screen.getByRole("button", { name: "Réinitialiser" })).toBeInTheDocument();
  });

  it("Rating: tapping the selected star clears it and drops the hover preview", () => {
    const onValueChange = vi.fn();
    render(<Rating defaultValue={3} onValueChange={onValueChange} aria-label="rate" />);
    const star = screen.getAllByRole("radio")[2]!;
    fireEvent.mouseMove(star);
    fireEvent.click(star);
    expect(onValueChange).toHaveBeenLastCalledWith(0);
    expect(screen.getAllByRole("radio").every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
    expect(document.querySelectorAll('[data-filled="true"], .opacity-90').length).toBe(0);
  });

  it("NumberInput: unmounting mid-hold removes the window listeners", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<NumberInput aria-label="n" defaultValue={1} />);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Increase" }), { button: 0 });
    const added = add.mock.calls.filter(([t]) => t === "pointerup" || t === "pointercancel" || t === "blur");
    expect(added.length).toBe(3);
    unmount();
    for (const [type, fn] of added) expect(remove).toHaveBeenCalledWith(type, fn);
  });

  it("Pagination dots: caps the number of dots and keeps the current page in the window", () => {
    const { rerender } = render(<Pagination variant="dots" totalPages={50} defaultPage={1} />);
    const dots = () => screen.getAllByRole("button", { name: /^Page \d+$/ });
    expect(dots().length).toBe(9);
    rerender(<Pagination variant="dots" totalPages={50} page={30} onPageChange={() => {}} />);
    expect(dots().length).toBe(9);
    expect(screen.getByRole("button", { name: "Page 30" })).toHaveAttribute("aria-current", "page");
    rerender(<Pagination variant="dots" totalPages={5} page={2} onPageChange={() => {}} />);
    expect(dots().length).toBe(5);
  });

  it("Pagination page-size select uses the input control tokens", () => {
    render(<Pagination totalPages={5} pageSize={10} pageSizeOptions={[10, 20]} onPageSizeChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveClass("border-input", "rounded-control");
  });

  it("FloatingActionButton: tabbing out of the open dial closes it", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FloatingActionButton label="Create" strategy="static" actions={[{ label: "Edit", icon: <svg /> }]} />
        <button>after</button>
      </>
    );
    const trigger = screen.getByRole("button", { name: "Create" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    act(() => screen.getByRole("button", { name: "after" }).focus());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("dropzone keeps exporting the folder helpers from lib/file-system", () => {
    expect(getDroppedFiles).toBe(fileSystem.getDroppedFiles);
  });
});
