import * as React from "react";
import { AnimatedList, Badge, Button, InlineCode, ReorderableList, Text } from "@sutra/ui";
import { RiAddLine, RiCloseLine, RiShuffleLine, RiSortAsc } from "@sutra/ui/icons";
import { Demo, DemoLabel } from "../components/demo";

interface Task {
  id: number;
  title: string;
  tag: string;
}
const SEED: Task[] = [
  { id: 1, title: "Review the Q3 plan", tag: "work" },
  { id: 2, title: "Book the offsite", tag: "team" },
  { id: 3, title: "Reply to Maya", tag: "mail" },
  { id: 4, title: "Water the plants", tag: "home" },
  { id: 5, title: "Draft the release notes", tag: "work" },
];

/** Deterministic shuffle (a fixed rotation), so the demo and the audit behave the same every time. */
const rotate = <T,>(list: T[]) => (list.length > 1 ? [...list.slice(2), ...list.slice(0, 2)] : list);

function SortableTasks({ narrow }: { narrow?: boolean }) {
  const next = React.useRef(SEED.length + 1);
  const [tasks, setTasks] = React.useState(SEED);
  return (
    <div className={narrow ? "w-64 max-w-full space-y-3" : "space-y-3"}>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" leadingIcon={<RiSortAsc />} onClick={() => setTasks((t) => [...t].sort((a, b) => a.title.localeCompare(b.title)))}>
          Sort A to Z
        </Button>
        <Button size="sm" variant="outline" leadingIcon={<RiShuffleLine />} onClick={() => setTasks(rotate)}>
          Shuffle
        </Button>
        <Button size="sm" leadingIcon={<RiAddLine />} onClick={() => setTasks((t) => [{ id: next.current, title: `New task ${next.current++}`, tag: "new" }, ...t])}>
          Add on top
        </Button>
      </div>
      <div className="min-h-24 rounded-box border border-border bg-card px-3">
        <AnimatedList
          aria-label="Sortable tasks"
          items={tasks}
          getKey={(t) => t.id}
          flip
          collapse={false}
          renderItem={(t) => (
            <div className="flex items-center gap-2 border-b border-border py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm" title={t.title}>
                {t.title}
              </span>
              <Badge className="shrink-0">{t.tag}</Badge>
              <Button size="icon-xs" variant="ghost" aria-label={`Remove ${t.title}`} onClick={() => setTasks((all) => all.filter((x) => x.id !== t.id))}>
                <RiCloseLine />
              </Button>
            </div>
          )}
        />
        {tasks.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nothing to do</p> : null}
      </div>
    </div>
  );
}

function DragTasks({ flip }: { flip?: boolean }) {
  const [tasks, setTasks] = React.useState(SEED.slice(0, 4));
  return (
    <ReorderableList
      label={flip === false ? "Tasks without the glide" : "Tasks"}
      items={tasks}
      getKey={(t) => String(t.id)}
      getLabel={(t) => t.title}
      onReorder={setTasks}
      moveButtons
      flip={flip}
      renderItem={(t) => (
        <span className="block truncate px-1 py-1.5 text-sm" title={t.title}>
          {t.title}
        </span>
      )}
    />
  );
}

/** useFlip: rows glide to their new place; the AnimatedList option and the ReorderableList default. */
export function FlipListDemo() {
  return (
    <Demo
      id="flip-list"
      title="Flip List"
      description={
        <>
          <InlineCode>useFlip</InlineCode> measures the rows, and after the order changes plays each one from its old place on the spring tokens (WAAPI{" "}
          <InlineCode>translate</InlineCode>, at most 40 rows, an unfinished glide continues from where it is). <InlineCode>AnimatedList flip</InlineCode> slides
          siblings on insert, remove and sort; <InlineCode>ReorderableList</InlineCode> glides on drag, keys and buttons, and a dropped row settles from where
          it was let go. Reduced motion: rows jump to the new order. Keyboard: Space on a handle lifts, arrows move, Space drops, Escape cancels.
        </>
      }
      align="start"
      canvasClassName="@container"
    >
      <div className="grid grid-cols-1 gap-6 @2xl:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <DemoLabel>AnimatedList with flip (sort, shuffle, add, remove)</DemoLabel>
          <SortableTasks />
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>ReorderableList (drag, arrow keys, buttons)</DemoLabel>
          <DragTasks />
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Narrow container</DemoLabel>
          <SortableTasks narrow />
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>
            <InlineCode>flip={"{false}"}</InlineCode>: the previous behaviour
          </DemoLabel>
          <DragTasks flip={false} />
          <Text size="sm" tone="neutral">
            Same list, rows change place at once.
          </Text>
        </div>
      </div>
    </Demo>
  );
}
