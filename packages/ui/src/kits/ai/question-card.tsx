import * as React from "react";
import { RiArrowDownSLine, RiArrowRightSLine, RiAttachment2, RiCheckLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { RadioGroup, RadioCard } from "../../primitives/radio";
import { CheckboxCard } from "../../primitives/checkbox";
import { Kbd } from "../../primitives/typography";

/* ------------------------------------------------------------------ */
/* QuestionCard                                                        */
/* ------------------------------------------------------------------ */

export interface QuestionOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
}

export interface QuestionAnswer {
  /** Chosen option values (single/multi). */
  values: string[];
  /** Text typed into "Other…" or the free-text answer. */
  text?: string;
  files?: File[];
}

/** One question in a multi-question `QuestionCard`. */
export interface QuestionItem {
  id: string;
  /** Short tab label, e.g. "Database". */
  header: string;
  question: React.ReactNode;
  description?: React.ReactNode;
  options: QuestionOption[];
  /** Allow several options. Default false. */
  multiSelect?: boolean;
  /** Offer an "Other" option with free text. Default true. */
  allowOther?: boolean;
}

/** Answers keyed by `QuestionItem.id`. */
export type QuestionAnswers = Record<string, QuestionAnswer>;

export interface QuestionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSubmit" | "title"> {
  /** Single-question mode: the question. */
  question?: React.ReactNode;
  /** Multi-question mode: tabs per question, review step and "Submit answers". */
  questions?: QuestionItem[];
  /** Multi-question: prior answers render the card locked. */
  answers?: QuestionAnswers | null;
  /** Multi-question: called once with every answer. */
  onSubmitAll?: (answers: QuestionAnswers) => void;
  /** Multi-question header text. Default "N questions from the agent". */
  title?: React.ReactNode;
  submitAllLabel?: string;
  folded?: boolean;
  defaultFolded?: boolean;
  onFoldedChange?: (folded: boolean) => void;
  description?: React.ReactNode;
  type?: "single" | "multi" | "text";
  options?: QuestionOption[];
  /** Adds an "Other…" option with a text field. */
  allowOther?: boolean;
  otherLabel?: string;
  /** Free-text: allow attaching files. */
  allowAttachments?: boolean;
  placeholder?: string;
  confirmLabel?: string;
  /** A prior answer: renders the card locked. */
  answer?: QuestionAnswer | null;
  onAnswer?: (answer: QuestionAnswer) => void;
}

const OTHER = "__other__";

const QuestionCardSingle = React.forwardRef<HTMLDivElement, QuestionCardProps>(
  (
    {
      question,
      questions: _questions,
      answers: _answers,
      onSubmitAll: _onSubmitAll,
      title: _title,
      submitAllLabel: _submitAllLabel,
      folded: _folded,
      defaultFolded: _defaultFolded,
      onFoldedChange: _onFoldedChange,
      description,
      type = "single",
      options = [],
      allowOther = false,
      otherLabel = "Other…",
      allowAttachments = false,
      placeholder = "Type your answer…",
      confirmLabel = "Confirm",
      answer: answerProp,
      onAnswer,
      className,
      ...props
    },
    ref
  ) => {
    const headingId = React.useId();
    const [localAnswer, setLocalAnswer] = React.useState<QuestionAnswer | null>(null);
    const answer = answerProp ?? localAnswer;
    const [single, setSingle] = React.useState("");
    const [multi, setMulti] = React.useState<string[]>([]);
    const [text, setText] = React.useState("");
    const [files, setFiles] = React.useState<File[]>([]);
    const fileRef = React.useRef<HTMLInputElement>(null);

    const submit = (a: QuestionAnswer) => {
      setLocalAnswer(a);
      onAnswer?.(a);
    };

    const otherChosen = type === "single" ? single === OTHER : multi.includes(OTHER);
    const allOptions = allowOther ? [...options, { value: OTHER, label: otherLabel }] : options;

    const labelFor = (v: string) => {
      const o = options.find((x) => x.value === v);
      return o ? o.label : v;
    };

    let body: React.ReactNode;
    if (answer) {
      const parts: React.ReactNode[] = answer.values.filter((v) => v !== OTHER).map((v) => <span key={v}>{labelFor(v)}</span>);
      if (answer.text) parts.push(<span key="__text">{answer.text}</span>);
      body = (
        <div className="flex items-start gap-2 rounded-md bg-subtle px-3 py-2 text-sm" data-slot="question-answer">
          <RiCheckLine aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
          <div className="min-w-0">
            <span className="sr-only">Your answer: </span>
            <span className="font-medium text-foreground">
              {parts.map((p, i) => (
                <React.Fragment key={i}>
                  {i > 0 ? ", " : null}
                  {p}
                </React.Fragment>
              ))}
            </span>
            {answer.files?.length ? (
              <span className="block text-xs text-muted-foreground">
                {answer.files.length} attachment{answer.files.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        </div>
      );
    } else if (type === "text") {
      const canSend = text.trim().length > 0 || files.length > 0;
      body = (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend) submit({ values: [], text: text.trim(), files: files.length ? files : undefined });
          }}
        >
          <textarea
            aria-labelledby={headingId}
            value={text}
            placeholder={placeholder}
            rows={2}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (canSend) submit({ values: [], text: text.trim(), files: files.length ? files : undefined });
              }
            }}
            className={cn(
              "w-full resize-none rounded-[min(var(--radius-control),var(--radius-box))] border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground",
              focusRing
            )}
          />
          {files.length ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Attachments">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`}>
                  <Badge variant="outline" size="md" onRemove={() => setFiles((fs) => fs.filter((_, j) => j !== i))} removeLabel={`Remove ${f.name}`}>
                    {f.name}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            {allowAttachments ? (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  hidden
                  aria-hidden="true"
                  tabIndex={-1}
                  onChange={(e) => {
                    const list = Array.from(e.target.files ?? []);
                    if (list.length) setFiles((fs) => [...fs, ...list]);
                    e.target.value = "";
                  }}
                />
                <Button type="button" size="icon-sm" variant="ghost" aria-label="Attach files" onClick={() => fileRef.current?.click()}>
                  <RiAttachment2 aria-hidden />
                </Button>
              </>
            ) : (
              <span />
            )}
            <Button type="submit" size="sm" disabled={!canSend}>
              Send answer
            </Button>
          </div>
        </form>
      );
    } else {
      const otherField = otherChosen ? (
        <input
          aria-label="Other answer"
          autoFocus
          value={text}
          placeholder="Describe…"
          onChange={(e) => setText(e.target.value)}
          className={cn("h-9 w-full rounded-control border border-input bg-background px-3 text-sm shadow-xs placeholder:text-muted-foreground", focusRing)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (e.key === "Enter" && type === "single" && text.trim()) {
              e.preventDefault();
              submit({ values: [OTHER], text: text.trim() });
            }
          }}
        />
      ) : null;
      if (type === "single") {
        body = (
          <div className="space-y-2">
            <RadioGroup
              aria-labelledby={headingId}
              value={single}
              onValueChange={(v) => {
                setSingle(v);
                if (v !== OTHER) submit({ values: [v] });
              }}
              className="grid gap-2"
            >
              {allOptions.map((o) => (
                <RadioCard key={o.value} value={o.value} label={o.label} description={"description" in o ? o.description : undefined} className="p-3" />
              ))}
            </RadioGroup>
            {otherField}
            {otherChosen ? (
              <div className="flex justify-end">
                <Button size="sm" disabled={!text.trim()} onClick={() => submit({ values: [OTHER], text: text.trim() })}>
                  {confirmLabel}
                </Button>
              </div>
            ) : null}
          </div>
        );
      } else {
        const valid = multi.some((v) => v !== OTHER) || (otherChosen && text.trim().length > 0);
        body = (
          <div className="space-y-2">
            <div role="group" aria-labelledby={headingId} className="grid gap-2">
              {allOptions.map((o) => (
                <CheckboxCard
                  key={o.value}
                  label={o.label}
                  description={"description" in o ? o.description : undefined}
                  checked={multi.includes(o.value)}
                  onCheckedChange={(c) => setMulti((m) => (c === true ? [...m, o.value] : m.filter((x) => x !== o.value)))}
                  className="p-3"
                />
              ))}
            </div>
            {otherField}
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!valid}
                onClick={() => {
                  const values = multi.filter((v) => v !== OTHER);
                  submit({ values: otherChosen && text.trim() ? [...values, OTHER] : values, text: otherChosen && text.trim() ? text.trim() : undefined });
                }}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        );
      }
    }

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={headingId}
        data-answered={answer ? "" : undefined}
        className={cn("space-y-3 rounded-box border border-border bg-card p-4 shadow-xs", answer && "bg-subtle/50", className)}
        {...props}
      >
        <div className="space-y-1">
          <p id={headingId} className="text-sm font-semibold text-foreground">
            {question}
          </p>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {body}
      </div>
    );
  }
);
QuestionCardSingle.displayName = "QuestionCardSingle";

/** A question (or a tabbed set of questions) asked by the model inside the transcript; locks once answered. */
export const QuestionCard = React.forwardRef<HTMLDivElement, QuestionCardProps>((props, ref) =>
  props.questions ? <QuestionCardMulti ref={ref} {...props} questions={props.questions} /> : <QuestionCardSingle ref={ref} {...props} />
);
QuestionCard.displayName = "QuestionCard";

function isAnswered(a: QuestionAnswer | undefined) {
  if (!a) return false;
  return a.values.some((v) => v !== OTHER) || (a.values.includes(OTHER) && !!a.text?.trim());
}

function QuestionAnswerText({ item, answer }: { item: QuestionItem; answer: QuestionAnswer | undefined }) {
  if (!answer || !isAnswered(answer)) return <span className="text-muted-foreground italic">Not answered</span>;
  const parts: React.ReactNode[] = answer.values
    .filter((v) => v !== OTHER)
    .map((v) => item.options.find((o) => o.value === v)?.label ?? v);
  if (answer.values.includes(OTHER) && answer.text) parts.push(answer.text);
  return (
    <>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 ? ", " : null}
          {p}
        </React.Fragment>
      ))}
    </>
  );
}

const QuestionCardMulti = React.forwardRef<HTMLDivElement, QuestionCardProps & { questions: QuestionItem[] }>(
  (
    {
      questions,
      answers: answersProp,
      onSubmitAll,
      title,
      submitAllLabel = "Submit answers",
      folded: foldedProp,
      defaultFolded = false,
      onFoldedChange,
      otherLabel = "Other",
      placeholder = "Type your answer…",
      // single-question props are ignored in multi mode
      question: _q,
      description: _d,
      type: _t,
      options: _o,
      allowOther: _ao,
      allowAttachments: _aa,
      confirmLabel: _cl,
      answer: _a,
      onAnswer: _oa,
      className,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const uid = React.useId();
    const [draft, setDraft] = React.useState<QuestionAnswers>({});
    const [submitted, setSubmitted] = React.useState<QuestionAnswers | null>(null);
    const locked = answersProp ?? submitted;
    const [active, setActive] = React.useState(0);
    const [folded, setFoldedState] = React.useState(defaultFolded);
    const isFolded = foldedProp ?? folded;
    const setFolded = (f: boolean) => {
      setFoldedState(f);
      onFoldedChange?.(f);
    };
    const reviewIndex = questions.length;
    const onReview = active === reviewIndex;
    const item = questions[active] as QuestionItem | undefined;
    const allAnswered = questions.every((q) => isAnswered(draft[q.id]));
    const otherRef = React.useRef<HTMLInputElement>(null);
    const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

    const go = (i: number) => setActive(Math.max(0, Math.min(reviewIndex, i)));
    const update = (id: string, next: QuestionAnswer) => setDraft((d) => ({ ...d, [id]: next }));

    const choose = (q: QuestionItem, value: string) => {
      const prev = draft[q.id] ?? { values: [] };
      if (q.multiSelect) {
        const values = prev.values.includes(value) ? prev.values.filter((v) => v !== value) : [...prev.values, value];
        update(q.id, { ...prev, values });
      } else {
        update(q.id, { values: [value], text: value === OTHER ? prev.text : undefined });
        if (value !== OTHER) go(active + 1);
      }
      if (value === OTHER) requestAnimationFrame?.(() => otherRef.current?.focus());
    };

    const submitAll = () => {
      if (!allAnswered) return;
      const out: QuestionAnswers = {};
      for (const q of questions) {
        const a = draft[q.id];
        const hasOther = a.values.includes(OTHER) && !!a.text?.trim();
        const values = a.values.filter((v) => v !== OTHER || hasOther);
        out[q.id] = hasOther ? { values, text: a.text!.trim() } : { values };
      }
      setSubmitted(out);
      onSubmitAll?.(out);
    };

    const heading = title ?? `${questions.length} question${questions.length === 1 ? "" : "s"} from the agent`;

    if (locked) {
      return (
        <div
          ref={ref}
          role="group"
          aria-labelledby={`${uid}-title`}
          data-answered=""
          className={cn("space-y-2 rounded-box border border-border bg-subtle/50 p-4 shadow-xs", className)}
          {...props}
        >
          <p id={`${uid}-title`} className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <RiCheckLine aria-hidden className="size-4 text-success" />
            {heading}
          </p>
          <dl className="grid gap-1.5 text-sm" data-slot="question-answers">
            {questions.map((q) => (
              <div key={q.id} className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">{q.header}:</dt>
                <dd className="font-medium text-foreground">
                  <QuestionAnswerText item={q} answer={locked[q.id]} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      );
    }

    const optionRows = item
      ? [...item.options, ...(item.allowOther !== false ? [{ value: OTHER, label: otherLabel } as QuestionOption] : [])]
      : [];
    const current = item ? draft[item.id] ?? { values: [] } : undefined;

    const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || isFolded) return;
      const target = e.target as HTMLElement;
      const inField = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (!inField && item && /^[1-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const opt = optionRows[Number(e.key) - 1];
        if (opt) {
          e.preventDefault();
          choose(item, opt.value);
        }
      } else if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        if (target.tagName === "BUTTON" && !target.hasAttribute("data-question-option")) return;
        e.preventDefault();
        // Enter on an unticked option picks it (like a click); on a ticked one it continues.
        const opt = optionRows[Number(target.getAttribute("data-option-index") ?? NaN)];
        if (item && opt && target.getAttribute("aria-checked") !== "true") {
          choose(item, opt.value);
          return;
        }
        if (onReview) submitAll();
        else if (item && isAnswered(draft[item.id])) go(active + 1);
      }
    };

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={`${uid}-title`}
        data-slot="question-card"
        data-mode="multi"
        data-folded={isFolded ? "" : undefined}
        onKeyDown={handleKey}
        className={cn("overflow-hidden rounded-box border border-border bg-card shadow-xs", className)}
        {...props}
      >
        <div className="flex items-center gap-2 px-4 py-2.5">
          <p id={`${uid}-title`} className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {heading}
          </p>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-expanded={!isFolded}
            aria-label={isFolded ? "Expand questions" : "Collapse questions"}
            onClick={() => setFolded(!isFolded)}
          >
            {isFolded ? <RiArrowRightSLine aria-hidden /> : <RiArrowDownSLine aria-hidden />}
          </Button>
        </div>
        {!isFolded && (
          <>
            <div role="tablist" aria-label="Questions" className="scrollbar-none flex gap-1 overflow-x-auto border-y border-border bg-subtle px-2 py-1.5">
              {[...questions.map((q) => q.header), "Review"].map((label, i) => {
                const q = questions[i];
                const answered = q ? isAnswered(draft[q.id]) : false;
                const selected = i === active;
                return (
                  <button
                    key={label + i}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`${uid}-tab-${i}`}
                    aria-selected={selected}
                    aria-controls={`${uid}-panel`}
                    tabIndex={selected ? 0 : -1}
                    data-answered={answered ? "" : undefined}
                    onClick={() => go(i)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                        e.preventDefault();
                        const n = reviewIndex + 1;
                        const next = (i + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
                        go(next);
                        tabRefs.current[next]?.focus();
                      }
                    }}
                    className={cn(
                      "inline-flex h-7 shrink-0 items-center gap-1 rounded-control px-2.5 text-xs font-medium transition-colors",
                      selected ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                      focusRing
                    )}
                  >
                    {answered ? (
                      <RiCheckLine aria-hidden className="size-3.5 text-success" />
                    ) : q ? (
                      <span aria-hidden className="size-1.5 rounded-full bg-border-strong" />
                    ) : null}
                    {label}
                    {answered && <span className="sr-only"> (answered)</span>}
                  </button>
                );
              })}
            </div>
            <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${active}`} className="space-y-3 px-4 py-3">
              {item && current ? (
                <>
                  <div className="space-y-1">
                    <p id={`${uid}-q`} className="text-sm font-semibold text-foreground">
                      {item.question}
                    </p>
                    {item.description ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
                    {item.multiSelect ? <p className="text-xs text-muted-foreground">Select all that apply.</p> : null}
                  </div>
                  <div role={item.multiSelect ? "group" : "radiogroup"} aria-labelledby={`${uid}-q`} className="grid gap-1.5">
                    {optionRows.map((o, i) => {
                      const checked = current.values.includes(o.value);
                      return (
                        <button
                          key={o.value}
                          type="button"
                          role={item.multiSelect ? "checkbox" : "radio"}
                          aria-checked={checked}
                          data-question-option=""
                          data-option-index={i}
                          onClick={() => choose(item, o.value)}
                          className={cn(
                            "flex w-full items-start gap-2.5 rounded-box border px-3 py-2 text-left text-sm transition-colors",
                            checked ? "border-primary bg-primary-soft/40" : "border-border bg-background hover:bg-subtle",
                            focusRing
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "mt-px flex size-5 shrink-0 items-center justify-center rounded-xs font-mono text-2xs tabular-nums",
                              checked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            )}
                          >
                            {checked && item.multiSelect ? <RiCheckLine aria-hidden className="size-3" /> : i + 1}
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className="font-medium text-foreground">{o.label}</span>
                            {o.description ? <span className="text-xs text-muted-foreground">{o.description}</span> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {current.values.includes(OTHER) && (
                    <input
                      ref={otherRef}
                      aria-label="Other answer"
                      value={current.text ?? ""}
                      placeholder={placeholder}
                      onChange={(e) => update(item.id, { ...current, text: e.target.value })}
                      className={cn(
                        "h-9 w-full rounded-control border border-input bg-background px-3 text-sm shadow-xs placeholder:text-muted-foreground",
                        focusRing
                      )}
                    />
                  )}
                </>
              ) : (
                <div className="space-y-2" data-slot="question-review">
                  <p className="text-sm font-semibold text-foreground">Review your answers</p>
                  <dl className="grid gap-1.5 text-sm">
                    {questions.map((q, i) => (
                      <div key={q.id} className="flex flex-wrap items-baseline gap-x-2">
                        <dt className="text-muted-foreground">{q.header}:</dt>
                        <dd className="font-medium text-foreground">
                          <QuestionAnswerText item={q} answer={draft[q.id]} />{" "}
                          <button
                            type="button"
                            onClick={() => go(i)}
                            className={cn("rounded-xs text-xs font-normal text-primary underline-offset-4 hover:underline", focusRing)}
                          >
                            Edit<span className="sr-only"> {q.header}</span>
                          </button>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-border bg-subtle px-4 py-2">
              <span className="mr-auto text-xs text-muted-foreground">
                {onReview ? (
                  allAnswered ? "Ready to submit" : "Answer every question to submit"
                ) : (
                  <>
                    <Kbd>1</Kbd>–<Kbd>{Math.min(optionRows.length, 9)}</Kbd> to choose · <Kbd>Enter</Kbd> to continue
                  </>
                )}
              </span>
              <Button type="button" size="sm" variant="ghost" disabled={active === 0} onClick={() => go(active - 1)}>
                Back
              </Button>
              {onReview ? (
                <Button type="button" size="sm" variant="primary" disabled={!allAnswered} onClick={submitAll}>
                  {submitAllLabel}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant={item && isAnswered(draft[item.id]) ? "primary" : "secondary"}
                  onClick={() => go(active + 1)}
                >
                  {active === reviewIndex - 1 ? "Review" : "Next"}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }
);
QuestionCardMulti.displayName = "QuestionCardMulti";
