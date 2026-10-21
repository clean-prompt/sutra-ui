import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TransliterationCandidates, TransliterationToggle } from "../src/kits/voice/translate-transliteration";

describe("TransliterationToggle keeps its own press when the consumer passes onClick", () => {
  it("calls the consumer's onClick and still toggles", async () => {
    const onClick = vi.fn();
    const onPressedChange = vi.fn();
    render(<TransliterationToggle onClick={onClick} onPressedChange={onPressedChange} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onPressedChange).toHaveBeenCalledWith(true);
  });

  it("lets the consumer veto the toggle with preventDefault", async () => {
    const onPressedChange = vi.fn();
    render(<TransliterationToggle onClick={(e) => e.preventDefault()} onPressedChange={onPressedChange} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onPressedChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });
});

describe("TransliterationCandidates keeps the field focused when the consumer passes onMouseDown", () => {
  it("runs the consumer's handler and still prevents the default focus change", async () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    const onMouseDown = vi.fn();
    render(
      <TransliterationCandidates anchorRef={{ current: input }} lang="hi" getCandidates={() => ["नमस्ते"]} onMouseDown={onMouseDown} />
    );
    await act(async () => {
      input.value = "namaste";
      input.setSelectionRange(7, 7);
      fireEvent.input(input);
    });
    const list = await screen.findByRole("listbox", {}, { timeout: 2000 }).then((l) => l.parentElement!);
    const notPrevented = fireEvent.mouseDown(list);
    expect(onMouseDown).toHaveBeenCalledTimes(1);
    expect(notPrevented).toBe(false);
    input.remove();
  });
});
