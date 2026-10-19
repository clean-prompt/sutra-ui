# QuestionCard

> A question (or a tabbed set of questions) asked by the model inside the transcript; locks once answered.

- Import: `import { QuestionCard } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/question-card` (kit `ai`)
- `data-slot`: `question-answers`, `question-card`, `question-review`, `question-answer`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `allowAttachments` | `boolean` |  | Free-text: allow attaching files. |
| `allowOther` | `boolean` |  | Adds an "Other…" option with a text field. |
| `answer` | `QuestionAnswer \| null` |  | A prior answer: renders the card locked. |
| `answers` | `QuestionAnswers \| null` |  | Multi-question: prior answers render the card locked. |
| `confirmLabel` | `string` |  | Label of the confirm button. Default "Confirm". |
| `defaultFolded` | `boolean` |  | Initial folded state when `folded` is not controlled. |
| `description` | `React.ReactNode` |  | Helper text under the question (single-question mode). |
| `folded` | `boolean` |  | Controlled folded state: folded shows only the header. |
| `onAnswer` | `(answer: QuestionAnswer) => void` |  | Called with the answer when the user confirms it (single-question mode). |
| `onFoldedChange` | `(folded: boolean) => void` |  | Called with the new state when the user folds or unfolds the card. |
| `onSubmitAll` | `(answers: QuestionAnswers) => void` |  | Multi-question: called once with every answer. |
| `options` | `QuestionOption[]` |  | Choices for `single` and `multi` questions, each with a label and optional description. |
| `otherLabel` | `string` |  | Label of the "Other" option. Default "Other…". |
| `placeholder` | `string` |  | Placeholder of the free-text and "Other" fields. Default "Type your answer…". |
| `question` | `React.ReactNode` |  | Single-question mode: the question. |
| `questions` | `QuestionItem[]` |  | Multi-question mode: tabs per question, review step and "Submit answers". |
| `submitAllLabel` | `string` |  | Label of the submit button in multi-question mode. Default "Submit answers". |
| `title` | `React.ReactNode` |  | Multi-question header text. Default "N questions from the agent". |
| `type` | `"single" \| "multi" \| "text"` |  | Answer kind in single-question mode: `single` choice, `multi` choice or free `text`. Default `single`. |

## Example (live: `#/components/ai-extras/question-card` in the playground)

```tsx
import { QuestionCard } from "@sutra/ui/ai";

function QuestionCardDemo() {
  return (
    <>
      <QuestionCard
        question="Which database should the prototype use?"
        description="I can scaffold either; this decides the migration tooling."
        options={[
          { value: "pg", label: "Postgres", description: "Full SQL, needs a server" },
          { value: "sqlite", label: "SQLite", description: "Single file, zero setup" },
        ]}
        allowOther
      />
      <QuestionCard
        type="multi"
        question="Which platforms should I target?"
        options={[
          { value: "web", label: "Web" },
          { value: "ios", label: "iOS" },
          { value: "android", label: "Android" },
        ]}
        allowOther
      />
      <QuestionCard type="text" allowAttachments question="What should the CLI be called?" placeholder="A short, lowercase name…" />
      <QuestionCard question="Use tabs or spaces?" options={[{ value: "tabs", label: "Tabs" }, { value: "spaces", label: "Spaces" }]} answer={{ values: ["spaces"] }} />
    </>
  );
}
```
