import * as React from "react";
import { Field, FieldDescription, FieldError, FieldLabel, Input, InlineCode, RadioGroupField, StepWizard, Text, type StepWizardStep } from "@sutra/ui";
import { Demo, DemoLabel } from "../components/demo";

const plans = [
  { value: "free", label: "Free", description: "One workspace, 3 collaborators" },
  { value: "team", label: "Team", description: "Unlimited workspaces, shared tasks" },
  { value: "scale", label: "Scale", description: "SSO, audit log, priority support" },
];

/** A three-step sign-up: a name that must be filled in, an email that is checked "on a server", a plan, a review. */
function SignUpWizard() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [plan, setPlan] = React.useState("team");
  const [error, setError] = React.useState<{ id: string; message: string } | null>(null);
  const [done, setDone] = React.useState(false);

  const steps: StepWizardStep[] = [
    {
      id: "account",
      title: "Account",
      description: "Who is signing up",
      content: (
        <div className="space-y-4 py-1">
          <Field invalid={error?.id === "name"} required>
            <FieldLabel>Name</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" autoComplete="off" />
            {error?.id === "name" ? <FieldError>{error.message}</FieldError> : null}
          </Field>
          <Field invalid={error?.id === "email"}>
            <FieldLabel>Email</FieldLabel>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ada@example.com" autoComplete="off" />
            {error?.id === "email" ? <FieldError>{error.message}</FieldError> : <FieldDescription>Checked against existing accounts when you press Next.</FieldDescription>}
          </Field>
        </div>
      ),
    },
    {
      id: "plan",
      title: "Plan",
      description: "Pick one",
      content: (
        <div className="py-1">
          <RadioGroupField label="Plan" options={plans} value={plan} onValueChange={setPlan} variant="card" />
        </div>
      ),
    },
    {
      id: "review",
      title: "Review",
      description: "Check and finish",
      content: (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 py-1 text-sm">
          <dt className="text-muted-foreground">Name</dt>
          <dd className="min-w-0 truncate font-medium">{name}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="min-w-0 truncate font-medium">{email || "Not given"}</dd>
          <dt className="text-muted-foreground">Plan</dt>
          <dd className="font-medium">{plans.find((p) => p.value === plan)?.label}</dd>
        </dl>
      ),
    },
  ];

  if (done)
    return (
      <div className="space-y-2">
        <Text size="sm">Welcome, {name}. Your {plan} workspace is ready.</Text>
        <button type="button" className="text-sm underline underline-offset-4" onClick={() => { setDone(false); setError(null); }}>
          Start again
        </button>
      </div>
    );
  return (
    <StepWizard
      steps={steps}
      onValueChange={() => setError(null)}
      canAdvance={async (step) => {
        if (step.id === "account") {
          if (!name.trim()) return setError({ id: "name", message: "Enter your name to continue." }), false;
          await new Promise((r) => setTimeout(r, 500));
          if (email.trim().toLowerCase() === "taken@example.com") return setError({ id: "email", message: "That email already has an account." }), false;
        }
        return true;
      }}
      onComplete={async () => {
        await new Promise((r) => setTimeout(r, 600));
        setDone(true);
      }}
    />
  );
}

function ShortWizard({ keepMounted }: { keepMounted?: boolean }) {
  const steps: StepWizardStep[] = [
    { id: "a", title: "Basics", content: <div className="py-1"><Input aria-label="Project name" placeholder="Project name" /></div> },
    { id: "b", title: "Details", content: <div className="space-y-2 py-1 text-sm text-muted-foreground"><p>A longer step grows the area, and a shorter one shrinks it again.</p><p>Both come with the slide in the direction of travel.</p><p>Go back: what you typed is {keepMounted ? "still there" : "gone, because only the current step is rendered"}.</p></div> },
    { id: "c", title: "Done", content: <p className="py-1 text-sm">All set.</p> },
  ];
  return <StepWizard steps={steps} indicator="bar" keepMounted={keepMounted} />;
}

/** StepWizard: direction-aware slide, measured height, progress, validation. */
export function StepWizardDemo() {
  return (
    <Demo
      id="step-wizard"
      title="Step Wizard"
      description={
        <>
          Steps slide in the direction you are going and the area follows the height of the current step; a progress bar (narrow) or <InlineCode>Steps</InlineCode>{" "}
          (wide) shows where you are. <InlineCode>canAdvance</InlineCode> checks before moving forward (this one is async), Back is free, focus moves to the new
          step, and Enter in a text field presses Next. Reduced motion: the steps swap with no slide.
        </>
      }
      align="start"
      canvasClassName="@container"
    >
      <div className="grid grid-cols-1 gap-8 @4xl:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <DemoLabel>Sign-up with validation (name required; try taken@example.com)</DemoLabel>
          <div className="rounded-box border border-border bg-card p-5">
            <SignUpWizard />
          </div>
        </div>
        <div className="min-w-0 space-y-6">
          <div className="space-y-2">
            <DemoLabel>indicator="bar", narrow container, steps unmount</DemoLabel>
            <div className="w-72 max-w-full rounded-box border border-border bg-card p-5">
              <ShortWizard />
            </div>
          </div>
          <div className="space-y-2">
            <DemoLabel>keepMounted: typed values survive going back</DemoLabel>
            <div className="w-72 max-w-full rounded-box border border-border bg-card p-5">
              <ShortWizard keepMounted />
            </div>
          </div>
        </div>
      </div>
    </Demo>
  );
}
