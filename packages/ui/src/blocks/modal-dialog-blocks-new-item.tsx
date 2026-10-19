/** NewItemDialog: quick create form for a task or note. */
import * as React from "react";
import { RiCheckboxCircleLine, RiStickyNoteLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { Input } from "../primitives/input";
import { Textarea } from "../primitives/textarea";
import { TagInput } from "../primitives/tag-input";
import { Field, FieldLabel, FieldGroup, FieldError } from "../primitives/field";
import { SimpleSelect, type SelectOption } from "../primitives/select";
import { SegmentedControl } from "../primitives/segmented-control";
import { DatePicker } from "../primitives/date-picker";
import { SwitchField } from "../primitives/switch";
import { InlineAlert } from "../primitives/inline-alert";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../primitives/dialog";
import { SutraAppIcon } from "../assets/brand";
import { useBlockAction as useAsyncAction } from "./block-utils";
import { type BlockDialogBaseProps, useDialogOpen } from "./modal-dialog-blocks-internal";

/* ------------------------------------------------------------------ */
/* NewItemDialog                                                       */
/* ------------------------------------------------------------------ */

export interface NewItemValues {
  type: "task" | "note";
  title: string;
  description: string;
  due?: Date;
  priority: string;
  labels: string[];
}

export interface NewItemDialogProps extends BlockDialogBaseProps {
  /**
   * Item type selected when the dialog opens.
   * @default "task"
   */
  defaultType?: "task" | "note";
  /** Suggested labels shown as quick-pick chips. */
  labelSuggestions?: string[];
  /** Called with the new item's values when the form is submitted. A returned promise shows a spinner; throw to show the error message. */
  onCreate?: (values: NewItemValues) => unknown;
}

const priorityDot = (cls: string) => <span aria-hidden className={cn("size-2 rounded-full", cls)} />;

const priorities: SelectOption[] = [
  { value: "urgent", label: "Urgent", icon: priorityDot("bg-destructive") },
  { value: "high", label: "High", icon: priorityDot("bg-warning") },
  { value: "medium", label: "Medium", icon: priorityDot("bg-info") },
  { value: "low", label: "Low", icon: priorityDot("bg-muted-foreground") },
];

/** Quick create form for a task or note: title, description, due date, priority and labels. */
export function NewItemDialog({
  defaultType = "task",
  labelSuggestions = ["Design", "Engineering", "Marketing", "Personal", "Health", "Finance", "Reading"],
  onCreate,
  trigger,
  className,
  ...openProps
}: NewItemDialogProps) {
  const [open, setOpen] = useDialogOpen(openProps);
  const empty = React.useCallback(
    (type: "task" | "note"): NewItemValues => ({ type, title: "", description: "", due: undefined, priority: "medium", labels: [] }),
    []
  );
  const [values, setValues] = React.useState<NewItemValues>(() => empty(defaultType));
  const [createMore, setCreateMore] = React.useState(false);
  const [titleError, setTitleError] = React.useState(false);
  const action = useAsyncAction();
  const titleRef = React.useRef<HTMLInputElement>(null);
  const set = <K extends keyof NewItemValues>(key: K, v: NewItemValues[K]) => setValues((s) => ({ ...s, [key]: v }));
  const isTask = values.type === "task";

  React.useEffect(() => {
    if (!open) {
      setValues(empty(defaultType));
      setTitleError(false);
    }
  }, [open, defaultType, empty]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!values.title.trim()) {
      setTitleError(true);
      titleRef.current?.focus();
      return;
    }
    const ok = await action.run(onCreate ? () => onCreate({ ...values, title: values.title.trim() }) : undefined);
    if (!ok) return;
    if (createMore) {
      setValues((v) => ({ ...empty(v.type), labels: v.labels, priority: v.priority }));
      titleRef.current?.focus();
    } else {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent size="md" className={className}>
        <form
          onSubmit={submit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit(e);
          }}
          className="contents"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <SutraAppIcon app={isTask ? "tasks" : "notes"} size={24} />
              {isTask ? "New task" : "New note"}
            </DialogTitle>
            <DialogDescription className="sr-only">Create a new {values.type}.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <FieldGroup>
              <SegmentedControl
                aria-label="Item type"
                value={values.type}
                onValueChange={(v) => v && set("type", v as "task" | "note")}
                options={[
                  { value: "task", label: "Task", icon: <RiCheckboxCircleLine aria-hidden /> },
                  { value: "note", label: "Note", icon: <RiStickyNoteLine aria-hidden /> },
                ]}
              />
              <Field invalid={titleError}>
                <FieldLabel required>Title</FieldLabel>
                <Input
                  ref={titleRef}
                  value={values.title}
                  onChange={(e) => {
                    set("title", e.target.value);
                    if (e.target.value.trim()) setTitleError(false);
                  }}
                  placeholder={isTask ? "e.g. Draft launch announcement" : "e.g. Weekly review"}
                  size="lg"
                  autoFocus
                />
                <FieldError>{titleError ? "Give it a title." : null}</FieldError>
              </Field>
              <Field>
                <FieldLabel hint="(optional)">Description</FieldLabel>
                <Textarea
                  value={values.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Add details, links or context…"
                  autoResize
                  minRows={3}
                  maxRows={8}
                />
              </Field>
              {isTask && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Due date</FieldLabel>
                    <DatePicker value={values.due} onValueChange={(d) => set("due", d)} placeholder="No due date" clearable />
                  </Field>
                  <Field>
                    <FieldLabel>Priority</FieldLabel>
                    <SimpleSelect options={priorities} value={values.priority} onValueChange={(v) => set("priority", v)} />
                  </Field>
                </div>
              )}
              <Field>
                <FieldLabel>Labels</FieldLabel>
                <TagInput
                  value={values.labels}
                  onValueChange={(v) => set("labels", v)}
                  suggestions={labelSuggestions}
                  placeholder="Add labels…"
                  max={5}
                />
              </Field>
              {action.error ? <InlineAlert variant="destructive">{action.error}</InlineAlert> : null}
            </FieldGroup>
          </DialogBody>
          <DialogFooter bordered className="sm:justify-between">
            <SwitchField label="Create more" size="sm" checked={createMore} onCheckedChange={setCreateMore} labelClassName="font-normal text-muted-foreground" />
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" loading={action.busy} trailingIcon={<span className="hidden items-center gap-0.5 opacity-70 sm:inline-flex" aria-hidden>⌘↵</span>}>
                Create {values.type}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
NewItemDialog.displayName = "NewItemDialog";
