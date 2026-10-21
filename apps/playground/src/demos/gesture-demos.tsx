import * as React from "react";
import {
  AnimatedList,
  Avatar,
  Button,
  InlineCode,
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
  SlideToConfirm,
  SwipeRow,
  Toaster,
  UndoAction,
  toast,
  type SwipeAction,
} from "@cleanprompt/sutra-ui";
import { RiArchiveLine, RiCheckLine, RiDeleteBinLine, RiTimeLine } from "@cleanprompt/sutra-ui/icons";
import { Demo, DemoLabel } from "../components/demo";

/* ------------------------------------------------------------------ */
/* SwipeRow                                                            */
/* ------------------------------------------------------------------ */

interface Task {
  id: number;
  title: string;
  note: string;
}
const tasks: Task[] = [
  { id: 1, title: "Pay rent", note: "Due Friday" },
  { id: 2, title: "Book dentist", note: "Call before noon" },
  { id: 3, title: "Renew passport", note: "Photos needed" },
  { id: 4, title: "Water the plants", note: "Every third day" },
];

const doneAction: SwipeAction[] = [{ id: "done", label: "Done", tone: "success", icon: <RiCheckLine /> }];
const moreActions: SwipeAction[] = [
  { id: "snooze", label: "Snooze", tone: "warning", icon: <RiTimeLine /> },
  { id: "delete", label: "Delete", tone: "destructive", icon: <RiDeleteBinLine /> },
];

function TaskRow({ task, ...rest }: { task: Task } & Partial<React.ComponentProps<typeof SwipeRow>>) {
  return (
    <SwipeRow contentClassName="bg-card" {...rest}>
      <Item>
        <ItemMedia variant="avatar">
          <Avatar name={task.title} size="sm" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{task.title}</ItemTitle>
          <ItemDescription>{task.note}</ItemDescription>
        </ItemContent>
      </Item>
    </SwipeRow>
  );
}

function TaskList({ commit = true, className }: { commit?: boolean; className?: string }) {
  const [items, setItems] = React.useState(tasks);
  const [log, setLog] = React.useState("Drag a row, or Tab to a button.");
  return (
    <div className={className}>
      <div className="overflow-hidden rounded-box border border-border bg-card">
        <AnimatedList
          items={items}
          getKey={(t) => t.id}
          renderItem={(task) => (
            <div className="border-b border-border last:border-b-0">
              <TaskRow
                task={task}
                startActions={doneAction}
                endActions={moreActions}
                commit={commit}
                actionsLabel={`Actions for ${task.title}`}
                onAction={(action) => {
                  setLog(`${action.label}: ${task.title}`);
                  if (action.id !== "snooze") setItems((list) => list.filter((t) => t.id !== task.id));
                }}
              />
            </div>
          )}
        />
        {items.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">All done</p>}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p aria-live="polite" className="min-w-0 truncate text-xs text-muted-foreground">
          {log}
        </p>
        <Button size="xs" variant="ghost" onClick={() => setItems(tasks)}>
          Reset
        </Button>
      </div>
    </div>
  );
}

/** Demo block for `SwipeRow` (Mobile page). */
export function SwipeRowDemo() {
  const [open, setOpen] = React.useState<"start" | "end" | null>(null);
  return (
    <Demo
      id="swipe-row"
      title="Swipe row"
      description="A list row that follows the finger and reveals real buttons at its start or end. Past 40% of the buttons' width it opens, a full swipe (half the row, or a hard flick) runs the outermost action, and it springs back otherwise."
      align="start"
    >
      <div className="grid w-full grid-cols-1 gap-6 @container lg:grid-cols-2">
        <div className="space-y-2">
          <DemoLabel>Default: drag right for Done, left for Snooze and Delete (a full swipe deletes)</DemoLabel>
          <TaskList />
        </div>
        <div className="space-y-2">
          <DemoLabel>
            <InlineCode>commit={"{false}"}</InlineCode> only reveals; narrow container
          </DemoLabel>
          <TaskList commit={false} className="w-64 max-w-full" />
        </div>
        <div className="space-y-2 lg:col-span-2">
          <DemoLabel>
            Controlled with <InlineCode>value</InlineCode>: {open ?? "closed"}
          </DemoLabel>
          <div className="flex max-w-md flex-col gap-2">
            <div className="overflow-hidden rounded-box border border-border">
              <TaskRow task={tasks[0]!} startActions={doneAction} endActions={moreActions} value={open} onValueChange={setOpen} />
            </div>
            <div className="flex gap-2">
              <Button size="xs" variant="secondary" onClick={() => setOpen("start")}>
                Open start
              </Button>
              <Button size="xs" variant="secondary" onClick={() => setOpen("end")}>
                Open end
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setOpen(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground lg:col-span-2">
          Keyboard: Tab reaches the buttons and a focused button opens its side; Arrow keys on the row open and close it, Escape closes. Reduced
          motion: the row still follows the finger, the release is instant. Mouse drags work too.
        </p>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* SlideToConfirm                                                      */
/* ------------------------------------------------------------------ */

function PayDemo() {
  const [paid, setPaid] = React.useState(false);
  return (
    <div className="space-y-2">
      <SlideToConfirm
        label="Slide to pay $48.00"
        confirmedLabel="Paid"
        confirmed={paid}
        onConfirmedChange={setPaid}
        onConfirm={() => new Promise((resolve) => setTimeout(resolve, 1200))}
      />
      <div className="flex items-center justify-between gap-2">
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {paid ? "Payment sent" : "Not paid"}
        </p>
        <Button size="xs" variant="ghost" disabled={!paid} onClick={() => setPaid(false)}>
          Reset
        </Button>
      </div>
    </div>
  );
}

/** Demo block for `SlideToConfirm` (Buttons page). */
export function SlideToConfirmDemo() {
  return (
    <Demo
      id="slide-to-confirm"
      title="Slide to confirm"
      description="Confirm an irreversible action by sliding the thumb to the end. A slider for assistive tech (arrow keys step, End, Enter or Space confirm), a spring snap-back below 90%, and a promise-aware busy state."
      align="start"
    >
      <div className="grid w-full grid-cols-1 gap-6 @container md:grid-cols-2">
        <div className="space-y-2">
          <DemoLabel>Default (the action takes 1.2 s, then stays confirmed)</DemoLabel>
          <PayDemo />
        </div>
        <div className="space-y-2">
          <DemoLabel>Destructive tone, large</DemoLabel>
          <SlideToConfirm size="lg" tone="destructive" label="Slide to delete account" confirmedLabel="Deleted" />
        </div>
        <div className="space-y-2">
          <DemoLabel>Small, success tone</DemoLabel>
          <SlideToConfirm size="sm" tone="success" label="Slide to send" confirmedLabel="Sent" step={20} />
        </div>
        <div className="space-y-2">
          <DemoLabel>Loading and disabled</DemoLabel>
          <div className="space-y-2">
            <SlideToConfirm loading label="Slide to pay" />
            <SlideToConfirm disabled label="Slide to pay (disabled)" />
          </div>
        </div>
        <div className="space-y-2">
          <DemoLabel>Narrow container</DemoLabel>
          <SlideToConfirm className="w-52 max-w-full" label="Slide to confirm" />
        </div>
        <p className="text-xs text-muted-foreground">
          Keyboard: focus the thumb, Arrow keys move it in steps of <InlineCode>step</InlineCode> percent, Home resets, End, Enter and Space confirm.
          Reduced motion: the thumb follows the finger, the snap-back is instant.
        </p>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* UndoAction                                                          */
/* ------------------------------------------------------------------ */

function ToastPairing() {
  const [armed, setArmed] = React.useState(false);
  const [gone, setGone] = React.useState(false);
  return (
    <div className="space-y-2">
      <Toaster />
      {gone ? (
        <p className="text-sm text-muted-foreground">
          Project deleted.{" "}
          <Button size="xs" variant="link" onClick={() => setGone(false)}>
            Restore demo
          </Button>
        </p>
      ) : (
        <UndoAction
          label="Delete project"
          committedLabel="Deleted"
          icon={<RiDeleteBinLine />}
          seconds={6}
          armed={armed}
          onArmedChange={setArmed}
          onArm={() =>
            toast("Project deleted", {
              description: "It will be gone for good in 6 seconds.",
              duration: 6000,
              action: { label: "Undo", onClick: () => setArmed(false) },
            })
          }
          onCommit={() => {
            toast.dismiss();
            setGone(true);
          }}
        />
      )}
    </div>
  );
}

/** Demo block for `UndoAction` (Buttons page). */
export function UndoActionDemo() {
  const [log, setLog] = React.useState("Nothing deleted yet.");
  return (
    <Demo
      id="undo-action"
      title="Undo action"
      description="A destructive button that turns into a counted Undo for N seconds and only then commits. The deadline is the wall clock; the ring and the number follow it, the focus stays on the button, and a live region announces each step."
      align="start"
    >
      <div className="grid w-full grid-cols-1 gap-6 @container md:grid-cols-2">
        <div className="space-y-2">
          <DemoLabel>Default (8 seconds)</DemoLabel>
          <UndoAction
            onArm={() => setLog("Deleting in 8 s…")}
            onUndo={() => setLog("Undone. Nothing was deleted.")}
            onCommit={() => setLog("Deleted for good.")}
          />
          <p aria-live="off" className="text-xs text-muted-foreground">
            {log}
          </p>
        </div>
        <div className="space-y-2">
          <DemoLabel>Paired with a Toast (controlled armed; the toast's Undo cancels)</DemoLabel>
          <ToastPairing />
        </div>
        <div className="space-y-2">
          <DemoLabel>
            <InlineCode>pauseOnHover</InlineCode>, 4 seconds, other labels
          </DemoLabel>
          <UndoAction
            seconds={4}
            pauseOnHover
            label="Archive chat"
            undoLabel="Keep it"
            committedLabel="Archived"
            icon={<RiArchiveLine />}
            variant="secondary"
            armedVariant="outline"
            onCommit={() => {}}
          />
        </div>
        <div className="space-y-2">
          <DemoLabel>Small, in a narrow container</DemoLabel>
          <div className="w-40 max-w-full">
            <UndoAction size="sm" seconds={5} className="w-full" onCommit={() => {}} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground md:col-span-2">
          Keyboard: Enter or Space presses Delete, then the same focused button says Undo and Enter or Space undoes. The countdown keeps running
          under reduced motion (the ring just steps).
        </p>
      </div>
    </Demo>
  );
}
