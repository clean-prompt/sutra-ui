/** FeedbackDialog: rating, category and message with a thank-you state. */
import * as React from "react";
import { RiHeartLine } from "@remixicon/react";
import { Button } from "../primitives/button";
import { Textarea } from "../primitives/textarea";
import { Field, FieldLabel, FieldGroup } from "../primitives/field";
import { SegmentedControl } from "../primitives/segmented-control";
import { Rating } from "../primitives/rating";
import { CheckboxField } from "../primitives/checkbox";
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
import { FeaturedIcon } from "../assets/icons";
import { useBlockAction } from "./block-utils";
import { type BlockDialogBaseProps, useDialogOpen } from "./modal-dialog-blocks-internal";

/* ------------------------------------------------------------------ */
/* FeedbackDialog                                                      */
/* ------------------------------------------------------------------ */

export interface FeedbackValues {
  rating: number;
  category: string;
  message: string;
  contact: boolean;
}

export interface FeedbackDialogProps extends BlockDialogBaseProps {
  /**
   * Dialog heading.
   * @default "Share your feedback"
   */
  title?: React.ReactNode;
  /** Feedback categories offered in the select; each has a `value` and a `label`. */
  categories?: { value: string; label: string }[];
  /** Called with the rating, category, message and contact choice when the form is submitted. A returned promise shows a spinner; throw to show the error message. */
  onSubmit?: (values: FeedbackValues) => unknown;
}

const ratingLabels = ["", "Terrible", "Bad", "Okay", "Good", "Amazing"];

/** Collect a star rating, a category and a written message; shows a thank-you state. */
export function FeedbackDialog({
  title = "Share your feedback",
  categories = [
    { value: "idea", label: "Idea" },
    { value: "bug", label: "Bug" },
    { value: "praise", label: "Praise" },
    { value: "other", label: "Other" },
  ],
  onSubmit,
  trigger,
  className,
  ...openProps
}: FeedbackDialogProps) {
  const [open, setOpen] = useDialogOpen(openProps);
  const [rating, setRating] = React.useState(0);
  const [category, setCategory] = React.useState(categories[0]?.value ?? "");
  const [message, setMessage] = React.useState("");
  const [contact, setContact] = React.useState(true);
  const [sent, setSent] = React.useState(false);
  const ratingLabelId = React.useId();
  const action = useBlockAction();

  const { reset: resetAction } = action;
  React.useEffect(() => {
    if (open) return;
    // A submit still pending at close must not land later and show "Thanks" the next time the dialog opens.
    resetAction();
    const t = setTimeout(() => {
      setSent(false);
      setRating(0);
      setMessage("");
    }, 200);
    return () => clearTimeout(t);
  }, [open, resetAction]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating && !message.trim()) return;
    const ok = await action.run(onSubmit ? () => onSubmit({ rating, category, message: message.trim(), contact }) : undefined);
    if (ok) setSent(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent size="md" className={className}>
        {sent ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <FeaturedIcon icon={RiHeartLine} color="success" variant="outline-ring" size="lg" className="mb-2" />
            <DialogTitle>Thanks for the feedback!</DialogTitle>
            <DialogDescription className="max-w-sm">
              Every note is read by the Sutra team. We&apos;ll be in touch if we need more details.
            </DialogDescription>
            <DialogClose asChild>
              <Button className="mt-4 min-w-32">Close</Button>
            </DialogClose>
          </div>
        ) : (
          <form onSubmit={submit} className="contents">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>Help us make Sutra better. What&apos;s on your mind?</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 rounded-box border border-border bg-subtle py-5">
                  <span className="text-sm font-medium text-foreground" id={ratingLabelId}>
                    How would you rate your experience?
                  </span>
                  <Rating value={rating} onValueChange={setRating} size="lg" aria-labelledby={ratingLabelId} />
                  <span className="h-4 text-xs font-medium text-muted-foreground" aria-live="polite">
                    {ratingLabels[Math.round(rating)]}
                  </span>
                </div>
                <Field>
                  <FieldLabel>Category</FieldLabel>
                  <SegmentedControl aria-label="Category" fullWidth value={category} onValueChange={(v) => v && setCategory(v)} options={categories} />
                </Field>
                <Field>
                  <FieldLabel>Message</FieldLabel>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={category === "bug" ? "What happened, and what did you expect?" : "Tell us more…"}
                    autoResize
                    minRows={4}
                    maxRows={10}
                    maxLength={1000}
                    showCount
                  />
                </Field>
                <CheckboxField
                  label="The Sutra team may contact me about this feedback"
                  checked={contact}
                  onCheckedChange={(v) => setContact(v === true)}
                  labelClassName="font-normal text-muted-foreground"
                />
                {action.error ? <InlineAlert variant="destructive">{action.error}</InlineAlert> : null}
              </FieldGroup>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" loading={action.busy} disabled={!rating && !message.trim()}>
                Send feedback
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
FeedbackDialog.displayName = "FeedbackDialog";
