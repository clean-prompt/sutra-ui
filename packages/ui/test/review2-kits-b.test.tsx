import * as React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DevServerList, type DevServerProject } from "../src/kits/system/dev-servers";
import { ContainerList, type ContainerInfo } from "../src/kits/system/containers";
import { IncomingCall } from "../src/kits/social/call-overlay";
import { AccessGate, type AccessGateAdapter, type AccessGateRecord } from "../src/kits/identity/kunji";
import { AwaitingApproval } from "../src/blocks/kunji-blocks";
import { axeViolations } from "./helpers/a11y";

const MIN = 60_000;
const HOUR = 60 * MIN;

/* ------------------------------------------------------------------ */
/* Relative captions tick without a `now` prop                         */
/* ------------------------------------------------------------------ */

describe("relative captions tick", () => {
  afterEach(() => vi.useRealTimers());

  it("DevServerList refreshes 'idle 2 hours' on the live clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T12:00:00Z"));
    const projects: DevServerProject[] = [
      { id: "web", name: "web", memoryBytes: 1e8, state: "running", idleSince: Date.now() - 2 * HOUR },
    ];
    render(<DevServerList projects={projects} />);
    expect(screen.getByText("idle 2 hours")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(HOUR);
    });
    expect(screen.getByText("idle 3 hours")).toBeInTheDocument();
  });

  it("DevServerList keeps a fixed caption when `now` is passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T12:00:00Z"));
    const now = Date.now();
    const projects: DevServerProject[] = [{ id: "web", name: "web", memoryBytes: 1e8, state: "running", idleSince: now - 2 * HOUR }];
    render(<DevServerList projects={projects} now={now} />);
    act(() => {
      vi.advanceTimersByTime(HOUR);
    });
    expect(screen.getByText("idle 2 hours")).toBeInTheDocument();
  });

  it("ContainerList refreshes 'Up 5 hours' on the live clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T12:00:00Z"));
    const containers: ContainerInfo[] = [
      { id: "pg", name: "postgres", state: "running", startedAt: Date.now() - 5 * HOUR, cpu: 1, memoryBytes: 1e8 },
    ];
    render(<ContainerList containers={containers} />);
    expect(screen.getByText("Up 5 hours")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(HOUR);
    });
    expect(screen.getByText("Up 6 hours")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* IncomingCall overlay is a real modal                                */
/* ------------------------------------------------------------------ */

describe("IncomingCall overlay", () => {
  function Harness({ onDecline }: { onDecline: () => void }) {
    const [ringing, setRinging] = React.useState(false);
    return (
      <main>
        <button type="button" onClick={() => setRinging(true)}>
          Ring
        </button>
        <button type="button">Elsewhere</button>
        {ringing ? (
          <IncomingCall
            variant="overlay"
            name="Bo Chen"
            ringFor={0}
            onAccept={() => setRinging(false)}
            onDecline={() => {
              onDecline();
              setRinging(false);
            }}
          />
        ) : null}
      </main>
    );
  }

  it("focuses Accept, traps focus, hides the page, declines on Escape and returns focus", async () => {
    const onDecline = vi.fn();
    render(<Harness onDecline={onDecline} />);
    const ring = screen.getByRole("button", { name: "Ring" });
    ring.focus();
    fireEvent.click(ring);

    const dialog = await screen.findByRole("alertdialog", { name: "Bo Chen" });
    expect(dialog).toHaveAccessibleDescription("Incoming audio call");
    const accept = screen.getByRole("button", { name: "Accept" });
    await waitFor(() => expect(accept).toHaveFocus());

    // The page behind is hidden from assistive tech and focus can't leave the dialog.
    expect(screen.queryByRole("button", { name: "Elsewhere" })).toBeNull();
    const elsewhere = screen.getByText("Elsewhere");
    act(() => elsewhere.focus());
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(await axeViolations(document.body)).toEqual([]);

    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(onDecline).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(ring).toHaveFocus());
  });

  it("the inline card is a non-modal dialog that doesn't steal focus", async () => {
    const onDecline = vi.fn();
    const { container } = render(
      <>
        <button type="button">Before</button>
        <IncomingCall name="Ana" ringFor={0} onDecline={onDecline} />
      </>
    );
    const before = screen.getByRole("button", { name: "Before" });
    before.focus();
    const card = screen.getByRole("dialog", { name: "Ana" });
    expect(card).not.toHaveAttribute("aria-modal");
    expect(before).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("button", { name: "Accept" }), { key: "Escape" });
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Polling skips ticks while a request is in flight                    */
/* ------------------------------------------------------------------ */

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe("AccessGate polling", () => {
  afterEach(() => vi.useRealTimers());

  it("doesn't pile up slow checks and aborts the one in flight on unmount", async () => {
    vi.useFakeTimers();
    const pending: { resolve: (r: AccessGateRecord) => void; signal?: AbortSignal }[] = [];
    const check = vi.fn((signal?: AbortSignal) => {
      const d = deferred<AccessGateRecord>();
      pending.push({ resolve: d.resolve, signal });
      return d.promise;
    });
    const adapter: AccessGateAdapter = { request: async () => ({ status: "pending" }), check };
    const { unmount } = render(<AccessGate adapter={adapter} defaultRecord={{ status: "pending" }} pollInterval={100} />);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    const afterFirst = check.mock.calls.length;
    expect(afterFirst).toBeGreaterThanOrEqual(1);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(check.mock.calls.length).toBe(afterFirst);

    // Once it settles (still pending), the next tick checks again.
    await act(async () => {
      pending.at(-1)!.resolve({ status: "pending" });
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(check.mock.calls.length).toBe(afterFirst + 1);

    const last = pending.at(-1)!;
    expect(last.signal?.aborted).toBe(false);
    unmount();
    expect(last.signal?.aborted).toBe(true);
  });
});

describe("AwaitingApproval polling", () => {
  afterEach(() => vi.useRealTimers());

  it("skips background ticks while a check is in flight", async () => {
    vi.useFakeTimers();
    const pending: ((ok: boolean) => void)[] = [];
    const onCheck = vi.fn(() => {
      const d = deferred<boolean>();
      pending.push(d.resolve);
      return d.promise;
    });
    render(<AwaitingApproval onCheck={onCheck} pollInterval={100} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    const afterFirst = onCheck.mock.calls.length;
    expect(afterFirst).toBeGreaterThanOrEqual(1);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onCheck.mock.calls.length).toBe(afterFirst);

    await act(async () => {
      pending.at(-1)!(false);
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onCheck.mock.calls.length).toBe(afterFirst + 1);
  });
});
