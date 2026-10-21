/** Sweep: the kits-ai formatter presets keep their outputs after moving onto lib. */
import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModelTable } from "../src/kits/ops/model-row";
import { ChainOfThought } from "../src/kits/ai/chain-of-thought";
import { formatAgentRunTime } from "../src/kits/agent/agent-processes";
import { formatAgentElapsed } from "../src/kits/agent/agent-tasks";
import { formatAttachmentSize } from "../src/kits/ai/chat-attachment";

const MIN = 60_000;
const HR = 60 * MIN;
const DAY = 24 * HR;

describe("kits-ai formatter presets keep their outputs", () => {
  // Outputs recorded from the hand-rolled versions before they became presets over lib/duration.
  it.each([
    [0, "0s"],
    [0.6, "1s"],
    [59.5, "60s"],
    [89.4, "89s"],
    [89.6, "90s"],
    [90, "2m"],
    [3599, "60m"],
    [5399, "90m"],
    [5400, "1.5h"],
    [7200, "2.0h"],
    [86_400, "24.0h"],
    [100_000, "27.8h"],
  ])("ModelTable idle %ss → %s", (idleSeconds, text) => {
    render(<ModelTable models={[{ name: "m-1", state: "ready", idleSeconds }]} />);
    expect(screen.getByText(`idle ${text}`)).toBeInTheDocument();
  });

  it.each([
    [0.99, "a moment"],
    [1.4, "1s"],
    [59.6, "1m"],
    [75, "1m 15s"],
    [3600, "60m"],
    [3725, "62m 5s"],
  ])("ChainOfThought duration %s → Thought for %s", (duration, text) => {
    render(<ChainOfThought duration={duration} />);
    expect(screen.getByRole("button", { name: new RegExp(`Thought for ${text}`) })).toBeInTheDocument();
  });

  it.each([
    [Number.NaN, "—"],
    [-5000, "<1 min"],
    [0, "<1 min"],
    [59_999, "<1 min"],
    [MIN, "1 min"],
    [59 * MIN + 59_000, "59 min"],
    [HR, "1 hr"],
    [HR + 5 * MIN, "1 hr 5 min"],
    [DAY - 1, "23 hr 59 min"],
    [DAY, "1 d"],
    [DAY + 2 * HR + 30 * MIN, "1 d 2 hr"],
    [40 * DAY + 59 * MIN, "40 d"],
  ])("formatAgentRunTime(%s) → %s", (ms, text) => {
    expect(formatAgentRunTime(ms)).toBe(text);
  });

  it("deprecated wrappers still return the lib preset outputs", () => {
    expect([8_900, 65_000, 2 * HR + 3 * MIN + 59_000, Number.NaN].map(formatAgentElapsed)).toEqual(["8s", "1m 05s", "2h 03m", "0s"]);
    expect([512, 1536, 15 * 1024 * 1024, -1, Number.NaN].map(formatAttachmentSize)).toEqual(["512 B", "1.5 KB", "15 MB", "", ""]);
  });
});
