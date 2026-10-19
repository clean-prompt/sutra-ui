import * as React from "react";
import {
  Badge,
  Button,
  Dropzone,
  Kbd,
  StatementHero,
  SutraMark,
  formatBytes,
  type StatementHeroProps,
} from "@sutra/ui";
import { RiArrowRightLine, RiFileUploadLine, RiShieldCheckLine } from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Landing                                                             */
/* ------------------------------------------------------------------ */

function LandingDemo() {
  return (
    <Demo
      id="landing"
      title="Landing statement"
      description="The quiet landing look: a big mark that floats, one large headline, a two-line subtitle, a pill action and a hint. The parts rise in one after the other; reduced motion shows them at once."
      align="start"
      canvasClassName="p-2 sm:p-4"
    >
      <StatementHero
        as="h2"
        float
        media={<SutraMark variant="badge" size={96} className="text-foreground" />}
        title="Your files, handled quietly"
        description="Drop in what you have and get back what you need. No account, no clutter, nothing to learn first."
        action={
          <Button size="xl" leadingIcon={<RiFileUploadLine aria-hidden />}>
            Choose a file
          </Button>
        }
        hint="Files stay on your device. Up to 100 MB."
      />
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Start-aligned                                                       */
/* ------------------------------------------------------------------ */

function StartAlignedDemo() {
  return (
    <Demo
      id="start-aligned"
      title="Start-aligned"
      description="align=&quot;start&quot; for a hero that sits beside other content or in a left-aligned layout. The solid mark follows the theme: the brand colour in the stock theme, ink on paper in paper light, white in paper dark."
      align="start"
      canvasClassName="p-2 sm:p-4"
    >
      <StatementHero
        as="h2"
        align="start"
        media={<SutraMark variant="solid" size={72} />}
        title="Start where you are"
        description="Pick up a document you already have, or begin with a blank page. Either way it autosaves as you go."
        action={
          <>
            <Button size="xl" trailingIcon={<RiArrowRightLine aria-hidden />}>
              Get started
            </Button>
            <Button size="xl" variant="outline">
              See how it works
            </Button>
          </>
        }
        hint={
          <>
            Press <Kbd>?</Kbd> any time for shortcuts.
          </>
        }
      />
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* With a Dropzone                                                     */
/* ------------------------------------------------------------------ */

function DropzoneDemo() {
  const [files, setFiles] = React.useState<File[]>([]);
  const [rejected, setRejected] = React.useState(0);
  const total = files.reduce((sum, file) => sum + file.size, 0);
  const hint = files.length ? (
    <>
      {files.length === 1 ? files[0]!.name : `${files.length} files`} ({formatBytes(total)}) ready.
    </>
  ) : rejected ? (
    `${rejected} ${rejected === 1 ? "file was" : "files were"} not accepted. PDFs and images only.`
  ) : (
    "Nothing leaves your device."
  );
  return (
    <Demo
      id="dropzone"
      title="With a Dropzone"
      description="Any element fits the action slot. A Dropzone turns the whole statement into the place to drop a file."
      align="start"
      canvasClassName="p-2 sm:p-4"
    >
      <StatementHero
        as="h2"
        media={<SutraMark variant="solid" size={80} />}
        float
        title="Drop it here"
        description="We will take it from there."
        action={
          <Dropzone
            className="w-full max-w-[30rem]"
            title={<span className="font-semibold text-foreground">Drop a file or click to choose</span>}
            accept="application/pdf,image/*"
            maxSize={10 * 1024 * 1024}
            onDrop={(accepted, rejections) => {
              setFiles(accepted);
              setRejected(rejections.length);
            }}
          />
        }
        hint={hint}
      />
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Compact                                                             */
/* ------------------------------------------------------------------ */

function CompactDemo() {
  return (
    <Demo
      id="compact"
      title="Compact"
      description="size=&quot;md&quot; keeps the same anatomy at section scale: a smaller headline and tighter rhythm, for the top of a settings page, an empty workspace or a second landing section."
      align="start"
      canvasClassName="gap-8 p-2 sm:p-4"
    >
      <StatementHero
        as="h2"
        size="md"
        media={<SutraMark variant="badge" size={56} className="text-foreground" />}
        title="Nothing here yet"
        description="Create your first project to see it listed here."
        action={<Button size="xl">New project</Button>}
        hint="You can rename it later."
      />
      <div className="border-t border-border" />
      <StatementHero
        as="h2"
        size="md"
        align="start"
        title="Plans that stay out of the way"
        description="Two tiers, billed monthly, cancel whenever you like."
        action={
          <Button size="xl" variant="outline" leadingIcon={<RiShieldCheckLine aria-hidden />}>
            Compare plans
          </Button>
        }
      />
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Without motion                                                      */
/* ------------------------------------------------------------------ */

function StaticDemo() {
  const [run, setRun] = React.useState(0);
  const props: StatementHeroProps = {
    as: "h2",
    size: "md",
    media: <SutraMark variant="solid" size={56} />,
    title: "Calm by default",
    description: "Parts rise in one by one. Turn it off with animated={false}, or let reduced motion do it.",
    action: <Button size="xl">Continue</Button>,
    hint: "Replay restarts the entrance.",
  };
  return (
    <Demo
      id="motion"
      title="Motion"
      description="animated staggers the parts with animate-fade-up and float bobs the media. Both stand still when the system asks for reduced motion."
      align="start"
      canvasClassName="p-2 sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setRun((n) => n + 1)}>
          Replay
        </Button>
        <Badge>animated</Badge>
      </div>
      <StatementHero key={run} {...props} float />
      <DemoLabel>animated=&quot;false&quot;</DemoLabel>
      <StatementHero {...props} animated={false} title="Calm without the entrance" hint="Rendered all at once." />
    </Demo>
  );
}

export function StatementHeroPage() {
  return (
    <PageIntro
      eyebrow="Patterns"
      title="Statement Hero"
      description="A centred statement section for a quiet landing page: a big mark or icon, one display-size headline, a short subtitle, a single action and a hint. It uses tokens only, so it follows the stock theme, the paper style, and light and dark."
    >
      <LandingDemo />
      <StartAlignedDemo />
      <DropzoneDemo />
      <CompactDemo />
      <StaticDemo />
    </PageIntro>
  );
}
