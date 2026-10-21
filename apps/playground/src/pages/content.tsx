import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  BlogContent,
  BlogPostHeader,
  Button,
  CodeBlock,
  CodeBlockTabs,
  Collapse,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  FAQ,
  InlineCopy,
  Input,
  Skeleton,
  ToggleButton,
  type AccordionVariant,
  type FAQEntry,
} from "@cleanprompt/sutra-ui";
import { RiBankCardLine, RiLockLine, RiRefund2Line, RiShieldCheckLine, RiTeamLine } from "@cleanprompt/sutra-ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

const accordionItems = [
  {
    value: "shipping",
    title: "Shipping",
    body: "Orders ship within two business days. Standard delivery takes 3–5 days; express arrives the next business day.",
  },
  {
    value: "returns",
    title: "Returns",
    body: "Return any unused item within 30 days for a full refund. Print a prepaid label from your order page.",
  },
  {
    value: "warranty",
    title: "Warranty",
    body: "Every product carries a two-year limited warranty covering manufacturing defects.",
  },
];

const accordionVariants: AccordionVariant[] = ["default", "bordered", "ghost"];
const accordionPanelVariants: AccordionVariant[] = ["surface", "separated"];

/** A short text field inside a closed-by-default panel, to show that keepMounted keeps what was typed. */
function KeepMountedFields({ keepMounted }: { keepMounted: boolean }) {
  return (
    <Accordion type="single" collapsible variant="surface" keepMounted={keepMounted} defaultValue="draft">
      <AccordionItem value="draft">
        <AccordionTrigger>Draft reply</AccordionTrigger>
        <AccordionContent>
          <Input aria-label={keepMounted ? "Draft (kept)" : "Draft (unmounted)"} placeholder="Type, close, reopen" />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="other">
        <AccordionTrigger>Other section</AccordionTrigger>
        <AccordionContent>Open this one to close the draft.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function CollapseDemo() {
  const [open, setOpen] = useState(true);
  const [fade, setFade] = useState(true);
  const [unmount, setUnmount] = useState(false);
  const [filters, setFilters] = useState(false);
  return (
    <Demo
      id="collapse"
      title="Collapse"
      description="Height-auto open and close from 0fr to 1fr, with a fade. Closed content is inert; unmountOnExit removes it after the transition."
      align="start"
      canvasClassName="gap-6"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <DemoLabel>Default</DemoLabel>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
              {open ? "Hide details" : "Show details"}
            </Button>
            <ToggleButton size="sm" variant="outline" pressed={fade} onPressedChange={setFade}>
              Fade
            </ToggleButton>
            <ToggleButton size="sm" variant="outline" pressed={unmount} onPressedChange={setUnmount}>
              Unmount on exit
            </ToggleButton>
          </div>
          <Collapse open={open} fade={fade} unmountOnExit={unmount} className="rounded-box border border-border bg-card">
            <div className="space-y-2 p-4 text-sm text-muted-foreground">
              <p>The panel animates to the height of its content, whatever it is.</p>
              <p>Padding lives on a child, so the closed height is exactly zero.</p>
            </div>
          </Collapse>
        </div>
        <div className="space-y-3">
          <DemoLabel>Filter row (form state survives)</DemoLabel>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Messages</span>
            <Button size="sm" variant="ghost" onClick={() => setFilters((v) => !v)} aria-expanded={filters}>
              {filters ? "Hide filters" : "Filters"}
            </Button>
          </div>
          <Collapse open={filters}>
            <div className="grid grid-cols-1 gap-2 pb-1 sm:grid-cols-2">
              <Input aria-label="From" placeholder="From" />
              <Input aria-label="Subject" placeholder="Subject" />
            </div>
          </Collapse>
        </div>
      </div>
      <div className="max-w-[260px] space-y-2">
        <DemoLabel>Narrow container (260px)</DemoLabel>
        <Collapse open>
          <p className="rounded-box border border-border bg-card p-3 text-sm text-muted-foreground">
            A long unbroken string such as supercalifragilisticexpialidocious-and-more wraps inside the panel.
          </p>
        </Collapse>
      </div>
    </Demo>
  );
}

function CollapsibleDemo() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  return (
    <Demo
      id="collapsible"
      title="Collapsible"
      description="A show/hide section with aria-expanded wiring: bare, surface and ghost looks, controlled or not, optional keepMounted."
      align="start"
      canvasClassName="gap-8"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {(["default", "surface", "ghost"] as const).map((variant) => (
          <div key={variant} className="min-w-0 space-y-2">
            <DemoLabel className="capitalize">{variant}</DemoLabel>
            <Collapsible variant={variant} defaultOpen={variant === "surface"}>
              <CollapsibleTrigger>Release notes</CollapsibleTrigger>
              <CollapsibleContent>Faster search, a new sidebar and fewer layout shifts when images load.</CollapsibleContent>
            </Collapsible>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="min-w-0 space-y-2">
          <DemoLabel>Controlled with a custom trigger</DemoLabel>
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
              <Button size="sm" variant="secondary">
                {open ? "Hide" : "Show"} advanced options
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">Retry count, timeout and a custom user agent.</CollapsibleContent>
          </Collapsible>
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>keepMounted keeps field state</DemoLabel>
          <Collapsible variant="surface" keepMounted>
            <CollapsibleTrigger>Shipping note</CollapsibleTrigger>
            <CollapsibleContent>
              <Input aria-label="Shipping note" placeholder="Type, close, reopen" />
            </CollapsibleContent>
          </Collapsible>
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Disabled · loading content</DemoLabel>
          <Collapsible variant="surface" disabled>
            <CollapsibleTrigger>Locked section</CollapsibleTrigger>
            <CollapsibleContent>Hidden.</CollapsibleContent>
          </Collapsible>
          <Collapsible variant="surface" open={loading} onOpenChange={setLoading}>
            <CollapsibleTrigger>Comments</CollapsibleTrigger>
            <CollapsibleContent>
              <div aria-busy="true" className="space-y-2">
                <span className="sr-only">Loading comments</span>
                <Skeleton shape="text" className="w-3/4" />
                <Skeleton shape="text" className="w-1/2" />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
      <div className="max-w-[260px] space-y-2">
        <DemoLabel>Narrow container (260px)</DemoLabel>
        <Collapsible variant="surface" defaultOpen>
          <CollapsibleTrigger>Shipping and returns</CollapsibleTrigger>
          <CollapsibleContent>Content wraps inside the box and the chevron stays on the right, even for a long unbroken-word-sequence-like-this.</CollapsibleContent>
        </Collapsible>
      </div>
    </Demo>
  );
}

const faqItems: FAQEntry[] = [
  {
    question: "Can I change plans later?",
    answer: "Yes. Upgrade or downgrade at any time from Billing. Changes are prorated to the day.",
  },
  {
    question: "Do you offer a free trial?",
    answer: "Every paid plan starts with a 14-day trial. No credit card is required to start.",
  },
  {
    question: "How does team billing work?",
    answer: "You're billed per active seat each month. Guests and viewers are always free.",
  },
  {
    question: "Is my data encrypted?",
    answer: "Data is encrypted in transit with TLS 1.3 and at rest with AES-256. We're SOC 2 Type II certified.",
  },
];

const faqWithIcons: FAQEntry[] = [
  { question: "Which payment methods do you accept?", answer: "All major credit cards, Apple Pay, Google Pay and SEPA debit.", icon: <RiBankCardLine /> },
  { question: "What is your refund policy?", answer: "Cancel within 30 days of purchase for a full refund, no questions asked.", icon: <RiRefund2Line /> },
  { question: "Can I add teammates?", answer: "Invite unlimited teammates from Settings → Members.", icon: <RiTeamLine /> },
];

const componentCode = `import { useState } from "react";
import { Button, toast } from "@cleanprompt/sutra-ui";

export function SaveButton({ onSave }: { onSave: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);

  async function handleClick() {
    setSaving(true);
    try {
      await onSave();
      toast.success("Changes saved");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Button loading={saving} onClick={handleClick}>
      Save changes
    </Button>
  );
}`;

const shellCode = `# Create a new app and add Sutra UI
pnpm create vite my-app --template react-ts
cd my-app
pnpm add @cleanprompt/sutra-ui
pnpm dev --port 3000`;

const cssCode = `@import "tailwindcss";
@import "@cleanprompt/sutra-ui/styles.css";

:root {
  --radius-control: 9999px;
}`;

const installTabs = [
  { label: "npm", language: "bash", code: "npm install @cleanprompt/sutra-ui" },
  { label: "pnpm", language: "bash", code: "pnpm add @cleanprompt/sutra-ui" },
  { label: "yarn", language: "bash", code: "yarn add @cleanprompt/sutra-ui" },
  { label: "bun", language: "bash", code: "bun add @cleanprompt/sutra-ui" },
];

const fileTabs = [
  {
    label: "app.tsx",
    language: "tsx",
    highlightLines: [5],
    code: `import { Toaster } from "@cleanprompt/sutra-ui";

export function App() {
  return (
    <Toaster position="bottom-right" />
  );
}`,
  },
  {
    label: "package.json",
    language: "json",
    code: `{
  "name": "my-app",
  "dependencies": {
    "@cleanprompt/sutra-ui": "^1.0.0",
    "react": "^19.0.0"
  }
}`,
  },
];

export function ContentPage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="Media & rich content"
      description="Collapsible sections, FAQs, long-form article typography and syntax-highlighted code."
    >
      <Demo
        id="accordion"
        title="Accordion"
        description="Default, bordered, ghost, surface and separated variants with chevron or plus indicators; keepMounted keeps closed panels in the tree."
        align="start"
        canvasClassName="gap-8"
      >
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {accordionVariants.map((variant) => (
            <div key={variant} className="space-y-2">
              <DemoLabel className="capitalize">{variant}</DemoLabel>
              <Accordion type="single" collapsible defaultValue="shipping" variant={variant}>
                {accordionItems.map((item) => (
                  <AccordionItem key={item.value} value={item.value}>
                    <AccordionTrigger>{item.title}</AccordionTrigger>
                    <AccordionContent>{item.body}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-2">
            <DemoLabel>Multiple · plus icon · leading icons</DemoLabel>
            <Accordion type="multiple" icon="plus" variant="bordered" defaultValue={["security"]}>
              <AccordionItem value="security">
                <AccordionTrigger leadingIcon={<RiShieldCheckLine />}>Security</AccordionTrigger>
                <AccordionContent>Single sign-on, audit logs and enforced 2FA for every member.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="privacy">
                <AccordionTrigger leadingIcon={<RiLockLine />}>Privacy</AccordionTrigger>
                <AccordionContent>Your content is never used to train models and can be exported at any time.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <div className="space-y-2">
            <DemoLabel>Disabled item</DemoLabel>
            <Accordion type="single" collapsible>
              <AccordionItem value="available">
                <AccordionTrigger>Available section</AccordionTrigger>
                <AccordionContent>This one opens normally.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="locked" disabled>
                <AccordionTrigger>Locked (upgrade required)</AccordionTrigger>
                <AccordionContent>Hidden.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {accordionPanelVariants.map((variant) => (
            <div key={variant} className="min-w-0 space-y-2">
              <DemoLabel className="capitalize">{variant}</DemoLabel>
              <Accordion type="single" collapsible defaultValue="shipping" variant={variant}>
                {accordionItems.map((item) => (
                  <AccordionItem key={item.value} value={item.value}>
                    <AccordionTrigger>{item.title}</AccordionTrigger>
                    <AccordionContent>{item.body}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <DemoLabel>Default: closed panels unmount (the draft is lost)</DemoLabel>
            <KeepMountedFields keepMounted={false} />
          </div>
          <div className="min-w-0 space-y-2">
            <DemoLabel>keepMounted: the draft survives</DemoLabel>
            <KeepMountedFields keepMounted />
          </div>
        </div>
        <div className="max-w-[260px] space-y-2">
          <DemoLabel>Narrow container (260px)</DemoLabel>
          <Accordion type="single" collapsible variant="separated" defaultValue="returns">
            {accordionItems.map((item) => (
              <AccordionItem key={item.value} value={item.value}>
                <AccordionTrigger>{item.title}</AccordionTrigger>
                <AccordionContent>{item.body}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Demo>

      <CollapseDemo />
      <CollapsibleDemo />

      <Demo
        id="faq"
        title="FAQ"
        description="Data-driven wrapper around Accordion: pass an items array of questions and answers."
        align="start"
        canvasClassName="gap-8"
      >
        <div className="mx-auto w-full max-w-2xl">
          <FAQ items={faqItems} defaultValue="0" />
        </div>
        <div className="mx-auto w-full max-w-2xl space-y-2">
          <DemoLabel>Bordered · multiple · icons</DemoLabel>
          <FAQ items={faqWithIcons} variant="bordered" icon="chevron" multiple />
        </div>
      </Demo>

      <Demo
        id="blog-content"
        title="Blog content"
        description="Typographic container for raw HTML or Markdown output, with an article header."
        align="start"
        canvasClassName="items-center"
      >
        <article className="w-full max-w-[68ch] space-y-10">
          <BlogPostHeader
            category="Engineering"
            title="Designing a component library that scales"
            subtitle="What we learned building forty components on top of Radix and Tailwind v4."
            author="Priya Raman"
            date="2026-09-24"
            readTime={7}
          />
          <BlogContent as="div">
            <p>
              Every design system starts with a button. The hard part comes later, when the fortieth component
              needs to feel like it was made by the same hands as the first. Consistency is less about rules and
              more about <strong>shared building blocks</strong>.
            </p>
            <h2>Start with tokens, not components</h2>
            <p>
              Before writing any JSX we defined semantic tokens such as <code>bg-card</code>,{" "}
              <code>text-muted-foreground</code> and <code>rounded-control</code>. Components only reference
              tokens, so a theme switch is a <a href="#blog-content">single CSS change</a>.
            </p>
            <ul>
              <li>Surfaces describe intent: background, card, popover.</li>
              <li>Status colors come in solid and soft pairs.</li>
              <li>
                Radius is split into <em>control</em> and <em>box</em> so pills and cards can change independently.
              </li>
            </ul>
            <blockquote>
              <p>A design system is a product with developers as its customers.</p>
              <cite>Nathan Curtis</cite>
            </blockquote>
            <h3>Composition over configuration</h3>
            <p>
              Compound components keep props small. Instead of a single accordion with a dozen props, we ship{" "}
              <code>Accordion</code>, <code>AccordionItem</code>, <code>AccordionTrigger</code> and{" "}
              <code>AccordionContent</code>, plus a data-driven <code>FAQ</code> wrapper for the common case.
            </p>
            <pre>
              <code>{`<Accordion type="single" collapsible>
  <AccordionItem value="a">…</AccordionItem>
</Accordion>`}</code>
            </pre>
            <h2>Measuring adoption</h2>
            <table>
              <thead>
                <tr>
                  <th>Quarter</th>
                  <th>Teams</th>
                  <th>Components used</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Q1</td>
                  <td>4</td>
                  <td>18</td>
                </tr>
                <tr>
                  <td>Q2</td>
                  <td>11</td>
                  <td>31</td>
                </tr>
                <tr>
                  <td>Q3</td>
                  <td>23</td>
                  <td>42</td>
                </tr>
              </tbody>
            </table>
            <p>
              Press <kbd>⌘</kbd> <kbd>K</kbd> anywhere in the docs to search. <mark>Next up:</mark> charts and data
              grids.
            </p>
            <hr />
            <p>Thanks to everyone who filed issues and reviewed pull requests along the way.</p>
          </BlogContent>
        </article>
      </Demo>

      <Demo
        id="code-block"
        title="Code block"
        description="Built-in highlighting for TSX, JSON, CSS, HTML and shell, with filename, line numbers, highlights, wrap toggle and copy."
        align="start"
        canvasClassName="gap-6"
      >
        <div className="space-y-2">
          <DemoLabel>TSX · filename · line numbers · highlighted lines</DemoLabel>
          <CodeBlock
            code={componentCode}
            language="tsx"
            filename="save-button.tsx"
            showLineNumbers
            highlightLines={[8, 9, 10]}
            showWrapToggle
          />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <DemoLabel>Bash · terminal</DemoLabel>
            <CodeBlock code={shellCode} language="bash" filename="Terminal" />
          </div>
          <div className="space-y-2">
            <DemoLabel>Light theme · CSS</DemoLabel>
            <CodeBlock code={cssCode} language="css" filename="globals.css" theme="light" showLineNumbers />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <DemoLabel>No header (copy on hover)</DemoLabel>
            <CodeBlock language="ts" hideHeader code={`const greeting = (name: string) => \`Hello, \${name}!\`;`} />
          </div>
          <div className="space-y-2">
            <DemoLabel>Inline copy</DemoLabel>
            <div className="flex flex-col items-start gap-3">
              <InlineCopy value="pnpm add @cleanprompt/sutra-ui" />
              <InlineCopy value="npx sutra init" theme="dark" size="lg" />
            </div>
          </div>
        </div>
      </Demo>

      <Demo
        id="code-block-tabs"
        title="Code block tabs"
        description="Tabbed code for package managers or multiple files."
        align="start"
        canvasClassName="gap-6"
      >
        <div className="space-y-2">
          <DemoLabel>Install</DemoLabel>
          <CodeBlockTabs tabs={installTabs} defaultValue="pnpm" />
        </div>
        <div className="space-y-2">
          <DemoLabel>Files · line numbers · light</DemoLabel>
          <CodeBlockTabs tabs={fileTabs} theme="light" showLineNumbers />
        </div>
      </Demo>
    </PageIntro>
  );
}
