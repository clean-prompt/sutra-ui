import * as React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProcessTable, type ProcessInfo, type ProcessTableGroup } from "../src/kits/ops/process-table";
import {
  buildProcessTree,
  defaultProcessGroupKey,
  groupProcesses,
  processGroupSortValue,
  sortProcessGroups,
  sortProcessList,
} from "../src/lib/process-groups";
import { axeViolations } from "./a11y";

const GB = 1024 ** 3;
const MB = 1024 ** 2;

const procs: ProcessInfo[] = [
  { pid: 100, name: "Google Chrome", app: "Google Chrome", icon: <svg data-testid="chrome-icon" />, cpu: 10, memory: 2 * GB, user: "me", startedAt: 5000 },
  { pid: 101, name: "Google Chrome Helper (Renderer)", app: "Google Chrome", cpu: 30, memory: 1 * GB, user: "me", startedAt: 6000 },
  { pid: 102, name: "Google Chrome Helper (GPU)", app: "Google Chrome", cpu: 5, memory: 512 * MB, user: "me", startedAt: 7000 },
  { pid: 200, name: "Code", app: "Visual Studio Code", cpu: 50, memory: 1 * GB, user: "me" },
  { pid: 201, name: "Code Helper", app: "Visual Studio Code", cpu: 2, memory: 256 * MB, user: "root" },
  { pid: 300, name: "kernel_task", cpu: 1, memory: 64 * MB, user: "root" },
];

describe("process-groups helpers", () => {
  it("groups by app with sums, counts, icon and the name fallback", () => {
    const { groups, ungrouped } = groupProcesses(procs);
    expect(ungrouped).toEqual([]);
    expect(groups.map((g) => [g.key, g.count])).toEqual([
      ["Google Chrome", 3],
      ["Visual Studio Code", 2],
      ["kernel_task", 1],
    ]);
    const chrome = groups[0]!;
    expect(chrome.cpu).toBe(45);
    expect(chrome.memory).toBe(3.5 * GB);
    expect(chrome.name).toBe("Google Chrome");
    expect(chrome.icon).toBeTruthy();
    expect(groups[1]!.icon).toBeUndefined();
    expect(defaultProcessGroupKey({ pid: 1, name: "x", app: "  " })).toBe("x");
    expect(defaultProcessGroupKey({ pid: 1, name: "x", app: "Y" })).toBe("Y");
  });

  it("leaves processes ungrouped when the key is undefined and treats missing numbers as 0", () => {
    const { groups, ungrouped } = groupProcesses(
      [...procs, { pid: 400, name: "nulls", app: "Google Chrome", cpu: null, memory: undefined }],
      { key: (p) => p.app, name: (key, list) => `${key} (${list.length})` }
    );
    expect(ungrouped.map((p) => p.pid)).toEqual([300]);
    expect(groups[0]!.name).toBe("Google Chrome (4)");
    expect(groups[0]!.cpu).toBe(45);
    expect(groups[0]!.count).toBe(4);
  });

  it("sorts groups and their children by the table's sort keys", () => {
    const { groups } = groupProcesses(procs);
    const byCpu = sortProcessGroups(groups, { key: "cpu", direction: "desc" });
    expect(byCpu.map((g) => g.key)).toEqual(["Visual Studio Code", "Google Chrome", "kernel_task"]);
    expect(byCpu[1]!.processes.map((p) => p.pid)).toEqual([101, 100, 102]);
    const byName = sortProcessGroups(groups, { key: "name", direction: "asc" });
    expect(byName.map((g) => g.key)).toEqual(["Google Chrome", "kernel_task", "Visual Studio Code"]);
    expect(processGroupSortValue(groups[0]!, "pid")).toBe(100);
    expect(processGroupSortValue(groups[0]!, "started")).toBe(5000);
    expect(processGroupSortValue(groups[0]!, "user")).toBe("me");
    expect(processGroupSortValue(groups[1]!, "user")).toBe("");
    expect(sortProcessList(procs, null)).toBe(procs);
  });

  it("builds a tree that sorts groups and ungrouped processes together", () => {
    const tree = buildProcessTree(procs, { key: (p) => p.app, sort: { key: "memory", direction: "desc" } });
    expect(tree.map((i) => i.key)).toEqual(["g:Google Chrome", "g:Visual Studio Code", "p:300"]);
    const asc = buildProcessTree(procs, { key: (p) => p.app, sort: { key: "cpu", direction: "asc" } });
    expect(asc.map((i) => i.key)).toEqual(["p:300", "g:Google Chrome", "g:Visual Studio Code"]);
  });
});

const groupRows = (container: HTMLElement) =>
  [...container.querySelectorAll("tbody tr[data-group-row]")].map((r) => r.getAttribute("data-group-key"));
const childPids = (container: HTMLElement, key: string) =>
  [...container.querySelectorAll(`tbody tr[data-pid][data-group="${CSS.escape(key)}"]`)].map((r) => Number(r.getAttribute("data-pid")));

describe("ProcessTable groupBy", () => {
  it("renders app group rows with aggregated values and counts", async () => {
    const { container } = render(<ProcessTable processes={procs} groupBy="app" columns={["name", "cpu", "memory", "started"]} now={10_000} />);
    expect(groupRows(container)).toEqual(["Visual Studio Code", "Google Chrome", "kernel_task"]);
    const chrome = container.querySelector('tr[data-group-key="Google Chrome"]') as HTMLElement;
    expect(chrome).toHaveTextContent("3 processes");
    expect(chrome).toHaveTextContent("45.0%");
    expect(chrome).toHaveTextContent("3.5 GB");
    expect(chrome).toHaveTextContent("5s ago");
    expect(within(chrome).getByTestId("chrome-icon")).toBeInTheDocument();
    expect(container.querySelector('tr[data-group-key="kernel_task"]')).toHaveTextContent("1 process");
    expect(screen.getByRole("button", { name: "Google Chrome, 3 processes" })).toHaveAttribute("aria-expanded", "false");
    expect(container.querySelectorAll("tbody tr[data-pid]")).toHaveLength(0);
    expect(container.querySelector("tfoot tr[data-totals]")).toHaveTextContent("6 processes");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("expands and collapses groups (uncontrolled), with keyboard arrows and labelled child rows", async () => {
    const onExpandedGroupsChange = vi.fn();
    const { container } = render(<ProcessTable processes={procs} groupBy="app" onExpandedGroupsChange={onExpandedGroupsChange} />);
    const toggle = screen.getByRole("button", { name: "Google Chrome, 3 processes" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(onExpandedGroupsChange).toHaveBeenLastCalledWith(["Google Chrome"]);
    expect(childPids(container, "Google Chrome")).toEqual([101, 100, 102]);
    const controls = toggle.getAttribute("aria-controls")!.split(" ");
    expect(controls.map((id) => document.getElementById(id)?.getAttribute("data-pid"))).toEqual(["101", "100", "102"]);
    // Child rows name their app for screen readers; the group's own process doesn't repeat it.
    const helper = container.querySelector('tr[data-pid="101"]') as HTMLElement;
    expect(within(helper).getByText("(Google Chrome)")).toHaveClass("sr-only");
    expect(within(container.querySelector('tr[data-pid="100"]') as HTMLElement).queryByText("(Google Chrome)")).toBeNull();
    expect(container.querySelector('tbody[data-group="Google Chrome"] th[scope="rowgroup"]')).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);

    fireEvent.keyDown(toggle, { key: "ArrowLeft" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).not.toHaveAttribute("aria-controls");
    fireEvent.keyDown(toggle, { key: "ArrowRight" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(childPids(container, "Google Chrome")).toEqual([]);
    expect(onExpandedGroupsChange).toHaveBeenLastCalledWith([]);
  });

  it("supports controlled expandedGroups", () => {
    const onExpandedGroupsChange = vi.fn();
    const { container, rerender } = render(
      <ProcessTable processes={procs} groupBy="app" expandedGroups={["Visual Studio Code"]} onExpandedGroupsChange={onExpandedGroupsChange} />
    );
    expect(childPids(container, "Visual Studio Code")).toEqual([200, 201]);
    fireEvent.click(screen.getByRole("button", { name: "Google Chrome, 3 processes" }));
    expect(onExpandedGroupsChange).toHaveBeenLastCalledWith(["Visual Studio Code", "Google Chrome"]);
    expect(childPids(container, "Google Chrome")).toEqual([]);
    rerender(<ProcessTable processes={procs} groupBy="app" expandedGroups={["Google Chrome"]} onExpandedGroupsChange={onExpandedGroupsChange} />);
    expect(childPids(container, "Google Chrome")).toEqual([101, 100, 102]);
    expect(childPids(container, "Visual Studio Code")).toEqual([]);
  });

  it("sorts groups and the children within each group", () => {
    const { container } = render(
      <ProcessTable processes={procs} groupBy="app" defaultExpandedGroups={["Google Chrome"]} columns={["pid", "name", "cpu", "memory"]} />
    );
    expect(groupRows(container)).toEqual(["Visual Studio Code", "Google Chrome", "kernel_task"]);
    fireEvent.click(screen.getByRole("button", { name: "RAM" }));
    expect(groupRows(container)).toEqual(["Google Chrome", "Visual Studio Code", "kernel_task"]);
    expect(childPids(container, "Google Chrome")).toEqual([100, 101, 102]);
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(groupRows(container)).toEqual(["Google Chrome", "kernel_task", "Visual Studio Code"]);
    expect(childPids(container, "Google Chrome")).toEqual([100, 102, 101]);
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(groupRows(container)).toEqual(["Visual Studio Code", "kernel_task", "Google Chrome"]);
    expect(childPids(container, "Google Chrome")).toEqual([101, 102, 100]);
  });

  it("renders ungrouped processes as plain rows when a custom key returns undefined", () => {
    const { container } = render(<ProcessTable processes={procs} groupBy={(p) => p.app} />);
    expect(groupRows(container)).toEqual(["Visual Studio Code", "Google Chrome"]);
    const plain = container.querySelector('tr[data-pid="300"]') as HTMLElement;
    expect(plain).not.toHaveAttribute("data-group");
  });

  it("quits a group after confirming, with the process count", async () => {
    const onQuitGroup = vi.fn();
    const { container } = render(<ProcessTable processes={procs} groupBy="app" onQuitGroup={onQuitGroup} />);
    fireEvent.click(screen.getByRole("button", { name: "Quit Google Chrome…" }));
    let dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Quit Google Chrome?")).toBeInTheDocument();
    expect(within(dialog).getByText("3 processes will close.")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onQuitGroup).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Quit Google Chrome…" }));
    dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Quit" }));
    await waitFor(() => expect(onQuitGroup).toHaveBeenCalledTimes(1));
    const [group, options] = onQuitGroup.mock.calls[0] as [ProcessTableGroup, { force: boolean }];
    expect(group.key).toBe("Google Chrome");
    expect(group.count).toBe(3);
    expect(options).toEqual({ force: false });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(await axeViolations(container)).toEqual([]);
  });

  it("force quits with an unsaved-work warning and supports canQuitGroup", async () => {
    let resolve!: () => void;
    const onQuitGroup = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<ProcessTable processes={procs} groupBy="app" onQuitGroup={onQuitGroup} canQuitGroup={(g) => g.key !== "kernel_task"} />);
    expect(screen.queryByRole("button", { name: "Quit kernel_task…" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Force Quit Visual Studio Code…" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Force quit Visual Studio Code?")).toBeInTheDocument();
    expect(within(dialog).getByText("2 processes will close. Unsaved work may be lost.")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Force Quit" }));
    expect(onQuitGroup).toHaveBeenCalledWith(expect.objectContaining({ key: "Visual Studio Code", count: 2 }), { force: true });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    resolve();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("keeps the per-process kill flow on child rows", () => {
    const onKill = vi.fn();
    render(<ProcessTable processes={procs} groupBy="app" defaultExpandedGroups={["Google Chrome"]} onKill={onKill} />);
    fireEvent.click(screen.getByRole("button", { name: "Force kill Google Chrome Helper (GPU) (102) (SIGKILL)" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onKill).toHaveBeenCalledWith(procs[2], "SIGKILL");
    // No onQuitGroup: group rows have no quit actions.
    expect(screen.queryByRole("button", { name: /^Quit / })).toBeNull();
  });

  it("animates a removed child row and a removed group out", async () => {
    const { container, rerender } = render(
      <ProcessTable processes={procs} groupBy="app" defaultExpandedGroups={["Google Chrome"]} exitDuration={30} />
    );
    rerender(<ProcessTable processes={procs.filter((p) => p.pid !== 102 && p.app !== "Visual Studio Code")} groupBy="app" exitDuration={30} />);
    await waitFor(() => expect(container.querySelector('tr[data-pid="102"]')).toHaveAttribute("data-state", "exit"));
    expect(container.querySelector('tr[data-group-key="Visual Studio Code"]')).toHaveAttribute("data-state", "exit");
    await waitFor(() => expect(container.querySelector('tr[data-pid="102"]')).not.toBeInTheDocument());
    await waitFor(() => expect(container.querySelector('tr[data-group-key="Visual Studio Code"]')).not.toBeInTheDocument());
    expect(container.querySelector('tr[data-group-key="Google Chrome"]')).toHaveTextContent("2 processes");
  });

  it("shows the empty state and leaves the flat table unchanged without groupBy", () => {
    const { container, rerender } = render(<ProcessTable processes={[]} groupBy="app" />);
    expect(screen.getByText("No processes")).toBeInTheDocument();
    rerender(<ProcessTable processes={procs} />);
    expect(container.querySelectorAll("tbody tr[data-group-row]")).toHaveLength(0);
    expect([...container.querySelectorAll("tbody tr[data-pid]")].map((r) => Number(r.getAttribute("data-pid")))).toEqual([
      200, 101, 100, 102, 201, 300,
    ]);
    expect(screen.getByRole("button", { name: "Command" })).toBeInTheDocument();
    expect(container.querySelectorAll("tbody")).toHaveLength(1);
  });
});
