import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  BlogContent,
  BlogPostHeader,
  CodeBlock,
  CodeBlockTabs,
  FAQ,
  InlineCopy,
  type AccordionVariant,
  type FAQEntry,
} from "@sutra/ui";
import { RiBankCardLine, RiLockLine, RiRefund2Line, RiShieldCheckLine, RiTeamLine } from "@sutra/ui/icons";
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
import { Button, toast } from "@sutra/ui";

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
pnpm add @sutra/ui
pnpm dev --port 3000`;

const cssCode = `@import "tailwindcss";
@import "@sutra/ui/styles.css";

:root {
  --radius-control: 9999px;
}`;

const installTabs = [
  { label: "npm", language: "bash", code: "npm install @sutra/ui" },
  { label: "pnpm", language: "bash", code: "pnpm add @sutra/ui" },
  { label: "yarn", language: "bash", code: "yarn add @sutra/ui" },
  { label: "bun", language: "bash", code: "bun add @sutra/ui" },
];

const fileTabs = [
  {
    label: "app.tsx",
    language: "tsx",
    highlightLines: [5],
    code: `import { Toaster } from "@sutra/ui";

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
    "@sutra/ui": "^1.0.0",
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
        description="Default, bordered and ghost variants with chevron or plus indicators."
        align="start"
        canvasClassName="gap-8"
      >
        <div className="grid gap-8 lg:grid-cols-3">
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
        <div className="grid gap-8 lg:grid-cols-2">
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
      </Demo>

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
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <DemoLabel>Bash · terminal</DemoLabel>
            <CodeBlock code={shellCode} language="bash" filename="Terminal" />
          </div>
          <div className="space-y-2">
            <DemoLabel>Light theme · CSS</DemoLabel>
            <CodeBlock code={cssCode} language="css" filename="globals.css" theme="light" showLineNumbers />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <DemoLabel>No header (copy on hover)</DemoLabel>
            <CodeBlock language="ts" hideHeader code={`const greeting = (name: string) => \`Hello, \${name}!\`;`} />
          </div>
          <div className="space-y-2">
            <DemoLabel>Inline copy</DemoLabel>
            <div className="flex flex-col items-start gap-3">
              <InlineCopy value="pnpm add @sutra/ui" />
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
