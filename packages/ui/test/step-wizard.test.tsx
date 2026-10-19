/**
 * StepWizard: navigation, direction-aware entrance classes, validation (sync and async), completion, Enter to advance,
 * focus moving to the new step, keepMounted, the measured height, reduced motion, controlled use, axe.
 */
import * as React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StepWizard, type StepWizardStep } from "../src/patterns/step-wizard";
import { axeViolations } from "./a11y";

const original = window.matchMedia;
afterEach(() => {
  window.matchMedia = original;
});

const steps: StepWizardStep[] = [
  { id: "account", title: "Account", content: <input aria-label="Name" defaultValue="" /> },
  { id: "plan", title: "Plan", content: <p>Pick a plan</p> },
  { id: "done", title: "Review", content: <textarea aria-label="Notes" /> },
];
const panel = () => document.querySelector<HTMLElement>("[data-slot=step-wizard-panel][data-state=current]")!;
const next = () => screen.getByRole("button", { name: /^(Next|Finish)$/ });
const back = () => screen.getByRole("button", { name: "Back" });

describe("StepWizard", () => {
  it("shows the first step, a progress bar and Steps, and Back is disabled", () => {
    const { container } = render(<StepWizard steps={steps} />);
    expect(panel()).toHaveAttribute("aria-label", "Step 1 of 3");
    expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
    expect(container.querySelector("[data-slot=step-wizard-steps] ol")).not.toBeNull();
    expect(container.querySelector("[data-slot=step-wizard-progress]")).toHaveTextContent("Step 1 of 3Account");
    expect(back()).toBeDisabled();
    expect(container.querySelector("[data-direction]")).toBeNull(); // nothing animates on mount
    expect(panel().className).not.toContain("slide-in");
  });

  it("Next and Back move between steps, report them, and slide in the direction of travel", () => {
    const onValueChange = vi.fn();
    const { container } = render(<StepWizard steps={steps} onValueChange={onValueChange} />);
    fireEvent.click(next());
    expect(screen.getByText("Pick a plan")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Name" })).toBeNull(); // only the current step is rendered
    expect(onValueChange).toHaveBeenLastCalledWith("plan", { index: 1, direction: "forward" });
    expect(container.firstElementChild).toHaveAttribute("data-direction", "forward");
    expect(panel().className).toContain("slide-in-from-end-6");
    fireEvent.click(back());
    expect(onValueChange).toHaveBeenLastCalledWith("account", { index: 0, direction: "back" });
    expect(container.firstElementChild).toHaveAttribute("data-direction", "back");
    expect(panel().className).toContain("slide-in-from-start-6");
  });

  it("the last step says Finish and calls onComplete; a pending promise shows loading", async () => {
    let finish!: () => void;
    const onComplete = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    render(<StepWizard steps={steps} defaultValue="done" onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(document.querySelector("[data-slot=step-wizard]")).toHaveAttribute("aria-busy", "true"));
    expect(back()).toBeDisabled();
    await act(async () => finish());
    expect(document.querySelector("[data-slot=step-wizard]")).not.toHaveAttribute("aria-busy");
  });

  it("canAdvance can keep the user on the step (sync), and onBlocked says which", async () => {
    const onBlocked = vi.fn();
    const canAdvance = vi.fn((step: StepWizardStep) => step.id !== "account");
    render(<StepWizard steps={steps} canAdvance={canAdvance} onBlocked={onBlocked} />);
    fireEvent.click(next());
    await waitFor(() => expect(onBlocked).toHaveBeenCalledWith(steps[0], 0));
    expect(panel()).toHaveAttribute("aria-label", "Step 1 of 3");
  });

  it("canAdvance may be async: the buttons wait, then it moves on; going back is never checked", async () => {
    let resolve!: (ok: boolean) => void;
    const canAdvance = vi.fn(() => new Promise<boolean>((r) => (resolve = r)));
    render(<StepWizard steps={steps} canAdvance={canAdvance} />);
    const button = next();
    fireEvent.click(button);
    await waitFor(() => expect(document.querySelector("[data-slot=step-wizard]")).toHaveAttribute("aria-busy", "true"));
    fireEvent.click(button); // ignored while checking
    expect(canAdvance).toHaveBeenCalledTimes(1);
    await act(async () => resolve(true));
    expect(panel()).toHaveAttribute("aria-label", "Step 2 of 3");
    canAdvance.mockClear();
    fireEvent.click(back());
    expect(canAdvance).not.toHaveBeenCalled();
    expect(panel()).toHaveAttribute("aria-label", "Step 1 of 3");
  });

  it("a blocked Finish does not complete", async () => {
    const onComplete = vi.fn();
    const onBlocked = vi.fn();
    render(<StepWizard steps={steps} defaultValue="done" canAdvance={() => false} onBlocked={onBlocked} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(onBlocked).toHaveBeenCalled());
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("a rejected check or completion goes to onError and leaves the step", async () => {
    const onError = vi.fn();
    const { unmount } = render(<StepWizard steps={steps} canAdvance={() => Promise.reject(new Error("offline"))} onError={onError} />);
    fireEvent.click(next());
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "offline" })));
    expect(panel()).toHaveAttribute("aria-label", "Step 1 of 3");
    await waitFor(() => expect(document.querySelector("[data-slot=step-wizard]")).not.toHaveAttribute("aria-busy"));
    unmount();
    const onComplete = vi.fn(() => Promise.reject(new Error("full")));
    render(<StepWizard steps={steps} defaultValue="done" onComplete={onComplete} onError={onError} />);
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "full" })));
  });

  it("Enter in a text field presses Next; not in a textarea", async () => {
    const user = userEvent.setup();
    render(<StepWizard steps={steps} />);
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Ada{Enter}");
    expect(panel()).toHaveAttribute("aria-label", "Step 2 of 3");
    fireEvent.click(next());
    await user.type(screen.getByRole("textbox", { name: "Notes" }), "line{Enter}two");
    expect(panel()).toHaveAttribute("aria-label", "Step 3 of 3");
  });

  it("moves focus to the new step's panel, but not at mount", () => {
    render(<StepWizard steps={steps} />);
    expect(document.body).toHaveFocus();
    fireEvent.click(next());
    expect(panel()).toHaveFocus();
  });

  it("keepMounted keeps typed values while a step is hidden", async () => {
    const user = userEvent.setup();
    render(<StepWizard steps={steps} keepMounted />);
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Ada");
    fireEvent.click(next());
    expect(screen.queryByRole("textbox", { name: "Name" })).toBeNull(); // hidden from the accessibility tree
    fireEvent.click(back());
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Ada");
  });

  it("Steps lets you go back to a finished step, but not ahead", () => {
    render(<StepWizard steps={steps} defaultValue="done" indicator="steps" />);
    fireEvent.click(screen.getByRole("button", { name: /Account/ }));
    expect(panel()).toHaveAttribute("aria-label", "Step 1 of 3");
    expect(screen.queryByRole("button", { name: /Review/ })).toBeNull();
  });

  it("controlled: the parent owns the step", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<StepWizard steps={steps} value="account" onValueChange={onValueChange} />);
    fireEvent.click(next());
    expect(onValueChange).toHaveBeenCalledWith("plan", { index: 1, direction: "forward" });
    expect(panel()).toHaveAttribute("aria-label", "Step 1 of 3");
    rerender(<StepWizard steps={steps} value="plan" onValueChange={onValueChange} />);
    expect(screen.getByText("Pick a plan")).toBeInTheDocument();
  });

  it("indicator and footer options", () => {
    const { container, rerender } = render(<StepWizard steps={steps} indicator="bar" />);
    expect(container.querySelector("[data-slot=step-wizard-steps]")).toBeNull();
    rerender(<StepWizard steps={steps} indicator="none" footer={false} />);
    expect(container.querySelector("[data-slot=step-wizard-progress]")).toBeNull();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    rerender(<StepWizard steps={steps} labels={{ next: "Weiter", back: "Zurück", step: (n, c) => `Schritt ${n} von ${c}` }} />);
    expect(screen.getByRole("button", { name: "Weiter" })).toBeInTheDocument();
    expect(panel()).toHaveAttribute("aria-label", "Schritt 1 von 3");
  });

  it("the viewport takes the measured height of the step, plus the 4 px padding each side", () => {
    const rect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (this: Element) {
      return { ...rect.call(this), height: this.classList.contains("flow-root") ? 120 : 0 } as DOMRect;
    };
    try {
      const { container } = render(<StepWizard steps={steps} />);
      expect(container.querySelector("[data-slot=step-wizard-viewport]")).toHaveStyle({ height: "128px" });
    } finally {
      Element.prototype.getBoundingClientRect = rect;
    }
  });

  it("reduced motion: no slide class on a step change", () => {
    window.matchMedia = ((query: string) => ({ ...original(query), matches: query.includes("reduce") })) as typeof window.matchMedia;
    render(<StepWizard steps={steps} />);
    fireEvent.click(next());
    expect(panel().className).not.toContain("slide-in");
  });

  it("spreads props and forwards the ref; no axe violations", async () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(<StepWizard ref={ref} steps={steps} data-testid="w" className="max-w-lg" />);
    expect(ref.current).toBe(screen.getByTestId("w"));
    expect(await axeViolations(container)).toEqual([]);
  });
});
