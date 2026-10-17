import * as React from "react";
import {
  AppStoreBadge,
  Button,
  ButtonGroup,
  ButtonGroupItem,
  ButtonGroupSeparator,
  CloseButton,
  FloatingActionButton,
  SocialButton,
  TextLink,
  type AppStore,
  type ButtonProps,
  type SocialProvider,
} from "@sutra/ui";
import {
  RiAddLine,
  RiAlignCenter,
  RiAlignLeft,
  RiAlignRight,
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightLine,
  RiArrowRightSLine,
  RiBold,
  RiCameraLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiEditLine,
  RiFileTextLine,
  RiHeartLine,
  RiItalic,
  RiMoreLine,
  RiPencilLine,
  RiSaveLine,
  RiSettings3Line,
  RiShareLine,
  RiUnderline,
  RiUserAddLine,
} from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

const variants: NonNullable<ButtonProps["variant"]>[] = [
  "primary",
  "secondary",
  "tertiary",
  "soft",
  "ghost",
  "outline",
  "destructive",
  "destructive-soft",
  "inverse",
  "link",
];

const sizes = ["xs", "sm", "md", "lg", "xl"] as const;
const iconSizes = ["icon-xs", "icon-sm", "icon", "icon-lg", "icon-xl"] as const;

const stores: AppStore[] = ["apple", "google-play", "microsoft", "galaxy"];

const providers: SocialProvider[] = [
  "google",
  "apple",
  "github",
  "microsoft",
  "x",
  "facebook",
  "linkedin",
  "discord",
  "slack",
  "figma",
  "gitlab",
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <DemoLabel>{label}</DemoLabel>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function LoadingButton() {
  const [saving, setSaving] = React.useState(false);
  return (
    <Button
      loading={saving}
      leadingIcon={<RiSaveLine />}
      onClick={() => {
        setSaving(true);
        window.setTimeout(() => setSaving(false), 1500);
      }}
    >
      {saving ? "Saving…" : "Save changes"}
    </Button>
  );
}

function FabCanvas({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-box border border-border bg-card">
      <div className="space-y-3 p-5">
        <div className="h-3 w-1/3 rounded-full bg-muted" />
        <div className="h-3 w-2/3 rounded-full bg-muted" />
        <div className="h-3 w-1/2 rounded-full bg-muted" />
      </div>
      {children}
    </div>
  );
}

export function ButtonsPage() {
  const [alignment, setAlignment] = React.useState("left");
  const [marks, setMarks] = React.useState<string[]>(["bold"]);

  return (
    <PageIntro
      eyebrow="Components"
      title="Buttons"
      description="Actions in every shape: standard buttons, grouped segments, store badges, sign-in providers, links and floating actions."
    >
      <Demo
        id="button"
        title="Button"
        description="Ten variants, five text sizes, matching icon-only sizes, loading and icon slots."
        align="start"
        canvasClassName="gap-6"
      >
        <Row label="Variants">
          {variants.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant === "destructive-soft" ? "Destructive soft" : variant[0]!.toUpperCase() + variant.slice(1)}
            </Button>
          ))}
        </Row>
        <Row label="Sizes">
          {sizes.map((size) => (
            <Button key={size} size={size}>
              Button {size}
            </Button>
          ))}
        </Row>
        <Row label="Icon sizes">
          {iconSizes.map((size) => (
            <Button key={size} size={size} variant="secondary" aria-label="Settings">
              <RiSettings3Line />
            </Button>
          ))}
          <Button size="icon" aria-label="Add item">
            <RiAddLine />
          </Button>
          <Button size="icon" variant="ghost" aria-label="More options">
            <RiMoreLine />
          </Button>
          <Button size="icon" variant="destructive-soft" aria-label="Delete">
            <RiDeleteBinLine />
          </Button>
        </Row>
        <Row label="Icons">
          <Button leadingIcon={<RiDownloadLine />}>Download</Button>
          <Button variant="secondary" trailingIcon={<RiArrowRightLine />}>
            Continue
          </Button>
          <Button variant="soft" leadingIcon={<RiUserAddLine />}>
            Invite teammate
          </Button>
          <Button variant="destructive" leadingIcon={<RiDeleteBinLine />}>
            Delete project
          </Button>
        </Row>
        <Row label="States">
          <LoadingButton />
          <Button variant="secondary" loading>
            Uploading
          </Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
        </Row>
        <Row label="As link (asChild)">
          <Button asChild variant="outline">
            <a href="#button">
              <RiFileTextLine />
              Read the docs
            </a>
          </Button>
          <Button asChild variant="link">
            <a href="#button">View changelog</a>
          </Button>
        </Row>
        <Row label="Full width">
          <div className="w-full max-w-sm">
            <Button fullWidth size="lg">
              Create account
            </Button>
          </div>
        </Row>
      </Demo>

      <Demo
        id="button-group"
        title="Button group"
        description="Attached segments, split buttons, and toggle groups with single or multiple selection."
        align="start"
        canvasClassName="gap-6"
      >
        <Row label="Attached">
          <ButtonGroup>
            <ButtonGroupItem>Day</ButtonGroupItem>
            <ButtonGroupItem>Week</ButtonGroupItem>
            <ButtonGroupItem>Month</ButtonGroupItem>
            <ButtonGroupItem>Year</ButtonGroupItem>
          </ButtonGroup>
          <ButtonGroup size="sm">
            <ButtonGroupItem iconOnly aria-label="Previous">
              <RiArrowLeftSLine />
            </ButtonGroupItem>
            <ButtonGroupItem>Today</ButtonGroupItem>
            <ButtonGroupItem iconOnly aria-label="Next">
              <RiArrowRightSLine />
            </ButtonGroupItem>
          </ButtonGroup>
        </Row>
        <Row label="Split button">
          <ButtonGroup>
            <Button>Publish</Button>
            <ButtonGroupSeparator className="bg-primary-foreground/25" />
            <Button size="icon" aria-label="More publish options">
              <RiArrowDownSLine />
            </Button>
          </ButtonGroup>
          <ButtonGroup>
            <ButtonGroupItem leadingIcon={<RiEditLine />}>Edit</ButtonGroupItem>
            <ButtonGroupItem leadingIcon={<RiShareLine />}>Share</ButtonGroupItem>
            <ButtonGroupItem iconOnly aria-label="More">
              <RiMoreLine />
            </ButtonGroupItem>
          </ButtonGroup>
        </Row>
        <Row label="Toggle (single / multiple)">
          <ButtonGroup type="single" value={alignment} onValueChange={(v) => v && setAlignment(v)} aria-label="Text alignment">
            <ButtonGroupItem value="left" iconOnly aria-label="Align left">
              <RiAlignLeft />
            </ButtonGroupItem>
            <ButtonGroupItem value="center" iconOnly aria-label="Align center">
              <RiAlignCenter />
            </ButtonGroupItem>
            <ButtonGroupItem value="right" iconOnly aria-label="Align right">
              <RiAlignRight />
            </ButtonGroupItem>
          </ButtonGroup>
          <ButtonGroup type="multiple" value={marks} onValueChange={setMarks} aria-label="Text formatting">
            <ButtonGroupItem value="bold" iconOnly aria-label="Bold">
              <RiBold />
            </ButtonGroupItem>
            <ButtonGroupItem value="italic" iconOnly aria-label="Italic">
              <RiItalic />
            </ButtonGroupItem>
            <ButtonGroupItem value="underline" iconOnly aria-label="Underline">
              <RiUnderline />
            </ButtonGroupItem>
          </ButtonGroup>
        </Row>
        <Row label="Detached & vertical">
          <ButtonGroup attached={false}>
            <ButtonGroupItem>Draft</ButtonGroupItem>
            <ButtonGroupItem>Review</ButtonGroupItem>
            <ButtonGroupItem>Live</ButtonGroupItem>
          </ButtonGroup>
          <ButtonGroup orientation="vertical" size="sm" className="w-40">
            <ButtonGroupItem leadingIcon={<RiPencilLine />}>Rename</ButtonGroupItem>
            <ButtonGroupItem leadingIcon={<RiShareLine />}>Share</ButtonGroupItem>
            <ButtonGroupItem leadingIcon={<RiDeleteBinLine />}>Delete</ButtonGroupItem>
          </ButtonGroup>
        </Row>
      </Demo>

      <Demo
        id="app-store-badge"
        title="App store badge"
        description="Download links for Apple, Google Play, Microsoft and Galaxy stores in dark and light themes."
        align="start"
        canvasClassName="gap-6"
      >
        <Row label="Dark">
          {stores.map((store) => (
            <AppStoreBadge key={store} store={store} href="#app-store-badge" />
          ))}
        </Row>
        <Row label="Light">
          {stores.map((store) => (
            <AppStoreBadge key={store} store={store} theme="light" href="#app-store-badge" />
          ))}
        </Row>
        <Row label="Sizes">
          <AppStoreBadge store="apple" size="sm" href="#app-store-badge" />
          <AppStoreBadge store="apple" size="md" href="#app-store-badge" />
          <AppStoreBadge store="apple" size="lg" href="#app-store-badge" />
        </Row>
      </Demo>

      <Demo
        id="close-button"
        title="Close button"
        description="Icon-only dismiss control in four sizes and three variants."
        align="start"
        canvasClassName="gap-6"
      >
        <Row label="Ghost (xs, sm, md, lg)">
          <CloseButton size="xs" />
          <CloseButton size="sm" />
          <CloseButton size="md" />
          <CloseButton size="lg" />
        </Row>
        <Row label="Subtle">
          <CloseButton variant="subtle" size="xs" />
          <CloseButton variant="subtle" size="sm" />
          <CloseButton variant="subtle" size="md" />
          <CloseButton variant="subtle" size="lg" />
        </Row>
        <Row label="Inverse">
          <div className="flex items-center gap-3 rounded-box bg-inverse px-4 py-2 text-sm text-inverse-foreground">
            Message archived
            <CloseButton variant="inverse" size="sm" aria-label="Dismiss" />
          </div>
        </Row>
      </Demo>

      <Demo
        id="text-link"
        title="Text link"
        description="Inline links with three tones, underline modes and an external indicator."
        align="start"
        canvasClassName="gap-6"
      >
        <Row label="Variants">
          <TextLink href="#text-link">Default link</TextLink>
          <TextLink href="#text-link" variant="muted">
            Muted link
          </TextLink>
          <TextLink href="#text-link" variant="subtle" underline="always">
            Subtle link
          </TextLink>
        </Row>
        <Row label="Underline">
          <TextLink href="#text-link" underline="always">
            Always
          </TextLink>
          <TextLink href="#text-link" underline="hover">
            On hover
          </TextLink>
          <TextLink href="#text-link" underline="none">
            Never
          </TextLink>
        </Row>
        <Row label="Sizes & external">
          <TextLink href="https://github.com" external size="sm">
            GitHub
          </TextLink>
          <TextLink href="https://github.com" external size="md">
            GitHub
          </TextLink>
          <TextLink href="https://github.com" external size="lg">
            GitHub
          </TextLink>
        </Row>
        <p className="max-w-prose text-sm text-muted-foreground">
          By continuing you agree to our{" "}
          <TextLink href="#text-link" variant="subtle" underline="always">
            Terms of Service
          </TextLink>{" "}
          and{" "}
          <TextLink href="#text-link" variant="subtle" underline="always">
            Privacy Policy
          </TextLink>
          . Questions? Read the{" "}
          <TextLink href="https://example.com" external>
            help center
          </TextLink>
          .
        </p>
      </Demo>

      <Demo
        id="social-button"
        title="Social button"
        description="OAuth sign-in buttons for eleven providers in neutral, brand and icon-only variants."
        align="start"
        canvasClassName="gap-6"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <DemoLabel>Default</DemoLabel>
            <div className="flex max-w-xs flex-col gap-2">
              <SocialButton provider="google" fullWidth />
              <SocialButton provider="apple" fullWidth />
              <SocialButton provider="github" fullWidth />
              <SocialButton provider="microsoft" fullWidth loading />
            </div>
          </div>
          <div className="space-y-2">
            <DemoLabel>Brand</DemoLabel>
            <div className="flex max-w-xs flex-col gap-2">
              <SocialButton provider="google" variant="brand" fullWidth />
              <SocialButton provider="apple" variant="brand" fullWidth />
              <SocialButton provider="github" variant="brand" fullWidth />
              <SocialButton provider="discord" variant="brand" fullWidth>
                Join with Discord
              </SocialButton>
            </div>
          </div>
        </div>
        <Row label="Icon (all providers)">
          {providers.map((provider) => (
            <SocialButton key={provider} provider={provider} variant="icon" />
          ))}
        </Row>
        <Row label="Brand (all providers, sm)">
          {providers.map((provider) => (
            <SocialButton key={provider} provider={provider} variant="brand" size="sm">
              {provider === "x" ? "X" : provider[0]!.toUpperCase() + provider.slice(1)}
            </SocialButton>
          ))}
        </Row>
        <Row label="Sizes">
          <SocialButton provider="github" size="sm" />
          <SocialButton provider="github" size="md" />
          <SocialButton provider="github" size="lg" />
        </Row>
      </Demo>

      <Demo
        id="floating-action-button"
        title="Floating action button"
        description="Absolute strategy keeps it inside a relative container; static places it inline with no offsets. Supports extended labels and speed-dial actions."
        align="start"
        canvasClassName="gap-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <DemoLabel>Default, bottom-right</DemoLabel>
            <FabCanvas>
              <FloatingActionButton strategy="absolute" label="New note" />
            </FabCanvas>
          </div>
          <div className="space-y-2">
            <DemoLabel>Extended, bottom-left</DemoLabel>
            <FabCanvas>
              <FloatingActionButton
                strategy="absolute"
                position="bottom-left"
                label="Compose"
                icon={<RiPencilLine />}
                extended
                shape="rounded"
              />
            </FabCanvas>
          </div>
          <div className="space-y-2">
            <DemoLabel>Speed dial</DemoLabel>
            <FabCanvas>
              <FloatingActionButton
                strategy="absolute"
                label="Create"
                actions={[
                  { label: "Photo", icon: <RiCameraLine /> },
                  { label: "Document", icon: <RiFileTextLine /> },
                  { label: "Favorite", icon: <RiHeartLine /> },
                ]}
              />
            </FabCanvas>
          </div>
          <div className="space-y-2">
            <DemoLabel>Variants & sizes, top positions</DemoLabel>
            <FabCanvas>
              <FloatingActionButton strategy="absolute" position="top-left" size="sm" variant="secondary" label="Add" />
              <FloatingActionButton strategy="absolute" position="top-center" size="md" variant="inverse" label="Edit" icon={<RiEditLine />} />
              <FloatingActionButton strategy="absolute" position="top-right" size="lg" label="Share" icon={<RiShareLine />} />
            </FabCanvas>
          </div>
          <div className="space-y-2 md:col-span-2">
            <DemoLabel>Static, inline in the flow</DemoLabel>
            <div className="flex flex-wrap items-center gap-4">
              <FloatingActionButton strategy="static" size="sm" variant="secondary" label="Add" />
              <FloatingActionButton strategy="static" label="New note" />
              <FloatingActionButton strategy="static" extended shape="rounded" label="Compose" icon={<RiPencilLine />} />
            </div>
          </div>
        </div>
      </Demo>
    </PageIntro>
  );
}
