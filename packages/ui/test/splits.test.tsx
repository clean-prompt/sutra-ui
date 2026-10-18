import * as React from "react";
import { act, render, renderHook, screen } from "@testing-library/react";

import * as primitivesExtra from "../src/kits/ai/primitives-extra";
import { SplitButton } from "../src/primitives/split-button";
import { FanMenu } from "../src/patterns/fan-menu";
import { DecodeText } from "../src/patterns/decode-text";
import { ZoomPan, useZoomPan as useZoomPanFromComponent } from "../src/patterns/zoom-pan";
import { useZoomPan } from "../src/hooks/use-zoom-pan";
import { TabDropdown } from "../src/primitives/tab-dropdown";
import { GlyphSpinner, glyphSpinnerFrames } from "../src/primitives/glyph-spinner";
import { spinnerGlyphFrames } from "../src/primitives/spinner";
import { FadeText } from "../src/patterns/fade-text";
import { ClarifySettled } from "../src/kits/ai/clarify-settled";
import { UndeliveredNotice } from "../src/kits/ai/undelivered-notice";
import { assignRef } from "../src/lib/refs";

import * as cronUi from "../src/patterns/cron";
import * as cronLib from "../src/lib/cron";

import * as kanban from "../src/kits/workspace/kanban";
import { filterBoard, kanbanColumnWip, moveCard, moveColumn, type KanbanBoardModel } from "../src/kits/workspace/kanban-model";
import { KanbanCard, KanbanRunBadge } from "../src/kits/workspace/kanban-card";
import { KanbanBoard } from "../src/kits/workspace/kanban-board";
import { KanbanToolbar } from "../src/kits/workspace/kanban-toolbar";
import { TaskDetailDialog } from "../src/kits/workspace/kanban-task-dialog";
import { OrchestrationPanel } from "../src/kits/workspace/orchestration-panel";

import * as counters from "../src/patterns/counters";
import { Countdown, splitDuration } from "../src/patterns/countdown";
import { Stopwatch, useStopwatch as useStopwatchFromComponent } from "../src/patterns/stopwatch";
import { useStopwatch } from "../src/hooks/use-stopwatch";
import { TallyCounter } from "../src/patterns/tally-counter";

import * as statusCycle from "../src/patterns/status-cycle";
import { RecurrencePicker } from "../src/patterns/recurrence-picker";
import { describeRecurrence, toRRule } from "../src/lib/rrule";

import * as misc from "../src/assets/misc";
import { EmptyStateIllustration } from "../src/assets/empty-state-illustration";
import { BackgroundPattern, GridBeams, NoiseTexture, Spotlight } from "../src/assets/backgrounds";
import { QRCodePlaceholder } from "../src/assets/qr-placeholder";
import { DeviceFrame } from "../src/assets/device-frame";

describe("primitives-extra split", () => {
  it("the barrel re-exports the same bindings as the per-component modules", () => {
    expect(primitivesExtra.SplitButton).toBe(SplitButton);
    expect(primitivesExtra.FanMenu).toBe(FanMenu);
    expect(primitivesExtra.DecodeText).toBe(DecodeText);
    expect(primitivesExtra.ZoomPan).toBe(ZoomPan);
    expect(primitivesExtra.useZoomPan).toBe(useZoomPan);
    expect(useZoomPanFromComponent).toBe(useZoomPan);
    expect(primitivesExtra.TabDropdown).toBe(TabDropdown);
    expect(primitivesExtra.GlyphSpinner).toBe(GlyphSpinner);
    expect(primitivesExtra.glyphSpinnerFrames).toBe(spinnerGlyphFrames);
    expect(glyphSpinnerFrames).toBe(spinnerGlyphFrames);
    expect(primitivesExtra.FadeText).toBe(FadeText);
    expect(primitivesExtra.ClarifySettled).toBe(ClarifySettled);
    expect(primitivesExtra.UndeliveredNotice).toBe(UndeliveredNotice);
  });

  it("useZoomPan zooms in steps and resets", () => {
    const { result } = renderHook(() => useZoomPan({ step: 2, maxScale: 8 }));
    expect(result.current.state.scale).toBe(1);
    act(() => result.current.zoomIn());
    expect(result.current.state.scale).toBe(2);
    act(() => result.current.reset());
    expect(result.current.state.scale).toBe(1);
  });

  it("assignRef writes to callback and object refs", () => {
    const fn = vi.fn();
    assignRef(fn, 1);
    expect(fn).toHaveBeenCalledWith(1);
    const obj = React.createRef<number>();
    assignRef(obj, 2);
    expect(obj.current).toBe(2);
    expect(() => assignRef(undefined, 3)).not.toThrow();
  });

  it("the moved components still render", () => {
    render(<UndeliveredNotice title="Not delivered" onRetry={() => {}} />);
    expect(screen.getByText("Not delivered")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});

describe("cron split", () => {
  it("cron.tsx re-exports the pure lib functions", () => {
    for (const name of [
      "parseCron",
      "describeCron",
      "nextCronRuns",
      "parseInterval",
      "formatInterval",
      "intervalToMs",
      "scheduleToCron",
      "cronToSchedule",
      "describeSchedule",
      "nextScheduleRuns",
      "formatCountdownClock",
      "formatScheduleRelative",
    ] as const) {
      expect(cronUi[name]).toBe(cronLib[name]);
    }
    expect(typeof cronUi.CronScheduleField).toBe("object");
    expect(typeof cronUi.useScheduleNow).toBe("function");
    // Helpers shared with the UI stay out of the component module's public surface.
    expect("parseCronTime" in cronUi).toBe(false);
    expect("cronWeekdayNames" in cronUi).toBe(false);
  });

  it("the lib parses, describes and schedules", () => {
    const parsed = cronLib.parseCron("*/15 9-17 * * 1-5");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.fields.minute).toEqual([0, 15, 30, 45]);
    expect(cronLib.parseCron("99 * * * *").ok).toBe(false);
    expect(cronLib.describeCron("30 8 1 * *", { hour12: false })).toBe("At 08:30 on day 1 of the month");
    expect(cronLib.parseInterval("30m")).toEqual({ every: 30, unit: "m" });
    expect(cronLib.intervalToMs({ every: 2, unit: "h" })).toBe(7_200_000);
    expect(cronLib.cronToSchedule("0 9 * * MON-FRI")).toEqual({ mode: "weekdays", time: "09:00" });
    const runs = cronLib.nextCronRuns("0 * * * *", new Date(2030, 0, 1, 10, 30), 2);
    expect(runs.map((d) => d.getHours())).toEqual([11, 12]);
  });
});

describe("kanban split", () => {
  const board: KanbanBoardModel = {
    columns: [
      { id: "todo", title: "To do" },
      { id: "doing", title: "Doing", wipLimit: 1 },
    ],
    cards: [
      { id: "a", title: "Write spec", columnId: "todo" },
      { id: "b", title: "Ship it", columnId: "todo", priority: "high" },
      { id: "c", title: "Review", columnId: "doing" },
    ],
  };

  it("the barrel re-exports the same bindings as the per-part modules", () => {
    expect(kanban.moveCard).toBe(moveCard);
    expect(kanban.moveColumn).toBe(moveColumn);
    expect(kanban.filterBoard).toBe(filterBoard);
    expect(kanban.kanbanColumnWip).toBe(kanbanColumnWip);
    expect(kanban.KanbanCard).toBe(KanbanCard);
    expect(kanban.KanbanRunBadge).toBe(KanbanRunBadge);
    expect(kanban.KanbanBoard).toBe(KanbanBoard);
    expect(kanban.KanbanToolbar).toBe(KanbanToolbar);
    expect(kanban.TaskDetailDialog).toBe(TaskDetailDialog);
    expect(kanban.OrchestrationPanel).toBe(OrchestrationPanel);
    expect("priorityOrder" in kanban).toBe(false);
    expect("NONE" in kanban).toBe(false);
  });

  it("the pure model moves, filters and counts", () => {
    const res = moveCard(board, { cardId: "a", toColumn: "doing", toIndex: 0 });
    expect(res.moved).toBe(true);
    expect(res.overLimit).toBe(true);
    expect(res.board.cards.filter((c) => c.columnId === "doing").map((c) => c.id)).toEqual(["a", "c"]);
    expect(kanbanColumnWip(res.board, "doing")).toEqual({ count: 2, limit: 1, over: true });
    expect(moveColumn(board, { columnId: "doing", toIndex: 0 }).columns.map((c) => c.id)).toEqual(["doing", "todo"]);
    expect(filterBoard(board, { priorities: ["high"] }).cards.map((c) => c.id)).toEqual(["b"]);
    expect(filterBoard(board, { search: "review" }).cards.map((c) => c.id)).toEqual(["c"]);
  });
});

describe("counters split", () => {
  it("the barrel re-exports the same bindings as the per-component modules", () => {
    expect(counters.Countdown).toBe(Countdown);
    expect(counters.Stopwatch).toBe(Stopwatch);
    expect(counters.TallyCounter).toBe(TallyCounter);
    expect(counters.useStopwatch).toBe(useStopwatch);
    expect(useStopwatchFromComponent).toBe(useStopwatch);
    expect(counters.splitDuration).toBe(splitDuration);
  });

  it("splitDuration rounds up to the second", () => {
    expect(splitDuration(90_061_001)).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 2 });
  });

  it("useStopwatch laps and resets", () => {
    const { result } = renderHook(() => useStopwatch());
    act(() => result.current.lap());
    expect(result.current.laps).toHaveLength(1);
    act(() => result.current.reset());
    expect(result.current.laps).toHaveLength(0);
    expect(result.current.running).toBe(false);
  });
});

describe("status-cycle split", () => {
  it("status-cycle.tsx keeps StatusCycle and re-exports the recurrence picker and RRULE helpers", () => {
    expect(typeof statusCycle.StatusCycle).toBe("object");
    expect(statusCycle.RecurrencePicker).toBe(RecurrencePicker);
    expect(statusCycle.toRRule).toBe(toRRule);
    expect(statusCycle.describeRecurrence).toBe(describeRecurrence);
    expect("sortRecurrenceWeekdays" in statusCycle).toBe(false);
  });

  it("the RRULE lib serialises and describes rules", () => {
    const rule = { freq: "weekly" as const, byWeekday: ["FR" as const, "MO" as const] };
    expect(toRRule(rule)).toBe("FREQ=WEEKLY;BYDAY=MO,FR");
    expect(toRRule({ freq: "daily", end: { type: "after", count: 1 } }, { prefix: true })).toBe("RRULE:FREQ=DAILY;COUNT=1");
    expect(describeRecurrence({ freq: "daily", end: { type: "after", count: 1 } })).toBe("Every day, 1 time");
  });
});

describe("assets/misc split", () => {
  it("the barrel re-exports the same bindings as the per-kind modules", () => {
    expect(misc.EmptyStateIllustration).toBe(EmptyStateIllustration);
    expect(misc.BackgroundPattern).toBe(BackgroundPattern);
    expect(misc.Spotlight).toBe(Spotlight);
    expect(misc.GridBeams).toBe(GridBeams);
    expect(misc.NoiseTexture).toBe(NoiseTexture);
    expect(misc.QRCodePlaceholder).toBe(QRCodePlaceholder);
    expect(misc.DeviceFrame).toBe(DeviceFrame);
  });

  it("the moved assets still render", () => {
    const { container } = render(
      <DeviceFrame variant="browser">
        <QRCodePlaceholder value="seed" />
      </DeviceFrame>
    );
    expect(container.querySelector("svg, [role='img']")).not.toBeNull();
  });
});
