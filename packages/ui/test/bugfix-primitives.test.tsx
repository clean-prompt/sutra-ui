/** Bug-fix regressions in the primitives (Dropzone, Button, TextLink, FAB, Field, NumberInput, TabDropdown and others). */
import * as React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { isFileAccepted, validateFiles } from "../src/primitives/dropzone";
import { Button } from "../src/primitives/button";
import { TextLink } from "../src/primitives/text-link";
import { TextButton } from "../src/patterns/text-button";
import { FloatingActionButton } from "../src/primitives/fab";
import { Field, FieldDescription, FieldError, FieldHint, FieldLabel } from "../src/primitives/field";
import { Input, SearchInput } from "../src/primitives/input";
import { NumberInput } from "../src/primitives/number-input";
import { TabDropdown } from "../src/primitives/tab-dropdown";
import { AvatarGroup } from "../src/primitives/avatar-group";
import { Avatar } from "../src/primitives/avatar";
import { domainOf } from "../src/primitives/favicon";
import { getFileExtension } from "../src/assets/file-format";
import { useCopy } from "../src/hooks/use-copy";
import { useControllableState } from "../src/hooks/use-controllable-state";
import { toRRule, describeRecurrence } from "../src/lib/rrule";
import { initials } from "../src/lib/text";
import { dateToZonedWallTime, zonedWallTimeToDate } from "../src/lib/cron";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const file = (name: string, type: string) => new File(["x"], name, { type });

describe("Dropzone accept matching", () => {
  it("treats * and */* as wildcards", () => {
    expect(isFileAccepted(file("a.bin", "application/octet-stream"), "*/*")).toBe(true);
    expect(isFileAccepted(file("a.bin", "application/octet-stream"), "*")).toBe(true);
    expect(validateFiles([file("a.txt", "text/plain")], { accept: "*/*" }).accepted).toHaveLength(1);
  });

  it("accepts a file with an empty MIME type by its extension for a wildcard type", () => {
    expect(isFileAccepted(file("photo.heic", ""), "image/*")).toBe(true);
    expect(isFileAccepted(file("photo.jpg", ""), "image/*")).toBe(true);
    expect(isFileAccepted(file("notes.pdf", ""), "image/*")).toBe(false);
  });
});

describe("Button asChild", () => {
  it("keeps disabled, loading and icons", async () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button asChild disabled leadingIcon={<svg data-testid="lead" />} trailingIcon={<svg data-testid="trail" />}>
        <a href="/x" onClick={onClick}>
          Go
        </a>
      </Button>
    );
    const link = screen.getByRole("link", { name: "Go" });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toContainElement(screen.getByTestId("lead"));
    expect(link).toContainElement(screen.getByTestId("trail"));
    fireEvent.click(link);
    expect(onClick).not.toHaveBeenCalled();

    rerender(
      <Button asChild loading>
        <a href="/x">Go</a>
      </Button>
    );
    const busy = screen.getByRole("link", { name: /Go/ });
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(busy).toHaveAttribute("aria-disabled", "true");
    expect(busy.querySelector("[role=status], svg, span")).not.toBeNull();
  });

  it("an enabled asChild button stays clickable and unchanged", () => {
    const onClick = vi.fn();
    render(
      <Button asChild>
        <a href="#x" onClick={onClick}>
          Go
        </a>
      </Button>
    );
    const link = screen.getByRole("link", { name: "Go" });
    expect(link).not.toHaveAttribute("aria-disabled");
    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("TextLink disabled in link mode", () => {
  it("does not navigate or fire onClick", () => {
    const onClick = vi.fn();
    render(
      <TextLink href="/x" disabled onClick={onClick}>
        Docs
      </TextLink>
    );
    const link = screen.getByText("Docs").closest("a")!;
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).not.toHaveAttribute("href");
    fireEvent.click(link);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("TextButton with href (identity-mark finding, fixed in TextLink)", () => {
  it("honours disabled", () => {
    const onClick = vi.fn();
    render(
      <TextButton href="/x" disabled onClick={onClick}>
        Manage
      </TextButton>
    );
    const link = screen.getByText("Manage").closest("a")!;
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).not.toHaveAttribute("href");
    fireEvent.click(link);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("FloatingActionButton speed dial", () => {
  it("a disabled href action cannot be activated", () => {
    const onClick = vi.fn();
    render(
      <FloatingActionButton
        label="Create"
        strategy="static"
        defaultOpen
        actions={[{ label: "Docs", icon: <svg />, href: "/docs", disabled: true, onClick }]}
      />
    );
    const item = screen.getByRole("menuitem", { name: "Docs" });
    expect(item).not.toHaveAttribute("href");
    fireEvent.click(item);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("arrow keys move between items and skip disabled ones", async () => {
    const user = userEvent.setup();
    render(
      <FloatingActionButton
        label="Create"
        strategy="static"
        defaultOpen
        actions={[
          { label: "One", icon: <svg /> },
          { label: "Two", icon: <svg />, disabled: true },
          { label: "Three", icon: <svg /> },
        ]}
      />
    );
    const one = screen.getByRole("menuitem", { name: "One" });
    act(() => one.focus());
    // Bottom positions fan upwards: ArrowUp moves away from the trigger.
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Three" })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(one).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Three" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(one).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Three" })).toHaveFocus();
  });

  it("ArrowUp on the trigger opens the dial and focuses the nearest item", async () => {
    const user = userEvent.setup();
    render(<FloatingActionButton label="Create" strategy="static" actions={[{ label: "One", icon: <svg /> }]} />);
    const trigger = screen.getByRole("button", { name: "Create" });
    act(() => trigger.focus());
    await user.keyboard("{ArrowUp}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: "One" })).toHaveFocus();
  });
});

describe("Field with custom part ids", () => {
  it("aria-describedby points at the ids actually rendered", () => {
    render(
      <Field>
        <FieldLabel>Name</FieldLabel>
        <Input />
        <FieldDescription id="my-desc">Your full name</FieldDescription>
        <FieldHint id="my-hint">Hint</FieldHint>
        <FieldError id="my-err">Required</FieldError>
      </Field>
    );
    const input = screen.getByRole("textbox", { name: "Name" });
    const ids = input.getAttribute("aria-describedby")!.split(" ");
    expect(ids).toEqual(["my-desc", "my-hint", "my-err"]);
    for (const id of ids) expect(document.getElementById(id)).not.toBeNull();
  });

  it("still uses the generated ids when parts have none", () => {
    render(
      <Field id="f1">
        <FieldLabel>Name</FieldLabel>
        <Input />
        <FieldDescription>Your full name</FieldDescription>
      </Field>
    );
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveAttribute("aria-describedby", "f1-description");
  });
});

describe("NumberInput parsing in other locales", () => {
  const editAndBlur = (locale: string, defaultValue: number, formatOptions?: Intl.NumberFormatOptions) => {
    const onValueChange = vi.fn();
    render(<NumberInput aria-label="n" locale={locale} defaultValue={defaultValue} formatOptions={formatOptions} onValueChange={onValueChange} />);
    const input = screen.getByRole("spinbutton", { name: "n" }) as HTMLInputElement;
    fireEvent.focus(input);
    const shown = input.value;
    // Insert one more native "1" digit before the first digit.
    const one = new Intl.NumberFormat(locale, { useGrouping: false }).format(1);
    const firstDigit = [...shown].findIndex((c) => /\p{Nd}/u.test(c));
    fireEvent.change(input, { target: { value: shown.slice(0, firstDigit) + one + shown.slice(firstDigit) } });
    fireEvent.blur(input);
    return onValueChange;
  };

  it.each([
    ["ar-EG", 1234.5, undefined, 11234.5],
    ["fa-IR", 1234.5, undefined, 11234.5],
    ["bg-BG", 1234.5, { style: "currency", currency: "BGN" } as Intl.NumberFormatOptions, 11234.5],
  ])("%s keeps the value", (locale, value, opts, expected) => {
    const spy = editAndBlur(locale, value, opts);
    expect(spy).toHaveBeenLastCalledWith(expected);
  });

  it("still parses plain en-US input", () => {
    const spy = editAndBlur("en-US", 1234.5);
    expect(spy).toHaveBeenLastCalledWith(11234.5);
  });
});

describe("TabDropdown keyboard", () => {
  it("skips disabled tabs and wraps", async () => {
    const user = userEvent.setup();
    render(
      <TabDropdown
        items={[
          { value: "a", label: "A" },
          { value: "b", label: "B", disabled: true },
          { value: "c", label: "C" },
        ]}
        defaultValue="c"
      />
    );
    const tabs = screen.getAllByRole("tab").filter((t) => !t.closest("[aria-hidden=true]"));
    const [a, , c] = tabs;
    act(() => c!.focus());
    await user.keyboard("{ArrowLeft}");
    expect(a).toHaveFocus();
    act(() => c!.focus());
    await user.keyboard("{ArrowRight}");
    expect(a).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(c).toHaveFocus();
  });
});

describe("AvatarGroup overflow cap", () => {
  it("shows 99+ rather than +99 for more than 99 hidden", () => {
    render(
      <AvatarGroup max={1} total={250}>
        <Avatar name="A B" />
      </AvatarGroup>
    );
    expect(screen.getByRole("img", { name: "249 more" })).toHaveTextContent("99+");
  });
});

describe("useCopy", () => {
  it("leaves no timer behind when the write resolves after unmount", async () => {
    vi.useFakeTimers();
    let resolve!: () => void;
    const writeText = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { result, unmount } = renderHook(() => useCopy(1000));
    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.copy("hi");
    });
    unmount();
    const before = vi.getTimerCount();
    resolve();
    await pending;
    expect(vi.getTimerCount()).toBe(before);
  });

  it("still flips copied while mounted", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { result } = renderHook(() => useCopy(1000));
    await act(async () => {
      await result.current.copy("hi");
    });
    expect(result.current.copied).toBe(true);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.copied).toBe(false);
  });
});

describe("toRRule", () => {
  it("emits UNTIL as a UTC date-time covering the whole last day", () => {
    const rrule = toRRule({ freq: "daily", end: { type: "on", date: new Date(2026, 10, 18) } });
    const m = /UNTIL=(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(rrule);
    expect(m).not.toBeNull();
    const [, y, mo, d, h, mi, s] = m!.map(Number);
    expect(new Date(Date.UTC(y!, mo! - 1, d!, h!, mi!, s!))).toEqual(new Date(2026, 10, 18, 23, 59, 59));
  });

  it("skips UNTIL for an invalid date instead of emitting NaN", () => {
    expect(toRRule({ freq: "daily", end: { type: "on", date: new Date("nope") } })).toBe("FREQ=DAILY");
  });

  it("yearly with a day but no month does not become monthly", () => {
    const rule = { freq: "yearly" as const, monthDay: 5 };
    expect(toRRule(rule)).toBe("FREQ=YEARLY");
    expect(describeRecurrence(rule)).toBe("Every year");
  });
});

describe("zonedWallTimeToDate", () => {
  it("maps a normal wall time in a zone to its instant", () => {
    expect(zonedWallTimeToDate(Date.UTC(2026, 2, 9, 9, 30), "America/New_York").toISOString()).toBe("2026-03-09T13:30:00.000Z");
    expect(zonedWallTimeToDate(Date.UTC(2026, 0, 15, 9, 0), "Asia/Seoul").toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });

  it("resolves a time in the spring-forward gap to the shifted instant, and a repeated time to the first", () => {
    // 02:30 doesn't exist on 2026-03-08 in New York; it becomes 03:30 EDT.
    expect(zonedWallTimeToDate(Date.UTC(2026, 2, 8, 2, 30), "America/New_York").toISOString()).toBe("2026-03-08T07:30:00.000Z");
    // 01:30 happens twice on 2026-11-01; the first (EDT) wins.
    expect(zonedWallTimeToDate(Date.UTC(2026, 10, 1, 1, 30), "America/New_York").toISOString()).toBe("2026-11-01T05:30:00.000Z");
  });

  it("uses the local zone without a timeZone and never throws on bad input", () => {
    expect(zonedWallTimeToDate(Date.UTC(2026, 5, 1, 9, 30))).toEqual(new Date(2026, 5, 1, 9, 30));
    expect(Number.isNaN(zonedWallTimeToDate(NaN, "America/New_York").getTime())).toBe(true);
    expect(Number.isNaN(zonedWallTimeToDate(0, "Not/AZone").getTime())).toBe(true);
  });
});

describe("SearchInput hotkey", () => {
  it("typing the hotkey character inside the field is text", async () => {
    const user = userEvent.setup();
    render(<SearchInput aria-label="s" hotkey="/" />);
    const input = screen.getByRole("searchbox", { name: "s" }) as HTMLInputElement;
    await user.click(input);
    await user.keyboard("src/components");
    expect(input.value).toBe("src/components");
  });

  it("ignores keydown events without a key (autofill)", () => {
    render(<SearchInput aria-label="s" hotkey="/" />);
    const errors: unknown[] = [];
    const onError = (e: ErrorEvent) => {
      errors.push(e.error);
      e.preventDefault();
    };
    window.addEventListener("error", onError);
    window.dispatchEvent(new Event("keydown"));
    window.removeEventListener("error", onError);
    expect(errors).toEqual([]);
  });
});

describe("already fixed (regression guards)", () => {
  it("domainOf handles bare paths and ports", () => {
    expect(domainOf("github.com/org/repo")).toBe("github.com");
    expect(domainOf("localhost:3000")).toBe("localhost");
  });

  it("getFileExtension treats Dockerfile as extensionless", () => {
    expect(getFileExtension("Dockerfile")).toBe("");
  });

  it("initials keep emoji intact", () => {
    expect(initials("😀 Smile")).toBe("😀S");
  });

  it("useControllableState composes functional updates in one tick", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: 0, onChange }));
    act(() => {
      result.current[1]((v) => v + 1);
      result.current[1]((v) => v + 1);
    });
    expect(result.current[0]).toBe(2);
    expect(onChange).toHaveBeenLastCalledWith(2);
  });
});

describe("dateToZonedWallTime", () => {
  it("reads an instant's wall-clock time in a zone and round-trips with zonedWallTimeToDate", () => {
    const instant = new Date("2026-03-09T13:30:00.000Z");
    const wall = dateToZonedWallTime(instant, "America/New_York");
    expect(new Date(wall).toISOString()).toBe("2026-03-09T09:30:00.000Z");
    expect(zonedWallTimeToDate(wall, "America/New_York").getTime()).toBe(instant.getTime());
    expect(new Date(dateToZonedWallTime(instant, "Asia/Seoul")).getUTCHours()).toBe(22);
  });

  it("returns NaN for an invalid date or zone", () => {
    expect(dateToZonedWallTime(new Date(NaN), "UTC")).toBeNaN();
    expect(dateToZonedWallTime(new Date(), "Not/AZone")).toBeNaN();
  });
});
